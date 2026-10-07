/** Editar un artista (OL-316, bitácora 346): el alta es por pasos (`/nuevo/artista`, con sus pruebas en `AltaArtista.componentes.test.mjs`) y
 *  este formulario solo edita. Lo que trae la ficha llega resuelto; una ficha por completar (creada con solo el nombre desde un evento) se
 *  guarda tal cual; no hay «Soy yo» (eso es del alta). El componente real con los estilos reales, la acción simulada y sin red.
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
      const base = { id: 'a1', slug: 'pimpolina', nombre: 'Pimpolina', disciplina: 'teatro', detalle: 'Clown', tipo: 'solista', foto: null, portada: null, descripcion: 'Clown y pantomima', ciudad: 'San Luis Potosí', redes: [], creado_por: 'cuenta', visible: true, origen: null };
      const artista = new URLSearchParams(location.search).has('por-completar') ? { ...base, nombre: 'Los Vecinos', disciplina: 'por_completar', detalle: null, tipo: 'grupo', descripcion: null } : base;
      createRoot(document.getElementById('root')).render(<Formulario accion={accion} artista={artista} usuarioId="cuenta" ciudadInicial={artista.ciudad} ciudades={[]} />);
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

async function abrir(t, ancho, consulta = "") {
  const context = await browser.newContext({ viewport: { width: ancho, height: 844 }, reducedMotion: "reduce", locale: "es-MX" });
  t.after(() => context.close());
  const p = await context.newPage();
  p.setDefaultTimeout(10_000);
  const errores = [];
  p.on("pageerror", (e) => errores.push(e.message));
  t.after(() => assert.deepEqual(errores, []));
  await p.route("**/*", (r) => (new URL(r.request().url()).origin === origin ? r.continue() : r.abort()));
  await p.goto(`${origin}/${consulta}`);
  // El ancho propio de un input (20 caracteres) depende de la letra del sistema: en la CI de Linux pasaba de la tarjeta a 320. Aquí se ensancha a propósito.
  await p.evaluate(() => { document.querySelector('input[name=nombre]').size = 30; });
  const guardar = async (nombre) => capturas && p.screenshot({ path: join(capturas, `${nombre}-${ancho}.png`), fullPage: true });
  return { p, guardar };
}

/** El renglón con esa clave (que queda a la vista solo para el lector de pantalla). */
const renglon = (p, clave) => p.locator("li", { has: p.locator("small", { hasText: clave }) });
const guardarCambios = (p) => p.getByRole("button", { name: "Guardar cambios" });
/** Nada se sale de lado: devuelve null si todo cabe y, si no, qué mide la página y qué elementos pasan del borde (para que un fallo diga dónde). */
const desborde = (p) =>
  p.evaluate(() => {
    const de = document.documentElement;
    if (de.scrollWidth <= innerWidth) return null;
    const fuera = [...document.querySelectorAll("body *")].filter((e) => e.getBoundingClientRect().right > innerWidth + 0.5).slice(0, 8);
    return JSON.stringify({ scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, innerWidth, fuera: fuera.map((e) => `${e.tagName}.${e.className} ${Math.round(e.getBoundingClientRect().right)}`) });
  });

for (const ancho of [390, 320]) {
  test(`Editar: lo de la ficha llega resuelto, sin «Soy yo» (es del alta), y se guarda lo cambiado, ${ancho}`, async (t) => {
    const { p, guardar } = await abrir(t, ancho);
    assert.equal(await p.getByLabel("Nombre de artista o grupo").inputValue(), "Pimpolina");
    assert.equal(await renglon(p, "Qué hace").locator("b").innerText(), "Teatro · Clown");
    assert.equal(await renglon(p, "Es").locator("b").innerText(), "Solista");
    assert.equal(await renglon(p, "Ciudad").locator("b").innerText(), "San Luis Potosí");
    assert.equal(await p.getByText(/Soy yo/).count(), 0);
    assert.equal(await guardarCambios(p).getAttribute("aria-disabled"), null);
    assert.equal(await desborde(p), null);
    await guardar("editar");
    await renglon(p, "Es").getByRole("button", { name: "Cambiar" }).click();
    await p.getByRole("button", { name: "Grupo", exact: true }).click();
    assert.equal(await renglon(p, "Es").locator("b").innerText(), "Grupo");
    await guardarCambios(p).click();
    await p.waitForFunction(() => window.qa.envios.length === 1);
    const envio = await p.evaluate(() => window.qa.envios[0]);
    assert.deepEqual([envio.nombre, envio.disciplina, envio.detalle, envio.tipo, envio.ciudad, envio.descripcion], ["Pimpolina", "teatro", "Clown", "grupo", "San Luis Potosí", "Clown y pantomima"]);
    assert.equal(envio.soy, undefined);
    await p.getByText("No se pudo guardar. Intenta de nuevo.").waitFor();
  });
}

test("Editar una ficha por completar: el nombre no la deduce ni la exige; se guarda tal cual o con la disciplina que se elija", async (t) => {
  const { p } = await abrir(t, 390, "?por-completar");
  const hace = renglon(p, "Qué hace");
  assert.equal(await hace.locator("b").innerText(), "Disciplina");
  assert.doesNotMatch(await hace.getAttribute("class"), /pendiente/);
  assert.equal(await guardarCambios(p).getAttribute("aria-disabled"), null);
  await guardarCambios(p).click();
  await p.waitForFunction(() => window.qa.envios.length === 1);
  assert.equal(await p.evaluate(() => window.qa.envios[0].disciplina), "");
  await hace.getByRole("button", { name: "Elegir" }).click();
  await p.getByRole("button", { name: "Música", exact: true }).click();
  assert.match(await hace.locator("b").innerText(), /^Música/);
});
