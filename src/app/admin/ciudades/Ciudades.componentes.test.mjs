/** OL-427 y OL-432 (bitácoras 460 y 464): Administración › Ciudades con sus componentes reales —la lista general con «Añadir ciudad», las
 *  tarjetas del panel de una ciudad con la hoja de «Correr» y la bandeja—, su CSS y Chrome real vía Playwright, a 390×844. Las acciones del
 *  servidor se sustituyen por unas que anotan con qué se llamaron y contestan lo que cada prueba pide (Mapbox, simulado ahí): así se ve qué manda
 *  cada toque. Toques reales por coordenadas, nunca `element.click()`. No corre con `npm test`; se corre con `npm run test:componentes`.
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

const OAXACA = { nombre: "Oaxaca de Juárez", region: "Oaxaca", pais: "México", codigoPais: "MX", lat: 17.0654, lng: -96.7236 };
const ALTA_OAXACA = {
  desde: null, nombre: "Oaxaca", largo: "Oaxaca de Juárez", region: "Oaxaca, México", lat: 17.0654, lng: -96.7236, zona: "America/Mexico_City",
  hora: { titulo: "Hora del centro de México", detalle: "La misma de San Luis Potosí" }, radioKm: 15, municipios: ["Santa Lucía del Camino", "Santa Cruz Xoxocotlán"], alcaldias: [],
  area: { titulo: "15 km alrededor del centro", detalle: "Cuenta también Santa Lucía del Camino y Santa Cruz Xoxocotlán" }, mapa: null,
};
const ALTA_AGS = { ...ALTA_OAXACA, desde: "aguascalientes", nombre: "Aguascalientes", largo: "Aguascalientes", region: "Aguascalientes, México", lat: 21.88, lng: -102.29, municipios: ["Jesús María"], area: { titulo: "15 km alrededor del centro", detalle: "Cuenta también Jesús María" } };
// Lo que «contesta Mapbox» al escribir: el servidor junta las que ya están y las nuevas (`armarSugerencias`, probada aparte).
const SUGERENCIAS = {
  Oax: [{ tipo: "nueva", clave: "oaxaca", lugar: OAXACA, detalle: "Oaxaca, México" }, { tipo: "nueva", clave: "juchitan", lugar: { ...OAXACA, nombre: "Juchitán de Zaragoza", lat: 16.43 }, detalle: "Oaxaca, México" }],
  San: [{ tipo: "existente", slug: "san-luis-potosi", nombre: "San Luis Potosí", estado: "abierta", pildora: true, detalle: "San Luis Potosí, México" }, { tipo: "nueva", clave: "sjr", lugar: { ...OAXACA, nombre: "San Juan del Río", region: "Querétaro" }, detalle: "Querétaro, México" }],
};

// Las acciones: cada llamada se anota en `window.qa.llamadas` y contesta lo que la prueba dejó en `window.qa.respuestas[nombre]` (o lo de siempre).
const ACCIONES = `
const POR_OMISION = {
  aceptarPropuesta: { ok: true, href: "/lugares/foro-de-prueba" },
  sugerirCiudades: (q) => ({ ok: true, sugerencias: ${JSON.stringify(SUGERENCIAS)}[q.slice(0, 3)] ?? [], sinMapa: false }),
  resolverCiudad: (e) => ({ ok: true, alta: e.slug ? ${JSON.stringify(ALTA_AGS)} : ${JSON.stringify(ALTA_OAXACA)} }),
  abrirCiudad: (d) => ({ ok: true, href: "/admin/ciudades/" + (d.desde ?? "oaxaca") }),
};
const responder = async (nombre, args) => {
  window.qa.llamadas.push([nombre, ...args]);
  const r = window.qa.respuestas[nombre];
  if (r === "espera") return new Promise((ok) => (window.qa.soltar = () => ok({ ok: true, href: null })));
  if (r) return r;
  const d = POR_OMISION[nombre];
  return typeof d === "function" ? d(...args) : (d ?? { ok: true });
};
export const crearCorrida = (...a) => responder("crearCorrida", a);
export const cancelarCorrida = (...a) => responder("cancelarCorrida", a);
export const aceptarPropuesta = (...a) => responder("aceptarPropuesta", a);
export const rechazarPropuesta = (...a) => responder("rechazarPropuesta", a);
export const deshacerRechazo = (...a) => responder("deshacerRechazo", a);
export const sugerirCiudades = (...a) => responder("sugerirCiudades", a);
export const resolverCiudad = (...a) => responder("resolverCiudad", a);
export const abrirCiudad = (...a) => responder("abrirCiudad", a);
export const ocultarCiudad = (...a) => responder("ocultarCiudad", a);
export const mostrarCiudad = (...a) => responder("mostrarCiudad", a);
`;
const NAVEGACION = `
const router = { push: (h) => window.qa.navegaciones.push(h), replace: (h) => window.qa.navegaciones.push(h), refresh: () => {}, back: () => {}, prefetch: () => {} };
export const useRouter = () => router;
export const usePathname = () => "/admin/ciudades";
export const useSearchParams = () => new URLSearchParams();
`;
const VISTA = (titulo, linea) => ({ que: "Foro · propuesto por la rutina", titulo, linea, fuente: { texto: "sic.example", url: "https://sic.example/1" }, leida: "leída el 18 oct" });
const PROPUESTAS = [
  { id: "p1", tipo: "lugar", fuente: "Búsqueda web", nombre: "Café de prueba", vista: VISTA("Café de prueba", "Calle 1, Oaxaca") },
  { id: "p2", tipo: "lugar", fuente: "Sistema de Información Cultural", nombre: "Foro de prueba", vista: VISTA("Foro de prueba", "Calle 2, Oaxaca") },
  { id: "p3", tipo: "lugar", fuente: "Sistema de Información Cultural", nombre: "Galería de prueba", vista: VISTA("Galería de prueba", "Calle 3, Oaxaca") },
  { id: "p4", tipo: "evento", fuente: "Búsqueda web", nombre: "Noche de prueba", vista: { ...VISTA("Noche de prueba", null), que: "Evento · propuesto por la rutina" } },
];
const FILAS = [
  { slug: "san-luis-potosi", nombre: "San Luis Potosí", estado: "abierta", consultas: 125, lugares: 71, eventos: 64, porRevisar: 17, linea: { texto: "Buscando agendas y eventos · 1 de 3 fuentes", alerta: false, avance: 0.3 } },
  { slug: "ciudad-de-mexico", nombre: "Ciudad de México", estado: "abierta", consultas: 12, lugares: 0, eventos: 3, porRevisar: 40, linea: { texto: "Una búsqueda falló y otra llegó al tope", alerta: true, avance: null } },
  { slug: "aguascalientes", nombre: "Aguascalientes", estado: "detectada", consultas: 9, lugares: 1, eventos: 0, porRevisar: 0, linea: null },
  { slug: "san-miguel-de-allende", nombre: "San Miguel de Allende", estado: "abierta", consultas: 31, lugares: 43, eventos: 5, porRevisar: 0, linea: null },
];

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "ciudades-componentes-"));
  const mocks = {
    "next/link": "import React from 'react';export const useLinkStatus=()=>({pending:false});export default function Link({children,replace,prefetch,scroll,...p}){return React.createElement('a',p,children)}",
    "next/navigation": NAVEGACION,
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
      import ListaCiudades from './src/app/admin/ciudades/ListaCiudades';
      import TarjetaBusqueda from './src/app/admin/ciudades/TarjetaBusqueda';
      import Bandeja from './src/app/admin/ciudades/Bandeja';
      import Boton from './src/components/ui/Boton';
      import { BOTONES, lineaBusqueda, siguientePaso, textoRevisar, vezPasada } from './src/lib/ciudadesAdmin';
      import admin from './src/app/admin/admin.module.css';
      import css from './src/app/admin/ciudades/ciudades.module.css';
      const q = new URLSearchParams(location.search);
      const AHORA = new Date('2026-10-21T16:00:00Z');
      const corrida = (c) => ({ id: c.tipo, tipo: 'lugares', ciudad: 'x', parametros: {}, tope_usd: 3, gasto_usd: 0, estado: 'terminada', resumen: {}, creado_en: '2026-10-20T15:00:00Z', inicio: '2026-10-20T15:00:00Z', fin: '2026-10-20T15:10:00Z', propuestas: 0, aceptadas: 0, rechazadas: 0, por_revisar: 0, ...c });
      const CASOS = {
        nueva: { n: 0, b: { lugares: null, agendas: null, artistas: null } },
        cdmx: { n: 4, b: {
          lugares: corrida({ tipo: 'lugares', propuestas: 40, gasto_usd: 1.5, tope_usd: 1.5, resumen: { tope: true, paso: '2 de 3 fuentes', descartados: { de_mas: 12 } } }),
          agendas: corrida({ tipo: 'agendas', estado: 'fallida', gasto_usd: 0.21, resumen: { error: 'Se cortó tres veces seguidas en el mismo paso' } }),
          artistas: null } },
        sanluis: { n: 0, b: {
          lugares: corrida({ tipo: 'lugares', propuestas: 30, rechazadas: 13, gasto_usd: 0.33 }),
          agendas: corrida({ tipo: 'agendas', estado: 'corriendo', gasto_usd: 0.4, fin: null, resumen: { paso: '1 de 3 fuentes', avance: 0.3 } }),
          artistas: corrida({ id: 'p-artistas', tipo: 'artistas', estado: 'pendiente', tope_usd: 2, inicio: null, fin: null }) } },
      };
      function Panel({ caso }) {
        const { n, b } = CASOS[caso];
        const todas = Object.values(b).filter(Boolean);
        const sig = siguientePaso(b, n);
        return <ul className={admin.indicadores + ' ' + css.tablero}>
          {n > 0 && <li className={css.ancha}><div className={admin.indicador + ' ' + css.tarjeta} role="group" aria-label="Por revisar"><b>{n}</b>
            <Boton href="/admin/ciudades/x/propuestas" variante={sig === 'revisar' ? 'primario' : 'secundario'} ancho="contenido" className={css.accion}>{textoRevisar(n)}</Boton></div></li>}
          {BOTONES.map(({ tipo }) => { const r = b[tipo]; return <TarjetaBusqueda key={tipo} slug="ciudad-de-mexico" ciudad="Ciudad de México" tipo={tipo} valor="0" base={null}
            linea={r ? lineaBusqueda(r, todas, AHORA) : null} principal={sig === tipo} pendiente={r?.estado === 'pendiente' ? r.id : null} corre={r?.estado === 'corriendo'}
            credito="Crédito: 197,20 USD, vence el 11 de noviembre" vezPasada={vezPasada(r)} />; })}
        </ul>;
      }
      const vista = q.get('vista');
      createRoot(document.getElementById('root')).render(<main>{vista === 'bandeja'
        ? <Bandeja propuestas={q.has('vacia') ? [] : ${JSON.stringify(PROPUESTAS)}} fuentesConTanda={['Sistema de Información Cultural']} nivel={3} />
        : vista === 'panel' ? <Panel caso={q.get('caso')} />
        : <ListaCiudades filas={${JSON.stringify(FILAS)}} credito="Crédito: 197,20 USD · vence el 11 de noviembre" />}</main>);
    `,
    },
    plugins: [
      {
        name: "mocks",
        setup(b) {
          b.onResolve({ filter: /^(next\/link|next\/navigation|\.\/acciones)$/ }, (a) => ({ path: a.path.startsWith("next/") ? a.path : "acciones", namespace: "mock" }));
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
    window.qa = { llamadas: [], respuestas: {}, navegaciones: [] };
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
/** Un toque real: al centro de lo que se ve, por coordenadas (nunca `element.click()`); falla si algo lo tapa. */
async function tocar(page, localizador) {
  await localizador.scrollIntoViewIfNeeded();
  const caja = await localizador.boundingBox();
  assert.ok(caja, "lo que se toca se ve");
  const x = caja.x + caja.width / 2;
  const y = caja.y + caja.height / 2;
  assert.ok(await localizador.evaluate((el, [x, y]) => el.contains(document.elementFromPoint(x, y)), [x, y]), "nada tapa lo que se toca");
  await page.mouse.click(x, y);
}
const llamadas = (page) => page.evaluate(() => window.qa.llamadas);
const navegaciones = (page) => page.evaluate(() => window.qa.navegaciones);
/** Los botones y enlaces con el fondo del color de acción (el violeta): un solo botón principal por pantalla. */
const violetas = (page) =>
  page.evaluate(() => {
    const prueba = document.createElement("i");
    prueba.style.background = "var(--primario)";
    document.body.append(prueba);
    const violeta = getComputedStyle(prueba).backgroundColor;
    prueba.remove();
    return [...document.querySelectorAll("button, a")].filter((b) => getComputedStyle(b).backgroundColor === violeta).map((b) => b.textContent.trim());
  });

