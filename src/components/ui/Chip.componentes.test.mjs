/** El chip único (doc 50, P10): cinco papeles en una sola pieza. Los que se tocan miden 36 a la vista y 44 al tacto (su `::before`,
 *  con una prueba de toque real 3 px fuera de la caja visible); sus estados son reposo, activo, en camino y deshabilitado;
 *  `estado` y `sello` son rótulos que no se tocan; el de contexto lleva su icono, su cuenta y corta el nombre largo.
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

// `window.__enCamino` hace que todo enlace parezca esperar al servidor (`useLinkStatus`).
const mocks = {
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending: !!window.__enCamino}}export default function Link({replace, scroll, ...p}){return React.createElement('a',p)}",
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "chip-componentes-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import {Chip, ChipNativo, Chips, Cuenta} from './src/components/ui/Chip';
      import {IconoCalendario, IconoCaret, IconoFiltros, IconoPin} from './src/components/ui/Iconos';
      import './src/app/globals.css';
      const nada = () => {};
      function App() {
        return (
          <div style={{ width: 350 }}>
            <Chips ariaLabel="Uno solo"><Chip activo={false} onClick={nada}>Reposo</Chip><Chip activo onClick={nada}>Elegido</Chip><Chip disabled onClick={nada}>Apagado</Chip><Chip onClick={nada}>Todos<Cuenta n={9} /></Chip></Chips>
            <Chips ariaLabel="Envuelve" envuelve><Chip onClick={nada}>Hoy</Chip><Chip onClick={nada}>Mañana</Chip><Chip onClick={nada}>Fin de semana</Chip><Chip onClick={nada}>Esta semana</Chip><Chip onClick={nada}>Elegir fecha…</Chip><Chip onClick={nada}>Todos los próximos</Chip></Chips>
            <Chips ariaLabel="Contexto">
              <Chip variante="contexto" icono={<IconoPin width={16} height={16} />} fin={<IconoCaret width={12} height={12} />} onClick={nada}>San Luis Potosí</Chip>
              <Chip variante="contexto" icono={<IconoCalendario width={16} height={16} />} activo onClick={nada}>30 sep – 7 oct</Chip>
              <Chip variante="contexto" icono={<IconoFiltros width={16} height={16} />} cuenta={2} onClick={nada}>Filtros</Chip>
              <Chip variante="quitar" onClick={nada}>Gratis</Chip>
            </Chips>
            <div style={{ width: 150 }}><Chip variante="contexto" icono={<IconoPin width={16} height={16} />} onClick={nada}>Ciudad de un nombre larguísimo que no cabe</Chip></div>
            <p><Chip variante="estado">Te interesa</Chip> <Chip variante="sello">3 van</Chip></p>
            <p><ChipNativo tipo="time" valor="19:00" activo={false} etiqueta="19:00" onCambio={nada} ariaLabel="Hora de cierre" /></p>
            <Chips ariaLabel="Enlaces"><Chip href="/agenda">Atajo</Chip><Chip href="/agenda?x" activo>Filtro en la URL</Chip></Chips>
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

async function pagina(t, { enCamino = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  t.after(() => context.close());
  if (enCamino) await context.addInitScript(() => { window.__enCamino = true; });
  const p = await context.newPage();
  p.setDefaultTimeout(5000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  t.after(() => assert.deepEqual(errors, []));
  await p.goto(origin);
  await p.getByRole("button", { name: "Reposo" }).waitFor();
  return p;
}

const caja = (loc) => loc.evaluate((e) => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; });
/** ¿Recibe el toque 3 px arriba y 3 px abajo de su caja visible? (el área de toque llega a 44 con el `::before`) */
const tocaFuera = (loc) =>
  loc.evaluate((e) => {
    const r = e.getBoundingClientRect();
    const x = r.left + r.width / 2;
    return [document.elementFromPoint(x, r.top - 3), document.elementFromPoint(x, r.bottom + 3)].map((el) => !!el && (el === e || e.contains(el)));
  });

test("filtro: se ve de 36 y se toca de 44, en reposo y elegido", async (t) => {
  const p = await pagina(t);
  for (const nombre of ["Reposo", "Elegido"]) {
    const chip = p.getByRole("button", { name: nombre });
    assert.equal((await caja(chip)).h, 36, nombre);
    assert.deepEqual(await tocaFuera(chip), [true, true], `${nombre}: el toque llega 4 px por arriba y por abajo`);
  }
});

