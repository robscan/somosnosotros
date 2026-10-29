/**
 * «Falta material» de la semana de Instagram (OL-488, bitácora 520): el componente de verdad (`HojaMaterial`) con fichas inventadas, las acciones
 * del servidor de prueba (lo que piden queda en `window.qa.acciones`) y la subida de prueba (`window.qa.subidas`). Toques reales: el ratón en
 * coordenadas y `elementFromPoint` (que lo de debajo del dedo sea el control).
 *   · la lista: qué falta, su próxima fecha y quién lleva la ficha;
 *   · alguien la lleva: «Pedírselo» pide `pedirMaterial` con su lunes y luego dice «Se lo pedimos hoy» (sin volver a ofrecerlo);
 *   · nadie la lleva: solo «Subir yo»;
 *   · «Subir yo»: «Guardar» dice qué falta hasta que se sube cada hueco; al guardar pide `ponerMaterial` con las dos imágenes y vuelve a la
 *     lista sin esa ficha.
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

const root = fileURLToPath(new URL("../../../", import.meta.url));
let dir, server, browser, origin;
const PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";

const mocks = {
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link({prefetch,replace,scroll,...p}){return React.createElement('a',p)}",
  "next/image": "import React from 'react';export default function Image({quality,priority,fill,...p}){return React.createElement('img',p)}",
  "@/app/admin/instagram/accionesSemana": `
    const apuntar = (nombre, args) => window.qa.acciones.push([nombre, ...args]);
    export async function pedirMaterial(...a) { apuntar('pedirMaterial', a); return { ok: true }; }
    export async function ponerMaterial(...a) { apuntar('ponerMaterial', a); return { ok: true }; }
  `,
  "@/lib/subirFoto": `export async function subirFoto(carpeta, usuario, prefijo, archivo) { window.qa.subidas.push([carpeta, usuario, prefijo, archivo.name]); return { url: '${PIXEL}#' + prefijo }; }`,
};

const FALTA = {
  lunes: "2026-10-05",
  resumen: "1 artista y 1 lugar con fecha se quedaron fuera por falta de foto o portada",
  fichas: [
    { tipo: "artista", id: "a0000000-0000-4000-8000-000000000488", slug: "inigo", nombre: "Íñigo Montalvo", foto: null, falta: ["foto", "portada"], queFalta: "Falta la foto y la portada", otros: null, proxima: "Próxima fecha: dom 11 · Guitarra sola", lleva: "Marcos", puedePedir: true, pedido: null, ficha: "/artistas/inigo" },
    { tipo: "lugar", id: "b0000000-0000-4000-8000-000000000488", slug: "museo", nombre: "Museo Leonora Carrington", foto: null, falta: ["portada"], queFalta: "Falta la portada", otros: null, proxima: "Próxima fecha: sáb 10 · Taller", lleva: null, puedePedir: false, pedido: null, ficha: "/lugares/museo" },
  ],
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "hoja-material-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    define: { "process.env": "{}" },
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: join(root, "src/components/instagram"),
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import HojaMaterial from './HojaMaterial';
      import '../../app/globals.css';
      window.qa = { acciones: [], subidas: [], cambios: 0, cerrada: 0 };
      function App() {
        const [abierta, setAbierta] = React.useState(true);
        return <main><h1>Instagram</h1>{abierta && <HojaMaterial falta={window.FALTA} usuarioId="admin-488" onCerrar={() => { window.qa.cerrada++; setAbierta(false); }} onCambio={() => window.qa.cambios++} />}</main>;
      }
      createRoot(document.getElementById('root')).render(<App />);
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
    ["/app.js", ["text/javascript", await readFile(join(dir, "app.js"))]],
    ["/app.css", ["text/css", await readFile(join(dir, "app.css"))]],
  ]);
  server = createServer((req, res) => {
    const ruta = req.url.split("?")[0];
    if (ruta === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(`<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--fuente-bricolage:Arial}</style><div id="root"></div><script>window.FALTA=${JSON.stringify(FALTA)}</script><script src="/app.js"></script>`);
    }
    const a = assets.get(ruta);
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

async function abrir(t) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  t.after(() => context.close());
  const p = await context.newPage();
  p.setDefaultTimeout(5000);
  const errores = [];
  p.on("pageerror", (e) => errores.push(e.message));
  t.after(() => assert.deepEqual(errores, []));
  await p.goto(origin);
  await p.getByRole("dialog").waitFor();
  return p;
}
async function tocar(p, l) {
  await l.first().evaluate((e) => e.scrollIntoView({ block: "center" }));
  const b = await l.first().boundingBox();
  const x = b.x + b.width / 2;
  const y = b.y + b.height / 2;
  const debajo = await p.evaluate(([px, py]) => document.elementFromPoint(px, py)?.closest("a,button,label")?.textContent ?? null, [x, y]);
  assert.equal(debajo?.replace(/\s+/g, " ").trim(), (await l.first().textContent()).replace(/\s+/g, " ").trim(), "lo que hay bajo el dedo es el control");
  await p.mouse.click(x, y);
}
const hoja = (p) => p.getByRole("dialog");
const qa = (p) => p.evaluate(() => JSON.parse(JSON.stringify(window.qa)));

test("la lista: qué falta, su próxima fecha y quién lleva la ficha", async (t) => {
  const p = await abrir(t);
  const inigo = await hoja(p).locator("li", { hasText: "Íñigo Montalvo" }).innerText();
  assert.match(inigo, /Falta la foto y la portada/);
  assert.match(inigo, /Próxima fecha: dom 11/);
  assert.match(inigo, /La lleva Marcos/);
  assert.match(await hoja(p).locator("li", { hasText: "Museo" }).innerText(), /Nadie lleva la ficha/);
});

test("alguien la lleva: «Pedírselo» pide el aviso con su lunes y ya no se ofrece otra vez", async (t) => {
  const p = await abrir(t);
  await tocar(p, hoja(p).locator("li", { hasText: "Íñigo Montalvo" }).locator("a"));
  await tocar(p, hoja(p).getByRole("button", { name: "Pedírselo" }));
  await hoja(p).getByText(/Se lo pedimos hoy/).waitFor();
  const q = await qa(p);
  assert.deepEqual(q.acciones, [["pedirMaterial", "artista", "a0000000-0000-4000-8000-000000000488", "2026-10-05"]]);
  assert.equal(q.cambios, 1);
  assert.equal(await hoja(p).getByRole("button", { name: "Pedírselo" }).count(), 0);
  assert.equal(await hoja(p).getByRole("button", { name: "Subir yo" }).count(), 1);
});

test("nadie la lleva: solo «Subir yo»", async (t) => {
  const p = await abrir(t);
  await tocar(p, hoja(p).locator("li", { hasText: "Museo" }).locator("a"));
  await hoja(p).getByRole("button", { name: "Subir yo" }).waitFor();
  assert.equal(await hoja(p).getByRole("button", { name: "Pedírselo" }).count(), 0);
  assert.match(await hoja(p).innerText(), /Nadie lleva esta ficha todavía: súbela tú/);
});

test("«Subir yo»: «Guardar» dice qué falta hasta subir cada hueco; al guardar vuelve a la lista sin esa ficha", async (t) => {
  const p = await abrir(t);
  await tocar(p, hoja(p).locator("li", { hasText: "Íñigo Montalvo" }).locator("a"));
  await tocar(p, hoja(p).getByRole("button", { name: "Subir yo" }));
  const guardar = hoja(p).locator("footer button, [class*=pie] button").last();
  assert.equal(await guardar.textContent(), "Falta la foto y la portada");
  assert.equal(await guardar.isDisabled(), true);
  const archivo = { name: "obra.jpg", mimeType: "image/jpeg", buffer: Buffer.from("/9j/4AAQSkZJRgABAQAAAQABAAD/2Q==", "base64") };
  await hoja(p).getByLabel("Elegir la foto").setInputFiles(archivo);
  await hoja(p).getByText("Cambiar la foto").waitFor();
  assert.equal(await guardar.textContent(), "Falta la portada");
  await hoja(p).getByLabel("Elegir la portada").setInputFiles(archivo);
  await hoja(p).getByText("Cambiar la portada").waitFor();
  assert.equal(await guardar.textContent(), "Guardar");
  await tocar(p, guardar);
  await hoja(p).getByText(/Íñigo Montalvo ya tiene su material/).waitFor();
  const q = await qa(p);
  assert.deepEqual(q.subidas.map((s) => s.slice(0, 3)), [["artistas", "admin-488", "foto"], ["artistas", "admin-488", "portada"]]);
  assert.deepEqual(q.acciones, [["ponerMaterial", "artista", "a0000000-0000-4000-8000-000000000488", { foto: `${PIXEL}#foto`, portada: `${PIXEL}#portada` }]]);
  assert.equal(await hoja(p).locator("li", { hasText: "Íñigo Montalvo" }).count(), 0, "ya no está en la lista");
  assert.equal(await hoja(p).locator("li", { hasText: "Museo" }).count(), 1);
});
