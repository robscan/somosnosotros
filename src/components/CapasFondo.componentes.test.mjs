/** OL-419: el mapa de una ficha a pantalla completa (`CapaMapa`) y una hoja (`ui/Hoja`) abiertos a la vez comparten una sola pila del fondo
 *  (`lib/bloqueoFondo`): mientras haya una capa, lo de detrás está inerte y la página no se desplaza; al cerrarse las dos, en cualquier orden, la
 *  página responde a los toques y se desplaza. Componentes reales en Chrome a 390×844; el mapa de Mapbox se sustituye por un rectángulo (aquí no
 *  importa lo que pinta). Las capas se abren por código para imponer el orden (con el mapa abierto, el botón de la hoja estaría inerte); se cierran
 *  con toques reales sobre su ✕ cuando son la de arriba, y la de abajo por código. Cada toque mira antes qué hay en ese punto (un velo invisible se lo
 *  comería: OL-357).
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
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link({prefetch,replace,onNavigate,...p}){return React.createElement('a',p)}",
  "@vercel/analytics": "export function track(){}",
  "./Mapa": "import React from 'react';export default function Mapa(){return React.createElement('div',{'data-mapa':'',style:{position:'absolute',inset:0,background:'#e8e6df'}})}",
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "capas-fondo-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    define: {
      "process.env.NEXT_PUBLIC_MAPBOX_TOKEN": '""',
      "process.env.NEXT_PUBLIC_MAPBOX_STYLE": '""',
      "process.env.NEXT_PUBLIC_SUPABASE_URL": "undefined",
      "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": "undefined",
      "process.env.NEXT_PUBLIC_VERCEL_ENV": '"preview"',
    },
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React, {useState} from 'react';import {createRoot} from 'react-dom/client';
      import CapaMapa from './src/components/CapaMapa';import Hoja from './src/components/ui/Hoja';import './src/app/globals.css';
      const sedes = [{ clave: 'l:ccub', nombre: 'Centro Cultural Universitario Bicentenario', punto: { lat: 22.16, lng: -101 }, meta: '2 actividades', href: '/lugares/ccub', comoLlegar: 'https://www.google.com/maps/dir/?api=1&destination=22.16,-101', proximo: null }];
      function App() {
        const [mapa, setMapa] = useState(false);
        const [hoja, setHoja] = useState(false);
        const [toques, setToques] = useState(0);
        const [elegido, setElegido] = useState(null);
        const [movido, setMovido] = useState(false);
        window.qa = { abrirMapa: () => setMapa(true), cerrarMapa: () => setMapa(false), abrirHoja: () => setHoja(true), cerrarHoja: () => setHoja(false) };
        const cerrarMapa = React.useCallback(() => setMapa(false), []);
        return <main style={{ padding: 20 }}>
          <h2>Ficha</h2>
          <button id="contar" onClick={() => setToques((n) => n + 1)}>Toques: {toques}</button>
          <p style={{ height: 2400 }}>Sobre el evento</p>
          {mapa && <CapaMapa sedes={sedes} etiqueta="Mapa de la ficha" elegido={elegido} onElegir={setElegido} vista={null} alMover={() => {}} movido={movido} onMovido={setMovido} onCerrar={cerrarMapa} />}
          {hoja && <Hoja etiqueta="Compartir" titulo="Compartir" onCerrar={() => setHoja(false)}><p>Opciones</p></Hoja>}
        </main>;
      }
      createRoot(document.getElementById('root')).render(<App />);
    `,
    },
    plugins: [
      {
        name: "dobles",
        setup(b) {
          b.onResolve({ filter: /.*/ }, (a) => (a.path in mocks && (a.path !== "./Mapa" || a.importer.endsWith("CapaMapa.tsx")) ? { path: a.path, namespace: "mock" } : undefined));
          b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({ contents: mocks[a.path], loader: "js", resolveDir: root }));
        },
      },
    ],
  });
  const assets = new Map([
    ["/", ["text/html", '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--fuente-bricolage:Arial}body{margin:0}</style><div id="root"></div><aside id="ya-inerte" inert></aside><script src="/app.js"></script>']],
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
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE ?? (process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : undefined) });
});
after(async () => {
  await browser?.close();
  if (server) await new Promise((r) => server.close(r));
  if (dir) await rm(dir, { recursive: true, force: true });
});

async function abrir(t) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  t.after(() => context.close());
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  t.after(() => assert.deepEqual(errores, []));
  await page.goto(origin);
  await page.locator("#contar").waitFor();
  return page;
}

