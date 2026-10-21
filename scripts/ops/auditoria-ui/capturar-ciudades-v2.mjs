// Evidencia del prototipo OL-431 (bitácora 463, docs/rediseno/prototipos/ciudades-v2.html) con el Chrome real de la Mac (playwright-core del
// repo): 1) cada estado del teléfono a 390×844 (2×), las vistas de 1280×800 y la página entera, midiendo cada estado dentro del marco con
// medir.js (nodos, profundidad, desbordes, toques de menos de 44); 2) el recorrido con toques reales (clics de ratón por coordenadas, que fallan
// si algo tapa el botón, y teclas reales). Las capturas salen sin comprimir; al repo van con comprimir.mjs (la página entera, sin comprimir).
//   node scripts/ops/auditoria-ui/capturar-ciudades-v2.mjs <carpeta>
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const SALIDA = process.argv[2];
if (!SALIDA) { console.error("uso: capturar-ciudades-v2.mjs <carpeta>"); process.exit(1); }
const { chromium } = createRequire(path.join(RAIZ, "package.json"))("playwright-core");
const PROTO = pathToFileURL(path.join(RAIZ, "docs/rediseno/prototipos/ciudades-v2.html")).href;
const MEDIR = fs.readFileSync(path.join(RAIZ, "scripts/ops/auditoria-ui/medir.js"), "utf8");
fs.mkdirSync(SALIDA, { recursive: true });
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--hide-scrollbars"] });
const errores = [];
const filas = [];

async function pagina(ancho, alto, dpr) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: dpr, locale: "es-MX" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(String(e.message).slice(0, 200)));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errores.push(m.type() + ": " + m.text().slice(0, 200)); });
  await page.goto(PROTO, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => document.documentElement.dataset.pintado);
  await page.frameLocator("#tel").locator("body").waitFor();
  await page.evaluate(() => document.fonts.ready);
  return { ctx, page };
}
const marco = (page) => page.frames().find((f) => f !== page.mainFrame());
async function medir(page, id) {
  const f = marco(page);
  await f.evaluate(() => document.fonts.ready);
  const m = await f.evaluate(MEDIR);
  filas.push({ id, nodos: m.nodos, prof: m.profundidadMax, desbordes: m.desbordes.length, toques: m.toquesChicos.length, negativos: m.negativos.length });
  for (const d of m.desbordes) console.log("  DESBORDE", id, d.padre, "→", d.hijo, JSON.stringify(d.fuera));
  for (const t of m.toquesChicos) console.log("  TOQUE", id, t.el, `${t.w}×${t.h}`, t.texto);
}
async function foto(page, nombre, { ir, ancla, scroll } = {}) {
  if (ir) await page.evaluate(([l, s, v]) => window.prototipo.ir(l, s, v), ir);
  await page.waitForTimeout(500);
  const f = marco(page);
  if (scroll != null) await f.evaluate((y) => { document.scrollingElement.scrollTop = y; }, scroll);
  if (ancla) await f.evaluate((t) => { const el = [...document.querySelectorAll("[aria-label]")].find((e) => e.getAttribute("aria-label") === t); el.scrollIntoView({ block: "start" }); document.scrollingElement.scrollTop -= 72; }, ancla);
  await page.waitForTimeout(300);
  await page.locator("#tel").screenshot({ path: path.join(SALIDA, nombre + ".png") });
  await medir(page, nombre);
  console.log(nombre);
}

