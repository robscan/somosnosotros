/** OL-408: acercar el cartel de una historia (founder, 2026-10-14: «Que se pueda hacer zoom en las imágenes de las historias»), en Chrome real con
 *  toques por CDP a 390×844 y sin «Reducir movimiento» (el avance automático corre, para ver que se pausa). Pellizcar acerca hasta 4× y pausa el
 *  avance; acercado, un dedo recorre el cartel y un toque no pasa de historia: lo devuelve a 1× y el avance sigue; pellizcar hacia dentro hasta 1×
 *  también lo reanuda; a 1× el toque vuelve a pasar de historia. En escritorio, la rueda acerca. La mecánica es la del visor (`useZoomImagen`), cuyas
 *  pruebas siguen en `VisorImagen.componentes.test.mjs`.
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
  dir = await mkdtemp(join(tmpdir(), "historias-zoom-"));
  const mocks = {
    "next/image": "import React from 'react';export default function Image({quality,priority,...p}){return React.createElement('img',p)}",
    "next/link": "import React from 'react';export default function Link({replace,prefetch,onNavigate,...p}){return React.createElement('a',p)}",
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
      createRoot(document.getElementById('root')).render(<main><Fila eventos={eventos} ahoraServidor='${AHORA}' asistencias={{}} conSesion/></main>);
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
  // Un cartel 4:5 con un punto en cada esquina.
  const cartel = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="#1e40af"/><circle cx="40" cy="40" r="24" fill="#f97316"/><circle cx="360" cy="460" r="24" fill="#f97316"/></svg>';
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
      res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><div id="root"></div><script src="/app.js"></script>');
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
const cerca = (a, b, t = 1) => assert.ok(Math.abs(a - b) <= t, `${a} debía estar a ${t} de ${b}`);

/** Inicio con la fila y la primera historia (la del cartel) abierta, con toques reales o con ratón. */
async function abrir(t, { tactil = true, viewport = { width: 390, height: 844 } } = {}) {
  const c = await browser.newContext({ viewport, hasTouch: tactil, isMobile: tactil, deviceScaleFactor: 2 });
  t.after(() => c.close());
  const page = await c.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  t.after(() => assert.deepEqual(errores, []));
  page.setDefaultTimeout(5000);
  await page.clock.install({ time: new Date(AHORA) });
  await page.goto(origin);
  const b = await page.getByRole("button", { name: /Caracolas/ }).boundingBox();
  if (tactil) await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
  else await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForFunction(() => document.querySelector("[role=dialog][data-abierta]"));
  await page.waitForFunction(() => document.querySelector("[role=dialog] img")?.complete);
  // La entrada (de 0,96 a 1 en `--duracion`) ya acabó: las medidas son las de la historia quieta.
  await page.waitForFunction(() => getComputedStyle(document.querySelector("[role=dialog]")).transform === "none");
  const cdp = await c.newCDPSession(page);
  const toque = (tipo, puntos) => cdp.send("Input.dispatchTouchEvent", { type: tipo, touchPoints: puntos.map(([x, y], id) => ({ x, y, id })) });
  /** Mueve los dedos en `pasos` pasos de `desde` a `hasta` y los suelta. */
  const jalar = async (desde, hasta, pasos = 10) => {
    await toque("touchStart", desde);
    for (let i = 1; i <= pasos; i++) {
      await toque("touchMove", desde.map(([x, y], k) => [x + ((hasta[k][0] - x) * i) / pasos, y + ((hasta[k][1] - y) * i) / pasos]));
      await espera(16);
    }
    await toque("touchEnd", []);
    await espera(80);
  };
  /** El cartel: su caja, su escala y su desplazamiento. */
  const cartel = () =>
    page.evaluate(() => {
      const el = document.querySelector("[role=dialog] img");
      const r = el.getBoundingClientRect();
      const m = new DOMMatrix(getComputedStyle(el).transform);
      return { izq: r.left, der: r.right, arriba: r.top, abajo: r.bottom, cx: (r.left + r.right) / 2, cy: (r.top + r.bottom) / 2, escala: m.a, x: m.e, y: m.f };
    });
  /** El estado del avance: si la historia está en pausa y si la barra del segmento actual corre. */
  const avance = () =>
    page.evaluate(() => {
      const d = document.querySelector("[role=dialog]");
      const barra = document.getAnimations().find((a) => String(a.animationName).includes("llena"));
      return { pausada: d.dataset.pausada === "true", barra: barra?.playState ?? null, titulo: d.querySelector("h2")?.textContent };
    });
  return { page, toque, jalar, cartel, avance };
}

/** Un pellizco hacia fuera alrededor del centro del cartel: los dedos pasan de ±20 px a ±`abre` px. */
async function pellizcar({ jalar, cartel }, abre = 40) {
  const { cx, cy } = await cartel();
  await jalar([[cx - 20, cy], [cx + 20, cy]], [[cx - abre, cy], [cx + abre, cy]]);
}

