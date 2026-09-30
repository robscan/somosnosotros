/** Prueba de componente de `usePulsacionLarga` (ajuste 9 del founder, 2026-09-30: sostener el dedo en el mapa de Lugares para registrar un lugar): con un mapa
 *  de mentira (un lienzo de verdad, y `on`/`off` para lo que el mapa avisa) en Chrome real con toques, ratón y eventos de puntero de verdad. Cubre que el dedo
 *  quieto 500 ms avise UNA vez (con el anillo a los 150 ms, que un toque corto nunca ve) y que no avise si se mueve, si baja un segundo dedo, si el mapa empieza a
 *  moverse, si el navegador cancela el toque o si es el segundo toque de un doble toque; que el clic al soltar se trague tras una pulsación larga y solo entonces;
 *  que el botón derecho del ratón avise al momento y el menú que Android manda al sostener no la repita; que el botón izquierdo sostenido valga; que lo que empieza fuera
 *  del lienzo (un botón, la tarjeta) no cuente; y que al desmontar no quede nada escuchando. Las reglas finas de la máquina están en `lib/pulsacionLarga.test.ts`.
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

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "pulsacionlarga-componentes-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React, {useRef, useState} from 'react';import {createRoot} from 'react-dom/client';
      import {usePulsacionLarga} from './src/components/usePulsacionLarga';
      // Un mapa de 390×400 con un lienzo de verdad y un botón encima (como la tarjeta): \`on\`/\`off\` guardan lo que el mapa avisa (dragstart y compañía).
      const avisos = {};
      const mapa = {
        canvas: null,
        getCanvas() { return this.canvas; },
        on(n, f) { (avisos[n] ??= []).push(f); },
        off(n, f) { avisos[n] = (avisos[n] ?? []).filter((g) => g !== f); },
      };
      // Cuándo bajó el primer dedo (\`t0\`), para medir el anillo y el aviso desde ahí y no desde que el protocolo de pruebas lo manda; y los oyentes de puntero que hay en la ventana.
      const activos = new Map();
      const agregar = window.addEventListener.bind(window);
      const quitar = window.removeEventListener.bind(window);
      window.addEventListener = (t, f, o) => { if (t.startsWith('pointer')) (activos.get(t) ?? activos.set(t, new Set()).get(t)).add(f); return agregar(t, f, o); };
      window.removeEventListener = (t, f, o) => { activos.get(t)?.delete(f); return quitar(t, f, o); };
      window.qa = { eventos: [], clics: 0, menus: 0, t0: null, mapa, avisos, avisar: (n) => (avisos[n] ?? []).forEach((f) => f()), oyentes: () => Object.values(avisos).reduce((t, l) => t + l.length, 0), oyentesDeVentana: () => [...activos.values()].reduce((n, l) => n + l.size, 0) };
      agregar('pointerdown', () => { window.qa.t0 ??= performance.now(); }, true);
      function App() {
        const [montado, setMontado] = useState(true);
        window.qa.desmontar = () => setMontado(false);
        return montado ? <Mapa /> : <p id="fin">desmontado</p>;
      }
      function Mapa() {
        const contenedor = useRef(null);
        const mapaRef = useRef(mapa);
        const [listo, setListo] = useState(false);
        usePulsacionLarga(contenedor, mapaRef, {
          listo,
          alAnillo: (p) => window.qa.eventos.push(['anillo', Math.round(p.x), Math.round(p.y), performance.now()]),
          alQuitarAnillo: () => window.qa.eventos.push(['sin-anillo']),
          alLarga: (p) => window.qa.eventos.push(['larga', Math.round(p.x), Math.round(p.y), performance.now()]),
        });
        return (
          <div id="mapa" ref={(el) => { contenedor.current = el; if (el && !mapa.canvas) { mapa.canvas = el.querySelector('canvas'); setListo(true); } }} onClick={() => window.qa.clics++} onContextMenu={() => window.qa.menus++} style={{ position: 'relative', width: 390, height: 400, touchAction: 'none' }}>
            <canvas width="390" height="400" style={{ position: 'absolute', inset: 0 }} />
            <button id="tarjeta" style={{ position: 'absolute', left: 250, top: 300, width: 120, height: 60 }}>Registrar</button>
          </div>
        );
      }
      createRoot(document.getElementById('root')).render(<App />);
    `,
    },
  });
  const assets = new Map([
    ["/", ["text/html", '<meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><div id="root"></div><script src="/app.js"></script>']],
    ["/app.js", ["text/javascript", await readFile(join(dir, "app.js"))]],
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

const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));

/** Una página con toques de verdad (CDP): `toque(tipo, [[x, y], …])` manda el estado de todos los dedos puestos. */
async function abrir() {
  const context = await browser.newContext({ viewport: { width: 390, height: 500 }, hasTouch: true });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await page.goto(origin);
  await page.waitForFunction(() => window.qa.mapa.canvas !== null);
  await page.waitForFunction(() => window.qa.oyentes() === 4); // dragstart, zoomstart, rotatestart y pitchstart
  const toque = (tipo, puntos) => cdp.send("Input.dispatchTouchEvent", { type: tipo, touchPoints: puntos.map(([x, y], id) => ({ x, y, id })) });
  const eventos = () => page.evaluate(() => window.qa.eventos.filter((e) => e[0] !== "sin-anillo").map((e) => e.slice(0, 3)));
  /** Cuánto tardó cada aviso desde que bajó el dedo, en ms. */
  const tardanzas = () => page.evaluate(() => Object.fromEntries(window.qa.eventos.filter((e) => e[3]).map((e) => [e[0], Math.round(e[3] - window.qa.t0)])));
  const clics = () => page.evaluate(() => window.qa.clics);
  return { context, page, toque, eventos, clics, tardanzas };
}

