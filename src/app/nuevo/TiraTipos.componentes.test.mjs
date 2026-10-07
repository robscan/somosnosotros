/** OL-313 (bitácora 341): la tira de tipos de las altas (Evento · Lugar · Artista) con sus estilos reales, en sus dos usos: la de `/nuevo`
 *  (Evento es un enlace; Lugar y Artista, botones que cambian el tipo marcado) y la del primer paso del alta de evento (Evento es la
 *  pantalla; Lugar y Artista, enlaces). La guardia de salida es la real (`pedirSalida`); el enrutador de Next lo simula `window.qa.reemplazos`.
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
      import React, { useState } from 'react';import {createRoot} from 'react-dom/client';
      import TiraTipos from './src/app/nuevo/TiraTipos';
      import {ponerGuardia, pedirSalida} from './src/lib/guardiaSalida';
      import './src/app/globals.css';
      window.qa = { reemplazos: [], pedirSalida };
      const q = new URLSearchParams(location.search);
      // «alta»: la tira de /nuevo; si no, la del primer paso del alta de evento. «sucio»: hay algo escrito (la guardia pregunta).
      // La pantalla real siempre pone su guardia (\`useSalirSinPublicar\`): limpia, deja seguir; sucia, pregunta y guarda cómo seguir.
      ponerGuardia((continuar) => (q.has('sucio') ? void (window.qa.pregunto = continuar) : continuar()));
      function Alta() {
        const [tipo, setTipo] = useState('lugar');
        return <main style={{minHeight:'100dvh',display:'grid',gridTemplateRows:'1fr auto'}}><p>{tipo}</p><TiraTipos actual={tipo} destinos={{ evento: '/nuevo/evento?ciudad=queretaro', lugar: () => setTipo('lugar'), artista: () => setTipo('artista') }} /></main>;
      }
      createRoot(document.getElementById('root')).render(
        q.has('alta') ? <Alta /> : <main style={{minHeight:'100dvh',display:'flex',flexDirection:'column'}}><TiraTipos actual="evento" destinos={{ lugar: '/nuevo?tipo=lugar', artista: '/nuevo?tipo=artista' }} /></main>,
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
    ["Lugar", "/nuevo?tipo=lugar"],
    ["Artista", "/nuevo?tipo=artista"],
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
  assert.deepEqual(await p.evaluate(() => window.qa.reemplazos), ["/nuevo?tipo=lugar"]);
  const sucia = await pagina(t, "?sucio");
  await tira(sucia).getByRole("link", { name: "Artista" }).click();
  assert.deepEqual(await sucia.evaluate(() => window.qa.reemplazos), []);
  await sucia.evaluate(() => window.qa.pregunto());
  assert.deepEqual(await sucia.evaluate(() => window.qa.reemplazos), ["/nuevo?tipo=artista"]);
});

test("en /nuevo: Evento es un enlace, Lugar y Artista son botones y el marcado cambia al tocarlos (aria-pressed y su punto)", async (t) => {
  const p = await pagina(t, "?alta");
  await tira(p).getByRole("link", { name: "Evento" }).waitFor();
  assert.equal(await tira(p).getByRole("link", { name: "Evento" }).getAttribute("href"), "/nuevo/evento?ciudad=queretaro");
  const estado = () => tira(p).getByRole("button").evaluateAll((b) => b.map((x) => [x.textContent, x.getAttribute("aria-pressed"), getComputedStyle(x, "::after").content]));
  assert.deepEqual(await estado(), [["Lugar", "true", '""'], ["Artista", "false", "none"]]);
  await tira(p).getByRole("button", { name: "Artista" }).click();
  assert.deepEqual(await estado(), [["Lugar", "false", "none"], ["Artista", "true", '""']]);
  assert.equal(await p.locator("main > p").textContent(), "artista");
  await tira(p).getByRole("link", { name: "Evento" }).click();
  assert.deepEqual(await p.evaluate(() => window.qa.reemplazos), ["/nuevo/evento?ciudad=queretaro"]);
});
