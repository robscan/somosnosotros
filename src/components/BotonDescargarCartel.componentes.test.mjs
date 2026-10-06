/** OL-304 (bitácora 332): «Descargar el cartel». Bundle real (esbuild) de `BotonDescargarCartel.tsx` con Chrome real vía Playwright; la ruta
 *  `/api/cartel/[id]` la simula `page.route` (con su `Content-Disposition`) y `navigator.share` / `navigator.canShare` los pone la prueba, como
 *  los tiene el iPhone o como no los tiene Chrome de escritorio. No corre con `npm test`; se corre con `npm run test:componentes`.
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
        <BotonDescargarCartel id="lectura-ab12" titulo="Lectura en voz alta" className="boton" icono={<b>↓</b>} precargar={q.has('precargar')} {...(q.has('ficha') ? {textos:{reposo:'Cartel', listo:'Descargado'}, etiqueta:'Descargar el cartel'} : {})} />
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
 * La pantalla con el botón. `compartir`: 'no' (el navegador no comparte), 'archivos' (la hoja del sistema acepta el archivo), 'sin-archivos'
 * (comparte texto pero no archivos), 'cancela' (la persona cierra la hoja), 'bloqueada' (la hoja no se deja abrir: `NotAllowedError`).
 * `ruta` es lo que contesta `/api/cartel/lectura-ab12`: 'ok', 'cae' (502) o 'lenta' (tarda hasta que la prueba la libera).
 */
async function pagina(t, { compartir = "no", ruta = "ok", query = "" } = {}) {
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
  await p.addInitScript((como) => {
    window.compartidos = [];
    if (como === "no") {
      Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
      Object.defineProperty(navigator, "canShare", { value: undefined, configurable: true });
      return;
    }
    Object.defineProperty(navigator, "canShare", { value: (d) => (como === "sin-archivos" ? !d.files : true), configurable: true });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (d) => {
        if (como === "cancela") throw new DOMException("cerrada", "AbortError");
        if (como === "bloqueada") throw new DOMException("sin gesto", "NotAllowedError");
        const f = d.files?.[0];
        window.compartidos.push({ titulo: d.title, nombre: f?.name, tipo: f?.type, bytes: f?.size });
      },
    });
  }, compartir);
  await p.goto(`${origin}/${query}`);
  return p;
}
const enlace = (p) => p.getByRole("link");
const texto = async (p) => (await enlace(p).innerText()).replace(/^↓\s*/, "");

test("en el iPhone (comparte archivos): «Preparando…», la hoja del sistema recibe el cartel como archivo y dice «Cartel descargado»; vuelve a su texto a los 4 s", TOPE, async (t) => {
  const p = await pagina(t, { compartir: "archivos", ruta: "lenta" });
  assert.equal(await texto(p), "Descargar el cartel");
  assert.equal(await enlace(p).getAttribute("href"), "/api/cartel/lectura-ab12");
  await p.clock.install();
  await enlace(p).click();
  assert.equal(await texto(p), "Preparando…");
  assert.equal(await enlace(p).getAttribute("aria-busy"), "true");
  // Un segundo toque mientras se prepara no pide otra vez.
  await enlace(p).click();
  p.liberar();
  await p.getByText("Cartel descargado").waitFor();
  assert.deepEqual(p.pedidos, ["/api/cartel/lectura-ab12"]);
  assert.deepEqual(await p.evaluate(() => window.compartidos), [{ titulo: "Lectura en voz alta", nombre: "cartel-lectura-ab12.png", tipo: "image/png", bytes: PNG.length }]);
  await p.clock.fastForward(4100);
  assert.equal(await texto(p), "Descargar el cartel");
});

test("sin compartir archivos, o sin `navigator.share`, descarga el archivo con el nombre de la ruta", TOPE, async (t) => {
  for (const compartir of ["no", "sin-archivos"]) {
    const p = await pagina(t, { compartir });
    const [descarga] = await Promise.all([p.waitForEvent("download"), enlace(p).click()]);
    assert.equal(descarga.suggestedFilename(), "cartel-lectura-ab12.png");
    await p.getByText("Cartel descargado").waitFor();
    // La pantalla no navegó a ningún lado: sigue siendo la del botón.
    assert.equal(new URL(p.url()).pathname, "/");
  }
});

test("cerrar la hoja de compartir sin elegir no descarga ni dice «descargado»; si el sistema no la deja abrir, cae en la descarga", TOPE, async (t) => {
  const cancela = await pagina(t, { compartir: "cancela" });
  let descargas = 0;
  cancela.on("download", () => descargas++);
  await enlace(cancela).click();
  await cancela.waitForFunction(() => document.querySelector("a")?.textContent === "↓Descargar el cartel");
  await cancela.waitForTimeout(300);
  assert.equal(descargas, 0);
  assert.equal(await texto(cancela), "Descargar el cartel");

  const bloqueada = await pagina(t, { compartir: "bloqueada" });
  const [descarga] = await Promise.all([bloqueada.waitForEvent("download"), enlace(bloqueada).click()]);
  assert.equal(descarga.suggestedFilename(), "cartel-lectura-ab12.png");
  await bloqueada.getByText("Cartel descargado").waitFor();
});

test("si la ruta falla lo dice sin sacar de la pantalla ni descargar nada, y el siguiente toque vuelve a pedirlo", TOPE, async (t) => {
  const p = await pagina(t, { compartir: "archivos", ruta: "cae" });
  await enlace(p).click();
  await p.getByText("No se pudo descargar").waitFor();
  assert.equal(new URL(p.url()).pathname, "/");
  assert.deepEqual(await p.evaluate(() => window.compartidos), []);
  p.modo("ok");
  await enlace(p).click();
  await p.getByText("Cartel descargado").waitFor();
  assert.equal(p.pedidos.length, 2);
  assert.equal((await p.evaluate(() => window.compartidos)).length, 1);
});

test("con `precargar` el cartel se pide al montarse y el toque no vuelve a pedirlo: la hoja de compartir se abre al instante", TOPE, async (t) => {
  const p = await pagina(t, { compartir: "archivos", query: "?precargar" });
  await p.waitForFunction(() => performance.getEntriesByType("resource").some((e) => e.name.includes("/api/cartel/")));
  await enlace(p).click();
  await p.getByText("Cartel descargado").waitFor();
  assert.equal(p.pedidos.length, 1);
  // Sin `precargar`, nada se pide hasta el toque.
  const quieta = await pagina(t, { compartir: "archivos" });
  await quieta.waitForTimeout(300);
  assert.equal(quieta.pedidos.length, 0);
});

test("en la ficha: el texto corto «Cartel» con su nombre completo para el lector, y el aviso corto «Descargado»", TOPE, async (t) => {
  const p = await pagina(t, { compartir: "archivos", query: "?ficha" });
  assert.equal(await texto(p), "Cartel");
  assert.equal(await enlace(p).getAttribute("aria-label"), "Descargar el cartel");
  await enlace(p).click();
  await p.getByText("Descargado").waitFor();
  // Mientras avisa, el letrero que se lee es el aviso, no la etiqueta fija.
  assert.equal(await enlace(p).getAttribute("aria-label"), null);
});
