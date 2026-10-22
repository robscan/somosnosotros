/**
 * Showcase › Candidatos (OL-426, lo firmado en OL-425): buscar con su ✕ (la URL cambia 300 ms después de teclear y la lista se filtra), los chips de
 * disciplina con su cuenta y su enlace, la hoja «Estado» que filtra, la hoja «Orden» con «Puntaje» por defecto y la vista en tabla. El
 * componente de verdad (`VistaCandidatos`, con `OpcionesLista`, `ui/Buscador`, `ui/Chip` y `ui/Hoja`) con una lista inventada; el router de
 * prueba cambia la URL sin apilar historial y la página se vuelve a pintar con lo que dice la URL, como hace el servidor.
 * OL-439: el renglón «Investigar» a varios (`InvestigarLote`) con su hoja, la acción de prueba (apunta lo que recibe en `window.qa.acciones`), la
 * línea de cada tarjeta y la recarga suave (`router.refresh`, contada en `window.qa.refrescos`). El escenario de datos se elige antes de cargar
 * la página (`window.escenario`, con `addInitScript`): «propone», «corriendo», «muchos» o «sin» (las investigaciones no se pudieron leer).
 * OL-446 (firmado en OL-443): la hoja Filtros (cada chip con su cuenta, los de 0 escondidos, «Más filtros»; aplica con «Ver N artistas»), lo puesto
 * con su ✕, los grupos guardados (acciones de prueba que guardan en `window.qa.grupos` y vuelven a pintar), «Seleccionar» para investigar, el
 * indicador tocable de cada tarjeta y el renglón «Por aprobar». Los toques, con el ratón en coordenadas.
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

const root = fileURLToPath(new URL("../../../../", import.meta.url));
let dir, server, browser, origin;

const mocks = {
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link({prefetch,replace,scroll,...p}){return React.createElement('a',p)}",
  "next/image": "import React from 'react';export default function Image({quality,priority,...p}){return React.createElement('img',p)}",
  // Reemplazar la URL (filtrar no es navegar): sin apilar historial, y la página se pinta otra vez con lo que dice la URL.
  "next/navigation":
    "const router={push(){},refresh(){window.qa.refrescos++},back(){},replace(u){window.qa.reemplazos.push(u);history.replaceState(history.state,'',u);window.qa.pintar()}};export const useRouter=()=>router;export const usePathname=()=>location.pathname;export const useSearchParams=()=>new URLSearchParams(location.search);",
  // OL-439: la acción del servidor de «Investigar a varios»: apunta lo que recibe y contesta bien (o mal, con `window.qa.falla`).
  "./acciones":
    "export async function investigarVarios(...a){window.qa.acciones.push(['investigarVarios',...a]);return window.qa.falla?{ok:false,error:'Sin conexión con la base. Intenta de nuevo.'}:{ok:true,creadas:a[0].length,omitidas:0}}",
  // OL-446: los grupos guardados, en `window.qa.grupos`; cada acción apunta lo que recibe y vuelve a pintar la página (como el refresco del servidor).
  "./accionesGrupos": `
    import { leerFiltros } from './src/lib/showcaseFiltros';
    export async function guardarGrupo(nombre, filtros) { window.qa.acciones.push(['guardarGrupo', nombre, filtros]); const id = 'g' + (window.qa.grupos.length + 1); window.qa.grupos = [...window.qa.grupos, { id, nombre, filtros: leerFiltros(filtros) }]; window.qa.pintar(); return { ok: true, id }; }
    export async function renombrarGrupo(id, nombre) { window.qa.acciones.push(['renombrarGrupo', id, nombre]); window.qa.grupos = window.qa.grupos.map((g) => (g.id === id ? { ...g, nombre } : g)); window.qa.pintar(); return { ok: true, id }; }
    export async function borrarGrupo(id) { window.qa.acciones.push(['borrarGrupo', id]); window.qa.grupos = window.qa.grupos.filter((g) => g.id !== id); window.qa.pintar(); return { ok: true, id }; }
  `,
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "showcase-candidatos-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    define: { "process.env": "{}" },
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React, {useReducer} from 'react';import {createRoot} from 'react-dom/client';
      import VistaCandidatos from './src/app/admin/showcase/VistaCandidatos';
      import {leerVista, valoresDe, sumaValores, SIN_PUNTAJES, SIN_PROPUESTAS} from './src/lib/showcase';
      import plantilla from './src/components/ui/Plantilla.module.css';
      import admin from './src/app/admin/admin.module.css';
      import './src/app/globals.css';
      // OL-437: lo fijado a mano (f), lo propuesto por la base (p) y lo que vale de cada señal.
      const senales = (c, o, a, v) => ({ circulacion: c, obra: o, actividad: a, vinculo: v });
      const prop = (n) => (n === null ? null : { puntaje: n, motivo: 'de la base' });
      const f = (c, o, a, v) => valoresDe(senales(c, o, a, v), SIN_PROPUESTAS);
      const p = (c, o, a, v) => valoresDe(SIN_PUNTAJES, senales(prop(c), prop(o), prop(a), prop(v)));
      const base = { ciudad: 'San Luis Potosí', foto: null, instagram: null, nota: null, programadoPor: [], redes: null };
      const lectura = (seguidores, ultima) => ({ red: 'instagram', seguidores, publicaciones: 100, ultima_publicacion: ultima, leido_en: '2026-10-16T00:00:00Z' });
      const lista = [
        { ...base, id: 'a1', marcado: true, slug: 'sangre-de-coyote', nombre: 'Sangre de Coyote', disciplina: 'musica', estado: 'invitado', valores: f(2, 1, 2, 1), eventos: 7, foros: 4, festivales: 1, instagram: 'https://www.instagram.com/sangre/', nota: 'Circula mucho por los foros del centro.', programadoPor: ['Teatro de la Paz', 'Casa de Cultura', 'Festival de las Linternas', 'ACHE Galería'], redes: lectura(3200, '2026-10-18') },
        { ...base, id: 'a2', marcado: true, slug: 'pargazz', nombre: 'Pargazz', disciplina: 'musica', estado: 'revisado', valores: p(1, 1, 1, 2), eventos: 4, foros: 2, festivales: 1, redes: lectura(1100, '2026-10-08') },
        { ...base, id: 'a3', marcado: true, slug: 'iyari', nombre: 'IYARI, teatro de la vida', disciplina: 'teatro', estado: 'invitado', valores: { ...p(null, 1, 1, 1), circulacion: f(2, null, null, null).circulacion }, eventos: 4, foros: 2, festivales: 1, redes: lectura(980, '2026-08-01') },
        { ...base, id: 'a4', marcado: true, slug: 'un-leon-marinero', nombre: 'Un León Marinero', disciplina: 'musica', estado: 'confirmado', valores: f(2, 2, 1, 1), eventos: 5, foros: 3, festivales: 1 },
        { ...base, id: 'a5', marcado: true, slug: 'yanel-villarreal', nombre: 'Yanel Villarreal', disciplina: 'artes_visuales', estado: 'candidato', valores: p(null, null, null, null), eventos: 1, foros: 1, festivales: 0 },
      ].map((c) => ({ ...c, suma: sumaValores(c.valores), reclamada: c.id === 'a1' || c.id === 'a4', tipo: c.id === 'a3' ? 'grupo' : 'solista', ultimaPublicacion: c.redes?.ultima_publicacion ?? null }));
      // OL-439: «muchos» suma 66 artistas sin marcar (música): «Los que se ven» pasa de 60.
      if (window.escenario === 'muchos') for (let i = 1; i <= 66; i++) lista.push({ ...base, reclamada: false, tipo: 'solista', ultimaPublicacion: null, id: 'm' + i, marcado: false, slug: 'artista-' + i, nombre: 'Artista ' + i, disciplina: 'musica', estado: 'candidato', valores: p(null, null, null, null), suma: 0, eventos: 0, foros: 0, festivales: 0 });
      const credito = { usd: 200, gastado: 7.6, vence: '2026-11-11' };
      const corrida = (artista_id, estado, cambios) => ({ id: 'c-' + artista_id, artista_id, lote: 'lote-1', estado, tope_usd: 1, gasto_usd: 0, resumen: {}, creado_en: '2026-10-20T15:00:00Z', inicio: '2026-10-20T15:00:05Z', fin: null, ...cambios });
      const INVESTIGACIONES = {
        propone: { corridas: [], porRevisar: {}, credito },
        muchos: { corridas: [], porRevisar: {}, credito },
        corriendo: {
          corridas: [
            corrida('a1', 'terminada', { gasto_usd: 0.39, resumen: { propuestas: 3 }, fin: '2026-10-20T15:30:00Z' }),
            corrida('a2', 'corriendo', { gasto_usd: 0.12, resumen: { paso: '2 de 4 búsquedas', avance: 0.5 } }),
            corrida('a5', 'pendiente', { inicio: null }),
          ],
          porRevisar: { a1: 3, a4: 1 },
          credito,
        },
        sin: null,
      };
      window.qa = { reemplazos: [], pintar: () => {}, acciones: [], refrescos: 0, falla: false, grupos: [] };
      function App() {
        const [, pintar] = useReducer((n) => n + 1, 0);
        window.qa.pintar = pintar;
        const vista = leerVista(Object.fromEntries(new URLSearchParams(location.search)));
        const inv = window.escenario ? { investigaciones: INVESTIGACIONES[window.escenario], ahora: '2026-10-20T16:00:00Z' } : {};
        return <main className={plantilla.paginaContenido + ' ' + admin.lista}><h1 className={admin.titulo}>Showcase</h1><VistaCandidatos todos={lista} vista={vista} hoy="2026-10-20" grupos={window.qa.grupos} {...inv} /></main>;
      }
      createRoot(document.getElementById('root')).render(<App />);
    `,
    },
    plugins: [
      {
        name: "dobles",
        setup(b) {
          b.onResolve({ filter: /.*/ }, (a) => (a.path in mocks ? { path: a.path, namespace: "mock" } : undefined));
          b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({ contents: mocks[a.path], loader: "js", resolveDir: root }));
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
    const ruta = req.url.split("?")[0];
    const a = assets.get(ruta === "/admin/showcase" ? "/" : ruta);
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