test("filtro: elegido va en el color de acción con letra de 600 y lo dice con aria-pressed; el de reposo, sin relleno", async (t) => {
  const p = await pagina(t);
  const estilo = (nombre) => p.getByRole("button", { name: nombre }).evaluate((b) => ({ fondo: getComputedStyle(b).backgroundColor, texto: getComputedStyle(b).color, peso: getComputedStyle(b).fontWeight, pressed: b.getAttribute("aria-pressed") }));
  assert.deepEqual(await estilo("Elegido"), { fondo: "rgb(109, 52, 200)", texto: "rgb(255, 255, 255)", peso: "600", pressed: "true" });
  assert.deepEqual(await estilo("Reposo"), { fondo: "rgb(255, 255, 255)", texto: "rgb(26, 26, 26)", peso: "400", pressed: "false" });
});

test("filtro: deshabilitado no se toca y se apaga; la cuenta va suave a su derecha", async (t) => {
  const p = await pagina(t);
  const apagado = p.getByRole("button", { name: "Apagado" });
  assert.equal(await apagado.isDisabled(), true);
  assert.equal(await apagado.evaluate((b) => getComputedStyle(b).color), "rgb(92, 92, 92)");
  const todos = p.locator("button", { hasText: /^Todos\s*9$/ });
  const partes = await todos.evaluate((b) => [...b.childNodes].map((n) => n.textContent));
  assert.deepEqual(partes, ["Todos", "9"]);
  assert.equal(await todos.getAttribute("aria-pressed"), null, "sin `activo` no es un conmutador");
  assert.equal(await todos.locator("span").evaluate((s) => getComputedStyle(s).fontSize), "14px");
});

test("una fila que envuelve deja los toques de 44 sin pisarse (36 + 8 de hueco)", async (t) => {
  const p = await pagina(t);
  const fila = await p.getByRole("group", { name: "Envuelve" }).evaluate((g) => {
    const cajas = [...g.querySelectorAll("button")].map((b) => b.getBoundingClientRect());
    const renglones = [...new Set(cajas.map((c) => Math.round(c.top)))];
    return { renglones: renglones.length, paso: renglones.length > 1 ? renglones[1] - renglones[0] : 0 };
  });
  assert.ok(fila.renglones >= 2, "los chips no caben en un renglón y pasan al de abajo");
  assert.equal(fila.paso, 44, "un renglón cada 44: los toques se tocan sin encimarse");
});

test("contexto: en negrita, con su icono y flecha, abre una hoja; con valor va activo; con cuenta lleva su círculo", async (t) => {
  const p = await pagina(t);
  const ciudad = p.getByRole("button", { name: "San Luis Potosí" });
  assert.equal(await ciudad.getAttribute("aria-haspopup"), "dialog");
  assert.equal(await ciudad.evaluate((b) => getComputedStyle(b).fontWeight), "600");
  assert.equal(await ciudad.locator("svg").count(), 2, "icono y flecha");
  assert.equal((await caja(ciudad)).h, 36);
  assert.deepEqual(await tocaFuera(ciudad), [true, true]);
  const cuando = p.getByRole("button", { name: "30 sep – 7 oct" });
  assert.equal(await cuando.evaluate((b) => getComputedStyle(b).backgroundColor), "rgb(109, 52, 200)");
  assert.equal(await cuando.locator("svg").evaluate((s) => getComputedStyle(s).color), "rgb(255, 255, 255)", "el icono toma el color del texto");
  const filtros = p.getByRole("button", { name: /Filtros/ });
  const circulo = filtros.locator(":scope > span").last();
  assert.deepEqual(await caja(circulo), { w: 20, h: 20 });
  assert.match(await filtros.innerText(), /Filtros\s*2/);
  assert.equal(await filtros.evaluate((b) => b.querySelector("span:last-child > span")?.textContent), " puestos", "el lector oye «2 puestos»");
});

test("contexto: un nombre más largo que el sitio se corta con puntos suspensivos y no se sale de su caja", async (t) => {
  const p = await pagina(t);
  const largo = p.getByRole("button", { name: /^Ciudad de un nombre/ });
  const datos = await largo.evaluate((b) => ({ ancho: Math.round(b.getBoundingClientRect().width), punto: getComputedStyle(b.querySelector("span")).textOverflow, cortado: b.querySelector("span").scrollWidth > b.querySelector("span").clientWidth }));
  assert.deepEqual(datos, { ancho: 150, punto: "ellipsis", cortado: true });
});

