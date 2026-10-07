/** OL-315 (bitácora 343): el alta de lugar por pasos (prototipo firmado `lugar-artista-por-pasos.html`, casos 1 a 4), con el armazón real
 *  (`PorPasos`), la guardia real (`useSalirSinPublicar`), la tira real, la hoja del horario y la de la ciudad reales, y una acción simulada que
 *  guarda lo que recibe (`window.qa.resultado` dice qué contesta: 'publica' como `crearLugar` con `quedarse`, 'general', 'parecidos' o
 *  'ciudad'). Mapbox lo simula `page.route` (sugerencias, coordenadas, la dirección de un punto y la búsqueda de ciudades) y el mapa es un doble
 *  con un botón que arrastra el pin (`window.qa.arrastre` dice a dónde; el real necesita WebGL y un token); Atrás y la ✕ preguntan a la guardia
 *  como `useVolver`; Storage (`subirFoto`) se simula.
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
const TEATRO = "0b0b0b0b-0000-4000-8000-000000000001";
const GRIETA = "0b0b0b0b-0000-4000-8000-000000000002";
const GENERAL = "No se pudo guardar el lugar. Intenta de nuevo.";
const TOPE = { timeout: 30000 };
/** Con `CAPTURAS=<carpeta>` algunas pruebas guardan su captura (390×844 y 320×844). */
const capturas = process.env.CAPTURAS;
let dir, server, browser, origin;
const mocks = {
  "@/lib/subirFoto": "export async function subirFoto(carpeta,usuario,prefijo,archivo){window.qa.subidas.push({carpeta,usuario,prefijo,archivo:archivo.name});return {url:'/foto.svg'}}",
  "@/components/MapaDondeEs":
    "import React from 'react';const h=React.createElement;export default function M(p){return h('div',{role:'region','aria-label':'Mapa de prueba','data-pin':p.seleccion?p.seleccion.lat+','+p.seleccion.lng:'',style:{position:'relative',height:'100%',background:'var(--fondo-mapa)'}},h('button',{type:'button',style:{position:'absolute',left:0,top:0,width:44,height:44,opacity:0},onClick:()=>p.onArrastre(window.qa.arrastre)},'Arrastrar el pin'))}",
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
  dir = await mkdtemp(join(tmpdir(), "alta-lugar-"));
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
      import AltaLugar from './src/app/nuevo/lugar/AltaLugar';
      import {CIUDAD_INICIAL} from './src/lib/ciudad';
      import './src/app/globals.css';
      window.qa = {envios:[], subidas:[], reemplazos:[], salio:0, resultado:'publica', arrastre:{lat:22.1533,lng:-100.9811}, ...window.qaInicial};
      async function accion(_, fd){
        window.qa.envios.push(Object.fromEntries(fd.entries()));
        const r = window.qa.resultado;
        if (r === 'pendiente') return new Promise(() => {});
        if (r === 'general') return {ok:false, errores:{}, general:${JSON.stringify(GENERAL)}};
        if (r === 'parecidos' && fd.get('confirmado') !== '1') return {ok:false, errores:{}, parecidos:[{id:'${TEATRO}', slug:'teatro-de-la-paz', nombre:'Teatro de la Paz', tipo:'foro', direccion:'Villerías 205', lat:22.15, lng:-100.97, portada:null}]};
        return {ok:true, id:'0c0c0c0c-0000-4000-8000-0000000000aa', slug:'lugar-nuevo', volver:'/lugares/lugar-nuevo'};
      }
      const lugares = [
        {id:'${TEATRO}', slug:'teatro-de-la-paz', nombre:'Teatro de la Paz', tipo:'foro', direccion:'Villerías 205', lat:22.15, lng:-100.97, portada:null, zona:'America/Mexico_City', privado:false},
        {id:'${GRIETA}', slug:'taller-la-grieta', nombre:'Taller La Grieta', tipo:'colectivo', direccion:'Calle Grieta 4', lat:22.1530, lng:-100.9811, portada:null, zona:'America/Mexico_City', privado:false},
      ];
      const ciudades = [
        {...CIUDAD_INICIAL, lugares:40, eventos:3, zona:'America/Mexico_City', centroConocido:true},
        {slug:'queretaro', nombre:'Querétaro', centro:{lng:-100.39,lat:20.59}, zoom:13, lugares:2, eventos:0, zona:'America/Mexico_City', centroConocido:true},
      ];
      const a = window.qa.arranque ?? {};
      createRoot(document.getElementById('root')).render(
        <AltaLugar accion={accion} lugares={lugares} ciudadContexto={CIUDAD_INICIAL} conCiudad={window.qa.conCiudad ?? null} ciudades={ciudades} usuarioId="usuaria-1" esAdmin={!!window.qa.esAdmin} arranque={{nombre: a.nombre ?? '', punto: a.punto ?? null}} />
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

/** Lo que contesta Mapbox: dos sitios (un museo y un café) y la dirección de cada punto (sin ciudad lejos de San Luis). */
const SITIOS = {
  poeta: { id: "m-poeta", name: "Casa del Poeta Ramón López Velarde", full_address: "Vallejo 150, Centro, San Luis Potosí, México", feature_type: "poi", poi_category: ["museum"], lat: 22.151, lng: -100.978 },
  cafe: { id: "m-cafe", name: "Café del Jardín", full_address: "Jardín Guerrero 12, Centro, San Luis Potosí, México", feature_type: "poi", poi_category: ["cafe"], lat: 22.1495, lng: -100.979 },
};
const CONTEXTO = { place: { name: "San Luis Potosí" }, country: { name: "México", country_code: "mx" } };
const SIN_CIUDAD = { country: { name: "México", country_code: "mx" } };
const DIRECCIONES = { "22.1533": "Av. Universidad 300, Lomas, San Luis Potosí, México", "22.1527": "Calle Grieta 2, Centro, San Luis Potosí, México" };

async function pagina(t, { ancho = 390, qa = {}, geolocation = { latitude: 22.1527, longitude: -100.9811 } } = {}) {
  const context = await browser.newContext({ viewport: { width: ancho, height: 844 }, reducedMotion: "reduce", timezoneId: "America/Mexico_City", deviceScaleFactor: capturas ? 2 : 1, locale: "es-MX", geolocation, permissions: ["geolocation"] });
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
  await p.route("https://api.mapbox.com/**", (r) => {
    const url = new URL(r.request().url());
    const json = (cuerpo) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(cuerpo) });
    if (url.pathname.endsWith("/suggest")) {
      const q = (url.searchParams.get("q") ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const sitio = Object.entries(SITIOS).find(([clave]) => q.includes(clave))?.[1];
      return json({ suggestions: sitio ? [{ mapbox_id: sitio.id, name: sitio.name, full_address: sitio.full_address, feature_type: sitio.feature_type, poi_category: sitio.poi_category, distance: 120, context: CONTEXTO }] : [] });
    }
    if (url.pathname.includes("/retrieve/")) {
      const id = decodeURIComponent(url.pathname.split("/retrieve/")[1]);
      const sitio = Object.values(SITIOS).find((x) => x.id === id);
      return json({ features: [{ geometry: { coordinates: [sitio.lng, sitio.lat] }, properties: { name: sitio.name, full_address: sitio.full_address, poi_category: sitio.poi_category, context: CONTEXTO } }] });
    }
    if (url.pathname.endsWith("/reverse")) {
      const lat = url.searchParams.get("latitude");
      const direccion = DIRECCIONES[lat];
      const coordinates = { latitude: Number(lat), longitude: Number(url.searchParams.get("longitude")) };
      return json({ features: [{ properties: { name: (direccion ?? "Camino sin nombre").split(",")[0], full_address: direccion ?? "Camino sin nombre, México", coordinates, context: direccion ? CONTEXTO : SIN_CIUDAD } }] });
    }
    if (url.pathname.endsWith("/forward")) {
      return json({ features: [{ properties: { name: "Querétaro", place_formatted: "Querétaro, México", coordinates: { latitude: 20.59, longitude: -100.39 }, context: { country: { name: "México", country_code: "mx" } } } }] });
    }
    return r.abort();
  });
  await p.goto(origin);
  return p;
}
const boton = (p, nombre) => p.getByRole("button", { name: nombre });
const pregunta = (p) => p.locator("main h2").first().textContent();
const enPaso = (p, texto) => p.locator("main h2").filter({ hasText: texto }).waitFor();
const nombre = (p) => p.getByLabel("Nombre del lugar");
const enviado = (p) => p.evaluate(() => window.qa.envios.at(-1));
const sinDesborde = (p) => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
async function foto(p, archivo) {
  if (capturas) await p.screenshot({ path: join(capturas, `${archivo}.png`) });
}
/** Lo que se lee de cada renglón de «Revisa», sin la clave escondida para el lector de pantalla. */
const renglonesDe = (p) => p.locator("main ul > li").evaluateAll((li) => li.map((x) => x.querySelector(":scope > b").innerText.replace(/\s+/g, " ").trim()));
/** La ✕ de la barra del primer paso (sale a Lugares). */
const cerrar = (p) => p.getByRole("link", { name: "Cerrar (Lugares)" });
/** Caso 1: el nombre, la sugerencia del mapa y «Sí, es aquí»: queda en «Revisa». */
async function hastaRevisa(p) {
  await nombre(p).fill("Casa del Poeta");
  await p.getByRole("option", { name: /Casa del Poeta Ramón López Velarde/ }).click();
  await enPaso(p, "¿Es aquí?");
  await boton(p, "Sí, es aquí").click();
  await p.getByRole("heading", { name: "Casa del Poeta Ramón López Velarde" }).waitFor();
}

test("primer paso: «¿Cómo se llama?» con la ✕ del campo, el pie que dice qué falta y, debajo, la tira con «Lugar» marcado y la ciudad en los enlaces", TOPE, async (t) => {
  const p = await pagina(t, { qa: { conCiudad: "queretaro" } });
  assert.equal(await pregunta(p), "¿Cómo se llama?");
  assert.equal(await boton(p, "Falta el nombre").getAttribute("aria-disabled"), "true");
  const tira = p.getByRole("group", { name: "Qué publicar" });
  assert.equal(await tira.locator("[aria-current=page]").textContent(), "Lugar");
  assert.deepEqual(await tira.getByRole("link").evaluateAll((a) => a.map((x) => [x.textContent, x.getAttribute("href")])), [
    ["Evento", "/nuevo/evento?ciudad=queretaro"],
    ["Artista", "/nuevo/artista?ciudad=queretaro"],
  ]);
  // La tira va dentro del pie, bajo el botón, y el pie al fondo de la pantalla.
  const pie = await p.locator("main > footer").boundingBox();
  assert.equal(Math.round(pie.y + pie.height), 844);
  assert.equal(await p.locator("main > footer").getByRole("group", { name: "Qué publicar" }).count(), 1);
  await nombre(p).fill("La Grieta");
  await boton(p, "Borrar lo escrito").waitFor();
  await boton(p, "Siguiente").waitFor();
  await foto(p, "lugar-1-nombre");
  // Al avanzar la tira se va; con Atrás vuelve.
  await boton(p, "Siguiente").click();
  await enPaso(p, "¿Dónde está?");
  assert.equal(await p.getByRole("group", { name: "Qué publicar" }).count(), 0);
  await boton(p, "Atrás").click();
  await enPaso(p, "¿Cómo se llama?");
  assert.equal(await p.getByRole("group", { name: "Qué publicar" }).count(), 1);
  assert.equal(await nombre(p).inputValue(), "La Grieta");
});

test("caso 1 · con sugerencia: tocarla confirma en el mapa («¿Es aquí?» con nombre y dirección) y, con el tipo dicho por el mapa, va directo a «Revisa»; publica y queda en «Publicado»", TOPE, async (t) => {
  const p = await pagina(t);
  await nombre(p).fill("Casa del Poeta");
  await p.getByRole("option", { name: /Casa del Poeta Ramón López Velarde/ }).click();
  await enPaso(p, "¿Es aquí?");
  const tarjeta = p.locator("main [role=status]").filter({ hasText: "Casa del Poeta" });
  assert.match(await tarjeta.innerText(), /Vallejo 150/);
  assert.equal(await boton(p, "Buscar otro").count(), 1);
  await foto(p, "lugar-2-es-aqui");
  await boton(p, "Sí, es aquí").click();
  await p.getByRole("heading", { name: "Casa del Poeta Ramón López Velarde" }).waitFor();
  assert.deepEqual(await renglonesDe(p), ["Vallejo 150, Centro, San Luis Potosí, México", "Museo", "Horario", "Foto, descripción o redes"]);
  assert.equal(await boton(p, "Agregar horario").count(), 1);
  assert.equal(await boton(p, "Agregar foto, descripción o redes").count(), 1);
  await boton(p, "Publicar lugar").click();
  await p.getByRole("heading", { name: "Lugar publicado" }).waitFor();
  const d = await enviado(p);
  assert.deepEqual(
    { nombre: d.nombre, tipo: d.tipo, lat: d.lat, lng: d.lng, ciudad: d.ciudad, direccion: d.direccion, horario: d.horario, quedarse: d.quedarse, confirmado: d.confirmado },
    { nombre: "Casa del Poeta Ramón López Velarde", tipo: "museo", lat: "22.151", lng: "-100.978", ciudad: "San Luis Potosí", direccion: "Vallejo 150, Centro, San Luis Potosí, México", horario: "[]", quedarse: "1", confirmado: "" },
  );
  // «Publicado»: el lugar como quedó, la sugerencia en punteado y «Compartir» con el texto de la ficha.
  assert.equal(await p.getByRole("link", { name: "Publicar un evento aquí" }).getAttribute("href"), "/nuevo/evento?lugar=0c0c0c0c-0000-4000-8000-0000000000aa");
  assert.match(await p.locator("main ul").first().innerText(), /Casa del Poeta Ramón López Velarde/);
  await foto(p, "lugar-7-publicado");
  await boton(p, "Compartir").click();
  await p.waitForFunction(() => window.compartidos.length === 1);
  assert.deepEqual(await p.evaluate(() => window.compartidos[0]), { titulo: "Casa del Poeta Ramón López Velarde", texto: "Casa del Poeta Ramón López Velarde · Museo · Vallejo 150, Centro, San Luis Potosí, México", url: "https://somosnosotros.org/lugares/lugar-nuevo" });
  // «Publicar otro» vuelve a empezar, vacío.
  await boton(p, "Publicar otro").click();
  await enPaso(p, "¿Cómo se llama?");
  assert.equal(await nombre(p).inputValue(), "");
});

test("si ya tiene ficha, se dice al escribir el nombre y la salida es ir a ella", TOPE, async (t) => {
  const p = await pagina(t);
  await nombre(p).fill("Teatro de la");
  const ficha = p.getByRole("option", { name: /Teatro de la Paz/ });
  await ficha.waitFor();
  assert.match(await ficha.innerText(), /Ya tiene ficha · Ir a su ficha/);
  assert.equal(await ficha.getAttribute("href"), "/lugares/teatro-de-la-paz");
  await foto(p, "lugar-3-ya-tiene-ficha");
});

test("caso 2 · sin sugerencia: «¿Dónde está?» con el campo, «Estoy aquí» y el pin; a menos de 150 m de otro lugar, «¿Es este?»; después el tipo (elegir avanza) y «Revisa»", TOPE, async (t) => {
  const p = await pagina(t);
  await nombre(p).fill("La Grieta");
  await boton(p, "Siguiente").click();
  await enPaso(p, "¿Dónde está?");
  await p.getByLabel("Buscar la dirección").waitFor();
  assert.equal(await boton(p, "Falta la ubicación").getAttribute("aria-disabled"), "true");
  await boton(p, /^Estoy aquí/).click();
  const esEste = p.locator("main [role=status]").filter({ hasText: "¿Es este?" });
  await esEste.waitFor();
  assert.match(await esEste.innerText(), /A \d+ m hay un lugar con ficha: Taller La Grieta\. Ir a su ficha/);
  assert.equal(await esEste.getByRole("link", { name: "Ir a su ficha" }).getAttribute("href"), "/lugares/taller-la-grieta");
  await p.locator("main [role=status]").filter({ hasText: "Calle Grieta 2" }).waitFor();
  await foto(p, "lugar-4-donde-esta");
  await boton(p, "Listo").click();
  await enPaso(p, "¿Qué tipo de lugar es?");
  const tipos = await p.getByRole("group", { name: "Tipo de lugar" }).getByRole("button").allInnerTexts();
  assert.equal(tipos.length, 10);
  assert.ok(tipos.includes("Café, bar o restaurante"));
  assert.ok(await sinDesborde(p));
  await foto(p, "lugar-5-tipo");
  await boton(p, "Galería").click();
  await p.getByRole("heading", { name: "La Grieta" }).waitFor();
  assert.equal((await renglonesDe(p))[1], "Galería");
});

test("caso 4 · un café entra con su tipo, deducido del mapa, sin ningún aviso de negocio", TOPE, async (t) => {
  const p = await pagina(t);
  await nombre(p).fill("Café del");
  await p.getByRole("option", { name: /Café del Jardín/ }).click();
  await enPaso(p, "¿Es aquí?");
  assert.equal(await p.getByText(/No entra al directorio|negocio/).count(), 0);
  await boton(p, "Sí, es aquí").click();
  await p.getByRole("heading", { name: "Café del Jardín" }).waitFor();
  assert.equal((await renglonesDe(p))[1], "Café, bar o restaurante");
  await boton(p, "Publicar lugar").click();
  await p.waitForFunction(() => window.qa.envios.length === 1);
  assert.equal((await enviado(p)).tipo, "cafe_bar");
});

test("«Otro» pregunta qué es (opcional), con su ✕ y su tope, y «Revisa» lo dice junto al tipo", TOPE, async (t) => {
  const p = await pagina(t);
  await nombre(p).fill("La Grieta");
  await boton(p, "Siguiente").click();
  await boton(p, /^Estoy aquí/).click();
  await boton(p, "Listo").click();
  await boton(p, "Otro").click();
  await enPaso(p, "¿Qué es?");
  assert.equal(await boton(p, "Seguir sin decirlo").count(), 1);
  await p.getByLabel("Qué es").fill("taller de cerámica");
  await boton(p, "Siguiente").click();
  await p.getByRole("heading", { name: "La Grieta" }).waitFor();
  assert.equal((await renglonesDe(p))[1], "Otro · taller de cerámica");
  await boton(p, "Publicar lugar").click();
  await p.waitForFunction(() => window.qa.envios.length === 1);
  assert.deepEqual([(await enviado(p)).tipo, (await enviado(p)).detalle], ["otro", "taller de cerámica"]);
});

// A 1280 el flujo es el mismo que en el teléfono: la hoja es un diálogo al centro (`ui/Hoja`), con lo mismo dentro.
for (const ancho of [390, 320, 1280]) {
  test(`horario a ${ancho}: la hoja abre con Ma–Do de 10 a 6; «Agregar otro horario» trae los días que faltan; la franja puesta se encoge; «Listo» siempre a la vista; «Revisa» lo enseña estructurado y se publica`, TOPE, async (t) => {
    const p = await pagina(t, { ancho });
    await hastaRevisa(p);
    await boton(p, "Agregar horario").click();
    const hoja = p.getByRole("dialog", { name: "Horario" });
    await hoja.getByRole("heading", { name: "¿Qué días abre?" }).waitFor();
    // Los días marcados de la franja abierta, como se ven (el nombre entero es para el lector de pantalla).
    const dias = () => hoja.getByRole("group", { name: "Días" }).getByRole("button").evaluateAll((b) => b.filter((x) => x.getAttribute("aria-pressed") === "true").map((x) => x.querySelector("[aria-hidden]").textContent));
    assert.deepEqual(await dias(), ["Ma", "Mi", "Ju", "Vi", "Sá", "Do"]);
    // Los días son toques redondos de 44 × 44; a 390 caben los siete en una fila, a 320 pasan al renglón de abajo.
    const cajas = await hoja.getByRole("group", { name: "Días" }).getByRole("button").evaluateAll((b) => b.map((x) => { const c = x.getBoundingClientRect(); return [Math.round(c.width), Math.round(c.height), Math.round(c.top)]; }));
    assert.ok(cajas.every(([w, h]) => w === 44 && h === 44), JSON.stringify(cajas));
    assert.equal(new Set(cajas.map(([, , top]) => top)).size, ancho >= 390 ? 1 : 2);
    // Lu–Vi de 10 a 2 y de 4 a 8 (cierre a comer), y el sábado de 4 a 8: tres franjas.
    await hoja.getByRole("button", { name: "lunes" }).click();
    await hoja.getByRole("button", { name: "sábado" }).click();
    await hoja.getByRole("button", { name: "domingo" }).click();
    await hoja.getByRole("group", { name: "Cierra" }).getByRole("button", { name: /^2:00/ }).click();
    await hoja.getByRole("button", { name: "Agregar otro horario" }).click();
    assert.deepEqual(await dias(), ["Sá", "Do"], "la franja nueva llega con los días que aún no tienen horario");
    await hoja.getByRole("button", { name: "domingo" }).click();
    await hoja.getByRole("group", { name: "Abre" }).getByRole("button", { name: /^4:00/ }).click();
    await hoja.getByRole("group", { name: "Cierra" }).getByRole("button", { name: /^8:00/ }).click();
    await hoja.getByRole("button", { name: "Agregar otro horario" }).click();
    assert.deepEqual(await dias(), ["Do"]);
    for (const d of ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes"]) await hoja.getByRole("button", { name: d }).click();
    // Las dos franjas puestas, encogidas a un renglón con su ✕; «Listo» a la vista dentro de la ventana.
    const puestas = hoja.getByRole("button", { name: /^Quitar el horario de/ });
    assert.equal(await puestas.count(), 2);
    const listo = await hoja.getByRole("button", { name: "Listo" }).boundingBox();
    assert.ok(listo.y + listo.height <= 844, `«Listo» termina en ${listo.y + listo.height}`);
    assert.ok(await sinDesborde(p));
    await foto(p, `lugar-8-hoja-horario-${ancho}`);
    await hoja.getByRole("button", { name: "Listo" }).click();
    await boton(p, "Cambiar horario").waitFor();
    assert.equal((await renglonesDe(p))[2], "Lu–Vi 10:00 a.m.–2:00 p.m. y 4:00 p.m.–8:00 p.m. Sá 4:00 p.m.–8:00 p.m. Cierra Do");
    assert.ok(await sinDesborde(p));
    await foto(p, `lugar-6-revisa-horario-${ancho}`);
    await boton(p, "Publicar lugar").click();
    await p.waitForFunction(() => window.qa.envios.length === 1);
    assert.deepEqual(JSON.parse((await enviado(p)).horario), [
      { dias: [1, 2, 3, 4, 5], abre: "10:00", cierra: "14:00" },
      { dias: [6], abre: "16:00", cierra: "20:00" },
      { dias: [1, 2, 3, 4, 5], abre: "16:00", cierra: "20:00" },
    ]);
  });
}

test("horario: la franja puesta se vuelve a abrir al tocarla, la ✕ la quita y cerrar la hoja sin «Listo» no cambia nada", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaRevisa(p);
  await boton(p, "Agregar horario").click();
  const hoja = p.getByRole("dialog", { name: "Horario" });
  await hoja.getByRole("button", { name: "Agregar otro horario" }).click();
  await hoja.getByRole("button", { name: /^Ma–Do/ }).click();
  assert.equal(await hoja.getByRole("button", { name: "Quitar este horario" }).count(), 1);
  await hoja.getByRole("button", { name: /^Quitar el horario de Lu/ }).click();
  assert.equal(await hoja.getByRole("button", { name: /^Quitar el horario de/ }).count(), 0);
  await hoja.getByRole("button", { name: "Cerrar" }).click();
  assert.equal((await renglonesDe(p))[2], "Horario");
  assert.equal(await boton(p, "Agregar horario").count(), 1);
});

test("la ciudad: lejos de la de contexto y sin ciudad del mapa, «Revisa» la pide (nunca San Luis Potosí en silencio) y se elige en su hoja", TOPE, async (t) => {
  const p = await pagina(t, { qa: { arrastre: { lat: 20.6, lng: -100.4 } } });
  await nombre(p).fill("Foro del Carmen");
  await boton(p, "Siguiente").click();
  await enPaso(p, "¿Dónde está?");
  await boton(p, "Arrastrar el pin").click();
  await boton(p, "Listo").click();
  // «Foro del Carmen» dice su tipo: no se pregunta.
  await p.getByRole("heading", { name: "Foro del Carmen" }).waitFor();
  assert.equal(await boton(p, "Falta la ciudad").getAttribute("aria-disabled"), "true");
  await boton(p, "Poner ciudad").click();
  const hoja = p.getByRole("dialog", { name: "Ciudad" });
  assert.match(await hoja.innerText(), /Querétaro\s*2 lugares/);
  await hoja.getByRole("option", { name: /Querétaro/ }).click();
  await boton(p, "Publicar lugar").click();
  await p.waitForFunction(() => window.qa.envios.length === 1);
  assert.equal((await enviado(p)).ciudad, "Querétaro");
});

test("la ciudad: cerca de la de contexto y sin ciudad del mapa, se publica con la de contexto y no se pregunta", TOPE, async (t) => {
  const p = await pagina(t, { qa: { arrastre: { lat: 22.16, lng: -100.99 } } });
  await nombre(p).fill("Foro del Carmen");
  await boton(p, "Siguiente").click();
  await boton(p, "Arrastrar el pin").click();
  await boton(p, "Listo").click();
  await p.getByRole("heading", { name: "Foro del Carmen" }).waitFor();
  assert.equal(await boton(p, "Poner ciudad").count(), 0);
  await boton(p, "Publicar lugar").click();
  await p.waitForFunction(() => window.qa.envios.length === 1);
  assert.equal((await enviado(p)).ciudad, "San Luis Potosí");
});

test("foto, descripción y redes: lo opcional del formulario de siempre, en su paso; «Revisa» dice lo que se agregó y se publica", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaRevisa(p);
  await boton(p, "Agregar foto, descripción o redes").click();
  await enPaso(p, "¿Quieres agregar algo?");
  await p.locator("main input[type=file]").setInputFiles({ name: "portada.png", mimeType: "image/png", buffer: Buffer.from("x") });
  await boton(p, "Listo").waitFor();
  await p.locator("main img").waitFor();
  await p.getByRole("button", { name: "Descripción corta" }).click();
  await p.locator("textarea").fill("Museo de la casa del poeta");
  await p.getByRole("dialog", { name: "Descripción corta" }).getByRole("button", { name: "Listo" }).click();
  await p.locator("#campo-enlace").fill("instagram.com/casadelpoeta");
  await boton(p, "Añadir").click();
  await p.getByRole("list", { name: "Enlaces" }).waitFor();
  await boton(p, "Listo").click();
  await p.getByRole("heading", { name: "Casa del Poeta Ramón López Velarde" }).waitFor();
  assert.equal((await renglonesDe(p))[3], "Foto, descripción y 1 red");
  await boton(p, "Publicar lugar").click();
  await p.waitForFunction(() => window.qa.envios.length === 1);
  const d = await enviado(p);
  assert.deepEqual([d.portada, d.descripcion], ["/foto.svg", "Museo de la casa del poeta"]);
  assert.match(JSON.parse(d.enlaces)[0].url, /instagram\.com\/casadelpoeta/);
  assert.deepEqual(await p.evaluate(() => window.qa.subidas), [{ carpeta: "lugares", usuario: "usuaria-1", prefijo: "portada", archivo: "portada.png" }]);
});

