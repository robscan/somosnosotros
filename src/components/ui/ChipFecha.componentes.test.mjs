/** Prueba de componente de `ui/ChipFecha` + `ui/SelectorFecha` en modo "filtro" (OL-218, bitácora 247): desde que
 *  se quitó el `<input type="date">` nativo (OL-188/OL-204, este mismo archivo antes de esta pieza), la hoja
 *  propia es la ÚNICA rama en cualquier pantalla — ya no hace falta simular escritorio y táctil por separado.
 *  Cubre las transiciones que firmó el founder en el prototipo (bitácora 245): elegir un día cierra la hoja sola,
 *  tocar el mismo día ya elegido lo quita, y reabrir con la pastilla muestra el día ya marcado; también que un
 *  día sin eventos no se puede elegir y que la navegación de mes se detiene donde ya no hay datos.
 *  Los días se ubican por `[data-fecha]` (estable), no por su nombre accesible: elegir un día cambia su propio
 *  `aria-label` al instante (agrega ", toca para quitar"), así que un `getByRole(..., {name})` tomado ANTES del
 *  toque dejaría de encontrar nada después.
 * PLAYWRIGHT_MODULE=/ruta/playwright-core/index.mjs CHROME_EXECUTABLE=/ruta/chrome node --test este-archivo
 */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const HOY = "2026-09-25"; // viernes, como en el prototipo firmado
// Días con eventos de ejemplo (el mismo patrón que el prototipo): 27 y 29 de septiembre, 4 de octubre; el 26 y
// el resto no traen nada, así que quedan "sin eventos".
const DIAS_ACTIVOS = [
  ["2026-09-27", 2],
  ["2026-09-29", 1],
  ["2026-10-04", 1],
];
let browser, server, dir, origin;

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "chipfecha-componentes-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React, {useState} from 'react';import {createRoot} from 'react-dom/client';
      import ChipFecha from './src/components/ui/ChipFecha';import './src/app/globals.css';
      window.qa = {fecha: '', cambios: []};
      const diasActivos = new Map(${JSON.stringify(DIAS_ACTIVOS)});
      function App(){
        const [fecha,setFecha]=useState('');
        window.qa.props = setFecha;
        return <ChipFecha fecha={fecha} onCambiar={(f)=>{window.qa.fecha=f;window.qa.cambios.push(f);setFecha(f);}} hoy='${HOY}' zona='America/Mexico_City' diasActivos={diasActivos}/>;
      }
      createRoot(document.getElementById('root')).render(<App/>);
    `,
    },
  });
  const assets = new Map([
    ["/", ["text/html", '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--fuente-bricolage:Arial}</style><div id="root"></div><script src="/app.js"></script>']],
    ["/app.js", ["text/javascript", await readFile(join(dir, "app.js"))]],
    ["/app.css", ["text/css", await readFile(join(dir, "app.css"))]],
  ]);
  server = createServer((req, res) => {
    const a = assets.get(req.url);
    res.writeHead(a ? 200 : 404, { "Content-Type": `${a?.[0] ?? "text/plain"}; charset=utf-8` });
    res.end(a?.[1] ?? "");
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  origin = `http://127.0.0.1:${server.address().port}`;
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE });
});
after(async () => {
  await browser?.close();
  if (server) await new Promise((r) => server.close(r));
  if (dir) await rm(dir, { recursive: true, force: true });
});

async function abrir() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  // `SelectorFecha` calcula "hoy" con `new Date()` de verdad (no solo con el prop `hoy`, que aquí es el límite
  // mínimo): sin fijar el reloj de la página, esta prueba se hubiera roto sola al pasar el 25 de septiembre (pasó
  // en la bitácora 247 — "hoy" avanzó durante la propia sesión y una prueba que ya no fijaba el reloj falló).
  await page.clock.install({ time: new Date(`${HOY}T12:00:00`) });
  await page.goto(origin);
  return { context, page };
}

/** El diálogo de la hoja, por su nombre accesible (OL-218: "Selecciona una fecha", ya no "Fecha"). */
function hoja(page) {
  return page.getByRole("dialog", { name: "Selecciona una fecha" });
}
/** Un día por su `data-fecha` (estable: el nombre accesible cambia al elegirlo, `[data-fecha]` no). */
function dia(page, fecha) {
  return page.locator(`[data-fecha="${fecha}"]`);
}

test("sin fecha, el chip es solo el ícono y abre la hoja con el mes actual", async () => {
  const { context, page } = await abrir();
  await page.getByLabel("Elegir fecha").click();
  await hoja(page).waitFor();
  await assert.doesNotReject(page.getByText("Septiembre de 2026").waitFor());
  // El mes actual: "Mes anterior" no se puede tocar (bitácora 245: no antes del mes de hoy).
  assert.equal(await page.getByLabel("Mes anterior").isDisabled(), true);
  await context.close();
});

test("un día sin eventos no se puede elegir (aria-disabled, sin efecto al tocarlo)", async () => {
  const { context, page } = await abrir();
  await page.getByLabel("Elegir fecha").click();
  const sinEventos = dia(page, "2026-09-26");
  await sinEventos.waitFor();
  assert.equal(await sinEventos.getAttribute("aria-label"), "sábado 26 de septiembre, sin eventos");
  assert.equal(await sinEventos.getAttribute("aria-disabled"), "true");
  await sinEventos.click({ force: true });
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => window.qa.fecha), ""); // nada cambió
  await assert.doesNotReject(hoja(page).waitFor()); // la hoja sigue abierta
  await context.close();
});

