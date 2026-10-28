/**
 * OL-447 (bitácora 479): «Fichas que administra» en la ficha de una persona en Administración. Bundle real (esbuild) de `FichasAdministradas`,
 * `HojaAsignar`, `ui/Hoja`, `ui/Buscador` y `ui/Renglon` con su CSS, en Chrome real vía Playwright a 390×844, con toques del ratón sobre el
 * elemento (nunca `element.click()`). Las acciones del servidor son dobles en memoria: la lista llega «de nuevo del servidor» al asignar o quitar,
 * como tras el `revalidatePath`. No corre con `npm test`; se corre con `npm run test:componentes`.
 * PLAYWRIGHT_MODULE=/ruta/playwright-core/index.mjs node --test este-archivo
 */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../../../../", import.meta.url));
let browser, server, dir, origin;

// Las fichas del doble: un lugar libre, un artista que ya administra «Marcos» y un lugar que la persona ya administra.
const FICHAS = [
  { tipo: "lugar", id: "l-ferro", nombre: "Museo del Ferrocarril", foto: null, ciudad: "San Luis Potosí", clase: "museo", detalle: null, visible: true },
  { tipo: "artista", id: "a-feleal", nombre: "Feleal", foto: null, ciudad: "San Luis Potosí", clase: "musica", detalle: "Cumbia", visible: true, de: ["Marcos"] },
  { tipo: "lugar", id: "l-ache", nombre: "ACHE Galería", foto: null, ciudad: "Oaxaca", clase: "galeria", detalle: null, visible: true },
];

