/**
 * Los botones de estado no parpadean (OL-354, bitácora 385): «Me interesa» y «Voy» de la ficha de un evento, «Seguir» de la ficha de
 * un lugar o artista, y el botón redondo de los renglones y carriles («Voy» y «Seguir»). Al tocarlos cambian al momento y una sola
 * vez a su estado final; mientras el servidor confirma (aquí tarda 300 ms) no hay ningún cambio visual: la opacidad no baja de 1 ni
 * un cuadro. Si el servidor falla, vuelven una vez a como estaban. Antes, `aria-busy` encendía el latido de `ui/Boton` (la opacidad
 * bajaba hacia 0,55 y volvía de golpe al responder el servidor): el «fade» que vio el founder.
 * Se graba en cada cuadro (`requestAnimationFrame`) la opacidad calculada y el estado del botón desde que se suelta el dedo (el
 * pulsado de `globals.css` es aparte: dura lo que el dedo). Sin «reducir movimiento», para que una animación sí se vea si la hubiera.
 * Bundle real (esbuild) con sus estilos, en Chrome real a 390×844 (no corre con `npm test`).
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
let browser, server, dir, origin;

// El servidor lento: cada acción tarda 300 ms y contesta lo que diga `window.qa.falla` (sin fallar, guardado). La de la ficha, además,
// trae la página al día (`window.qa.alGuardar`), como la revalidación en el acto de la acción de verdad.
const accion = "async function lento(){ await new Promise((r) => setTimeout(r, 300)); if (window.qa.falla) return false; return true }";
const mocks = {
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link(p){const {href,...r}=p;return React.createElement('a',{href,...r})}",
  "next/navigation": "export function useRouter(){return {refresh(){},push(){},replace(){}}}",
  "@/lib/useAvisosTelefono": "export function usePlataforma(){return null} export function useEstadoPush(){return [null,()=>{}]} export function useInstalarApp(){return {puede:false, instalar: async()=>false}}",
  "@/lib/pushCliente": "export function disponibilidadPush(){return 'no-soportado'} export async function suscribirPush(){return {ok:false,motivo:'fallo'}}",
  "@/app/avisos/acciones": "export async function elegirAvisos(){return true}",
  "@/app/perfil/acciones": "export async function guardarSuscripcionPush(){return true}",
  "./HojaInstalar": "export default function HojaInstalar(){return null}",
  "../acciones": "export async function cambiarAsistencia(id, estado){ await new Promise((r) => setTimeout(r, 300)); if (window.qa.falla) return false; window.qa.alGuardar(estado); return true }",
  "@/app/eventos/acciones": `${accion} export async function cambiarAsistencia(){ return lento() }`,
  "@/app/lugares/acciones": `${accion} export async function cambiarSeguimiento(){ return lento() }`,
  "@/app/artistas/acciones": `${accion} export async function cambiarSeguimientoArtista(){ return lento() }`,
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "sin-parpadeo-componentes-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import Asistencia from './src/app/eventos/[id]/Asistencia';
      import Seguir from './src/components/Seguir';
      import BotonRenglon from './src/components/ui/BotonRenglon';
      import {useSeguirEnLista} from './src/components/useSeguirEnLista';
      import {useAsistenciaEnLista} from './src/components/useAsistenciaEnLista';
      import './src/app/globals.css';
      window.qa = { falla: false };
      const avisos = { cuenta: 'c1', preguntado: true, correo: 'p...@example.com', llavePush: '' };
      // Lo que llega del servidor, estable entre pintadas (como las props de una página): una lista nueva en cada pintada
      // contaría como «llegó otra respuesta» en cada una.
      const seguidos = [];
      const decididas = {};
      function Lugar() {
        const s = useSeguirEnLista('lugar', seguidos, avisos);
        return <div data-qa="renglon-lugar"><BotonRenglon {...s.boton('l1', 'Foro')} />{s.extras}</div>;
      }
      function Carril() {
        const a = useAsistenciaEnLista(decididas, avisos);
        return <div data-qa="carril-evento"><BotonRenglon sobreFoto {...a.boton({ id: 'e2', titulo: 'Concierto' })} />{a.extras}</div>;
      }
      const que = new URLSearchParams(location.search).get('que');
      function App() {
        // La ficha: al guardar, la acción trae la página al día (revalida en el acto) y llega el estado nuevo como prop.
        const [miEstado, setMiEstado] = React.useState(null);
        const [sigo, setSigo] = React.useState(false);
        window.qa.alGuardar = (v) => (que === 'seguir' ? setSigo(v) : setMiEstado(v));
        const lento = async (v) => { await new Promise((r) => setTimeout(r, 300)); if (window.qa.falla) return false; window.qa.alGuardar(v); return true };
        if (que === 'renglon') return <main><Lugar /></main>;
        if (que === 'carril') return <main><Carril /></main>;
        if (que === 'seguir') return <main><Seguir que="lugar" nombre="Foro" sigo={sigo} conSesion cuenta="c1" accion={lento} hrefEntrar="/lugares/l1" avisosPreguntado correo="p...@example.com" llavePush="" /></main>;
        return <main><Asistencia eventoId="e1" eventoSlug="concierto" titulo="Concierto" miEstado={miEstado} conSesion cuenta="c1" avisosPreguntado correo="p...@example.com" llavePush="" /></main>;
      }
      createRoot(document.getElementById('root')).render(<App />);
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

async function pagina(t, que = "") {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "no-preference" });
  t.after(() => context.close());
  const p = await context.newPage();
  p.setDefaultTimeout(5000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  t.after(() => assert.deepEqual(errors, []));
  await p.goto(`${origin}/?que=${que}`);
  await p.waitForSelector("main button");
  return p;
}

/**
 * Toca el botón que encuentra `selector` y graba, cuadro a cuadro durante `ms`, su opacidad calculada (la del botón y la de lo que
 * lleva dentro) y su estado (`aria-pressed`, `aria-label` y texto). Devuelve los cuadros desde que se soltó el dedo.
 */
