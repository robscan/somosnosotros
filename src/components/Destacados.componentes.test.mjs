/** Los carriles de Inicio con las tarjetas que firmó el founder el 2026-10-10 (prototipo `docs/rediseno/prototipos/inicio-tarjetas.html`,
 *  «Firmada»; bitácora 398): la de un evento (OL-370, grande y mediana), la de un artista en «Artistas destacadxs» (E9, OL-372) y el avatar de
 *  «Lugares de la semana» y «Artistas de la semana» (E5, OL-372), con sus esqueletos; ninguna lleva botón. Y el carril vacío, que no deja
 *  hueco. Con lo firmado el 2026-10-12 (OL-382; prototipo `inicio-propuestas.html`, «Firmada»; bitácora 408): la XL del carril estelar (D2), el
 *  título completo tal cual (T1) en tres líneas (T2), el marcador «Te interesa» arriba a la izquierda (I1), cuándo antes que el lugar (F1) y el
 *  avatar de 88 con el nombre en dos líneas (N). Con `FUENTE=<archivo .woff2 de Bricolage>` se mide con la letra de la app (dónde se corta un título); la CI usa Arial.
 * PLAYWRIGHT_MODULE=/ruta/playwright-core/index.mjs CHROME_EXECUTABLE=/ruta/chromium node --test este-archivo
 * (no corre con `npm test`, que solo toma `.test.ts`, como las demás `.componentes.test.mjs` del repo). */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../", import.meta.url));
let dir, server, browser, origin;

