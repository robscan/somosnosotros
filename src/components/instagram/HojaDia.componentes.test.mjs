/**
 * La hoja de un día de la semana de Instagram (OL-479, bitácora 511): el componente de verdad (`HojaDia`) con días inventados y las acciones del
 * servidor de prueba (lo que piden queda en `window.qa.acciones`; `window.qa.dia` es lo que devuelve `prepararDia`). Toques reales: el ratón en
 * coordenadas y `elementFromPoint` (que lo de debajo del dedo sea el control).
 *   · el artista: el día, por qué con «Cambiar», el aviso «falta mandarlo», la etiqueta (coautora) y «Publicar ahora»; la historia;
 *   · «Cambiar» → los candidatos → elegir uno pide `cambiarDia` y vuelve al día;
 *   · «Avisar» → el mensaje → «Copiar y abrir su Instagram» copia el mensaje, abre su conversación y anota el aviso;
 *   · «Dijo que no» → «Mejor no» vuelve; «Sí, sacarlo de Instagram» pide `dijoQueNoDia`;
 *   · quitar la etiqueta cambia el texto y «Publicar ahora» la manda sin ella (y cierra la hoja);
 *   · lo que se cambió en un día programado se guarda al cerrar (y si no se cambió nada, no);
 *   · ya publicado: los «Ver» y lo que dio, sin botón; un descanso: «Poner un lugar este día».
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

const acciones = `
  const apuntar = (nombre, args) => window.qa.acciones.push([nombre, ...args]);
  const listo = () => ({ ok: true });
  export async function prepararDia(id) { apuntar('prepararDia', [id]); return JSON.parse(JSON.stringify(window.qa.dia)); }
  export async function candidatosDia(id) {
    apuntar('candidatosDia', [id]);
    return { ok: true, titulo: 'Cambiar el lunes 12', nota: 'Van primero quienes tienen fecha en los próximos 30 días.', fuera: 'Valeria Quiroz ya va el vie 16.',
      lista: [{ id: 'cccc0000-0000-4000-8000-000000000002', nombre: 'Ximena Urquidi', foto: null, linea: 'Sin fecha próxima · nunca en Instagram', redonda: true, href: '/artistas/ximena' }] };
  }
  export async function cambiarDia(...a) { apuntar('cambiarDia', a); window.qa.dia = { ...window.qa.dia, nombre: 'Ximena Urquidi', por: 'Elegido a mano.', aviso: { ...window.qa.dia.aviso, cuenta: 'ximena' } }; return listo(); }
  export async function quitarDia(...a) { apuntar('quitarDia', a); window.qa.dia = { ...window.qa.dia, estado: 'quitado' }; return listo(); }
  export async function volverAProgramarDia(...a) { apuntar('volverAProgramarDia', a); return listo(); }
  export async function ponerLugarDia(...a) { apuntar('ponerLugarDia', a); return listo(); }
  export async function guardarDia(...a) { apuntar('guardarDia', a); return listo(); }
  export async function publicarDiaAhora(...a) { apuntar('publicarDiaAhora', a); return listo(); }
  export async function avisadoDia(...a) { apuntar('avisadoDia', a); window.qa.dia = { ...window.qa.dia, aviso: { ...window.qa.dia.aviso, en: '2026-10-07T16:00:00Z' } }; return listo(); }
  export async function dijoQueNoDia(...a) { apuntar('dijoQueNoDia', a); window.qa.dia = { ...window.qa.dia, nombre: 'Teodoro Alcántara', reemplaza: 'Colectivo Nube de Papel', aviso: { ...window.qa.dia.aviso, cuenta: 'teodoro', en: null } }; return { ok: true, siguiente: 'Teodoro Alcántara' }; }
  export async function volverAPonerEnInstagram(...a) { apuntar('volverAPonerEnInstagram', a); return listo(); }
`;
const mocks = {
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link({prefetch,replace,scroll,...p}){return React.createElement('a',p)}",
  "next/image": "import React from 'react';export default function Image({quality,priority,fill,...p}){return React.createElement('img',p)}",
  "next/navigation": "export const useRouter=()=>({push(){},refresh(){},back(){},replace(){}});export const usePathname=()=>'/admin/instagram';export const useSearchParams=()=>new URLSearchParams();",
  "@/app/admin/instagram/accionesSemana": acciones,
};

const ARTISTA = {
  ok: true, id: 'dddd0000-0000-4000-8000-000000000479', tipo: 'artista', titulo: 'Lun 12 · 7:00 pm · Artista', nombre: 'Colectivo Nube de Papel', por: 'Artista sin fecha próxima, de San Luis Potosí, nunca en Instagram.',
  estado: 'programado', abierto: true, cuandoSale: 'el lunes 12', hora: '19:00:00',
  contenido: { tipo: 'artista', cuenta: 'nubedepapel', datos: { nombre: 'Colectivo Nube de Papel', slug: 'nube', descripcion: 'Colectivo de ilustración y fanzine de San Luis Potosí. Hacen libros de artista, carteles y talleres de dibujo.', disciplina: 'artes_visuales', detalle: 'ilustración', ciudad: 'San Luis Potosí', redes: [{ url: 'https://www.instagram.com/nubedepapel' }], proxima: null } },
  guardado: { texto: null, quitadas: [], facebook: true }, ubicacion: { nombre: 'San Luis Potosí' }, ciudad: { slug: 'san-luis-potosi', nombre: 'San Luis Potosí' },
  aviso: { cuenta: 'nubedepapel', mensaje: '¡Hola, Colectivo Nube de Papel! Te escribimos de Somos Nosotrxs (@smsnstrsapp).\\n\\nSi prefieres que no, contéstanos «no» y no se publica.', abrir: 'https://ig.me/m/nubedepapel', en: null, dijoNo: false },
  publicado: null, medida: null, reemplaza: null, ahora: '2026-10-07T16:00:00Z', zona: 'America/Mexico_City',
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "hoja-dia-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    define: { "process.env": "{}" },
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: join(root, "src/components/instagram"),
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import HojaDia from './HojaDia';
      import '../../app/globals.css';
      window.qa = { acciones: [], abiertas: [], cerrada: 0, cambios: 0, dia: window.DIA };
      window.open = (url) => { window.qa.abiertas.push(url); return null; };
      function App() {
        const [abierta, setAbierta] = React.useState(true);
        return <main><h1>Instagram</h1>{abierta && <HojaDia id={window.qa.dia.id} onCerrar={() => { window.qa.cerrada++; setAbierta(false); }} onCambio={() => window.qa.cambios++} />}</main>;
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
    ["/app.js", ["text/javascript", await readFile(join(dir, "app.js"))]],
    ["/app.css", ["text/css", await readFile(join(dir, "app.css"))]],
  ]);
  const PIXEL = Buffer.from("/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==", "base64");
  server = createServer((req, res) => {
    const ruta = req.url.split("?")[0];
    if (ruta.startsWith("/api/instagram/")) {
      res.writeHead(200, { "Content-Type": "image/jpeg" });
      return res.end(PIXEL);
    }
    if (ruta === "/") {
      const dia = new URL(req.url, "http://x").searchParams.get("dia") ?? "artista";
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(`<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--fuente-bricolage:Arial}</style><div id="root"></div><script>window.DIA=${JSON.stringify(DIAS[dia])}</script><script src="/app.js"></script>`);
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

const DIAS = {
  artista: ARTISTA,
  publicado: { ...ARTISTA, estado: 'publicado', abierto: false, aviso: null, titulo: 'Lun 5 · 7:00 pm · Artista', publicado: { instagram: 'https://www.instagram.com/p/A/', facebook: 'https://www.facebook.com/1/posts/2', historia: 'https://www.instagram.com/stories/x/1/', cuando: 'lun 5 de oct, 7:00 pm', sinCoautor: true, fallo: null }, medida: { visitas: 31, van: 3 } },
  descanso: { ...ARTISTA, tipo: 'descanso', titulo: 'Dom 18 · Descanso', nombre: 'Sin publicación', por: null, estado: 'descanso', abierto: false, hora: null, contenido: { tipo: 'descanso' }, aviso: null },
};

async function abrir(t, dia = "artista") {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin });
  t.after(() => context.close());
  const p = await context.newPage();
  p.setDefaultTimeout(5000);
  const errores = [];
  p.on("pageerror", (e) => errores.push(e.message));
  t.after(() => assert.deepEqual(errores, []));
  await p.goto(`${origin}/?dia=${dia}`);
  await p.getByRole("dialog").waitFor();
  await p.waitForFunction(() => !document.querySelector('[aria-label="Preparando la vista previa"]'));
  return p;
}
async function tocar(p, l) {
  await l.first().evaluate((e) => e.scrollIntoView({ block: "center" }));
  const b = await l.first().boundingBox();
  const x = b.x + b.width / 2;
  const y = b.y + b.height / 2;
  const debajo = await p.evaluate(([px, py]) => document.elementFromPoint(px, py)?.closest("a,button")?.textContent ?? null, [x, y]);
  assert.equal(debajo?.replace(/\s+/g, ""), (await l.first().innerText()).replace(/\s+/g, ""), "lo de debajo del dedo es el control");
  await p.mouse.click(x, y);
}
const qa = (p) => p.evaluate(() => window.qa);
const texto = (l) => l.innerText().then((x) => x.replace(/\s+/g, " ").trim());
const hoja = (p) => p.getByRole("dialog");

test("el día de un artista: por qué con «Cambiar», el aviso, la etiqueta (coautora), cuándo sale y «Publicar ahora»; la historia", async (t) => {
  const p = await abrir(t);
  const h = hoja(p);
  assert.equal(await h.getAttribute("aria-label"), "Lun 12 · 7:00 pm · Artista");
  const todo = await texto(h);
  assert.match(todo, /Artista sin fecha próxima, de San Luis Potosí, nunca en Instagram\. Cambiar/);
  assert.match(todo, /Aviso a @nubedepapel: falta mandarlo Avisar/);
  assert.match(todo, /Se etiqueta en la foto, se menciona en el texto y se invita a su cuenta como coautora:/);
  assert.match(todo, /Sale sola el lunes 12 a las 7:00 pm en @smsnstrsapp y en su página de Facebook\./);
  assert.equal(await h.getByRole("button", { name: "Publicar ahora" }).count(), 1);
  assert.match(await h.locator("img").first().getAttribute("src"), /\/api\/instagram\/semana\/dddd0000-0000-4000-8000-000000000479\?formato=4x5/);
  await tocar(p, h.getByRole("button", { name: "Historia 9:16" }));
  assert.match(await h.locator("img").first().getAttribute("src"), /formato=9x16/);
  assert.match(await texto(h), /La historia sale con la publicación y dura 24 horas/);
  // Los botones miden 44 o más; un chip se ve de 36 y su ::before lo lleva a 44 (canon de `ui/Chip`); «Cambiar» va dentro de una frase.
  for (const nombre of ["Publicar ahora", "Avisar"]) {
    const caja = await h.getByRole("button", { name: nombre }).first().boundingBox();
    assert.ok(caja.height >= 44 && caja.width >= 44, `«${nombre}» mide ${Math.round(caja.width)}×${Math.round(caja.height)}`);
  }
  const chip = await h.getByRole("button", { name: "Historia 9:16" }).evaluate((e) => parseFloat(getComputedStyle(e, "::before").height) || e.getBoundingClientRect().height);
  assert.ok(chip >= 44, `el chip toca en ${chip} de alto`);
});

test("«Cambiar»: los candidatos, elegir uno pide `cambiarDia` y vuelve al día con quien se eligió", async (t) => {
  const p = await abrir(t);
  await tocar(p, hoja(p).getByRole("button", { name: "Cambiar" }));
  await p.getByRole("dialog", { name: "Cambiar el lunes 12" }).waitFor();
  assert.match(await texto(hoja(p)), /Valeria Quiroz ya va el vie 16\./);
  await tocar(p, hoja(p).getByRole("link", { name: /Ximena Urquidi/ }));
  await p.getByRole("dialog", { name: "Lun 12 · 7:00 pm · Artista" }).waitFor();
  await hoja(p).getByText("Elegido a mano.").waitFor();
  const q = await qa(p);
  assert.deepEqual(q.acciones.find((a) => a[0] === "cambiarDia"), ["cambiarDia", ARTISTA.id, "cccc0000-0000-4000-8000-000000000002"]);
  assert.equal(q.acciones.filter((a) => a[0] === "prepararDia").length, 2, "el día se vuelve a preparar");
  assert.ok(q.cambios >= 1, "la semana se entera");
});

test("«Avisar»: el mensaje listo; «Copiar y abrir su Instagram» lo copia, abre su conversación y anota el aviso", async (t) => {
  const p = await abrir(t);
  await tocar(p, hoja(p).getByRole("button", { name: "Avisar" }));
  const avisar = p.getByRole("dialog", { name: "Avisar a Colectivo Nube de Papel" });
  await avisar.waitFor();
  assert.match(await texto(avisar.locator("pre")), /^¡Hola, Colectivo Nube de Papel!/);
  await tocar(p, avisar.getByRole("button", { name: "Copiar y abrir su Instagram" }));
  await p.getByRole("dialog", { name: "Lun 12 · 7:00 pm · Artista" }).getByText(/avisado hoy, 10:00 am · sin respuesta/).waitFor();
  const q = await qa(p);
  assert.deepEqual(q.abiertas, ["https://ig.me/m/nubedepapel"]);
  assert.ok(q.acciones.some((a) => a[0] === "avisadoDia"));
  assert.match(await p.evaluate(() => navigator.clipboard.readText()), /^¡Hola, Colectivo Nube de Papel!/);
});

test("«Dijo que no»: pide confirmar («Mejor no» vuelve); «Sí, sacarlo de Instagram» pone al siguiente", async (t) => {
  const p = await abrir(t);
  await tocar(p, hoja(p).getByRole("button", { name: "Avisar" }));
  await tocar(p, hoja(p).getByRole("button", { name: "Dijo que no" }));
  await p.getByRole("dialog", { name: "¿Sacar a Colectivo Nube de Papel de Instagram?" }).waitFor();
  await tocar(p, hoja(p).getByRole("button", { name: "Mejor no" }));
  await p.getByRole("dialog", { name: "Lun 12 · 7:00 pm · Artista" }).waitFor();
  assert.equal((await qa(p)).acciones.filter((a) => a[0] === "dijoQueNoDia").length, 0, "«Mejor no» no hace nada");
  await tocar(p, hoja(p).getByRole("button", { name: "Avisar" }));
  await tocar(p, hoja(p).getByRole("button", { name: "Dijo que no" }));
  await tocar(p, hoja(p).getByRole("button", { name: "Sí, sacarlo de Instagram" }));
  await hoja(p).getByText("En lugar de Colectivo Nube de Papel, que dijo que no.").waitFor();
  assert.equal((await qa(p)).acciones.filter((a) => a[0] === "dijoQueNoDia").length, 1);
});

test("quitar la etiqueta cambia el texto; «Publicar ahora» la manda sin ella, con el texto del sistema, y cierra la hoja", async (t) => {
  const p = await abrir(t);
  const resumen = () => texto(hoja(p).getByRole("button", { name: "Texto de la publicación" }));
  assert.match(await p.evaluate(() => document.querySelector("[role=dialog]").textContent), /@nubedepapel/);
  await tocar(p, hoja(p).getByRole("button", { name: "Quitar @nubedepapel" }));
  await hoja(p).getByRole("button", { name: "Volver a etiquetar" }).waitFor();
  assert.doesNotMatch(await resumen(), /@nubedepapel/);
  await tocar(p, hoja(p).getByRole("button", { name: "Publicar ahora" }));
  await p.getByRole("dialog").waitFor({ state: "detached" });
  const q = await qa(p);
  assert.deepEqual(q.acciones.find((a) => a[0] === "publicarDiaAhora"), ["publicarDiaAhora", ARTISTA.id, { texto: null, quitadas: ["nubedepapel"], facebook: true }]);
  assert.equal(q.cerrada, 1);
});

test("lo que se cambió en un día programado se guarda al cerrar; sin cambios, no", async (t) => {
  const p = await abrir(t);
  await tocar(p, hoja(p).getByRole("button", { name: "Cerrar" }));
  await p.getByRole("dialog").waitFor({ state: "detached" });
  assert.equal((await qa(p)).acciones.filter((a) => a[0] === "guardarDia").length, 0, "sin cambios no se guarda nada");
  const p2 = await abrir(t);
  await tocar(p2, hoja(p2).getByRole("checkbox", { name: /También en Facebook/ }));
  await tocar(p2, hoja(p2).getByRole("button", { name: "Cerrar" }));
  await p2.getByRole("dialog").waitFor({ state: "detached" });
  await p2.waitForFunction(() => window.qa.acciones.some((a) => a[0] === "guardarDia"));
  assert.deepEqual((await qa(p2)).acciones.find((a) => a[0] === "guardarDia"), ["guardarDia", ARTISTA.id, { texto: null, quitadas: [], facebook: false }]);
});

test("«Quitar de la semana»: el día dice que no se publica y ofrece volver a programarlo", async (t) => {
  const p = await abrir(t);
  await tocar(p, hoja(p).getByRole("button", { name: "Quitar de la semana" }));
  await hoja(p).getByText("Quitado: este día no se publica.").waitFor();
  assert.equal(await hoja(p).getByRole("button", { name: "Volver a programar" }).count(), 1);
});

test("ya publicado: los «Ver», la historia, lo que dio y que no aceptó al coautor; sin botón", async (t) => {
  const p = await abrir(t, "publicado");
  const estado = await texto(hoja(p).getByRole("status").first());
  assert.equal(estado, "Instagram: publicado, lun 5 de oct, 7:00 pm Ver Facebook: publicado Ver Historia: publicada Ver 31 visitas a su ficha desde Instagram 3 dieron «Voy» a una de sus fechas después de verla");
  assert.match(await texto(hoja(p)), /no aceptó invitar a su cuenta como coautora/);
  assert.equal(await hoja(p).getByRole("button", { name: "Publicar ahora" }).count(), 0);
  for (const nombre of ["Ver en Instagram", "Ver en Facebook"]) assert.ok((await hoja(p).getByRole("link", { name: nombre }).boundingBox()).width >= 44, `«${nombre}» mide 44 de ancho`);
});

test("un descanso: por qué y «Poner un lugar este día»", async (t) => {
  const p = await abrir(t, "descanso");
  assert.match(await texto(hoja(p)), /Los domingos la cuenta descansa/);
  await tocar(p, hoja(p).getByRole("button", { name: "Poner un lugar este día" }));
  await p.waitForFunction(() => window.qa.acciones.some((a) => a[0] === "ponerLugarDia"));
});
