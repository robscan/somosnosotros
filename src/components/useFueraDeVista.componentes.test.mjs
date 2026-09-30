/** Prueba de componente de `useFueraDeVista` (docs/rediseno/50, ajuste del founder del 2026-09-30: el control «Encuadrar los lugares» aparece cuando los
 *  resultados en el mapa quedan fuera de lo que se ve): con un mapa de mentira que proyecta los puntos a la pantalla y avisa `moveend`, en Chrome real. Cubre: no avisa mientras se ve alguno; al arrastrar el mapa lejos avisa «fuera» una sola vez y solo al terminar de moverse,
 *  nunca por cuadro (durante el movimiento no proyecta nada); al volver a encuadrar avisa «a la vista»; lo que la hoja tapa no se ve; un cambio de
 *  puntos o de la hoja se revisa tras una espera y, si el mapa se mueve para entonces, espera al `moveend`; y sin puntos nunca avisa, con un solo oyente del mapa.
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
  dir = await mkdtemp(join(tmpdir(), "fueradevista-componentes-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React, {useRef, useState} from 'react';import {createRoot} from 'react-dom/client';
      import {useFueraDeVista} from './src/components/useFueraDeVista';
      // Un mapa de 390×500 con la hoja tapando 200 px por abajo (lo que se ve es de 0,0 a 390,300). Los puntos son {lat: y, lng: x} en la pantalla, más lo que se haya arrastrado.
      const oyentes = { moveend: [] };
      const mapa = {
        arrastre: { x: 0, y: 0 }, proyecciones: 0, moviendo: false,
        project([lng, lat]) { this.proyecciones++; return { x: lng + this.arrastre.x, y: lat + this.arrastre.y }; },
        getContainer() { return { clientWidth: 390, clientHeight: 500 }; },
        isMoving() { return this.moviendo; },
        on(e, f) { oyentes[e].push(f); },
        off(e, f) { oyentes[e] = oyentes[e].filter((g) => g !== f); },
      };
      window.qa = { mapa, llamadas: [], avisar: (e) => oyentes[e].forEach((f) => f()), oyentes: () => ({ moveend: oyentes.moveend.length }) };
      const PUNTOS = [{ lat: 100, lng: 100 }, { lat: 150, lng: 300 }];
      function App() {
        const ref = useRef(mapa);
        const [tapa, setTapa] = useState(200);
        const [puntos, setPuntos] = useState(PUNTOS);
        const [fuera, setFuera] = useState(false);
        window.qa.setTapa = setTapa;
        window.qa.setPuntos = setPuntos;
        useFueraDeVista(ref, true, puntos, tapa, (f) => { window.qa.llamadas.push(f); setFuera(f); });
        return <p id="estado">{fuera ? 'fuera' : 'a la vista'}</p>;
      }
      createRoot(document.getElementById('root')).render(<App />);
    `,
    },
  });
  const assets = new Map([
    ["/", ["text/html", '<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script src="/app.js"></script>']],
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

async function abrir() {
  const context = await browser.newContext({ viewport: { width: 390, height: 500 } });
  const page = await context.newPage();
  await page.goto(origin);
  await page.waitForSelector("#estado");
  return { context, page };
}
/** El mapa «se mueve» a un nuevo arrastre: empieza, pasan cuadros (que el hook no oye) y termina con su `moveend`. */
const mover = (page, x, y) =>
  page.evaluate(([x, y]) => {
    const { mapa, avisar } = window.qa;
    mapa.moviendo = true;
    mapa.arrastre = { x, y };
    mapa.moviendo = false;
    avisar("moveend");
  }, [x, y]);
const estado = (page) => page.locator("#estado").innerText();
const llamadas = (page) => page.evaluate(() => window.qa.llamadas);

