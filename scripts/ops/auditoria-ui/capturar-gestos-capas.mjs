// Capturas y comprobaciones de la bitácora 452 (OL-419, gestos y capas), con la app compilada contra el respaldo local, la sesión de Ana y
// Chrome real (playwright-core, channel: 'chrome') a 390×844 y 2×, con el dedo (toques táctiles por coordenadas, mirando antes con
// `elementFromPoint` qué hay en ese punto). En Inicio: la historia con «Ver más información» y, al tocarlo con la ficha retenida (la navegación
// queda pendiente hasta que el script la suelta), la capa ya no recibe toques e Inicio se desplaza con el dedo; luego la ficha. En la ficha de un
// lugar: el mapa a pantalla completa y la hoja «¿Es tu espacio?», y que tras cerrar cada una no queda nada inerte y la página se desplaza.
// node scripts/ops/auditoria-ui/capturar-gestos-capas.mjs <raíz del árbol> <carpeta de salida>
// Compila `.next` contra el respaldo cada vez (el puerto del respaldo, que va dentro de la compilación, es uno libre cada vez). Correrlo en un árbol
// SIN `.env` (si lo encuentra, se niega).
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

const [RAIZ, SALIDA] = process.argv.slice(2).map((p) => path.resolve(p));
if (fs.existsSync(path.join(RAIZ, ".env"))) { console.error("hay un .env en el árbol: la app cargaría llaves reales. Córrelo en un árbol sin .env"); process.exit(1); }
const { chromium } = await import(path.join(RAIZ, "node_modules/playwright-core/index.mjs"));
const { ANA, cookieDe } = await import(path.join(RAIZ, "scripts/ops/auditoria-ui/respaldo-local/fixture.mjs"));
const NEXT = path.join(RAIZ, "node_modules/next/dist/bin/next");
const AQUI = path.join(RAIZ, "scripts/ops/auditoria-ui");
const AHORA = "2026-10-07T16:00:00Z"; // el de `npm run medir`: un miércoles a las 10:00 en San Luis Potosí, con eventos hoy en «Lo de hoy»
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
process.stdout.write("compilando… ");
const b = spawnSync(process.execPath, [NEXT, "build"], { cwd: RAIZ, env: { ...process.env, ...app }, encoding: "utf8", maxBuffer: 1 << 26 });
if (b.status !== 0) throw new Error((b.stdout + b.stderr).slice(-3000));
console.log("listo");
const s = lanzar([NEXT, "start", "-p", String(pa)], { ...app, ...reloj });
await esperar(`${base}/entrar`, s);

const IMAGEN = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#b9b4a8"/></svg>';
const ESTILO_DE_MAPA = {
  version: 8,
  sources: { mapa: { type: "geojson", data: { type: "FeatureCollection", features: [] }, attribution: "© Mapbox" } },
  layers: [{ id: "fondo", type: "background", paint: { "background-color": "#e8e6df" } }, { id: "mapa", type: "line", source: "mapa" }],
};
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--hide-scrollbars"] });