async function abrir(t, consulta = "", escenario = null, reloj = false) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  t.after(() => context.close());
  if (escenario) await context.addInitScript((e) => (window.escenario = e), escenario);
  const p = await context.newPage();
  if (reloj) await p.clock.install({ time: new Date("2026-10-20T16:00:00Z") });
  p.setDefaultTimeout(5000);
  const errores = [];
  p.on("pageerror", (e) => errores.push(e.message));
  t.after(() => assert.deepEqual(errores, []));
  await p.goto(`${origin}/admin/showcase${consulta}`);
  await p.getByRole("heading", { name: "Showcase" }).waitFor();
  return p;
}
const nombres = (p) => p.locator("ul[aria-label=Candidatos] > li > a:first-of-type").allInnerTexts();
const cifras = (p) => p.locator("p[role=status] > span").first().innerText();
/** Los chips de un bloque de la hoja Filtros, con su cuenta («6 o más 2»). */
const chipsDe = (hoja, rotulo) => hoja.getByRole("group", { name: rotulo, exact: true }).getByRole("button").allInnerTexts().then((xs) => xs.map((x) => x.replace(/\s+/g, " ").trim()));
/** Un toque real: el ratón en el centro del elemento (no `element.click()`, que no ve si algo lo tapa). */
async function tocar(p, l) {
  await l.scrollIntoViewIfNeeded();
  const b = await l.boundingBox();
  await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
}

