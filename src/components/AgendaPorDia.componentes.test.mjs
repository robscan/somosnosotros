/** Prueba de componente de la agenda por día (OL-320): `AgendaInicio` real, con su `Cabecera`, la hoja Cuándo y sus estilos, con un taller de tres
 *  sábados (cada uno con su hora), un festival de tres días con el mismo horario y eventos de un solo día. Cubre: cada evento sale en cada día en que
 *  pasa algo, con la hora de ese día y «Día 2 de 3» (y no «Del 19 al 3 de oct»); los días de en medio sin sesión no tienen nada; el día que ya pasó no sale;
 *  el título de cada día cuenta sus renglones; el mismo evento tres veces no repite llaves (React no se queja); y en Cuándo los puntos del calendario caen
 *  en los días con sesión y el botón «Ver N eventos» cuenta lo que se verá.
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
const hora = (dia, h) => new Date(`${dia}T${h}:00-06:00`).toISOString();
const evento = (id, titulo, inicio, fin = null, cambios = {}) => ({ id, titulo, inicio, fin, imagen: null, precio: null, lugar_id: null, sitio_texto: "Foro", sitio_reservado: false, zona: ZONA, lugar: null, creado_en: "2026-09-10T10:00:00Z", van: 0, ...cambios });
// El taller: sábados 19 y 26 de sep y 3 de oct, cada uno con su hora. El festival: del viernes 18 al domingo 20, de 20:00 a 21:00 cada día.
const SESIONES = [
  { inicio: hora("2026-09-19", "17:00"), fin: hora("2026-09-19", "19:00") },
  { inicio: hora("2026-09-26", "18:00"), fin: hora("2026-09-26", "20:00") },
  { inicio: hora("2026-10-03", "17:00"), fin: hora("2026-10-03", "19:00") },
];
const EVENTOS = [
  evento("taller", "Taller de grabado", SESIONES[0].inicio, SESIONES[2].fin, { sesiones: SESIONES, precio: "$300" }),
  evento("festival", "Festival de linternas", hora("2026-09-18", "20:00"), hora("2026-09-20", "21:00")),
  evento("jazz", "Noche de jazz", hora("2026-09-26", "19:00")),
  evento("hoy", "Concierto de hoy", hora("2026-09-17", "19:00")),
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
  dir = await mkdtemp(join(tmpdir(), "agendapordia-componentes-"));
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
      const ciudad = { slug: 'san-luis-potosi', nombre: 'San Luis Potosí', centro: { lng: -100.97, lat: 22.14 }, centroConocido: true, zoom: 13, lugares: 9, eventos: 4, zona: '${ZONA}' };
      const agenda = Promise.resolve({ eventos: ${JSON.stringify(EVENTOS)}, seguidos: null, eventosSeguidos: [], asistencias: null, destacados: [] });
      createRoot(document.getElementById('root')).render(<AgendaInicio agenda={agenda} ciudad={ciudad} ciudades={[ciudad]} hoy="2026-09-17" zona={ciudad.zona} conSesion={false} filtrosIniciales={{ cuando: null, cuanto: [], siguiendo: false }} />);
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

/** `ahora`: el reloj del teléfono; por defecto, el jueves 17 a las 12:00. */
async function abrir({ ahora = AHORA, ancho = 390 } = {}) {
  const context = await browser.newContext({ viewport: { width: ancho, height: 844 }, timezoneId: ZONA, reducedMotion: "reduce" });
  const page = await context.newPage();
  const errores = [];
  page.on("console", (m) => m.type() === "error" && errores.push(m.text()));
  page.on("pageerror", (e) => errores.push(String(e)));
  await page.clock.install({ time: new Date(ahora) });
  await page.goto(origin + "/agenda");
  await page.waitForFunction(() => document.querySelectorAll("a[href^='/eventos/']").length > 0);
  return { context, page, errores };
}
const renglones = (page) => page.locator("a[href^='/eventos/']").evaluateAll((as) => as.map((a) => ({ id: a.getAttribute("href").split("/").pop(), texto: a.innerText.replace(/\s+/g, " ").trim() })));
const titulos = (page) => page.locator("#root h2").allTextContents().then((t) => t.map((x) => x.replace(/\s+/g, " ")));
const hoja = (page, nombre) => page.getByRole("dialog", { name: nombre });
const aplicar = (page, nombre) => hoja(page, nombre).getByRole("button", { name: /^(Ver|Sin) / });
const dia = (page, fecha) => page.locator(`[data-fecha="${fecha}"]`);

