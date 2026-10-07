/** OL-315 (bitácora 343, revisión de CI): quitar el mapa de «¿Dónde está?» / «¿Es aquí?» (al confirmar el paso, el componente se desmonta) con la
 *  telemetría de su primera carga todavía en vuelo. Mapbox GL de verdad sobre un estilo vacío servido aquí, sin red ni llaves. Mapbox, al terminar de
 *  cargar un mapa, manda dos peticiones (el «map.load» a events.mapbox.com y la sesión a /map-sessions) con un aviso de error compartido entre todos
 *  sus mapas; `Map.remove()` lo deja en null y, si alguna de esas peticiones falla después (bloqueada, sin red, o abortada como en `npm run medir`),
 *  la librería llama a ese null: «this.errorCb is not a function» (CI del PR #401, pantalla s19). Aquí se retienen esas peticiones, se desmonta el
 *  mapa y se sueltan fallando: no debe haber ningún error en la página.
 * PLAYWRIGHT_MODULE=/ruta/playwright-core/index.mjs node --test este-archivo   (o `npm run test:componentes`) */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../", import.meta.url));
const ESTILO = { version: 8, sources: {}, layers: [{ id: "fondo", type: "background", paint: { "background-color": "#e8e6df" } }] };
let browser, server, dir, origin;

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "mapa-donde-es-"));
  // Mapbox de verdad, guardando cada mapa que se crea y cuántos se quitaron, para saber cuándo cargó y cuándo se fue.
  await writeFile(
    join(dir, "espia.js"),
    `import real from ${JSON.stringify(join(root, "node_modules/mapbox-gl/dist/mapbox-gl.js"))};
    class Espia extends real.Map { constructor(o) { super(o); (window.qa.mapas ??= []).push(this); } remove() { window.qa.quitados++; return super.remove(); } }
    const espia = Object.create(real); espia.Map = Espia; export default espia;`,
  );
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    define: { "process.env.NEXT_PUBLIC_MAPBOX_TOKEN": '"pk.eyJ1IjoicHJ1ZWJhIiwiYSI6ImRlLXBydWViYSJ9.firma"', "process.env.NEXT_PUBLIC_MAPBOX_STYLE": '"/estilo.json"', "process.env.NEXT_PUBLIC_SUPABASE_URL": "undefined", "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": "undefined" },
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React, {useState} from 'react';import {createRoot} from 'react-dom/client';
      import MapaDondeEs from './src/components/MapaDondeEs';import './src/app/globals.css';
      window.qa = { mapas: undefined, quitados: 0 };
      const ciudad = { slug: 'san-luis-potosi', nombre: 'San Luis Potosí', centro: { lng: -100.9764, lat: 22.1497 }, zoom: 13 };
      // Como un paso que se confirma: el mapa está mientras \`visible\`; \`window.qa.quitar()\` lo desmonta.
      function App() {
        const [visible, setVisible] = useState(true);
        window.qa.quitar = () => setVisible(false);
        return visible ? <div style={{ position: 'relative', width: 390, height: 400 }}><MapaDondeEs lugares={[]} seleccion={{ lat: 22.15, lng: -100.97 }} centrarEn={ciudad.centro} ciudad={ciudad} onLugar={() => {}} onPoi={() => {}} onPunto={() => {}} onArrastre={() => {}} /></div> : <p>Revisa</p>;
      }
      createRoot(document.getElementById('root')).render(<App />);
    `,
    },
    plugins: [{ name: "dobles", setup: (b) => b.onResolve({ filter: /^mapbox-gl$/ }, () => ({ path: join(dir, "espia.js") })) }],
  });
  const assets = new Map([
    ["/", ["text/html", '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--fuente-bricolage:Arial}body{margin:0}</style><div id="root"></div><script src="/app.js"></script>']],
    ["/app.js", ["text/javascript", await readFile(join(dir, "app.js"))]],
    ["/app.css", ["text/css", await readFile(join(dir, "app.css"))]],
    ["/estilo.json", ["application/json", JSON.stringify(ESTILO)]],
  ]);
  server = createServer((req, res) => {
    const a = assets.get(req.url.split("?")[0]);
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

/** Abre el mapa reteniendo todo lo que va a Mapbox (la telemetría de la primera carga) hasta que la prueba lo suelte. */
async function abrir(t) {
  const context = await browser.newContext({ viewport: { width: 390, height: 500 } });
  t.after(() => context.close());
  const retenidas = [];
  await context.route((u) => u.hostname.endsWith("mapbox.com"), (r) => void retenidas.push(r));
  const page = await context.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await page.goto(origin);
  // La primera carga completa: es cuando Mapbox manda su telemetría.
  await page.waitForFunction(() => window.qa.mapas?.[0]?.loaded(), null, { timeout: 30000 });
  return { page, errores, retenidas };
}
const soltarFallando = async (retenidas) => {
  for (const r of retenidas.splice(0)) await r.abort();
};

test("desmontar el mapa con la telemetría de su primera carga en vuelo, y que esta falle después, no da ningún error en la página; el mapa se destruye después", { timeout: 60000 }, async (t) => {
  const { page, errores, retenidas } = await abrir(t);
  // Espera a que la telemetría salga (retenida aquí) antes de quitar el mapa.
  for (let i = 0; i < 50 && retenidas.length < 2; i++) await page.waitForTimeout(100);
  assert.ok(retenidas.length >= 2, `Mapbox mandó su telemetría (${retenidas.length} peticiones)`);
  await page.evaluate(() => window.qa.quitar());
  await page.getByText("Revisa").waitFor();
  // El lienzo ya salió de la página; el mapa se destruye cuando su telemetría tuvo tiempo de volver (`ESPERA_TELEMETRIA_MS`, 15 s).
  assert.equal(await page.locator(".mapboxgl-canvas").count(), 0);
  assert.equal(await page.evaluate(() => window.qa.quitados), 0);
  await soltarFallando(retenidas);
  await page.waitForTimeout(500);
  assert.deepEqual(errores, []);
  await page.waitForFunction(() => window.qa.quitados === 1, null, { timeout: 20000 });
  assert.deepEqual(errores, []);
});

test("un mapa que se desmonta antes de terminar su primera carga se quita al momento", { timeout: 60000 }, async (t) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 500 } });
  t.after(() => context.close());
  // Sin el estilo, el mapa nunca termina de cargar: no manda telemetría.
  await context.route((u) => u.pathname === "/estilo.json" || u.hostname.endsWith("mapbox.com"), () => {});
  const page = await context.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await page.goto(origin);
  await page.waitForFunction(() => window.qa.mapas?.length === 1);
  await page.evaluate(() => window.qa.quitar());
  await page.getByText("Revisa").waitFor();
  assert.equal(await page.evaluate(() => window.qa.quitados), 1);
  assert.deepEqual(errores, []);
});
