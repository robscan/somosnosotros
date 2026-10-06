/** La ciudad de un evento en «otro sitio» (OL-299, bitácora 327): el campo oculto `ciudad` lleva la del pin (la de Mapbox o, sin
 *  ella, la de contexto si el pin cae a menos de 50 km de su centro) y nunca inventa San Luis Potosí; al editar con el mismo pin
 *  conserva la guardada. Un sitio sin punto manda lo que haya (nada), y el servidor lo deja en la inicial como siempre.
 *  Formulario real, acción simulada y red bloqueada.
 * PLAYWRIGHT_MODULE=/ruta/playwright-core/index.mjs CHROME_EXECUTABLE=/ruta/chromium node --test este-archivo
 * (no corre con `npm test`, que solo toma `.test.ts`; sí con `npm run test:componentes`). */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../../", import.meta.url));
let dir, server, browser, origin;
const mocks = {
  "./acciones": "export async function zonaDelPunto(){return 'America/Mexico_City'} export async function cupoDeCartel(){return null} export async function pedirMasLecturas(){return {ok:false}} export async function leerCartelAccion(){throw Error('No usar OCR')}",
  "@/components/ui/Atras": "export function useTerminar(){return ()=>{}}",
  "@/components/HojaDonde": "export default function C(){return null}",
  "@/lib/useAvisosTelefono": "export function usePlataforma(){return null}",
  "./SelectorCuando": "export default function C(){return null}",
  "./SelectorQuien": "export default function C(){return null}",
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link(p){return React.createElement('a',p)}",
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "ciudad-sitio-componentes-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import Form from './src/app/eventos/FormularioEvento';import './src/app/globals.css';
      const q = new URLSearchParams(location.search);
      window.qa = { envios: [] };
      async function accion(_, fd) { window.qa.envios.push(Object.fromEntries(fd)); return { ok: false, errores: {}, general: 'No se pudo guardar.' }; }
      const punto = q.has('sinPunto') ? { sitio_lat: null, sitio_lng: null } : { sitio_lat: Number(q.get('lat')), sitio_lng: Number(q.get('lng')) };
      const contexto = q.has('contexto') ? { slug: 'san-luis-potosi', nombre: 'San Luis Potosí', centro: { lng: -100.9764, lat: 22.1497 }, zoom: 13 } : null;
      createRoot(document.getElementById('root')).render(
        <Form accion={accion} lugares={[]} usuarioId="cuenta" revision="2026-10-01T10:00:00.123456+00:00" ciudadContexto={contexto}
          evento={{ id: '00000000-0000-4000-8000-0000000000f1', titulo: 'Evento de prueba', sitio_texto: 'Plaza de prueba', sitio_direccion: q.has('sinPunto') ? null : 'Calle Prueba 1',
            sitio_reservado: false, inicio: '2030-11-01T20:00:00Z', fin: null, gratis: true, precio: null, zona: 'America/Mexico_City', ciudad: q.get('ciudad'), ...punto }} />,
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
    ["/", ["text/html", '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--fuente-bricolage:Arial}</style><main class="pagina"><div id="root"></div></main><script src="/app.js"></script>']],
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

/** Abre el formulario de edición con el sitio de la URL y devuelve la ciudad que enviaría. */
async function ciudadEnviada(t, consulta) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  t.after(() => context.close());
  const p = await context.newPage();
  p.setDefaultTimeout(10_000);
  const errores = [];
  p.on("pageerror", (e) => errores.push(e.message));
  t.after(() => assert.deepEqual(errores, []));
  await p.route("**/*", (r) => (new URL(r.request().url()).origin === origin ? r.continue() : r.abort()));
  await p.goto(`${origin}/?${consulta}`);
  await p.getByRole("button", { name: /^Guardar/ }).click();
  await p.waitForFunction(() => window.qa.envios.length === 1);
  return p.evaluate(() => window.qa.envios[0].ciudad);
}

test("el pin trae la ciudad que se guardó: se envía esa, aunque el contexto sea otro", async (t) => {
  assert.equal(await ciudadEnviada(t, "lat=20.6&lng=-100.4&ciudad=Querétaro&contexto=1"), "Querétaro");
});

test("pin sin ciudad y cerca del centro de la ciudad de contexto: se envía la de contexto", async (t) => {
  assert.equal(await ciudadEnviada(t, "lat=22.16&lng=-100.99&contexto=1"), "San Luis Potosí");
});

test("pin sin ciudad y lejos del contexto, o sin contexto: se envía vacía (el servidor no publica un punto nuevo, no pone San Luis Potosí)", async (t) => {
  assert.equal(await ciudadEnviada(t, "lat=20.6&lng=-100.4&contexto=1"), "");
  assert.equal(await ciudadEnviada(t, "lat=22.16&lng=-100.99"), "");
});

test("un sitio sin punto manda lo que tenga (nada): no hay de dónde deducirla y el servidor lo deja en la inicial como siempre", async (t) => {
  assert.equal(await ciudadEnviada(t, "sinPunto=1&contexto=1"), "");
});
