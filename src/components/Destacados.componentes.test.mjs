/** La tarjeta del carril (OL-176, bitácora 211; doc 50, P10): un solo rótulo sobre la foto («Te interesa» si la persona ya lo
 *  decidió, luego «Hoy», luego «N van»), la tarjeta sin foto compacta, los datos en dos líneas, cada tarjeta ajustada a su contenido
 *  (sin filas compartidas, OL-251) y las medidas de los tokens `--tarjeta-*`, con el «+» dentro de la caja de la tarjeta en las redondas.
 *  «Te interesa» sale solo si el llamador pasa `estadoDe` (los carriles de eventos); sin ese prop (lugares, artistas) no aparece.
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
      import Destacados from './src/components/Destacados';import './src/app/globals.css';

      // Una tarjeta de evento con cartel; los cambios pisan lo que haga falta (sin foto, hoy, un sitio largo…).
      function tarjeta(id, van, cambios) { return { id, href: '/eventos/' + id, foto: '/cartel.jpg', titulo: 'Evento ' + id, detalle: 'vie 10 de oct · 19:00', sitio: 'Teatro de la Paz', van, cuando: true, ...cambios }; }
      function boton(id) { return { objeto: 'evento', decidido: false, nombreAccesible: 'Voy — Evento ' + id, alTocar() {} }; }
      function botonDecidido(id) { return { objeto: 'evento', decidido: true, nombreAccesible: 'Voy — Evento ' + id, alTocar() {} }; }
      // El glifo lo decide qué se hace: seguir un lugar o un artista (y, decidido, la palomita en los tres).
      const botonDe = (objeto, decidido) => (id) => ({ objeto, decidido, nombreAccesible: 'Seguir — ' + id, alTocar() {} });

      // Carril de eventos: las combinaciones de «Te interesa», «Hoy» y «N van» (el rótulo lo escoge selloDeTarjeta).
      const conTodo = tarjeta('con-todo', 3, { hoy: true });
      const soloInteresa = tarjeta('solo-interesa', 0);
      const hoyYVan = tarjeta('hoy-y-van', 4, { hoy: true });
      const soloVan = tarjeta('solo-van', 5);
      const sinNada = tarjeta('sin-nada', 0);
      const estadoEventos = (id) => (id === 'con-todo' || id === 'solo-interesa') ? 'me_interesa' : null;

      // Un evento decidido (Voy): «Te interesa» no debe salir; el botón ya está «decidido» (aria-pressed).
      const conVoy = tarjeta('con-voy', 2);
      const estadoVoy = (id) => id === 'con-voy' ? 'voy' : null;

      // Sin sesión: estadoDe no se pasa (como decididas === null en useAsistenciaEnLista).
      const sinSesion = tarjeta('sin-sesion', 4);

      // Un carril de lugares o artistas: tampoco se pasa estadoDe, y nunca trae «van» ni «hoy». Sus datos son una sola línea.
      const lugar = tarjeta('un-lugar', 0, { sitio: undefined, detalle: 'Museo', cuando: false });
      const artista = tarjeta('un-artista', 0, { sitio: undefined });
      const lugarSeguido = tarjeta('lugar-seguido', 0, { sitio: undefined });
      const artistaSeguido = tarjeta('artista-seguido', 0, { sitio: undefined });

      // Alineación y datos: un título de una línea junto a uno de dos, y un sitio más largo que la tarjeta; una tarjeta sin foto.
      const corta = tarjeta('titulo-corto', 0, { titulo: 'Corto' });
      const larga = tarjeta('titulo-largo', 0, { titulo: 'Un título tan largo que necesita dos líneas para decirse entero', sitio: 'Un sitio con un nombre larguísimo que no cabe en la tarjeta' });
      const sinFoto = tarjeta('sin-foto', 2, { titulo: 'Macario, Xantolo camino al Mictlán', foto: null, hoy: true });

      const grandes = [tarjeta('grande-a', 1), tarjeta('grande-b', 0)];
      const redondas = ['uno', 'dos', 'tres'].map((id) => tarjeta('lug-' + id, 0, { sitio: undefined, detalle: 'mié 30 sep · 19:00' }));
      const sola = tarjeta('la-sola', 0);

      function App() {
        return React.createElement(React.Fragment, null,
          React.createElement(Destacados, { tarjetas: [conTodo, soloInteresa, hoyYVan, soloVan, sinNada], encabezado: 'Carril de eventos', memoria: 'm1', boton, estadoDe: estadoEventos }),
          React.createElement(Destacados, { tarjetas: [conVoy], encabezado: 'Carril con voy', memoria: 'm2', boton: botonDecidido, estadoDe: estadoVoy }),
          React.createElement(Destacados, { tarjetas: [sinSesion, tarjeta('otra', 0)], encabezado: 'Carril sin sesion', memoria: 'm3' }),
          React.createElement(Destacados, { tarjetas: [lugar, tarjeta('otro-lugar', 0)], encabezado: 'Carril de lugares', memoria: 'm4', boton: botonDe('lugar', false) }),
          React.createElement(Destacados, { tarjetas: [artista, tarjeta('otro-artista', 0)], encabezado: 'Carril de artistas', memoria: 'm5', boton: botonDe('artista', false) }),
          React.createElement(Destacados, { tarjetas: [lugarSeguido, tarjeta('otro-lugar-seguido', 0)], encabezado: 'Carril de lugares seguidos', memoria: 'm6', boton: botonDe('lugar', true) }),
          React.createElement(Destacados, { tarjetas: [artistaSeguido, tarjeta('otro-artista-seguido', 0)], encabezado: 'Carril de artistas seguidos', memoria: 'm7', boton: botonDe('artista', true) }),
          React.createElement(Destacados, { tarjetas: [corta, larga, sinFoto], encabezado: 'Carril de datos', memoria: 'm8', boton }),
          React.createElement(Destacados, { tarjetas: grandes, tamano: 'grande', encabezado: 'Carril grande', memoria: 'm9', boton }),
          React.createElement(Destacados, { tarjetas: redondas, tamano: 'chica', encabezado: 'Carril chico', memoria: 'm10', boton: botonDe('lugar', false) }),
          React.createElement(Destacados, { tarjetas: [sola], encabezado: 'Carril solo', memoria: 'm11', boton }),
          React.createElement(Destacados, { tarjetas: [], encabezado: 'Carril vacio', memoria: 'm12' }),
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
  const assets = new Map([
    ["/", ["text/html", '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--fuente-bricolage:Arial}</style><div id="root"></div><script src="/app.js"></script>']],
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
  await p.getByRole("heading", { name: "Carril de eventos" }).waitFor();
  return p;
}

/** La tarjeta (el <a>) de un id dado: buscada por su enlace. */
function tarjeta(p, id) {
  return p.locator(`a[href="/eventos/${id}"]`);
}
/** Los rótulos de una tarjeta: los `span` que son hijos directos del <a> (el rótulo y, en su carril, nada más). */
const rotulos = (enlace) => enlace.evaluate((a) => [...a.children].filter((el) => el.tagName === "SPAN").map((el) => el.textContent));
const seccion = (p, titulo) => p.locator("section", { has: p.getByRole("heading", { name: titulo, exact: true }) });

