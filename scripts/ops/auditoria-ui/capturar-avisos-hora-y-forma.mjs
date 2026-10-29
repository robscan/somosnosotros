// Capturas, medición y recorrido del prototipo de la bitácora 510 (OL-478): `docs/rediseno/prototipos/avisos-hora-y-forma.html`, abierto desde
// el disco en el Chrome real de la Mac (playwright-core). Cada estado a 390×844 (2×) y los de la propuesta también a 320 y 430: la captura es el
// teléfono (el `iframe`) y las cifras las del medidor de la página (`window.prototipo.medir`). Después el recorrido con toques reales: el ratón
// en el centro de la caja de cada cosa dentro del teléfono, comprobado antes con `elementFromPoint` dentro del marco (nunca `element.click()`),
// y los chips del armazón igual. Sin red salvo Google Fonts.
//   node scripts/ops/auditoria-ui/capturar-avisos-hora-y-forma.mjs <carpeta de salida> [--solo=texto]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const RAIZ = path.resolve(AQUI, "../../..");
const SALIDA = process.argv[2] && path.resolve(process.argv[2]);
if (!SALIDA) { console.error("uso: capturar-avisos-hora-y-forma.mjs <carpeta> [--solo=texto]"); process.exit(1); }
const solo = (process.argv.find((a) => a.startsWith("--solo=")) ?? "").slice(7);
const { chromium } = createRequire(path.join(RAIZ, "package.json"))("playwright-core");
const MAC = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PROTO = "file://" + path.join(RAIZ, "docs/rediseno/prototipos/avisos-hora-y-forma.html");
fs.mkdirSync(SALIDA, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE || (fs.existsSync(MAC) ? MAC : undefined), headless: true, args: ["--hide-scrollbars"] });
const ctx = await browser.newContext({ viewport: { width: 980, height: 1300 }, deviceScaleFactor: 2, locale: "es-MX" });
const page = await ctx.newPage();
const errores = [];
page.on("pageerror", (e) => errores.push(String(e.message).slice(0, 300)));
page.on("console", (m) => { if (m.type() === "error" && !/fonts\.(googleapis|gstatic)/.test(m.text())) errores.push(m.text().slice(0, 300)); });
await page.goto(PROTO);
await page.evaluate(() => { try { localStorage.clear(); } catch {} });
await page.goto(PROTO);
await page.waitForFunction(() => window.prototipo && document.documentElement.dataset.pintado);
const fallos = [];
const comprobar = (si, texto) => { console.log(si ? "     ok" : "     FALLA", "·", texto); if (!si) fallos.push(texto); };

async function ir(id, ancho = 390) {
  const r = await page.evaluate(async ([id, ancho]) => window.prototipo.ir(id, ancho), [id, ancho]);
  await page.waitForTimeout(300);
  return r;
}
const foto = (nombre) => page.locator("#tel").screenshot({ path: path.join(SALIDA, nombre + ".png") });