// ---------- la lista general ----------
test("la lista: cada ciudad con su píldora, sus tres números, el violeta de las propuestas y su línea; la detectada con «Abrir» y «Ocultar»", async (t) => {
  const page = await abrir(t);
  const filas = page.getByRole("list", { name: "Ciudades" }).getByRole("listitem");
  assert.equal(await filas.count(), 4);
  const slp = filas.nth(0).getByRole("link");
  assert.equal(await slp.getAttribute("href"), "/admin/ciudades/san-luis-potosi");
  assert.equal(await slp.getByRole("img", { name: "125 consultas en 30 días" }).count(), 1);
  assert.equal(await slp.getByRole("img", { name: "17 propuestas por revisar" }).innerText(), "17");
  assert.equal(await slp.getByRole("progressbar").getAttribute("aria-valuenow"), "30");
  assert.match(await filas.nth(1).innerText(), /Una búsqueda falló y otra llegó al tope/);
  const ags = filas.nth(2);
  assert.equal(await ags.getByRole("link").count(), 0, "una detectada no lleva a un panel: se abre");
  for (const nombre of ["Abrir Aguascalientes", "Ocultar Aguascalientes"]) assert.ok((await ags.getByRole("button", { name: nombre }).boundingBox()).height >= 44, `${nombre} se toca con el pulgar`);
  assert.equal(await page.getByRole("link", { name: /^Corridas/ }).getAttribute("href"), "/admin/corridas");
  assert.deepEqual(await violetas(page), ["Añadir ciudad"], "un solo botón principal: la pastilla flotante");
});

