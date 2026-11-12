/**
 * La hoja de «Publicar en Instagram» de la ficha de un artista o de un lugar (OL-515): el componente de verdad (`HojaFicha`, con los mandos que
 * comparte con la hoja de un día de la semana, `MandosPublicacion`) en Chromium a 390×844, con las acciones del servidor de doble.
 *   · nunca ha salido: la tarjeta sin «de la semana» (`rotulo=0`), a quién etiqueta, la ubicación, el texto y Facebook; «Publicar ahora» manda el
 *     pedido de la hoja y cierra;
 *   · quitar la etiqueta, apagar Facebook y escribir el texto: el pedido los lleva; «Volver al texto del sistema» lo devuelve;
 *   · la historia 9:16: su vista previa y que no lleva texto;
 *   · ya salió (y la semana la tiene programada): lo dice; «Publicar otra vez» pide confirmar, «Mejor no» vuelve y «Sí, publicar otra vez» manda
 *     `repetir`;
 *   · va en camino: lo dice y no hay botón; no se puede (dijo que no): la frase y sin botón;
 *   · OL-516: con dos eventos esta semana, «Sale con 3 imágenes…», las tres en la tira (la tarjeta y sus eventos, de la ruta con `imagen=n`) y el
 *     texto con cada evento y su día; en la historia, que lleva la tarjeta sola.
 * Capturas: `CAPTURAS=<carpeta>`.
 */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const capturas = process.env.CAPTURAS;
let dir, server, browser, origin;

const acciones = `
  const apuntar = (nombre, args) => window.qa.acciones.push([nombre, ...JSON.parse(JSON.stringify(args))]);
  export async function prepararFicha(...a) { apuntar('prepararFicha', a); return JSON.parse(JSON.stringify(window.qa.ficha)); }
  export async function publicarFicha(...a) { apuntar('publicarFicha', a); return window.qa.ficha.en?.salio && !a[3] ? { ok: false, repetido: window.qa.ficha.en.salio } : { ok: true }; }
`;
const mocks = {
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link({prefetch,replace,scroll,...p}){return React.createElement('a',p)}",
  "next/navigation": "export const useRouter=()=>({push(){},refresh(){},back(){},replace(){}});export const usePathname=()=>'/lugares/teatro-rino';export const useSearchParams=()=>new URLSearchParams();",
  "@/app/admin/instagram/accionesFicha": acciones,
};

