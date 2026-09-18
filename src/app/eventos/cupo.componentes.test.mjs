/** Harness local del componente real. Sin Next, sesion, Storage ni IA; no agrega rutas a la app.
 * PLAYWRIGHT_MODULE=/ruta/playwright/index.mjs CHROME_EXECUTABLE=/ruta/chrome node --test este-archivo
 * CUPO_SCREENSHOTS=/tmp/cupo conserva las capturas; CUPO_BASELINE_REF=<commit> captura el antes.
 */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const baseline = process.env.CUPO_BASELINE_REF;
const captures = process.env.CUPO_SCREENSHOTS;
let browser, server, dir, origin;
const mocks = {
  "./acciones": `
    export async function cupoDeCartel() {
      const q = window.qa; q.consultas++;
      const respuesta = structuredClone(q.cupo);
      if (q.demorar) await new Promise(resolve => q.pendientes.push(resolve));
      if (q.errorCupo === 'throw') throw Error('corte');
      if (q.errorCupo) return null;
      return respuesta;
    }
    export async function leerCartelAccion() {
      const q = window.qa; q.lecturas++;
      if (q.lectura === 'rechazo') {q.cupo.usadas = q.cupo.tope; return {ok:false,sinCupo:true};}
      q.cupo.usadas = q.despues ?? q.cupo.usadas + 1;
      if(q.errorDespues) q.errorCupo = 'throw';
      if(q.lectura === 'throw') throw Error('corte del modelo');
      if(q.lectura === 'fallo') return {ok:false,mensaje:'Llena los datos a mano; la imagen se queda puesta.'};
      return {ok:true, valores:{titulo:'Leido',inicio:'',fin:'',gratis:true,precio:'',descripcion:'',enlace:'',lugar:'',direccion:''},lugarId:null,quien:[]};
    }
    export async function pedirMasLecturas() {
      const q = window.qa; q.peticiones++;
      if(q.peticion === 'throw') throw Error('corte');
      if(q.peticion === 'fallo') return {ok:false};
      q.cupo.pedida = true; return {ok:true};
    }
    export async function zonaDelPunto(){return 'America/Mexico_City'}
  `,
  "@/lib/subirFoto": `export async function subirFoto(){window.qa.subidas++;return window.qa.falloSubida ? {error:'No se pudo subir.',motivo:'subida'} : {url:'/nueva.png'}}`,
  "@/components/ui/Atras": "export function useTerminar(){return ()=>{}}",
  "@/components/SalirSinPublicar": "export function useSalirSinPublicar(){return null}",
  "./HojaDondeEs": "export default function C(){return null}",
  "./SelectorCuando": "export default function C(){return null}",
  "./SelectorQuien": "export default function C(){return null}",
  "next/link": "import React from 'react'; export function useLinkStatus(){return {pending:false}} export default function Link(p){return React.createElement('a',p)}",
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "cupo-componentes-"));
  if (captures) await mkdir(captures, { recursive: true });
  await build({
    absWorkingDir: root, bundle: true, outfile: join(dir, "app.js"),
    stdin: { resolveDir: root, loader: "tsx", contents: `
      import React, {useState} from 'react';
      import {createRoot} from 'react-dom/client';
      import Form from './src/app/eventos/FormularioEvento';
      import './src/app/globals.css';
      window.qa = {cupo:{usadas:17,tope:20,sinTope:false,pedida:false},consultas:0,lecturas:0,subidas:0,peticiones:0,lectura:'fallo',peticion:'fallo',pendientes:[],...window.qaInicial};
      const lugares = [];
      function App(){
        const [cupo,setCupo] = useState({usadas:17,tope:20,sinTope:false,pedida:false});
        window.qa.props = setCupo;
        return <Form accion={async()=>{throw Error('Guardar no pertenece a este harness')}} lugares={lugares} modo="alta" usuarioId="test" cartelActivo cupo={cupo} evento={{titulo:'Mi evento manual',imagen:'/anterior.png'}}/>;
      }
      createRoot(document.getElementById('root')).render(<App/>);
    ` },
    plugins: [{ name: "harness", setup(b) {
      b.onResolve({ filter: /.*/ }, (a) => a.path in mocks ? { path: a.path, namespace: "mock" } : undefined);
      b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({ contents: mocks[a.path], loader: "js", resolveDir: root }));
      if (baseline) b.onLoad({ filter: /\/eventos\/(FormularioEvento|TarjetaCartel|estadoCartel)\.tsx?$/ }, (a) => ({
        contents: execFileSync("git", ["show", `${baseline}:${a.path.slice(root.length)}`], { cwd: root, encoding: "utf8" }), loader: "tsx",
      }));
    } }],
  });
  const html = '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--fuente-bricolage:Arial}</style><main class="pagina"><h1 class="titulo">Nuevo evento</h1><div id="root"></div></main><script src="/app.js"></script>';
  const assets = new Map([
    ["/", ["text/html", html]],
    ["/app.js", ["text/javascript", await readFile(join(dir, "app.js"))]],
    ["/app.css", ["text/css", await readFile(join(dir, "app.css"))]],
    ["/anterior.png", ["image/png", await readFile(join(root, "public/sin-foto-ancha.png"))]],
    ["/nueva.png", ["image/png", await readFile(join(root, "public/sin-foto-ancha.png"))]],
  ]);
  server = createServer((req, res) => {
    const asset = assets.get(req.url);
    res.writeHead(asset ? 200 : 404, { "Content-Type": asset?.[0] ?? "text/plain" });
    res.end(asset?.[1] ?? "Not found");
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE });
});