// 1. Cada estado a 390 y los de la propuesta a 320 y 430.
const estados = (await page.evaluate(() => window.prototipo.estados())).filter((e) => !solo || e.id.includes(solo));
const medidas = {};
for (const e of estados) {
  for (const ancho of e.v === "hoy" ? [390] : [390, 320, 430]) {
    const r = await ir(e.id, ancho);
    medidas[`${e.id}@${ancho}`] = r;
    await foto(ancho === 390 ? e.id : `${e.id}-${ancho}`);
    if (e.app) {
      console.log(`${e.id}@${ancho}`.padEnd(24), `prof ${r.prof} · nuevo ${r.nodos} en ${r.bloques} · sin clase ${r.sinClase} · <44 ${r.toques} · cortados ${r.cortados} · desborde ${r.desborde + r.fuera}${r.chicos.length ? " · chicos: " + r.chicos.join(" | ") : ""}${r.corta.length ? " · corta: " + r.corta.join(" | ") : ""}`);
      if (e.v !== "hoy") comprobar(r.sinClase === 0 && r.toques === 0 && r.cortados === 0 && r.desborde + r.fuera === 0, `${e.id}@${ancho}: lo nuevo sin cortes, desbordes, toques chicos ni nada sin clase`);
    } else {
      console.log(`${e.id}@${ancho}`.padEnd(24), `avisos ${r.avisos} · títulos cortados ${r.titulos} · cuerpos de más ${r.cuerpos} · caben ${r.cabeTitulo} / ${r.cabeCuerpo} · desborde ${r.desborde}${r.cortes.length ? " · " + r.cortes.join(" | ") : ""}`);
      // Android cerrado enseña una línea de cuerpo a propósito (se abre para leer el resto): se mide, no se exige.
      if (e.v !== "hoy" && !e.id.includes("largos") && !e.id.startsWith("o-android") && r.avisos) comprobar(ancho === 320 || (r.titulos === 0 && r.cuerpos === 0), `${e.id}@${ancho}: ningún texto de la propuesta se corta`);
      comprobar(r.desborde === 0, `${e.id}@${ancho}: sin desborde`);
    }
  }
}
// 1.b Los avisos de la propuesta también a 375 (el iPhone más angosto con iOS 26: SE de 2.ª y 3.ª generación, 12 y 13 mini): ninguno se corta.
//     Solo se mide (sin captura); a 320 se miden y se fotografían, pero no hay iPhone con iOS 26 de ese ancho.
for (const e of estados.filter((x) => !x.app && x.v !== "hoy" && !x.id.includes("largos") && !x.id.startsWith("o-android") && x.id !== "h-dia")) {
  const r = await ir(e.id, 375);
  medidas[`${e.id}@375`] = r;
  console.log(`${e.id}@375`.padEnd(24), `títulos cortados ${r.titulos} · cuerpos de más ${r.cuerpos} · caben ${r.cabeTitulo} / ${r.cabeCuerpo}${r.cortes.length ? " · " + r.cortes.join(" | ") : ""}`);
  comprobar(r.titulos === 0 && r.cuerpos === 0, `${e.id}@375: ningún texto de la propuesta se corta`);
}
fs.writeFileSync(path.join(SALIDA, "medidas.json"), JSON.stringify(medidas, null, 2));
if (solo) { await browser.close(); process.exit(fallos.length ? 1 : 0); }

// 2. El recorrido con toques reales dentro del teléfono.
const marco = () => page.frameLocator("#tel");
async function centro(locator) {
  const caja = await page.locator("#tel").boundingBox();
  await locator.evaluate((el) => { const r = el.getBoundingClientRect(); if (r.top < 0 || r.bottom > el.ownerDocument.defaultView.innerHeight) el.scrollIntoView({ block: "center" }); });
  await page.waitForTimeout(150);
  const p = await locator.evaluate((el) => { const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const e = el.ownerDocument.elementFromPoint(x, y); return e && (e === el || el.contains(e)) ? { x, y } : null; });
  if (!p) throw new Error("algo tapa: " + (await locator.textContent()));
  return { x: caja.x + p.x, y: caja.y + p.y };
}
async function tocar(locator) { const p = await centro(locator); await page.mouse.click(p.x, p.y); await page.evaluate(() => window.prototipo.listo()); await page.waitForTimeout(300); }
async function chip(nombre, grupo = "#sel-estado") { const b = page.locator(`${grupo} button`, { hasText: nombre }).first(); const r = await b.boundingBox(); await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2); await page.evaluate(() => window.prototipo.listo()); await page.waitForTimeout(300); }
const estadoActual = () => page.evaluate(() => window.prototipo.estado().estado);

