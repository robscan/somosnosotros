/**
 * OL-464 (bitácora 496): el carrusel en la hoja «Publicar en Instagram», con el festival del respaldo local con carteles
 * (`RESPALDO_CARRUSEL_IG=1` en `scripts/ops/auditoria-ui/respaldo-local/fixture.mjs`: el marco y sus once actos con cartel; la Fogata trae su
 * propia copia del de los Tambores, en otra dirección y con otros bytes). Las huellas de los carteles las calcula aquí `huellaDeCartel` (la del
 * servidor) sobre los carteles que dibuja `carteles-carrusel.mjs`, como haría `cargarParaHoja` al vuelo. Los componentes de verdad (`ListaInstagram` con su `HojaInstagram`) y las acciones del servidor de prueba,
 * que arman lo que prepararía `prepararInstagram` (`armarCarrusel` con las filas del respaldo). Toques reales: el ratón en coordenadas.
 * PLAYWRIGHT_MODULE=/ruta/playwright-core/index.mjs CHROME_EXECUTABLE=/ruta/chrome node --test este-archivo
 */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../../", import.meta.url));
let dir, server, browser, origin, huellas;

process.env.RESPALDO_CARRUSEL_IG = "1";
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
      ciudad: { slug: 'san-luis-potosi', nombre: 'San Luis Potosí' }, conCartel: true, recortar: false, sePuede: true, publicado: null, evento,
      carrusel: window.qa.unaSola ? [] : window.qa.carrusel };
  }
  export async function publicarEnInstagram(p) {
    apuntar('publicarEnInstagram', [p]);
    const n = p.imagenes?.length ?? 1;
    return { ok: true, permalink: 'https://www.instagram.com/p/DEMO/', sinEtiquetas: false, imagenes: n, facebook: p.facebook ? { ok: true, permalink: 'https://www.facebook.com/1/posts/2' } : null };
  }
  export async function publicarEnFacebook(...a) { apuntar('publicarEnFacebook', a); return { ok: true, permalink: null }; }
