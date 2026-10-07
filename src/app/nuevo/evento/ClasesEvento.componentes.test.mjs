/** OL-321 (bitácora 350): exposición, taller y festival en el alta por pasos (doc 55; prototipo `exposicion-festival-taller.html`, casos 1 a 5).
 *  El mismo arnés que `AltaEvento.componentes.test.mjs` (el alta real, con la acción, la lectura del cartel, Storage y Mapbox simulados) y, además,
 *  lo que la página pasa de cómo ocurre (`contexto`: el horario de cada lugar y los festivales que se pueden elegir). Reloj fijo: miércoles 7 de
 *  octubre de 2026. Con `CAPTURAS_350=<carpeta>` guarda las capturas de la bitácora 350.
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
const LUGAR = "0b0b0b0b-0000-4000-8000-000000000001";
const OTRO_LUGAR = "0b0b0b0b-0000-4000-8000-000000000002";
const GENERAL = "No se pudo publicar el evento completo. Intenta de nuevo.";
const TOPE = { timeout: 30000 };
/** Con `CAPTURAS=<carpeta>` las pruebas de la duración (bitácora 328) y del cartel (bitácora 330) guardan sus capturas a 390×844. */
const capturas = process.env.CAPTURAS;
/** Un PNG de 1×1: lo que entrega la ruta de descarga simulada. */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
/** Un cartel de mentira, vertical (4:5): lo que «sube» la persona y lo que Storage devuelve. */
const CARTEL = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><rect width="400" height="500" fill="#4a3a6b"/><rect x="30" y="30" width="340" height="440" fill="none" stroke="#e8dff5" stroke-width="3"/><text x="200" y="230" fill="#fff" font-family="Arial" font-size="42" font-weight="800" text-anchor="middle">ECOS DE</text><text x="200" y="285" fill="#fff" font-family="Arial" font-size="42" font-weight="800" text-anchor="middle">PAPEL</text><text x="200" y="360" fill="#e8dff5" font-family="Arial" font-size="22" text-anchor="middle">Jueves 5 de noviembre · 19:00</text></svg>';
let dir, server, browser, origin;
const mocks = {
  "@/app/eventos/acciones": `
    export async function leerCartelAccion(url){
      const q=window.qa;q.lecturas.push(url);
      if(q.espera)await new Promise((r)=>{q.liberar=r});
      if(q.lectura==='throw')throw Error('corte del modelo');
      if(q.lectura==='fallo')return {ok:false,mensaje:'Llena los datos a mano; la imagen se queda puesta.'};
      if(q.lectura==='sinCupo')return {ok:false,sinCupo:true};
      return structuredClone(q.lectura);
    }
  `,
  "@/lib/subirFoto": "export async function subirFoto(carpeta,usuario,prefijo,archivo){const q=window.qa;q.subidas.push({carpeta,usuario,prefijo,archivo:archivo.name});if(q.esperaSubida)await new Promise((r)=>{q.liberarSubida=r});if(q.subida==='throw')throw Error('corte');return q.subida==='error'?{error:'No se pudo subir la imagen. Intenta con otra.',motivo:'subida'}:{url:'/cartel.svg'}}",
  // El mapa de «¿Es aquí?»: dice dónde está el pin y su botón lo arrastra a otro punto (como `onArrastre` del real).
  "@/components/MapaDondeEs":
    "import React from 'react';const h=React.createElement;export default function M(p){return h('div',{role:'region','aria-label':'Mapa de prueba','data-pin':p.seleccion?p.seleccion.lat+','+p.seleccion.lng:'',style:{position:'relative',height:'100%',background:'var(--fondo-mapa)'}},h('svg',{viewBox:'0 0 24 24',width:44,height:44,fill:'currentColor',fillRule:'evenodd',style:{position:'absolute',left:'calc(50% - 22px)',top:'calc(50% - 44px)',color:'var(--primario)'}},h('path',{d:'M12 22s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12zm0-9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z'})),h('button',{type:'button',style:{position:'absolute',left:0,top:0,width:44,height:44,opacity:0},onClick:()=>p.onArrastre({lat:22.1533,lng:-100.9811})},'Arrastrar el pin'))}",
  // La acción que crea el lugar (la de la hoja de siempre): guarda lo que recibe; `window.qa.lugar` dice qué contesta.
  "@/app/lugares/acciones":
    "export async function crearLugarDesdeEvento(d){window.qa.lugares.push(d);if(window.qa.lugar==='falla')return {ok:false,error:'Sin conexión'};if(window.qa.lugar==='lanza')throw new Error('red');if(window.qa.lugar==='lento')return new Promise(()=>{});if(window.qa.lugar==='existe')return {ok:true,id:'0b0b0b0b-0000-4000-8000-000000000001',reutilizado:true};return {ok:true,id:'0b0b0b0b-0000-4000-8000-0000000000aa',reutilizado:false}}",
  "./Atras":
    "import React from 'react';import {pedirSalida} from './src/lib/guardiaSalida';export function useVolver(){return (e)=>{e.preventDefault();const ir=()=>window.qa.salio++;if(!pedirSalida(ir))ir();}}export function useTerminar(){return ()=>{}}export default function Atras(){return null}export function AtrasIcono(){return null}",
  "./Navegacion": "export const registrarVolverVisible=()=>()=>{}",
  "@/app/eventos/SelectorQuien": "export default function C(){return null}",
  "@/lib/useAvisosTelefono": "export function usePlataforma(){return null}",
  // La imagen de las listas (`ui/Imagen`) es `next/image` con su optimizador, que fuera de Next no corre; aquí es la etiqueta `img` a secas
  // (el optimizador y su respaldo ya los prueba `Imagen.componentes.test.mjs`).
  "./Imagen": "import React from 'react';export default function Imagen({src,alt,className,width,height,loading}){return React.createElement('img',{src,alt,className,width,height,loading})}",
  // La barra trae el logotipo de las pantallas interiores (con `next/image` y el enrutador), que fuera de Next no carga ni se usa aquí.
  "./Logotipo": "export default function Logotipo(){return null}",
  // La tira de tipos reemplaza la entrada con el enrutador de Next; aquí solo anota a dónde.
  "next/navigation": "export function useRouter(){return {replace:(href)=>window.qa.reemplazos.push(href)}}",
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link({prefetch,replace,...p}){return React.createElement('a',p)}",
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "clases-por-pasos-"));
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
      import AltaEvento from './src/app/nuevo/evento/AltaEvento';
      import {arranqueDe, respuestasDeEvento} from './src/app/nuevo/evento/arranque';
      import {pedirSalida} from './src/lib/guardiaSalida';
      import './src/app/globals.css';
      // resultado: 'general' (falla el guardado) | 'enlace' (el servidor rechaza el enlace) | 'pendiente' (no contesta)
      // Lo que simulan el servidor y Storage (ver los dobles de arriba): el cupo con el que abre la pantalla, si hay lectura de cartel,
      // qué contesta la lectura ('fallo' | 'sinCupo' | 'throw' | un objeto con el resultado), si «espera» a que el test la libere.
      window.qa = {envios:[], lugares:[], lugar:'creado', resultado:'general', salio:0, pedirSalida, cupoAlAbrir:{usadas:1,tope:6,sinTope:false}, cartelActivo:true, lecturas:[], reemplazos:[], subidas:[], lectura:null, subida:'ok', espera:false, esperaSubida:false, ...window.qaInicial};
      async function accion(_, fd){
        window.qa.envios.push(Object.fromEntries(fd.entries()));
        if (window.qa.resultado === 'pendiente') return new Promise(() => {});
        if (window.qa.resultado === 'enlace') return {ok:false, errores:{enlace:'Ese enlace no se ve bien.'}};
        if (window.qa.resultado === 'publica') { const n = window.qa.envios.length; return {ok:true, id:'0e0e0e0e-0000-4000-8000-00000000000'+n, slug:'lectura-en-voz-alta-ab1'+n, href:'/eventos/lectura-en-voz-alta-ab1'+n}; }
        return {ok:false, errores:{}, general:${JSON.stringify(GENERAL)}};
      }
      const lugares = [
        {id:'${LUGAR}', nombre:'Teatro de la Paz', tipo:'foro', direccion:'Villerías 205', lat:22.15, lng:-100.97, portada:null, zona:'America/Mexico_City', privado:false},
        {id:'${OTRO_LUGAR}', nombre:'Centro de las Artes', tipo:'casa_de_cultura', direccion:'Calz. de Guadalupe 705', lat:22.1417, lng:-101.0021, portada:null, zona:'America/Mexico_City', privado:false},
      ];
      // Por dónde se entró (OL-312), como lo arma la página con lo que trae la consulta: \`abrir.lugar\` (un id), \`abrir.artista\` ({id, nombre})
      // o \`abrir.desde\` ({evento, quien}); la ✕ sale a \`abrir.salida\`.
      const abrir = window.qa.abrir ?? {};
      const arranque = arranqueDe({ desde: abrir.desde ? respuestasDeEvento(abrir.desde.evento, lugares, abrir.desde.quien) : null, lugar: lugares.find((l) => l.id === abrir.lugar) ?? null, artista: abrir.artista ?? null });
      createRoot(document.getElementById('root')).render(
        <AltaEvento accion={accion} lugares={lugares} mios={[]} ciudadContexto={window.qa.ciudad ?? null} salida={{href: abrir.salida ?? '/', texto:'Volver'}} usuarioId="usuaria-1" cartelActivo={window.qa.cartelActivo} cupo={window.qa.cupoAlAbrir} arranque={arranque} contexto={window.qa.contexto ?? {horarios:{}, festivales:[]}} />
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
  // Con `FUENTE=<archivo .woff2 de Bricolage>` (el de `.next/static/media` tras compilar) las capturas salen con la letra de la app.
  const fuente = process.env.FUENTE ? await readFile(process.env.FUENTE) : null;
  const assets = new Map([
    ["/", ["text/html", `<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>${fuente ? "@font-face{font-family:Bricolage;src:url(/bricolage.woff2) format('woff2');font-weight:200 800;font-stretch:75% 100%}:root{--fuente-bricolage:Bricolage}" : ":root{--fuente-bricolage:Arial}"}</style><div id="root"></div><script src="/app.js"></script>`]],
    ["/cartel.svg", ["image/svg+xml", CARTEL]],
    // La imagen de relleno de las listas (el símbolo SN): lo que enseña la tarjeta de «Publicado» de un evento sin cartel en un lugar sin foto.
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

/** Lo que contesta Mapbox (Search Box y geocodificación inversa) en estas pruebas: tres sitios y la dirección de un punto. */
const SITIOS = {
  jardin: { id: "m-jardin", name: "Jardín de San Juan de Dios", full_address: "Calle Madero 1, Centro Histórico, San Luis Potosí, México", feature_type: "poi", poi_category: ["park"], lat: 22.1511, lng: -100.9772 },
  galeana: { id: "m-galeana", name: "Galeana 423", full_address: "Galeana 423, Centro, San Luis Potosí, México", feature_type: "address", poi_category: [], lat: 22.15, lng: -100.98 },
  teatro: { id: "m-teatro", name: "Teatro Polivalente", full_address: "Calle Reforma 5, Centro, San Luis Potosí, México", feature_type: "poi", poi_category: ["theatre"], lat: 22.153, lng: -100.975 },
  cantina: { id: "m-cantina", name: "La Cantina", full_address: "Calle Zaragoza 12, Centro, San Luis Potosí, México", feature_type: "poi", poi_category: ["bar"], lat: 22.152, lng: -100.979 },
};
const CONTEXTO = { place: { name: "San Luis Potosí" }, country: { name: "México", country_code: "mx" } };
const DIRECCIONES = { "22.1533": "Av. Universidad 300, Lomas, San Luis Potosí, México", "22.16": "Av. Carranza 100, Centro, San Luis Potosí, México", "22.1504": "Villerías 207, Centro, San Luis Potosí, México" };

async function pagina(t, { movimiento = "reduce", ancho = 390, qa = {}, fotos = false, geolocation = { latitude: 22.1504, longitude: -100.97 } } = {}) {
  const context = await browser.newContext({ viewport: { width: ancho, height: 844 }, reducedMotion: movimiento, timezoneId: "America/Mexico_City", deviceScaleFactor: capturas ? 2 : 1, locale: "es-MX", geolocation, permissions: ["geolocation"] });
  t.after(() => context.close());
  await context.clock.setFixedTime(new Date("2026-10-07T16:00:00Z"));
  const p = await context.newPage();
  p.setDefaultTimeout(8000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  t.after(() => assert.deepEqual(errors, []));
  await p.addInitScript((inicial) => (window.qaInicial = inicial), qa);
  // La app de iPhone (OL-317): Capacitor con `FotosPlugin`; lo que recibe queda en `window.guardadasEnFotos`.
  await p.addInitScript((enLaApp) => {
    window.guardadasEnFotos = [];
    if (enLaApp) window.Capacitor = { Plugins: { Fotos: { guardarFoto: async (d) => void window.guardadasEnFotos.push({ tipo: d.tipo, bytes: atob(d.datos).length }) } } };
  }, fotos);
  // La hoja de compartir del teléfono: guarda lo que recibe (el texto de «Compartir» y el botón de descargar ya no abre la hoja).
  await p.addInitScript(() => {
    window.compartidos = [];
    Object.defineProperty(navigator, "canShare", { value: () => true, configurable: true });
    Object.defineProperty(navigator, "share", { configurable: true, value: async (d) => void window.compartidos.push({ titulo: d.title, texto: d.text, url: d.url, archivo: d.files?.[0] && { nombre: d.files[0].name, tipo: d.files[0].type, bytes: d.files[0].size } }) });
  });
  await p.route("**/*", (r) => (new URL(r.request().url()).origin === origin ? r.continue() : r.abort()));
  // La ruta de descarga del cartel: un PNG con su nombre, como la real.
  await p.route(`${origin}/api/cartel/**`, (r) => r.fulfill({ status: 200, contentType: "image/png", headers: { "Content-Disposition": 'attachment; filename="cartel-prueba.png"' }, body: PNG }));
  // Mapbox simulado; `p.mapbox` cuenta lo que se le pidió (el rebote de la búsqueda se prueba con él).
  p.mapbox = { sugerir: [], recuperar: [], inversa: [] };
  await p.route("https://api.mapbox.com/**", (r) => {
    const url = new URL(r.request().url());
    const json = (cuerpo) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(cuerpo) });
    if (url.pathname.endsWith("/suggest")) {
      const q = (url.searchParams.get("q") ?? "").toLowerCase();
      p.mapbox.sugerir.push(q);
      const sitio = Object.entries(SITIOS).find(([clave]) => q.includes(clave))?.[1];
      return json({ suggestions: sitio ? [{ mapbox_id: sitio.id, name: sitio.name, full_address: sitio.full_address, feature_type: sitio.feature_type, poi_category: sitio.poi_category, distance: 120, context: CONTEXTO }] : [] });
    }
    if (url.pathname.includes("/retrieve/")) {
      const id = decodeURIComponent(url.pathname.split("/retrieve/")[1]);
      p.mapbox.recuperar.push(id);
      const sitio = Object.values(SITIOS).find((x) => x.id === id);
      return json({ features: [{ geometry: { coordinates: [sitio.lng, sitio.lat] }, properties: { name: sitio.name, full_address: sitio.full_address, poi_category: sitio.poi_category, context: CONTEXTO } }] });
    }
    if (url.pathname.endsWith("/reverse")) {
      const lat = url.searchParams.get("latitude");
      p.mapbox.inversa.push(lat);
      const direccion = DIRECCIONES[lat] ?? "Calle sin nombre 1, San Luis Potosí, México";
      return json({ features: [{ properties: { name: direccion.split(",")[0], full_address: direccion, coordinates: { latitude: Number(lat), longitude: Number(url.searchParams.get("longitude")) }, context: CONTEXTO } }] });
    }
    return r.abort();
  });
  await p.goto(origin);
  return p;
}
const boton = (p, nombre) => p.getByRole("button", { name: nombre });
const pregunta = (p) => p.locator("main h2").first().textContent();
/** Espera a que el paso con esa pregunta esté a la vista (elegir un resultado del mapa o «Estoy aquí» tarda lo que tarda el servicio). */
const enPaso = (p, texto) => p.locator("main h2").filter({ hasText: texto }).waitFor();
const enviado = (p) => p.evaluate(() => window.qa.envios.at(-1));

const buscar = (p) => p.getByLabel("Buscar el lugar");
/** Elige «Teatro de la Paz» del directorio: escribe y toca su renglón en la lista flotante. */
async function elegirTeatro(p) {
  await buscar(p).fill("teatro");
  await p.getByRole("option", { name: /Teatro de la Paz/ }).click();
}

async function hastaHora(p, nombre = "Lectura en voz alta") {
  await boton(p, "No tengo cartel").click();
  await p.getByLabel("Nombre del evento").fill(nombre);
  await boton(p, "Siguiente").click();
  await boton(p, /^Este viernes/).click();
}
async function hastaRevisa(p) {
  await hastaHora(p);
  await p.getByRole("group", { name: "Empieza" }).getByRole("button", { name: /^7:00/ }).click();
  await p.getByRole("group", { name: "¿Cuánto dura?" }).getByRole("button", { name: "2 horas" }).click();
  await elegirTeatro(p);
  await boton(p, /^Gratis/).click();
  await p.getByRole("heading", { name: "Lectura en voz alta" }).waitFor();
}
/** Lo que devuelve `leerCartelAccion` cuando el cartel se lee completo (caso «legible» del prototipo): nombre, día y hora, un lugar del
 *  directorio, gratis y un artista. */
const LEIDO = { ok: true, valores: { titulo: "Inauguración de Ecos de papel", inicio: "2026-11-05T19:00", fin: "", gratis: true, precio: "", descripcion: "", enlace: "", lugar: "Teatro de la Paz", direccion: "" }, lugarId: LUGAR, quien: [{ nombre: "Lucía Montaño" }], horaLeida: true, costoLeido: true };
const subir = (p, nombre = "cartel.svg") => p.locator("input[type=file]").setInputFiles({ name: nombre, mimeType: "image/svg+xml", buffer: Buffer.from(CARTEL) });
/** Nada se sale de la ventana ni abre desplazamiento a lo ancho. */
const desborda = (p) =>
  p.evaluate(() => {
    const ancho = window.innerWidth;
    const fuera = [...document.querySelectorAll("main *")].filter((e) => {
      const c = e.getBoundingClientRect();
      return !e.closest("[hidden]") && c.width && (c.right > ancho + 0.5 || c.left < -0.5);
    });
    return { scroll: document.documentElement.scrollWidth - ancho, fuera: fuera.map((e) => e.tagName + "." + e.className) };
  });

// ---------------------------------------------------------------- OL-321: exposición, taller y festival (doc 55, casos 1 a 5)

const FESTIVAL = "0f0f0f0f-0000-4000-8000-000000000001";
/** Lo que la página pasa al alta: el horario del Teatro (Ma–Do de 10:00 a 18:00) y un festival propio que se puede elegir. */
const CONTEXTO_CLASE = {
  horarios: { [LUGAR]: [{ dias: [2, 3, 4, 5, 6, 7], abre: "10:00", cierra: "18:00" }] },
  festivales: [{ id: FESTIVAL, titulo: "Festival de Cine UASLP", inicio: "2026-11-13T01:00:00Z", fin: "2026-11-15T06:00:00Z", zona: "America/Mexico_City" }],
};
const conClase = (qa = {}) => ({ contexto: CONTEXTO_CLASE, ...qa });
/** «Siguiente» del pie (el calendario también tiene «Mes siguiente»). */
const siguiente = (p) => p.getByRole("button", { name: "Siguiente", exact: true });
const dia = (p, nombre) => p.getByRole("gridcell", { name: new RegExp(`^${nombre}`) });
const datosRevisa = (p) => p.locator("main ul > li").allInnerTexts();
const CAPTURAS_350 = process.env.CAPTURAS_350;
const foto350 = async (p, nombre) => {
  if (!CAPTURAS_350) return;
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(450);
  await p.screenshot({ path: join(CAPTURAS_350, `${nombre}.png`) });
};

test("exposición sin cartel (caso 2): el título la propone, «¿Cuándo se puede visitar?» con Desde y Hasta, «Revisa» con el horario del lugar y la inauguración, y se publica", TOPE, async (t) => {
  const p = await pagina(t, { qa: conClase({ resultado: "publica" }) });
  await boton(p, "No tengo cartel").click();
  await p.getByLabel("Nombre del evento").fill("Exposición Ecos de papel");
  await siguiente(p).click();
  assert.equal(await pregunta(p), "¿Cuándo se puede visitar?");
  await boton(p, "Falta desde cuándo").waitFor();
  await dia(p, "viernes 9 de octubre").click();
  await boton(p, "Falta hasta cuándo").waitFor();
  await dia(p, "sábado 31 de octubre").click();
  await p.getByText("Del 9 al 31 de oct").waitFor();
  // Los días entre medio se pintan (la banda del calendario de siempre).
  assert.equal(await dia(p, "jueves 15 de octubre").getAttribute("aria-selected"), "true");
  await siguiente(p).click();
  assert.equal(await pregunta(p), "¿Dónde es?");
  await elegirTeatro(p);
  await boton(p, /^Gratis/).click();
  await p.getByRole("heading", { name: "Exposición Ecos de papel" }).waitFor();
  const filas = await datosRevisa(p);
  assert.match(filas[0], /Exposición\nCambiar/);
  assert.match(filas[1], /Del 9 al 31 de oct/);
  assert.match(filas[2], /Horario del lugar[\s\S]*Ma–Do[\s\S]*10:00 a\.m\.–6:00 p\.m\.[\s\S]*Cierra Lu/);
  assert.match(filas[3], /Inauguración\nAgregar/);
  assert.match(filas.at(-1), /Parte de un festival\nAgregar/);
  // La inauguración: su día y su hora, aparte del horario de visita.
  await boton(p, "Agregar inauguración").click();
  const hoja = p.getByRole("dialog", { name: "Inauguración" });
  await hoja.getByRole("gridcell", { name: /^jueves 8 de octubre/ }).click();
  await hoja.getByRole("group", { name: "Empieza" }).getByRole("button", { name: /^7:00/ }).click();
  await foto350(p, "04-inauguracion-hoja");
  await hoja.getByRole("button", { name: "Listo" }).click();
  await p.locator("main ul > li").filter({ hasText: "Inauguración · jue 8 de oct · 7:00 p.m." }).waitFor();
  await foto350(p, "02-revisa-exposicion-con-inauguracion");
  await boton(p, "Publicar exposición").click();
  await p.waitForFunction(() => window.qa.envios.length === 1);
  const d = await enviado(p);
  assert.deepEqual({ clase: d.clase, inicio: d.inicio, fin: d.fin, horario: d.horario, inauguracion: JSON.parse(d.inauguracion), lugar_id: d.lugar_id }, { clase: "exposicion", inicio: "2026-10-09T00:00", fin: "2026-10-31T23:59", horario: "", inauguracion: { dia: "2026-10-08", hora: "19:00" }, lugar_id: LUGAR });
  assert.equal(d.sesiones, undefined);
  await p.getByRole("heading", { name: "Exposición publicada" }).waitFor();
  await p.locator("main ul li").filter({ hasText: "Del 9 al 31 de oct" }).waitFor();
});

test("exposición: desmarcar «Horario del lugar» abre la hoja de franjas (la misma del alta de lugar) y se publica con horario propio", TOPE, async (t) => {
  const p = await pagina(t, { qa: conClase({ abrir: { lugar: LUGAR } }) });
  await boton(p, "No tengo cartel").click();
  await p.getByLabel("Nombre del evento").fill("Muestra de grabado");
  await siguiente(p).click();
  assert.equal(await pregunta(p), "¿Cuándo se puede visitar?");
  // Con el lugar ya puesto, la casilla sale marcada con su resumen.
  const casilla = p.getByRole("checkbox", { name: /Horario del lugar/ });
  assert.equal(await casilla.getAttribute("aria-checked"), "true");
  await p.getByText("Ma–Do · 10:00 a.m.–6:00 p.m. · Cierra Lu").waitFor();
  await dia(p, "viernes 9 de octubre").click();
  await dia(p, "domingo 18 de octubre").click();
  await foto350(p, "01-cuando-se-puede-visitar");
  await casilla.click();
  const hoja = p.getByRole("dialog", { name: "Horario" });
  await hoja.getByRole("heading", { name: "¿Qué días se puede visitar?" }).waitFor();
  await hoja.getByRole("group", { name: "Días" }).getByRole("button", { name: "martes" }).click();
  await hoja.getByRole("button", { name: "Listo" }).click();
  assert.equal(await casilla.getAttribute("aria-checked"), "false");
  await p.getByText("Horario propio").waitFor();
  await siguiente(p).click();
  await boton(p, /^Gratis/).click();
  await p.locator("main ul > li").filter({ hasText: "Horario propio" }).waitFor();
  await boton(p, "Publicar exposición").click();
  await p.waitForFunction(() => window.qa.envios.length === 1);
  assert.deepEqual(JSON.parse((await enviado(p)).horario), [{ dias: [3, 4, 5, 6, 7], abre: "10:00", cierra: "18:00" }]);
});

test("exposición leída del cartel (caso 1): la visita y la inauguración llegan llenas y se entra en «Revisa»", TOPE, async (t) => {
  const lectura = { ...LEIDO, valores: { ...LEIDO.valores, titulo: "Ecos de papel", inicio: "2026-11-05T19:00", forma: { clase: "exposicion", visita: { desde: "2026-11-06", hasta: "2026-11-30" }, sesiones: [], actos: [] } } };
  const p = await pagina(t, { qa: conClase({ lectura }) });
  await subir(p);
  await p.getByText("Leído del cartel").waitFor();
  const filas = await datosRevisa(p);
  assert.match(filas[0], /Exposición/);
  assert.match(filas[1], /Del 6 al 30 de nov/);
  assert.match(filas[3], /Inauguración · jue 5 de nov · 7:00 p\.m\./);
});

test("taller (caso 3): «¿Qué días son las sesiones?», un toque por día, la hora y la casilla «Misma hora todas las sesiones»; se publica un taller con sus sesiones", TOPE, async (t) => {
  const p = await pagina(t, { qa: conClase() });
  await boton(p, "No tengo cartel").click();
  await p.getByLabel("Nombre del evento").fill("Taller de grabado");
  await siguiente(p).click();
  assert.equal(await pregunta(p), "¿Qué días son las sesiones?");
  await boton(p, "Faltan las sesiones").waitFor();
  for (const d of ["sábado 10 de octubre", "sábado 17 de octubre", "sábado 24 de octubre", "domingo 25 de octubre"]) await dia(p, d).click();
  // Otro toque quita el día.
  await dia(p, "domingo 25 de octubre").click();
  assert.equal(await dia(p, "domingo 25 de octubre").getAttribute("aria-selected"), "false");
  await boton(p, "Falta la hora").waitFor();
  await p.getByRole("group", { name: "¿A qué hora?" }).getByRole("button", { name: /^10:00/ }).click();
  await p.getByRole("group", { name: "Termina" }).getByRole("button", { name: /^12:00/ }).click();
  await p.getByText("3 sesiones · sáb 10, sáb 17 y sáb 24 de oct · 10:00 a.m.–12:00 p.m.").waitFor();
  const casilla = p.getByRole("checkbox", { name: /Misma hora todas las sesiones/ });
  assert.equal(await casilla.getAttribute("aria-checked"), "true");
  await foto350(p, "05-que-dias-son-las-sesiones");
  // Desmarcada: un renglón por sesión, con su hoja (OL-311).
  await casilla.click();
  await boton(p, /^Cambiar sáb 17 de oct/).click();
  const hoja = p.getByRole("dialog", { name: /sáb 17 de oct/ });
  await hoja.getByRole("group", { name: "Empieza" }).getByRole("button", { name: /^12:00/ }).click();
  await hoja.getByRole("button", { name: "Listo" }).click();
  await siguiente(p).click();
  await elegirTeatro(p);
  await boton(p, /^Gratis/).click();
  const filas = await datosRevisa(p);
  assert.match(filas[0], /Taller o curso/);
  assert.match(filas[1], /3 sesiones · sáb 10, sáb 17 y sáb 24 de oct · horario por sesión/);
  await boton(p, "Publicar taller").click();
  await p.waitForFunction(() => window.qa.envios.length === 1);
  const d = await enviado(p);
  assert.equal(d.clase, "taller");
  assert.deepEqual(JSON.parse(d.sesiones), [
    { inicio: "2026-10-10T10:00", fin: "2026-10-10T12:00" },
    { inicio: "2026-10-17T12:00", fin: "" },
    { inicio: "2026-10-24T10:00", fin: "2026-10-24T12:00" },
  ]);
  assert.deepEqual({ inicio: d.inicio, fin: d.fin }, { inicio: "2026-10-10T10:00", fin: "2026-10-24T12:00" });
});

const PROGRAMA = {
  ...LEIDO,
  valores: {
    ...LEIDO.valores,
    titulo: "Festival de Cine UASLP",
    inicio: "",
    lugar: "Teatro de la Paz",
    forma: {
      clase: "festival",
      visita: null,
      sesiones: [],
      actos: [
        { titulo: "Inauguración: «La luz que queda»", fecha: "2026-11-12", hora: "19:00", lugar: "Teatro de la Paz", lugarId: LUGAR },
        { titulo: "Charla con la directora", fecha: "2026-11-13", hora: "18:00", lugar: "Cineteca Alameda", lugarId: null },
        { titulo: "Función: cortometrajes potosinos", fecha: "2026-11-14", hora: "17:00", lugar: "Teatro de la Paz", lugarId: LUGAR },
      ],
    },
  },
  quien: [],
};

test("festival desde el cartel (caso 4, H6): «El cartel trae 3 eventos», corregir la sede de un acto en su hoja, desmarcar otro y publicar el festival y sus eventos de una vez", TOPE, async (t) => {
  const p = await pagina(t, { qa: conClase({ lectura: PROGRAMA }) });
  await subir(p);
  await enPaso(p, "El cartel trae 3 eventos");
  const actos = p.locator("main ul > li");
  assert.equal(await actos.count(), 3);
  assert.match(await actos.nth(1).innerText(), /Charla con la directora[\s\S]*vie 13 de nov · 6:00 p\.m\. · Cineteca Alameda · confirmar la sede/);
  await boton(p, "Completa «Charla con la directora»").waitFor();
  await foto350(p, "06-el-cartel-trae-3-eventos");
  // Tocar el renglón abre su hoja para corregirlo; la sede se elige en «Dónde» de siempre y se vuelve al programa.
  await actos.nth(1).getByRole("button", { name: /Charla con la directora/ }).click();
  const hoja = p.getByRole("dialog", { name: "Charla con la directora" });
  await hoja.getByLabel("Nombre de la actividad").waitFor();
  await foto350(p, "07-hoja-de-un-acto");
  await hoja.getByRole("button", { name: "Poner sede" }).click();
  assert.equal(await pregunta(p), "¿Dónde es?");
  assert.equal(await buscar(p).inputValue(), "Cineteca Alameda");
  await buscar(p).fill("centro");
  await p.getByRole("option", { name: /Centro de las Artes/ }).click();
  await enPaso(p, "El cartel trae 3 eventos");
  assert.match(await actos.nth(1).innerText(), /Centro de las Artes/);
  // El tercero queda como borrador.
  await actos.nth(2).getByRole("checkbox").click();
  await p.getByText("Programa registrado: 2 actividades · 1 sin publicar (borrador)").waitFor();
  await boton(p, "Revisar el festival").click();
  await p.getByText("Leído del cartel").waitFor();
  const filas = await datosRevisa(p);
  assert.match(filas[0], /Festival\nCambiar/);
  assert.match(filas[1], /Del 12 al 13 de nov · Programa registrado: 2 actividades/);
  assert.match(filas[2], /Sedes: Teatro de la Paz y Centro de las Artes/);
  assert.equal(filas.some((f) => /Parte de un festival/.test(f)), false);
  await foto350(p, "08-revisa-festival");
  await boton(p, "Publicar el festival y 2 eventos").click();
  await p.waitForFunction(() => window.qa.envios.length === 1);
  const d = await enviado(p);
  assert.equal(d.clase, "festival");
  const enviados = JSON.parse(d.actos);
  assert.deepEqual(enviados.map((a) => [a.titulo, a.inicio, a.sitio.lugar_id, a.marcado]), [
    ["Inauguración: «La luz que queda»", "2026-11-12T19:00", LUGAR, true],
    ["Charla con la directora", "2026-11-13T18:00", OTRO_LUGAR, true],
    ["Función: cortometrajes potosinos", "2026-11-14T17:00", LUGAR, false],
  ]);
});

test("«¿Cómo ocurre?» (caso 5): las cuatro formas con su frase; cambiarla cambia solo el paso del tiempo y conserva lo demás", TOPE, async (t) => {
  const p = await pagina(t, { qa: conClase() });
  await hastaRevisa(p);
  await boton(p, "Cambiar cómo ocurre").click();
  const hoja = p.getByRole("dialog", { name: "Cómo ocurre" });
  const opciones = await hoja.getByRole("button").filter({ hasText: /Pasa un día|Se puede visitar|Varias sesiones|Agrupa/ }).allInnerTexts();
  assert.deepEqual(opciones.map((o) => o.split("\n")[0]), ["Evento", "Exposición", "Taller o curso", "Festival"]);
  assert.equal(await hoja.getByRole("button", { name: /^Evento/ }).getAttribute("aria-pressed"), "true");
  await foto350(p, "03-como-ocurre");
  await hoja.getByRole("button", { name: /^Exposición/ }).click();
  // Un evento de un día: falta hasta cuándo, y se pregunta; el primer día ya viene puesto.
  assert.equal(await pregunta(p), "¿Cuándo se puede visitar?");
  await p.getByRole("button", { name: /^Desde · vie 9 de oct/ }).waitFor();
  await dia(p, "domingo 18 de octubre").click();
  await siguiente(p).click();
  const filas = await datosRevisa(p);
  assert.match(filas[0], /Exposición/);
  assert.match(filas[1], /Del 9 al 18 de oct/);
  assert.ok(filas.some((f) => /Teatro de la Paz/.test(f)) && filas.some((f) => /Gratis/.test(f)));
  await p.getByRole("heading", { name: "Lectura en voz alta" }).waitFor();
});

test("«Parte de un festival»: elegir uno propio por su nombre o crear uno con solo el nombre; quitarlo", TOPE, async (t) => {
  const p = await pagina(t, { qa: conClase() });
  await hastaRevisa(p);
  await boton(p, "Agregar festival").click();
  const hoja = p.getByRole("dialog", { name: "Parte de un festival" });
  await hoja.getByLabel("Nombre del festival").fill("cine");
  await hoja.getByRole("button", { name: /^Festival de Cine UASLP/ }).click();
  await p.locator("main ul > li").filter({ hasText: "Parte de Festival de Cine UASLP" }).waitFor();
  await boton(p, "Publicar").click();
  await p.waitForFunction(() => window.qa.envios.length === 1);
  assert.equal((await enviado(p)).padre, FESTIVAL);
  await boton(p, "Cambiar festival").click();
  await hoja.getByLabel("Nombre del festival").fill("Festival del Barrio");
  // La ✕ del campo (canon) borra lo escrito.
  await hoja.getByRole("button", { name: "Borrar lo escrito" }).waitFor();
  await hoja.getByRole("button", { name: "Crear «Festival del Barrio»" }).click();
  await p.locator("main ul > li").filter({ hasText: "Parte de Festival del Barrio" }).waitFor();
  await boton(p, "Publicar").click();
  await p.waitForFunction(() => window.qa.envios.length === 2);
  const d = await enviado(p);
  assert.deepEqual({ padre: d.padre, padre_nuevo: d.padre_nuevo }, { padre: undefined, padre_nuevo: "Festival del Barrio" });
  await boton(p, "Cambiar festival").click();
  await hoja.getByRole("button", { name: "Quitar del festival" }).click();
  await p.locator("main ul > li").filter({ hasText: "Parte de un festival" }).waitFor();
});

for (const ancho of [320, 390]) {
  test(`a ${ancho}: «¿Cuándo se puede visitar?», las sesiones, el programa y «Revisa» del festival no desbordan`, TOPE, async (t) => {
    const p = await pagina(t, { ancho, qa: conClase({ lectura: PROGRAMA, abrir: { lugar: LUGAR } }) });
    await boton(p, "No tengo cartel").click();
    await p.getByLabel("Nombre del evento").fill("Exposición de grabado potosino contemporáneo");
    await siguiente(p).click();
    await dia(p, "viernes 9 de octubre").click();
    await dia(p, "sábado 31 de octubre").click();
    assert.deepEqual(await desborda(p), { scroll: 0, fuera: [] }, "visita");
    if (ancho === 320) await foto350(p, "10-visita-320");
    await boton(p, "Atrás").click();
    await p.getByLabel("Nombre del evento").fill("Taller de grabado en linóleo para principiantes");
    await siguiente(p).click();
    for (const d of ["sábado 10 de octubre", "sábado 17 de octubre"]) await dia(p, d).click();
    await p.getByRole("group", { name: "¿A qué hora?" }).getByRole("button", { name: /^10:00/ }).click();
    assert.deepEqual(await desborda(p), { scroll: 0, fuera: [] }, "sesiones");
    if (ancho === 320) await foto350(p, "11-sesiones-320");
    const q = await pagina(t, { ancho, qa: conClase({ lectura: PROGRAMA }) });
    await subir(q);
    await enPaso(q, "El cartel trae 3 eventos");
    assert.deepEqual(await desborda(q), { scroll: 0, fuera: [] }, "programa");
    if (ancho === 320) await foto350(q, "12-programa-320");
    await q.locator("main ul > li").nth(1).getByRole("checkbox").click();
    await boton(q, "Revisar el festival").click();
    await q.getByText("Leído del cartel").waitFor();
    assert.deepEqual(await desborda(q), { scroll: 0, fuera: [] }, "revisa del festival");
    if (ancho === 320) await foto350(q, "13-revisa-festival-320");
  });
}