test("«Ocultar» una detectada lo dice en su fila y se deshace en el momento", async (t) => {
  const page = await abrir(t);
  await tocar(page, page.getByRole("button", { name: "Ocultar Aguascalientes" }));
  const fila = page.getByRole("list", { name: "Ciudades" }).getByRole("listitem").nth(2);
  await fila.getByRole("status").filter({ hasText: "No vuelve a salir aunque la consulten" }).waitFor();
  assert.match(await fila.innerText(), /Oculta/);
  assert.deepEqual(await llamadas(page), [["ocultarCiudad", "aguascalientes"]]);
  await tocar(page, fila.getByRole("button", { name: "Deshacer" }));
  await fila.getByRole("button", { name: "Abrir Aguascalientes" }).waitFor();
  assert.deepEqual((await llamadas(page)).at(-1), ["mostrarCiudad", "aguascalientes"]);
});

// ---------- «Añadir ciudad» ----------
test("«Añadir ciudad»: sin escribir propone las detectadas; al escribir, lo que sugiere Mapbox; la ✕ vacía y deja el foco", async (t) => {
  const page = await abrir(t);
  await tocar(page, page.getByRole("button", { name: "Añadir ciudad" }));
  const hoja = page.getByRole("dialog", { name: "Añadir ciudad" });
  await hoja.waitFor();
  assert.deepEqual(await hoja.getByRole("list", { name: "Sugerencias" }).getByRole("button").allInnerTexts(), ["Aguascalientes Detectada\n9 consultas en 30 días"]);
  const campo = hoja.getByRole("searchbox", { name: "Nombre de la ciudad" });
  await tocar(page, campo);
  await page.keyboard.type("Oax");
  await hoja.getByRole("button", { name: /Oaxaca de Juárez/ }).waitFor();
  assert.deepEqual((await llamadas(page)).filter(([n]) => n === "sugerirCiudades"), [["sugerirCiudades", "Oax"]], "una sola petición tras la última tecla");
  assert.deepEqual(await hoja.getByRole("list", { name: "Sugerencias" }).getByRole("button").allInnerTexts(), ["Oaxaca de Juárez\nOaxaca, México", "Juchitán de Zaragoza\nOaxaca, México"]);
  await tocar(page, hoja.getByRole("button", { name: "Borrar la búsqueda" }));
  assert.equal(await campo.inputValue(), "");
  assert.ok(await campo.evaluate((c) => c === document.activeElement), "el foco sigue en el campo");
  await hoja.getByRole("button", { name: /Aguascalientes/ }).waitFor();
});

