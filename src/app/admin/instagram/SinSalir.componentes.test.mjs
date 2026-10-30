/**
 * OL-496 (hallazgo 3 de la bitácora 527): al volver de Meta con la conexión hecha, la hoja de la conexión ofrece volver a publicar lo que se quedó
 * sin salir esta semana por la conexión caducada. La pantalla de verdad (`PantallaInstagram` con `ConexionInstagram`, `BotonConexion` y
 * `HojaConexion`), con dobles solo para lo que no es de esta pieza (la lista, la semana, el enrutador y la acción del servidor), en Chrome real a
 * 390×844 y 320×700, con toques reales (el ratón en el centro del elemento, comprobado con elementFromPoint):
 *   · con `?conectado` y tres pendientes: la hoja se abre sola con «Se quedó sin salir», la lista corta y «Volver a publicar (3)»; tocarlo
 *     manda los tres una vez, dice «3 van en camino…», refresca la pantalla y ya no lo ofrece (ni al cerrar y abrir la hoja);
 *   · cerrada sin tocarlo, la línea verde «Instagram quedó conectado» lleva de vuelta a la hoja con «3 no salieron ›»;
 *   · si uno no se pudo poner en la cola: lo dice y ofrece solo ese («(1)»);
 *   · sin pendientes, o sin volver de Meta, no se ofrece nada.
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
let dir, server, browser, origin;

const RENGLONES = [
  { id: "aaaa0000-0000-4000-8000-000000000001", red: "instagram", titulo: "Master Class - 9° Festival de Cine UASLP", detalle: "Instagram y Facebook · publicación · no salió el mié 7 de oct" },
  { id: "aaaa0000-0000-4000-8000-000000000002", red: "instagram", titulo: "Leonora in the morning light", detalle: "Instagram · historia · no salió el mar 6 de oct" },
  { id: "aaaa0000-0000-4000-8000-000000000003", red: "facebook", titulo: "Feleal: un viaje por el mundo en acordeón", detalle: "Facebook · no salió el lun 5 de oct" },
];

const mocks = {
  "next/navigation": "export const usePathname=()=>'/admin/instagram';export const useSearchParams=()=>new URLSearchParams(location.search);export const useRouter=()=>({refresh(){window.qa.refrescos++}});",
  // La acción del servidor: cuenta las llamadas y lo que se pidió; con `?falla=<id>` ese no se pudo poner en la cola la primera vez.
  "./acciones": "export async function volverAPublicar(ids){window.qa.pedidos.push(ids);await new Promise((r)=>setTimeout(r,80));const f=new URLSearchParams(location.search).get('falla');const fallaron=f&&window.qa.pedidos.length===1?ids.filter((x)=>x===f):[];return {ok:true,enCamino:ids.length-fallaron.length,yaIban:0,fallaron};}",
  "./ListaInstagram": "import React from 'react';export default function L(p){return React.createElement('section',null,p.pestanas,p.conexion,React.createElement('p',null,'La lista de eventos'))}",
  "./SemanaInstagram": "import React from 'react';export default function S(p){return React.createElement('section',null,p.pestanas,p.conexion,React.createElement('p',null,'La semana'))}",
  "./RenglonFalta": "export function SemanaSinMaterial(){return null}",
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "sin-salir-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    define: { "process.env": "{}" },
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: join(root, "src/app/admin/instagram"),
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import PantallaInstagram from './PantallaInstagram';
      import { claveDeVuelta, estadoConexion } from '../../../lib/instagram/conexionEstado';
      import plantilla from '../../../components/ui/Plantilla.module.css';
      import admin from '../admin.module.css';
      import '../../globals.css';
      window.qa = { pedidos: [], refrescos: 0 };
      const q = new URLSearchParams(location.search);
      const todos = ['business_management', 'instagram_basic', 'instagram_content_publish', 'instagram_manage_insights', 'pages_manage_posts', 'pages_read_engagement', 'pages_show_list'];
      const fila = { pagina_nombre: 'Somos Nosotrxs', instagram_usuario: 'smsnstrsapp', permisos: todos, conectado_en: '2026-10-07T15:50:00Z' };
      const estado = estadoConexion(fila, false, new Date('2026-10-07T16:00:00Z'), { estado: 'fallido', error: 'permiso', terminado_en: '2026-10-07T13:01:00Z' });
      const vuelta = q.get('conectado') === '1' ? 'conectado' : claveDeVuelta(q.get('error'));
      const sinSalir = ${JSON.stringify(RENGLONES)}.slice(0, Number(q.get('n') ?? 3));
      createRoot(document.getElementById('root')).render(
        <main className={plantilla.paginaContenido + ' ' + admin.listado}>
          <h1>Instagram</h1>
          <PantallaInstagram inicial="eventos" conexion={estado} vuelta={vuelta} sinSalir={sinSalir} sinMaterial={null} semana={{}} eventos={{}} />
        </main>
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
    ["/", ["text/html", '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--fuente-bricolage:Arial;--alto-cabecera:0px}</style><div id="root"></div><script src="/app.js"></script>']],
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

async function abrir(t, consulta = "", { ancho = 390, alto = 844 } = {}) {
  const context = await browser.newContext({ viewport: { width: ancho, height: alto }, reducedMotion: "reduce" });
  t.after(() => context.close());
  const p = await context.newPage();
  p.setDefaultTimeout(5000);
  const errores = [];
  p.on("pageerror", (e) => errores.push(e.message));
  t.after(() => assert.deepEqual(errores, []));
  await p.goto(origin + "/" + consulta);
  await p.getByRole("heading", { name: "Instagram", exact: true }).waitFor();
  return p;
}
/** Un toque real en el centro del elemento; antes comprueba que es él quien lo recibe (nada encima). */
async function tocar(p, l) {
  await l.evaluate((e) => e.scrollIntoView({ block: "center" }));
  const b = await l.boundingBox();
  const x = b.x + b.width / 2;
  const y = b.y + b.height / 2;
  assert.ok(await l.evaluate((e, [x, y]) => e.contains(document.elementFromPoint(x, y)), [x, y]), "nada tapa lo que se toca");
  await p.mouse.click(x, y);
}
const texto = (l) => l.innerText().then((x) => x.replace(/\s+/g, " ").trim());
const hoja = (p) => p.getByRole("dialog", { name: "Conexión con Instagram" });
const volver = (p) => hoja(p).getByRole("button", { name: /^Volver a publicar \(/ });
const filas = (p) => hoja(p).locator("li").filter({ hasText: "no salió" });
const qa = (p) => p.evaluate(() => window.qa);

test("con ?conectado y tres pendientes: la hoja se abre sola, los lista y «Volver a publicar (3)» los manda una vez", async (t) => {
  const p = await abrir(t, "?conectado=1");
  await hoja(p).waitFor();
  assert.match(await texto(hoja(p)), /Se quedó sin salir Esta semana no salieron porque la conexión caducó/i);
  assert.deepEqual(await filas(p).allInnerTexts().then((x) => x.map((s) => s.replace(/\s+/g, " ").trim())), RENGLONES.map((r) => `${r.titulo} ${r.detalle}`));
  assert.equal(await volver(p).innerText(), "Volver a publicar (3)");
  const caja = await volver(p).boundingBox();
  assert.ok(caja.height >= 44, `el botón mide 44 o más (${caja.height})`);
  const reconectar = hoja(p).getByRole("link", { name: "Reconectar" });
  assert.equal(await reconectar.count(), 1, "«Reconectar» sigue en la hoja (no se quita lo que existe)");
  assert.ok((await reconectar.boundingBox()).height >= 44);
  await tocar(p, volver(p));
  await hoja(p).getByRole("status").waitFor();
  assert.equal(await texto(hoja(p).getByRole("status")), "3 van en camino. Te avisamos en el teléfono cuando salgan.");
  const r = await qa(p);
  assert.deepEqual(r.pedidos, [RENGLONES.map((x) => x.id)], "una sola vez, con los tres");
  assert.equal(r.refrescos, 1, "la pantalla se refresca para decir «Publicando…»");
  assert.equal(await volver(p).count(), 0, "ya no se ofrece");
  assert.equal(await filas(p).count(), 0);
  // Cerrar y abrir la hoja con el botón de la conexión: no lo vuelve a ofrecer.
  await tocar(p, hoja(p).getByRole("button", { name: "Cerrar" }));
  await hoja(p).waitFor({ state: "detached" });
  assert.equal(await p.getByRole("button", { name: /no salieron/ }).count(), 0, "la línea verde ya no lleva a lo que no salió");
  await tocar(p, p.locator('main button[aria-haspopup="dialog"]'));
  await hoja(p).waitFor();
  assert.equal(await volver(p).count(), 0);
  assert.equal((await qa(p)).pedidos.length, 1);
});

test("cerrada sin tocar nada, la línea verde lleva de vuelta a la hoja con lo que no salió", async (t) => {
  const p = await abrir(t, "?conectado=1");
  await hoja(p).waitFor();
  await tocar(p, hoja(p).getByRole("button", { name: "Cerrar" }));
  await hoja(p).waitFor({ state: "detached" });
  const linea = p.getByRole("status").filter({ hasText: "Instagram quedó conectado" });
  assert.equal(await texto(linea), "Instagram quedó conectado 3 no salieron ›");
  const ver = linea.getByRole("button", { name: "3 no salieron ›" });
  assert.ok((await ver.boundingBox()).height >= 44, "el enlace mide 44 de alto");
  await tocar(p, ver);
  await hoja(p).waitFor();
  assert.equal(await volver(p).innerText(), "Volver a publicar (3)");
  assert.equal((await qa(p)).pedidos.length, 0, "abrir la hoja no manda nada");
});

test("si uno no se pudo poner en la cola: lo dice y ofrece solo ese", async (t) => {
  const p = await abrir(t, `?conectado=1&falla=${RENGLONES[1].id}`);
  await hoja(p).waitFor();
  await tocar(p, volver(p));
  await hoja(p).getByRole("status").waitFor();
  assert.equal(await texto(hoja(p).getByRole("status")), "2 van en camino. Te avisamos en el teléfono cuando salgan. 1 no se pudo poner en la cola: inténtalo otra vez.");
  assert.equal(await volver(p).innerText(), "Volver a publicar (1)");
  assert.deepEqual(await filas(p).allInnerTexts().then((x) => x.map((s) => s.replace(/\s+/g, " ").trim())), [`${RENGLONES[1].titulo} ${RENGLONES[1].detalle}`]);
  await tocar(p, volver(p));
  await p.waitForFunction(() => window.qa.pedidos.length === 2);
  await hoja(p).getByText("1 va en camino.", { exact: false }).waitFor();
  assert.deepEqual((await qa(p)).pedidos[1], [RENGLONES[1].id], "el segundo intento solo con el que faltó");
  assert.equal(await volver(p).count(), 0);
});

test("sin pendientes, o sin volver de Meta, no se ofrece nada", async (t) => {
  const p = await abrir(t, "?conectado=1&n=0");
  assert.equal(await texto(p.getByRole("status")), "Instagram quedó conectado", "la línea verde sola");
  assert.equal(await hoja(p).count(), 0, "la hoja no se abre sola");
  await tocar(p, p.locator('main button[aria-haspopup="dialog"]'));
  await hoja(p).waitFor();
  assert.equal(await hoja(p).getByText("Se quedó sin salir").count(), 0);
  assert.equal(await volver(p).count(), 0);
  const q = await abrir(t, "");
  assert.equal(await hoja(q).count(), 0, "sin ?conectado la hoja no se abre sola aunque el servidor mandara la lista");
  await tocar(q, q.locator('main button[aria-haspopup="dialog"]'));
  await hoja(q).waitFor();
  assert.equal(await volver(q).count(), 0);
});

test("a 320: la lista y los dos botones caben sin desplazar a lo ancho", async (t) => {
  const p = await abrir(t, "?conectado=1", { ancho: 320, alto: 700 });
  await hoja(p).waitFor();
  const b = await volver(p).boundingBox();
  assert.ok(b.x >= 0 && b.x + b.width <= 320 && b.height >= 44, `el botón cabe (${Math.round(b.x)}, ${Math.round(b.width)}×${Math.round(b.height)})`);
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "sin desplazamiento a lo ancho");
  await tocar(p, volver(p));
  await hoja(p).getByRole("status").waitFor();
});
