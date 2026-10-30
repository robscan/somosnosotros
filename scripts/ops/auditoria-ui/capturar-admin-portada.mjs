// Capturas y recorrido de la bitácora 526 (OL-494): la portada de Administración en cinco bloques (variante C firmada del prototipo OL-493), la
// hoja «Todos los números», el pendiente «Instagram dejó de publicar» y Corridas con el interruptor arriba. La app compilada contra el respaldo
// local (reloj fijo del mié 7 de oct, cuenta de administración, `RESPALDO_HISTORIAL=1 RESPALDO_INSTAGRAM_SEMANA=1 RESPALDO_INSTAGRAM_CONEXION=todo`;
// para el pendiente, el respaldo otra vez con `RESPALDO_INSTAGRAM_FALLO=permiso`). Chrome real (playwright-core, channel: 'chrome'), 390×844 a
// 2× salvo donde se dice, toques reales (`tap`, el dedo sobre el punto del elemento; nunca `element.click()`).
// node scripts/ops/auditoria-ui/capturar-admin-portada.mjs <raíz del árbol> <carpeta de salida>
// Compila `.next` contra el respaldo (SIN_BUILD=1 usa el `.next` que ya hay). Correrlo en un árbol SIN `.env`.
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
const AHORA = "2026-10-07T16:00:00Z"; // el reloj de `medir` y del prototipo: mié 7 de oct, 10:00 en la Ciudad de México
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

// El respaldo en un puerto fijo (`PUERTO_RESPALDO`, 8839 por omisión): la app compilada lo lleva dentro, así `SIN_BUILD=1` vuelve a servir.
const [pr, pa] = [Number(process.env.PUERTO_RESPALDO ?? 8839), await puertoLibre()];
const respaldo = `http://127.0.0.1:${pr}`;
const base = `http://127.0.0.1:${pa}`;
const reloj = { RELOJ_FIJO: AHORA, TZ: "America/Mexico_City", NODE_OPTIONS: `--require=${path.join(AQUI, "reloj-fijo.cjs")}` };
const app = { NEXT_PUBLIC_SUPABASE_URL: respaldo, NEXT_PUBLIC_SUPABASE_ANON_KEY: "llave-anon-inventada", NEXT_PUBLIC_MAPBOX_TOKEN: "pk.inventado", SUPABASE_SERVICE_ROLE_KEY: "llave-servicio-inventada" };
const DATOS = { RESPALDO_HISTORIAL: "1", RESPALDO_INSTAGRAM_SEMANA: "1", RESPALDO_INSTAGRAM_CONEXION: "todo" };
let r = lanzar([path.join(AQUI, "respaldo-local/server.mjs"), String(pr)], { ...reloj, ...DATOS });
await esperar(`${respaldo}/rest/v1/eventos?select=id&limit=1`, r);
/** El respaldo otra vez, en el mismo puerto, con otros datos (la app compilada apunta a ese puerto). */
async function respaldoCon(env) {
  r.kill();
  await new Promise((ok) => r.once("exit", ok));
  r = lanzar([path.join(AQUI, "respaldo-local/server.mjs"), String(pr)], { ...reloj, ...DATOS, ...env });
  await esperar(`${respaldo}/rest/v1/eventos?select=id&limit=1`, r);
}
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
const errores = [];
const pasos = [];
const paso = (texto, ok = true) => { pasos.push(`${ok ? "✓" : "✗"} ${texto}`); console.log(ok ? "  ✓" : "  ✗", texto); };

async function contexto(ancho, alto = 844) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 2, isMobile: ancho < 1000, hasTouch: true, userAgent: UA, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.clock.setFixedTime(new Date(AHORA));
  await ctx.addCookies([{ name: "sb-127-auth-token", value: cookieDe(ADMIN), url: base }]);
  await ctx.route("**/_vercel/**", (q) => q.fulfill({ contentType: "text/javascript", body: "" }));
  await ctx.route((u) => u.hostname !== "127.0.0.1", (q) => (q.request().resourceType() === "image" ? q.fulfill({ contentType: "image/svg+xml", body: IMAGEN }) : q.abort()));
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(`${ancho}: ${String(e.message).slice(0, 200)}`));
  page.on("console", (m) => m.type() === "error" && errores.push(`${ancho} consola: ${m.text().slice(0, 200)}`));
  return { ctx, page };
}
const quieto = async (page, ms = 600) => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
};
const foto = async (page, nombre, entera = false) => {
  await quieto(page);
  await page.screenshot({ path: path.join(SALIDA, `${nombre}.png`), fullPage: entera });
  console.log("   ", nombre);
};
const medida = (page) =>
  page.evaluate(() => {
    const main = document.querySelector("main");
    const cuadros = [...document.querySelectorAll("main > ul button[aria-expanded]")].map((b) => b.getBoundingClientRect());
    const filas = new Set(cuadros.map((c) => Math.round(c.top))).size;
    const chicos = [...main.querySelectorAll("a, button")].filter((x) => { const c = x.getBoundingClientRect(); return c.width && (c.height < 44 || c.width < 44); }).map((x) => x.textContent.trim().slice(0, 30));
    return { anchoDePagina: document.documentElement.scrollWidth, ventana: innerWidth, alto: Math.round(document.documentElement.scrollHeight), pantallas: +(document.documentElement.scrollHeight / innerHeight).toFixed(1), cuadros: cuadros.length, filas, rotulos: [...main.querySelectorAll(":scope > h2")].map((h) => h.textContent), toquesChicos: chicos, nodos: main.querySelectorAll("*").length };
  });