test("al elegir: el mapa, el nombre corto con «Cambiar», la hora y el área; «Abrir Oaxaca» guarda lo resuelto y entra al panel", async (t) => {
  const page = await abrir(t);
  await tocar(page, page.getByRole("button", { name: "Añadir ciudad" }));
  const hoja = page.getByRole("dialog", { name: "Añadir ciudad" });
  await tocar(page, hoja.getByRole("searchbox", { name: "Nombre de la ciudad" }));
  await page.keyboard.type("Oaxaca");
  await tocar(page, hoja.getByRole("button", { name: /Oaxaca de Juárez/ }));
  const resuelto = hoja.getByRole("list", { name: "Lo que resolvió el sistema" });
  await resuelto.waitFor();
  assert.deepEqual((await llamadas(page)).find(([n]) => n === "resolverCiudad"), ["resolverCiudad", { lugar: { nombre: "Oaxaca de Juárez", region: "Oaxaca", pais: "México", codigoPais: "MX", lat: 17.0654, lng: -96.7236 } }]);
  assert.equal(await hoja.getByRole("img", { name: "Mapa: el centro de Oaxaca de Juárez y 15 km alrededor" }).count(), 1);
  assert.deepEqual(await resuelto.getByRole("listitem").allInnerTexts(), [
    "Oaxaca\nOaxaca de Juárez, Oaxaca, México\nCambiar",
    "Hora del centro de México\nLa misma de San Luis Potosí",
    "15 km alrededor del centro\nCuenta también Santa Lucía del Camino y Santa Cruz Xoxocotlán",
  ]);
  assert.ok((await violetas(page)).includes("Abrir Oaxaca"), "el botón de la hoja es el principal");
  const abrirBoton = hoja.getByRole("button", { name: "Abrir Oaxaca" });
  // «Cambiar»: el campo con su ✕; vacío, el botón dice qué falta y no se toca.
  await tocar(page, resuelto.getByRole("button", { name: "Cambiar" }));
  const nombre = hoja.getByLabel("Nombre en la app");
  assert.equal(await nombre.inputValue(), "Oaxaca");
  assert.match(await hoja.innerText(), /Mapbox la llama «Oaxaca de Juárez»; ese nombre cuenta igual\./);
  await tocar(page, hoja.getByRole("button", { name: "Borrar lo escrito" }));
  assert.equal(await nombre.inputValue(), "");
  assert.ok(await hoja.getByRole("button", { name: "Falta el nombre" }).isDisabled());
  await page.keyboard.type("Oaxaca");
  await tocar(page, abrirBoton);
  await page.waitForFunction(() => window.qa.navegaciones.length > 0);
  assert.deepEqual((await llamadas(page)).at(-1), ["abrirCiudad", { desde: null, nombre: "Oaxaca", largo: "Oaxaca de Juárez", lat: 17.0654, lng: -96.7236, radioKm: 15, municipios: ["Santa Lucía del Camino", "Santa Cruz Xoxocotlán"] }]);
  assert.deepEqual(await navegaciones(page), ["/admin/ciudades/oaxaca"]);
});

