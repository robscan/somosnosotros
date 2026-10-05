/** La hoja (`ui/Hoja`): en el teléfono sube desde abajo, con el asa y solo las esquinas de arriba redondas; desde 792 (OL-236,
 *  bitácora 264) es un diálogo al centro de la ventana, de la columna de ancho, con las cuatro esquinas redondas y sin asa; si no
 *  cabe, se queda a 48 de la ventana y se desplaza.
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

const root = fileURLToPath(new URL("../../../", import.meta.url));
let dir, server, browser, origin;

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "hoja-componentes-"));
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
      import Hoja from './src/components/ui/Hoja';
      import HojaFiltros from './src/components/ui/HojaFiltros';
      import HojaCiudad from './src/app/artistas/HojaCiudad';
      import {CIUDAD_INICIAL} from './src/lib/ciudad';
      import './src/app/globals.css';
      // ?alto=largo: un cuerpo más alto que la ventana; ?titulo=1: con cabecera fija (ui/Hoja, prop titulo) y un pie.
      const q = new URLSearchParams(location.search);
      function ModalPrueba() {
        const [abierta, setAbierta] = React.useState(false);
        const [otra, setOtra] = React.useState(false);
        const [n, setN] = React.useState(0);
        return <><button id="abrir" onClick={() => setAbierta(true)}>Abrir</button><a href="#fondo">Fondo</a>
          {abierta && <Hoja etiqueta="Principal" titulo="Principal" onCerrar={() => setAbierta(false)} pie={<button>Aplicar</button>}>
            <input aria-label="Campo" autoFocus={q.has('autofocus')} />
            <button disabled>Deshabilitado</button><button hidden>Oculto</button>
            <a href="#dentro">Enlace interno</a>
            <button onClick={() => setOtra(true)}>Abrir otra</button>
            <button onClick={() => setN(n + 1)}>Actualizar {n}</button>
            {otra && <Hoja etiqueta="Segunda" titulo="Segunda" onCerrar={() => setOtra(false)}><input aria-label="Campo secundario" /></Hoja>}
          </Hoja>}
        </>;
      }
      function App() {
        const [abierta, setAbierta] = React.useState(true);
        if (!abierta) return <p id="cerrada">cerrada</p>;
        if (q.has('filtros')) return <HojaFiltros titulo="Filtros" resultado="Ver 3" onLimpiar={() => {}} onVer={() => setAbierta(false)} onCerrar={() => setAbierta(false)}><input aria-label="Campo filtro" /><p>Opciones</p></HojaFiltros>;
        if (q.has('ciudad-alta')) return <HojaCiudad ciudad={CIUDAD_INICIAL.nombre} ciudades={[{...CIUDAD_INICIAL,artistas:1}]} onElegir={() => {}} onCerrar={() => setAbierta(false)} />;
        const cuerpo = <div style={{ height: q.get('alto') === 'largo' ? 2400 : 120 }}>cuerpo</div>;
        return q.get('titulo')
          ? <Hoja etiqueta="Prueba" titulo="Prueba" pie={<button type="button">Ver</button>} onCerrar={() => setAbierta(false)}>{cuerpo}</Hoja>
          : <Hoja etiqueta="Prueba" onCerrar={() => setAbierta(false)}><h3>Prueba</h3>{cuerpo}</Hoja>;
      }
      createRoot(document.getElementById('root')).render(q.has('modal') ? <React.StrictMode><ModalPrueba /></React.StrictMode> : <App />);
    `,
    },
    plugins: [{ name: "link", setup(b) {
      b.onResolve({ filter: /^next\/link$/ }, () => ({ path: "next/link", namespace: "mock" }));
      b.onLoad({ filter: /.*/, namespace: "mock" }, () => ({ contents: "import React from 'react';export const useLinkStatus=()=>({pending:false});export default function Link(p){return React.createElement('a',p)}", loader: "js", resolveDir: root }));
    } }],
  });
  const assets = new Map([
    ["/", ["text/html", '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--fuente-bricolage:Arial}</style><div id="root"></div><aside id="ya-inerte" inert></aside><script src="/app.js"></script>']],
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

async function abrir(t, ancho, alto, consulta = "") {
  const context = await browser.newContext({ viewport: { width: ancho, height: alto } });
  t.after(() => context.close());
  const p = await context.newPage();
  p.setDefaultTimeout(5000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  t.after(() => assert.deepEqual(errors, []));
  await p.goto(origin + consulta);
  await p.locator(consulta.includes("modal") ? "#abrir" : "[role=dialog]").waitFor();
  return p;
}
/** La caja de la hoja, sus esquinas (arriba-izquierda, abajo-izquierda) y si el asa se dibuja. */
const hoja = (p) =>
  p.locator("[role=dialog]").evaluate((e) => {
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    const d = (v) => Math.round(v * 10) / 10;
    return { x: d(r.left), y: d(r.top), w: d(r.width), h: d(r.height), b: d(r.bottom), arriba: cs.borderTopLeftRadius, abajo: cs.borderBottomLeftRadius, asa: getComputedStyle(e, "::before").display };
  });

test("teléfono: la hoja sube desde abajo, del ancho de la ventana, con el asa y solo las esquinas de arriba redondas", async (t) => {
  const p = await abrir(t, 390, 844);
  const h = await hoja(p);
  assert.deepEqual([h.x, h.w, h.b, h.arriba, h.abajo, h.asa], [0, 390, 844, "24px", "0px", "block"]);
});

test("teclado: contenido en el área visible y fondo continuo detrás de la barra translúcida de Safari", async t => {
  const p = await abrir(t, 390, 844, "?modal=1");
  await p.getByRole("button", { name: "Abrir", exact: true }).click();
  await p.getByRole("textbox", { name: "Campo", exact: true }).focus();
  await p.evaluate(() => {
    Object.defineProperties(visualViewport, {
      height: { configurable: true, value: 508 },
      offsetTop: { configurable: true, value: 43 },
    });
    visualViewport.dispatchEvent(new Event("resize"));
  });
  await p.waitForFunction(() => document.querySelector('[role=dialog]').getBoundingClientRect().bottom <= 551);
  const cajas = await p.getByRole("dialog").evaluate(e => {
    const fondo = e.parentElement, f = fondo.getBoundingClientRect(), h = e.getBoundingClientRect();
    const extension = getComputedStyle(fondo, "::after");
    return { velo: [f.top, f.bottom], contenido: h.bottom, extension: [extension.top, extension.bottom, extension.backgroundColor], blanco: getComputedStyle(e).backgroundColor };
  });
  assert.deepEqual(cajas.velo, [43, 887], "el velo no se encoge al alto que excluye la barra de Safari");
  assert.equal(cajas.contenido, 551, "el contenido sí termina en offsetTop + visualViewport.height");
  assert.deepEqual(cajas.extension, ["508px", "0px", cajas.blanco], "el blanco de la hoja continúa por debajo de su contenido");
  await p.evaluate(() => {
    Object.defineProperties(visualViewport, {
      height: { configurable: true, value: innerHeight },
      offsetTop: { configurable: true, value: 0 },
    });
    visualViewport.dispatchEvent(new Event("scroll"));
  });
  await p.waitForFunction(() => !document.querySelector('[role=dialog]').parentElement.getAttribute("style"));
  assert.equal((await hoja(p)).b, 844, "al cerrar teclado vuelve al marco CSS normal");
});

test("desde 792: la hoja es un diálogo de 600 al centro de la ventana, con las cuatro esquinas redondas y sin asa", async (t) => {
  for (const [ancho, alto] of [[820, 1180], [1280, 800]]) {
    const p = await abrir(t, ancho, alto);
    const h = await hoja(p);
    assert.equal(h.w, 600, `${ancho}: la columna`);
    assert.ok(Math.abs(h.x + h.w / 2 - ancho / 2) <= 0.5, `${ancho}: centrada a lo ancho (${h.x})`);
    assert.ok(Math.abs(h.y + h.h / 2 - alto / 2) <= 0.5, `${ancho}: centrada a lo alto (${h.y}, ${h.h})`);
    assert.deepEqual([h.arriba, h.abajo, h.asa], ["24px", "24px", "none"], `${ancho}: esquinas y asa`);
    const cerrar = await p.getByRole("button", { name: "Cerrar" }).evaluate((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.right), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; });
    assert.ok(cerrar[0] <= h.x + h.w && cerrar[1] >= h.y && cerrar[2] >= 44 && cerrar[3] >= 44, `${ancho}: la ✕ va dentro, arriba a la derecha, y se toca en 44: ${cerrar}`);
  }
});

test("área visible en escritorio: diálogo centrado sin prolongar su fondo blanco", async t => {
  const p = await abrir(t, 1280, 800);
  await p.evaluate(() => {
    Object.defineProperties(visualViewport, { height: { configurable: true, value: 400 }, offsetTop: { configurable: true, value: 20 } });
    visualViewport.dispatchEvent(new Event("resize"));
  });
  await p.waitForFunction(() => document.querySelector('[role=dialog]').parentElement.style.top === "20px");
  const h = await hoja(p);
  assert.ok(Math.abs(h.y + h.h / 2 - 220) < 0.5, "sigue centrada en el área visible");
  assert.equal(await p.getByRole("dialog").evaluate(e => getComputedStyle(e.parentElement, "::after").display), "none");
});

test("filtros con campo y Ciudad del alta/edición de artista conservan foco, pie y cierre sobre el teclado", async t => {
  for (const ancho of [320, 390]) for (const modo of ["filtros", "ciudad-alta"]) {
    const p = await abrir(t, ancho, 844, `?${modo}=1`);
    const input = p.getByRole("textbox", { name: modo === "filtros" ? "Campo filtro" : "Buscar la ciudad" });
    await input.focus();
    await p.evaluate(() => {
      Object.defineProperty(visualViewport, "height", { configurable: true, value: 508 });
      visualViewport.dispatchEvent(new Event("resize"));
    });
    await p.waitForFunction(() => document.querySelector('[role=dialog]').getBoundingClientRect().bottom === 508);
    assert.equal(await input.evaluate(e => e === document.activeElement), true);
    const caja = await input.boundingBox();
    assert.ok(caja.y >= 48 && caja.y + caja.height <= 508, `${modo}: campo visible`);
    assert.equal(await p.getByRole("dialog").evaluate(e => e.parentElement.getBoundingClientRect().bottom), 844);
    if (modo === "filtros") {
      const pie = p.getByRole("button", { name: "Ver 3" });
      const cajaPie = await pie.boundingBox();
      assert.ok(cajaPie.y + cajaPie.height <= 508, "pie completo sobre teclado");
      await pie.click();
    } else await p.getByRole("button", { name: "Cerrar", exact: true }).click();
    await p.locator("#cerrada").waitFor();
  }
});

test("desde 792: una hoja con cabecera fija y pie también va al centro, y una más alta que la ventana se queda a 48 y desplaza su cuerpo", async (t) => {
  const p = await abrir(t, 1280, 800, "?titulo=1&alto=largo");
  const h = await hoja(p);
  assert.equal(h.w, 600);
  assert.ok(h.h <= 800 - 48 + 0.5, `no pasa de la ventana menos 48: ${h.h}`);
  assert.ok(Math.abs(h.y + h.h / 2 - 400) <= 0.5, "centrada a lo alto");
  const pie = await p.getByRole("button", { name: "Ver" }).evaluate((e) => Math.round(e.getBoundingClientRect().bottom));
  assert.ok(pie <= h.b, `el pie queda dentro de la hoja: ${pie} de ${h.b}`);
  const cuerpo = await p.locator("[role=dialog] > div").first().evaluate((e) => [e.scrollHeight > e.clientHeight, getComputedStyle(e).overflowY]);
  assert.deepEqual(cuerpo, [true, "auto"], "solo el cuerpo se desplaza");
});

test("la hoja se cierra con la ✕, con Escape y tocando fuera, en el teléfono y en escritorio", async (t) => {
  for (const [ancho, alto] of [[390, 844], [1280, 800]]) {
    for (const como of ["equis", "escape", "fuera"]) {
      const p = await abrir(t, ancho, alto);
      if (como === "equis") await p.getByRole("button", { name: "Cerrar" }).click();
      else if (como === "escape") await p.keyboard.press("Escape");
      else await p.mouse.click(5, 5);
      await p.locator("#cerrada").waitFor();
    }
  }
});

for (const ancho of [320, 390]) {
  test(`modal a ${ancho}: foco inicial, fondo inerte, Tab/Shift+Tab, Escape y devolución al disparador`, async (t) => {
    const p = await abrir(t, ancho, 844, "?modal=1");
    await p.locator("#abrir").press("Enter");
    const dialogo = p.getByRole("dialog", { name: "Principal" });
    assert.equal(await dialogo.getAttribute("aria-modal"), "true");
    assert.equal(await p.evaluate(() => document.activeElement?.getAttribute("aria-label")), "Cerrar");
    assert.equal(await p.locator("#root").evaluate(e => e.inert), true);
    for (const esperado of ["Campo", "Enlace interno", "Abrir otra", "Actualizar 0", "Aplicar", "Cerrar"]) {
      await p.keyboard.press("Tab");
      assert.equal(await p.evaluate(() => document.activeElement?.getAttribute("aria-label") || document.activeElement?.textContent), esperado);
    }
    await p.keyboard.press("Shift+Tab");
    assert.equal(await p.evaluate(() => document.activeElement?.textContent), "Aplicar");
    await p.keyboard.press("Escape");
    await dialogo.waitFor({ state: "detached" });
    assert.equal(await p.evaluate(() => document.activeElement?.id), "abrir");
    assert.equal(await p.locator("#root").evaluate(e => e.inert), false);
    assert.equal(await p.locator("#ya-inerte").evaluate(e => e.inert), true, "se conserva un inert ajeno preexistente");
  });
}

test("autofocus interno se respeta, un rerender no roba el foco y los hermanos nuevos quedan inertes", async (t) => {
  const p = await abrir(t, 390, 844, "?modal=1&autofocus=1");
  await p.locator("#abrir").click();
  assert.equal(await p.evaluate(() => document.activeElement?.getAttribute("aria-label")), "Campo");
  await p.getByRole("button", { name: "Actualizar 0" }).click();
  assert.equal(await p.evaluate(() => document.activeElement?.textContent), "Actualizar 1");
  await p.evaluate(() => { const b = document.createElement('button'); b.id = 'tardio'; b.textContent = 'Fondo tardío'; document.body.append(b); });
  await p.waitForFunction(() => document.getElementById('tardio').inert);
  await p.keyboard.press("Escape");
  await p.getByRole("dialog").waitFor({ state: "detached" });
  assert.equal(await p.evaluate(() => document.activeElement?.id), "abrir");
  assert.equal(await p.locator("#tardio").evaluate(e => e.inert), false);
});

test("con dos hojas Escape cierra solo la superior y restaura foco y fondo en orden", async (t) => {
  const p = await abrir(t, 390, 844, "?modal=1");
  await p.locator("#abrir").click();
  await p.getByRole("button", { name: "Abrir otra" }).click();
  const segunda = p.getByRole("dialog", { name: "Segunda" });
  await segunda.waitFor();
  assert.equal(await p.locator('[aria-label="Principal"]').evaluate(e => e.parentElement.inert), true);
  await p.keyboard.press("Escape");
  await segunda.waitFor({ state: "detached" });
  assert.equal(await p.getByRole("dialog", { name: "Principal" }).count(), 1);
  assert.equal(await p.evaluate(() => document.activeElement?.textContent), "Abrir otra");
  assert.equal(await p.locator("#root").evaluate(e => e.inert), true);
  await p.keyboard.press("Escape");
  await p.getByRole("dialog").waitFor({ state: "detached" });
  assert.equal(await p.evaluate(() => document.activeElement?.id), "abrir");
  assert.equal(await p.locator("#root").evaluate(e => e.inert), false);
});
