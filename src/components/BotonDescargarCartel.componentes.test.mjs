/** OL-304 (bitácora 332) y OL-317 (bitácora 344): «Descargar el cartel» (web) / «Guardar en Fotos» (app). Bundle real (esbuild) de `BotonDescargarCartel.tsx` con Chrome real vía Playwright; la ruta
 *  `/api/cartel/[id]` la simula `page.route` (con su `Content-Disposition`) y `navigator.share` lo pone la prueba para comprobar que el botón YA NO lo usa (la web descarga; compartir es «Compartir»). No corre con `npm test`; se corre con `npm run test:componentes`.
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
/** Un PNG de 1×1: lo que «entrega» la ruta. */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "descargar-cartel-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    // `next/link` (que traen `Boton` y `Ficha`, para la escena de la ficha) no hace falta aquí: un enlace de verdad.
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
      import BotonDescargarCartel from './src/components/BotonDescargarCartel';import './src/app/globals.css';
      import ficha from './src/components/ui/Ficha.module.css';import Boton from './src/components/ui/Boton';
      import {CIRCULO} from './src/components/ui/Ficha';
      import {IconoCompartir, IconoCalendarioAgregar, IconoRuta, IconoDescarga, IconoOk, IconoEstrella} from './src/components/ui/Iconos';
      const q = new URLSearchParams(location.search);
      // La ficha de verdad (clases y piezas reales): la fila de acciones en círculo con «Cartel» y las pastillas flotantes «Me interesa · Voy».
      const Escena = () => (
        <main style={{ minHeight: '100dvh', paddingTop: 120 }}>
          <div className={ficha.cuerpo} style={{ '--gutter': '16px' }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.05 }}>Lectura en voz alta</h1>
          <div className={ficha.acciones}>
            <button type="button" className={ficha.accion}><span className={CIRCULO}><IconoCompartir /></span>Compartir</button>
            <button type="button" className={ficha.accion}><span className={CIRCULO}><IconoCalendarioAgregar width={24} height={24} /></span>A mi calendario</button>
            <button type="button" className={ficha.accion}><span className={CIRCULO}><IconoRuta /></span>Cómo llegar</button>
            <BotonDescargarCartel id="lectura-ab12" className={ficha.accion} icono={<span className={CIRCULO}><IconoDescarga /></span>} iconoListo={<span className={CIRCULO}><IconoOk /></span>} corto />
          </div>
          </div>
          <div className={ficha.flotantes} data-flotantes style={{ position: 'fixed', bottom: 16, left: 0, right: 0, justifyContent: 'center' }}>
            <Boton type="button" variante="secundario" ancho="contenido" flotante><IconoEstrella width={20} height={20} />Me interesa</Boton>
            <Boton type="button" ancho="contenido" flotante><IconoOk width={20} height={20} />Voy</Boton>
          </div>
        </main>
      );
      createRoot(document.getElementById('root')).render(
        q.has('escena') ? <Escena /> :
        <BotonDescargarCartel id="lectura-ab12" className="boton" icono={<b>↓</b>} iconoListo={<b>✓</b>} precargar={q.has('precargar')} corto={q.has('ficha')} />
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

/**
 * La pantalla con el botón. `hoja`: si el navegador ofrece `navigator.share` con archivos (el iPhone): el botón no debe usarla nunca.
 * `fotos` (la app de iPhone con `FotosPlugin`): 'no' (Safari o Chrome: no hay `window.Capacitor`), 'ok' (guarda), 'vieja' (Capacitor sin el plugin:
 * una compilación anterior) o uno de los códigos con que rechaza el plugin (OL-332): 'permiso' (la persona negó el permiso), 'formato' (no es un
 * JPEG, PNG o WebP legible), 'tamano' (pasa los topes) o 'error' (Fotos falló por otra causa).
 * Lo que recibe el plugin queda en `window.guardadasEnFotos`. `ruta` es lo que contesta `/api/cartel/lectura-ab12`: 'ok', 'cae' (502) o
 * 'lenta' (tarda hasta que la prueba la libera).
 */
async function pagina(t, { hoja = true, ruta = "ok", fotos = "no", query = "" } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  t.after(() => context.close());
  const p = await context.newPage();
  p.setDefaultTimeout(8000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  t.after(() => assert.deepEqual(errors, []));
  p.pedidos = [];
  p.liberar = null;
  let modo = ruta;
  p.modo = (nuevo) => (modo = nuevo);
  await p.route(`${origin}/api/cartel/**`, async (r) => {
    p.pedidos.push(new URL(r.request().url()).pathname);
    if (modo === "lenta") await new Promise((seguir) => (p.liberar = seguir));
    if (modo === "cae") return r.fulfill({ status: 502, contentType: "text/plain", body: "No se pudo traer el cartel" });
    return r.fulfill({ status: 200, contentType: "image/png", headers: { "Content-Disposition": 'attachment; filename="cartel-lectura-ab12.png"' }, body: PNG });
  });
  await p.addInitScript((conHoja) => {
    window.compartidos = [];
    if (!conHoja) return;
    Object.defineProperty(navigator, "canShare", { value: () => true, configurable: true });
    Object.defineProperty(navigator, "share", { configurable: true, value: async (d) => void window.compartidos.push(d.title ?? "") });
  }, hoja);
  await p.addInitScript((modoFotos) => {
    window.guardadasEnFotos = [];
    if (modoFotos === "no") return;
    // Una compilación vieja de la app: hay Capacitor, pero sin el plugin de Fotos.
    if (modoFotos === "vieja") return void (window.Capacitor = { Plugins: {} });
    window.Capacitor = {
      Plugins: {
        Fotos: {
          guardarFoto: async (d) => {
            window.guardadasEnFotos.push({ tipo: d.tipo, base64: d.datos });
            if (modoFotos !== "ok") throw Object.assign(new Error("No se pudo guardar"), { code: modoFotos });
            return { guardado: true };
          },
        },
      },
    };
  }, fotos);
  await p.goto(`${origin}/${query}`);
  p.descargas = [];
  p.on("download", (d) => p.descargas.push(d.suggestedFilename()));
  return p;
}
const enlace = (p) => p.getByRole("link");
const texto = async (p) => (await enlace(p).innerText()).replace(/^[↓✓]\s*/, "");
/** Espera a que el botón diga exactamente eso (el icono de la prueba es «↓»). */
const dice = (p, letrero) => p.waitForFunction((x) => document.querySelector("a")?.textContent.replace(/^[↓✓]/, "") === x, letrero);
const sinHoja = async (p) => assert.deepEqual(await p.evaluate(() => window.compartidos), [], "el botón no abre la hoja de compartir");

test("en la web (aunque el navegador comparta archivos, como Safari del iPhone): «Preparando…», descarga el archivo con el nombre de la ruta, dice «Cartel descargado» y vuelve a su texto a los 2,5 s; nunca abre la hoja de compartir", TOPE, async (t) => {
  const p = await pagina(t, { ruta: "lenta" });
  assert.equal(await texto(p), "Descargar el cartel");
  assert.equal(await enlace(p).getAttribute("href"), "/api/cartel/lectura-ab12");
  await p.clock.install();
  const descarga = p.waitForEvent("download");
  await enlace(p).click();
  assert.equal(await texto(p), "Preparando…");
  assert.equal(await enlace(p).getAttribute("aria-busy"), "true");
  // Un segundo toque mientras se prepara no pide otra vez.
  await enlace(p).click();
  while (!p.liberar) await p.waitForTimeout(20);
  p.liberar();
  assert.equal((await descarga).suggestedFilename(), "cartel-lectura-ab12.png");
  await p.locator("a", { hasText: "Cartel descargado" }).waitFor();
  assert.deepEqual(p.pedidos, ["/api/cartel/lectura-ab12"]);
  await sinHoja(p);
  // La pantalla no navegó a ningún lado: sigue siendo la del botón.
  assert.equal(new URL(p.url()).pathname, "/");
  await p.clock.fastForward(2600);
  assert.equal(await texto(p), "Descargar el cartel");
});

test("en la web sin `navigator.share` se descarga igual", TOPE, async (t) => {
  const p = await pagina(t, { hoja: false });
  const [descarga] = await Promise.all([p.waitForEvent("download"), enlace(p).click()]);
  assert.equal(descarga.suggestedFilename(), "cartel-lectura-ab12.png");
  await p.locator("a", { hasText: "Cartel descargado" }).waitFor();
});

test("si la ruta falla lo dice sin sacar de la pantalla ni descargar nada, y el siguiente toque vuelve a pedirlo", TOPE, async (t) => {
  const p = await pagina(t, { ruta: "cae" });
  await enlace(p).click();
  await p.locator("a", { hasText: "No se pudo descargar" }).waitFor();
  assert.equal(new URL(p.url()).pathname, "/");
  assert.deepEqual(p.descargas, []);
  p.modo("ok");
  const descarga = p.waitForEvent("download");
  await enlace(p).click();
  await descarga;
  await p.locator("a", { hasText: "Cartel descargado" }).waitFor();
  assert.equal(p.pedidos.length, 2);
});

test("con `precargar` el cartel se pide al montarse y el toque no vuelve a pedirlo; sin `precargar`, nada se pide hasta el toque", TOPE, async (t) => {
  const p = await pagina(t, { query: "?precargar" });
  await p.waitForFunction(() => performance.getEntriesByType("resource").some((e) => e.name.includes("/api/cartel/")));
  await Promise.all([p.waitForEvent("download"), enlace(p).click()]);
  await p.locator("a", { hasText: "Cartel descargado" }).waitFor();
  assert.equal(p.pedidos.length, 1);
  const quieta = await pagina(t);
  await quieta.waitForTimeout(300);
  assert.equal(quieta.pedidos.length, 0);
});

test("en la ficha (web): letrero corto «Cartel» con el nombre completo en `aria-label` mientras está en reposo; «Preparando…» y «Descargado» sin etiqueta; «No se pudo» si falla", TOPE, async (t) => {
  const p = await pagina(t, { query: "?ficha", ruta: "lenta" });
  assert.equal(await texto(p), "Cartel");
  assert.equal(await enlace(p).getAttribute("aria-label"), "Descargar el cartel");
  const [descarga] = await Promise.all([p.waitForEvent("download"), enlace(p).click(), (async () => { while (!p.liberar) await p.waitForTimeout(20); p.liberar(); })()]);
  assert.equal(descarga.suggestedFilename(), "cartel-lectura-ab12.png");
  await dice(p, "Descargado");
  // Mientras avisa, el letrero que se lee es el aviso, no la etiqueta fija.
  assert.equal(await enlace(p).getAttribute("aria-label"), null);
  const cae = await pagina(t, { query: "?ficha", ruta: "cae" });
  await enlace(cae).click();
  await dice(cae, "No se pudo");
});

test("en la ficha (app con plugin): letrero corto «En Fotos» con «Guardar en Fotos» en `aria-label`; «Guardado» al terminar y «No se pudo» si Fotos falla", TOPE, async (t) => {
  const p = await pagina(t, { query: "?ficha", fotos: "ok" });
  assert.equal(await texto(p), "En Fotos");
  assert.equal(await enlace(p).getAttribute("aria-label"), "Guardar en Fotos");
  await enlace(p).click();
  await dice(p, "Guardado");
  assert.equal(await enlace(p).getAttribute("aria-label"), null);
  const falla = await pagina(t, { query: "?ficha", fotos: "permiso" });
  await enlace(falla).click();
  await dice(falla, "No se pudo");
});

test("en la app de iPhone con el plugin de Fotos: «Guardar en Fotos», un toque y la imagen llega al plugin (sin hoja ni descarga); «Guardado en Fotos» y vuelve a su texto a los 2,5 s", TOPE, async (t) => {
  const p = await pagina(t, { fotos: "ok", ruta: "lenta" });
  assert.equal(await texto(p), "Guardar en Fotos");
  await p.clock.install();
  await enlace(p).click();
  assert.equal(await texto(p), "Guardando…");
  while (!p.liberar) await p.waitForTimeout(20);
  p.liberar();
  await p.locator("a", { hasText: "Guardado en Fotos" }).waitFor();
  // El plugin recibió el PNG tal cual (base64 sin prefijo) y su tipo; no hubo hoja ni descarga.
  assert.deepEqual(await p.evaluate(() => window.guardadasEnFotos), [{ tipo: "image/png", base64: PNG.toString("base64") }]);
  await sinHoja(p);
  assert.deepEqual(p.descargas, []);
  await p.clock.fastForward(2600);
  assert.equal(await texto(p), "Guardar en Fotos");
});

test("en la app, si Fotos falla (permiso negado, formato o tamaño que el plugin rechaza, u otra causa): dice «No se pudo guardar»; no abre la hoja, no descarga nada ni sale de la pantalla, y el siguiente toque lo intenta otra vez", TOPE, async (t) => {
  for (const fotos of ["permiso", "formato", "tamano", "error"]) {
    const p = await pagina(t, { fotos });
    await enlace(p).click();
    await p.locator("a", { hasText: "No se pudo guardar" }).waitFor();
    await p.waitForTimeout(300);
    assert.equal((await p.evaluate(() => window.guardadasEnFotos)).length, 1);
    await sinHoja(p);
    assert.deepEqual(p.descargas, []);
    assert.equal(new URL(p.url()).pathname, "/");
    await enlace(p).click();
    await p.waitForFunction(() => window.guardadasEnFotos.length === 2);
  }
});

test("en la app con una compilación vieja (Capacitor sin el plugin de Fotos) el botón se porta como en la web: «Descargar el cartel» y descarga; nada de «Fotos»", TOPE, async (t) => {
  const p = await pagina(t, { fotos: "vieja" });
  assert.equal(await texto(p), "Descargar el cartel");
  const [descarga] = await Promise.all([p.waitForEvent("download"), enlace(p).click()]);
  assert.equal(descarga.suggestedFilename(), "cartel-lectura-ab12.png");
  await p.locator("a", { hasText: "Cartel descargado" }).waitFor();
  assert.deepEqual(await p.evaluate(() => window.guardadasEnFotos), []);
});

const aviso = (p) => p.getByRole("status");

test("OL-318, web: al terminar sale el aviso «Cartel descargado» con su palomita; el botón muestra la suya y IGNORA los toques repetidos mientras avisa; a los 2,5 s vuelve a su estado y responde otra vez", TOPE, async (t) => {
  const p = await pagina(t);
  await p.clock.install();
  await Promise.all([p.waitForEvent("download"), enlace(p).click()]);
  await aviso(p).waitFor();
  assert.equal(await aviso(p).innerText(), "Cartel descargado");
  assert.equal(await aviso(p).getAttribute("data-fallo"), null);
  // El botón: palomita en vez de la flecha y sin responder (aria-disabled, no `disabled`: el estilo no se apaga).
  await dice(p, "Cartel descargado");
  assert.equal((await enlace(p).innerText()).startsWith("✓"), true);
  assert.equal(await enlace(p).getAttribute("aria-disabled"), "true");
  assert.equal(await enlace(p).getAttribute("disabled"), null);
  // Tres toques más durante el aviso: ni una descarga ni un pedido nuevos, y nada de lo que hay en pantalla cambia.
  for (let i = 0; i < 3; i++) await enlace(p).click({ force: true }); // `force`: Playwright no toca lo que está `aria-disabled`; una persona sí
  await p.waitForTimeout(300);
  assert.equal(p.descargas.length, 1, "una sola descarga");
  assert.equal(p.pedidos.length, 1, "un solo pedido");
  assert.equal(await aviso(p).count(), 1, "un solo aviso");
  assert.equal(new URL(p.url()).pathname, "/");
  // Pasado el aviso: la flecha de siempre y vuelve a responder (guardar otra vez es a propósito).
  await p.clock.fastForward(2600);
  assert.equal(await aviso(p).count(), 0);
  assert.equal(await enlace(p).getAttribute("aria-disabled"), null);
  assert.equal((await enlace(p).innerText()).startsWith("↓"), true);
  await Promise.all([p.waitForEvent("download"), enlace(p).click()]);
  assert.equal(p.descargas.length, 2);
});

test("OL-318, app con plugin: «Cartel guardado en Fotos»; toques repetidos durante el aviso no vuelven a guardar", TOPE, async (t) => {
  const p = await pagina(t, { fotos: "ok" });
  await p.clock.install();
  await enlace(p).click();
  await aviso(p).waitFor();
  assert.equal(await aviso(p).innerText(), "Cartel guardado en Fotos");
  for (let i = 0; i < 3; i++) await enlace(p).click({ force: true }); // `force`: Playwright no toca lo que está `aria-disabled`; una persona sí
  await p.waitForTimeout(300);
  assert.equal((await p.evaluate(() => window.guardadasEnFotos)).length, 1, "el plugin recibió una sola imagen");
  assert.equal(await enlace(p).getAttribute("aria-disabled"), "true");
  await p.clock.fastForward(2600);
  await enlace(p).click();
  await p.waitForFunction(() => window.guardadasEnFotos.length === 2);
});

test("OL-318, ficha: la palomita reemplaza a la flecha, el letrero corto dice «Guardado»/«Descargado» y el aviso tiene la frase completa", TOPE, async (t) => {
  const app = await pagina(t, { query: "?ficha", fotos: "ok" });
  await enlace(app).click();
  await aviso(app).waitFor();
  assert.equal(await aviso(app).innerText(), "Cartel guardado en Fotos");
  await dice(app, "Guardado");
  assert.equal((await enlace(app).innerText()).startsWith("✓"), true);
  const web = await pagina(t, { query: "?ficha" });
  await Promise.all([web.waitForEvent("download"), enlace(web).click()]);
  await aviso(web).waitFor();
  assert.equal(await aviso(web).innerText(), "Cartel descargado");
  await dice(web, "Descargado");
});

test("OL-318, si falla: el aviso lleva la ✕ y el texto del fallo según el entorno, y el botón NO se bloquea (se puede reintentar al instante)", TOPE, async (t) => {
  const web = await pagina(t, { ruta: "cae" });
  await enlace(web).click();
  await aviso(web).waitFor();
  assert.equal(await aviso(web).innerText(), "No se pudo descargar");
  assert.equal(await aviso(web).getAttribute("data-fallo"), "true");
  assert.equal(await enlace(web).getAttribute("aria-disabled"), null);
  const app = await pagina(t, { fotos: "permiso" });
  await enlace(app).click();
  await aviso(app).waitFor();
  assert.equal(await aviso(app).innerText(), "No se pudo guardar");
  assert.equal(await aviso(app).getAttribute("data-fallo"), "true");
  assert.equal(await enlace(app).getAttribute("aria-disabled"), null);
});

test("OL-318: la app de una compilación vieja avisa «Cartel descargado» (no promete Fotos)", TOPE, async (t) => {
  const p = await pagina(t, { fotos: "vieja" });
  await Promise.all([p.waitForEvent("download"), enlace(p).click()]);
  await aviso(p).waitFor();
  assert.equal(await aviso(p).innerText(), "Cartel descargado");
});

/** Con `CAPTURAS=<carpeta>`: la ficha del evento (clases reales), antes de tocar «Cartel», con el aviso al aparecer, asentado y a punto de irse. */
test("OL-318, ficha: el aviso sube sobre las pastillas «Me interesa · Voy» y la fila de acciones no se mueve (secuencia con CAPTURAS)", TOPE, async (t) => {
  const p = await pagina(t, { query: "?escena", fotos: "ok" });
  const filaAntes = await p.locator("a[href^='/api/cartel']").boundingBox();
  const capturas = process.env.CAPTURAS;
  const sacar = async (nombre) => capturas && (await p.screenshot({ path: join(capturas, `${nombre}.png`) }));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(300);
  await sacar("347-06-ficha-app-0-antes");
  const t0 = Date.now();
  await enlace(p).click();
  await aviso(p).waitFor();
  await p.waitForTimeout(110); // a media entrada: sube y la palomita se está trazando
  await sacar("347-06-ficha-app-1-aparece");
  await p.waitForTimeout(500);
  await sacar("347-06-ficha-app-2-asentado");
  // Sobre la pastilla, sin taparla ni tapar la fila de acciones.
  const [caja, pastilla, fila] = await Promise.all([aviso(p).boundingBox(), p.locator("[data-flotantes]").boundingBox(), enlace(p).boundingBox()]);
  assert.ok(caja.y + caja.height <= pastilla.y, "el aviso termina antes de la pastilla");
  assert.ok(caja.y > fila.y + fila.height, "y queda debajo de la fila de acciones");
  assert.deepEqual({ x: fila.x, y: fila.y }, { x: filaAntes.x, y: filaAntes.y }, "la fila no se movió");
  await p.waitForTimeout(Math.max(0, 1750 - (Date.now() - t0)));
  await sacar("347-06-ficha-app-3-a-punto-de-irse");
  // Y si Fotos falla (permiso negado): la ✕ roja, el texto del fallo y el botón sin bloquear.
  const falla = await pagina(t, { query: "?escena", fotos: "permiso" });
  await falla.evaluate(() => document.fonts.ready);
  await enlace(falla).click();
  await aviso(falla).waitFor();
  await falla.waitForTimeout(450);
  assert.equal(await aviso(falla).innerText(), "No se pudo guardar");
  if (capturas) await falla.screenshot({ path: join(capturas, "347-07-ficha-app-fallo.png") });
});