async function contexto() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.clock.setFixedTime(new Date(AHORA));
  await ctx.addCookies([{ name: "sb-127-auth-token", value: cookieDe(ANA), url: base }]);
  await ctx.route("**/_vercel/**", (q) => q.fulfill({ contentType: "text/javascript", body: "" }));
  await ctx.route((u) => u.hostname !== "127.0.0.1", (q) =>
    q.request().resourceType() === "image" ? q.fulfill({ contentType: "image/svg+xml", body: IMAGEN }) : /\/styles\/v1\//.test(q.request().url()) ? q.fulfill({ json: ESTILO_DE_MAPA }) : q.abort(),
  );
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("  error de página:", String(e.message).slice(0, 200)));
  const cdp = await ctx.newCDPSession(page);
  const dedo = (type, puntos) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: puntos.map(([x, y], id) => ({ x, y, id })) });
  return { ctx, page, dedo };
}
const quieto = async (page, ms = 700) => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
};
const foto = async (page, nombre) => {
  await page.screenshot({ path: path.join(SALIDA, `${nombre}.png`) });
  console.log("  ", nombre);
};
/** Lleva `locator` al centro de la pantalla y espera a que se quede quieto ahí. */
async function alCentro(page, locator) {
  for (let i = 0; i < 20; i++) {
    await locator.evaluate((e) => e.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(250);
    const caja = await locator.boundingBox();
    if (caja && caja.y >= 0 && caja.y + caja.height <= 844) return;
  }
  throw new Error("no se pudo llevar a la pantalla");
}
/** Toca con el dedo el centro de `locator`, si es lo que hay en ese punto (un velo invisible se comería el toque: OL-357). */
async function tocar(page, locator) {
  const caja = await locator.boundingBox();
  const [x, y] = [caja.x + caja.width / 2, caja.y + caja.height / 2];
  const ok = await locator.evaluate((e, [x, y]) => e.contains(document.elementFromPoint(x, y)), [x, y]);
  if (!ok) throw new Error(`en (${x}, ${y}) hay otra cosa encima de lo que se quería tocar`);
  await page.touchscreen.tap(x, y);
}
/** Un arrastre del dedo hacia arriba en mitad de la pantalla: la página debería desplazarse. */
async function desplazarConElDedo(page, dedo) {
  const antes = await page.evaluate(() => scrollY);
  await dedo("touchStart", [[200, 700]]);
  for (let i = 1; i <= 12; i++) {
    await dedo("touchMove", [[200, 700 - i * 35]]);
    await page.waitForTimeout(16);
  }
  await dedo("touchEnd", []);
  await page.waitForTimeout(400);
  return { antes, despues: await page.evaluate(() => scrollY) };
}
/** El fondo: qué hijos del body están inertes, si la página está bloqueada y cuántos diálogos hay. */
const fondo = (page) =>
  page.evaluate(() => ({
    inertes: [...document.body.children].filter((e) => e.inert && e.tagName !== "SCRIPT").length,
    capas: document.documentElement.hasAttribute("data-capas"),
    historia: document.documentElement.hasAttribute("data-historia"),
    desplazamiento: getComputedStyle(document.documentElement).overflow,
    dialogos: document.querySelectorAll("[role=dialog]").length,
  }));

try {
  // 1 a 3 · Inicio: la historia y «Ver más información» con la ficha retenida.
  {
    const { ctx, page, dedo } = await contexto();
    let soltarFicha;
    const retenida = new Promise((ok) => (soltarFicha = ok));
    // Toda petición a una ficha de evento (la del clic y las precargas) espera hasta que el script la suelte: la navegación queda pendiente.
    await page.route((u) => u.pathname.startsWith("/eventos/"), async (q) => {
      await retenida;
      await q.continue().catch(() => {});
    });
    await page.goto(base, { waitUntil: "load" });
    const circulo = page.locator("section[aria-label='Lo de hoy'] button").first();
    await circulo.waitFor();
    await quieto(page);
    await tocar(page, circulo);
    await page.waitForFunction(() => document.querySelector("[role=dialog][data-abierta]"));
    await page.waitForFunction(() => getComputedStyle(document.querySelector("[role=dialog]")).transform === "none");
    await page.waitForTimeout(500);
    const enlace = page.getByRole("link", { name: "Ver más información" });
    await foto(page, "01-historia-ver-mas-informacion");
    await tocar(page, enlace);
    const justo = await page.evaluate(() => ({
      url: location.pathname,
      abierta: !!document.querySelector("[role=dialog][data-abierta]"),
      historia: document.documentElement.hasAttribute("data-historia"),
      desplazamiento: getComputedStyle(document.documentElement).overflow,
      encima: document.elementFromPoint(195, 420)?.closest("[role=dialog]") ? "historia" : "inicio",
    }));
    console.log("     al tocar «Ver más información» (ficha retenida):", JSON.stringify(justo));
    await page.getByRole("dialog").waitFor({ state: "detached" });
    console.log("     con la navegación pendiente, desplazar Inicio con el dedo:", JSON.stringify(await desplazarConElDedo(page, dedo)), "· url:", await page.evaluate(() => location.pathname));
    await foto(page, "02-inicio-con-la-ficha-pendiente");
    soltarFicha();
    await page.waitForURL((u) => u.pathname.startsWith("/eventos/"));
    await page.getByRole("heading", { level: 1 }).waitFor();
    await quieto(page, 1200);
    await foto(page, "03-ficha-tras-el-boton");
    console.log("     en la ficha, desplazar con el dedo:", JSON.stringify(await desplazarConElDedo(page, dedo)));
    await ctx.close();
  }
  // 4 a 6 · La ficha de un lugar: el mapa a pantalla completa y la hoja «¿Es tu espacio?»; tras cerrar cada una, el fondo libre.
  {
    const { ctx, page, dedo } = await contexto();
    await page.goto(`${base}/lugares/teatro-de-la-paz`, { waitUntil: "load" });
    const verMapa = page.getByRole("button", { name: "Ver el mapa" });
    await verMapa.waitFor();
    await quieto(page);
    await alCentro(page, verMapa);
    await tocar(page, verMapa);
    const mapa = page.getByRole("dialog");
    await mapa.waitFor();
    await page.waitForTimeout(2500);
    console.log("     mapa abierto:", JSON.stringify(await fondo(page)));
    await foto(page, "04-mapa-pantalla-completa");
    await tocar(page, page.getByRole("button", { name: "Cerrar el mapa" }));
    await mapa.waitFor({ state: "detached" });
    console.log("     mapa cerrado:", JSON.stringify(await fondo(page)));
    const esMio = page.getByRole("button", { name: "¿Es tu espacio?" });
    await alCentro(page, esMio);
    await tocar(page, esMio);
    const hoja = page.getByRole("dialog", { name: "¿Es tu espacio?" });
    await hoja.waitFor();
    await quieto(page);
    console.log("     hoja abierta:", JSON.stringify(await fondo(page)));
    await foto(page, "05-hoja-sobre-la-ficha");
    await tocar(page, hoja.getByRole("button", { name: "Cerrar" }));
    await hoja.waitFor({ state: "detached" });
    console.log("     hoja cerrada:", JSON.stringify(await fondo(page)));
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(300);
    console.log("     tras cerrar las dos, desplazar con el dedo:", JSON.stringify(await desplazarConElDedo(page, dedo)));
    await foto(page, "06-ficha-libre-tras-cerrar");
    await ctx.close();
  }
} finally {
  await browser.close();
}
process.exit(0);
