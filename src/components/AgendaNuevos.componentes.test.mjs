/** Prueba de componente de la pestaña Nuevos de Agenda (docs/rediseno/23; ajuste del founder, 2026-09-30: «revive la tab de "Nuevos" en agenda»): `AgendaInicio` real,
 *  con su `Cabecera`, sus pestañas y sus estilos, y el carril «Nuevos eventos» de Inicio (`CarrilNuevos`). Cubre: Todos es la Agenda de siempre y Nuevos cambia
 *  la lista (lo publicado en los últimos 7 días, agrupado por cuándo se publicó, con el día del evento en el renglón); la pestaña vive en la URL y cambiarla no
 *  apila historial; enseñar Nuevos la marca como vista, pero volver de una ficha la repone como estaba y una visita nueva ya no ve lo visto («Nada nuevo desde tu
 *  última visita.»); con filtros puestos no se marca nada (lo que no se enseñó sigue siendo nuevo) y el botón «Ver N eventos» cuenta dentro de la pestaña; las
 *  pestañas son toques de 44, van a la izquierda en el teléfono y al centro desde 792, y la raya común es la de la cabecera; y el carril de Inicio deja lo mismo
 *  que la pestaña y lleva a ella.
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
const AHORA = "2026-09-17T18:00:00Z"; // jueves, 12:00 en la ciudad (seis horas detrás de UTC)
const ZONA = "America/Mexico_City";
const MARCA = "somosnosotros:nuevos-visto:san-luis-potosi";
const evento = (id, creado_en, inicio, cambios = {}) => ({ id, titulo: `Evento ${id}`, inicio, fin: null, imagen: null, precio: null, lugar_id: null, sitio_texto: "Foro", sitio_reservado: false, zona: ZONA, lugar: null, creado_en, van: 0, ...cambios });
// Tres publicados hoy, uno ayer, uno el lunes y uno hace dos semanas (este no es nuevo). «suyo» es el más lejano: el 8 de octubre a las 19:00.
const EVENTOS = [
  evento("suyo", "2026-09-17T17:00:00Z", "2026-10-09T01:00:00Z"),
  evento("pago", "2026-09-17T16:30:00Z", "2026-09-20T01:00:00Z", { precio: "Cooperación solidaria" }),
  evento("hoy", "2026-09-17T16:00:00Z", "2026-09-19T03:00:00Z"),
  evento("ayer", "2026-09-16T10:00:00Z", "2026-09-19T01:00:00Z"),
  evento("semana", "2026-09-14T10:00:00Z", "2026-09-20T01:00:00Z"),
  evento("viejo", "2026-09-01T10:00:00Z", "2026-09-21T01:00:00Z"),
];
const MUCHOS = Array.from({ length: 100 }, (_, i) => evento(`nuevo-${i}`, new Date(Date.parse(AHORA) - i * 60000).toISOString(), "2026-10-09T01:00:00Z")).reverse();
let browser, server, dir, origin;

const mocks = {
  // El optimizador real se prueba en Imagen.componentes; aquí se mide el consumidor.
  "next/image": "import React from 'react';export default function Image({quality,...p}){return React.createElement('img',p)}",
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link(p){return React.createElement('a',p)}",
  // Como Next: cambiar la dirección con `history.replaceState` actualiza `useSearchParams` sin pedir nada al servidor.
  "next/navigation": `import {useSyncExternalStore} from 'react';
    const oyentes=new Set();const reemplazar=history.replaceState.bind(history);
    history.replaceState=(...a)=>{reemplazar(...a);oyentes.forEach((f)=>f())};
    const suscribir=(f)=>{oyentes.add(f);return()=>oyentes.delete(f)};
    export const usePathname=()=>useSyncExternalStore(suscribir,()=>location.pathname);
    export const useSearchParams=()=>new URLSearchParams(useSyncExternalStore(suscribir,()=>location.search));
    export const useRouter=()=>({push(){},replace(){},refresh(){}});`,
  "@/app/eventos/acciones": "export async function cambiarAsistencia(){return true}",
  "./ConsentimientoAvisos": "export default function Consentimiento(){return null}",
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "agendanuevos-componentes-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React, {useState} from 'react';import {createRoot} from 'react-dom/client';
      import AgendaInicio from './src/components/AgendaInicio';import CarrilNuevos from './src/components/inicio/CarrilNuevos';
      import {hrefAgenda, SIN_FILTROS} from './src/lib/agenda';import './src/app/globals.css';
      const ciudad = { slug: 'san-luis-potosi', nombre: 'San Luis Potosí', centro: { lng: -100.97, lat: 22.14 }, zoom: 13, lugares: 9, eventos: 6, zona: '${ZONA}' };
      const eventos = new URLSearchParams(location.search).has('muchos') ? ${JSON.stringify(MUCHOS)} : ${JSON.stringify(EVENTOS)};
      const agenda = Promise.resolve({ eventos, seguidos: null, eventosSeguidos: [], asistencias: null, destacados: [] });
      const tarjetas = eventos.filter((e) => e.id !== 'viejo').map((e) => ({ id: e.id, href: '/eventos/' + e.id, foto: null, titulo: e.titulo, detalle: 'jue 8 de oct · 19:00', sitio: 'Foro', van: 0, inicio: e.inicio, fin: null, zona: e.zona, creado_en: e.creado_en }));
      window.qa = {};
      function Agenda(){
        const [n, setN] = useState(0);
        window.qa.remontar = () => setN((v) => v + 1);
        return <AgendaInicio key={n} agenda={agenda} ciudad={ciudad} ciudades={[ciudad]} hoy="2026-09-17" zona={ciudad.zona} conSesion={false} filtrosIniciales={{ cuando: null, cuanto: [], siguiendo: false }} />;
      }
      const carril = <CarrilNuevos ciudad="san-luis-potosi" tarjetas={tarjetas} asistencias={null} avisos={null} titulo="Nuevos eventos" tamano="mediana" memoria="inicio-nuevos" verTodos={{ href: hrefAgenda(SIN_FILTROS, null, true), etiqueta: 'Ver la agenda' }} />;
      createRoot(document.getElementById('root')).render(location.pathname === '/inicio' ? carril : <Agenda />);
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
    ["/app.js", ["text/javascript", await readFile(join(dir, "app.js"))]],
    ["/app.css", ["text/css", await readFile(join(dir, "app.css"))]],
  ]);
  const pagina = ["text/html", '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--fuente-bricolage:Arial}</style><div id="root"></div><script src="/app.js"></script>'];
  server = createServer((req, res) => {
    const a = assets.get(req.url.split("?")[0]) ?? pagina;
    res.writeHead(200, { "Content-Type": `${a[0]}; charset=utf-8` });
    res.end(a[1]);
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

/** `marca`: la última visita que el teléfono ya tiene guardada, antes de abrir. */
async function abrir(ruta = "/agenda", { ancho = 390, marca = null } = {}) {
  const context = await browser.newContext({ viewport: { width: ancho, height: 844 }, timezoneId: ZONA, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.clock.install({ time: new Date(AHORA) });
  if (marca) await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [MARCA, marca]);
  await page.goto(origin + ruta);
  return { context, page };
}
const pestana = (page, nombre) => page.getByRole("tab", { name: nombre, exact: true });
const titulos = (page) => page.locator("main h2, #root h2").allTextContents();
const ids = (page) => page.locator("a[href^='/eventos/']").evaluateAll((as) => as.map((a) => a.getAttribute("href").split("/").pop()));
const marca = (page) => page.evaluate((k) => localStorage.getItem(k), MARCA);
/** Espera a que la lista de esa pestaña esté pintada (la agenda llega diferida). */
const esperarLista = (page, n) => page.waitForFunction((n) => document.querySelectorAll("a[href^='/eventos/']").length === n, n);

test("Todos es la Agenda de siempre; Nuevos cambia la lista, vive en la URL y no apila historial", async () => {
  const { context, page } = await abrir();
  await esperarLista(page, 6);
  assert.equal(await pestana(page, "Todos").getAttribute("aria-selected"), "true");
  assert.equal(new URL(page.url()).search, "");
  const historial = await page.evaluate(() => history.length);
  // Todos: todo lo que viene, agrupado por día del evento.
  assert.deepEqual((await titulos(page)).map((t) => t.replace(/\s+/g, " ")), ["Mañana· 2", "sáb 19 de sep· 2", "dom 20 de sep", "jue 8 de oct"]);

  await pestana(page, "Nuevos").click();
  await esperarLista(page, 5);
  assert.equal(new URL(page.url()).search, "?ver=nuevos");
  assert.equal(await page.evaluate(() => history.length), historial, "cambiar de pestaña reemplaza la dirección");
  assert.equal(await pestana(page, "Nuevos").getAttribute("aria-selected"), "true");
  // Por cuándo se publicó, lo último arriba; «viejo» (de hace dos semanas) no entra; el renglón lleva el día del evento.
  assert.deepEqual((await titulos(page)).map((t) => t.replace(/\s+/g, " ")), ["Lo más nuevo· 3", "Publicado ayer", "Esta semana"]);
  assert.deepEqual(await ids(page), ["suyo", "pago", "hoy", "ayer", "semana"]);
  assert.match(await page.locator("a[href='/eventos/suyo']").innerText(), /jue 8 de oct · 19:00/);
  // Con el día, la línea es larga: lo que se corta es el precio, nunca el día ni la hora.
  const linea = await page.locator("a[href='/eventos/pago'] small > span").first().evaluate((l) => ({ cuandoCortado: l.querySelector("b").scrollWidth > l.querySelector("b").clientWidth, precioCortado: l.lastElementChild.scrollWidth > l.lastElementChild.clientWidth }));
  assert.deepEqual(linea, { cuandoCortado: false, precioCortado: true });
  // Enseñarla la marca como vista: un instante después de la publicación más reciente, que sale de los datos y no del reloj del teléfono.
  assert.equal(await marca(page), "2026-09-17T17:00:00.001Z");

  await pestana(page, "Todos").click();
  await esperarLista(page, 6);
  assert.equal(new URL(page.url()).search, "");
  await pestana(page, "Nuevos").click();
  await esperarLista(page, 5);
  assert.equal(await page.evaluate(() => history.length), historial);
  await context.close();
});

test("la pestaña a la que se cambia empieza arriba, no donde estaba la otra", async () => {
  const { context, page } = await abrir();
  await page.setViewportSize({ width: 390, height: 420 });
  await esperarLista(page, 6);
  await page.evaluate(() => window.scrollTo(0, 200));
  assert.ok((await page.evaluate(() => scrollY)) > 100, "hay desplazamiento que perder");
  await pestana(page, "Nuevos").click();
  await esperarLista(page, 5);
  assert.equal(await page.evaluate(() => scrollY), 0);
  await context.close();
});

test("un enlace a ?ver=nuevos abre Nuevos", async () => {
  const { context, page } = await abrir("/agenda?ver=nuevos");
  await esperarLista(page, 5);
  assert.equal(await pestana(page, "Nuevos").getAttribute("aria-selected"), "true");
  assert.equal(await pestana(page, "Todos").getAttribute("aria-selected"), "false");
  await context.close();
});

test("volver de una ficha repone Nuevos como estaba, aunque ya se marcó; una visita nueva ya no ve lo visto", async () => {
  const { context, page } = await abrir("/agenda?ver=nuevos");
  await esperarLista(page, 5);
  assert.equal(await marca(page), "2026-09-17T17:00:00.001Z");
  // Se sale a una ficha y se vuelve (la pantalla se monta otra vez; la memoria de pantalla es de la sesión): la misma lista, no una vacía.
  await page.evaluate(() => window.qa.remontar());
  await esperarLista(page, 5);
  assert.equal(new URL(page.url()).search, "?ver=nuevos");
  assert.deepEqual(await ids(page), ["suyo", "pago", "hoy", "ayer", "semana"]);
  // Una sesión nueva (sin esa memoria): lo que ya se vio no vuelve, y el vacío es solo la frase.
  await page.evaluate(() => {
    sessionStorage.clear();
    window.qa.remontar();
  });
  await page.getByText("Nada nuevo desde tu última visita.").waitFor();
  assert.deepEqual(await ids(page), []);
  assert.deepEqual(await titulos(page), []);
  assert.equal(await page.locator("header ~ *").innerText(), "Nada nuevo desde tu última visita.", "sin botones ni invitaciones");
  assert.equal(await page.locator("header ~ * a, header ~ * button").count(), 0);
  await context.close();
});

test("lo nuevo es desde la última visita, con tope de 7 días", async () => {
  // Visitó hace unas horas: solo lo de hoy. Visitó hace un mes: manda el tope y «viejo» (de hace 16 días) sigue fuera.
  const reciente = await abrir("/agenda?ver=nuevos", { marca: "2026-09-17T16:10:00Z" });
  await esperarLista(reciente.page, 2);
  assert.deepEqual(await ids(reciente.page), ["suyo", "pago"]);
  await reciente.context.close();
  const vieja = await abrir("/agenda?ver=nuevos", { marca: "2026-08-17T00:00:00Z" });
  await esperarLista(vieja.page, 5);
  await vieja.context.close();
});

test("con filtros puestos no se marca nada, y el botón «Ver N eventos» cuenta dentro de la pestaña", async () => {
  const { context, page } = await abrir();
  await esperarLista(page, 6);
  // Gratis desde Todos: 5 (todos menos «pago»).
  await page.getByRole("button", { name: "Filtros" }).click();
  await page.getByRole("dialog", { name: "Filtros" }).getByRole("button", { name: "Gratis", exact: true }).click();
  assert.equal(await page.getByRole("dialog", { name: "Filtros" }).getByRole("button", { name: /^Ver / }).innerText(), "Ver 5 eventos");
  await page.getByRole("dialog", { name: "Filtros" }).getByRole("button", { name: /^Ver / }).click();
  await esperarLista(page, 5);
  // En Nuevos, el mismo filtro deja 4 (lo nuevo y gratis), y como no se enseñó todo no se marca.
  await pestana(page, "Nuevos").click();
  await esperarLista(page, 4);
  assert.deepEqual(await ids(page), ["suyo", "hoy", "ayer", "semana"]);
  assert.equal(await marca(page), null);
  // Con la hoja abierta en Nuevos, el botón cuenta lo de Nuevos.
  await page.getByRole("button", { name: "Filtros" }).click();
  await page.getByRole("dialog", { name: "Filtros" }).getByRole("button", { name: "Gratis", exact: true }).click();
  assert.equal(await page.getByRole("dialog", { name: "Filtros" }).getByRole("button", { name: /^Ver / }).innerText(), "Ver 5 eventos", "sin «Gratis»: los 5 nuevos");
  await page.getByRole("dialog", { name: "Filtros" }).getByRole("button", { name: "Cerrar" }).first().click();
  // Quitar el filtro enseña todo lo nuevo y entonces sí se marca.
  await page.getByRole("button", { name: /Gratis/ }).click();
  await esperarLista(page, 5);
  assert.equal(await marca(page), "2026-09-17T17:00:00.001Z");
  await context.close();
});

test("las pestañas son toques de 44, van a la izquierda en el teléfono, y la raya común es la de la cabecera", async () => {
  const { context, page } = await abrir();
  await esperarLista(page, 6);
  const m = await page.evaluate(() => {
    const cabecera = document.querySelector("header");
    const tira = document.querySelector("[role=tablist]");
    const caja = (el) => el.getBoundingClientRect();
    return {
      cabecera: caja(cabecera),
      tira: caja(tira),
      tabs: [...tira.children].map((t) => caja(t)),
      raya: getComputedStyle(cabecera).boxShadow,
      rayaPropia: getComputedStyle(tira).boxShadow,
      gutter: parseFloat(getComputedStyle(tira).paddingLeft),
    };
  });
  for (const t of m.tabs) assert.ok(t.width >= 44 && t.height >= 44, `toque de ${t.width}×${t.height}`);
  assert.equal(m.tabs[0].left, m.gutter, "la primera, al borde de la columna");
  assert.equal(m.tira.bottom, m.cabecera.bottom, "la tira es la última fila: pega con la raya de abajo de la cabecera");
  assert.match(m.raya, /0px -1px 0px 0px inset/);
  assert.equal(m.rayaPropia, "none");
  assert.equal(m.cabecera.height, 52 + 44, "la fila de contexto y las pestañas: 96");
  await context.close();

  const ancha = await abrir("/agenda", { ancho: 1280 });
  await esperarLista(ancha.page, 6);
  const c = await ancha.page.evaluate(() => {
    const tabs = [...document.querySelector("[role=tablist]").children].map((t) => t.getBoundingClientRect());
    return { centro: (tabs[0].left + tabs.at(-1).right) / 2, ventana: innerWidth / 2 };
  });
  assert.ok(Math.abs(c.centro - c.ventana) <= 1, `centradas: ${c.centro} contra ${c.ventana}`);
  await ancha.context.close();
});

test("el carril «Nuevos eventos» de Inicio deja lo mismo que la pestaña, y lleva a ella", async () => {
  // Sin visita: lo de los últimos 7 días (las cinco tarjetas del servidor).
  const sin = await abrir("/inicio");
  await sin.page.getByRole("heading", { name: "Nuevos eventos" }).waitFor();
  assert.deepEqual(await ids(sin.page), ["suyo", "pago", "hoy", "ayer", "semana"]);
  assert.equal(await sin.page.getByRole("link", { name: /Ver la agenda/ }).getAttribute("href"), "/agenda?ver=nuevos");
  await sin.context.close();
  // Con la visita del lunes por la noche: las mismas cuatro que enseña la pestaña con esa marca.
  const visita = "2026-09-16T00:00:00Z";
  const conVisita = await abrir("/inicio", { marca: visita });
  await conVisita.page.getByRole("heading", { name: "Nuevos eventos" }).waitFor();
  const delCarril = await ids(conVisita.page);
  assert.deepEqual(delCarril, ["suyo", "pago", "hoy", "ayer"]);
  await conVisita.context.close();
  const pestanaNuevos = await abrir("/agenda?ver=nuevos", { marca: visita });
  await esperarLista(pestanaNuevos.page, 4);
  assert.deepEqual(await ids(pestanaNuevos.page), delCarril);
  await pestanaNuevos.context.close();
  // Con menos de tres, el carril no se pinta (la regla de siempre de «Nuevos eventos»).
  const pocas = await abrir("/inicio", { marca: "2026-09-17T16:10:00Z" });
  await pocas.page.waitForTimeout(300);
  assert.equal(await pocas.page.getByRole("heading", { name: "Nuevos eventos" }).count(), 0);
  assert.deepEqual(await ids(pocas.page), []);
  await pocas.context.close();
});

test("Inicio limita 100 tarjetas a 20 también en el cliente y conserva la continuación en Agenda", async () => {
  for (const marca of [undefined, "2026-09-17T17:51:00Z"]) {
    const { page, context } = await abrir("/inicio?muchos=1", { marca });
    await page.getByRole("heading", { name: "Nuevos eventos" }).waitFor();
    const cantidad = marca ? 10 : 20;
    assert.deepEqual(await ids(page), Array.from({ length: cantidad }, (_, i) => `nuevo-${i}`));
    assert.equal(await page.getByRole("link", { name: /Ver la agenda/ }).getAttribute("href"), "/agenda?ver=nuevos");
    await context.close();
  }
});
