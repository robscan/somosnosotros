/**
 * El Historial de un lugar y la Trayectoria de un artista, escalables (OL-473; prototipo firmado `historial-escalable.html`, bitácora 501,
 * «F1 · L1 · A1»), con toques reales: el plegado se abre con el ratón en su renglón; el carril se arrastra con el dedo (un gesto táctil de
 * Chrome, `Input.synthesizeScrollGesture`, nunca `scrollLeft`); «Ver los 9», un chip de año, «Ver más», «Informe» y «Seguir» se tocan en el
 * centro de su caja, comprobado antes con `elementFromPoint` (nada encima). Un historial grande como el del respaldo (84 eventos en tres años con
 * 9 artistas; 30 fechas en 8 lugares), dentro del cuerpo de una ficha (`ui/Ficha`, `.cuerpo`).
 * Bundle real (esbuild) con sus estilos, en Chrome real a 390×844 (y 320). No corre con `npm test`; se corre con `npm run test:componentes`.
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

const root = fileURLToPath(new URL("../../", import.meta.url));
const TOPE = { timeout: 30000 };
let browser, server, dir, origin;

// Seguir tarda 200 ms y se guarda; la navegación, de mentira, anota a dónde iría (sin sesión, a entrar).
const lento = "async function lento(){ await new Promise((r) => setTimeout(r, 200)); return true }";
const mocks = {
  "next/image": "import React from 'react';export default function Image({quality,priority,...p}){return React.createElement('img',p)}",
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link({href,prefetch,replace,scroll,...p}){return React.createElement('a',{href,...p})}",
  "next/navigation": "export function useRouter(){return {refresh(){},push(u){window.qa.push.push(u)},replace(){}}} export function usePathname(){return location.pathname} export function useSearchParams(){return new URLSearchParams(location.search)}",
  "@/lib/useAvisosTelefono": "export function usePlataforma(){return null} export function useEstadoPush(){return [null,()=>{}]} export function useInstalarApp(){return {puede:false, instalar: async()=>false}}",
  "@/lib/pushCliente": "export function disponibilidadPush(){return 'no-soportado'} export async function suscribirPush(){return {ok:false,motivo:'fallo'}}",
  "@/app/avisos/acciones": "export async function elegirAvisos(){return true}",
  "@/app/perfil/acciones": "export async function guardarSuscripcionPush(){return true}",
  "./HojaInstalar": "export default function HojaInstalar(){return null}",
  "@/app/lugares/acciones": `${lento} export async function cambiarSeguimiento(){ window.qa.seguir.push('lugar'); return lento() }`,
  "@/app/artistas/acciones": `${lento} export async function cambiarSeguimientoArtista(){ window.qa.seguir.push('artista'); return lento() }`,
  "@vercel/analytics": "export function track(){}",
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "historial-componentes-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import Historial from './src/components/Historial';
      import ficha from './src/components/ui/Ficha.module.css';
      import './src/app/globals.css';
      window.qa = { push: [], seguir: [] };
      const q = new URLSearchParams(location.search);
      const ZONA = 'America/Mexico_City';
      const artista = (id, nombre, disciplina, detalle, tipo = 'solista') => ({ id, slug: id, nombre: nombre + ' (demo)', foto: null, disciplina, detalle, tipo });
      const NUEVE = [artista('inigo', 'Íñigo Montalvo', 'musica', 'guitarra'), artista('renata', 'Renata Saldaña', 'artes_visuales', 'pintura'), artista('nube', 'Colectivo Nube de Papel', 'artes_visuales', 'ilustración', 'grupo'), artista('ecos', 'Los Ecos del Tangamanga', 'musica', 'son huasteco', 'grupo'), artista('ximena', 'Ximena Urquidi', 'letras', 'poesía'), artista('maripaz', 'Maripaz Oyarzábal', 'danza', 'danza contemporánea'), artista('grabado', 'Taller de Grabado La Piedra', 'artes_visuales', 'grabado', 'colectivo'), artista('teodoro', 'Teodoro Alcántara', 'letras', 'narrativa'), artista('valeria', 'Valeria Quiroz', 'musica', 'canto')];
      const evento = (id, inicio, extra) => ({ id, slug: id, titulo: 'Evento ' + id, inicio, fin: null, zona: ZONA, imagen: null, lugar_id: null, sitio_texto: null, sitio_direccion: null, sitio_reservado: false, lugar: null, festival: null, artistas: [], van: 0, cancelado: false, ...extra });
      // El museo: 48 eventos de 2026, 26 de 2025 y 10 de 2024, uno cada 5 días hacia atrás; un tercio sin artistas (la exposición colectiva).
      const anios = [[2026, 48], [2025, 26], [2024, 10]];
      let k = 0, c = 0;
      const delMuseo = anios.flatMap(([a, n]) => Array.from({ length: n }, (_, i) => { const j = k++; return evento('m' + a + '-' + String(i).padStart(2, '0'), new Date(Date.UTC(a, 9, 28, 1) - i * 5 * 86400000).toISOString(), { artistas: j % 3 === 2 ? [] : [NUEVE[c++ % 9]], van: j % 7 === 0 ? 2 : 0 }); }));
      // Valeria: 30 fechas en 8 lugares con ficha (13 de 2026, 12 de 2025, 5 de 2024).
      const lugar = (id, nombre, tipo, direccion) => ({ id, slug: id, nombre, portada: null, tipo, direccion, privado: false });
      const OCHO = [lugar('ache', 'ACHE Galería', 'galeria', 'Valentín Gama 840, Centro'), lugar('ccub', 'Centro Cultural Universitario Bicentenario', 'foro', 'Av. Sierra Leona 550, Lomas'), lugar('muni', 'MUNI Museo Universitario UASLP', 'museo', 'Av. Manuel Nava 101'), lugar('ferro', 'Museo del Ferrocarril', 'museo', 'Manuel José Othón s/n'), lugar('paz', 'Teatro de la Paz', 'foro', 'Villerías 205'), lugar('aether', 'Aether', 'galeria', 'Graciano Sánchez 220-A'), lugar('poeta', 'Casa del Poeta', 'centro_cultural', 'Galeana 205'), lugar('museo', 'Museo Leonora Carrington (demo)', 'museo', 'Calzada de Guadalupe 705')];
      const VALERIA = NUEVE[8];
      const fechas = [[2026, 13], [2025, 12], [2024, 5]].flatMap(([a, n]) => Array.from({ length: n }, (_, i) => { const l = OCHO[(i + a) % 8]; return evento('v' + a + '-' + i, new Date(Date.UTC(a, 9, 20, 2) - i * 9 * 86400000).toISOString(), { artistas: [VALERIA], lugar_id: l.id, lugar: l }); }));
      const pocos = [evento('p1', '2026-10-02T01:00:00Z', { artistas: [NUEVE[0], NUEVE[1]] }), evento('p2', '2026-09-02T01:00:00Z', { artistas: [NUEVE[2]] })];
      const opcion = (que, formato, periodo) => ({ formato, periodo, paginas: 1, href: '/api/documento?que=' + que + '&formato=' + formato, archivo: que + '.pdf', ayuda: '1 página.' });
      const documento = q.get('de') === 'artista' ? { que: 'artista', opciones: [opcion('artista', 'carta', null), opcion('artista', 'a4', null)], etiquetasPeriodo: null } : { que: 'lugar', opciones: ['mes', 'anio', 'todo'].flatMap((p) => [opcion('lugar', 'carta', p), opcion('lugar', 'a4', p)]), etiquetasPeriodo: { mes: 'Octubre', anio: '2026', todo: 'Todo' } };
      const sesion = !q.has('sinSesion');
      const extras = sesion ? { tuAnio: '/x/tu-anio', documento, seguidos: [], avisos: { cuenta: 'ana', preguntado: true, correo: 'a...@example.com', llavePush: '' } } : {};
      const props = q.get('de') === 'artista' ? { de: 'artista', artistaId: VALERIA.id, historial: { eventos: fechas, lleno: false } } : { de: 'lugar', historial: { eventos: q.has('pocos') ? pocos : delMuseo, lleno: false } };
      createRoot(document.getElementById('root')).render(<main className={ficha.cuerpo}><p style={{ height: 300 }}>Próximos eventos</p><Historial {...props} {...extras} /><p data-qa="despues" style={{ height: 900 }}>Dónde</p></main>);
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

async function pagina(t, busqueda = "", ancho = 390) {
  const context = await browser.newContext({ viewport: { width: ancho, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "es-MX", timezoneId: "America/Mexico_City" });
  t.after(() => context.close());
  const p = await context.newPage();
  p.setDefaultTimeout(8000);
  const errores = [];
  p.on("pageerror", (e) => errores.push(e.message));
  t.after(() => assert.deepEqual(errores, []));
  await p.goto(`${origin}/${busqueda}`);
  await p.locator("details > summary").waitFor();
  return p;
}

/** Un toque de verdad: el ratón en el centro de la caja, con la caja a media pantalla y nada encima (`elementFromPoint`). */
async function tocar(p, locator) {
  await locator.evaluate((el) => window.scrollBy(0, el.getBoundingClientRect().top - 300));
  const punto = await locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const e = document.elementFromPoint(x, y);
    return e && (e === el || el.contains(e)) ? { x, y } : null;
  });
  assert.ok(punto, `algo tapa «${await locator.innerText()}»`);
  await p.mouse.click(punto.x, punto.y);
}

