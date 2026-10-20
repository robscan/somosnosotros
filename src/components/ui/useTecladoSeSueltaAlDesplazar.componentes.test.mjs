/** OL-421 (bitácora 454): con el teclado abierto, desplazar la lista esconde el teclado (`ui/useTecladoSeSueltaAlDesplazar`), lo que la persona
 *  desplaza no lo corrige `ui/useCampoVisible` y un buscador con lista debajo sube bajo la barra (`data-arriba-con-teclado`). Se monta una
 *  pantalla como un buscador de Administración (la barra pegada arriba, un título, el campo y una lista larga) con los dos ganchos, y se simula
 *  el teclado del iPhone con un `window.visualViewport` propio (como `PorPasos.componentes.test.mjs`: 844 − 336 = 508 de área visible). Los
 *  toques son toques de verdad de Chromium (`Input.dispatchTouchEvent`), no `element.click()`. Lo que no cubre (Safari desplazando el área visible
 *  por su cuenta) lo cubre el simulador de iPhone (bitácora 454).
 * PLAYWRIGHT_MODULE=/ruta/playwright-core/index.mjs node --test este-archivo   (o `npm run test:componentes`) */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const VENTANA = 844;
const TECLADO = 336;
let dir, server, browser, origin;

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "teclado-se-suelta-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import useCampoVisible from './src/components/ui/useCampoVisible';
      import useTecladoSeSueltaAlDesplazar from './src/components/ui/useTecladoSeSueltaAlDesplazar';
      import ListaFlotante from './src/components/ui/ListaFlotante';
      import './src/app/globals.css';
      const q = new URLSearchParams(location.search);
      // ?sinGancho=1: solo useCampoVisible (lo que la persona desplaza ya no se corrige); ?zona=1: el gancho solo para la lista (como ui/Hoja);
      // ?arriba=1: el campo lleva data-arriba-con-teclado; ?lista=1: una lista flotante abierta bajo el campo (como el nombre del alta de lugar);
      // ?reserva=1: la lista guarda 250 px abajo (el pie con la tira del alta), así que con el campo aún abajo se abre hacia arriba.
      function Gancho({ zona }) {
        useTecladoSeSueltaAlDesplazar(q.has('zona') ? zona : undefined);
        return null;
      }
      function Pantalla() {
        useCampoVisible();
        const zona = React.useRef(null);
        const ancla = React.useRef(null);
        return (
          <main style={{ paddingBottom: 'calc(24px + var(--teclado, 0px))' }}>
            {!q.has('sinGancho') && <Gancho zona={zona} />}
            <header style={{ position: 'sticky', top: 0, zIndex: 2, height: 60, background: '#fff' }}>Barra</header>
            <h1 style={{ height: 80, margin: 0 }}>Personas</h1>
            <label ref={ancla} data-arriba-con-teclado={q.has('arriba') ? '' : undefined} style={{ display: 'block', height: 48, marginTop: 8 }}>
              <input type="search" aria-label="Buscar" style={{ width: '80%', height: 40 }} />
            </label>
            <ul ref={zona} aria-label="Resultados" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {Array.from({ length: 20 }, (_, i) => <li key={i} style={{ height: 60 }}><a href={'#r' + i}>Resultado {i + 1}</a></li>)}
            </ul>
            <p style={{ height: 120, margin: 0 }}>Fuera de la lista</p>
            {q.has('lista') && (
              <ListaFlotante abierta onCerrar={() => {}} ancla={ancla} id="candidatos" etiqueta="Candidatos" reservaAbajo={q.has('reserva') ? 250 : 0}>
                {['Casa de Cultura', 'Casa del Poeta', 'Casa Prieto'].map((n) => <li key={n} style={{ height: 60 }}><button type="button" role="option" aria-selected={false}>{n}</button></li>)}
              </ListaFlotante>
            )}
          </main>
        );
      }
      createRoot(document.getElementById('root')).render(<Pantalla />);
    `,
    },
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

/** Una página táctil de 390×844 con un `visualViewport` propio que la prueba encoge con `teclado(px)`, y toques de verdad por CDP. */
async function pagina(t, consulta = "") {
  const context = await browser.newContext({ viewport: { width: 390, height: VENTANA }, hasTouch: true, reducedMotion: "reduce" });
  t.after(() => context.close());
  await context.addInitScript(() => {
    const vv = new EventTarget();
    Object.defineProperties(vv, {
      height: { value: window.innerHeight, writable: true },
      width: { value: 390 },
      offsetTop: { value: 0, configurable: true },
      offsetLeft: { value: 0 },
      scale: { value: 1 },
      pageTop: { get: () => window.scrollY },
      pageLeft: { value: 0 },
    });
    Object.defineProperty(window, "visualViewport", { configurable: true, value: vv });
    window.teclado = (px) => {
      vv.height = document.documentElement.clientHeight - px;
      vv.dispatchEvent(new Event("resize"));
    };
  });
  const p = await context.newPage();
  p.setDefaultTimeout(5000);
  const errores = [];
  p.on("pageerror", (e) => errores.push(e.message));
  t.after(() => assert.deepEqual(errores, []));
  await p.goto(origin + "/" + consulta);
  await p.getByRole("searchbox", { name: "Buscar" }).waitFor();
  const cdp = await context.newCDPSession(p);
  /** Un dedo: baja en `desde`, pasa por los puntos de `camino` y, si `levantar`, sube. */
  p.dedo = async (desde, camino = [], levantar = true) => {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: desde[0], y: desde[1] }] });
    for (const [x, y] of camino) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] });
    if (levantar) await p.levantar();
  };
  p.levantar = () => cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  // Sin el clic que sigue a un toque (que, sobre un enlace, también quitaría el foco al campo: eso es abrir el resultado, no este gancho).
  p.cancelar = () => cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
  return p;
}
const cuadros = (p, n = 6) => p.evaluate((k) => new Promise((ok) => { const uno = (i) => (i ? requestAnimationFrame(() => uno(i - 1)) : ok()); uno(k); }), n);
/** Enfoca el campo y abre el teclado como el iPhone (el área visible se encoge después del foco). */
async function abrirTeclado(p) {
  await p.getByRole("searchbox", { name: "Buscar" }).focus();
  await p.evaluate((px) => window.teclado(px), TECLADO);
  await cuadros(p);
}
const estado = (p) =>
  p.evaluate(() => ({
    enfocado: document.activeElement?.getAttribute("aria-label") ?? null,
    teclado: document.documentElement.hasAttribute("data-teclado"),
    y: window.scrollY,
    campo: document.querySelector("label").getBoundingClientRect().top,
    barra: document.querySelector("header").getBoundingClientRect().bottom,
    titulo: document.querySelector("h1").getBoundingClientRect().bottom,
    primero: document.querySelector("li").getBoundingClientRect().top,
  }));

test("con el teclado abierto, arrastrar la lista le quita el foco al campo y el teclado se va", async (t) => {
  const p = await pagina(t);
  await abrirTeclado(p);
  assert.deepEqual([(await estado(p)).enfocado, (await estado(p)).teclado], ["Buscar", true]);
  await p.dedo([200, 450], [[200, 445], [200, 430], [200, 380], [200, 300]]);
  await p.waitForFunction(() => !document.documentElement.hasAttribute("data-teclado"));
  assert.equal((await estado(p)).enfocado, null, "el campo soltó el foco");
});

test("un toque con temblor sobre un resultado (menos de 10 px) no suelta el campo: tocar abre el resultado", async (t) => {
  const p = await pagina(t);
  await abrirTeclado(p);
  await p.dedo([200, 450], [[203, 452], [205, 455]], false);
  await cuadros(p);
  const e = await estado(p);
  assert.deepEqual([e.enfocado, e.teclado], ["Buscar", true]);
  await p.cancelar();
});

test("si Safari cancela el toque al empezar a desplazar una lista (touchcancel sin movimientos), también es un arrastre: el campo se suelta", async (t) => {
  const p = await pagina(t);
  await abrirTeclado(p);
  await p.dedo([200, 450], [], false);
  await p.cancelar();
  await p.waitForFunction(() => !document.documentElement.hasAttribute("data-teclado"));
  assert.equal((await estado(p)).enfocado, null);
});

test("mover el cursor dentro del campo (mantener y arrastrar sobre él) no lo suelta", async (t) => {
  const p = await pagina(t);
  await abrirTeclado(p);
  const { campo } = await estado(p);
  const y = campo + 24;
  await p.dedo([60, y], [[90, y], [140, y], [220, y + 4]], false);
  await cuadros(p);
  // Safari cancela el toque cuando sale la lupa o la selección: sobre el campo, eso no lo suelta.
  await p.cancelar();
  await cuadros(p);
  const e = await estado(p);
  assert.deepEqual([e.enfocado, e.teclado], ["Buscar", true]);
});

test("con el dedo puesto en el campo, si la página se desplaza más de 24 px, el campo se suelta", async (t) => {
  const p = await pagina(t);
  await abrirTeclado(p);
  const { campo } = await estado(p);
  await p.dedo([60, campo + 24], [], false);
  await p.evaluate(() => window.scrollBy(0, 12));
  await cuadros(p, 2);
  assert.equal((await estado(p)).enfocado, "Buscar", "12 px no bastan");
  await p.evaluate(() => window.scrollBy(0, 30));
  await cuadros(p, 2);
  assert.equal((await estado(p)).enfocado, null, "42 px con el dedo puesto: lo desplazó la persona");
  await p.levantar();
});

test("sin teclado no hace nada: con el campo enfocado (un autoFocus que iOS no abrió) arrastrar la lista no le quita el foco", async (t) => {
  const p = await pagina(t);
  await p.getByRole("searchbox", { name: "Buscar" }).focus();
  await cuadros(p);
  assert.equal((await estado(p)).teclado, false);
  await p.dedo([200, 450], [[200, 430], [200, 380], [200, 300]]);
  await cuadros(p);
  assert.equal((await estado(p)).enfocado, "Buscar");
});

test("con `zona` (como ui/Hoja), solo cuentan los arrastres que empiezan dentro de ella", async (t) => {
  const p = await pagina(t, "?zona=1");
  await abrirTeclado(p);
  await p.dedo([200, 110], [[200, 90], [200, 60]]);
  await cuadros(p);
  assert.equal((await estado(p)).enfocado, "Buscar", "el título no es de la zona");
  await p.dedo([200, 450], [[200, 430], [200, 380]]);
  await p.waitForFunction(() => !document.documentElement.hasAttribute("data-teclado"));
  assert.equal((await estado(p)).enfocado, null);
});

test("lo que la persona desplaza con el dedo ya no lo corrige useCampoVisible; un cambio del área visible sin dedo sí vuelve a traer el campo", async (t) => {
  const p = await pagina(t, "?sinGancho=1");
  await abrirTeclado(p);
  // Con el dedo puesto, la página baja hasta que el campo sale por arriba y Safari avisa del área visible (su `scroll`).
  await p.dedo([200, 450], [], false);
  await p.evaluate(() => {
    window.scrollTo(0, 400);
    window.visualViewport.dispatchEvent(new Event("scroll"));
  });
  assert.equal((await estado(p)).y, 400, "con el dedo puesto, la página se queda donde la deja la persona");
  // Ya sin el dedo (y sin el clic de un toque), Safari sigue avisando del área visible mientras termina de desplazar: tampoco se corrige.
  await p.cancelar();
  await p.evaluate(() => window.visualViewport.dispatchEvent(new Event("scroll")));
  await cuadros(p);
  assert.equal((await estado(p)).y, 400, "la página se queda donde la dejó la persona");
  assert.equal((await estado(p)).enfocado, "Buscar", "sin el gancho de soltar, el foco sigue");
  // Control: el mismo desplazamiento sin dedo (Safari moviendo la vista por su cuenta) sí se corrige: el campo vuelve a la vista.
  const q = await pagina(t, "?sinGancho=1");
  await abrirTeclado(q);
  await q.evaluate(() => {
    window.scrollTo(0, 400);
    window.visualViewport.dispatchEvent(new Event("scroll"));
  });
  await cuadros(q);
  const e = await estado(q);
  assert.ok(e.y < 400 && e.campo >= e.barra && e.campo + 48 <= VENTANA - TECLADO, `el campo volvió a la vista (página en ${e.y}, campo en ${e.campo})`);
});

test("con `data-arriba-con-teclado`, al abrir el teclado el campo sube bajo la barra y la lista empieza justo debajo, a la vista", async (t) => {
  const p = await pagina(t, "?arriba=1");
  await abrirTeclado(p);
  const e = await estado(p);
  // Con el aire que tenía sobre el título (8 px, menos que los 12 de siempre): el título sale entero, sin dejar una tira cortada bajo la barra.
  assert.ok(Math.abs(e.campo - (e.barra + 8)) <= 1, `el campo arriba, bajo la barra y su aire (campo en ${e.campo}, barra en ${e.barra})`);
  assert.ok(e.titulo <= e.barra + 0.5, `el título queda entero bajo la barra (termina en ${e.titulo})`);
  assert.ok(e.primero + 60 <= VENTANA - TECLADO, `el primer resultado entero sobre el teclado (termina en ${e.primero + 60})`);
  // Control: sin la marca el campo, que ya se veía, no se mueve.
  const q = await pagina(t);
  await abrirTeclado(q);
  assert.equal((await estado(q)).y, 0);
});

test("la lista flotante bajo el campo se abre hacia abajo aunque Safari de iOS 27 dé un `offsetTop` y un `innerHeight` que no son los de las cajas", async (t) => {
  const p = await pagina(t, "?arriba=1&lista=1");
  await abrirTeclado(p);
  // Como el simulador en el alta de lugar (bitácora 454): el área visible empieza donde empiezan las cajas (`pageTop − scrollY` = 0), pero
  // `offsetTop` dice otra cosa e `innerHeight` mide lo que queda de página. Con esas dos medidas la lista se abría hacia arriba, sobre el campo.
  await p.evaluate(() => {
    Object.defineProperty(window.visualViewport, "offsetTop", { configurable: true, value: 132 });
    Object.defineProperty(window, "innerHeight", { configurable: true, get: () => 500 });
    window.visualViewport.dispatchEvent(new Event("resize"));
  });
  await cuadros(p);
  const c = await p.evaluate(() => {
    const lista = document.querySelector('[role="listbox"]').getBoundingClientRect();
    const campo = document.querySelector("label").getBoundingClientRect();
    return { lista: { top: lista.top, bottom: lista.bottom }, campo: { top: campo.top, bottom: campo.bottom } };
  });
  assert.ok(c.lista.top >= c.campo.bottom, `la lista empieza bajo el campo (lista en ${c.lista.top}, campo hasta ${c.campo.bottom})`);
  assert.ok(c.lista.bottom <= VENTANA - TECLADO, `la lista termina sobre el teclado (${c.lista.bottom})`);
  assert.ok(c.lista.bottom - c.lista.top >= 180, `caben los tres candidatos (${c.lista.bottom - c.lista.top} px)`);
});

test("con la lista ya abierta hacia arriba al volver a enfocar (el texto ya estaba escrito), el campo sube igual y la lista pasa abajo", async (t) => {
  const p = await pagina(t, "?arriba=1&lista=1&reserva=1");
  await abrirTeclado(p);
  const c = await p.evaluate(() => {
    const lista = document.querySelector('[role="listbox"]').getBoundingClientRect();
    const campo = document.querySelector("label").getBoundingClientRect();
    const barra = document.querySelector("header").getBoundingClientRect();
    return { lista: lista.top, campo: { top: campo.top, bottom: campo.bottom }, barra: barra.bottom };
  });
  assert.ok(Math.abs(c.campo.top - (c.barra + 8)) <= 1, `el campo subió bajo la barra (campo en ${c.campo.top}, barra en ${c.barra})`);
  assert.ok(c.lista >= c.campo.bottom, `la lista quedó bajo el campo (lista en ${c.lista}, campo hasta ${c.campo.bottom})`);
});
