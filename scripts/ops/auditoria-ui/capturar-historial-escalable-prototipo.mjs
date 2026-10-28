// Capturas, medición y recorrido del prototipo de la bitácora 501 (OL-469): `docs/rediseno/prototipos/historial-escalable.html`, abierto desde el
// disco en el Chrome real de la Mac (playwright-core). Cada estado a 390×844 (2×) y los de la propuesta también a 320 y 430: la captura es el
// teléfono (el `iframe`), y las cifras las del medidor de la página (`window.prototipo.medir`). Después el recorrido con toques reales dentro del
// teléfono: el dedo desliza el carril (`Input.synthesizeScrollGesture`, un gesto táctil de Chrome) y se mide que se movió él y no la página;
// «Ver los 9», la ✕ de la hoja, el chip «2025», «Ver más», un año plegado (L2) y «Informe» se tocan con el ratón en el centro de su caja,
// comprobado antes con `elementFromPoint` dentro del marco. Sin red salvo Google Fonts.
//   node scripts/ops/auditoria-ui/capturar-historial-escalable-prototipo.mjs <carpeta de salida> [--solo=texto]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const RAIZ = path.resolve(AQUI, "../..", "..");
const SALIDA = process.argv[2] && path.resolve(process.argv[2]);
if (!SALIDA) { console.error("uso: capturar-historial-escalable-prototipo.mjs <carpeta> [--solo=texto]"); process.exit(1); }
const solo = (process.argv.find((a) => a.startsWith("--solo=")) ?? "").slice(7);
const { chromium } = createRequire(path.join(RAIZ, "package.json"))("playwright-core");
const MAC = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PROTO = "file://" + path.join(RAIZ, "docs/rediseno/prototipos/historial-escalable.html");
fs.mkdirSync(SALIDA, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE || (fs.existsSync(MAC) ? MAC : undefined), headless: true, args: ["--hide-scrollbars"] });
const ctx = await browser.newContext({ viewport: { width: 900, height: 1300 }, deviceScaleFactor: 2, hasTouch: true, locale: "es-MX" });
const page = await ctx.newPage();
const errores = [];
page.on("pageerror", (e) => errores.push(String(e.message).slice(0, 300)));
await page.goto(PROTO);
await page.evaluate(() => { try { localStorage.clear(); } catch {} });
await page.goto(PROTO);
await page.waitForFunction(() => window.prototipo && document.documentElement.dataset.pintado);
const fallos = [];
const comprobar = (si, texto) => { console.log(si ? "     ok" : "     FALLA", "·", texto); if (!si) fallos.push(texto); };

async function ir(id, ancho = 390) {
  const r = await page.evaluate(async ([id, ancho]) => { await window.prototipo.ir(id, ancho); return window.prototipo.listo(); }, [id, ancho]);
  await page.waitForTimeout(250);
  return r;
}
const marco = () => page.frameLocator("#tel");
async function foto(nombre) {
  await page.locator("#tel").screenshot({ path: path.join(SALIDA, nombre + ".png") });
}

// 1. Cada estado a 390 y los de la propuesta a 320 y 430.
const estados = (await page.evaluate(() => window.prototipo.estados())).filter((id) => !solo || id.includes(solo));
const medidas = {};
for (const id of estados) {
  for (const ancho of id.includes("hoy") ? [390] : [390, 320, 430]) {
    const r = await ir(id, ancho);
    medidas[`${id}@${ancho}`] = r;
    await foto(ancho === 390 ? id : `${id}-${ancho}`);
    console.log(`${id}@${ancho}`.padEnd(34), `nodos ${r.nodos} · prof ${r.prof} · nuevo ${r.bloque}/${r.profBloque} · sin clase ${r.sinClase} · cortados ${r.cortados} (+${r.cede}) · desborde ${r.desborde} · fuera ${r.fuera} · <44 ${r.toques}${r.queCorta?.length ? " · corta: " + r.queCorta.join(" | ") : ""}${r.ajenos?.length ? " · fuera de la sección: " + r.ajenos.join(" | ") : ""}`);
    if (!id.includes("hoy")) comprobar(r.cortados === 0 && r.desborde === 0 && r.fuera === 0 && r.toques === 0 && r.sinClase === 0, `${id}@${ancho}: cero cortes, desbordes, toques fuera o chicos y nada sin clase`);
  }
}
fs.writeFileSync(path.join(SALIDA, "medidas.json"), JSON.stringify(medidas, null, 2));
if (solo) { await browser.close(); process.exit(fallos.length ? 1 : 0); }

