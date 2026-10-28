/**
 * Administración › Instagram con el espejo a Facebook (OL-461, bitácora 493) y la publicación en segundo plano (OL-465, bitácora 497): los
 * componentes de verdad (`ListaInstagram` con su `HojaInstagram`) con eventos inventados, las acciones del servidor de prueba (una API falsa con su
 * cola en `window.qa.cola`) y un latido simulado (`window.qa.latido()`: el trabajador publica lo que está en la cola). La lista se vuelve a pedir
 * con `router.refresh()` como en la app (el doble vuelve a armar sus renglones con lo que diga la cola). Toques reales: el ratón en coordenadas.
 *   · la casilla «También en Facebook» (marcada, se recuerda en la sesión);
 *   · «Publicar» → la hoja se cierra → el renglón dice «Publicando…» → latido → «Ya en Instagram» con «Facebook: publicado»;
 *   · la hoja abierta mientras va dice cómo va y lo pregunta cada 20 s (reloj de Playwright) hasta «publicado» con sus «Ver»;
 *   · sin duplicados: «Ya se publicó hace 3 min» / «Se está publicando» piden confirmar; Facebook desde la lista, igual;
 *   · Facebook que falla después de Instagram: «Facebook: falta permiso» con «Reintentar en Facebook», que va a la cola;
 *   · lo que no se pudo publicar lo dicen el renglón y la hoja.
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

const FELEAL = "11111111-1111-4111-8111-111111111111";
const SUSURROS = "22222222-2222-4222-8222-222222222222";
const MASTER = "33333333-3333-4333-8333-333333333333";

const acciones = `
  const apuntar = (nombre, args) => window.qa.acciones.push([nombre, ...args]);
  const comoEstado = (t) => t && { id: t.id, red: t.red, formato: t.formato, estado: t.estado, conFacebook: t.red === 'instagram' && !!t.pedido.facebook, resultado: t.resultado, error: t.error };
  const ultimo = (id) => [...window.qa.cola].reverse().find((t) => t.evento === id) ?? null;
  // Como redes_reciente: en camino, o publicado hace poco (lo que diga qa.recientes).
  const reciente = (id, red, formato) => {
    const q = window.qa;
    if (q.cola.some((t) => t.evento === id && t.formato === formato && (t.estado === 'en_cola' || t.estado === 'publicando') && (t.red === red || (red === 'facebook' && t.pedido.facebook)))) return { estado: 'publicando' };
    return q.recientes[red + ':' + id + ':' + formato] ?? null;
  };
  export async function prepararInstagram(id) {
    apuntar('prepararInstagram', [id]);
    return { ok: true, id, titulo: 'Feleal en el Museo', ahora: '2026-10-07T16:00:00Z', etiquetas: [], ubicacion: null, ciudad: { slug: 'san-luis-potosi', nombre: 'San Luis Potosí' },
      conCartel: true, recortar: false, sePuede: true, publicado: null, carrusel: [],
      trabajo: comoEstado(ultimo(id)), reciente: { '4x5': reciente(id, 'instagram', '4x5'), '9x16': reciente(id, 'instagram', '9x16') },
      evento: { titulo: 'Feleal en el Museo', inicio: '2026-10-11T23:00:00Z', fin: '2026-10-12T01:00:00Z', zona: 'America/Mexico_City', clase: 'puntual', precio: null,
        lugar: { nombre: 'Museo Nacional de la Máscara', usuario: null }, ciudad: 'San Luis Potosí', artistas: [] } };
  }
  export async function estadoTrabajo(id) {
    apuntar('estadoTrabajo', [id]);
    return comoEstado(window.qa.cola.find((t) => t.id === id));
  }
  const encolar = (evento, red, formato, pedido) => {
    const t = { id: 't' + (window.qa.cola.length + 1), evento, red, formato, pedido, estado: 'en_cola', resultado: null, error: null };
    window.qa.cola.push(t);
    return { ok: true, id: t.id };
  };
  export async function publicarEnInstagram(p) {
    apuntar('publicarEnInstagram', [p]);
    const r = reciente(p.eventoId, 'instagram', p.formato);
    if (r && !p.repetir) return { ok: false, duplicado: r };
    return encolar(p.eventoId, 'instagram', p.formato, { facebook: !!p.facebook, texto: p.texto });
  }
  export async function publicarEnFacebook(...a) {
    apuntar('publicarEnFacebook', a);
    const [id, texto, repetir] = a;
    const r = reciente(id, 'facebook', '4x5');
    if (r && !repetir) return { ok: false, duplicado: r };
    return encolar(id, 'facebook', '4x5', { texto });
  }
`;
const mocks = {
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link({prefetch,replace,scroll,...p}){return React.createElement('a',p)}",
  "next/image": "import React from 'react';export default function Image({quality,priority,fill,...p}){return React.createElement('img',p)}",
  "next/navigation": "export const useRouter=()=>({push(){},refresh(){window.qa.refrescos++;window.qa.alRefrescar?.()},back(){},replace(){}});export const usePathname=()=>'/admin/instagram';export const useSearchParams=()=>new URLSearchParams();",
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
      import { trabajosPorEvento } from './colaPorEvento';
      import { enCamino, lineaDeTrabajo } from '../../../lib/redes/reglas';
      import plantilla from '../../../components/ui/Plantilla.module.css';
      import admin from '../admin.module.css';
      import '../../globals.css';
      const consulta = new URLSearchParams(location.search);
      window.qa = { acciones: [], refrescos: 0, cola: [], recientes: {}, fallaFacebook: consulta.has('falla'), fallaInstagram: null,
        ig: { '${SUSURROS}': 'Historia · Ayer, 7:40 pm', '${MASTER}': 'Publicación · Ayer, 6:00 pm' }, fb: { '${MASTER}': 'publicada' } };
      if (consulta.has('fb-reciente')) window.qa.recientes['facebook:${SUSURROS}:4x5'] = { estado: 'publicado', minutos: 2 };
      // El latido simulado: el trabajador publica todo lo que está en la cola (o falla como diga qa).
      window.qa.latido = () => {
        const q = window.qa;
        for (const t of q.cola.filter((x) => x.estado === 'en_cola')) {
          if (q.fallaInstagram && t.red === 'instagram') {
            Object.assign(t, { estado: 'fallido', error: q.fallaInstagram, resultado: { mensaje: 'Instagram no aceptó la imagen. Prueba con «Historia 9:16» o vuelve a intentar en un momento.' } });
            continue;
          }
          const fb = q.fallaFacebook ? { ok: false, error: 'permiso', mensaje: 'Hay que volver a conectar la página de Facebook con el permiso para publicar. En Instagram sí quedó publicado.' } : { ok: true, permalink: 'https://www.facebook.com/1/posts/2' };
          if (t.red === 'instagram') {
            q.ig[t.evento] = (t.formato === '9x16' ? 'Historia' : 'Publicación') + ' · Hoy, 10:00 am';
            q.recientes['instagram:' + t.evento + ':' + t.formato] = { estado: 'publicado', minutos: 3 };
            Object.assign(t, { estado: 'publicado', resultado: { instagram: { permalink: 'https://www.instagram.com/p/DEMO/', imagenes: 1, sinEtiquetas: false, formato: t.formato }, facebook: t.pedido.facebook ? fb : null } });
            if (t.pedido.facebook) q.fb[t.evento] = fb.ok ? 'publicada' : 'error';
          } else {
            q.fb[t.evento] = fb.ok ? 'publicada' : 'error';
            Object.assign(t, { estado: fb.ok ? 'publicado' : 'fallido', error: fb.ok ? null : fb.error, resultado: { facebook: fb } });
          }
        }
      };
      // Los renglones como los arma el servidor (\`cargarSugerencias\`), con lo que diga la cola.
      const filas = () => {
        const q = window.qa;
        const cola = trabajosPorEvento([...q.cola].reverse().map((t) => ({ ...t, evento_id: t.evento })));
        const s = (id, titulo) => {
          const t = cola.instagram.get(id);
          const publicado = !!q.ig[id];
          const linea = (t && (enCamino(t) || (t.estado === 'fallido' && !publicado)) ? lineaDeTrabajo(t) : null) ?? (publicado ? q.ig[id] : 'Destacado');
          const facebook = !publicado ? null : cola.facebook.has(id) ? { estado: 'publicando' } : q.fb[id] === 'publicada' ? { estado: 'publicada' } : q.fb[id] === 'error' ? { estado: 'error', error: 'permiso' } : { estado: 'nada' };
          return { id, href: '/eventos/' + id, titulo, foto: null, cuando: 'Sábado 10 de octubre · 6:00 pm', donde: 'Teatro de la Paz', linea, publicado, facebook, publicando: enCamino(t) || (publicado && cola.facebook.has(id)) };
        };
        const todas = [s('${FELEAL}', 'Feleal en el Museo'), s('${SUSURROS}', 'Susurros del agua'), s('${MASTER}', 'Master Class de danzón')];
        return { para: todas.filter((x) => !x.publicado), ya: todas.filter((x) => x.publicado) };
      };
      function App() {
        const [, setVuelta] = React.useState(0);
        window.qa.alRefrescar = () => setVuelta((n) => n + 1);
        const { para, ya } = filas();
        return <main className={plantilla.paginaContenido + ' ' + admin.listado}><h1>Instagram</h1>
          <ListaInstagram ciudad={{ slug: 'san-luis-potosi', nombre: 'San Luis Potosí' }} ciudades={[]} para={para} ya={ya} abrir={null} conteo="3 eventos" vacio={null} /></main>;
      }
      createRoot(document.getElementById('root')).render(<App />);
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

async function abrir(t, consulta = "", { reloj = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  t.after(() => context.close());
  if (reloj) await context.clock.install({ time: new Date("2026-10-07T16:00:00Z") });
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
const renglon = (p, titulo) => p.locator("main li", { hasText: titulo });
async function hojaDe(p, titulo = "Feleal en el Museo") {
  await tocar(p, p.getByRole("link", { name: new RegExp(titulo) }));
  const hoja = p.getByRole("dialog", { name: "Publicar en Instagram" });
  await hoja.getByRole("button", { name: /^(Publicar|Se está|Ya se publicó)/ }).waitFor();
  return hoja;
}
/** Al volver a la app (la pestaña se ve otra vez), la lista y la hoja vuelven a preguntar. */
const volverALaApp = (p) => p.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
const latido = (p) => p.evaluate(() => window.qa.latido());