test("quitar: activo, con su ✕, y su nombre dice qué quita", async (t) => {
  const p = await pagina(t);
  const gratis = p.getByRole("button", { name: "Quitar Gratis" });
  await gratis.scrollIntoViewIfNeeded(); // la fila se desliza: es el cuarto chip
  assert.equal(await gratis.evaluate((b) => getComputedStyle(b).backgroundColor), "rgb(109, 52, 200)");
  assert.equal(await gratis.locator("svg").count(), 1);
  assert.equal((await caja(gratis)).h, 36);
  assert.deepEqual(await tocaFuera(gratis), [true, true]);
});

test("estado y sello son rótulos: ni se enfocan ni son botones; el estado en el tono suave de la acción, el sello en vidrio", async (t) => {
  const p = await pagina(t);
  assert.equal(await p.getByRole("button", { name: "Te interesa" }).count(), 0);
  assert.equal(await p.getByRole("button", { name: "3 van" }).count(), 0);
  const estilo = (texto) => p.getByText(texto, { exact: true }).evaluate((s) => ({ etiqueta: s.tagName, fondo: getComputedStyle(s).backgroundColor, peso: getComputedStyle(s).fontWeight, letra: getComputedStyle(s).fontSize, alto: Math.round(s.getBoundingClientRect().height) }));
  const estado = await estilo("Te interesa");
  assert.deepEqual([estado.etiqueta, estado.peso, estado.letra], ["SPAN", "700", "14px"]);
  assert.ok(!["rgb(109, 52, 200)", "rgb(255, 255, 255)", "rgba(0, 0, 0, 0)"].includes(estado.fondo), "un violeta muy suave: ni el color de acción, ni blanco, ni sin relleno");
  const sello = await estilo("3 van");
  assert.deepEqual([sello.etiqueta, sello.fondo, sello.peso], ["SPAN", "rgba(255, 255, 255, 0.92)", "700"]);
  assert.ok(sello.alto < 36 && estado.alto < 36, "los rótulos son más bajos que un chip que se toca");
});

test("nativo: el campo de hora va encima del chip, invisible y del mismo tamaño (salvo su borde), y recibe el toque", async (t) => {
  const p = await pagina(t);
  const campo = p.getByLabel("Hora de cierre");
  const datos = await campo.evaluate((i) => {
    const chip = i.parentElement.getBoundingClientRect();
    const c = i.getBoundingClientRect();
    const centro = document.elementFromPoint(chip.left + chip.width / 2, chip.top + chip.height / 2);
    const mismoTamano = Math.abs(c.width - chip.width) <= 2 && Math.abs(c.height - chip.height) <= 2; // menos el borde de 1 px por lado
    return { mismoTamano, alto: Math.round(chip.height), invisible: getComputedStyle(i).opacity, recibe: centro === i };
  });
  assert.deepEqual(datos, { mismoTamano: true, alto: 36, invisible: "0", recibe: true });
});

test("enlace: es un <a>; el que ya está puesto lo dice con aria-current", async (t) => {
  const p = await pagina(t);
  assert.equal(await p.getByRole("link", { name: "Atajo" }).getAttribute("aria-current"), null);
  assert.equal(await p.getByRole("link", { name: "Filtro en la URL" }).getAttribute("aria-current"), "true");
  assert.equal((await caja(p.getByRole("link", { name: "Atajo" }))).h, 36);
  assert.deepEqual(await tocaFuera(p.getByRole("link", { name: "Atajo" })), [true, true]);
});

test("en camino: mientras el servidor responde el enlace late con el color de acción; el marcador no ocupa sitio", async (t) => {
  const p = await pagina(t, { enCamino: true });
  const atajo = p.getByRole("link", { name: "Atajo" });
  const estilo = await atajo.evaluate((a) => ({ animacion: getComputedStyle(a).animationName !== "none", fondo: getComputedStyle(a).backgroundColor, borde: getComputedStyle(a).borderTopColor, marcador: getComputedStyle(a.querySelector("span")).display }));
  assert.equal(estilo.animacion, true);
  assert.equal(estilo.borde, "rgb(109, 52, 200)");
  assert.equal(estilo.fondo, await p.getByText("Te interesa").evaluate((s) => getComputedStyle(s).backgroundColor), "el mismo violeta suave del estado");
  assert.equal(estilo.marcador, "none");
  // Un enlace ya puesto conserva su relleno de acción mientras espera.
  assert.equal(await p.getByRole("link", { name: "Filtro en la URL" }).evaluate((a) => getComputedStyle(a).backgroundColor), "rgb(109, 52, 200)");
});
