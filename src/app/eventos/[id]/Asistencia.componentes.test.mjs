/**
 * Las dos pastillas flotantes de la ficha de un evento (docs/rediseno/50, P6): «Me interesa» y «Voy», cada una un conmutador. Decidido,
 * «Voy» pasa a «Vas» (verde, con su palomita) y «Me interesa» a «Te interesa» (con la estrella llena y el color de acción); sin nota
 * dentro de la pastilla; las dos en una línea y de lo que mide un toque. Sin sesión llevan a entrar. Bundle real (esbuild) de
 * `Asistencia.tsx` con sus estilos, en Chrome real a 390×844 (no corre con `npm test`).
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

const root = fileURLToPath(new URL("../../../../", import.meta.url));
let browser, server, dir, origin;

const mocks = {
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link(p){const {href,...r}=p;return React.createElement('a',{href,...r})}",
  "next/navigation": "export function useRouter(){return {refresh(){},push(){},replace(){}}}",
  "@/lib/useAvisosTelefono": "export function usePlataforma(){return null} export function useEstadoPush(){return [null,()=>{}]} export function useInstalarApp(){return {puede:false, instalar: async()=>false}}",
  "@/lib/pushCliente": "export function disponibilidadPush(){return 'no-soportado'} export async function suscribirPush(){return {ok:false,motivo:'fallo'}}",
  "@/app/avisos/acciones": "export async function elegirAvisos(){return true}",
  "@/app/perfil/acciones": "export async function guardarSuscripcionPush(){return true}",
  "./HojaInstalar": "export default function HojaInstalar(){return null}",
  // La acción del servidor: apunta lo que recibió y se lo dice a la página, que la imita reenviando «miEstado» ya al día.
  "../acciones": "export async function cambiarAsistencia(id, estado){ window.qa.acciones.push(estado); window.qa.alGuardar(estado); return true }",
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "asistencia-componentes-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React, {useState} from 'react';import {createRoot} from 'react-dom/client';
      import Asistencia from './src/app/eventos/[id]/Asistencia';import './src/app/globals.css';
      window.qa = { acciones: [], alGuardar: () => {} };
      function App(){
        const [miEstado, setMiEstado] = useState(null);
        window.qa.alGuardar = setMiEstado;
        return React.createElement('main', { style: { minHeight: '100dvh' } },
          React.createElement(Asistencia, { eventoId: 'e1', eventoSlug: 'concierto', titulo: 'Concierto', miEstado, conSesion: new URLSearchParams(location.search).get('sesion') !== '0', cuenta: 'c1', avisosPreguntado: true, correo: 'p...@example.com', llavePush: '' }));
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

async function pagina(t, consulta = "") {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  t.after(() => context.close());
  const p = await context.newPage();
  p.setDefaultTimeout(5000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  t.after(() => assert.deepEqual(errors, []));
  await p.goto(origin + consulta);
  await p.waitForSelector("[data-flotantes]");
  return p;
}
const VERDE = "rgb(31, 111, 67)";
const VIOLETA = "rgb(109, 52, 200)";
/** El color llega en el cuadro siguiente (con «reducir movimiento» las transiciones duran 0,01 ms, pero no cero): se espera a que llegue. */
async function colorLlega(p, loc, propiedad, esperado, mensaje) {
  let visto;
  for (let i = 0; i < 100; i++) {
    visto = await loc.evaluate((e, k) => getComputedStyle(e)[k], propiedad);
    if (visto === esperado) return;
    await p.waitForTimeout(20);
  }
  assert.equal(visto, esperado, mensaje);
}

test("sin decidir: «Me interesa» y «Voy», en una línea, de lo que mide un toque y sin nota", async (t) => {
  const p = await pagina(t);
  const interesa = p.getByRole("button", { name: "Me interesa", exact: true });
  const voy = p.getByRole("button", { name: "Voy", exact: true });
  assert.equal(await interesa.getAttribute("aria-pressed"), "false");
  assert.equal(await voy.getAttribute("aria-pressed"), "false");
  await colorLlega(p, voy, "backgroundColor", VIOLETA, "«Voy» sin decidir es la acción principal, en violeta");
  const a = await interesa.boundingBox();
  const b = await voy.boundingBox();
  assert.equal(Math.round(a.height), 48);
  assert.equal(Math.round(a.y), Math.round(b.y), "en una sola línea");
  assert.ok(b.x > a.x + a.width - 1, "«Voy» a la derecha de «Me interesa»");
  const centro = (a.x + b.x + b.width) / 2;
  assert.ok(Math.abs(centro - 195) < 2, `las dos, centradas en la pantalla (centro en ${centro})`);
});

test("«Voy» pasa a «Vas» en verde con su palomita; tocarlo otra vez lo quita", async (t) => {
  const p = await pagina(t);
  await p.getByRole("button", { name: "Voy", exact: true }).click();
  const vas = p.getByRole("button", { name: "Vas", exact: true });
  await vas.waitFor();
  assert.equal(await vas.getAttribute("aria-pressed"), "true");
  await colorLlega(p, vas, "backgroundColor", VERDE, "«Vas», verde: lo que ya quedó");
  assert.equal(await vas.innerText(), "Vas", "sin nota dentro de la pastilla");
  assert.ok((await vas.locator("path").evaluateAll((ps) => ps.map((x) => x.getAttribute("d")))).includes("M5 12.5l4.5 4.5L19 7.5"), "con la palomita");
  assert.equal(await p.getByRole("button", { name: "Me interesa", exact: true }).getAttribute("aria-pressed"), "false", "«Me interesa» sigue a un lado");
  await vas.click();
  await p.getByRole("button", { name: "Voy", exact: true }).waitFor();
  assert.deepEqual(await p.evaluate(() => window.qa.acciones), ["voy", null]);
});

test("«Me interesa» pasa a «Te interesa» con la estrella llena y el color de acción, y cambiar de «Vas» a «Te interesa» suelta el Voy", async (t) => {
  const p = await pagina(t);
  await p.getByRole("button", { name: "Voy", exact: true }).click();
  await p.getByRole("button", { name: "Vas", exact: true }).waitFor();
  await p.getByRole("button", { name: "Me interesa", exact: true }).click();
  const te = p.getByRole("button", { name: "Te interesa", exact: true });
  await te.waitFor();
  assert.equal(await te.getAttribute("aria-pressed"), "true");
  await colorLlega(p, te, "color", VIOLETA, "el texto, del color de acción");
  await colorLlega(p, te, "backgroundColor", "rgb(255, 255, 255)", "sobre blanco");
  assert.equal(await te.locator("svg").first().getAttribute("fill"), "currentColor", "la estrella, llena");
  assert.equal(await te.innerText(), "Te interesa", "sin nota dentro de la pastilla");
  assert.equal(await p.getByRole("button", { name: "Voy", exact: true }).getAttribute("aria-pressed"), "false", "solo una de las dos decisiones vale a la vez");
  await te.click();
  await p.getByRole("button", { name: "Me interesa", exact: true }).waitFor();
  assert.deepEqual(await p.evaluate(() => window.qa.acciones), ["voy", "me_interesa", null]);
});

test("sin sesión, las dos pastillas son enlaces a entrar con la decisión por delante", async (t) => {
  const p = await pagina(t, "?sesion=0");
  const hrefs = await p.locator("[data-flotantes] a").evaluateAll((as) => as.map((a) => decodeURIComponent(a.getAttribute("href"))));
  assert.deepEqual(hrefs, ["/entrar?siguiente=/eventos/concierto?accion=me_interesa", "/entrar?siguiente=/eventos/concierto?accion=voy"]);
});