test("un dedo quieto 500 ms avisa una sola vez; el anillo empieza a los 150 ms y un toque corto nunca lo ve", async () => {
  const { context, page, toque, eventos, clics, tardanzas } = await abrir();
  await toque("touchStart", [[120, 140]]);
  await espera(900);
  assert.deepEqual(await eventos(), [["anillo", 120, 140], ["larga", 120, 140]], "el anillo en el punto y, después, el aviso");
  const { anillo, larga } = await tardanzas();
  assert.ok(anillo >= 145 && anillo < 250, `el anillo a los ${anillo} ms de bajar el dedo (150)`);
  assert.ok(larga >= 495 && larga < 620, `el aviso a los ${larga} ms (500)`);
  assert.equal(await page.evaluate(() => window.qa.eventos.at(-2)[0]), "sin-anillo", "y el anillo se va antes de avisar");
  await toque("touchEnd", []);
  await espera(200);
  assert.equal((await eventos()).filter((e) => e[0] === "larga").length, 1, "sostener más o soltar no repite");
  assert.equal(await clics(), 0, "el clic de soltar se traga: no selecciona ni cierra nada");
  // Y un toque corto después sí hace clic y no enseña nada.
  await espera(400);
  await toque("touchStart", [[120, 140]]);
  await espera(60);
  await toque("touchEnd", []);
  await espera(600);
  assert.equal(await clics(), 1);
  assert.equal((await eventos()).length, 2, "el toque corto no agregó nada (ni anillo): siguen el anillo y el aviso de antes");
  await context.close();
});

