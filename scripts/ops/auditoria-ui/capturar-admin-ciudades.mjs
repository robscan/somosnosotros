// Capturas de la bitácora 460 (OL-427): Administración › Ciudades, la hoja de «Buscar lugares», la bandeja de propuestas, Corridas y la portada
// con el grupo y «Pendiente», con la app compilada contra el respaldo local y la sesión de su cuenta de administración. Además, la detección:
// que Inicio y Lugares llaman a `registrar_ciudad_vista` después de responder y que un robot no cuenta. Chrome real (playwright-core,
// channel: 'chrome'), 390×844 a 2×. Recorrido con toques reales (clics por coordenadas): abrir la hoja, borrar el tope con su ✕, aceptar una
// propuesta, rechazar otra con su motivo y deshacerlo.
// node scripts/ops/auditoria-ui/capturar-admin-ciudades.mjs <raíz del árbol> <carpeta de salida>
// Compila `.next` contra el respaldo (SIN_BUILD=1 usa el `.next` que ya hay). Correrlo en un árbol SIN `.env` (si lo encuentra, se niega).
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

const [RAIZ, SALIDA] = process.argv.slice(2).map((p) => path.resolve(p));
if (fs.existsSync(path.join(RAIZ, ".env"))) { console.error("hay un .env en el árbol: la app cargaría llaves reales. Córrelo en un árbol sin .env"); process.exit(1); }
const { chromium } = await import(path.join(RAIZ, "node_modules/playwright-core/index.mjs"));
const { ADMIN, cookieDe } = await import(path.join(RAIZ, "scripts/ops/auditoria-ui/respaldo-local/fixture.mjs"));
const NEXT = path.join(RAIZ, "node_modules/next/dist/bin/next");
const AQUI = path.join(RAIZ, "scripts/ops/auditoria-ui");
const AHORA = "2026-10-20T16:00:00Z"; // martes 20 de octubre, 10:00 en San Luis Potosí
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
const BANDEJA = "/admin/ciudades/propuestas/abab0001-0000-4000-8000-000000000001";
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
if (!process.env.SIN_BUILD) {
  process.stdout.write("compilando… ");
  const b = spawnSync(process.execPath, [NEXT, "build"], { cwd: RAIZ, env: { ...process.env, ...app }, encoding: "utf8", maxBuffer: 1 << 26 });
  if (b.status !== 0) throw new Error((b.stdout + b.stderr).slice(-3000));
  console.log("listo");
}
const s = lanzar([NEXT, "start", "-p", String(pa)], { ...app, ...reloj });
await esperar(`${base}/entrar`, s);

const IMAGEN = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#b9b4a8"/></svg>';
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--hide-scrollbars"] });

async function contexto({ sesion = true, agente = UA } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: agente, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.clock.setFixedTime(new Date(AHORA));
  if (sesion) await ctx.addCookies([{ name: "sb-127-auth-token", value: cookieDe(ADMIN), url: base }]);
  await ctx.route("**/_vercel/**", (q) => q.fulfill({ contentType: "text/javascript", body: "" }));
  await ctx.route((u) => u.hostname !== "127.0.0.1", (q) => (q.request().resourceType() === "image" ? q.fulfill({ contentType: "image/svg+xml", body: IMAGEN }) : q.abort()));
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("  error de página:", String(e.message).slice(0, 200)));
  page.on("console", (m) => m.type() === "error" && console.log("  consola:", m.text().slice(0, 200)));
  return { ctx, page };
}
const quieto = async (page, ms = 700) => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
};
const foto = async (page, nombre) => {
  await quieto(page);
  await page.screenshot({ path: path.join(SALIDA, `${nombre}.png`) });
  console.log("  ", nombre);
};
/** Un toque real: al centro del elemento, por coordenadas (nunca element.click()). Antes se lleva al centro de la pantalla: pegado arriba
 *  quedaría bajo la barra de Atrás, que no se desplaza. */
async function tocar(page, localizador) {
  await localizador.evaluate((el) => el.scrollIntoView({ block: "center" }));
  const caja = await localizador.boundingBox();
  if (!caja) throw new Error("sin caja para tocar");
  await page.mouse.click(caja.x + caja.width / 2, caja.y + caja.height / 2);
}
const medir = (page) => page.evaluate(() => ({ anchoDePagina: document.documentElement.scrollWidth, nodos: document.body.querySelectorAll("*").length }));
const registro = async () => (await (await fetch(`${respaldo}/__registro`)).json()).filter((l) => l.includes("registrar_ciudad_vista"));

