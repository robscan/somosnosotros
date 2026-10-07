/** OL-316 (bitácora 346): el alta de artista por pasos (prototipo firmado `lugar-artista-por-pasos.html`, casos 5 a 7), con el armazón real
 *  (`PorPasos`), la guardia real (`useSalirSinPublicar`), la tira real, la hoja de la ciudad y la de solista o grupo reales, y dos acciones
 *  simuladas que guardan lo que reciben: la de publicar (`window.qa.resultado` dice qué contesta: 'publica' como `crearArtista` con
 *  `quedarse`, 'general' o 'existente') y la de editar, que guarda la foto de «Publicado». Supabase en el navegador es un doble que contesta
 *  `artistas_con_nombre` con tres artistas; Storage (`subirFoto`) se simula; Atrás y la ✕ preguntan a la guardia como `useVolver`.
 * PLAYWRIGHT_MODULE=/ruta/playwright-core/index.mjs node --test este-archivo   (o `npm run test:componentes`) */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const NUEVO = "0c0c0c0c-0000-4000-8000-0000000000aa";
const GENERAL = "No se pudo guardar. Intenta de nuevo.";
const TOPE = { timeout: 30000 };
/** Con `CAPTURAS=<carpeta>` algunas pruebas guardan su captura (390×844 y 320×844). */
const capturas = process.env.CAPTURAS;
let dir, server, browser, origin;
const DIRECTORIO = [
  { id: "a0000000-0000-4000-8000-000000000001", slug: "trio-bruma", nombre: "Trío Bruma", disciplina: "musica", detalle: "Son huasteco", tipo: "grupo", foto: null, ciudad: "San Luis Potosí" },
  { id: "a0000000-0000-4000-8000-000000000002", slug: "trio-brujas", nombre: "Trío Brujas", disciplina: "musica", detalle: null, tipo: "grupo", foto: null, ciudad: "Querétaro" },
  { id: "a0000000-0000-4000-8000-000000000003", slug: "ana-ruiz", nombre: "Ana Ruiz", disciplina: "artes_visuales", detalle: "Pintura", tipo: "solista", foto: null, ciudad: "Querétaro" },
];
const mocks = {
  "@/lib/subirFoto": "export async function subirFoto(carpeta,usuario,prefijo,archivo){window.qa.subidas.push({carpeta,usuario,prefijo,archivo:archivo.name});return {url:'/foto.svg'}}",
  "@/lib/supabase/navegador": `const DIRECTORIO=${JSON.stringify(DIRECTORIO)};const n=(t)=>t.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase();export function clienteNavegador(){return {rpc:async(f,a)=>{window.qa.rpcs.push(f);return {data:f==='artistas_con_nombre'?DIRECTORIO.filter((x)=>n(x.nombre).includes(n(a.p_nombre))):[]}}}}`,
  "./Atras":
    "import React from 'react';import {pedirSalida} from './src/lib/guardiaSalida';export function useVolver(){return (e)=>{e.preventDefault();const ir=()=>window.qa.salio++;if(!pedirSalida(ir))ir();}}export function useTerminar(){return ()=>{}}export default function Atras(){return null}export function AtrasIcono(){return null}",
  "./Navegacion": "export const registrarVolverVisible=()=>()=>{}",
  "@/lib/useAvisosTelefono": "export function usePlataforma(){return null}",
  "./Imagen": "import React from 'react';export default function Imagen({src,alt,className,width,height,loading}){return React.createElement('img',{src,alt,className,width,height,loading})}",
  "./Logotipo": "export default function Logotipo(){return null}",
  "next/navigation": "export function useRouter(){return {replace:(href)=>window.qa.reemplazos.push(href)}}",
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link({prefetch,replace,scroll,...p}){return React.createElement('a',p)}",
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "alta-artista-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    define: { "process.env.NEXT_PUBLIC_MAPBOX_TOKEN": '"pk.prueba"', "process.env.NEXT_PUBLIC_MAPBOX_STYLE": '""', "process.env.NEXT_PUBLIC_SUPABASE_URL": '""', "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": '""' },
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import AltaArtista from './src/app/nuevo/artista/AltaArtista';
      import {CIUDAD_INICIAL} from './src/lib/ciudad';
      import './src/app/globals.css';
      window.qa = {envios:[], actualizados:[], subidas:[], reemplazos:[], rpcs:[], salio:0, resultado:'publica', ...window.qaInicial};
      async function accion(_, fd){
        window.qa.envios.push(Object.fromEntries(fd.entries()));
        const r = window.qa.resultado;
        if (r === 'pendiente') return new Promise(() => {});
        if (r === 'general') return {ok:false, errores:{}, general:${JSON.stringify(GENERAL)}};
        if (r === 'existente') return {ok:false, errores:{}, general:'Ya hay una ficha con ese nombre.', existente:{id:'a0000000-0000-4000-8000-000000000009', slug:'la-rendija', nombre:fd.get('nombre'), disciplina:'teatro', detalle:null, tipo:'grupo', foto:null}};
        return {ok:true, id:'${NUEVO}', slug:'artista-nuevo', volver:'/artistas/artista-nuevo'};
      }
      async function actualizar(id, _, fd){ window.qa.actualizados.push({id, ...Object.fromEntries(fd.entries())}); return {ok:true, id, volver:'/artistas/artista-nuevo'}; }
      const subcategorias = {
        teatro: [{detalle:'Compañía de teatro', artistas:12}, {detalle:'Títeres', artistas:5}, {detalle:'Clown', artistas:3}, {detalle:'Teatro de calle', artistas:2}],
        musica: ['Rock, metal y alternativo','Pop, urbano y electrónica','Regional, tropical y versátil','Tradicional, folclore y canto nuevo','Música académica y clásica','Jazz, blues y soul','Son huasteco','Trova','Banda'].map((detalle, i) => ({detalle, artistas: 90 - i * 10})),
        letras: [{detalle:'Poesía', artistas:4}, {detalle:'Narrativa', artistas:2}],
      };
      const ciudades = [
        {...CIUDAD_INICIAL, artistas:40},
        {slug:'queretaro', nombre:'Querétaro', centro:{lng:-100.39,lat:20.59}, zoom:13, artistas:2},
      ];
      createRoot(document.getElementById('root')).render(
        <AltaArtista accion={accion} actualizar={actualizar} subcategorias={subcategorias} ciudades={ciudades} conCiudad={window.qa.conCiudad ?? null} salida={{href:'/artistas', texto:'Artistas'}} usuarioId="usuaria-1" esAdmin={!!window.qa.esAdmin} arranque={{nombre: window.qa.nombre ?? '', ciudad: window.qa.ciudad ?? 'San Luis Potosí'}} />
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
  const fuente = process.env.FUENTE ? await readFile(process.env.FUENTE) : null;
  const assets = new Map([
    ["/", ["text/html", `<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>${fuente ? "@font-face{font-family:Bricolage;src:url(/bricolage.woff2) format('woff2');font-weight:200 800;font-stretch:75% 100%}:root{--fuente-bricolage:Bricolage}" : ":root{--fuente-bricolage:Arial}"}</style><div id="root"></div><script src="/app.js"></script>`]],
    ["/foto.svg", ["image/svg+xml", '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9"><rect width="16" height="9" fill="#b9b4a8"/></svg>']],
    ["/sin-foto.png", ["image/png", await readFile(join(root, "public/sin-foto.png"))]],
    ...(fuente ? [["/bricolage.woff2", ["font/woff2", fuente]]] : []),
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

async function pagina(t, { ancho = 390, qa = {} } = {}) {
  const context = await browser.newContext({ viewport: { width: ancho, height: 844 }, reducedMotion: "reduce", timezoneId: "America/Mexico_City", deviceScaleFactor: capturas ? 2 : 1, locale: "es-MX" });
  t.after(() => context.close());
  const p = await context.newPage();
  p.setDefaultTimeout(8000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  t.after(() => assert.deepEqual(errors, []));
  await p.addInitScript((inicial) => (window.qaInicial = inicial), qa);
  await p.addInitScript(() => {
    window.compartidos = [];
    Object.defineProperty(navigator, "share", { configurable: true, value: async (d) => void window.compartidos.push({ titulo: d.title, texto: d.text, url: d.url }) });
  });
  await p.route("**/*", (r) => (new URL(r.request().url()).origin === origin ? r.continue() : r.abort()));
  await p.goto(origin);
  return p;
}
const boton = (p, nombre) => p.getByRole("button", { name: nombre });
const pregunta = (p) => p.locator("main h2").first().textContent();
const enPaso = (p, texto) => p.locator("main h2").filter({ hasText: texto }).waitFor();
const nombre = (p) => p.getByLabel("Nombre de artista o grupo");
const enviado = (p) => p.evaluate(() => window.qa.envios.at(-1));
const sinDesborde = (p) => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const cerrar = (p) => p.getByRole("link", { name: "Cerrar (Artistas)" });
async function foto(p, archivo) {
  if (capturas) await p.screenshot({ path: join(capturas, `${archivo}.png`) });
}
/** Lo que se lee de cada renglón de «Revisa», sin la clave escondida para el lector de pantalla (la casilla va aparte). */
const renglonesDe = (p) => p.locator("main ul > li").evaluateAll((li) => li.flatMap((x) => (x.querySelector(":scope > b") ? [x.querySelector(":scope > b").innerText.replace(/\s+/g, " ").trim()] : [])));
const casilla = (p) => p.getByRole("checkbox");
/** Caso 5: un nombre con pista llega a «Revisa» con un toque. */
async function hastaRevisa(p, texto = "Compañía de Teatro La Rendija") {
  await nombre(p).fill(texto);
  await boton(p, "Siguiente").click();
  await p.getByRole("heading", { name: texto }).waitFor();
}

test("primer paso: «¿Cómo se llama?» con la ✕ del campo, el pie que dice qué falta y, debajo, la tira con «Artista» marcado y la ciudad en los enlaces", TOPE, async (t) => {
  const p = await pagina(t, { qa: { conCiudad: "queretaro" } });
  assert.equal(await pregunta(p), "¿Cómo se llama?");
  assert.equal(await boton(p, "Falta el nombre").getAttribute("aria-disabled"), "true");
  const tira = p.getByRole("group", { name: "Qué publicar" });
  assert.equal(await tira.locator("[aria-current=page]").textContent(), "Artista");
  assert.deepEqual(await tira.getByRole("link").evaluateAll((a) => a.map((x) => [x.textContent, x.getAttribute("href")])), [
    ["Evento", "/nuevo/evento?ciudad=queretaro"],
    ["Lugar", "/nuevo/lugar?ciudad=queretaro"],
  ]);
  // La tira va dentro del pie, bajo el botón, y el pie al fondo de la pantalla.
  const pie = await p.locator("main > footer").boundingBox();
  assert.equal(Math.round(pie.y + pie.height), 844);
  assert.equal(await p.locator("main > footer").getByRole("group", { name: "Qué publicar" }).count(), 1);
  await foto(p, "artista-1-primer-paso");
  await nombre(p).fill("Mariana");
  await boton(p, "Borrar lo escrito").waitFor();
  await boton(p, "Siguiente").waitFor();
  // Al avanzar la tira se va; con Atrás vuelve, con lo escrito.
  await boton(p, "Siguiente").click();
  await enPaso(p, "¿Qué hace?");
  assert.equal(await p.getByRole("group", { name: "Qué publicar" }).count(), 0);
  await boton(p, "Atrás").click();
  await enPaso(p, "¿Cómo se llama?");
  assert.equal(await nombre(p).inputValue(), "Mariana");
  // La ✕ del campo lo vacía.
  await boton(p, "Borrar lo escrito").click();
  assert.equal(await nombre(p).inputValue(), "");
});

test("caso 5 · con pista en el nombre: disciplina, subcategoría y grupo salen solos y «Siguiente» va directo a «Revisa»; publica y queda en «Publicado»", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaRevisa(p);
  assert.deepEqual(await renglonesDe(p), ["Teatro · Compañía de teatro", "Grupo", "San Luis Potosí", "Foto, portada, redes o descripción"]);
  // La casilla dice «Es mi grupo» con su consecuencia, desmarcada.
  assert.equal(await casilla(p).getAttribute("aria-checked"), "false");
  assert.match(await casilla(p).innerText(), /Es mi grupo\s+Podrás editar la ficha y publicar sus fechas/);
  await casilla(p).click();
  assert.equal(await casilla(p).getAttribute("aria-checked"), "true");
  assert.ok(await sinDesborde(p));
  await foto(p, "artista-5-revisa-con-pista");
  await boton(p, "Publicar artista").click();
  await p.getByRole("heading", { name: "Artista publicado" }).waitFor();
  const d = await enviado(p);
  assert.deepEqual(
    { nombre: d.nombre, disciplina: d.disciplina, detalle: d.detalle, tipo: d.tipo, ciudad: d.ciudad, soy: d.soy, foto: d.foto, quedarse: d.quedarse },
    { nombre: "Compañía de Teatro La Rendija", disciplina: "teatro", detalle: "Compañía de teatro", tipo: "grupo", ciudad: "San Luis Potosí", soy: "1", foto: "", quedarse: "1" },
  );
  // «Publicado»: el artista como quedó, «Agrega una foto» en punteado (no tiene foto) y «Compartir» con el texto de la ficha.
  assert.match(await p.locator("main ul").first().innerText(), /Compañía de Teatro La Rendija[\s\S]*Compañía de teatro · Grupo/);
  assert.equal(await p.getByRole("heading", { name: "Agrega una foto" }).count(), 1);
  await foto(p, "artista-8-publicado");
  await boton(p, "Compartir").click();
  await p.waitForFunction(() => window.compartidos.length === 1);
  assert.deepEqual(await p.evaluate(() => window.compartidos[0]), { titulo: "Compañía de Teatro La Rendija", texto: "Compañía de Teatro La Rendija · Compañía de teatro · Grupo", url: "https://somosnosotros.org/artistas/artista-nuevo" });
  // «Publicar otro» vuelve a empezar, vacío.
  await boton(p, "Publicar otro").click();
  await enPaso(p, "¿Cómo se llama?");
  assert.equal(await nombre(p).inputValue(), "");
});

test("caso 6 · sin pista: «¿Qué hace?» con el icono de etiqueta, «¿Qué tipo de teatro?» con las más usadas y, en «Revisa», solista o grupo por decir (nunca «Solista» por omisión) en su hoja", TOPE, async (t) => {
  const p = await pagina(t);
  await nombre(p).fill("Mariana Ruvalcaba");
  await boton(p, "Siguiente").click();
  await enPaso(p, "¿Qué hace?");
  const hace = p.getByRole("group", { name: "Qué hace" });
  assert.deepEqual(await hace.getByRole("button").allInnerTexts(), ["Música", "Teatro", "Danza", "Artes visuales", "Letras", "Cine", "Artes circenses", "Otro"]);
  // Cada opción lleva la etiqueta (el mismo icono que el tipo de un lugar), no una nota musical: cuatro trazos de la etiqueta.
  assert.equal(await hace.locator("button > svg:first-child").count(), 8);
  assert.ok(await sinDesborde(p));
  await foto(p, "artista-3-que-hace");
  await boton(p, "Teatro").click();
  await enPaso(p, "¿Qué tipo de teatro?");
  assert.match(await p.locator("main").innerText(), /Teatro · así se verá en el directorio y en sus filtros\./);
  const chips = p.getByRole("group", { name: "¿Qué tipo de teatro?" });
  assert.deepEqual(await chips.getByRole("button").allInnerTexts(), ["Compañía de teatro", "Títeres", "Clown", "Teatro de calle", "Otra…"]);
  assert.equal(await boton(p, "Seguir sin especificar").count(), 1);
  await foto(p, "artista-4-que-tipo-de-teatro");
  await boton(p, "Títeres").click();
  await p.getByRole("heading", { name: "Mariana Ruvalcaba" }).waitFor();
  assert.deepEqual(await renglonesDe(p), ["Teatro · Títeres", "Falta si es solista o grupo", "San Luis Potosí", "Foto, portada, redes o descripción"]);
  const es = p.locator("main ul > li").nth(1);
  assert.match(await es.getAttribute("class"), /pendiente/);
  assert.match(await casilla(p).innerText(), /Soy yo \/ es mi grupo/);
  assert.equal(await boton(p, "Falta si es solista o grupo").getAttribute("aria-disabled"), "true");
  await boton(p, "Falta si es solista o grupo").click({ force: true });
  assert.equal(await p.evaluate(() => window.qa.envios.length), 0, "apagado, no envía nada");
  await foto(p, "artista-6-revisa-falta-solista");
  await boton(p, "Poner es").click();
  const hoja = p.getByRole("dialog", { name: "Solista, grupo o colectivo" });
  assert.deepEqual(await hoja.getByRole("group").getByRole("button").allInnerTexts(), ["Solista", "Grupo", "Colectivo"]);
  await foto(p, "artista-7-hoja-solista-grupo");
  await hoja.getByRole("button", { name: "Solista" }).click();
  await hoja.waitFor({ state: "detached" });
  assert.equal((await renglonesDe(p))[1], "Solista");
  assert.match(await casilla(p).innerText(), /^Soy yo/);
  await boton(p, "Publicar artista").click();
  await p.waitForFunction(() => window.qa.envios.length === 1);
  const d = await enviado(p);
  assert.deepEqual([d.disciplina, d.detalle, d.tipo, d.soy], ["teatro", "Títeres", "solista", ""]);
});

test("las subcategorías: a lo más ocho a la vista, las más usadas primero; «Otra…» con su ✕, su tope y «Usar esa» si ya hay una parecida; «Seguir sin especificar» no pone nada", TOPE, async (t) => {
  const p = await pagina(t);
  await nombre(p).fill("Ana Pérez");
  await boton(p, "Siguiente").click();
  await boton(p, "Música").click();
  await enPaso(p, "¿Qué tipo de música?");
  const chips = await p.getByRole("group", { name: "¿Qué tipo de música?" }).getByRole("button").allInnerTexts();
  assert.equal(chips.length, 9, "ocho y «Otra…»");
  assert.deepEqual([chips[0], chips[7], chips[8]], ["Rock, metal y alternativo", "Trova", "Otra…"]);
  assert.ok(await sinDesborde(p));
  await boton(p, "Otra…").click();
  const campo = p.getByLabel("Qué tipo, en pocas palabras");
  assert.equal(await campo.getAttribute("maxlength"), "40");
  await campo.fill("son huas");
  // Ya hay una parecida (la novena, que no va en los chips): se ofrece antes de crear otra.
  await p.getByRole("status").filter({ hasText: "Son huasteco" }).waitFor();
  await boton(p, "Borrar lo escrito").click();
  assert.equal(await campo.inputValue(), "");
  await campo.fill("Cumbia rebajada");
  await boton(p, "Siguiente").click();
  await p.getByRole("heading", { name: "Ana Pérez" }).waitFor();
  assert.equal((await renglonesDe(p))[0], "Música · Cumbia rebajada");
  // «Cambiar» vuelve a «¿Qué hace?»; elegir otra disciplina pregunta su tipo, y «Seguir sin especificar» vuelve a «Revisa» sin subcategoría.
  await boton(p, "Cambiar qué hace").click();
  await enPaso(p, "¿Qué hace?");
  await boton(p, "Letras").click();
  await enPaso(p, "¿Qué tipo de letras?");
  await boton(p, "Seguir sin especificar").click();
  await p.getByRole("heading", { name: "Ana Pérez" }).waitFor();
  assert.equal((await renglonesDe(p))[0], "Letras");
});

test("«Otro» no tiene tipos: se pregunta qué hace en pocas palabras, con el campo ya abierto", TOPE, async (t) => {
  const p = await pagina(t);
  await nombre(p).fill("Ana Pérez");
  await boton(p, "Siguiente").click();
  await boton(p, "Otro").click();
  await enPaso(p, "¿Qué hace, en pocas palabras?");
  assert.equal(await p.getByRole("group", { name: /¿Qué/ }).count(), 0);
  await p.getByLabel("Qué tipo, en pocas palabras").fill("Performance");
  await p.keyboard.press("Enter");
  await p.getByRole("heading", { name: "Ana Pérez" }).waitFor();
  assert.equal((await renglonesDe(p))[0], "Otro · Performance");
});

test("caso 7 · ya tiene ficha: mientras se escribe, «Ya tiene ficha · Ir a su ficha» (en otra ciudad lo dice) y la salida es ir a ella", TOPE, async (t) => {
  const p = await pagina(t);
  await nombre(p).fill("Trío Bru");
  const bruma = p.getByRole("option", { name: /Trío Bruma/ });
  await bruma.waitFor();
  assert.match(await bruma.innerText(), /Ya tiene ficha · Ir a su ficha/);
  assert.equal(await bruma.getAttribute("href"), "/artistas/trio-bruma");
  assert.match(await p.getByRole("option", { name: /Trío Brujas/ }).innerText(), /Ya tiene ficha en Querétaro · Ir a su ficha/);
  await foto(p, "artista-2-ya-tiene-ficha");
});

test("el mismo nombre en la misma ciudad no se publica dos veces; en otra ciudad, sí", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaRevisa(p, "Trío Bruma");
  await boton(p, "Ese nombre ya tiene ficha").waitFor();
  const aviso = p.getByRole("alert").filter({ hasText: "Ya tiene ficha en San Luis Potosí" });
  assert.equal(await aviso.getByRole("link").getAttribute("href"), "/artistas/trio-bruma");
  await boton(p, "Cambiar ciudad").click();
  await p.getByRole("dialog", { name: "Ciudad" }).getByRole("option", { name: /Querétaro/ }).click();
  assert.equal((await renglonesDe(p))[2], "Querétaro");
  await boton(p, "Publicar artista").click();
  await p.waitForFunction(() => window.qa.envios.length === 1);
  assert.equal((await enviado(p)).ciudad, "Querétaro");
});

test("foto, portada, redes y descripción: lo opcional del formulario de siempre, en su paso; «Revisa» dice lo que se agregó y se publica", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaRevisa(p);
  await boton(p, "Agregar foto, portada, redes o descripción").click();
  await enPaso(p, "¿Quieres agregar algo?");
  await p.getByLabel("Poner una foto").setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: Buffer.from("x") });
  await boton(p, "Quitar la foto").waitFor();
  await p.getByLabel("Poner una portada").setInputFiles({ name: "portada.png", mimeType: "image/png", buffer: Buffer.from("x") });
  await boton(p, "Quitar la portada").waitFor();
  await p.getByRole("button", { name: "Descripción" }).click();
  await p.locator("textarea").fill("Teatro de calle en el Centro");
  await p.getByRole("dialog", { name: "Descripción" }).getByRole("button", { name: "Listo" }).click();
  await p.locator("#campo-enlace").fill("instagram.com/larendija");
  await boton(p, "Añadir").click();
  await p.getByRole("list", { name: "Enlaces" }).waitFor();
  assert.ok(await sinDesborde(p));
  await foto(p, "artista-9-mas");
  await boton(p, "Listo").click();
  await p.getByRole("heading", { name: "Compañía de Teatro La Rendija" }).waitFor();
  assert.equal((await renglonesDe(p))[3], "Foto, portada, descripción y 1 red");
  await boton(p, "Publicar artista").click();
  await p.getByRole("heading", { name: "Artista publicado" }).waitFor();
  const d = await enviado(p);
  assert.deepEqual([d.foto, d.portada, d.descripcion], ["/foto.svg", "/foto.svg", "Teatro de calle en el Centro"]);
  assert.match(JSON.parse(d.enlaces)[0].url, /instagram\.com\/larendija/);
  assert.deepEqual(await p.evaluate(() => window.qa.subidas.map((s) => s.prefijo)), ["foto", "portada"]);
  // Con foto, la sugerencia es publicar una fecha con el artista puesto.
  assert.equal(await p.getByRole("link", { name: "Publicar una fecha" }).getAttribute("href"), `/nuevo/evento?artista=${NUEVO}`);
});

