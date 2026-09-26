/**
 * OL-212 (bitácora 241): la primera vez que se guarda "Seguir", `Seguir.tsx` cerraba la hoja de avisos con
 * `router.refresh()` — un refetch de todo el árbol de componentes de servidor, innecesario (nada de lo que la
 * barra necesita depende de datos que solo el servidor tenga: el correo elegido llega aquí mismo, en la propia
 * hoja). No se pudo forzar una recarga real del documento contra un servidor Next real (bitácora 241, sección de
 * reproducción); esta prueba ataca el defecto concreto y demostrado: que cerrar la hoja de avisos (contestada o no)
 * nunca vuelva a pedir la página entera al servidor. Bundle real (esbuild) de `Seguir.tsx` + `ConsentimientoAvisos`
 * + `ui/Hoja` de verdad, con Chrome real vía Playwright (no corre con `npm test`; se corre a mano, ver bitácora).
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
let browser, server, dir, origin;

const mocks = {
  "next/link": "import React from 'react';export default function Link(p){const {href,...r}=p;return React.createElement('a',{href,...r})}",
  "next/navigation": "export function useRouter(){return {refresh(){window.qa.refrescos++},push(){},replace(){}}}",
  // Push/avisos: deterministico y sin permisos reales del navegador — lo que se prueba aqui es la recarga, no el
  // permiso de notificaciones (ya cubierto por otras piezas, bitacora 147/164/166).
  "@/lib/useAvisosTelefono": "export function usePlataforma(){return null} export function useEstadoPush(){return [null,()=>{}]} export function useInstalarApp(){return {puede:false, instalar: async()=>false}}",
  "@/lib/pushCliente": "export function disponibilidadPush(){return 'no-soportado'} export async function suscribirPush(){return {ok:false,motivo:'fallo'}}",
  "@/app/avisos/acciones": "export async function elegirAvisos(e){window.qa.elecciones.push(e); return true}",
  "@/app/perfil/acciones": "export async function guardarSuscripcionPush(){return true}",
  "./HojaInstalar": "export default function HojaInstalar(){return null}",
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "seguir-componentes-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React, {useState} from 'react';import {createRoot} from 'react-dom/client';
      import Seguir from './src/components/Seguir';import './src/app/globals.css';
      window.qa = {refrescos: 0, elecciones: [], acciones: []};
      // Un Server Component real reenvia "sigo" al dia tras el revalidatePath del guardado; aqui se imita a mano
      // guardando lo que la accion recibio, para que la barra pueda pintar "Sigues" como en produccion.
      function App(){
        const [sigo, setSigo] = useState(false);
        async function accion(seguir){window.qa.acciones.push(seguir); setSigo(seguir); return true}
        return React.createElement(Seguir, {
          que: 'lugar', nombre: 'Lugar de prueba', sigo, conSesion: true, cuenta: 'cuenta-1',
          accion, hrefEntrar: '/lugares/l1?accion=seguir', avisosPreguntado: false, avisosCorreo: false,
          correo: 'p...@example.com', llavePush: '',
        });
      }
      createRoot(document.getElementById('root')).render(React.createElement(App));
    `,
    },
    plugins: [
      {
        name: "dobles",
        setup(b) {
          b.onResolve({ filter: /.*/ }, (a) => (a.path in mocks ? { path: a.path, namespace: "mock" } : undefined));
          b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({ contents: mocks[a.path], loader: "jsx", resolveDir: root }));
        },
      },
    ],
  });
  const assets = new Map([
    [
      "/",
      [
        "text/html",
        // Contador en sessionStorage: sobrevive a una recarga real del documento (a diferencia de una variable JS
        // suelta) y por eso sirve para detectarla — si el script se ejecuta dos veces, algo recargo la pagina.
        `<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--fuente-bricolage:Arial}</style><div id="root"></div>
         <script>sessionStorage.setItem("cargas", String(Number(sessionStorage.getItem("cargas")||"0")+1));</script>
         <script src="/app.js"></script>`,
      ],
    ],
    ["/app.js", ["text/javascript", await readFile(join(dir, "app.js"))]],
    ["/app.css", ["text/css", await readFile(join(dir, "app.css"))]],
  ]);
  server = createServer((req, res) => {
    const a = assets.get(req.url);
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

async function nuevaPagina(t) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  t.after(() => context.close());
  const p = await context.newPage();
  p.setDefaultTimeout(10_000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  t.after(() => assert.deepEqual(errors, []));
  await p.goto(origin);
  await p.waitForSelector("text=Seguir");
  return p;
}

test("primer Seguir: cerrar la hoja de avisos con 'No, gracias' no recarga la pagina ni refresca el router", async (t) => {
  const p = await nuevaPagina(t);
  await p.getByRole("button", { name: "Seguir" }).click();
  await p.getByText("¿Te avisamos de sus eventos?").waitFor();
  await p.getByRole("button", { name: "No, gracias" }).click();
  // La hoja se autocierra ~1.6s despues de contestar (ConsentimientoAvisos, "cierraSola").
  await p.waitForSelector('[aria-label="Avisos"]', { state: "detached" });
  const cargas = await p.evaluate(() => Number(sessionStorage.getItem("cargas")));
  const refrescos = await p.evaluate(() => window.qa.refrescos);
  assert.equal(cargas, 1, "el script del bundle se ejecuto mas de una vez: la pagina se recargo de verdad");
  assert.equal(refrescos, 0, "cerrar la hoja de avisos llamo a router.refresh() (recarga del arbol de servidor)");
  // El boton sigue mostrando el estado guardado, sin haber perdido el montaje.
  assert.match(await p.locator("body").innerText(), /Sigues/);
});

test("primer Seguir: cerrar la hoja de avisos con la X (sin contestar) tampoco refresca", async (t) => {
  const p = await nuevaPagina(t);
  await p.getByRole("button", { name: "Seguir" }).click();
  await p.getByText("¿Te avisamos de sus eventos?").waitFor();
  await p.getByRole("button", { name: "Cerrar" }).click();
  await p.waitForSelector('[aria-label="Avisos"]', { state: "detached" });
  const cargas = await p.evaluate(() => Number(sessionStorage.getItem("cargas")));
  const refrescos = await p.evaluate(() => window.qa.refrescos);
  assert.equal(cargas, 1, "el script del bundle se ejecuto mas de una vez: la pagina se recargo de verdad");
  assert.equal(refrescos, 0, "cerrar la hoja con la X llamo a router.refresh() (recarga del arbol de servidor)");
});
