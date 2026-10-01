/** Prueba de componente del mapa de Lugares con la pulsación larga (ajuste 9 del founder, 2026-09-30): `Mapa` y `PulsacionEnMapa` reales con Mapbox GL de
 *  verdad sobre un estilo vacío servido aquí (sin red ni llaves), en Chrome con toques reales. Cubre que sostener un punto vacío saque el anillo y luego la marca
 *  con la tarjeta «Lugar nuevo» y su enlace al alta con el punto (y que siga ahí al soltar); que sostener sobre un lugar ya registrado lo abra como un toque y
 *  no ofrezca registrar otro; que la tarjeta se vaya con la ✕, al tocar el mapa, al arrastrarlo y al abrir una ficha; que tocar, arrastrar y pellizcar no la saquen;
 *  y que con «reducir movimiento» no haya anillo pero sí tarjeta. Y (ajuste 3 del founder, 2026-10-01) que arrastrar, pellizcar o tocar dos veces avisen a la hoja
 *  (`onGesto`), y que tocar y los movimientos de cámara de la propia app no. El sitio del mapa base bajo el dedo se prueba aparte (`lib/mapa.test.ts`: los sitios son de los
 *  mosaicos vectoriales de Mapbox, que aquí no hay).
 * PLAYWRIGHT_MODULE=/ruta/playwright-core/index.mjs CHROME_EXECUTABLE=/ruta/chrome node --test este-archivo
 */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../", import.meta.url));
let browser, server, dir, origin;

const mocks = {
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link(p){const {prefetch,...r}=p;return React.createElement('a',r)}",
  "next/navigation": "export const useRouter=()=>({push(url){window.qa.navegaciones.push(url)}});export const usePathname=()=>'/lugares';export const useSearchParams=()=>new URLSearchParams();",
};
const ESTILO = { version: 8, glyphs: "{origin}/glyphs/{fontstack}/{range}.pbf", sources: {}, layers: [{ id: "fondo", type: "background", paint: { "background-color": "#e8e6df" } }] };

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "mapa-componentes-"));
  // Mapbox de verdad, pero guardando cada mapa que se crea en `window.qa.mapas` para pedirle dónde cae cada punto.
  await writeFile(join(dir, "espia.js"), `import real from ${JSON.stringify(join(root, "node_modules/mapbox-gl/dist/mapbox-gl.js"))};
    class Espia extends real.Map { constructor(o) { super(o); (window.qa.mapas ??= []).push(this); } }
    const espia = Object.create(real); espia.Map = Espia; export default espia;`);
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    define: { "process.env.NEXT_PUBLIC_MAPBOX_TOKEN": '"pk.de-prueba"', "process.env.NEXT_PUBLIC_MAPBOX_STYLE": '"/estilo.json"', "process.env.NEXT_PUBLIC_SUPABASE_URL": "undefined", "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": "undefined" },
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React, {useState} from 'react';import {createRoot} from 'react-dom/client';
      import Mapa from './src/components/Mapa';import './src/app/globals.css';
      window.qa = { mapas: undefined, pines: [], navegaciones: [], despejadas: 0, gestos: 0 };
      const ciudad = { slug: 'san-luis-potosi', nombre: 'San Luis Potosí', centro: { lng: -100.9764, lat: 22.1497 }, zoom: 13 };
      const lugar = (id, nombre, lng, lat) => ({ id, slug: id, nombre, tipo: 'galeria', direccion: null, lat, lng, portada: null, proximo: null });
      const lugares = [lugar('centro', 'Galería del Centro', -100.9764, 22.1497), lugar('norte', 'Foro del Norte', -100.9764, 22.1597)];
      // \`?tapa=300\`: una hoja que tapa 300 px del mapa por abajo; al pedirle que se recoja (\`onDespejar\`) pasa a tapar 60.
      function App() {
        const [elegido, setElegido] = useState(null);
        const [tapa, setTapa] = useState(Number(new URLSearchParams(location.search).get('tapa') ?? 0));
        window.qa.elegir = setElegido;
        window.qa.tapar = setTapa;
        return <div style={{ position: 'relative', width: 390, height: 500 }}><Mapa lugares={lugares} ciudad={ciudad} elegido={elegido} onPin={(l) => window.qa.pines.push(l.id)} tapaAbajo={tapa} onDespejar={() => { window.qa.despejadas++; setTapa(60); }} onGesto={() => window.qa.gestos++} /></div>;
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
          b.onResolve({ filter: /^mapbox-gl$/ }, () => ({ path: join(dir, "espia.js") }));
        },
      },
    ],
  });
  const assets = new Map([
    ["/", ["text/html", '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--fuente-bricolage:Arial}body{margin:0}</style><div id="root"></div><script src="/app.js"></script>']],
    ["/app.js", ["text/javascript", await readFile(join(dir, "app.js"))]],
    ["/app.css", ["text/css", await readFile(join(dir, "app.css"))]],
  ]);
  server = createServer((req, res) => {
    const ruta = req.url.split("?")[0];
    if (ruta === "/estilo.json") {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(ESTILO).replace("{origin}", origin));
    }
    if (ruta.startsWith("/glyphs/")) {
      res.writeHead(200, { "Content-Type": "application/x-protobuf" });
      return res.end();
    }
    const a = assets.get(ruta);
    res.writeHead(a ? 200 : 404, { "Content-Type": `${a?.[0] ?? "text/plain"}; charset=utf-8` });
    res.end(a?.[1] ?? "");
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  origin = `http://127.0.0.1:${server.address().port}`;
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
});
after(async () => {
  await browser?.close();
  if (server) await new Promise((r) => server.close(r));
  if (dir) await rm(dir, { recursive: true, force: true });
});