test("la casilla «También en Facebook» viene marcada, se desmarca de un toque y la hoja la recuerda en la sesión", async (t) => {
  const p = await abrir(t);
  let hoja = await hojaDe(p);
  const casilla = () => hoja.getByRole("checkbox", { name: /También en Facebook/ });
  assert.equal(await casilla().getAttribute("aria-checked"), "true");
  assert.match(await texto(casilla()), /En la página Somos Nosotrxs, con el enlace a la ficha del evento/);
  assert.ok((await casilla().boundingBox()).height >= 44, "la casilla mide 44 o más");
  assert.equal(await hoja.getByRole("button", { name: /^Publicar/ }).count(), 1, "un solo botón");
  await tocar(p, casilla());
  assert.equal(await casilla().getAttribute("aria-checked"), "false");
  assert.match(await texto(hoja), /Se publica en @smsnstrsapp\. Te avisamos en el teléfono cuando termine\./);
  await p.keyboard.press("Escape");
  await hoja.waitFor({ state: "detached" });
  hoja = await hojaDe(p);
  assert.equal(await casilla().getAttribute("aria-checked"), "false", "recordada en la sesión");
  await tocar(p, hoja.getByRole("button", { name: "Publicar", exact: true }));
  await hoja.waitFor({ state: "detached" });
  const publicar = (await qa(p)).acciones.find((a) => a[0] === "publicarEnInstagram");
  assert.equal(publicar[1].facebook, false, "sin la casilla no se pide Facebook");
});