test("la administración ve la dirección de una imagen para la foto y la portada; nadie más", TOPE, async (t) => {
  const p = await pagina(t, { qa: { esAdmin: true } });
  await hastaRevisa(p);
  await boton(p, "Agregar foto, portada, redes o descripción").click();
  await p.getByLabel("O pega la dirección de la foto").waitFor();
  await p.getByLabel("O pega la dirección de la portada").waitFor();
  const otra = await pagina(t);
  await hastaRevisa(otra);
  await boton(otra, "Agregar foto, portada, redes o descripción").click();
  assert.equal(await otra.getByLabel("O pega la dirección de la foto").count(), 0);
});

test("«Agrega una foto» en «Publicado»: la foto se sube y se guarda en la ficha sin salir, y la sugerencia pasa a «Publicar una fecha»", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaRevisa(p);
  await boton(p, "Publicar artista").click();
  await p.getByRole("heading", { name: "Agrega una foto" }).waitFor();
  await p.getByLabel("Agregar foto").setInputFiles({ name: "yo.png", mimeType: "image/png", buffer: Buffer.from("x") });
  await p.getByRole("link", { name: "Publicar una fecha" }).waitFor();
  const [guardado] = await p.evaluate(() => window.qa.actualizados);
  assert.deepEqual({ id: guardado.id, foto: guardado.foto, nombre: guardado.nombre, disciplina: guardado.disciplina, tipo: guardado.tipo }, { id: NUEVO, foto: "/foto.svg", nombre: "Compañía de Teatro La Rendija", disciplina: "teatro", tipo: "grupo" });
  assert.equal(await p.locator("main ul img").count(), 1);
  await foto(p, "artista-10-publicado-con-foto");
});