test("la administración ve «Solo yo lo veo» y la dirección de una imagen; nadie más", TOPE, async (t) => {
  const p = await pagina(t, { qa: { esAdmin: true } });
  await hastaRevisa(p);
  await boton(p, "Agregar foto, descripción o redes").click();
  await p.getByRole("checkbox", { name: /Solo yo lo veo/ }).click();
  await p.getByLabel("O pega la dirección de una imagen").waitFor();
  await boton(p, "Listo").last().click();
  await boton(p, "Publicar lugar").click();
  await p.waitForFunction(() => window.qa.envios.length === 1);
  assert.equal((await enviado(p)).privado, "1");
  const otra = await pagina(t);
  await hastaRevisa(otra);
  await boton(otra, "Agregar foto, descripción o redes").click();
  assert.equal(await otra.getByRole("checkbox", { name: /Solo yo lo veo/ }).count(), 0);
});

test("un error del servidor sale en «Revisa» y la guardia vuelve; si encuentra uno parecido cerca, «¿Es este?» y «No, es otro: publicar de todos modos»", TOPE, async (t) => {
  const p = await pagina(t, { qa: { resultado: "general" } });
  await hastaRevisa(p);
  await boton(p, "Publicar lugar").click();
  await p.getByRole("alert").filter({ hasText: GENERAL }).waitFor();
  await boton(p, "Atrás").click();
  await enPaso(p, "¿Es aquí?");
  await boton(p, "Atrás").click();
  await cerrar(p).click();
  await p.getByRole("heading", { name: "¿Salir sin publicar?" }).waitFor();
  assert.equal(await p.evaluate(() => window.qa.salio), 0);

  const q = await pagina(t, { qa: { resultado: "parecidos" } });
  await hastaRevisa(q);
  await boton(q, "Publicar lugar").click();
  const caja = q.getByRole("alert").filter({ hasText: "¿Es este?" });
  await caja.waitFor();
  assert.equal(await caja.getByRole("link").getAttribute("href"), "/lugares/teatro-de-la-paz");
  await boton(q, "No, es otro: publicar de todos modos").click();
  await boton(q, "Publicar lugar").click();
  await q.getByRole("heading", { name: "Lugar publicado" }).waitFor();
  assert.deepEqual(await q.evaluate(() => window.qa.envios.map((e) => e.confirmado)), ["", "1"]);
});

