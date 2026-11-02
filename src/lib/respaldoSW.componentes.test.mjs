/** OL-501: el service worker de verdad (`public/sw.js`) y su página de respaldo (`public/sin-conexion.html`) en Chrome. Un servidor chico sirve los
 *  dos archivos tal cual y una «app» de mentira que registra el SW; luego se le pide a ese servidor que corte la conexión (red), conteste 503
 *  (servidor) o vuelva a la normalidad. La red se rompe en el servidor y no con `page.route`: las peticiones que hace el SW no pasan por las rutas
 *  de la página, así que abortarlas ahí no probaría el SW. El cuelgue (tope de 12 s) lo prueba `respaldoSW.test.ts` con temporizadores falsos.
 *  PLAYWRIGHT_MODULE=/ruta/playwright-core/index.mjs CHROME_EXECUTABLE=/ruta/chrome node --test este-archivo
 */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";

const raiz = fileURLToPath(new URL("../../", import.meta.url));
let browser, server, origen;
let modo = "ok";

const APP = (ruta) => `<!doctype html><meta charset="utf-8"><title>App</title><h1 data-ruta>${ruta}</h1>
<script>navigator.serviceWorker.register("/sw.js")</script>`;

before(async () => {
  const sw = await readFile(join(raiz, "public/sw.js"));
  const respaldo = await readFile(join(raiz, "public/sin-conexion.html"));
  server = createServer((req, res) => {
    const ruta = new URL(req.url, "http://x").pathname;
    if (ruta === "/__modo") {
      modo = new URL(req.url, "http://x").searchParams.get("m");
      res.end("ok");
      return;
    }
    if (ruta === "/sw.js") return res.writeHead(200, { "content-type": "text/javascript", "cache-control": "no-store" }).end(sw);
    if (ruta === "/sin-conexion.html") return res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }).end(respaldo);
    if (modo === "red") return req.socket.destroy();
    if (modo === "servidor") return res.writeHead(503, { "content-type": "text/plain" }).end("Service Unavailable");
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(APP(ruta));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  origen = `http://127.0.0.1:${server.address().port}`;
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE });
});
after(async () => {
  await browser?.close();
  if (server) await new Promise((r) => server.close(r));
});

const poner = (m) => fetch(`${origen}/__modo?m=${m}`);

test("sin red, con error del servidor y de vuelta: el respaldo en la misma dirección y la recuperación", async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  try {
    await poner("ok");
    await page.goto(origen + "/");
    // El SW toma la página (`clients.claim`) y ya tiene el respaldo en su caché.
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 10000 });
    assert.ok(await page.evaluate(() => caches.has("sn-respaldo-v1")));

    // Sin red: el respaldo, en la dirección que se pidió (enlace profundo), con la marca para medir.
    await poner("red");
    await page.goto(origen + "/eventos/noche-de-son?desde=aviso");
    await page.getByRole("heading", { name: "No se pudo cargar" }).waitFor();
    assert.equal(new URL(page.url()).pathname, "/eventos/noche-de-son");
    assert.equal(await page.getByText("El servidor no respondió.").isVisible(), false);
    const marca = JSON.parse(await page.evaluate(() => localStorage.getItem("sn_carga_fallida")));
    assert.deepEqual([marca.motivo, marca.app], ["red", "pwa"]);

    // El servidor contesta 503: el mismo respaldo, con su texto.
    await poner("servidor");
    await page.reload();
    await page.getByText("El servidor no respondió.").waitFor();
    assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem("sn_carga_fallida"))).motivo, "servidor");

    // Vuelve la red: «Intentar de nuevo» recarga la misma pantalla.
    await poner("ok");
    await page.getByRole("button", { name: "Intentar de nuevo" }).click();
    await page.locator("[data-ruta]").waitFor();
    assert.equal(await page.locator("[data-ruta]").textContent(), "/eventos/noche-de-son");

    // Y sola, al volver la conexión (`online`), sin tocar nada.
    await poner("red");
    await page.goto(origen + "/agenda");
    await page.getByRole("heading", { name: "No se pudo cargar" }).waitFor();
    await poner("ok");
    await ctx.setOffline(true);
    await ctx.setOffline(false);
    await page.locator("[data-ruta]").waitFor({ timeout: 10000 });
    assert.equal(await page.locator("[data-ruta]").textContent(), "/agenda");
  } finally {
    await ctx.close();
  }
});

test("lo que no es una navegación propia no pasa por el respaldo: un 503 de /api/ llega tal cual", async () => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  try {
    await poner("ok");
    await page.goto(origen + "/");
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 10000 });
    await poner("servidor");
    const estado = await page.evaluate(() => fetch("/api/medir").then((r) => r.status));
    assert.equal(estado, 503);
    const r = await page.goto(origen + "/api/algo");
    assert.equal(r.status(), 503);
    assert.equal(await page.getByRole("heading", { name: "No se pudo cargar" }).count(), 0);
  } finally {
    await poner("ok");
    await ctx.close();
  }
});