test("OL-465: «Publicar» guarda el trabajo y la hoja se cierra; el renglón dice «Publicando…»; tras el latido, «Ya en Instagram» con «Facebook: publicado»", async (t) => {
  const p = await abrir(t);
  const hoja = await hojaDe(p);
  assert.match(await texto(hoja), /Se publica en @smsnstrsapp y en su página de Facebook\. Te avisamos en el teléfono cuando termine\./);
  await tocar(p, hoja.getByRole("button", { name: "Publicar", exact: true }));
  await hoja.waitFor({ state: "detached" });
  let q = await qa(p);
  const publicar = q.acciones.find((a) => a[0] === "publicarEnInstagram");
  assert.equal(publicar[1].facebook, true);
  assert.equal(publicar[1].eventoId, FELEAL);
  assert.equal(publicar[1].repetir, false);
  assert.deepEqual(q.cola.map((x) => [x.evento, x.red, x.estado]), [[FELEAL, "instagram", "en_cola"]]);
  assert.equal(q.refrescos, 1, "la lista se vuelve a pedir");
  const feleal = renglon(p, "Feleal en el Museo");
  assert.match(await texto(feleal), /Publicando…/);
  assert.match(await texto(p.locator("main")), /Para publicar/);
  // El trabajador publica (latido) y la lista se entera al volver a la app.
  await latido(p);
  await volverALaApp(p);
  await feleal.getByText("Facebook: publicado").waitFor();
  assert.match(await texto(feleal), /Publicación · Hoy, 10:00 am Facebook: publicado/);
  assert.doesNotMatch(await texto(feleal), /Publicando…/);
  // La hoja, otra vez: lo que pasó con sus «Ver»; el botón dice que ya se publicó y pide confirmar antes de repetir.
  const otra = await hojaDe(p);
  assert.equal(await texto(otra.getByRole("status").first()), "Instagram: publicado Ver Facebook: publicado Ver");
  assert.equal(await otra.getByRole("link", { name: "Ver en Instagram" }).getAttribute("href"), "https://www.instagram.com/p/DEMO/");
  assert.equal(await otra.getByRole("link", { name: "Ver en Facebook" }).getAttribute("href"), "https://www.facebook.com/1/posts/2");
  const boton = otra.getByRole("button", { name: "Ya se publicó hace 3 min" });
  await tocar(p, boton);
  await otra.getByText("Este evento se publicó hace 3 min. ¿Publicarlo otra vez?").waitFor();
  q = await qa(p);
  assert.equal(q.acciones.filter((a) => a[0] === "publicarEnInstagram").length, 1, "el primer toque solo pregunta");
  const si = otra.getByRole("button", { name: "Sí, publicar otra vez" });
  const caja = await si.boundingBox();
  assert.ok(caja.height >= 44, `el botón mide ${caja.height}`);
  await tocar(p, si);
  await otra.waitFor({ state: "detached" });
  q = await qa(p);
  const repetido = q.acciones.filter((a) => a[0] === "publicarEnInstagram")[1];
  assert.equal(repetido[1].repetir, true);
  assert.equal(q.cola.length, 2);
});

