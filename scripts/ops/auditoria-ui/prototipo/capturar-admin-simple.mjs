// OL-493 (bitácora 525): las capturas, la medición y el recorrido con toques reales del prototipo `admin-simple.html` (Chrome de la Mac,
// playwright-core). Mide cada estado a 320, 390, 430, 768 y 1024 con el medidor del prototipo; saca cada estado a 390 × 844 (2×) dentro del
// marco, unos a 320, 430, 768 y 1024, y el armazón entero a 1440; y recorre los toques: el ratón del navegador sobre el punto del elemento
// (Playwright `click`, que comprueba que lo que recibe el toque es ese elemento), nunca `element.click()`.
//
//   node scripts/ops/auditoria-ui/prototipo/capturar-admin-simple.mjs <carpeta> [--solo=medir|capturas|recorrido]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const RAIZ = path.resolve(AQUI, "../../../..");
const { chromium } = createRequire(path.join(RAIZ, "package.json"))("playwright-core");
const MAC = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SALIDA = process.argv[2];
const solo = (process.argv.find((a) => a.startsWith("--solo=")) ?? "").slice(7);
if (!SALIDA) { console.error("uso: capturar-admin-simple.mjs <carpeta>"); process.exit(1); }
fs.mkdirSync(SALIDA, { recursive: true });
const URL_PROTO = "file://" + path.join(RAIZ, "docs/rediseno/prototipos/admin-simple.html");

const browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE || (fs.existsSync(MAC) ? MAC : undefined), headless: true });
const errores = [];
const nueva = async (ancho = 1440) => {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: 1400 }, deviceScaleFactor: 2, locale: "es-MX" });
  await ctx.addInitScript(() => { try { localStorage.clear(); } catch {} });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error" && !/fonts\.g/.test(m.text())) errores.push(m.text()); });
  await page.goto(URL_PROTO);
  await page.evaluate(() => window.prototipo.listo());
  return page;
};
const ir = (page, id, ancho = 390) => page.evaluate(([i, a]) => window.prototipo.ir(i, a), [id, ancho]);
const tel = (page) => page.frameLocator("#tel");
const esperarFuentes = (page) => page.evaluate(() => document.getElementById("tel").contentDocument.fonts.ready.then(() => true));

const page = await nueva();
const estados = await page.evaluate(() => window.prototipo.estados());

// 1. La medición de cada estado en cada ancho.
if (!solo || solo === "medir") {
  const filas = [];
  for (const id of estados) for (const ancho of [320, 390, 430, 768, 1024]) {
    await ir(page, id, ancho);
    await esperarFuentes(page);
    const r = await page.evaluate(() => window.prototipo.medir());
    filas.push({ id, ancho, ...r });
  }
  fs.writeFileSync(path.join(SALIDA, "medicion.json"), JSON.stringify(filas, null, 1));
  const linea = (f) => `${(f.id + "@" + f.ancho).padEnd(20)} nodos ${f.nodos} · prof ${f.prof} · nuevo ${f.bloque} · cortes ${f.cortados} · desborde ${f.desborde} · fuera ${f.fuera} · <44 ${f.toques}` +
    (f.id.startsWith("p-") ? ` · rótulos ${f.rotulos} · pantallas ${f.pantallas}` : "") + (f.chipsTotal ? ` · chips enteros ${f.chipsEnteros}/${f.chipsTotal}` : "") + (f.cuadros ? ` · se sale ${f.seSale} · cuadros ${f.cuadros} en ${f.porFila} filas · texto ${f.anchoTexto}px · frase ${f.renglones} renglones · alto ${f.altoCuadro}` : "");
  for (const f of filas) console.log(linea(f));
  const mal = filas.filter((f) => f.cortados || f.desborde || f.fuera || f.toques);
  console.log(mal.length ? "CON NOVEDADES:\n" + mal.map((f) => `  ${f.id}@${f.ancho}: cortes ${f.queCorta.join(" | ")} · desborde ${f.desborde} · fuera ${f.fuera} · <44 ${f.chicos.join(", ")}`).join("\n") : "medición: 0 textos cortados, 0 desbordes, 0 toques fuera, 0 toques < 44 en lo nuevo, en todos los estados y anchos");
}

