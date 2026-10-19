/** OL-419: las historias de Inicio y los toques sobre sus controles, en Chrome real a 390×844 y sin «Reducir movimiento» (el avance corre).
 *  (1) Al tocar «Ver más información» la historia se va en ese momento aunque la navegación no termine: el enlace de Next se sustituye por uno que
 *  avisa como el de verdad (`onNavigate`) y deja la navegación pendiente para siempre; la capa deja de recibir toques, la página se desplaza y un
 *  toque sobre Inicio llega. (2) Con el dedo sobre un control el avance espera: en la última historia una pulsación larga no la cierra antes del
 *  clic, en otra no cambia de historia bajo el dedo (el clic abre la que se ve) y, si el navegador cancela el toque, el avance sigue. Cada toque mira
 *  antes qué hay en ese punto (un velo invisible se lo comería: OL-357). La barra del segmento se adelanta con la animación misma (Web Animations).
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
  dir = await mkdtemp(join(tmpdir(), "historias-gestos-"));
  const mocks = {
    "next/image": "import React from 'react';export default function Image({quality,priority,...p}){return React.createElement('img',p)}",
    // Como el `Link` de Next: un clic sin teclas avisa a `onNavigate` y navega dentro de la app; aquí la navegación queda pendiente para siempre.
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
      import React from 'react';import {createRoot} from 'react-dom/client';import Fila from './src/components/inicio/FilaAhora';import './src/app/globals.css';
      const Z='America/Mexico_City';const h=(hora)=>new Date('2026-10-09T'+hora+':00-06:00').toISOString();
      const ev=(clave,hora,c={})=>({clave,id:clave,href:'/eventos/'+clave,titulo:'Evento '+clave,inicio:h(hora),fin:null,zona:Z,exposicion:false,cartel:null,sitio:'CEART',parte:null,destino:'CEART, San Luis Potosí',...c});
      const eventos=[ev('ahora','17:30',{cartel:'/cartel.svg',titulo:'Caracolas para Luciana'}),ev('rato','18:30'),ev('hoy','21:00')];
      function Inicio(){const [n,setN]=React.useState(0);return <main><Fila eventos={eventos} ahoraServidor='${AHORA}' asistencias={{}} conSesion/>
        <button id="en-inicio" onClick={()=>setN(n+1)}>Toques en Inicio: {n}</button><p style={{height:2400}}>Más de Inicio</p></main>;}
      createRoot(document.getElementById('root')).render(<Inicio/>);
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
  const cartel = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="#1e40af"/><rect y="400" width="400" height="100" fill="#f97316"/></svg>';
  server = createServer(async (req, res) => {
    if (req.url.startsWith("/app.")) {
      const ext = req.url.startsWith("/app.css") ? "css" : "js";
      res.setHeader("content-type", ext === "css" ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8");
      res.end(await readFile(join(dir, "app." + ext)));
    } else if (req.url === "/cartel.svg") {
      res.setHeader("content-type", "image/svg+xml");
      res.end(cartel);
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

/** Inicio con la historia del círculo `nombre` abierta, con el dedo (`tactil`) o con el ratón. */
async function abrir(t, nombre, { tactil = true } = {}) {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: tactil, isMobile: tactil });
  t.after(() => c.close());
  const page = await c.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  t.after(() => assert.deepEqual(errores, []));
  page.setDefaultTimeout(5000);
  await page.clock.install({ time: new Date(AHORA) });
  await page.goto(origin);
  const b = await page.getByRole("button", { name: nombre }).boundingBox();
  if (tactil) await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
  else await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForFunction(() => document.querySelector("[role=dialog][data-abierta]"));
  await page.waitForFunction(() => getComputedStyle(document.querySelector("[role=dialog]")).transform === "none");
  const cdp = tactil ? await c.newCDPSession(page) : null;
  return { page, cdp };
}

/** El centro de `selector`, comprobando que en ese punto está él y no otra cosa encima. */
async function centro(page, selector) {
  const caja = await page.locator(selector).boundingBox();
  const [x, y] = [caja.x + caja.width / 2, caja.y + caja.height / 2];
  assert.ok(await page.evaluate(([x, y, s]) => !!document.elementFromPoint(x, y)?.closest(s), [x, y, selector]), `en (${x}, ${y}) está ${selector}`);
  return [x, y];
}

