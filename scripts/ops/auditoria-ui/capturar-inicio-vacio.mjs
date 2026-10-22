// Evidencia del prototipo OL-454 (bitácora 486, docs/rediseno/prototipos/inicio-vacio.html) con el Chrome real de la Mac (playwright-core del
// repo): 1) cada estado del teléfono a 390×844 (2×), arriba y desplazado, midiendo cada pantalla con medir.js (nodos, profundidad, desbordes,
// toques de menos de 44) y el llamado nuevo por su cuenta (nodos, profundidad, div o span sin clase); 2) el recorrido con toques reales: clics de
// ratón por coordenadas (los selectores de arriba y, dentro del teléfono, la tira, «Mandarme el código» y la ✕), que fallan si algo tapa el
// botón. Las capturas salen sin comprimir; al repo van con comprimir.mjs.
//   node scripts/ops/auditoria-ui/capturar-inicio-vacio.mjs <carpeta>
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const SALIDA = process.argv[2];
if (!SALIDA) { console.error("uso: capturar-inicio-vacio.mjs <carpeta>"); process.exit(1); }
const { chromium } = createRequire(path.join(RAIZ, "package.json"))("playwright-core");
const PROTO = pathToFileURL(path.join(RAIZ, "docs/rediseno/prototipos/inicio-vacio.html")).href;
const MEDIR = fs.readFileSync(path.join(RAIZ, "scripts/ops/auditoria-ui/medir.js"), "utf8");
fs.mkdirSync(SALIDA, { recursive: true });
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--hide-scrollbars"] });
const errores = [];
const filas = [];
const fallos = [];
const comprobar = (si, texto) => { console.log(si ? "  ok" : "  FALLA", texto); if (!si) fallos.push(texto); };

const ctx = await browser.newContext({ viewport: { width: 860, height: 1000 }, deviceScaleFactor: 2, locale: "es-MX" });
const page = await ctx.newPage();
page.on("pageerror", (e) => errores.push(String(e.message).slice(0, 200)));
page.on("console", (m) => { if (m.type() === "error") errores.push(m.text().slice(0, 200)); });
await page.goto(PROTO, { waitUntil: "load" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "load" });
await page.waitForFunction(() => document.documentElement.dataset.pintado);
await page.evaluate(() => document.fonts.ready);
const marco = () => page.frames().find((f) => f !== page.mainFrame());
const pintado = () => page.evaluate(() => document.documentElement.dataset.pintado);

/** Un clic de ratón en el centro de un elemento (de la página o del teléfono), por coordenadas. */
async function tocar(locator) {
  await locator.scrollIntoViewIfNeeded(); // la captura del teléfono desplaza la página: sin esto, el clic caería fuera de la ventana
  const caja = await locator.boundingBox();
  if (!caja) throw new Error("sin caja para tocar");
  await page.mouse.click(caja.x + caja.width / 2, caja.y + caja.height / 2);
  await page.evaluate(() => window.prototipo.listo().then(() => true));
  await page.waitForTimeout(250);
}
const boton = (grupo, texto) => page.locator(`[aria-label="${grupo}"] button`, { hasText: texto });
async function elegir(caso, version, sesion) {
  await tocar(boton("Caso", caso));
  await tocar(boton("Versión", version));
  await tocar(boton("Sesión", sesion));
}
async function medir(id) {
  const f = marco();
  await f.evaluate(() => document.fonts.ready);
  const m = await f.evaluate(MEDIR);
  const p = await page.evaluate(() => window.prototipo.medir());
  filas.push({ id, nodos: m.nodos, prof: m.profundidadMax, desbordes: m.desbordes.length, toques: m.toquesChicos.length, llamado: p.nodos || "–", sinClase: p.nodos ? p.sin : "–", bloques: p.bloques.join(" ") || "–" });
  for (const d of m.desbordes) console.log("  DESBORDE", id, d.padre, "→", d.hijo, JSON.stringify(d.fuera));
  for (const t of m.toquesChicos) console.log("  TOQUE", id, t.el, `${t.w}×${t.h}`, t.texto);
}
async function foto(nombre, scroll = 0) {
  const f = marco();
  await f.evaluate((y) => { document.scrollingElement.scrollTop = y; }, scroll);
  await page.waitForTimeout(300);
  await page.locator("#tel").screenshot({ path: path.join(SALIDA, nombre + ".png") });
  await medir(nombre);
  console.log(nombre, await pintado());
}
const alFinal = () => marco().evaluate(() => document.scrollingElement.scrollHeight - innerHeight);