const bajarA = async (page, texto) => {
  await page.getByRole("heading", { name: texto, exact: true }).first().evaluate((h) => h.scrollIntoView({ block: "start" }));
  await page.mouse.wheel(0, -70);
};

try {
  // 1 · La portada entera a 390 (tres pantallazos): Pendiente, «Esta semana en números», Gestionar, Difusión y Herramientas.
  const { ctx, page } = await contexto(390);
  await page.goto(`${base}/admin`, { waitUntil: "load" });
  await foto(page, "01-portada");
  const m390 = await medida(page);
  console.log("    390:", JSON.stringify(m390));
  await bajarA(page, "Gestionar");
  await foto(page, "01b-portada-medio");
  await page.mouse.wheel(0, 2000);
  await foto(page, "01c-portada-fin");
  await foto(page, "01d-portada-entera", true);

  // 2 · Tocar «Voy y Me interesa» abre su desglose; otra vez, lo cierra.
  await page.evaluate(() => scrollTo(0, 0));
  await bajarA(page, "Esta semana en números");
  const voy = page.getByRole("button", { name: /^Voy y Me interesa/ });
  await voy.tap();
  await page.locator("#desglose").waitFor();
  paso("tocar «Voy y Me interesa» abre su desglose", (await voy.getAttribute("aria-expanded")) === "true");
  await foto(page, "02-portada-desglose");
  await voy.tap();
  paso("tocarlo otra vez lo cierra", (await page.locator("#desglose").count()) === 0);

  // 3 · «Ver todos los números ›»: la hoja con los siete de 7 días, la comunidad, Fichas y «Campañas pasadas».
  const ver = page.getByRole("button", { name: "Ver todos los números ›" });
  await ver.tap();
  const hoja = page.getByRole("dialog", { name: "Todos los números" });
  await hoja.waitFor();
  await hoja.getByRole("heading", { name: "Campañas pasadas" }).waitFor();
  paso("«Ver todos los números ›» abre la hoja con lo que salió de la portada", true);
  const enHoja = await hoja.evaluate((h) => ({ cuadros: h.querySelectorAll("button[aria-expanded]").length, rotulos: [...h.querySelectorAll("h2")].map((x) => x.textContent), tendencias: h.querySelectorAll("button[aria-expanded] svg").length }));
  console.log("    hoja:", JSON.stringify(enHoja));
  paso(`la hoja tiene ${enHoja.cuadros} cuadros (7 de los 7 días y 2 de Fichas) y ${enHoja.tendencias} líneas de tendencia`, enHoja.cuadros === 9);
  await foto(page, "03-hoja-numeros");
  await hoja.getByRole("heading", { name: "Cómo va la comunidad" }).evaluate((h) => h.scrollIntoView({ block: "start" }));
  await foto(page, "03b-hoja-comunidad-fichas");
  await hoja.getByRole("heading", { name: "Campañas pasadas" }).evaluate((h) => h.scrollIntoView({ block: "start" }));
  await foto(page, "03c-hoja-campanas-pasadas");
  // Atrás del sistema: cierra la hoja y se queda en Administración.
  await page.goBack();
  await hoja.waitFor({ state: "detached" });
  paso("Atrás cierra la hoja sin salir de Administración", new URL(page.url()).pathname === "/admin");
  // La ✕ la cierra; el velo también.
  await ver.tap();
  await hoja.waitFor();
  await hoja.getByRole("button", { name: "Cerrar" }).tap();
  await hoja.waitFor({ state: "detached" });
  paso("la ✕ la cierra", new URL(page.url()).pathname === "/admin");
  await ver.tap();
  await hoja.waitFor();
  await page.touchscreen.tap(195, 30);
  await hoja.waitFor({ state: "detached" });
  paso("tocar el velo la cierra", true);
  // Un desglose de la hoja lleva a su lista; Atrás vuelve a la hoja abierta.
  await ver.tap();
  await hoja.waitFor();
  await hoja.getByRole("button", { name: /^Personas activas/ }).tap();
  await hoja.getByRole("link", { name: "Ver las personas ›" }).first().tap();
  await page.waitForURL("**/admin/personas");
  await page.goBack();
  await hoja.waitFor();
  paso("desde la lista de un desglose, Atrás vuelve a la hoja abierta", new URL(page.url()).pathname === "/admin");
  await page.goBack();
  await hoja.waitFor({ state: "detached" });
  paso("y Atrás otra vez la cierra, en Administración", new URL(page.url()).pathname === "/admin");

  // 4 · Rutinas lleva a Corridas, con el interruptor arriba y Atrás (Administración).
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await page.getByRole("link", { name: /^Rutinas/ }).tap();
  await page.waitForURL("**/admin/corridas?desde=admin");
  await page.getByRole("switch", { name: "Completar fichas cada semana" }).waitFor();
  paso("«Rutinas» lleva a Corridas con el interruptor de «Completar fichas» arriba", true);
  paso("su Atrás dice Administración", (await page.getByRole("link", { name: /Administración/ }).count()) > 0);
  await foto(page, "04-corridas-desde-rutinas");
  console.log("    corridas:", JSON.stringify(await medida(page)));
  await ctx.close();

  // 5 · Otros anchos: 320, 430 y 768 (los cuatro en una fila).
  const medidas = { 390: m390 };
  for (const ancho of [320, 430, 768]) {
    const { ctx: c, page: p } = await contexto(ancho, ancho >= 768 ? 1024 : 844);
    await p.goto(`${base}/admin`, { waitUntil: "load" });
    await bajarA(p, "Esta semana en números");
    await foto(p, `0${ancho === 320 ? 5 : ancho === 430 ? 6 : 7}-portada-${ancho}`);
    medidas[ancho] = await medida(p);
    console.log(`    ${ancho}:`, JSON.stringify(medidas[ancho]));
    if (ancho === 768) {
      await p.getByRole("button", { name: /^Personas nuevas/ }).tap();
      await p.locator("#desglose").waitFor();
      const filas = await p.evaluate(() => { const b = [...document.querySelectorAll("main > ul button[aria-expanded]")].map((x) => Math.round(x.getBoundingClientRect().top)); const d = document.querySelector("#desglose").getBoundingClientRect().top; return { filas: new Set(b).size, desgloseDebajo: d > Math.max(...b) }; });
      paso("a 768, con «Personas nuevas» abierto los cuatro siguen en una fila y el desglose va debajo", filas.filas === 1 && filas.desgloseDebajo);
      await foto(p, "07b-portada-768-desglose");
      const ver768 = p.getByRole("button", { name: "Ver todos los números ›" });
      await ver768.tap();
      await p.getByRole("dialog", { name: "Todos los números" }).getByRole("heading", { name: "Campañas pasadas" }).waitFor();
      await foto(p, "07c-hoja-768");
    }
    paso(`a ${ancho}: sin desplazamiento a lo ancho y ningún toque menor de 44 px en la portada`, medidas[ancho].anchoDePagina <= ancho && medidas[ancho].toquesChicos.length === 0);
    await c.close();
  }
  for (const [ancho, m] of Object.entries(medidas)) paso(`a ${ancho}: ${m.cuadros} cuadros en ${m.filas} ${m.filas === 1 ? "fila" : "filas"}, ${m.rotulos.length} rótulos, ${m.pantallas} pantallas de alto, ${m.nodos} nodos`, ancho === "768" ? m.filas === 1 : m.filas === 2);

  // 6 · Instagram dejó de publicar: sube a Pendiente, en rojo, con la causa, y lleva a Administración › Instagram.
  await respaldoCon({ RESPALDO_INSTAGRAM_FALLO: "permiso" });
  const { ctx: c6, page: p6 } = await contexto(390);
  await p6.goto(`${base}/admin`, { waitUntil: "load" });
  const pendiente = p6.getByRole("link", { name: /Instagram dejó de publicar/ });
  await pendiente.waitFor();
  const rojo = await pendiente.locator("small").evaluate((x) => ({ texto: x.textContent, color: getComputedStyle(x).color }));
  console.log("    pendiente:", JSON.stringify(rojo));
  paso(`«Instagram dejó de publicar · ${rojo.texto}» en Pendiente, la causa en rojo (${rojo.color})`, rojo.texto === "La conexión caducó el mié 7 de oct: reconecta");
  await foto(p6, "08-pendiente-instagram");
  await pendiente.tap();
  await p6.waitForURL("**/admin/instagram");
  paso("el pendiente lleva a Administración › Instagram", true);
  await c6.close();
  await respaldoCon({ RESPALDO_INSTAGRAM_FALLO: "imagen" });
  const { ctx: c7, page: p7 } = await contexto(390);
  await p7.goto(`${base}/admin`, { waitUntil: "load" });
  await p7.getByRole("link", { name: /Instagram dejó de publicar/ }).waitFor();
  await foto(p7, "09-pendiente-instagram-imagen");
  await c7.close();

  console.log("errores de página y consola:", errores.length ? errores : "ninguno");
  fs.writeFileSync(path.join(SALIDA, "recorrido.txt"), `${pasos.join("\n")}\nerrores de página y consola: ${errores.length ? errores.join(" | ") : "ninguno"}\n`);
  fs.writeFileSync(path.join(SALIDA, "medidas.json"), JSON.stringify(medidas, null, 2) + "\n");
} finally {
  await browser.close();
}
process.exit(0);
