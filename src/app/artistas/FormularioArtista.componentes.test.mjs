/** Alta de artista y su disciplina (OL-299, bitácora 327): sin pista en el nombre, «Qué hace» queda por elegir y es obligatorio
 *  (renglón pendiente, botón apagado con su nota); elegir un chip lo resuelve y basta; con pista, todo sigue como siempre.
 *  El componente real con los estilos reales, la acción simulada y sin red.
 * PLAYWRIGHT_MODULE=/ruta/playwright-core/index.mjs CHROME_EXECUTABLE=/ruta/chromium node --test este-archivo
 * (no corre con `npm test`, que solo toma `.test.ts`; sí con `npm run test:componentes`).
 * ARTISTA_SCREENSHOTS=/carpeta guarda las capturas de cada estado. */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const capturas = process.env.ARTISTA_SCREENSHOTS;
let dir, server, browser, origin;

const mocks = {
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link({replace, scroll, ...p}){return React.createElement('a',p)}",
  "@/components/ui/Atras": "export function useTerminar(){return ()=>{}}",
  "@/lib/supabase/navegador": "export function clienteNavegador(){return null}",
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "artista-componentes-"));
  if (capturas) await mkdir(capturas, { recursive: true });
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import Formulario from './src/app/artistas/FormularioArtista';
      import './src/app/globals.css';
      window.qa = { envios: [] };
      async function accion(_, fd) { window.qa.envios.push(Object.fromEntries(fd)); return { ok: false, errores: {}, general: 'No se pudo guardar. Intenta de nuevo.' }; }
      createRoot(document.getElementById('root')).render(<Formulario accion={accion} usuarioId="cuenta" ciudadInicial="San Luis Potosí" ciudades={[]} />);
    `,
    },
    plugins: [{
      name: "dobles",
      setup(b) {
        b.onResolve({ filter: /.*/ }, (a) => (a.path in mocks ? { path: a.path, namespace: "mock" } : undefined));
        b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({ contents: mocks[a.path], loader: "js", resolveDir: root }));
      },
    }],
  });
  const assets = new Map([
    ["/", ["text/html", '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--fuente-bricolage:Arial}</style><main style="padding:20px"><div id="root"></div></main><script src="/app.js"></script>']],
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

async function abrir(t, ancho) {
  const context = await browser.newContext({ viewport: { width: ancho, height: 844 }, reducedMotion: "reduce", locale: "es-MX" });
  t.after(() => context.close());
  const p = await context.newPage();
  p.setDefaultTimeout(10_000);
  const errores = [];
  p.on("pageerror", (e) => errores.push(e.message));
  t.after(() => assert.deepEqual(errores, []));
  await p.route("**/*", (r) => (new URL(r.request().url()).origin === origin ? r.continue() : r.abort()));
  await p.goto(origin);
  // El ancho propio de un input (20 caracteres) depende de la letra del sistema: en la CI de Linux pasaba de la tarjeta a 320. Aquí se ensancha a propósito.
  await p.evaluate(() => { document.querySelector('input[name=nombre]').size = 30; });
  const guardar = async (nombre) => capturas && p.screenshot({ path: join(capturas, `${nombre}-${ancho}.png`), fullPage: true });
  return { p, guardar };
}

/** El renglón «Qué hace» (su clave queda a la vista solo para el lector de pantalla). */
const queHace = (p) => p.locator("li", { has: p.locator("small", { hasText: "Qué hace" }) });
const publicar = (p) => p.getByRole("button", { name: "Publicar artista" });
/** Nada se sale de lado: devuelve null si todo cabe y, si no, qué mide la página y qué elementos pasan del borde (para que un fallo diga dónde). */
const desborde = (p) =>
  p.evaluate(() => {
    const de = document.documentElement;
    if (de.scrollWidth <= innerWidth) return null;
    const fuera = [...document.querySelectorAll("body *")].filter((e) => e.getBoundingClientRect().right > innerWidth + 0.5).slice(0, 8);
    return JSON.stringify({ scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, innerWidth, fuera: fuera.map((e) => `${e.tagName}.${e.className} ${Math.round(e.getBoundingClientRect().right)}`) });
  });

for (const ancho of [390, 320]) {
  test(`Sin pista en el nombre: la disciplina queda por elegir, es obligatoria y elegir un chip basta, ${ancho}`, async (t) => {
    const { p, guardar } = await abrir(t, ancho);
    // Con el formulario vacío, falta el nombre y la disciplina; el renglón ya está por completar.
    assert.equal(await publicar(p).getAttribute("aria-disabled"), "true");
    await p.getByText("Falta el nombre y la disciplina.", { exact: true }).waitFor();
    await p.getByLabel("Nombre de artista o grupo").fill("Ana Ruiz");
    await p.getByText("Falta la disciplina.", { exact: true }).waitFor();
    const renglon = queHace(p);
    assert.equal(await renglon.locator("b").innerText(), "Falta la disciplina");
    assert.match(await renglon.getAttribute("class"), /pendiente/);
    assert.equal(await renglon.getByRole("button", { name: "Elegir" }).count(), 1);
    assert.equal(await publicar(p).getAttribute("aria-disabled"), "true");
    await publicar(p).click({ force: true });
    assert.equal(await p.evaluate(() => window.qa.envios.length), 0, "apagado, no envía nada");
    assert.equal(await desborde(p), null);
    await guardar("sin-pista-falta-la-disciplina");

    // Elegir la disciplina resuelve el renglón y habilita el botón: la subcategoría no se pide.
    await renglon.getByRole("button", { name: "Elegir" }).click();
    await p.getByRole("button", { name: "Artes visuales", exact: true }).click();
    assert.doesNotMatch(await renglon.getAttribute("class"), /pendiente/);
    assert.equal(await renglon.locator("b").innerText(), "Artes visuales");
    assert.equal(await publicar(p).getAttribute("aria-disabled"), null);
    assert.equal(await p.getByText("Falta la disciplina.", { exact: true }).count(), 0);
    assert.equal(await desborde(p), null);
    await guardar("disciplina-elegida");
    await publicar(p).click();
    await p.waitForFunction(() => window.qa.envios.length === 1);
    const envio = await p.evaluate(() => window.qa.envios[0]);
    assert.equal(envio.nombre, "Ana Ruiz");
    assert.equal(envio.disciplina, "artes_visuales");
    assert.equal(envio.detalle, "");
  });

  test(`Con pista en el nombre todo sigue como hoy: la disciplina sale sola y publicar está listo, ${ancho}`, async (t) => {
    const { p, guardar } = await abrir(t, ancho);
    await p.getByLabel("Nombre de artista o grupo").fill("Ballet Folclórico Universitario");
    const renglon = queHace(p);
    assert.equal(await renglon.locator("b").innerText(), "Danza");
    assert.doesNotMatch(await renglon.getAttribute("class"), /pendiente/);
    assert.equal(await renglon.getByRole("button", { name: "Cambiar" }).count(), 1);
    assert.equal(await publicar(p).getAttribute("aria-disabled"), null);
    assert.equal(await desborde(p), null);
    await guardar("con-pista");
    await publicar(p).click();
    await p.waitForFunction(() => window.qa.envios.length === 1);
    assert.equal(await p.evaluate(() => window.qa.envios[0].disciplina), "danza");
  });

  test(`Cambiar el nombre a uno sin pista devuelve el renglón a por completar; lo elegido a mano se queda, ${ancho}`, async (t) => {
    const { p } = await abrir(t, ancho);
    const nombre = p.getByLabel("Nombre de artista o grupo");
    await nombre.fill("Cineclub Alameda");
    assert.equal(await queHace(p).locator("b").innerText(), "Cine");
    await nombre.fill("Ana Ruiz");
    assert.equal(await queHace(p).locator("b").innerText(), "Falta la disciplina");
    await queHace(p).getByRole("button", { name: "Elegir" }).click();
    await p.getByRole("button", { name: "Teatro", exact: true }).click();
    await nombre.fill("Ana Ruiz Pérez");
    assert.equal(await queHace(p).locator("b").innerText(), "Teatro");
    assert.equal(await publicar(p).getAttribute("aria-disabled"), null);
  });
}