test("la lista: por puntaje, con la rúbrica en color, la línea de cifras y lo que dice cada tarjeta", async (t) => {
  const p = await abrir(t);
  assert.deepEqual(await nombres(p), ["Sangre de Coyote", "Un León Marinero", "IYARI, teatro de la vida", "Pargazz", "Yanel Villarreal"], "puntaje; el empate lo rompe la convocatoria");
  assert.equal(await cifras(p), "5 artistas · 2 invitados · 1 confirmado · 4 pasan al consejo con 5 de 8", "cuenta a quienes llegan a 5 con lo que vale");
  const primera = p.locator("ul[aria-label=Candidatos] > li").first();
  assert.equal(await primera.getByRole("list", { name: "Rúbrica: 6 de 8" }).locator("li b").allInnerTexts().then((x) => x.join(" ")), "2 1 2 1");
  for (const texto of ["Invitado", "7 eventos · 4 foros · 1 festival", "3,2 mil seguidores · 100 publicaciones · última hace 2 días", "Publica cada semana", "Circula mucho por los foros del centro.", "Programado por: Teatro de la Paz, Casa de Cultura, Festival de las Linternas y 1 más"]) {
    assert.ok((await primera.innerText()).includes(texto), `la tarjeta dice «${texto}»`);
  }
  assert.equal(await primera.getByRole("link", { name: "Sangre de Coyote" }).getAttribute("href"), "/admin/showcase/sangre-de-coyote", "el nombre abre su ficha de showcase");
  assert.equal(await primera.getByRole("link", { name: "Ficha" }).getAttribute("href"), "/artistas/sangre-de-coyote", "«Ficha» abre la ficha pública");
  assert.equal(await primera.getByRole("link", { name: "Instagram" }).getAttribute("target"), "_blank");
  const verde = await primera.locator("li[data-n='2']").first().evaluate((e) => getComputedStyle(e).color);
  assert.equal(verde, "rgb(31, 111, 67)", "un 2, en el verde de lo decidido");
  const iyari = await p.locator("ul[aria-label=Candidatos] > li", { hasText: "IYARI" }).innerText();
  assert.ok(iyari.includes("Sin publicar en 45 días"), "más de 45 días sin publicar: inactivo");
  assert.equal(await p.getByRole("link", { name: /Exportar para el consejo/ }).getAttribute("href"), "/api/showcase/csv");
});

/** Cómo se dibuja cada casilla de la rúbrica de una tarjeta: su texto, su origen, su relleno y su contorno. */
const casillas = (tarjeta) =>
  tarjeta.locator("ul[aria-label^='Rúbrica'] > li[data-origen]").evaluateAll((lis) =>
    lis.map((li) => {
      const e = getComputedStyle(li);
      // El contorno es el filete de la casilla: transparente («ninguno») salvo en lo propuesto, discontinuo y del color del puntaje.
      const contorno = e.borderTopColor === "rgba(0, 0, 0, 0)" ? "ninguno" : `${e.borderTopStyle} ${e.borderTopColor}`;
      return { texto: li.querySelector("b, small")?.textContent, oye: li.textContent, origen: li.dataset.origen, fondo: e.backgroundColor, contorno };
    }),
  );

test("OL-437: lo fijado va relleno, lo propuesto por la base en contorno discontinuo y «sin datos» se ve como tal, no como 0", async (t) => {
  const p = await abrir(t);
  const tarjeta = (nombre) => p.locator("ul[aria-label=Candidatos] > li", { hasText: nombre });
  // Fijado a mano: relleno de su color, sin contorno; se oye «fijado a mano».
  const sangre = await casillas(tarjeta("Sangre de Coyote"));
  assert.deepEqual(sangre.map((c) => [c.texto, c.origen]), [["2", "fijado"], ["1", "fijado"], ["2", "fijado"], ["1", "fijado"]]);
  const verdeSuave = await p.evaluate(() => {
    const x = document.body.appendChild(document.createElement("i"));
    x.style.background = "var(--ok-suave)";
    const c = getComputedStyle(x).backgroundColor;
    x.remove();
    return c;
  });
  assert.equal(sangre[0].fondo, verdeSuave, "un 2 fijado, relleno del verde suave");
  assert.notEqual(sangre[1].fondo, "rgba(0, 0, 0, 0)", "un 1 fijado, relleno");
  assert.equal(sangre[0].contorno, "ninguno", "sin contorno");
  assert.equal(sangre[0].oye, "Circulación2, fijado a mano");
  // Propuesto por la base: sin relleno y con contorno discontinuo del color de su puntaje; se oye «propuesto».
  const pargazz = await casillas(tarjeta("Pargazz"));
  assert.deepEqual(pargazz.map((c) => [c.texto, c.origen]), [["1", "propuesto"], ["1", "propuesto"], ["1", "propuesto"], ["2", "propuesto"]]);
  for (const c of pargazz) assert.equal(c.fondo, "rgba(0, 0, 0, 0)", "lo propuesto no va relleno");
  assert.equal(pargazz[3].contorno, "dashed rgb(31, 111, 67)", "un 2 propuesto: contorno discontinuo verde");
  assert.equal(pargazz[0].contorno, "dashed rgb(169, 68, 0)", "un 1 propuesto: contorno discontinuo naranja");
  assert.equal(pargazz[0].oye, "Circulación1, propuesto");
  assert.ok(await tarjeta("Pargazz").getByRole("list", { name: "Rúbrica: 5 de 8" }).isVisible(), "lo propuesto suma");
  // Mezcla: circulación fijada, lo demás propuesto.
  assert.deepEqual((await casillas(tarjeta("IYARI"))).map((c) => c.origen), ["fijado", "propuesto", "propuesto", "propuesto"]);
  // Sin datos: dos palabras donde iría el número, sin relleno de color ni contorno, y no suma.
  const yanel = await casillas(tarjeta("Yanel"));
  assert.deepEqual(yanel.map((c) => [c.texto, c.origen]), Array(4).fill(["sin datos", "sin_datos"]));
  assert.ok(yanel.every((c) => c.contorno === "ninguno"));
  assert.ok(await tarjeta("Yanel").getByRole("list", { name: "Rúbrica: 0 de 8" }).isVisible());
  assert.equal(await tarjeta("Yanel").locator("ul[aria-label^='Rúbrica'] b").count(), 0, "ningún número, tampoco un 0");
});