async function grabarToque(p, selector, ms = 700) {
  const caja = await p.locator(selector).boundingBox();
  await p.evaluate(
    ({ selector, ms }) => {
      const cuadros = [];
      window.qa.cuadros = cuadros;
      window.qa.suelto = Infinity;
      addEventListener("pointerup", () => (window.qa.suelto = performance.now()), { once: true, capture: true });
      const fin = performance.now() + ms;
      const grabar = () => {
        const b = document.querySelector(selector);
        if (b) {
          const opacidades = [b, ...b.querySelectorAll("*")].map((e) => Number(getComputedStyle(e).opacity));
          cuadros.push({ t: performance.now(), opacidad: Math.min(...opacidades), estado: `${b.getAttribute("aria-pressed")}|${b.getAttribute("aria-label") ?? b.textContent}` });
        }
        if (performance.now() < fin) requestAnimationFrame(grabar);
        else window.qa.listo = true;
      };
      window.qa.listo = false;
      requestAnimationFrame(grabar);
    },
    { selector, ms },
  );
  await p.mouse.click(caja.x + caja.width / 2, caja.y + caja.height / 2);
  await p.waitForFunction(() => window.qa.listo, null, { timeout: ms + 3000 });
  return p.evaluate(() => window.qa.cuadros.filter((c) => c.t > window.qa.suelto));
}
/** Los estados por los que pasó el botón, sin repetir los seguidos. */
const cambios = (cuadros) => cuadros.map((c) => c.estado).filter((e, i, xs) => i === 0 || e !== xs[i - 1]);
const opacidadMinima = (cuadros) => Math.min(...cuadros.map((c) => c.opacidad));

function sinParpadeo(cuadros, esperados, que) {
  if (process.env.VER_CUADROS) console.log(que, JSON.stringify(cuadros.map((c) => [Math.round(c.t - cuadros[0].t), c.opacidad, c.estado])));
  assert.ok(cuadros.length > 20, `${que}: se grabaron ${cuadros.length} cuadros`);
  assert.equal(opacidadMinima(cuadros), 1, `${que}: la opacidad nunca baja de 1 mientras el servidor confirma`);
  assert.deepEqual(cambios(cuadros), esperados, `${que}: cambia una sola vez, al momento`);
}

test("ficha de evento: «Voy» pasa a «Vas» al momento y no se atenúa mientras el servidor confirma", async (t) => {
  const p = await pagina(t);
  const cuadros = await grabarToque(p, "[data-flotantes] button:last-child");
  sinParpadeo(cuadros, ["true|Vas"], "Voy");
});

test("ficha de evento: «Me interesa» pasa a «Te interesa» al momento y no se atenúa", async (t) => {
  const p = await pagina(t);
  const cuadros = await grabarToque(p, "[data-flotantes] button:first-child");
  sinParpadeo(cuadros, ["true|Te interesa"], "Me interesa");
});

test("ficha de evento: si el servidor falla, «Vas» vuelve una sola vez a «Voy», sin atenuarse", async (t) => {
  const p = await pagina(t);
  await p.evaluate(() => (window.qa.falla = true));
  const cuadros = await grabarToque(p, "[data-flotantes] button:last-child");
  sinParpadeo(cuadros, ["true|Vas", "false|Voy"], "Voy con fallo");
  await p.getByRole("button", { name: "Reintentar" }).waitFor();
});

test("ficha de lugar: «Seguir» pasa a «Sigues» al momento y no se atenúa", async (t) => {
  const p = await pagina(t, "seguir");
  const cuadros = await grabarToque(p, "[data-flotantes] button");
  sinParpadeo(cuadros, ["true|Sigues"], "Seguir");
});

test("renglón de lugar: la campana pasa a la palomita al momento y no se atenúa", async (t) => {
  const p = await pagina(t, "renglon");
  const cuadros = await grabarToque(p, "[data-qa=renglon-lugar] button");
  sinParpadeo(cuadros, ["true|Sigues — Foro"], "Seguir en renglón");
});

test("tarjeta de carril: «Voy» pasa a la palomita al momento y no se atenúa", async (t) => {
  const p = await pagina(t, "carril");
  const cuadros = await grabarToque(p, "[data-qa=carril-evento] button");
  sinParpadeo(cuadros, ["true|Ya vas — Concierto"], "Voy en carril");
});