/** El dedo que desliza de derecha a izquierda (un gesto táctil de Chrome, como en el teléfono). */
async function deslizar(p, x, y, distancia = -260) {
  const cdp = await p.context().newCDPSession(p);
  await cdp.send("Input.synthesizeScrollGesture", { x, y, xDistance: distancia, yDistance: 0, gestureSourceType: "touch", speed: 800, repeatCount: 1 });
  await p.waitForTimeout(400);
}

const abrir = async (p) => {
  await tocar(p, p.locator("details > summary"));
  await p.locator("details[open]").waitFor();
};
/** Los renglones de lo pasado que se ven (los de la lista, no los de la hoja). */
const renglones = (p) => p.locator("details > ul:not([aria-label='Han pasado por aquí']):not([aria-label='Se ha presentado en']) > li").count();
const primerMes = (p) => p.locator("details > h3").first().innerText();

test("A1: con la sesión de quien gestiona, «Tu año» e «Informe» son lo primero al abrir, enteros y lado a lado; a 320, uno bajo otro", TOPE, async (t) => {
  for (const ancho of [390, 320]) {
    const p = await pagina(t, "", ancho);
    assert.match(await p.locator("details > summary").innerText(), /84 eventos · 9 artistas registrados/);
    await abrir(p);
    const m = await p.evaluate(() => {
      const d = document.querySelector("details[open]");
      const primero = d.children[1];
      const vw = document.documentElement.clientWidth;
      const cajas = [...primero.querySelectorAll(":scope > a, :scope > button")].map((b) => { const r = b.getBoundingClientRect(); return { texto: b.innerText.trim(), izq: r.left, der: r.right, arriba: r.top }; });
      return { vw, cajas, desborda: document.documentElement.scrollWidth > vw };
    });
    assert.deepEqual(m.cajas.map((c) => c.texto), ["Tu año", "Informe"]);
    assert.ok(m.cajas.every((c) => c.izq >= 0 && c.der <= m.vw), `a ${ancho} caben enteros: ${JSON.stringify(m.cajas)}`);
    assert.equal(m.desborda, false);
    if (ancho === 390) assert.equal(Math.round(m.cajas[0].arriba), Math.round(m.cajas[1].arriba), "a 390, lado a lado");
    else assert.ok(m.cajas[1].arriba > m.cajas[0].arriba, "a 320, uno bajo otro");
  }
});

