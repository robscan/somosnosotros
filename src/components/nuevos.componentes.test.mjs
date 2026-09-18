/** Agenda real con transporte simulado. Estas pruebas no certifican OAuth ni Safari. */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../", import.meta.url));
let dir, server, browser, origin;
const mocks = {
  "next/navigation": "export const usePathname=()=>location.pathname;export const useSearchParams=()=>new URLSearchParams(location.search);export const useRouter=()=>({push(){},replace(){}});",
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link(p){return React.createElement('a',p)}",
  "@/app/accionesAgenda": `export async function cargarNuevos(...args){window.qa.llamadas.push(args);return new Promise((resolve,reject)=>window.qa.pendiente={resolve,reject})}`,
  "./Ciudad": "export default function Ciudad(){return null}",
  "./Destacados": "export default function Destacados(){return null}",
  "@/app/eventos/acciones": "export async function cambiarAsistencia(id,estado){window.qa.guardados.push({id,estado});return true}",
  "./ConsentimientoAvisos": "export default function Consentimiento(){return null}",
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "nuevos-componentes-"));
  await build({ absWorkingDir: root, bundle: true, outfile: join(dir, "app.js"),
    stdin: { resolveDir: root, loader: "tsx", contents: `
      import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
      import Agenda from './src/components/AgendaInicio';import './src/app/globals.css';
      const ciudad={slug:'san-luis-potosi',nombre:'San Luis Potosí',zona:'America/Mexico_City'};
      const sello=new Date().toISOString();
      function evento(n,tipo){return {id:tipo+'-'+n,titulo:tipo+' '+String(n).padStart(2,'0'),
        inicio:'2027-01-01T20:00:00Z',fin:null,zona:ciudad.zona,imagen:null,precio:null,gratis:true,
        lugar_id:null,sitio_texto:'Foro',sitio_reservado:false,lugar:null,artistas:[],lat:null,lng:null,van:0,
        creado_en:new Date(Date.now()-n*1000).toISOString()}}
      const eventos=Array.from({length:35},(_,i)=>evento(i,'Agenda'));
      const respuesta={ok:true,eventos:Array.from({length:25},(_,i)=>evento(i,'Reciente')),asistencias:null,sello};
      window.qa={llamadas:[],respuesta,guardados:[]};
      function App(){const [montada,montar]=useState(true);const [asistencias,setAsistencias]=useState(null);
        window.qa.montar=montar;window.qa.asistencias=setAsistencias;
        return montada?<Agenda eventos={eventos} asistencias={asistencias} seguidos={asistencias===null?null:[]} ciudad={ciudad} ciudades={[]}
          hoy='2026-09-18' zona={ciudad.zona}/>:null}
      createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
    ` }, plugins: [{ name: "dobles", setup(b) {
      b.onResolve({ filter: /.*/ }, a => a.path in mocks ? { path: a.path, namespace: "mock" } : undefined);
      b.onLoad({ filter: /.*/, namespace: "mock" }, a => ({ contents: mocks[a.path], loader: "js", resolveDir: root }));
    } }],
  });
  const assets = new Map([
    ["/", ["text/html", '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--fuente-bricolage:Arial}</style><main id="root"></main><script src="/app.js"></script>']],
    ["/app.js", ["text/javascript", await readFile(join(dir, "app.js"))]],
    ["/app.css", ["text/css", await readFile(join(dir, "app.css"))]],
  ]);
  server = createServer((req, res) => {
    const a = assets.get(req.url);
    res.writeHead(a ? 200 : 404, { "Content-Type": `${a?.[0] ?? "text/plain"}; charset=utf-8` });
    res.end(a?.[1] ?? "");
  });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  origin = `http://127.0.0.1:${server.address().port}`;
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE });
});
after(async () => {
  await browser?.close();
  if (server) await new Promise(r => server.close(r));
  if (dir) await rm(dir, { recursive: true, force: true });
});

async function pagina(t, width) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: "reduce" });
  t.after(() => context.close());
  const p = await context.newPage();
  p.setDefaultTimeout(5000);
  const errors = [];
  p.on("pageerror", e => errors.push(e.message));
  t.after(() => assert.deepEqual(errors, []));
  await p.route("**/*", r => new URL(r.request().url()).origin === origin ? r.continue() : r.abort());
  await p.goto(origin);
  await p.getByRole("tab", { name: "Todos", exact: true }).waitFor();
  return p;
}

