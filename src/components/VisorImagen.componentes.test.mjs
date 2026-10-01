/** Prueba de componente del visor de carteles (ajuste 5 del founder, 2026-10-01): `Cartel` y `VisorImagen` reales con sus estilos, en Chrome con toques reales por CDP
 *  a 390×844. Cubre pellizcar (acerca alrededor de los dedos y no pasa de 4×), arrastrar con un dedo la imagen acercada sin que se salga de sus bordes,
 *  el doble toque (alterna 1× y 2,5× en el punto tocado), que tocar sin moverse con la imagen a 1× la cierre (acercada, no) y que la ✕, el negro y Escape
 *  la cierren siempre; y, en escritorio, la rueda.
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

const root = fileURLToPath(new URL("../../", import.meta.url));
let browser, server, dir, origin;

const mocks = {
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link(p){return React.createElement('a',p)}",
  "next/navigation": "export const useRouter=()=>({push(){},replace(){}});export const usePathname=()=>'/';export const useSearchParams=()=>new URLSearchParams();",
};

/** Un cartel 3:2 con un punto de referencia en cada esquina, para saber qué parte se ve. */
const CARTEL = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="#e8e0d0"/><circle cx="60" cy="60" r="40" fill="#c0392b"/><circle cx="840" cy="540" r="40" fill="#2980b9"/></svg>')}`;

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "visor-componentes-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import Cartel from './src/components/Cartel';import './src/app/globals.css';
      createRoot(document.getElementById('root')).render(<main style={{ padding: 20 }}><Cartel src=${JSON.stringify(CARTEL)} alt="Cartel de prueba" /></main>);
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

const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
const cerca = (a, b, t = 1) => assert.ok(Math.abs(a - b) <= t, `${a} debía estar a ${t} de ${b}`);

async function abrir({ tactil = true } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: tactil, isMobile: tactil, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  const cdp = await context.newCDPSession(page);
  await page.goto(origin);
  await page.getByRole("button", { name: /entero/ }).click();
  await page.getByRole("dialog").waitFor();
  const toque = (tipo, puntos) => cdp.send("Input.dispatchTouchEvent", { type: tipo, touchPoints: puntos.map(([x, y], id) => ({ x, y, id })) });
  /** Mueve los dedos en `pasos` pasos de `desde` a `hasta` (listas de puntos) y los suelta. */
  const jalar = async (desde, hasta, pasos = 10) => {
    await toque("touchStart", desde);
    for (let i = 1; i <= pasos; i++) {
      await toque("touchMove", desde.map(([x, y], k) => [x + ((hasta[k][0] - x) * i) / pasos, y + ((hasta[k][1] - y) * i) / pasos]));
      await espera(16);
    }
    await toque("touchEnd", []);
    await espera(60);
  };
  /** La imagen del visor: su caja en la pantalla y la escala que lleva. */
  const imagen = () =>
    page.evaluate(() => {
      const el = document.querySelector('[role="dialog"] img');
      const r = el.getBoundingClientRect();
      const m = new DOMMatrix(getComputedStyle(el).transform);
      return { izq: r.left, der: r.right, arriba: r.top, abajo: r.bottom, ancho: r.width, alto: r.height, escala: m.a, x: m.e, y: m.f };
    });
  const abierto = () => page.getByRole("dialog").count().then((n) => n === 1);
  return { context, page, errores, toque, jalar, imagen, abierto };
}

test("pellizcar acerca alrededor de los dedos, hasta 4× y no más", async () => {
  const { context, imagen, jalar, errores } = await abrir();
  const antes = await imagen();
  assert.deepEqual([antes.escala, Math.round(antes.ancho), Math.round(antes.alto)], [1, 390, 260], "a 1× la imagen cabe entera, 390×260");
  // Dos dedos a cada lado del punto (250, 422), que cae sobre la imagen (centrada: de 292 a 552) y a su altura media; se separan hasta el doble. (Fuera de la
  // altura media la imagen se corrige hacia el centro mientras cabe entera a lo alto: es el límite, no un error.)
  const foco = [250, 422];
  const fraccion = (v) => [(foco[0] - v.izq) / v.ancho, (foco[1] - v.arriba) / v.alto];
  const antesFraccion = fraccion(antes);
  await jalar([[230, 422], [270, 422]], [[210, 422], [290, 422]]);
  const dos = await imagen();
  cerca(dos.escala, 2, 0.05);
  const despues = fraccion(dos);
  cerca(despues[0], antesFraccion[0], 0.01);
  cerca(despues[1], antesFraccion[1], 0.01);
  // Otro pellizco, mucho mayor: tope en 4×.
  await jalar([[200, 422], [240, 422]], [[20, 422], [370, 422]]);
  assert.ok((await imagen()).escala <= 4.0001, "no pasa de 4×");
  cerca((await imagen()).escala, 4, 0.01);
  assert.deepEqual(errores, []);
  await context.close();
});

