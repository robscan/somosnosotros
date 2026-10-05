/** La guardia de salida de las altas (OL-294, bitácora 322): además de Atrás y la ✕ (la hoja «¿Salir sin publicar?»), cerrar la pestaña o
 *  recargar con cambios dispara el aviso propio del navegador (`beforeunload`). Con Chrome real: sin cambios no avisa; con cambios sí; al
 *  publicar (se quita la guardia) o al confirmar «Salir y borrar» no avisa; y al desmontar la pantalla quita su oyente. El atrás del navegador
 *  dentro de la app no descarga el documento y esta prueba no pretende cubrirlo.
 * PLAYWRIGHT_MODULE=/ruta/playwright-core/index.mjs CHROME_EXECUTABLE=/ruta/chrome node --test este-archivo
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
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link({prefetch,replace,...p}){return React.createElement('a',p)}",
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "salirsinpublicar-componentes-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React, {useRef, useState} from 'react';import {createRoot} from 'react-dom/client';
      import {useSalirSinPublicar} from './src/components/SalirSinPublicar';
      import {pedirSalida, quitarGuardia} from './src/lib/guardiaSalida';
      import './src/app/globals.css';
      window.qa = {pedirSalida, quitarGuardia, olvidado: 0, salio: 0};
      function Pantalla() {
        const pantalla = useRef(null);
        const hoja = useSalirSinPublicar(pantalla, () => window.qa.olvidado++);
        return (
          <main ref={pantalla}>
            <form><input name="titulo" aria-label="Nombre" defaultValue="" /></form>
            {hoja}
          </main>
        );
      }
      function App() {
        const [visible, setVisible] = useState(true);
        window.qa.desmontar = () => setVisible(false);
        return visible ? <Pantalla /> : <p>otra pantalla</p>;
      }
      createRoot(document.getElementById('root')).render(<App />);
    `,
    },
    plugins: [
      {
        name: "dobles",
        setup(b) {
          b.onResolve({ filter: /.*/ }, (a) => (a.path in mocks ? { path: a.path, namespace: "mock" } : undefined));
          b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({ contents: mocks[a.path], loader: "js", resolveDir: root }));
        },
      },
    ],
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

async function pagina(t) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  t.after(() => context.close());
  const p = await context.newPage();
  p.setDefaultTimeout(5000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  t.after(() => assert.deepEqual(errors, []));
  await p.goto(origin);
  await p.locator("input[name=titulo]").waitFor();
  return p;
}
/** true si el navegador pediría confirmar: el oyente canceló el evento. */
const avisa = (p) => p.evaluate(() => !window.dispatchEvent(new Event("beforeunload", { cancelable: true })));

test("sin cambios, cerrar o recargar no avisa", async (t) => {
  const p = await pagina(t);
  assert.equal(await avisa(p), false);
});

test("con cambios en el formulario, cerrar o recargar avisa; si se deja como estaba, deja de avisar", async (t) => {
  const p = await pagina(t);
  await p.locator("input[name=titulo]").fill("Concierto");
  assert.equal(await avisa(p), true);
  await p.locator("input[name=titulo]").fill("");
  assert.equal(await avisa(p), false);
});

test("al publicar (se quita la guardia) ya no avisa, aunque el formulario siga con lo escrito", async (t) => {
  const p = await pagina(t);
  await p.locator("input[name=titulo]").fill("Concierto");
  await p.evaluate(() => window.qa.quitarGuardia());
  assert.equal(await avisa(p), false);
});

test("«Salir y borrar» olvida el borrador, entrega la salida y deja de avisar; «Seguir editando» conserva todo", async (t) => {
  const p = await pagina(t);
  await p.locator("input[name=titulo]").fill("Concierto");
  await p.evaluate(() => window.qa.pedirSalida(() => window.qa.salio++));
  await p.getByRole("button", { name: "Seguir editando" }).click();
  assert.deepEqual(await p.evaluate(() => [window.qa.salio, window.qa.olvidado]), [0, 0]);
  assert.equal(await avisa(p), true);
  await p.evaluate(() => window.qa.pedirSalida(() => window.qa.salio++));
  await p.getByRole("button", { name: "Salir y borrar" }).click();
  assert.deepEqual(await p.evaluate(() => [window.qa.salio, window.qa.olvidado]), [1, 1]);
  assert.equal(await avisa(p), false);
});

test("al desmontar la pantalla quita su oyente", async (t) => {
  const p = await pagina(t);
  await p.locator("input[name=titulo]").fill("Concierto");
  assert.equal(await avisa(p), true);
  await p.evaluate(() => window.qa.desmontar());
  await p.getByText("otra pantalla").waitFor();
  assert.equal(await avisa(p), false);
});
