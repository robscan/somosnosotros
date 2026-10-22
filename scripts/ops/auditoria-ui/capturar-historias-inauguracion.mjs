// Capturas de la bitácora 474 (OL-442, historias de Inicio): una exposición que inaugura ese día sale una sola vez, como su inauguración, y el
// último toque no abre la tarjeta de abajo. La app compilada contra el respaldo local, con dos exposiciones que abren hoy dadas de alta en memoria
// antes de compilar (por la puerta de la rutina del respaldo, sin tocar `fixture.mjs`): «Raíces», con su inauguración de hoy a las 19:00 ligada
// por `inaugura_id`, y «Huellas», sin inauguración. Chrome real (playwright-core, channel: 'chrome') a 390×844 y 2×, táctil, con la sesión de Ana.
// 01 la fila de historias; 02 la historia de la inauguración; 03 la última historia antes del toque a la derecha; 04 Inicio tras ese toque.
// node scripts/ops/auditoria-ui/capturar-historias-inauguracion.mjs <raíz del árbol> <carpeta de salida>
// Compila `.next` contra el respaldo cada vez. Correrlo en un árbol SIN `.env` (si lo encuentra, se niega).
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

const [RAIZ, SALIDA] = process.argv.slice(2).map((p) => path.resolve(p));
if (fs.existsSync(path.join(RAIZ, ".env"))) { console.error("hay un .env en el árbol: la app cargaría llaves reales. Córrelo en un árbol sin .env"); process.exit(1); }
const { chromium } = await import(path.join(RAIZ, "node_modules/playwright-core/index.mjs"));
const { ANA, MARCOS, cookieDe, LLAVE_SERVICIO } = await import(path.join(RAIZ, "scripts/ops/auditoria-ui/respaldo-local/fixture.mjs"));
const NEXT = path.join(RAIZ, "node_modules/next/dist/bin/next");
const AQUI = path.join(RAIZ, "scripts/ops/auditoria-ui");
const AHORA = "2026-10-07T16:00:00Z"; // el de `npm run medir`: las 10:00 de San Luis
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
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

const [pr, pa] = [await puertoLibre(), await puertoLibre()];
const respaldo = `http://127.0.0.1:${pr}`;
const base = `http://127.0.0.1:${pa}`;
const reloj = { RELOJ_FIJO: AHORA, TZ: "America/Mexico_City", NODE_OPTIONS: `--require=${path.join(AQUI, "reloj-fijo.cjs")}` };
const app = { NEXT_PUBLIC_SUPABASE_URL: respaldo, NEXT_PUBLIC_SUPABASE_ANON_KEY: "llave-anon-inventada", NEXT_PUBLIC_MAPBOX_TOKEN: "pk.inventado", SUPABASE_SERVICE_ROLE_KEY: "llave-servicio-inventada" };
const r = lanzar([path.join(AQUI, "respaldo-local/server.mjs"), String(pr)], reloj);
await esperar(`${respaldo}/rest/v1/eventos?select=id&limit=1`, r);

// Las dos exposiciones de hoy y la inauguración de una, en un sitio escrito a mano (sin lugar del directorio).
const sitio = { lugar_id: null, sitio_texto: "Galería Toro", sitio_direccion: "Av. Carranza 500, San Luis Potosí", sitio_lat: null, sitio_lng: null, sitio_reservado: false, sitio_revelar_desde: null };
const comun = { origen: "rutina-agendas", zona: "America/Mexico_City", ciudad: "San Luis Potosí", imagen: null, precio: null, enlace: null, descripcion: null, colores_cartel: null, creado_por: MARCOS, retirado_por_admin: false, actualizado_en: AHORA, ...sitio };
const INAUG = "cccc0442-0000-4000-8000-000000000001";
const filas = [
  { ...comun, id: INAUG, slug: "inauguracion-raices", titulo: "Inauguración: Raíces", clase: "puntual", inaugura_id: null, inicio: "2026-10-08T01:00:00Z", fin: "2026-10-08T03:00:00Z", termina: "2026-10-08T03:00:00Z" },
  { ...comun, id: "cccc0442-0000-4000-8000-000000000002", slug: "raices", titulo: "Raíces", clase: "exposicion", inaugura_id: INAUG, inicio: "2026-10-07T15:00:00Z", fin: "2026-11-30T23:59:00Z", termina: "2026-11-30T23:59:00Z" },
  { ...comun, id: "cccc0442-0000-4000-8000-000000000003", slug: "huellas", titulo: "Huellas", clase: "exposicion", inaugura_id: null, inicio: "2026-10-07T15:00:00Z", fin: "2026-11-30T23:59:00Z", termina: "2026-11-30T23:59:00Z" },
];
const alta = await fetch(`${respaldo}/rest/v1/eventos?select=id`, { method: "POST", headers: { "content-type": "application/json", apikey: LLAVE_SERVICIO ?? "llave", authorization: `Bearer ${LLAVE_SERVICIO ?? "llave"}` }, body: JSON.stringify(filas) });
if (!alta.ok) throw new Error(`alta en el respaldo: ${alta.status} ${await alta.text()}`);

