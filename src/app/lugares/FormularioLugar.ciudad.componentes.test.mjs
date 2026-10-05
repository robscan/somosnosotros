/** Alta de lugar y su ciudad (OL-299, bitácora 327): el lugar nunca queda en San Luis Potosí en silencio. Con el punto cerca de la
 *  ciudad de contexto y sin ciudad del mapa (aquí no hay token de Mapbox), se envía la de contexto; lejos de ella, se envía vacía y
 *  el aviso del servidor sale en el renglón «Dónde». El componente real con los estilos reales, la acción simulada y sin red.
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

const mocks = {
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link({replace, scroll, ...p}){return React.createElement('a',p)}",
  "@/components/ui/Atras": "export function useTerminar(){return ()=>{}}",
  "@/components/HojaDonde": "export default function C(){return null}",
  "@/lib/useAvisosTelefono": "export function usePlataforma(){return null}",
  "@/lib/config": "export function configPublica(){return {mapboxToken:new URLSearchParams(location.search).has('token')?'prueba':null,mapboxStyle:'',supabaseUrl:null,supabaseAnonKey:null}}",
  "@/lib/geocodificar": "export async function lugarDesdePunto(){return {direccion:'Calle 1, Querétaro',ciudad:'Querétaro'}}",
  "@/lib/supabase/navegador": "export function clienteNavegador(){return null}",
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "lugar-ciudad-componentes-"));
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
      import { CIUDAD_INICIAL } from './src/lib/ciudad';
      import './src/app/globals.css';
      const q = new URLSearchParams(location.search);
      window.qa = { envios: [] };
      async function accion(_, fd) {
        window.qa.envios.push(Object.fromEntries(fd));
        return { ok: false, errores: q.has('sinCiudad') ? { ciudad: ${JSON.stringify(AVISO)} } : {}, general: q.has('sinCiudad') ? undefined : 'No se pudo guardar el lugar. Intenta de nuevo.' };
      }
      createRoot(document.getElementById('root')).render(
        <Formulario accion={accion} usuarioId="cuenta" lugares={[]} ciudadContexto={CIUDAD_INICIAL} puntoInicial={{ lat: Number(q.get('lat')), lng: Number(q.get('lng')) }} />,
      );
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

/** Abre el alta con un punto de entrada (el dedo sostenido en el mapa) y el nombre ya escrito. */
async function abrir(t, consulta) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce", locale: "es-MX" });
  t.after(() => context.close());
  const p = await context.newPage();
  p.setDefaultTimeout(10_000);
  const errores = [];
  p.on("pageerror", (e) => errores.push(e.message));
  t.after(() => assert.deepEqual(errores, []));
  await p.route("**/*", (r) => (new URL(r.request().url()).origin === origin ? r.continue() : r.abort()));
  await p.goto(`${origin}/?${consulta}`);
  await p.getByLabel("Nombre del lugar").fill("Foro del Carmen");
  await p.getByLabel("Nombre del lugar").blur();
  return p;
}
const ciudadEnviada = (p) => p.locator('input[name="ciudad"]').inputValue();

test("Punto cerca de la ciudad de contexto y sin ciudad del mapa: se envía la de contexto", async (t) => {
  const p = await abrir(t, "lat=22.16&lng=-100.99");
  assert.equal(await ciudadEnviada(p), "San Luis Potosí");
  await p.getByRole("button", { name: "Publicar lugar" }).click();
  await p.waitForFunction(() => window.qa.envios.length === 1);
  assert.equal(await p.evaluate(() => window.qa.envios[0].ciudad), "San Luis Potosí");
});

test("Punto lejos de la ciudad de contexto y sin ciudad del mapa: se envía vacía y el aviso del servidor sale en «Dónde»", async (t) => {
  const p = await abrir(t, "lat=20.6&lng=-100.4&sinCiudad=1");
  assert.equal(await ciudadEnviada(p), "", "no inventa San Luis Potosí");
  await p.getByRole("button", { name: "Publicar lugar" }).click();
  await p.waitForFunction(() => window.qa.envios.length === 1);
  assert.equal(await p.evaluate(() => window.qa.envios[0].ciudad), "");
  const aviso = p.getByRole("alert").filter({ hasText: AVISO });
  await aviso.waitFor();
  assert.equal(await aviso.count(), 1);
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
});

test("El mapa da la ciudad del punto: se envía esa, aunque el contexto sea otra y el punto esté lejos de él", async (t) => {
  const p = await abrir(t, "lat=20.6&lng=-100.4&token=1");
  await p.waitForFunction(() => document.querySelector('input[name="ciudad"]').value === "Querétaro");
  await p.getByRole("button", { name: "Publicar lugar" }).click();
  await p.waitForFunction(() => window.qa.envios.length === 1);
  assert.equal(await p.evaluate(() => window.qa.envios[0].ciudad), "Querétaro");
});
