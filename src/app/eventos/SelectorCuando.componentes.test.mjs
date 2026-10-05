/** Cuándo del alta y la edición de un evento con sus dos hojas (OL-298, bitácora 326): una solo con el calendario (inicio y último
 *  día) y otra solo con las horas (Empieza y Termina). El componente real, con los estilos reales, sin red ni servidor.
 *  Reloj fijo: miércoles 7 de octubre de 2026, 10:00 en Ciudad de México.
 * PLAYWRIGHT_MODULE=/ruta/playwright-core/index.mjs CHROME_EXECUTABLE=/ruta/chromium node --test este-archivo
 * (no corre con `npm test`, que solo toma `.test.ts`; sí con `npm run test:componentes`). */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const capturas = process.env.CUANDO_SCREENSHOTS;
const AHORA = new Date("2026-10-07T16:00:00Z");
let dir, server, browser, origin;

const mocks = {
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link({replace, scroll, ...p}){return React.createElement('a',p)}",
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "cuando-componentes-"));
  if (capturas) await mkdir(capturas, { recursive: true });
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
      import SelectorCuando from './src/app/eventos/SelectorCuando';
      import './src/app/globals.css';
      const q = new URLSearchParams(location.search);
      window.qa = { cambios: [], sugerida: q.get('sugerida') ?? '' };
      function App() {
        const [c, setC] = useState({ inicio: q.get('inicio') ?? '', fin: q.get('fin') ?? '' });
        window.qa.estado = c;
        return <SelectorCuando inicio={c.inicio} fin={c.fin} zona="America/Mexico_City" sugeridaActual={() => window.qa.sugerida}
          onCambio={(inicio, fin) => { window.qa.cambios.push({ inicio, fin }); setC({ inicio, fin }); }} />;
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

/** Abre el componente con un inicio y un fin dados y topes de tiempo en todo (nada se cuelga por un diálogo). */
async function pagina(t, { inicio = "2026-10-07T19:00", fin = "", sugerida = "", ancho = 390, alto = 844 } = {}) {
  const context = await browser.newContext({ viewport: { width: ancho, height: alto }, reducedMotion: "reduce", locale: "es-MX", timezoneId: "America/Mexico_City" });
  t.after(() => context.close());
  await context.clock.setFixedTime(AHORA);
  const p = await context.newPage();
  p.setDefaultTimeout(5000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  t.after(() => assert.deepEqual(errors, []));
  await p.goto(`${origin}/?${new URLSearchParams({ inicio, fin, sugerida })}`);
  await p.getByText("Empieza", { exact: true }).waitFor();
  return p;
}
const estado = (p) => p.evaluate(() => window.qa.estado);
const hoja = (p) => p.getByRole("dialog");
const dia = (p, fecha) => hoja(p).locator(`[data-fecha="${fecha}"]`);
const estadoDias = (p) => hoja(p).getByRole("status").innerText();
const horaChip = (p, h, ampm) => hoja(p).getByRole("button", { name: new RegExp(`^${h}\\s*${ampm}`) });
/** La hoja entera cabe en la pantalla y no desplaza ni desborda a los lados. */
async function cabe(p) {
  const m = await p.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    const r = d.getBoundingClientRect();
    return { alto: r.height, vh: innerHeight, desplaza: d.scrollHeight > d.clientHeight + 1, doc: document.documentElement.scrollWidth, vw: innerWidth, lados: [...d.querySelectorAll("*")].filter((e) => { const b = e.getBoundingClientRect(); return b.width && (b.right > r.right + 0.5 || b.left < r.left - 0.5); }).length };
  });
  assert.ok(m.alto < m.vh, `la hoja mide ${m.alto} de ${m.vh}`);
  assert.equal(m.desplaza, false);
  // El desborde de la página entera se mide en la app compilada (aquí la letra es Arial, más ancha que Bricolage): solo la hoja.
  assert.equal(m.lados, 0);
  return m;
}

