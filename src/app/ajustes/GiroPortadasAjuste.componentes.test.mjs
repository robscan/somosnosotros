/** OL-375 (bitácora 406): el renglón «Mover las portadas con el teléfono» de Ajustes, con el componente real y el CSS real, dentro de la tarjeta
 *  «Somos Nosotrxs» (`MARCA`; los renglones vecinos son el real «Avisar al salir del sitio» y una copia del marcado de «Ayuda»). Toques reales con el
 *  ratón sobre la palanca (antes, `elementFromPoint` confirma que su centro es ella). El permiso del iPhone se imita: Chrome trae
 *  `requestPermission`, pero responde que sí sin preguntar; Safari solo pregunta dentro de un toque y, sin él, solo responde si ya lo dio.
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
/** La marca (src/lib/marca.ts, OL-435), empaquetada como en Imagen.componentes.test.mjs. */
const { MARCA } = await import(`data:text/javascript;base64,${Buffer.from((await build({ entryPoints: [join(root, "src/lib/marca.ts")], bundle: true, platform: "node", format: "esm", write: false })).outputFiles[0].text).toString("base64")}`);
let dir, server, browser, origin;

const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36";
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "giro-portadas-ajuste-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import AvisoSalidaAjuste from './src/app/ajustes/AvisoSalidaAjuste';
      import GiroPortadasAjuste from './src/app/ajustes/GiroPortadasAjuste';
      import {IconoAyuda, IconoChevronDerecha} from './src/components/ui/Iconos';
      import renglon from './src/components/ui/Renglon.module.css';
      import plantilla from './src/components/ui/Plantilla.module.css';
      import './src/app/globals.css';
      import {MARCA} from './src/lib/marca';
      createRoot(document.getElementById('root')).render(
        <main className={plantilla.paginaContenido}>
          <h2>{MARCA}</h2>
          <ul className={renglon.tarjeta}>
            <AvisoSalidaAjuste />
            <GiroPortadasAjuste />
            <li><a href="#" className={renglon.ajuste}><IconoAyuda width={20} height={20} /><b>Ayuda</b><small>Preguntas frecuentes y cómo escribirnos</small><IconoChevronDerecha /></a></li>
          </ul>
        </main>
      );
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

/**
 * Imita el permiso de Safari del iPhone: dentro de un toque pregunta (y responde `respuesta`); sin toque, si ya lo dio en esta sesión responde
 * «granted» y si no, rechaza con NotAllowedError, sin preguntar. Anota cada llamada y si venía de un toque.
 */
function permisoDeSafari(respuesta) {
  let dado = null;
  window.__llamadas = [];
  Object.defineProperty(DeviceOrientationEvent, "requestPermission", {
    configurable: true,
    value: () => {
      const enToque = navigator.userActivation.isActive;
      window.__llamadas.push(enToque);
      if (dado) return Promise.resolve(dado);
      if (!enToque) return Promise.reject(new DOMException("Requesting device orientation access requires a user gesture to prompt", "NotAllowedError"));
      dado = respuesta;
      return Promise.resolve(respuesta);
    },
  });
}

async function pagina(t, { ua, reducir = false, iphone = null, guardado = null } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "es-MX", reducedMotion: reducir ? "reduce" : "no-preference", ...(ua ? { userAgent: ua, isMobile: true, hasTouch: true } : {}) });
  t.after(() => context.close());
  if (iphone) await context.addInitScript(permisoDeSafari, iphone);
  if (guardado) await context.addInitScript((v) => localStorage.setItem("sn-giro-portadas", v), guardado);
  const p = await context.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  t.after(() => assert.deepEqual(errors, []));
  await p.goto(origin);
  await p.getByRole("heading", { name: MARCA }).waitFor();
  await p.getByText("Avisar al salir del sitio").waitFor();
  return p;
}
const palanca = (p) => p.getByRole("switch", { name: "Mover las portadas con el teléfono" });
/** Un toque real en el centro de la palanca, tras comprobar que el centro es ella. */
async function tocar(p) {
  const centro = await palanca(p).evaluate((b) => {
    const r = b.getBoundingClientRect();
    const c = [r.left + r.width / 2, r.top + r.height / 2];
    return { c, es: document.elementFromPoint(...c) === b };
  });
  assert.ok(centro.es, "el centro de la palanca es la palanca");
  await p.mouse.click(...centro.c);
}
const estado = (p) => p.evaluate(() => {
  const b = document.querySelector('[aria-label="Mover las portadas con el teléfono"]');
  return { encendida: b.getAttribute("aria-checked"), apagada: b.disabled, detalle: b.closest("li").querySelector("small").textContent, guardado: localStorage.getItem("sn-giro-portadas") };
});

