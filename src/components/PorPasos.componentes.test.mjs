/** OL-305 (bitácora 333): todo campo de texto queda dentro del área visible al enfocarse, con el teclado abierto (`ui/useCampoVisible`, montado
 *  en el armazón). Se monta el armazón real de los pasos (`PorPasos` + `PiePaso`) con un paso largo (un bloque alto hace de mapa) y un campo
 *  al fondo, justo sobre el pie, y se simula el teclado del iPhone con un `window.visualViewport` propio: un EventTarget con `height` (la
 *  ventana menos el teclado, 844 − 336 = 508), `offsetTop` y `pageTop` (el desplazamiento de la página); `resize` lo dispara la prueba. Lo
 *  que no cubre (Safari de verdad desplazando por su cuenta, su `offsetTop` desfasado) lo cubre el simulador de iPhone (bitácora 333).
 *  Con «movimiento reducido» el desplazamiento es inmediato y la prueba no espera animaciones.
 * PLAYWRIGHT_MODULE=/ruta/playwright-core/index.mjs node --test este-archivo   (o `npm run test:componentes`) */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../", import.meta.url));
const VENTANA = 844;
const TECLADO = 336;
let dir, server, browser, origin;
const mocks = {
  "./Atras": "export function useVolver(){return ()=>{}}export function useTerminar(){return ()=>{}}export default function Atras(){return null}export function AtrasIcono(){return null}",
  "./Navegacion": "export const registrarVolverVisible=()=>()=>{}",
  "./Logotipo": "export default function Logotipo(){return null}",
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link({prefetch,replace,...p}){return React.createElement('a',p)}",
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "por-pasos-componentes-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    define: { "process.env.NEXT_PUBLIC_MAPBOX_TOKEN": '""', "process.env.NEXT_PUBLIC_MAPBOX_STYLE": '""', "process.env.NEXT_PUBLIC_SUPABASE_URL": '""', "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": '""' },
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import PorPasos, {PiePaso} from './src/components/PorPasos';
      import Hoja from './src/components/ui/Hoja';
      import useCampoVisible from './src/components/ui/useCampoVisible';
      import './src/app/globals.css';
      const q = new URLSearchParams(location.search);
      // ?sin=1: el armazón sin el mecanismo (el control negativo); ?hoja=1: una hoja con un campo al fondo de su cuerpo.
      function Armazon({children}) { if (!q.has('sin')) useCampoVisible(); return children; }
      function Paso() {
        return (
          <PorPasos titulo="Publicar" paso="a" direccion={null} avance={0.5} salida={{href:'/', texto:'Salir'}} pregunta="¿Es aquí?">
            <div style={{height: 540, background: 'var(--fondo-mapa)'}} role="img" aria-label="Mapa de prueba" />
            <label className="campo"><input type="text" aria-label="Nombre del lugar" /></label>
            <PiePaso><button type="button">Sí, es aquí</button></PiePaso>
          </PorPasos>
        );
      }
      function ConHoja() {
        return (
          <Hoja etiqueta="Hoja de prueba" titulo="Hoja de prueba" onCerrar={() => {}}>
            <div style={{height: 700}} />
            <label><input type="text" aria-label="Campo de la hoja" /></label>
          </Hoja>
        );
      }
      createRoot(document.getElementById('root')).render(<Armazon>{q.has('hoja') ? <ConHoja /> : <Paso />}</Armazon>);
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

/** Una página de 390×844 con un `visualViewport` propio (sin teclado: 844 de alto) que la prueba encoge con `teclado(px)`. */
async function pagina(t, consulta = "") {
  const context = await browser.newContext({ viewport: { width: 390, height: VENTANA }, reducedMotion: "reduce" });
  t.after(() => context.close());
  await context.addInitScript(() => {
    const vv = new EventTarget();
    Object.defineProperties(vv, {
      height: { value: window.innerHeight, writable: true },
      width: { value: 390 },
      offsetTop: { value: 0 },
      offsetLeft: { value: 0 },
      scale: { value: 1 },
      pageTop: { get: () => window.scrollY },
      pageLeft: { value: 0 },
    });
    Object.defineProperty(window, "visualViewport", { configurable: true, value: vv });
    window.teclado = (px) => {
      vv.height = window.innerHeight - px;
      vv.dispatchEvent(new Event("resize"));
    };
  });
  const p = await context.newPage();
  p.setDefaultTimeout(5000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  t.after(() => assert.deepEqual(errors, []));
  await p.goto(origin + consulta);
  await p.getByRole("textbox", { name: consulta.includes("hoja") ? "Campo de la hoja" : "Nombre del lugar" }).waitFor();
  return p;
}
/** Abre el teclado como el iPhone: enfoca el campo y, cuando el teclado ya subió, encoge el área visible. Espera unos cuadros a que todo se asiente. */
async function abrirTeclado(p, nombre) {
  await p.getByRole("textbox", { name: nombre }).focus();
  await p.evaluate((px) => window.teclado(px), TECLADO);
  await p.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(ok)))))));
}
/** Dónde está cada cosa respecto al área visible (844 − teclado de alto, desde 0): el campo, el pie y la barra de arriba. */
const cajas = (p, nombre) =>
  p.evaluate(
    ([n, ventana, teclado]) => {
      const r = (el) => (el ? el.getBoundingClientRect() : null);
      const campo = r(document.querySelector(`input[aria-label="${n}"]`));
      const pie = document.querySelector("footer");
      const barra = document.querySelector("header");
      const raiz = getComputedStyle(document.documentElement);
      return {
        campo: { top: campo.top, bottom: campo.bottom },
        visible: ventana - teclado,
        pie: pie ? { top: r(pie).top, bottom: r(pie).bottom, posicion: getComputedStyle(pie).position } : null,
        barraBottom: barra ? r(barra).bottom : 0,
        teclado: raiz.getPropertyValue("--teclado").trim(),
        atributo: document.documentElement.hasAttribute("data-teclado"),
        relleno: parseFloat(getComputedStyle(document.querySelector("main")).paddingBottom),
        recorrido: document.documentElement.scrollHeight - window.innerHeight,
      };
    },
    [nombre, VENTANA, TECLADO],
  );