for (const [ancho, alto] of [[390, 844], [320, 640]]) {
  test(`un rango de días: inicio, último día, banda y un solo «Listo» (${ancho})`, async (t) => {
    const p = await pagina(t, { ancho, alto });
    await p.getByRole("button", { name: "7 oct 2026" }).click();
    assert.equal(await estadoDias(p), "El 7 de octubre.");
    assert.equal(await hoja(p).getByRole("button", { name: "Listo, un solo día" }).isEnabled(), true);
    await dia(p, "2026-10-09").click();
    assert.equal(await estadoDias(p), "Empieza el 9 de octubre. Si dura varios días, toca el último.");
    await dia(p, "2026-10-11").click();
    assert.equal(await estadoDias(p), "Del 9 al 11 de octubre.");
    assert.equal(await dia(p, "2026-10-10").getAttribute("aria-selected"), "true"); // la banda
    await cabe(p);
    if (capturas) await p.screenshot({ path: join(capturas, `dia-rango-${ancho}.png`) });
    // En la hoja de días no hay horas: solo el calendario.
    assert.equal(await hoja(p).getByRole("group", { name: "Hora" }).count(), 0);
    await hoja(p).getByRole("button", { name: "Listo", exact: true }).click();
    await hoja(p).waitFor({ state: "detached" });
    // Inicio el 9 a la misma hora; fin el 11 al acabar el día (sin hora de fin).
    assert.deepEqual(await estado(p), { inicio: "2026-10-09T19:00", fin: "2026-10-11T23:59" });
    assert.equal(await p.locator('input[name="inicio"]').inputValue(), "2026-10-09T19:00");
    assert.equal(await p.locator('input[name="fin"]').inputValue(), "2026-10-11T23:59");
    // El renglón: fecha de inicio, fecha de fin y «Sin hora de fin».
    await p.getByRole("button", { name: "11 oct 2026" }).waitFor();
    assert.equal(await p.getByRole("button", { name: "Sin hora de fin" }).count(), 1);
  });

  test(`la hoja de horas de Empieza cierra al elegir y no lleva «Listo» (${ancho})`, async (t) => {
    const p = await pagina(t, { ancho, alto, inicio: "2026-10-07T19:00", fin: "2026-10-07T21:00", sugerida: "2026-10-07T19:00" });
    await p.getByRole("button", { name: /^7:00\s*p/ }).click();
    assert.equal(await hoja(p).locator("h3").innerText(), "Empieza");
    assert.equal(await hoja(p).getByRole("button", { name: /Listo/ }).count(), 0);
    assert.equal(await hoja(p).locator("[role=group] button").count(), 96); // el día entero, cada 15 minutos
    assert.equal(await hoja(p).getByText("Duración").count(), 1);
    assert.equal(await hoja(p).getByText("2 horas").count(), 1);
    // Sin calendario: solo las horas.
    assert.equal(await hoja(p).locator("[role=grid]").count(), 0);
    await cabe(p);
    if (capturas) await p.screenshot({ path: join(capturas, `hora-empieza-${ancho}.png`) });
    await horaChip(p, "8:30", "p").click();
    await hoja(p).waitFor({ state: "detached" });
    // La misma duración: el fin se mueve con el inicio.
    assert.deepEqual(await estado(p), { inicio: "2026-10-07T20:30", fin: "2026-10-07T22:30" });
  });

  test(`Termina el mismo día solo ofrece horas posteriores al inicio, más «Sin hora de fin» (${ancho})`, async (t) => {
    const p = await pagina(t, { ancho, alto, inicio: "2026-10-07T19:00" });
    await p.getByRole("button", { name: "Sin hora de fin" }).click();
    assert.match(await hoja(p).locator("h3").innerText(), /^Termina \(empieza 7:00\s*p/);
    const botones = await hoja(p).locator("[role=group] button").allInnerTexts();
    assert.match(botones[0], /Sin hora de fin/);
    assert.match(botones[1], /^7:15\s*p/); // nunca la misma hora ni una anterior
    assert.match(botones.at(-1), /^11:45\s*p/);
    assert.equal(botones.length, 1 + 19);
    await cabe(p);
    if (capturas) await p.screenshot({ path: join(capturas, `hora-termina-${ancho}.png`) });
    await horaChip(p, "9:00", "p").click();
    await hoja(p).waitFor({ state: "detached" });
    assert.deepEqual(await estado(p), { inicio: "2026-10-07T19:00", fin: "2026-10-07T21:00" });
    // Y «Sin hora de fin» la quita (la ✕ también).
    await p.getByRole("button", { name: /^9:00\s*p/ }).click();
    assert.equal(await hoja(p).getByRole("button", { name: "Sin hora de fin" }).count(), 1);
    await hoja(p).getByRole("button", { name: "Sin hora de fin" }).click();
    assert.deepEqual(await estado(p), { inicio: "2026-10-07T19:00", fin: "" });
    await p.getByRole("button", { name: /^9:00\s*p/ }).waitFor({ state: "detached" });
  });
}

test("un fin anterior al inicio es imposible: tocar un día anterior vuelve a empezar desde él", async (t) => {
  const p = await pagina(t);
  await p.getByRole("button", { name: "7 oct 2026" }).click();
  await dia(p, "2026-10-14").click();
  await dia(p, "2026-10-12").click(); // anterior al inicio: no es un fin, es un inicio nuevo
  assert.equal(await estadoDias(p), "Empieza el 12 de octubre. Si dura varios días, toca el último.");
  assert.equal(await hoja(p).getByRole("button", { name: "Listo, un solo día" }).isEnabled(), true);
  await dia(p, "2026-10-13").click();
  assert.equal(await estadoDias(p), "Del 12 al 13 de octubre.");
  // Con el rango cerrado, otro toque empieza de nuevo (y tocar el mismo día no lo vacía).
  await dia(p, "2026-10-20").click();
  assert.equal(await estadoDias(p), "Empieza el 20 de octubre. Si dura varios días, toca el último.");
  await dia(p, "2026-10-20").click();
  assert.equal(await estadoDias(p), "Empieza el 20 de octubre. Si dura varios días, toca el último.");
  await hoja(p).getByRole("button", { name: "Listo, un solo día" }).click();
  assert.deepEqual(await estado(p), { inicio: "2026-10-20T19:00", fin: "" });
});

test("los días pasados están bloqueados; la ✕, Escape o tocar fuera cierran sin cambiar nada", async (t) => {
  const p = await pagina(t);
  await p.getByRole("button", { name: "7 oct 2026" }).click();
  assert.equal(await dia(p, "2026-10-06").getAttribute("aria-disabled"), "true");
  await dia(p, "2026-10-06").click({ force: true });
  assert.equal(await estadoDias(p), "El 7 de octubre.");
  await p.keyboard.press("Escape");
  await hoja(p).waitFor({ state: "detached" });
  assert.deepEqual(await p.evaluate(() => window.qa.cambios), []);
  await p.getByRole("button", { name: /^7:00\s*p/ }).click();
  await hoja(p).getByRole("button", { name: "Cerrar" }).click();
  await hoja(p).waitFor({ state: "detached" });
  assert.deepEqual(await p.evaluate(() => window.qa.cambios), []);
});

test("un evento que cruza la medianoche: 2 días en el calendario y su hora de fin en la otra hoja", async (t) => {
  const p = await pagina(t, { inicio: "2026-10-10T22:00" });
  await p.getByRole("button", { name: "10 oct 2026" }).click();
  await dia(p, "2026-10-10").click();
  await dia(p, "2026-10-11").click();
  await hoja(p).getByRole("button", { name: "Listo", exact: true }).click();
  // Varios días: la hoja de Termina ofrece todas las horas (la 1:00 de la madrugada es posterior), no solo las de la noche.
  await p.getByRole("button", { name: "Sin hora de fin" }).click();
  assert.equal(await hoja(p).locator("[role=group] button").count(), 1 + 96);
  assert.equal(await hoja(p).getByRole("button", { name: "Sin hora de fin" }).getAttribute("aria-pressed"), "true");
  await horaChip(p, "1:00", "a").click();
  assert.deepEqual(await estado(p), { inicio: "2026-10-10T22:00", fin: "2026-10-11T01:00" });
  await p.getByRole("button", { name: "11 oct 2026" }).waitFor();
  await p.getByRole("button", { name: /^1:00\s*a/ }).waitFor();
});

test("«Sin hora de fin» en un evento de varios días lo deja acabando con su último día; mover el inicio no lo toca", async (t) => {
  const p = await pagina(t, { inicio: "2026-10-10T19:00", fin: "2026-10-12T21:00" });
  await p.getByRole("button", { name: /^9:00\s*p/ }).click();
  await hoja(p).getByRole("button", { name: "Sin hora de fin" }).click();
  assert.deepEqual(await estado(p), { inicio: "2026-10-10T19:00", fin: "2026-10-12T23:59" });
  // El chip dice «Sin hora de fin» y ya no hay ✕ que quitar.
  assert.equal(await p.getByRole("button", { name: "Sin hora de fin" }).count(), 1);
  assert.equal(await p.getByRole("button", { name: "Quitar la hora de fin" }).count(), 0);
  await p.getByRole("button", { name: /^7:00\s*p/ }).click();
  await horaChip(p, "5:00", "p").click();
  assert.deepEqual(await estado(p), { inicio: "2026-10-10T17:00", fin: "2026-10-12T23:59" });
});

test("elegir «un solo día» en un evento de varios días lo deja ese día, con su hora de fin, sin arrastrar el rango", async (t) => {
  const p = await pagina(t, { inicio: "2026-10-09T20:00", fin: "2026-10-11T22:00" });
  await p.getByRole("button", { name: "9 oct 2026" }).click();
  assert.equal(await estadoDias(p), "Del 9 al 11 de octubre.");
  await dia(p, "2026-10-12").click();
  await hoja(p).getByRole("button", { name: "Listo, un solo día" }).click();
  assert.deepEqual(await estado(p), { inicio: "2026-10-12T20:00", fin: "2026-10-12T22:00" });
  await p.getByRole("button", { name: "11 oct 2026" }).waitFor({ state: "detached" });
});

test("sin día no hay hora: tocar una hora abre primero el calendario, y «Falta el día» no deja confirmar", async (t) => {
  const p = await pagina(t, { inicio: "", fin: "" });
  await p.getByRole("button", { name: "Hora", exact: true }).click();
  assert.equal(await hoja(p).locator("h3").innerText(), "¿Qué día es?");
  assert.equal(await estadoDias(p), "Toca el día en que empieza.");
  const falta = hoja(p).getByRole("button", { name: "Falta el día" });
  assert.equal(await falta.isDisabled(), true);
  if (capturas) await p.screenshot({ path: join(capturas, "dia-vacio-390.png") });
  await dia(p, "2026-10-15").click();
  await hoja(p).getByRole("button", { name: "Listo, un solo día" }).click();
  assert.deepEqual(await estado(p), { inicio: "2026-10-15T19:00", fin: "" }); // sin hora, arranca a las 19:00
});

test("editar un evento ya pasado: su día sigue elegible, otro día pasado no, y confirmar no lo cambia", async (t) => {
  const pasado = { inicio: "2026-09-20T18:00", fin: "2026-09-20T20:00" };
  const p = await pagina(t, pasado);
  await p.getByRole("button", { name: "20 sep 2026" }).first().click();
  assert.equal(await estadoDias(p), "El 20 de septiembre.");
  assert.equal(await dia(p, "2026-09-20").getAttribute("aria-disabled"), null);
  assert.equal(await dia(p, "2026-09-19").getAttribute("aria-disabled"), "true");
  await hoja(p).getByRole("button", { name: "Listo, un solo día" }).click();
  assert.deepEqual(await estado(p), pasado);
  // Su hora también se cambia como la de cualquier evento.
  await p.getByRole("button", { name: /^6:00\s*p/ }).click();
  await horaChip(p, "7:00", "p").click();
  assert.deepEqual(await estado(p), { inicio: "2026-09-20T19:00", fin: "2026-09-20T21:00" });
  // Otro día pasado no se puede tocar ni para alargarlo a un rango: solo el del evento se sigue viendo elegible.
  await p.getByRole("button", { name: "20 sep 2026" }).first().click();
  await dia(p, "2026-09-22").click({ force: true });
  assert.equal(await estadoDias(p), "El 20 de septiembre.");
  // Un día de hoy en adelante sí: el evento pasa a durar desde su día hasta ese.
  await dia(p, "2026-09-20").click();
  await hoja(p).getByRole("button", { name: "Mes siguiente" }).click();
  await dia(p, "2026-10-08").click();
  await hoja(p).getByRole("button", { name: "Listo", exact: true }).click();
  assert.deepEqual(await estado(p), { inicio: "2026-09-20T19:00", fin: "2026-10-08T21:00" });
});

test("la hora sugerida se marca distinto mientras nadie la elija y la elegida queda a la vista al abrir", async (t) => {
  const p = await pagina(t, { inicio: "2026-10-07T21:00", sugerida: "2026-10-07T21:00" });
  await p.getByRole("button", { name: /^9:00\s*p/ }).first().click();
  const elegida = horaChip(p, "9:00", "p");
  assert.equal(await elegida.getAttribute("aria-pressed"), "true");
  assert.equal(await elegida.isVisible(), true);
  const medida = await p.evaluate(() => {
    const lista = document.querySelector('[role="dialog"] [role="group"]');
    const e = [...lista.querySelectorAll("button")].find((b) => /^9:00\s*p/.test(b.textContent));
    const a = lista.getBoundingClientRect(), b = e.getBoundingClientRect();
    return { top: b.top - a.top, bottom: a.bottom - b.bottom, scrollTop: lista.scrollTop, alto: a.height };
  });
  assert.ok(medida.top >= -1 && medida.bottom >= -1, JSON.stringify(medida));
});