const marca = "somosnosotros:nuevos-visto:san-luis-potosi";
for (const width of [390, 1280]) {
  test(`Carga bajo demanda, tope, cambio de pestana y busqueda: ${width}`, async t => {
    const p = await pagina(t, width);
    assert.equal(await p.getByRole("link", { name: /^Agenda / }).count(), 35);
    assert.equal(await p.evaluate(() => window.qa.llamadas.length), 0);
    await p.getByRole("tab", { name: "Nuevos", exact: true }).click();
    await p.locator('[aria-busy="true"]').waitFor();
    assert.equal(await p.evaluate(k => localStorage.getItem(k), marca), null);
    await p.getByRole("tab", { name: "Todos", exact: true }).click();
    await p.evaluate(() => window.qa.pendiente.resolve(window.qa.respuesta));
    assert.equal(await p.evaluate(k => localStorage.getItem(k), marca), null);
    await p.getByRole("tab", { name: "Nuevos", exact: true }).click();
    await p.getByRole("button", { name: "Ver todos", exact: true }).waitFor();
    assert.equal(await p.getByRole("link", { name: /^Reciente / }).count(), 20);
    assert.equal(await p.evaluate(() => window.qa.llamadas.length), 1);
    assert.equal(await p.evaluate(k => localStorage.getItem(k), marca), await p.evaluate(() => window.qa.respuesta.sello));
    await p.getByRole("button", { name: "Buscar un evento", exact: true }).click();
    await p.getByRole("searchbox", { name: "Buscar un evento", exact: true }).fill("Reciente 00");
    assert.equal(await p.getByRole("link", { name: /^Reciente / }).count(), 1);
    assert.equal(await p.evaluate(() => window.qa.llamadas.length), 1);
    await p.getByRole("button", { name: "Ver todos", exact: true }).click();
    assert.equal(await p.getByRole("link", { name: /^Agenda / }).count(), 35);
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  });

  test(`Fallo no marca visita; reintento y remonte conservan corte: ${width}`, async t => {
    const p = await pagina(t, width);
    await p.getByRole("tab", { name: "Nuevos", exact: true }).click();
    await p.waitForFunction(() => window.qa.pendiente);
    const primero = await p.evaluate(() => window.qa.llamadas[0]);
    await p.evaluate(() => window.qa.pendiente.reject(Error("Sin red")));
    await p.getByRole("button", { name: "Reintentar", exact: true }).waitFor();
    assert.equal(await p.evaluate(k => localStorage.getItem(k), marca), null);
    await p.getByRole("button", { name: "Reintentar", exact: true }).click();
    await p.waitForFunction(() => window.qa.llamadas.length === 2);
    assert.deepEqual(await p.evaluate(() => window.qa.llamadas[1]), primero);
    await p.evaluate(() => window.qa.pendiente.resolve(window.qa.respuesta));
    await p.getByRole("button", { name: "Ver todos", exact: true }).waitFor();
    const lista = await p.getByRole("link", { name: /^Reciente / }).allTextContents();
    await p.evaluate(() => window.qa.montar(false));
    await p.getByRole("tab", { name: "Nuevos", exact: true }).waitFor({ state: "detached" });
    await p.evaluate(() => window.qa.montar(true));
    await p.waitForFunction(() => window.qa.llamadas.length === 3);
    const vuelta = await p.evaluate(() => window.qa.llamadas[2]);
    assert.equal(vuelta[1], primero[1]);
    assert.equal(vuelta[2], await p.evaluate(() => window.qa.respuesta.sello));
    await p.evaluate(() => window.qa.pendiente.resolve(window.qa.respuesta));
    await p.getByRole("button", { name: "Ver todos", exact: true }).waitFor();
    assert.deepEqual(await p.getByRole("link", { name: /^Reciente / }).allTextContents(), lista);
  });

  test(`Asistencia real: fuente fresca y No voy fuera de Todos, ${width}`, async t => {
    const p = await pagina(t, width);
    await p.evaluate(() => {
      window.qa.asistencias({ 'Agenda-0': 'voy' });
      window.qa.respuesta.eventos[0].id = 'Agenda-0';
      window.qa.respuesta.asistencias = { 'Agenda-0': 'me_interesa', 'Reciente-1': 'voy' };
    });
    await p.getByRole('tab', { name: 'Nuevos', exact: true }).click();
    await p.waitForFunction(() => window.qa.pendiente);
    await p.evaluate(() => window.qa.pendiente.resolve(window.qa.respuesta));
    await p.getByRole('button', { name: 'Ver todos', exact: true }).waitFor();
    const comun = p.getByRole('link', { name: /^Reciente 00/ });
    assert.match(await comun.innerText(), /Te interesa/);
    assert.doesNotMatch(await comun.innerText(), /Vas/);
    const fuera = p.getByRole('link', { name: /^Reciente 01/ });
    assert.match(await fuera.innerText(), /Vas/);
    await fuera.press('ArrowLeft');
    await p.getByRole('button', { name: 'No voy', exact: true }).click();
    await p.waitForFunction(() => window.qa.guardados.length === 1);
    assert.deepEqual(await p.evaluate(() => window.qa.guardados[0]), { id: 'Reciente-1', estado: null });
    assert.doesNotMatch(await fuera.innerText(), /Vas/);
    await p.evaluate(() => window.qa.asistencias({}));
    await p.locator('[aria-busy="true"]').waitFor();
    await p.waitForFunction(() => window.qa.llamadas.length === 2);
    await p.evaluate(() => window.qa.pendiente.resolve({ ...window.qa.respuesta, asistencias: {} }));
    await p.getByRole('button', { name: 'Ver todos', exact: true }).waitFor();
    assert.doesNotMatch(await fuera.innerText(), /Vas/);
    assert.doesNotMatch(await comun.innerText(), /Vas|Te interesa/);
    await p.getByRole('tab', { name: 'Todos', exact: true }).click();
    await p.getByRole('tab', { name: 'Nuevos', exact: true }).click();
    assert.doesNotMatch(await fuera.innerText(), /Vas/);
    assert.equal(await p.evaluate(() => window.qa.llamadas.length), 2);
  });
}
