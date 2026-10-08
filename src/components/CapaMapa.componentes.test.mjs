/** Prueba de componente del mapa de una ficha a pantalla completa (OL-350): `MapaFicha` y `CapaMapa` reales, con el `Mapa` de Lugares sobre Mapbox GL de
 *  verdad y un estilo vacío servido aquí (sin red ni llaves; los nombres de los pines no se dibujan: los glifos van vacíos), en Chrome con toques reales.
 *  Cubre: el mapa no se carga hasta tocar la imagen; tocarla abre la capa con una entrada propia en el historial que la ✕, Escape y el Atrás del navegador
 *  consumen (la dirección no cambia); tocar un pin saca su tarjeta con el ángulo a su ficha (que reemplaza la entrada de la capa) y «Cómo llegar»; tocar el
 *  mapa vacío o el mismo pin la suelta; «Encuadrar» sale al arrastrar y se va al tocarlo; el pin elegido y la cámara se recuerdan al cerrar y volver a
 *  abrir, y se olvidan al salir de la ficha; «Mi ubicación» deja el punto azul con permiso y, sin él, el aviso de Lugares; lo que se mide; y que nada
 *  desborda a 390 ni a 320.
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
  // El enlace de Next como un <a>, diciendo si reemplaza la entrada del historial.
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link(p){const {prefetch,replace,...r}=p;return React.createElement('a',{...r,'data-reemplaza':replace?'si':'no',onClick:(e)=>{e.preventDefault();window.qa.navegaciones.push(r.href)}})}",
  "next/navigation": "export const useRouter=()=>({push(url){window.qa.navegaciones.push(url)}});export const usePathname=()=>'/eventos/festival';export const useSearchParams=()=>new URLSearchParams();",
  // `next/dynamic` como React.lazy: el módulo de la capa se pide al primer render que lo usa (el bundle es uno solo; la carga perezosa real se mide en la app).
  "next/dynamic": "import React from 'react';export default function dynamic(cargar){const L=React.lazy(()=>cargar().then((m)=>({default:m.default})));return function Dinamico(p){return React.createElement(React.Suspense,{fallback:null},React.createElement(L,p))}}",
};
const ESTILO = { version: 8, glyphs: "{origin}/glyphs/{fontstack}/{range}.pbf", sources: { mapa: { type: "geojson", data: { type: "FeatureCollection", features: [] }, attribution: "© Mapbox" } }, layers: [{ id: "fondo", type: "background", paint: { "background-color": "#e8e6df" } }, { id: "mapa", type: "line", source: "mapa" }] };
const IMAGEN = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="500"><rect width="1200" height="500" fill="#e6e6e2"/></svg>';

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "capa-mapa-componentes-"));
  // Mapbox de verdad, pero guardando cada mapa que se crea en `window.qa.mapas` (y cuándo se quita) para pedirle dónde cae cada sede.
  await writeFile(
    join(dir, "espia.js"),
    `import real from ${JSON.stringify(join(root, "node_modules/mapbox-gl/dist/mapbox-gl.js"))};
    window.qa.mapboxCargado = true;
    class Espia extends real.Map { constructor(o) { super(o); (window.qa.mapas ??= []).push(this); } remove() { window.qa.quitados++; return super.remove(); } }
    const espia = Object.create(real); espia.Map = Espia; export default espia;`,
  );
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    define: {
      "process.env.NEXT_PUBLIC_MAPBOX_TOKEN": '"pk.de-prueba"',
      "process.env.NEXT_PUBLIC_MAPBOX_STYLE": '"/estilo.json"',
      "process.env.NEXT_PUBLIC_SUPABASE_URL": "undefined",
      "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": "undefined",
      "process.env.NEXT_PUBLIC_VERCEL_ENV": '"preview"',
      "process.env.NEXT_PUBLIC_MEDIR_DEPURAR": '"1"',
    },
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React, {useState} from 'react';import {createRoot} from 'react-dom/client';
      import MapaFicha from './src/components/MapaFicha';import './src/app/globals.css';
      window.qa = { mapas: undefined, quitados: 0, navegaciones: [], mapboxCargado: false };
      const zona = 'America/Mexico_City';
      const manana = new Date(Date.now() + 86400000).toISOString();
      const sede = (clave, nombre, lat, lng, href, meta) => ({ clave, nombre, punto: { lat, lng }, meta, href, comoLlegar: 'https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lng, proximo: { inicio: manana, zona } });
      // Tres sedes del festival de prueba (bitácoras 368 y 377): dos del directorio y una fuera de él, separadas para tocarlas sin errar.
      const sedes = [
        sede('l:ccub', 'Centro Cultural Universitario Bicentenario', 22.160, -101.000, '/lugares/ccub', '2 actividades'),
        sede('s:jardin de san juan de dios', 'Jardín de San Juan de Dios', 22.145, -100.975, '/sitios/jardin-de-san-juan-de-dios-san-luis-potosi', '1 actividad'),
        sede('l:paz', 'Teatro de la Paz', 22.135, -100.990, '/lugares/teatro-de-la-paz', '1 actividad'),
      ];
      // \`qa.salir()\`: la persona sale de la ficha y vuelve a una nueva (el componente se desmonta y se monta otro).
      function App() {
        const [vez, setVez] = useState(0);
        window.qa.salir = () => setVez((v) => v + 1);
        return <main style={{ padding: 20 }}><h2>Dónde</h2><MapaFicha key={vez} sedes={sedes} ficha="festival" alt="las sedes del festival" /><p style={{ height: 1200 }}>Sobre el evento</p></main>;
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

async function abrirPagina({ ancho = 390, permisos = [] } = {}) {
  const context = await browser.newContext({ viewport: { width: ancho, height: 844 }, hasTouch: true, isMobile: true, permissions: permisos, geolocation: { latitude: 22.15, longitude: -100.98 } });
  // La imagen estática de Mapbox y su telemetría: contestadas aquí, sin red.
  await context.route("**/api.mapbox.com/**", (r) => r.fulfill({ contentType: "image/svg+xml", body: IMAGEN }));
  await context.route("**/events.mapbox.com/**", (r) => r.abort());
  const page = await context.newPage();
  const medidas = [];
  page.on("console", (m) => m.text().startsWith("[medir]") && medidas.push(m.text().split(" ")[1]));
  await page.goto(`${origin}/`);
  await page.getByRole("button", { name: "Ver el mapa" }).waitFor();
  const capa = () => page.getByRole("dialog");
  /** Abre la capa y espera al mapa con sus tres sedes dibujadas. */
  const abrir = async () => {
    await page.getByRole("button", { name: "Ver el mapa" }).tap();
    await capa().waitFor();
    await page.waitForFunction(() => {
      const m = window.qa.mapas?.at(-1);
      return m?.loaded() && m.getLayer("lugares-puntos") && m.queryRenderedFeatures({ layers: ["lugares-puntos"] }).length === 3;
    }, null, { timeout: 30000 });
    await espera(300);
  };
  /** Dónde cae una sede en la pantalla, según el mapa abierto. */
  const dondeCae = (clave) => page.evaluate((c) => { const m = window.qa.mapas.at(-1); const f = m.querySourceFeatures("lugares").find((x) => x.properties.id === c); const p = m.project(f.geometry.coordinates); const r = m.getContainer().getBoundingClientRect(); return [r.left + p.x, r.top + p.y]; }, clave);
  const tocarSede = async (clave) => {
    const [x, y] = await dondeCae(clave);
    await page.touchscreen.tap(x, y);
    await espera(500);
  };
  const tarjeta = () => page.locator("[role=dialog] [role=group]");
  return { context, page, capa, abrir, dondeCae, tocarSede, tarjeta, medidas };
}

