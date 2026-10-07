/** OL-269: q inicial ejecuta la búsqueda y se consume sin apilar historial; el estado sobrevive al regreso. */
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
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link({prefetch,replace,scroll,...p}){return React.createElement('a',p)}",
  "next/navigation": "export const useRouter=()=>({push(){},replace(){},back(){history.back()}});export const usePathname=()=>location.pathname;export const useSearchParams=()=>new URLSearchParams(location.search);",
  // `window.qa.eventos` (OL-338): lo que encuentra en eventos (con su foto y su clase); `window.qa.vigentes`: lo que devuelve para los recientes.
  "@/app/accionesBuscar": `export async function buscarUnificado(q){window.qa.llamadas.push(q);return {eventos:window.qa.eventos??[],lugares:[],artistas:q.length>=2&&!window.qa.eventos?[{id:q,titulo:q+' Prueba',href:'/artistas/'+q.toLowerCase(),foto:null,detalle:'Artes visuales',ciudad:'San Luis Potosí'}]:[]}}
    export async function vigentesDeRecientes(p){window.qa.recientesPedidos.push(p);return window.qa.vigentes??{}}`,
};
before(async () => {
  dir = await mkdtemp(join(tmpdir(), "buscar-componentes-"));
  await build({ absWorkingDir: root, bundle: true, define: { "process.env": "{}" }, outfile: join(dir, "app.js"), stdin: { resolveDir: root, loader: "tsx", contents: `
    import React from 'react';import {createRoot} from 'react-dom/client';
    import BuscarPantalla from './src/app/buscar/BuscarPantalla';import './src/app/globals.css';
    window.qa={llamadas:[],recientesPedidos:[],historial:history.length,eventos:window.eventosDePrueba,vigentes:window.vigentesDePrueba};
    const ciudad={slug:'san-luis-potosi',nombre:'San Luis Potosí',centro:{lat:22,lng:-100},centroConocido:true,zoom:13,zona:'America/Mexico_City',lugares:1,eventos:1};
    createRoot(document.getElementById('root')).render(<React.StrictMode><BuscarPantalla consultaInicial={window.consultaAnterior ?? new URLSearchParams(location.search).get('q')??''} ciudad={ciudad} ciudades={[ciudad]} desde="artistas" hoy="2026-10-04" conSesion={false}/></React.StrictMode>);
  ` }, plugins: [{ name: "dobles", setup(b) {
    b.onResolve({ filter: /.*/ }, a => a.path in mocks ? { path: a.path, namespace: "mock" } : undefined);
    b.onLoad({ filter: /.*/, namespace: "mock" }, a => ({ contents: mocks[a.path], loader: "js", resolveDir: root }));
  } }] });
  const assets = new Map([
    ["/", ["text/html; charset=utf-8", '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><div id="root"></div><script src="/app.js"></script>']],
    ["/app.js", ["text/javascript; charset=utf-8", await readFile(join(dir, "app.js"))]],
    ["/app.css", ["text/css; charset=utf-8", await readFile(join(dir, "app.css"))]],
  ]);
  server = createServer((req, res) => { const path = req.url.split("?")[0]; const a = assets.get(path === "/buscar" ? "/" : path); res.writeHead(a ? 200 : 404, { "Content-Type": a?.[0] ?? "text/plain" }); res.end(a?.[1] ?? ""); });
  await new Promise(r => server.listen(0, "127.0.0.1", r)); origin = `http://127.0.0.1:${server.address().port}`;
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE });
});
after(async () => { await browser?.close(); if (server) await new Promise(r => server.close(r)); if (dir) await rm(dir, { recursive: true, force: true }); });
async function abrir(t, query, previo = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } }); t.after(() => context.close());
  await context.addInitScript(({ memorias, consultaAnterior, respuesta, recientes, eventos, vigentes }) => {
    history.replaceState({ somosnosotros: 7, somosnosotrosDesde: "/agenda" }, "", location.href);
    for (const [clave, texto] of Object.entries(memorias ?? {})) {
      sessionStorage.setItem('somosnosotros:pantalla:' + clave, JSON.stringify({ estado: { texto, tipo: null, abiertos: [], respuesta: respuesta ?? null } }));
    }
    if (recientes && !sessionStorage.getItem('recientes-puestos')) {
      localStorage.setItem('somosnosotros:buscar:recientes', JSON.stringify(recientes));
      sessionStorage.setItem('recientes-puestos', '1');
    }
    window.consultaAnterior = consultaAnterior;
    window.eventosDePrueba = eventos;
    window.vigentesDePrueba = vigentes;
  }, previo);
  const p = await context.newPage(); p.setDefaultTimeout(5000);
  const errores = [];
  p.on("pageerror", e => errores.push(e.message));
  t.after(() => assert.deepEqual(errores, []));
  await p.goto(origin + "/buscar" + query);
  await p.getByRole("searchbox").waitFor();
  return p;
}
test("q llena el campo, busca y preserva otros parámetros, hash y marca de historial sin apilar", async (t) => {
  const p = await abrir(t, "?q=Rob&ciudad=san-luis-potosi&desde=artistas#resultados");
  await p.getByRole("link", { name: /Rob Prueba/ }).waitFor();
  assert.equal(await p.getByRole("searchbox").inputValue(), "Rob");
  assert.deepEqual(await p.evaluate(() => window.qa.llamadas), ["Rob"]);
  assert.equal(new URL(p.url()).search, "?ciudad=san-luis-potosi&desde=artistas");
  assert.equal(new URL(p.url()).hash, "#resultados");
  assert.equal(await p.evaluate(() => history.state.somosnosotros), 7);
  assert.equal(await p.evaluate(() => history.state.somosnosotrosDesde), "/agenda");
  assert.equal(await p.evaluate(() => history.length - window.qa.historial), 0);
});
test("tras consumir q, volver a la URL limpia recupera el texto y sus resultados", async (t) => {
  const p = await abrir(t, "?q=Rob");
  await p.getByRole("link", { name: /Rob Prueba/ }).waitFor();
  await p.waitForFunction(() => sessionStorage.getItem('somosnosotros:pantalla:/buscar')?.includes('Rob Prueba'));
  await p.reload(); await p.getByRole("link", { name: /Rob Prueba/ }).waitFor();
  assert.equal(await p.getByRole("searchbox").inputValue(), "Rob");
});
test("texto por debajo del mínimo no dispara búsqueda y sigue siendo editable", async (t) => {
  const p = await abrir(t, "?q=R");
  assert.equal(await p.getByRole("searchbox").inputValue(), "R");
  assert.deepEqual(await p.evaluate(() => window.qa.llamadas), []);
  await p.getByRole("searchbox").fill("Rob"); await p.getByRole("link", { name: /Rob Prueba/ }).waitFor();
  assert.deepEqual(await p.evaluate(() => window.qa.llamadas), ["Rob"]);
});

