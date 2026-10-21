/**
 * Showcase › Candidatos (OL-426, lo firmado en OL-425): buscar con su ✕ (la URL cambia 300 ms después de teclear y la lista se filtra), los chips de
 * disciplina con su cuenta y su enlace, la hoja «Estado» que filtra, la hoja «Orden» con «Puntaje» por defecto y la vista en tabla. El
 * componente de verdad (`VistaCandidatos`, con `OpcionesLista`, `ui/Buscador`, `ui/Chip` y `ui/Hoja`) con una lista inventada; el router de
 * prueba cambia la URL sin apilar historial y la página se vuelve a pintar con lo que dice la URL, como hace el servidor.
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

const mocks = {
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link({prefetch,replace,scroll,...p}){return React.createElement('a',p)}",
  "next/image": "import React from 'react';export default function Image({quality,priority,...p}){return React.createElement('img',p)}",
  // Reemplazar la URL (filtrar no es navegar): sin apilar historial, y la página se pinta otra vez con lo que dice la URL.
  "next/navigation":
    "export const useRouter=()=>({push(){},refresh(){},back(){},replace(u){window.qa.reemplazos.push(u);history.replaceState(history.state,'',u);window.qa.pintar()}});export const usePathname=()=>location.pathname;export const useSearchParams=()=>new URLSearchParams(location.search);",
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "showcase-candidatos-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    define: { "process.env": "{}" },
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React, {useReducer} from 'react';import {createRoot} from 'react-dom/client';
      import VistaCandidatos from './src/app/admin/showcase/VistaCandidatos';
      import {leerVista} from './src/lib/showcase';
      import plantilla from './src/components/ui/Plantilla.module.css';
      import admin from './src/app/admin/admin.module.css';
      import './src/app/globals.css';
      const p = (c, o, a, v) => ({ circulacion: c, obra: o, actividad: a, vinculo: v });
      const suma = (x) => Object.values(x).reduce((n, y) => n + (y ?? 0), 0);
      const base = { ciudad: 'San Luis Potosí', foto: null, instagram: null, nota: null, programadoPor: [], redes: null };
      const lectura = (seguidores, ultima) => ({ red: 'instagram', seguidores, publicaciones: 100, ultima_publicacion: ultima, leido_en: '2026-10-16T00:00:00Z' });
      const lista = [
        { ...base, id: 'a1', slug: 'sangre-de-coyote', nombre: 'Sangre de Coyote', disciplina: 'musica', estado: 'invitado', puntajes: p(2, 1, 2, 1), eventos: 7, foros: 4, festivales: 1, instagram: 'https://www.instagram.com/sangre/', nota: 'Circula mucho por los foros del centro.', programadoPor: ['Teatro de la Paz', 'Casa de Cultura', 'Festival de las Linternas', 'ACHE Galería'], redes: lectura(3200, '2026-10-18') },
        { ...base, id: 'a2', slug: 'pargazz', nombre: 'Pargazz', disciplina: 'musica', estado: 'revisado', puntajes: p(1, 1, 1, 2), eventos: 4, foros: 2, festivales: 1, redes: lectura(1100, '2026-10-08') },
        { ...base, id: 'a3', slug: 'iyari', nombre: 'IYARI, teatro de la vida', disciplina: 'teatro', estado: 'invitado', puntajes: p(2, 1, 1, 1), eventos: 4, foros: 2, festivales: 1, redes: lectura(980, '2026-08-01') },
        { ...base, id: 'a4', slug: 'un-leon-marinero', nombre: 'Un León Marinero', disciplina: 'musica', estado: 'confirmado', puntajes: p(2, 2, 1, 1), eventos: 5, foros: 3, festivales: 1 },
        { ...base, id: 'a5', slug: 'yanel-villarreal', nombre: 'Yanel Villarreal', disciplina: 'artes_visuales', estado: 'candidato', puntajes: p(null, null, null, null), eventos: 1, foros: 1, festivales: 0 },
      ].map((c) => ({ ...c, suma: suma(c.puntajes) }));
      window.qa = { reemplazos: [], pintar: () => {} };
      function App() {
        const [, pintar] = useReducer((n) => n + 1, 0);
        window.qa.pintar = pintar;
        const vista = leerVista(Object.fromEntries(new URLSearchParams(location.search)));
        return <main className={plantilla.paginaContenido + ' ' + admin.lista}><h1 className={admin.titulo}>Showcase</h1><VistaCandidatos todos={lista} vista={vista} hoy="2026-10-20" /></main>;
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
    const ruta = req.url.split("?")[0];
    const a = assets.get(ruta === "/admin/showcase" ? "/" : ruta);
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
  await p.goto(`${origin}/admin/showcase${consulta}`);
  await p.getByRole("heading", { name: "Showcase" }).waitFor();
  return p;
}
const nombres = (p) => p.locator("ul[aria-label=Candidatos] > li > a:first-of-type").allInnerTexts();
const cifras = (p) => p.locator("p[role=status]").innerText();

test("la lista: por puntaje, con la rúbrica en color, la línea de cifras y lo que dice cada tarjeta", async (t) => {
  const p = await abrir(t);
  assert.deepEqual(await nombres(p), ["Sangre de Coyote", "Un León Marinero", "IYARI, teatro de la vida", "Pargazz", "Yanel Villarreal"], "puntaje; el empate lo rompe la convocatoria");
  assert.equal(await cifras(p), "5 candidatos · 2 invitados · 1 confirmado · pasan al consejo con 5 de 8");
  const primera = p.locator("ul[aria-label=Candidatos] > li").first();
  assert.equal(await primera.getByRole("list", { name: "Rúbrica: 6 de 8" }).innerText(), "Circulación\n2\nObra\n1\nActividad\n2\nVínculo\n1\n6\nde 8");
  for (const texto of ["Invitado", "7 eventos · 4 foros · 1 festival", "3,2 mil seguidores · 100 publicaciones · última hace 2 días", "Publica cada semana", "Circula mucho por los foros del centro.", "Programado por: Teatro de la Paz, Casa de Cultura, Festival de las Linternas y 1 más"]) {
    assert.ok((await primera.innerText()).includes(texto), `la tarjeta dice «${texto}»`);
  }
  assert.equal(await primera.getByRole("link", { name: "Sangre de Coyote" }).getAttribute("href"), "/admin/showcase/sangre-de-coyote", "el nombre abre su ficha de showcase");
  assert.equal(await primera.getByRole("link", { name: "Ficha" }).getAttribute("href"), "/artistas/sangre-de-coyote", "«Ficha» abre la ficha pública");
  assert.equal(await primera.getByRole("link", { name: "Instagram" }).getAttribute("target"), "_blank");
  const verde = await primera.locator("li[data-n='2']").first().evaluate((e) => getComputedStyle(e).color);
  assert.equal(verde, "rgb(31, 111, 67)", "un 2, en el verde de lo decidido");
  const iyari = await p.locator("ul[aria-label=Candidatos] > li", { hasText: "IYARI" }).innerText();
  assert.ok(iyari.includes("Sin publicar en 45 días"), "más de 45 días sin publicar: inactivo");
  const yanel = p.locator("ul[aria-label=Candidatos] > li", { hasText: "Yanel" });
  assert.equal(await yanel.getByRole("list", { name: "Rúbrica: 0 de 8" }).locator("b").allInnerTexts().then((x) => x.join(" ")), "– – – –", "sin puntuar es una raya, no un 0");
  assert.equal(await p.getByRole("link", { name: /Exportar para el consejo/ }).getAttribute("href"), "/api/showcase/csv");
});

test("buscar: la lista se filtra 300 ms después de teclear, sin apilar historial, y la ✕ la devuelve entera", async (t) => {
  const p = await abrir(t);
  const historial = await p.evaluate(() => history.length);
  await p.getByRole("searchbox", { name: "Buscar artista del showcase" }).fill("leon");
  await p.waitForFunction(() => location.search === "?q=leon");
  await p.locator("ul[aria-label=Candidatos] > li").nth(1).waitFor({ state: "detached" });
  assert.deepEqual(await nombres(p), ["Un León Marinero"], "sin acentos ni mayúsculas");
  assert.equal(await cifras(p), "1 de 5 candidatos");
  assert.equal(await p.getByRole("link", { name: /Exportar para el consejo/ }).getAttribute("href"), "/api/showcase/csv?q=leon", "el CSV es la lista filtrada");
  await p.getByRole("button", { name: "Borrar la búsqueda" }).click();
  await p.waitForFunction(() => location.search === "");
  assert.equal((await nombres(p)).length, 5);
  assert.equal(await p.evaluate(() => history.length), historial, "filtrar no es navegar");
  await p.getByRole("searchbox").fill("zzz");
  await p.getByText("Nadie con «zzz» aquí.").waitFor();
});

test("los chips de disciplina: «Todas» y las que hay, con su cuenta y su enlace", async (t) => {
  const p = await abrir(t, "?disciplina=teatro");
  const chips = p.getByRole("group", { name: "Filtrar por disciplina" }).getByRole("link");
  assert.deepEqual((await chips.allInnerTexts()).map((x) => x.replace(/\s+/g, " ").trim()), ["Todas 5", "Música 3", "Teatro 1", "Artes visuales 1"]);
  assert.equal(await chips.nth(2).getAttribute("aria-current"), "true", "Teatro, elegido");
  assert.equal(await chips.nth(1).getAttribute("href"), "/admin/showcase?disciplina=musica");
  assert.equal(await chips.nth(0).getAttribute("href"), "/admin/showcase");
  assert.deepEqual(await nombres(p), ["IYARI, teatro de la vida"]);
});

test("estado: la hoja «Ver por estado» con sus cuentas filtra y el chip lo dice", async (t) => {
  const p = await abrir(t);
  await p.getByRole("button", { name: /^Estado: Todos/ }).click();
  const hoja = p.getByRole("dialog", { name: "Ver por estado" });
  await hoja.waitFor();
  assert.equal(await hoja.getByRole("button", { name: /^Todos/ }).getAttribute("aria-pressed"), "true");
  assert.ok((await hoja.getByRole("button", { name: /^Invitado/ }).innerText()).includes("2 artistas"));
  await hoja.getByRole("button", { name: /^Invitado/ }).click();
  await hoja.waitFor({ state: "detached" });
  assert.equal(await p.evaluate(() => location.search), "?estado=invitado");
  assert.deepEqual(await nombres(p), ["Sangre de Coyote", "IYARI, teatro de la vida"]);
  assert.ok(await p.getByRole("button", { name: /^Estado: Invitado/ }).isVisible());
  assert.equal(await cifras(p), "2 de 5 candidatos");
});

test("orden: «Puntaje» por defecto; «Nombre» ordena de la A a la Z", async (t) => {
  const p = await abrir(t);
  await p.getByRole("button", { name: /^Orden: Puntaje/ }).click();
  const hoja = p.getByRole("dialog", { name: "Ordenar por" });
  assert.deepEqual((await hoja.getByRole("button").filter({ hasNot: p.locator("[aria-label=Cerrar]") }).allInnerTexts()).map((x) => x.split("\n")[0]).filter((x) => x), ["Puntaje", "Convocatoria", "Seguidores", "Última publicación", "Nombre"]);
  assert.equal(await hoja.getByRole("button", { name: /^Puntaje/ }).getAttribute("aria-pressed"), "true");
  await hoja.getByRole("button", { name: /^Nombre/ }).click();
  await p.waitForFunction(() => location.search === "?orden=nombre");
  assert.deepEqual(await nombres(p), ["IYARI, teatro de la vida", "Pargazz", "Sangre de Coyote", "Un León Marinero", "Yanel Villarreal"]);
});

test("vista: en tabla, las mismas cifras en columnas y el orden elegido marcado", async (t) => {
  const p = await abrir(t);
  await p.getByRole("button", { name: /^Vista: tarjetas/ }).click();
  await p.getByRole("dialog", { name: "Ver como" }).getByRole("button", { name: /^Tabla/ }).click();
  const tabla = p.getByRole("region", { name: "Candidatos en tabla" });
  await tabla.waitFor();
  assert.equal(await p.evaluate(() => location.search), "?vista=tabla");
  assert.equal(await tabla.locator("th[aria-sort]").innerText(), "TOTAL");
  const fila = await tabla.locator("tbody tr").first().locator("td").allInnerTexts();
  assert.deepEqual(fila.map((x) => x.trim()), ["Sangre de Coyote", "Música", "Invitado", "2", "1", "2", "1", "6", "7", "4", "1", "3,2 mil", "hace 2 días"]);
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth), 390, "la tabla se desliza dentro de su caja, no la página");
});