test("el mapa de Mapbox no se carga con la ficha: solo al tocar la imagen, que abre la capa con una entrada propia que la ✕ consume", async () => {
  const { context, page, capa, abrir, medidas } = await abrirPagina();
  await espera(500);
  assert.equal(await page.evaluate(() => window.qa.mapboxCargado), false, "con la ficha sola no se pide Mapbox GL");
  assert.equal(await capa().count(), 0);
  const largo = await page.evaluate(() => history.length);
  await abrir();
  assert.equal(await page.evaluate(() => window.qa.mapboxCargado), true);
  assert.equal(await page.evaluate(() => history.length), largo + 1, "una sola entrada más");
  assert.equal(await capa().getAttribute("aria-label"), "Mapa de las sedes del festival");
  // La ✕, arriba a la izquierda, con el foco; «Mi ubicación» arriba a la derecha; «Encuadrar» todavía no.
  const cerrar = page.getByRole("button", { name: "Cerrar el mapa" });
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")), "Cerrar el mapa");
  const [c, u] = [await cerrar.boundingBox(), await page.getByRole("button", { name: "Mi ubicación" }).boundingBox()];
  assert.ok(c.x < 40 && c.y < 40 && u.x > 300 && u.y < 40, JSON.stringify({ c, u }));
  for (const caja of [c, u]) assert.ok(caja.width >= 44 && caja.height >= 44);
  assert.equal(await page.getByRole("button", { name: "Encuadrar las sedes" }).isVisible(), false);
  // Lo de detrás queda inerte.
  assert.equal(await page.evaluate(() => document.getElementById("root").inert), true);
  await cerrar.tap();
  await capa().waitFor({ state: "detached" });
  await espera(200);
  assert.equal(await page.evaluate(() => history.state?.somosnosotrosMapa ?? null), null, "volvió a la entrada de la ficha");
  assert.equal(await page.evaluate(() => location.pathname), "/");
  assert.equal(await page.evaluate(() => document.getElementById("root").inert), false);
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")), "Ver el mapa", "el foco vuelve al mapa de la ficha");
  assert.deepEqual(medidas, ["mapa_abierto"]);
  await context.close();
});

