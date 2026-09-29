/** El armazón (OL-232, bitácora 260): una sola rejilla con la barra de la app, la pantalla y la navegación. El layout pone
 *  `data-vista` según la ruta y el CSS solo lee ese atributo: en el teléfono las raíces llevan la barra y la navegación y
 *  las demás vistas no; al bajar se recogen las dos y la fila de contexto sube con ellas; desde 792 la barra está en todas
 *  las vistas menos en las que llenan la ventana y no se recoge. Todo lo que se toca en la barra mide 44 como mínimo.
 * PLAYWRIGHT_MODULE=/ruta/playwright-core/index.mjs CHROME_EXECUTABLE=/ruta/chromium node --test este-archivo
 * (no corre con `npm test`, que solo toma `.test.ts`, como las demás `.componentes.test.mjs` del repo). */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../", import.meta.url));
let dir, server, browser, origin;

const mocks = {
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link({prefetch,replace,...p}){return React.createElement('a',p)}",
  "next/image": "import React from 'react';export default function Image({unoptimized,preload,...p}){return React.createElement('img',p)}",
  // La ruta se cambia a mano (`window.__ponerRuta`), como al navegar.
  "next/navigation":
    "import {useSyncExternalStore} from 'react';const oy=new Set();window.__ruta='/agenda';window.__ponerRuta=(r)=>{window.__ruta=r;oy.forEach((f)=>f())};const sub=(f)=>{oy.add(f);return()=>oy.delete(f)};export function usePathname(){return useSyncExternalStore(sub,()=>window.__ruta,()=>'/')}export function useSearchParams(){return new URLSearchParams('')}export function useRouter(){return {push(){},replace(){},back(){},refresh(){},prefetch(){}}}",
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "armazon-componentes-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import Armazon from './src/components/Armazon';
      import BarraApp from './src/components/BarraApp';
      import NavInferior from './src/components/NavInferior';
      import EnBarra from './src/components/EnBarra';
      import Cabecera from './src/components/ui/Cabecera';
      import BotonIcono from './src/components/ui/BotonIcono';
      import {IconoCampana, IconoPuntos} from './src/components/ui/Iconos';
      import sesionStyles from './src/components/Sesion.module.css';
      import './src/app/globals.css';
      const campana = <BotonIcono href="/novedades" className={sesionStyles.sesion} aria-label="Novedades"><IconoCampana width={26} height={26} /></BotonIcono>;
      const menu = <BotonIcono aria-label="Más acciones"><IconoPuntos /></BotonIcono>;
      function App() {
        return (
          <Armazon barra={<BarraApp sesion={campana} />} nav={<NavInferior perfil={<span>A</span>} />}>
            <main className="raiz">
              <EnBarra volver={{ href: '/agenda', texto: 'Agenda' }} menu={menu} />
              <Cabecera contexto={<span style={{ height: 44 }}>chip</span>} onBuscar={() => {}} />
              <ul style={{ listStyle: 'none' }}>{Array.from({ length: 60 }, (_, i) => <li key={i} style={{ height: 80 }}>fila {i}</li>)}</ul>
            </main>
          </Armazon>
        );
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
        },
      },
    ],
  });
  const assets = new Map([
    ["/", ["text/html", '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--fuente-bricolage:Arial}</style><div id="root"></div><script src="/app.js"></script>']],
    ["/app.js", ["text/javascript", await readFile(join(dir, "app.js"))]],
    ["/app.css", ["text/css", await readFile(join(dir, "app.css"))]],
    ["/logotipo.svg", ["image/svg+xml", await readFile(join(root, "public/logotipo.svg"))]],
  ]);
  server = createServer((req, res) => {
    const a = assets.get(req.url);
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

async function pagina(t, ancho = 390, alto = 844) {
  const context = await browser.newContext({ viewport: { width: ancho, height: alto } });
  t.after(() => context.close());
  const p = await context.newPage();
  p.setDefaultTimeout(5000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  t.after(() => assert.deepEqual(errors, []));
  await p.goto(origin);
  await p.locator("[data-vista]").waitFor();
  return p;
}

const ir = async (p, ruta) => {
  await p.evaluate((r) => window.__ponerRuta(r), ruta);
  await p.waitForTimeout(80);
};
/** Arriba (`top`) y alto de un elemento, redondeados a décimas. */
const caja = (loc) =>
  loc.evaluate((e) => {
    const r = e.getBoundingClientRect();
    const d = (v) => Math.round(v * 10) / 10;
    return { x: d(r.left), y: d(r.top), w: d(r.width), h: d(r.height), b: d(r.bottom), display: getComputedStyle(e).display };
  });
const barra = (p) => p.locator("[data-vista] > header");
const nav = (p) => p.locator("nav[aria-label=Secciones]");
const cabecera = (p) => p.locator("main header");
const bajar = async (p, y) => {
  await p.evaluate((v) => window.scrollTo(0, v), y);
  await p.waitForTimeout(600);
};

test("el layout pone data-vista según la ruta: raíz, ficha, tarea o pantalla completa", async (t) => {
  const p = await pagina(t);
  for (const [ruta, vista] of [["/", "raiz"], ["/agenda", "raiz"], ["/perfil", "raiz"], ["/eventos/concierto", "ficha"], ["/personas/8f1c", "ficha"], ["/eventos/nuevo", "tarea"], ["/ajustes", "tarea"], ["/obra/4d2e/pared", "completa"], ["/artistas/aaron/letrero", "completa"]]) {
    await ir(p, ruta);
    assert.equal(await p.locator("[data-vista]").getAttribute("data-vista"), vista, ruta);
  }
});

test("teléfono: la raíz lleva la barra (56) y la navegación (60); las demás vistas, ninguna", async (t) => {
  const p = await pagina(t);
  await ir(p, "/agenda");
  const b = await caja(barra(p));
  const n = await caja(nav(p));
  assert.deepEqual([b.y, b.h, n.y, n.h], [0, 56, 784, 60]);
  assert.equal((await caja(cabecera(p))).y, 56, "la fila de contexto va pegada bajo la barra");
  for (const ruta of ["/eventos/concierto", "/eventos/nuevo", "/obra/4d2e/pared"]) {
    await ir(p, ruta);
    assert.equal((await caja(barra(p))).display, "none", `${ruta}: sin barra de la app`);
    assert.equal((await caja(nav(p))).display, "none", `${ruta}: sin navegación`);
  }
});

test("teléfono: al bajar la barra sube, la navegación baja y la fila queda arriba; al subir un poco vuelven", async (t) => {
  const p = await pagina(t);
  await ir(p, "/agenda");
  await bajar(p, 900);
  assert.equal(await p.locator("[data-vista]").getAttribute("data-recogida"), "");
  assert.deepEqual([(await caja(barra(p))).y, (await caja(nav(p))).y, (await caja(cabecera(p))).y], [-56, 844, 0], "barra fuera por arriba, navegación fuera por abajo y la fila en el borde");
  assert.equal(await barra(p).evaluate((e) => getComputedStyle(e).visibility), "hidden", "lo recogido no se toca ni se lee");
  await p.waitForTimeout(400);
  await p.evaluate(() => window.scrollBy(0, -40));
  await p.waitForTimeout(600);
  assert.equal(await p.locator("[data-vista]").getAttribute("data-recogida"), null);
  assert.deepEqual([(await caja(barra(p))).y, (await caja(nav(p))).y, (await caja(cabecera(p))).y], [0, 784, 56]);
});

test("teléfono: al llegar al final vuelven, y cada pantalla nueva empieza con todo a la vista", async (t) => {
  const p = await pagina(t);
  await ir(p, "/agenda");
  await bajar(p, 900);
  await bajar(p, 99999);
  assert.equal(await p.locator("[data-vista]").getAttribute("data-recogida"), null, "en el final la navegación está a mano");
  await bajar(p, 0);
  await bajar(p, 900);
  assert.equal(await p.locator("[data-vista]").getAttribute("data-recogida"), "");
  await ir(p, "/lugares");
  assert.equal(await p.locator("[data-vista]").getAttribute("data-recogida"), null, "otra pantalla, la barra a la vista");
});

test("la barra: cada botón de la barra y de la navegación se toca en 44×44 como mínimo; el logotipo queda al centro", async (t) => {
  const p = await pagina(t);
  await ir(p, "/agenda");
  const medidas = await p.locator("[data-vista] > header a, [data-vista] > header button, nav[aria-label=Secciones] a").evaluateAll((els) => els.map((e) => ({ n: e.getAttribute("aria-label") || e.textContent.trim(), w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height) })));
  assert.equal(medidas.length, 4 + 5, "«+», logotipo, lupa, campana y los cinco destinos");
  for (const m of medidas) assert.ok(m.w >= 44 && m.h >= 44, `${m.n}: ${m.w}×${m.h}`);
  const logo = await caja(barra(p).locator("a[aria-label^='Somos Nosotros']"));
  assert.ok(Math.abs(logo.x + logo.w / 2 - 195) <= 1, `centro del logotipo en ${logo.x + logo.w / 2}`);
});

test("la fila de contexto: el relleno blanco de 300 px sobre ella no tapa la barra", async (t) => {
  const p = await pagina(t);
  await ir(p, "/agenda");
  const r = await cabecera(p).evaluate((e) => {
    const s = getComputedStyle(e, "::before");
    const lupa = document.querySelector("[data-vista] > header a[aria-label='Buscar']").getBoundingClientRect();
    return { alto: s.height, fondo: s.backgroundColor, eventos: s.pointerEvents, encima: document.elementFromPoint(lupa.left + lupa.width / 2, lupa.top + lupa.height / 2)?.closest("a")?.getAttribute("aria-label") };
  });
  assert.deepEqual(r, { alto: "300px", fondo: "rgb(255, 255, 255)", eventos: "none", encima: "Buscar" });
});

test("desde 792: la barra está en las fichas y las tareas, con Atrás y el menú solo en la ficha; en la pantalla completa no; no se recoge", async (t) => {
  const p = await pagina(t, 1280, 800);
  await ir(p, "/agenda");
  assert.deepEqual((({ y, h }) => [y, h])(await caja(barra(p))), [0, 56]);
  await bajar(p, 900);
  assert.deepEqual([(await caja(barra(p))).y, (await caja(cabecera(p))).y], [0, 56], "la barra no se recoge");
  await ir(p, "/eventos/concierto");
  const botones = await barra(p).locator("a, button").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
  assert.ok(botones.includes("Atrás (Agenda)") && botones.includes("Más acciones"), `${botones}`);
  const logo = await caja(barra(p).locator("a[aria-label^='Somos Nosotros']"));
  assert.ok(Math.abs(logo.x + logo.w / 2 - 640) <= 1, "el logotipo, al centro de la ventana");
  await ir(p, "/eventos/nuevo");
  assert.equal((await caja(barra(p))).display, "grid");
  assert.equal(await barra(p).locator("a[aria-label^='Atrás']").count(), 0, "las tareas no traen Atrás en la barra de la app");
  await ir(p, "/obra/4d2e/pared");
  assert.equal((await caja(barra(p))).display, "none");
});
