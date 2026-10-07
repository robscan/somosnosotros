/** OL-337 (bitácora 366): la foto propia en «¿Cuál te gusta?» del creador de cartel y la opción sin foto de cada tanda. Bundle real (esbuild)
 *  de `CreadorCartel.tsx` con Chrome real vía Playwright: armazón por pasos, memoria de pantalla (sessionStorage) y componentes reales. Las
 *  acciones del servidor son dobles que guardan lo que reciben (`window.qa.comprobacion` dice si la foto sirve); `subirFoto` responde la
 *  dirección de la carpeta de quien mira y las imágenes del cartel (`/api/cartel-nuevo/…`) y la foto las simula `page.route`. No corre con
 *  `npm test`; se corre con `npm run test:componentes`.
 * PLAYWRIGHT_MODULE=/ruta/playwright-core/index.mjs node --test este-archivo */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../../../../", import.meta.url));
const TOPE = { timeout: 30000 };
const CARPETA = "https://ejemplo.supabase.co/storage/v1/object/public/fotos/lugares/ana/";
const FOTO = `${CARPETA}cartel-foto-1.jpg`;
/** Un PNG de 1×1: lo que «dibuja» la ruta del cartel y la foto subida. */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const op = (id, sinFoto = false) => ({ id, nombre: id, sinFoto, cortaTitulo: false });
/** Con imagen (la del evento): una por tanda sin foto. */
const CON_IMAGEN = [
  [op("galeria-marco"), op("cine-banda", true), op("deco-arco"), op("feria-picado")],
  [op("galeria-columna"), op("tipo-franja", true), op("zine-cinta"), op("cine-sangre")],
  [op("tipo-fecha"), op("feria-boleto", true), op("zine-recorte"), op("deco-sol")],
];
/** Sin ninguna imagen: todas sin foto (sin «cine a sangre»). */
const SIN_IMAGEN = [
  [op("galeria-marco", true), op("cine-banda", true), op("deco-arco", true), op("feria-picado", true)],
  [op("galeria-columna", true), op("tipo-franja", true), op("zine-cinta", true), op("tipo-fecha", true)],
  [op("feria-boleto", true), op("zine-recorte", true), op("deco-sol", true)],
];