test("buscar: la lista se filtra 300 ms después de teclear, sin apilar historial, y la ✕ la devuelve entera", async (t) => {
  const p = await abrir(t);
  const historial = await p.evaluate(() => history.length);
  await p.getByRole("searchbox", { name: "Buscar artista del showcase" }).fill("leon");
  await p.waitForFunction(() => location.search === "?q=leon");
  await p.locator("ul[aria-label=Candidatos] > li").nth(1).waitFor({ state: "detached" });
  assert.deepEqual(await nombres(p), ["Un León Marinero"], "sin acentos ni mayúsculas");
  assert.equal(await cifras(p), "1 de 5 artistas · 1 pasa al consejo con 5 de 8");
  assert.equal(await p.getByRole("link", { name: /Exportar para el consejo/ }).getAttribute("href"), "/api/showcase/csv?q=leon", "el CSV es la lista filtrada");
  await p.getByRole("button", { name: "Borrar la búsqueda" }).click();
  await p.waitForFunction(() => location.search === "");
  assert.equal((await nombres(p)).length, 5);
  assert.equal(await p.evaluate(() => history.length), historial, "filtrar no es navegar");
  await p.getByRole("searchbox").fill("zzz");
  await p.getByText("Nadie con «zzz» aquí.").waitFor();
});

test("los chips de disciplina: «Todas» y las que hay, con su cuenta y su enlace", async (t) => {
  const p = await abrir(t, "?disciplina=teatro");
  const chips = p.getByRole("group", { name: "Filtrar por disciplina" }).getByRole("link");
  assert.deepEqual((await chips.allInnerTexts()).map((x) => x.replace(/\s+/g, " ").trim()), ["Todas 5", "Música 3", "Teatro 1", "Artes visuales 1"]);
  assert.equal(await chips.nth(2).getAttribute("aria-current"), "true", "Teatro, elegido");
  assert.equal(await chips.nth(1).getAttribute("href"), "/admin/showcase?disciplina=musica");
  assert.equal(await chips.nth(0).getAttribute("href"), "/admin/showcase");
  assert.deepEqual(await nombres(p), ["IYARI, teatro de la vida"]);
});

test("OL-446 · la hoja Filtros: cada chip con su cuenta (los de 0, escondidos), «Más filtros» y aplica con «Ver N artistas» sin apilar historial", async (t) => {
  const p = await abrir(t);
  const historial = await p.evaluate(() => history.length);
  // Estado ya no es un chip de arriba: entra a la hoja (respuesta 1: disciplina sí se queda a la vista).
  assert.equal(await p.getByRole("button", { name: /^Estado:/ }).count(), 0);
  assert.equal(await p.getByRole("group", { name: "Filtrar por disciplina" }).count(), 1);
  await tocar(p, p.getByRole("button", { name: /^Filtros/ }));
  const hoja = p.getByRole("dialog", { name: "Filtros" });
  await hoja.waitFor();
  assert.deepEqual(await hoja.locator("h4").allInnerTexts(), ["PUNTAJE", "ACTIVIDAD EN REDES", "CUENTA EN LA APP", "CIRCULACIÓN ESTE AÑO", "DISCIPLINA"], "Origen ya no está (founder, 22 oct)");
  assert.deepEqual(await chipsDe(hoja, "Puntaje"), ["Todos 5", "3 o más 4", "4 o más 4", "5 o más 4", "6 o más 2"]);
  assert.deepEqual(await chipsDe(hoja, "Actividad en redes"), ["Cualquiera 5", "Publicó en 15 días 2", "En 30 días 2", "En 90 días 3", "Sin publicar en 90 días 2"]);
  assert.deepEqual(await chipsDe(hoja, "Cuenta en la app"), ["Cualquiera 5", "Con cuenta vinculada 2", "Sin cuenta 3"]);
  await tocar(p, hoja.getByRole("button", { name: /^6 o más/ }));
  assert.deepEqual(await chipsDe(hoja, "Disciplina"), ["Todas 2", "Música 2"], "Teatro y Artes visuales darían 0: se esconden");
  assert.ok(await hoja.getByRole("button", { name: "Ver 2 artistas" }).isVisible(), "el botón dice cuántos quedan");
  // «Más filtros»: cerrado guarda Estado, Investigación y Solista o grupo; abierto los enseña con su cuenta.
  const mas = hoja.getByRole("button", { name: /^Más filtros/ });
  assert.equal(await mas.getAttribute("aria-expanded"), "false");
  await tocar(p, mas);
  assert.deepEqual(await chipsDe(hoja, "Estado"), ["Todos 2", "Invitado 1", "Confirmado 1"]);
  // La ✕ no aplica nada.
  await p.keyboard.press("Escape");
  await hoja.waitFor({ state: "detached" });
  assert.equal(await p.evaluate(() => location.search), "");
  await tocar(p, p.getByRole("button", { name: /^Filtros/ }));
  await tocar(p, hoja.getByRole("button", { name: /^6 o más/ }));
  await tocar(p, hoja.getByRole("button", { name: "Ver 2 artistas" }));
  await hoja.waitFor({ state: "detached" });
  assert.equal(await p.evaluate(() => location.search), "?puntaje=6");
  assert.deepEqual(await nombres(p), ["Sangre de Coyote", "Un León Marinero"]);
  assert.equal(await cifras(p), "2 de 5 artistas · 2 pasan al consejo con 5 de 8");
  assert.ok(/^Filtros\s*1/.test(await p.getByRole("button", { name: /^Filtros/ }).innerText()), "el chip Filtros dice cuántos hay puestos");
  // Lo puesto, con su ✕; quitarlo no apila historial.
  await tocar(p, p.getByRole("button", { name: "Quitar 6 puntos o más" }));
  await p.waitForFunction(() => location.search === "");
  assert.equal((await nombres(p)).length, 5);
  assert.equal(await p.evaluate(() => history.length), historial, "filtrar no es navegar");
});

