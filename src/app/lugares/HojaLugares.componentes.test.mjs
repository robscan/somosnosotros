/** Prueba de componente de `HojaLugares` y `FichaHoja` (docs/rediseno/50, P5b), con sus estilos y en Chrome real a 390×844: las alturas de la lista
 *  (recogida = la franja de 64, asoma = dos renglones y medio, llena = la pantalla y la navegación se va), que jalar hacia abajo recoge y
 *  nunca cierra, que el mapa recibe los toques del hueco y la hoja los del cuerpo, y la ficha: abre a foto y datos, la ✕ la cierra y la
 *  lista vuelve al desplazamiento que tenía, y su cabecera se vuelve compacta al desplazar.
 * PLAYWRIGHT_MODULE=/ruta/playwright-core/index.mjs CHROME_EXECUTABLE=/ruta/chrome node --test este-archivo
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
let browser, server, dir, origin;

const mocks = {
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link(p){return React.createElement('a',p)}",
  "next/navigation": "export const useRouter=()=>({push(){},replace(){}});export const usePathname=()=>'/lugares';export const useSearchParams=()=>new URLSearchParams();",
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "hojalugares-componentes-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React, {useState} from 'react';import {createRoot} from 'react-dom/client';
      import HojaLugares from './src/app/lugares/HojaLugares';import FichaHoja from './src/app/lugares/FichaHoja';import './src/app/globals.css';
      const lugar = { id: 'l1', slug: 'l1', nombre: 'Museo de prueba', tipo: 'museo', direccion: 'Calle 1', lat: 0, lng: 0, portada: null, proximo: null };
      window.qa = { recogida: [], cambios: [] };
      window.addEventListener('armazon:recogida', (e) => window.qa.recogida.push(e.detail));
      function App() {
        const [abierta, setAbierta] = useState(false);
        const piezas = { cuerpo: <><ul data-datos style={{ height: 130, listStyle: 'none' }}><li>datos</li></ul><div style={{ height: 1400 }}>el resto de la ficha</div></>, opciones: <li>Reportar</li>, seguir: null };
        return (
          <main style={{ height: '100dvh', paddingBottom: 'var(--nav-abajo)' }}>
            <div id="mapa" style={{ height: '100%', background: '#dfe8df' }}>mapa</div>
            <HojaLugares resumen="12 lugares" ficha={abierta ? <FichaHoja lugar={lugar} piezas={piezas} onCerrar={() => setAbierta(false)} /> : null} alAsentar={(e) => window.qa.cambios.push(e)}>
              <ul style={{ listStyle: 'none' }}>
                {Array.from({ length: 14 }, (_, i) => (
                  <li key={i} style={{ height: 100, borderBottom: '1px solid #ddd' }}>
                    <a href="#" onClick={(e) => { e.preventDefault(); setAbierta(true); }}>Renglón {i}</a>
                  </li>
                ))}
              </ul>
            </HojaLugares>
          </main>
        );
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
    ["/", ["text/html", '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--fuente-bricolage:Arial}</style><div id="root"></div><script src="/app.js"></script>']],
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

async function abrir() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await page.goto(origin, { waitUntil: "load" });
  await page.waitForSelector('[role="region"][aria-label="Lugares"][data-hoja]');
  await page.waitForTimeout(400);
  page.errores = errores;
  return page;
}

/** Cómo está la hoja: su altura, el desplazamiento, cuánto se ve del cuerpo sobre la navegación (60) y si la ficha es compacta. */
const estado = (page) =>
  page.evaluate(() => {
    const hoja = document.querySelector('[role="region"][aria-label="Lugares"]');
    const c = hoja.firstElementChild;
    const ficha = hoja.querySelector("[data-ficha-hoja]");
    return { hoja: hoja.dataset.hoja, y: Math.round(hoja.scrollTop), visible: Math.round(innerHeight - 60 - c.getBoundingClientRect().top), ficha: !!ficha, compacta: !!ficha?.hasAttribute("data-compacta"), max: hoja.scrollHeight - hoja.clientHeight };
  });
const rueda = async (page, dy) => {
  await page.mouse.move(195, 700);
  await page.mouse.wheel(0, dy);
  await page.waitForTimeout(900);
};
const cerca = (a, b, t = 2) => assert.ok(Math.abs(a - b) <= t, `${a} debía estar a ${t} de ${b}`);