test("sin sesión: ni «Tu año» ni «Informe»; la sección empieza por «Han pasado por aquí»", TOPE, async (t) => {
  const p = await pagina(t, "?sinSesion");
  await abrir(p);
  assert.equal(await p.getByRole("button", { name: "Informe" }).count(), 0);
  assert.equal(await p.getByRole("link", { name: "Tu año" }).count(), 0);
  assert.match(await p.locator("details > :nth-child(2)").innerText(), /^Han pasado por aquí/);
});

test("F1: el carril de avatares se desliza y la página no se corre de lado", TOPE, async (t) => {
  const p = await pagina(t);
  await abrir(p);
  const carril = p.getByRole("list", { name: "Han pasado por aquí" });
  await carril.evaluate((el) => window.scrollBy(0, el.getBoundingClientRect().top - 300));
  const pagina0 = await p.evaluate(() => ({ scrollX: window.scrollX, ancho: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth }));
  // 1. La fila se puede desplazar de lado: tiene más que su caja, su desbordamiento se desplaza y el toque deja el eje x.
  const antes = await carril.evaluate((el) => { const cs = getComputedStyle(el); return { n: el.children.length, sw: el.scrollWidth, cw: el.clientWidth, sl: el.scrollLeft, overflowX: cs.overflowX, touchAction: cs.touchAction, texto: el.children[0].innerText }; });
  assert.equal(antes.n, 9);
  assert.ok(antes.sw > antes.cw, `tiene qué desplazar (${antes.sw} > ${antes.cw})`);
  assert.ok(["auto", "scroll"].includes(antes.overflowX), `se desplaza de lado (overflow-x: ${antes.overflowX})`);
  assert.ok(/^(auto|manipulation)$|pan-x/.test(antes.touchAction), `el toque deja el eje x (touch-action: ${antes.touchAction})`);
  assert.equal(antes.sl, 0);
  assert.match(antes.texto, /veces/);
  assert.ok(pagina0.ancho <= pagina0.vw, "el documento no se sale de la pantalla");
  // 2. Desplazada la fila, se mueve ella y no la página.
  await carril.evaluate((el) => el.scrollBy({ left: 260, behavior: "instant" }));
  await p.waitForTimeout(150);
  const despues = await carril.evaluate((el) => ({ sl: el.scrollLeft, scrollX: window.scrollX, ancho: document.documentElement.scrollWidth, panoramica: window.visualViewport.offsetLeft }));
  assert.ok(despues.sl > 0, `la fila se movió (${despues.sl})`);
  assert.equal(despues.scrollX, pagina0.scrollX, "la página no se corrió de lado");
  assert.equal(despues.ancho, pagina0.ancho, "el ancho del documento no cambió");
  assert.equal(despues.panoramica, 0);
  // 3. Además, con el dedo de verdad (un gesto táctil de Chrome), fuera de la CI. En el Chromium sin pantalla de Linux el gesto sintetizado no
  //    desplaza (como la inercia de HojaLugares, OL-265); si aquí tampoco mueve, se anota sin fallar.
  if (!process.env.CI) {
    await carril.evaluate((el) => el.scrollTo({ left: 0, behavior: "instant" }));
    const caja = await carril.boundingBox();
    await deslizar(p, caja.x + caja.width - 60, caja.y + 50);
    const dedo = await carril.evaluate((el) => ({ sl: el.scrollLeft, scrollX: window.scrollX, ancho: document.documentElement.scrollWidth }));
    if (dedo.sl > 0) {
      assert.equal(dedo.scrollX, pagina0.scrollX, "con el dedo, la página no se corrió de lado");
      assert.equal(dedo.ancho, pagina0.ancho);
    } else t.diagnostic(`el gesto táctil sintetizado no desplazó la fila en este Chrome (scrollLeft ${dedo.sl})`);
    // Deslizar no abre la ficha del avatar donde se soltó el dedo.
    assert.equal(await p.evaluate(() => location.pathname), "/");
  }
});

