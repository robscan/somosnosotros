/** Prueba de componente de `CabeceraLista` (OL-456, bitácora 488): la cabecera de las listas de Administración con las piezas de Lugares del
 *  front, en Chrome real a 390×844 y con toques reales (clics de ratón por coordenadas). El chip de la ciudad abre la hoja de ciudades con «Todas
 *  las ciudades» arriba, cada ciudad con su cuenta y ✓ en la elegida y, en Personas, «Sin ciudad» al final; elegir reemplaza la entrada (filtrar
 *  no es navegar), guarda la ciudad en la galleta de sesión y vuelve a la primera página; «Todas» la borra. Con más de 8 ciudades, el campo con su
 *  ✕. Filtros abre `ui/HojaFiltros` con cada filtro y su cuenta; el botón dice cuántos da y solo él aplica; el filtro puesto sale con su ✕.
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
let browser, server, dir, origin;

const mocks = {
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link(p){return React.createElement('a',p)}",
  "next/navigation": "export const useRouter=()=>({push(u){window.qa.push.push(u)},replace(u,o){window.qa.replace.push([u,o])}});export const usePathname=()=>'/admin/lugares';export const useSearchParams=()=>new URLSearchParams();",
};

const CIUDADES = [
  { slug: "san-luis-potosi", nombre: "San Luis Potosí", n: 74 },
  { slug: "ciudad-de-mexico", nombre: "Ciudad de México", n: 38 },
  { slug: "oaxaca", nombre: "Oaxaca", n: 12 },
];
const MUCHAS = [...CIUDADES, ...["Guadalajara", "Querétaro", "Monterrey", "Morelia", "Zacatecas", "Guanajuato"].map((nombre, i) => ({ slug: nombre.toLowerCase(), nombre, n: 6 - i }))];
const PERSONAS = [{ slug: "san-luis-potosi", nombre: "San Luis Potosí", n: 118 }, { slug: "sin", nombre: "Sin ciudad", n: 64 }];

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "cabeceralista-componentes-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import CabeceraLista from './src/app/admin/CabeceraLista';import './src/app/globals.css';
      const p = new URLSearchParams(location.search);
      window.qa = { push: [], replace: [] };
      const seccion = p.get('seccion') ?? 'lugares';
      const lista = { q: p.get('q'), filtro: p.get('filtro') ?? (seccion === 'personas' ? 'todas' : 'todos'), n: 60, ciudad: p.get('ciudad') };
      const conteos = seccion === 'personas' ? { todas: 182, nuevas: 11, sin_entrar: 52, administracion: 2 } : { todos: 38, destacados: 1, ocultos: 0, sin_fecha: 9, sin_foto: 3, catalogo: 0 };
      const ciudades = seccion === 'personas' ? ${JSON.stringify(PERSONAS)} : p.has('muchas') ? ${JSON.stringify(MUCHAS)} : ${JSON.stringify(CIUDADES)};
      createRoot(document.getElementById('root')).render(<CabeceraLista seccion={seccion} lista={lista} conteos={conteos} ciudades={ciudades} />);
    `,
    },
    plugins: [{
      name: "dobles",
      setup(b) {
        b.onResolve({ filter: /.*/ }, (a) => (a.path in mocks ? { path: a.path, namespace: "mock" } : undefined));
        b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({ contents: mocks[a.path], loader: "js", resolveDir: root }));
      },
    }],
  });
  const assets = new Map([
    ["/", ["text/html", '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--fuente-bricolage:Arial}</style><div id="root"></div><script src="/app.js"></script>']],
    ["/app.js", ["text/javascript", await readFile(join(dir, "app.js"))]],
    ["/app.css", ["text/css", await readFile(join(dir, "app.css"))]],
  ]);
  server = createServer((req, res) => {
    const ruta = req.url.split("?")[0];
    const a = assets.get(ruta.startsWith("/admin/") ? "/" : ruta);
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

async function abrir(consulta = "") {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(origin + "/admin/lugares" + consulta);
  return { context, page };
}
/** Un toque real: el ratón en el centro de lo que se ve; si algo lo tapa, el toque cae en otra cosa y la prueba lo nota. */
async function toca(page, loc) {
  const caja = await loc.boundingBox();
  assert.ok(caja, "el elemento se ve");
  await page.mouse.click(caja.x + caja.width / 2, caja.y + caja.height / 2);
}
const ultimo = (page) => page.evaluate(() => window.qa.replace.at(-1));

test("la ciudad: hoja con «Todas» y la cuenta de cada una; elegir reemplaza, recuerda y vuelve a la primera página", async () => {
  const { context, page } = await abrir("?q=museo");
  const chip = page.getByRole("button", { name: "Todas las ciudades" });
  await toca(page, chip);
  const hoja = page.getByRole("dialog", { name: "Ciudades con lugares" });
  await hoja.waitFor();
  assert.deepEqual(await hoja.locator("li b").allTextContents(), ["Todas las ciudades", "San Luis Potosí", "Ciudad de México", "Oaxaca"]);
  assert.deepEqual(await hoja.locator("li small").allTextContents(), ["124 lugares", "74 lugares", "38 lugares", "12 lugares"]);
  assert.equal(await hoja.locator("[aria-current=true] b").textContent(), "Todas las ciudades", "la elegida lleva su ✓");
  assert.equal(await hoja.getByRole("searchbox").count(), 0, "con pocas ciudades no hay campo");
  await toca(page, hoja.getByRole("button", { name: /Ciudad de México/ }));
  assert.deepEqual(await ultimo(page), ["/admin/lugares?q=museo&ciudad=ciudad-de-mexico", { scroll: false }], "reemplaza, conserva la búsqueda y quita la página");
  assert.equal(await page.evaluate(() => window.qa.push.length), 0, "no apila historial");
  assert.equal(await hoja.count(), 0, "la hoja se cierra");
  assert.match(await page.evaluate(() => document.cookie), /sn_admin_ciudad=ciudad-de-mexico/, "la galleta de sesión la recuerda");
  await context.close();
});

test("con una ciudad: el chip se pone (violeta) y «Todas» la quita y borra la galleta", async () => {
  const { context, page } = await abrir("?ciudad=oaxaca");
  await page.evaluate(() => { document.cookie = "sn_admin_ciudad=oaxaca; path=/admin"; });
  const chip = page.getByRole("button", { name: "Oaxaca" });
  assert.match(await chip.getAttribute("class"), /activo/);
  await toca(page, chip);
  const hoja = page.getByRole("dialog", { name: "Ciudades con lugares" });
  assert.equal(await hoja.locator("[aria-current=true] b").textContent(), "Oaxaca");
  await toca(page, hoja.getByRole("button", { name: /Todas las ciudades/ }));
  assert.deepEqual(await ultimo(page), ["/admin/lugares", { scroll: false }]);
  assert.doesNotMatch(await page.evaluate(() => document.cookie), /sn_admin_ciudad=oaxaca/, "la galleta se borra");
  await context.close();
});

test("con más de 8 ciudades, el campo con su ✕ filtra la hoja", async () => {
  const { context, page } = await abrir("?muchas");
  await toca(page, page.getByRole("button", { name: "Todas las ciudades" }));
  const hoja = page.getByRole("dialog", { name: "Ciudades con lugares" });
  const campo = hoja.getByRole("searchbox", { name: "Nombre de la ciudad" });
  await toca(page, campo);
  await page.keyboard.type("gua", { delay: 15 });
  assert.deepEqual(await hoja.locator("li b").allTextContents(), ["Guadalajara", "Guanajuato"]);
  await toca(page, hoja.getByRole("button", { name: "Borrar la búsqueda" }));
  assert.equal(await hoja.locator("li").count(), 10, "la ✕ vuelve a todas, con «Todas las ciudades»");
  await page.keyboard.type("zzz");
  assert.match(await hoja.textContent(), /Nada con «zzz»/);
  await context.close();
});

test("Personas: «Sin ciudad» al final de la hoja", async () => {
  const { context, page } = await abrir("?seccion=personas");
  await toca(page, page.getByRole("button", { name: "Todas las ciudades" }));
  const hoja = page.getByRole("dialog", { name: "Ciudades con personas" });
  assert.deepEqual(await hoja.locator("li b").allTextContents(), ["Todas las ciudades", "San Luis Potosí", "Sin ciudad"]);
  await toca(page, hoja.getByRole("button", { name: /Sin ciudad/ }));
  assert.deepEqual(await ultimo(page), ["/admin/personas?ciudad=sin", { scroll: false }]);
  await context.close();
});

test("Filtros: cada filtro con su cuenta, el botón dice cuántos y solo él aplica; lo puesto sale con su ✕", async () => {
  const { context, page } = await abrir("?ciudad=ciudad-de-mexico");
  await toca(page, page.getByRole("button", { name: "Filtros" }));
  const hoja = page.getByRole("dialog", { name: "Filtros" });
  assert.deepEqual(await hoja.getByRole("group", { name: "Mostrar" }).getByRole("button").allTextContents(), ["Todos38", "Destacados1", "Ocultos0", "Sin fecha próxima9", "Sin foto3", "Del catálogo0"]);
  await toca(page, hoja.getByRole("button", { name: /^Sin foto/ }));
  assert.equal(await hoja.getByRole("button", { name: "Ver 3 lugares" }).count(), 1);
  await toca(page, hoja.getByRole("button", { name: /^Ocultos/ }));
  assert.ok(await hoja.getByRole("button", { name: "Sin lugares" }).isDisabled(), "sin nada que ver, el botón se apaga y dice por qué");
  await page.keyboard.press("Escape");
  assert.equal(await page.evaluate(() => window.qa.replace.length), 0, "cerrar no aplica nada");
  await toca(page, page.getByRole("button", { name: "Filtros" }));
  await toca(page, hoja.getByRole("button", { name: /^Sin fecha/ }));
  await toca(page, hoja.getByRole("button", { name: "Ver 9 lugares" }));
  assert.deepEqual(await ultimo(page), ["/admin/lugares?filtro=sin_fecha&ciudad=ciudad-de-mexico", { scroll: false }]);
  await context.close();
  const otra = await abrir("?filtro=sin_foto");
  const quitar = otra.page.getByRole("button", { name: "Quitar Sin foto" });
  await quitar.waitFor();
  // La fila se desliza de lado: el filtro puesto queda tras «Todas las ciudades» y Filtros; se desliza hasta él antes de tocarlo.
  await quitar.scrollIntoViewIfNeeded();
  await otra.page.waitForTimeout(300);
  await toca(otra.page, quitar);
  await otra.page.waitForFunction(() => window.qa.replace.length > 0);
  assert.deepEqual(await ultimo(otra.page), ["/admin/lugares", { scroll: false }], "la ✕ quita el filtro");
  await otra.context.close();
});