test("con el nombre y el punto de entrada (el dedo sostenido en Lugares): el nombre ya escrito y el mapa pregunta «¿Es aquí?» con la dirección del punto", TOPE, async (t) => {
  const p = await pagina(t, { qa: { arranque: { nombre: "Foro del Carmen", punto: { lat: 22.1533, lng: -100.9811 } } } });
  assert.equal(await nombre(p).inputValue(), "Foro del Carmen");
  await boton(p, "Siguiente").click();
  await enPaso(p, "¿Es aquí?");
  await p.locator("main [role=status]").filter({ hasText: "Av. Universidad 300" }).waitFor();
  await boton(p, "Sí, es aquí").click();
  await p.getByRole("heading", { name: "Foro del Carmen" }).waitFor();
  assert.equal((await renglonesDe(p))[1], "Foro");
});

test("la guardia: sin nada escrito la ✕ sale sin preguntar; con el nombre escrito, pregunta", TOPE, async (t) => {
  const p = await pagina(t);
  await cerrar(p).click();
  assert.equal(await p.evaluate(() => window.qa.salio), 1);
  const q = await pagina(t);
  await nombre(q).fill("La Grieta");
  await cerrar(q).click();
  await q.getByRole("heading", { name: "¿Salir sin publicar?" }).waitFor();
  assert.equal(await q.evaluate(() => window.qa.salio), 0);
});

