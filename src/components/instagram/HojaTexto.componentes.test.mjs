/**
 * OL-468 (bitácora 500): «Listo» del texto a pantalla completa (`ui/CampoLargo`) dentro de la hoja «Publicar en Instagram» (`ui/Hoja`), con el
 * teclado abierto. Los componentes de verdad (`ListaInstagram` con su `HojaInstagram`), el armazón con `ui/useCampoVisible` (como en la app) y las
 * acciones del servidor de prueba. El festival del respaldo local (`RESPALDO_FESTIVAL_IG=1`): su texto es largo y la hoja se desplaza.
 *
 * La causa, medida en el simulador de iPhone con la app de la tienda: con el teclado arriba, `useCampoVisible` buscaba lo que se desplaza desde el
 * área de texto hacia arriba, salía de la capa fija y encontraba el cuerpo de la hoja de detrás; lo desplazaba (de 30 en 30 px hacia arriba) y en
 * el WKWebView eso desplazaba además la página 46 px: la capa quedaba pintada 46 px más abajo de donde recibe los toques y el toque sobre «Listo»
 * caía en el área de texto. En Chromium la página no se mueve, pero el cuerpo de detrás sí: es lo que estas pruebas miden (antes del arreglo, el
 * cuerpo subía y al volver de «Listo» el renglón del texto quedaba fuera de la vista). Toques reales: el ratón en coordenadas, y `elementFromPoint`.
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

const root = fileURLToPath(new URL("../../../", import.meta.url));
let dir, server, browser, origin;

process.env.RESPALDO_FESTIVAL_IG = "1";
const { tablas, E_MISTICA } = await import(pathToFileURL(join(root, "scripts/ops/auditoria-ui/respaldo-local/fixture.mjs")).href);
const marco = tablas.eventos.find((e) => e.id === E_MISTICA);
const actos = tablas.eventos.filter((e) => e.evento_padre_id === E_MISTICA);
const lugar = tablas.lugares.find((l) => l.id === marco.lugar_id);

const acciones = `
  export async function prepararInstagram(id) {
    const evento = window.qa.festival;
    return { ok: true, id, titulo: evento.titulo, ahora: new Date().toISOString(), etiquetas: [], ubicacion: { nombre: 'San Luis Potosí' },
      ciudad: { slug: 'san-luis-potosi', nombre: 'San Luis Potosí' }, conCartel: false, recortar: false, sePuede: true, publicado: null, evento };
  }
  export async function publicarEnInstagram() { return { ok: true, id: 't1' }; }
  export async function estadoTrabajo() { return null; }
  export async function estadosTrabajos() { return {}; }
  export async function publicarEnFacebook() { return { ok: true, id: 't2' }; }
`;
const mocks = {
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link({prefetch,replace,scroll,...p}){return React.createElement('a',p)}",
  "next/image": "import React from 'react';export default function Image({quality,priority,fill,...p}){return React.createElement('img',p)}",
  "next/navigation": "export const useRouter=()=>({push(){},refresh(){},back(){},replace(){}});export const usePathname=()=>'/admin/instagram';export const useSearchParams=()=>new URLSearchParams();",
  "./acciones": acciones,
  "@/app/admin/instagram/acciones": acciones,
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "hoja-texto-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    define: { "process.env": "{}" },
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: join(root, "src/app/admin/instagram"),
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import ListaInstagram from './ListaInstagram';
      import useCampoVisible from '../../../components/ui/useCampoVisible';
      import plantilla from '../../../components/ui/Plantilla.module.css';
      import admin from '../admin.module.css';
      import '../../globals.css';
      const marco = ${JSON.stringify(marco)}, actos = ${JSON.stringify(actos)}, lugar = ${JSON.stringify(lugar)};
      window.qa = { festival: {
        titulo: marco.titulo, inicio: marco.inicio, fin: marco.fin, zona: marco.zona, clase: 'festival', precio: marco.precio, opcional: true,
        lugar: { nombre: lugar.nombre, usuario: null }, ciudad: marco.ciudad, artistas: [],
        actos: actos.map((a) => ({ titulo: a.titulo, inicio: a.inicio, fin: a.fin, precio: a.precio, artistas: [] })),
      } };
      const para = [{ id: marco.id, href: '/eventos/' + marco.slug, titulo: marco.titulo, foto: null, cuando: 'Del 29 al 31 de oct', donde: lugar.nombre, linea: 'Sin cartel', publicado: false, facebook: null }];
      // El armazón real monta useCampoVisible una vez (src/components/Armazon.tsx).
      function Armazon({ children }) { useCampoVisible(); return children; }
      createRoot(document.getElementById('root')).render(
        <Armazon><main className={plantilla.paginaContenido + ' ' + admin.listado}><h1>Instagram</h1>
          <ListaInstagram ciudad={{ slug: 'san-luis-potosi', nombre: 'San Luis Potosí' }} ciudades={[]} para={para} ya={[]} abrir={null} conteo="1 evento" vacio={null} />
          {/* Una página más larga que la ventana, como la de verdad: así la página de detrás se puede desplazar. */}
          <div style={{ height: 2000 }} /></main></Armazon>,
      );
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

