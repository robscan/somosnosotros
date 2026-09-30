// Medición del DOM del prototipo, pantalla por pantalla (mismo medir.js que la auditoría, más contraste de iconos de control).
// node medir-prototipo.mjs http://127.0.0.1:8090/restructura-ui.html
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
const url = process.argv[2];
const medir = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), "medir.js"), "utf8")
  .replace('document.querySelector("main")', "document.querySelector('.pantalla:not([hidden])')");
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 480, height: 920 } });
await page.goto(url, { waitUntil: "load" });
await page.waitForTimeout(800);
const ids = await page.evaluate(() => [...document.querySelectorAll(".pantalla")].map((p) => p.dataset.id));
const filas = [];
for (const id of ids) {
  await page.evaluate((id) => document.querySelectorAll(".pantalla").forEach((p) => (p.hidden = p.dataset.id !== id)), id);
  await page.waitForTimeout(150);
  const m = await page.evaluate(medir);
  const sinEstilo = m.envoltorios.filter((e) => !e.conEstilo);
  filas.push({ id, nodos: m.nodos, prof: m.profundidadMax, envoltorios: sinEstilo.length, desbordes: m.desbordes.length, negativos: m.negativos.length, toques: m.toquesChicos.length, contraste: m.contraste.length });
  for (const e of sinEstilo) console.log("ENVOLTORIO", id, e.el, "→", e.hijo);
  for (const d of m.desbordes) console.log("DESBORDE", id, d.padre, "→", d.hijo, JSON.stringify(d.fuera));
  for (const n of m.negativos) console.log("NEGATIVO", id, n.el, n.margen.join(","));
  for (const t of m.toquesChicos) console.log("TOQUE", id, t.el, `${t.w}×${t.h}`, t.texto);
  for (const c of m.contraste) console.log("CONTRASTE", id, c.el, c.ratio, c.etiqueta);
}
console.table(filas);
await browser.close();
