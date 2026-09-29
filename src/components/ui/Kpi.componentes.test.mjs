/**
 * Los tres números de una ficha (docs/rediseno/50, P6; `ui/Kpi`): tarjetas que abrazan su contenido —el icono y lo que es arriba, el valor
 * abajo, sin alto mínimo—, las tres del mismo alto porque la rejilla estira cada una a la fila; el esqueleto mide lo que la tarjeta real
 * (nada salta al llegar el dato); un valor largo se parte en la tarjeta y no rompe la fila, y una etiqueta larga se corta con puntos
 * suspensivos. Bundle real (esbuild) con sus estilos, en Chrome real a 390×844 (no corre con `npm test`).
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
let browser, server, dir, origin;

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "kpi-componentes-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import {Kpi, Kpis} from './src/components/ui/Kpi';
      import {EsqueletoKpis} from './src/components/ui/Esqueleto';
      import {IconoBoleto, IconoCalendario, IconoPersonas} from './src/components/ui/Iconos';
      import './src/app/globals.css';
      const icono = (I) => <I width={16} height={16} />;
      function App() {
        return (
          <div style={{ padding: '0 20px' }}>
            <div data-id="corta"><Kpis>
              <Kpi icono={icono(IconoCalendario)} etiqueta="19:00" valor="vie 2 oct" />
              <Kpi icono={icono(IconoBoleto)} etiqueta="Costo" valor="Gratis" />
              <Kpi icono={icono(IconoPersonas)} etiqueta="Van" valor={2} salto="quien-va" />
            </Kpis></div>
            <div data-id="esqueleto"><EsqueletoKpis /></div>
            <div data-id="larga"><Kpis>
              <Kpi icono={icono(IconoCalendario)} etiqueta="19:00" valor="vie 2 oct" />
              <Kpi icono={icono(IconoBoleto)} etiqueta="Costo" valor="Cooperación solidaria" />
              <Kpi icono={icono(IconoPersonas)} etiqueta="Van" valor={2} />
            </Kpis></div>
            <div data-id="etiqueta"><Kpis>
              <Kpi icono={icono(IconoCalendario)} etiqueta="Van a lo mismo que tú" valor={1} />
              <Kpi icono={icono(IconoBoleto)} etiqueta="Costo" valor="Gratis" />
              <Kpi icono={icono(IconoPersonas)} etiqueta="Van" valor={2} />
            </Kpis></div>
          </div>
        );
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

async function pagina(t) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  t.after(() => context.close());
  const p = await context.newPage();
  p.setDefaultTimeout(5000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  t.after(() => assert.deepEqual(errors, []));
  await p.goto(origin);
  await p.waitForSelector('[data-id="corta"] li');
  return p;
}
/** Alto (décimas) de cada tarjeta de una fila. */
const altos = (p, id) => p.locator(`[data-id="${id}"] li > *`).evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height * 10) / 10));

test("las tres tarjetas abrazan su contenido (sin alto mínimo) y miden lo mismo", async (t) => {
  const p = await pagina(t);
  const [a, b, c] = await altos(p, "corta");
  assert.equal(a, b);
  assert.equal(b, c);
  // 10 de relleno, la fila del icono y la etiqueta, 4 de hueco, la línea del valor, 10 de relleno y 2 de borde: alrededor de 61.
  assert.ok(a >= 55 && a <= 66, `la tarjeta mide ${a}: es lo que su contenido (el prototipo firmado no le pone alto mínimo)`);
  const ancho = await p.locator('[data-id="corta"] li').first().evaluate((e) => e.getBoundingClientRect().width);
  assert.ok(Math.abs(ancho - (350 - 16) / 3) < 1, `las tres se reparten el ancho de la columna (${ancho})`);
});

test("el esqueleto mide lo que la tarjeta real: nada salta al llegar el dato", async (t) => {
  const p = await pagina(t);
  const [real] = await altos(p, "corta");
  const [esqueleto] = await altos(p, "esqueleto");
  assert.ok(Math.abs(real - esqueleto) <= 1, `la tarjeta mide ${real} y su esqueleto ${esqueleto}`);
});

test("un valor largo se parte dentro de la tarjeta y las tres crecen juntas; una etiqueta larga se corta con puntos suspensivos", async (t) => {
  const p = await pagina(t);
  const [corta] = await altos(p, "corta");
  const larga = await altos(p, "larga");
  assert.ok(larga[1] > corta + 10, `«Cooperación solidaria» ocupa dos líneas (${larga[1]} contra ${corta})`);
  assert.deepEqual([larga[0], larga[2]], [larga[1], larga[1]], "las otras dos se estiran a la fila");
  const etiqueta = p.locator('[data-id="etiqueta"] li small').first();
  assert.equal(await etiqueta.evaluate((e) => getComputedStyle(e).textOverflow), "ellipsis");
  assert.ok(await etiqueta.evaluate((e) => e.scrollWidth > e.clientWidth), "la etiqueta larga se corta");
  const filas = await altos(p, "etiqueta");
  assert.equal(filas[0], corta, "y no rompe la fila: la tarjeta mide lo de siempre");
});

test("el número que baja a una sección es un enlace de toda la tarjeta (44 o más de alto)", async (t) => {
  const p = await pagina(t);
  const enlace = p.locator('[data-id="corta"] a');
  assert.equal(await enlace.getAttribute("href"), "#quien-va");
  assert.ok((await enlace.boundingBox()).height >= 44);
});
