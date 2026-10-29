// OL-490 (bitácora 522): recorre el prototipo `docs/rediseno/prototipos/instagram-estilo-propio.html` con el Chrome de la Mac, con toques reales
// (clic de Playwright en el centro del chip, nunca `element.click()`), lee el medidor de cada vista y guarda las capturas del teléfono a 2×.
//   node scripts/ops/auditoria-ui/capturar-instagram-estilo-propio.mjs <carpeta>
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const RAIZ = path.resolve(AQUI, "../../..");
const { chromium } = createRequire(path.join(RAIZ, "package.json"))("playwright-core");
const [dir] = process.argv.slice(2);
if (!dir) { console.error("uso: capturar-instagram-estilo-propio.mjs <carpeta>"); process.exit(1); }
fs.mkdirSync(dir, { recursive: true });
const url = "file://" + path.join(RAIZ, "docs/rediseno/prototipos/instagram-estilo-propio.html");
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const errores = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2, locale: "es-MX" });
page.on("pageerror", (e) => errores.push(String(e.message).slice(0, 200)));
page.on("console", (m) => { if (m.type() === "error") errores.push(m.text().slice(0, 200)); });
await page.goto(url, { waitUntil: "load" });
await page.waitForTimeout(600);

const tocar = async (grupo, texto) => {
  const b = page.locator(`${grupo} .chip`, { hasText: texto }).first();
  await b.click();
  await page.waitForTimeout(450);
};
const cifras = () => page.evaluate(() => Object.fromEntries([...document.querySelectorAll("#medidor .cifra")].map((c) => [c.textContent.replace(/^\d+/, ""), Number(c.querySelector("b").textContent)])));
const foto = async (nombre) => {
  await page.locator("#caja-tel").screenshot({ path: path.join(dir, `${nombre}.png`) });
  const m = await cifras();
  const mal = Object.entries(m).filter(([k, v]) => k !== "nodos" && k !== "profundidad" && v > 0);
  console.log(nombre, JSON.stringify(m), mal.length ? "· FALLA" : "· bien");
};

const RECORRIDO = [
  ["Artista 4:5", ["Las plantillas de hoy", "Repisa", "Cruce", "Papel"]],
  ["Lugar 4:5", ["Repisa", "Cruce", "Papel"]],
  ["Esta semana 4:5", ["Las plantillas de hoy", "Repisa", "Cruce", "Papel"]],
  ["Historia 9:16", ["Repisa"]],
  ["Casos límite", ["Repisa"]],
  ["Medida de nombres", []],
  ["Inicio hoy", []],
];
let n = 10;
for (const [pantalla, variantes] of RECORRIDO) {
  await tocar("#selector", pantalla);
  const id = await page.evaluate(() => location.hash.slice(1).split("/")[0]);
  if (!variantes.length) { await foto(`${n++}-${id}`); continue; }
  for (const v of variantes) {
    await tocar("#subselector", v);
    const letra = await page.evaluate(() => location.hash.slice(1).split("/")[1]);
    await foto(`${n++}-${id}-${letra}`);
  }
}
// Anchos: 320 y 1280 con la recomendada.
await tocar("#selector", "Artista 4:5");
await tocar("#subselector", "Repisa");
await tocar(".preajustes", "320");
await foto(`${n++}-artista-A-320`);
await tocar(".preajustes", "1280");
await page.locator("#plegar").click();
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(dir, `${n++}-artista-A-1280.png`), fullPage: false });
console.log("1280: pantalla completa");
// Con las notas plegadas, la historia a 1280; después las notas se abren otra vez.
const plegadas = await page.evaluate(() => document.body.dataset.notas);
await tocar("#selector", "Historia 9:16");
await page.screenshot({ path: path.join(dir, `${n++}-historia-A-1280.png`) });
await page.locator("#plegar").click();
await page.waitForTimeout(200);
console.log("notas:", plegadas, "→", await page.evaluate(() => document.body.dataset.notas));
await browser.close();
console.log(errores.length ? `ERRORES:\n${errores.join("\n")}` : "sin errores en la consola");