try {
  // 1 · La portada: «Pendiente» con las propuestas por revisar arriba y el grupo «Ciudades» con la mira al final.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin`, { waitUntil: "load" });
    await page.getByRole("heading", { name: "Administración" }).waitFor();
    await foto(page, "01-portada-pendiente");
    await page.getByRole("heading", { name: "Gestionar" }).evaluate((h) => h.scrollIntoView({ block: "start" }));
    await page.mouse.wheel(0, 400);
    await foto(page, "02-portada-grupo-ciudades");
    console.log("    ", JSON.stringify(await medir(page)));
    // Del renglón de la portada a Ciudades, con un toque.
    await tocar(page, page.getByRole("link", { name: /^Ciudades/ }));
    await page.waitForURL(/\/admin\/ciudades$/);
    await page.getByRole("heading", { name: "Ciudades", level: 1 }).waitFor();
    await foto(page, "03-ciudades");
    console.log("    ", JSON.stringify(await medir(page)));
    await page.getByRole("list", { name: "San Luis Potosí" }).evaluate((l) => l.scrollIntoView({ block: "start" }));
    await page.mouse.wheel(0, -40);
    await foto(page, "04-ciudades-abiertas-y-corridas");
    // 5 · La hoja de «Buscar lugares» de Querétaro: fuentes, el tope con su ✕ (se borra con un toque) y Cancelar · Correr.
    await page.evaluate(() => scrollTo(0, 0));
    await tocar(page, page.getByRole("list", { name: "Querétaro" }).getByRole("button", { name: /^Buscar lugares/ }));
    const hoja = page.getByRole("dialog", { name: "Buscar lugares en Querétaro" });
    await hoja.waitFor();
    await foto(page, "05-hoja-buscar-lugares");
    await tocar(page, hoja.getByRole("button", { name: "Borrar lo escrito" }));
    console.log("     tras la ✕, el tope dice:", JSON.stringify(await hoja.getByLabel("Tope de gasto (USD)").inputValue()), "· foco en el campo:", await hoja.getByLabel("Tope de gasto (USD)").evaluate((c) => c === document.activeElement));
    await tocar(page, hoja.getByRole("button", { name: "Correr" }));
    await foto(page, "06-hoja-tope-vacio");
    await hoja.getByLabel("Tope de gasto (USD)").fill("2,50");
    await tocar(page, hoja.getByRole("button", { name: "Correr" }));
    await hoja.waitFor({ state: "detached" });
    const corrida = (await (await fetch(`${respaldo}/__registro`)).json()).filter((l) => l.includes("rutinas_corridas") || l.includes("cuerpo")).slice(-2);
    console.log("     «Correr» guardó:", JSON.stringify(corrida));
    await ctx.close();
  }
  // 7 a 10 · La bandeja de Oaxaca: por fuente, «Aceptar las 3 de esta fuente» solo en el Sistema de Información Cultural; aceptar una, rechazar
  // otra con su motivo y deshacerlo.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}${BANDEJA}`, { waitUntil: "load" });
    await page.getByRole("heading", { name: "Lugares de Oaxaca" }).waitFor();
    await foto(page, "07-bandeja");
    console.log("    ", JSON.stringify(await medir(page)), "· botones «Aceptar las…»:", await page.getByRole("button", { name: /^Aceptar las/ }).count());
    const tarjeta = (nombre) => page.getByRole("listitem").filter({ hasText: nombre });
    await tocar(page, tarjeta("Patio Escénico Tule").getByRole("button", { name: "Rechazar" }));
    const motivo = page.getByRole("dialog", { name: /^Rechazar/ });
    await motivo.waitFor();
    await foto(page, "08-bandeja-hoja-rechazar");
    await tocar(page, motivo.getByRole("button", { name: /Fuera de la ciudad/ }));
    await motivo.waitFor({ state: "detached" });
    await page.getByText("Rechazaste Patio Escénico Tule · fuera de la ciudad").waitFor();
    await tocar(page, tarjeta("Foro Cultural La Nopalera").getByRole("button", { name: "Aceptar" }));
    await page.getByText("Aceptaste Foro Cultural La Nopalera").waitFor();
    await page.evaluate(() => scrollTo(0, 0));
    await foto(page, "09-bandeja-aceptada");
    await page.getByText("Rechazaste Patio Escénico Tule").evaluate((t) => t.scrollIntoView({ block: "center" }));
    await foto(page, "10-bandeja-rechazada");
    await tocar(page, page.getByRole("button", { name: "Deshacer" }));
    await tarjeta("Patio Escénico Tule").getByRole("button", { name: "Rechazar" }).waitFor();
    console.log("     «Deshacer» devolvió la tarjeta de Patio Escénico Tule");
    await ctx.close();
  }
  // 11 · Corridas: el crédito, lo gastado y cada corrida por cuándo.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/corridas`, { waitUntil: "load" });
    await page.getByRole("heading", { name: "Corridas" }).waitFor();
    await foto(page, "11-corridas");
    console.log("    ", JSON.stringify(await medir(page)));
    await ctx.close();
  }
  // La detección: Inicio y Lugares cuentan la ciudad que muestran, después de responder; abrir una ficha en la hoja de Lugares y un robot no.
  {
    const antes = (await registro()).length;
    const { ctx, page } = await contexto({ sesion: false });
    await page.goto(`${base}/?ciudad=san-miguel-de-allende`, { waitUntil: "load" });
    await page.goto(`${base}/lugares`, { waitUntil: "load" });
    await page.goto(`${base}/lugares?lugar=teatro-de-la-paz`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await ctx.close();
    const robot = await contexto({ sesion: false, agente: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" });
    await robot.page.goto(`${base}/`, { waitUntil: "load" });
    await robot.page.waitForTimeout(1500);
    await robot.ctx.close();
    console.log("     detección (Inicio de San Miguel, Lugares, ficha en la hoja, robot):", JSON.stringify((await registro()).slice(antes)));
  }
} finally {
  await browser.close();
}
process.exit(0);
