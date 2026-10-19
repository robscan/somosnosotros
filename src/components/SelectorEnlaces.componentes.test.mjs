/** OL-419: reordenar enlaces arrastrando el agarre (`SelectorEnlaces`, OL-184), con el dedo de verdad (toques por CDP) en Chrome a 390×844. El
 *  nuevo orden se confirma solo al soltar: si el navegador cancela el gesto (`pointercancel`, aquí un `touchCancel` real), los renglones vuelven a
 *  su puesto y el campo que viaja al servidor no cambia. Cada toque mira antes qué hay en ese punto (un velo invisible se lo comería: OL-357).
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
  dir = await mkdtemp(join(tmpdir(), "selector-enlaces-"));
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
      import SelectorEnlaces from './src/components/SelectorEnlaces';import './src/app/globals.css';
      const inicial = [{ red: 'instagram', url: 'https://instagram.com/losvecinos' }, { red: 'facebook', url: 'https://facebook.com/losvecinos' }, { red: 'sitio', url: 'https://losvecinos.mx' }];
      createRoot(document.getElementById('root')).render(<form style={{ padding: 16 }}><SelectorEnlaces inicial={inicial} /></form>);
    `,
    },
    plugins: [{ name: "link", setup(b) {
      b.onResolve({ filter: /^next\/link$/ }, () => ({ path: "next/link", namespace: "mock" }));
      b.onLoad({ filter: /.*/, namespace: "mock" }, () => ({ contents: "import React from 'react';export const useLinkStatus=()=>({pending:false});export default function Link({prefetch,replace,onNavigate,...p}){return React.createElement('a',p)}", loader: "js", resolveDir: root }));
    } }],
  });
  const assets = new Map([
    ["/", ["text/html", '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--fuente-bricolage:Arial}body{margin:0}</style><div id="root"></div><script src="/app.js"></script>']],
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
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE ?? (process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : undefined) });
});
after(async () => {
  await browser?.close();
  if (server) await new Promise((r) => server.close(r));
  if (dir) await rm(dir, { recursive: true, force: true });
});

const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));

async function abrir(t) {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  t.after(() => c.close());
  const page = await c.newPage();
  page.setDefaultTimeout(5000);
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  t.after(() => assert.deepEqual(errores, []));
  await page.goto(origin);
  await page.getByRole("button", { name: "Mover Instagram" }).waitFor();
  const cdp = await c.newCDPSession(page);
  const toque = (type, puntos) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: puntos.map(([x, y], id) => ({ x, y, id })) });
  return { page, toque };
}

/** El orden que viaja al servidor (el campo oculto) y si algún renglón sigue desplazado. */
const estado = (page) =>
  page.evaluate(() => ({
    orden: JSON.parse(document.querySelector("input[name=enlaces]").value).map((e) => e.red),
    movidos: [...document.querySelectorAll("ul[aria-label=Enlaces] > li")].filter((li) => li.style.transform).length,
  }));

/** Pone el dedo en el agarre de Instagram y lo baja más de un renglón y medio, sin soltarlo. */
async function arrastrarInstagram(page, toque) {
  const caja = await page.getByRole("button", { name: "Mover Instagram" }).boundingBox();
  const [x, y] = [caja.x + caja.width / 2, caja.y + caja.height / 2];
  assert.equal(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest("button")?.getAttribute("aria-label"), [x, y]), "Mover Instagram");
  const alto = await page.evaluate(() => {
    const [a, b] = document.querySelectorAll("ul[aria-label=Enlaces] > li");
    return b.getBoundingClientRect().top - a.getBoundingClientRect().top;
  });
  await toque("touchStart", [[x, y]]);
  for (let i = 1; i <= 8; i++) {
    await toque("touchMove", [[x, y + (alto * 1.4 * i) / 8]]);
    await espera(16);
  }
  const durante = await estado(page);
  assert.equal(durante.movidos > 0, true, "mientras se arrastra, los renglones se apartan");
  assert.deepEqual(durante.orden, ["instagram", "facebook", "sitio"], "nada se confirma antes de soltar");
}

test("cancelar el arrastre (pointercancel) deshace el gesto y conserva el orden", async (t) => {
  const { page, toque } = await abrir(t);
  await arrastrarInstagram(page, toque);
  await toque("touchCancel", []);
  await page.waitForFunction(() => ![...document.querySelectorAll("ul[aria-label=Enlaces] > li")].some((li) => li.style.transform));
  assert.deepEqual(await estado(page), { orden: ["instagram", "facebook", "sitio"], movidos: 0 });
});

test("soltar el arrastre (pointerup) confirma el nuevo orden", async (t) => {
  const { page, toque } = await abrir(t);
  await arrastrarInstagram(page, toque);
  await toque("touchEnd", []);
  await page.waitForFunction(() => JSON.parse(document.querySelector("input[name=enlaces]").value)[0].red === "facebook");
  assert.deepEqual(await estado(page), { orden: ["facebook", "instagram", "sitio"], movidos: 0 });
});