const ALTO = 844;
const TECLADO = 336;

/** La lista con un `visualViewport` simulado (Safari: el teclado encoge el área visible con `__teclado(px)`). */
async function abrir(t) {
  const context = await browser.newContext({ viewport: { width: 390, height: ALTO }, reducedMotion: "reduce" });
  t.after(() => context.close());
  await context.addInitScript(() => {
    const oyentes = { resize: [], scroll: [] };
    const vv = {
      height: window.innerHeight,
      offsetTop: 0,
      scale: 1,
      get pageTop() { return window.scrollY + this.offsetTop; },
      addEventListener: (n, f) => oyentes[n]?.push(f),
      removeEventListener: (n, f) => { if (oyentes[n]) oyentes[n] = oyentes[n].filter((x) => x !== f); },
    };
    Object.defineProperty(window, "visualViewport", { value: vv, configurable: true });
    window.__teclado = (px) => {
      vv.height = window.innerHeight - px;
      oyentes.resize.forEach((f) => f());
    };
  });
  const p = await context.newPage();
  p.setDefaultTimeout(5000);
  const errores = [];
  p.on("pageerror", (e) => errores.push(e.message));
  t.after(() => assert.deepEqual(errores, []));
  await p.goto(origin + "/");
  await p.getByRole("heading", { name: "Instagram", exact: true }).waitFor();
  return p;
}
/** Un toque de verdad: el ratón en el centro de la caja, sin desplazar nada antes (lo que se ve es lo que se toca). */
async function tocar(p, l) {
  const b = await l.boundingBox();
  await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
}
/** Como el plugin `@capacitor/keyboard` de la app de la tienda (modo `body`, bitácora 336): el área visible no cambia, llegan sus eventos. */
const capacitor = (p, alto) =>
  p.evaluate((px) => {
    for (const nombre of px ? ["keyboardWillShow", "keyboardDidShow"] : ["keyboardWillHide", "keyboardDidHide"]) {
      const ev = document.createEvent("Events");
      ev.initEvent(nombre, false, false);
      if (px) ev.keyboardHeight = px;
      window.dispatchEvent(ev);
    }
    document.body.style.height = px ? `${window.innerHeight - px}px` : "";
  }, alto);
/** Unos cuadros y el rato de vigilancia de `useCampoVisible` (1,2 s): lo que vaya a desplazar, ya lo desplazó. */
const asentar = (p) => p.waitForTimeout(1400);
const cuerpo = (hoja) => hoja.locator("[class*=cuerpo]").first();

/** La hoja abierta con el cuerpo desplazado hasta el renglón del texto, a la vista sobre el pie; devuelve cuánto está desplazado el cuerpo. */
async function hojaConElRenglon(p) {
  await tocar(p, p.getByRole("link", { name: /Cultura Mística \(demo\)/ }));
  const hoja = p.getByRole("dialog", { name: "Publicar en Instagram" });
  await hoja.getByRole("button", { name: "Publicar", exact: true }).waitFor();
  const renglon = hoja.getByRole("button", { name: "Texto de la publicación" });
  await cuerpo(hoja).evaluate((c) => c.scrollTo(0, c.scrollHeight));
  const desplazado = await cuerpo(hoja).evaluate((c) => c.scrollTop);
  assert.ok(desplazado > 100, `la hoja se desplaza hasta el texto (${desplazado} px)`);
  return { hoja, renglon, desplazado };
}