test("q explícito prevalece sobre una búsqueda vacía guardada antes de la corrección", async (t) => {
  const p = await abrir(t, "?q=Rob", { memorias: { "/buscar?q=Rob": "", "/buscar": "Ana" } });
  await p.getByRole("link", { name: /Rob Prueba/ }).waitFor();
  assert.equal(await p.getByRole("searchbox").inputValue(), "Rob");
  assert.deepEqual(await p.evaluate(() => window.qa.llamadas), ["Rob"]);
});

test("sin q en la URL, la memoria al regresar prevalece sobre props reutilizadas del enlace anterior", async (t) => {
  const p = await abrir(t, "", { consultaAnterior: "Rob", memorias: { "/buscar": "Ana" } });
  await p.getByRole("link", { name: /Ana Prueba/ }).waitFor();
  assert.equal(await p.getByRole("searchbox").inputValue(), "Ana");
  assert.deepEqual(await p.evaluate(() => window.qa.llamadas), ["Ana"]);
});

// OL-338: la portada que se cambió no se queda vieja en Buscar, y un festival se distingue de un evento.
const fellini = (foto) => ({ id: "e1", titulo: "Cine de barrio: ciclo Fellini", href: "/eventos/fellini", foto, detalle: "vie 9 oct · 10:00", sitio: "MUNI", van: 0, ciudad: "San Luis Potosí" });
const conFoto = (p, foto) => p.waitForFunction((f) => document.querySelector(`main a img[src="${f}"]`), foto);