const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));

async function abrir({ reducir = false, tapa = 0 } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 500 }, hasTouch: true, reducedMotion: reducir ? "reduce" : "no-preference" });
  await context.route("**/events.mapbox.com/**", (r) => r.abort());
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await page.goto(`${origin}/?tapa=${tapa}`);
  // El mapa cargado y con sus lugares dibujados (el punto del centro se puede tocar).
  await page.waitForFunction(() => window.qa.mapas?.[0]?.loaded() && window.qa.mapas[0].getLayer("lugares-puntos") && window.qa.mapas[0].queryRenderedFeatures({ layers: ["lugares-puntos"] }).length === 2, null, { timeout: 30000 });
  await espera(300);
  const toque = (tipo, puntos) => cdp.send("Input.dispatchTouchEvent", { type: tipo, touchPoints: puntos.map(([x, y], id) => ({ x, y, id })) });
  const sostener = async (x, y, ms = 800) => {
    await toque("touchStart", [[x, y]]);
    await espera(ms);
    await toque("touchEnd", []);
    await espera(300);
  };
  const tarjetas = () => page.locator("[role=group][aria-label='Lugar nuevo']").count();
  const anillos = () => page.locator("[class*='anillo']").count();
  const dondeCae = (lugar) => page.evaluate((id) => { const m = window.qa.mapas[0]; const p = m.project(id === "centro" ? [-100.9764, 22.1497] : [-100.9764, 22.1597]); return [p.x, p.y]; }, lugar);
  return { context, page, toque, sostener, tarjetas, anillos, dondeCae };
}

test("sostener en un punto vacío saca el anillo y luego la marca con la tarjeta «Lugar nuevo» y su enlace al alta; sigue ahí al soltar", async () => {
  const { context, page, toque, tarjetas, anillos } = await abrir();
  await toque("touchStart", [[100, 120]]);
  await page.waitForSelector("[class*='anillo']", { timeout: 1500 });
  assert.equal(await tarjetas(), 0, "el anillo va antes de la tarjeta");
  await page.waitForSelector("[role=group][aria-label='Lugar nuevo']", { timeout: 2000 });
  assert.equal(await anillos(), 0, "el anillo se va cuando llega la tarjeta");
  assert.equal(await page.locator("[role=group][aria-label='Lugar nuevo'] b").innerText(), "Lugar nuevo");
  const esperado = await page.evaluate(() => { const p = window.qa.mapas[0].unproject([100, 120]); return `/nuevo?tipo=lugar&lat=${p.lat.toFixed(6)}&lng=${p.lng.toFixed(6)}`; });
  assert.equal(await page.getByRole("link", { name: "Registrar lugar" }).getAttribute("href"), esperado, "el enlace lleva el punto del dedo, sin nombre");
  await espera(700);
  await toque("touchEnd", []);
  await espera(500);
  assert.equal(await tarjetas(), 1, "soltar no la cierra (y una sola)");
  assert.deepEqual(await page.evaluate(() => window.qa.pines), [], "no abrió ningún lugar");
  assert.equal(await page.evaluate(() => window.qa.despejadas), 0, "con sitio de sobra no se toca la hoja");
  // Los botones de la tarjeta son toques de 44 como mínimo.
  for (const nombre of ["Cerrar", "Registrar lugar"]) {
    const caja = await page.getByRole(nombre === "Cerrar" ? "button" : "link", { name: nombre }).boundingBox();
    assert.ok(caja.width >= 44 && caja.height >= 44, `${nombre}: ${caja.width}×${caja.height}`);
  }
  await context.close();
});

