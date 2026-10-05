/** Prueba de componente de `FilaLugares` (docs/rediseno/50, P5b): la fila de contexto de Lugares con su hoja de Filtros, dentro de la `Cabecera` real
 *  y con sus estilos, en Chrome real a 390×844. Cubre (ajuste del founder, 2026-09-30) que «Solo lo que sigo» solo se ofrece con sesión: con ella,
 *  el bloque «Siguiendo» con su palanca, que al aplicarse pone el chip de la fila con su ✕; sin ella, la hoja trae Tipo y Con eventos, sin el
 *  título «Siguiendo», sin palanca y sin una raya de más. Y (ajuste del founder, 2026-09-30) que lo que se pone o se quita de la fila se nota:
 *  el chip entra con el resorte, el del tipo se anima en su sitio al cambiarlo, y al quitar uno sale antes de quitarse el filtro.
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
const HOY = "2026-09-29";
// Ocho lugares (el umbral de Filtros), de dos tipos; los pares tienen un evento mañana.
const LUGARES = Array.from({ length: 8 }, (_, i) => ({ id: `l${i}`, slug: `l${i}`, nombre: `Lugar ${i}`, tipo: i < 5 ? "museo" : "foro", direccion: null, lat: 22.15, lng: -100.97, portada: null, proximo: null, diasEvento: i % 2 === 0 ? ["2026-09-30"] : [] }));
let browser, server, dir, origin;

const mocks = {
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link(p){return React.createElement('a',p)}",
  "next/navigation": "export const useRouter=()=>({push(){},replace(){}});export const usePathname=()=>'/lugares';export const useSearchParams=()=>new URLSearchParams();",
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "filalugares-componentes-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React, {useState} from 'react';import {createRoot} from 'react-dom/client';
      import FilaLugares from './src/app/lugares/FilaLugares';import Cabecera from './src/components/ui/Cabecera';import './src/app/globals.css';
      const params = new URLSearchParams(location.search);
      window.qa = { cambios: [] };
      const ciudad = { slug: 'san-luis-potosi', nombre: 'San Luis Potosí', centro: { lng: -100.97, lat: 22.14 }, centroConocido: true, zoom: 13, lugares: 8, eventos: 5, zona: 'America/Mexico_City' };
      function App(){
        const [valor,setValor]=useState({ tipo: null, conEventos: null, soloSigo: false });
        return <Cabecera contexto={<FilaLugares ciudad={ciudad} ciudades={[ciudad]} hrefDeCiudad={()=>'/lugares'} lugares={${JSON.stringify(LUGARES)}} hoy='${HOY}' seguidos={['l1']} conSesion={!params.has('sinSesion')} valor={valor} onCambiar={(v)=>{window.qa.cambios.push(v);setValor(v);}} />} />;
      }
      createRoot(document.getElementById('root')).render(<App/>);
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

async function abrir(consulta = "") {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(origin + consulta);
  await page.getByRole("button", { name: "Filtros" }).click();
  return { context, page, dialogo: page.getByRole("dialog", { name: "Filtros" }) };
}
const aplicar = (dialogo) => dialogo.getByRole("button", { name: /^(Ver|Sin) / });

test("Filtros de Lugares con sesión: el bloque «Siguiendo» con su palanca, y lo puesto sale como chip con su ✕", async () => {
  const { context, page, dialogo } = await abrir();
  assert.deepEqual(await dialogo.locator("section h4").allTextContents(), ["Tipo", "Con eventos", "Siguiendo"]);
  await dialogo.getByRole("switch", { name: "Solo lo que sigo" }).click();
  assert.equal(await aplicar(dialogo).innerText(), "Ver 1 lugar", "solo l1 es un lugar que sigo");
  await aplicar(dialogo).click();
  assert.deepEqual(await page.evaluate(() => window.qa.cambios.at(-1)), { tipo: null, conEventos: null, soloSigo: true });
  await page.getByRole("button", { name: "Quitar Solo lo que sigo" }).waitFor();
  await context.close();
});

test("Filtros de Lugares sin sesión: Tipo y Con eventos, sin el título «Siguiendo», sin palanca y sin una raya de más", async () => {
  const { context, page, dialogo } = await abrir("/?sinSesion=1");
  assert.deepEqual(await dialogo.locator("section h4").allTextContents(), ["Tipo", "Con eventos"]);
  assert.equal(await dialogo.getByText("Solo lo que sigo").count(), 0);
  assert.equal(await dialogo.getByRole("switch").count(), 0);
  assert.equal(await dialogo.locator("section").count(), 2, "dos bloques: una sola raya entre ellos");
  await dialogo.getByRole("button", { name: /^Foro/ }).click();
  assert.equal(await aplicar(dialogo).innerText(), "Ver 3 lugares");
  await aplicar(dialogo).click();
  assert.deepEqual(await page.evaluate(() => window.qa.cambios.at(-1)), { tipo: "foro", conEventos: null, soloSigo: false });
  await context.close();
});

/** Lo que anima un chip de la fila (por su nombre accesible): la duración y las propiedades de cada animación en curso. */
const animaciones = (page, nombre) =>
  page.getByRole("button", { name: nombre }).evaluate((e) => e.getAnimations().map((a) => ({ duracion: a.effect.getTiming().duration, propiedades: [...new Set(a.effect.getKeyframes().flatMap((k) => Object.keys(k)))].filter((k) => !["offset", "easing", "composite", "computedOffset"].includes(k)).sort() })));

test("los chips de Lugares entran al ponerse, el del tipo se anima en su sitio al cambiarlo, y al quitar uno sale antes de quitarse el filtro", async () => {
  const { context, page, dialogo } = await abrir();
  await page.waitForTimeout(200);
  await dialogo.getByRole("button", { name: /^Museo/ }).click();
  await dialogo.getByRole("button", { name: "Esta semana" }).click();
  await aplicar(dialogo).click();
  const entra = [{ duracion: 800, propiedades: ["opacity", "transform"] }];
  assert.deepEqual(await animaciones(page, "Quitar Museo"), entra);
  assert.deepEqual(await animaciones(page, "Quitar Con eventos esta semana"), entra);
  await page.waitForTimeout(900);
  // Cambiar el tipo no pone un chip nuevo: el mismo chip se anima en su sitio con su valor.
  await page.getByRole("button", { name: /^Filtros/ }).click();
  await page.getByRole("dialog", { name: "Filtros" }).getByRole("button", { name: /^Foro/ }).click();
  await aplicar(page.getByRole("dialog", { name: "Filtros" })).click();
  assert.deepEqual(await animaciones(page, "Quitar Foro"), entra, "el chip del tipo se anima en su sitio");
  await page.waitForTimeout(900);
  // Quitarlo: primero sale, y solo entonces el filtro deja de estar puesto.
  const antes = await page.evaluate(() => window.qa.cambios.length);
  await page.getByRole("button", { name: "Quitar Foro" }).click();
  assert.equal(await page.evaluate(() => window.qa.cambios.length), antes, "el filtro sigue puesto mientras el chip sale");
  assert.deepEqual(await animaciones(page, "Quitar Foro"), [{ duracion: 366, propiedades: ["marginRight", "opacity", "transform"] }]);
  await page.waitForFunction((n) => window.qa.cambios.length === n + 1, antes);
  assert.deepEqual(await page.evaluate(() => window.qa.cambios.at(-1)), { tipo: null, conEventos: "semana", soloSigo: false });
  await context.close();
});