const AHORA = "2026-11-12T18:00:00.000Z";
const DATOS = { nombre: "Teatro El Rino", slug: "teatro-rino", descripcion: "Sala de teatro independiente en el Centro, con temporadas propias y de compañías invitadas, funciones para familias y talleres de actuación.", tipo: "foro", ciudad: "San Luis Potosí", direccion: "Calle Universidad 1250", redes: [{ url: "https://www.instagram.com/teatrorino" }], semana: [] };
const LUGAR = { ok: true, tipo: "lugar", nombre: "Teatro El Rino", contenido: { tipo: "lugar", datos: DATOS, cuenta: "teatrorino", credito: null }, ubicacion: { nombre: "San Luis Potosí" }, ciudad: { nombre: "San Luis Potosí" }, en: { salio: null, publicando: false, programada: null }, ahora: AHORA };
const FICHAS = {
  nueva: LUGAR,
  salio: { ...LUGAR, en: { salio: "Salió en Instagram hace 9 días", publicando: false, programada: "el mié 18 de nov" } },
  sinCuenta: { ...LUGAR, contenido: { ...LUGAR.contenido, cuenta: null, datos: { ...DATOS, redes: [] } }, ubicacion: null },
  enCamino: { ...LUGAR, en: { salio: null, publicando: true, programada: null } },
  // OL-516: dos obras esta semana (una con dos funciones, sin cartel).
  carrusel: {
    ...LUGAR,
    contenido: {
      ...LUGAR.contenido,
      datos: {
        ...DATOS,
        semana: [
          { titulo: "Aires revolucionarios", inicio: "2026-11-14T01:30:00Z", zona: "America/Mexico_City", funciones: [{ inicio: "2026-11-14T01:30:00Z", fin: null }] },
          { titulo: "Awkward Latino, de Disco Bamba", inicio: "2026-11-15T02:00:00Z", zona: "America/Mexico_City", funciones: [{ inicio: "2026-11-15T02:00:00Z", fin: null }, { inicio: "2026-11-16T01:00:00Z", fin: null }] },
        ],
      },
    },
    carrusel: { titulos: ["Teatro El Rino", "Aires revolucionarios", "Awkward Latino, de Disco Bamba"], eventos: 2 },
  },
  fuera: { ok: false, mensaje: "Dijo que no a salir en Instagram. Se vuelve a poner desde «Fuera de Instagram», en este mismo menú." },
};
const ID = "eeee0000-0000-4000-8000-000000000515";

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "hoja-ficha-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    define: { "process.env": "{}" },
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: join(root, "src/components/instagram"),
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import HojaFicha from './HojaFicha';
      import '../../app/globals.css';
      window.qa = { acciones: [], cerrada: 0, publicado: 0, ficha: window.FICHA };
      function App() {
        const [abierta, setAbierta] = React.useState(true);
        return <main><h1>Teatro El Rino</h1>{abierta && <HojaFicha tipo="lugar" id="${ID}" onCerrar={() => { window.qa.cerrada++; setAbierta(false); }} onPublicado={() => window.qa.publicado++} />}</main>;
      }
      createRoot(document.getElementById('root')).render(<App />);
    `,
    },
    plugins: [
      {
        name: "dobles",
        setup(b) {
          b.onResolve({ filter: /.*/ }, (a) => (a.path in mocks ? { path: a.path, namespace: "mock" } : undefined));
          b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({ contents: mocks[a.path], loader: "js", resolveDir: root }));
        },
      },
    ],
  });
  const assets = new Map([
    ["/app.js", ["text/javascript", await readFile(join(dir, "app.js"))]],
    ["/app.css", ["text/css", await readFile(join(dir, "app.css"))]],
  ]);
  const PIXEL = Buffer.from("/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==", "base64");
  server = createServer((req, res) => {
    const ruta = req.url.split("?")[0];
    if (ruta.startsWith("/api/instagram/ficha/")) {
      res.writeHead(200, { "Content-Type": "image/jpeg" });
      return res.end(PIXEL);
    }
    if (ruta === "/") {
      const cual = new URL(req.url, "http://x").searchParams.get("ficha") ?? "nueva";
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(`<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--fuente-bricolage:Arial}</style><div id="root"></div><script>window.FICHA=${JSON.stringify(FICHAS[cual])}</script><script src="/app.js"></script>`);
    }
    const a = assets.get(ruta);
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

async function abrir(t, cual = "nueva") {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce", deviceScaleFactor: capturas ? 2 : 1 });
  t.after(() => context.close());
  const p = await context.newPage();
  p.setDefaultTimeout(5000);
  const errores = [];
  p.on("pageerror", (e) => errores.push(e.message));
  t.after(() => assert.deepEqual(errores, []));
  await p.goto(`${origin}/?ficha=${cual}`);
  await p.getByRole("dialog").waitFor();
  await p.waitForFunction(() => !document.querySelector('[aria-label="Preparando la vista previa"]'));
  return p;
}
async function tocar(p, l) {
  await l.first().evaluate((e) => e.scrollIntoView({ block: "center" }));
  const b = await l.first().boundingBox();
  await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
}
const qa = (p) => p.evaluate(() => window.qa);
const texto = (l) => l.innerText().then((x) => x.replace(/\s+/g, " ").trim());
const hoja = (p) => p.getByRole("dialog").last();
const campo = (p) => hoja(p).locator('[name="texto"]').first().inputValue();
const publicadas = async (p) => (await qa(p)).acciones.filter((a) => a[0] === "publicarFicha");
const captura = async (p, nombre) => capturas && p.screenshot({ path: join(capturas, `${nombre}.png`) });

test("nunca ha salido: la tarjeta sin «de la semana», a quién etiqueta, la ubicación, el texto y Facebook; «Publicar ahora» manda el pedido y cierra", async (t) => {
  const p = await abrir(t);
  const h = hoja(p);
  assert.equal(await h.getAttribute("aria-label"), "Publicar en Instagram");
  const img = h.getByRole("img", { name: "Tarjeta: Teatro El Rino" });
  assert.match(await img.getAttribute("src"), new RegExp(`^/api/instagram/ficha/${ID}\\?tipo=lugar&formato=4x5&rotulo=0$`));
  const todo = await texto(h);
  assert.match(todo, /Sale ahora en @smsnstrsapp, con su historia\./);
  assert.match(todo, /Se etiqueta en la foto y se menciona en el texto:/);
  assert.match(todo, /Ubicación: San Luis Potosí/);
  assert.equal(await h.getByRole("button", { name: "Quitar @teatrorino" }).count(), 1, "la etiqueta con su ✕");
  assert.equal(await h.getByRole("checkbox", { name: /También en Facebook/ }).getAttribute("aria-checked"), "true");
  assert.match(await campo(p), /^Lee su ficha en somosnosotrxs\.org\/lugares\/teatro-rino \(enlace en la bio\)\.$/m, "el texto que arma el sistema, como el trabajador");
  assert.match(await campo(p), /^Más en @teatrorino$/m);
  const boton = h.getByRole("button", { name: "Publicar ahora" });
  assert.ok((await boton.boundingBox()).height >= 44);
  await tocar(p, boton);
  await p.waitForFunction(() => window.qa.cerrada === 1);
  assert.deepEqual(await publicadas(p), [["publicarFicha", "lugar", ID, { texto: null, quitadas: [], facebook: true }, false]]);
  assert.equal((await qa(p)).publicado, 1, "la ficha se entera");
});

test("quitar la etiqueta, apagar Facebook y escribir el texto: el pedido los lleva; «Volver al texto del sistema» lo devuelve", async (t) => {
  const p = await abrir(t);
  await tocar(p, hoja(p).getByRole("button", { name: "Quitar @teatrorino" }));
  await hoja(p).getByRole("button", { name: "Volver a etiquetar" }).waitFor();
  assert.match(await texto(hoja(p)), /Sin etiquetas\./);
  assert.doesNotMatch(await campo(p), /@teatrorino/, "sin la cuenta, el texto no la menciona");
  await tocar(p, hoja(p).getByRole("checkbox", { name: /También en Facebook/ }));
  // El texto: se abre a pantalla completa (ui/CampoLargo), se escribe y «Listo».
  await tocar(p, hoja(p).getByRole("button", { name: "Texto de la publicación" }));
  const area = p.getByRole("dialog", { name: "Texto de la publicación" }).locator("textarea");
  await area.fill("Esta noche, teatro en el Rino.");
  await captura(p, "hoja-ficha-texto");
  await tocar(p, p.getByRole("button", { name: "Listo" }));
  await hoja(p).getByRole("button", { name: "Volver al texto del sistema" }).waitFor();
  await tocar(p, hoja(p).getByRole("button", { name: "Publicar ahora" }));
  await p.waitForFunction(() => window.qa.cerrada === 1);
  assert.deepEqual(await publicadas(p), [["publicarFicha", "lugar", ID, { texto: "Esta noche, teatro en el Rino.", quitadas: ["teatrorino"], facebook: false }, false]]);

  const p2 = await abrir(t);
  await tocar(p2, hoja(p2).getByRole("button", { name: "Texto de la publicación" }));
  await p2.getByRole("dialog", { name: "Texto de la publicación" }).locator("textarea").fill("Otro texto");
  await tocar(p2, p2.getByRole("button", { name: "Listo" }));
  await tocar(p2, hoja(p2).getByRole("button", { name: "Volver al texto del sistema" }));
  assert.match(await campo(p2), /^Más en @teatrorino$/m, "vuelve el texto del sistema");
  assert.equal(await hoja(p2).getByRole("button", { name: "Volver al texto del sistema" }).count(), 0);
});

test("la historia 9:16: su vista previa y que no lleva texto", async (t) => {
  const p = await abrir(t);
  await tocar(p, hoja(p).getByRole("button", { name: "Historia 9:16" }));
  const img = hoja(p).getByRole("img", { name: "Historia: Teatro El Rino" });
  assert.match(await img.getAttribute("src"), /formato=9x16&rotulo=0$/);
  assert.match(await texto(hoja(p)), /La historia sale con la publicación y dura 24 horas: no lleva texto\./);
  assert.equal(await hoja(p).getByRole("button", { name: "Texto de la publicación" }).count(), 0);
});

test("sin Instagram en su ficha ni ubicación: lo dice", async (t) => {
  const p = await abrir(t, "sinCuenta");
  const todo = await texto(hoja(p));
  assert.match(todo, /Este lugar no tiene Instagram en su ficha: sale sin etiqueta y sin crédito\./);
  assert.match(todo, /Sin ubicación: falta la de San Luis Potosí en Ciudades\./);
});

test("ya salió: lo dice (y que la semana ya la tiene programada); «Publicar otra vez» pide confirmar, «Mejor no» vuelve y «Sí, publicar otra vez» manda `repetir`", async (t) => {
  const p = await abrir(t, "salio");
  const todo = await texto(hoja(p));
  assert.match(todo, /Salió en Instagram hace 9 días\. Sale ahora en @smsnstrsapp/);
  assert.match(todo, /ya la tiene programada para el mié 18 de nov/);
  await tocar(p, hoja(p).getByRole("button", { name: "Quitar @teatrorino" }));
  await tocar(p, hoja(p).getByRole("button", { name: "Publicar otra vez" }));
  await p.getByRole("dialog", { name: "¿Publicar otra vez a Teatro El Rino?" }).waitFor();
  assert.match(await texto(hoja(p)), /Salió en Instagram hace 9 días\. Sale ahora, con lo que su ficha dice hoy\. La publicación anterior sigue en Instagram: si ya no la quieres, se borra desde la cuenta\./);
  assert.equal((await publicadas(p)).length, 0, "todavía no se pidió");
  await tocar(p, hoja(p).getByRole("button", { name: "Mejor no" }));
  await p.getByRole("dialog", { name: "Publicar en Instagram" }).waitFor();
  await hoja(p).getByRole("button", { name: "Volver a etiquetar" }).waitFor();
  await tocar(p, hoja(p).getByRole("button", { name: "Publicar otra vez" }));
  await tocar(p, hoja(p).getByRole("button", { name: "Sí, publicar otra vez" }));
  await p.waitForFunction(() => window.qa.cerrada === 1);
  assert.deepEqual(await publicadas(p), [["publicarFicha", "lugar", ID, { texto: null, quitadas: ["teatrorino"], facebook: true }, true]], "lo que se decidió antes de confirmar sigue");
});

test("va en camino: lo dice y no hay botón ni mandos; si no se puede (dijo que no), la frase y sin botón", async (t) => {
  const p = await abrir(t, "enCamino");
  assert.match(await texto(hoja(p)), /Ya se está publicando\. Te avisamos en el teléfono cuando salga\./);
  assert.equal(await hoja(p).getByRole("button", { name: /Publicar/ }).count(), 0);
  assert.equal(await hoja(p).getByRole("button", { name: "Texto de la publicación" }).count(), 0);
  const otro = await abrir(t, "fuera");
  assert.match(await texto(hoja(otro).getByRole("alert")), /Dijo que no a salir en Instagram\./);
  assert.equal(await hoja(otro).getByRole("button", { name: /Publicar/ }).count(), 0);
});

test("OL-516: con eventos esta semana, la hoja enseña las tres imágenes que saldrán y el texto los nombra con su día; la historia, la tarjeta sola", async (t) => {
  const p = await abrir(t, "carrusel");
  const h = hoja(p);
  assert.match(await texto(h), /Sale con 3 imágenes: su tarjeta y sus 2 eventos de esta semana\./);
  const tira = h.getByRole("list", { name: "Imágenes del carrusel" });
  const minis = tira.getByRole("img");
  assert.equal(await minis.count(), 3);
  assert.deepEqual(await minis.evaluateAll((xs) => xs.map((x) => [x.getAttribute("alt"), x.getAttribute("src")])), [
    ["1: su tarjeta (Teatro El Rino)", `/api/instagram/ficha/${ID}?tipo=lugar&imagen=0&mini=1&rotulo=0`],
    ["2: Aires revolucionarios", `/api/instagram/ficha/${ID}?tipo=lugar&imagen=1&mini=1&rotulo=0`],
    ["3: Awkward Latino, de Disco Bamba", `/api/instagram/ficha/${ID}?tipo=lugar&imagen=2&mini=1&rotulo=0`],
  ]);
  // La tira se desliza dentro de la hoja, nunca la página.
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  assert.match(await campo(p), /^Esta semana:\nVie 13 · 7:30 pm · Aires revolucionarios\nSáb 14, 8:00 pm y dom 15, 7:00 pm · Awkward Latino, de Disco Bamba$/m);
  await tira.evaluate((e) => e.scrollIntoView({ block: "center" }));
  await captura(p, "hoja-ficha-carrusel");
  await tocar(p, h.getByRole("button", { name: "Historia 9:16" }));
  assert.match(await texto(h), /La historia lleva solo su tarjeta\./);
  assert.equal(await h.getByRole("list", { name: "Imágenes del carrusel" }).count(), 0);
  await tocar(p, h.getByRole("button", { name: "Publicación 4:5" }));
  await tocar(p, h.getByRole("button", { name: "Publicar ahora" }));
  const [, tipo, id, pedido] = (await publicadas(p))[0];
  assert.deepEqual([tipo, id, pedido], ["lugar", ID, { texto: null, quitadas: [], facebook: true }]);
});

test("OL-516: sin eventos esta semana, ni la línea ni la tira (la tarjeta sola, como antes)", async (t) => {
  const p = await abrir(t);
  const h = hoja(p);
  assert.doesNotMatch(await texto(h), /Sale con \d imágenes/);
  assert.equal(await h.getByRole("list", { name: "Imágenes del carrusel" }).count(), 0);
});
