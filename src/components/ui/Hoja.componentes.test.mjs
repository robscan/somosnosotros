/** La hoja (`ui/Hoja`): en el teléfono sube desde abajo, con el asa y solo las esquinas de arriba redondas; desde 792 (OL-236,
 *  bitácora 264) es un diálogo al centro de la ventana, de la columna de ancho, con las cuatro esquinas redondas y sin asa; si no
 *  cabe, se queda a 48 de la ventana y se desplaza.
 * PLAYWRIGHT_MODULE=/ruta/playwright-core/index.mjs CHROME_EXECUTABLE=/ruta/chromium node --test este-archivo
 * (no corre con `npm test`, que solo toma `.test.ts`, como las demás `.componentes.test.mjs` del repo). */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../../", import.meta.url));
let dir, server, browser, origin;

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "hoja-componentes-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import Hoja from './src/components/ui/Hoja';
      import './src/app/globals.css';
      // ?alto=largo: un cuerpo más alto que la ventana; ?titulo=1: con cabecera fija (ui/Hoja, prop titulo) y un pie.
      const q = new URLSearchParams(location.search);
      function App() {
        const [abierta, setAbierta] = React.useState(true);
        if (!abierta) return <p id="cerrada">cerrada</p>;
        const cuerpo = <div style={{ height: q.get('alto') === 'largo' ? 2400 : 120 }}>cuerpo</div>;
        return q.get('titulo')
          ? <Hoja etiqueta="Prueba" titulo="Prueba" pie={<button type="button">Ver</button>} onCerrar={() => setAbierta(false)}>{cuerpo}</Hoja>
          : <Hoja etiqueta="Prueba" onCerrar={() => setAbierta(false)}><h3>Prueba</h3>{cuerpo}</Hoja>;
      }
      createRoot(document.getElementById('root')).render(<App />);
    `,
    },
  });
  const assets = new Map([
    ["/", ["text/html", '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--fuente-bricolage:Arial}</style><div id="root"></div><script src="/app.js"></script>']],
    ["/app.js", ["text/javascript", await readFile(join(dir, "app.js"))]],
    ["/app.css", ["text/css", await readFile(join(dir, "app.css"))]],
  ]);
  server = createServer((req, res) => {
    const a = assets.get(req.url.split("?")[0]);
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

async function abrir(t, ancho, alto, consulta = "") {
  const context = await browser.newContext({ viewport: { width: ancho, height: alto } });
  t.after(() => context.close());
  const p = await context.newPage();
  p.setDefaultTimeout(5000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  t.after(() => assert.deepEqual(errors, []));
  await p.goto(origin + consulta);
  await p.locator("[role=dialog]").waitFor();
  return p;
}
/** La caja de la hoja, sus esquinas (arriba-izquierda, abajo-izquierda) y si el asa se dibuja. */
const hoja = (p) =>
  p.locator("[role=dialog]").evaluate((e) => {
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    const d = (v) => Math.round(v * 10) / 10;
    return { x: d(r.left), y: d(r.top), w: d(r.width), h: d(r.height), b: d(r.bottom), arriba: cs.borderTopLeftRadius, abajo: cs.borderBottomLeftRadius, asa: getComputedStyle(e, "::before").display };
  });

test("teléfono: la hoja sube desde abajo, del ancho de la ventana, con el asa y solo las esquinas de arriba redondas", async (t) => {
  const p = await abrir(t, 390, 844);
  const h = await hoja(p);
  assert.deepEqual([h.x, h.w, h.b, h.arriba, h.abajo, h.asa], [0, 390, 844, "24px", "0px", "block"]);
});

test("desde 792: la hoja es un diálogo de 600 al centro de la ventana, con las cuatro esquinas redondas y sin asa", async (t) => {
  for (const [ancho, alto] of [[820, 1180], [1280, 800]]) {
    const p = await abrir(t, ancho, alto);
    const h = await hoja(p);
    assert.equal(h.w, 600, `${ancho}: la columna`);
    assert.ok(Math.abs(h.x + h.w / 2 - ancho / 2) <= 0.5, `${ancho}: centrada a lo ancho (${h.x})`);
    assert.ok(Math.abs(h.y + h.h / 2 - alto / 2) <= 0.5, `${ancho}: centrada a lo alto (${h.y}, ${h.h})`);
    assert.deepEqual([h.arriba, h.abajo, h.asa], ["24px", "24px", "none"], `${ancho}: esquinas y asa`);
    const cerrar = await p.getByRole("button", { name: "Cerrar" }).evaluate((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.right), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; });
    assert.ok(cerrar[0] <= h.x + h.w && cerrar[1] >= h.y && cerrar[2] >= 44 && cerrar[3] >= 44, `${ancho}: la ✕ va dentro, arriba a la derecha, y se toca en 44: ${cerrar}`);
  }
});

test("desde 792: una hoja con cabecera fija y pie también va al centro, y una más alta que la ventana se queda a 48 y desplaza su cuerpo", async (t) => {
  const p = await abrir(t, 1280, 800, "?titulo=1&alto=largo");
  const h = await hoja(p);
  assert.equal(h.w, 600);
  assert.ok(h.h <= 800 - 48 + 0.5, `no pasa de la ventana menos 48: ${h.h}`);
  assert.ok(Math.abs(h.y + h.h / 2 - 400) <= 0.5, "centrada a lo alto");
  const pie = await p.getByRole("button", { name: "Ver" }).evaluate((e) => Math.round(e.getBoundingClientRect().bottom));
  assert.ok(pie <= h.b, `el pie queda dentro de la hoja: ${pie} de ${h.b}`);
  const cuerpo = await p.locator("[role=dialog] > div").first().evaluate((e) => [e.scrollHeight > e.clientHeight, getComputedStyle(e).overflowY]);
  assert.deepEqual(cuerpo, [true, "auto"], "solo el cuerpo se desplaza");
});

test("la hoja se cierra con la ✕, con Escape y tocando fuera, en el teléfono y en escritorio", async (t) => {
  for (const [ancho, alto] of [[390, 844], [1280, 800]]) {
    for (const como of ["equis", "escape", "fuera"]) {
      const p = await abrir(t, ancho, alto);
      if (como === "equis") await p.getByRole("button", { name: "Cerrar" }).click();
      else if (como === "escape") await p.keyboard.press("Escape");
      else await p.mouse.click(5, 5);
      await p.locator("#cerrada").waitFor();
    }
  }
});