`;
const mocks = {
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link({prefetch,replace,scroll,...p}){return React.createElement('a',p)}",
  "next/image": "import React from 'react';export default function Image({quality,priority,fill,...p}){return React.createElement('img',p)}",
  "next/navigation": "export const useRouter=()=>({push(){},refresh(){window.qa.refrescos++},back(){},replace(){}});export const usePathname=()=>'/admin/instagram';export const useSearchParams=()=>new URLSearchParams();",
  "./acciones": acciones,
  "@/app/admin/instagram/acciones": acciones,
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "hoja-carrusel-"));
  // Los carteles del respaldo y su huella con el código del servidor (sharp de verdad; `server-only` no aplica fuera de Next).
  const { dibujarCartelesCarrusel } = await import(pathToFileURL(join(root, "scripts/ops/auditoria-ui/respaldo-local/carteles-carrusel.mjs")).href);
  const carteles = join(dir, "carteles");
  await mkdir(carteles);
  await dibujarCartelesCarrusel(carteles);
  await build({
    absWorkingDir: root,
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: join(dir, "huella.mjs"),
    entryPoints: [join(root, "src/lib/carteles/huellaServidor.ts")],
    plugins: [
      {
        name: "servidor",
        setup(b) {
          // `server-only` no hace nada fuera de Next; sharp, el del proyecto.
          b.onResolve({ filter: /^server-only$/ }, () => ({ path: "server-only", namespace: "vacio" }));
          b.onLoad({ filter: /.*/, namespace: "vacio" }, () => ({ contents: "" }));
          b.onResolve({ filter: /^sharp$/ }, () => ({ path: pathToFileURL(join(root, "node_modules/sharp/dist/index.mjs")).href, external: true }));
        },
      },
    ],
  });
  const { huellaDeCartel } = await import(pathToFileURL(join(dir, "huella.mjs")).href);
  huellas = {};
  for (const e of [marco, ...actos]) {
    const nombre = e.imagen?.match(/demo-carrusel\/([a-z0-9-]+\.jpg)$/)?.[1];
    if (nombre) huellas[e.id] = await huellaDeCartel(await readFile(join(carteles, nombre)));
  }
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
      import { armarCarrusel } from '../../../lib/instagram/carrusel';
      import plantilla from '../../../components/ui/Plantilla.module.css';
      import admin from '../admin.module.css';
      import '../../globals.css';
      const f = ${JSON.stringify(filas)};
      const huellas = ${JSON.stringify(huellas)};
      const artista = (id) => { const a = f.artistas.find((x) => x.id === id); return { id: a.id, nombre: a.nombre, usuario: usuarioDeInstagram(a.redes), disciplina: a.disciplina }; };
      const de = (eventoId) => f.ligados.filter((x) => x.evento_id === eventoId).sort((a, b) => a.orden - b.orden).map((x) => artista(x.artista_id));
      const festival = {
        titulo: f.marco.titulo, inicio: f.marco.inicio, fin: f.marco.fin, zona: f.marco.zona, clase: 'festival', precio: f.marco.precio, opcional: true,
        lugar: { nombre: f.lugar.nombre, usuario: usuarioDeInstagram(f.lugar.redes) }, ciudad: f.marco.ciudad, artistas: de(f.marco.id),
        actos: f.actos.map((a) => ({ titulo: a.titulo, inicio: a.inicio, fin: a.fin, precio: a.precio, artistas: de(a.id) })),
      };
      // Lo que arma cargarParaHoja (y prepararInstagram manda al teléfono): las claves y los títulos del carrusel.
      const usuarios = (xs) => xs.map((a) => a.usuario).filter(Boolean);
      const todas = armarCarrusel({ portada: { titulo: f.marco.titulo, imagen: f.marco.imagen, usuarios: usuarios(de(f.marco.id)), huella: huellas[f.marco.id] },
        eventos: f.actos.map((a) => ({ id: a.id, titulo: a.titulo, imagen: a.imagen, inicio: a.inicio, fin: a.fin, usuarios: usuarios(de(a.id)), huella: huellas[a.id] })),
        ahora: new Date(), zona: f.marco.zona });
      window.qa = { acciones: [], refrescos: 0, festival, etiquetas: etiquetasDeLaFoto(festival), carrusel: todas.map((i) => ({ clave: i.clave, titulo: i.titulo })),
        unaSola: location.search.includes('una') };
      const para = [{ id: f.marco.id, href: '/eventos/' + f.marco.slug, titulo: f.marco.titulo, foto: null, cuando: 'Del 9 al 11 de oct · ' + f.actos.length + ' actos', donde: f.lugar.nombre, linea: '0 van · 0 les interesa', publicado: false, facebook: null }];
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
  // Las imágenes de la hoja (vista previa y miniaturas): un JPEG cualquiera; lo que importa es qué dirección pide cada una.
  const gris = '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="300"><rect width="240" height="300" fill="#b9b4a8"/></svg>';
  const assets = new Map([
    ["/", ["text/html", '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--fuente-bricolage:Arial}</style><div id="root"></div><script src="/app.js"></script>']],
    ["/app.js", ["text/javascript", await readFile(join(dir, "app.js"))]],
    ["/app.css", ["text/css", await readFile(join(dir, "app.css"))]],
  ]);
  server = createServer((req, res) => {
    const ruta = req.url.split("?")[0];
    if (ruta.startsWith("/api/instagram/")) {
      res.writeHead(200, { "Content-Type": "image/svg+xml" });
      return res.end(gris);
    }
    const a = assets.get(ruta);
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

async function abrir(t, { ancho = 390, una = false } = {}) {
  const context = await browser.newContext({ viewport: { width: ancho, height: 844 }, reducedMotion: "reduce" });
  t.after(() => context.close());
  const p = await context.newPage();
  p.setDefaultTimeout(5000);
  const errores = [];
  p.on("pageerror", (e) => errores.push(e.message));
  t.after(() => assert.deepEqual(errores, []));
  await p.goto(origin + (una ? "/?una" : "/"));
  await p.getByRole("heading", { name: "Instagram", exact: true }).waitFor();
  return p;
}
async function tocar(p, l) {
  await l.evaluate((e) => e.scrollIntoView({ block: "center", inline: "center" }));
  const b = await l.boundingBox();
  // El toque llega a ese botón y no a algo encima (un velo invisible se comería el toque).
  const arriba = await p.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest("button,a")?.getAttribute("aria-label") ?? document.elementFromPoint(x, y)?.closest("button,a")?.textContent, [b.x + b.width / 2, b.y + b.height / 2]);
  assert.ok(arriba, "hay un control bajo el dedo");
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
const tira = (hoja) => hoja.getByRole("list", { name: "Imágenes del carrusel" });
/** El orden de la tira, por las claves de sus miniaturas («portada» o el id del acto). */
const ordenDe = (hoja) => tira(hoja).locator("img").evaluateAll((xs) => xs.map((i) => new URL(i.src).searchParams.get("imagen") ?? "portada"));
const grande = (hoja) => hoja.locator("img").first().evaluate((i) => new URL(i.src).searchParams.get("imagen") ?? "portada");
const acto = (titulo) => filas.actos.find((a) => a.titulo.startsWith(titulo)).id;

test("la tira: la portada y diez carteles distintos en orden de fecha; el último queda fuera y la hoja lo dice", async (t) => {
  const p = await abrir(t);
  const hoja = await hojaDelFestival(p);
  assert.match(await texto(hoja), /Carrusel de 10 imágenes, en este orden:/);
  assert.match(await texto(hoja), /Instagram deja 10: queda fuera «Concierto de cuencos»\./);
  const orden = await ordenDe(hoja);
  // Sin repetir (founder: «Este festival tiene más eventos que carteles. Asegúrate de que no se repitan las imágenes»): la Fogata trae su propia
  // copia del cartel de los Tambores, en otra dirección y con otros bytes, y la tira lleva una sola; el Concierto de cuencos es el undécimo y queda
  // fuera.
  const tambores = filas.actos.find((a) => a.titulo.startsWith("Tambores"));
  const fogata = filas.actos.find((a) => a.titulo.startsWith("Fogata"));
  assert.notEqual(tambores.imagen, fogata.imagen);
  assert.notEqual(huellas[tambores.id].split(".")[2], huellas[fogata.id].split(".")[2], "otros bytes");
  assert.ok(!orden.includes(fogata.id));
  assert.deepEqual(orden, ["portada", ...["Meditación", "Taller de escritura", "Charla de tarot", "Yoga", "Mercadito", "Ceremonia", "Lectura", "Tambores", "Astrología"].map(acto)]);
  assert.equal(await grande(hoja), "portada", "la imagen grande es la primera del carrusel");
  // Cada miniatura con tres botones de 44 × 44 (antes, quitar, después); la primera no va antes y la última no va después.
  const botones = await tira(hoja).getByRole("button").evaluateAll((bs) => bs.map((b) => ({ n: b.getAttribute("aria-label"), w: b.getBoundingClientRect().width, h: b.getBoundingClientRect().height, d: b.disabled })));
  assert.equal(botones.length, 30);
  assert.ok(botones.every((b) => b.w >= 44 && b.h >= 44), JSON.stringify(botones.find((b) => b.w < 44 || b.h < 44)));
  assert.equal(botones[0].n, "Mover antes: la portada (Cultura Mística (demo))");
  assert.ok(botones[0].d && !botones[1].d && !botones[2].d && botones[29].d);
  // La tira se desliza dentro de la hoja; la página no se desplaza a lo ancho.
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
});

test("quitar una con su ✕ deja entrar a la que quedaba fuera; «Volver a poner» lo deshace", async (t) => {
  const p = await abrir(t);
  const hoja = await hojaDelFestival(p);
  await tocar(p, hoja.getByRole("button", { name: "Quitar del carrusel: Taller de escritura" }));
  const orden = await ordenDe(hoja);
  assert.equal(orden.length, 10);
  assert.ok(!orden.includes(acto("Taller de escritura")));
  assert.equal(orden.at(-1), acto("Concierto"));
  assert.doesNotMatch(await texto(hoja), /queda fuera/);
  await tocar(p, hoja.getByRole("button", { name: "Volver a poner" }));
  assert.equal((await ordenDe(hoja))[2], acto("Taller de escritura"));
  assert.match(await texto(hoja), /queda fuera «Concierto de cuencos»/);
});

test("las flechas cambian el orden; la imagen grande es la nueva primera; publicar manda las claves en ese orden", async (t) => {
  const p = await abrir(t);
  const hoja = await hojaDelFestival(p);
  await tocar(p, hoja.getByRole("button", { name: "Mover después: la portada (Cultura Mística (demo))" }));
  let orden = await ordenDe(hoja);
  assert.deepEqual(orden.slice(0, 2), [acto("Meditación"), "portada"]);
  assert.equal(await grande(hoja), acto("Meditación"));
  assert.match(await texto(hoja), /Va completo, con margen de su color\./);
  await tocar(p, hoja.getByRole("button", { name: "Mover antes: Charla de tarot" }));
  orden = await ordenDe(hoja);
  assert.deepEqual(orden.slice(0, 4), [acto("Meditación"), "portada", acto("Charla de tarot"), acto("Taller de escritura")]);
  await tocar(p, hoja.getByRole("button", { name: "Quitar del carrusel: Astrología básica" }));
  orden = await ordenDe(hoja);
  await tocar(p, hoja.getByRole("button", { name: "Publicar", exact: true }));
  await hoja.getByRole("status").waitFor();
  const publicar = (await qa(p)).acciones.find((a) => a[0] === "publicarEnInstagram");
  assert.deepEqual(publicar[1].imagenes, orden);
  assert.equal(publicar[1].formato, "4x5");
  assert.equal(await texto(hoja.getByRole("status")), "Instagram: carrusel publicado, 10 imágenes Ver Facebook: publicado, 10 fotos Ver");
});

test("la historia lleva solo la portada (sin tira) y una sola imagen deja la hoja como siempre", async (t) => {
  const p = await abrir(t);
  const hoja = await hojaDelFestival(p);
  await tocar(p, hoja.getByRole("button", { name: "Historia 9:16" }));
  assert.equal(await tira(hoja).count(), 0);
  assert.match(await texto(hoja), /Las historias no llevan texto y duran 24 horas\. Lleva solo la portada\./);
  await tocar(p, hoja.getByRole("button", { name: "Publicar", exact: true }));
  await hoja.getByRole("status").waitFor();
  const publicar = (await qa(p)).acciones.find((a) => a[0] === "publicarEnInstagram");
  assert.equal(publicar[1].imagenes, undefined);

  const q = await abrir(t, { una: true });
  const sola = await hojaDelFestival(q);
  assert.equal(await tira(sola).count(), 0);
  assert.doesNotMatch(await texto(sola), /Carrusel/);
});

test("a 320 de ancho: la tira cabe en la hoja y se desliza; nada se corta ni desplaza la página", async (t) => {
  const p = await abrir(t, { ancho: 320 });
  const hoja = await hojaDelFestival(p);
  const caja = await tira(hoja).evaluate((e) => ({ ancho: e.clientWidth, todo: e.scrollWidth, izq: e.getBoundingClientRect().left, der: e.getBoundingClientRect().right }));
  assert.ok(caja.todo > caja.ancho, "la tira se desliza");
  assert.ok(caja.izq >= 0 && caja.der <= 320, JSON.stringify(caja));
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  const cortados = await hoja.evaluate((h) => [...h.querySelectorAll("p, span, button")].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent.trim().slice(0, 40)));
  assert.deepEqual(cortados, []);
  // La última miniatura se alcanza deslizando y su botón se toca.
  await tocar(p, hoja.getByRole("button", { name: "Quitar del carrusel: Astrología básica" }));
  assert.ok(!(await ordenDe(hoja)).includes(acto("Astrología")));
});