// Teléfono: la página a 390 de ancho no basta para el marco y las notas; se usa 860 de ancho (el marco mide 390×844 igual).
let { ctx, page } = await pagina(860, 1000, 2);
await foto(page, "01-A-lista", { ir: ["A", "antes", "telefono"] });
await foto(page, "02-A-lista-final", { ir: ["A", "antes", "telefono"], scroll: 2000 });
await foto(page, "03-B-anadir-detectadas", { ir: ["B", "vacia", "telefono"] });
await foto(page, "04-B-anadir-oaxaca", { ir: ["B", "oaxaca", "telefono"] });
await foto(page, "05-B-anadir-san", { ir: ["B", "san", "telefono"] });
await foto(page, "06-C-elegida-oaxaca", { ir: ["C", "oaxaca", "telefono"] });
await foto(page, "07-C-cambiando-nombre", { ir: ["C", "nombre", "telefono"] });
await foto(page, "08-C-aguascalientes", { ir: ["C", "ags", "telefono"] });
await foto(page, "09-A-con-oaxaca", { ir: ["A", "despues", "telefono"] });
await foto(page, "10-D-oaxaca", { ir: ["D", "panel", "telefono"] });
await foto(page, "11-D-oaxaca-final", { ir: ["D", "panel", "telefono"], scroll: 2000 });
await foto(page, "12-D-hoja-buscar-lugares", { ir: ["D", "hoja", "telefono"] });
await foto(page, "13-D-pendiente", { ir: ["D", "pendiente", "telefono"] });
await foto(page, "14-E-san-luis", { ir: ["E", "panel", "telefono"] });
await foto(page, "15-E-san-luis-abajo", { ir: ["E", "panel", "telefono"], scroll: 2000 });
await foto(page, "16-F-cdmx", { ir: ["F", "panel", "telefono"] });
await foto(page, "17-F-cdmx-abajo", { ir: ["F", "panel", "telefono"], scroll: 470 });
await foto(page, "18-F-hoja-tras-tope", { ir: ["F", "hoja", "telefono"] });
await ctx.close();

// Escritorio: 1280×800 a escala 1 (la columna del marco mide lo que deja la hoja de notas).
({ ctx, page } = await pagina(1760, 1000, 1));
await foto(page, "19-E-san-luis-1280", { ir: ["E", "panel", "escritorio"] });
await foto(page, "20-F-cdmx-1280", { ir: ["F", "panel", "escritorio"] });
await foto(page, "21-A-lista-1280", { ir: ["A", "antes", "escritorio"] });
await ctx.close();

// La página entera del prototipo a 1440 (el marco y la hoja de notas).
({ ctx, page } = await pagina(1440, 1000, 1));
await page.evaluate(() => window.prototipo.ir("E", "panel", "telefono"));
await page.waitForTimeout(600);
await page.screenshot({ path: path.join(SALIDA, "00-pagina-entera.png") });
console.log("00-pagina-entera");
await ctx.close();

console.table(filas);

// ===== 2 · El recorrido con toques reales.
const ctxR = await browser.newContext({ viewport: { width: 860, height: 1000 }, deviceScaleFactor: 1, locale: "es-MX" });
const pageR = await ctxR.newPage();

pageR.on("pageerror", (e) => errores.push(String(e.message)));
await pageR.goto(pathToFileURL(path.join(RAIZ, "docs/rediseno/prototipos/ciudades-v2.html")).href, { waitUntil: "load" });
await pageR.evaluate(() => localStorage.clear());
await pageR.reload({ waitUntil: "load" });
await pageR.waitForFunction(() => document.documentElement.dataset.pintado);
await pageR.evaluate(() => window.prototipo.reiniciar());
const tel = pageR.frameLocator("#tel");
let ok = 0, mal = 0;
const comprobar = (nombre, cierto) => { if (cierto) ok++; else mal++; console.log(cierto ? "  bien" : "  MAL ", nombre); };
const toca = async (loc) => { await loc.click({ timeout: 3000 }); await pageR.waitForTimeout(250); };
const texto = async (sel) => (await tel.locator(sel).first().textContent()) ?? "";
const dialogo = tel.locator('[role="dialog"]');

