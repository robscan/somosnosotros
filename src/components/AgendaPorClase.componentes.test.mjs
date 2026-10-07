/** Prueba de componente de la agenda por clase (OL-322; doc 55 §3, prototipo caso 7): `AgendaInicio` real, con su `Cabecera`, sus hojas y sus estilos,
 *  con una exposición abierta hoy (horario del lugar), otra sin horario, un festival con tres actos y un taller de tres sesiones. Cubre: el festival
 *  es un bloque con sus actos del día y el marco no cuenta; el taller dice «Sesión n de N»; «Para visitar hoy» va tras el día de hoy, sin «Voy» y sin
 *  «00:00»; la hoja Filtros con «Qué» (una sola elección, el botón dice lo que se verá, el chip para quitarlo y sin apilar historial); Cuándo sin
 *  punto por la exposición ni por el marco y con «y N para visitar»; y a 320 nada se sale.
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
const AHORA = "2026-10-07T18:00:00Z"; // miércoles 7 de octubre, 12:00 en la ciudad
const ZONA = "America/Mexico_City";
const a = (dia, h) => new Date(`${dia}T${h}:00-06:00`).toISOString();
const evento = (id, titulo, inicio, cambios = {}) => ({ id, slug: id, titulo, inicio, fin: null, imagen: null, precio: null, lugar_id: null, sitio_texto: "Foro", sitio_reservado: false, zona: ZONA, lugar: null, creado_en: "2026-09-10T10:00:00Z", van: 0, ...cambios });
const MA_DO = [{ dias: [2, 3, 4, 5, 6, 7], abre: "10:00", cierra: "18:00" }];
const SESIONES = [
  { inicio: a("2026-10-08", "17:00"), fin: a("2026-10-08", "19:00") },
  { inicio: a("2026-10-10", "18:00"), fin: a("2026-10-10", "20:00") },
  { inicio: a("2026-10-12", "17:00"), fin: a("2026-10-12", "19:00") },
];
const EVENTOS = [
  evento("ecos", "Ecos de papel", a("2026-10-04", "00:00"), { clase: "exposicion", fin: a("2026-10-31", "23:59"), horario: MA_DO, sitio_texto: "MUNI" }),
  evento("foto", "Fotovisión", a("2026-10-01", "00:00"), { clase: "exposicion", fin: a("2026-12-20", "23:59"), horario: [] }),
  evento("cine", "Festival de Cine de Invierno", a("2026-10-09", "19:00"), { clase: "festival", fin: a("2026-10-11", "00:00"), programa: { registrados: 4 } }),
  evento("cine1", "Inauguración: La luz que queda", a("2026-10-09", "19:00"), { evento_padre_id: "cine" }),
  evento("cine2", "Charla con la directora", a("2026-10-10", "18:00"), { evento_padre_id: "cine", sitio_texto: "Cineteca" }),
  evento("cine3", "Función: cortometrajes potosinos", a("2026-10-10", "20:00"), { evento_padre_id: "cine" }),
  evento("taller", "Taller de grabado", SESIONES[0].inicio, { clase: "taller", fin: SESIONES[2].fin, sesiones: SESIONES, precio: "$300" }),
  evento("concierto", "Concierto de hoy", a("2026-10-07", "20:00")),
];
let browser, server, dir, origin;

const mocks = {
  "next/image": "import React from 'react';export default function Image({quality,...p}){return React.createElement('img',p)}",
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link(p){return React.createElement('a',p)}",
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
  dir = await mkdtemp(join(tmpdir(), "agendaporclase-componentes-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import AgendaInicio from './src/components/AgendaInicio';import './src/app/globals.css';
      const ciudad = { slug: 'san-luis-potosi', nombre: 'San Luis Potosí', centro: { lng: -100.97, lat: 22.14 }, centroConocido: true, zoom: 13, lugares: 9, eventos: 8, zona: '${ZONA}' };
      const agenda = Promise.resolve({ eventos: ${JSON.stringify(EVENTOS)}, seguidos: null, eventosSeguidos: [], asistencias: null, destacados: [] });
      const que = new URLSearchParams(location.search).get('que');
      createRoot(document.getElementById('root')).render(<AgendaInicio agenda={agenda} ciudad={ciudad} ciudades={[ciudad]} hoy="2026-10-07" zona={ciudad.zona} conSesion={false} filtrosIniciales={{ cuando: null, cuanto: [], siguiendo: false, ...(que ? { que } : {}) }} />);
    `,
    },
    plugins: [
      {
        name: "dobles",
        setup(b) {
          b.onResolve({ filter: /.*/ }, (x) => (x.path in mocks ? { path: x.path, namespace: "mock" } : undefined));
          b.onLoad({ filter: /.*/, namespace: "mock" }, (x) => ({ contents: mocks[x.path], loader: "js", resolveDir: root }));
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
    const x = assets.get(req.url.split("?")[0]) ?? pagina;
    res.writeHead(200, { "Content-Type": `${x[0]}; charset=utf-8` });
    res.end(x[1]);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  origin = `http://127.0.0.1:${server.address().port}`;
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE ?? (process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : undefined) });
});
after(async () => {
  await browser?.close();
  if (server) await new Promise((r) => server.close(r));
  if (dir) await rm(dir, { recursive: true, force: true });
});

