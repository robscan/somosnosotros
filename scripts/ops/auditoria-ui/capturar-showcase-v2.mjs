// Evidencia del prototipo OL-443 (bitácora 475, docs/rediseno/prototipos/showcase-v2.html) con el Chrome real de la Mac (playwright-core del
// repo): 1) cada estado del teléfono a 390×844 (2×), las vistas de 1280×800 y la página entera, midiendo cada estado dentro del marco con
// medir.js (nodos, profundidad, desbordes, toques de menos de 44); 2) el recorrido con toques reales (clics de ratón por coordenadas, que fallan
// si algo tapa el botón, y teclas reales). Las capturas salen sin comprimir; al repo van con comprimir.mjs.
//   node scripts/ops/auditoria-ui/capturar-showcase-v2.mjs <carpeta>
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const SALIDA = process.argv[2];
if (!SALIDA) { console.error("uso: capturar-showcase-v2.mjs <carpeta>"); process.exit(1); }
const { chromium } = createRequire(path.join(RAIZ, "package.json"))("playwright-core");
const PROTO = pathToFileURL(path.join(RAIZ, "docs/rediseno/prototipos/showcase-v2.html")).href;
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
async function foto(page, nombre, { ir, scroll, hoja } = {}) {
  if (ir) await page.evaluate(([l, s, v]) => window.prototipo.ir(l, s, v), ir);
  await page.waitForTimeout(500);
  const f = marco(page);
  if (scroll != null) await f.evaluate((y) => { document.scrollingElement.scrollTop = y; }, scroll);
  // El cuerpo de una hoja abierta (ui/Hoja) se desplaza por dentro.
  if (hoja != null) await f.evaluate((y) => { const c = [...document.querySelectorAll('[role="dialog"] *')].find((e) => getComputedStyle(e).overflowY === "auto"); if (c) c.scrollTop = y; }, hoja);
  await page.waitForTimeout(300);
  await page.locator("#tel").screenshot({ path: path.join(SALIDA, nombre + ".png") });
  await medir(page, nombre);
  console.log(nombre);
}

// Teléfono: la página a 860 de ancho (el marco mide 390×844 igual).
let { ctx, page } = await pagina(860, 1000, 2);
await foto(page, "01-A-lista", { ir: ["A", "hoy", "telefono"] });
await foto(page, "02-A-lista-con-grupo", { ir: ["A", "grupo", "telefono"] });
await foto(page, "03-B-filtros", { ir: ["B", "abierta", "telefono"] });
await foto(page, "04-B-filtros-final", { ir: ["B", "abierta", "telefono"], hoja: 2000 });
await foto(page, "05-B-filtros-elegidos", { ir: ["B", "elegidos", "telefono"] });
await foto(page, "06-B-mas-filtros", { ir: ["B", "mas", "telefono"], hoja: 2000 });
await foto(page, "07-C-filtrada", { ir: ["C", "chips", "telefono"] });
await foto(page, "08-C-guardar-grupo", { ir: ["C", "guardar", "telefono"] });
await foto(page, "09-C-guardado", { ir: ["C", "guardado", "telefono"] });
await foto(page, "10-D-seleccionar", { ir: ["D", "nada", "telefono"] });
await foto(page, "11-D-cinco-elegidos", { ir: ["D", "cinco", "telefono"] });
await foto(page, "12-D-los-filtrados", { ir: ["D", "todos", "telefono"] });
await foto(page, "13-D-hoja-investigar", { ir: ["D", "hoja", "telefono"] });
await foto(page, "14-D-investigando", { ir: ["D", "corriendo", "telefono"] });
await foto(page, "15-E-por-aprobar", { ir: ["E", "panel", "telefono"] });
await foto(page, "16-E-por-aprobar-abajo", { ir: ["E", "panel", "telefono"], scroll: 1500 });
await foto(page, "17-E-tras-aceptar-una", { ir: ["E", "aceptada", "telefono"] });
await foto(page, "18-E-tras-aceptar-las-2", { ir: ["E", "artista", "telefono"] });
await foto(page, "19-E-nada-por-aprobar", { ir: ["E", "vacio", "telefono"] });
await foto(page, "20-F-portada", { ir: ["F", "portada", "telefono"] });
await foto(page, "21-G-ficha", { ir: ["G", "ficha", "telefono"] });
await foto(page, "22-G-hoja-estado", { ir: ["G", "estado", "telefono"] });
await foto(page, "23-G-por-revisar", { ir: ["G", "revisar", "telefono"] });
await foto(page, "24-G-ficha-candidata", { ir: ["G", "candidato", "telefono"] });
await ctx.close();

