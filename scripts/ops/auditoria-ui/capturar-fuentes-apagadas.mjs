// Capturas de OL-509 (bitácora 542) con la app compilada contra el respaldo local y la sesión de su cuenta de administración: la hoja de
// «Buscar agendas y eventos» de San Luis Potosí con `fuentes_fuera` = ["universidades-museos", "web"] (esas dos van sin marca y con la nota
// «apagada para esta ciudad») y Corridas con una corrida de agendas terminada que dejó un trozo sin eventos («1 trozo sin eventos»). Los
// parámetros y la corrida se añaden en memoria (no cambia el fixture). Chrome real (playwright-core, channel: 'chrome'), 390×844 a 2×; toques
// reales (clics por coordenadas que fallan si algo tapa el botón).
// node scripts/ops/auditoria-ui/capturar-fuentes-apagadas.mjs <raíz del árbol> <carpeta de salida>
// Compila `.next` contra el respaldo (SIN_BUILD=1 usa el `.next` que ya hay). Correrlo en un árbol SIN `.env` (si lo encuentra, se niega).
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [RAIZ, SALIDA] = process.argv.slice(2).map((p) => path.resolve(p));
if (fs.existsSync(path.join(RAIZ, ".env"))) {
  console.error("hay un .env en el árbol: la app cargaría llaves reales. Córrelo en un árbol sin .env");
  process.exit(1);
}
const { chromium } = await import(path.join(RAIZ, "node_modules/playwright-core/index.mjs"));
const { ADMIN, cookieDe } = await import(path.join(RAIZ, "scripts/ops/auditoria-ui/respaldo-local/fixture.mjs"));
const NEXT = path.join(RAIZ, "node_modules/next/dist/bin/next");
const AQUI = path.join(RAIZ, "scripts/ops/auditoria-ui");
const AHORA = "2026-10-22T16:00:00Z"; // miércoles 22 de octubre, 10:00 en San Luis Potosí
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
const CORRIDA = "cafe0509-0000-4000-8000-000000000001";
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
const puertoLibre = () =>
  new Promise((ok) => {
    const s = net.createServer().listen(0, () => {
      const p = s.address().port;
      s.close(() => ok(p));
    });
  });
async function esperar(url, h) {
  for (let i = 0; i < 300; i++) {
    if (h.exitCode !== null) throw new Error(`se cerró\n${h.registro()}`);
    try {
      if ((await fetch(url)).status < 500) return;
    } catch {}
    await new Promise((ok) => setTimeout(ok, 200));
  }
  throw new Error(`no respondió: ${url}\n${h.registro()}`);
}

// El respaldo con los parámetros y la corrida: se importa el fixture, se cambian las filas en memoria y se arranca el servidor en el mismo
// proceso (comparten el módulo, así que el servidor ve las filas).
const fixture = pathToFileURL(path.join(AQUI, "respaldo-local/fixture.mjs")).href;
const servidor = pathToFileURL(path.join(AQUI, "respaldo-local/server.mjs")).href;
const conCarteles = `
const { tablas, ADMIN } = await import(${JSON.stringify(fixture)});
const slp = tablas.ciudades.find((c) => c.slug === "san-luis-potosi");
slp.parametros = { ...(slp.parametros ?? {}), fuentes_fuera: ["universidades-museos", "web"] };
tablas.rutinas_corridas.push({ id: ${JSON.stringify(CORRIDA)}, tipo: "agendas", ciudad: "san-luis-potosi", parametros: { fuentes: ["agenda-cultura", "universidades-museos", "web"] }, tope_usd: 3, gasto_usd: 0.42, estado: "terminada",
  resumen: { paso: "2 de 2 fuentes", avance: 1, propuestos: 12, errores: 0, trozos_vacios: 1, avisos: ["Fuente apagada para esta ciudad: Universidades y museos", "Fuente apagada para esta ciudad: Búsqueda web", "Trozo sin eventos: nov_2026.pdf del 2026-11-04 al 2026-11-10"] },
  creado_por: ADMIN, creado_en: "2026-10-22T15:20:00Z", inicio: "2026-10-22T15:20:05Z", fin: "2026-10-22T15:31:40Z" });
await import(${JSON.stringify(servidor)});
`;