test("pellizcar acerca el cartel hasta 4× y pausa el avance; acercado, la historia no pasa sola ni cambia", async (t) => {
  const h = await abrir(t);
  const antes = await h.cartel();
  assert.deepEqual([antes.escala, antes.x, antes.y], [1, 0, 0]);
  const inicio = await h.avance();
  assert.deepEqual([inicio.pausada, inicio.barra, inicio.titulo], [false, "running", "Caracolas para Luciana"], "a 1× la barra corre");
  await pellizcar(h);
  const dos = await h.cartel();
  cerca(dos.escala, 2, 0.05);
  cerca(dos.cx, antes.cx, 1); // alrededor de los dedos: el centro se queda donde estaba
  const acercado = await h.avance();
  assert.deepEqual([acercado.pausada, acercado.barra, acercado.titulo], [true, "paused", "Caracolas para Luciana"], "acercado, el avance se pausa");
  assert.equal(await h.page.locator("[role=dialog] [data-acercada]").count(), 2, "la celda recorta y el cartel tiene la mano");
  // Un pellizco mucho mayor: tope en 4×.
  const { cx, cy } = await h.cartel();
  await h.jalar([[cx - 20, cy], [cx + 20, cy]], [[10, cy], [380, cy]]);
  cerca((await h.cartel()).escala, 4, 0.01);
  // Un dedo lo recorre (hacia la izquierda: enseña lo de la derecha) y no cambia de historia ni cierra.
  const a4 = await h.cartel();
  await h.jalar([[300, 420]], [[240, 400]]);
  const movido = await h.cartel();
  cerca(movido.x - a4.x, -60, 1);
  cerca(movido.escala, 4, 0.01);
  // Deslizar hacia abajo acercado mueve el cartel; no cierra.
  await h.jalar([[195, 300]], [[195, 600]], 8);
  assert.equal(await h.page.getByRole("dialog").count(), 1, "deslizar acercado no cierra");
  const quieto = await h.avance();
  assert.deepEqual([quieto.pausada, quieto.barra, quieto.titulo], [true, "paused", "Caracolas para Luciana"]);
});

test("el punto del cartel bajo los dedos se queda bajo los dedos, también lejos del centro (la letra chica de abajo)", async (t) => {
  const h = await abrir(t);
  const antes = await h.cartel();
  const alto = antes.abajo - antes.arriba, ancho = antes.der - antes.izq;
  const foco = [antes.izq + ancho * 0.3, antes.arriba + alto * 0.85];
  const fraccion = (v) => [(foco[0] - v.izq) / (v.der - v.izq), (foco[1] - v.arriba) / (v.abajo - v.arriba)];
  await h.jalar([[foco[0] - 15, foco[1]], [foco[0] + 15, foco[1]]], [[foco[0] - 45, foco[1]], [foco[0] + 45, foco[1]]], 12);
  const v = await h.cartel();
  cerca(v.escala, 3, 0.05);
  cerca(fraccion(v)[0], 0.3, 0.01);
  cerca(fraccion(v)[1], 0.85, 0.01);
});

test("acercado, un toque no pasa de historia: devuelve el cartel a 1× y el avance sigue; a 1×, el toque vuelve a pasar", async (t) => {
  const h = await abrir(t);
  await pellizcar(h);
  assert.ok((await h.cartel()).escala > 1.9);
  await h.page.touchscreen.tap(330, 420); // a la derecha: a 1× pasaría a la siguiente
  await espera(400); // la transición de vuelta
  const vuelta = await h.cartel();
  assert.deepEqual([vuelta.escala, Math.round(vuelta.x), Math.round(vuelta.y)], [1, 0, 0], "el toque lo devuelve a 1×");
  const sigue = await h.avance();
  assert.deepEqual([sigue.pausada, sigue.barra, sigue.titulo], [false, "running", "Caracolas para Luciana"], "misma historia y el avance sigue");
  assert.equal(await h.page.locator("[role=dialog] [data-acercada]").count(), 0);
  await h.page.touchscreen.tap(330, 420);
  await espera(100);
  assert.equal((await h.avance()).titulo, "Evento rato", "a 1× el toque pasa de historia");
});

test("pellizcar hacia dentro hasta 1× reanuda el avance; la ✕ cierra acercado", async (t) => {
  const h = await abrir(t);
  await pellizcar(h, 60);
  assert.ok((await h.cartel()).escala > 2.5);
  assert.equal((await h.avance()).barra, "paused");
  const { cx, cy } = await h.cartel();
  await h.jalar([[cx - 100, cy], [cx + 100, cy]], [[cx - 10, cy], [cx + 10, cy]]);
  const fuera = await h.cartel();
  assert.equal(fuera.escala, 1);
  const sigue = await h.avance();
  assert.deepEqual([sigue.pausada, sigue.barra, sigue.titulo], [false, "running", "Caracolas para Luciana"], "a 1× el avance sigue, en la misma historia");
  await pellizcar(h);
  await h.page.getByRole("button", { name: "Cerrar" }).tap();
  await h.page.getByRole("dialog").waitFor({ state: "detached" });
});

test("en escritorio la rueda sobre el cartel lo acerca y pausa; un clic lo devuelve a 1× sin pasar de historia", async (t) => {
  const h = await abrir(t, { tactil: false, viewport: { width: 1280, height: 800 } });
  const { cx, cy } = await h.cartel();
  await h.page.mouse.move(cx, cy);
  await h.page.mouse.wheel(0, -300);
  await espera(150);
  assert.ok((await h.cartel()).escala > 1.2, "la rueda acerca");
  assert.equal((await h.avance()).barra, "paused");
  await h.page.mouse.click(cx + 40, cy);
  await espera(400);
  assert.equal((await h.cartel()).escala, 1);
  const sigue = await h.avance();
  assert.deepEqual([sigue.barra, sigue.titulo], ["running", "Caracolas para Luciana"]);
});
