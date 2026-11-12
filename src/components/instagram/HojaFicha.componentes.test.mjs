/**
 * La hoja de «Publicar en Instagram» de la ficha de un artista o de un lugar (OL-515): el componente de verdad (`HojaFicha`) en Chromium a
 * 390×844, con las acciones del servidor de doble.
 *   · nunca ha salido: la tarjeta, la nota (dónde sale y a quién etiqueta), el texto y «Publicar ahora», que pide `publicarFicha` y cierra;
 *   · ya salió: lo dice, el botón es «Publicar otra vez» y pide confirmar («Mejor no» vuelve; «Sí, publicar otra vez» manda `repetir`);
 *   · va en camino: lo dice y no hay botón; no se puede (oculta, dijo que no): la frase y sin botón.
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
  const apuntar = (nombre, args) => window.qa.acciones.push([nombre, ...args]);
  export async function prepararFicha(...a) { apuntar('prepararFicha', a); return JSON.parse(JSON.stringify(window.qa.ficha)); }
  export async function publicarFicha(...a) { apuntar('publicarFicha', a); return window.qa.ficha.en?.salio && !a[2] ? { ok: false, repetido: window.qa.ficha.en.salio } : { ok: true }; }
`;
const mocks = {
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link({prefetch,replace,scroll,...p}){return React.createElement('a',p)}",
  "next/navigation": "export const useRouter=()=>({push(){},refresh(){},back(){},replace(){}});export const usePathname=()=>'/lugares/rino';export const useSearchParams=()=>new URLSearchParams();",
  "@/app/admin/instagram/accionesFicha": acciones,
};

const TEXTO = "Conoce el Teatro El Rino, en San Luis Potosí.\n\nSala teatral independiente con temporadas propias y de compañías invitadas.\n\nSu ficha, con su agenda: somosnosotros.org/lugares/rino\nMás en @elrino_teatro\n\n#sanluispotosi #teatro";
const LUGAR = { ok: true, nombre: "Teatro El Rino", cuenta: "elrino_teatro", texto: TEXTO, ubicacion: "San Luis Potosí", en: { salio: null, publicando: false, programada: null } };
const FICHAS = {
  nueva: LUGAR,
  salio: { ...LUGAR, en: { salio: "Salió en Instagram hace 9 días", publicando: false, programada: "el mié 18 de nov" } },
  sinCuenta: { ...LUGAR, cuenta: null },
  enCamino: { ...LUGAR, en: { salio: null, publicando: true, programada: null } },
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
  assert.ok(b.height >= 44 || (await l.first().evaluate((e) => e.tagName)) === "BUTTON", "se puede tocar");
  await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
}
const qa = (p) => p.evaluate(() => window.qa);
const texto = (l) => l.innerText().then((x) => x.replace(/\s+/g, " ").trim());
const hoja = (p) => p.getByRole("dialog");
const captura = async (p, nombre) => capturas && p.screenshot({ path: join(capturas, `${nombre}.png`) });

test("nunca ha salido: la tarjeta, dónde sale y a quién etiqueta, el texto y «Publicar ahora», que lo pide una vez y cierra la hoja", async (t) => {
  const p = await abrir(t);
  const h = hoja(p);
  assert.equal(await h.getAttribute("aria-label"), "Publicar en Instagram");
  await h.getByRole("img", { name: "Tarjeta: Teatro El Rino" }).waitFor();
  const todo = await texto(h);
  assert.match(todo, /Sale ahora en @smsnstrsapp, con su historia y en Facebook, y etiqueta a @elrino_teatro\. Ubicación: San Luis Potosí\./);
  assert.match(todo, /Más en @elrino_teatro/);
  await captura(p, "515-publicar-desde-ficha");
  const boton = h.getByRole("button", { name: "Publicar ahora" });
  assert.ok((await boton.boundingBox()).height >= 44);
  await tocar(p, boton);
  await p.waitForFunction(() => window.qa.cerrada === 1);
  const q = await qa(p);
  assert.deepEqual(q.acciones.filter((a) => a[0] === "publicarFicha"), [["publicarFicha", "lugar", ID, false]]);
  assert.equal(q.publicado, 1, "la ficha se entera");
});

test("sin Instagram en su ficha: dice que sale sin etiqueta", async (t) => {
  const p = await abrir(t, "sinCuenta");
  assert.match(await texto(hoja(p)), /Su ficha no tiene Instagram: sale sin etiqueta\./);
});

test("ya salió: lo dice (y que la semana ya la tiene programada); «Publicar otra vez» pide confirmar, «Mejor no» vuelve y «Sí, publicar otra vez» manda `repetir`", async (t) => {
  const p = await abrir(t, "salio");
  const todo = await texto(hoja(p));
  assert.match(todo, /Salió en Instagram hace 9 días\./);
  assert.match(todo, /ya la tiene programada para el mié 18 de nov/);
  await tocar(p, hoja(p).getByRole("button", { name: "Publicar otra vez" }));
  await p.getByRole("dialog", { name: "¿Publicar otra vez a Teatro El Rino?" }).waitFor();
  assert.match(await texto(hoja(p)), /Salió en Instagram hace 9 días\. Sale ahora, con lo que su ficha dice hoy\./);
  await captura(p, "515-publicar-otra-vez-desde-ficha");
  assert.equal((await qa(p)).acciones.some((a) => a[0] === "publicarFicha"), false, "todavía no se pidió");
  await tocar(p, hoja(p).getByRole("button", { name: "Mejor no" }));
  await p.getByRole("dialog", { name: "Publicar en Instagram" }).waitFor();
  await tocar(p, hoja(p).getByRole("button", { name: "Publicar otra vez" }));
  await tocar(p, hoja(p).getByRole("button", { name: "Sí, publicar otra vez" }));
  await p.waitForFunction(() => window.qa.cerrada === 1);
  assert.deepEqual((await qa(p)).acciones.filter((a) => a[0] === "publicarFicha"), [["publicarFicha", "lugar", ID, true]]);
});

test("va en camino: lo dice y no hay botón; si no se puede (dijo que no), la frase y sin botón", async (t) => {
  const p = await abrir(t, "enCamino");
  assert.match(await texto(hoja(p)), /Ya se está publicando\. Te avisamos en el teléfono cuando salga\./);
  assert.equal(await hoja(p).getByRole("button", { name: /Publicar/ }).count(), 0);
  const otro = await abrir(t, "fuera");
  assert.match(await texto(hoja(otro).getByRole("alert")), /Dijo que no a salir en Instagram\./);
  assert.equal(await hoja(otro).getByRole("button", { name: /Publicar/ }).count(), 0);
});
