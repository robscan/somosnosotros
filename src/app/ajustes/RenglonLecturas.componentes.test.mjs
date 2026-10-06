/** OL-307 (bitácora 335): el renglón «Lectura automática de carteles» de Ajustes, con el componente real y el CSS real, dentro de la tarjeta «Cuenta»
 *  (los renglones vecinos, «Entras con…» y «Personas bloqueadas», son copia del marcado de la página, solo para ver el conjunto). La página
 *  entera es de servidor (sesión, base) y no corre aquí. Con `CAPTURAS=<carpeta>` y `FUENTE=<.woff2 de Bricolage>` guarda la captura a 390×844.
 * PLAYWRIGHT_MODULE=/ruta/playwright-core/index.mjs node --test este-archivo   (o `npm run test:componentes`) */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const capturas = process.env.CAPTURAS;
let dir, server, browser, origin;

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "renglon-lecturas-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import RenglonLecturas from './src/app/ajustes/RenglonLecturas';
      import {IconoBloquear, IconoChevronDerecha, IconoPersona} from './src/components/ui/Iconos';
      import renglon from './src/components/ui/Renglon.module.css';
      import plantilla from './src/components/ui/Plantilla.module.css';
      import './src/app/globals.css';
      createRoot(document.getElementById('root')).render(
        <main className={plantilla.paginaContenido}>
          <h2>Cuenta</h2>
          <ul className={renglon.tarjeta}>
            <li className={renglon.ajuste}><IconoPersona width={20} height={20} /><b>Entras con ro…@gmail.com</b><small>Sin contraseña: cada vez te mandamos un código</small></li>
            <RenglonLecturas cupo={window.qaCupo} />
            <li><a href="#" className={renglon.ajuste}><IconoBloquear width={20} height={20} /><b>Personas bloqueadas</b><small>Dejaste de ver lo que publican</small><IconoChevronDerecha /></a></li>
          </ul>
        </main>
      );
    `,
    },
  });
  const fuente = process.env.FUENTE ? await readFile(process.env.FUENTE) : null;
  const assets = new Map([
    ["/", ["text/html", `<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>${fuente ? "@font-face{font-family:Bricolage;src:url(/bricolage.woff2) format('woff2');font-weight:200 800;font-stretch:75% 100%}:root{--fuente-bricolage:Bricolage}" : ":root{--fuente-bricolage:Arial}"}</style><div id="root"></div><script>window.qaCupo=JSON.parse(new URLSearchParams(location.search).get('cupo')||'null')</script><script src="/app.js"></script>`]],
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

const TOPE = { timeout: 30000 };
async function pagina(t, cupo, ancho = 390) {
  const context = await browser.newContext({ viewport: { width: ancho, height: 844 }, deviceScaleFactor: capturas ? 2 : 1, locale: "es-MX", timezoneId: "America/Mexico_City" });
  t.after(() => context.close());
  await context.clock.setFixedTime(new Date("2026-10-07T16:00:00Z"));
  const p = await context.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  t.after(() => assert.deepEqual(errors, []));
  await p.route("**/*", (r) => (new URL(r.request().url()).origin === origin ? r.continue() : r.abort()));
  await p.goto(`${origin}/?cupo=${encodeURIComponent(JSON.stringify(cupo))}`);
  return p;
}
const fila = (p) => p.locator("li").filter({ hasText: "Lectura automática de carteles" });

test("«Quedan N este mes», con el nombre arriba y el detalle debajo, sin la palabra «gratis»", TOPE, async (t) => {
  const p = await pagina(t, { usadas: 2, tope: 6, sinTope: false });
  const f = fila(p);
  assert.equal(await f.locator("b").innerText(), "Lectura automática de carteles");
  assert.equal(await f.locator("small").innerText(), "Quedan 4 este mes");
  const [b, s] = await Promise.all([f.locator("b").boundingBox(), f.locator("small").boundingBox()]);
  assert.ok(s.y >= b.y + b.height - 2, "el detalle va debajo");
  assert.equal(await p.getByText(/gratis/i).count(), 0);
  if (capturas) {
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(300);
    await p.screenshot({ path: join(capturas, "335-10-ajustes-lecturas.png") });
  }
});

test("con ninguna dice cuándo se renueva; la administración, «Sin límite»; sin cupo, no hay renglón", TOPE, async (t) => {
  const sin = await pagina(t, { usadas: 6, tope: 6, sinTope: false });
  assert.equal(await fila(sin).locator("small").innerText(), "Se renueva el 1 de noviembre");
  const admin = await pagina(t, { usadas: 40, tope: 6, sinTope: true });
  assert.equal(await fila(admin).locator("small").innerText(), "Sin límite");
  const nada = await pagina(t, null);
  assert.equal(await fila(nada).count(), 0);
  assert.equal(await nada.locator("main ul > li").count(), 2);
});

for (const ancho of [320, 390]) {
  test(`sin desbordes a ${ancho}`, TOPE, async (t) => {
    const p = await pagina(t, { usadas: 6, tope: 6, sinTope: false }, ancho);
    const m = await p.evaluate(() => {
      const w = window.innerWidth;
      const fuera = [...document.querySelectorAll("main *")].filter((e) => {
        const c = e.getBoundingClientRect();
        return c.width && (c.right > w + 0.5 || c.left < -0.5);
      });
      return { scroll: document.documentElement.scrollWidth - w, fuera: fuera.map((e) => e.tagName) };
    });
    assert.deepEqual(m, { scroll: 0, fuera: [] });
    assert.ok((await fila(p).boundingBox()).height >= 52);
  });
}