test("el Atrás del navegador y Escape cierran la capa sin salir de la ficha; Adelante la vuelve a abrir", async () => {
  const { context, page, capa, abrir } = await abrirPagina();
  await abrir();
  await page.goBack();
  await capa().waitFor({ state: "detached" });
  assert.equal(await page.evaluate(() => location.pathname), "/");
  await page.goForward();
  await capa().waitFor();
  await page.keyboard.press("Escape");
  await capa().waitFor({ state: "detached" });
  assert.equal(await page.evaluate(() => history.state?.somosnosotrosMapa ?? null), null);
  await context.close();
});

test("tocar un pin saca su tarjeta: nombre, actividades, ángulo a su ficha (reemplazando la entrada de la capa) y «Cómo llegar»; el mapa vacío o el mismo pin la sueltan", async () => {
  const { context, page, abrir, dondeCae, tocarSede, tarjeta, medidas } = await abrirPagina();
  await abrir();
  await tocarSede("l:paz");
  assert.equal(await tarjeta().getAttribute("aria-label"), "Teatro de la Paz");
  const angulo = tarjeta().getByRole("link", { name: /Teatro de la Paz/ });
  assert.equal(await angulo.getAttribute("href"), "/lugares/teatro-de-la-paz");
  assert.equal(await angulo.getAttribute("data-reemplaza"), "si");
  assert.equal(await tarjeta().locator("small").innerText(), "1 actividad");
  const llegar = tarjeta().getByRole("link", { name: "Cómo llegar" });
  assert.equal(await llegar.getAttribute("href"), "https://www.google.com/maps/dir/?api=1&destination=22.135,-100.99");
  assert.equal(await llegar.getAttribute("target"), "_blank");
  // El pin elegido no queda bajo la tarjeta.
  await espera(400);
  const [, y] = await dondeCae("l:paz");
  const t = await tarjeta().boundingBox();
  assert.ok(y < t.y, `el pin (${y}) queda arriba de la tarjeta (${t.y})`);
  // La sede fuera del directorio abre la ficha de sitio.
  await tocarSede("s:jardin de san juan de dios");
  assert.equal(await tarjeta().getAttribute("aria-label"), "Jardín de San Juan de Dios");
  assert.equal(await tarjeta().getByRole("link", { name: /Jardín/ }).getAttribute("href"), "/sitios/jardin-de-san-juan-de-dios-san-luis-potosi");
  // El mismo pin la suelta; el mapa vacío también.
  await tocarSede("s:jardin de san juan de dios");
  assert.equal(await tarjeta().count(), 0, "el mismo pin");
  await tocarSede("l:ccub");
  assert.equal(await tarjeta().count(), 1);
  await page.touchscreen.tap(30, 420);
  await espera(400);
  assert.equal(await tarjeta().count(), 0, "el mapa vacío");
  await tocarSede("l:ccub");
  await tarjeta().getByRole("link", { name: "Cómo llegar" }).evaluate((a) => a.addEventListener("click", (e) => e.preventDefault()));
  await tarjeta().getByRole("link", { name: "Cómo llegar" }).tap();
  assert.deepEqual(medidas, ["mapa_abierto", "mapa_pin", "mapa_pin", "mapa_pin", "mapa_pin", "mapa_como_llegar"]);
  await context.close();
});