test("«Ver los 9» abre la hoja con los nueve, sus veces y su «Seguir»; Seguir se guarda y la ✕ vuelve a la sección", TOPE, async (t) => {
  const p = await pagina(t);
  await abrir(p);
  await tocar(p, p.getByRole("button", { name: "Ver los 9" }));
  const hoja = p.getByRole("dialog", { name: "Han pasado por aquí" });
  await hoja.waitFor();
  assert.match(await hoja.innerText(), /9 artistas registrados: los que tienen ficha en el catálogo/);
  assert.equal(await hoja.locator("li").count(), 9);
  assert.match(await hoja.locator("li").first().innerText(), /Íñigo Montalvo \(demo\)[\s\S]*Guitarra · Solista[\s\S]*\d+ veces/);
  const seguir = hoja.getByRole("button", { name: /^Seguir — Íñigo/ });
  await tocar(p, seguir);
  await hoja.getByRole("button", { name: /^Sigues — Íñigo/ }).waitFor();
  await p.waitForTimeout(300);
  assert.deepEqual(await p.evaluate(() => window.qa.seguir), ["artista"]);
  await tocar(p, hoja.getByRole("button", { name: "Cerrar" }));
  await hoja.waitFor({ state: "detached" });
  assert.equal(await p.locator("details[open]").count(), 1);
});

