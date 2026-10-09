/** OL-353 (bitácora 384): la espera de subida de la foto de perfil. Bundle real (esbuild) de `FormularioPerfil.tsx` con Chrome real vía
 *  Playwright; la subida es la de verdad (`subirFoto` y `prepararImagen`) y solo Storage es un doble lento (`navegadorDoble` con
 *  `retrasoStorage`). La acción de guardar es un doble. No corre con `npm test`; se corre con `npm run test:componentes`.
 * PLAYWRIGHT_MODULE=/ruta/playwright-core/index.mjs node --test este-archivo */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import { fotoGirada, navegadorDoble } from "../../../lib/imagenDePrueba.mjs";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const TOPE = { timeout: 30000 };
/** Con `CAPTURAS=<carpeta>` guarda la captura de la espera (390×844). */
const capturas = process.env.CAPTURAS;
async function foto(p, nombre) {
  if (!capturas) return;
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(300);
  await p.screenshot({ path: join(capturas, `${nombre}.png`) });
}

let dir, server, browser, origin;
const mocks = {
  "@/app/perfil/acciones": "export async function guardarPerfil(){return {ok:false, errores:{}}}",
  "./supabase/navegador": navegadorDoble,
  "@/components/ui/Atras": "export function useTerminar(){return ()=>{}}export default function Atras(){return null}",
  "next/navigation": "export function useRouter(){return {replace:()=>{},back:()=>{},refresh:()=>{},push:()=>{}}}export function usePathname(){return '/ajustes/editar'}",
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link({prefetch,replace,...p}){return React.createElement('a',p)}",
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "formulario-perfil-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    define: { "process.env.NEXT_PUBLIC_SUPABASE_URL": '""', "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": '""' },
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import FormularioPerfil from './src/app/ajustes/editar/FormularioPerfil';
      import './src/app/globals.css';
      window.qa = {real:true, verSubida:true, ...window.qaInicial};
      createRoot(document.getElementById('root')).render(
        <main style={{padding:16}}><FormularioPerfil perfil={{id:'ana', nombre:'Ana', colonia:'Centro', bio:null, foto:null}} correo="ana@ejemplo.org" /></main>
      );
    `,
    },
    plugins: [
      {
        name: "dobles",
        setup(b) {
          b.onResolve({ filter: /.*/ }, (a) => (a.path in mocks ? { path: a.path, namespace: "mock" } : undefined));
          b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({ contents: mocks[a.path], loader: "js", resolveDir: root }));
        },
      },
    ],
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

async function pagina(t, qa = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce", locale: "es-MX", deviceScaleFactor: capturas ? 2 : 1 });
  t.after(() => context.close());
  const p = await context.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  t.after(() => assert.deepEqual(errors, []));
  await p.addInitScript((inicial) => (window.qaInicial = inicial), qa);
  await p.goto(origin);
  await p.getByText("Sin foto").waitFor();
  return p;
}

test("con Storage lento la foto elegida espera atenuada en el sitio del avatar, con la cámara y «Guardar» apagados; al subir queda «Tu foto» (OL-353)", TOPE, async (t) => {
  const p = await pagina(t, { retrasoStorage: 2000 });
  await p.locator("input[type=file]").setInputFiles({ name: "foto.jpg", mimeType: "image/jpeg", buffer: await fotoGirada(browser) });
  const renglon = p.locator('li[aria-busy="true"]');
  await renglon.locator('img[src^="blob:"]').waitFor();
  assert.equal(await renglon.locator("img").evaluate((e) => getComputedStyle(e).opacity), "0.6");
  assert.match(await renglon.innerText(), /Subiendo…/);
  assert.equal(await p.locator("input[type=file]").isDisabled(), true);
  assert.equal(await p.getByRole("button", { name: "Guardar" }).isDisabled(), true);
  await foto(p, "384-perfil-subiendo");
  await p.getByText("Tu foto").waitFor({ timeout: 15000 });
  assert.equal(await p.locator('[aria-busy="true"]').count(), 0);
  assert.equal(await p.locator("li img").evaluate((e) => getComputedStyle(e).opacity), "1");
  const [subido] = await p.evaluate(() => window.qa.storage);
  assert.match(subido.ruta, /^perfiles\/ana\/foto-[0-9a-f-]{36}\.jpg$/);
  assert.equal(await p.getByRole("button", { name: "Guardar" }).isEnabled(), true);
});

test("si Storage falla, la espera se quita, no queda foto y la cámara vuelve, con el aviso (OL-353)", TOPE, async (t) => {
  const p = await pagina(t, { retrasoStorage: 1000, falloStorage: true });
  await p.locator("input[type=file]").setInputFiles({ name: "foto.jpg", mimeType: "image/jpeg", buffer: await fotoGirada(browser) });
  await p.locator('li[aria-busy="true"] img[src^="blob:"]').waitFor();
  await p.getByRole("alert").waitFor({ timeout: 15000 });
  assert.equal(await p.locator('[aria-busy="true"]').count(), 0);
  assert.equal(await p.locator("li img").count(), 0);
  assert.equal(await p.getByText("Sin foto").count(), 1);
  assert.equal(await p.locator("input[type=file]").isEnabled(), true);
});
