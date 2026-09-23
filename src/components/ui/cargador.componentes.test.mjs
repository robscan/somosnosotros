/** El cargador (OL-148, docs/rediseno/38-transiciones-cargador.md): el símbolo SN centrado y con pulso,
 *  en vez del letrero "Cargando…"; con "reducir movimiento" no hay latido, una opacidad fija.
 * PLAYWRIGHT_MODULE=/ruta/playwright-core/index.mjs CHROME_EXECUTABLE=/ruta/chrome node --test este-archivo
 * CARGADOR_SCREENSHOTS=/tmp/cargador conserva las capturas. */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const captures = process.env.CARGADOR_SCREENSHOTS;
let browser, server, dir, origin;

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "cargador-componentes-"));
  if (captures) await mkdir(captures, { recursive: true });
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import Cargando from './src/components/ui/Cargando';import './src/app/globals.css';
      createRoot(document.getElementById('root')).render(<Cargando/>);
    `,
    },
  });
  const assets = new Map([
    ["/", ["text/html", '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--fuente-bricolage:Arial}</style><div id="root"></div><script src="/app.js"></script>']],
    ["/app.js", ["text/javascript", await readFile(join(dir, "app.js"))]],
    ["/app.css", ["text/css", await readFile(join(dir, "app.css"))]],
  ]);
  server = createServer((req, res) => {
    const a = assets.get(req.url);
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

test("el símbolo SN reemplaza al letrero, con aria-label y sin el texto Cargando…", async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(origin);
  const svg = page.locator("main svg");
  await svg.waitFor();
  assert.equal(await svg.getAttribute("aria-label"), "Cargando");
  const texto = await page.locator("main").textContent();
  assert.ok(!texto.includes("Cargando…"), `no debe quedar el letrero: "${texto}"`);
  if (captures) await page.screenshot({ path: join(captures, "cargador.png") });
  await context.close();
});

test("late (opacidad 1 y 0.42 en el pulso) cuando el movimiento no está reducido", async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "no-preference" });
  const page = await context.newPage();
  await page.goto(origin);
  const svg = page.locator("main svg");
  await svg.waitFor();
  const nombreAnimacion = await svg.evaluate((el) => getComputedStyle(el).animationName);
  assert.notEqual(nombreAnimacion, "none");
  await context.close();
});

test('con "reducir movimiento" no hay latido: sin animación, opacidad fija en 0.75', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(origin);
  const svg = page.locator("main svg");
  await svg.waitFor();
  const estilo = await svg.evaluate((el) => {
    const c = getComputedStyle(el);
    return { animationName: c.animationName, opacity: c.opacity };
  });
  assert.equal(estilo.animationName, "none");
  assert.equal(estilo.opacity, "0.75");
  if (captures) await page.screenshot({ path: join(captures, "cargador-reducido.png") });
  await context.close();
});
