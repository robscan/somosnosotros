/** El renglón único (OL-231, bitácora 259): una sola rejilla con cuatro pieles. La lista mide su foto con el token (56) y
 *  su esqueleto mide lo mismo que ella; ningún dato de la meta pasa del borde de su columna (H-17), ni el que se corta con
 *  puntos suspensivos ni la dirección que se parte; el dato (OL-235: toda la fila es el enlace y un chevron lo dice), el ajuste
 *  y el resuelto llevan icono, texto y acción cada uno en su área y con su alto; la `Palanca` se toca en 51×45 y se ve en 51×31;
 *  `SoloLector` no ocupa sitio e `IconoEnCirculo` mide 64.
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

const root = fileURLToPath(new URL("../../../", import.meta.url));
let dir, server, browser, origin;

const mocks = {
  // La selección/fallo de Next/Image se prueba con el componente real en Imagen.componentes.
  "next/image": "import React from 'react';export default function Image({quality,...p}){return React.createElement('img',p)}",
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link(p){return React.createElement('a',p)}",
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "renglon-componentes-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import Renglon from './src/components/ui/Renglon';
      import rs from './src/components/ui/Renglon.module.css';
      import {EsqueletoRenglon} from './src/components/ui/Esqueleto';
      import BotonRenglon from './src/components/ui/BotonRenglon';
      import Boton from './src/components/ui/Boton';
      import Palanca from './src/components/ui/Palanca';
      import SoloLector from './src/components/ui/SoloLector';
      import IconoEnCirculo from './src/components/ui/IconoEnCirculo';
      import {IconoBoleto, IconoChevronDerecha, IconoLapiz, IconoMas, IconoNota, IconoOk, IconoPin, IconoReloj} from './src/components/ui/Iconos';
      import './src/app/globals.css';
      const FOTO = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
      // El botón real de un renglón (H-19): el icono a secas sobre el fondo hueso.
      const voy = (nombre, decidido = false) => <BotonRenglon objeto="evento" decidido={decidido} nombreAccesible={nombre} alTocar={() => {}} />;
      function App() {
        return (
          <div style={{ width: 350 }}>
            <ul aria-label="lista" style={{ listStyle: 'none' }}>
              <Renglon href="/corto" foto={FOTO} titulo="Título corto" accion={voy('Voy corto')}>
                <span><IconoReloj width={15} height={15} /><b>19:00</b></span>
              </Renglon>
              <EsqueletoRenglon />
              <EsqueletoRenglon redonda />
              <Renglon href="/evento" foto={FOTO} titulo="Concierto de la Orquesta Sinfónica de San Luis Potosí con su director invitado, el coro universitario y las voces de la Huasteca" accion={voy('Voy evento')}>
                <span><IconoReloj width={15} height={15} /><b>18:00</b><span>· $120 a $250 · 6 van</span></span>
                <span><IconoPin width={15} height={15} /><span>Templo de San Francisco de Asís, antiguo convento de San Luis Potosí, Centro Histórico</span></span>
              </Renglon>
              <Renglon href="/largo" foto={FOTO} redonda titulo="Un título" accion={voy('Voy largo', true)}>
                <span><IconoNota width={15} height={15} /><span>Música académica y clásica · Solista · Grupo de cámara de San Luis Potosí</span></span>
                <span className={rs.envuelve}><IconoPin width={15} height={15} />Templo de San Francisco · Calle Jardín Guerrero 7, 78000 San Luis Potosí, San Luis Potosí, México</span>
                <span><IconoBoleto width={15} height={15} /><span>Cooperación solidaria de doscientos pesos por persona en taquilla</span></span>
              </Renglon>
            </ul>
            <ul aria-label="datos" style={{ listStyle: 'none' }}>
              <li><a href="/donde" className={rs.dato} data-id="dato"><IconoPin width={20} height={20} /><b>Villerías 205, Centro</b><small>78000, San Luis Potosí</small><IconoChevronDerecha /></a></li>
              <li className={rs.dato} data-id="dato-solo"><IconoReloj width={20} height={20} /><b>Hoy 19:00</b></li>
            </ul>
            <ul aria-label="ajustes" style={{ listStyle: 'none' }}>
              <li><a href="/editar" className={rs.ajuste} data-id="ajuste"><IconoLapiz width={20} height={20} /><b>Editar</b><small>Foto, nombre, colonia</small><IconoChevronDerecha /></a></li>
              <li className={rs.ajuste} data-id="ajuste-palanca"><IconoNota width={20} height={20} /><b>Por correo</b><small>Cada correo trae su baja</small><Palanca encendida aria-label="Avisos por correo" /></li>
              <li className={rs.ajuste + ' ' + rs.apagado} data-id="ajuste-apagado"><IconoLapiz width={20} height={20} /><b>Instalar la app</b><small>Ábrela en Safari para instalarla</small></li>
            </ul>
            <ul aria-label="resueltos" className={rs.renglones}>
              <li className={rs.resuelto} data-id="resuelto"><IconoReloj width={20} height={20} /><small>Cuándo</small><b>Hoy · 19:00</b><Boton type="button" variante="texto" alto="control" ancho="contenido">Cambiar</Boton></li>
              <li className={rs.resuelto + ' ' + rs.pendiente} data-id="pendiente"><IconoPin width={20} height={20} /><small>Dónde</small><b className={rs.falta}>Falta</b><Boton type="button" variante="texto" alto="control" ancho="contenido">Agregar</Boton></li>
              <li className={rs.resuelto + ' ' + rs.opcional} data-id="opcional"><IconoMas width={20} height={20} /><small>Más</small><b className={rs.falta}>Más detalles</b><Boton type="button" variante="texto" alto="control" ancho="contenido">Agregar</Boton></li>
              <li className={rs.resuelto + ' ' + rs.sinClave + ' ' + rs.pendiente} data-id="sin-clave"><IconoPin width={20} height={20} /><small>Dónde</small><b className={rs.falta}>Falta el lugar</b><Boton type="button" variante="texto" alto="control" ancho="contenido">Agregar</Boton></li>
              <li className={rs.resuelto + ' ' + rs.sinClave} data-id="sin-clave-resuelto"><IconoReloj width={20} height={20} /><small>Cuándo</small><b>Hoy · 19:00</b><Boton type="button" variante="texto" alto="control" ancho="contenido">Cambiar</Boton></li>
              <li className={rs.resuelto + ' ' + rs.abierto} data-id="abierto"><IconoBoleto width={20} height={20} /><small>Cuánto</small><b>Gratis</b><Boton type="button" variante="texto" alto="control" ancho="contenido">Listo</Boton><div className={rs.cuerpo} data-id="cuerpo">El cuerpo abierto</div></li>
            </ul>
            <div data-id="soloLector" style={{ position: 'relative' }}><SoloLector>Cambiar la fecha,</SoloLector></div>
            <div data-id="circulo"><IconoEnCirculo><IconoOk width={28} height={28} /></IconoEnCirculo></div>
            <Palanca encendida={false} aria-label="apagada" />
          </div>
        );
      }
      createRoot(document.getElementById('root')).render(<App />);
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

async function pagina(t) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  t.after(() => context.close());
  const p = await context.newPage();
  p.setDefaultTimeout(5000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  t.after(() => assert.deepEqual(errors, []));
  await p.goto(origin);
  await p.getByRole("switch", { name: "apagada" }).waitFor();
  return p;
}

/** Rectángulo de un elemento, redondeado a décimas. */
const rect = (loc) =>
  loc.evaluate((e) => {
    const r = e.getBoundingClientRect();
    const d = (v) => Math.round(v * 10) / 10;
    return { x: d(r.left), y: d(r.top), w: d(r.width), h: d(r.height), r: d(r.right), b: d(r.bottom) };
  });

