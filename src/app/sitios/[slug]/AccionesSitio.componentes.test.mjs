/** OL-366 (bitácora 397): las acciones de la ficha de un sitio en sus tres variantes, con sus estilos reales (la fila de la ficha, los círculos
 *  y el aviso de abajo de la pantalla, `PantallaConAviso`): «Agregar al directorio» si el sitio no está en el directorio; «Ver en el
 *  directorio» si ya tiene su lugar; y, para la administración, «Ligar sus eventos», que liga con un toque y lo dice en el aviso. La acción del
 *  servidor la simula la prueba (`window.qa.resultados`, `window.qa.lento`); `next/link` es un enlace de verdad. Los toques son de verdad:
 *  `page.mouse.click` en el centro del círculo y `elementFromPoint` para saber qué hay ahí.
 * PLAYWRIGHT_MODULE=/ruta/playwright-core/index.mjs node --test este-archivo   (o `npm run test:componentes`; con `FUENTE=<woff2>` la letra
 * de la app y las comprobaciones que dependen de ella, y con `CAPTURAS=<carpeta>` las capturas). */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const TOPE = { timeout: 30000 };
const capturas = process.env.CAPTURAS;
const COMO_LLEGAR = "https://www.google.com/maps/dir/?api=1&destination=22.1501,-100.9802";
const AGREGAR = "/nuevo/lugar?ciudad=san-luis-potosi&nombre=Bar+La+Oficina&lat=22.150100&lng=-100.980200&sitio=bar-la-oficina-san-luis-potosi";
const LUGAR = "/lugares/bar-la-oficina";
let dir, server, browser, origin;

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "acciones-sitio-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    plugins: [
      {
        name: "link-simple",
        setup(b) {
          b.onResolve({ filter: /^next\/link$/ }, (a) => ({ path: a.path, namespace: "simple" }));
          b.onLoad({ filter: /.*/, namespace: "simple" }, () => ({ loader: "jsx", resolveDir: root, contents: "import React from 'react'; export const useLinkStatus = () => ({ pending: false }); export default function Link({ href, children, prefetch, replace, ...p }) { return <a href={href} {...p}>{children}</a>; }" }));
        },
      },
    ],
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import AccionesSitio from './src/app/sitios/[slug]/AccionesSitio';
      import PantallaConAviso from './src/components/useCanalDeListas';
      import ficha from './src/components/ui/Ficha.module.css';
      import './src/app/globals.css';
      window.qa = { llamadas: 0, resultados: [], lento: 0, ...window.qaInicial };
      // La acción del servidor (\`ligarSitioALugar\` con el sitio y el lugar atados): tarda \`lento\` y contesta lo siguiente de \`resultados\`.
      async function ligar() {
        window.qa.llamadas++;
        await new Promise((r) => setTimeout(r, window.qa.lento));
        const r = window.qa.resultados.shift() ?? { ok: true, ligados: 1 };
        if (r === 'lanza') throw new Error('sin red');
        return r;
      }
      const v = window.qa.variante;
      const props = {
        comoLlegar: ${JSON.stringify(COMO_LLEGAR)},
        agregar: v === 'invitado' ? null : ${JSON.stringify(AGREGAR)},
        directorio: v === 'directorio' || v === 'admin' ? ${JSON.stringify(LUGAR)} : null,
        ligar: v === 'admin' ? ligar : null,
      };
      createRoot(document.getElementById('root')).render(
        <PantallaConAviso>
          <main style={{ minHeight: '100dvh', paddingTop: 220 }}>
            <div className={ficha.cuerpo} style={{ '--gutter': '16px' }}>
              <h1 style={{ fontSize: 26, fontWeight: 800 }}>Bar La Oficina</h1>
              <AccionesSitio {...props} />
            </div>
          </main>
        </PantallaConAviso>
      );
    `,
    },
  });
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

async function pagina(t, { ancho = 390, qa = {} } = {}) {
  const context = await browser.newContext({ viewport: { width: ancho, height: 844 }, reducedMotion: "reduce", deviceScaleFactor: capturas ? 2 : 1, locale: "es-MX" });
  t.after(() => context.close());
  const p = await context.newPage();
  p.setDefaultTimeout(8000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  t.after(() => assert.deepEqual(errors, []));
  await p.addInitScript((inicial) => (window.qaInicial = inicial), qa);
  await p.route("**/*", (r) => (new URL(r.request().url()).origin === origin ? r.continue() : r.abort()));
  await p.goto(origin);
  await p.locator("main a, main button").first().waitFor();
  return p;
}

/** Cada acción de la fila: qué dice, a dónde lleva, su caja y la de su círculo, y qué hay de verdad en el centro del círculo. */
const fila = (p) =>
  p.evaluate(() =>
    [...document.querySelectorAll("main a, main button")].map((el) => {
      const caja = el.getBoundingClientRect();
      const circulo = el.firstElementChild.getBoundingClientRect();
      const centro = { x: circulo.left + circulo.width / 2, y: circulo.top + circulo.height / 2 };
      const letrero = el.lastElementChild === el.firstElementChild ? null : el.lastElementChild.getBoundingClientRect();
      return {
        texto: el.innerText.replace(/\s+/g, " ").trim(),
        etiqueta: el.tagName === "A" ? "a" : "button",
        href: el.getAttribute("href"),
        caja: { x: caja.left, y: caja.top, ancho: caja.width, alto: caja.height },
        circulo: { ancho: circulo.width, alto: circulo.height, centro },
        tocaLaAccion: el.contains(document.elementFromPoint(centro.x, centro.y)),
        renglones: letrero ? Math.round(letrero.height / parseFloat(getComputedStyle(el).lineHeight)) : 1,
      };
    }),
  );
const sinDesborde = (p) => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
async function foto(p, archivo) {
  if (capturas) await p.screenshot({ path: join(capturas, `${archivo}.png`) });
}
/** Un toque de verdad en el centro del círculo de la acción que dice `texto`. */
async function tocar(p, texto) {
  const accion = (await fila(p)).find((a) => a.texto === texto);
  assert.ok(accion?.tocaLaAccion, `en el centro del círculo de «${texto}» está la acción`);
  await p.mouse.click(accion.circulo.centro.x, accion.circulo.centro.y);
}

for (const ancho of [390, 320]) {
  test(`${ancho}: sin lugar en el directorio, «Cómo llegar» y «Agregar al directorio» (con la clave del sitio), cada una con su círculo de 44 o más`, TOPE, async (t) => {
    const p = await pagina(t, { ancho, qa: { variante: "agregar" } });
    const acciones = await fila(p);
    assert.deepEqual(
      acciones.map((a) => [a.texto, a.href]),
      [
        ["Cómo llegar", COMO_LLEGAR],
        ["Agregar al directorio", AGREGAR],
      ],
    );
    for (const a of acciones) {
      assert.ok(a.circulo.ancho >= 44 && a.circulo.alto >= 44, JSON.stringify(a));
      assert.ok(a.tocaLaAccion, JSON.stringify(a));
    }
    assert.ok(await sinDesborde(p));
    // Solo con la letra real (la CI usa Arial y mide distinto): en una fila y cada letrero en dos renglones como mucho.
    if (process.env.FUENTE) {
      assert.equal(new Set(acciones.map((a) => Math.round(a.caja.y))).size, 1, JSON.stringify(acciones));
      assert.ok(acciones.every((a) => a.renglones <= 2), JSON.stringify(acciones));
    }
    if (ancho === 390) await foto(p, "acciones-1-agregar");
  });
}

test("sin sesión y sin lugar en el directorio: solo «Cómo llegar»", TOPE, async (t) => {
  const p = await pagina(t, { qa: { variante: "invitado" } });
  assert.deepEqual((await fila(p)).map((a) => a.texto), ["Cómo llegar"]);
});

test("con su lugar en el directorio: «Ver en el directorio» abre el lugar en lugar de «Agregar al directorio»; un toque de verdad lleva a su ficha", TOPE, async (t) => {
  const p = await pagina(t, { qa: { variante: "directorio" } });
  const acciones = await fila(p);
  assert.deepEqual(
    acciones.map((a) => [a.texto, a.href]),
    [
      ["Cómo llegar", COMO_LLEGAR],
      ["Ver en el directorio", LUGAR],
    ],
  );
  assert.equal(await p.getByText("Agregar al directorio").count(), 0);
  assert.equal(await p.getByText("Ligar sus eventos").count(), 0);
  await foto(p, "acciones-2-ver-en-el-directorio");
  // El servidor de la prueba no tiene la ficha del lugar: basta con ver que el toque va a ella.
  const ida = p.waitForRequest((r) => r.isNavigationRequest() && r.url() === `${origin}${LUGAR}`);
  await tocar(p, "Ver en el directorio");
  await ida;
});

for (const ancho of [390, 320]) {
  test(`${ancho}: la administración también ve «Ligar sus eventos»; un toque de verdad liga una sola vez (otro toque mientras liga no hace nada) y el aviso dice cuántos`, TOPE, async (t) => {
    const p = await pagina(t, { ancho, qa: { variante: "admin", lento: 400 } });
    const acciones = await fila(p);
    assert.deepEqual(
      acciones.map((a) => [a.texto, a.etiqueta, a.href]),
      [
        ["Cómo llegar", "a", COMO_LLEGAR],
        ["Ver en el directorio", "a", LUGAR],
        ["Ligar sus eventos", "button", null],
      ],
    );
    for (const a of acciones) assert.ok(a.circulo.ancho >= 44 && a.tocaLaAccion, JSON.stringify(a));
    assert.ok(await sinDesborde(p));
    if (process.env.FUENTE) {
      assert.equal(new Set(acciones.map((a) => Math.round(a.caja.y))).size, 1, JSON.stringify(acciones));
      assert.ok(acciones.every((a) => a.renglones <= 2), JSON.stringify(acciones));
    }
    if (ancho === 390) await foto(p, "acciones-3-admin");
    await tocar(p, "Ligar sus eventos");
    const boton = p.getByRole("button", { name: "Ligar sus eventos" });
    assert.equal(await boton.getAttribute("aria-busy"), "true");
    await tocar(p, "Ligar sus eventos");
    const aviso = p.getByRole("status").filter({ hasText: "1 evento ligado" });
    await aviso.waitFor();
    assert.equal(await p.evaluate(() => window.qa.llamadas), 1);
    assert.equal(await boton.getAttribute("aria-busy"), null);
    if (ancho === 390) await foto(p, "acciones-4-admin-ligados");
  });
}

test("el aviso dice cuántos: varios o ninguno; cada toque nuevo reemplaza al anterior", TOPE, async (t) => {
  const p = await pagina(t, { qa: { variante: "admin", resultados: [{ ok: true, ligados: 3 }, { ok: true, ligados: 0 }] } });
  await tocar(p, "Ligar sus eventos");
  await p.getByRole("status").filter({ hasText: "3 eventos ligados" }).waitFor();
  await tocar(p, "Ligar sus eventos");
  await p.getByRole("status").filter({ hasText: "Ningún evento ligado" }).waitFor();
  assert.equal(await p.getByText("3 eventos ligados").count(), 0);
});

test("si no se pudo (la base o la red), «No se pudo guardar» con Reintentar, que vuelve a ligar", TOPE, async (t) => {
  for (const fallo of [{ ok: false }, "lanza"]) {
    const p = await pagina(t, { qa: { variante: "admin", resultados: [fallo, { ok: true, ligados: 2 }] } });
    await tocar(p, "Ligar sus eventos");
    const aviso = p.getByRole("alert").filter({ hasText: "No se pudo guardar" });
    await aviso.waitFor();
    await aviso.getByRole("button", { name: "Reintentar" }).click();
    await p.getByRole("status").filter({ hasText: "2 eventos ligados" }).waitFor();
    assert.equal(await p.evaluate(() => window.qa.llamadas), 2);
  }
});
