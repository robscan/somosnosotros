// OL-502 (bitácora 535): las capturas del prototipo `publicar-sin-recargar.html` (Chrome de la Mac, playwright-core): cada estado a 390 × 844
// (2×) dentro del marco, y comprueba que el renglón del evento quede en el mismo sitio (mismo `top`) en todos los estados de la lista.
//
//   node scripts/ops/auditoria-ui/prototipo/capturar-publicar-sin-recargar.mjs <carpeta>
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const RAIZ = path.resolve(AQUI, "../../../..");
const { chromium } = createRequire(path.join(RAIZ, "package.json"))("playwright-core");
const MAC = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SALIDA = process.argv[2];
if (!SALIDA) { console.error("uso: capturar-publicar-sin-recargar.mjs <carpeta>"); process.exit(1); }
fs.mkdirSync(SALIDA, { recursive: true });
const URL_PROTO = "file://" + path.join(RAIZ, "docs/rediseno/prototipos/publicar-sin-recargar.html");
const EVENTO = "/eventos/delirium-pollum-clown-y-pantomima-con-pimpolina";

const browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE || (fs.existsSync(MAC) ? MAC : undefined), headless: true });
const errores = [];
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 2, locale: "es-MX" });
await ctx.addInitScript(() => { try { localStorage.clear(); } catch {} });
const page = await ctx.newPage();
page.on("pageerror", (e) => errores.push(String(e)));
page.on("console", (m) => { if (m.type() === "error" && !/fonts\.g/.test(m.text())) errores.push(m.text()); });
await page.goto(URL_PROTO);
await page.evaluate(() => window.prototipo.listo());
const estados = await page.evaluate(() => window.prototipo.estados());
const tops = {};
let n = 0;
for (const id of estados) {
  await page.evaluate((i) => window.prototipo.ir(i), id);
  await page.evaluate(() => window.prototipo.listo());
  await page.evaluate(() => document.getElementById("tel").contentDocument.fonts.ready.then(() => true));
  await page.waitForTimeout(250);
  const top = await page.evaluate((h) => {
    const doc = document.getElementById("tel").contentDocument;
    const a = doc.querySelector(`a[href="${h}"]`);
    return a ? Math.round(a.closest("li").getBoundingClientRect().top) : null;
  }, EVENTO);
  tops[id] = top;
  const archivo = path.join(SALIDA, `${String(++n).padStart(2, "0")}-${id}.png`);
  await page.locator("#tel").screenshot({ path: archivo });
  console.log(path.basename(archivo), "top del renglón:", top);
}
// El armazón entero (teléfono + notas) a 1440.
await page.evaluate(() => window.prototipo.ir("publicado"));
await page.evaluate(() => window.prototipo.listo());
await page.waitForTimeout(250);
await page.screenshot({ path: path.join(SALIDA, "00-escena-1440.png"), fullPage: false });
await browser.close();
const fijos = ["reposo", "en-camino", "reintentando", "publicado", "facebook", "facebook-ok", "fallido", "atras-cache"].map((id) => tops[id]);
const iguales = fijos.every((t) => t === fijos[0]);
fs.writeFileSync(path.join(SALIDA, "medicion.json"), JSON.stringify({ tops, mismoTop: iguales, errores }, null, 1));
console.log(iguales ? `el renglón queda en el mismo top (${fijos[0]} px) en los ${fijos.length} estados de la lista` : `OJO: el top cambia entre estados: ${JSON.stringify(tops)}`);
if (errores.length) { console.error("errores de página:", errores); process.exit(1); }