const dato = (p, id) => p.locator(`[data-id="${id}"]`);

test("lista: la foto mide el token (56) y el esqueleto mide lo que el renglón", async (t) => {
  const p = await pagina(t);
  const renglon = p.locator("ul[aria-label=lista] > li").filter({ has: p.locator('a[href="/corto"]') });
  const esqueletos = p.locator("ul[aria-label=lista] > li[aria-hidden=true]");
  const foto = await rect(renglon.locator("img"));
  assert.deepEqual([foto.w, foto.h], [56, 56]);
  const alto = (await rect(renglon)).h;
  assert.equal(alto, 81, "12 de aire, la foto de 56, 12 de aire y 1 del filete");
  for (let i = 0; i < 2; i++) assert.equal((await rect(esqueletos.nth(i))).h, alto, `el esqueleto ${i} mide lo que el renglón`);
  const ancho = await rect(esqueletos.first().locator("span").first());
  assert.deepEqual([ancho.w, ancho.h], [56, 56], "la foto del esqueleto es la del renglón");
  assert.equal(await esqueletos.nth(1).locator("span").first().evaluate((e) => getComputedStyle(e).borderRadius), "50%", "redonda, como la de un artista");
});

test("lista: el botón de acción es el icono a secas de 44, en el color de acción y sin círculo ni sombra (H-19); decidido, solo el círculo verde", async (t) => {
  const p = await pagina(t);
  const medida = (nombre) =>
    p.getByRole("button", { name: nombre }).evaluate((b) => ({ fondo: getComputedStyle(b).backgroundColor, glifo: getComputedStyle(b.querySelector("svg")).color, sombra: getComputedStyle(b).boxShadow, ancho: Math.round(b.getBoundingClientRect().width), alto: Math.round(b.getBoundingClientRect().height) }));
  assert.deepEqual(await medida("Voy corto"), { fondo: "rgba(0, 0, 0, 0)", glifo: "rgb(109, 52, 200)", sombra: "none", ancho: 44, alto: 44 });
  assert.deepEqual(await medida("Voy largo"), { fondo: "rgb(31, 111, 67)", glifo: "rgb(255, 255, 255)", sombra: "none", ancho: 44, alto: 44 });
});