test('reintentar conserva la operación; cambiar datos y publicar otro la renuevan', TOPE, async (t) => {
  const p = await pagina(t, { qa: { resultado: 'general' } });
  await hastaRevisa(p);
  await boton(p, 'Publicar lugar').click();
  await p.getByRole('alert').filter({ hasText: GENERAL }).waitFor();
  const primera = (await enviado(p)).operacion;
  assert.match(primera, /^[0-9a-f-]{36}$/);
  await boton(p, 'Publicar lugar').click();
  await p.waitForFunction(() => window.qa.envios.length === 2);
  assert.equal((await enviado(p)).operacion, primera);
  await boton(p, 'Agregar foto, descripción o redes').click();
  await enPaso(p, '¿Quieres agregar algo?');
  await p.getByRole('button', { name: 'Descripción corta' }).click();
  await p.locator('textarea').fill('Nueva descripción del lugar');
  await p.getByRole('dialog', { name: 'Descripción corta' }).getByRole('button', { name: 'Listo' }).click();
  await boton(p, 'Listo').click();
  await p.getByRole('heading', { name: 'Casa del Poeta Ramón López Velarde' }).waitFor();
  await p.evaluate(() => window.qa.resultado = 'publica');
  await boton(p, 'Publicar lugar').click();
  await p.getByRole('heading', { name: 'Lugar publicado' }).waitFor();
  assert.notEqual((await enviado(p)).operacion, primera);
  await foto(p, 'ol330-lugar-publicado-390');
  const anterior = (await enviado(p)).operacion;
  await boton(p, 'Publicar otro').click();
  await hastaRevisa(p);
  await boton(p, 'Publicar lugar').click();
  await p.waitForFunction(() => window.qa.envios.length === 4);
  assert.notEqual((await enviado(p)).operacion, anterior);
});