const [pr, pa] = [Number(process.env.PUERTO_RESPALDO) || (await puertoLibre()), await puertoLibre()];
const respaldo = `http://127.0.0.1:${pr}`;
const base = `http://127.0.0.1:${pa}`;
const reloj = { RELOJ_FIJO: AHORA, TZ: "America/Mexico_City", NODE_OPTIONS: `--require=${path.join(AQUI, "reloj-fijo.cjs")}` };
const app = { NEXT_PUBLIC_SUPABASE_URL: respaldo, NEXT_PUBLIC_SUPABASE_ANON_KEY: "llave-anon-inventada", NEXT_PUBLIC_MAPBOX_TOKEN: "pk.inventado" };
const envoltura = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "respaldo-carteles-")), "respaldo.mjs");
fs.writeFileSync(envoltura, conCarteles);
const r = lanzar([envoltura], { ...reloj, PUERTO: String(pr) });
await esperar(`${respaldo}/rest/v1/eventos?select=id&limit=1`, r);
if (!process.env.SIN_BUILD) {
  process.stdout.write("compilando… ");
  const b = spawnSync(process.execPath, [NEXT, "build"], { cwd: RAIZ, env: { ...process.env, ...app }, encoding: "utf8", maxBuffer: 1 << 26 });
  if (b.status !== 0) throw new Error((b.stdout + b.stderr).slice(-3000));
  console.log("listo");
}
const s = lanzar([NEXT, "start", "-p", String(pa)], { ...app, ...reloj, MAPBOX_API_URL: `${respaldo}/mapbox` });
await esperar(`${base}/entrar`, s);

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--hide-scrollbars"] });
const errores = [];
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA, locale: "es-MX", timezoneId: "America/Mexico_City" });
await ctx.clock.setFixedTime(new Date(AHORA));
await ctx.addCookies([{ name: "sb-127-auth-token", value: cookieDe(ADMIN), url: base }]);
await ctx.route("**/_vercel/**", (q) => q.fulfill({ contentType: "text/javascript", body: "" }));
await ctx.route((u) => u.hostname !== "127.0.0.1", (q) => q.abort());
const page = await ctx.newPage();
page.on("pageerror", (e) => errores.push(`página: ${String(e.message).slice(0, 200)}`));
page.on("console", (m) => m.type() === "error" && errores.push(`consola: ${m.text().slice(0, 200)}`));

const foto = async (nombre) => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(SALIDA, `${nombre}.png`) });
  const m = await page.evaluate(() => ({ anchoDePagina: document.documentElement.scrollWidth, ancho: innerWidth, nodos: document.body.querySelectorAll("*").length }));
  if (m.anchoDePagina > m.ancho) throw new Error(`${nombre}: la página se desplaza a lo ancho (${m.anchoDePagina} > ${m.ancho})`);
  console.log("  ", nombre, JSON.stringify(m));
};
const arriba = (localizador) => localizador.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 72));
async function tocar(localizador) {
  await localizador.evaluate((el) => el.scrollIntoView({ block: "center" }));
  const caja = await localizador.boundingBox();
  if (!caja) throw new Error("sin caja para tocar");
  const [x, y] = [caja.x + caja.width / 2, caja.y + caja.height / 2];
  if (!(await localizador.evaluate((el, [x, y]) => el.contains(document.elementFromPoint(x, y)), [x, y]))) throw new Error("algo tapa lo que se toca");
  await page.mouse.click(x, y);
}
const comprobar = (cond, que) => {
  if (!cond) throw new Error(`no se cumple: ${que}`);
  console.log("     ✓", que);
};

try {
  // 1 · La hoja de «Buscar agendas y eventos» en San Luis: lo apagado va sin marca y con su nota.
  await page.goto(`${base}/admin/ciudades/san-luis-potosi`, { waitUntil: "load" });
  const tarjeta = page.getByRole("group", { name: "Eventos próximos" });
  await tarjeta.waitFor();
  await tocar(tarjeta.getByRole("button", { name: "Buscar agendas y eventos" }));
  const hoja = page.getByRole("dialog", { name: "Buscar agendas y eventos en San Luis Potosí" });
  await hoja.waitFor();
  const items = (await hoja.getByRole("listitem").allInnerTexts()).map((t) => t.replace(/\s+/g, " ").trim());
  comprobar(items.length === 3, `tres fuentes: ${JSON.stringify(items)}`);
  comprobar(!items[0].includes("apagada") && items[1].endsWith("· apagada para esta ciudad") && items[2].endsWith("· apagada para esta ciudad"), "gobierno con marca; universidades y museos y la búsqueda web, apagadas");
  comprobar((await hoja.getByRole("listitem").nth(0).locator("svg").count()) === 1 && (await hoja.getByRole("listitem").nth(1).locator("svg").count()) === 0, "lo apagado va sin la marca");
  await foto("01-hoja-agendas-fuentes-apagadas");

  // 2 · Corridas: la corrida de agendas dice «1 trozo sin eventos».
  await page.goto(`${base}/admin/corridas`, { waitUntil: "load" });
  const linea = page.getByText("1 trozo sin eventos");
  await linea.waitFor();
  comprobar(true, "Corridas: «1 trozo sin eventos»");
  await arriba(linea);
  await foto("02-corridas-trozo-sin-eventos");
  console.log("errores de página:", errores.length ? errores : "ninguno");
} catch (e) {
  console.error(e.message);
  console.error("errores de página:", errores);
  await page.screenshot({ path: path.join(SALIDA, "error.png") }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
// El respaldo y la app siguen vivos: se cierran al salir (`process.on("exit")`).
process.exit(process.exitCode ?? 0);
