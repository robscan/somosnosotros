// Prueba de la bitácora 517 (OL-485): las rutas que cuentan sin sesión piden `Sec-Fetch-Site: same-origin`. Con la app compilada contra el
// respaldo local (datos inventados, llave de servicio inventada: nunca toca producción) abre la ficha de un evento en Chrome real
// (playwright-core) sin sesión, como cualquier visitante, y comprueba que el navegador manda la cabecera, que `/api/vista` responde 204 y que la
// app llama UNA vez a `contar_vista_evento` en el respaldo (su registro). Después, `curl` sin la cabecera a las tres rutas: 403 y ninguna
// llamada más a la base. Guarda la ficha a 390×844 (2×) como evidencia.
//   node scripts/ops/auditoria-ui/probar-contadores-tope.mjs <raíz del árbol> <carpeta de salida>
// SIN_BUILD=1 usa el `.next` que ya hay. Correrlo en un árbol SIN `.env`.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

const [RAIZ, SALIDA] = process.argv.slice(2).map((p) => path.resolve(p));
if (fs.existsSync(path.join(RAIZ, ".env"))) {
  console.error("hay un .env en el árbol: la app cargaría llaves reales. Córrelo en un árbol sin .env");
  process.exit(1);
}
const { chromium } = await import(path.join(RAIZ, "node_modules/playwright-core/index.mjs"));
const { tablas, LLAVE_SERVICIO } = await import(path.join(RAIZ, "scripts/ops/auditoria-ui/respaldo-local/fixture.mjs"));
const NEXT = path.join(RAIZ, "node_modules/next/dist/bin/next");
const AQUI = path.join(RAIZ, "scripts/ops/auditoria-ui");
const AHORA = "2026-10-07T16:00:00Z"; // el reloj del respaldo
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
const IMAGEN = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#b9b4a8"/></svg>';
fs.mkdirSync(SALIDA, { recursive: true });