test("no avisa mientras se ve alguno; al arrastrar el mapa lejos avisa «fuera» una vez y solo al terminar de moverse; al volver a encuadrar, «a la vista»", async () => {
  const { context, page } = await abrir();
  await page.waitForTimeout(600); // pasa la espera de la primera revisión
  assert.deepEqual(await llamadas(page), [], "con los lugares a la vista no hay nada que avisar");
  // El mapa empieza a moverse: nada se proyecta ni se avisa por cuadro; solo al terminar.
  const proyecciones = await page.evaluate(() => {
    const { mapa } = window.qa;
    const antes = mapa.proyecciones;
    mapa.moviendo = true;
    for (let i = 1; i <= 30; i++) {
      mapa.arrastre = { x: i * 40, y: i * 40 }; // 30 cuadros de arrastre, sin ningún `moveend`
    }
    return { durante: mapa.proyecciones - antes, avisos: window.qa.llamadas.length };
  });
  assert.deepEqual(proyecciones, { durante: 0, avisos: 0 }, "mientras se mueve no se mide ni se avisa");
  const antes = await page.evaluate(() => window.qa.mapa.proyecciones);
  await page.evaluate(() => {
    window.qa.mapa.moviendo = false;
    window.qa.avisar("moveend");
  });
  assert.equal((await page.evaluate(() => window.qa.mapa.proyecciones)) - antes, 2, "al terminar proyecta cada punto una sola vez");
  assert.deepEqual(await llamadas(page), [true]);
  assert.equal(await estado(page), "fuera");
  // Otro arrastre que los sigue dejando fuera: no se vuelve a avisar.
  await mover(page, 900, 900);
  assert.deepEqual(await llamadas(page), [true], "solo avisa cuando cambia la respuesta");
  // Encuadrar: el mapa vuelve con los lugares a la vista.
  await mover(page, 0, 0);
  assert.deepEqual(await llamadas(page), [true, false]);
  assert.equal(await estado(page), "a la vista");
  await context.close();
});

test("lo que la hoja tapa no se ve; al cambiar la hoja o los puntos se revisa tras una espera, y si el mapa se mueve en ella, espera a que termine", async () => {
  const { context, page } = await abrir();
  await page.waitForTimeout(600);
  // La hoja sube y tapa los dos lugares (y=100 y y=150): pasada la espera, avisa.
  await page.evaluate(() => window.qa.setTapa(450));
  await page.waitForTimeout(150);
  assert.deepEqual(await llamadas(page), [], "no avisa en el momento: espera a que el mapa lleve un rato quieto");
  await page.waitForFunction(() => window.qa.llamadas.length === 1);
  assert.deepEqual(await llamadas(page), [true]);
  // La hoja baja: vuelven a verse.
  await page.evaluate(() => window.qa.setTapa(200));
  await page.waitForFunction(() => window.qa.llamadas.length === 2);
  assert.deepEqual(await llamadas(page), [true, false]);
  // Cambian los puntos a otros lejanos, pero el mapa empieza a moverse antes de que pase la espera: no avisa a medio camino.
  await page.evaluate(() => {
    window.qa.setPuntos([{ lat: 2000, lng: 2000 }]);
  });
  await page.waitForTimeout(150);
  await page.evaluate(() => {
    window.qa.mapa.moviendo = true;
  });
  await page.waitForTimeout(600);
  assert.deepEqual(await llamadas(page), [true, false], "mientras el mapa se mueve, ni con la espera cumplida se avisa");
  // Termina el movimiento y los puntos nuevos siguen fuera: ahora sí.
  await page.evaluate(() => {
    window.qa.mapa.moviendo = false;
    window.qa.avisar("moveend");
  });
  assert.deepEqual(await llamadas(page), [true, false, true]);
  // Y si los puntos cambian con el mapa ya en movimiento (ya se estaba moviendo), la espera tampoco avisa a medio camino.
  await page.evaluate(() => {
    window.qa.mapa.moviendo = true;
    window.qa.setPuntos([{ lat: 100, lng: 100 }]); // a la vista una vez que el mapa vuelva al 0,0
    window.qa.mapa.arrastre = { x: 0, y: 0 };
  });
  await page.waitForTimeout(600);
  assert.deepEqual(await llamadas(page), [true, false, true], "con el mapa en movimiento no se revisa, cumplida o no la espera");
  await page.evaluate(() => {
    window.qa.mapa.moviendo = false;
    window.qa.avisar("moveend");
  });
  assert.deepEqual(await llamadas(page), [true, false, true, false]);
  await context.close();
});

test("sin puntos no hay nada que encuadrar y nunca avisa, y aunque cambien los puntos queda un solo oyente del mapa, el de `moveend`", async () => {
  const { context, page } = await abrir();
  await page.evaluate(() => window.qa.setPuntos([]));
  await page.waitForTimeout(100); // React pinta los puntos nuevos y el hook se vuelve a armar con ellos
  await mover(page, 900, 900);
  await page.waitForTimeout(600);
  assert.deepEqual(await llamadas(page), [], "sin lugares no hay nada perdido");
  assert.deepEqual(await page.evaluate(() => window.qa.oyentes()), { moveend: 1 }, "un solo oyente, el de `moveend`, aunque cambien los puntos");
  await context.close();
});
