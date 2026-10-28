// Evidencia del prototipo OL-466 (bitácora 498, docs/rediseno/prototipos/alta-cartel-existente.html) con el Chrome real de la Mac
// (playwright-core del repo): 1) cada estado del teléfono a 390×844 (2×), y a 320 y 430 los que cambian, con el bloque nuevo a la vista, midiendo
// la pantalla con medir.js (nodos, profundidad, desbordes, toques de menos de 44) y el bloque nuevo por su cuenta (nodos, profundidad, div o span
// sin clase, textos cortados, toques); 2) la accesibilidad del bloque (nombres, orden de lectura, contraste de la nota, foco con Tab); 3) el
// recorrido con toques reales: clics de ratón por coordenadas en los selectores y, dentro del teléfono, en cada salida de «¿Es este?», «Ver el
// evento», el renglón y Atrás, comprobando antes con elementFromPoint que nada tapa el botón. Las capturas salen sin comprimir; al repo van con
// comprimir.mjs.
//   node scripts/ops/auditoria-ui/capturar-alta-cartel-existente.mjs <carpeta>
// La misma evidencia sobre la app real, ya con el código de OL-467 (bitácora 499): `capturar-alta-cartel-existente-app.mjs`.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const SALIDA = process.argv[2];
if (!SALIDA) { console.error("uso: capturar-alta-cartel-existente.mjs <carpeta>"); process.exit(1); }
const { chromium } = createRequire(path.join(RAIZ, "package.json"))("playwright-core");
const PROTO = pathToFileURL(path.join(RAIZ, "docs/rediseno/prototipos/alta-cartel-existente.html")).href;
const MEDIR = fs.readFileSync(path.join(RAIZ, "scripts/ops/auditoria-ui/medir.js"), "utf8");
fs.mkdirSync(SALIDA, { recursive: true });
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--hide-scrollbars"] });
const errores = [];
const filas = [];
const fallos = [];
const comprobar = (si, texto) => { console.log(si ? "  ok" : "  FALLA", texto); if (!si) fallos.push(texto); };

const ctx = await browser.newContext({ viewport: { width: 1000, height: 1000 }, deviceScaleFactor: 2, locale: "es-MX" });
const page = await ctx.newPage();
page.on("pageerror", (e) => errores.push(String(e.message).slice(0, 200)));
page.on("console", (m) => { if (m.type() === "error") errores.push(m.text().slice(0, 200)); });
await page.goto(PROTO, { waitUntil: "load" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "load" });
await page.waitForFunction(() => document.documentElement.dataset.pintado);
await page.evaluate(() => document.fonts.ready);
const marco = () => page.frames().find((f) => f !== page.mainFrame());
const tel = () => page.frameLocator("#tel");
const pintado = () => page.evaluate(() => document.documentElement.dataset.pintado);
const estado = async () => (await pintado()).split("@")[0];
const listo = () => page.evaluate(() => window.prototipo.listo().then(() => true));

/** Un clic de ratón en el centro de un elemento, por coordenadas. Dentro del teléfono, antes se comprueba con elementFromPoint que el punto cae
 *  en el propio botón (un velo invisible o un pie que lo tape haría fallar el toque en el iPhone). */
