/**
 * Administración › Instagram con el espejo a Facebook (OL-461, bitácora 493): los componentes de verdad (`ListaInstagram` con su
 * `HojaInstagram`) con eventos inventados y las acciones del servidor de prueba, que apuntan lo que reciben en `window.qa.acciones`.
 * La casilla «También en Facebook» (marcada, se recuerda en la sesión), un solo «Publicar» que manda a las dos redes, el resultado en dos
 * líneas, «Facebook: falta permiso» con «Reintentar en Facebook», y «Publicar en Facebook» desde «Ya en Instagram». Toques reales: el ratón en
 * coordenadas.
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

const acciones = `
  const apuntar = (nombre, args) => window.qa.acciones.push([nombre, ...args]);
  export async function prepararInstagram(id) {
    apuntar('prepararInstagram', [id]);
    return { ok: true, id, titulo: 'Feleal en el Museo', ahora: '2026-10-07T16:00:00Z', etiquetas: [], ubicacion: null, ciudad: { slug: 'san-luis-potosi', nombre: 'San Luis Potosí' },
      conCartel: true, recortar: false, sePuede: true, publicado: null,
      evento: { titulo: 'Feleal en el Museo', inicio: '2026-10-11T23:00:00Z', fin: '2026-10-12T01:00:00Z', zona: 'America/Mexico_City', clase: 'puntual', precio: null,
        lugar: { nombre: 'Museo Nacional de la Máscara', usuario: null }, ciudad: 'San Luis Potosí', artistas: [] } };
  }
  export async function publicarEnInstagram(p) {
    apuntar('publicarEnInstagram', [p]);
    const facebook = !p.facebook ? null : window.qa.fallaFacebook
      ? { ok: false, error: 'permiso', mensaje: 'Hay que volver a conectar la página de Facebook con el permiso para publicar. En Instagram sí quedó publicado.' }
      : { ok: true, permalink: 'https://www.facebook.com/1/posts/2' };
    return { ok: true, permalink: 'https://www.instagram.com/p/DEMO/', sinEtiquetas: false, facebook };
  }
  export async function publicarEnFacebook(...a) {
    apuntar('publicarEnFacebook', a);
    return window.qa.fallaFacebook ? { ok: false, error: 'permiso', mensaje: 'Hay que volver a conectar la página.' } : { ok: true, permalink: 'https://www.facebook.com/1/posts/3' };
  }
`;
const mocks = {
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link({prefetch,replace,scroll,...p}){return React.createElement('a',p)}",
  "next/image": "import React from 'react';export default function Image({quality,priority,fill,...p}){return React.createElement('img',p)}",
  "next/navigation": "export const useRouter=()=>({push(){},refresh(){window.qa.refrescos++},back(){},replace(){}});export const usePathname=()=>'/admin/instagram';export const useSearchParams=()=>new URLSearchParams();",
  "./acciones": acciones,
  "@/app/admin/instagram/acciones": acciones,
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "espejo-facebook-"));
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
      import plantilla from '../../../components/ui/Plantilla.module.css';
      import admin from '../admin.module.css';
      import '../../globals.css';
      window.qa = { acciones: [], refrescos: 0, fallaFacebook: new URLSearchParams(location.search).has('falla') };
      const s = (id, titulo, extra) => ({ id, href: '/eventos/' + id, titulo, foto: null, cuando: 'Sábado 10 de octubre · 6:00 pm', donde: 'Teatro de la Paz', linea: 'Destacado', publicado: false, facebook: null, ...extra });
      const para = [s('11111111-1111-4111-8111-111111111111', 'Feleal en el Museo')];
      const ya = [
        s('22222222-2222-4222-8222-222222222222', 'Susurros del agua', { linea: 'Historia · Ayer, 7:40 pm', publicado: true, facebook: { estado: 'nada' } }),
        s('33333333-3333-4333-8333-333333333333', 'Master Class de danzón', { linea: 'Publicación · Ayer, 6:00 pm', publicado: true, facebook: { estado: 'publicada' } }),
      ];
      createRoot(document.getElementById('root')).render(
        <main className={plantilla.paginaContenido + ' ' + admin.listado}><h1>Instagram</h1>
          <ListaInstagram ciudad={{ slug: 'san-luis-potosi', nombre: 'San Luis Potosí' }} ciudades={[]} para={para} ya={ya} abrir={null} conteo="3 eventos" vacio={null} /></main>,
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

async function abrir(t, consulta = "") {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
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
async function tocar(p, l) {
  await l.evaluate((e) => e.scrollIntoView({ block: "center" }));
  const b = await l.boundingBox();
  await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
}
const qa = (p) => p.evaluate(() => window.qa);
const texto = (l) => l.innerText().then((x) => x.replace(/\s+/g, " ").trim());
async function hojaDeFeleal(p) {
  await tocar(p, p.getByRole("link", { name: /Feleal en el Museo/ }));
  const hoja = p.getByRole("dialog", { name: "Publicar en Instagram" });
  await hoja.getByRole("button", { name: "Publicar", exact: true }).waitFor();
  return hoja;
}

test("la casilla «También en Facebook» viene marcada, se desmarca de un toque y la hoja la recuerda en la sesión", async (t) => {
  const p = await abrir(t);
  let hoja = await hojaDeFeleal(p);
  const casilla = () => hoja.getByRole("checkbox", { name: /También en Facebook/ });
  assert.equal(await casilla().getAttribute("aria-checked"), "true");
  assert.match(await texto(casilla()), /En la página Somos Nosotrxs, con el enlace a la ficha del evento/);
  assert.ok((await casilla().boundingBox()).height >= 44, "la casilla mide 44 o más");
  assert.equal(await hoja.getByRole("button", { name: /^Publicar/ }).count(), 1, "un solo botón");
  await tocar(p, casilla());
  assert.equal(await casilla().getAttribute("aria-checked"), "false");
  assert.match(await texto(hoja), /Se publica en @smsnstrsapp\./);
  await p.keyboard.press("Escape");
  await hoja.waitFor({ state: "detached" });
  hoja = await hojaDeFeleal(p);
  assert.equal(await casilla().getAttribute("aria-checked"), "false", "recordada en la sesión");
  await tocar(p, hoja.getByRole("button", { name: "Publicar", exact: true }));
  await hoja.getByRole("status").waitFor();
  const publicar = (await qa(p)).acciones.find((a) => a[0] === "publicarEnInstagram");
  assert.equal(publicar[1].facebook, false, "sin la casilla no se pide Facebook");
  assert.equal(await texto(hoja.getByRole("status")), "Instagram: publicado Ver");
});

test("publicar manda a las dos redes y el resultado sale en dos líneas, cada una con «Ver»", async (t) => {
  const p = await abrir(t);
  const hoja = await hojaDeFeleal(p);
  assert.match(await texto(hoja), /Se publica en @smsnstrsapp y en su página de Facebook\./);
  await tocar(p, hoja.getByRole("button", { name: "Publicar", exact: true }));
  const estado = hoja.getByRole("status");
  await estado.waitFor();
  const publicar = (await qa(p)).acciones.find((a) => a[0] === "publicarEnInstagram");
  assert.equal(publicar[1].facebook, true);
  assert.equal(publicar[1].eventoId, "11111111-1111-4111-8111-111111111111");
  assert.equal(await texto(estado), "Instagram: publicado Ver Facebook: publicado Ver");
  assert.equal(await hoja.getByRole("link", { name: "Ver en Instagram" }).getAttribute("href"), "https://www.instagram.com/p/DEMO/");
  assert.equal(await hoja.getByRole("link", { name: "Ver en Facebook" }).getAttribute("href"), "https://www.facebook.com/1/posts/2");
  assert.equal(await hoja.getByRole("button", { name: "Listo" }).count(), 1);
  assert.equal(await hoja.getByRole("checkbox").count(), 0, "publicado, ya no hay casilla");
});

test("si Facebook falla, Instagram queda publicado, la hoja dice el error llano y «Reintentar en Facebook» lo vuelve a intentar", async (t) => {
  const p = await abrir(t, "?falla");
  const hoja = await hojaDeFeleal(p);
  await tocar(p, hoja.getByRole("button", { name: "Publicar", exact: true }));
  const estado = hoja.getByRole("status");
  await estado.waitFor();
  assert.match(await texto(estado), /^Instagram: publicado Ver Facebook: falta permiso Hay que volver a conectar la página de Facebook.*En Instagram sí quedó publicado\.$/);
  const reintentar = hoja.getByRole("button", { name: "Reintentar en Facebook" });
  assert.equal(await reintentar.count(), 1);
  assert.equal(await hoja.getByRole("button", { name: "Listo" }).count(), 0);
  // Se reconecta la página y se reintenta: va el mismo texto de Instagram.
  await p.evaluate(() => (window.qa.fallaFacebook = false));
  await tocar(p, reintentar);
  await hoja.getByText("Facebook: publicado").waitFor();
  const r = (await qa(p)).acciones.find((a) => a[0] === "publicarEnFacebook");
  assert.equal(r[1], "11111111-1111-4111-8111-111111111111");
  assert.match(r[2], /^Feleal en el Museo\n.*somosnosotrxs\.org \(enlace en la bio\)/s, "el texto que llevó Instagram");
  assert.equal(await texto(estado), "Instagram: publicado Ver Facebook: publicado Ver");
  assert.equal(await hoja.getByRole("button", { name: "Listo" }).count(), 1);
});

test("«Ya en Instagram» dice cómo va en Facebook y lo que falta lleva «Publicar en Facebook», que publica y se va", async (t) => {
  const p = await abrir(t);
  const susurros = p.locator("main li", { hasText: "Susurros del agua" });
  const master = p.locator("main li", { hasText: "Master Class de danzón" });
  assert.match(await texto(susurros), /Historia · Ayer, 7:40 pm Facebook: sin publicar/);
  assert.match(await texto(master), /Facebook: publicado/);
  assert.equal(await master.getByRole("button").count(), 0, "lo que ya está en Facebook no lleva botón");
  assert.equal(await p.locator("main li", { hasText: "Feleal" }).getByRole("button").count(), 0, "lo que no está en Instagram tampoco");
  const boton = p.getByRole("button", { name: "Publicar en Facebook: Susurros del agua" });
  const caja = await boton.boundingBox();
  assert.ok(caja.width >= 44 && caja.height >= 44, `el botón mide ${caja.width}×${caja.height}`);
  await tocar(p, boton);
  await susurros.getByText("Facebook: publicado").waitFor();
  const q = await qa(p);
  assert.deepEqual(q.acciones.filter((a) => a[0] === "publicarEnFacebook"), [["publicarEnFacebook", "22222222-2222-4222-8222-222222222222"]]);
  assert.equal(q.refrescos, 1);
  assert.equal(await boton.count(), 0, "publicado, el botón se va");
  assert.equal(q.acciones.filter((a) => a[0] === "prepararInstagram").length, 0, "el botón no abre la hoja");
});

test("si falla desde la lista, el renglón lo dice y el botón se queda", async (t) => {
  const p = await abrir(t, "?falla");
  const susurros = p.locator("main li", { hasText: "Susurros del agua" });
  await tocar(p, p.getByRole("button", { name: "Publicar en Facebook: Susurros del agua" }));
  await susurros.getByText("Facebook: falta permiso").waitFor();
  assert.equal(await susurros.getByRole("button", { name: /Publicar en Facebook/ }).count(), 1);
});
