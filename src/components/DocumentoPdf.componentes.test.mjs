/** OL-415 (bitácora 447): la hoja de «Presentación» (artista) e «Informe» (lugar) en PDF ya no trae el renglón apagado «Preparar una reseña ·
 *  Pronto», que prometía algo que no existe; el resto queda igual (la ayuda, «Periodo» en el lugar, «Carta / A4» y «Descargar PDF» abajo).
 *  Bundle real (esbuild) de `DocumentoPdf.tsx` con Chrome real vía Playwright; `/api/documento` lo contesta `page.route` con un PDF de mentira.
 *  No corre con `npm test`; se corre con `npm run test:componentes`. Con `CAPTURAS=<carpeta>` guarda la hoja abierta a 390×844.
 * PLAYWRIGHT_MODULE=/ruta/playwright-core/index.mjs node --test este-archivo */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../", import.meta.url));
const TOPE = { timeout: 30000 };
let browser, server, dir, origin;

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "documento-pdf-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    // `next/link` (que trae `Boton`) no hace falta aquí: un enlace de verdad.
    plugins: [
      {
        name: "link-simple",
        setup(b) {
          b.onResolve({ filter: /^next\/link$/ }, (a) => ({ path: a.path, namespace: "simple" }));
          b.onLoad({ filter: /.*/, namespace: "simple" }, () => ({ loader: "jsx", resolveDir: root, contents: "import React from 'react'; export const useLinkStatus = () => ({ pending: false }); export default function Link({ href, children, ...p }) { return <a href={href} {...p}>{children}</a>; }" }));
        },
      },
    ],
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import DocumentoPdf from './src/components/DocumentoPdf';import './src/app/globals.css';
      const q = new URLSearchParams(location.search);
      const opcion = (que, formato, periodo) => ({ formato, periodo, paginas: 1, href: '/api/documento?que=' + que + '&formato=' + formato + (periodo ? '&periodo=' + periodo : ''), archivo: que + '-' + formato + '.pdf', ayuda: que === 'artista' ? 'Tus fechas en Somos Nosotrxs, tu reseña y tus redes, listas para enviar: 1 página.' : 'Lo que pasó en el lugar en el periodo, con las definiciones de cada cifra: 1 página.' });
      const artista = { que: 'artista', opciones: [opcion('artista', 'carta', null), opcion('artista', 'a4', null)], etiquetasPeriodo: null };
      const lugar = { que: 'lugar', opciones: ['mes', 'anio', 'todo'].flatMap((p) => [opcion('lugar', 'carta', p), opcion('lugar', 'a4', p)]), etiquetasPeriodo: { mes: 'Octubre', anio: '2026', todo: 'Todo' } };
      createRoot(document.getElementById('root')).render(
        <main style={{ padding: 16 }}><DocumentoPdf {...(q.get('que') === 'lugar' ? lugar : artista)} /></main>
      );
    `,
    },
  });
  // Con `FUENTE=<archivo .woff2 de Bricolage>` las capturas salen con la letra de la app.
  const fuente = process.env.FUENTE ? await readFile(process.env.FUENTE) : null;
  const assets = new Map([
    ["/", ["text/html", `<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>${fuente ? "@font-face{font-family:Bricolage;src:url(/bricolage.woff2) format('woff2');font-weight:200 800;font-stretch:75% 100%}:root{--fuente-bricolage:Bricolage}" : ":root{--fuente-bricolage:Arial}"}</style><div id="root"></div><script src="/app.js"></script>`]],
    ...(fuente ? [["/bricolage.woff2", ["font/woff2", fuente]]] : []),
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

/** La pantalla con el botón, ya con la hoja abierta (`que`: «artista» o «lugar»). */
async function hojaAbierta(t, que) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  t.after(() => context.close());
  const p = await context.newPage();
  p.setDefaultTimeout(8000);
  const errores = [];
  p.on("pageerror", (e) => errores.push(e.message));
  t.after(() => assert.deepEqual(errores, []));
  await p.route(`${origin}/api/documento**`, (r) => r.fulfill({ status: 200, contentType: "application/pdf", body: Buffer.from("%PDF-1.4\n%%EOF\n") }));
  await p.goto(`${origin}/?que=${que}`);
  await p.getByRole("button", { name: que === "artista" ? "Presentación" : "Informe" }).click();
  const hoja = p.getByRole("dialog", { name: que === "artista" ? "Presentación" : "Informe de actividad" });
  await hoja.waitFor();
  return { p, hoja };
}

for (const que of ["artista", "lugar"]) {
  test(`${que}: la hoja trae la ayuda, ${que === "lugar" ? "«Periodo», " : ""}«Carta / A4» y «Descargar PDF», y ya no «Preparar una reseña · Pronto»`, TOPE, async (t) => {
    const { p, hoja } = await hojaAbierta(t, que);
    const texto = await hoja.innerText();
    assert.doesNotMatch(texto, /Pronto/);
    assert.doesNotMatch(texto, /Preparar una reseña/);
    assert.equal(await hoja.locator("[aria-disabled=true]").count(), 0, "nada apagado dentro de la hoja");
    assert.match(texto, /1 página/);
    const tamano = hoja.getByRole("group", { name: "Tamaño de la hoja" });
    assert.deepEqual(await tamano.getByRole("button").allInnerTexts(), ["Carta", "A4"]);
    assert.equal(await hoja.getByRole("group", { name: "Periodo" }).count(), que === "lugar" ? 1 : 0);
    if (que === "lugar") assert.deepEqual(await hoja.getByRole("group", { name: "Periodo" }).getByRole("button").allInnerTexts(), ["Octubre", "2026", "Todo"]);
    await hoja.getByRole("button", { name: "Descargar PDF" }).waitFor();
    if (process.env.CAPTURAS) {
      await p.waitForTimeout(600);
      await p.screenshot({ path: join(process.env.CAPTURAS, `hoja-${que === "artista" ? "presentacion" : "informe"}-componente-390.png`) });
    }
  });
}
