/** El campo de texto largo (`ui/CampoLargo`, OL-288, bitácora 316): su capa a pantalla completa sigue al área visible cuando el
 *  teclado deja desplazada la ventana de maquetación (visualViewport reducido y con offsetTop), y al abrir el cursor queda al final.
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
  dir = await mkdtemp(join(tmpdir(), "campolargo-componentes-"));
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
      import CampoLargo from './src/components/ui/CampoLargo';
      import './src/app/globals.css';
      // ?largo=1: un texto de muchas líneas, que no cabe en el área de texto.
      const q = new URLSearchParams(location.search);
      const texto = q.has('largo') ? Array.from({ length: 60 }, (_, i) => 'Línea ' + i).join('\\n') : 'Hola\\nmundo';
      createRoot(document.getElementById('root')).render(
        <form><input aria-label="Título" /><CampoLargo id="texto" name="texto" etiqueta="Texto (opcional)" defaultValue={texto} maxLength={2000} mostrarContador /></form>
      );
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

async function abrir(t, consulta = "", sinVisualViewport = false) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  t.after(() => context.close());
  if (sinVisualViewport) await context.addInitScript(() => Object.defineProperty(window, "visualViewport", { configurable: true, value: undefined }));
  const p = await context.newPage();
  p.setDefaultTimeout(5000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  t.after(() => assert.deepEqual(errors, []));
  await p.goto(origin + consulta);
  await p.getByRole("button", { name: "Texto (opcional)" }).click();
  await p.getByRole("dialog").waitFor();
  return p;
}
const redondo = (v) => Math.round(v * 10) / 10;
/** Cajas de la capa, de su cabecera y de su área de texto, más cursor y desplazamiento del texto. */
const cajas = (p) =>
  p.getByRole("dialog").evaluate((capa) => {
    const c = capa.getBoundingClientRect();
    const cab = capa.querySelector("h2").parentElement.getBoundingClientRect();
    const area = capa.querySelector("textarea");
    const a = area.getBoundingClientRect();
    return {
      capa: [c.top, c.bottom].map((v) => Math.round(v * 10) / 10),
      cabeceraTop: cab.top,
      area: [a.top, a.bottom].map((v) => Math.round(v * 10) / 10),
      cursor: [area.selectionStart, area.selectionEnd, area.value.length],
      alFinal: area.scrollHeight - area.scrollTop - area.clientHeight <= 1,
      enfocada: document.activeElement === area,
      opaca: getComputedStyle(capa).backgroundColor !== "rgba(0, 0, 0, 0)" && getComputedStyle(capa).backgroundColor !== "transparent",
    };
  });
const teclado = (p, height, offsetTop) =>
  p.evaluate(([height, offsetTop]) => {
    Object.defineProperties(visualViewport, { height: { configurable: true, value: height }, offsetTop: { configurable: true, value: offsetTop } });
    visualViewport.dispatchEvent(new Event("resize"));
  }, [height, offsetTop]);

test("sin teclado la capa cubre la ventana entera y el cursor queda al final", async (t) => {
  const p = await abrir(t);
  const c = await cajas(p);
  assert.deepEqual(c.capa, [0, 844]);
  assert.equal(c.cabeceraTop, 0);
  assert.deepEqual(c.cursor, [10, 10, 10], "«Hola\\nmundo» son 10 caracteres");
  assert.ok(c.enfocada);
});

test("teclado abierto con la ventana desplazada: la capa arranca en el top del área visible, su blanco llega al fondo de la ventana y el texto termina sobre el teclado", async (t) => {
  const p = await abrir(t);
  await teclado(p, 508, 43);
  await p.waitForFunction(() => document.querySelector("[role=dialog]").getBoundingClientRect().top === 43);
  const c = await cajas(p);
  assert.equal(c.capa[0], 43, "la capa arranca en offsetTop");
  assert.ok(c.capa[1] >= 844, "el blanco de la capa llega al menos hasta el final de la ventana (la barra translúcida de iOS 26 queda fuera del visualViewport)");
  assert.ok(c.opaca, "el fondo de la capa es opaco: no se ve la página de debajo");
  assert.equal(c.cabeceraTop, 43, "título, contador y Listo empiezan donde empieza lo visible");
  assert.equal(c.area[1], 551, "el área de texto termina en offsetTop + alto del área visible, sobre el teclado");
  assert.ok(c.area[0] > 43 && c.area[0] < 120, "el área de texto sigue a la cabecera");
  await teclado(p, 844, 0);
  await p.waitForFunction(() => document.querySelector("[role=dialog]").getBoundingClientRect().top === 0);
  assert.deepEqual((await cajas(p)).capa, [0, 844], "sin teclado vuelve a inset: 0");
});

test("el teclado ya estaba abierto al tocar el renglón: la capa nace sobre el área visible", async (t) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  t.after(() => context.close());
  const p = await context.newPage();
  p.setDefaultTimeout(5000);
  await p.goto(origin);
  await p.getByRole("textbox", { name: "Título" }).focus();
  await teclado(p, 508, 43);
  await p.getByRole("button", { name: "Texto (opcional)" }).click();
  await p.getByRole("dialog").waitFor();
  const c = await cajas(p);
  assert.equal(c.capa[0], 43);
  assert.ok(c.capa[1] >= 844);
  assert.equal(c.area[1], 551);
});

test("texto largo: el cursor queda al final y el área muestra esa posición, también con el teclado", async (t) => {
  const p = await abrir(t, "?largo=1");
  const largo = await p.locator("textarea").evaluate((a) => a.value.length);
  const c = await cajas(p);
  assert.deepEqual(c.cursor, [largo, largo, largo]);
  assert.ok(c.alFinal, "la última línea está a la vista");
  await teclado(p, 508, 43);
  await p.waitForFunction(() => document.querySelector("[role=dialog]").getBoundingClientRect().top === 43);
  assert.deepEqual((await cajas(p)).cursor, [largo, largo, largo]);
});

test("sin visualViewport la capa se queda en inset: 0", async (t) => {
  const p = await abrir(t, "", true);
  assert.deepEqual((await cajas(p)).capa, [0, 844]);
  assert.equal(await p.getByRole("dialog").evaluate((e) => e.getAttribute("style")), null);
});

test("Listo cierra y deja el renglón con el texto", async (t) => {
  const p = await abrir(t);
  await teclado(p, 508, 43);
  await p.getByRole("button", { name: "Listo" }).click();
  await p.getByRole("button", { name: "Texto (opcional)" }).waitFor();
  assert.equal(await p.locator("input[type=hidden][name=texto]").inputValue(), "Hola\nmundo");
  assert.equal(redondo(await p.evaluate(() => scrollY)), 0, "la página de debajo no se movió");
});