test("sin sesión, Seguir en la hoja lleva a entrar y vuelve a la ficha del artista", TOPE, async (t) => {
  const p = await pagina(t, "?sinSesion");
  await abrir(p);
  await tocar(p, p.getByRole("button", { name: "Ver los 9" }));
  const hoja = p.getByRole("dialog", { name: "Han pasado por aquí" });
  await tocar(p, hoja.getByRole("button", { name: /^Seguir — Íñigo/ }));
  assert.deepEqual(await p.evaluate(() => window.qa.push), ["/entrar?siguiente=%2Fartistas%2Finigo%3Faccion%3Dseguir"]);
});

test("L1: un chip por año con su cuenta; elegir «2025» cambia la lista a ese año sin apilar historial", TOPE, async (t) => {
  const p = await pagina(t);
  await abrir(p);
  const anios = p.getByRole("group", { name: "Año" });
  assert.deepEqual((await anios.getByRole("button").allInnerTexts()).map((x) => x.replace(/\s+/g, " ")), ["2026 48", "2025 26", "2024 10"]);
  assert.equal(await anios.getByRole("button", { pressed: true }).innerText().then((x) => x.replace(/\s+/g, " ")), "2026 48");
  assert.equal(await primerMes(p), "Octubre de 2026");
  assert.equal(await renglones(p), 20);
  const historia = await p.evaluate(() => history.length);
  await tocar(p, anios.getByRole("button", { name: /2025/ }));
  await p.waitForTimeout(100);
  assert.equal(await anios.getByRole("button", { pressed: true }).innerText().then((x) => x.replace(/\s+/g, " ")), "2025 26");
  assert.equal(await primerMes(p), "Octubre de 2025");
  assert.equal(await renglones(p), 20);
  assert.equal(await p.evaluate(() => history.length), historia, "filtrar no es navegar");
  await tocar(p, anios.getByRole("button", { name: /2024/ }));
  assert.equal(await renglones(p), 10);
  assert.equal(await p.getByRole("button", { name: "Ver más" }).count(), 0, "con 10, sin «Ver más»");
});

test("«Ver más» trae de 20 en 20 hasta el final del año; lo que sigue (Dónde) queda debajo", TOPE, async (t) => {
  const p = await pagina(t);
  await abrir(p);
  const historia = await p.evaluate(() => history.length);
  assert.equal(await renglones(p), 20);
  await tocar(p, p.getByRole("button", { name: "Ver más" }));
  await p.waitForFunction(() => document.querySelectorAll("details > ul:not([aria-label='Han pasado por aquí']) > li").length === 40);
  await tocar(p, p.getByRole("button", { name: "Ver más" }));
  await p.waitForFunction(() => document.querySelectorAll("details > ul:not([aria-label='Han pasado por aquí']) > li").length === 48);
  assert.equal(await p.getByRole("button", { name: "Ver más" }).count(), 0);
  assert.equal(await p.evaluate(() => history.length), historia);
  // Cada mes, una vez (la tanda que parte un mes lo sigue bajo el mismo título).
  const meses = await p.locator("details > h3").allInnerTexts();
  assert.equal(new Set(meses).size, meses.length);
  assert.ok(await p.evaluate(() => document.querySelector("[data-qa=despues]").getBoundingClientRect().top > document.querySelector("details").getBoundingClientRect().bottom - 1));
});