test("OL-465: «Mejor no» deshace la pregunta; un segundo toque mientras se publica también pregunta («Se está publicando»)", async (t) => {
  const p = await abrir(t);
  let hoja = await hojaDe(p);
  await tocar(p, hoja.getByRole("button", { name: "Publicar", exact: true }));
  await hoja.waitFor({ state: "detached" });
  hoja = await hojaDe(p);
  // Mientras va: cómo va, y el botón lo dice.
  assert.equal(await texto(hoja.getByRole("status").first()), "Instagram: publicando… Facebook: después de Instagram Te avisamos en el teléfono cuando termine. Puedes cerrar la hoja o salir de la app.");
  await tocar(p, hoja.getByRole("button", { name: "Se está publicando" }));
  await hoja.getByText("Este evento ya se está publicando. ¿Publicarlo otra vez?").waitFor();
  await tocar(p, hoja.getByRole("button", { name: "Mejor no" }));
  await hoja.getByRole("button", { name: "Se está publicando" }).waitFor();
  assert.equal((await qa(p)).cola.length, 1, "no se guardó otro");
});

test("OL-465: con la hoja abierta mientras se publica, se pregunta cada 20 s y llega «publicado» con sus «Ver»", async (t) => {
  const p = await abrir(t, "", { reloj: true });
  let hoja = await hojaDe(p);
  await tocar(p, hoja.getByRole("button", { name: "Publicar", exact: true }));
  await hoja.waitFor({ state: "detached" });
  hoja = await hojaDe(p);
  await hoja.getByText("Instagram: publicando…").waitFor();
  await latido(p);
  await p.clock.runFor(19_000);
  assert.equal((await qa(p)).acciones.filter((a) => a[0] === "estadoTrabajo").length, 0, "antes de 20 s no pregunta");
  await p.clock.runFor(1_500);
  await hoja.getByText("Instagram: publicado").waitFor();
  assert.equal(await texto(hoja.getByRole("status").first()), "Instagram: publicado Ver Facebook: publicado Ver");
  assert.ok((await qa(p)).refrescos >= 2, "al terminar, la lista se refresca");
  // La lista también se refresca sola cada 20 s mientras algo va en camino.
  await p.keyboard.press("Escape");
  await hoja.waitFor({ state: "detached" });
  assert.match(await texto(renglon(p, "Feleal en el Museo")), /Facebook: publicado/);
});

