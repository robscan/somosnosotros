/** Editar un lugar que ya existe y su ciudad (OL-299, bitácora 327): si el punto no cambia, la ciudad guardada se conserva tal cual
 *  aunque no haya ciudad de contexto ni respuesta de Mapbox; si se mueve el pin a un punto sin ciudad y lejos del contexto, el aviso
 *  del servidor sale en «Dónde» y nada de lo demás escrito se pierde. El componente real con los estilos reales, la acción
 *  simulada (rechaza con el aviso cuando no llega ciudad), una hoja «¿Dónde está?» de mentira y sin red.
 * PLAYWRIGHT_MODULE=/ruta/playwright-core/index.mjs CHROME_EXECUTABLE=/ruta/chromium node --test este-archivo
 * (no corre con `npm test`, que solo toma `.test.ts`; sí con `npm run test:componentes`). */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const AVISO = "No pudimos saber en qué ciudad está. Intenta de nuevo.";
let dir, server, browser, origin;

// La hoja de mentira: un botón que confirma el punto que dice la URL (`?pin=lat,lng`) con la ciudad que diga `?ciudadPin=` (vacío: Mapbox no la dio).
const hoja = `import React from 'react';
export default function Hoja(p){const q=new URLSearchParams(location.search);const [lat,lng]=(q.get('pin')||'0,0').split(',').map(Number);
return React.createElement('button',{type:'button',onClick:()=>{p.onListo({punto:{lat,lng},direccion:'',ciudad:q.get('ciudadPin')||null});p.onCerrar()}},'Confirmar el pin')}`;
const mocks = {
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link({replace, scroll, ...p}){return React.createElement('a',p)}",
  "@/components/ui/Atras": "export function useTerminar(){return ()=>{}}",
  "@/components/HojaDonde": hoja,
  "@/lib/useAvisosTelefono": "export function usePlataforma(){return null}",
  "@/lib/config": "export function configPublica(){return {mapboxToken:new URLSearchParams(location.search).has('token')?'prueba':null,mapboxStyle:'',supabaseUrl:null,supabaseAnonKey:null}}",
  // Mapbox que no responde ciudad: un parque o un camino sin calle cercana. Cuenta cuántas veces se le pregunta.
  "@/lib/geocodificar": "export async function lugarDesdePunto(){window.qa.reversas++;return null}",
  "@/lib/supabase/navegador": "export function clienteNavegador(){return null}",
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "lugar-editar-componentes-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import Formulario from './src/app/lugares/FormularioLugar';
      import './src/app/globals.css';
      const q = new URLSearchParams(location.search);
      window.qa = { envios: [], reversas: 0 };
      async function accion(_, fd) {
        window.qa.envios.push(Object.fromEntries(fd));
        return fd.get('ciudad') ? { ok: false, errores: {}, general: 'No se pudo guardar. ¿Sigues con sesión y es tu lugar?' } : { ok: false, errores: { ciudad: ${JSON.stringify(AVISO)} } };
      }
      const lugar = { id: 'l1', slug: 'foro', nombre: 'Foro del Carmen', tipo: 'foro', detalle: null, direccion: 'Calle 1, Querétaro', lat: 20.5888, lng: -100.3899,
        descripcion: 'Descripción de siempre', redes: [], portada: null, privado: false, visible: true, creado_por: 'cuenta', origen: null, zona: 'America/Mexico_City',
        ciudad: q.has('ciudadVacia') ? '' : 'Querétaro' };
      const contexto = q.has('sinContexto') ? null : { slug: 'queretaro', nombre: 'Querétaro', centro: { lng: -100.39, lat: 20.59 }, zoom: 13 };
      createRoot(document.getElementById('root')).render(<Formulario accion={accion} usuarioId="cuenta" lugar={lugar} lugares={[]} ciudadContexto={contexto} />);
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
    ["/", ["text/html", '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--fuente-bricolage:Arial}</style><main style="padding:20px"><div id="root"></div></main><script src="/app.js"></script>']],
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

async function abrir(t, consulta = "") {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce", locale: "es-MX" });
  t.after(() => context.close());
  const p = await context.newPage();
  p.setDefaultTimeout(10_000);
  const errores = [];
  p.on("pageerror", (e) => errores.push(e.message));
  t.after(() => assert.deepEqual(errores, []));
  await p.route("**/*", (r) => (new URL(r.request().url()).origin === origin ? r.continue() : r.abort()));
  await p.goto(`${origin}/?${consulta}`);
  return p;
}
const guardar = (p) => p.getByRole("button", { name: "Guardar cambios" });
const enviar = async (p) => {
  await guardar(p).click();
  await p.waitForFunction(() => window.qa.envios.length === 1);
  return p.evaluate(() => window.qa.envios[0]);
};

test("(a) editar solo la descripción, sin ciudad de contexto ni Mapbox: se envía la ciudad de siempre", async (t) => {
  const p = await abrir(t, "sinContexto=1");
  const envio = await enviar(p);
  assert.equal(envio.ciudad, "Querétaro");
  assert.equal(envio.lat, "20.5888");
  assert.equal(await p.getByRole("alert").filter({ hasText: AVISO }).count(), 0);
});

test("(b) un lugar en un parque o camino (Mapbox no da ciudad para su punto): editarlo no pregunta ni pierde la ciudad", async (t) => {
  const p = await abrir(t, "sinContexto=1&token=1");
  const envio = await enviar(p);
  assert.equal(envio.ciudad, "Querétaro");
  assert.equal(await p.evaluate(() => window.qa.reversas), 0, "al editar sin mover el pin no se geocodifica");
});

test("«Cambiar» y confirmar el mismo punto sin ciudad del mapa no pierde la ciudad guardada", async (t) => {
  const p = await abrir(t, "sinContexto=1&pin=20.5888,-100.3899&ciudadPin=");
  await p.getByRole("button", { name: "Cambiar", exact: true }).first().click();
  await p.getByRole("button", { name: "Confirmar el pin" }).click();
  const envio = await enviar(p);
  assert.equal(envio.lat, "20.5888");
  assert.equal(envio.ciudad, "Querétaro", "el mapa no dio ciudad, pero el punto es el mismo: se queda la guardada");
});

test("(c) mover el pin a un punto sin ciudad y lejos del contexto: sale el aviso en «Dónde» y no se pierde lo demás escrito", async (t) => {
  const p = await abrir(t, "pin=22.15,-100.97&ciudadPin=");
  await p.getByLabel("Nombre del lugar").fill("Foro con otro nombre");
  await p.getByRole("button", { name: "Descripción corta" }).click();
  await p.locator("textarea").fill("Una descripción que no debe perderse");
  await p.getByRole("button", { name: "Listo" }).last().click();
  await p.getByRole("button", { name: "Cambiar", exact: true }).first().click();
  await p.getByRole("button", { name: "Confirmar el pin" }).click();
  const envio = await enviar(p);
  assert.equal(envio.ciudad, "", "lejos del contexto y sin ciudad del mapa: no inventa ninguna");
  assert.equal(envio.nombre, "Foro con otro nombre");
  assert.equal(envio.descripcion, "Una descripción que no debe perderse");
  await p.getByRole("alert").filter({ hasText: AVISO }).waitFor();
  assert.equal(await p.getByLabel("Nombre del lugar").inputValue(), "Foro con otro nombre");
  assert.equal(await p.locator('input[name="descripcion"]').inputValue(), "Una descripción que no debe perderse");
  assert.equal(await p.locator('input[name="lat"]').inputValue(), "22.15");
});

test("mover el pin a un punto sin ciudad pero cerca del contexto: se envía la ciudad de contexto", async (t) => {
  const p = await abrir(t, "pin=20.62,-100.40&ciudadPin=");
  await p.getByRole("button", { name: "Cambiar", exact: true }).first().click();
  await p.getByRole("button", { name: "Confirmar el pin" }).click();
  assert.equal((await enviar(p)).ciudad, "Querétaro");
});

test("(d) un lugar antiguo con la ciudad guardada vacía: se envía vacía sin romper nada (el servidor decide con el punto)", async (t) => {
  const p = await abrir(t, "ciudadVacia=1&sinContexto=1");
  const envio = await enviar(p);
  assert.equal(envio.ciudad, "");
  assert.equal(envio.lat, "20.5888");
});