test("lista: ningún dato de la meta pasa del borde de su columna (H-17) y el largo se corta con puntos suspensivos", async (t) => {
  const p = await pagina(t);
  const largo = p.locator("ul[aria-label=lista] > li").filter({ has: p.locator('a[href="/largo"]') });
  const frente = await rect(largo.locator("a"));
  const boton = await rect(largo.locator("button"));
  assert.ok(frente.r <= boton.x, `el enlace termina en ${frente.r} y el botón empieza en ${boton.x}`);
  const fuera = await largo.locator("a *").evaluateAll((els, borde) => els.filter((e) => e.getBoundingClientRect().right > borde + 0.5).map((e) => e.tagName + ':' + e.textContent.slice(0, 20)), frente.r);
  assert.deepEqual(fuera, []);
  const corta = largo.locator("small > span > span").first();
  assert.equal(await corta.evaluate((e) => getComputedStyle(e).textOverflow), "ellipsis");
  assert.ok(await corta.evaluate((e) => e.scrollWidth > e.clientWidth), "el texto largo se corta");
  const direccion = await rect(largo.locator("small > span").nth(1));
  assert.ok(direccion.h > 30, `la dirección se parte en dos renglones o más (mide ${direccion.h})`);
});

test("evento: el título llega a dos líneas y la meta son dos líneas, cada una cortada con puntos suspensivos (H-09)", async (t) => {
  const p = await pagina(t);
  const evento = p.locator("ul[aria-label=lista] > li").filter({ has: p.locator('a[href="/evento"]') });
  const titulo = evento.locator("a > b");
  const { altoTitulo, linea } = await titulo.evaluate((e) => ({ altoTitulo: e.getBoundingClientRect().height, linea: parseFloat(getComputedStyle(e).lineHeight) }));
  assert.ok(altoTitulo <= 2 * linea + 1, `el título mide ${altoTitulo} y dos líneas son ${2 * linea}`);
  assert.ok(await titulo.evaluate((e) => e.scrollHeight > e.clientHeight), "el título largo se corta");
  const datos = evento.locator("small > span");
  assert.equal(await datos.count(), 2, "dos líneas de meta");
  for (let i = 0; i < 2; i++) {
    const { alto: h, tamano } = await datos.nth(i).evaluate((e) => ({ alto: e.getBoundingClientRect().height, tamano: parseFloat(getComputedStyle(e).fontSize) }));
    assert.ok(h < tamano * 1.7, `la línea ${i + 1} mide ${h}: cabe en un renglón`);
  }
  const texto = datos.nth(1).locator("span");
  assert.equal(await texto.evaluate((e) => getComputedStyle(e).textOverflow), "ellipsis");
  assert.ok(await texto.evaluate((e) => e.scrollWidth > e.clientWidth), "el sitio largo se corta");
  const alto = (await rect(evento)).h;
  assert.ok(alto <= 120, `el renglón de evento mide ${alto} (antes llegaba a 190 con la dirección postal y cada dato en su línea)`);
});