test("OL-465: la lista se refresca sola cada 20 s mientras haya algo «Publicando…»", async (t) => {
  const p = await abrir(t, "", { reloj: true });
  const hoja = await hojaDe(p);
  await tocar(p, hoja.getByRole("button", { name: "Publicar", exact: true }));
  await hoja.waitFor({ state: "detached" });
  const antes = (await qa(p)).refrescos;
  await latido(p);
  await p.clock.runFor(20_500);
  await renglon(p, "Feleal en el Museo").getByText("Facebook: publicado").waitFor();
  assert.equal((await qa(p)).refrescos, antes + 1);
  // Ya sin nada en camino, no se refresca más.
  await p.clock.runFor(60_000);
  assert.equal((await qa(p)).refrescos, antes + 1);
});

test("si Facebook falla después de Instagram, la hoja lo dice en llano y «Reintentar en Facebook» va a la cola con el mismo texto", async (t) => {
  const p = await abrir(t, "?falla");
  let hoja = await hojaDe(p);
  await tocar(p, hoja.getByRole("button", { name: "Publicar", exact: true }));
  await hoja.waitFor({ state: "detached" });
  await latido(p);
  await volverALaApp(p);
  const feleal = renglon(p, "Feleal en el Museo");
  await feleal.getByText("Facebook: falta permiso").waitFor();
  hoja = await hojaDe(p);
  const estado = hoja.getByRole("status").first();
  assert.match(await texto(estado), /^Instagram: publicado Ver Facebook: falta permiso Hay que volver a conectar la página de Facebook.*En Instagram sí quedó publicado\. Reintentar en Facebook$/);
  await p.evaluate(() => (window.qa.fallaFacebook = false));
  await tocar(p, hoja.getByRole("button", { name: "Reintentar en Facebook" }));
  await hoja.waitFor({ state: "detached" });
  const q = await qa(p);
  const r = q.acciones.find((a) => a[0] === "publicarEnFacebook");
  assert.equal(r[1], FELEAL);
  assert.match(r[2], /^Feleal en el Museo\n.*somosnosotrxs\.org \(enlace en la bio\)/s, "el texto que llevó Instagram");
  assert.equal(r[3], false);
  assert.match(await texto(feleal), /Facebook: publicando…/);
  await latido(p);
  await volverALaApp(p);
  await feleal.getByText("Facebook: publicado").waitFor();
});