const mocks = {
  // La selección/fallo de Next/Image se prueba con el componente real en Imagen.componentes.
  "next/image": "import React from 'react';export default function Image({quality,...p}){return React.createElement('img',p)}",
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link(p){return React.createElement('a',p)}",
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "destacados-componentes-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import Destacados from './src/components/Destacados';import CarrilEsqueleto from './src/components/CarrilEsqueleto';import './src/app/globals.css';

      // Una tarjeta de evento con cartel; los cambios pisan lo que haga falta (sin foto, hoy, un sitio largo…).
      function tarjeta(id, van, cambios) { return { id, href: '/eventos/' + id, foto: '/cartel.jpg', titulo: 'Evento ' + id, detalle: 'vie 10 de oct · 19:00', sitio: 'Teatro de la Paz', van, cuando: true, ...cambios }; }
      // OL-370: la tarjeta firmada de Inicio (prototipo inicio-tarjetas.html, «Firmada»). El sello y la línea de cuándo llegan hechos, como los arma
      // tarjetaDeInicio en el servidor; la última es una que «Tus planes» guardó en el teléfono antes de OL-370, sin sello ni título corto.
      const sello = (mes, dia, flecha = null) => ({ mes, dia, flecha, texto: dia + ' de ' + mes });
      const firmadas = [
        tarjeta('ev-kopk', 1, { titulo: 'Presentación de Kopk Poj: el aliento de la montaña', corto: 'Presentación de Kopk Poj', clase: 'Evento', detalle: 'hoy · 13:00', sitio: 'Centro de las Artes de San Luis Potosí Centenario (CEART)', hoy: true, selloFecha: sello('oct', '10') }),
        tarjeta('ev-interesa', 3, { titulo: 'Tributo a The Beatles con Help!', corto: 'Tributo a The Beatles con Help!', clase: 'Evento', detalle: 'hoy · 20:00', sitio: 'Cineteca Alameda', hoy: true, selloFecha: sello('oct', '10') }),
        // OL-375: festival, expo y taller llevan la portada del sistema, con los colores de su cartel (los del prototipo: el laboratorio, olivo;
        // Cinema, el rojo del cartel de su próximo acto; la mostaza de «Una vez más»).
        tarjeta('ev-taller', 1, { titulo: 'Laboratorio de exploración sonora: escucha activa', corto: 'Laboratorio de exploración sonora', clase: 'Taller', parte: 'Sesión 1 de 4', detalle: 'hoy · 17:00', sitio: 'Aurora Co-Lab', hoy: true, selloFecha: sello('oct', '10'), colores: ['#060605', '#3e3f23', '#181817', '#181817'] }),
        tarjeta('ev-festival', 0, { titulo: 'CINEMA: XV Festival de Cine México-Alemania', corto: 'CINEMA', clase: 'Festival', detalle: 'Hasta el sáb 24 de oct', sitio: 'Varias sedes', sinVoy: true, selloFecha: sello('oct', '24', 'antes'), colores: ['#280a09', '#c61b17', '#3c3c93', '#575456'] }),
        tarjeta('ev-expo', 0, { titulo: 'Un mundo para mí', corto: 'Un mundo para mí', clase: 'Exposición', detalle: 'Del 12 de oct al 15 de nov', sitio: 'MUNI Museo Universitario UASLP', sinVoy: true, selloFecha: sello('oct', '12', 'despues'), colores: ['#312d08', '#e3cb00', '#d52713', '#a09f9f'] }),
        tarjeta('ev-largo', 0, { titulo: 'Día Nacional de las Cactáceas en el Jardín Botánico El Izotal', corto: 'Día Nacional de las Cactáceas en el Jardín Botánico El Izotal', clase: 'Evento', detalle: 'hoy · 09:00', sitio: 'Jardín Botánico El Izotal', hoy: true, selloFecha: sello('oct', '10') }),
        tarjeta('ev-sin-cartel', 2, { titulo: 'Taller de cartonería para Xantolo', corto: 'Taller de cartonería para Xantolo', foto: null, clase: 'Taller', parte: 'Sesión 2 de 3', detalle: 'mar 13 de oct · 19:00', sitio: 'Casa de Cultura del Barrio de San Miguelito', selloFecha: sello('oct', '13') }),
        // P7: un evento sin ninguna imagen.
        tarjeta('ev-sin-imagen', 2, { titulo: 'Primer recital musical de otoño de la Academia Inspiratio', corto: 'Primer recital musical de otoño de la Academia Inspiratio', foto: null, clase: 'Evento', parte: 'Día 2 de 3', detalle: 'mar 13 de oct · 19:00', sitio: 'Casa de Cultura del Barrio de San Miguelito', selloFecha: sello('oct', '13') }),
        tarjeta('ev-guardada', 0, { titulo: 'DESIERTO: Observación y Espacio', clase: 'Evento', detalle: 'mié 21 de oct · 20:00', sitio: 'Aether', inicio: '2026-10-22T02:00:00Z', fin: null, zona: 'America/Mexico_City' }),
      ];
      // Kopk Poj: «Voy» (no se dice: va su chip de cuántos van); el tributo, el taller sin cartel y el recital: «Te interesa» (el marcador, OL-382).
      const decisionFirmadas = (id) => (id === 'ev-kopk' ? 'voy' : id === 'ev-interesa' || id === 'ev-sin-cartel' || id === 'ev-sin-imagen' ? 'me_interesa' : null);
      // OL-375, vecinas distintas: tres expos con el mismo cartel café (las de Friedeberg), una con cartel entre la segunda y la tercera de otra tira.
      const cafe = ['#0e0e0e', '#9b6a45', '#5b3633', '#3d3b3a'];
      const friedeberg = ['hilaridad', 'lineas', 'privacidad'].map((id) => tarjeta('ex-' + id, 0, { corto: 'Expo ' + id, clase: 'Exposición', sinVoy: true, selloFecha: sello('feb', '20', 'antes'), colores: cafe }));

      // OL-372: «Artistas destacadxs» (E9) como los arma tarjetaArtistaDeInicio en el servidor: la novedad, de hace una hora (vigente); la fecha, ya dicha.
      const reciente = new Date(Date.now() - 3600000).toISOString();
      const video = { novedad_id: 'n-video', proveedor: 'youtube', creado_en: reciente };
      const audio = { novedad_id: 'n-audio', proveedor: 'soundcloud', creado_en: reciente };
      const artista = (id, cambios) => ({ id, href: '/artistas/' + id, foto: '/foto.jpg', titulo: 'Artista ' + id, detalle: 'Música · Solista', van: 0, disciplina: 'Música', ...cambios });
      const destacadxs = [
        artista('a-markos', { titulo: 'Markosblues', genero: 'jazz, blues y soul', novedad: video, href: '/artistas/a-markos?novedad=n-video' }),
        artista('a-leon', { titulo: 'Un León Marinero', genero: 'folk y canción de autor', novedad: audio, detalle: 'jue 15 de oct · 19:00', cuando: true }),
        artista('a-largo', { titulo: 'Orquesta Sinfónica de San Luis Potosí y su coro de cámara', genero: 'Música académica y clásica', detalle: 'hoy · 18:00', cuando: true }),
        artista('a-sin-foto', { titulo: 'Abril Merlot', foto: null, genero: 'Música académica y clásica' }),
        artista('a-por-completar', { titulo: 'Sin ficha completa', disciplina: undefined, detalle: 'Ficha por completar' }),
      ];
      // OL-372: los avatares (E5). Un lugar sin foto y uno de nombre largo; un artista con «Nuevo video» y otro con «Nuevo audio».
      const lugar = (id, cambios) => ({ id, href: '/lugares/' + id, foto: '/foto.jpg', titulo: 'Lugar ' + id, detalle: 'En curso', van: 0, cuando: true, ...cambios });
      const lugares = [lugar('l-paz', { titulo: 'Teatro de la Paz' }), lugar('l-largo', { titulo: 'Casa de Cultura del Barrio de San Miguelito', detalle: 'mañana · 19:30' }), lugar('l-sin-foto', { titulo: 'Aether', foto: null }), lugar('l-muni', { titulo: 'MUNI' }), lugar('l-ache', { titulo: 'ACHE Galería' }), lugar('l-mascara', { titulo: 'Museo Nacional de la Máscara' })];
      const semana = [
        artista('s-video', { titulo: 'Denisse Hervert', foto: null, novedad: video, href: '/artistas/s-video?novedad=n-video', detalle: 'Hoy · 16:00', cuando: true }),
        artista('s-audio', { titulo: 'Abril Merlot', novedad: audio, detalle: 'mañana · 19:30', cuando: true }),
        artista('s-nada', { titulo: '0Backside0', detalle: 'En curso', cuando: true }),
      ];

      function App() {
        return React.createElement(React.Fragment, null,
          React.createElement(Destacados, { tarjetas: firmadas, forma: 'grande', encabezado: 'Carril firmado', memoria: 'm14', estadoDe: decisionFirmadas }),
          React.createElement(Destacados, { tarjetas: [...firmadas.slice(0, 3), firmadas[5]], forma: 'mediana', encabezado: 'Carril firmado mediano', memoria: 'm16', estadoDe: decisionFirmadas }),
          React.createElement(Destacados, { tarjetas: [tarjeta('ev-sola', 0, { corto: 'Sola', clase: 'Evento', selloFecha: sello('oct', '11') })], forma: 'grande', encabezado: 'Carril firmado solo', memoria: 'm15' }),
          React.createElement(Destacados, { tarjetas: friedeberg, forma: 'grande', encabezado: 'Carril vecinas', memoria: 'm20' }),
          React.createElement(Destacados, { tarjetas: [friedeberg[0], tarjeta('ev-entre', 0, { corto: 'Con cartel', clase: 'Evento', selloFecha: sello('oct', '11') }), friedeberg[1]], forma: 'grande', encabezado: 'Carril vecinas separadas', memoria: 'm21' }),
          React.createElement(Destacados, { tarjetas: [], forma: 'mediana', encabezado: 'Carril vacio', memoria: 'm12' }),
          React.createElement(Destacados, { tarjetas: destacadxs, forma: 'artista', encabezado: 'Artistas destacadxs', memoria: 'm17', verTodos: { href: '/artistas', etiqueta: 'Ver artistas' } }),
          React.createElement(Destacados, { tarjetas: lugares, forma: 'avatar', encabezado: 'Lugares de la semana', memoria: 'm18', verTodos: { href: '/lugares', etiqueta: 'Ver lugares' } }),
          React.createElement(Destacados, { tarjetas: semana, forma: 'avatar', encabezado: 'Artistas de la semana', memoria: 'm19', verTodos: { href: '/artistas', etiqueta: 'Ver artistas' } }),
          // OL-382 (D2): el carril estelar, con la tarjeta XL.
          React.createElement(Destacados, { tarjetas: firmadas, forma: 'xl', encabezado: 'Carril firmado XL', memoria: 'm22', estadoDe: decisionFirmadas }),
          // Los esqueletos de carga de Inicio: los de eventos (OL-370), grande y mediano, los de artistas y avatares (OL-372) y el XL (OL-382).
          React.createElement('div', { id: 'esqueletos' }, ...['grande', 'mediana', 'artista', 'avatar', 'xl'].map((forma) => React.createElement(CarrilEsqueleto, { key: forma, forma }))),
        );
      }
      createRoot(document.getElementById('root')).render(React.createElement(App));
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
  // Con `FUENTE=<archivo .woff2 de Bricolage>` (el de `.next/static/media` tras compilar) la tarjeta se mide con la letra de la app: lo que depende de
  // ella (dónde se corta un título) solo se comprueba así; la CI usa Arial.
  const fuente = process.env.FUENTE ? await readFile(process.env.FUENTE) : null;
  const assets = new Map([
    ["/", ["text/html", `<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>${fuente ? "@font-face{font-family:Bricolage;src:url(/bricolage.woff2) format('woff2');font-weight:200 800;font-stretch:75% 100%}:root{--fuente-bricolage:Bricolage}" : ":root{--fuente-bricolage:Arial}"}</style><div id="root"></div><script src="/app.js"></script>`]],
    ...(fuente ? [["/bricolage.woff2", ["font/woff2", fuente]]] : []),
    ["/app.js", ["text/javascript", await readFile(join(dir, "app.js"))]],
    ["/app.css", ["text/css", await readFile(join(dir, "app.css"))]],
  ]);
  server = createServer((req, res) => {
    const a = assets.get(req.url);
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

async function pagina(t, ancho = 390) {
  const context = await browser.newContext({ viewport: { width: ancho, height: 844 }, reducedMotion: "reduce" });
  t.after(() => context.close());
  const p = await context.newPage();
  p.setDefaultTimeout(5000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  t.after(() => assert.deepEqual(errors, []));
  await p.goto(origin);
  await p.getByRole("heading", { name: "Carril firmado", exact: true }).waitFor();
  return p;
}

const seccion = (p, titulo) => p.locator("section", { has: p.getByRole("heading", { name: titulo, exact: true }) });

test("un carril vacío no deja hueco: se recoge a alto 0 y no se oye", async (t) => {
  const p = await pagina(t);
  await p.waitForFunction(() => document.querySelector('[aria-hidden="true"]') !== null);
  const alto = await p.locator("div[aria-hidden='true']").first().evaluate((d) => Math.round(d.getBoundingClientRect().height));
  assert.equal(alto, 0);
});

// OL-370: la tarjeta de evento firmada de Inicio (prototipo `docs/rediseno/prototipos/inicio-tarjetas.html`, «Firmada»; bitácora 398).
/** La tarjeta de un carril (hay ids repetidos entre el grande y el mediano). */
const firmada = (p, carril, id) => seccion(p, carril).locator(`a[href="/eventos/${id}"]`);
const caja = (r) => [Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10];

test("firmada: el cartel entero en 4:5, XL+ 280×350, grande 165×206 y mediana 132×165; desde 1048, 322,4×403, 190×237,5 y 152×190", async (t) => {
  const p = await pagina(t);
  const portada = (pg, carril, id) => firmada(pg, carril, id).evaluate((a) => a.firstElementChild.getBoundingClientRect().toJSON());
  assert.deepEqual(caja(await portada(p, "Carril firmado XL", "ev-kopk")), [280, 350], "OL-382 (D2), XL+ desde OL-387: la XL del carril estelar");
  assert.deepEqual(caja(await portada(p, "Carril firmado", "ev-kopk")), [165, 206.3]);
  assert.deepEqual(caja(await portada(p, "Carril firmado mediano", "ev-kopk")), [132, 165]);
  assert.deepEqual(caja(await portada(p, "Carril firmado", "ev-sin-imagen")), [165, 206.3], "sin cartel, la portada mide lo mismo");
  assert.deepEqual(caja(await portada(p, "Carril firmado XL", "ev-sin-imagen")), [280, 350], "sin cartel, la XL también");
  const ancha = await pagina(t, 1280);
  assert.deepEqual(caja(await portada(ancha, "Carril firmado XL", "ev-kopk")), [322.4, 403]);
  assert.deepEqual(caja(await portada(ancha, "Carril firmado", "ev-kopk")), [190, 237.5]);
  assert.deepEqual(caja(await portada(ancha, "Carril firmado mediano", "ev-kopk")), [152, 190]);
  // Una sola tarjeta no se estira a lo ancho.
  assert.equal(await firmada(p, "Carril firmado solo", "ev-sola").evaluate((a) => Math.round(a.getBoundingClientRect().width)), 165);
});

test("firmada: sin botón de «Voy»; todo es el enlace a la ficha", async (t) => {
  const p = await pagina(t);
  for (const carril of ["Carril firmado", "Carril firmado mediano", "Carril firmado solo"]) assert.equal(await seccion(p, carril).locator("button").count(), 0, carril);
  assert.equal(await seccion(p, "Carril firmado").locator("li > :not(a)").count(), 0, "cada tarjeta es solo su enlace");
});

test("firmada: el sello de fecha va arriba a la derecha (8 px), con el mes en violeta y el día en negro, y tocarlo abre la ficha", async (t) => {
  const p = await pagina(t);
  const enlace = firmada(p, "Carril firmado", "ev-kopk");
  await enlace.scrollIntoViewIfNeeded();
  const m = await enlace.evaluate((a) => {
    const c = a.firstElementChild.getBoundingClientRect();
    const s = a.querySelector("span[title]");
    const r = s.getBoundingClientRect();
    const mes = s.querySelector("small"), dia = s.querySelector("b");
    const centro = [r.left + r.width / 2, r.top + r.height / 2];
    return {
      derecha: Math.round(c.right - r.right), arriba: Math.round(r.top - c.top), ancho: r.width, alto: Math.round(r.height),
      mes: [mes.textContent, getComputedStyle(mes).color, getComputedStyle(mes).fontWeight], dia: [dia.textContent, getComputedStyle(dia).color, getComputedStyle(dia).fontSize],
      fondo: getComputedStyle(s).backgroundColor, sombra: getComputedStyle(s).boxShadow !== "none", bajoElDedo: document.elementFromPoint(...centro)?.closest("a") === a,
    };
  });
  assert.deepEqual([m.derecha, m.arriba], [8, 8], "arriba a la derecha, donde estaba el botón");
  assert.ok(m.ancho >= 40, "40 de ancho como mínimo: " + m.ancho);
  assert.deepEqual(m.mes, ["oct", "rgb(109, 52, 200)", "700"], "el mes en --primario, en peso 700");
  assert.deepEqual(m.dia, ["10", "rgb(26, 26, 26)", "26px"], "el día grande, en negro");
  assert.equal(m.fondo, "rgba(255, 255, 255, 0.92)", "--vidrio");
  assert.ok(m.sombra);
  assert.equal(m.bajoElDedo, true, "nada encima: el centro del sello es el enlace");
  // Un rango entre meses: «→ 24» si ya empezó (la flecha antes) y «12 →» si no (después). Del mismo mes, «16–18».
  const orden = (id) => firmada(p, "Carril firmado", id).locator("span[title] b").evaluate((b) => [...b.childNodes].map((n) => (n.nodeType === 3 ? n.textContent : n.nodeName.toLowerCase())));
  assert.deepEqual(await orden("ev-festival"), ["svg", "24"]);
  assert.deepEqual(await orden("ev-expo"), ["12", "svg"]);
  // La tarjeta guardada en el teléfono, sin sello, lo calcula con sus fechas y su zona: el 21 a las 20:00 en San Luis Potosí.
  assert.deepEqual(await firmada(p, "Carril firmado", "ev-guardada").locator("span[title]").evaluate((s) => [s.querySelector("small").textContent, s.querySelector("b").textContent]), ["oct", "21"]);
});

test("firmada: un solo chip abajo a la izquierda, cuántos van, en vidrio; «Vas» no se dice", async (t) => {
  const p = await pagina(t);
  const chip = (id, texto) =>
    firmada(p, "Carril firmado", id).evaluate((a, texto) => {
      const c = a.firstElementChild.getBoundingClientRect();
      const s = [...a.querySelectorAll("span")].find((x) => x.textContent === texto && !x.children.length);
      if (!s) return null;
      const r = s.getBoundingClientRect();
      return { izquierda: Math.round(r.left - c.left), abajo: Math.round(c.bottom - r.bottom), fondo: getComputedStyle(s).backgroundColor, color: getComputedStyle(s).color };
    }, texto);
  // OL-382 (I1): «Te interesa» ya no es un chip (es el marcador arriba a la izquierda: la prueba siguiente); el chip de cuántos van sigue.
  assert.equal(await chip("ev-interesa", "Te interesa"), null, "«Te interesa» ya no es chip");
  const van = await chip("ev-interesa", "3 van");
  assert.deepEqual([van.izquierda, van.abajo, van.fondo, van.color], [8, 8, "rgba(255, 255, 255, 0.92)", "rgb(26, 26, 26)"]);
  // OL-375: en la portada del sistema el chip va en la zona del título, solo en su renglón, a 12 del borde como el título (lo mide la prueba de la
  // portada); el mismo vidrio.
  const taller = await chip("ev-taller", "1 va");
  assert.deepEqual([taller.izquierda, taller.fondo, taller.color], [12, "rgba(255, 255, 255, 0.92)", "rgb(26, 26, 26)"]);
  // A lo que vas: su chip de cuántos van, nunca «Vas» a la vista; el nombre del enlace sí lo dice.
  assert.ok(await chip("ev-kopk", "1 va"));
  assert.doesNotMatch(await firmada(p, "Carril firmado", "ev-kopk").innerText(), /\bVas\b/);
  assert.equal(await firmada(p, "Carril firmado", "ev-kopk").getAttribute("aria-label"), "Presentación de Kopk Poj: el aliento de la montaña. hoy · 13:00. Centro de las Artes de San Luis Potosí Centenario (CEART). Vas. 1 va");
  // Sin nadie, ningún chip; «Hoy» ya no es un chip: va en la línea de cuándo.
  assert.equal(await firmada(p, "Carril firmado", "ev-festival").evaluate((a) => [...a.querySelectorAll("span")].filter((s) => /^(\d+ van?|Te interesa|Hoy)$/.test(s.textContent)).length), 0);
});

test("OL-382 (I1): lo que te interesa es el marcador relleno en violeta, en un círculo de vidrio de 36 arriba a la izquierda (8 px); el sello sigue a la derecha", async (t) => {
  const p = await pagina(t);
  const marcador = (carril, id) =>
    firmada(p, carril, id).evaluate((a) => {
      const c = a.firstElementChild.getBoundingClientRect();
      const m = a.querySelector('span[title="Te interesa"]');
      if (!m) return null;
      const r = m.getBoundingClientRect(), i = m.querySelector("svg"), ri = i.getBoundingClientRect(), sello = a.querySelector("span[title]:not([title='Te interesa'])").getBoundingClientRect();
      const centro = [r.left + r.width / 2, r.top + r.height / 2];
      return {
        caja: [Math.round(r.left - c.left), Math.round(r.top - c.top), Math.round(r.width), Math.round(r.height)], radio: getComputedStyle(m).borderRadius, fondo: getComputedStyle(m).backgroundColor,
        icono: [Math.round(ri.width), getComputedStyle(i).fill, getComputedStyle(i).stroke], selloDerecha: Math.round(c.right - sello.right), bajoElDedo: document.elementFromPoint(...centro)?.closest("a") === a,
      };
    });
  const esperado = { caja: [8, 8, 36, 36], radio: "50%", fondo: "rgba(255, 255, 255, 0.92)", icono: [20, "rgb(109, 52, 200)", "none"], selloDerecha: 8, bajoElDedo: true };
  // Sobre un cartel, en la portada del sistema (el taller sin cartel) y en la del evento sin imagen (P7), en la grande, la mediana y la XL.
  for (const [carril, id] of [["Carril firmado", "ev-interesa"], ["Carril firmado", "ev-sin-cartel"], ["Carril firmado", "ev-sin-imagen"], ["Carril firmado mediano", "ev-interesa"], ["Carril firmado XL", "ev-interesa"], ["Carril firmado XL", "ev-sin-imagen"]]) {
    await firmada(p, carril, id).evaluate((a) => { a.closest("ul").scrollLeft = a.parentElement.offsetLeft - 20; a.scrollIntoView({ block: "center" }); });
    assert.deepEqual(await marcador(carril, id), esperado, `${carril} ${id}`);
  }
  // Sin «Me interesa» (nada, o «Voy»), ningún marcador.
  for (const id of ["ev-kopk", "ev-festival", "ev-largo"]) assert.equal(await marcador("Carril firmado", id), null, id);
  // El nombre del enlace lo sigue diciendo, con cuántos van.
  assert.equal(await firmada(p, "Carril firmado", "ev-interesa").getAttribute("aria-label"), "Tributo a The Beatles con Help!. hoy · 20:00. Cineteca Alameda. Te interesa. 3 van");
});

test("firmada: la clase arriba del título solo si no es un evento, con su sesión; chica y en mayúsculas (en la portada del sistema, en su tinta)", async (t) => {
  const p = await pagina(t);
  const ceja = (id) =>
    firmada(p, "Carril firmado", id).evaluate((a) => {
      const c = [...a.querySelectorAll("span")].find((x) => getComputedStyle(x).letterSpacing !== "normal" && !x.querySelector("span"));
      if (!c) return null;
      const titulo = [...a.querySelectorAll("b")].find((b) => !b.closest("span[title]")).getBoundingClientRect(), r = c.getBoundingClientRect();
      return { texto: c.innerText.replace(/\u00a0/g, " "), color: getComputedStyle(c).color, letra: getComputedStyle(c).fontSize, encima: r.bottom <= titulo.top + 0.5, renglones: Math.round(r.height / parseFloat(getComputedStyle(c).lineHeight)) };
    });
  // OL-375: festival, expo y taller llevan la ceja dentro de su portada, en la tinta de su banda (negro sobre el olivo del laboratorio, crema sobre
  // el rojo de Cinema).
  const taller = await ceja("ev-taller");
  assert.deepEqual({ ...taller, renglones: undefined }, { texto: "TALLER · SESIÓN 1 DE 4", color: "rgb(26, 26, 26)", letra: "12px", encima: true, renglones: undefined });
  // En la zona (141 de ancho) cabe en un renglón con la letra de la app, como en el prototipo; con Arial (la CI) parte en dos, entera cada parte.
  assert.ok(taller.renglones <= (process.env.FUENTE ? 1 : 2), `renglones: ${taller.renglones}`);
  assert.deepEqual([(await ceja("ev-festival")).texto, (await ceja("ev-festival")).color], ["FESTIVAL", "rgb(244, 239, 214)"]);
  assert.equal((await ceja("ev-expo")).texto, "EXPO");
  assert.equal(await ceja("ev-kopk"), null, "un evento no se rotula");
});

test("firmada: debajo, el título completo tal cual en tres líneas como mucho, cortado en palabra con «…»; luego cuándo en violeta y el lugar en gris", async (t) => {
  const p = await pagina(t);
  const pie = (id, carril = "Carril firmado") =>
    firmada(p, carril, id).evaluate((a) => {
      const b = a.querySelector(":scope > b");
      // OL-382 (F1): primero cuándo y luego el lugar.
      const [cuando, lugar] = [...a.children].slice(-2);
      const r = (e) => e.getBoundingClientRect();
      const linea = parseFloat(getComputedStyle(b).lineHeight);
      return {
        titulo: b.textContent, lineas: Math.round(r(b).height / linea), sobra: b.scrollHeight - b.clientHeight > linea / 2, letra: getComputedStyle(b).fontSize, color: getComputedStyle(b).color,
        lugar: [lugar.textContent, getComputedStyle(lugar).color, getComputedStyle(lugar).fontSize], cuando: [cuando.textContent, getComputedStyle(cuando).color],
        orden: r(b).bottom <= r(cuando).top + 0.5 && r(cuando).bottom <= r(lugar).top + 0.5, debajoDelCartel: r(a.firstElementChild).bottom + 8 <= r(b).top + 0.5,
      };
    });
  // OL-382 (T1): el título tal cual lo escribió quien publicó, sin título corto calculado (el `corto` que trae la tarjeta ya no se enseña).
  const kopk = await pie("ev-kopk");
  assert.equal(kopk.titulo, "Presentación de Kopk Poj: el aliento de la montaña");
  assert.deepEqual([kopk.letra, kopk.color], ["17px", "rgb(26, 26, 26)"]);
  assert.deepEqual(kopk.lugar, ["Centro de las Artes de San Luis Potosí Centenario (CEART)", "rgb(92, 92, 92)", "15px"]);
  assert.deepEqual(kopk.cuando, ["hoy · 13:00", "rgb(109, 52, 200)"]);
  assert.ok(kopk.orden && kopk.debajoDelCartel, "título, cuándo y lugar, en ese orden, a 8 px del cartel");
  // Un título largo (T2): hasta tres líneas; si no cabe, la última palabra entera con «…», nunca media palabra. Con Arial (la CI) la mediana lo
  // corta en la tercera línea; con la letra de la app (más angosta) cabe entero en tres, en la mediana y en la grande.
  const completo = "Día Nacional de las Cactáceas en el Jardín Botánico El Izotal";
  const enPalabra = (t) => t === completo || (t.endsWith("…") && completo.startsWith(t.slice(0, -1)) && completo[t.length - 1] === " ");
  for (const carril of ["Carril firmado mediano", "Carril firmado", "Carril firmado XL"]) {
    const largo = await pie("ev-largo", carril);
    assert.ok(largo.lineas <= 3 && !largo.sobra && enPalabra(largo.titulo), `${carril}: ${JSON.stringify(largo)}`);
    if (process.env.FUENTE) assert.equal(largo.titulo, completo, carril);
  }
  if (!process.env.FUENTE) {
    const largoMediano = await pie("ev-largo", "Carril firmado mediano");
    assert.ok(largoMediano.titulo.endsWith("…") && largoMediano.lineas === 3, "con Arial, la mediana corta en la tercera línea: " + JSON.stringify(largoMediano));
  }
  // Tal cual: las mayúsculas de quien publicó no pasan a oración (antes, «DESIERTO» → «Desierto»).
  assert.equal((await pie("ev-guardada")).titulo, "DESIERTO: Observación y Espacio");
  // La mediana, un escalón más chica; la XL+ (D2, OL-387), más grande: el título a 21 y las líneas a 17.
  const mediana = await pie("ev-kopk", "Carril firmado mediano");
  assert.deepEqual([mediana.letra, mediana.lugar[2]], ["15px", "14px"]);
  const xl = await pie("ev-kopk", "Carril firmado XL");
  assert.deepEqual([xl.letra, xl.lugar[2], xl.titulo], ["21px", "17px", "Presentación de Kopk Poj: el aliento de la montaña"]);
  assert.ok(xl.orden && xl.debajoDelCartel);
});

// OL-375: las portadas del sistema (prototipo firmado `docs/rediseno/prototipos/portadas-sistema.html`, «Firmada»; bitácora 405).
/** Lo que se mide de una portada del sistema: su color, su tinta, su dibujo, su zona del título y lo que va debajo. */
const medirPortada = (enlace) =>
  enlace.evaluate((a) => {
    const portada = a.firstElementChild, pr = portada.getBoundingClientRect(), r = (e) => e.getBoundingClientRect();
    const svg = portada.querySelector(':scope > svg[viewBox="0 0 100 125"]');
    const titulo = portada.querySelector(":scope > b"), sello = portada.querySelector("span[title]");
    const chip = [...portada.children].find((x) => /^(\d+ van?|Te interesa)$/.test(x.textContent));
    const ceja = [...portada.children].find((x) => getComputedStyle(x).letterSpacing !== "normal");
    // La zona del título no es una caja (maquetación plana): empieza en su primera pieza menos el relleno de arriba, su margen.
    const primera = chip ?? ceja ?? titulo;
    const arriba = parseFloat(getComputedStyle(primera).marginTop), zonaTop = r(primera).top - arriba;
    const formas = svg ? [...svg.querySelectorAll("[data-capa] > *")] : [];
    const [cuando, lugar] = [...a.children].slice(-2);
    const escala = pr.width / 100;
    const lum = (c) => { const v = c.match(/\d+/g).slice(0, 3).map((x) => { x /= 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
    const fondo = getComputedStyle(portada).backgroundColor, tinta = getComputedStyle(titulo).color;
    const [l1, l2] = [lum(fondo), lum(tinta)];
    return {
      img: a.querySelector("img"), imagenDeFondo: getComputedStyle(portada).backgroundImage, fondo, tinta, contraste: Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100,
      formas: [...new Set(formas.map((f) => f.tagName))], figuras: formas.length,
      simbolo: svg ? null : (() => { const s = portada.querySelector(":scope > svg"); return [Math.round(r(s).left - pr.left), Math.round(r(s).top - pr.top), Math.round(r(s).height), getComputedStyle(s).color]; })(),
      // La línea de la zona del título, en unidades de la portada, y el recorte del dibujo.
      linea: (zonaTop - pr.top) / escala, recorte: svg ? Number(svg.querySelector("clipPath rect").getAttribute("height")) : null,
      // Lo más bajo que llega una figura y si alguna pisa el sello.
      fondoFiguras: formas.length ? Math.max(...formas.map((f) => r(f).bottom)) - zonaTop : null,
      pisaSello: formas.some((f) => { const b = r(f), s = r(sello); return b.right > s.left + 0.5 && b.left < s.right - 0.5 && b.bottom > s.top + 0.5 && b.top < s.bottom - 0.5; }),
      sello: [Math.round(pr.right - r(sello).right), Math.round(r(sello).top - pr.top)],
      // El relleno de la zona: a los lados y abajo del título, y arriba de su primera pieza.
      zona: { izquierda: Math.round(r(titulo).left - pr.left), derecha: Math.round(pr.right - r(titulo).right), abajo: Math.round(pr.bottom - r(titulo).bottom), arriba },
      chip: chip ? { izquierda: Math.round(r(chip).left - pr.left), solo: !ceja || r(chip).bottom <= r(ceja).top - 3.5 } : null,
      apilados: !ceja || r(ceja).bottom <= r(titulo).top - 2.5,
      ceja: ceja ? ceja.innerText.replace(/ /g, " ") : null,
      titulo: [titulo.textContent, getComputedStyle(titulo).fontSize, getComputedStyle(titulo).fontWeight, getComputedStyle(titulo).lineHeight, getComputedStyle(titulo).textTransform],
      debajo: [cuando.textContent, lugar.textContent], fuera: r(cuando).top >= pr.bottom,
    };
  });

test("OL-375: festival, expo y taller llevan la portada del sistema: el color de su cartel, el patrón de su clase y, en su zona, el chip solo en su renglón, la ceja y el título en su tinta; debajo, cuándo y el lugar", async (t) => {
  const p = await pagina(t);
  // El laboratorio (taller): su cartel olivo va a la banda clara, con tinta negra; triángulos.
  const taller = await medirPortada(firmada(p, "Carril firmado", "ev-taller"));
  assert.equal(taller.img, null, "sin el cartel: queda en la ficha y en la historia");
  assert.deepEqual([taller.fondo, taller.tinta, taller.formas], ["rgb(151, 154, 79)", "rgb(26, 26, 26)", ["polygon"]]);
  assert.deepEqual(taller.sello, [8, 8]);
  assert.deepEqual(taller.zona, { izquierda: 12, derecha: 12, abajo: 12, arriba: 12 });
  assert.deepEqual(taller.chip, { izquierda: 12, solo: true }, "el chip, solo en su renglón arriba de la ceja (comentario 1 del founder)");
  assert.ok(taller.apilados, "la ceja arriba del título");
  assert.deepEqual(taller.titulo.slice(1), ["19px", "800", "20.14px", "none"], "19 px 800, interlineado 1,06");
  assert.ok("Laboratorio de exploración sonora: escucha activa".startsWith(taller.titulo[0].replace(/…$/, "")), "tal cual (OL-382, T1): " + taller.titulo[0]);
  assert.deepEqual(taller.debajo, ["hoy · 17:00", "Aurora Co-Lab"]);
  assert.ok(taller.fuera);
  // Cinema (festival): el rojo del cartel de su próximo acto, la banda oscura con tinta crema; círculos.
  const cinema = await medirPortada(firmada(p, "Carril firmado", "ev-festival"));
  assert.deepEqual([cinema.fondo, cinema.tinta, cinema.formas], ["rgb(188, 37, 33)", "rgb(244, 239, 214)", ["circle"]]);
  // La expo: la mostaza de su cartel, la banda clara; cuadrados.
  const expo = await medirPortada(firmada(p, "Carril firmado", "ev-expo"));
  assert.deepEqual([expo.fondo, expo.tinta, expo.formas], ["rgb(193, 176, 34)", "rgb(26, 26, 26)", ["rect"]]);
  // El título, a 4,5:1 o más (5:1 por construcción): 5,84, 5,30 y 7,87, los de la bitácora 405.
  assert.deepEqual([taller.contraste, cinema.contraste, expo.contraste], [5.84, 5.3, 7.87]);
  // La mediana: el título a 17 px y la zona con 8 arriba. La XL (OL-382, D2; XL+ desde OL-387): el título a 26 y la zona con 16 por todos lados.
  const mediana = await medirPortada(firmada(p, "Carril firmado mediano", "ev-taller"));
  assert.deepEqual([mediana.titulo[1], mediana.zona], ["17px", { izquierda: 12, derecha: 12, abajo: 12, arriba: 8 }]);
  const xl = await medirPortada(firmada(p, "Carril firmado XL", "ev-taller"));
  assert.deepEqual([xl.titulo[1], xl.zona, xl.sello], ["26px", { izquierda: 16, derecha: 16, abajo: 16, arriba: 16 }, [8, 8]]);
  // T1: el festival, tal cual, con sus mayúsculas (antes, «Cinema»).
  assert.ok("CINEMA: XV Festival de Cine México-Alemania".startsWith((await medirPortada(firmada(p, "Carril firmado XL", "ev-festival"))).titulo[0].replace(/…$/, "")));
});

test("OL-375: las figuras se apoyan en la línea de la zona del título y no pasan de ella ni pisan el sello; el dibujo se recorta ahí", async (t) => {
  const p = await pagina(t);
  for (const [carril, ids] of [["Carril firmado", ["ev-taller", "ev-festival", "ev-expo", "ev-sin-cartel"]], ["Carril firmado mediano", ["ev-taller"]], ["Carril firmado XL", ["ev-taller", "ev-festival", "ev-expo", "ev-sin-cartel"]], ["Carril vecinas", ["ex-hilaridad", "ex-lineas", "ex-privacidad"]]]) {
    for (const id of ids) {
      const m = await medirPortada(firmada(p, carril, id));
      const que = `${carril} ${id}`;
      assert.ok(m.figuras > 0, que);
      assert.ok(Math.abs(m.recorte - m.linea) < 0.7, `${que}: recorte ${m.recorte} en la línea ${m.linea}`);
      assert.ok(m.fondoFiguras <= 0.6 && m.fondoFiguras > -1.5, `${que}: la figura se apoya en la línea (${m.fondoFiguras} px)`);
      assert.equal(m.pisaSello, false, `${que}: la esquina del sello queda libre`);
    }
  }
  // OL-382 (I1): con el marcador arriba a la izquierda (el taller sin cartel te interesa), las figuras tampoco lo pisan.
  for (const carril of ["Carril firmado", "Carril firmado XL"]) {
    const pisa = await firmada(p, carril, "ev-sin-cartel").evaluate((a) => {
      const m = a.querySelector('span[title="Te interesa"]').getBoundingClientRect();
      return [...a.querySelectorAll("[data-capa] > *")].some((f) => { const b = f.getBoundingClientRect(); return b.right > m.left + 0.5 && b.left < m.right - 0.5 && b.bottom > m.top + 0.5 && b.top < m.bottom - 0.5; });
    });
    assert.equal(pisa, false, `${carril}: la esquina del marcador queda libre`);
  }
});

test("OL-375: la portada del sistema conserva su 4:5 mientras su zona del título cabe y, si no cabe, crece: nunca corta el título", async (t) => {
  for (const ancho of [390, 1280]) {
    const p = await pagina(t, ancho);
    const medidas = await p.locator("li > a").evaluateAll((as) =>
      as
        .filter((a) => a.firstElementChild.tagName === "SPAN" && a.firstElementChild.querySelector(":scope > b"))
        .map((a) => {
          const pr = a.firstElementChild.getBoundingClientRect(), b = a.firstElementChild.querySelector(":scope > b").getBoundingClientRect();
          const carril = a.closest("section").querySelector("h2").textContent;
          return { id: a.getAttribute("href"), mediana: carril.includes("mediano"), xl: carril.includes("XL"), alto: Math.round(pr.height * 10) / 10, ancho: pr.width, aire: Math.round(pr.bottom - b.bottom) };
        }),
    );
    for (const m of medidas) {
      assert.ok(m.alto >= Math.round(m.ancho * 1.25 * 10) / 10 - 0.1, `${ancho} ${m.id}: al menos 4:5 (${m.alto})`);
      assert.equal(m.aire, m.xl ? 16 : 12, `${ancho} ${m.id}: el título entero, a ${m.xl ? 16 : 12} del borde de abajo`);
    }
    // Las XL siempre caben en 4:5. Con el título en tres líneas (OL-382, T2) la zona de un taller con su chip y su ceja ya no cabe en la grande
    // con Arial (la CI) y crece unos px, como la mediana; lo que no lleva chip ni ceja larga cabe en 4:5.
    assert.ok(medidas.filter((m) => m.xl).every((m) => Math.abs(m.alto - m.ancho * 1.25) < 0.1), JSON.stringify(medidas));
    assert.ok(medidas.filter((m) => !m.mediana && !m.xl && ["/eventos/ev-festival", "/eventos/ev-expo", "/eventos/ev-sin-imagen"].includes(m.id)).every((m) => Math.abs(m.alto - m.ancho * 1.25) < 0.1), JSON.stringify(medidas));
    const taller = medidas.find((m) => m.mediana && m.id === "/eventos/ev-taller");
    if (ancho === 390) assert.ok(taller.alto > 165, `la mediana del taller crece: ${taller.alto}`);
  }
});

test("OL-375 (P7): el evento sin ninguna imagen entra al sistema sin figura: el color plano de su respaldo, el símbolo SN arriba a la izquierda en su tinta y abajo el chip, la ceja y el título", async (t) => {
  const p = await pagina(t);
  const m = await medirPortada(firmada(p, "Carril firmado", "ev-sin-imagen"));
  assert.equal(m.img, null);
  assert.equal(m.imagenDeFondo, "none", "un color plano, ya no el degradado (E10)");
  assert.equal(m.figuras, 0, "sin figura: la figura dice la clase; el SN, sin imagen");
  // Te interesa (OL-382, I1): el SN se corre a la derecha del marcador (36 + 8), en la tinta. Sin marcador, a 12 (la XL de una tarjeta sin
  // «Me interesa» lo comprueba abajo).
  assert.deepEqual(m.simbolo, [44, 12, 20, m.tinta], "el SN a la derecha del marcador, en la tinta");
  assert.deepEqual(m.sello, [8, 8]);
  assert.deepEqual(m.chip, { izquierda: 12, solo: true });
  assert.equal(m.ceja, "DÍA 2 DE 3");
  assert.equal(m.titulo[4], "none", "tal cual, no en mayúsculas");
  assert.ok(m.contraste >= 4.5, `contraste ${m.contraste}`);
  assert.deepEqual(m.debajo, ["mar 13 de oct · 19:00", "Casa de Cultura del Barrio de San Miguelito"]);
  // Un taller sin cartel ni foto: su figura (triángulos) con su respaldo; sin SN.
  const taller = await medirPortada(firmada(p, "Carril firmado", "ev-sin-cartel"));
  assert.deepEqual([taller.formas, taller.simbolo], [["polygon"], null]);
  assert.ok(taller.contraste >= 4.5);
});

test("OL-375: vecinas distintas: dos portadas seguidas de casi el mismo color no se repiten; una tarjeta con cartel en medio las separa", async (t) => {
  const p = await pagina(t);
  const fondos = (carril) => seccion(p, carril).locator("li > a").evaluateAll((as) => as.map((a) => (a.firstElementChild.tagName === "IMG" ? null : getComputedStyle(a.firstElementChild).backgroundColor)));
  const [a, b, c] = await fondos("Carril vecinas");
  assert.equal(a, "rgb(134, 92, 60)", "el café de su cartel (#865c3c)");
  assert.notEqual(b, a, "la segunda cambia un escalón de tono");
  assert.equal(c, a, "la tercera ya no tiene junto un café igual: el suyo");
  assert.deepEqual(await fondos("Carril vecinas separadas"), ["rgb(134, 92, 60)", null, "rgb(134, 92, 60)"]);
});

test("OL-375 (P8): con «Reducir movimiento» las figuras no se mueven; sin él, en un teléfono, siguen la inclinación: adelante hasta 4 unidades y atrás la mitad", async (t) => {
  // El giro solo mueve las portadas a la vista: primero se trae el taller al centro de su carril.
  const inclinar = (pg) =>
    pg.evaluate(async () => {
      const a = document.querySelector('a[href="/eventos/ev-taller"]');
      a.scrollIntoView({ block: "center", inline: "center" });
      const disparar = (gamma, beta) => window.dispatchEvent(Object.assign(new Event("deviceorientation"), { alpha: 0, beta, gamma }));
      await new Promise((r) => setTimeout(r, 400));
      disparar(0, 40);
      await new Promise((r) => setTimeout(r, 100));
      disparar(25, 52.5);
      await new Promise((r) => setTimeout(r, 1500));
      return { capas: [...a.querySelectorAll("[data-capa]")].map((g) => g.getAttribute("transform")), texto: [...a.querySelectorAll("b, span[title]")].map((e) => getComputedStyle(e).transform), recorte: Number(a.querySelector("clipPath rect").getAttribute("height")) };
    });
  // La página de siempre de esta prueba pide reducir el movimiento.
  const quieta = await pagina(t);
  assert.deepEqual((await inclinar(quieta)).capas, [null, null]);
  // Un teléfono Android sin «Reducir movimiento»: viene encendido y no pide permiso. Chrome trae `requestPermission`, pero no pregunta: devuelve
  // el estado de su permiso de sensores («granted» en Chrome 154, «prompt» en el Chromium 153 de la CI). Aquí, «prompt»: no debe frenar el giro.
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "no-preference", isMobile: true, hasTouch: true, userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36" });
  t.after(() => context.close());
  await context.addInitScript(() => {
    window.__pedidos = 0;
    Object.defineProperty(DeviceOrientationEvent, "requestPermission", { configurable: true, value: () => (window.__pedidos++, Promise.resolve("prompt")) });
  });
  const p = await context.newPage();
  await p.goto(origin);
  await p.getByRole("heading", { name: "Carril firmado", exact: true }).waitFor();
  const quieto = await p.evaluate(() => Number(document.querySelector('a[href="/eventos/ev-taller"] clipPath rect').getAttribute("height")));
  const m = await inclinar(p);
  assert.deepEqual(m.capas, ["translate(1.99 1.00)", "translate(3.98 1.99)"], "25° a la derecha y 12,5° hacia el frente: 4 y 2 unidades (como el prototipo)");
  assert.equal(await p.evaluate(() => window.__pedidos), 0, "en Android no se pide permiso");
  assert.ok(m.texto.every((x) => x === "none"), "el título, la ceja y el sello no se mueven");
  assert.equal(m.recorte, quieto, "el recorte no se mueve");
  const sinGiro = await quieta.evaluate(() => Number(document.querySelector('a[href="/eventos/ev-taller"] clipPath rect').getAttribute("height")));
  assert.ok(Math.abs(m.recorte - sinGiro - 4) < 0.01, `con el giro encendido el recorte baja 4 unidades (comentario 3): ${sinGiro} → ${m.recorte}`);
});

test("firmada: el esqueleto de carga mide lo que su carril: la columna, la portada y una tarjeta con el título en dos líneas (grande, mediana y XL)", async (t) => {
  const p = await pagina(t);
  const medir = (loc) =>
    loc.evaluate((li) => {
      const tarjeta = li.firstElementChild, portada = tarjeta.firstElementChild.getBoundingClientRect();
      return { columna: Math.round(li.getBoundingClientRect().width * 10) / 10, portada: [Math.round(portada.width * 10) / 10, Math.round(portada.height * 10) / 10], alto: Math.round(tarjeta.getBoundingClientRect().height) };
    });
  for (const [i, carril] of [[1, "Carril firmado"], [2, "Carril firmado mediano"], [5, "Carril firmado XL"]]) {
    const esqueleto = await medir(p.locator(`#esqueletos > section:nth-child(${i}) li`).first());
    // La tarjeta de referencia: con cartel, título en dos líneas, sin ceja, con cuándo y lugar (el carril más común). Cuál ocupa dos líneas
    // depende del ancho y de la letra (desde OL-382 el título va completo, en hasta tres): se busca en el carril.
    const referencia = await seccion(p, carril).locator("li").evaluateAll((lis) =>
      lis.findIndex((li) => {
        const a = li.firstElementChild, b = a.querySelector(":scope > b");
        const ceja = [...a.children].some((x) => getComputedStyle(x).letterSpacing !== "normal");
        return a.firstElementChild.tagName === "IMG" && b && !ceja && Math.round(b.getBoundingClientRect().height / parseFloat(getComputedStyle(b).lineHeight)) === 2;
      }),
    );
    assert.ok(referencia >= 0, `${carril}: hay una tarjeta de referencia`);
    const real = await medir(seccion(p, carril).locator("li").nth(referencia));
    assert.deepEqual(esqueleto, real, carril);
  }
});

// OL-372: «Artistas destacadxs» con la tarjeta de un evento (E9) y los avatares de «Lugares de la semana» y «Artistas de la semana» (E5),
// del prototipo firmado (`htmlArtistaEvento`, `htmlEntidad` con `forma: 'avatar'`, `.tira.avatar`, `.avatar .en`); desde OL-382 (N), la foto
// grande de 88 en columnas de 108 con el nombre en dos líneas (`.tira.avatar.n-grande` del prototipo `inicio-propuestas.html`).
const artistaE9 = (p, id) => seccion(p, "Artistas destacadxs").locator(`a[href^="/artistas/${id}"]`);
const avatar = (p, carril, href) => seccion(p, carril).locator(`a[href^="${href}"]`);

test("E9: el artista con la tarjeta mediana de un evento: 132×165 (152×190 desde 1048), la foto entera arriba, en la columna de la mediana", async (t) => {
  const p = await pagina(t);
  const medidas = (pg, enlace) => enlace.evaluate((a) => ({ columna: Math.round(a.parentElement.getBoundingClientRect().width * 10) / 10, foto: [a.firstElementChild.tagName, Math.round(a.firstElementChild.getBoundingClientRect().width * 10) / 10, Math.round(a.firstElementChild.getBoundingClientRect().height * 10) / 10], ajuste: getComputedStyle(a.firstElementChild).objectFit, encuadre: getComputedStyle(a.firstElementChild).objectPosition }));
  assert.deepEqual(await medidas(p, artistaE9(p, "a-markos")), { columna: 132, foto: ["IMG", 132, 165], ajuste: "cover", encuadre: "50% 0%" });
  // Mide lo mismo que la mediana de un evento, sin duplicar la tarjeta.
  const evento = await firmada(p, "Carril firmado mediano", "ev-kopk").evaluate((a) => a.firstElementChild.getBoundingClientRect().height);
  assert.equal(Math.round(evento * 10) / 10, 165);
  const ancha = await pagina(t, 1280);
  assert.deepEqual((await medidas(ancha, artistaE9(ancha, "a-markos"))).foto, ["IMG", 152, 190]);
});

test("E9: sin botón de seguir ni sello de fecha; cada tarjeta es solo su enlace", async (t) => {
  const p = await pagina(t);
  const carril = seccion(p, "Artistas destacadxs");
  assert.equal(await carril.locator("button").count(), 0);
  assert.equal(await carril.locator("li > :not(a)").count(), 0, "nada encima ni al lado del enlace");
  assert.equal(await carril.locator("span[title]").count(), 0, "sin sello de fecha");
});

test("E9: «Nuevo video» o «Nuevo audio» sobre la foto, abajo a la izquierda, con el trato de «Hoy»; sin novedad, ningún chip", async (t) => {
  const p = await pagina(t);
  const chip = (id, texto) =>
    artistaE9(p, id).evaluate((a, texto) => {
      const f = a.firstElementChild.getBoundingClientRect();
      const s = [...a.querySelectorAll("span")].find((x) => x.textContent === texto && !x.children.length);
      if (!s) return null;
      const r = s.getBoundingClientRect(), cs = getComputedStyle(s);
      return { izquierda: Math.round(r.left - f.left), abajo: Math.round(f.bottom - r.bottom), alto: Math.round(r.height * 10) / 10, fondo: cs.backgroundColor, color: cs.color, letra: [cs.fontSize, cs.fontWeight] };
    }, texto);
  const nuevo = { izquierda: 8, abajo: 8, alto: 25.6, fondo: "rgb(109, 52, 200)", color: "rgb(255, 255, 255)", letra: ["14px", "700"] };
  assert.deepEqual(await chip("a-markos", "Nuevo video"), nuevo);
  assert.deepEqual(await chip("a-leon", "Nuevo audio"), nuevo);
  assert.equal(await artistaE9(p, "a-largo").evaluate((a) => [...a.querySelectorAll("span")].filter((s) => /^Nuevo (video|audio)$/.test(s.textContent)).length), 0);
});

test("E9: debajo, la disciplina en la ceja, el nombre tal como está escrito, si tiene fecha, la fecha en violeta y luego el género en gris", async (t) => {
  const p = await pagina(t);
  const pie = (id) =>
    artistaE9(p, id).evaluate((a) => {
      const r = (e) => e.getBoundingClientRect();
      const foto = a.firstElementChild, b = a.querySelector(":scope > b");
      const ceja = [...a.children].find((x) => getComputedStyle(x).letterSpacing !== "normal");
      const despues = [...a.children].slice([...a.children].indexOf(b) + 1);
      const linea = parseFloat(getComputedStyle(b).lineHeight);
      return {
        ceja: ceja ? [ceja.innerText, getComputedStyle(ceja).fontSize, getComputedStyle(ceja).color, Math.round(r(ceja).top - r(foto).bottom)] : null,
        titulo: [b.textContent, getComputedStyle(b).fontSize, getComputedStyle(b).fontWeight, getComputedStyle(b).color], lineas: Math.round(r(b).height / linea), sobra: b.scrollHeight - b.clientHeight > linea / 2,
        lineasDebajo: despues.map((x) => [x.textContent, getComputedStyle(x).color, getComputedStyle(x).fontSize]),
        orden: despues.every((x, i) => (i === 0 ? r(b).bottom : r(despues[i - 1]).bottom) <= r(x).top + 0.5),
      };
    });
  const markos = await pie("a-markos");
  assert.deepEqual(markos.ceja, ["MÚSICA", "12px", "rgb(92, 92, 92)", 8], "la disciplina chica, en mayúsculas y gris, a 8 px de la foto");
  assert.deepEqual(markos.titulo, ["Markosblues", "15px", "700", "rgb(26, 26, 26)"]);
  assert.deepEqual(markos.lineasDebajo, [["jazz, blues y soul", "rgb(92, 92, 92)", "14px"]], "sin fecha, sin línea de cuándo");
  assert.ok(markos.orden);
  const leon = await pie("a-leon");
  assert.equal(leon.titulo[0], "Un León Marinero", "el nombre no pasa a oración");
  // OL-382 (F1): primero la fecha y luego el género.
  assert.deepEqual(leon.lineasDebajo, [["jue 15 de oct · 19:00", "rgb(109, 52, 200)", "14px"], ["folk y canción de autor", "rgb(92, 92, 92)", "14px"]]);
  assert.ok(leon.orden, "ceja, nombre, fecha y género, en ese orden");
  // Un nombre que no cabe: tres líneas como mucho (OL-382, T2: el mismo título de la tarjeta), cortado en palabra entera con «…».
  const completo = "Orquesta Sinfónica de San Luis Potosí y su coro de cámara";
  const largo = await pie("a-largo");
  assert.ok(largo.lineas <= 3 && !largo.sobra && (largo.titulo[0] === completo || completo.startsWith(largo.titulo[0].slice(0, -1))), JSON.stringify(largo));
  // Una ficha por completar no tiene disciplina que decir: sin ceja.
  assert.equal((await pie("a-por-completar")).ceja, null);
});

test("E9: el nombre del enlace dice nombre, disciplina, género, cuándo y novedad, separados por punto", async (t) => {
  const p = await pagina(t);
  assert.equal(await artistaE9(p, "a-markos").getAttribute("aria-label"), "Markosblues. Música. jazz, blues y soul. Nuevo video");
  assert.equal(await artistaE9(p, "a-leon").getAttribute("aria-label"), "Un León Marinero. Música. folk y canción de autor. jue 15 de oct · 19:00. Nuevo audio");
  assert.equal(await artistaE9(p, "a-markos").getAttribute("href"), "/artistas/a-markos?novedad=n-video", "abre la ficha en su novedad");
});

test("E9: sin foto, la imagen ya generada con el símbolo SN, del tamaño de un cartel y al final del carril", async (t) => {
  const p = await pagina(t);
  const foto = await artistaE9(p, "a-sin-foto").locator("img").evaluate((i) => ({ src: new URL(i.src).pathname, caja: [Math.round(i.getBoundingClientRect().width), Math.round(i.getBoundingClientRect().height)] }));
  assert.deepEqual(foto, { src: "/sin-foto.png", caja: [132, 165] });
  const orden = await seccion(p, "Artistas destacadxs").locator("li > a").evaluateAll((as) => as.map((a) => new URL(a.href).pathname));
  assert.equal(orden.at(-1), "/artistas/a-sin-foto", "lo que tiene foto va antes: " + orden.join(" "));
});

test("E5 con N (OL-382): avatares de 88 en columnas de 108 con 8 entre ellas; la foto redonda al centro, el nombre a 12 px en dos líneas a 15", async (t) => {
  for (const ancho of [390, 1280]) {
    const p = await pagina(t, ancho);
    for (const carril of ["Lugares de la semana", "Artistas de la semana"]) {
      // El margen lateral es el de toda la página (`--gutter`: 20 en el teléfono; a lo ancho crece para centrar el contenido).
      const tira = await seccion(p, carril).locator("ul").evaluate((ul) => ({ columnas: getComputedStyle(ul).gridAutoColumns, hueco: getComputedStyle(ul).columnGap, relleno: [getComputedStyle(ul).paddingTop, getComputedStyle(ul).paddingLeft === getComputedStyle(ul.previousElementSibling).paddingLeft, getComputedStyle(ul).paddingBottom] }));
      assert.deepEqual(tira, { columnas: "108px", hueco: "8px", relleno: ["4px", true, "8px"] }, `${carril} a ${ancho}`);
      if (ancho === 390) assert.equal(await seccion(p, carril).locator("ul").evaluate((ul) => getComputedStyle(ul).paddingLeft), "20px");
    }
    const m = await avatar(p, "Lugares de la semana", "/lugares/l-muni").evaluate((a) => {
      const r = (e) => e.getBoundingClientRect();
      const li = a.parentElement, img = a.querySelector("img"), nombre = img.nextElementSibling, cs = getComputedStyle(nombre);
      return {
        li: [Math.round(r(li).width), Math.round(r(li).height * 10) / 10], foto: [Math.round(r(img).left - r(li).left), Math.round(r(img).width), Math.round(r(img).height), getComputedStyle(img).borderRadius],
        nombre: [Math.round((r(nombre).top - r(img).bottom) * 10) / 10, Math.round(r(nombre).height * 10) / 10, cs.fontSize, cs.fontWeight, cs.lineHeight, cs.whiteSpace, cs.textAlign, cs.color],
      };
    });
    assert.deepEqual(m, { li: [108, 118.8], foto: [10, 88, 88, "50%"], nombre: [12, 18.8, "15px", "700", "18.75px", "normal", "center", "rgb(26, 26, 26)"] }, `a ${ancho}`);
  }
  // El nombre que no cabe en dos líneas se corta en palabra entera con «…», al centro de su columna; el entero, en el nombre del enlace.
  const p = await pagina(t);
  const completo = "Casa de Cultura del Barrio de San Miguelito";
  const largo = await avatar(p, "Lugares de la semana", "/lugares/l-largo").evaluate((a) => {
    const n = a.querySelector("img").nextElementSibling, r = n.getBoundingClientRect(), linea = parseFloat(getComputedStyle(n).lineHeight);
    return { texto: n.textContent, lineas: Math.round(r.height / linea), sobra: n.scrollHeight - n.clientHeight > linea / 2, ancho: Math.round(r.width), centro: Math.round(r.left + r.width / 2 - a.getBoundingClientRect().left) };
  });
  assert.ok(largo.texto.endsWith("…") && completo.startsWith(largo.texto.slice(0, -1)) && completo[largo.texto.length - 1] === " ", JSON.stringify(largo));
  assert.deepEqual([largo.lineas, largo.sobra, largo.centro], [2, false, 54], JSON.stringify(largo));
  if (process.env.FUENTE) assert.equal(largo.texto, "Casa de Cultura del Barrio de San…");
  // Uno que cabe en dos líneas va entero.
  assert.equal(await avatar(p, "Lugares de la semana", "/lugares/l-paz").evaluate((a) => a.querySelector("img").nextElementSibling.textContent), "Teatro de la Paz");
});

test("E5: sin botón y sin el detalle de antes; solo si hay novedad, «Nuevo video» o «Nuevo audio» en violeta a 8 px del nombre", async (t) => {
  const p = await pagina(t);
  for (const carril of ["Lugares de la semana", "Artistas de la semana"]) {
    const s = seccion(p, carril);
    assert.equal(await s.locator("button").count(), 0, carril);
    assert.equal(await s.locator("li > :not(a)").count(), 0, carril);
    assert.doesNotMatch(await s.locator("ul").innerText(), /En curso|Hoy|mañana|·/, `${carril}: ni «En curso» ni la hora`);
  }
  const novedad = (href) =>
    avatar(p, "Artistas de la semana", href).evaluate((a) => {
      const r = (e) => e.getBoundingClientRect();
      const nombre = a.querySelector("img").nextElementSibling, n = nombre.nextElementSibling;
      if (!n) return { alto: Math.round(r(a).height * 10) / 10 };
      const cs = getComputedStyle(n);
      return { texto: n.textContent, hueco: Math.round((r(n).top - r(nombre).bottom) * 10) / 10, letra: [cs.fontSize, cs.fontWeight, cs.color, cs.textAlign], alAbajo: Math.round(r(a).bottom - r(n).bottom) };
    });
  assert.deepEqual(await novedad("/artistas/s-video"), { texto: "Nuevo video", hueco: 8, letra: ["15px", "400", "rgb(109, 52, 200)", "center"], alAbajo: 0 });
  assert.equal((await novedad("/artistas/s-audio")).texto, "Nuevo audio");
  assert.deepEqual(await novedad("/artistas/s-nada"), { alto: 118.8 });
});

test("E5: el nombre del enlace lleva el nombre completo y la novedad; sin foto, la imagen ya generada con el símbolo SN, redonda", async (t) => {
  const p = await pagina(t);
  assert.equal(await avatar(p, "Lugares de la semana", "/lugares/l-largo").getAttribute("aria-label"), "Casa de Cultura del Barrio de San Miguelito");
  assert.equal(await avatar(p, "Artistas de la semana", "/artistas/s-video").getAttribute("aria-label"), "Denisse Hervert. Nuevo video");
  assert.equal(await avatar(p, "Artistas de la semana", "/artistas/s-audio").getAttribute("aria-label"), "Abril Merlot. Nuevo audio");
  const foto = await avatar(p, "Lugares de la semana", "/lugares/l-sin-foto").locator("img").evaluate((i) => ({ src: new URL(i.src).pathname, lado: Math.round(i.getBoundingClientRect().width), radio: getComputedStyle(i).borderRadius }));
  assert.deepEqual(foto, { src: "/sin-foto.png", lado: 88, radio: "50%" });
});

test("E9 y E5: el centro de cada tarjeta y de cada avatar es su enlace (nada encima) y cada enlace se toca en 44 o más", async (t) => {
  const p = await pagina(t);
  for (const carril of ["Artistas destacadxs", "Lugares de la semana", "Artistas de la semana"]) {
    const enlaces = seccion(p, carril).locator("li > a");
    for (let i = 0; i < (await enlaces.count()); i++) {
      const a = enlaces.nth(i);
      await a.evaluate((el) => { el.closest("ul").scrollLeft = el.parentElement.offsetLeft - 20; el.scrollIntoView({ block: "center" }); });
      const m = await a.evaluate((el) => {
        const r = el.getBoundingClientRect(), foto = el.querySelector("img").getBoundingClientRect();
        const centros = [[r.left + r.width / 2, r.top + r.height / 2], [foto.left + foto.width / 2, foto.top + foto.height / 2]];
        return { caen: centros.map(([x, y]) => document.elementFromPoint(x, y)?.closest("a") === el), caja: [r.width, r.height] };
      });
      assert.deepEqual(m.caen, [true, true], `${carril} ${i}`);
      assert.ok(m.caja[0] >= 44 && m.caja[1] >= 44, `${carril} ${i}: ${m.caja}`);
    }
  }
});

test("E9 y E5: los esqueletos miden lo que su carril", async (t) => {
  const p = await pagina(t);
  const medir = (loc) =>
    loc.evaluate((li) => {
      const tarjeta = li.firstElementChild, foto = tarjeta.firstElementChild.getBoundingClientRect();
      return { columna: Math.round(li.getBoundingClientRect().width * 10) / 10, foto: [Math.round(foto.width * 10) / 10, Math.round(foto.height * 10) / 10], alto: Math.round(tarjeta.getBoundingClientRect().height * 10) / 10 };
    });
  // La de un artista: la foto, la disciplina, el nombre en una línea, el género y la fecha (el carril del prototipo con Un León Marinero).
  assert.deepEqual(await medir(p.locator("#esqueletos > section:nth-child(3) li").first()), await medir(artistaE9(p, "a-leon").locator("xpath=..")));
  // El avatar: el círculo y el nombre en dos líneas (OL-382, N), sin novedad.
  assert.deepEqual(await medir(p.locator("#esqueletos > section:nth-child(4) li").first()), await medir(avatar(p, "Lugares de la semana", "/lugares/l-largo").locator("xpath=..")));
  assert.equal(await p.locator("#esqueletos > section:nth-child(4) li").count(), 5, "cinco avatares, para llenar el ancho como el carril");
});