test("al volver de una ficha, lo encontrado se ve tal cual y se pide otra vez sin «Buscando…»: la portada nueva reemplaza a la vieja", async (t) => {
  const respuesta = { texto: "fellini", resultado: { eventos: [fellini("/vieja.png")], lugares: [], artistas: [] } };
  const p = await abrir(t, "", { memorias: { "/buscar": "fellini" }, respuesta, eventos: [fellini("/nueva.png")] });
  await conFoto(p, "/nueva.png");
  assert.deepEqual(await p.evaluate(() => window.qa.llamadas), ["fellini"]);
  assert.equal(await p.getByText("Buscando…").count(), 0);
  assert.equal(await p.getByRole("searchbox").inputValue(), "fellini");
});

test("borrar y volver a escribir lo mismo vuelve a buscar", async (t) => {
  const p = await abrir(t, "", { eventos: [fellini("/vieja.png")] });
  await p.getByRole("searchbox").fill("fellini");
  await conFoto(p, "/vieja.png");
  await p.evaluate(() => (window.qa.eventos = window.qa.eventos.map((e) => ({ ...e, foto: "/nueva.png" }))));
  await p.getByRole("searchbox").fill("");
  await p.getByRole("searchbox").fill("fellini");
  await conFoto(p, "/nueva.png");
  assert.deepEqual(await p.evaluate(() => window.qa.llamadas), ["fellini", "fellini"]);
});

test("los recientes se ponen al día al abrir Buscar: la foto de hoy, y el que ya no se ve sale", async (t) => {
  const reciente = (id, titulo, foto) => ({ grupo: "eventos", id, href: `/eventos/${id}`, foto, titulo, meta: ["vie 9 oct · MUNI"] });
  const p = await abrir(t, "", { recientes: [reciente("e1", "Cine de barrio: ciclo Fellini", "/vieja.png"), reciente("e2", "Ya no está", "/x.png")], vigentes: { "eventos:e1": fellini("/nueva.png"), "eventos:e2": null } });
  await conFoto(p, "/nueva.png");
  assert.equal(await p.getByText("Ya no está").count(), 0);
  assert.deepEqual((await p.evaluate(() => window.qa.recientesPedidos))[0], [{ grupo: "eventos", id: "e1" }, { grupo: "eventos", id: "e2" }]);
  const guardados = await p.evaluate(() => JSON.parse(localStorage.getItem("somosnosotros:buscar:recientes")));
  assert.deepEqual(guardados.map((r) => [r.id, r.foto]), [["e1", "/nueva.png"]]);
});

test("un festival lleva su sello en su grupo y el evento no; como mejor resultado, lo que es va en el sitio del tipo", async (t) => {
  const festival = { id: "f1", titulo: "Festival de Cine de Invierno", href: "/eventos/festival", foto: null, detalle: "Del 16 al 18 de oct", sitio: "Programa registrado: 3 actividades", van: 0, ciudad: "San Luis Potosí", clase: "Festival" };
  const p = await abrir(t, "", { eventos: [festival, fellini("/f.png")] });
  await p.getByRole("searchbox").fill("invierno");
  const fila = p.getByRole("link", { name: /Festival de Cine de Invierno/ });
  await fila.waitFor();
  assert.match(await fila.innerText(), /Festival\s+Del 16 al 18 de oct · Programa registrado: 3 actividades/);
  assert.doesNotMatch(await p.getByRole("link", { name: /Fellini/ }).innerText(), /Festival/);
  await p.getByRole("searchbox").fill("festival de cine de invierno");
  await p.getByText("Mejor resultado").waitFor();
  assert.match(await p.getByRole("link", { name: /Festival de Cine de Invierno/ }).innerText(), /Festival · Del 16 al 18 de oct/);
});