const hijos = [];
process.on("exit", () => hijos.forEach((h) => h.exitCode === null && h.kill()));
const lanzar = (args, env) => {
  const h = spawn(process.execPath, args, { cwd: RAIZ, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  let salida = "";
  h.stdout.on("data", (d) => (salida += d));
  h.stderr.on("data", (d) => (salida += d));
  h.registro = () => salida.slice(-3000);
  hijos.push(h);
  return h;
};
const puertoLibre = () => new Promise((ok) => { const s = net.createServer().listen(0, () => { const p = s.address().port; s.close(() => ok(p)); }); });
async function esperar(url, h) {
  for (let i = 0; i < 300; i++) {
    if (h.exitCode !== null) throw new Error(`se cerró\n${h.registro()}`);
    try { if ((await fetch(url)).status < 500) return; } catch {}
    await new Promise((ok) => setTimeout(ok, 200));
  }
  throw new Error(`no respondió: ${url}\n${h.registro()}`);
}

// El respaldo, en un puerto fijo: su dirección queda escrita en la compilación (`NEXT_PUBLIC_SUPABASE_URL`) y `SIN_BUILD=1` la reutiliza.
const [pr, pa] = [8891, await puertoLibre()];
const respaldo = `http://127.0.0.1:${pr}`;
const base = `http://127.0.0.1:${pa}`;
const reloj = { RELOJ_FIJO: AHORA, TZ: "America/Mexico_City", NODE_OPTIONS: `--require=${path.join(AQUI, "reloj-fijo.cjs")}` };
const app = { NEXT_PUBLIC_SUPABASE_URL: respaldo, NEXT_PUBLIC_SUPABASE_ANON_KEY: "llave-anon-inventada", NEXT_PUBLIC_MAPBOX_TOKEN: "pk.inventado", SUPABASE_SERVICE_ROLE_KEY: LLAVE_SERVICIO };
const r = lanzar([path.join(AQUI, "respaldo-local/server.mjs"), String(pr)], reloj);
await esperar(`${respaldo}/rest/v1/eventos?select=id&limit=1`, r);
if (!process.env.SIN_BUILD) {
  process.stdout.write("compilando… ");
  const b = spawnSync(process.execPath, [NEXT, "build"], { cwd: RAIZ, env: { ...process.env, ...app }, encoding: "utf8", maxBuffer: 1 << 26 });
  if (b.status !== 0) throw new Error((b.stdout + b.stderr).slice(-3000));
  console.log("listo");
}
const s = lanzar([NEXT, "start", "-p", String(pa)], { ...app, ...reloj });
await esperar(`${base}/entrar`, s);

const fallas = [];
const comprobar = (ok, que, detalle) => {
  console.log(`  ${ok ? "ok" : "FALLA"} · ${que}${detalle === undefined ? "" : ` (${JSON.stringify(detalle)})`}`);
  if (!ok) fallas.push(que);
};
const llamadasALaBase = async () => (await (await fetch(`${respaldo}/__registro`)).json()).filter((l) => /^POST \/rest\/v1\/rpc\/contar_vista_evento/.test(l)).length;

// Un evento visible que no ha pasado (con el reloj del respaldo): su ficha pone `ContarVista`.
const evento = tablas.eventos.find((e) => e.visible !== false && new Date(e.termina ?? e.inicio) > new Date(AHORA) && e.slug);
// `navigator.webdriver` apagado: `ContarVista` no cuenta a un navegador que se declara manejado por un programa (OL-459).
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--hide-scrollbars", "--disable-blink-features=AutomationControlled"] });
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.clock.setFixedTime(new Date(AHORA));
  await ctx.route("**/_vercel/**", (q) => q.fulfill({ contentType: "text/javascript", body: "" }));
  await ctx.route((u) => u.hostname !== "127.0.0.1", (q) => (q.request().resourceType() === "image" ? q.fulfill({ contentType: "image/svg+xml", body: IMAGEN }) : q.abort()));
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(String(e.message).slice(0, 300)));
  page.on("console", (m) => m.type() === "error" && errores.push(`consola: ${m.text().slice(0, 300)}`));
  const vistas = [];
  page.on("response", (res) => {
    if (new URL(res.url()).pathname === "/api/vista") vistas.push({ estado: res.status() });
  });
  // Las cabeceras que de verdad salen por la red (las `Sec-Fetch-*` las pone Chrome al final; Playwright no siempre las ve en `fetch` con keepalive).
  const cabecerasDeRed = [];
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  const urlsDeVista = new Map();
  cdp.on("Network.requestWillBeSent", (e) => { if (new URL(e.request.url).pathname === "/api/vista") urlsDeVista.set(e.requestId, true); });
  cdp.on("Network.requestWillBeSentExtraInfo", (e) => { cabecerasDeRed.push({ id: e.requestId, sitio: e.headers["Sec-Fetch-Site"] ?? e.headers["sec-fetch-site"] }); });
  const antes = await llamadasALaBase();
  await page.goto(`${base}/eventos/${evento.slug}`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  for (let i = 0; i < 50 && (vistas.length === 0 || (await llamadasALaBase()) === antes); i++) await page.waitForTimeout(100);
  await page.waitForTimeout(800); // por si saliera una segunda
  console.log(`ficha: /eventos/${evento.slug}`);
  if (errores.length) console.log("  errores de la página:", errores);
  comprobar(await page.evaluate(() => navigator.webdriver) === false, "el navegador no se declara manejado por un programa");
  comprobar(vistas.length === 1, "la ficha manda un solo aviso a /api/vista", vistas);
  const sitios = cabecerasDeRed.filter((c) => urlsDeVista.has(c.id)).map((c) => c.sitio);
  comprobar(sitios.length === 1 && sitios[0] === "same-origin", "Chrome manda Sec-Fetch-Site: same-origin", sitios);
  comprobar(vistas[0]?.estado === 204, "la ruta responde 204", vistas[0]?.estado);
  comprobar((await llamadasALaBase()) - antes === 1, "y la app llama una vez a contar_vista_evento", (await llamadasALaBase()) - antes);
  await page.screenshot({ path: path.join(SALIDA, "01-ficha-390.png") });
  console.log(`  captura: ${path.join(SALIDA, "01-ficha-390.png")}`);
  await ctx.close();

  // curl, como un programa: sin la cabecera (y con un agente de navegador, para que no lo descarte el filtro de robots), 403.
  const curl = (ruta, cuerpo, cabeceras = []) => spawnSync("curl", ["-s", "-o", "/dev/null", "-w", "%{http_code}", "-X", "POST", "-A", UA,
    "-H", "content-type: application/json", ...cabeceras.flatMap((c) => ["-H", c]), "--data", JSON.stringify(cuerpo), `${base}${ruta}`], { encoding: "utf8" }).stdout;
  const antesCurl = await llamadasALaBase();
  comprobar(curl("/api/vista", { evento: evento.id }) === "403", "curl sin la cabecera a /api/vista: 403");
  comprobar(curl("/api/vista", { evento: evento.id }, ["sec-fetch-site: cross-site"]) === "403", "curl con otra página como origen: 403");
  comprobar(curl("/api/avisos/abierto", { tipo: "nuevo" }) === "403", "curl sin la cabecera a /api/avisos/abierto: 403");
  comprobar(curl("/api/medir", { nombre: "app_instalada", datos: {} }) === "403", "curl sin la cabecera a /api/medir: 403");
  await new Promise((ok) => setTimeout(ok, 800));
  comprobar((await llamadasALaBase()) === antesCurl, "ninguna de esas llega a la base");
  // Lo que la cabecera no para: un programa que la escribe a mano entra (204); de eso se encarga el tope de la base (30 por evento y hora).
  comprobar(curl("/api/vista", { evento: evento.id }, ["sec-fetch-site: same-origin"]) === "204", "curl que escribe la cabecera a mano: 204 (lo para el tope de la base, no la cabecera)");
} finally {
  await browser.close();
}
if (fallas.length) {
  console.error(`\n${fallas.length} fallas`);
  process.exit(1);
}
console.log("\ntodo bien");
process.exit(0);
