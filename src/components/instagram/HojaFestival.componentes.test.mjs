/**
 * OL-463 (bitácora 495): un festival en la hoja «Publicar en Instagram», con el festival del respaldo local («Cultura Mística (demo)»,
 * `RESPALDO_FESTIVAL_IG=1` en `scripts/ops/auditoria-ui/respaldo-local/fixture.mjs`: un marco sin precio y once actos con precios distintos y
 * nueve artistas). Los componentes de verdad (`ListaInstagram` con su `HojaInstagram`) y las acciones del servidor de prueba, que arman lo que
 * prepararía `cargarParaHoja` desde las filas del respaldo. Toques reales: el ratón en coordenadas.
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

const root = fileURLToPath(new URL("../../../", import.meta.url));
let dir, server, browser, origin;

// Las filas del festival en el respaldo local (todo inventado).
process.env.RESPALDO_FESTIVAL_IG = "1";
const { tablas, E_MISTICA } = await import(pathToFileURL(join(root, "scripts/ops/auditoria-ui/respaldo-local/fixture.mjs")).href);
const marco = tablas.eventos.find((e) => e.id === E_MISTICA);
const actos = tablas.eventos.filter((e) => e.evento_padre_id === E_MISTICA);
const ids = new Set([marco.id, ...actos.map((a) => a.id)]);
const filas = {
  marco,
  actos,
  lugar: tablas.lugares.find((l) => l.id === marco.lugar_id),
  ligados: tablas.eventos_artistas.filter((x) => ids.has(x.evento_id)),
  artistas: tablas.artistas.filter((a) => tablas.eventos_artistas.some((x) => ids.has(x.evento_id) && x.artista_id === a.id)),
};

const acciones = `
  const apuntar = (nombre, args) => window.qa.acciones.push([nombre, ...args]);
  export async function prepararInstagram(id) {
    apuntar('prepararInstagram', [id]);
    const evento = window.qa.festival;
    return { ok: true, id, titulo: evento.titulo, ahora: new Date().toISOString(), etiquetas: window.qa.etiquetas, ubicacion: { nombre: 'San Luis Potosí' },
      ciudad: { slug: 'san-luis-potosi', nombre: 'San Luis Potosí' }, conCartel: false, recortar: false, sePuede: true, publicado: null, evento };
  }
  // OL-465: publicar guarda el trabajo en la cola y la hoja se cierra.
  export async function publicarEnInstagram(p) {
    apuntar('publicarEnInstagram', [p]);
    return { ok: true, id: 't1' };
  }
  export async function estadoTrabajo() { return null; }
  export async function publicarEnFacebook(...a) { apuntar('publicarEnFacebook', a); return { ok: true, id: 't2' }; }
`;
const mocks = {
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link({prefetch,replace,scroll,...p}){return React.createElement('a',p)}",
  "next/image": "import React from 'react';export default function Image({quality,priority,fill,...p}){return React.createElement('img',p)}",
  "next/navigation": "export const useRouter=()=>({push(){},refresh(){window.qa.refrescos++},back(){},replace(){}});export const usePathname=()=>'/admin/instagram';export const useSearchParams=()=>new URLSearchParams();",
  "./acciones": acciones,
  "@/app/admin/instagram/acciones": acciones,
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "hoja-festival-"));
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
      import ListaInstagram from './ListaInstagram';
      import { etiquetasDeLaFoto, usuarioDeInstagram } from '../../../lib/instagram/texto';
      import plantilla from '../../../components/ui/Plantilla.module.css';
      import admin from '../admin.module.css';
      import '../../globals.css';
      // Lo que arma cargarParaHoja con estas filas: los artistas del marco, cada acto con los suyos y su precio, el lugar con su @.
      const f = ${JSON.stringify(filas)};
      const artista = (id) => { const a = f.artistas.find((x) => x.id === id); return { id: a.id, nombre: a.nombre, usuario: usuarioDeInstagram(a.redes), disciplina: a.disciplina }; };
      const de = (eventoId) => f.ligados.filter((x) => x.evento_id === eventoId).sort((a, b) => a.orden - b.orden).map((x) => artista(x.artista_id));
      const festival = {
        titulo: f.marco.titulo, inicio: f.marco.inicio, fin: f.marco.fin, zona: f.marco.zona, clase: 'festival', precio: f.marco.precio, opcional: true,
        lugar: { nombre: f.lugar.nombre, usuario: usuarioDeInstagram(f.lugar.redes) }, ciudad: f.marco.ciudad, artistas: de(f.marco.id),
        actos: f.actos.map((a) => ({ titulo: a.titulo, inicio: a.inicio, fin: a.fin, precio: a.precio, artistas: de(a.id) })),
      };
      window.qa = { acciones: [], refrescos: 0, festival, etiquetas: etiquetasDeLaFoto(festival) };
      const para = [{ id: f.marco.id, href: '/eventos/' + f.marco.slug, titulo: f.marco.titulo, foto: null, cuando: 'Del 29 al 31 de oct · ' + f.actos.length + ' actos', donde: f.lugar.nombre, linea: 'Sin cartel · 0 van · 0 les interesa', publicado: false, facebook: null }];
      createRoot(document.getElementById('root')).render(
        <main className={plantilla.paginaContenido + ' ' + admin.listado}><h1>Instagram</h1>
          <ListaInstagram ciudad={{ slug: 'san-luis-potosi', nombre: 'San Luis Potosí' }} ciudades={[]} para={para} ya={[]} abrir={null} conteo="1 evento en los próximos 7 días" vacio={null} /></main>,
      );
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

async function abrir(t) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  t.after(() => context.close());
  const p = await context.newPage();
  p.setDefaultTimeout(5000);
  const errores = [];
  p.on("pageerror", (e) => errores.push(e.message));
  t.after(() => assert.deepEqual(errores, []));
  await p.goto(origin + "/");
  await p.getByRole("heading", { name: "Instagram", exact: true }).waitFor();
  return p;
}
async function tocar(p, l) {
  await l.evaluate((e) => e.scrollIntoView({ block: "center" }));
  const b = await l.boundingBox();
  await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
}
const qa = (p) => p.evaluate(() => window.qa);
const texto = (l) => l.innerText().then((x) => x.replace(/\s+/g, " ").trim());
async function hojaDelFestival(p) {
  await tocar(p, p.getByRole("link", { name: /Cultura Mística \(demo\)/ }));
  const hoja = p.getByRole("dialog", { name: "Publicar en Instagram" });
  await hoja.getByRole("button", { name: "Publicar", exact: true }).waitFor();
  return hoja;
}
// El texto armado: cerrado, `ui/CampoLargo` lo lleva en su campo oculto (lo que se publica).
const campo = (hoja) => hoja.locator('input[name="texto"]');

test("el festival es un solo renglón con sus actos en el detalle", async (t) => {
  const p = await abrir(t);
  const renglon = p.locator("main li", { hasText: "Cultura Mística (demo)" });
  assert.equal(await p.locator("main li").count(), 1);
  assert.match(await texto(renglon), /· 11 actos/);
});

test("la hoja etiqueta al lugar, a quien organiza y a los artistas de todos sus actos, sin repetir", async (t) => {
  const p = await abrir(t);
  const hoja = await hojaDelFestival(p);
  const chips = await hoja.getByRole("group", { name: "Etiquetas en la foto" }).getByRole("button").allInnerTexts();
  assert.deepEqual(chips.map((c) => c.trim()), ["@aether.slp", "@culturamistica.demo", "@marthafranco.demo", "@tamborancestral.demo", "@luna.arcana.demo", "@sahumerio.demo", "@ixchel.ramos.demo", "@rocio.mendoza.demo", "@oraculo.sonoro.demo"]);
  const t1 = await campo(hoja).inputValue();
  // El precio sale de los actos (gratis y de $80 a $130), nunca «Gratis» por omisión.
  assert.match(t1, /\nEntrada libre · actividades con cooperación \(\$80–\$130\)\n/);
  assert.doesNotMatch(t1, /^Gratis$/m);
  // El programa: un renglón por día, con hora, acto y su artista con @, cada @ una vez.
  assert.match(t1, /· 5:30 pm Meditación con Martha Franco \(demo\) @marthafranco\.demo · 6:30 pm Taller de escritura con Gustoño \(demo\) · 9:00 pm Charla de tarot con @luna\.arcana\.demo\n/);
  assert.match(t1, /8:30 pm Fogata y cantos de cierre con Tambor Ancestral \(demo\) y Martha Franco \(demo\)\n/);
  assert.match(t1, /\n\nCon @culturamistica\.demo\n\n/);
  const menciones = t1.match(/@[A-Za-z0-9._]+/g);
  assert.equal(new Set(menciones).size, menciones.length, "cada @ una sola vez");
  assert.match(await texto(hoja), new RegExp(`Texto de la publicación ${t1.length}/2200`), "el contador a la vista");
});

test("quitar una etiqueta la saca del programa (queda su nombre) y publicar manda lo quitado", async (t) => {
  const p = await abrir(t);
  const hoja = await hojaDelFestival(p);
  await tocar(p, hoja.getByRole("button", { name: /@luna\.arcana\.demo/ }));
  const t1 = await campo(hoja).inputValue();
  assert.match(t1, /9:00 pm Charla de tarot con Luna Arcana \(demo\)/);
  assert.doesNotMatch(t1, /@luna\.arcana\.demo/);
  assert.equal(await hoja.getByRole("button", { name: "Volver a etiquetar" }).count(), 1);
  await tocar(p, hoja.getByRole("button", { name: "Publicar", exact: true }));
  // OL-465: el trabajo queda en la cola y la hoja se cierra.
  await hoja.waitFor({ state: "detached" });
  const publicar = (await qa(p)).acciones.find((a) => a[0] === "publicarEnInstagram");
  assert.deepEqual(publicar[1].quitadas, ["luna.arcana.demo"]);
  assert.equal(publicar[1].texto, t1);
});