test("sin campo enfocado no hay teclado: --teclado vale 0, el pie sigue pegado y la columna no lleva aire de más", async (t) => {
  const p = await pagina(t);
  const c = await cajas(p, "Nombre del lugar");
  assert.ok(c.teclado === "" || c.teclado === "0px", `--teclado sin teclado: «${c.teclado}»`);
  assert.equal(c.atributo, false);
  assert.equal(c.relleno, 0);
  assert.equal(c.pie.posicion, "sticky");
});

test("con el teclado abierto, la columna gana el aire del teclado y el campo queda entre la barra y el pie, dentro del área visible", async (t) => {
  const p = await pagina(t);
  await abrirTeclado(p, "Nombre del lugar");
  const c = await cajas(p, "Nombre del lugar");
  assert.equal(c.teclado, `${TECLADO}px`);
  assert.equal(c.atributo, true);
  assert.equal(c.relleno, TECLADO, "el relleno de abajo es lo que tapa el teclado");
  assert.equal(c.pie.posicion, "static", "el pie sale de lo pegado: queda tras el campo, en el flujo");
  assert.ok(c.campo.top >= c.barraBottom, `el campo no queda bajo la barra (arriba ${c.campo.top}, barra ${c.barraBottom})`);
  assert.ok(c.campo.bottom <= c.visible, `el campo cabe sobre el teclado (abajo ${c.campo.bottom}, área visible ${c.visible})`);
  assert.ok(c.campo.bottom <= c.pie.top, "el campo no queda bajo el pie");
});

test("el pie, en el flujo, queda sobre el teclado al fondo del recorrido: «Sí, es aquí» sigue al alcance", async (t) => {
  const p = await pagina(t);
  await abrirTeclado(p, "Nombre del lugar");
  await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const c = await cajas(p, "Nombre del lugar");
  assert.ok(c.pie.bottom <= c.visible + 1, `el pie cabe sobre el teclado (abajo ${c.pie.bottom}, área visible ${c.visible})`);
});

test("al cerrar el teclado todo vuelve: --teclado a 0, el pie pegado y sin aire de más", async (t) => {
  const p = await pagina(t);
  await abrirTeclado(p, "Nombre del lugar");
  await p.evaluate(() => {
    document.activeElement.blur();
    window.teclado(0);
  });
  await p.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue("--teclado").trim() === "0px");
  await p.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(ok)))));
  const c = await cajas(p, "Nombre del lugar");
  assert.equal(c.atributo, false);
  assert.equal(c.relleno, 0);
  assert.equal(c.pie.posicion, "sticky");
});

test("si el teclado llega después del foco (tarda en asentarse), el resize del área visible lo corrige", async (t) => {
  const p = await pagina(t);
  await p.getByRole("textbox", { name: "Nombre del lugar" }).focus();
  await p.evaluate(() => new Promise((ok) => setTimeout(ok, 300))); // el cuadro del foco ya pasó con el área entera
  await p.evaluate((px) => window.teclado(px), TECLADO);
  await p.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))));
  const c = await cajas(p, "Nombre del lugar");
  assert.ok(c.campo.bottom <= c.visible && c.campo.bottom <= c.pie.top, `el campo cabe (abajo ${c.campo.bottom}, área visible ${c.visible}, pie ${c.pie.top})`);
});

test("control negativo: sin el mecanismo el mismo campo queda bajo el teclado (el problema que ve el iPhone)", async (t) => {
  const p = await pagina(t, "?sin=1");
  await abrirTeclado(p, "Nombre del lugar");
  const c = await cajas(p, "Nombre del lugar");
  assert.ok(c.campo.bottom > c.visible || c.campo.bottom > c.pie.top, `sin el hook el campo debía quedar tapado (abajo ${c.campo.bottom}, área visible ${c.visible}, pie ${c.pie.top})`);
});

test("en una hoja, el campo del fondo de su cuerpo queda dentro del área visible", async (t) => {
  const p = await pagina(t, "?hoja=1");
  await abrirTeclado(p, "Campo de la hoja");
  const c = await p.evaluate(([ventana, teclado]) => {
    const campo = document.querySelector('input[aria-label="Campo de la hoja"]').getBoundingClientRect();
    return { top: campo.top, bottom: campo.bottom, visible: ventana - teclado };
  }, [VENTANA, TECLADO]);
  assert.ok(c.top >= 0 && c.bottom <= c.visible, `el campo de la hoja se ve entero (arriba ${c.top}, abajo ${c.bottom}, área visible ${c.visible})`);
});