test("moverse, un segundo dedo, el mapa que se mueve o el navegador que cancela: no avisa", async () => {
  const { context, page, toque, eventos } = await abrir();
  // Moverse 12 px.
  await toque("touchStart", [[120, 140]]);
  await espera(50);
  await toque("touchMove", [[120, 152]]);
  await espera(650);
  await toque("touchEnd", []);
  await espera(400);
  // Un segundo dedo a los 300 ms.
  await toque("touchStart", [[120, 140]]);
  await espera(300);
  await toque("touchStart", [[120, 140], [250, 140]]);
  await espera(400);
  await toque("touchEnd", [[250, 140]]);
  await espera(200);
  await toque("touchEnd", []);
  await espera(400);
  // El mapa empieza a moverse (dragstart).
  await toque("touchStart", [[120, 140]]);
  await espera(100);
  await page.evaluate(() => window.qa.avisar("dragstart"));
  await espera(600);
  await toque("touchEnd", []);
  await espera(400);
  // El navegador cancela el toque.
  await toque("touchStart", [[120, 140]]);
  await espera(100);
  await toque("touchCancel", []);
  await espera(600);
  assert.deepEqual((await eventos()).filter((e) => e[0] === "larga"), []);
  await context.close();
});

test("el segundo toque de un doble toque no avisa, aunque se sostenga", async () => {
  const { context, toque, eventos } = await abrir();
  await toque("touchStart", [[120, 140]]);
  await espera(40);
  await toque("touchEnd", []);
  await espera(120);
  await toque("touchStart", [[120, 140]]);
  await espera(700);
  assert.deepEqual((await eventos()).filter((e) => e[0] === "larga"), []);
  await toque("touchEnd", []);
  await context.close();
});

test("el botón derecho del ratón avisa al momento, una vez, sin menú del sistema; el que Android manda al sostener no la repite", async () => {
  const { context, page, toque, eventos } = await abrir();
  await page.evaluate(() => {
    window.__prevenidos = [];
    document.addEventListener("contextmenu", (e) => window.__prevenidos.push(e.defaultPrevented));
  });
  await page.mouse.click(200, 100, { button: "right" });
  await espera(100);
  assert.deepEqual(await eventos(), [["larga", 200, 100]]);
  assert.deepEqual(await page.evaluate(() => window.__prevenidos), [true], "el menú del sistema no sale");
  // Sostener con el dedo y, pegado al aviso, el contextmenu que algunos teléfonos mandan: una sola.
  await espera(1100);
  await toque("touchStart", [[120, 140]]);
  await espera(560);
  await page.evaluate(() => document.querySelector("canvas").dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 120, clientY: 140 })));
  await espera(200);
  await toque("touchEnd", []);
  assert.equal((await eventos()).filter((e) => e[0] === "larga").length, 2, "la del ratón y una del dedo, no tres");
  await context.close();
});

test("el botón izquierdo sostenido sin moverse vale, y su clic al soltar se traga", async () => {
  const { context, page, eventos, clics } = await abrir();
  await page.mouse.move(150, 200);
  await page.mouse.down();
  await espera(560);
  await page.mouse.up();
  await espera(200);
  assert.deepEqual((await eventos()).filter((e) => e[0] === "larga"), [["larga", 150, 200]]);
  assert.equal(await clics(), 0);
  // Un clic normal sí llega.
  await page.mouse.click(150, 200);
  assert.equal(await clics(), 1);
  await context.close();
});

test("lo que empieza fuera del lienzo (un botón, la tarjeta) no cuenta", async () => {
  const { context, toque, eventos } = await abrir();
  await toque("touchStart", [[300, 330]]); // sobre el botón
  await espera(700);
  await toque("touchEnd", []);
  assert.deepEqual(await eventos(), []);
  await context.close();
});

test("al desmontar no queda nada escuchando", async () => {
  const { context, page, toque, eventos } = await abrir();
  const antes = await page.evaluate(() => window.qa.oyentesDeVentana());
  await page.evaluate(() => window.qa.desmontar());
  await page.waitForSelector("#fin");
  assert.equal(await page.evaluate(() => window.qa.oyentes()), 0, "el mapa no conserva oyentes del hook");
  assert.equal(antes - (await page.evaluate(() => window.qa.oyentesDeVentana())), 3, "la ventana suelta los tres del hook: mover, soltar y cancelar");
  await toque("touchStart", [[120, 140]]);
  await espera(700);
  await toque("touchEnd", []);
  assert.deepEqual(await eventos(), []);
  await context.close();
});
