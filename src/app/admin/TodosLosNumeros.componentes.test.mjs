/** Prueba de componente de la portada de Administración (OL-494, bitácora 526): «Esta semana en números» (`Indicadores` con `numeros`) y
 *  «Ver todos los números ›» (`TodosLosNumeros`), en Chrome real con toques reales (clics de ratón por coordenadas). Dos por fila a 390 y los
 *  cuatro en una fila a 768, con el desglose debajo de la fila entera; tocar un cuadro abre su desglose y otra vez lo cierra. La hoja pide su
 *  cuerpo al abrirse (una sola vez), deja una entrada propia en el historial que Atrás consume sin salir de la página, se cierra con la ✕, y si
 *  el servidor falla lo dice con «Intentar de nuevo».
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
  "next/link": "import React from 'react';export default function Link(p){return React.createElement('a',p)}",
};
const cuadro = (clave, nombre, valor, base, cambio) => ({ clave, nombre, valor, base, cambio, serie: null, que: `Qué cuenta ${nombre}`, partes: [`${valor} esta semana`], enlace: { texto: "Ver la lista", href: "/admin/personas" } });
const CUADROS = [cuadro("nuevas", "Personas nuevas", 3, "cuentas nuevas, de 80", "▲ 2 más"), cuadro("publicados", "Eventos de la comunidad", 3, "publicados por gente que no es de administración", "▲ 1 más"), cuadro("gestos", "Voy y Me interesa", 18, "de 12 personas", "▲ 5 más"), cuadro("agenda", "Eventos esta semana", 37, "en 18 de 71 lugares", "▲ 2 más")];

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "todoslosnumeros-componentes-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import Indicadores from './src/app/admin/Indicadores';import TodosLosNumeros from './src/app/admin/TodosLosNumeros';
      import plantilla from './src/components/ui/Plantilla.module.css';import './src/app/globals.css';
      const p = new URLSearchParams(location.search);
      window.qa = { pedidos: 0 };
      const abrir = async () => {
        window.qa.pedidos++;
        await new Promise((r) => setTimeout(r, 50));
        if (p.has('falla') && window.qa.pedidos === 1) throw new Error('sin red');
        return { cuerpo: <><h2>Últimos 7 días</h2><p>Los siete de siempre</p></>, fallos: 0 };
      };
      createRoot(document.getElementById('root')).render(
        <main className={plantilla.paginaContenido}>
          <h2>Esta semana en números</h2>
          <Indicadores lista={${JSON.stringify(CUADROS)}} nota="Comparado con la semana anterior" numeros />
          <TodosLosNumeros abrir={abrir} />
        </main>
      );
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
    const a = assets.get(ruta === "/admin" ? "/" : ruta);
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

async function abrir(ancho = 390, consulta = "") {
  const context = await browser.newContext({ viewport: { width: ancho, height: 844 } });
  const page = await context.newPage();
  await page.goto(origin + "/admin" + consulta);
  await page.getByRole("button", { name: /^Personas nuevas/ }).waitFor();
  return { context, page };
}
/** Un toque real: el ratón en el centro de lo que se ve; si algo lo tapa, el toque cae en otra cosa y la prueba lo nota. */
async function toca(page, loc) {
  await loc.scrollIntoViewIfNeeded();
  const caja = await loc.boundingBox();
  assert.ok(caja, "el elemento se ve");
  await page.mouse.click(caja.x + caja.width / 2, caja.y + caja.height / 2);
}
const filas = (page) => page.evaluate(() => new Set([...document.querySelectorAll("button[aria-expanded]")].map((b) => Math.round(b.getBoundingClientRect().top))).size);

test("a 390, dos por fila; tocar un cuadro abre su desglose bajo su fila y otra vez lo cierra", async () => {
  const { context, page } = await abrir(390);
  assert.equal(await filas(page), 2);
  const voy = page.getByRole("button", { name: /^Voy y Me interesa/ });
  await toca(page, voy);
  assert.equal(await voy.getAttribute("aria-expanded"), "true");
  const d = page.locator("#desglose");
  assert.equal(await d.locator("p").textContent(), "Qué cuenta Voy y Me interesa");
  const [cajaVoy, cajaD] = [await voy.boundingBox(), await d.boundingBox()];
  assert.ok(cajaD.y > cajaVoy.y + cajaVoy.height - 1, "el desglose va debajo de la fila del tocado");
  await toca(page, voy);
  assert.equal(await d.count(), 0, "tocarlo otra vez lo cierra");
  await context.close();
});

test("a 768, los cuatro en una fila; con el primero abierto siguen en una fila y el desglose va debajo, a todo lo ancho", async () => {
  const { context, page } = await abrir(768);
  assert.equal(await filas(page), 1);
  await toca(page, page.getByRole("button", { name: /^Personas nuevas/ }));
  assert.equal(await filas(page), 1, "los otros tres no bajan tras el desglose");
  const lista = await page.locator("main > ul").boundingBox();
  const d = await page.locator("#desglose").boundingBox();
  assert.ok(Math.abs(d.width - lista.width) < 2, "el desglose ocupa la fila entera");
  await context.close();
});

test("la hoja: se pide al abrirse, una sola vez; Atrás la cierra sin salir de la página y la ✕ también", async () => {
  const { context, page } = await abrir(390);
  const ver = page.getByRole("button", { name: "Ver todos los números ›" });
  assert.equal(await page.evaluate(() => window.qa.pedidos), 0, "la portada no la pide al entrar");
  await toca(page, ver);
  const hoja = page.getByRole("dialog", { name: "Todos los números" });
  await hoja.getByText("Los siete de siempre").waitFor();
  assert.equal(await page.evaluate(() => history.length), 3, "una entrada propia en el historial");
  await page.goBack();
  await hoja.waitFor({ state: "detached" });
  assert.equal(new URL(page.url()).pathname, "/admin", "Atrás la cierra y se queda en la página");
  await toca(page, ver);
  await hoja.getByText("Los siete de siempre").waitFor();
  await toca(page, hoja.getByRole("button", { name: "Cerrar" }));
  await hoja.waitFor({ state: "detached" });
  assert.equal(await page.evaluate(() => window.qa.pedidos), 1, "lo pedido se guarda mientras la portada está en pantalla");
  assert.equal(await page.evaluate(() => history.state?.somosnosotrosNumeros ?? null), null, "la ✕ consume su entrada");
  await context.close();
});

test("si el servidor falla, lo dice y «Intentar de nuevo» lo vuelve a pedir", async () => {
  const { context, page } = await abrir(390, "?falla");
  await toca(page, page.getByRole("button", { name: "Ver todos los números ›" }));
  const hoja = page.getByRole("dialog", { name: "Todos los números" });
  await hoja.getByRole("alert").waitFor();
  assert.match(await hoja.getByRole("alert").textContent(), /No pudimos leer los números/);
  await toca(page, hoja.getByRole("button", { name: "Intentar de nuevo" }));
  await hoja.getByText("Los siete de siempre").waitFor();
  assert.equal(await page.evaluate(() => window.qa.pedidos), 2);
  await context.close();
});
