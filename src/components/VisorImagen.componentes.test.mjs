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
  // La selección/fallo de Next/Image se prueba con el componente real en Imagen.componentes.
  "next/image": "import React from 'react';export default function Image({quality,...p}){return React.createElement('img',p)}",
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link(p){return React.createElement('a',p)}",
  "next/navigation": "export const useRouter=()=>({push(){},replace(){}});export const usePathname=()=>'/';export const useSearchParams=()=>new URLSearchParams();",
};

/** Un cartel 3:2 con un punto de referencia en cada esquina, para saber qué parte se ve. */
const CARTEL = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="#e8e0d0"/><circle cx="60" cy="60" r="40" fill="#c0392b"/><circle cx="840" cy="540" r="40" fill="#2980b9"/></svg>')}`;
/** Un cartel 4:5 más alto que una ventana de escritorio (OL-403): 1 080×1 350 en 1 280×800. */
const CARTEL_ALTO = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350"><rect width="1080" height="1350" fill="#e8e0d0"/><circle cx="80" cy="80" r="60" fill="#c0392b"/><circle cx="1000" cy="1270" r="60" fill="#2980b9"/></svg>')}`;

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
      createRoot(document.getElementById('root')).render(<main style={{ padding: 20 }}><Cartel src=${JSON.stringify(CARTEL)} alt="Cartel de prueba" /><Cartel src=${JSON.stringify(CARTEL_ALTO)} alt="Cartel alto" /></main>);
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

async function abrir({ tactil = true, viewport = { width: 390, height: 844 }, cartel = "Cartel de prueba" } = {}) {
  const context = await browser.newContext({ viewport, hasTouch: tactil, isMobile: tactil, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  const cdp = await context.newCDPSession(page);
  await page.goto(origin);
  await page.getByRole("button", { name: `Ver ${cartel} entero` }).click();
  await page.getByRole("dialog").waitFor();
  const toque = (tipo, puntos) => cdp.send("Input.dispatchTouchEvent", { type: tipo, touchPoints: puntos.map(([x, y], id) => ({ x, y, id })) });
  /** Un doble toque con su propia hora (100 ms entre uno y otro): con varias pruebas a la vez, Chrome tarda más en recibir los toques y dos toques reales podrían salir más lejos que el tiempo de un doble toque. */
  const dobleToque = async (x, y) => {
    let hora = Date.now() / 1000;
    for (let i = 0; i < 2; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", timestamp: hora, touchPoints: [{ x, y, id: 0 }] });
      hora += 0.04;
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", timestamp: hora, touchPoints: [] });
      hora += 0.1;
    }
  };
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
  return { context, page, errores, toque, jalar, dobleToque, imagen, abierto };
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
  const { context, page, dobleToque, imagen, abierto } = await abrir();
  const punto = [260, 422]; // sobre la imagen, a la derecha del centro y a su altura media
  const fraccion = (v) => [(punto[0] - v.izq) / v.ancho, (punto[1] - v.arriba) / v.alto];
  const antes = fraccion(await imagen());
  await dobleToque(...punto);
  await espera(400); // la transición corta
  const acercada = await imagen();
  cerca(acercada.escala, 2.5, 0.02);
  const despues = fraccion(acercada);
  cerca(despues[0], antes[0], 0.01);
  cerca(despues[1], antes[1], 0.01);
  assert.equal(await abierto(), true, "el doble toque no cierra");
  await dobleToque(...punto);
  await espera(400);
  const vuelta = await imagen();
  assert.deepEqual([vuelta.escala, vuelta.x, vuelta.y], [1, 0, 0], "otro doble toque vuelve a 1×");
  await context.close();
});

test("tocar sin moverse cierra con la imagen a 1× (tras el tiempo de un doble toque) y no con ella acercada; la ✕, el negro y Escape siempre", async () => {
  const { context, page, dobleToque, abierto, imagen } = await abrir();
  await page.touchscreen.tap(195, 422);
  await espera(120);
  assert.equal(await abierto(), true, "no cierra al instante: podría ser un doble toque");
  await espera(500);
  assert.equal(await abierto(), false, "a 1×, un toque sobre la imagen la cierra");

  await page.getByRole("button", { name: "Ver Cartel de prueba entero" }).click();
  await page.getByRole("dialog").waitFor();
  await page.touchscreen.tap(195, 100); // el negro, arriba de la imagen
  await espera(150);
  assert.equal(await abierto(), false, "tocar el negro cierra al instante");

  await page.getByRole("button", { name: "Ver Cartel de prueba entero" }).click();
  await page.getByRole("dialog").waitFor();
  await dobleToque(195, 422);
  await espera(400);
  assert.ok((await imagen()).escala > 2);
  await page.touchscreen.tap(195, 422);
  await espera(600);
  assert.equal(await abierto(), true, "acercada, un toque no cierra");
  await page.getByRole("button", { name: "Cerrar" }).tap();
  await espera(100);
  assert.equal(await abierto(), false, "la ✕ cierra acercada");

  await page.getByRole("button", { name: "Ver Cartel de prueba entero" }).click();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
  await espera(100);
  assert.equal(await abierto(), false, "Escape cierra");
  await context.close();
});

test("en escritorio la rueda acerca alrededor del cursor y alejar (Ctrl con la rueda o el pellizco del trackpad) la deja a 1×", async () => {
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
  // Acercada, la rueda sola desplaza (OL-403); para alejar, Ctrl con la rueda (el pellizco del trackpad llega igual, con `ctrlKey`).
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, 3000);
  await page.keyboard.up("Control");
  await espera(150);
  const vuelta = await imagen();
  assert.deepEqual([vuelta.escala, vuelta.x, vuelta.y], [1, 0, 0]);
  assert.equal(await abierto(), true);
  await context.close();
});

