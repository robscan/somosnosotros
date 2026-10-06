/** OL-296 (bitácora 324): si guardar falla en el servidor, «¿Salir sin publicar?» sigue protegiendo lo escrito.
 *  Desde OL-312 el formulario de evento solo edita (el alta por pasos lo prueba en `nuevo/evento/AltaEvento.componentes.test.mjs`); aquí,
 *  el de editar dentro de la guardia real (`useSalirSinPublicar`), acción simulada y red bloqueada.
 *  Éxito (o a medio camino): la guardia queda fuera y no se pregunta nada. Error: la guardia vuelve (la hoja, y `beforeunload`).
 *  Las acciones reales de lugar y artista hacen el mismo gesto (`apartarGuardia` + `reponerGuardia`); se comprueban con la app compilada.
 * PLAYWRIGHT_MODULE=/ruta/playwright-core/index.mjs node --test este-archivo   (o `npm run test:componentes`) */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const captures = process.env.GUARDIA_SCREENSHOTS;
const general = "No se pudo publicar el evento completo. Intenta de nuevo.";
let dir, server, browser, origin;
const mocks = {
  "./acciones": "export async function zonaDelPunto(){return 'America/Mexico_City'} export async function cupoDeCartel(){return null} export async function pedirMasLecturas(){return {ok:false}} export async function leerCartelAccion(){throw Error('No usar OCR')}",
  "@/components/ui/Atras": "export function useTerminar(){return (url)=>{window.qa.terminado=url}}",
  "@/components/HojaDonde": "export default function C(){return null}",
  "@/lib/useAvisosTelefono": "export function usePlataforma(){return null}",
  "./SelectorCuando": "export default function C(){return null}",
  "./SelectorQuien": "export default function C(){return null}",
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link({prefetch,replace,...p}){return React.createElement('a',p)}",
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "guardia-tras-error-"));
  if (captures) await mkdir(captures, { recursive: true });
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React, {useRef} from 'react';import {createRoot} from 'react-dom/client';
      import Form from './src/app/eventos/FormularioEvento';
      import {useSalirSinPublicar} from './src/components/SalirSinPublicar';
      import {pedirSalida} from './src/lib/guardiaSalida';
      import './src/app/globals.css';
      // resultado: 'error' | 'ok' | 'pendiente' (la acción no contesta: la publicación sigue en camino)
      window.qa = {envios:0, resultado:'error', salio:0, pedirSalida, terminado:null};
      async function accion(_, fd){
        window.qa.envios++;
        if (window.qa.resultado === 'pendiente') return new Promise(() => {});
        if (window.qa.resultado === 'ok') return {ok:true,id:'e1',volver:'/eventos/e1'};
        return {ok:false,errores:{},general:${JSON.stringify(general)}};
      }
      function Pantalla(){
        const pantalla = useRef(null);
        const hoja = useSalirSinPublicar(pantalla);
        return (
          <main ref={pantalla}>
            <Form accion={accion} lugares={[]} usuarioId="cuenta" revision="2026-10-01T10:00:00.123456+00:00"
              evento={{titulo:'',sitio_texto:'Sitio de prueba',sitio_reservado:false,inicio:'2026-11-01T20:00:00Z',fin:null,gratis:true,precio:null,zona:'America/Mexico_City'}}/>
            {hoja}
          </main>
        );
      }
      createRoot(document.getElementById('root')).render(<Pantalla/>);
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

async function pagina(t, resultado) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  t.after(() => context.close());
  const p = await context.newPage();
  p.setDefaultTimeout(8000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  t.after(() => assert.deepEqual(errors, []));
  await p.route("**/*", (r) => (new URL(r.request().url()).origin === origin ? r.continue() : r.abort()));
  await p.goto(origin);
  await p.evaluate((r) => (window.qa.resultado = r), resultado);
  await p.getByLabel("Nombre del evento").fill("Concierto de prueba");
  return p;
}
/** true si el navegador pediría confirmar: el oyente de `beforeunload` canceló el evento. */
const avisa = (p) => p.evaluate(() => !window.dispatchEvent(new Event("beforeunload", { cancelable: true })));
/** true si Atrás o la ✕ se detienen en la guardia (se le entrega la salida y ella decide). */
const guardia = (p) => p.evaluate(() => window.qa.pedirSalida(() => window.qa.salio++));

test("sin guardar, la guardia protege (control)", async (t) => {
  const p = await pagina(t, "error");
  assert.equal(await guardia(p), true);
  assert.equal(await avisa(p), true);
});

test("el servidor devuelve un error: lo escrito sigue y la guardia sigue puesta (hoja y beforeunload)", async (t) => {
  const p = await pagina(t, "error");
  await p.getByRole("button", { name: "Guardar cambios" }).click();
  await p.getByText(general, { exact: true }).waitFor();
  assert.equal(await p.evaluate(() => window.qa.envios), 1);
  assert.equal(await p.getByLabel("Nombre del evento").inputValue(), "Concierto de prueba");
  assert.equal(await avisa(p), true);
  assert.equal(await guardia(p), true);
  await p.getByText("¿Salir sin publicar?").waitFor();
  assert.equal(await p.evaluate(() => window.qa.salio), 0);
  if (captures) await p.screenshot({ path: join(captures, "evento-error-hoja.png") });
  await p.getByRole("button", { name: "Seguir editando" }).click();
  assert.equal(await p.getByLabel("Nombre del evento").inputValue(), "Concierto de prueba");
  await p.evaluate(() => window.qa.pedirSalida(() => window.qa.salio++));
  await p.getByRole("button", { name: "Salir y borrar" }).click();
  assert.equal(await p.evaluate(() => window.qa.salio), 1);
  assert.equal(await avisa(p), false);
});

test("error y reintento con éxito: al volver a guardar, la guardia sale otra vez", async (t) => {
  const p = await pagina(t, "error");
  await p.getByRole("button", { name: "Guardar cambios" }).click();
  await p.getByText(general, { exact: true }).waitFor();
  assert.equal(await guardia(p), true);
  await p.getByRole("button", { name: "Seguir editando" }).click();
  await p.evaluate(() => (window.qa.resultado = "ok"));
  await p.getByRole("button", { name: "Guardar cambios" }).click();
  await p.waitForFunction(() => window.qa.terminado === "/eventos/e1");
  assert.equal(await guardia(p), false);
  assert.equal(await avisa(p), false);
});

test("guarda bien: no se pregunta nada al volver a la ficha", async (t) => {
  const p = await pagina(t, "ok");
  await p.getByRole("button", { name: "Guardar cambios" }).click();
  await p.waitForFunction(() => window.qa.terminado === "/eventos/e1");
  assert.equal(await guardia(p), false);
  assert.equal(await avisa(p), false);
});

test("mientras el servidor contesta (guardando) la guardia sigue fuera, como siempre", async (t) => {
  const p = await pagina(t, "pendiente");
  await p.getByRole("button", { name: "Guardar cambios" }).click();
  await p.waitForFunction(() => window.qa.envios === 1);
  assert.equal(await guardia(p), false);
  assert.equal(await avisa(p), false);
});