// 2. Las capturas.
const CAPTURAS = [
  ["01-portada-hoy", "p-hoy"], ["02-portada-a", "p-a"], ["03-portada-a-abierto", "p-a-abierto"], ["04-todos-los-numeros", "p-a-hoja"],
  ["06-portada-b", "p-b"], ["07-portada-c", "p-c"],
  ["10-instagram-hoy-entrar", "i-hoy-todas"], ["11-instagram-hoy-ciudad", "i-hoy-slp"], ["12-instagram-conectada", "i-ok"], ["12b-instagram-junto-a-la-ciudad", "i-ok-junto"], ["13-hoja-conectada", "i-ok-hoja"],
  ["14-instagram-sin-conexion", "i-no"], ["15-hoja-sin-conexion", "i-no-hoja"], ["16-instagram-caduco", "i-mal"], ["17-hoja-caduco", "i-mal-hoja"],
  ["18-instagram-semana-vacia", "i-vacia"], ["19-hoja-ciudades", "i-hoja-ciudad"],
];
const desplazar = (donde) => page.evaluate((d) => {
  const doc = document.getElementById("tel").contentDocument;
  const c = doc.querySelector('[role="dialog"] [class$="_cuerpo"]');
  if (c) c.scrollTop = d === "fin" ? c.scrollHeight : c.scrollHeight / 2;
  else doc.scrollingElement.scrollTop = d === "fin" ? doc.scrollingElement.scrollHeight : doc.scrollingElement.scrollHeight / 2;
}, donde);
if (!solo || solo === "capturas") {
  for (const [nombre, id] of CAPTURAS) {
    await ir(page, id, 390);
    await esperarFuentes(page);
    await page.waitForTimeout(250);
    await page.locator("#tel").screenshot({ path: path.join(SALIDA, `${nombre}.png`) });
  }
  // Más abajo: la portada de hoy (lo que queda bajo los números) y la propuesta (sus tres grupos), y el final de la hoja (Campañas pasadas).
  for (const [nombre, id, donde] of [["01b-portada-hoy-medio", "p-hoy", "medio"], ["01c-portada-hoy-fin", "p-hoy", "fin"], ["02b-portada-a-fin", "p-a", "fin"], ["05-todos-los-numeros-fin", "p-a-hoja", "fin"], ["07b-portada-c-fin", "p-c", "fin"]]) {
    await ir(page, id, 390);
    await esperarFuentes(page);
    await desplazar(donde);
    await page.waitForTimeout(250);
    await page.locator("#tel").screenshot({ path: path.join(SALIDA, `${nombre}.png`) });
  }
  for (const [nombre, id, ancho] of [["20-portada-a-320", "p-a", 320], ["21-portada-b-320", "p-b", 320], ["22-portada-a-430", "p-a", 430], ["23-portada-b-430", "p-b", 430], ["24-portada-a-768", "p-a", 768], ["25-portada-b-768", "p-b", 768], ["26-portada-a-1024", "p-a", 1024], ["27-instagram-conectada-320", "i-ok", 320], ["27b-instagram-junto-320", "i-ok-junto", 320], ["29-instagram-semana-vacia-320", "i-vacia", 320], ["28-instagram-conectada-768", "i-ok", 768]]) {
    await ir(page, id, ancho);
    await esperarFuentes(page);
    await page.waitForTimeout(250);
    await page.locator("#tel").screenshot({ path: path.join(SALIDA, `${nombre}.png`) });
  }
  await ir(page, "p-a", 390);
  await page.screenshot({ path: path.join(SALIDA, "00-armazon.png"), fullPage: false });
}

// 3. El recorrido con toques reales: abrir Administración → «Ver todos los números» → volver → Instagram → la hoja de la conexión → cerrar.
if (!solo || solo === "recorrido") {
  const p = await nueva();
  const pasos = [];
  const paso = async (que, fn, espera) => {
    try { await fn(); } catch (e) { pasos.push(`MAL · ${que} (${String(e).split("\n")[0]})`); return; }
    await p.waitForFunction((e) => document.documentElement.dataset.pintado?.startsWith(e + "@"), espera, { timeout: 5000 }).then(() => pasos.push(`bien · ${que}`), async () => pasos.push(`MAL · ${que} (esperaba ${espera}, está ${await p.evaluate(() => document.documentElement.dataset.pintado)})`));
  };
  const t = tel(p);
  await paso("abrir Administración (A)", async () => {}, "p-a");
  await paso("tocar «Voy y Me interesa»", () => t.locator('button[data-cuadro="voy"]').click(), "p-a-abierto");
  await paso("tocarlo otra vez (se cierra)", () => t.locator('button[data-cuadro="voy"]').click(), "p-a");
  await paso("«Ver todos los números»", () => t.getByRole("button", { name: "Ver todos los números ›" }).click(), "p-a-hoja");
  await paso("bajar la hoja hasta «Campañas pasadas» y cerrar con la ✕", async () => { await t.getByRole("heading", { name: "Campañas pasadas" }).scrollIntoViewIfNeeded(); await t.getByRole("button", { name: "Cerrar" }).click(); }, "p-a");
  await paso("«Ver todos los números» otra vez", () => t.getByRole("button", { name: "Ver todos los números ›" }).click(), "p-a-hoja");
  await paso("tocar fuera de la hoja (el velo) la cierra", () => t.locator('[class$="_fondo"]').click({ position: { x: 20, y: 20 } }), "p-a");
  await paso("entrar a Instagram (renglón de Difusión)", async () => { const r = t.getByRole("link", { name: /^Instagram/ }); await r.scrollIntoViewIfNeeded(); await r.click(); }, "i-ok");
  await paso("tocar el icono de la conexión", () => t.getByRole("button", { name: "Instagram: conectada" }).click(), "i-ok-hoja");
  await paso("cerrar la hoja con la ✕", () => t.getByRole("button", { name: "Cerrar" }).click(), "i-ok");
  await paso("Atrás (Administración)", () => t.getByRole("link", { name: "Atrás (Administración)" }).click(), "p-a");
  // El icono de la conexión a 320 sigue a la vista (pegado a la derecha) y se toca.
  await ir(p, "i-ok", 320);
  await paso("a 320: el icono de la conexión se toca", () => t.getByRole("button", { name: "Instagram: conectada" }).click(), "i-ok-hoja");
  await ir(p, "p-a", 390);
  const ancho = await p.evaluate(() => { const d = document.getElementById("tel").contentDocument.documentElement; return [d.scrollWidth, d.clientWidth]; });
  pasos.push(`${ancho[0] <= ancho[1] ? "bien" : "MAL"} · sin desplazamiento a lo ancho a 390 en la portada (${ancho[0]}/${ancho[1]})`);
  fs.writeFileSync(path.join(SALIDA, "recorrido.txt"), pasos.join("\n") + "\n");
  console.log(pasos.join("\n"));
  console.log(`recorrido: ${pasos.filter((x) => x.startsWith("bien")).length} de ${pasos.length}`);
}
console.log(errores.length ? "ERRORES DE PÁGINA:\n" + [...new Set(errores)].join("\n") : "sin errores de página ni de consola");
await browser.close();
