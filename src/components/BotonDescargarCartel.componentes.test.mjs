/** OL-304 (bitácora 332) y OL-317 (bitácora 344): «Descargar el cartel» (web) / «Guardar en Fotos» (app). Bundle real (esbuild) de `BotonDescargarCartel.tsx` con Chrome real vía Playwright; la ruta
 *  `/api/cartel/[id]` la simula `page.route` (con su `Content-Disposition`) y `navigator.share` lo pone la prueba para comprobar que el botón YA NO lo usa (la web descarga; compartir es «Compartir»). No corre con `npm test`; se corre con `npm run test:componentes`.
 * PLAYWRIGHT_MODULE=/ruta/playwright-core/index.mjs node --test este-archivo */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../", import.meta.url));
const TOPE = { timeout: 30000 };
let browser, server, dir, origin;
/** Un PNG de 1×1: lo que «entrega» la ruta. */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "descargar-cartel-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import BotonDescargarCartel from './src/components/BotonDescargarCartel';import './src/app/globals.css';
      const q = new URLSearchParams(location.search);
      createRoot(document.getElementById('root')).render(
        <BotonDescargarCartel id="lectura-ab12" className="boton" icono={<b>↓</b>} precargar={q.has('precargar')} corto={q.has('ficha')} />
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
 * La pantalla con el botón. `hoja`: si el navegador ofrece `navigator.share` con archivos (el iPhone): el botón no debe usarla nunca.
 * `fotos` (la app de iPhone con `FotosPlugin`): 'no' (Safari o Chrome: no hay `window.Capacitor`), 'ok' (guarda), 'permiso' (la persona negó el
 * permiso: rechaza con el código `permiso`), 'cae' (rechaza por otra causa) o 'vieja' (Capacitor sin el plugin: una compilación anterior).
 * Lo que recibe el plugin queda en `window.guardadasEnFotos`. `ruta` es lo que contesta `/api/cartel/lectura-ab12`: 'ok', 'cae' (502) o
 * 'lenta' (tarda hasta que la prueba la libera).
 */
async function pagina(t, { hoja = true, ruta = "ok", fotos = "no", query = "" } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  t.after(() => context.close());
  const p = await context.newPage();
  p.setDefaultTimeout(8000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  t.after(() => assert.deepEqual(errors, []));
  p.pedidos = [];
  p.liberar = null;
  let modo = ruta;
  p.modo = (nuevo) => (modo = nuevo);
  await p.route(`${origin}/api/cartel/**`, async (r) => {
    p.pedidos.push(new URL(r.request().url()).pathname);
    if (modo === "lenta") await new Promise((seguir) => (p.liberar = seguir));
    if (modo === "cae") return r.fulfill({ status: 502, contentType: "text/plain", body: "No se pudo traer el cartel" });
    return r.fulfill({ status: 200, contentType: "image/png", headers: { "Content-Disposition": 'attachment; filename="cartel-lectura-ab12.png"' }, body: PNG });
  });
  await p.addInitScript((conHoja) => {
    window.compartidos = [];
    if (!conHoja) return;
    Object.defineProperty(navigator, "canShare", { value: () => true, configurable: true });
    Object.defineProperty(navigator, "share", { configurable: true, value: async (d) => void window.compartidos.push(d.title ?? "") });
  }, hoja);
  await p.addInitScript((modoFotos) => {
    window.guardadasEnFotos = [];
    if (modoFotos === "no") return;
    // Una compilación vieja de la app: hay Capacitor, pero sin el plugin de Fotos.
    if (modoFotos === "vieja") return void (window.Capacitor = { Plugins: {} });
    window.Capacitor = {
      Plugins: {
        Fotos: {
          guardarFoto: async (d) => {
            window.guardadasEnFotos.push({ tipo: d.tipo, base64: d.datos });
            if (modoFotos === "permiso") throw Object.assign(new Error("Sin permiso para guardar en Fotos"), { code: "permiso" });
            if (modoFotos === "cae") throw Object.assign(new Error("No se pudo guardar"), { code: "guardar" });
            return { guardado: true };
          },
        },
      },
    };
  }, fotos);
  await p.goto(`${origin}/${query}`);
  p.descargas = [];
  p.on("download", (d) => p.descargas.push(d.suggestedFilename()));
  return p;
}
const enlace = (p) => p.getByRole("link");
const texto = async (p) => (await enlace(p).innerText()).replace(/^↓\s*/, "");
/** Espera a que el botón diga exactamente eso (el icono de la prueba es «↓»). */
const dice = (p, letrero) => p.waitForFunction((x) => document.querySelector("a")?.textContent === `↓${x}`, letrero);
const sinHoja = async (p) => assert.deepEqual(await p.evaluate(() => window.compartidos), [], "el botón no abre la hoja de compartir");

test("en la web (aunque el navegador comparta archivos, como Safari del iPhone): «Preparando…», descarga el archivo con el nombre de la ruta, dice «Cartel descargado» y vuelve a su texto a los 4 s; nunca abre la hoja de compartir", TOPE, async (t) => {
  const p = await pagina(t, { ruta: "lenta" });
  assert.equal(await texto(p), "Descargar el cartel");
  assert.equal(await enlace(p).getAttribute("href"), "/api/cartel/lectura-ab12");
  await p.clock.install();
  const descarga = p.waitForEvent("download");
  await enlace(p).click();
  assert.equal(await texto(p), "Preparando…");
  assert.equal(await enlace(p).getAttribute("aria-busy"), "true");
  // Un segundo toque mientras se prepara no pide otra vez.
  await enlace(p).click();
  while (!p.liberar) await p.waitForTimeout(20);
  p.liberar();
  assert.equal((await descarga).suggestedFilename(), "cartel-lectura-ab12.png");
  await p.getByText("Cartel descargado").waitFor();
  assert.deepEqual(p.pedidos, ["/api/cartel/lectura-ab12"]);
  await sinHoja(p);
  // La pantalla no navegó a ningún lado: sigue siendo la del botón.
  assert.equal(new URL(p.url()).pathname, "/");
  await p.clock.fastForward(4100);
  assert.equal(await texto(p), "Descargar el cartel");
});

test("en la web sin `navigator.share` se descarga igual", TOPE, async (t) => {
  const p = await pagina(t, { hoja: false });
  const [descarga] = await Promise.all([p.waitForEvent("download"), enlace(p).click()]);
  assert.equal(descarga.suggestedFilename(), "cartel-lectura-ab12.png");
  await p.getByText("Cartel descargado").waitFor();
});

test("si la ruta falla lo dice sin sacar de la pantalla ni descargar nada, y el siguiente toque vuelve a pedirlo", TOPE, async (t) => {
  const p = await pagina(t, { ruta: "cae" });
  await enlace(p).click();
  await p.getByText("No se pudo descargar").waitFor();
  assert.equal(new URL(p.url()).pathname, "/");
  assert.deepEqual(p.descargas, []);
  p.modo("ok");
  const descarga = p.waitForEvent("download");
  await enlace(p).click();
  await descarga;
  await p.getByText("Cartel descargado").waitFor();
  assert.equal(p.pedidos.length, 2);
});

test("con `precargar` el cartel se pide al montarse y el toque no vuelve a pedirlo; sin `precargar`, nada se pide hasta el toque", TOPE, async (t) => {
  const p = await pagina(t, { query: "?precargar" });
  await p.waitForFunction(() => performance.getEntriesByType("resource").some((e) => e.name.includes("/api/cartel/")));
  await Promise.all([p.waitForEvent("download"), enlace(p).click()]);
  await p.getByText("Cartel descargado").waitFor();
  assert.equal(p.pedidos.length, 1);
  const quieta = await pagina(t);
  await quieta.waitForTimeout(300);
  assert.equal(quieta.pedidos.length, 0);
});

test("en la ficha (web): letrero corto «Cartel» con el nombre completo en `aria-label` mientras está en reposo; «Preparando…» y «Descargado» sin etiqueta; «No se pudo» si falla", TOPE, async (t) => {
  const p = await pagina(t, { query: "?ficha", ruta: "lenta" });
  assert.equal(await texto(p), "Cartel");
  assert.equal(await enlace(p).getAttribute("aria-label"), "Descargar el cartel");
  const [descarga] = await Promise.all([p.waitForEvent("download"), enlace(p).click(), (async () => { while (!p.liberar) await p.waitForTimeout(20); p.liberar(); })()]);
  assert.equal(descarga.suggestedFilename(), "cartel-lectura-ab12.png");
  await dice(p, "Descargado");
  // Mientras avisa, el letrero que se lee es el aviso, no la etiqueta fija.
  assert.equal(await enlace(p).getAttribute("aria-label"), null);
  const cae = await pagina(t, { query: "?ficha", ruta: "cae" });
  await enlace(cae).click();
  await dice(cae, "No se pudo");
});

test("en la ficha (app con plugin): letrero corto «En Fotos» con «Guardar en Fotos» en `aria-label`; «Guardado» al terminar y «No se pudo» si Fotos falla", TOPE, async (t) => {
  const p = await pagina(t, { query: "?ficha", fotos: "ok" });
  assert.equal(await texto(p), "En Fotos");
  assert.equal(await enlace(p).getAttribute("aria-label"), "Guardar en Fotos");
  await enlace(p).click();
  await dice(p, "Guardado");
  assert.equal(await enlace(p).getAttribute("aria-label"), null);
  const falla = await pagina(t, { query: "?ficha", fotos: "permiso" });
  await enlace(falla).click();
  await dice(falla, "No se pudo");
});

test("en la app de iPhone con el plugin de Fotos: «Guardar en Fotos», un toque y la imagen llega al plugin (sin hoja ni descarga); «Guardado en Fotos» y vuelve a su texto a los 4 s", TOPE, async (t) => {
  const p = await pagina(t, { fotos: "ok", ruta: "lenta" });
  assert.equal(await texto(p), "Guardar en Fotos");
  await p.clock.install();
  await enlace(p).click();
  assert.equal(await texto(p), "Guardando…");
  while (!p.liberar) await p.waitForTimeout(20);
  p.liberar();
  await p.getByText("Guardado en Fotos").waitFor();
  // El plugin recibió el PNG tal cual (base64 sin prefijo) y su tipo; no hubo hoja ni descarga.
  assert.deepEqual(await p.evaluate(() => window.guardadasEnFotos), [{ tipo: "image/png", base64: PNG.toString("base64") }]);
  await sinHoja(p);
  assert.deepEqual(p.descargas, []);
  await p.clock.fastForward(4100);
  assert.equal(await texto(p), "Guardar en Fotos");
});

test("en la app, si Fotos falla (permiso negado u otra causa): dice «No se pudo guardar»; no abre la hoja, no descarga nada ni sale de la pantalla, y el siguiente toque lo intenta otra vez", TOPE, async (t) => {
  for (const fotos of ["permiso", "cae"]) {
    const p = await pagina(t, { fotos });
    await enlace(p).click();
    await p.getByText("No se pudo guardar").waitFor();
    await p.waitForTimeout(300);
    assert.equal((await p.evaluate(() => window.guardadasEnFotos)).length, 1);
    await sinHoja(p);
    assert.deepEqual(p.descargas, []);
    assert.equal(new URL(p.url()).pathname, "/");
    await enlace(p).click();
    await p.waitForFunction(() => window.guardadasEnFotos.length === 2);
  }
});

test("en la app con una compilación vieja (Capacitor sin el plugin de Fotos) el botón se porta como en la web: «Descargar el cartel» y descarga; nada de «Fotos»", TOPE, async (t) => {
  const p = await pagina(t, { fotos: "vieja" });
  assert.equal(await texto(p), "Descargar el cartel");
  const [descarga] = await Promise.all([p.waitForEvent("download"), enlace(p).click()]);
  assert.equal(descarga.suggestedFilename(), "cartel-lectura-ab12.png");
  await p.getByText("Cartel descargado").waitFor();
  assert.deepEqual(await p.evaluate(() => window.guardadasEnFotos), []);
});