test("lo que no se pudo publicar lo dicen el renglón y la hoja; publicar otra vez no pide confirmar", async (t) => {
  const p = await abrir(t);
  await p.evaluate(() => (window.qa.fallaInstagram = "imagen"));
  let hoja = await hojaDe(p);
  await tocar(p, hoja.getByRole("button", { name: "Publicar", exact: true }));
  await hoja.waitFor({ state: "detached" });
  await latido(p);
  await volverALaApp(p);
  const feleal = renglon(p, "Feleal en el Museo");
  await feleal.getByText("No se publicó: Instagram no aceptó la imagen").waitFor();
  hoja = await hojaDe(p);
  assert.match(await texto(hoja.getByRole("alert")), /Instagram no aceptó la imagen\./);
  await tocar(p, hoja.getByRole("button", { name: "Publicar", exact: true }));
  await hoja.waitFor({ state: "detached" });
  assert.equal((await qa(p)).cola.length, 2);
});

test("«Ya en Instagram» dice cómo va en Facebook y lo que falta lleva «Publicar en Facebook»: va a la cola y el renglón dice «Facebook: publicando…»", async (t) => {
  const p = await abrir(t);
  const susurros = renglon(p, "Susurros del agua");
  const master = renglon(p, "Master Class de danzón");
  assert.match(await texto(susurros), /Historia · Ayer, 7:40 pm Facebook: sin publicar/);
  assert.match(await texto(master), /Facebook: publicado/);
  assert.equal(await master.getByRole("button").count(), 0, "lo que ya está en Facebook no lleva botón");
  assert.equal(await renglon(p, "Feleal").getByRole("button").count(), 0, "lo que no está en Instagram tampoco");
  const boton = p.getByRole("button", { name: "Publicar en Facebook: Susurros del agua" });
  const caja = await boton.boundingBox();
  assert.ok(caja.width >= 44 && caja.height >= 44, `el botón mide ${caja.width}×${caja.height}`);
  await tocar(p, boton);
  await susurros.getByText("Facebook: publicando…").waitFor();
  let q = await qa(p);
  assert.deepEqual(q.acciones.filter((a) => a[0] === "publicarEnFacebook"), [["publicarEnFacebook", SUSURROS, null, false]]);
  assert.equal(q.refrescos, 1);
  assert.equal(await boton.count(), 0, "en la cola, el botón se va");
  assert.equal(q.acciones.filter((a) => a[0] === "prepararInstagram").length, 0, "el botón no abre la hoja");
  await latido(p);
  await volverALaApp(p);
  await susurros.getByText("Facebook: publicado").waitFor();
  q = await qa(p);
  assert.equal(q.cola[0].estado, "publicado");
});

test("OL-465: si se publicó en Facebook hace poco, el botón de la lista pregunta antes de repetir", async (t) => {
  const p = await abrir(t, "?fb-reciente");
  const susurros = renglon(p, "Susurros del agua");
  await tocar(p, p.getByRole("button", { name: "Publicar en Facebook: Susurros del agua" }));
  await susurros.getByText("Este evento se publicó en Facebook hace 2 min. ¿Publicarlo otra vez?").waitFor();
  assert.equal((await qa(p)).cola.length, 0, "no se guardó nada");
  await tocar(p, p.getByRole("button", { name: "Publicar otra vez en Facebook: Susurros del agua" }));
  await susurros.getByText("Facebook: publicando…").waitFor();
  const q = await qa(p);
  assert.deepEqual(q.acciones.filter((a) => a[0] === "publicarEnFacebook").map((a) => a[3]), [false, true]);
  assert.equal(q.cola.length, 1);
});