// Escritorio: 1280×800 a escala 1.
({ ctx, page } = await pagina(1760, 1000, 1));
await foto(page, "25-C-filtrada-1280", { ir: ["C", "chips", "escritorio"] });
await foto(page, "26-D-cinco-elegidos-1280", { ir: ["D", "cinco", "escritorio"] });
await foto(page, "27-E-por-aprobar-1280", { ir: ["E", "panel", "escritorio"] });
await foto(page, "28-G-ficha-1280", { ir: ["G", "ficha", "escritorio"] });
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
await pageR.goto(PROTO, { waitUntil: "load" });
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
const violeta = () => tel.locator('main button[class*="primario"], main a[class*="primario"]').count();
const etiqueta = async () => (await pageR.locator("#etiqueta").textContent()) ?? "";

// 1 · Filtros: la hoja; cada chip dice cuántos quedarían; «Más filtros» con el chevron abajo; «Ver N» cierra.
await toca(tel.getByRole("button", { name: /^Filtros/ }));
comprobar("la hoja «Filtros» se abre", await dialogo.getByRole("heading", { name: "Filtros" }).isVisible());
const cinco = await dialogo.getByRole("button", { name: /^5 o más/ }).textContent();
await toca(dialogo.getByRole("button", { name: /^5 o más/ }));
comprobar("«5 o más» queda elegido y el botón dice cuántos («Ver N artistas» = su cuenta)", (await dialogo.getByRole("button", { name: /^5 o más/ }).getAttribute("aria-pressed")) === "true" && (await dialogo.locator("[data-ver]").textContent()) === `Ver ${cinco.replace("5 o más", "").trim()} artistas`);
comprobar("«Más filtros» cerrado: no se ve «Investigación»", (await dialogo.getByRole("group", { name: "Investigación" }).count()) === 0);
await toca(dialogo.getByRole("button", { name: /Más filtros/ }));
comprobar("«Más filtros» se abre (aria-expanded)", (await dialogo.locator("[data-mas]").getAttribute("aria-expanded")) === "true" && await dialogo.getByRole("group", { name: "Investigación" }).isVisible());
await toca(dialogo.getByRole("button", { name: /^Sin investigar/ }));
await toca(dialogo.locator("[data-ver]"));
comprobar("«Ver …» cierra la hoja", (await dialogo.count()) === 0);
comprobar("lo puesto arriba con su ✕: «5 puntos o más» y «Sin investigar»", (await tel.getByRole("button", { name: "Quitar 5 puntos o más" }).count()) === 1 && (await tel.getByRole("button", { name: "Quitar Sin investigar" }).count()) === 1);
comprobar("el chip «Filtros» cuenta 2", (await texto('[aria-label="Filtros, orden y vista"] button')).includes("2"));
comprobar("la línea cuenta «N de 692 artistas»", (await texto(".ps-cifras")).includes("de 692 artistas"));
// 2 · Quitar con la ✕.
await toca(tel.getByRole("button", { name: "Quitar Sin investigar" }));
comprobar("la ✕ quita «Sin investigar»", (await tel.getByRole("button", { name: "Quitar Sin investigar" }).count()) === 0);
// 3 · Guardar como grupo: el nombre propuesto, su ✕, el botón que dice qué falta.
await toca(tel.getByRole("button", { name: "Guardar como grupo" }));
comprobar("la hoja propone el nombre «Artistas, 5+»", (await dialogo.locator("#campo-grupo").inputValue()) === "Artistas, 5+");
await toca(dialogo.getByRole("button", { name: "Borrar lo escrito" }));
comprobar("sin nombre, el botón dice «Falta el nombre»", (await dialogo.locator("[data-guardar-ya]").textContent()) === "Falta el nombre");
await pageR.keyboard.type("Los más fuertes", { delay: 20 });
comprobar("con nombre, «Guardar el grupo»", (await dialogo.locator("[data-guardar-ya]").textContent()) === "Guardar el grupo");
await toca(dialogo.locator("[data-guardar-ya]"));
comprobar("guardado: un solo chip con el nombre del grupo", (await tel.getByRole("button", { name: "Quitar Los más fuertes" }).count()) === 1 && (await tel.getByRole("button", { name: "Guardar como grupo" }).count()) === 0);
await toca(tel.getByRole("button", { name: /^Filtros/ }));
comprobar("en la hoja, «Tus grupos» lo trae elegido", (await dialogo.getByRole("group", { name: "Tus grupos" }).getByRole("button", { name: /Los más fuertes/ }).getAttribute("aria-pressed")) === "true");
await pageR.keyboard.press("Escape");
await pageR.waitForTimeout(200);
comprobar("Escape cierra la hoja", (await dialogo.count()) === 0);
// 4 · Seleccionar: casillas, el botón que dice qué hace, la hoja de Investigar con los elegidos.
await toca(tel.getByRole("button", { name: "Seleccionar", exact: true }));
comprobar("sin elegir, el botón dice «Elige a quién investigar»", (await texto("[data-investigar-sel]")) === "Elige a quién investigar");
const nombres = await tel.locator('[aria-label="Candidatos"] > li').evaluateAll((l) => l.slice(0, 2).map((x) => x.querySelector("a[data-ficha]").textContent));
await toca(tel.locator('[aria-label="Candidatos"] > li a[data-ficha]').nth(0));
await toca(tel.getByRole("checkbox", { name: `Elegir a ${nombres[1]}` }));
comprobar("tocar la tarjeta y su casilla eligen: «Investigar a 2 · hasta 2,00 USD»", (await texto("[data-investigar-sel]")) === "Investigar a 2 · hasta 2,00 USD");
comprobar("seleccionando, un solo botón violeta", (await violeta()) === 1);
const total = Number((await texto(".ps-casilla b")).match(/\d+/)[0]);
await toca(tel.locator(".ps-casilla"));
comprobar(`«Seleccionar los ${total}» los elige a todos`, (await texto("[data-investigar-sel]")) === `Investigar a ${total} · hasta ${total},00 USD`);
await toca(tel.locator(".ps-casilla"));
comprobar("otra vez, a ninguno", (await texto("[data-investigar-sel]")) === "Elige a quién investigar");
await toca(tel.locator('[aria-label="Candidatos"] > li a[data-ficha]').nth(0));
await toca(tel.locator("[data-investigar-sel]"));
comprobar("la hoja «Investigar a 1 artista» con su tope", await dialogo.getByRole("heading", { name: "Investigar a 1 artista" }).isVisible() && (await dialogo.locator("#campo-tope").inputValue()) === "1,00");
await toca(dialogo.getByRole("button", { name: "Investigar a 1 artista" }));
comprobar("al correr se cierra la selección y el renglón dice «Investigando a 1»", (await dialogo.count()) === 0 && (await tel.locator(".ps-casilla").count()) === 0 && (await texto('[class*="investigarLote"]')).includes("Investigando a 1"));
// 5 · Por aprobar: aceptar, lo que cambia, deshacer, aceptar las de un artista.
await toca(tel.getByRole("link", { name: /Por aprobar/ }));
comprobar("«Por aprobar» abre su pantalla", await tel.getByRole("heading", { name: "Por aprobar", level: 1 }).isVisible());
comprobar("dice «26 evidencias de 9 artistas»", (await texto("main p[role=status]")).startsWith("26 evidencias de 9 artistas"));
comprobar("la mención de Feleal dice «Obra 1 → 2 · total 7 → 8»", (await tel.locator('[data-aceptar="feleal-0"]').locator("..").textContent()).includes("Si la aceptas: Obra 1 → 2 · total 7 → 8"));
await toca(tel.locator('[data-aceptar="feleal-0"]'));
comprobar("aceptada: la línea de lo hecho con «Obra 1 → 2»", (await tel.locator("#ps-feleal + ul").textContent()).includes("Aceptaste Mención en un concurso estatal de acordeón, 2025 · Obra 1 → 2"));
comprobar("el renglón de Feleal sube a 8 de 8", (await texto("#ps-feleal small")).includes("8 de 8"));
comprobar("la cuenta baja a 25", (await texto("main p[role=status]")).startsWith("25 evidencias"));
await toca(tel.locator("#ps-feleal + ul").getByRole("button", { name: "Deshacer" }));
comprobar("«Deshacer» la devuelve: 7 de 8", (await texto("#ps-feleal small")).includes("7 de 8") && (await tel.locator('[data-aceptar="feleal-0"]').count()) === 1);
await toca(tel.getByRole("button", { name: "Aceptar las 2 de Feleal" }));
comprobar("«Aceptar las 2 de Feleal»: las dos hechas y el botón se va", (await tel.locator('#ps-feleal + ul [role="status"]').count()) === 2 && (await tel.getByRole("button", { name: "Aceptar las 2 de Feleal" }).count()) === 0);
await toca(tel.locator('[data-rechazar="pimpolina-3"]'));
comprobar("rechazar: «Rechazaste …»", (await tel.locator("#ps-pimpolina + ul").textContent()).includes("Rechazaste Video de una función completa en su canal"));
// 6 · El renglón del artista entra a su ficha; Atrás vuelve.
await toca(tel.locator('#ps-pimpolina a[data-ficha]'));
comprobar("entra a la ficha de Pimpolina", (await texto("main h1")).includes("Pimpolina"));
comprobar("la ficha avisa «3 por revisar»", (await texto(".ps-aviso")).includes("3 por revisar"));
await toca(tel.getByRole("link", { name: /Atrás/ }));
comprobar("Atrás vuelve a Por aprobar", await tel.getByRole("heading", { name: "Por aprobar", level: 1 }).isVisible());
// 7 · La ficha: el estado con chevron abajo abre su hoja; el aviso baja a Por revisar; el nombre abre la ficha pública.
await pageR.evaluate(() => window.prototipo.ir("G", "ficha"));
await pageR.waitForTimeout(300);
await toca(tel.locator("[data-estado]"));
comprobar("«Invitado» abre la hoja de Estado", await dialogo.getByRole("heading", { name: "Estado" }).isVisible());
await toca(dialogo.getByRole("button", { name: /^Revisado/ }));
comprobar("elegir «Revisado» cierra y el renglón lo dice", (await dialogo.count()) === 0 && (await texto("[data-estado] b")) === "Revisado");
await toca(tel.locator(".ps-aviso"));
await pageR.waitForTimeout(600);
comprobar("«2 por revisar» baja hasta Por revisar", await tel.locator("#ps-por-revisar").evaluate((h) => Math.abs(h.getBoundingClientRect().top) < 200));
await toca(tel.locator(".ps-publica"));
comprobar("el nombre abre la ficha pública", (await etiqueta()).includes("ficha pública"));
// 8 · La portada: «Evidencias del showcase» lleva a Por aprobar.
await pageR.evaluate(() => window.prototipo.ir("F", "portada"));
await pageR.waitForTimeout(300);
comprobar("Pendiente suma las 26", (await texto("main h2 b")) === "46");
await toca(tel.getByRole("link", { name: /Evidencias del showcase/ }));
comprobar("lleva a Por aprobar", await tel.getByRole("heading", { name: "Por aprobar", level: 1 }).isVisible());
// 9 · El indicador de la tarjeta lleva a Por aprobar en ese artista.
await pageR.evaluate(() => window.prototipo.ir("A", "hoy"));
await pageR.waitForTimeout(300);
await toca(tel.locator('a[data-aprobar="feleal"]'));
comprobar("la línea violeta de Feleal abre Por aprobar en Feleal", await tel.locator("#ps-feleal").evaluate((u) => Math.abs(u.getBoundingClientRect().top - 72) < 40));
// 10 · Buscar con su ✕.
await pageR.evaluate(() => window.prototipo.ir("A", "hoy"));
await pageR.waitForTimeout(300);
await toca(tel.getByRole("searchbox", { name: "Buscar artista del showcase" }));
await pageR.keyboard.type("Fel", { delay: 30 });
await pageR.waitForTimeout(200);
comprobar("«Fel» deja a Feleal y la ✕ aparece", (await tel.locator('[aria-label="Candidatos"] > li').count()) === 1 && (await tel.getByRole("button", { name: "Borrar la búsqueda" }).count()) === 1);
await toca(tel.getByRole("button", { name: "Borrar la búsqueda" }));
comprobar("la ✕ vacía la búsqueda y deja el foco", await tel.locator("[data-q]").evaluate((e) => document.activeElement === e && e.value === ""));
// 11 · Las notas en el teléfono: a 390 de ancho, la hoja sube con «Notas» y no hay desplazamiento horizontal.
const chica = await browser.newPage({ viewport: { width: 390, height: 844 } });
await chica.goto(PROTO, { waitUntil: "load" });
await chica.waitForFunction(() => document.documentElement.dataset.pintado);
comprobar("a 390, sin desplazamiento horizontal", await chica.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
await chica.getByRole("button", { name: "Notas" }).click();
await chica.waitForTimeout(400);
comprobar("a 390, «Notas» sube la hoja", await chica.evaluate(() => document.getElementById("hoja").classList.contains("abierta")));
console.log(`recorrido: ${ok} de ${ok + mal}`);
console.log("errores de página:", errores.length ? errores : "ninguno");
await browser.close();
process.exit(mal || errores.length ? 1 : 0);