/** El estado de la historia: abierta, en pausa, su barra y su título. */
const historia = (page) =>
  page.evaluate(() => {
    const d = document.querySelector("[role=dialog]");
    const barra = document.getAnimations().find((a) => String(a.animationName).includes("llena"));
    return { abierta: !!d?.hasAttribute("data-abierta"), pausada: d?.dataset.pausada === "true", barra: barra?.playState ?? null, titulo: d?.querySelector("h2")?.textContent ?? null };
  });

/** Adelanta la barra del segmento actual a `ms` de sus 6 s. */
const adelantar = (page, ms) => page.evaluate((ms) => (document.getAnimations().find((a) => String(a.animationName).includes("llena")).currentTime = ms), ms);

const ENLACE = "[role=dialog] a[href^='/eventos/']";

test("«Ver más información»: la historia se va al tocarlo aunque la navegación no termine; Inicio recibe toques y se desplaza", async (t) => {
  const { page, cdp } = await abrir(t, /Caracolas/);
  const [x, y] = await centro(page, ENLACE);
  await page.touchscreen.tap(x, y);
  // En ese momento, sin esperar a la ficha (que no llega): la capa ya no recibe toques y la página ya no está bloqueada.
  const justo = await page.evaluate(() => ({
    navegaciones: window.navegaciones,
    abierta: !!document.querySelector("[role=dialog][data-abierta]"),
    historia: document.documentElement.hasAttribute("data-historia"),
    desplazamiento: getComputedStyle(document.documentElement).overflow,
    encima: document.elementFromPoint(195, 300)?.closest("[role=dialog]") ? "historia" : "inicio",
  }));
  assert.deepEqual(justo, { navegaciones: ["/eventos/ahora"], abierta: false, historia: false, desplazamiento: "visible", encima: "inicio" });
  await page.getByRole("dialog").waitFor({ state: "detached" });
  // Un toque de verdad sobre Inicio llega y un arrastre del dedo desplaza la página.
  const [bx, by] = await centro(page, "#en-inicio");
  await page.touchscreen.tap(bx, by);
  await page.getByText("Toques en Inicio: 1").waitFor();
  const toque = (type, puntos) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: puntos.map(([x, y], id) => ({ x, y, id })) });
  await toque("touchStart", [[200, 700]]);
  for (let i = 1; i <= 10; i++) {
    await toque("touchMove", [[200, 700 - i * 40]]);
    await espera(16);
  }
  await toque("touchEnd", []);
  await page.waitForFunction(() => scrollY > 100);
});

test("en la última historia, una pulsación larga sobre «Ver más información» no la cierra antes del clic", async (t) => {
  const { page } = await abrir(t, /Hoy: /, { tactil: false });
  assert.equal((await historia(page)).titulo, "Evento hoy");
  const [x, y] = await centro(page, ENLACE);
  await adelantar(page, 5600);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await espera(900);
  // Sin la pausa la barra habría acabado (le quedaban 0,4 s) y la capa se habría cerrado bajo el dedo.
  assert.deepEqual(await historia(page), { abierta: true, pausada: true, barra: "paused", titulo: "Evento hoy" });
  await page.mouse.up();
  assert.deepEqual(await page.evaluate(() => window.navegaciones), ["/eventos/hoy"]);
  assert.equal((await historia(page)).abierta, false);
});

test("con el dedo sobre «Ver más información» al final de una historia, no pasa a la siguiente: el toque abre la que se ve", async (t) => {
  const { page, cdp } = await abrir(t, /Caracolas/);
  const [x, y] = await centro(page, ENLACE);
  await adelantar(page, 5800);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 0 }] });
  await espera(400);
  assert.deepEqual(await historia(page), { abierta: true, pausada: true, barra: "paused", titulo: "Caracolas para Luciana" });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForFunction(() => window.navegaciones?.length);
  assert.deepEqual(await page.evaluate(() => window.navegaciones), ["/eventos/ahora"]);
});

test("si el navegador cancela el toque sobre un control, el avance sigue y la historia sigue abierta", async (t) => {
  const { page, cdp } = await abrir(t, /Caracolas/);
  const [x, y] = await centro(page, "[role=dialog] button[aria-label=Cerrar]");
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 0 }] });
  await page.waitForFunction(() => document.querySelector("[role=dialog]").dataset.pausada === "true");
  await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
  await page.waitForFunction(() => !document.querySelector("[role=dialog]").dataset.pausada);
  assert.deepEqual(await historia(page), { abierta: true, pausada: false, barra: "running", titulo: "Caracolas para Luciana" });
  assert.equal(await page.evaluate(() => window.navegaciones), undefined);
});