test("sostener sobre un lugar ya registrado lo abre como un toque y no ofrece registrarlo otra vez", async () => {
  const { context, page, sostener, tarjetas, dondeCae } = await abrir();
  const [x, y] = await dondeCae("centro");
  await sostener(x, y);
  assert.deepEqual(await page.evaluate(() => window.qa.pines), ["centro"], "se abrió, una vez (el clic al soltar no lo repite)");
  assert.equal(await tarjetas(), 0);
  await context.close();
});

test("la tarjeta se va con la ✕, al tocar el mapa, al arrastrarlo y al abrir una ficha; una nueva pulsación reemplaza a la anterior", async () => {
  const { context, page, toque, sostener, tarjetas } = await abrir();
  // La ✕.
  await sostener(100, 120);
  assert.equal(await tarjetas(), 1);
  await page.getByRole("button", { name: "Cerrar" }).click();
  assert.equal(await tarjetas(), 0);
  // Tocar el mapa (en un sitio sin lugares).
  await sostener(100, 120);
  await page.touchscreen.tap(320, 420);
  await espera(300);
  assert.equal(await tarjetas(), 0, "tocar el mapa");
  // Arrastrarlo.
  await sostener(100, 120);
  await toque("touchStart", [[200, 400]]);
  for (let i = 1; i <= 6; i++) {
    await toque("touchMove", [[200, 400 + i * 8]]);
    await espera(30);
  }
  await toque("touchEnd", []);
  await espera(400);
  assert.equal(await tarjetas(), 0, "arrastrar el mapa");
  // Abrir una ficha (desde la lista, que cambia `elegido`).
  await sostener(100, 120);
  assert.equal(await tarjetas(), 1);
  await page.evaluate(() => window.qa.elegir("centro"));
  await espera(300);
  assert.equal(await tarjetas(), 0, "abrir una ficha");
  await page.evaluate(() => window.qa.elegir(null));
  await espera(300);
  assert.equal(await tarjetas(), 0, "y cerrarla no la trae de vuelta");
  // Dos pulsaciones: queda la última.
  await sostener(100, 120);
  await sostener(300, 140);
  assert.equal(await tarjetas(), 1);
  await context.close();
});

test("un toque, arrastrar o pellizcar no sacan la tarjeta", async () => {
  const { context, page, toque, tarjetas, anillos } = await abrir();
  await page.touchscreen.tap(100, 120);
  await espera(700);
  assert.equal(await tarjetas(), 0, "un toque");
  await toque("touchStart", [[100, 120]]);
  for (let i = 1; i <= 8; i++) {
    await toque("touchMove", [[100 + i * 6, 120]]);
    await espera(40);
  }
  await espera(700);
  assert.equal(await tarjetas(), 0, "un arrastre sostenido al final");
  assert.equal(await anillos(), 0);
  await toque("touchEnd", []);
  await espera(500);
  await toque("touchStart", [[150, 200], [250, 200]]);
  for (let i = 1; i <= 6; i++) {
    await toque("touchMove", [[150 - i * 8, 200], [250 + i * 8, 200]]);
    await espera(40);
  }
  await espera(700);
  assert.equal(await tarjetas(), 0, "un pellizco");
  await toque("touchEnd", []);
  await context.close();
});