test("OL-446 · guardar como grupo: el nombre lo propone el sistema, su ✕ lo vacía y el botón dice que falta; guardado, un solo chip; editar y borrar en su hoja", async (t) => {
  const p = await abrir(t, "?puntaje=6&disciplina=musica");
  const puestos = p.getByRole("group", { name: "Filtros puestos" });
  assert.deepEqual((await puestos.getByRole("button").allInnerTexts()).map((x) => x.trim()), ["6 puntos o más", "Guardar como grupo"], "Música ya se ve en su fila");
  await tocar(p, puestos.getByRole("button", { name: "Guardar como grupo" }));
  const hoja = p.getByRole("dialog", { name: "Guardar como grupo" });
  await hoja.waitFor();
  assert.ok((await hoja.innerText()).includes("6 puntos o más · Música"));
  assert.ok((await hoja.innerText()).includes("Hoy, 2 artistas"));
  const campo = hoja.getByRole("textbox", { name: "Nombre del grupo" });
  assert.equal(await campo.inputValue(), "Música, 6+");
  await tocar(p, hoja.getByRole("button", { name: "Borrar lo escrito" }));
  assert.equal(await campo.inputValue(), "");
  await tocar(p, hoja.getByRole("button", { name: "Falta el nombre" }));
  assert.deepEqual(await acciones(p), [], "sin nombre no se guarda");
  await campo.fill("Música fuerte");
  await tocar(p, hoja.getByRole("button", { name: "Guardar el grupo" }));
  await hoja.waitFor({ state: "detached" });
  assert.deepEqual(await acciones(p), [["guardarGrupo", "Música fuerte", { puntaje: 6, disciplina: "musica" }]]);
  await puestos.getByRole("button", { name: "Quitar Música fuerte" }).waitFor();
  assert.deepEqual((await puestos.getByRole("button").allInnerTexts()).map((x) => x.trim()), ["Música fuerte", "Editar grupo"], "puesto, un solo chip");
  // En la hoja Filtros sale primero, en «Tus grupos», elegido y con su cuenta.
  await tocar(p, p.getByRole("button", { name: /^Filtros/ }));
  const filtros = p.getByRole("dialog", { name: "Filtros" });
  assert.deepEqual(await chipsDe(filtros, "Tus grupos"), ["Música fuerte 2"]);
  assert.equal(await filtros.getByRole("group", { name: "Tus grupos" }).getByRole("button").getAttribute("aria-pressed"), "true");
  await p.keyboard.press("Escape");
  await filtros.waitFor({ state: "detached" });
  // Editar: cambiar el nombre; luego borrarlo (los filtros siguen puestos).
  await tocar(p, puestos.getByRole("button", { name: "Editar grupo" }));
  const editar = p.getByRole("dialog", { name: "Editar grupo" });
  await editar.getByRole("textbox", { name: "Nombre del grupo" }).fill("Música top");
  await tocar(p, editar.getByRole("button", { name: "Guardar el nombre" }));
  await puestos.getByRole("button", { name: "Quitar Música top" }).waitFor();
  await tocar(p, puestos.getByRole("button", { name: "Editar grupo" }));
  await tocar(p, editar.getByRole("button", { name: "Borrar el grupo" }));
  await puestos.getByRole("button", { name: "Quitar 6 puntos o más" }).waitFor();
  assert.deepEqual((await acciones(p)).slice(1), [["renombrarGrupo", "g1", "Música top"], ["borrarGrupo", "g1"]]);
  assert.equal(await p.evaluate(() => location.search), "?puntaje=6&disciplina=musica");
});

test("OL-446 · seleccionar: la casilla de cada tarjeta (o la tarjeta entera), «Seleccionar a los 5» y un solo violeta que dice qué hace; abre Investigar con los elegidos", async (t) => {
  const p = await abrir(t, "", "propone");
  await tocar(p, p.getByRole("button", { name: "Seleccionar" }));
  const barra = p.getByRole("toolbar", { name: "Con los elegidos" });
  assert.equal(await barra.getByRole("button").last().innerText(), "Elige a quién investigar");
  assert.equal(await renglonInvestigar(p).count(), 0, "mientras se selecciona, los renglones de arriba se esconden");
  const todos = p.getByRole("checkbox", { name: /^Seleccionar a los 5/ });
  assert.ok((await todos.innerText()).includes("O toca cada tarjeta"));
  // Tocar la tarjeta (su nombre) marca, no navega.
  await tocar(p, tarjeta(p, "Pargazz").getByRole("link", { name: "Pargazz" }));
  assert.equal(await tarjeta(p, "Pargazz").getAttribute("data-elegido"), "true");
  assert.equal(await tarjeta(p, "Pargazz").getByRole("checkbox").getAttribute("aria-checked"), "true");
  assert.equal(await p.evaluate(() => location.pathname), "/admin/showcase");
  assert.equal(await barra.getByRole("button").last().innerText(), "Investigar a 1 · hasta 1,00 USD");
  await tocar(p, tarjeta(p, "Pargazz").getByRole("checkbox"));
  assert.equal(await tarjeta(p, "Pargazz").getAttribute("data-elegido"), null, "la casilla desmarca");
  await tocar(p, todos);
  assert.equal(await todos.getAttribute("aria-checked"), "true");
  assert.equal(await barra.getByRole("button").last().innerText(), "Investigar a 5 · hasta 5,00 USD");
  await tocar(p, barra.getByRole("button").last());
  const hoja = p.getByRole("dialog", { name: "Investigar a varios" });
  await hoja.waitFor();
  assert.equal(await hoja.locator("h3").innerText(), "Investigar a 5");
  assert.ok((await hoja.innerText()).includes("Los 5 que elegiste"));
  assert.ok((await hoja.innerText()).includes("Sangre de Coyote, Un León Marinero, IYARI, teatro de la vida y 2 más"));
  assert.equal(await hoja.locator("p[role=status]").innerText(), "5 artistas · hasta 5,00 USD · crédito 192,40");
  await tocar(p, hoja.getByRole("button", { name: "Investigar a los 5" }));
  await hoja.waitFor({ state: "detached" });
  assert.deepEqual(await acciones(p), [["investigarVarios", ["a1", "a4", "a3", "a2", "a5"], "1,00"]]);
  await p.getByRole("button", { name: "Seleccionar" }).waitFor();
  assert.equal(await barra.count(), 0, "al mandarlos, la lista sale de Seleccionar");
  // Cancelar también sale, sin mandar nada.
  await tocar(p, p.getByRole("button", { name: "Seleccionar" }));
  await tocar(p, barra.getByRole("button", { name: "Cancelar" }));
  assert.equal(await barra.count(), 0);
});