after(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
  if (dir) await rm(dir, { recursive: true, force: true });
});

async function pantalla(t, width = 390, ahora, inicial) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 3, timezoneId: "Asia/Tokyo" });
  t.after(() => context.close());
  const page = await context.newPage();
  page.setDefaultTimeout(10_000);
  if (ahora) await page.clock.install({ time: ahora });
  if (inicial) await page.addInitScript(inicial => { window.qaInicial = inicial; }, inicial);
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.route("**/*", route => route.request().url().startsWith(origin + "/") ? route.continue() : route.abort());
  await page.goto(origin);
  if (!inicial) {
    await page.getByLabel("Sube el cartel").waitFor();
    await page.waitForFunction(() => !document.querySelector('input[aria-label="Sube el cartel"]').disabled);
  }
  t.after(() => assert.deepEqual(errors, []));
  return page;
}
async function texto(page, value) { await page.getByRole("status").filter({ hasText: value }).waitFor(); }
async function subir(page) {
  await page.locator('input[type="file"][aria-label]').setInputFiles({ name: "cartel.png", mimeType: "image/png", buffer: await readFile(join(root, "public/sin-foto-ancha.png")) });
}
async function focus(page, changes) {
  await page.evaluate(changes => { Object.assign(window.qa, changes); window.dispatchEvent(new Event("focus")); }, changes);
}
async function sinCamara(page) { assert.equal(await page.locator('input[type="file"][aria-label]').count(), 0); }
async function conserva(page, image = "/anterior.png") {
  assert.equal(await page.getByLabel("Nombre del evento").inputValue(), "Mi evento manual");
  assert.equal(await page.locator('input[name="imagen"]').inputValue(), image);
}
async function captura(page, name) {
  if (captures) await page.screenshot({ path: join(captures, name + ".png"), fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  const layout = await page.getByRole("status").evaluate(el => {
    const card = el.parentElement.getBoundingClientRect();
    const boxes = [...el.children].filter(e => ["B", "SMALL"].includes(e.tagName)).map(e => e.getBoundingClientRect());
    return boxes.every((b, i) => b.width > 0 && b.left >= card.left && b.right <= card.right && (!i || b.top >= boxes[i - 1].bottom - 1));
  });
  assert.equal(layout, true, "titular y avisos no se superponen");
}

test("antes/despues: fallo conserva manuales e imagen y muestra saldo real", async t => {
  const p = await pantalla(t);
  await captura(p, baseline ? "antes-inicial" : "despues-inicial");
  await subir(p);
  await texto(p, "No pude leer el cartel");
  if (!baseline) await texto(p, "Te quedan 2 lecturas");
  await conserva(p, "/nueva.png");
  await captura(p, baseline ? "antes-fallo" : "despues-fallo");
});

test("exito toma el saldo del servidor, no resta uno localmente", { skip: !!baseline }, async t => {
  const p = await pantalla(t);
  await p.evaluate(() => { window.qa.lectura = "ok"; window.qa.despues = 19; });
  await subir(p);
  await texto(p, "Te queda 1 lectura");
  await texto(p, "Leí el cartel");
  assert.equal(await p.getByLabel("Nombre del evento").inputValue(), "Mi evento manual");
  await captura(p, "despues-leido");
});

test("ultima lectura fallida bloquea camara; pedir mas no finge exito", { skip: !!baseline }, async t => {
  const p = await pantalla(t);
  await p.evaluate(() => { window.qa.despues = 20; });
  await subir(p);
  await texto(p, "Se acabaron tus lecturas");
  await texto(p, "No pude leer el cartel");
  await sinCamara(p);
  await conserva(p, "/nueva.png");
  await captura(p, "despues-agotado");
  await p.getByRole("button", { name: /Pedir más/ }).click();
  await texto(p, "No pude mandar la petición");
  assert.equal(await p.getByText("Ya pedimos más para ti").count(), 0);
  await p.evaluate(() => { window.qa.peticion = "throw"; });
  await p.getByRole("button", { name: /Pedir más/ }).click();
  await p.waitForFunction(() => window.qa.peticiones === 2);
  await texto(p, "No pude mandar la petición");
  await p.evaluate(() => { window.qa.peticion = "ok"; });
  await p.getByRole("button", { name: /Pedir más/ }).click();
  await texto(p, "Ya pedimos más para ti");
  await sinCamara(p);
});

test("corte tras consumo reconcilia; fallo de consulta permite reintentar sin inventar saldo", { skip: !!baseline }, async t => {
  const p = await pantalla(t);
  await p.evaluate(() => { Object.assign(window.qa, { lectura: "throw", despues: 20, errorDespues: true }); });
  await subir(p);
  await texto(p, "No pude confirmar tus lecturas");
  await sinCamara(p);
  await conserva(p);
  await captura(p, "despues-error-cupo");
  await p.evaluate(() => { window.qa.errorCupo = false; });
  await p.getByRole("button", { name: /Reintentar/ }).click();
  await texto(p, "Se acabaron tus lecturas");
  await texto(p, "Se cortó a la mitad");
  await sinCamara(p);
});

test("focus y nuevas props cambian cupo sin reiniciar el formulario", { skip: !!baseline }, async t => {
  const p = await pantalla(t, 1280);
  await focus(p, { cupo: { usadas: 20, tope: 20, sinTope: false, pedida: true } });
  await texto(p, "Ya pedimos más para ti");
  await sinCamara(p);
  await conserva(p);
  await p.evaluate(() => { window.qa.cupo = { usadas: 17, tope: 20, sinTope: false, pedida: false }; window.qa.props({ ...window.qa.cupo }); });
  await texto(p, "Te quedan 3 lecturas");
  await conserva(p);
  await captura(p, "despues-desktop");
  await p.evaluate(() => { window.qa.props({ usadas: 20, tope: 20, sinTope: false, pedida: false }); });
  await texto(p, "Pedir más");
  await sinCamara(p);
});

test("respuesta vieja no pisa props nuevas ni una consulta mas reciente", { skip: !!baseline }, async t => {
  const p = await pantalla(t);
  await focus(p, { demorar: true });
  await p.waitForFunction(() => window.qa.pendientes.length === 1);
  await p.evaluate(() => window.qa.props({ usadas: 20, tope: 20, sinTope: false, pedida: false }));
  await texto(p, "Se acabaron tus lecturas");
  await p.evaluate(() => window.qa.pendientes.shift()());
  await sinCamara(p);
  await focus(p, { cupo: { usadas: 20, tope: 20, sinTope: false, pedida: true } });
  await p.waitForFunction(() => window.qa.pendientes.length === 1);
  await focus(p, { demorar: false, cupo: { usadas: 17, tope: 20, sinTope: false, pedida: false } });
  await texto(p, "Te quedan 3 lecturas");
  await p.evaluate(() => window.qa.pendientes.shift()());
  await texto(p, "Te quedan 3 lecturas");
  await conserva(p);
});

test("selector abierto no sube otra foto si se agoto mientras tanto", { skip: !!baseline }, async t => {
  const p = await pantalla(t);
  await p.evaluate(() => { window.qa.cupo.usadas = 20; });
  await subir(p);
  await texto(p, "Se acabaron tus lecturas");
  assert.deepEqual(await p.evaluate(() => [window.qa.subidas, window.qa.lecturas]), [0, 0]);
  await conserva(p);
  await sinCamara(p);
});

test("fallo de subida no consume y permite seleccionar el mismo archivo", { skip: !!baseline }, async t => {
  const p = await pantalla(t);
  await p.evaluate(() => { window.qa.falloSubida = true; });
  await subir(p);
  await texto(p, "No pude subir el cartel");
  await texto(p, "Te quedan 3 lecturas");
  await conserva(p);
  await p.evaluate(() => { window.qa.falloSubida = false; });
  await subir(p);
  await texto(p, "Te quedan 2 lecturas");
  assert.equal(await p.evaluate(() => window.qa.lecturas), 1);
});

test("renovacion en Mexico aun con dispositivo Tokio, sin recargar", { skip: !!baseline }, async t => {
  const p = await pantalla(t, 390, new Date("2026-10-01T05:59:50Z"));
  await focus(p, { cupo: { usadas: 20, tope: 20, sinTope: false, pedida: true } });
  await texto(p, "Ya pedimos más para ti");
  await p.evaluate(() => { window.qa.cupo = { usadas: 0, tope: 20, sinTope: false, pedida: false }; });
  await p.clock.runFor(31_000);
  await p.getByLabel("Sube el cartel").waitFor();
  await conserva(p);
});

test("pageshow, visibilidad, cupo nulo y admin sin tope", { skip: !!baseline }, async t => {
  const p = await pantalla(t);
  await p.evaluate(() => { window.qa.errorCupo = true; window.dispatchEvent(new Event("pageshow")); });
  await texto(p, "No pude confirmar tus lecturas");
  await sinCamara(p);
  await p.evaluate(() => { window.qa.errorCupo = false; window.qa.cupo = { usadas: 200, tope: 20, sinTope: true, pedida: true }; document.dispatchEvent(new Event("visibilitychange")); });
  await p.getByLabel("Sube el cartel").waitFor();
  assert.equal(await p.getByRole("status").filter({ hasText: /Te quedan|Pedir más/ }).count(), 0);
  await conserva(p);
});

test("al montar consulta datos nuevos sin que la prop inicial los reponga", { skip: !!baseline }, async t => {
  const p = await pantalla(t, 390, undefined, { cupo: { usadas: 20, tope: 20, sinTope: false, pedida: false } });
  await texto(p, "Se acabaron tus lecturas");
  await p.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await sinCamara(p);
  await conserva(p);
});

test("la reconciliacion conserva todos los valores manuales, incluso con error y nuevas props", { skip: !!baseline }, async t => {
  const p = await pantalla(t);
  await p.locator("li").filter({ hasText: "Descripción, enlace" }).getByRole("button", { name: "Agregar" }).click();
  await p.getByLabel("Descripción", { exact: true }).fill("Descripcion escrita a mano");
  await p.getByLabel("Enlace", { exact: true }).fill("https://evento.invalid");
  const valores = () => p.locator("form").evaluate(form => [...new FormData(form)].filter(([,v]) => typeof v === "string"));
  const antes = await valores();
  await focus(p, { errorCupo: "throw" });
  await texto(p, "No pude confirmar tus lecturas");
  assert.deepEqual(await valores(), antes);
  await p.evaluate(() => window.qa.props({ usadas: 20, tope: 20, sinTope: false, pedida: false }));
  await texto(p, "Se acabaron tus lecturas");
  assert.deepEqual(await valores(), antes);
  assert.equal(await p.locator('input[type="file"]:not([aria-label])').isDisabled(), false, "la imagen manual no consume lecturas");
});

test("rechazo del servidor tras subir no produce lectura exitosa", { skip: !!baseline }, async t => {
  const p = await pantalla(t);
  await p.evaluate(() => { window.qa.lectura = "rechazo"; });
  await subir(p);
  await texto(p, "Se acabaron tus lecturas");
  await sinCamara(p);
  await conserva(p);
  assert.equal(await p.getByText("Leí el cartel").count(), 0);
});