let dir, server, browser, origin;
const mocks = {
  "./acciones": `
    export async function comprobarFotoPropia(slug, url){const q=window.qa;q.comprobadas.push([slug,url]);return q.comprobacion}
    export async function usarComoCartel(...a){window.qa.usados.push(a);return {ok:true, href:'/eventos/oca'}}
  `,
  "@/lib/subirFoto": "export async function subirFoto(carpeta,usuario,prefijo,archivo,que){const q=window.qa;q.subidas.push([carpeta,usuario,prefijo,archivo.name,que]);return q.subida==='error'?{error:'La foto pesa más de 5 MB. Elige otra.',motivo:'pesa'}:{url:'" + FOTO + "'}}",
  "@/lib/medir": `
    export function medirCliente(n,d){window.qa.medido.push(d?[n,d]:[n])}
    export const formatoMedido=(f)=>f==='9x16'?'historia':'publicacion';
    export const plantillaMedida=(id)=>id.replace('-','_');
    export const tandaMedida=(i)=>['primera','segunda','tercera'][i%3];
    export const rolEnPantalla=()=>'otro';
  `,
  "@/components/ui/Atras": "export function useVolver(){return (e)=>{e?.preventDefault?.();window.qa.salio++}}export function useVolverA(){return (d)=>{window.qa.volvio=d}}export function useTerminar(){return (d)=>{window.qa.terminado=d}}export default function Atras(){return null}export function AtrasIcono(){return null}",
  "./Atras": "export function useVolver(){return (e)=>{e?.preventDefault?.();window.qa.salio++}}export function useVolverA(){return (d)=>{window.qa.volvio=d}}export function useTerminar(){return (d)=>{window.qa.terminado=d}}export default function Atras(){return null}export function AtrasIcono(){return null}",
  "./Navegacion": "export const registrarVolverVisible=()=>()=>{}",
  "./Logotipo": "export default function Logotipo(){return null}",
  "@/components/BotonDescargarCartel": "import React from 'react';export default function B({href}){return React.createElement('a',{href,'data-descarga':''},'Descargar el cartel')}",
  "next/navigation": "export function useRouter(){return {replace:()=>{},back:()=>{},refresh:()=>{},push:()=>{}}}export function usePathname(){return '/eventos/oca/cartel'}export function useSearchParams(){return new URLSearchParams()}",
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link({prefetch,replace,...p}){return React.createElement('a',p)}",
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "creador-cartel-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    define: { "process.env.NEXT_PUBLIC_SUPABASE_URL": '""', "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": '""' },
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import CreadorCartel from './src/app/eventos/[id]/cartel/CreadorCartel';
      import './src/app/globals.css';
      window.qa = {subidas:[], comprobadas:[], usados:[], medido:[], salio:0, volvio:null, terminado:null, subida:'ok', comprobacion:{ok:true}, conImagen:true, ...window.qaInicial};
      const q = window.qa;
      createRoot(document.getElementById('root')).render(
        <CreadorCartel evento={{slug:'oca', titulo:'Oca', href:'/eventos/oca'}} tandas={q.conImagen ? ${JSON.stringify(CON_IMAGEN)} : ${JSON.stringify(SIN_IMAGEN)}} tandasConFoto={${JSON.stringify(CON_IMAGEN)}} conImagen={q.conImagen} usuarioId="ana" carpeta="${CARPETA}" v="v1" origen="menu" />
      );
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
    ["/", ["text/html", `<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--fuente-bricolage:Arial}</style><div id="root"></div><script src="/app.js"></script>`]],
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

async function pagina(t, qa = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce", locale: "es-MX" });
  t.after(() => context.close());
  // Las miniaturas, la vista previa y la foto: un PNG cualquiera (no hay servidor que dibuje).
  await context.route("**/api/cartel-nuevo/**", (r) => r.fulfill({ contentType: "image/png", body: PNG }));
  await context.route("https://ejemplo.supabase.co/**", (r) => r.fulfill({ contentType: "image/png", body: PNG }));
  const p = await context.newPage();
  await p.addInitScript((inicial) => {
    window.qaInicial = inicial;
  }, qa);
  await p.goto(origin);
  await p.getByRole("heading", { name: "¿Cuál te gusta?" }).waitFor();
  return p;
}

/** Lo que pide cada miniatura: la plantilla, si va sin foto y con qué foto. */
const miniaturas = (p) =>
  p.locator('ul[aria-label="Diseños"] img').evaluateAll((imgs) =>
    imgs.map((i) => {
      const q = new URL(i.getAttribute("src"), location.href).searchParams;
      return { plantilla: q.get("plantilla"), sinFoto: q.get("sinfoto") === "1", foto: q.get("foto") };
    }),
  );
const qa = (p) => p.evaluate(() => window.qa);
const ponerFoto = (p, nombre = "IMG_0412.HEIC") => p.locator('input[type="file"]').setInputFiles({ name: nombre, mimeType: "image/heic", buffer: Buffer.from("foto") });

test("con imagen: «Usar otra foto» arriba de las opciones y una de las cuatro sin foto", TOPE, async (t) => {
  const p = await pagina(t);
  const accion = p.getByText("Usar otra foto");
  await accion.waitFor();
  const rejilla = await p.locator('ul[aria-label="Diseños"]').boundingBox();
  assert.ok((await accion.boundingBox()).y < rejilla.y, "la acción va arriba de la rejilla");
  const antes = await miniaturas(p);
  assert.equal(antes.length, 4);
  assert.deepEqual(antes.filter((m) => m.sinFoto).map((m) => m.plantilla), ["cine-banda"]);
  assert.ok(antes.every((m) => m.foto === null));
  assert.equal(await p.getByRole("button", { name: "cine-banda, sin foto" }).count(), 1);
  // El campo de archivo pide imágenes (en el iPhone: cámara o carrete).
  assert.equal(await p.locator('input[type="file"]').getAttribute("accept"), "image/*");
});

test("poner la foto: sube a la carpeta de quien mira, se comprueba y entra en las tres con foto; sobrevive a otra tanda, al formato y a la descarga", TOPE, async (t) => {
  const p = await pagina(t);
  await ponerFoto(p);
  await p.getByText("Tu foto").waitFor();
  const q = await qa(p);
  assert.deepEqual(q.subidas, [["lugares", "ana", "cartel-foto", "IMG_0412.HEIC", "foto"]]);
  assert.deepEqual(q.comprobadas, [["oca", FOTO]]);
  assert.deepEqual(q.medido.filter(([n]) => n.startsWith("cartel_foto")), [["cartel_foto_puesta"]]);
  let con = await miniaturas(p);
  assert.deepEqual(con.map((m) => (m.sinFoto ? "sin" : m.foto)), [FOTO, "sin", FOTO, FOTO]);
  assert.equal(await p.getByRole("button", { name: "Quitar la foto" }).count(), 1);
  // «Ver otros diseños»: la foto sigue y otra va sin foto.
  await p.getByRole("button", { name: "Ver otros diseños" }).click();
  await p.waitForFunction(() => document.querySelector('ul[aria-label="Diseños"] img')?.getAttribute("src").includes("galeria-columna"));
  con = await miniaturas(p);
  assert.deepEqual(con.map((m) => (m.sinFoto ? "sin" : m.foto === FOTO)), [true, "sin", true, true]);
  // Elegir una con foto: la vista previa, el formato y la descarga la llevan.
  await p.getByRole("button", { name: "zine-cinta" }).click();
  await p.getByRole("heading", { name: "Así queda" }).waitFor();
  const vista = () => p.locator('img[alt^="Vista previa"]').getAttribute("src");
  assert.ok((await vista()).includes(`foto=${encodeURIComponent(FOTO)}`));
  await p.getByRole("button", { name: /Historia/ }).click();
  await p.waitForFunction(() => document.querySelector('img[alt^="Vista previa"]').getAttribute("src").includes("formato=9x16"));
  assert.ok((await vista()).includes(`foto=${encodeURIComponent(FOTO)}`));
  const descarga = await p.locator("a[data-descarga]").getAttribute("href");
  assert.ok(descarga.includes("descarga=1") && descarga.includes(`foto=${encodeURIComponent(FOTO)}`));
  // «Usar como cartel del evento» dibuja con la misma foto.
  await p.getByRole("button", { name: "Usar como cartel del evento" }).click();
  await p.getByRole("button", { name: "Usar este cartel" }).click();
  await p.waitForFunction(() => window.qa.usados.length === 1);
  assert.deepEqual((await qa(p)).usados[0], ["oca", "zine-cinta", "9x16", null, { foto: FOTO, sinFoto: false }]);
});

test("la opción sin foto se dibuja sin foto aunque haya foto propia, también al usarla", TOPE, async (t) => {
  const p = await pagina(t);
  await ponerFoto(p);
  await p.getByText("Tu foto").waitFor();
  await p.getByRole("button", { name: "cine-banda, sin foto" }).click();
  await p.getByRole("heading", { name: "Así queda" }).waitFor();
  const vista = await p.locator('img[alt^="Vista previa"]').getAttribute("src");
  assert.ok(vista.includes("sinfoto=1") && !vista.includes("foto=http"));
  await p.getByRole("button", { name: "Usar como cartel del evento" }).click();
  await p.getByRole("button", { name: "Usar este cartel" }).click();
  await p.waitForFunction(() => window.qa.usados.length === 1);
  assert.deepEqual((await qa(p)).usados[0][4], { foto: FOTO, sinFoto: true });
});

test("la memoria de pantalla repone la foto (y la tanda) al volver; «Quitar la foto» vuelve al orden de siempre", TOPE, async (t) => {
  const p = await pagina(t);
  await ponerFoto(p);
  await p.getByText("Tu foto").waitFor();
  await p.getByRole("button", { name: "Ver otros diseños" }).click();
  await p.waitForFunction(() => document.querySelector('ul[aria-label="Diseños"] img')?.getAttribute("src").includes("galeria-columna"));
  await p.reload();
  await p.getByText("Tu foto").waitFor();
  const repuestas = await miniaturas(p);
  assert.equal(repuestas[0].plantilla, "galeria-columna");
  assert.deepEqual(repuestas.map((m) => (m.sinFoto ? "sin" : m.foto === FOTO)), [true, "sin", true, true]);
  await p.getByRole("button", { name: "Quitar la foto" }).click();
  await p.getByText("Usar otra foto").waitFor();
  assert.ok((await miniaturas(p)).every((m) => m.foto === null));
  assert.deepEqual((await qa(p)).medido.filter(([n]) => n.startsWith("cartel_foto")), [["cartel_foto_quitada"]]);
});

test("si la foto no sirve o no sube: un aviso corto y todo sigue igual", TOPE, async (t) => {
  const p = await pagina(t, { comprobacion: { ok: false, mensaje: "Esa foto no se pudo usar. Prueba con otra." } });
  const antes = await miniaturas(p);
  await ponerFoto(p, "documento.pdf");
  await p.getByRole("alert").filter({ hasText: "Esa foto no se pudo usar" }).waitFor();
  assert.deepEqual(await miniaturas(p), antes);
  assert.equal(await p.getByText("Usar otra foto").count(), 1);
  assert.deepEqual((await qa(p)).medido.filter(([n]) => n.startsWith("cartel_foto")), []);
  await p.evaluate(() => {
    window.qa.subida = "error";
  });
  await ponerFoto(p);
  await p.getByRole("alert").filter({ hasText: "La foto pesa más de 5 MB" }).waitFor();
  assert.equal((await qa(p)).comprobadas.length, 1, "lo que no subió no se comprueba");
});

test("sin ninguna imagen: «Poner una foto»; todas sin foto hasta ponerla, y entonces una sin foto por tanda", TOPE, async (t) => {
  const p = await pagina(t, { conImagen: false });
  await p.getByText("Poner una foto").waitFor();
  assert.ok((await miniaturas(p)).every((m) => m.sinFoto));
  await ponerFoto(p);
  await p.getByText("Tu foto").waitFor();
  const con = await miniaturas(p);
  assert.equal(con.filter((m) => m.sinFoto).length, 1);
  assert.equal(con.filter((m) => m.foto === FOTO).length, 3);
});