// 1. Hoy: lo que ve el founder.
await elegir("2 · Lugares", "Hoy", "Sin sesión");
await foto("01-hoy-queretaro-sin-sesion");
comprobar((await marco().locator("h2", { hasText: "Próximos días" }).count()) === 1, "hoy, sin sesión: sale «Próximos días»");
await tocar(boton("Sesión", "Con sesión"));
await foto("02-hoy-queretaro-con-sesion");
comprobar((await marco().locator("h2", { hasText: "Próximos días" }).count()) === 0, "hoy, con sesión y planes en San Luis: el aviso de vacío NO sale");
comprobar((await marco().locator("h2", { hasText: "Tus planes" }).count()) === 1, "hoy, con sesión: sale Tus planes (de San Luis)");
await elegir("1 · Casi nueva", "Hoy", "Sin sesión");
await foto("03-hoy-cdmx-sin-sesion");
await elegir("3 · Eventos más adelante", "Hoy", "Sin sesión");
await foto("04-hoy-zacatecas-sin-sesion");
comprobar((await marco().locator("h2", { hasText: "Más adelante" }).count()) === 1, "Zacatecas: «Más adelante» ya sale");
await tocar(boton("Sesión", "Con sesión"));
await foto("05-hoy-zacatecas-con-sesion");

// 2. La propuesta.
await elegir("2 · Lugares", "Propuesta", "Sin sesión");
await foto("06-propuesta-queretaro-sin-sesion");
await foto("07-propuesta-queretaro-sin-sesion-abajo", await alFinal());
const orden = await marco().evaluate(() => [...document.querySelectorAll("main h2")].filter((h) => h.offsetParent).map((h) => h.textContent));
console.log("  orden:", orden.join(" · "));
comprobar(orden.join("|") === "¿Sabes de algo que pase en Querétaro?|A 183 km, en San Luis Potosí|Lugares|Artistas", "propuesta sin sesión: llamado, cercano, Lugares, Artistas (el banner entre el llamado y lo demás)");
await tocar(boton("Sesión", "Con sesión"));
await foto("08-propuesta-queretaro-con-sesion");
await foto("09-propuesta-queretaro-con-sesion-abajo", await alFinal());
const ordenSesion = await marco().evaluate(() => [...document.querySelectorAll("main h2")].filter((h) => h.offsetParent).map((h) => h.textContent));
comprobar(ordenSesion.join("|") === "¿Sabes de algo que pase en Querétaro?|Tus planes|A 183 km, en San Luis Potosí|Lugares|Artistas", "propuesta con sesión: llamado, Tus planes, cercano, Lugares, Artistas");
await elegir("1 · Casi nueva", "Propuesta", "Sin sesión");
await foto("10-propuesta-cdmx-sin-sesion");
await foto("11-propuesta-cdmx-sin-sesion-abajo", await alFinal());
await elegir("3 · Eventos más adelante", "Propuesta", "Sin sesión");
comprobar((await marco().locator("[data-propuesta]").count()) === 0, "Zacatecas: la propuesta no cambia nada");

// 3. Recorrido con toques reales dentro del teléfono.
await elegir("2 · Lugares", "Propuesta", "Sin sesión");
const tira = (texto) => page.frameLocator("#tel").locator('[data-propuesta="llamado"] a', { hasText: texto });
const caja = await tira("Evento").boundingBox();
comprobar(caja && caja.height >= 44 && caja.width >= 64, `la tira se toca con el pulgar (${caja && Math.round(caja.width)}×${caja && Math.round(caja.height)})`);
comprobar((await tira("Lugar").getAttribute("href")) === "/nuevo/lugar?ciudad=queretaro", "«Lugar» lleva al alta de lugar con Querétaro puesto");
await tocar(tira("Evento"));
comprobar((await pintado()) === "entrar-alta", "sin sesión, «Evento» pasa por Entrar");
await foto("12-recorrido-entrar");
await tocar(page.frameLocator("#tel").getByRole("button", { name: "Mandarme el código" }));
comprobar((await pintado()) === "alta-evento", "tras entrar, vuelve al alta de evento");
await foto("13-recorrido-alta-evento");
await tocar(page.frameLocator("#tel").getByRole("link", { name: /^Cerrar/ }).or(page.frameLocator("#tel").getByRole("button", { name: /^Cerrar/ })).first());
comprobar((await pintado()) === "propuesta-qro", "la ✕ del alta vuelve a Inicio");
await tocar(boton("Sesión", "Con sesión"));
await tocar(tira("Lugar"));
comprobar((await pintado()) === "alta-lugar", "con sesión, «Lugar» va directo al alta de lugar");
await foto("14-recorrido-alta-lugar");
await tocar(page.frameLocator("#tel").locator("footer a", { hasText: "Artista" }));
comprobar((await pintado()) === "alta-artista", "la tira del alta sigue funcionando (Lugar → Artista)");

// 4. La página entera del prototipo, a 1280.
await page.setViewportSize({ width: 1280, height: 1000 });
await elegir("2 · Lugares", "Propuesta", "Sin sesión");
await page.screenshot({ path: path.join(SALIDA, "15-prototipo-1280.png"), fullPage: true });

console.table(filas);
console.log("errores de la página:", errores.length ? errores : "ninguno");
console.log(fallos.length ? `FALLAN ${fallos.length}: ${fallos.join(" · ")}` : "todas las comprobaciones pasan");
await browser.close();
process.exit(fallos.length || errores.length ? 1 : 0);