async function tocar(locator, { dentro = false } = {}) {
  // Dentro del teléfono, al centro de lo que se ve (como quien desplaza hasta él): así el pie fijo no lo tapa por cómo quedó el desplazamiento.
  if (dentro) await locator.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await locator.scrollIntoViewIfNeeded();
  if (dentro) {
    const libre = await locator.evaluate((el) => { const r = el.getBoundingClientRect(); const x = r.left + r.width / 2; const y = r.top + r.height / 2; const e = document.elementFromPoint(x, y); return !!e && (e === el || el.contains(e)); });
    if (!libre) throw new Error("algo tapa el botón: " + (await locator.textContent()));
  }
  const caja = await locator.boundingBox();
  if (!caja) throw new Error("sin caja para tocar");
  await page.mouse.click(caja.x + caja.width / 2, caja.y + caja.height / 2);
  await listo();
  await page.waitForTimeout(250);
}
const chip = (grupo, texto) => page.locator(`[aria-label="${grupo}"] button`, { hasText: texto });
async function elegir(pantalla, nombre, ancho = 390) {
  await tocar(chip("Pantalla", pantalla).first());
  await tocar(page.locator('[aria-label="Variante y estado"] button').filter({ hasText: new RegExp(`^${nombre.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) }));
  await tocar(chip("Ancho", String(ancho)).filter({ hasText: new RegExp(`^${ancho}$`) }));
}
const dentro = (texto) => tel().locator("button, a").filter({ hasText: new RegExp(`^\\s*${texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`) });
async function medir(id) {
  const f = marco();
  await f.evaluate(() => document.fonts.ready);
  const m = await f.evaluate(MEDIR);
  const p = await page.evaluate(() => window.prototipo.medir());
  filas.push({ id, nodos: m.nodos, prof: m.profundidadMax, desbordes: m.desbordes.length, "toques<44 (pantalla)": m.toquesChicos.length, bloque: p.bloque || "–", "prof. bloque": p.bloque ? p.profBloque : "–", "sin clase": p.bloque ? p.sinClase : "–", cortados: p.cortados, "a propósito": p.cede, "toques<44 (bloque)": p.bloque ? p.toques : "–" });
  for (const d of m.desbordes) console.log("  DESBORDE", id, d.padre, "→", d.hijo, JSON.stringify(d.fuera));
  for (const t of m.toquesChicos) console.log("  toque < 44 en la pantalla (de hoy, fuera del bloque):", id, t.el, `${t.w}×${t.h}`, t.texto);
}
/** La captura del teléfono con lo nuevo a la vista (el bloque o el final al centro; sin bloque, arriba). */
async function foto(nombre, { arriba = false, hasta = null } = {}) {
  const f = marco();
  await f.evaluate(([arr, h]) => {
    const titulo = h && [...document.querySelectorAll("h2")].find((x) => x.textContent === h);
    if (titulo) return titulo.scrollIntoView({ block: "start" });
    const b = document.querySelector('[data-propuesta="parecidos"], [data-propuesta="final"], .Parecidos-module__F5-COa__parecidos');
    if (b && !arr) b.scrollIntoView({ block: "center" }); else window.scrollTo(0, 0);
  }, [arriba, hasta]);
  await page.waitForTimeout(300);
  await page.locator("#tel").screenshot({ path: path.join(SALIDA, nombre + ".png") });
  await medir(nombre);
  console.log(nombre, await pintado());
}

// 1. Cada estado.
const CAPTURAS = [
  ["01-hoy-leyendo", "1 · Al leer el cartel", "Hoy: «Leyendo el cartel…»", [390], true],
  ["02-c2-sin-cartel", "1 · Al leer el cartel", "C2 · sin cartel", [390, 320, 430], true],
  ["03-c2-ya-tiene-cartel-otra-persona", "1 · Al leer el cartel", "C2 · ya tiene cartel (de otra persona)", [390, 320], true],
  ["04-c1-primer-paso", "1 · Al leer el cartel", "C1 · como primer paso", [390], true],
  ["05-revisa-hoy", "2 · Revisa, al publicar", "Hoy", [390]],
  ["06-revisa-a1-sin-cartel", "2 · Revisa, al publicar", "A1 · sin cartel", [390, 320, 430]],
  ["07-revisa-a2-los-dos-en-la-caja", "2 · Revisa, al publicar", "A2 · los dos en la caja", [390]],
  ["08-revisa-b-quien-lo-publico", "2 · Revisa, al publicar", "B · ya tiene cartel (quien lo publicó)", [390]],
  ["09-revisa-b-otra-persona", "2 · Revisa, al publicar", "B · ya tiene cartel (otra persona)", [390, 320, 430]],
  ["10-revisa-tras-no-es-otro", "2 · Revisa, al publicar", "Tras «No, es otro» en 1", [390], true],
  ["11-final-tu-cartel", "3 · Al terminar", "Listo: tu cartel", [390, 320, 430], true],
  ["12-final-cambiamos-su-cartel", "3 · Al terminar", "Listo: cambiamos su cartel", [390], true],
  ["13-ficha-despues", "3 · Al terminar", "La ficha, después", [390], true],
  ["14-ficha-antes-hoy", "3 · Al terminar", "Hoy: la ficha sin cartel", [390], true],
  ["15-hoy-no-es-otro-publicado", "3 · Al terminar", "Hoy: «No, es otro»", [390], true],
];
for (const [nombre, pantalla, est, anchos, arriba] of CAPTURAS) {
  for (const ancho of anchos) {
    await elegir(pantalla, est, ancho);
    await foto(ancho === 390 ? nombre : `${nombre}-${ancho}`, { arriba });
  }
}
// La ficha después, más abajo: quién se presenta y la descripción que leyó el cartel.
await elegir("3 · Al terminar", "La ficha, después");
await foto("13b-ficha-despues-artistas", { hasta: "Artistas" });
// La pregunta en la espera (C2), a 390, cabe entera sin desplazar: el cartel, la caja y el pie.
await elegir("1 · Al leer el cartel", "C2 · sin cartel", 390);
const cabe = await marco().evaluate(() => { const b = document.querySelector('[data-propuesta="parecidos"]').getBoundingClientRect(); const p = document.querySelector('[data-propuesta="pie"]').getBoundingClientRect(); return b.bottom <= p.top + 1 && b.top >= 0; });
comprobar(cabe, "C2 a 390: el cartel, la caja y el pie se ven juntos sin desplazar");
for (const f of filas) {
  if (f.bloque !== "–") comprobar(f["sin clase"] === 0 && f.cortados === 0 && f.desbordes === 0 && f["toques<44 (bloque)"] === 0, `${f.id}: sin envoltorios sin clase (${f["sin clase"]}), sin textos cortados (${f.cortados}), sin desbordes (${f.desbordes}) y sin toques < 44 en el bloque (${f["toques<44 (bloque)"]})`);
}

// 2. Accesibilidad del bloque: los botones se leen por su texto, el orden de lectura, el contraste de la nota y el foco con Tab.
const CONTRASTE = () => {
  const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => { const t = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * t(r) + 0.7152 * t(g) + 0.0722 * t(b); };
  const fondo = (el) => { for (let e = el; e; e = e.parentElement) { const v = rgb(getComputedStyle(e).backgroundColor); if (v.length === 3 || (v.length === 4 && v[3] > 0)) return getComputedStyle(e).backgroundColor; } return "rgb(255, 255, 255)"; };
  const ratio = (el) => { const [x, y] = [lum(rgb(getComputedStyle(el).color)), lum(rgb(fondo(el)))].sort((m, n) => n - m); return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100; };
  const b = document.querySelector('[data-propuesta="parecidos"]');
  const notaB = b.querySelector("p:not(:first-child)");
  return { orden: [...b.children].map((e) => e.tagName.toLowerCase() + (e.tagName === "BUTTON" ? ":" + e.textContent : "")).join(" → "), texto: ratio(b.querySelector("p")), nota: notaB ? ratio(notaB) : null, apagado: b.querySelector('[aria-disabled="true"]')?.textContent ?? null };
};
await elegir("2 · Revisa, al publicar", "B · ya tiene cartel (otra persona)");
const acc = await marco().evaluate(CONTRASTE);
console.log(" ", JSON.stringify(acc));
comprobar(acc.texto >= 4.5 && acc.nota >= 4.5, `B ajeno: contraste AA del texto (${acc.texto}) y de la nota «Solo quien lo publicó…» (${acc.nota}) sobre la caja`);
comprobar(acc.orden === "p → ul → button:Sí, es este: cambiar su cartel por el mío → p → button:No, es otro: publicar de todos modos", `B ajeno: orden de lectura ${acc.orden}`);
comprobar((await tel().getByRole("button", { name: "Sí, es este: cambiar su cartel por el mío" }).getAttribute("aria-disabled")) === "true", "B ajeno: el botón apagado lo anuncia el lector (aria-disabled) y sigue enfocable");
comprobar((await tel().getByRole("link", { name: "Sí, es este: ir al evento" }).count()) === 1, "B: «Sí, es este: ir al evento» es un enlace a su ficha");
await elegir("2 · Revisa, al publicar", "A1 · sin cartel");
const orden = await marco().evaluate(CONTRASTE);
comprobar(orden.orden === "p → ul → button:No, es otro: publicar de todos modos", `A1: la caja se lee «¿Es este?», el renglón y «No, es otro» (${orden.orden})`);
comprobar((await tel().locator('[data-propuesta="pie"]').getByRole("button", { name: "Sí, es este: ponerle mi cartel" }).count()) === 1, "A1: el pie dice «Sí, es este: ponerle mi cartel» (un solo botón principal)");
comprobar((await tel().locator(".Boton-module__VE_zQa__primario").count()) === 1, "A1: un solo botón principal en la pantalla");
await elegir("2 · Revisa, al publicar", "A2 · los dos en la caja");
comprobar((await tel().locator(".Boton-module__VE_zQa__primario").count()) === 2, "A2: dos botones principales a la vez (por eso A1)");
// Foco con Tab de verdad hasta el botón del pie en A1.
await elegir("2 · Revisa, al publicar", "A1 · sin cartel");
await page.locator("#tel").focus();
let foco = null;
for (let i = 0; i < 40; i++) { await page.keyboard.press("Tab"); foco = await marco().evaluate(() => { const a = document.activeElement; const s = getComputedStyle(a); return { texto: a.textContent.trim(), estilo: s.outlineStyle, ancho: parseFloat(s.outlineWidth) }; }); if (foco.texto === "Sí, es este: ponerle mi cartel") break; }
comprobar(foco.texto === "Sí, es este: ponerle mi cartel" && foco.estilo !== "none" && foco.ancho >= 2, `A1: foco visible con Tab en el botón del pie (${foco.estilo} ${foco.ancho}px), después de «No, es otro»`);
await page.waitForTimeout(1500); // la entrada de «Revisa» (cada renglón sube con su turno) termina antes de la captura
await page.locator("#tel").screenshot({ path: path.join(SALIDA, "16-revisa-a1-foco.png") });

// 3. Recorrido con toques reales dentro del teléfono.
await elegir("1 · Al leer el cartel", "C2 · sin cartel");
await tocar(dentro("Sí, es este: ponerle mi cartel"), { dentro: true });
comprobar((await estado()) === "final-a", "C2: «Sí, es este: ponerle mi cartel» termina en «Listo: tu cartel ya está en el evento»");
comprobar((await tel().getByRole("heading", { name: "Listo: tu cartel ya está en el evento" }).count()) === 1, "el final dice «Listo: tu cartel ya está en el evento»");
await tocar(dentro("Ver el evento"), { dentro: true });
comprobar((await estado()) === "ficha-despues", "«Ver el evento» abre la ficha del evento que ya estaba, con el cartel");
await foto("17-recorrido-ficha-despues", { arriba: true });
await tocar(tel().locator('a[aria-label^="Atrás"]').first(), { dentro: true });
comprobar((await estado()) === "final-a", "Atrás de la ficha vuelve al final");
await elegir("1 · Al leer el cartel", "C2 · sin cartel");
await tocar(dentro("No, es otro: seguir"), { dentro: true });
comprobar((await estado()) === "revisa-tras-c", "C2: «No, es otro: seguir» sigue a «Revisa»");
comprobar((await tel().locator(".Parecidos-module__F5-COa__parecidos").count()) === 0, "y «Revisa» ya no vuelve a preguntar");
await elegir("2 · Revisa, al publicar", "A1 · sin cartel");
await tocar(tel().locator(".Parecidos-module__F5-COa__parecidos a"), { dentro: true });
comprobar((await estado()) === "ficha-antes", "A1: el renglón sigue abriendo la ficha (no se quita lo que existe)");
await elegir("2 · Revisa, al publicar", "A1 · sin cartel");
await tocar(dentro("No, es otro: publicar de todos modos"), { dentro: true });
comprobar((await estado()) === "final-publicado-hoy", "A1: «No, es otro: publicar de todos modos» publica como hoy");
await elegir("2 · Revisa, al publicar", "A1 · sin cartel");
await tocar(dentro("Sí, es este: ponerle mi cartel"), { dentro: true });
comprobar((await estado()) === "final-a", "A1: el pie lleva al final");
await elegir("2 · Revisa, al publicar", "B · ya tiene cartel (otra persona)");
await tocar(dentro("Sí, es este: cambiar su cartel por el mío"), { dentro: true });
comprobar((await estado()) === "revisa-b-ajeno", "B ajeno: el botón apagado no hace nada");
comprobar(/Solo quien lo publicó/.test(await page.locator("#etiqueta").textContent()) || /Apagado/.test(await page.locator("#etiqueta").textContent()), "y el prototipo dice por qué");
await tocar(dentro("Sí, es este: ir al evento"), { dentro: true });
comprobar((await estado()) === "ficha-feleal", "B: «Sí, es este: ir al evento» abre su ficha");
await elegir("2 · Revisa, al publicar", "B · ya tiene cartel (quien lo publicó)");
await tocar(dentro("Sí, es este: cambiar su cartel por el mío"), { dentro: true });
comprobar((await estado()) === "final-b", "B dueño: cambiar su cartel termina en «Listo: cambiamos su cartel por el tuyo»");
await elegir("1 · Al leer el cartel", "C2 · ya tiene cartel (de otra persona)");
await tocar(dentro("Sí, es este: ir al evento"), { dentro: true });
comprobar((await estado()) === "ficha-feleal", "C2 con cartel: «ir al evento» abre su ficha");

// 4. La página entera del prototipo, a 1280 (el armazón con sus notas) y el teléfono a 1280.
await page.setViewportSize({ width: 1440, height: 1000 });
await elegir("2 · Revisa, al publicar", "A1 · sin cartel", 1280);
await foto("18-revisa-a1-1280");
await elegir("1 · Al leer el cartel", "C2 · sin cartel", 390);
await page.setViewportSize({ width: 1280, height: 1000 });
await page.screenshot({ path: path.join(SALIDA, "19-prototipo-1280.png"), fullPage: true });

console.table(filas);
fs.writeFileSync(path.join(SALIDA, "medidas.json"), JSON.stringify(filas, null, 2));
console.log("errores de la página:", errores.length ? errores : "ninguno");
console.log(fallos.length ? `FALLAN ${fallos.length}: ${fallos.join(" · ")}` : "todas las comprobaciones pasan");
await browser.close();
process.exit(fallos.length || errores.length ? 1 : 0);
