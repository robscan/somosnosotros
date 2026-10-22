/** OL-442: el toque que cierra las historias no abre lo que queda debajo. En la última historia, tocar a la derecha cierra la capa; en táctil el
 *  navegador manda el `click` del toque después del `touchend`, al elemento que entonces está bajo el dedo (la capa ya no recibe toques): antes
 *  abría la tarjeta del carril de abajo (founder, 22 oct). En Chrome real a 390×844 con toques de verdad (`touchscreen.tap`, que pasa por el
 *  gesto del navegador), con y sin «Reducir movimiento» (con él la capa se desmonta en el acto). Cada toque mira antes qué hay en ese punto.
 *  Después, la tarjeta sigue respondiendo al primer toque.
 * PLAYWRIGHT_MODULE=/ruta/playwright-core/index.mjs CHROME_EXECUTABLE=/ruta/chrome node --test este-archivo
 */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const AHORA = "2026-10-09T18:00:00-06:00";
let dir, server, browser, origin;

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "historias-toque-final-"));
  const mocks = {
    "next/image": "import React from 'react';export default function Image({quality,priority,...p}){return React.createElement('img',p)}",
    // Como el `Link` de Next: un clic sin teclas avisa a `onNavigate` y navega dentro de la app; aquí solo se apunta a dónde.
    "next/link": `import React from 'react';export default function Link({replace,prefetch,onNavigate,onClick,...p}){return React.createElement('a',{...p,onClick:(e)=>{
      onClick?.(e);if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();
      let parar=false;onNavigate?.({preventDefault(){parar=true}});if(!parar)(window.navegaciones??=[]).push(p.href);}})}`,
    "@/app/eventos/acciones": "export async function cambiarAsistencia(){return true}",
  };
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    jsx: "automatic",
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';import Link from 'next/link';import Fila from './src/components/inicio/FilaAhora';import './src/app/globals.css';
      const Z='America/Mexico_City';const h=(hora)=>new Date('2026-10-09T'+hora+':00-06:00').toISOString();
      const ev=(clave,hora,c={})=>({clave,id:clave,href:'/eventos/'+clave,titulo:'Evento '+clave,inicio:h(hora),fin:null,zona:Z,exposicion:false,cartel:null,sitio:'CEART',parte:null,destino:'CEART, San Luis Potosí',...c});
      const eventos=[ev('ahora','17:30',{titulo:'Caracolas para Luciana'}),ev('hoy','21:00')];
      // La tarjeta del carril: ocupa todo lo que queda bajo la fila, también donde cae el toque de «siguiente» de la historia.
      createRoot(document.getElementById('root')).render(<main><Fila eventos={eventos} ahoraServidor='${AHORA}' asistencias={{}} conSesion/>
        <Link id="tarjeta" href="/eventos/tarjeta" style={{display:'block',height:2400,background:'#eee'}}>Tarjeta del carril</Link></main>);
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
    loader: { ".png": "dataurl" },
  });
  server = createServer(async (req, res) => {
    if (req.url.startsWith("/app.")) {
      const ext = req.url.startsWith("/app.css") ? "css" : "js";
      res.setHeader("content-type", ext === "css" ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8");
      res.end(await readFile(join(dir, "app." + ext)));
    } else {
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>body{margin:0}</style><div id="root"></div><script src="/app.js"></script>');
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  origin = "http://127.0.0.1:" + server.address().port;
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
  browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE ?? (process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : undefined), headless: true });
});
after(async () => {
  await browser?.close();
  await new Promise((r) => server?.close(r));
  if (dir) await rm(dir, { recursive: true, force: true });
});

const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));

/** Inicio en el teléfono con la historia del círculo `nombre` abierta por un toque. */
async function abrir(t, nombre, { reducido = false } = {}) {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: reducido ? "reduce" : "no-preference" });
  t.after(() => c.close());
  const page = await c.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  t.after(() => assert.deepEqual(errores, []));
  page.setDefaultTimeout(5000);
  await page.clock.install({ time: new Date(AHORA) });
  await page.goto(origin);
  const b = await page.getByRole("button", { name: nombre }).boundingBox();
  await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForFunction(() => document.querySelector("[role=dialog][data-abierta]"));
  if (!reducido) await page.waitForFunction(() => getComputedStyle(document.querySelector("[role=dialog]")).transform === "none");
  return page;
}

/** Lo que hay en (x, y): la historia o la tarjeta. */
const enPunto = (page, x, y) => page.evaluate(([x, y]) => (document.elementFromPoint(x, y)?.closest("[role=dialog]") ? "historia" : document.elementFromPoint(x, y)?.closest("#tarjeta") ? "tarjeta" : "otra"), [x, y]);

/** El lado derecho de la historia, a media altura (lejos de la cabecera y de las acciones). */
const DERECHA = [330, 420];

for (const reducido of [false, true]) {
  test(`el último toque a la derecha cierra las historias sin abrir la tarjeta de abajo${reducido ? " (Reducir movimiento)" : ""}; después la tarjeta responde`, async (t) => {
    const page = await abrir(t, /Hoy: /, { reducido });
    assert.equal(await page.evaluate(() => document.querySelector("[role=dialog] h2")?.textContent), "Evento hoy");
    assert.equal(await enPunto(page, ...DERECHA), "historia");
    await page.touchscreen.tap(...DERECHA);
    await page.getByRole("dialog").waitFor({ state: "detached" });
    // El clic del toque ya llegó (o se perdió): ninguna ficha se abrió.
    await espera(400);
    assert.equal(await page.evaluate(() => window.navegaciones), undefined);
    // La tarjeta sigue viva: el primer toque de después la abre.
    assert.equal(await enPunto(page, ...DERECHA), "tarjeta");
    await page.touchscreen.tap(...DERECHA);
    await page.waitForFunction(() => window.navegaciones?.length);
    assert.deepEqual(await page.evaluate(() => window.navegaciones), ["/eventos/tarjeta"]);
  });
}

test("pasar de historia a historia con toques a la derecha hasta cerrar: el toque que cierra no abre nada", async (t) => {
  const page = await abrir(t, /Caracolas/);
  await page.touchscreen.tap(...DERECHA);
  await page.waitForFunction(() => document.querySelector("[role=dialog] h2")?.textContent === "Evento hoy");
  await page.touchscreen.tap(...DERECHA);
  await page.getByRole("dialog").waitFor({ state: "detached" });
  await espera(400);
  assert.equal(await page.evaluate(() => window.navegaciones), undefined);
});