test('tocar un día disponible lo elige, filtra y cierra la hoja sola (sin botón "Listo")', async () => {
  const { context, page } = await abrir();
  await page.getByLabel("Elegir fecha").click();
  await assert.rejects(page.getByRole("button", { name: "Listo" }).waitFor({ timeout: 200 })); // no existe en modo "filtro"
  const domingo27 = dia(page, "2026-09-27");
  assert.equal(await domingo27.getAttribute("aria-label"), "domingo 27 de septiembre, 2 eventos");
  await domingo27.click();
  // Dentro de la pausa (180 ms): el círculo ya se ve elegido, la hoja todavía abierta, y el nombre accesible ya
  // dice "toca para quitar" (se actualiza al instante, no al cerrar).
  assert.equal(await domingo27.getAttribute("aria-selected"), "true");
  assert.equal(await domingo27.getAttribute("aria-label"), "domingo 27 de septiembre, 2 eventos, toca para quitar");
  await hoja(page).waitFor(); // sigue abierta a mitad de la pausa
  await page.waitForTimeout(250); // pasada la pausa
  await hoja(page).waitFor({ state: "hidden" });
  assert.equal(await page.evaluate(() => window.qa.fecha), "2026-09-27");
  await assert.doesNotReject(page.getByText("dom 27 sep").waitFor());
  await context.close();
});

test("reabrir con la pastilla (no la ✕) muestra el día ya marcado", async () => {
  const { context, page } = await abrir();
  await page.getByLabel("Elegir fecha").click();
  await dia(page, "2026-09-27").click();
  await page.waitForTimeout(250);
  await page.getByRole("button", { name: /Cambiar la fecha/ }).click();
  await hoja(page).waitFor();
  const marcado = dia(page, "2026-09-27");
  await marcado.waitFor();
  assert.equal(await marcado.getAttribute("aria-selected"), "true");
  assert.equal(await marcado.getAttribute("aria-label"), "domingo 27 de septiembre, 2 eventos, toca para quitar");
  await context.close();
});

test('tocar el mismo día ya elegido lo quita y cierra (reemplaza al "Quitar fecha")', async () => {
  const { context, page } = await abrir();
  await page.getByLabel("Elegir fecha").click();
  await dia(page, "2026-09-27").click();
  await page.waitForTimeout(250);
  await page.getByRole("button", { name: /Cambiar la fecha/ }).click();
  await hoja(page).waitFor();
  const marcado = dia(page, "2026-09-27");
  await marcado.click();
  // Dentro de la pausa: el círculo ya perdió el relleno y el nombre accesible vuelve al original.
  assert.equal(await marcado.getAttribute("aria-selected"), "false");
  assert.equal(await marcado.getAttribute("aria-label"), "domingo 27 de septiembre, 2 eventos");
  await page.waitForTimeout(250);
  await hoja(page).waitFor({ state: "hidden" });
  assert.equal(await page.evaluate(() => window.qa.fecha), "");
  await assert.doesNotReject(page.getByLabel("Elegir fecha").waitFor()); // vuelve a ser solo el ícono
  await context.close();
});

test("la ✕ del chip quita directo, sin abrir la hoja", async () => {
  const { context, page } = await abrir();
  await page.getByLabel("Elegir fecha").click();
  await dia(page, "2026-09-27").click();
  await page.waitForTimeout(250);
  await page.getByLabel("Quitar la fecha").click();
  assert.equal(await page.evaluate(() => window.qa.fecha), "");
  await assert.rejects(hoja(page).waitFor({ timeout: 200 }));
  await context.close();
});

test("mes siguiente: avanza a octubre y se detiene donde ya no hay datos", async () => {
  const { context, page } = await abrir();
  await page.getByLabel("Elegir fecha").click();
  await page.getByLabel("Mes siguiente").click();
  await assert.doesNotReject(page.getByText("Octubre de 2026").waitFor());
  assert.equal(await page.getByLabel("Mes siguiente").isDisabled(), true); // no hay datos después de octubre
  assert.equal(await page.getByLabel("Mes anterior").isDisabled(), false); // sí se puede volver a septiembre
  assert.equal(await dia(page, "2026-10-04").getAttribute("aria-label"), "domingo 4 de octubre, 1 evento");
  await context.close();
});

test("fuera del mes: vacío e intocable (sin `data-fecha`, `aria-hidden`)", async () => {
  const { context, page } = await abrir();
  await page.getByLabel("Elegir fecha").click();
  // Septiembre de 2026 empieza en martes: el lunes 31 de agosto es el primer relleno de la semana (primer botón
  // de la rejilla, en orden del DOM). `visibility: hidden` (CSS) lo saca de "visible" a propósito: se espera que
  // esté en el DOM ("attached"), no que se vea.
  const primero = page.locator('[role="grid"] button').first();
  await primero.waitFor({ state: "attached" });
  assert.equal(await primero.getAttribute("data-fecha"), null);
  assert.equal(await primero.getAttribute("aria-hidden"), "true");
  await context.close();
});