async function abrir({ ancho = 390, ruta = "/agenda" } = {}) {
  const context = await browser.newContext({ viewport: { width: ancho, height: 844 }, timezoneId: ZONA, reducedMotion: "reduce" });
  const page = await context.newPage();
  const errores = [];
  page.on("console", (m) => m.type() === "error" && errores.push(m.text()));
  page.on("pageerror", (e) => errores.push(String(e)));
  await page.clock.install({ time: new Date(AHORA) });
  await page.goto(origin + ruta);
  await page.waitForFunction(() => document.querySelectorAll("a[href^='/eventos/']").length > 0);
  return { context, page, errores };
}
const titulos = (page) => page.locator("#root h2").allTextContents().then((t) => t.map((x) => x.replace(/\s+/g, " ")));
const grupo = (page, titulo) => page.locator("section", { has: page.locator("h2", { hasText: titulo }) });
const hoja = (page, nombre) => page.getByRole("dialog", { name: nombre });
const aplicar = (page, nombre) => hoja(page, nombre).getByRole("button", { name: /^(Ver|Sin) / });
const dia = (page, fecha) => page.locator(`[data-fecha="${fecha}"]`);

test("el festival es un bloque con sus actos del día, el taller dice «Sesión n de N» y «Para visitar hoy» va tras hoy", async () => {
  const { context, page, errores } = await abrir();
  assert.deepEqual(await titulos(page), ["Hoy", "Para visitar hoy", "Mañana", "vie 9 de oct", "sáb 10 de oct· 3", "lun 12 de oct"]);
  // El bloque: cabecera con su programa (el marco no cuenta en el «· 3» del día) y los dos actos de ese día, cada uno a su ficha con su «Voy».
  const sabado = grupo(page, "sáb 10 de oct");
  const bloque = sabado.locator("li", { has: page.locator("a[href='/eventos/cine']") });
  assert.match(await bloque.innerText(), /Festival de Cine de Invierno\s+Programa registrado: 4 actividades · 2 este día/);
  assert.deepEqual(await bloque.locator("a[href^='/eventos/cine']").evaluateAll((as) => as.map((x) => x.getAttribute("href"))), ["/eventos/cine", "/eventos/cine2", "/eventos/cine3"]);
  assert.equal(await bloque.getByRole("button", { name: /^Voy/ }).count(), 2);
  assert.match(await sabado.locator("a[href='/eventos/taller']").innerText(), /18:00\s+· Sesión 2 de 3 · \$300/);
  // «Para visitar hoy»: la abierta hoy según su horario; la que no tiene horario no promete nada aquí.
  const visitar = grupo(page, "Para visitar hoy");
  assert.match(await visitar.innerText(), /Ecos de papel\s+Abre 10:00 a\.m\.–6:00 p\.m\.\s+· hasta el sáb 31 de oct\s+MUNI/);
  assert.equal(await visitar.locator("a[href='/eventos/foto']").count(), 0);
  assert.equal(await visitar.getByRole("button").count(), 0, "sin «Voy»");
  // Ninguna exposición ni el marco salen como renglón de un día; nada dice «00:00».
  assert.equal(await page.locator("a[href='/eventos/ecos']").count(), 1);
  assert.doesNotMatch(await page.locator("#root").innerText(), /00:00/);
  assert.deepEqual(errores, []);
  await context.close();
});

