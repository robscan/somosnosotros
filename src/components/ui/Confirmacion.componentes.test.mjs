/** OL-318 (bitácora 347): el aviso flotante de confirmación (`ui/Confirmacion`). Bundle real (esbuild) del hook y su CSS con Chrome real vía Playwright, a 390×844.
 *  No corre con `npm test`; se corre con `npm run test:componentes`.
 * PLAYWRIGHT_MODULE=/ruta/playwright-core/index.mjs node --test este-archivo */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const TOPE = { timeout: 30000 };
let browser, server, dir, origin;

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "confirmacion-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import {useConfirmacion} from './src/components/ui/Confirmacion';import './src/app/globals.css';
      const q = new URLSearchParams(location.search);
      function Pantalla() {
        const uno = useConfirmacion();
        const otro = useConfirmacion();
        return (
          <main style={{ padding: 16 }}>
            <button id="a" onClick={() => uno.avisar({ texto: 'Cartel guardado en Fotos' })}>A</button>
            <button id="b" onClick={() => uno.avisar({ texto: 'Enlace copiado' })}>B</button>
            <button id="c" onClick={() => otro.avisar({ texto: 'Otra pieza avisa' })}>C</button>
            <button id="fallo" onClick={() => uno.avisar({ texto: 'No se pudo guardar', fallo: true })}>Fallo</button>
            <button id="largo" onClick={() => uno.avisar({ texto: 'Un texto bastante más largo de lo normal para ver cómo se acomoda en una pantalla angosta' })}>Largo</button>
            {q.has('pastilla') && <div data-flotantes style={{ position: 'fixed', bottom: 24, left: 16, right: 16, height: 48, background: '#ddd' }}>pastilla</div>}
            {uno.nodo}{otro.nodo}
          </main>
        );
      }
      if (q.has('pie')) document.documentElement.style.setProperty('--alto-pie', '120px');
      createRoot(document.getElementById('root')).render(<Pantalla />);
    `,
    },
  });
  const assets = new Map([
    ["/", ["text/html", `<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--fuente-bricolage:Arial}</style><div id="root"></div><script src="/app.js"></script>`]],
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

async function pagina(t, { query = "", reducedMotion = "no-preference", vibracion = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion });
  t.after(() => context.close());
  const p = await context.newPage();
  p.setDefaultTimeout(8000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  t.after(() => assert.deepEqual(errors, []));
  await p.addInitScript((conVibracion) => {
    window.vibraciones = [];
    if (conVibracion) Object.defineProperty(navigator, "vibrate", { configurable: true, value: (ms) => (window.vibraciones.push(ms), true) });
  }, vibracion);
  await p.goto(`${origin}/${query}`);
  await p.clock.install();
  return p;
}
const avisos = (p) => p.getByRole("status");

test("aparece abajo y centrado con la palomita y su texto, anunciado como `status`, y se va solo a los 2,5 s", TOPE, async (t) => {
  const p = await pagina(t);
  assert.equal(await avisos(p).count(), 0);
  await p.click("#a");
  const aviso = avisos(p);
  await aviso.waitFor();
  assert.equal(await aviso.innerText(), "Cartel guardado en Fotos");
  assert.equal(await aviso.getAttribute("aria-live"), "polite");
  assert.equal(await aviso.getAttribute("data-fallo"), null);
  assert.equal(await aviso.locator("svg").count(), 1, "lleva la palomita");
  // Va en `body` (una pantalla con `transform` no rompe su `position: fixed`), centrado y sobre el borde de abajo.
  assert.equal(await aviso.evaluate((e) => e.parentElement === document.body), true);
  const caja = await aviso.boundingBox();
  assert.ok(Math.abs(caja.x + caja.width / 2 - 195) < 1, `centrado (${caja.x}, ${caja.width})`);
  assert.ok(caja.y + caja.height < 844 && caja.y > 700, `abajo (${caja.y})`);
  await p.clock.fastForward(1500);
  assert.equal(await avisos(p).count(), 1, "a los 1,5 s todavía está");
  await p.clock.fastForward(1200);
  assert.equal(await avisos(p).count(), 0, "a los 2,7 s ya se fue");
});

test("antes de irse se desliza (`data-saliendo`, lo último de los 2,5 s) y no capta toques: lo de abajo sigue respondiendo", TOPE, async (t) => {
  const p = await pagina(t);
  // Una marca puesta desde la página: el reloj de la prueba corre con la carga de la máquina y mirar justo en esos 220 ms sería frágil.
  await p.evaluate(() => {
    window.salio = false;
    new MutationObserver((cambios) => cambios.forEach((c) => c.target.getAttribute?.("data-saliendo") && (window.salio = true))).observe(document.body, { attributes: true, attributeFilter: ["data-saliendo"], subtree: true });
  });
  await p.click("#a");
  await avisos(p).waitFor();
  assert.equal(await avisos(p).getAttribute("data-saliendo"), null, "al llegar no está saliendo");
  assert.equal(await avisos(p).evaluate((e) => getComputedStyle(e).pointerEvents), "none");
  await p.clock.fastForward(2290); // justo en la salida: ahí React la pinta antes de que llegue el fin
  await p.waitForFunction(() => window.salio);
  await p.clock.fastForward(300);
  assert.equal(await avisos(p).count(), 0, "y se quita al terminar");
});

test("uno a la vez: un aviso nuevo reemplaza al anterior, también el de otra pieza, y el tiempo corre de nuevo", TOPE, async (t) => {
  const p = await pagina(t);
  await p.click("#a");
  await p.clock.fastForward(1000);
  await p.click("#b");
  assert.equal(await avisos(p).count(), 1);
  assert.equal(await avisos(p).innerText(), "Enlace copiado");
  await p.click("#c");
  assert.equal(await avisos(p).count(), 1, "otro hook: sigue siendo uno solo");
  assert.equal(await avisos(p).innerText(), "Otra pieza avisa");
  // Al segundo y medio del último vuelve a faltarle tiempo: el del primero ya no lo quita antes.
  await p.clock.fastForward(1500);
  assert.equal(await avisos(p).count(), 1);
  await p.clock.fastForward(1200);
  assert.equal(await avisos(p).count(), 0);
});

test("si no se pudo: el mismo aviso con la ✕ roja, sin palomita", TOPE, async (t) => {
  const p = await pagina(t, { vibracion: true });
  await p.click("#fallo");
  const aviso = avisos(p);
  await aviso.waitFor();
  assert.equal(await aviso.innerText(), "No se pudo guardar");
  assert.equal(await aviso.getAttribute("data-fallo"), "true");
  assert.equal(await aviso.locator("svg path").evaluateAll((ps) => ps.map((x) => x.getAttribute("d")).join("|")), "M6 6l12 12M18 6L6 18");
  const sello = await aviso.locator("span").first().evaluate((e) => getComputedStyle(e).backgroundColor);
  assert.equal(sello, "rgb(179, 38, 30)", "el sello va en el rojo de errores (--error)");
  assert.deepEqual(await p.evaluate(() => window.vibraciones), [], "un fallo no vibra");
});

test("vibra corto al confirmar donde el navegador puede; sin `navigator.vibrate` no pasa nada", TOPE, async (t) => {
  const con = await pagina(t, { vibracion: true });
  await con.click("#a");
  assert.deepEqual(await con.evaluate(() => window.vibraciones), [25]);
  const sin = await pagina(t);
  await sin.click("#a");
  await avisos(sin).waitFor();
});

test("con «reducir movimiento» no hay animación: aparece y se quita sin moverse", TOPE, async (t) => {
  const quieto = await pagina(t, { reducedMotion: "reduce" });
  await quieto.click("#a");
  await avisos(quieto).waitFor();
  const nombres = await avisos(quieto).evaluate((e) => [getComputedStyle(e).animationName, getComputedStyle(e.firstElementChild).animationName, getComputedStyle(e.querySelector("path")).animationName]);
  assert.deepEqual(nombres, ["none", "none", "none"]);
  // La palomita se ve completa (sin el trazo a medias).
  assert.equal(await avisos(quieto).locator("path").evaluate((e) => getComputedStyle(e).strokeDasharray), "none");
  // Al salir tampoco se mueve (se le pone la marca de salida a mano: ver la prueba de arriba).
  assert.equal(await avisos(quieto).evaluate((e) => (e.setAttribute("data-saliendo", "true"), getComputedStyle(e).animationName)), "none", "ni siquiera al salir");
  await quieto.clock.fastForward(3000);
  assert.equal(await avisos(quieto).count(), 0);
  // Y con movimiento, las tres animaciones (sube, sella, traza) sí están.
  const movido = await pagina(t);
  await movido.click("#a");
  await avisos(movido).waitFor();
  const con = await avisos(movido).evaluate((e) => [getComputedStyle(e).animationName, getComputedStyle(e.firstElementChild).animationName, getComputedStyle(e.querySelector("path")).animationName]);
  assert.ok(con.every((n) => n !== "none"), `animaciones: ${con}`);
});

test("sobre la pastilla flotante de una ficha (`data-flotantes`), sin taparla", TOPE, async (t) => {
  const p = await pagina(t, { query: "?pastilla" });
  await p.click("#a");
  await avisos(p).waitFor();
  await p.waitForTimeout(450); // la entrada (200 ms, de abajo hacia arriba) ya terminó
  const aviso = await avisos(p).boundingBox();
  const pastilla = await p.locator("[data-flotantes]").boundingBox();
  assert.ok(aviso.y + aviso.height <= pastilla.y, `el aviso (${aviso.y + aviso.height}) termina antes de la pastilla (${pastilla.y})`);
  assert.ok(pastilla.y - (aviso.y + aviso.height) < 24, "y queda pegado a ella");
});

test("sobre el pie de un paso (`--alto-pie`), sin taparlo", TOPE, async (t) => {
  const p = await pagina(t, { query: "?pie" });
  await p.click("#a");
  await avisos(p).waitFor();
  await p.waitForTimeout(450); // la entrada (200 ms, de abajo hacia arriba) ya terminó
  const aviso = await avisos(p).boundingBox();
  assert.ok(aviso.y + aviso.height <= 844 - 120, `termina antes del pie de 120 px (${aviso.y + aviso.height})`);
});

test("un texto largo se acomoda dentro de la pantalla angosta, sin salirse", TOPE, async (t) => {
  const p = await pagina(t);
  await p.click("#largo");
  const caja = await avisos(p).boundingBox();
  assert.ok(caja.x >= 15 && caja.x + caja.width <= 390 - 15, `dentro del ancho (${caja.x}, ${caja.width})`);
});