test("el pin elegido y la cámara se recuerdan al cerrar y volver a abrir; se olvidan al salir de la ficha", async () => {
  const { context, page, capa, abrir, dondeCae, tocarSede, tarjeta } = await abrirPagina();
  await abrir();
  // El mapa arrastrado hacia abajo deja el Teatro de la Paz bajo donde saldrá la tarjeta: al elegirlo, el mapa se mueve para enseñarlo.
  const cdp = await context.newCDPSession(page);
  const toque = (tipo, puntos) => cdp.send("Input.dispatchTouchEvent", { type: tipo, touchPoints: puntos.map(([x, y], id) => ({ x, y, id })) });
  const [, yPaz] = await dondeCae("l:paz");
  await toque("touchStart", [[200, 300]]);
  for (let i = 1; i <= 10; i++) {
    await toque("touchMove", [[200, 300 + i * ((760 - yPaz) / 10)]]);
    await espera(30);
  }
  await toque("touchEnd", []);
  await espera(800);
  await tocarSede("l:paz");
  await espera(600);
  const t = await tarjeta().boundingBox();
  const antes = await dondeCae("l:paz");
  assert.ok(antes[1] < t.y, `el mapa se movió para enseñarlo: pin en ${antes[1]}, tarjeta en ${t.y}`);
  await page.getByRole("button", { name: "Cerrar el mapa" }).tap();
  await capa().waitFor({ state: "detached" });
  await abrir();
  assert.equal(await tarjeta().getAttribute("aria-label"), "Teatro de la Paz", "la misma tarjeta");
  assert.equal(await page.getByRole("button", { name: "Encuadrar las sedes" }).isVisible(), true, "y «Encuadrar», porque se había movido");
  const despues = await dondeCae("l:paz");
  antes.forEach((v, i) => assert.ok(Math.abs(v - despues[i]) < 1, `el pin en el mismo sitio de la pantalla: ${antes} → ${despues}`));
  await page.getByRole("button", { name: "Cerrar el mapa" }).tap();
  await capa().waitFor({ state: "detached" });
  // Sale de la ficha y vuelve: nada elegido.
  await page.evaluate(() => window.qa.salir());
  await abrir();
  assert.equal(await tarjeta().count(), 0, "sin tarjeta");
  await context.close();
});

test("«Encuadrar» sale al arrastrar el mapa y se va al tocarlo", async () => {
  const { context, page, abrir } = await abrirPagina();
  await abrir();
  const encuadrar = page.getByRole("button", { name: "Encuadrar las sedes" });
  assert.equal(await encuadrar.isVisible(), false);
  const cdp = await context.newCDPSession(page);
  const toque = (tipo, puntos) => cdp.send("Input.dispatchTouchEvent", { type: tipo, touchPoints: puntos.map(([x, y], id) => ({ x, y, id })) });
  await toque("touchStart", [[200, 400]]);
  for (let i = 1; i <= 8; i++) {
    await toque("touchMove", [[200 + i * 15, 400 + i * 10]]);
    await espera(30);
  }
  await toque("touchEnd", []);
  await espera(500);
  assert.equal(await encuadrar.isVisible(), true);
  await encuadrar.tap();
  await espera(900);
  assert.equal(await encuadrar.isVisible(), false);
  await context.close();
});

test("«Mi ubicación»: con permiso deja el punto azul; sin él, el aviso de Lugares", async () => {
  {
    const { context, page, abrir, medidas } = await abrirPagina({ permisos: ["geolocation"] });
    await abrir();
    await page.getByRole("button", { name: "Mi ubicación" }).tap();
    await page.locator("[aria-label='Tu ubicación']").waitFor({ timeout: 5000 });
    assert.ok(medidas.includes("mapa_ubicacion"));
    await context.close();
  }
  {
    const { context, page, abrir } = await abrirPagina();
    await abrir();
    await page.getByRole("button", { name: "Mi ubicación" }).tap();
    const aviso = page.getByRole("alert");
    await aviso.waitFor({ timeout: 5000 });
    assert.match(await aviso.innerText(), /^No pudimos leer tu ubicación/);
    await context.close();
  }
});

test("nada desborda la pantalla a 390 ni a 320, con la tarjeta de la sede de nombre más largo", async () => {
  for (const ancho of [390, 320]) {
    const { context, page, abrir, tocarSede, tarjeta } = await abrirPagina({ ancho });
    await abrir();
    await tocarSede("l:ccub");
    const t = await tarjeta().boundingBox();
    assert.ok(t.x >= 0 && t.x + t.width <= ancho, `${ancho}: tarjeta ${JSON.stringify(t)}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), ancho);
    const llegar = await tarjeta().getByRole("link", { name: "Cómo llegar" }).boundingBox();
    assert.ok(llegar.height >= 44);
    await context.close();
  }
});