test("OL-446 · el indicador de la tarjeta entra a «Por aprobar» en el artista, y el renglón «Por aprobar» dice cuántas y de cuántos", async (t) => {
  const p = await abrir(t, "", "corriendo", true);
  const indicador = tarjeta(p, "Sangre de Coyote").getByRole("link", { name: /evidencias por revisar/ });
  assert.equal(await indicador.getAttribute("href"), "/admin/showcase/por-aprobar#a-a1");
  assert.ok((await indicador.boundingBox()).height >= 44, "se toca: 44 de alto");
  const renglon = p.getByRole("link", { name: /^Por aprobar/ });
  assert.equal(await renglon.getAttribute("href"), "/admin/showcase/por-aprobar");
  assert.equal((await renglon.innerText()).replace(/\s+/g, " ").trim(), "Por aprobar 4 evidencias de 2 artistas · las trajo la rutina hoy 4");
  const [aprobarY, investigarY] = await Promise.all([renglon.boundingBox(), renglonInvestigar(p).boundingBox()]);
  assert.ok(aprobarY.y < investigarY.y, "«Por aprobar» antes de «Investigar»");
});

test("orden: «Puntaje» por defecto; «Nombre» ordena de la A a la Z", async (t) => {
  const p = await abrir(t);
  await p.getByRole("button", { name: /^Orden: Puntaje/ }).click();
  const hoja = p.getByRole("dialog", { name: "Ordenar por" });
  assert.deepEqual((await hoja.getByRole("button").filter({ hasNot: p.locator("[aria-label=Cerrar]") }).allInnerTexts()).map((x) => x.split("\n")[0]).filter((x) => x), ["Puntaje", "Convocatoria", "Seguidores", "Última publicación", "Nombre"]);
  assert.equal(await hoja.getByRole("button", { name: /^Puntaje/ }).getAttribute("aria-pressed"), "true");
  await hoja.getByRole("button", { name: /^Nombre/ }).click();
  await p.waitForFunction(() => location.search === "?orden=nombre");
  assert.deepEqual(await nombres(p), ["IYARI, teatro de la vida", "Pargazz", "Sangre de Coyote", "Un León Marinero", "Yanel Villarreal"]);
});

test("vista: en tabla, las mismas cifras en columnas y el orden elegido marcado", async (t) => {
  const p = await abrir(t);
  await p.getByRole("button", { name: /^Vista: tarjetas/ }).click();
  await p.getByRole("dialog", { name: "Ver como" }).getByRole("button", { name: /^Tabla/ }).click();
  const tabla = p.getByRole("region", { name: "Candidatos en tabla" });
  await tabla.waitFor();
  assert.equal(await p.evaluate(() => location.search), "?vista=tabla");
  assert.equal(await tabla.locator("th[aria-sort]").innerText(), "TOTAL");
  // Lo que se ve de cada celda (sin lo que solo se oye: «, fijado a mano», «sin datos»).
  const visible = (n) => tabla.locator("tbody tr").nth(n).locator("td").evaluateAll((tds) => tds.map((td) => { const c = td.cloneNode(true); c.querySelectorAll("[class*=soloLector]").forEach((x) => x.remove()); return c.textContent.trim(); }));
  assert.deepEqual(await visible(0), ["Sangre de Coyote", "Música", "Invitado", "2", "1", "2", "1", "6", "7", "4", "1", "3,2 mil", "hace 2 días"]);
  // OL-437: lo propuesto, en contorno discontinuo; sin datos, una raya que se oye «sin datos».
  const pargazz = tabla.locator("tbody tr", { hasText: "Pargazz" }).locator("span[data-origen]");
  assert.deepEqual(await pargazz.evaluateAll((xs) => xs.map((x) => `${x.dataset.origen} ${getComputedStyle(x).borderTopStyle}`)), Array(4).fill("propuesto dashed"));
  const yanel = tabla.locator("tbody tr", { hasText: "Yanel" });
  assert.deepEqual((await visible(4)).slice(3, 8), ["–", "–", "–", "–", "0"]);
  assert.equal(await yanel.locator("td", { has: p.locator("span[data-origen=sin_datos]") }).first().textContent(), "–sin datos", "la raya se ve; «sin datos» se oye");
  assert.equal(await tabla.locator("tbody tr").first().locator("td").nth(3).textContent(), "22, fijado a mano", "el número se ve y la frase entera se oye");
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth), 390, "la tabla se desliza dentro de su caja, no la página");
});