test("una ciudad que ya está abierta lleva a su panel; «Abrir» desde la fila de una detectada llena la hoja con ella", async (t) => {
  const page = await abrir(t);
  await tocar(page, page.getByRole("button", { name: "Añadir ciudad" }));
  const hoja = page.getByRole("dialog", { name: "Añadir ciudad" });
  await tocar(page, hoja.getByRole("searchbox", { name: "Nombre de la ciudad" }));
  await page.keyboard.type("San");
  const slp = hoja.getByRole("button", { name: /San Luis Potosí/ });
  await slp.waitFor();
  assert.match(await slp.innerText(), /Abierta/);
  await tocar(page, slp);
  await hoja.waitFor({ state: "detached" });
  assert.deepEqual(await navegaciones(page), ["/admin/ciudades/san-luis-potosi"]);
  assert.equal((await llamadas(page)).filter(([n]) => n === "resolverCiudad").length, 0, "nada que resolver: ya está");

  const otra = await abrir(t);
  await tocar(otra, otra.getByRole("button", { name: "Abrir Aguascalientes" }));
  const llena = otra.getByRole("dialog", { name: "Añadir ciudad" });
  await llena.getByRole("button", { name: "Abrir Aguascalientes" }).waitFor();
  assert.deepEqual((await llamadas(otra)).filter(([n]) => n === "resolverCiudad"), [["resolverCiudad", { slug: "aguascalientes" }]]);
  assert.match(await llena.innerText(), /Cuenta también Jesús María/);
  await tocar(otra, llena.getByRole("button", { name: "Abrir Aguascalientes" }));
  await otra.waitForFunction(() => window.qa.navegaciones.length > 0);
  assert.equal((await llamadas(otra)).at(-1)[1].desde, "aguascalientes", "se abre en su misma fila");
});