test("dato: toda la fila es el enlace, el icono y el texto a 32 px y el chevron de 16 a la derecha", async (t) => {
  const p = await pagina(t);
  const fila = dato(p, "dato");
  const caja = await rect(fila);
  assert.ok(caja.h >= 44, `la fila se toca en ${caja.h} de alto, no menos de 44`);
  assert.equal(await fila.evaluate((e) => e.tagName), "A", "la fila entera es el enlace");
  const icono = await rect(fila.locator("svg").first());
  const texto = await rect(fila.locator("b"));
  const chevron = await rect(fila.locator("svg").nth(1));
  assert.equal(icono.x - caja.x, 0);
  assert.equal(texto.x - caja.x, 32);
  assert.deepEqual([chevron.w, chevron.h], [16, 16]);
  assert.equal(chevron.r, caja.r, "el chevron va al borde de la derecha");
  assert.ok(texto.r <= chevron.x, "el texto no se mete bajo el chevron");
  assert.equal((await rect(dato(p, "dato-solo"))).h, 44, "un dato de una línea mide el alto del control");
});

test("ajuste: 52 de alto, icono en una columna de 24, chevron y palanca a la derecha", async (t) => {
  const p = await pagina(t);
  const fila = dato(p, "ajuste");
  const caja = await rect(fila);
  const icono = await rect(fila.locator("svg").first());
  const texto = await rect(fila.locator("b"));
  const chevron = await rect(fila.locator("svg").nth(1));
  assert.ok(caja.h >= 52);
  assert.equal(icono.x - caja.x, 14, "14 de relleno");
  assert.equal(texto.x - caja.x, 14 + 24 + 12, "la columna del icono y el hueco");
  assert.deepEqual([chevron.w, chevron.h], [16, 16]);
  assert.equal(caja.r - chevron.r, 14);
  const conPalanca = dato(p, "ajuste-palanca");
  const interruptor = await rect(conPalanca.getByRole("switch"));
  assert.equal(interruptor.r, (await rect(conPalanca)).r - 14, "la palanca va en el sitio de la acción");
  assert.equal(await conPalanca.getByRole("switch").getAttribute("aria-checked"), "true");
  const color = (id) => dato(p, id).locator("b").evaluate((e) => getComputedStyle(e).color);
  assert.equal(await color("ajuste"), "rgb(26, 26, 26)");
  assert.equal(await color("ajuste-apagado"), "rgb(92, 92, 92)", "apagado: la etiqueta, en gris");
});