// 1 · Añadir ciudad: sin escribir propone las detectadas.
await toca(tel.getByRole("button", { name: "Añadir ciudad" }));
comprobar("la hoja «Añadir ciudad» se abre", await dialogo.getByRole("heading", { name: "Añadir ciudad" }).isVisible());
comprobar("sin escribir propone Aguascalientes (detectada)", await dialogo.getByRole("button", { name: /Aguascalientes/ }).isVisible());
// 2 · Escribir con el teclado: sugerencias de Mapbox; la ✕ borra y deja el foco.
await toca(dialogo.getByRole("searchbox", { name: "Nombre de la ciudad" }));
await pageR.keyboard.type("Oaxaca", { delay: 30 });
await pageR.waitForTimeout(200);
comprobar("«Oaxaca» sugiere Oaxaca de Juárez", await dialogo.getByRole("button", { name: /Oaxaca de Juárez/ }).isVisible());
comprobar("el campo conserva el foco al escribir", await tel.locator("[data-ciudad-q]").evaluate((e) => document.activeElement === e && e.value === "Oaxaca"));
await toca(dialogo.getByRole("button", { name: "Borrar la búsqueda" }));
comprobar("la ✕ vacía el campo y deja el foco", await tel.locator("[data-ciudad-q]").evaluate((e) => document.activeElement === e && e.value === ""));
comprobar("vacío, vuelven las detectadas", await dialogo.getByRole("button", { name: /Aguascalientes/ }).isVisible());
await pageR.keyboard.type("Oax", { delay: 30 });
await toca(dialogo.getByRole("button", { name: /Oaxaca de Juárez/ }));
comprobar("elegida: el botón dice «Abrir Oaxaca»", (await dialogo.getByRole("button", { name: "Abrir Oaxaca" }).count()) === 1);
comprobar("elegida: el mapa y la hora", await dialogo.getByRole("img", { name: /centro de Oaxaca de Juárez/ }).isVisible() && (await dialogo.textContent()).includes("Hora del centro de México"));
// 3 · Cambiar el nombre: el campo con su ✕ y el botón que dice qué falta.
await toca(dialogo.getByRole("button", { name: "Cambiar" }));
await toca(dialogo.getByRole("button", { name: "Borrar lo escrito" }));
comprobar("sin nombre, el botón dice «Falta el nombre» y no se toca", await dialogo.locator("[data-confirmar]").evaluate((b) => b.textContent === "Falta el nombre" && b.disabled));
await pageR.keyboard.type("Oaxaca", { delay: 30 });
comprobar("con nombre, «Abrir Oaxaca» otra vez", await dialogo.locator("[data-confirmar]").evaluate((b) => b.textContent === "Abrir Oaxaca" && !b.disabled));
// 4 · Abrir: entra al panel con «Buscar lugares» en violeta.
await toca(dialogo.getByRole("button", { name: "Abrir Oaxaca" }));
comprobar("abre el panel de Oaxaca", await tel.getByRole("heading", { name: /^Oaxaca/, level: 1 }).isVisible());
comprobar("«Buscar lugares» es el único botón violeta", (await tel.locator(`button[data-correr="lugares"]`).getAttribute("class")).includes("primario") && (await tel.locator('main button[class*="primario"]').count()) === 1);
// 5 · Correr con tope: la hoja de hoy; la ✕ del tope; «Correr» deja la búsqueda pendiente; cancelar.
await toca(tel.locator('button[data-correr="lugares"]'));
comprobar("la hoja «Buscar lugares en Oaxaca»", await dialogo.getByRole("heading", { name: "Buscar lugares en Oaxaca" }).isVisible());
await toca(dialogo.getByRole("button", { name: "Borrar lo escrito" }));
await pageR.keyboard.type("2,50", { delay: 30 });
await toca(dialogo.getByRole("button", { name: "Correr" }));
comprobar("la hoja se cierra", (await dialogo.count()) === 0);
comprobar("Lugares queda «Pendiente» con tope 2,50", (await tel.getByRole("group", { name: "Lugares" }).textContent()).includes("Pendiente") && (await tel.getByRole("group", { name: "Lugares" }).textContent()).includes("2,50"));
comprobar("mientras espera, ningún botón violeta", (await tel.locator('main button[class*="primario"]').count()) === 0);
await toca(tel.getByRole("button", { name: "Cancelar la búsqueda" }));
comprobar("cancelada, vuelve «Buscar lugares» en violeta", (await tel.locator(`button[data-correr="lugares"]`).getAttribute("class")).includes("primario"));
// 6 · Atrás: la lista con Oaxaca y su frase.
await toca(tel.getByRole("link", { name: /Atrás/ }));
comprobar("Atrás vuelve a la lista", await tel.getByRole("heading", { name: "Ciudades", level: 1 }).isVisible());
comprobar("Oaxaca: «Abierta hoy · 3 búsquedas por correr»", (await tel.locator('[data-panel="oaxaca"]').textContent()).includes("3 búsquedas por correr"));
comprobar("orden: San Luis, Ciudad de México, Oaxaca, Aguascalientes, San Miguel", (await tel.locator('[aria-label="Ciudades"] .pc-fila > b').allTextContents()).map((t) => t.replace(/\s*(Abierta|Detectada)$/, "").trim()).join(" | ") === "San Luis Potosí | Ciudad de México | Oaxaca | Aguascalientes | San Miguel de Allende");
// 7 · Una detectada se abre desde su fila, con la hoja ya llena.
await toca(tel.getByRole("button", { name: "Abrir Aguascalientes" }));
comprobar("la hoja ya llena: «Abrir Aguascalientes»", await dialogo.getByRole("button", { name: "Abrir Aguascalientes" }).isVisible());
await toca(dialogo.getByRole("button", { name: "Abrir Aguascalientes" }));
comprobar("panel de Aguascalientes, abierta", (await texto("main h1")).includes("Aguascalientes") && (await texto("main h1")).includes("Abierta"));
await toca(tel.getByRole("link", { name: /Atrás/ }));
comprobar("en la lista ya no tiene «Abrir»", (await tel.getByRole("button", { name: "Abrir Aguascalientes" }).count()) === 0);
// 8 · Una que ya está: la sugerencia lleva a su panel.
await toca(tel.getByRole("button", { name: "Añadir ciudad" }));
await toca(dialogo.getByRole("searchbox", { name: "Nombre de la ciudad" }));
await pageR.keyboard.type("San", { delay: 30 });
comprobar("«San»: San Luis primero, con «Abierta»", ((await dialogo.locator("[data-sugerencia]").first().textContent()) ?? "").startsWith("San Luis Potosí Abierta"));
await toca(dialogo.getByRole("button", { name: /^San Luis Potosí/ }));
comprobar("la que ya está lleva a su panel", (await texto("main h1")).includes("San Luis Potosí"));
// 9 · San Luis: cancelar la de artistas; «Revisar» dice a dónde va; Escape cierra una hoja.
await toca(tel.getByRole("button", { name: "Cancelar la búsqueda" }));
comprobar("artistas cancelada: vuelve «Buscar artistas»", await tel.locator('button[data-correr="artistas"]').isVisible());
await toca(tel.getByRole("button", { name: "Revisar las 17" }));
comprobar("«Revisar» dice que abre la bandeja de hoy", (await pageR.locator("#etiqueta").textContent()).includes("bandeja"));
await toca(tel.locator('button[data-correr="lugares"]'));
await pageR.keyboard.press("Escape");
await pageR.waitForTimeout(200);
comprobar("Escape cierra la hoja", (await dialogo.count()) === 0);
// 10 · Ciudad de México: la hoja dice qué pasó la vez pasada.
await pageR.evaluate(() => window.prototipo.ir("F", "panel"));
await pageR.waitForTimeout(300);
await toca(tel.locator('button[data-correr="lugares"]'));
comprobar("la hoja tras el tope dice «La vez pasada se detuvo…»", (await dialogo.textContent()).includes("La vez pasada se detuvo en el tope"));
await toca(dialogo.getByRole("button", { name: "Cancelar" }));
comprobar("Cancelar cierra la hoja", (await dialogo.count()) === 0);
// 11 · Las notas en el teléfono: a 390 de ancho, la hoja sube con «Notas» y no hay desplazamiento horizontal.
const chica = await browser.newPage({ viewport: { width: 390, height: 844 } });
await chica.goto(pathToFileURL(path.join(RAIZ, "docs/rediseno/prototipos/ciudades-v2.html")).href, { waitUntil: "load" });
await chica.waitForFunction(() => document.documentElement.dataset.pintado);
comprobar("a 390, sin desplazamiento horizontal", await chica.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
await chica.getByRole("button", { name: "Notas" }).click();
await chica.waitForTimeout(400);
comprobar("a 390, «Notas» sube la hoja", await chica.evaluate(() => document.getElementById("hoja").classList.contains("abierta")));
console.log(`recorrido: ${ok} de ${ok + mal}`);
console.log("errores de página:", errores.length ? errores : "ninguno");
await browser.close();
process.exit(mal || errores.length ? 1 : 0);
