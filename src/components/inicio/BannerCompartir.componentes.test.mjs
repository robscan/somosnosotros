/** OL-387: el banner para compartir la app en Inicio (prototipo firmado `inicio-propuestas.html`, «Firmada»: B1 tras Destacados, B2 con el
 *  símbolo SN; bitácora 417). Salía desde el tercer día distinto; desde OL-397 sale desde el primero y con o sin sesión (lo cuenta el teléfono, `lib/visitasInicio`), la × lo esconde 30 días con
 *  «Deshacer», «Compartir» abre la hoja del teléfono y, sin ella, copia el enlace y avisa. Lo compartido se mide (OL-388: `compartir` con
 *  `que: "app"`, por la hoja o copiado; cancelar no se mide): fuera de producción `medirCliente` solo lo escribe en consola con
 *  `NEXT_PUBLIC_MEDIR_DEPURAR=1`, y de ahí se lee. No corre con `npm test`; se corre con `npm run test:componentes`. */
import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const LLAVE = "somosnosotros:inicio-compartir";
let dir, server, browser, origin;

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "banner-compartir-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    jsx: "automatic",
    define: { "process.env.NEXT_PUBLIC_VERCEL_ENV": '"preview"', "process.env.NEXT_PUBLIC_MEDIR_DEPURAR": '"1"' },
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
        import React from 'react';import{createRoot}from'react-dom/client';
        import PantallaConAviso from './src/components/useCanalDeListas';import BannerCompartir from './src/components/inicio/BannerCompartir';import './src/app/globals.css';
        createRoot(document.getElementById('root')).render(<PantallaConAviso><h2>Destacados</h2><BannerCompartir zona='America/Mexico_City'/><h2>Tus planes</h2></PantallaConAviso>);
      `,
    },
  });
  server = createServer(async (req, res) => {
    if (req.url.startsWith("/app.")) {
      const ext = req.url.startsWith("/app.css") ? "css" : "js";
      res.setHeader("content-type", ext === "css" ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8");
      res.end(await readFile(join(dir, "app." + ext)));
    } else {
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.end('<link rel="stylesheet" href="/app.css"><div id="root"></div><script src="/app.js"></script>');
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  origin = "http://127.0.0.1:" + server.address().port;
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
  browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE ?? (process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : undefined), headless: true });
});
after(async () => {
  await browser?.close();
  await new Promise((r) => server?.close(r));
  if (dir) await rm(dir, { recursive: true, force: true });
});

/**
 * Inicio con sesión el lun 12 de oct en San Luis (zona de México). `dias`: lo que el teléfono ya tenía guardado. `hoja`: cómo responde
 * `navigator.share` («compartida», «cancelada» o null, sin hoja: escritorio). `sinAlmacen`: `localStorage` bloqueado.
 */
async function pagina(t, { dias = ["2026-10-10", "2026-10-11"], cerradoHasta = null, compartido = false, hoja = null, sinAlmacen = false } = {}) {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 } });
  t.after(() => c.close());
  await c.addInitScript(
    ({ llave, estado, hoja, sinAlmacen }) => {
      if (sinAlmacen) {
        Object.defineProperty(window, "localStorage", { get() { throw new DOMException("bloqueado", "SecurityError"); } });
      } else if (estado.dias) localStorage.setItem(llave, JSON.stringify(estado));
      window.copiado = null;
      window.compartidoCon = null;
      Object.defineProperty(navigator, "clipboard", { value: { writeText: async (t) => void (window.copiado = t) }, configurable: true });
      if (hoja) {
        navigator.share = async (datos) => {
          window.compartidoCon = datos;
          if (hoja === "cancelada") throw new DOMException("cancelado", "AbortError");
        };
      } else delete Navigator.prototype.share;
    },
    { llave: LLAVE, estado: { dias, cerradoHasta, compartido }, hoja, sinAlmacen },
  );
  const p = await c.newPage();
  const errores = [];
  p.on("pageerror", (e) => errores.push(e.message));
  // Lo que se mediría (OL-388): `[medir] <nombre> <datos> (…)` en la consola.
  p.medidas = [];
  p.on("console", async (m) => {
    if (!m.text().startsWith("[medir]")) return;
    const [, nombre, datos] = await Promise.all(m.args().map((a) => a.jsonValue()));
    p.medidas.push({ nombre, datos });
  });
  t.after(() => assert.deepEqual(errores, []));
  p.setDefaultTimeout(5000);
  await p.clock.install({ time: new Date("2026-10-12T16:00:00Z") });
  await p.goto(origin);
  await p.getByRole("heading", { name: "Tus planes" }).waitFor();
  return p;
}
/** Espera (hasta 1 s) a que llegue lo medido: la consola se lee aparte del toque. */
async function medido(p) {
  for (let i = 0; i < 50 && p.medidas.length === 0; i++) await new Promise((r) => setTimeout(r, 20));
}
const banner = (p) => p.getByRole("region", { name: "Comparte la app" });
const guardado = (p) => p.evaluate((llave) => JSON.parse(localStorage.getItem(llave)), LLAVE);
/** Toque de verdad, por coordenadas (nunca `element.click()`: un velo invisible se comería el toque). */
async function tocar(p, localizador) {
  const r = await localizador.boundingBox();
  await p.mouse.click(r.x + r.width / 2, r.y + r.height / 2);
}

test("tercer día distinto: sale tras el carril estelar, con las medidas firmadas", async (t) => {
  const p = await pagina(t);
  await banner(p).waitFor();
  assert.deepEqual((await guardado(p)).dias, ["2026-10-10", "2026-10-11", "2026-10-12"]);
  const m = await p.evaluate(() => {
    const s = document.querySelector('section[aria-label="Comparte la app"]');
    const r = s.getBoundingClientRect();
    const cs = getComputedStyle(s);
    const icono = s.querySelector("span").getBoundingClientRect();
    const svg = s.querySelector("span svg");
    const [titulo, texto] = [...s.querySelectorAll("p")];
    const cerrar = s.querySelector('button[aria-label="Cerrar"]').getBoundingClientRect();
    const boton = [...s.querySelectorAll("button")].find((b) => b.textContent === "Compartir");
    const br = boton.getBoundingClientRect();
    const fondo = getComputedStyle(document.documentElement).getPropertyValue("--primario-suave");
    return {
      lados: [Math.round(r.left), Math.round(390 - r.right)],
      arriba: cs.marginTop,
      relleno: cs.paddingTop,
      radio: cs.borderTopLeftRadius,
      icono: [icono.width, icono.height, getComputedStyle(s.querySelector("span")).borderRadius],
      simbolo: [Math.round(svg.getBoundingClientRect().width), getComputedStyle(svg).color, getComputedStyle(s.querySelector("span")).backgroundColor],
      titulo: [titulo.textContent, getComputedStyle(titulo).fontSize, getComputedStyle(titulo).fontWeight],
      texto: [texto.textContent, getComputedStyle(texto).fontSize],
      cerrar: [cerrar.width, cerrar.height, Math.round(r.right - cerrar.right), Math.round(cerrar.top - r.top)],
      boton: [Math.round(br.width), br.height, getComputedStyle(boton).borderTopLeftRadius, boton.querySelector("svg") !== null],
      tituloJuntoAlIcono: titulo.getBoundingClientRect().left > icono.right,
      botonDebajo: br.top >= icono.bottom,
      fondoSuave: fondo.length > 0,
    };
  });
  assert.deepEqual(m.lados, [20, 20], "a lo ancho con el aire de 20 de los carriles");
  assert.equal(m.arriba, "32px");
  assert.equal(m.relleno, "16px");
  assert.equal(m.radio, "12px");
  assert.deepEqual(m.icono, [44, 44, "50%"]);
  assert.deepEqual(m.simbolo, [26, "rgb(109, 52, 200)", "rgb(255, 255, 255)"], "el símbolo SN de 26, en violeta, sobre el círculo blanco");
  assert.deepEqual(m.titulo, ["¿Te gusta Somos Nosotrxs?", "18px", "800"]);
  assert.deepEqual(m.texto, ["Compártela con tus amigxs.", "15px"]);
  assert.deepEqual(m.cerrar, [36, 36, 10, 10], "la × de 36, metida 6 en la esquina");
  assert.deepEqual(m.boton, [318, 44, "999px", true], "«Compartir» a lo ancho, de 44, en píldora y con su icono");
  assert.ok(m.tituloJuntoAlIcono && m.botonDebajo);
  // Su sitio: entre el carril estelar y «Tus planes».
  const orden = await p.locator("h2, section").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? e.textContent));
  assert.deepEqual(orden, ["Destacados", "Comparte la app", "Tus planes"]);
});

test("primera visita (OL-397: para todo el mundo, desde el primer día): sale y anota el día", async (t) => {
  for (const [caso, opciones] of [
    ["primera visita", { dias: [] }],
    ["segunda visita", { dias: ["2026-10-11"] }],
  ]) {
    const p = await pagina(t, opciones);
    await banner(p).waitFor();
    assert.ok((await guardado(p)).dias.includes("2026-10-12"), caso);
  }
});

test("cerrado o ya compartido: no sale", async (t) => {
  for (const [caso, opciones] of [
    ["cerrado hasta mañana", { dias: ["2026-10-10", "2026-10-11"], cerradoHasta: "2026-10-13" }],
    ["ya compartido", { dias: ["2026-10-01", "2026-10-10", "2026-10-11"], compartido: true }],
    ["sin almacenamiento", { sinAlmacen: true }],
  ]) {
    const p = await pagina(t, opciones);
    await p.waitForTimeout(50);
    assert.equal(await banner(p).count(), 0, caso);
  }
  // El día en que termina el descanso, vuelve.
  const p = await pagina(t, { cerradoHasta: "2026-10-12" });
  await banner(p).waitFor();
});

test("la × lo quita, avisa que no vuelve en 30 días y «Deshacer» lo devuelve", async (t) => {
  const p = await pagina(t);
  await tocar(p, banner(p).getByRole("button", { name: "Cerrar" }));
  await p.getByRole("status").filter({ hasText: "Cerrado: no vuelve a salir en 30 días" }).waitFor();
  assert.equal(await banner(p).count(), 0);
  assert.equal((await guardado(p)).cerradoHasta, "2026-11-11");
  await tocar(p, p.getByRole("button", { name: "Deshacer" }));
  await banner(p).waitFor();
  assert.equal((await guardado(p)).cerradoHasta, null);
});

test("«Compartir» sin hoja (escritorio): copia somosnosotros.org, avisa «Enlace copiado» y no vuelve", async (t) => {
  const p = await pagina(t);
  await tocar(p, banner(p).getByRole("button", { name: "Compartir" }));
  await p.getByRole("status").filter({ hasText: "Enlace copiado" }).waitFor();
  assert.equal(await p.evaluate(() => window.copiado), "https://somosnosotros.org");
  assert.equal(await banner(p).count(), 0);
  assert.equal((await guardado(p)).compartido, true);
  await medido(p);
  assert.deepEqual(p.medidas, [{ nombre: "compartir", datos: { que: "app", medio: "copiado" } }], "copiar cuenta como compartir");
});

test("«Compartir» con la hoja del teléfono: compartida, se va con un aviso; cancelada, se queda", async (t) => {
  const p = await pagina(t, { hoja: "compartida" });
  await tocar(p, banner(p).getByRole("button", { name: "Compartir" }));
  await p.getByRole("status").filter({ hasText: "Gracias por compartir" }).waitFor();
  assert.deepEqual(await p.evaluate(() => window.compartidoCon), { title: "Somos Nosotrxs", text: "¿Te gusta Somos Nosotrxs? Compártela con tus amigxs.", url: "https://somosnosotros.org" });
  assert.equal(await banner(p).count(), 0);
  assert.equal((await guardado(p)).compartido, true);
  await medido(p);
  assert.deepEqual(p.medidas, [{ nombre: "compartir", datos: { que: "app", medio: "hoja" } }], "la hoja abierta y no cancelada");

  const q = await pagina(t, { hoja: "cancelada" });
  await tocar(q, banner(q).getByRole("button", { name: "Compartir" }));
  await q.waitForFunction(() => window.compartidoCon !== null);
  await q.waitForTimeout(50);
  assert.equal(await banner(q).count(), 1, "cancelar la hoja no cuenta como compartir");
  assert.equal(await q.evaluate(() => window.copiado), null);
  assert.equal((await guardado(q)).compartido, false);
  assert.deepEqual(q.medidas, [], "cancelar la hoja no se mide");
});