process.stdout.write("compilando… ");
const b = spawnSync(process.execPath, [NEXT, "build"], { cwd: RAIZ, env: { ...process.env, ...app }, encoding: "utf8", maxBuffer: 1 << 26 });
if (b.status !== 0) throw new Error((b.stdout + b.stderr).slice(-3000));
console.log("listo");
const s = lanzar([NEXT, "start", "-p", String(pa)], { ...app, ...reloj });
await esperar(`${base}/entrar`, s);

const IMAGEN = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#b9b4a8"/></svg>';
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--hide-scrollbars"] });
const quieto = async (page, ms = 800) => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
};

try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.clock.setFixedTime(new Date(AHORA));
  await ctx.addCookies([{ name: "sb-127-auth-token", value: cookieDe(ANA), url: base }]);
  await ctx.route("**/_vercel/**", (q) => q.fulfill({ contentType: "text/javascript", body: "" }));
  await ctx.route((u) => u.hostname !== "127.0.0.1", (q) => (q.request().resourceType() === "image" ? q.fulfill({ contentType: "image/svg+xml", body: IMAGEN }) : q.abort()));
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("  error de página:", String(e.message).slice(0, 200)));
  await page.goto(base, { waitUntil: "load" });
  const fila = page.getByRole("region", { name: "Lo de hoy" });
  await fila.waitFor();
  await quieto(page);
  const circulos = await fila.getByRole("button").evaluateAll((bs) => bs.map((b) => b.getAttribute("aria-label")));
  console.log("círculos:", JSON.stringify(circulos));
  await page.screenshot({ path: path.join(SALIDA, "01-fila-historias-390.png") });

  const centro = async (loc) => {
    const c = await loc.boundingBox();
    return [c.x + c.width / 2, c.y + c.height / 2];
  };
  // La historia de la inauguración, abierta con un toque.
  await page.touchscreen.tap(...(await centro(fila.getByRole("button", { name: /Inauguración: Raíces/ }))));
  await page.waitForFunction(() => document.querySelector("[role=dialog][data-abierta]"));
  await quieto(page, 400);
  await page.evaluate(() => document.getAnimations().forEach((a) => String(a.animationName).includes("llena") && a.pause()));
  await page.screenshot({ path: path.join(SALIDA, "02-historia-inauguracion-390.png") });
  await page.touchscreen.tap(...(await centro(page.getByRole("dialog").getByRole("button", { name: "Cerrar" }))));
  await page.getByRole("dialog").waitFor({ state: "detached" });

  // La última historia y un toque a la derecha: se cierra y lo que queda debajo en ese punto (una tarjeta de Inicio) no se abre.
  await page.touchscreen.tap(...(await centro(fila.getByRole("button").last())));
  await page.waitForFunction(() => document.querySelector("[role=dialog][data-abierta]"));
  await quieto(page, 400);
  await page.evaluate(() => document.getAnimations().forEach((a) => String(a.animationName).includes("llena") && a.pause()));
  await page.screenshot({ path: path.join(SALIDA, "03-ultima-historia-390.png") });
  const DERECHA = [330, 560];
  const debajo = await page.evaluate(([x, y]) => {
    const d = document.querySelector("[role=dialog]");
    d.style.visibility = "hidden";
    const a = document.elementFromPoint(x, y)?.closest("a");
    d.style.visibility = "";
    return a?.getAttribute("href") ?? null;
  }, DERECHA);
  console.log("debajo del toque:", debajo);
  await page.touchscreen.tap(...DERECHA);
  await page.getByRole("dialog").waitFor({ state: "detached" });
  await page.waitForTimeout(1500);
  console.log("tras el toque:", new URL(page.url()).pathname);
  await quieto(page);
  await page.screenshot({ path: path.join(SALIDA, "04-inicio-tras-ultimo-toque-390.png") });
  await ctx.close();
} finally {
  await browser.close();
}
process.exit(0);
