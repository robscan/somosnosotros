/** Comportamiento real del `<input type="date">` nativo de ui/ChipFecha:
 *  - bug OL-188: elegir "hoy" no filtraba porque el campo arrancaba con `value={hoy}`, y el navegador no dispara
 *    `change` al re-elegir el mismo valor.
 *  - bug OL-204 (regresión de OL-188, bitácora 233): en Safari de iPhone, abrir el selector con el campo vacío
 *    hace que el sistema ponga hoy y dispare `change` de inmediato, antes de que la persona elija nada; aplicar
 *    ese `change` filtraba solo por abrir el selector y lo cerraba de golpe. Ahora se aplica al `blur` (cerrar el
 *    selector con "Listo" o tocando fuera), no en cada `change`. Chrome no reproduce el selector nativo de iOS
 *    (el sistema operativo no lo pinta), así que aquí se simulan los eventos `change`/`blur` a mano, en el orden
 *    en que Safari los dispara.
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
const HOY = "2026-09-25";
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
      window.qa = {fecha: ''};
      function App(){
        const [fecha,setFecha]=useState('');
        window.qa.props = setFecha;
        return <ChipFecha fecha={fecha} onCambiar={(f)=>{window.qa.fecha=f;setFecha(f);}} hoy='${HOY}' zona='America/Mexico_City'/>;
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

// Ancho < 760px: `usePunteroFinoAncho` da false pase lo que pase con el puntero, así que ChipFecha muestra el
// `<input type="date">` nativo (la rama táctil/móvil), no la hoja propia de escritorio.
async function abrirMovil() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(origin);
  const input = page.getByLabel("Elegir fecha");
  await input.waitFor();
  return { context, page, input };
}

// Simula lo que dispara el navegador al abrir/mover/cerrar el selector nativo, sin depender de que Chrome pinte
// el widget de iOS (no lo pinta): pone el valor a mano y dispara los eventos reales del DOM sobre el input real.
async function simular(page, input, eventos) {
  for (const ev of eventos) {
    if (ev.tipo === "focus") await input.focus();
    else if (ev.tipo === "change")
      // El setter de la instancia (el que React reescribe para el campo controlado) no dispara nada si el valor
      // "ya estaba puesto" para React: hay que pasar por el setter nativo del prototipo, como el navegador.
      await input.evaluate((el, valor) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        setter.call(el, valor);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }, ev.valor);
    // Como en iOS/Android reales: mover el foco fuera del campo con un toque fuera (`el.blur()` a mano no siempre
    // llega a React, que delega `focusout`; un clic lejos del chip sí lo dispara de verdad).
    else if (ev.tipo === "blur") await page.mouse.click(370, 800);
  }
}

test("sin filtro, el input nativo arranca vacío (nunca con hoy ya puesto)", async () => {
  const { context, input } = await abrirMovil();
  assert.equal(await input.inputValue(), "");
  await context.close();
});

test("iOS al abrir: `change` con hoy sin blur no filtra todavía (bug OL-204, el input sigue montado)", async () => {
  const { context, page, input } = await abrirMovil();
  await simular(page, input, [{ tipo: "focus" }, { tipo: "change", valor: HOY }]);
  assert.equal(await page.evaluate(() => window.qa.fecha), ""); // antes del arreglo, aquí ya quedaba en HOY
  assert.equal(await input.isVisible(), true); // el chip no pasó a la rama "con fecha": no se desmontó ni cerró
  await context.close();
});

test("cerrar el selector (`blur`) tras elegir hoy sí filtra por hoy (bug OL-188 sigue arreglado)", async () => {
  const { context, page, input } = await abrirMovil();
  await simular(page, input, [{ tipo: "focus" }, { tipo: "change", valor: HOY }, { tipo: "blur" }]);
  assert.equal(await page.evaluate(() => window.qa.fecha), HOY);
  await context.close();
});

test("cancelar sin elegir (`blur` sin `change` antes) no filtra", async () => {
  const { context, page, input } = await abrirMovil();
  await simular(page, input, [{ tipo: "focus" }, { tipo: "blur" }]);
  assert.equal(await page.evaluate(() => window.qa.fecha), "");
  await context.close();
});

test("elegir cualquier otro día también llega tal cual a onCambiar, al cerrar", async () => {
  const { context, page, input } = await abrirMovil();
  await simular(page, input, [{ tipo: "focus" }, { tipo: "change", valor: "2026-10-01" }, { tipo: "blur" }]);
  const fecha = await page.evaluate(() => window.qa.fecha);
  assert.equal(fecha, "2026-10-01");
  await context.close();
});

test("orden de Chrome de Android (`blur` antes que `change`): igual se aplica, una sola vez", async () => {
  const { context, page, input } = await abrirMovil();
  await simular(page, input, [{ tipo: "focus" }, { tipo: "blur" }, { tipo: "change", valor: HOY }]);
  assert.equal(await page.evaluate(() => window.qa.fecha), HOY);
  await context.close();
});