console.log("\nrecorrido");
await ir("b-resumen");
await tocar(marco().locator("[data-aviso]").first());
comprobar((await estadoActual()) === "b-novedades", "tocar el resumen abre Novedades");
await page.locator("#tel").screenshot({ path: path.join(SALIDA, "recorrido-01-resumen-abre-novedades.png") });
await ir("b-semana");
await tocar(marco().locator("[data-aviso]").first());
comprobar((await estadoActual()) === "d-hoy", "tocar «Esta semana» abre Inicio en Destacados");
await ir("b-uno-lugar");
await tocar(marco().locator("[data-aviso]").first());
comprobar(/eventos\/noche-de-danzon\?desde=aviso&tipo=nuevo/.test(await page.locator("#etiqueta").textContent()), "un evento: dice que abre la ficha con ?desde=aviso&tipo=nuevo");
// La tarjeta: Activar → permiso del sistema → Permitir → Listo.
await chip("Permiso «Esta semana»", "#sel-pantalla");
await chip("Tarjeta en el sitio del banner");
await tocar(marco().getByRole("button", { name: "Activar" }));
comprobar((await estadoActual()) === "d-permiso", "«Activar» abre el permiso del sistema");
await page.locator("#tel").screenshot({ path: path.join(SALIDA, "recorrido-02-permiso.png") });
await tocar(marco().getByRole("button", { name: "Permitir", exact: true }));
comprobar((await estadoActual()) === "d-listo", "«Permitir» deja «Listo: te avisamos los jueves»");
comprobar(await marco().getByText("Listo: te avisamos los jueves").isVisible(), "se ve «Listo»");
await chip("Tarjeta en el sitio del banner");
await tocar(marco().getByRole("button", { name: "Ahora no" }));
comprobar((await estadoActual()) === "d-hoy", "la ✕ (Ahora no) quita la tarjeta y vuelve el banner");
await chip("Tarjeta al final del carril");
const fin = await marco().locator("[data-propuesta]").evaluate((el) => { const ul = el.closest("ul"); return { izq: ul.scrollLeft, max: ul.scrollWidth - ul.clientWidth }; });
comprobar(fin.max > 0 && fin.izq >= fin.max - 2, "A: la tarjeta es la última del carril (el carril va al final)");
await tocar(marco().getByRole("button", { name: "Activar" }));
comprobar((await estadoActual()) === "d-permiso", "A: «Activar» también abre el permiso");
// Ajustes: la palanca, la ciudad y la hoja.
await chip("Ajustes › Avisos", "#sel-pantalla");
await chip("Encendido");
await tocar(marco().getByRole("switch", { name: "Lo destacado de la semana" }));
comprobar((await estadoActual()) === "a-no", "apagar «Lo destacado de la semana»");
comprobar((await marco().getByRole("button", { name: /^Ciudad/ }).count()) === 0, "apagado, sin el renglón de la ciudad");
await tocar(marco().getByRole("switch", { name: "Lo destacado de la semana" }));
comprobar((await estadoActual()) === "a-si", "encenderlo otra vez");
await tocar(marco().getByRole("button", { name: /^Ciudad/ }));
comprobar((await estadoActual()) === "a-hoja", "«Ciudad» abre la hoja de ciudades");
comprobar(await marco().getByRole("dialog", { name: "Ciudad de lo destacado" }).isVisible(), "la hoja se llama «Ciudad de lo destacado»");
await page.locator("#tel").screenshot({ path: path.join(SALIDA, "recorrido-03-hoja-ciudad.png") });
await tocar(marco().getByRole("dialog").getByRole("button", { name: "Querétaro" }));
comprobar((await estadoActual()) === "a-queretaro", "elegir Querétaro cierra la hoja");
comprobar(await marco().getByText("Querétaro", { exact: true }).isVisible(), "el renglón dice Querétaro");
await tocar(marco().getByRole("button", { name: /^Ciudad/ }));
await tocar(marco().getByRole("dialog").getByRole("button", { name: "Cerrar", exact: true }));
comprobar((await estadoActual()) === "a-si", "la ✕ de la hoja vuelve a Ajustes");
// Administración: el indicador abre y cierra su desglose.
await chip("Administración", "#sel-pantalla");
await chip("Avisos abiertos");
await tocar(marco().getByRole("button", { name: /^Avisos abiertos/ }));
comprobar((await estadoActual()) === "m-desglose", "el indicador abre su desglose");
comprobar(await marco().getByText("Esta semana en San Luis Potosí: 0 de 8").isVisible(), "el desglose por tipo");
await tocar(marco().getByRole("button", { name: /^Avisos abiertos/ }));
comprobar((await estadoActual()) === "m-si", "y lo cierra");
// Los tamaños.
await chip("320", "#sel-tam");
comprobar((await page.locator("#tel").boundingBox()).width === 320, "el chip 320 pone el marco a 320");
await chip("390", "#sel-tam");
comprobar(errores.length === 0, "sin errores en la consola" + (errores.length ? ": " + errores.join(" | ") : ""));
await browser.close();
console.log(fallos.length ? `\n${fallos.length} fallos` : "\ntodo bien");
process.exit(fallos.length ? 1 : 0);