test("un error del servidor sale en «Revisa» y la guardia vuelve; si ya hay una ficha con ese nombre, se dice con su enlace", TOPE, async (t) => {
  const p = await pagina(t, { qa: { resultado: "general" } });
  await hastaRevisa(p);
  await boton(p, "Publicar artista").click();
  await p.getByRole("alert").filter({ hasText: GENERAL }).waitFor();
  await boton(p, "Atrás").click();
  await cerrar(p).click();
  await p.getByRole("heading", { name: "¿Salir sin publicar?" }).waitFor();
  assert.equal(await p.evaluate(() => window.qa.salio), 0);

  const q = await pagina(t, { qa: { resultado: "existente" } });
  await hastaRevisa(q);
  await boton(q, "Publicar artista").click();
  const aviso = q.getByRole("alert").filter({ hasText: "Ya tiene ficha en San Luis Potosí" });
  await aviso.waitFor();
  assert.equal(await aviso.getByRole("link").getAttribute("href"), "/artistas/la-rendija");
  await boton(q, "Ese nombre ya tiene ficha").waitFor();
});

test("con el nombre de entrada (Buscar) y la ciudad de contexto: el nombre ya escrito y la ciudad en «Revisa»", TOPE, async (t) => {
  const p = await pagina(t, { qa: { nombre: "Ballet Folclórico Universitario", ciudad: "Querétaro" } });
  assert.equal(await nombre(p).inputValue(), "Ballet Folclórico Universitario");
  await boton(p, "Siguiente").click();
  await p.getByRole("heading", { name: "Ballet Folclórico Universitario" }).waitFor();
  assert.deepEqual((await renglonesDe(p)).slice(0, 3), ["Danza", "Grupo", "Querétaro"]);
});

