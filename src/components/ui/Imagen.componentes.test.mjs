/** OL-263: componente y Next/Image reales, red sintética. Comprueba selección
 * por DPR, carga diferida y recuperación; no mide facturación ni caché de Vercel.
 */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { build } from "esbuild";
import { imageConfigDefault } from "next/dist/shared/lib/image-config.js";
import sharp from "sharp";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#987654" } }).png().toBuffer();
let dir, server, browser, origin, propia;

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "imagen-componentes-"));
  const helper = await build({ entryPoints: [join(root, "src/lib/imagenOptima.ts")], bundle: true, platform: "node", format: "esm", write: false });
  const { CONFIG_IMAGENES, HOST_FOTOS, RUTA_FOTOS } = await import(`data:text/javascript;base64,${Buffer.from(helper.outputFiles[0].text).toString("base64")}`);
  propia = `https://${HOST_FOTOS}${RUTA_FOTOS}artistas/prueba/`;
  await build({
    absWorkingDir: root, bundle: true, outfile: join(dir, "app.js"),
    define: { "process.env.__NEXT_IMAGE_OPTS": JSON.stringify({ ...imageConfigDefault, ...CONFIG_IMAGENES }), "process.env.NODE_ENV": '"production"', "process.env": "{}" },
    stdin: { resolveDir: root, loader: "tsx", contents: `
      import React, {useState} from 'react';import {createRoot} from 'react-dom/client';
      import Imagen from './src/components/ui/Imagen';
      function App(){
        const q=new URLSearchParams(location.search);
        const [src,setSrc]=useState(q.get('src') || ${JSON.stringify(propia)}+'foto.jpg');
        return <main><div style={{height:q.has('lejos')?6000:0}}/><Imagen src={src} alt="Foto" width={56} height={56} sizes="56px" className="foto" loading={q.has('lejos')?'lazy':'eager'}/><button onClick={()=>setSrc(${JSON.stringify(propia)}+'otra.jpg')}>Cambiar</button></main>;
      }
      createRoot(document.getElementById('root')).render(<App/>);` },
  });
  const app = await readFile(join(dir, "app.js"));
  server = createServer((req, res) => {
    const u = new URL(req.url, "http://local");
    if (u.pathname === "/app.js") { res.writeHead(200, { "Content-Type": "text/javascript" }); res.end(app); }
    else if (u.pathname === "/_next/image") {
      const fail = u.searchParams.get("url")?.includes("fallo");
      res.writeHead(fail ? 402 : 200, { "Content-Type": fail ? "text/plain" : "image/png" }); res.end(fail ? "quota" : png);
    } else {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><style>.foto{width:56px;height:56px;object-fit:cover}</style><div id="root"></div><script src="/app.js"></script>');
    }
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

async function abrir(t, { dpr = 1, src, lejos = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: dpr });
  t.after(() => context.close());
  await context.route("https://**/*", (route) => route.fulfill({ status: 200, contentType: "image/png", body: png }));
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  const requests = [], errors = [];
  page.on("request", (r) => { if (r.resourceType() === "image") requests.push(r.url()); });
  page.on("pageerror", (e) => errors.push(e.message));
  t.after(() => assert.deepEqual(errors, []));
  await page.goto(`${origin}/?${new URLSearchParams({ ...(src ? { src } : {}), ...(lejos ? { lejos: "1" } : {}) })}`);
  await page.getByRole("button", { name: "Cambiar" }).waitFor();
  return { page, requests, img: page.getByRole("img", { name: "Foto" }) };
}

for (const [dpr, ancho] of [[1, 96], [2, 192], [3, 192]]) {
  test(`miniatura a ${dpr}× pide ${ancho}px y nunca el original`, async (t) => {
    const { page, requests, img } = await abrir(t, { dpr });
    await page.waitForFunction(() => document.querySelector("img")?.naturalWidth > 0);
    assert.equal(new URL(await img.evaluate((e) => e.currentSrc)).searchParams.get("w"), String(ancho));
    assert.equal(requests.length, 1);
    assert.ok(requests[0].startsWith(`${origin}/_next/image?`));
    assert.equal(await img.evaluate((e) => e.getBoundingClientRect().width), 56);
    assert.equal(await img.getAttribute("sizes"), "56px");
  });
}

test("si falla la optimización quita srcset y recupera una vez el original; cambiar src vuelve a optimizar", async (t) => {
  const { page, requests, img } = await abrir(t, { src: propia + "fallo.jpg" });
  await page.waitForFunction(() => document.querySelector("img")?.currentSrc.endsWith("/fallo.jpg"));
  assert.equal(await img.getAttribute("srcset"), null);
  assert.equal(requests.length, 2);
  assert.equal(requests[1], propia + "fallo.jpg");
  await page.getByRole("button", { name: "Cambiar" }).click();
  await page.waitForFunction(() => document.querySelector("img")?.currentSrc.includes("otra.jpg"));
  assert.ok((await img.evaluate((e) => e.currentSrc)).startsWith(`${origin}/_next/image?`));
});

test("Google/externa conserva su URL y no pasa por el servidor de imágenes", async (t) => {
  const src = "https://lh3.googleusercontent.com/avatar.jpg";
  const { page, requests, img } = await abrir(t, { src });
  await page.waitForFunction(() => document.querySelector("img")?.naturalWidth > 0);
  assert.equal(await img.getAttribute("src"), src);
  assert.equal(await img.getAttribute("srcset"), null);
  assert.deepEqual(requests, [src]);
});

test("la foto lejana se solicita al acercarse, no al montar una lista", async (t) => {
  const { img, requests, page } = await abrir(t, { lejos: true });
  assert.equal(await img.getAttribute("loading"), "lazy");
  assert.deepEqual(requests, []);
  await img.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector("img")?.naturalWidth > 0);
  assert.equal(requests.length, 1);
});