const ESCRITORIO = { width: 1280, height: 800 };

test("en escritorio un cartel más alto que la ventana abre entero, ajustado a ella y centrado (OL-403)", async () => {
  const { context, imagen, errores } = await abrir({ tactil: false, viewport: ESCRITORIO, cartel: "Cartel alto" });
  const v = await imagen();
  assert.deepEqual([v.escala, Math.round(v.ancho), Math.round(v.alto)], [1, 640, 800], "4:5 en 1280×800: 640×800, el alto de la ventana es el tope");
  assert.deepEqual([Math.round(v.arriba), Math.round(v.abajo), Math.round(v.izq), Math.round(v.der)], [0, 800, 320, 960], "entero dentro de la ventana, centrado");
  assert.deepEqual(errores, []);
  await context.close();
});

test("en escritorio, acercada, la imagen se desplaza con la rueda y arrastrándola con el ratón, sin salirse de sus bordes (OL-403)", async () => {
  const { context, page, imagen, abierto } = await abrir({ tactil: false, viewport: ESCRITORIO, cartel: "Cartel alto" });
  // Lo que de verdad llega en `deltaY` (Chrome lo reparte en varios eventos y lo escala según la pantalla): la cuenta se compara con eso.
  await page.evaluate(() => {
    window.ruedaY = 0;
    addEventListener("wheel", (e) => (window.ruedaY += e.deltaY), { capture: true });
  });
  const rueda = async (dy) => {
    await page.evaluate(() => (window.ruedaY = 0));
    await page.mouse.wheel(0, dy);
    await espera(150);
    return page.evaluate(() => window.ruedaY);
  };
  await page.mouse.move(640, 400);
  const giro = await rueda(-700); // a 1× la rueda acerca, de corrido en todo el giro
  const acercada = await imagen();
  cerca(acercada.escala, Math.exp(-giro * 0.002), 0.02);
  assert.ok(acercada.escala > 1.5, `acerca (${acercada.escala})`);
  // Otro giro, tras una pausa: la rueda sola ya no acerca, baja la imagen (enseña lo de abajo) lo que avanzó la rueda, a la misma escala.
  await espera(400);
  const paso = await rueda(200);
  const bajada = await imagen();
  cerca(bajada.escala, acercada.escala, 0.001);
  assert.ok(paso > 0);
  cerca(bajada.y - acercada.y, -paso, 1);
  // Hasta el final: el pie del cartel llega al pie de la ventana y no pasa de ahí.
  await page.mouse.wheel(0, 5000);
  await espera(150);
  const alPie = await imagen();
  cerca(alPie.abajo, 800, 1);
  assert.ok(alPie.arriba < 0, "lo de arriba quedó fuera, por encima");
  // Arrastrar con el ratón la mueve igual que un dedo: hacia abajo 200 px.
  await page.mouse.move(640, 300);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(640, 300 + 20 * i);
  await page.mouse.up();
  await espera(150);
  const arrastrada = await imagen();
  cerca(arrastrada.y - alPie.y, 200, 1);
  await espera(400);
  assert.equal(await abierto(), true, "arrastrar no la cierra");
  await context.close();
});
