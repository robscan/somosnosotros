/** OL-313 (bitácora 341), OL-315 (343) y OL-316 (346): la tira de tipos de las altas (Evento · Lugar · Artista) con sus estilos reales: el
 *  tipo de la pantalla va marcado y los otros son enlaces a las otras altas por pasos. En el primer paso del alta de evento, sola y pegada
 *  abajo; en el primer paso del alta de lugar y del de artista, dentro del pie del paso (`enPie`). La guardia de salida es la real (`pedirSalida`); el enrutador de
 *  Next lo simula `window.qa.reemplazos`.
 * PLAYWRIGHT_MODULE=/ruta/playwright-core/index.mjs CHROME_EXECUTABLE=/ruta/chromium node --test este-archivo
 * (no corre con `npm test`, que solo toma `.test.ts`; sí con `npm run test:componentes`). */
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

const mocks = {
  "next/navigation": "export function useRouter(){return {replace:(href)=>window.qa.reemplazos.push(href)}}",
  "next/link": "import React from 'react';export default function Link({prefetch,replace,...p}){return React.createElement('a',p)}",
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "tira-tipos-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import TiraTipos from './src/app/nuevo/TiraTipos';
      import {ponerGuardia, pedirSalida} from './src/lib/guardiaSalida';
      import './src/app/globals.css';
      window.qa = { reemplazos: [], pedirSalida };
      const q = new URLSearchParams(location.search);
      // «sucio»: hay algo escrito (la guardia pregunta).
      // La pantalla real siempre pone su guardia (\`useSalirSinPublicar\`): limpia, deja seguir; sucia, pregunta y guarda cómo seguir.
      ponerGuardia((continuar) => (q.has('sucio') ? void (window.qa.pregunto = continuar) : continuar()));
      // «alta»: dentro del pie del primer paso del alta de artista; «pie»: del alta de lugar (un footer con su relleno, como \`PiePaso\`); si no, sola, la del primer paso del alta de evento.
      const alta = <main style={{minHeight:'100dvh',display:'flex',flexDirection:'column'}}><footer style={{marginTop:'auto',display:'grid',gap:8,padding:'12px 20px 16px'}}><button type="button">Siguiente</button><TiraTipos actual="artista" enPie destinos={{ evento: '/nuevo/evento?ciudad=queretaro', lugar: '/nuevo/lugar?ciudad=queretaro' }} /></footer></main>;
      const pie = <main style={{minHeight:'100dvh',display:'flex',flexDirection:'column'}}><footer style={{marginTop:'auto',display:'grid',gap:8,padding:'12px 20px 16px'}}><button type="button">Siguiente</button><TiraTipos actual="lugar" enPie destinos={{ evento: '/nuevo/evento', artista: '/nuevo/artista' }} /></footer></main>;
      createRoot(document.getElementById('root')).render(
        q.has('alta') ? alta : q.has('pie') ? pie : <main style={{minHeight:'100dvh',display:'flex',flexDirection:'column'}}><TiraTipos actual="evento" destinos={{ lugar: '/nuevo/lugar', artista: '/nuevo/artista' }} /></main>,
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
    ["/", ["text/html", `<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--fuente-bricolage:Arial}</style><div id="root"></div><script src="/app.js"></script>`]],
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
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "es-MX" });
  t.after(() => context.close());
  const p = await context.newPage();
  const errores = [];
  p.on("pageerror", (e) => errores.push(e.message));
  t.after(() => assert.deepEqual(errores, []));
  await p.goto(`${origin}/${consulta}`);
  return p;
}
const tira = (p) => p.getByRole("group", { name: "Qué publicar" });

test("en el primer paso: Evento es la pantalla (aria-current, ni enlace ni botón) y Lugar y Artista son enlaces; la tira mide 56 + zona segura y va pegada abajo", async (t) => {
  const p = await pagina(t);
  assert.equal(await tira(p).locator("[aria-current=page]").textContent(), "Evento");
  assert.equal(await tira(p).getByRole("button").count(), 0);
  assert.deepEqual(await tira(p).getByRole("link").evaluateAll((a) => a.map((x) => [x.textContent, x.getAttribute("href")])), [
    ["Lugar", "/nuevo/lugar"],
    ["Artista", "/nuevo/artista"],
  ]);
  const caja = await tira(p).boundingBox();
  assert.equal(Math.round(caja.height), 56);
  assert.equal(Math.round(caja.y + caja.height), 844);
  // Los tres miden el alto de la tira y al menos 64 de ancho; Evento lleva su punto debajo.
  const tipos = await tira(p).locator("a, span").evaluateAll((e) => e.map((x) => { const c = x.getBoundingClientRect(); return [Math.round(c.width), Math.round(c.height), getComputedStyle(x, "::after").content]; }));
  for (const [ancho, alto] of tipos) assert.ok(ancho >= 64 && alto >= 55, `${ancho}×${alto}`);
  assert.equal(tipos[0][2], '""');
  assert.equal(tipos[1][2], "none");
});

test("sin nada escrito, tocar Lugar o Artista reemplaza la entrada sin preguntar; con algo escrito pregunta primero y solo sigue al confirmar", async (t) => {
  const p = await pagina(t);
  await tira(p).getByRole("link", { name: "Lugar" }).click();
  assert.deepEqual(await p.evaluate(() => window.qa.reemplazos), ["/nuevo/lugar"]);
  const sucia = await pagina(t, "?sucio");
  await tira(sucia).getByRole("link", { name: "Artista" }).click();
  assert.deepEqual(await sucia.evaluate(() => window.qa.reemplazos), []);
  await sucia.evaluate(() => window.qa.pregunto());
  assert.deepEqual(await sucia.evaluate(() => window.qa.reemplazos), ["/nuevo/artista"]);
});

test("en el alta de artista (OL-316): Evento y Lugar son enlaces a sus altas por pasos y Artista es la pantalla, con su punto", async (t) => {
  const p = await pagina(t, "?alta");
  assert.deepEqual(await tira(p).getByRole("link").evaluateAll((a) => a.map((x) => [x.textContent, x.getAttribute("href")])), [
    ["Evento", "/nuevo/evento?ciudad=queretaro"],
    ["Lugar", "/nuevo/lugar?ciudad=queretaro"],
  ]);
  assert.equal(await tira(p).getByRole("button").count(), 0);
  const actual = tira(p).locator("[aria-current=page]");
  assert.equal(await actual.textContent(), "Artista");
  assert.equal(await actual.evaluate((x) => getComputedStyle(x, "::after").content), '""');
  await tira(p).getByRole("link", { name: "Lugar" }).click();
  assert.deepEqual(await p.evaluate(() => window.qa.reemplazos), ["/nuevo/lugar?ciudad=queretaro"]);
});

test("dentro del pie de un paso (OL-315): una fila más, sin footer propio ni zona segura ni pegado, de 56 de alto bajo «Siguiente»", async (t) => {
  const p = await pagina(t, "?pie");
  const caja = tira(p);
  assert.equal(await caja.evaluate((x) => x.tagName), "DIV");
  const estilo = await caja.evaluate((x) => { const c = getComputedStyle(x); return [c.position, c.paddingBottom, Math.round(x.getBoundingClientRect().height)]; });
  assert.deepEqual(estilo, ["static", "0px", 56]);
  const boton = await p.getByRole("button", { name: "Siguiente" }).boundingBox();
  const fila = await caja.boundingBox();
  assert.ok(fila.y >= boton.y + boton.height, "la tira va debajo del botón");
  assert.equal(await caja.locator("[aria-current=page]").textContent(), "Lugar");
});