test("si el servidor no la deja abrir, la hoja se queda con la causa", async (t) => {
  const page = await abrir(t);
  await page.evaluate(() => (window.qa.respuestas.abrirCiudad = { ok: false, error: "No se pudo abrir. Intenta de nuevo." }));
  await tocar(page, page.getByRole("button", { name: "Abrir Aguascalientes" }));
  const hoja = page.getByRole("dialog", { name: "Añadir ciudad" });
  await tocar(page, await hoja.getByRole("button", { name: "Abrir Aguascalientes" }));
  await hoja.getByRole("alert").filter({ hasText: "No se pudo abrir" }).waitFor();
  assert.deepEqual(await navegaciones(page), []);
});

// ---------- el panel de una ciudad ----------
test("el panel: un solo botón violeta, el siguiente paso (revisar; si algo corre, ninguno; si no, la primera que falta)", async (t) => {
  const cdmx = await abrir(t, "vista=panel&caso=cdmx");
  assert.deepEqual(await violetas(cdmx), ["Revisar las 4"]);
  assert.deepEqual(await cdmx.getByRole("button").allInnerTexts(), ["Buscar lugares", "Buscar agendas y eventos", "Buscar artistas"], "los tres botones siempre (respuesta 4)");
  const sanluis = await abrir(t, "vista=panel&caso=sanluis");
  assert.deepEqual(await violetas(sanluis), [], "mientras una corre, ninguno");
  const nueva = await abrir(t, "vista=panel&caso=nueva");
  assert.deepEqual(await violetas(nueva), ["Buscar lugares"]);
});