test("con me_interesa sale el rótulo «Te interesa»", async (t) => {
  const p = await pagina(t);
  const texto = await tarjeta(p, "solo-interesa").innerText();
  assert.match(texto, /Te interesa/);
});

test("con voy no sale «Te interesa»: el botón queda decidido (aria-pressed)", async (t) => {
  const p = await pagina(t);
  const texto = await tarjeta(p, "con-voy").innerText();
  assert.doesNotMatch(texto, /Te interesa/);
  const boton = p.locator('a[href="/eventos/con-voy"] + button');
  assert.equal(await boton.getAttribute("aria-pressed"), "true");
});

test("sin sesión (sin estadoDe) no sale «Te interesa»", async (t) => {
  const p = await pagina(t);
  const texto = await seccion(p, "Carril sin sesion").innerText();
  assert.doesNotMatch(texto, /Te interesa/);
});

test("un carril de lugares o artistas (sin estadoDe) no lleva ningún rótulo", async (t) => {
  const p = await pagina(t);
  for (const titulo of ["Carril de lugares", "Carril de artistas"]) {
    const texto = await seccion(p, titulo).innerText();
    assert.doesNotMatch(texto, /Te interesa|van|Hoy/, titulo);
  }
});

test("un solo rótulo por foto: lo tuyo, luego «Hoy», luego «N van», y «Recién agregado» ya no existe", async (t) => {
  const p = await pagina(t);
  // Con «Te interesa», «Hoy» y «3 van» a la vez sale uno solo: el de la persona.
  assert.deepEqual(await rotulos(tarjeta(p, "con-todo")), ["Te interesa"]);
  // «Hoy» gana a «N van»; sin ser hoy, cuántos van; sin nada, ninguno.
  assert.deepEqual(await rotulos(tarjeta(p, "hoy-y-van")), ["Hoy"]);
  assert.deepEqual(await rotulos(tarjeta(p, "solo-van")), ["5 van"]);
  assert.deepEqual(await rotulos(tarjeta(p, "sin-nada")), []);
  assert.doesNotMatch(await p.locator("body").innerText(), /Recién agregado/);
});

