// Dibuja cada muestra (N-nombre.html) como PNG de 1080 × 1350 con el Chrome de la Mac.
// Necesita playwright-core, que el proyecto no instala: copiar este archivo a una carpeta
// con `npm install playwright-core` y pasarle la carpeta de las muestras.
//   node render.mjs <carpeta-de-muestras> [<carpeta-de-salida>]
import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";
import path from "node:path";
const origen = path.resolve(process.argv[2] || ".");
const salida = path.resolve(process.argv[3] || origen);
const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
for (const f of readdirSync(origen).filter((f) => /^\d-.*\.html$/.test(f))) {
  await p.goto("file://" + path.join(origen, f), { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(salida, f.replace(".html", ".png")) });
  console.log(f);
}
await b.close();
