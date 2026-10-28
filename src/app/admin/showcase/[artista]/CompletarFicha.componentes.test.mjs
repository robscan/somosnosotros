/**
 * «Completar ficha» (OL-445) en la ficha del Showcase: las tarjetas de lo que falta (qué, el valor, de dónde sale), «Completar» y «Descartar» con
 * toques reales, la línea de lo hecho y «Deshacer» un descarte; con la ficha reclamada no hay «Completar» y la nota lo dice; si la acción falla,
 * la tarjeta lo dice y se queda. Y «Por revisar»: aceptar dice que ya está en su perfil (salvo redes). Los componentes de verdad con las acciones
 * del servidor de prueba: apuntan lo que reciben en `window.qa.acciones`. «Por revisar» es `Hallazgos` en modo ficha (OL-446).
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
  "./accionesPorAprobar": `
    const apuntar = (nombre, args) => { window.qa.acciones.push([nombre, ...args]); return window.qa.falla ? { ok: false, error: 'La ficha cambió mientras tanto. Recarga la página.' } : { ok: true }; };
    export async function decidir(...a) { return apuntar('decidir', a); }
    export async function rechazarConMotivo(...a) { return apuntar('rechazarConMotivo', a); }
    export async function aceptarVarias(ids, slug) { window.qa.acciones.push(['aceptarVarias', ids, slug]); return { ok: true, aceptadas: ids }; }
  `,
  "../acciones": `
    const apuntar = (nombre, args) => { window.qa.acciones.push([nombre, ...args]); return window.qa.falla ? { ok: false, error: 'La ficha cambió mientras tanto. Recarga la página.' } : { ok: true }; };
    export async function completarFicha(...a) { return apuntar('completarFicha', a); }
    export async function descartarSugerencia(...a) { return apuntar('descartarSugerencia', a); }
    export async function decidirEvidencia(...a) { return apuntar('decidirEvidencia', a); }
  `,
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "completar-ficha-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    define: { "process.env": "{}" },
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: join(root, "src/app/admin/showcase/[artista]"),
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import CompletarFicha from './CompletarFicha';
      import Hallazgos from '../Hallazgos';
      import plantilla from '../../../../components/ui/Plantilla.module.css';
      import { sugerenciasCompletar } from '../../../../lib/completarFicha';
      import { valoresDe } from '../../../../lib/showcase';
      import '../../../globals.css';
      window.qa = { acciones: [], falla: false };
      const ID = '11111111-1111-4111-8111-111111111111';
      const reclamada = new URLSearchParams(location.search).has('reclamada');
      const sugerencias = sugerenciasCompletar({
        ficha: { disciplina: 'por_completar', detalle: 'Metal', descripcion: null, redes: [] },
        propuestas: [{ id: 'p1', fuente: 'Catálogo de bandas', datos: { disciplina: 'musica', detalle: 'Metal alternativo', redes: ['https://open.spotify.com/artist/abc'], obra: 'Banda de metal alternativo con dos discos.', url: 'https://catalogo.example/banda' } }],
        evidencias: [],
      });
      const propuestas = [
        { id: '22222222-2222-4222-8222-222222222222', senal: 'obra', tipo: 'premio', titulo: 'Mención estatal', url: 'https://cultura.example/p', fecha: '2025-11-20', fuente: null, leida_por: 'rutina', estado: 'propuesta', creado_en: '2026-10-20T00:00:00Z', detalle: '20 nov 2025 · leída por la rutina hoy', fuenteTexto: 'cultura.example' },
      ];
      const prop = (n) => ({ puntaje: n, motivo: 'de la base' });
      const grupo = { artista: { id: ID, slug: 'banda', nombre: 'Banda', foto: null, href: '/admin/showcase/banda', disciplina: 'Música', estado: 'Candidato' },
        valores: valoresDe({ circulacion: null, obra: null, actividad: null, vinculo: null }, { circulacion: prop(1), obra: prop(1), actividad: prop(1), vinculo: prop(1) }),
        obraAceptada: [{ senal: 'obra', tipo: 'obra', titulo: 'Disco', fecha: '2026-03-21', estado: 'aceptada' }], hallazgos: propuestas };
      createRoot(document.getElementById('root')).render(
        <main className={plantilla.paginaContenido}>
          <Hallazgos grupos={[grupo]} hoy="2026-10-20" modo="ficha" />
          <CompletarFicha artistaId={ID} slug="banda" sugerencias={sugerencias} reclamada={reclamada} />
        </main>,
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

async function abrir(t, ruta = "/") {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  t.after(() => context.close());
  const p = await context.newPage();
  p.setDefaultTimeout(5000);
  const errores = [];
  p.on("pageerror", (e) => errores.push(e.message));
  t.after(() => assert.deepEqual(errores, []));
  await p.goto(origin + ruta);
  await p.getByRole("heading", { name: /^Completar ficha/ }).waitFor();
  return p;
}
const acciones = (p) => p.evaluate(() => window.qa.acciones);
const tarjeta = (p, que) => p.locator("h2:has-text('Completar ficha') + p + ul > li", { hasText: que });
const ID = "11111111-1111-4111-8111-111111111111";

test("las tarjetas: solo lo que falta (no «Qué hace», que ya tiene), con el valor y de dónde sale", async (t) => {
  const p = await abrir(t);
  assert.equal((await p.getByRole("heading", { name: /^Completar ficha/ }).textContent()).replace(/\s+/g, " "), "Completar ficha 3");
  const textos = (await p.locator("h2:has-text('Completar ficha') + p + ul > li").allInnerTexts()).map((x) => x.replace(/\s+/g, " "));
  assert.equal(textos.length, 3);
  assert.match(textos[0], /^Disciplina · falta en su ficha Música De: Propuesta aceptada · Catálogo de bandas Descartar Completar$/);
  assert.match(textos[1], /^Sobre · falta en su ficha Banda de metal alternativo con dos discos\. De: /);
  assert.match(textos[2], /^Enlace · falta en su ficha Spotify open\.spotify\.com\/artist\/abc · De: /);
  assert.equal(await tarjeta(p, "Disciplina").getByRole("link", { name: /Propuesta aceptada/ }).getAttribute("href"), "https://catalogo.example/banda");
  assert.equal(await tarjeta(p, "Enlace").getByRole("link", { name: "Spotify" }).getAttribute("href"), "https://open.spotify.com/artist/abc");
});

test("«Completar» y «Descartar» con toques reales: la línea de lo hecho en su sitio; un descarte se deshace", async (t) => {
  const p = await abrir(t);
  await tarjeta(p, "Disciplina").getByRole("button", { name: "Completar" }).click();
  await p.getByText("ya está en su perfil").last().waitFor();
  await tarjeta(p, "Sobre").getByRole("button", { name: "Descartar" }).click();
  await p.getByText(/Descartaste sobre/).waitFor();
  assert.equal((await p.getByRole("heading", { name: /^Completar ficha/ }).textContent()).replace(/\s+/g, " "), "Completar ficha 1");
  await p.getByRole("button", { name: "Deshacer" }).click();
  await tarjeta(p, "Sobre").getByRole("button", { name: "Completar" }).waitFor();
  assert.deepEqual(await acciones(p), [
    ["completarFicha", ID, "disciplina:musica", "banda"],
    ["descartarSugerencia", ID, "descripcion:p1", "banda"],
    ["descartarSugerencia", ID, "descripcion:p1", "banda", true],
  ]);
});

test("si la acción falla, la tarjeta lo dice y se queda", async (t) => {
  const p = await abrir(t);
  await p.evaluate(() => (window.qa.falla = true));
  await tarjeta(p, "Enlace").getByRole("button", { name: "Completar" }).click();
  await tarjeta(p, "Enlace").getByRole("alert").getByText("La ficha cambió mientras tanto. Recarga la página.").waitFor();
  assert.ok(await tarjeta(p, "Enlace").getByRole("button", { name: "Completar" }).isVisible());
});

test("con la ficha reclamada no hay «Completar»: la nota y cada tarjeta lo dicen; solo se descarta", async (t) => {
  const p = await abrir(t, "/?reclamada");
  assert.equal(await p.locator("h2:has-text('Completar ficha') + p").innerText(), "Su ficha está reclamada: desde aquí no se cambia nada. Sugiéreselo a quien la lleva.");
  assert.equal(await p.getByRole("button", { name: "Completar" }).count(), 0);
  assert.equal(await p.getByText("No se cambia: ficha reclamada").count(), 3);
  await tarjeta(p, "Disciplina").getByRole("button", { name: "Descartar" }).click();
  await p.getByText(/Descartaste disciplina/).waitFor();
  assert.deepEqual(await acciones(p), [["descartarSugerencia", ID, "disciplina:musica", "banda"]]);
});

test("«Por revisar»: dice que lo aceptado se publica, y aceptar lo dice en su línea", async (t) => {
  const p = await abrir(t);
  assert.equal(await p.locator("h2:has-text('Por revisar') + p").innerText(), "Lo que trajo la rutina. Lo que aceptas cuenta para la rúbrica y se publica en su perfil.");
  await p.getByRole("button", { name: "Aceptar" }).click();
  const hecho = p.getByRole("status").filter({ hasText: "Aceptaste" });
  await hecho.waitFor();
  assert.equal((await hecho.innerText()).replace(/\s+/g, " ").trim(), "Aceptaste Mención estatal · Obra 1 → 2 · ya está en su perfil Deshacer");
  assert.deepEqual(await acciones(p), [["decidir", "22222222-2222-4222-8222-222222222222", "aceptada", "banda"]]);
});