/** Lo que recibe el toque en el centro de «Listo», y si «Listo» está entero dentro de lo que se ve sobre el teclado. */
const listoTocable = (p) =>
  p.evaluate((teclado) => {
    const capa = document.querySelector('[role="dialog"][aria-label="Texto de la publicación"]');
    const listo = [...capa.querySelectorAll("button")].find((b) => b.textContent.trim() === "Listo");
    const r = listo.getBoundingClientRect();
    const blanco = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { recibe: blanco === listo || listo.contains(blanco), arriba: r.top, abajo: r.bottom, visibleHasta: window.innerHeight - teclado };
  }, TECLADO);

/** Si el renglón del texto se ve entero dentro del cuerpo de la hoja, y lo que recibe el toque en su centro. */
const renglonVisible = (hoja) =>
  cuerpo(hoja).evaluate((c) => {
    const renglon = c.querySelector('button[aria-label="Texto de la publicación"]');
    const a = c.getBoundingClientRect(), b = renglon.getBoundingClientRect();
    const blanco = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    return { dentro: b.top >= a.top - 1 && b.bottom <= a.bottom + 1, recibe: renglon.contains(blanco), scrollTop: c.scrollTop };
  });

for (const [nombre, teclado] of [
  ["app de la tienda (Capacitor)", (p, px) => capacitor(p, px)],
  ["Safari (el área visible se encoge)", (p, px) => p.evaluate((alto) => window.__teclado(alto), px)],
]) {
  test(`${nombre}: con el teclado arriba, la hoja de detrás no se mueve, «Listo» recibe el toque y se vuelve al renglón donde estaba`, async (t) => {
    const p = await abrir(t);
    const { hoja, renglon, desplazado } = await hojaConElRenglon(p);
    await tocar(p, renglon);
    const capa = p.getByRole("dialog", { name: "Texto de la publicación" });
    await capa.waitFor();
    assert.equal(await p.evaluate(() => document.activeElement?.tagName), "TEXTAREA", "el texto toma el foco");
    // Con la capa abierta el renglón sale del cuerpo y el cuerpo, más corto, se recorta solo: lo que cuenta es que el teclado no lo mueva.
    const alAbrir = await cuerpo(hoja).evaluate((c) => c.scrollTop);
    await teclado(p, TECLADO);
    await asentar(p);

    const detras = await cuerpo(hoja).evaluate((c) => c.scrollTop);
    // Antes del arreglo: `useCampoVisible` desplazaba el cuerpo de la hoja de detrás hacia arriba (en la app de la tienda, también la página).
    assert.ok(Math.abs(detras - alAbrir) <= 1, `con el teclado, el cuerpo de la hoja de detrás no se mueve: estaba en ${alAbrir} px y quedó en ${detras}`);
    assert.equal(await p.evaluate(() => window.scrollY), 0, "la página no se desplaza");
    // Lo que hace iOS en la app de la tienda al salir el teclado: desplaza la página para revelar el área de texto (medido: 46 px). La capa la
    // devuelve: con la página desplazada, en el WKWebView lo fijo queda pintado más abajo de donde recibe los toques.
    await p.evaluate(() => window.scrollTo(0, 46));
    await p.waitForTimeout(300);
    assert.equal(await p.evaluate(() => window.scrollY), 0, "la página de detrás vuelve a su sitio");

    const listo = await listoTocable(p);
    assert.ok(listo.recibe, "en el centro de «Listo» el toque lo recibe «Listo»");
    assert.ok(listo.arriba >= 0 && listo.abajo <= listo.visibleHasta, `«Listo» entero sobre el teclado (${listo.arriba}–${listo.abajo} de ${listo.visibleHasta})`);

    await tocar(p, capa.getByRole("button", { name: "Listo" }));
    await capa.waitFor({ state: "detached" });
    // El área de texto ya no está: iOS esconde el teclado.
    await teclado(p, 0);
    await asentar(p);
    const vuelta = await renglonVisible(hoja);
    // Cerca de donde estaba: con el plugin de la app de la tienda el recorrido de la hoja cambia mientras el teclado se va (medido: 16 px).
    assert.ok(Math.abs(vuelta.scrollTop - desplazado) <= 20, `la hoja vuelve a donde estaba (${desplazado} px; quedó en ${vuelta.scrollTop})`);
    assert.ok(vuelta.dentro, `al volver, el renglón del texto se ve entero en la hoja (cuerpo en ${vuelta.scrollTop} px)`);
    assert.ok(vuelta.recibe, "y se puede volver a tocar");
  });
}