test("OL-437 · en un teléfono de 320, la tabla no ensancha la página (lo que solo se oye de sus celdas se queda en su caja)", async (t) => {
  // En un teléfono, lo que se sale de la página hace que la vista se aleje (innerWidth crece) y los toques dejan de medir 44.
  const context = await browser.newContext({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  t.after(() => context.close());
  const p = await context.newPage();
  await p.goto(`${origin}/admin/showcase?vista=tabla`);
  await p.getByRole("region", { name: "Candidatos en tabla" }).waitFor();
  assert.equal(await p.evaluate(() => innerWidth), 320, "la vista no se aleja");
});

// ---------- OL-439: «Investigar» a varios desde la lista ----------
const renglonInvestigar = (p) => p.getByRole("button", { name: /^Investigar/ });
const acciones = (p) => p.evaluate(() => window.qa.acciones);
const tarjeta = (p, nombre) => p.locator("ul[aria-label=Candidatos] > li", { hasText: nombre });

test("OL-439 · el renglón propone a los candidatos por investigar; la hoja dice a quiénes, el tope y el total, y confirmar los manda", async (t) => {
  const p = await abrir(t, "", "propone");
  const renglon = renglonInvestigar(p);
  assert.equal((await renglon.innerText()).replace(/\s+/g, " ").trim(), "Investigar 2 candidatos por investigar", "los marcados candidato o revisado: Pargazz y Yanel");
  // Entre la línea de cifras y las tarjetas.
  const [cifrasY, renglonY, listaY] = await Promise.all([p.locator("p[role=status]"), renglon, p.locator("ul[aria-label=Candidatos]")].map((l) => l.boundingBox().then((b) => b.y)));
  assert.ok(cifrasY < renglonY && renglonY < listaY, "el renglón va bajo la línea de cifras y antes de las tarjetas");
  await renglon.click();
  const hoja = p.getByRole("dialog", { name: "Investigar a varios" });
  await hoja.waitFor();
  const candidatos = hoja.getByRole("button", { name: /^Candidatos por investigar/ });
  assert.equal(await candidatos.getAttribute("aria-pressed"), "true", "por omisión, los candidatos por investigar");
  assert.ok((await candidatos.innerText()).includes("2 artistas · candidatos o revisados, sin investigar en 30 días"));
  assert.ok((await hoja.getByRole("button", { name: /^Los que se ven en la lista/ }).innerText()).includes("5 artistas de la lista"));
  const tope = hoja.getByRole("textbox", { name: /Tope por artista/ });
  assert.equal(await tope.inputValue(), "1,00");
  const total = hoja.locator("p[role=status]");
  assert.equal(await total.innerText(), "2 artistas · hasta 2,00 USD · crédito 192,40");
  await tope.fill("0,50");
  assert.equal(await total.innerText(), "2 artistas · hasta 1,00 USD · crédito 192,40", "el total sigue al tope");
  // La ✕ del campo lo limpia y el botón no manda nada sin tope.
  await hoja.getByRole("button", { name: /Borrar|Limpiar/ }).click();
  assert.equal(await tope.inputValue(), "");
  await hoja.getByRole("button", { name: "Investigar a los 2" }).click();
  await hoja.getByText("Escribe el tope en dólares.").waitFor();
  assert.deepEqual(await acciones(p), [], "un tope que no vale no llega al servidor");
  await tope.fill("0,50");
  await hoja.getByRole("button", { name: "Investigar a los 2" }).click();
  await hoja.waitFor({ state: "detached" });
  assert.deepEqual(await acciones(p), [["investigarVarios", ["a2", "a5"], "0,50"]]);
});

test("OL-439 · «Los que se ven en la lista» sigue el filtro y dice quién queda fuera; con una orden en curso la hoja la dice", async (t) => {
  const p = await abrir(t, "?disciplina=musica", "corriendo");
  await renglonInvestigar(p).click();
  const hoja = p.getByRole("dialog", { name: "Investigar a varios" });
  await hoja.waitFor();
  assert.ok(await hoja.getByText("Ahora: Investigando a 3 · 1 terminado · 0,51 USD.").isVisible(), "la orden en curso, primero");
  // Ningún marcado queda por investigar (Pargazz investiga, Yanel espera su turno): la hoja abre en «Los que se ven».
  assert.equal(await hoja.getByRole("button", { name: /^Candidatos por investigar/ }).getAttribute("aria-pressed"), "false");
  const visibles = hoja.getByRole("button", { name: /^Los que se ven en la lista/ });
  assert.equal(await visibles.getAttribute("aria-pressed"), "true");
  assert.ok((await visibles.innerText()).includes("1 artista con este filtro · sin 2 investigados en 30 días"), "de música: León sí; Sangre (hoy) y Pargazz (investigando), no");
  assert.equal(await hoja.locator("p[role=status]").last().innerText(), "1 artista · hasta 1,00 USD · crédito 192,40");
  await hoja.getByRole("button", { name: "Investigar a 1 artista" }).click();
  await hoja.waitFor({ state: "detached" });
  assert.deepEqual(await acciones(p), [["investigarVarios", ["a4"], "1,00"]]);
  // Con «Candidatos por investigar» (nadie), la hoja lo dice y solo se cierra.
  await renglonInvestigar(p).click();
  await hoja.getByRole("button", { name: /^Candidatos por investigar/ }).click();
  assert.ok(await hoja.getByText("Nadie por investigar con esta opción.").isVisible());
  assert.equal(await hoja.getByRole("button", { name: /^Investigar a/ }).count(), 0);
  assert.equal(await hoja.getByRole("button", { name: "Cerrar", exact: true }).count(), 2, "la ✕ de la hoja y el «Cerrar» del pie");
});

test("OL-439 · pasar del crédito que queda se dice, con el foco en el tope, y no se manda; un tope de más de 50 tampoco", async (t) => {
  const p = await abrir(t, "", "propone");
  await renglonInvestigar(p).click();
  const hoja = p.getByRole("dialog", { name: "Investigar a varios" });
  await hoja.getByRole("button", { name: /^Los que se ven en la lista/ }).click();
  const tope = hoja.getByRole("textbox", { name: /Tope por artista/ });
  await tope.fill("50");
  assert.equal(await hoja.locator("p[role=status]").innerText(), "5 artistas · hasta 250,00 USD · crédito 192,40");
  await hoja.getByRole("button", { name: "Investigar a los 5" }).click();
  await hoja.getByRole("alert").getByText("Pasa del crédito que queda (192,40 USD): baja el tope o elige a menos.").waitFor();
  assert.equal(await p.evaluate(() => document.activeElement?.getAttribute("name")), "tope-lote");
  await tope.fill("99");
  await hoja.getByRole("button", { name: "Investigar a los 5" }).click();
  await hoja.getByText(/Un tope de más de 0 y hasta 50 USD/).waitFor();
  assert.deepEqual(await acciones(p), []);
  // Si el servidor no puede, la hoja sigue abierta y lo dice.
  await p.evaluate(() => (window.qa.falla = true));
  await tope.fill("1");
  await hoja.getByRole("button", { name: "Investigar a los 5" }).click();
  await hoja.getByRole("alert").getByText("Sin conexión con la base. Intenta de nuevo.").waitFor();
  assert.equal((await acciones(p)).length, 1);
});

test("OL-439 · más de 60: la hoja lo dice y su salida es filtrar por disciplina (los chips quedan a la vista y con el foco)", async (t) => {
  const p = await abrir(t, "", "muchos");
  await renglonInvestigar(p).click();
  const hoja = p.getByRole("dialog", { name: "Investigar a varios" });
  await hoja.getByRole("button", { name: /^Los que se ven en la lista/ }).click();
  assert.ok(await hoja.getByText("Son 71: elige hasta 60 o filtra por disciplina.").isVisible());
  assert.equal(await hoja.getByRole("textbox", { name: /Tope por artista/ }).count(), 0, "sin tope ni total: no se puede mandar");
  await hoja.getByRole("button", { name: "Filtrar por disciplina" }).click();
  await hoja.waitFor({ state: "detached" });
  await p.waitForFunction(() => document.activeElement?.closest("[aria-label='Filtrar por disciplina']"));
  assert.equal(await p.evaluate(() => document.activeElement.innerText.replace(/\s+/g, " ").trim()), "Todas 71");
  assert.deepEqual(await acciones(p), []);
});

test("OL-439 · mientras corre: el renglón dice cómo va con su barra, cada tarjeta su investigación, «por revisar» en violeta, y la lista se vuelve a leer cada 20 s", async (t) => {
  const p = await abrir(t, "", "corriendo", true);
  const renglon = renglonInvestigar(p);
  assert.equal((await renglon.locator("small").innerText()), "Investigando a 3 · 1 terminado · 0,51 USD");
  assert.equal(await renglon.getByRole("progressbar").getAttribute("aria-valuenow"), "50", "(1 + 0,5 + 0) / 3");
  assert.equal(await tarjeta(p, "Sangre de Coyote").locator("[data-revisar]").innerText(), "Investigado hoy · 3 evidencias por revisar");
  assert.equal(await tarjeta(p, "Pargazz").innerText().then((x) => x.includes("Investigando · 2 de 4 búsquedas")), true);
  assert.equal(await tarjeta(p, "Yanel").innerText().then((x) => x.includes("Investigando · por empezar")), true);
  assert.equal(await tarjeta(p, "Un León Marinero").locator("[data-revisar]").innerText(), "1 evidencia por revisar", "sin investigación propia, solo lo que deja por revisar");
  assert.ok(!/Investig|por revisar/.test(await tarjeta(p, "IYARI").innerText()), "nada que decir: sin línea");
  const violeta = await tarjeta(p, "Sangre de Coyote").locator("[data-revisar]").evaluate((e) => getComputedStyle(e).color);
  const primario = await p.evaluate(() => {
    const x = document.body.appendChild(document.createElement("i"));
    x.style.color = "var(--primario)";
    const c = getComputedStyle(x).color;
    x.remove();
    return c;
  });
  assert.equal(violeta, primario, "con algo por revisar, en el violeta de las acciones");
  // La recarga suave: cada 20 s con la hoja cerrada; con la hoja abierta, nada; al volver a la pantalla, enseguida.
  const refrescos = () => p.evaluate(() => window.qa.refrescos);
  const historial = await p.evaluate(() => history.length);
  await p.clock.runFor(19_000);
  assert.equal(await refrescos(), 0);
  await p.clock.runFor(1_000);
  assert.equal(await refrescos(), 1);
  await renglon.click();
  await p.getByRole("dialog", { name: "Investigar a varios" }).waitFor();
  await p.clock.runFor(45_000);
  assert.equal(await refrescos(), 1, "con la hoja abierta no se recarga");
  await p.keyboard.press("Escape");
  await p.getByRole("dialog").waitFor({ state: "detached" });
  await p.clock.runFor(20_000);
  assert.equal(await refrescos(), 2);
  await p.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  assert.equal(await refrescos(), 3, "al volver a la pantalla");
  assert.equal(await p.evaluate(() => history.length), historial, "recargar no es navegar");
});

test("OL-439 · sin investigaciones leídas no hay renglón; sin nada corriendo, la lista no se recarga", async (t) => {
  const sin = await abrir(t, "", "sin");
  assert.equal(await renglonInvestigar(sin).count(), 0);
  assert.equal(await sin.locator("[data-revisar]").count(), 0);
  const p = await abrir(t, "", "propone", true);
  await p.clock.runFor(60_000);
  assert.equal(await p.evaluate(() => window.qa.refrescos), 0);
});