const mocks = {
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link(p){const {href,prefetch,scroll,replace,...r}=p;return React.createElement('a',{href,...r})}",
  "next/navigation": "export function useRouter(){return {refresh(){},push(){},replace(){}}} export function usePathname(){return '/admin/personas/p1'} export function useSearchParams(){return new URLSearchParams()}",
  "next/image": "import React from 'react';export default function Image({quality,sizes,...p}){return React.createElement('img',p)}",
  // Las acciones: en memoria y con su llamada anotada. `window.qa.lenta` deja la respuesta en espera hasta `window.qa.soltar()`.
  "./acciones": `
    const q = () => window.qa;
    const norm = (s) => String(s).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();
    const espera = () => q().lenta ? new Promise((ok) => { q().soltar = ok; }) : Promise.resolve();
    export async function buscarFichas(perfilId, texto) {
      q().llamadas.push(['buscar', texto]);
      const t = norm(texto.trim());
      if (t.length < 2) return { ok: true, fichas: [] };
      return { ok: true, fichas: q().fichas.filter((f) => norm(f.nombre).includes(t)).map(({ de, ...f }) => ({ ...f, suya: q().suyas.has(f.id), otros: (de || [])[0] || null, otros_n: (de || []).length })) };
    }
    export async function asignarFicha(perfilId, tipo, id) {
      q().llamadas.push(['asignar', perfilId, tipo, id]);
      await espera();
      if (q().falla) return { ok: false, error: 'Sin conexión con la base. Intenta de nuevo.' };
      q().suyas.add(id); q().actualizar();
      return { ok: true };
    }
    export async function quitarFicha(perfilId, tipo, id) {
      q().llamadas.push(['quitar', perfilId, tipo, id]);
      q().suyas.delete(id); q().actualizar();
      return { ok: true };
    }`,
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "fichas-administradas-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    loader: { ".png": "file", ".svg": "file", ".woff2": "file" },
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React, { useState } from 'react'; import { createRoot } from 'react-dom/client';
      import FichasAdministradas from './src/app/admin/personas/[id]/FichasAdministradas'; import './src/app/globals.css';
      const fichas = ${JSON.stringify(FICHAS)};
      const suyas = new Set(new URLSearchParams(location.search).has('con') ? ['l-ache'] : []);
      window.qa = { llamadas: [], fichas, suyas, lenta: false, falla: false, actualizar() {} };
      // Lo que el servidor manda tras el revalidatePath: la lista de lo que administra, por nombre.
      function App() {
        const [, setN] = useState(0);
        window.qa.actualizar = () => setN((n) => n + 1);
        const administradas = fichas.filter((f) => suyas.has(f.id)).map(({ de, ...f }) => ({ ...f, slug: null })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
        return <main style={{ padding: 16 }}><FichasAdministradas perfilId="p1" nombre="Lucía" fichas={administradas} /></main>;
      }
      createRoot(document.getElementById('root')).render(<App />);
    `,
    },
    plugins: [
      {
        name: "dobles",
        setup(b) {
          b.onResolve({ filter: /.*/ }, (a) => (a.path in mocks ? { path: a.path, namespace: "mock" } : undefined));
          b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({ contents: mocks[a.path], loader: "jsx", resolveDir: root }));
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

async function nuevaPagina(t, consulta = "") {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  t.after(() => context.close());
  const p = await context.newPage();
  p.setDefaultTimeout(10_000);
  const errores = [];
  p.on("pageerror", (e) => errores.push(e.message));
  t.after(() => assert.deepEqual(errores, []));
  await p.goto(origin + consulta);
  await p.getByRole("heading", { name: "Fichas que administra" }).waitFor();
  return p;
}
/** Un toque real: el ratón baja y sube en el centro del elemento (lo que toque ahí es lo que recibe el toque). */
async function tocar(p, loc) {
  await loc.scrollIntoViewIfNeeded();
  const c = await loc.boundingBox();
  assert.ok(c, "el elemento se ve");
  await p.mouse.click(c.x + c.width / 2, c.y + c.height / 2);
}
const hoja = (p) => p.getByRole("dialog", { name: "Asignar una ficha" });

test("sin fichas: solo el renglón «Asignar una ficha»; la hoja abre con el campo enfocado, sin ✕ hasta escribir y sin listar nada", async (t) => {
  const p = await nuevaPagina(t);
  assert.equal(await p.getByRole("list", { name: "Fichas que administra" }).count(), 0);
  await tocar(p, p.getByRole("button", { name: /Asignar una ficha/ }));
  await hoja(p).waitFor();
  const campo = hoja(p).getByRole("searchbox", { name: "Nombre del lugar o del artista" });
  assert.equal(await campo.evaluate((e) => e === document.activeElement), true, "el campo llega enfocado");
  assert.equal(await hoja(p).getByRole("button", { name: "Borrar la búsqueda" }).count(), 0, "sin texto no hay ✕");
  assert.match(await hoja(p).innerText(), /Escribe el nombre de un lugar o de un artista\./);
  await p.keyboard.type("f");
  await p.waitForTimeout(400);
  assert.equal(await hoja(p).getByRole("list", { name: "Fichas halladas" }).count(), 0, "con una letra no busca");
  assert.equal(await hoja(p).getByRole("button", { name: "Borrar la búsqueda" }).count(), 1, "con texto, la ✕");
});

test("buscar trae lugares y artistas a la vez con qué son y quién los administra; la ✕ limpia", async (t) => {
  const p = await nuevaPagina(t);
  await tocar(p, p.getByRole("button", { name: /Asignar una ficha/ }));
  await p.keyboard.type("fe");
  const lista = hoja(p).getByRole("list", { name: "Fichas halladas" });
  await lista.waitFor();
  const filas = await lista.getByRole("button").allInnerTexts();
  assert.equal(filas.length, 2);
  assert.match(filas.find((x) => x.includes("Feleal")), /Artista · Música · Cumbia · San Luis Potosí[\s\S]*La administra Marcos/);
  assert.match(filas.find((x) => x.includes("Ferrocarril")), /Lugar · Museo · San Luis Potosí[\s\S]*Nadie la administra/);
  await tocar(p, hoja(p).getByRole("button", { name: "Borrar la búsqueda" }));
  assert.equal(await hoja(p).getByRole("searchbox").inputValue(), "");
  await lista.waitFor({ state: "detached" });
});

test("elegir una ficha que otra cuenta administra lo dice y el botón dice lo que pasará; asignar cierra la hoja y la lista la trae con «Quitar»", async (t) => {
  const p = await nuevaPagina(t);
  await tocar(p, p.getByRole("button", { name: /Asignar una ficha/ }));
  await p.keyboard.type("fele");
  await tocar(p, hoja(p).getByRole("button", { name: /Feleal/ }));
  const texto = await hoja(p).innerText();
  assert.match(texto, /La administra Marcos[\s\S]*No se la quitamos a quien ya la administra: las dos cuentas podrán editarla\./);
  assert.equal(texto.match(/Marcos/g).length, 1, "quién la administra se dice una sola vez");
  const boton = hoja(p).getByRole("button", { name: "Asignar Feleal a Lucía" });
  await p.evaluate(() => (window.qa.lenta = true));
  await tocar(p, boton);
  await hoja(p).getByRole("button", { name: "Asignando…" }).waitFor();
  assert.equal(await hoja(p).getByRole("button", { name: "Asignando…" }).isDisabled(), true, "mientras llega, no se toca dos veces");
  await p.evaluate(() => window.qa.soltar());
  await hoja(p).waitFor({ state: "detached" });
  assert.match(await p.getByRole("status").innerText(), /Lucía ya administra Feleal/);
  const lista = p.getByRole("list", { name: "Fichas que administra" });
  assert.match(await lista.innerText(), /Feleal[\s\S]*Artista · Música · Cumbia/);
  assert.equal(await lista.getByRole("button", { name: "Quitar Feleal" }).count(), 1);
  assert.deepEqual((await p.evaluate(() => window.qa.llamadas)).filter((l) => l[0] === "asignar"), [["asignar", "p1", "artista", "a-feleal"]]);
});

test("una ficha que ya administra no se asigna otra vez; escribir otra vez vuelve a la lista; si falla, lo dice en la hoja", async (t) => {
  const p = await nuevaPagina(t, "?con");
  await tocar(p, p.getByRole("button", { name: /Asignar una ficha/ }));
  await p.keyboard.type("ache");
  await tocar(p, hoja(p).getByRole("button", { name: /ACHE Galería/ }));
  const ya = hoja(p).getByRole("button", { name: "Ya la administra Lucía" });
  assert.equal(await ya.isDisabled(), true);
  await hoja(p).getByRole("searchbox").focus();
  await p.keyboard.press("End");
  await p.keyboard.press("Backspace");
  await p.keyboard.press("Backspace");
  await p.keyboard.press("Backspace");
  await p.keyboard.press("Backspace");
  await p.keyboard.type("ferro");
  await hoja(p).getByRole("list", { name: "Fichas halladas" }).waitFor();
  await tocar(p, hoja(p).getByRole("button", { name: /Museo del Ferrocarril/ }));
  await p.evaluate(() => (window.qa.falla = true));
  await tocar(p, hoja(p).getByRole("button", { name: "Asignar Museo del Ferrocarril a Lucía" }));
  assert.match(await hoja(p).getByRole("alert").innerText(), /Sin conexión con la base/);
  assert.equal(await hoja(p).count(), 1, "la hoja sigue abierta para reintentar");
});

test("«Quitar» pide confirmación en una hoja con un solo botón; al confirmar, la ficha sale de la lista", async (t) => {
  const p = await nuevaPagina(t, "?con");
  const lista = p.getByRole("list", { name: "Fichas que administra" });
  assert.match(await lista.innerText(), /ACHE Galería[\s\S]*Lugar · Galería · Oaxaca/);
  // «Quitar» va a la derecha de la ficha, en su misma fila (no debajo: la píldora del panel lleva `grid-area: accion`).
  const ficha = await lista.getByRole("link").boundingBox();
  const quitar = await lista.getByRole("button", { name: "Quitar ACHE Galería" }).boundingBox();
  assert.ok(quitar.x >= ficha.x + ficha.width && quitar.y < ficha.y + ficha.height && quitar.y + quitar.height > ficha.y, `«Quitar» junto a la ficha: ${JSON.stringify({ ficha, quitar })}`);
  await tocar(p, lista.getByRole("button", { name: "Quitar ACHE Galería" }));
  const confirmar = p.getByRole("dialog", { name: "Quitar la ficha" });
  await confirmar.waitFor();
  assert.match(await confirmar.innerText(), /¿Quitar ACHE Galería a Lucía\?[\s\S]*Deja de poder editarla/);
  assert.deepEqual((await confirmar.getByRole("button").allInnerTexts()).filter((x) => x.trim()), ["Quitar la ficha"], "un solo botón (además de la ✕)");
  await tocar(p, confirmar.getByRole("button", { name: "Quitar la ficha" }));
  await confirmar.waitFor({ state: "detached" });
  await lista.waitFor({ state: "detached" });
  assert.match(await p.getByRole("status").innerText(), /Lucía ya no administra ACHE Galería/);
  assert.deepEqual((await p.evaluate(() => window.qa.llamadas)).filter((l) => l[0] === "quitar"), [["quitar", "p1", "lugar", "l-ache"]]);
});
