/** Prueba de componente de `useUbicacionFresca` (OL-255: la distancia al día sin toque): en Chrome real, con la geolocalización simulada.
 *  Con el permiso ya concedido, al abrirse la pantalla enseña la ubicación guardada y, si tiene más de un minuto, la relee sola y se actualiza;
 *  al volver la app al frente (`visibilitychange`) hace lo mismo, y si el punto está fresco no vuelve a llamar. Sin permiso (por preguntar)
 *  no llama nunca al navegador: ese aviso solo sale tras un toque.
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
  dir = await mkdtemp(join(tmpdir(), "ubicacionfresca-componentes-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import {useUbicacionFresca} from './src/components/useUbicacionFresca';
      function App() {
        const p = useUbicacionFresca();
        return <p id="distancia">{p ? p.lat + ',' + p.lng : '—'}</p>;
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

const AQUI = { latitude: 22.157, longitude: -100.986 };
const ALLA = { latitude: 22.2, longitude: -100.9 };
const VIEJO = { lat: 22.1, lng: -100.95 };

/** Abre la pantalla con el permiso de ubicación en `permisos` ([] = sin conceder) y un punto guardado de hace `edadMs` (null = ninguno). */
async function abrir({ permisos, edadMs }) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, geolocation: AQUI, permissions: permisos });
  const page = await context.newPage();
  // Cuenta las veces que la pantalla le pide una posición al navegador.
  await page.addInitScript(
    ([edadMs, viejo]) => {
      window.lecturas = 0;
      const original = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
      navigator.geolocation.getCurrentPosition = (...args) => {
        window.lecturas++;
        return original(...args);
      };
      if (edadMs !== null) localStorage.setItem("sn:ubicacion-cercana", JSON.stringify({ punto: viejo, en: Date.now() - edadMs }));
    },
    [edadMs, VIEJO],
  );
  await page.goto(origin);
  await page.waitForSelector("#distancia");
  return { context, page };
}
const texto = (page) => page.locator("#distancia").innerText();
const lecturas = (page) => page.evaluate(() => window.lecturas);

test("con permiso y un punto de hace dos minutos: se actualiza sola, sin toque", async () => {
  const { context, page } = await abrir({ permisos: ["geolocation"], edadMs: 2 * 60 * 1000 });
  await page.waitForFunction(() => document.getElementById("distancia").innerText === "22.157,-100.986");
  assert.equal(await lecturas(page), 1);
  await context.close();
});

test("con permiso y sin ningún punto guardado: aparece sola", async () => {
  const { context, page } = await abrir({ permisos: ["geolocation"], edadMs: null });
  await page.waitForFunction(() => document.getElementById("distancia").innerText === "22.157,-100.986");
  await context.close();
});

test("con permiso y el punto fresco (30 s): se queda y no llama al navegador, ni al volver la app al frente", async () => {
  const { context, page } = await abrir({ permisos: ["geolocation"], edadMs: 30 * 1000 });
  await page.waitForTimeout(300);
  assert.equal(await texto(page), "22.1,-100.95");
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await page.waitForTimeout(300);
  assert.equal(await lecturas(page), 0);
  assert.equal(await texto(page), "22.1,-100.95");
  await context.close();
});

test("al volver la app al frente con el punto ya viejo: se pone al día", async () => {
  const { context, page } = await abrir({ permisos: ["geolocation"], edadMs: 30 * 1000 });
  await page.waitForTimeout(200);
  assert.equal(await lecturas(page), 0);
  // La persona camina un rato: pasan más de dos minutos y la app vuelve al frente.
  await context.setGeolocation(ALLA);
  await page.evaluate(() => {
    localStorage.setItem("sn:ubicacion-cercana", JSON.stringify({ punto: { lat: 22.1, lng: -100.95 }, en: Date.now() - 2 * 60 * 1000 }));
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForFunction(() => document.getElementById("distancia").innerText === "22.2,-100.9");
  assert.equal(await lecturas(page), 1);
  await context.close();
});

test("sin permiso concedido: nunca llama al navegador (el aviso es de un toque) y se queda con lo guardado", async () => {
  const { context, page } = await abrir({ permisos: [], edadMs: 2 * 60 * 1000 });
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await page.waitForTimeout(500);
  assert.equal(await lecturas(page), 0);
  assert.equal(await texto(page), "22.1,-100.95");
  await context.close();
});