test("resuelto: la clave sobre el valor, 60 de alto, por completar con la línea gris, opcional con el punteado gris, sin clave de 48 y abierto con el de tinta", async (t) => {
  const p = await pagina(t);
  const fila = dato(p, "resuelto");
  const caja = await rect(fila);
  assert.ok(caja.h >= 60);
  const clave = await rect(fila.locator("small"));
  const valor = await rect(fila.locator("b"));
  assert.ok(clave.b <= valor.y + 1, "la clave va arriba del valor");
  assert.equal(clave.x, valor.x);
  const cambiar = await rect(fila.locator("button"));
  assert.equal(cambiar.h, 44);
  assert.equal(cambiar.r, caja.r - 15, "el botón va al borde de la derecha, dentro de su relleno de 14 y su borde de 1");
  const estilos = (id) => dato(p, id).evaluate((e) => ({ borde: getComputedStyle(e).borderTopStyle, color: getComputedStyle(e).borderTopColor }));
  assert.equal((await estilos("resuelto")).borde, "solid");
  // Por completar (founder, 2026-10-05, OL-297): el borde propio es transparente y la línea (gris) la dibuja una máscara;
  // el valor va en tinta, la clave y el icono en gris y la acción en violeta. La caja mide lo mismo que la de un renglón resuelto.
  const pendiente = dato(p, "pendiente");
  const detalle = await pendiente.evaluate((e) => {
    const c = (n) => getComputedStyle(n);
    const l = getComputedStyle(e, "::after");
    return { borde: c(e).borderTopColor, ancho: c(e).borderTopWidth, valor: c(e.querySelector("b")).color, clave: c(e.querySelector("small")).color, icono: c(e.firstElementChild).color, accion: c(e.querySelector("button")).color, linea: l.backgroundColor, mascara: /url\("data:image\/svg\+xml/.test(l.maskImage || l.webkitMaskImage) };
  });
  assert.deepEqual(detalle, { borde: "rgba(0, 0, 0, 0)", ancho: "1px", valor: "rgb(26, 26, 26)", clave: "rgb(92, 92, 92)", icono: "rgb(92, 92, 92)", accion: "rgb(109, 52, 200)", linea: "rgb(92, 92, 92)", mascara: true });
  assert.equal((await rect(pendiente)).h, (await rect(fila)).h, "la línea de por completar no cambia el alto del renglón");
  const xTexto = async (loc) => (await rect(loc.locator("b"))).x;
  assert.equal(await xTexto(pendiente), await xTexto(fila), "ni mueve el texto");
  const linea = await pendiente.evaluate((e) => { const r = getComputedStyle(e, "::after"); const b = e.getBoundingClientRect(); return [r.position, parseFloat(r.width), parseFloat(r.height), b.width, b.height]; });
  assert.deepEqual(linea.slice(0, 1).concat(linea.slice(1, 3).map(Math.round)), ["absolute", Math.round(linea[3]), Math.round(linea[4])], "la línea cubre la caja del renglón (borde incluido)");
  // Opcional: el punteado gris de 1 px de siempre y el valor en gris.
  const opcional = await estilos("opcional");
  assert.deepEqual([opcional.borde, opcional.color], ["dashed", "rgb(220, 220, 216)"]);
  assert.equal(await dato(p, "opcional").evaluate((e) => getComputedStyle(e.querySelector("b")).color), "rgb(92, 92, 92)");
  // Sin clave a la vista: icono | valor | acción, de --toque (48) de alto; la clave sigue en el árbol de accesibilidad.
  for (const id of ["sin-clave", "sin-clave-resuelto"]) {
    const f = dato(p, id);
    const c = await rect(f);
    assert.equal(c.h, 48, `${id}: sin clave el renglón mide --toque`);
    const clave = await rect(f.locator("small"));
    assert.ok(clave.w <= 1 && clave.h <= 1, "la clave no se ve");
    assert.equal(await f.locator("small").evaluate((e) => e.textContent.length > 0), true, "pero sigue en el árbol");
  }
  assert.equal((await rect(dato(p, "sin-clave"))).h, (await rect(dato(p, "sin-clave-resuelto"))).h, "pendiente y resuelto sin clave miden igual");
  assert.equal((await estilos("abierto")).color, "rgb(26, 26, 26)");
  assert.equal((await estilos("resuelto")).color, "rgb(220, 220, 216)");
  const cuerpo = await rect(dato(p, "cuerpo"));
  const abierto = await rect(dato(p, "abierto"));
  assert.ok(cuerpo.y > abierto.y + 40, "el cuerpo va debajo del renglón");
  assert.ok(cuerpo.w > 250, "y a lo ancho");
});

test("Palanca: se toca en 51×45, se ve en 51×31 y la perilla recorre 20", async (t) => {
  const p = await pagina(t);
  const encendida = p.getByRole("switch", { name: "Avisos por correo" });
  const apagada = p.getByRole("switch", { name: "apagada" });
  for (const palanca of [encendida, apagada]) {
    const caja = await rect(palanca);
    assert.deepEqual([caja.w, caja.h], [51, 45]);
  }
  const riel = (loc) => loc.evaluate((e) => ({ ...Object.fromEntries(["width", "height", "backgroundColor"].map((k) => [k, getComputedStyle(e, "::before")[k]])) }));
  const perilla = (loc) => loc.evaluate((e) => ({ ancho: getComputedStyle(e, "::after").width, alto: getComputedStyle(e, "::after").height, mueve: getComputedStyle(e, "::after").transform }));
  assert.deepEqual(await riel(encendida), { width: "51px", height: "31px", backgroundColor: "rgb(109, 52, 200)" });
  assert.equal((await riel(apagada)).backgroundColor, "rgb(220, 220, 216)");
  assert.deepEqual(await perilla(encendida), { ancho: "27px", alto: "27px", mueve: "matrix(1, 0, 0, 1, 20, 0)" });
  assert.equal((await perilla(apagada)).mueve, "none");
  assert.equal(await apagada.getAttribute("aria-checked"), "false");
  assert.equal(await apagada.getAttribute("type"), "button");
});

test("SoloLector no ocupa sitio y IconoEnCirculo mide 64 y es redondo", async (t) => {
  const p = await pagina(t);
  const oculto = p.getByText("Cambiar la fecha,");
  const cs = await oculto.evaluate((e) => ({ posicion: getComputedStyle(e).position, recorte: getComputedStyle(e).clipPath, ancho: e.getBoundingClientRect().width, margen: getComputedStyle(e).marginLeft }));
  assert.deepEqual(cs, { posicion: "absolute", recorte: "inset(50%)", ancho: 1, margen: "0px" });
  assert.equal((await rect(dato(p, "soloLector"))).h, 0, "no empuja nada");
  const circulo = await rect(dato(p, "circulo").locator("span"));
  assert.deepEqual([circulo.w, circulo.h], [64, 64]);
  assert.equal(await dato(p, "circulo").locator("span").evaluate((e) => getComputedStyle(e).borderRadius), "50%");
});