test("con «reducir movimiento» no hay anillo, pero sí marca y tarjeta", async () => {
  const { context, page, toque, tarjetas, anillos } = await abrir({ reducir: true });
  await toque("touchStart", [[100, 120]]);
  await espera(350);
  assert.equal(await anillos(), 0);
  await page.waitForSelector("[role=group][aria-label='Lugar nuevo']", { timeout: 2000 });
  assert.equal(await tarjetas(), 1);
  await toque("touchEnd", []);
  await context.close();
});

test("cerca de un borde la tarjeta se acomoda dentro del mapa (abajo del punto arriba, a un lado en los costados)", async () => {
  const { context, page, sostener } = await abrir();
  for (const [nombre, x, y] of [["arriba", 100, 40], ["izquierda", 14, 300], ["derecha", 376, 300], ["arriba a la derecha", 370, 30]]) {
    await sostener(x, y);
    const caja = await page.locator("[role=group][aria-label='Lugar nuevo']").boundingBox();
    assert.ok(caja.x >= 0 && caja.x + caja.width <= 390 && caja.y >= 0 && caja.y + caja.height <= 500, `${nombre}: la tarjeta en ${JSON.stringify(caja)}`);
    await page.getByRole("button", { name: "Cerrar" }).click();
  }
  await context.close();
});

test("si la tarjeta no cabe en lo que la hoja deja ver, se pide recoger la hoja una vez y la tarjeta se coloca dentro de lo que queda a la vista", async () => {
  // Con la hoja tapando 300 de 500 px se ven 200: a la y = 60 no cabe la tarjeta (130 con su flecha) ni arriba ni abajo.
  const { context, page, sostener } = await abrir({ tapa: 300 });
  await sostener(320, 60);
  assert.equal(await page.evaluate(() => window.qa.despejadas), 1, "pidió recogerla, una vez");
  await espera(400);
  const caja = await page.locator("[role=group][aria-label='Lugar nuevo']").boundingBox();
  assert.ok(caja.y >= 0 && caja.y + caja.height <= 440, `ya con la hoja recogida (tapa 60), la tarjeta cabe en lo que se ve: ${JSON.stringify(caja)}`);
  // Si la persona vuelve a subir la hoja con la tarjeta abierta, no se la vuelve a bajar: sería pelear con su dedo.
  await page.evaluate(() => window.qa.tapar(300));
  await espera(300);
  assert.equal(await page.evaluate(() => window.qa.despejadas), 1);
  await context.close();
});

test("arrastrar, pellizcar y el doble toque avisan a la hoja (`onGesto`), un arrastre una sola vez; un toque y la cámara de la propia app, no", async () => {
  const { context, page, toque } = await abrir();
  const gestos = () => page.evaluate(() => window.qa.gestos);
  await page.touchscreen.tap(100, 120);
  await espera(300);
  assert.equal(await gestos(), 0, "un toque");
  // Lo que mueve la propia app: encuadres, saltos, vuelos.
  await page.evaluate(() => {
    const m = window.qa.mapas[0];
    m.jumpTo({ zoom: 12 });
    m.easeTo({ center: [-100.97, 22.16], duration: 200 });
    m.fitBounds([[-101, 22.1], [-100.9, 22.2]], { duration: 200 });
  });
  await espera(600);
  assert.equal(await gestos(), 0, "movimientos de cámara de la app");
  await toque("touchStart", [[100, 120]]);
  for (let i = 1; i <= 12; i++) {
    await toque("touchMove", [[100 + i * 6, 120]]);
    await espera(30);
  }
  await toque("touchEnd", []);
  await espera(400);
  assert.equal(await gestos(), 1, "un arrastre, una vez aunque dure");
  await toque("touchStart", [[150, 200], [250, 200]]);
  for (let i = 1; i <= 8; i++) {
    await toque("touchMove", [[150 - i * 8, 200], [250 + i * 8, 200]]);
    await espera(30);
  }
  await toque("touchEnd", []);
  await espera(400);
  assert.ok((await gestos()) >= 2, "un pellizco avisa");
  // Un doble toque acerca: también es de la persona. (La rueda, en cambio, no trae evento en el `zoomstart` de Mapbox, y solo existe con ratón.)
  const antes = await gestos();
  await page.touchscreen.tap(200, 250);
  await page.touchscreen.tap(200, 250);
  await espera(600);
  assert.ok((await gestos()) > antes, "un doble toque avisa");
  await context.close();
});