test("los cinco estados bajo la raya: «Llegó al tope» y «Falló» con su razón; «Corriendo» con barra y sin botón; «Pendiente» con «Cancelar la búsqueda»", async (t) => {
  const cdmx = await abrir(t, "vista=panel&caso=cdmx");
  const lugares = cdmx.getByRole("group", { name: "Lugares" });
  assert.match(await lugares.innerText(), /Llegó al tope\s*Ayer, 9:10\sam · 40 propuestos · 12 esperan a la siguiente · 1,50\sUSD/);
  assert.match(await lugares.innerText(), /Se detuvo en el tope de 1,50\sUSD en 2 de 3 fuentes; la siguiente sigue donde se quedó\./);
  const agendas = cdmx.getByRole("group", { name: "Eventos próximos" });
  assert.match(await agendas.innerText(), /Falló\s*Ayer, 9:10\sam · 0,21\sUSD\s+Se cortó tres veces seguidas en el mismo paso\./);
  assert.equal(await cdmx.getByRole("group", { name: "Artistas" }).locator("p").count(), 0, "sin correr: solo el número y el botón");
  const sanluis = await abrir(t, "vista=panel&caso=sanluis");
  assert.match(await sanluis.getByRole("group", { name: "Lugares" }).innerText(), /Terminada\s*Ayer, 9:10\sam · 30 propuestos · 13 rechazados · 0,33\sUSD/);
  const corre = sanluis.getByRole("group", { name: "Eventos próximos" });
  assert.match(await corre.innerText(), /Corriendo\s*1 de 3 fuentes · 0,40 de 3,00\sUSD/);
  assert.equal(await corre.getByRole("progressbar").getAttribute("aria-valuenow"), "30");
  assert.equal(await corre.getByRole("button").count(), 0, "lo que corre no se vuelve a correr");
  const espera = sanluis.getByRole("group", { name: "Artistas" });
  assert.match(await espera.innerText(), /Pendiente\s*Espera a la de agendas · tope 2,00\sUSD/);
  await tocar(sanluis, espera.getByRole("button", { name: "Cancelar la búsqueda" }));
  await sanluis.waitForFunction(() => window.qa.llamadas.length > 0);
  assert.deepEqual(await llamadas(sanluis), [["cancelarCorrida", "p-artistas"]]);
});

test("«Buscar lugares» abre la hoja de hoy, que recuerda «La vez pasada…»; «Correr» crea la corrida con el tope de la hoja", async (t) => {
  const page = await abrir(t, "vista=panel&caso=cdmx");
  await tocar(page, page.getByRole("button", { name: "Buscar lugares" }));
  const hoja = page.getByRole("dialog", { name: "Buscar lugares en Ciudad de México" });
  await hoja.waitFor();
  assert.match(await hoja.innerText(), /^Buscar lugares en Ciudad de México\s+La vez pasada se detuvo en el tope de 1,50\sUSD en 2 de 3 fuentes; la siguiente sigue donde se quedó\./);
  assert.equal(await hoja.getByLabel("Tope de gasto (USD)").inputValue(), "3,00");
  assert.equal(await hoja.getByRole("listitem").count(), 3, "las tres fuentes, en orden");
  assert.deepEqual(await llamadas(page), [], "abrir la hoja no corre nada");
  await tocar(page, hoja.getByRole("button", { name: "Correr" }));
  await hoja.waitFor({ state: "detached" });
  assert.deepEqual(await llamadas(page), [["crearCorrida", "ciudad-de-mexico", "lugares", "3,00"]]);
  // Sin «la vez pasada» cuando no falló ni llegó al tope.
  await tocar(page, page.getByRole("button", { name: "Buscar artistas" }));
  assert.doesNotMatch(await page.getByRole("dialog", { name: "Buscar artistas en Ciudad de México" }).innerText(), /La vez pasada/);
});