test("sobre el cartel van, como mucho, dos capas: el rótulo y el botón", async (t) => {
  const p = await pagina(t);
  const capas = await tarjeta(p, "con-todo").evaluate((a) => {
    const cruzan = (x, y) => x.left < y.right && x.right > y.left && x.top < y.bottom && x.bottom > y.top;
    const foto = a.querySelector("img").getBoundingClientRect();
    return [...a.parentElement.querySelectorAll("button, span")].filter((el) => (el.tagName === "BUTTON" || [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) && cruzan(el.getBoundingClientRect(), foto)).length;
  });
  assert.equal(capas, 2);
  // El rótulo queda dentro de la foto, abajo a la izquierda.
  const dentro = await tarjeta(p, "hoy-y-van").evaluate((a) => {
    const foto = a.querySelector("img").getBoundingClientRect();
    const r = a.querySelector(":scope > span").getBoundingClientRect();
    return r.left >= foto.left && r.bottom <= foto.bottom && r.top > foto.top + foto.height / 2;
  });
  assert.equal(dentro, true);
});

test("sin foto la tarjeta es compacta: sin imagen, el fondo suave de lo que no tiene foto, el nombre grande, y conserva su rótulo y su botón", async (t) => {
  const p = await pagina(t);
  const enlace = tarjeta(p, "sin-foto");
  assert.equal(await enlace.locator("img").count(), 0, "sin bloque de imagen");
  const datos = await enlace.evaluate((a) => {
    const fondo = getComputedStyle(a, "::before");
    const vecina = a.closest("ul").querySelector('a[href="/eventos/titulo-corto"]');
    return {
      fondo: fondo.backgroundColor, nombre: getComputedStyle(a.querySelector("b")).fontSize,
      alto: Math.round(a.getBoundingClientRect().height), altoDatos: Math.round(a.querySelector("small").getBoundingClientRect().height),
      altoVecina: Math.round(vecina.getBoundingClientRect().height), altoTituloVecina: Math.round(vecina.querySelector("b").getBoundingClientRect().height), altoDatosVecina: Math.round(vecina.querySelector("small").getBoundingClientRect().height),
      altoFotoVecina: Math.round(vecina.querySelector("img").getBoundingClientRect().height),
    };
  });
  assert.equal(datos.fondo, "rgb(230, 230, 226)", "--fondo-miniatura");
  assert.equal(datos.nombre, "19px", "el nombre va a --letra-xl, más grande que el título de una tarjeta con foto (17px)");
  assert.equal(datos.alto - datos.altoDatos, datos.altoFotoVecina, "el fondo suave mide lo que la foto de las demás (el título se ajusta a cada tarjeta)");
  assert.equal(datos.altoVecina, datos.altoFotoVecina + datos.altoTituloVecina + datos.altoDatosVecina, "y las tarjetas con foto suman foto + título + datos, sin hueco");
  assert.deepEqual(await rotulos(enlace), ["Hoy"]);
  assert.equal(await p.locator('a[href="/eventos/sin-foto"] + button').count(), 1);
});

test("los datos van en dos líneas (cuándo, dónde), cada una con su elipsis", async (t) => {
  const p = await pagina(t);
  const datos = await tarjeta(p, "titulo-largo").locator("small > span").evaluateAll((ls) =>
    ls.map((l) => ({ texto: l.textContent, ajuste: getComputedStyle(l).whiteSpace, puntos: getComputedStyle(l).textOverflow, cortada: l.scrollWidth > l.clientWidth })),
  );
  assert.equal(datos.length, 2);
  assert.deepEqual(datos.map((d) => d.texto), ["vie 10 de oct · 19:00", "Un sitio con un nombre larguísimo que no cabe en la tarjeta"]);
  for (const d of datos) assert.deepEqual([d.ajuste, d.puntos], ["nowrap", "ellipsis"]);
  assert.deepEqual(datos.map((d) => d.cortada), [false, true], "el sitio largo se corta con puntos; el cuándo cabe");
  // Lugares y artistas traen una sola línea.
  assert.equal(await tarjeta(p, "un-lugar").locator("small > span").count(), 1);
});

test("cada tarjeta se ajusta a su contenido: con un título de una línea los datos quedan pegados a él, y las fotos siguen arriba y del mismo alto", async (t) => {
  const p = await pagina(t);
  const medidas = async (id) =>
    tarjeta(p, id).evaluate((a) => {
      const rango = document.createRange();
      rango.selectNodeContents(a.querySelector("b"));
      const lineas = new Set([...rango.getClientRects()].map((r) => Math.round(r.top))).size;
      const b = a.querySelector("b").getBoundingClientRect(), d = a.querySelector("small").getBoundingClientRect(), f = a.querySelector("img").getBoundingClientRect();
      return { lineas, hueco: Math.round(d.top - b.bottom), titulo: Math.round(b.height), fotoTop: Math.round(f.top), fotoAlto: Math.round(f.height), color: getComputedStyle(a.querySelector("small > span")).color };
    });
  const corto = await medidas("titulo-corto");
  const largo = await medidas("titulo-largo");
  assert.equal(corto.lineas, 1);
  assert.ok(largo.lineas > corto.lineas, "el título largo sí ocupa más líneas");
  assert.ok(largo.titulo > corto.titulo, "la caja del título mide lo que su texto, no lo del título más largo del carril");
  assert.equal(corto.hueco, 0, "con una línea los datos quedan pegados al título, sin hueco blanco");
  assert.equal(largo.hueco, 0);
  assert.equal(corto.fotoTop, largo.fotoTop, "las fotos siguen alineadas arriba");
  assert.equal(corto.fotoAlto, largo.fotoAlto, "y del mismo alto (el alto explícito de --foto)");
});

test("la línea de cuándo va en violeta (--primario) y el sitio en el gris de siempre; un lugar sin próximo no la pinta", async (t) => {
  const p = await pagina(t);
  const colores = await tarjeta(p, "titulo-largo").evaluate((a) => [...a.querySelectorAll("small > span")].map((s) => getComputedStyle(s).color));
  assert.deepEqual(colores, ["rgb(109, 52, 200)", "rgb(92, 92, 92)"], "cuándo en #6d34c8; dónde en --texto-suave");
  const tipo = await tarjeta(p, "un-lugar").evaluate((a) => getComputedStyle(a.querySelector("small > span")).color);
  assert.equal(tipo, "rgb(92, 92, 92)", "el tipo de un lugar sin próximo (detalle que no es un cuándo) queda en gris");
});

test("las medidas salen de los tokens de tarjeta: mediana 220×132, grande 165×248 (190×285 desde 1048) y chica 104", async (t) => {
  const p = await pagina(t);
  const foto = (id) => tarjeta(p, id).locator("img").evaluate((i) => [Math.round(i.getBoundingClientRect().width), Math.round(i.getBoundingClientRect().height)]);
  assert.deepEqual(await foto("solo-van"), [220, 132]);
  assert.deepEqual(await foto("grande-a"), [165, 248]);
  assert.deepEqual(await foto("lug-uno"), [104, 104]);
  const ancha = await pagina(t, 1280);
  const fotoAncha = (id) => tarjeta(ancha, id).locator("img").evaluate((i) => [Math.round(i.getBoundingClientRect().width), Math.round(i.getBoundingClientRect().height)]);
  assert.deepEqual(await fotoAncha("grande-a"), [190, 285]);
  assert.deepEqual(await fotoAncha("solo-van"), [220, 132], "la mediana no cambia");
});

test("en las redondas el botón queda dentro de la caja de su tarjeta (sin desbordes)", async (t) => {
  const p = await pagina(t);
  const fuera = await seccion(p, "Carril chico").locator("ul > li").evaluateAll((lis) =>
    lis.filter((li) => {
      const c = li.getBoundingClientRect();
      const b = li.querySelector("button").getBoundingClientRect();
      return b.left < c.left - 0.5 || b.right > c.right + 0.5 || b.top < c.top - 0.5 || b.bottom > c.bottom + 0.5;
    }).length,
  );
  assert.equal(fuera, 0);
  // Y sus datos, completos: la fecha se parte en dos líneas en vez de cortarse.
  const ajuste = await tarjeta(p, "lug-uno").locator("small > span").evaluate((s) => getComputedStyle(s).whiteSpace);
  assert.equal(ajuste, "normal");
});

test("una sola tarjeta ocupa el ancho del carril, con la foto en 5:3", async (t) => {
  const p = await pagina(t);
  const caja = await tarjeta(p, "la-sola").evaluate((a) => {
    const foto = a.querySelector("img").getBoundingClientRect();
    const carril = a.closest("ul");
    return { ancho: Math.round(foto.width), carril: carril.clientWidth - 2 * 20, proporcion: +(foto.width / foto.height).toFixed(2) };
  });
  assert.equal(caja.ancho, caja.carril);
  assert.equal(caja.proporcion, 1.67);
});

test("un carril vacío no deja hueco: se recoge a alto 0 y no se oye", async (t) => {
  const p = await pagina(t);
  await p.waitForFunction(() => document.querySelector('[aria-hidden="true"]') !== null);
  const alto = await p.locator("div[aria-hidden='true']").first().evaluate((d) => Math.round(d.getBoundingClientRect().height));
  assert.equal(alto, 0);
});

// Los trazos de los tres glifos de acción (ui/Iconos): la palomita, la campana con «+» y la persona con «+».
const PALOMITA = "M5 12.5l4.5 4.5L19 7.5";
const CAMPANA_MAS = "M12 9.5v5M9.5 12h5";
const PERSONA_MAS = "M19 7.5v6M16 10.5h6";

test("el glifo del botón dice qué hace: palomita para Voy, campana con «+» para seguir un lugar, persona con «+» para un artista", async (t) => {
  const p = await pagina(t);
  const trazos = (id) => p.locator(`a[href="/eventos/${id}"] + button`).locator("path").evaluateAll((ps) => ps.map((x) => x.getAttribute("d")));
  assert.deepEqual(await trazos("sin-nada"), [PALOMITA]);
  assert.ok((await trazos("un-lugar")).includes(CAMPANA_MAS), "un lugar por seguir lleva la campana con «+»");
  assert.ok((await trazos("un-artista")).includes(PERSONA_MAS), "un artista por seguir lleva la persona con «+»");
});

test("sobre la foto el botón es un círculo blanco de 48 con sombra", async (t) => {
  const p = await pagina(t);
  const boton = await p.locator('a[href="/eventos/sin-nada"] + button').evaluate((b) => ({ fondo: getComputedStyle(b).backgroundColor, sombra: getComputedStyle(b).boxShadow !== "none", lado: Math.round(b.getBoundingClientRect().width) }));
  assert.deepEqual(boton, { fondo: "rgb(255, 255, 255)", sombra: true, lado: 48 });
});

test("ya decidido, la palomita blanca sobre verde en los tres casos", async (t) => {
  const p = await pagina(t);
  for (const id of ["con-voy", "lugar-seguido", "artista-seguido"]) {
    const boton = p.locator(`a[href="/eventos/${id}"] + button`);
    assert.equal(await boton.getAttribute("aria-pressed"), "true", id);
    assert.deepEqual(await boton.locator("path").evaluateAll((ps) => ps.map((x) => x.getAttribute("d"))), [PALOMITA], id);
    const estilo = await boton.evaluate((b) => ({ fondo: getComputedStyle(b).backgroundColor, glifo: getComputedStyle(b.querySelector("svg")).color }));
    assert.deepEqual(estilo, { fondo: "rgb(31, 111, 67)", glifo: "rgb(255, 255, 255)" }, id);
  }
});
