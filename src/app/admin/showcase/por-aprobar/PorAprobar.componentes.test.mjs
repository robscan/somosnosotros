/**
 * Showcase › Por aprobar (OL-446; lo firmado en OL-443, bitácora 475): el componente de verdad (`Hallazgos` en modo pantalla) con dos artistas
 * inventados. Un grupo por artista con su renglón (que entra a su ficha) y lo que cambia al aceptar cada hallazgo; aceptar sube su puntaje en el
 * renglón y baja las cuentas; «Deshacer» lo devuelve; «Aceptar las 2 de Itzel Mora»; rechazar pide el motivo. Las acciones del servidor de prueba
 * apuntan lo que reciben en `window.qa.acciones`. Toques reales: el ratón en coordenadas.
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

const root = fileURLToPath(new URL("../../../../../", import.meta.url));
let dir, server, browser, origin;

const mocks = {
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link({prefetch,replace,scroll,...p}){return React.createElement('a',p)}",
  "next/image": "import React from 'react';export default function Image({quality,priority,...p}){return React.createElement('img',p)}",
  "next/navigation": "export const useRouter=()=>({push(){},refresh(){},back(){},replace(){}});export const usePathname=()=>location.pathname;export const useSearchParams=()=>new URLSearchParams(location.search);",
  "./accionesPorAprobar": `
    const apuntar = (nombre, args) => { window.qa.acciones.push([nombre, ...args]); return { ok: true }; };
    export async function decidir(...a) { return apuntar('decidir', a); }
    export async function rechazarConMotivo(...a) { return apuntar('rechazarConMotivo', a); }
    export async function aceptarVarias(ids, slug) { window.qa.acciones.push(['aceptarVarias', ids, slug]); return { ok: true, aceptadas: ids }; }
  `,
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "showcase-por-aprobar-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    define: { "process.env": "{}" },
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: join(root, "src/app/admin/showcase"),
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import Hallazgos from './Hallazgos';
      import plantilla from '../../../components/ui/Plantilla.module.css';
      import admin from '../admin.module.css';
      import { valoresDe } from '../../../lib/showcase';
      import '../../globals.css';
      window.qa = { acciones: [] };
      const prop = (n) => ({ puntaje: n, motivo: 'de la base' });
      const h = (id, senal, tipo, titulo, fuente) => ({ id, senal, tipo, titulo, url: 'https://' + fuente + '/x', fecha: null, fuente, leida_por: 'rutina', estado: 'propuesta', creado_en: '2026-10-21T00:00:00Z', fuenteTexto: fuente, detalle: 'leída por la rutina ayer' });
      const FELEAL = '11111111-1111-4111-8111-111111111111';
      const ITZEL = '44444444-4444-4444-8444-444444444444';
      const grupos = [
        { artista: { id: FELEAL, slug: 'feleal', nombre: 'Feleal', foto: null, href: '/admin/showcase/feleal', disciplina: 'Música', estado: 'Invitado' },
          valores: valoresDe({ circulacion: 2, obra: null, actividad: null, vinculo: null }, { circulacion: prop(2), obra: prop(1), actividad: prop(2), vinculo: prop(2) }),
          obraAceptada: [{ senal: 'obra', tipo: 'obra', titulo: 'Sencillo', fecha: '2026-03-21', estado: 'aceptada' }],
          hallazgos: [h('22222222-2222-4222-8222-222222222222', 'circulacion', 'prensa', 'Nota sobre su gira por el Bajío', 'prensa-local.example'), h('33333333-3333-4333-8333-333333333333', 'obra', 'premio', 'Mención en un concurso estatal', 'cultura-estatal.example')] },
        { artista: { id: ITZEL, slug: 'itzel-mora', nombre: 'Itzel Mora', foto: null, href: '/admin/showcase/itzel-mora', disciplina: 'Danza', estado: 'Candidato' },
          valores: valoresDe({ circulacion: null, obra: null, actividad: null, vinculo: null }, { circulacion: prop(1), obra: null, actividad: prop(2), vinculo: prop(2) }),
          obraAceptada: [],
          hallazgos: [h('55555555-5555-4555-8555-555555555555', 'circulacion', 'presentacion', 'Gira por tres ciudades del Bajío', 'gira-danza.example'), h('66666666-6666-4666-8666-666666666666', 'obra', 'obra', 'Video de su solo «Raíz»', 'video.example')] },
      ];
      createRoot(document.getElementById('root')).render(
        <main className={plantilla.paginaContenido + ' ' + admin.lista}><h1 className={admin.titulo}>Por aprobar</h1><Hallazgos grupos={grupos} hoy="2026-10-22" modo="pantalla" cuando="ayer" /></main>,
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
  await p.getByRole("heading", { name: "Por aprobar" }).waitFor();
  return p;
}
async function tocar(p, l) {
  await l.scrollIntoViewIfNeeded();
  const b = await l.boundingBox();
  await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
}
const acciones = (p) => p.evaluate(() => window.qa.acciones);
const linea = (p) => p.locator("main > p[role=status]").innerText();
const renglon = (p, nombre) => p.getByRole("list", { name: nombre }).getByRole("link");
const texto = (l) => l.innerText().then((x) => x.replace(/\s+/g, " ").trim());
const hallazgo = (p, titulo) => p.locator("li", { has: p.getByRole("link", { name: titulo }) });

test("un grupo por artista: su renglón entra a su ficha y adelanta «con todo»; cada hallazgo dice qué cambia, primero lo que sube", async (t) => {
  const p = await abrir(t);
  assert.equal(await linea(p), "4 evidencias de 2 artistas · las trajo la rutina ayer. Solo cuenta lo que aceptas.");
  assert.equal(await texto(renglon(p, "Feleal")), "Feleal Música · Invitado · 7 de 8 · con todo, 8 2");
  assert.equal(await renglon(p, "Feleal").getAttribute("href"), "/admin/showcase/feleal");
  assert.equal(await texto(renglon(p, "Itzel Mora")), "Itzel Mora Danza · Candidato · 5 de 8 · con todo, 6 2");
  assert.deepEqual(await p.locator("li > a[target=_blank]").allInnerTexts(), ["Mención en un concurso estatal", "Nota sobre su gira por el Bajío", "Video de su solo «Raíz»", "Gira por tres ciudades del Bajío"]);
  assert.equal(await hallazgo(p, "Mención en un concurso estatal").locator("p[data-sube]").innerText(), "Si la aceptas: Obra 1 → 2 · total 7 → 8");
  assert.equal(await hallazgo(p, "Nota sobre su gira por el Bajío").locator("p").last().innerText(), "No cambia el puntaje: Circulación está fijada a mano en 2");
  assert.equal(await hallazgo(p, "Gira por tres ciudades del Bajío").locator("p").last().innerText(), "No cambia el puntaje: Circulación se cuenta con sus eventos en la base");
  assert.equal(await hallazgo(p, "Video de su solo «Raíz»").locator("p[data-sube]").innerText(), "Si la aceptas: Obra sin datos → 1 · total 5 → 6");
  assert.equal(await p.getByRole("button", { name: /^Aceptar las/ }).count(), 2, "bajo cada grupo con dos o más; no hay «Aceptar todas»");
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth), 390);
});

test("aceptar sube el renglón (8 de 8) y baja las cuentas; la línea de lo hecho dice qué cambió; «Deshacer» lo devuelve", async (t) => {
  const p = await abrir(t);
  await tocar(p, hallazgo(p, "Mención en un concurso estatal").getByRole("button", { name: "Aceptar" }));
  await p.getByText("Aceptaste").waitFor();
  assert.ok((await p.getByRole("status").filter({ hasText: "Aceptaste" }).innerText()).includes("Mención en un concurso estatal · Obra 1 → 2"));
  assert.equal(await texto(renglon(p, "Feleal")), "Feleal Música · Invitado · 8 de 8 1");
  assert.equal(await linea(p), "3 evidencias de 2 artistas · las trajo la rutina ayer. Solo cuenta lo que aceptas.");
  assert.equal(await p.getByRole("button", { name: "Aceptar las 2 de Feleal" }).count(), 0, "con una sola, sin «Aceptar las N»");
  await tocar(p, p.getByRole("button", { name: "Deshacer" }));
  await hallazgo(p, "Mención en un concurso estatal").getByRole("button", { name: "Aceptar" }).waitFor();
  assert.equal(await texto(renglon(p, "Feleal")), "Feleal Música · Invitado · 7 de 8 · con todo, 8 2");
  assert.deepEqual(await acciones(p), [
    ["decidir", "33333333-3333-4333-8333-333333333333", "aceptada", "feleal"],
    ["decidir", "33333333-3333-4333-8333-333333333333", "propuesta", "feleal"],
  ]);
});

test("«Aceptar las 2 de Itzel Mora» y rechazar con motivo", async (t) => {
  const p = await abrir(t);
  await tocar(p, p.getByRole("button", { name: "Aceptar las 2 de Itzel Mora" }));
  await p.getByRole("status").filter({ hasText: "Video de su solo" }).waitFor();
  assert.ok((await p.getByRole("status").filter({ hasText: "Video de su solo" }).innerText()).includes("Obra sin datos → 1"));
  assert.equal(await texto(renglon(p, "Itzel Mora")), "Itzel Mora Danza · Candidato · 6 de 8");
  await tocar(p, hallazgo(p, "Nota sobre su gira por el Bajío").getByRole("button", { name: "Rechazar" }));
  const hoja = p.getByRole("dialog", { name: "Rechazar «Nota sobre su gira por el Bajío»" });
  await tocar(p, hoja.getByRole("button", { name: /^Duplicado/ }));
  await p.getByText("Rechazaste").waitFor();
  assert.equal(await linea(p), "1 evidencia de 1 artista · las trajo la rutina ayer. Solo cuenta lo que aceptas.");
  assert.deepEqual(await acciones(p), [
    ["aceptarVarias", ["66666666-6666-4666-8666-666666666666", "55555555-5555-4555-8555-555555555555"], "itzel-mora"],
    ["rechazarConMotivo", "22222222-2222-4222-8222-222222222222", "duplicado", "feleal"],
  ]);
});