test("cada evento sale en cada día en que pasa algo, con la hora de ese día y «Día n de N»", async () => {
  const { context, page, errores } = await abrir();
  assert.deepEqual(await titulos(page), ["Hoy", "Mañana", "sáb 19 de sep· 2", "dom 20 de sep", "sáb 26 de sep· 2", "sáb 3 de oct"]);
  const lista = await renglones(page);
  assert.deepEqual(lista.map((r) => r.id), ["hoy", "festival", "taller", "festival", "festival", "taller", "jazz", "taller"]);
  const taller = lista.filter((r) => r.id === "taller").map((r) => r.texto);
  assert.match(taller[0], /17:00 · Día 1 de 3 · \$300/);
  assert.match(taller[1], /18:00 · Día 2 de 3 · \$300/);
  assert.match(taller[2], /17:00 · Día 3 de 3 · \$300/);
  assert.deepEqual(lista.filter((r) => r.id === "festival").map((r) => r.texto.match(/\d\d:\d\d · Día \d de \d/)?.[0]), ["20:00 · Día 1 de 3", "20:00 · Día 2 de 3", "20:00 · Día 3 de 3"]);
  // Ni el evento de un solo día lleva «Día»; ningún renglón dice el rango de siempre.
  assert.doesNotMatch(lista.find((r) => r.id === "jazz").texto, /Día/);
  assert.ok(lista.every((r) => !/Del \d+ al/.test(r.texto)));
  assert.deepEqual(errores, [], "el mismo evento tres veces no repite llaves");
  await context.close();
});

test("el día que ya pasó no sale: el segundo sábado, el primero y el festival ya no están", async () => {
  // «hoy» es un evento de un solo día que la base ya habría quitado (`termina`): aquí solo se mira lo que se reparte en varios días.
  const { context, page } = await abrir({ ahora: hora("2026-09-26", "12:00") });
  const titulosDeDias = (await titulos(page)).filter((t) => !/jue 17/.test(t));
  assert.deepEqual(titulosDeDias, ["Hoy· 2", "sáb 3 de oct"]);
  const lista = (await renglones(page)).filter((r) => r.id !== "hoy");
  assert.deepEqual(lista.map((r) => r.id), ["taller", "jazz", "taller"]);
  assert.deepEqual(lista.map((r) => r.texto.match(/Día \d de \d/)?.[0] ?? null), ["Día 2 de 3", null, "Día 3 de 3"]);
  await context.close();
});

test("Cuándo: los puntos del calendario caen en los días con sesión y el botón cuenta lo que se verá", async () => {
  const { context, page } = await abrir();
  await page.getByRole("button", { name: "Cuándo" }).click();
  const dialogo = hoja(page, "Cuándo");
  await dialogo.getByRole("button", { name: "Elegir fecha…" }).click();
  const punto = (fecha) => dia(page, fecha).evaluate((e) => getComputedStyle(e, "::after").content !== "none");
  assert.ok(await punto("2026-09-19"), "el primer sábado");
  assert.ok(await punto("2026-09-26"), "el segundo");
  assert.ok(!(await punto("2026-09-23")), "un día de en medio, sin sesión, no tiene punto");
  assert.ok(!(await punto("2026-09-25")));
  // Un día con dos cosas cuenta dos; uno de en medio, ninguna.
  await dia(page, "2026-09-26").click();
  assert.equal(await aplicar(page, "Cuándo").innerText(), "Ver 2 eventos");
  await dia(page, "2026-09-26").click();
  await dia(page, "2026-09-23").click();
  assert.equal(await aplicar(page, "Cuándo").innerText(), "Sin eventos");
  // Un rango cuenta los renglones que se verán: del 19 al 20 son el taller y el festival del 19, y el festival del 20.
  await dia(page, "2026-09-23").click();
  await dia(page, "2026-09-19").click();
  await dia(page, "2026-09-20").click();
  assert.equal(await aplicar(page, "Cuándo").innerText(), "Ver 3 eventos");
  await aplicar(page, "Cuándo").click();
  assert.deepEqual((await renglones(page)).map((r) => r.id), ["taller", "festival", "festival"]);
  await context.close();
});