test("«Informe» abre la hoja del PDF", TOPE, async (t) => {
  const p = await pagina(t);
  await abrir(p);
  await tocar(p, p.getByRole("button", { name: "Informe" }));
  await p.getByRole("dialog", { name: "Informe de actividad" }).waitFor();
});

test("memoria de pantalla: al volver (otra carga de la misma URL) el plegado se abre con el año y las tandas que se veían", TOPE, async (t) => {
  const p = await pagina(t);
  await abrir(p);
  await tocar(p, p.getByRole("group", { name: "Año" }).getByRole("button", { name: /2025/ }));
  await tocar(p, p.getByRole("button", { name: "Ver más" }));
  await p.waitForFunction(() => document.querySelectorAll("details > ul:not([aria-label='Han pasado por aquí']) > li").length === 26);
  await p.reload();
  await p.locator("details[open]").waitFor();
  assert.equal(await p.getByRole("group", { name: "Año" }).getByRole("button", { pressed: true }).innerText().then((x) => x.replace(/\s+/g, " ")), "2025 26");
  assert.equal(await renglones(p), 26);
  // Cerrarlo también se recuerda.
  await tocar(p, p.locator("details > summary"));
  await p.waitForTimeout(100);
  await p.reload();
  await p.locator("details > summary").waitFor();
  await p.waitForTimeout(200);
  assert.equal(await p.locator("details[open]").count(), 0);
});

test("con pocos (3 artistas y un año): sin «Ver los N» ni chips", TOPE, async (t) => {
  const p = await pagina(t, "?pocos");
  await abrir(p);
  assert.equal(await p.getByRole("list", { name: "Han pasado por aquí" }).locator("li").count(), 3);
  assert.equal(await p.getByRole("button", { name: /^Ver los/ }).count(), 0);
  assert.equal(await p.getByRole("group", { name: "Año" }).count(), 0);
  assert.equal(await renglones(p), 2);
});

test("la Trayectoria del artista: «Presentación», «Se ha presentado en» con «Ver los 8» (sus lugares con la campana) y sus años", TOPE, async (t) => {
  const p = await pagina(t, "?de=artista");
  assert.match(await p.locator("details > summary").innerText(), /30 fechas · 8 lugares/);
  await abrir(p);
  assert.deepEqual((await p.locator("details > :nth-child(2) > *").allInnerTexts()).map((x) => x.trim()), ["Tu año", "Presentación"]);
  assert.deepEqual((await p.getByRole("group", { name: "Año" }).getByRole("button").allInnerTexts()).map((x) => x.replace(/\s+/g, " ")), ["2026 13", "2025 12", "2024 5"]);
  assert.equal(await p.getByRole("list", { name: "Se ha presentado en" }).locator("li").count(), 8);
  await tocar(p, p.getByRole("button", { name: "Ver los 8" }));
  const hoja = p.getByRole("dialog", { name: "Se ha presentado en" });
  await hoja.waitFor();
  assert.match(await hoja.innerText(), /8 lugares con ficha\. Una fecha en un sitio sin ficha cuenta en la trayectoria, pero no aquí\./);
  assert.equal(await hoja.locator("li").count(), 8);
  assert.match(await hoja.locator("li").first().innerText(), /veces/);
  assert.equal(await hoja.getByRole("button", { name: /^Seguir — / }).count(), 8);
  await tocar(p, hoja.getByRole("button", { name: "Cerrar" }));
  // Sus fechas dicen dónde.
  assert.match(await p.locator("details > ul:not([aria-label='Se ha presentado en']) > li").first().innerText(), /ACHE|Centro Cultural|MUNI|Museo|Teatro|Aether|Casa/);
});
