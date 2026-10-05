// OL-276: SSR e hidratación del envoltorio real, además de su montaje desde una tarjeta.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { join } from "node:path";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../../", import.meta.url));
let dir, server, browser, origin;
before(async () => {
  dir = await mkdtemp(join(tmpdir(), "ol276-hidratacion-"));
  const contenido = `import React from 'react';import EntradaFicha from './src/components/ui/EntradaFicha';
    export function Ficha(){return <EntradaFicha><main style={{minHeight:1500}}><h1>Ficha de prueba</h1>
      <button style={{position:'fixed',bottom:0,left:0}}>Seguir</button></main></EntradaFicha>}`;
  await build({ absWorkingDir: root, bundle: true, platform: "node", format: "cjs", outfile: join(dir, "ssr.cjs"), jsx: "automatic",
    stdin: { resolveDir: root, loader: "tsx", contents: contenido + `;import {renderToString} from 'react-dom/server';export const html=renderToString(<Ficha/>);` } });
  const { html } = createRequire(import.meta.url)(join(dir, "ssr.cjs"));
  await build({ absWorkingDir: root, bundle: true, outfile: join(dir, "app.js"), jsx: "automatic",
    stdin: { resolveDir: root, loader: "tsx", contents: contenido + `;import {hydrateRoot,createRoot} from 'react-dom/client';
      const nodo=document.getElementById('root');
      if(location.search){document.getElementById('tarjeta').onclick=()=>createRoot(nodo).render(<Ficha/>)}
      else hydrateRoot(nodo,<Ficha/>);` } });
  const assets = new Map([
    ["/app.js", ["text/javascript", await readFile(join(dir, "app.js"))]],
    ["/app.css", ["text/css", await readFile(join(dir, "app.css"))]],
  ]);
  server = createServer((req, res) => {
    const a = assets.get(req.url);
    res.writeHead(200, { "Content-Type": `${a?.[0] ?? "text/html"}; charset=utf-8` });
    res.end(a?.[1] ?? `<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css">
      <style>body{margin:0}</style><button id="tarjeta">Abrir ficha</button><div id="root">${req.url.includes("?") ? "" : html}</div><script src="/app.js"></script>`);
  });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  origin = `http://127.0.0.1:${server.address().port}`;
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright-core");
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE });
});
after(async () => { await browser?.close(); if (server) await new Promise(r => server.close(r)); if (dir) await rm(dir, { recursive: true, force: true }); });

for (const width of [320, 390]) test(`primer pintado SSR reducido, antes de JavaScript, a ${width}`, async t => {
  const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: "reduce", javaScriptEnabled: false });
  t.after(() => context.close());
  const page = await context.newPage();
  await page.goto(origin);
  const m = await page.evaluate(() => ({ x: document.querySelector("main").getBoundingClientRect().x, ancho: document.documentElement.scrollWidth, transform: getComputedStyle(document.querySelector("main").parentElement).transform }));
  assert.deepEqual(m, { x: 0, ancho: width, transform: "none" });
});

for (const width of [320, 390]) for (const reducedMotion of ["reduce", "no-preference"]) {
  test(`entrada directa y recarga SSR a ${width}, ${reducedMotion}`, async t => {
    const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion });
    t.after(() => context.close());
    const page = await context.newPage();
    const errores = [];
    page.on("console", m => { if (m.type() === "error") errores.push(m.text()); });
    page.on("pageerror", e => errores.push(e.message));
    for (const recarga of [false, true]) {
      if (recarga) await page.reload(); else await page.goto(origin);
      await page.waitForFunction(() => getComputedStyle(document.querySelector("main").parentElement).transform === "none");
      const medidas = await page.evaluate(() => ({ ancho: document.documentElement.scrollWidth, x: document.querySelector("main").getBoundingClientRect().x, pie: document.querySelector("main button").getBoundingClientRect().bottom }));
      assert.equal(medidas.ancho, width);
      assert.equal(medidas.x, 0);
      assert.equal(medidas.pie, 844, "el transform se suelta para la acción fija");
    }
    assert.deepEqual(errores, [], "SSR y cliente deben hidratar sin diferencias");
  });
  test(`desde una tarjeta a ${width}, ${reducedMotion}`, async t => {
    const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion });
    t.after(() => context.close());
    const page = await context.newPage();
    await page.goto(origin + "/?cliente=1");
    await page.getByRole("button", { name: "Abrir ficha" }).click();
    await page.waitForFunction(() => getComputedStyle(document.querySelector("main").parentElement).transform === "none");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
  });
}