test("en Android viene encendido (no hay permiso que pedir); tocarlo lo apaga y lo guarda en el teléfono, y otra vez lo enciende", async (t) => {
  const p = await pagina(t, { ua: ANDROID });
  await palanca(p).waitFor();
  assert.deepEqual(await estado(p), { encendida: "true", apagada: false, detalle: "Las de festivales, expos y talleres, en Inicio", guardado: null });
  // El renglón, con el dibujo de Ajustes, entre «Avisar al salir del sitio» y «Ayuda».
  assert.deepEqual(await p.locator("li").allInnerTexts().then((l) => l.map((x) => x.split("\n")[0])), ["Avisar al salir del sitio", "Mover las portadas con el teléfono", "Ayuda"]);
  await tocar(p);
  await p.waitForFunction(() => document.querySelector('[aria-label="Mover las portadas con el teléfono"]').getAttribute("aria-checked") === "false");
  assert.equal((await estado(p)).guardado, "apagado");
  await tocar(p);
  await p.waitForFunction(() => document.querySelector('[aria-label="Mover las portadas con el teléfono"]').getAttribute("aria-checked") === "true");
  assert.equal((await estado(p)).guardado, "encendido");
});

test("en una computadora no hay giroscopio: el renglón no sale", async (t) => {
  const p = await pagina(t);
  assert.equal(await palanca(p).count(), 0);
});

test("con «Reducir movimiento» no se mueve: la palanca, apagada y sin acción, y lo dice", async (t) => {
  const p = await pagina(t, { ua: ANDROID, reducir: true });
  await palanca(p).waitFor();
  assert.deepEqual(await estado(p), { encendida: "false", apagada: true, detalle: "Tu teléfono pide reducir el movimiento", guardado: null });
});

test("en el iPhone viene apagado; el toque que lo enciende pide el permiso (dentro del toque) y, si lo da, queda encendido", async (t) => {
  const p = await pagina(t, { ua: IPHONE, iphone: "granted" });
  await palanca(p).waitFor();
  assert.equal((await estado(p)).encendida, "false");
  await tocar(p);
  await p.waitForFunction(() => document.querySelector('[aria-label="Mover las portadas con el teléfono"]').getAttribute("aria-checked") === "true");
  assert.equal((await estado(p)).guardado, "encendido");
  // La primera llamada salió dentro del toque (Safari solo pregunta así); las demás, sin toque, ya tienen la respuesta.
  assert.equal((await p.evaluate(() => window.__llamadas))[0], true);
});

test("en el iPhone, si se niega el permiso, la palanca vuelve a apagado y lo dice en una línea", async (t) => {
  const p = await pagina(t, { ua: IPHONE, iphone: "denied" });
  await palanca(p).waitFor();
  await tocar(p);
  await p.getByText("El iPhone no dio el permiso: vuelve a preguntar si cierras y abres la app").waitFor();
  assert.deepEqual(await estado(p), { encendida: "false", apagada: false, detalle: "El iPhone no dio el permiso: vuelve a preguntar si cierras y abres la app", guardado: "apagado" });
});

test("en el iPhone, encendido de una visita anterior pero sin el permiso en esta sesión: se ve apagado (así está en Inicio) y el toque lo vuelve a pedir", async (t) => {
  const p = await pagina(t, { ua: IPHONE, iphone: "granted", guardado: "encendido" });
  await palanca(p).waitFor();
  assert.equal((await estado(p)).encendida, "false");
  assert.deepEqual(await p.evaluate(() => window.__llamadas), [false], "preguntó sin toque y el iPhone no respondió");
  await tocar(p);
  await p.waitForFunction(() => document.querySelector('[aria-label="Mover las portadas con el teléfono"]').getAttribute("aria-checked") === "true");
  assert.equal((await p.evaluate(() => window.__llamadas))[1], true);
});
