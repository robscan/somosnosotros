/** Los botones unificados (OL-230, bitácora 258): `BotonIcono` mide 44, 48 o 56 según su tamaño y es redondo; el
 *  relieve elevado lleva sombra y glifo violeta, el contorno un borde y el plano nada; decidido es verde con el
 *  glifo en blanco y avisa con `aria-pressed` (sin decidido no hay conmutador); con `href` es un enlace y sin él un
 *  botón que no envía formularios. `Boton` mide 48 (toque) o 44 (control), llena su caja o mide su texto, y
 *  deshabilitado o `aria-disabled` se apaga igual. `claseBoton` y `claseBotonIcono` dan el mismo dibujo a una
 *  etiqueta (lo que no puede ser un botón).
 * PLAYWRIGHT_MODULE=/ruta/playwright-core/index.mjs CHROME_EXECUTABLE=/ruta/chromium node --test este-archivo
 * (no corre con `npm test`, que solo toma `.test.ts`, como las demás `.componentes.test.mjs` del repo). */
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
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:!!window.enCamino}}export default function Link(p){return React.createElement('a',p)}",
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "botones-componentes-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import Boton, {claseBoton} from './src/components/ui/Boton';
      import BotonIcono, {claseBotonIcono} from './src/components/ui/BotonIcono';
      import {IconoBuscar} from './src/components/ui/Iconos';
      import './src/app/globals.css';
      const g = <IconoBuscar width={22} height={22} />;
      function App() {
        return (
          <div style={{ width: 300, display: 'grid', gap: 8, justifyItems: 'start', padding: 8 }}>
            <BotonIcono aria-label="control">{g}</BotonIcono>
            <BotonIcono tamano="accion" aria-label="accion">{g}</BotonIcono>
            <BotonIcono tamano="grande" aria-label="grande">{g}</BotonIcono>
            <BotonIcono relieve="elevado" aria-label="elevado">{g}</BotonIcono>
            <BotonIcono relieve="contorno" aria-label="contorno">{g}</BotonIcono>
            <BotonIcono relieve="elevado" tamano="accion" decidido aria-label="decidido">{g}</BotonIcono>
            <BotonIcono relieve="elevado" tamano="accion" decidido={false} aria-label="por decidir">{g}</BotonIcono>
            <BotonIcono href="/x" aria-label="enlace">{g}</BotonIcono>
            <BotonIcono aria-label="apagado" disabled>{g}</BotonIcono>
            <span className={claseBotonIcono({ tamano: 'grande', relieve: 'elevado' })} data-id="etiqueta-icono">{g}</span>
            <Boton>Guardar</Boton>
            <Boton variante="secundario" alto="control" ancho="contenido" forma="pildora">Ver más</Boton>
            <Boton variante="peligro" ancho="contenido">Borrar</Boton>
            <Boton variante="texto" ancho="contenido">Cambiar</Boton>
            <Boton href="/y" ancho="contenido">Entrar</Boton>
            <Boton aria-disabled="true" ancho="contenido">Falta el nombre</Boton>
            <Boton disabled ancho="contenido">Guardando</Boton>
            <Boton aria-busy="true" ancho="contenido">Enviando</Boton>
            <span className={claseBoton({ variante: 'secundario', forma: 'pildora', alto: 'control', ancho: 'contenido' })} data-id="etiqueta-boton">Probar con otra foto</span>
          </div>
        );
      }
      createRoot(document.getElementById('root')).render(<App />);
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
    ["/", ["text/html", '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--fuente-bricolage:Arial}</style><div id="root"></div><script src="/app.js"></script>']],
    ["/app.js", ["text/javascript", await readFile(join(dir, "app.js"))]],
    ["/app.css", ["text/css", await readFile(join(dir, "app.css"))]],
  ]);
  server = createServer((req, res) => {
    const a = assets.get(req.url);
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

/** `enCamino`: el servidor todavía no responde al toque de un enlace (lo que dice `useLinkStatus`). */
async function pagina(t, { enCamino = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  t.after(() => context.close());
  const p = await context.newPage();
  p.setDefaultTimeout(5000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  t.after(() => assert.deepEqual(errors, []));
  if (enCamino) await p.addInitScript(() => (window.enCamino = true));
  await p.goto(origin);
  await p.getByRole("button", { name: "control" }).waitFor();
  return p;
}

/** Medidas y estilos de un elemento, ya calculados por el navegador. */
function medir(loc) {
  return loc.evaluate((e) => {
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    const svg = e.querySelector("svg");
    return {
      ancho: Math.round(r.width * 10) / 10,
      alto: Math.round(r.height * 10) / 10,
      radio: cs.borderRadius,
      fondo: cs.backgroundColor,
      color: cs.color,
      glifo: svg ? getComputedStyle(svg).color : null,
      sombra: cs.boxShadow,
      borde: cs.borderTopColor,
      opacidad: cs.opacity,
      etiqueta: e.tagName,
    };
  });
}

test("BotonIcono: tres tamaños (44, 48 y 56) y redondo", async (t) => {
  const p = await pagina(t);
  for (const [nombre, lado] of [["control", 44], ["accion", 48], ["grande", 56]]) {
    const m = await medir(p.getByRole("button", { name: nombre }));
    assert.equal(m.ancho, lado, nombre);
    assert.equal(m.alto, lado, nombre);
    assert.equal(m.radio, "50%", nombre);
  }
});

test("BotonIcono: plano es transparente; elevado, blanco con sombra y glifo violeta; contorno, con borde", async (t) => {
  const p = await pagina(t);
  const plano = await medir(p.getByRole("button", { name: "control" }));
  assert.equal(plano.fondo, "rgba(0, 0, 0, 0)");
  assert.equal(plano.sombra, "none");
  const elevado = await medir(p.getByRole("button", { name: "elevado" }));
  assert.equal(elevado.fondo, "rgb(255, 255, 255)");
  assert.notEqual(elevado.sombra, "none");
  assert.equal(elevado.glifo, "rgb(109, 52, 200)");
  const contorno = await medir(p.getByRole("button", { name: "contorno" }));
  assert.equal(contorno.fondo, "rgb(255, 255, 255)");
  assert.equal(contorno.borde, "rgb(220, 220, 216)");
  assert.equal(contorno.sombra, "none");
});

test("BotonIcono decidido: verde con el glifo blanco y aria-pressed; sin decidido, no es conmutador", async (t) => {
  const p = await pagina(t);
  const decidido = p.getByRole("button", { name: "decidido" });
  const m = await medir(decidido);
  assert.equal(m.fondo, "rgb(31, 111, 67)");
  assert.equal(m.glifo, "rgb(255, 255, 255)");
  assert.equal(m.ancho, 48);
  assert.equal(await decidido.getAttribute("aria-pressed"), "true");
  const pendiente = p.getByRole("button", { name: "por decidir" });
  assert.equal(await pendiente.getAttribute("aria-pressed"), "false");
  assert.equal((await medir(pendiente)).fondo, "rgb(255, 255, 255)");
  assert.equal(await p.getByRole("button", { name: "control" }).getAttribute("aria-pressed"), null);
});

test("BotonIcono: un botón que no envía formularios; con href, un enlace; apagado, a 55 %", async (t) => {
  const p = await pagina(t);
  assert.equal(await p.getByRole("button", { name: "control" }).getAttribute("type"), "button");
  const enlace = p.getByRole("link", { name: "enlace" });
  assert.equal(await enlace.getAttribute("href"), "/x");
  assert.equal((await medir(enlace)).ancho, 44);
  assert.equal((await medir(p.getByRole("button", { name: "apagado" }))).opacidad, "0.55");
});

test("Boton: 48 de toque y 44 de control; completo llena su caja y contenido mide su texto", async (t) => {
  const p = await pagina(t);
  const guardar = await medir(p.getByRole("button", { name: "Guardar" }));
  assert.equal(guardar.alto, 48);
  assert.equal(guardar.ancho, 284); // la caja de 300 menos el relleno de 8 por lado
  assert.equal(guardar.fondo, "rgb(109, 52, 200)");
  const verMas = await medir(p.getByRole("button", { name: "Ver más" }));
  assert.equal(verMas.alto, 44);
  assert.ok(verMas.ancho < 140, `mide ${verMas.ancho}`);
  assert.equal(verMas.radio, "999px");
  const borrar = await medir(p.getByRole("button", { name: "Borrar" }));
  assert.equal(borrar.alto, 48);
  assert.equal(borrar.color, "rgb(179, 38, 30)");
  const texto = await medir(p.getByRole("button", { name: "Cambiar" }));
  assert.equal(texto.alto, 44);
  assert.equal(texto.fondo, "rgba(0, 0, 0, 0)");
  const entrar = await medir(p.getByRole("link", { name: "Entrar" }));
  assert.equal(entrar.alto, 48);
  assert.equal(entrar.etiqueta, "A");
});

test("Boton deshabilitado o con aria-disabled se apaga igual", async (t) => {
  const p = await pagina(t);
  assert.equal((await medir(p.getByRole("button", { name: "Falta el nombre" }))).opacidad, "0.55");
  assert.equal((await medir(p.getByRole("button", { name: "Guardando" }))).opacidad, "0.55");
});

test("Boton enlace: mientras el servidor no responde late; un botón, solo con aria-busy", async (t) => {
  const quieto = await pagina(t);
  assert.equal(await quieto.getByRole("link", { name: "Entrar" }).evaluate((e) => getComputedStyle(e).animationName), "none");
  const enCamino = await pagina(t, { enCamino: true });
  const entrar = enCamino.getByRole("link", { name: "Entrar" });
  assert.notEqual(await entrar.evaluate((e) => getComputedStyle(e).animationName), "none");
  assert.equal((await medir(entrar)).ancho > 0, true); // el marcador no ocupa sitio
  assert.equal(await enCamino.getByRole("button", { name: "Guardar" }).evaluate((e) => getComputedStyle(e).animationName), "none");
  assert.notEqual(await quieto.getByRole("button", { name: "Enviando" }).evaluate((e) => getComputedStyle(e).animationName), "none");
});

test("las clases de una etiqueta dan el mismo dibujo (lo que no puede ser un botón)", async (t) => {
  const p = await pagina(t);
  const icono = await medir(p.locator('[data-id="etiqueta-icono"]'));
  assert.equal(icono.ancho, 56);
  assert.equal(icono.radio, "50%");
  assert.equal(icono.glifo, "rgb(109, 52, 200)");
  const boton = await medir(p.locator('[data-id="etiqueta-boton"]'));
  assert.equal(boton.alto, 44);
  assert.equal(boton.radio, "999px");
  assert.equal(boton.fondo, "rgb(255, 255, 255)");
});