test("la guardia: sin nada escrito la ✕ sale sin preguntar; con el nombre escrito, pregunta", TOPE, async (t) => {
  const p = await pagina(t);
  await cerrar(p).click();
  assert.equal(await p.evaluate(() => window.qa.salio), 1);
  const q = await pagina(t);
  await nombre(q).fill("Mariana");
  await cerrar(q).click();
  await q.getByRole("heading", { name: "¿Salir sin publicar?" }).waitFor();
  assert.equal(await q.evaluate(() => window.qa.salio), 0);
});

test("a 320: cada paso cabe sin desplazarse a lo ancho", TOPE, async (t) => {
  const p = await pagina(t, { ancho: 320 });
  await nombre(p).fill("Mariana Ruvalcaba Hernández de la Peña");
  assert.ok(await sinDesborde(p));
  await foto(p, "artista-320-1-nombre");
  await boton(p, "Siguiente").click();
  await enPaso(p, "¿Qué hace?");
  assert.ok(await sinDesborde(p));
  await boton(p, "Música").click();
  await enPaso(p, "¿Qué tipo de música?");
  assert.ok(await sinDesborde(p));
  await foto(p, "artista-320-2-que-tipo");
  await boton(p, "Seguir sin especificar").click();
  await p.getByRole("heading", { name: /Mariana Ruvalcaba/ }).waitFor();
  assert.ok(await sinDesborde(p));
  await foto(p, "artista-320-3-revisa");
  await boton(p, "Poner es").click();
  await p.getByRole("dialog", { name: "Solista, grupo o colectivo" }).getByRole("button", { name: "Solista" }).click();
  await boton(p, "Publicar artista").click();
  await p.getByRole("heading", { name: "Artista publicado" }).waitFor();
  assert.ok(await sinDesborde(p));
  await foto(p, "artista-320-4-publicado");
});