/** El estado del fondo: qué hijos del body están inertes, si la página está bloqueada y cuántas capas hay. */
const fondo = (page) =>
  page.evaluate(() => ({
    inertes: [...document.body.children].filter((e) => e.inert && e.tagName !== "SCRIPT").map((e) => e.id || e.getAttribute("aria-label") || e.firstElementChild?.getAttribute("aria-label") || e.tagName),
    bloqueada: getComputedStyle(document.documentElement).overflow,
    capas: document.querySelectorAll("[role=dialog]").length,
  }));

/** Toca el centro de `selector` con el dedo, si es lo que hay en ese punto. */
async function tocar(page, selector) {
  const caja = await page.locator(selector).boundingBox();
  const [x, y] = [caja.x + caja.width / 2, caja.y + caja.height / 2];
  const encima = await page.evaluate(([x, y, s]) => !!document.elementFromPoint(x, y)?.closest(s), [x, y, selector]);
  assert.ok(encima, `en (${x}, ${y}) está ${selector}`);
  await page.touchscreen.tap(x, y);
}

/** Con todo cerrado: nada inerte salvo lo ajeno, la página se desplaza y un toque real sobre la ficha llega. */
async function pantallaLibre(page) {
  assert.deepEqual(await fondo(page), { inertes: ["ya-inerte"], bloqueada: "visible", capas: 0 });
  assert.equal(await page.evaluate(() => document.documentElement.hasAttribute("data-capas")), false);
  await tocar(page, "#contar");
  await page.getByText("Toques: 1").waitFor();
  await page.evaluate(() => window.scrollTo(0, 600));
  assert.equal(await page.evaluate(() => scrollY), 600, "la página se desplaza");
}

test("mapa y luego hoja; se cierra primero el mapa y después la hoja: la página queda libre", async (t) => {
  const page = await abrir(t);
  await page.evaluate(() => window.qa.abrirMapa());
  await page.getByRole("dialog", { name: "Mapa de la ficha" }).waitFor();
  await page.evaluate(() => window.qa.abrirHoja());
  await page.getByRole("dialog", { name: "Compartir" }).waitFor();
  assert.deepEqual(await fondo(page), { inertes: ["root", "ya-inerte", "Mapa de la ficha"], bloqueada: "hidden", capas: 2 }, "solo la hoja recibe toques");
  // Se va el de abajo: la hoja sigue sola encima, la página sigue quieta.
  await page.evaluate(() => window.qa.cerrarMapa());
  await page.getByRole("dialog", { name: "Mapa de la ficha" }).waitFor({ state: "detached" });
  assert.deepEqual(await fondo(page), { inertes: ["root", "ya-inerte"], bloqueada: "hidden", capas: 1 });
  await tocar(page, "[role=dialog] button[aria-label=Cerrar]");
  await page.getByRole("dialog").waitFor({ state: "detached" });
  await pantallaLibre(page);
});

test("mapa y luego hoja; se cierra primero la hoja (el mapa vuelve a responder) y después el mapa: la página queda libre", async (t) => {
  const page = await abrir(t);
  await page.evaluate(() => window.qa.abrirMapa());
  await page.getByRole("dialog", { name: "Mapa de la ficha" }).waitFor();
  await page.evaluate(() => window.qa.abrirHoja());
  await page.getByRole("dialog", { name: "Compartir" }).waitFor();
  await tocar(page, "[role=dialog][aria-label=Compartir] button[aria-label=Cerrar]");
  await page.getByRole("dialog", { name: "Compartir" }).waitFor({ state: "detached" });
  assert.deepEqual(await fondo(page), { inertes: ["root", "ya-inerte"], bloqueada: "hidden", capas: 1 }, "el mapa vuelve a ser la capa de arriba");
  await tocar(page, "button[aria-label='Cerrar el mapa']");
  await page.getByRole("dialog").waitFor({ state: "detached" });
  await pantallaLibre(page);
});

test("hoja y luego mapa; Escape cierra solo la capa de arriba y, al cerrar las dos, la página queda libre", async (t) => {
  const page = await abrir(t);
  await page.evaluate(() => window.qa.abrirHoja());
  await page.getByRole("dialog", { name: "Compartir" }).waitFor();
  await page.evaluate(() => window.qa.abrirMapa());
  await page.getByRole("dialog", { name: "Mapa de la ficha" }).waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("dialog", { name: "Mapa de la ficha" }).waitFor({ state: "detached" });
  assert.equal(await page.getByRole("dialog", { name: "Compartir" }).count(), 1, "Escape no cerró la hoja de abajo");
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "detached" });
  await pantallaLibre(page);
});