test("la lista abre asomando dos renglones y medio; recogida es la franja y llena cubre la pantalla y esconde la navegación", async () => {
  const page = await abrir();
  const asoma = await estado(page);
  assert.equal(asoma.hoja, "asoma");
  cerca(asoma.y, 250); // dos renglones y medio de 100
  cerca(asoma.visible, 64 + 250); // la franja (asa y cantidad) más lo que asoma
  await rueda(page, -600);
  const recogida = await estado(page);
  assert.equal(recogida.hoja, "recogida");
  cerca(recogida.visible, 64); // solo el asa y «12 lugares»
  assert.equal(await page.getByRole("region", { name: "Lugares" }).getByText("12 lugares").isVisible(), true);
  await rueda(page, 2000);
  const llena = await estado(page);
  assert.equal(llena.hoja, "llena");
  assert.ok(llena.visible >= 784, "el cuerpo llega a la franja de estado: 844 − 60 de navegación"); // y, con la lista larga, ya desplazó contenido
  assert.equal((await page.evaluate(() => window.qa.recogida)).at(-1), true, "llena pide recoger la barra y la navegación");
  await rueda(page, -200);
  const desplazada = await estado(page);
  assert.equal(desplazada.hoja, "llena", "un poco hacia arriba sigue siendo desplazar el contenido de la hoja llena");
  assert.ok(desplazada.y < llena.y && desplazada.y > llena.y - 300, "llena desplaza el contenido");
  await rueda(page, -3000);
  assert.equal((await estado(page)).hoja, "recogida", "jalar hacia abajo la recoge hasta la franja: nunca la cierra");
  assert.equal((await page.evaluate(() => window.qa.recogida)).at(-1), false, "y la navegación vuelve");
  assert.deepEqual(page.errores, []);
});

test("en reposo el mapa recibe los toques del hueco y la hoja los del cuerpo", async () => {
  const page = await abrir();
  const arriba = await page.evaluate(() => document.elementFromPoint(195, 100)?.id);
  assert.equal(arriba, "mapa");
  const cuerpo = await page.evaluate(() => !!document.elementFromPoint(195, 700)?.closest('[role="region"][aria-label="Lugares"]'));
  assert.equal(cuerpo, true);
  await page.mouse.move(195, 700);
  await page.mouse.wheel(0, 30);
  await page.waitForTimeout(50);
  const enMovimiento = await page.evaluate(() => document.elementFromPoint(195, 100)?.id);
  assert.notEqual(enMovimiento, "mapa", "mientras se mueve, el desplazador recibe todo (el recorte llegaría tarde y cortaría el borde)");
  await page.waitForTimeout(900);
  assert.equal(await page.evaluate(() => document.elementFromPoint(195, 100)?.id), "mapa");
});

test("la ficha abre a foto y datos, la ✕ la cierra y la lista vuelve a donde estaba", async () => {
  const page = await abrir();
  await rueda(page, 2000); // la lista, llena y desplazada hasta el final
  const antes = await estado(page);
  assert.equal(antes.hoja, "llena");
  await page.getByRole("link", { name: "Renglón 13", exact: true }).evaluate((a) => a.click());
  await page.waitForTimeout(900);
  const media = await estado(page);
  assert.equal(media.ficha, true);
  assert.equal(media.hoja, "media");
  // Foto y datos con 80 px de lo que sigue: lo que se ve es el borde de abajo del primer bloque + 80.
  const esperada = await page.evaluate(() => {
    const c = document.querySelector('[role="region"][aria-label="Lugares"]').firstElementChild;
    return Math.round(document.querySelector("[data-datos]").getBoundingClientRect().bottom - c.getBoundingClientRect().top + 80);
  });
  cerca(media.visible, esperada, 3);
  assert.equal(media.compacta, false);
  await rueda(page, 3000);
  const llena = await estado(page);
  assert.equal(llena.hoja, "llena");
  assert.equal(llena.compacta, true, "desplazada, la cabecera se vuelve compacta con la portada detrás del título");
  assert.equal(await page.getByRole("button", { name: "Atrás" }).isVisible(), true, "llena, el mando es Atrás");
  assert.equal(await page.getByRole("button", { name: "Cerrar la ficha" }).isVisible(), false);
  await page.getByRole("button", { name: "Atrás" }).click();
  await page.waitForTimeout(900);
  assert.equal((await estado(page)).hoja, "media", "Atrás vuelve a foto y datos");
  await rueda(page, -3000);
  const recogida = await estado(page);
  assert.equal(recogida.hoja, "recogida");
  assert.equal(recogida.ficha, true, "jalar la recoge a su cabecera pero no la cierra");
  cerca(recogida.visible, 76);
  await page.getByRole("button", { name: "Cerrar la ficha" }).click();
  await page.waitForTimeout(900);
  const despues = await estado(page);
  assert.equal(despues.ficha, false, "solo la ✕ cierra la ficha");
  assert.equal(despues.hoja, antes.hoja);
  cerca(despues.y, antes.y);
  assert.deepEqual(page.errores, []);
});
