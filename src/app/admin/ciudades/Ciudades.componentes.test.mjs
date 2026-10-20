/** OL-427 (bitácora 460): Administración › Ciudades con sus componentes reales (la tarjeta de una ciudad con la hoja de «Correr» y la bandeja de
 *  propuestas), su CSS y Chrome real vía Playwright, a 390×844. Las acciones del servidor se sustituyen por unas que anotan con qué se llamaron y
 *  contestan lo que cada prueba pide: así se ve qué manda cada toque. No corre con `npm test`; se corre con `npm run test:componentes`.
 * PLAYWRIGHT_MODULE=/ruta/playwright-core/index.mjs node --test este-archivo */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
let browser, server, dir, origin;

// Las acciones: cada llamada se anota en `window.qa.llamadas` y contesta lo que la prueba dejó en `window.qa.respuestas[nombre]` (o «ok»).
const ACCIONES = `
const responder = async (nombre, args) => {
  window.qa.llamadas.push([nombre, ...args]);
  const r = window.qa.respuestas[nombre];
  if (r === "espera") return new Promise((ok) => (window.qa.soltar = () => ok({ ok: true, href: null })));
  return r ?? (nombre === "aceptarPropuesta" ? { ok: true, href: "/lugares/foro-de-prueba" } : { ok: true });
};
export const crearCorrida = (...a) => responder("crearCorrida", a);
export const cancelarCorrida = (...a) => responder("cancelarCorrida", a);
export const aceptarPropuesta = (...a) => responder("aceptarPropuesta", a);
export const rechazarPropuesta = (...a) => responder("rechazarPropuesta", a);
export const deshacerRechazo = (...a) => responder("deshacerRechazo", a);
`;
const VISTA = (titulo, linea) => ({ que: "Foro · propuesto por la rutina", titulo, linea, fuente: { texto: "sic.example", url: "https://sic.example/1" }, leida: "leída el 18 oct" });
const PROPUESTAS = [
  { id: "p1", tipo: "lugar", fuente: "Búsqueda web", nombre: "Café de prueba", vista: VISTA("Café de prueba", "Calle 1, Oaxaca") },
  { id: "p2", tipo: "lugar", fuente: "Sistema de Información Cultural", nombre: "Foro de prueba", vista: VISTA("Foro de prueba", "Calle 2, Oaxaca") },
  { id: "p3", tipo: "lugar", fuente: "Sistema de Información Cultural", nombre: "Galería de prueba", vista: VISTA("Galería de prueba", "Calle 3, Oaxaca") },
  { id: "p4", tipo: "evento", fuente: "Búsqueda web", nombre: "Noche de prueba", vista: { ...VISTA("Noche de prueba", null), que: "Evento · propuesto por la rutina" } },
];

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "ciudades-componentes-"));
  const mocks = {
    "next/link": "import React from 'react';export const useLinkStatus=()=>({pending:false});export default function Link({children,replace,prefetch,scroll,...p}){return React.createElement('a',p,children)}",
    acciones: ACCIONES,
  };
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    define: { "process.env.NODE_ENV": '"development"' },
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';import './src/app/globals.css';
      import TarjetaCiudad from './src/app/admin/ciudades/TarjetaCiudad';
      import Bandeja from './src/app/admin/ciudades/propuestas/[id]/Bandeja';
      const q = new URLSearchParams(location.search);
      const enCurso = q.has('pendiente') ? { id: 'corrida-1', estado: 'pendiente', texto: 'Pendiente de correr · tope 3,00 USD' } : null;
      const botones = [
        { tipo: 'lugares', texto: enCurso ? enCurso.texto : 'Sin correr', avance: null, enCurso },
        { tipo: 'agendas', texto: 'Corriendo · 0,40 de 3,00 USD', avance: 0.3, enCurso: { id: 'corrida-2', estado: 'corriendo', texto: 'Corriendo · 0,40 de 3,00 USD' } },
        { tipo: 'artistas', texto: 'Sin correr', avance: null, enCurso: null },
      ];
      const vista = q.get('vista');
      createRoot(document.getElementById('root')).render(<main>{vista === 'bandeja'
        ? <Bandeja propuestas={q.has('vacia') ? [] : ${JSON.stringify(PROPUESTAS)}} fuentesConTanda={['Sistema de Información Cultural']} />
        : <TarjetaCiudad slug="queretaro" nombre="Querétaro" estado="detectada" cifras="14 consultas en 30 días · 0 lugares · 0 eventos próximos · 0 artistas" linea="Nunca investigada · detectada el 12 oct" credito="Crédito: 200,00 USD, vence el 11 de noviembre" botones={botones} />}</main>);
    `,
    },
    plugins: [
      {
        name: "acciones",
        setup(b) {
          b.onResolve({ filter: /^(next\/link|\.\/acciones|\.\.\/\.\.\/acciones)$/ }, (a) => ({ path: a.path.startsWith("next/") ? a.path : "acciones", namespace: "mock" }));
          b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({ contents: mocks[a.path], loader: "js", resolveDir: root }));
        },
      },
    ],
  });
  const assets = new Map([
    ["/", ["text/html", '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--fuente-bricolage:Arial}main{display:grid;gap:8px;padding:16px;background:var(--fondo-contenido)}</style><div id="root"></div><script src="/app.js"></script>']],
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

async function abrir(t, consulta = "") {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  t.after(() => context.close());
  await context.addInitScript(() => {
    window.qa = { llamadas: [], respuestas: {} };
  });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  t.after(() => assert.deepEqual(errores, []));
  await page.goto(`${origin}/?${consulta}`);
  await page.locator("main > *").first().waitFor();
  return page;
}
/** Un toque real: al centro de lo que se ve, por coordenadas (nunca `element.click()`). */
async function tocar(page, localizador) {
  await localizador.scrollIntoViewIfNeeded();
  const caja = await localizador.boundingBox();
  assert.ok(caja, "lo que se toca se ve");
  await page.mouse.click(caja.x + caja.width / 2, caja.y + caja.height / 2);
}
const llamadas = (page) => page.evaluate(() => window.qa.llamadas);

test("los tres botones van en el orden del founder y dicen lo que pasó la última vez", async (t) => {
  const page = await abrir(t);
  const botones = page.getByRole("list", { name: "Querétaro" }).getByRole("button");
  assert.deepEqual(await botones.evaluateAll((bs) => bs.map((b) => b.querySelector("b").textContent)), ["Buscar lugares", "Buscar agendas y eventos", "Buscar artistas"]);
  assert.equal(await page.getByText("Detectada", { exact: true }).count(), 1, "la píldora de estado");
  assert.equal(await page.getByRole("progressbar").getAttribute("aria-valuenow"), "30", "la barra de la que corre");
  for (const b of await botones.all()) assert.ok((await b.boundingBox()).height >= 44, "cada botón se toca con el pulgar");
});

test("«Correr» crea la corrida con el tope de la hoja (3,00 por omisión) y la hoja se cierra", async (t) => {
  const page = await abrir(t);
  await tocar(page, page.getByRole("button", { name: /^Buscar lugares/ }));
  const hoja = page.getByRole("dialog", { name: "Buscar lugares en Querétaro" });
  await hoja.waitFor();
  const tope = hoja.getByLabel("Tope de gasto (USD)");
  assert.equal(await tope.inputValue(), "3,00");
  assert.equal(await hoja.getByRole("listitem").count(), 3, "las tres fuentes, en orden");
  assert.match(await hoja.innerText(), /Crédito: 200,00 USD, vence el 11 de noviembre/);
  assert.deepEqual(await llamadas(page), [], "abrir la hoja no corre nada");
  await tocar(page, hoja.getByRole("button", { name: "Correr" }));
  await hoja.waitFor({ state: "detached" });
  assert.deepEqual(await llamadas(page), [["crearCorrida", "queretaro", "lugares", "3,00"]]);
});

test("el tope: la ✕ lo borra y deja el foco; vacío no corre y lo dice; con Intro corre lo escrito", async (t) => {
  const page = await abrir(t);
  await tocar(page, page.getByRole("button", { name: /^Buscar artistas/ }));
  const hoja = page.getByRole("dialog", { name: "Buscar artistas en Querétaro" });
  const tope = hoja.getByLabel("Tope de gasto (USD)");
  await tocar(page, hoja.getByRole("button", { name: "Borrar lo escrito" }));
  assert.equal(await tope.inputValue(), "");
  assert.ok(await tope.evaluate((c) => c === document.activeElement), "el foco sigue en el campo");
  assert.equal(await hoja.getByRole("button", { name: "Borrar lo escrito" }).count(), 0, "sin texto, sin ✕");
  await tocar(page, hoja.getByRole("button", { name: "Correr" }));
  assert.equal(await hoja.getByRole("alert").innerText(), "Escribe el tope en dólares.");
  await tope.fill("80");
  await tocar(page, hoja.getByRole("button", { name: "Correr" }));
  assert.match(await hoja.getByRole("alert").innerText(), /hasta 50 USD/);
  assert.deepEqual(await llamadas(page), [], "un tope que no vale no llega al servidor");
  await tope.fill("2,50");
  await tope.press("Enter");
  await hoja.waitFor({ state: "detached" });
  // El mismo Intro no vuelve a abrir la hoja desde el botón que recupera el foco (la acción de prueba contesta en el acto).
  await page.waitForTimeout(150);
  assert.equal(await page.getByRole("dialog").count(), 0);
  assert.deepEqual(await llamadas(page), [["crearCorrida", "queretaro", "artistas", "2,50"]]);
});

test("si el servidor no la deja, la hoja se queda abierta con la causa", async (t) => {
  const page = await abrir(t);
  await page.evaluate(() => (window.qa.respuestas.crearCorrida = { ok: false, error: "Ya hay una búsqueda así en curso en esta ciudad." }));
  await tocar(page, page.getByRole("button", { name: /^Buscar lugares/ }));
  const hoja = page.getByRole("dialog", { name: "Buscar lugares en Querétaro" });
  await tocar(page, hoja.getByRole("button", { name: "Correr" }));
  await hoja.getByRole("alert").filter({ hasText: "Ya hay una búsqueda así en curso" }).waitFor();
  assert.equal(await hoja.count(), 1);
});

test("con una corrida pendiente, la hoja la dice y deja cancelarla; la que corre solo se mira", async (t) => {
  const page = await abrir(t, "pendiente=1");
  await tocar(page, page.getByRole("button", { name: /^Buscar lugares/ }));
  const hoja = page.getByRole("dialog", { name: "Buscar lugares en Querétaro" });
  assert.equal(await hoja.getByLabel("Tope de gasto (USD)").count(), 0, "sin tope: ya está pendiente");
  assert.match(await hoja.getByRole("status").innerText(), /^Pendiente de correr · tope 3,00 USD\. La corre la rutina con la API/);
  await tocar(page, hoja.getByRole("button", { name: "Cancelar la búsqueda" }));
  await hoja.waitFor({ state: "detached" });
  assert.deepEqual(await llamadas(page), [["cancelarCorrida", "corrida-1"]]);
  await tocar(page, page.getByRole("button", { name: /^Buscar agendas y eventos/ }));
  const corre = page.getByRole("dialog", { name: "Buscar agendas y eventos en Querétaro" });
  assert.deepEqual(await corre.getByRole("button").evaluateAll((bs) => bs.map((b) => b.textContent)), ["", "Cerrar"], "la ✕ y Cerrar: nada se corre ni se cancela desde aquí");
});

test("bandeja: por fuente, «Aceptar las N» solo donde ya hubo una tanda; aceptar deja la línea con «Ver ficha»", async (t) => {
  const page = await abrir(t, "vista=bandeja");
  assert.deepEqual(await page.locator("h2").evaluateAll((hs) => hs.map((h) => h.textContent)), ["Sistema de Información Cultural2", "Búsqueda web2"], "la fuente con tanda, primero");
  assert.equal(await page.getByRole("button", { name: /^Aceptar las/ }).count(), 1);
  assert.equal(await page.getByRole("button", { name: "Aceptar las 2 de esta fuente" }).count(), 1);
  await tocar(page, page.getByRole("listitem").filter({ hasText: "Foro de prueba" }).getByRole("button", { name: "Aceptar" }));
  await page.getByText("Aceptaste Foro de prueba").waitFor();
  assert.equal(await page.getByRole("link", { name: "Ver ficha" }).getAttribute("href"), "/lugares/foro-de-prueba");
  assert.deepEqual(await llamadas(page), [["aceptarPropuesta", "p2"]]);
  assert.equal(await page.getByRole("button", { name: /^Aceptar las/ }).count(), 0, "con una sola por decidir ya no hay «todas»");
});

test("bandeja: rechazar pide el motivo en una hoja; sin motivo no se rechaza; «Deshacer» la devuelve", async (t) => {
  const page = await abrir(t, "vista=bandeja");
  const cafe = page.getByRole("listitem").filter({ hasText: "Café de prueba" });
  await tocar(page, cafe.getByRole("button", { name: "Rechazar" }));
  const hoja = page.getByRole("dialog", { name: "Rechazar Café de prueba" });
  await hoja.waitFor();
  assert.deepEqual(await hoja.getByRole("button").evaluateAll((bs) => bs.map((b) => b.querySelector("span")?.textContent).filter(Boolean)), ["Duplicado", "No es cultural", "Fuera de la ciudad", "Otro"]);
  await page.keyboard.press("Escape");
  await hoja.waitFor({ state: "detached" });
  assert.deepEqual(await llamadas(page), [], "cerrar la hoja no rechaza nada");
  await tocar(page, cafe.getByRole("button", { name: "Rechazar" }));
  await tocar(page, page.getByRole("dialog").getByRole("button", { name: /Duplicado/ }));
  await page.getByText("Rechazaste Café de prueba · duplicado").waitFor();
  assert.deepEqual(await llamadas(page), [["rechazarPropuesta", "p1", "duplicado"]]);
  await tocar(page, page.getByRole("button", { name: "Deshacer" }));
  await page.getByRole("listitem").filter({ hasText: "Café de prueba" }).getByRole("button", { name: "Rechazar" }).waitFor();
  assert.deepEqual((await llamadas(page)).at(-1), ["deshacerRechazo", "p1"]);
});

test("bandeja: «Aceptar las 2» acepta una por una; un error se queda en su tarjeta", async (t) => {
  const page = await abrir(t, "vista=bandeja");
  await tocar(page, page.getByRole("button", { name: "Aceptar las 2 de esta fuente" }));
  await page.getByText("Aceptaste Galería de prueba").waitFor();
  assert.deepEqual(await llamadas(page), [["aceptarPropuesta", "p2"], ["aceptarPropuesta", "p3"]]);
  await page.evaluate(() => (window.qa.respuestas.aceptarPropuesta = { ok: false, error: "Ya está «Café» muy cerca: recházala como duplicado." }));
  const cafe = page.getByRole("listitem").filter({ hasText: "Café de prueba" });
  await tocar(page, cafe.getByRole("button", { name: "Aceptar" }));
  await cafe.getByRole("alert").filter({ hasText: "recházala como duplicado" }).waitFor();
  assert.equal(await cafe.getByRole("button", { name: "Aceptar" }).count(), 1, "la tarjeta sigue para decidir");
});

test("bandeja: un evento aceptado espera a la rutina de agendas; sin propuestas, una frase y nada más", async (t) => {
  const page = await abrir(t, "vista=bandeja");
  await page.evaluate(() => (window.qa.respuestas.aceptarPropuesta = { ok: true, href: null }));
  await tocar(page, page.getByRole("listitem").filter({ hasText: "Noche de prueba" }).getByRole("button", { name: "Aceptar" }));
  await page.getByText("Aceptaste Noche de prueba · se publica con la rutina de agendas").waitFor();
  assert.equal(await page.getByRole("link", { name: "Ver ficha" }).count(), 0, "un evento aceptado no tiene ficha todavía");
  const vacia = await abrir(t, "vista=bandeja&vacia=1");
  assert.equal(await vacia.locator("main").innerText(), "Nada por revisar en esta corrida.");
});
