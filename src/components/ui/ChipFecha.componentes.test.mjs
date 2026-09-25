/** Comportamiento real del `<input type="date">` nativo de ui/ChipFecha (bug OL-188: elegir "hoy" no filtraba
 *  porque el campo arrancaba con `value={hoy}`, y el navegador no dispara `change` al re-elegir el mismo valor).
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

test("sin filtro, el input nativo arranca vacío (nunca con hoy ya puesto)", async () => {
  const { context, input } = await abrirMovil();
  assert.equal(await input.inputValue(), "");
  await context.close();
});

test("elegir hoy en el input nativo filtra por hoy (bug OL-188)", async () => {
  const { context, page, input } = await abrirMovil();
  await input.fill(HOY);
  const fecha = await page.evaluate(() => window.qa.fecha);
  assert.equal(fecha, HOY);
  await context.close();
});

test("elegir cualquier otro día también llega tal cual a onCambiar", async () => {
  const { context, page, input } = await abrirMovil();
  await input.fill("2026-10-01");
  const fecha = await page.evaluate(() => window.qa.fecha);
  assert.equal(fecha, "2026-10-01");
  await context.close();
});