test("con un dedo la imagen acercada se mueve sin salirse de sus bordes; a 1× no se mueve", async () => {
  const { context, imagen, jalar, abierto } = await abrir();
  await jalar([[195, 420]], [[195 - 60, 420 + 40]]);
  const quieta = await imagen();
  assert.deepEqual([quieta.escala, quieta.x, quieta.y], [1, 0, 0], "a 1× arrastrar no mueve la imagen");
  await espera(400);
  assert.equal(await abierto(), true, "y arrastrar tampoco la cierra");
  await jalar([[170, 422], [220, 422]], [[110, 422], [280, 422]]);
  const acercada = await imagen();
  assert.ok(acercada.escala > 2);
  await jalar([[300, 422]], [[240, 400]]);
  const movida = await imagen();
  cerca(movida.x - acercada.x, -60, 1);
  // Muy lejos hacia la izquierda: el borde derecho llega al borde de la ventana, nunca más adentro.
  for (let i = 0; i < 5; i++) await jalar([[380, 600]], [[10, 100]], 12);
  const alBorde = await imagen();
  cerca(alBorde.der, 390, 1);
  assert.ok(alBorde.izq <= 0, "la imagen sigue cubriendo todo el ancho");
  for (let i = 0; i < 5; i++) await jalar([[10, 100]], [[380, 600]], 12);
  const alOtro = await imagen();
  cerca(alOtro.izq, 0, 1);
  assert.ok(alOtro.der >= 390);
  // Alto: a este tamaño la imagen es más alta que la ventana solo cerca de 4×; mientras quepa, queda centrada en vertical.
  if (alOtro.alto <= 844) cerca((alOtro.arriba + alOtro.abajo) / 2, 422, 1);
  await context.close();
});

test("un doble toque alterna 1× y 2,5× en el punto tocado", async () => {
  const { context, page, imagen, abierto } = await abrir();
  const punto = [260, 422]; // sobre la imagen, a la derecha del centro y a su altura media
  const fraccion = (v) => [(punto[0] - v.izq) / v.ancho, (punto[1] - v.arriba) / v.alto];
  const antes = fraccion(await imagen());
  await page.touchscreen.tap(...punto);
  await espera(60);
  await page.touchscreen.tap(...punto);
  await espera(400); // la transición corta
  const acercada = await imagen();
  cerca(acercada.escala, 2.5, 0.02);
  const despues = fraccion(acercada);
  cerca(despues[0], antes[0], 0.01);
  cerca(despues[1], antes[1], 0.01);
  assert.equal(await abierto(), true, "el doble toque no cierra");
  await page.touchscreen.tap(...punto);
  await espera(60);
  await page.touchscreen.tap(...punto);
  await espera(400);
  const vuelta = await imagen();
  assert.deepEqual([vuelta.escala, vuelta.x, vuelta.y], [1, 0, 0], "otro doble toque vuelve a 1×");
  await context.close();
});

test("tocar sin moverse cierra con la imagen a 1× (tras el tiempo de un doble toque) y no con ella acercada; la ✕, el negro y Escape siempre", async () => {
  const { context, page, abierto, imagen } = await abrir();
  await page.touchscreen.tap(195, 422);
  await espera(120);
  assert.equal(await abierto(), true, "no cierra al instante: podría ser un doble toque");
  await espera(500);
  assert.equal(await abierto(), false, "a 1×, un toque sobre la imagen la cierra");

  await page.getByRole("button", { name: /entero/ }).click();
  await page.getByRole("dialog").waitFor();
  await page.touchscreen.tap(195, 100); // el negro, arriba de la imagen
  await espera(150);
  assert.equal(await abierto(), false, "tocar el negro cierra al instante");

  await page.getByRole("button", { name: /entero/ }).click();
  await page.getByRole("dialog").waitFor();
  await page.touchscreen.tap(195, 422);
  await espera(60);
  await page.touchscreen.tap(195, 422);
  await espera(400);
  assert.ok((await imagen()).escala > 2);
  await page.touchscreen.tap(195, 422);
  await espera(600);
  assert.equal(await abierto(), true, "acercada, un toque no cierra");
  await page.getByRole("button", { name: "Cerrar" }).tap();
  await espera(100);
  assert.equal(await abierto(), false, "la ✕ cierra acercada");

  await page.getByRole("button", { name: /entero/ }).click();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
  await espera(100);
  assert.equal(await abierto(), false, "Escape cierra");
  await context.close();
});

test("en escritorio la rueda acerca alrededor del cursor y alejar la deja a 1×", async () => {
  const { context, page, imagen, abierto } = await abrir({ tactil: false });
  const foco = [260, 422];
  const antes = await imagen();
  const fraccion = (v) => [(foco[0] - v.izq) / v.ancho, (foco[1] - v.arriba) / v.alto];
  await page.mouse.move(...foco);
  await page.mouse.wheel(0, -300);
  await espera(150);
  const acercada = await imagen();
  assert.ok(acercada.escala > 1.2, `la rueda acerca (${acercada.escala})`);
  cerca(fraccion(acercada)[0], fraccion(antes)[0], 0.01);
  cerca(fraccion(acercada)[1], fraccion(antes)[1], 0.01);
  await page.mouse.wheel(0, 3000);
  await espera(150);
  const vuelta = await imagen();
  assert.deepEqual([vuelta.escala, vuelta.x, vuelta.y], [1, 0, 0]);
  assert.equal(await abierto(), true);
  await context.close();
});