// 2. El recorrido con toques reales dentro del teléfono.
const caja = await page.locator("#tel").boundingBox();
/** El centro de un elemento del marco, en la página, si nada lo tapa (elementFromPoint dentro del marco). */
async function centro(locator) {
  await locator.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(150);
  const p = await locator.evaluate((el) => { const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const e = el.ownerDocument.elementFromPoint(x, y); return e && (e === el || el.contains(e)) ? { x, y } : null; });
  if (!p) throw new Error("algo tapa: " + (await locator.textContent()));
  return { x: caja.x + p.x, y: caja.y + p.y };
}
async function tocar(locator) { const p = await centro(locator); await page.mouse.click(p.x, p.y); await page.evaluate(() => window.prototipo.listo()); await page.waitForTimeout(300); }
const estadoActual = () => page.evaluate(() => window.prototipo.estado().estado);

console.log("\nrecorrido");
await ir("lugar-r-ana");
const carril = marco().locator("ul[data-propuesta=carril]");
const antes = await carril.evaluate((el) => ({ izq: el.scrollLeft, pagina: el.ownerDocument.defaultView.visualViewport.offsetLeft + el.ownerDocument.defaultView.scrollX, ancho: el.scrollWidth, visible: el.clientWidth }));
const pc = await centro(carril);
const cdp = await ctx.newCDPSession(page);
await cdp.send("Input.synthesizeScrollGesture", { x: Math.round(pc.x + 120), y: Math.round(pc.y), xDistance: -260, yDistance: 0, gestureSourceType: "touch", speed: 800 });
await page.waitForTimeout(700);
const despues = await carril.evaluate((el) => ({ izq: el.scrollLeft, pagina: el.ownerDocument.defaultView.visualViewport.offsetLeft + el.ownerDocument.defaultView.scrollX }));
await foto("recorrido-01-carril-deslizado");
comprobar(antes.ancho > antes.visible && despues.izq > 0 && despues.pagina === 0, `el dedo desliza el carril (${antes.izq} → ${despues.izq} px de ${antes.ancho - antes.visible}) y la página no se corre (${despues.pagina})`);
await tocar(marco().getByRole("link", { name: /^Ver los 9/ }));
comprobar((await estadoActual()) === "lugar-r-todos", "«Ver los 9» abre la hoja con los nueve");
comprobar((await marco().locator("[role=dialog] li").count()) === 9, "la hoja tiene 9 renglones");
await foto("recorrido-02-ver-los-9");
await tocar(marco().getByRole("button", { name: "Cerrar" }));
comprobar((await estadoActual()) === "lugar-r-ana", "la ✕ cierra la hoja y vuelve a la sección");
await tocar(marco().getByRole("button", { name: /^2025/ }));
comprobar((await estadoActual()) === "lugar-r-2025", "el chip «2025» cambia la lista a ese año");
comprobar((await marco().locator("details[open] > h3").first().textContent()).includes("2025"), "el primer mes es de 2025");
await foto("recorrido-03-chip-2025");
await ir("lugar-r-ana");
await tocar(marco().getByRole("button", { name: "Ver más" }));
comprobar((await estadoActual()) === "lugar-r-tanda-2", "«Ver más» trae la segunda tanda");
comprobar((await marco().locator("details[open] > ul:not([data-propuesta]) > li").count()) === 40, "con 40 renglones de 2026 a la vista");
await ir("lugar-l2");
const anio = marco().locator("details.he-anio > summary").first();
await tocar(anio);
comprobar(await marco().locator("details.he-anio").first().evaluate((d) => d.open), "L2: tocar «2025» abre su año");
await foto("recorrido-04-l2-anio-abierto");
await tocar(anio);
comprobar(!(await marco().locator("details.he-anio").first().evaluate((d) => d.open)), "y tocarlo otra vez lo pliega");
await ir("lugar-r-ana");
await tocar(marco().getByRole("button", { name: "Informe" }));
comprobar((await estadoActual()) === "lugar-r-informe", "«Informe» abre la hoja del PDF");
const hojaCabe = await marco().locator("[role=dialog]").evaluate((el) => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= el.ownerDocument.documentElement.clientWidth + 1; });
comprobar(hojaCabe, "la hoja del PDF cabe en la pantalla");
await foto("recorrido-05-informe");
await tocar(marco().getByRole("button", { name: "Cerrar" }));
await ir("artista-r-ana");
await tocar(marco().getByRole("link", { name: /^Ver los 8/ }));
comprobar((await estadoActual()) === "artista-r-todos", "en el artista, «Ver los 8» abre la hoja de lugares");
await ir("artista-r-ana");
await tocar(marco().getByRole("button", { name: "Presentación" }));
comprobar((await estadoActual()) === "artista-r-presentacion", "y «Presentación» abre su hoja");
await ir("lugar-r-ana");

console.log(`\nerrores de página: ${errores.length}${errores.length ? "\n  " + errores.join("\n  ") : ""}`);
console.log(fallos.length ? `\n${fallos.length} comprobaciones fallaron` : "\ntodas las comprobaciones en verde");
await browser.close();
process.exit(fallos.length ? 1 : 0);