test("el tope: la ✕ lo borra y deja el foco; vacío no corre y lo dice; con Intro corre lo escrito; un error del servidor deja la hoja", async (t) => {
  const page = await abrir(t, "vista=panel&caso=nueva");
  await tocar(page, page.getByRole("button", { name: "Buscar artistas" }));
  const hoja = page.getByRole("dialog", { name: "Buscar artistas en Ciudad de México" });
  const tope = hoja.getByLabel("Tope de gasto (USD)");
  await tocar(page, hoja.getByRole("button", { name: "Borrar lo escrito" }));
  assert.equal(await tope.inputValue(), "");
  assert.ok(await tope.evaluate((c) => c === document.activeElement), "el foco sigue en el campo");
  await tocar(page, hoja.getByRole("button", { name: "Correr" }));
  assert.equal(await hoja.getByRole("alert").innerText(), "Escribe el tope en dólares.");
  await tope.fill("80");
  await tocar(page, hoja.getByRole("button", { name: "Correr" }));
  assert.match(await hoja.getByRole("alert").innerText(), /hasta 50\sUSD/);
  assert.deepEqual(await llamadas(page), [], "un tope que no vale no llega al servidor");
  await page.evaluate(() => (window.qa.respuestas.crearCorrida = { ok: false, error: "Ya hay una búsqueda así en curso en esta ciudad." }));
  await tope.fill("2,50");
  await tope.press("Enter");
  await hoja.getByRole("alert").filter({ hasText: "Ya hay una búsqueda así en curso" }).waitFor();
  assert.deepEqual(await llamadas(page), [["crearCorrida", "ciudad-de-mexico", "artistas", "2,50"]]);
});

// ---------- la bandeja ----------
test("bandeja: por fuente bajo su búsqueda, «Aceptar las N» solo donde ya hubo una tanda; aceptar deja la línea con «Ver ficha»", async (t) => {
  const page = await abrir(t, "vista=bandeja");
  assert.deepEqual(await page.locator("h3").evaluateAll((hs) => hs.map((h) => h.textContent)), ["Sistema de Información Cultural2", "Búsqueda web2"], "la fuente con tanda, primero");
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

test("bandeja: un evento sin punto no se publica y lo dice en su tarjeta; aceptado, «Ver ficha» lleva a él; sin propuestas, una frase", async (t) => {
  const page = await abrir(t, "vista=bandeja");
  const noche = page.getByRole("listitem").filter({ hasText: "Noche de prueba" });
  const sinPunto = "No se publicó: «Foro Fantasma» no está en el directorio y el mapa no lo encuentra en San Luis Potosí. Recházala o da de alta el lugar.";
  await page.evaluate((error) => (window.qa.respuestas.aceptarPropuesta = { ok: false, error }), sinPunto);
  await tocar(page, noche.getByRole("button", { name: "Aceptar" }));
  await noche.getByRole("alert").filter({ hasText: "no está en el directorio" }).waitFor();
  await page.evaluate(() => (window.qa.respuestas.aceptarPropuesta = { ok: true, href: "/eventos/noche-de-prueba" }));
  await tocar(page, noche.getByRole("button", { name: "Aceptar" }));
  await page.getByText("Aceptaste Noche de prueba", { exact: true }).waitFor();
  assert.equal(await page.getByRole("link", { name: "Ver ficha" }).getAttribute("href"), "/eventos/noche-de-prueba");
  const vacia = await abrir(t, "vista=bandeja&vacia=1");
  assert.equal(await vacia.locator("main").innerText(), "Nada por revisar en esta corrida.");
});