test("Filtros: «Qué» elige una sola cosa, el botón dice lo que se verá y aplicarlo no apila historial", async () => {
  const { context, page } = await abrir();
  const largo = await page.evaluate(() => history.length);
  await page.getByRole("button", { name: "Filtros" }).click();
  const filtros = hoja(page, "Filtros");
  const que = filtros.getByRole("group", { name: "Qué" }).or(filtros.locator("[aria-label='Qué']"));
  assert.deepEqual(await que.getByRole("button").allTextContents(), ["Todo", "Eventos", "Exposiciones", "Talleres", "Festivales"]);
  assert.equal(await aplicar(page, "Filtros").innerText(), "Ver 7 eventos y 1 para visitar");
  await que.getByRole("button", { name: "Talleres" }).click();
  assert.equal(await aplicar(page, "Filtros").innerText(), "Ver 3 eventos");
  await que.getByRole("button", { name: "Festivales" }).click();
  assert.equal(await aplicar(page, "Filtros").innerText(), "Ver 3 eventos");
  await que.getByRole("button", { name: "Exposiciones" }).click();
  assert.equal(await que.locator("[aria-pressed='true']").count(), 1, "una sola elección");
  assert.equal(await aplicar(page, "Filtros").innerText(), "Ver 2 exposiciones");
  await aplicar(page, "Filtros").click();
  assert.deepEqual(await titulos(page), ["Para visitar· 2"]);
  assert.match(await grupo(page, "Para visitar").innerText(), /Ecos de papel\s+Hasta el sáb 31 de oct\s+· Abre hoy 10:00 a\.m\.–6:00 p\.m\.[\s\S]*Fotovisión\s+Hasta el dom 20 de dic\s+· Horario por confirmar\s+Foro/);
  assert.equal(await page.evaluate(() => history.length), largo, "filtrar no es navegar");
  // El chip para quitarlo y, con él, la agenda de siempre.
  await page.getByRole("button", { name: "Exposiciones" }).click();
  assert.equal((await titulos(page))[0], "Hoy");
  await context.close();
});

test("un enlace con ?que=festivales abre solo los bloques", async () => {
  const { context, page } = await abrir({ ruta: "/agenda?que=festivales" });
  assert.deepEqual(await titulos(page), ["vie 9 de oct", "sáb 10 de oct· 2"]);
  assert.equal(await page.locator("a[href='/eventos/taller']").count(), 0);
  await context.close();
});

test("Cuándo: sin punto por la exposición ni por el marco; un día cuenta sus renglones y lo que hay para visitar", async () => {
  const { context, page } = await abrir();
  await page.getByRole("button", { name: "Cuándo" }).click();
  await hoja(page, "Cuándo").getByRole("button", { name: "Elegir fecha…" }).click();
  const punto = (fecha) => dia(page, fecha).evaluate((e) => getComputedStyle(e, "::after").content !== "none");
  assert.ok(await punto("2026-10-09"), "la inauguración del festival");
  assert.ok(await punto("2026-10-10"));
  assert.ok(!(await punto("2026-10-11")), "el marco dura hasta el 11 pero ese día no tiene actos");
  assert.ok(!(await punto("2026-10-14")), "la exposición no pone punto");
  await dia(page, "2026-10-10").click();
  assert.equal(await aplicar(page, "Cuándo").innerText(), "Ver 3 eventos y 1 para visitar");
  await aplicar(page, "Cuándo").click();
  assert.deepEqual(await titulos(page), ["sáb 10 de oct· 3", "Para visitar el sáb 10 de oct"]);
  await context.close();
});

test("a 320 nada se sale: el bloque, sus actos y «Para visitar hoy»", async () => {
  const { context, page } = await abrir({ ancho: 320 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= 320));
  const desborda = await page.locator("#root li").evaluateAll((lis) => lis.filter((li) => li.getBoundingClientRect().right > 320.5).length);
  assert.equal(desborda, 0);
  await context.close();
});
