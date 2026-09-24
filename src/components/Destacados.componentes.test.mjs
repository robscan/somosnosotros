/** El chip «Te interesa» de las tarjetas del carril (OL-176, bitácora 211): el mismo chip del renglón, apilado con
 *  «N van» en la esquina inferior izquierda de la foto, solo cuando el llamador pasa `estadoDe` (los carriles de
 *  eventos); sin ese prop (lugares, artistas) no aparece nada, como antes de esta pieza.
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

const root = fileURLToPath(new URL("../../", import.meta.url));
let dir, server, browser, origin;

const mocks = {
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link(p){return React.createElement('a',p)}",
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "destacados-componentes-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import Destacados from './src/components/Destacados';import './src/app/globals.css';

      function tarjeta(id, van) { return { id, href: '/eventos/' + id, foto: '/sin-foto.png', titulo: 'Evento ' + id, detalle: 'vie 10 de oct · 19:00', van }; }
      function boton(id) { return { decidido: false, nombreAccesible: 'Voy — Evento ' + id, alTocar() {} }; }
      function botonDecidido(id) { return { decidido: true, nombreAccesible: 'Voy — Evento ' + id, alTocar() {} }; }

      // Carril de eventos: las cuatro combinaciones de "Te interesa" y "N van".
      const conLosDos = tarjeta('con-los-dos', 3);
      const soloInteresa = tarjeta('solo-interesa', 0);
      const soloVan = tarjeta('solo-van', 5);
      const sinNada = tarjeta('sin-nada', 0);
      const estadoEventos = (id) => (id === 'con-los-dos' || id === 'solo-interesa') ? 'me_interesa' : null;

      // Un evento decidido (Voy): "Te interesa" no debe salir; el botón ya está "decidido" (aria-pressed).
      const conVoy = tarjeta('con-voy', 2);
      const estadoVoy = (id) => id === 'con-voy' ? 'voy' : null;

      // Sin sesión: estadoDe no se pasa (como decididas === null en useAsistenciaEnLista).
      const sinSesion = tarjeta('sin-sesion', 4);

      // Un carril de lugares o artistas: tampoco se pasa estadoDe, y nunca trae "van" (siempre 0).
      const lugar = tarjeta('un-lugar', 0);

      function App() {
        return React.createElement(React.Fragment, null,
          React.createElement(Destacados, { tarjetas: [conLosDos, soloInteresa, soloVan, sinNada], encabezado: 'Carril de eventos', memoria: 'm1', boton, estadoDe: estadoEventos }),
          React.createElement(Destacados, { tarjetas: [conVoy], encabezado: 'Carril con voy', memoria: 'm2', boton: botonDecidido, estadoDe: estadoVoy }),
          React.createElement(Destacados, { tarjetas: [sinSesion], encabezado: 'Carril sin sesion', memoria: 'm3' }),
          React.createElement(Destacados, { tarjetas: [lugar], encabezado: 'Carril de lugares', memoria: 'm4', boton }),
        );
      }
      createRoot(document.getElementById('root')).render(React.createElement(App));
    `,
    },
    plugins: [{
      name: "dobles",
      setup(b) {
        b.onResolve({ filter: /.*/ }, (a) => (a.path in mocks ? { path: a.path, namespace: "mock" } : undefined));
        b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({ contents: mocks[a.path], loader: "js", resolveDir: root }));
      },
    }],
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

async function pagina(t) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  t.after(() => context.close());
  const p = await context.newPage();
  p.setDefaultTimeout(5000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  t.after(() => assert.deepEqual(errors, []));
  await p.goto(origin);
  await p.getByRole("heading", { name: "Carril de eventos" }).waitFor();
  return p;
}

/** La tarjeta (el <a>) de un id dado: `article`-like, buscado por su enlace. */
function tarjeta(p, id) {
  return p.locator(`a[href="/eventos/${id}"]`);
}

test("con me_interesa sale el chip «Te interesa»", async (t) => {
  const p = await pagina(t);
  const texto = await tarjeta(p, "solo-interesa").innerText();
  assert.match(texto, /Te interesa/);
});

test("con voy no sale «Te interesa»: el botón queda decidido (aria-pressed)", async (t) => {
  const p = await pagina(t);
  const texto = await tarjeta(p, "con-voy").innerText();
  assert.doesNotMatch(texto, /Te interesa/);
  const boton = p.locator('a[href="/eventos/con-voy"] ~ button, a[href="/eventos/con-voy"] + button');
  assert.equal(await boton.getAttribute("aria-pressed"), "true");
});

test("sin sesión (sin estadoDe) no sale nada", async (t) => {
  const p = await pagina(t);
  const seccion = p.locator("section", { has: p.getByRole("heading", { name: "Carril sin sesion" }) });
  const texto = await seccion.innerText();
  assert.doesNotMatch(texto, /Te interesa/);
});

test("un carril de lugares o artistas (sin estadoDe) no cambia: ningún chip", async (t) => {
  const p = await pagina(t);
  const seccion = p.locator("section", { has: p.getByRole("heading", { name: "Carril de lugares" }) });
  const texto = await seccion.innerText();
  assert.doesNotMatch(texto, /Te interesa/);
  assert.doesNotMatch(texto, /van/);
});

test("con «van» y «Te interesa» los dos apilados en un solo contenedor (grid-area: foto)", async (t) => {
  const p = await pagina(t);
  const enlace = tarjeta(p, "con-los-dos");
  const texto = await enlace.innerText();
  assert.match(texto, /Te interesa/);
  assert.match(texto, /3 van/);
  // Un único <span> contenedor de chips (hijo directo del <a>, con la foto por grid-area) — nunca dos chips sueltos.
  const contenedores = await enlace.evaluate((a) =>
    [...a.children].filter((el) => el.tagName === "SPAN" && el.children.length > 0).length,
  );
  assert.equal(contenedores, 1, "debe haber un solo <span> contenedor de chips (nunca dos sueltos con grid-area: foto)");
  const gridArea = await enlace.evaluate((a) => {
    const contenedor = [...a.children].find((el) => el.tagName === "SPAN" && el.children.length > 0);
    return getComputedStyle(contenedor).gridArea.replace(/\s/g, "");
  });
  assert.match(gridArea, /^foto/, `el contenedor de chips debe tener grid-area: foto (salió "${gridArea}")`);
  // Dentro de ese contenedor, "Te interesa" antes que "N van" en el DOM (legibilidad; y ya después del título).
  const orden = await enlace.evaluate((a) => {
    const contenedor = [...a.children].find((el) => el.tagName === "SPAN" && el.children.length > 0);
    return [...contenedor.children].map((el) => el.textContent);
  });
  assert.equal(orden.length, 2);
  assert.match(orden[0], /Te interesa/);
  assert.match(orden[1], /3 van/);
});

test("solo «N van», sin interesa: un solo chip en la esquina", async (t) => {
  const p = await pagina(t);
  const texto = await tarjeta(p, "solo-van").innerText();
  assert.doesNotMatch(texto, /Te interesa/);
  assert.match(texto, /5 van/);
});

test("ni interesa ni van: sin chip", async (t) => {
  const p = await pagina(t);
  const texto = await tarjeta(p, "sin-nada").innerText();
  assert.doesNotMatch(texto, /Te interesa/);
  assert.doesNotMatch(texto, /van/);
});
