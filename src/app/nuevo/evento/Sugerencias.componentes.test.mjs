/** OL-323 (bitácora 352): las sugerencias al publicar (modelo `eventos-modelo.md` §10: H1, H2, H4 y H5; prototipo aceptado
 *  `eventos-superficies.html`, casos h1, h2 y h4). El mismo arnés que `ClasesEvento.componentes.test.mjs` (el alta real, con la acción, la lectura
 *  del cartel, Storage y Mapbox simulados) y, además, las acciones de la sugerencia (`window.qa.sugerencia` es lo que contesta el servidor; la
 *  detección se prueba en `lib/sugerencias.test.ts` y las acciones en `app/eventos/sugerencias.acciones.test.ts`). Reloj fijo: miércoles 7 de
 *  octubre de 2026. Con `CAPTURAS_352=<carpeta>` guarda las capturas de la bitácora 352.
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
  dir = await mkdtemp(join(tmpdir(), "sugerencias-al-publicar-"));
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
      window.qa = {envios:[], lugares:[], lugar:'creado', resultado:'general', salio:0, pedirSalida, cupoAlAbrir:{usadas:1,tope:6,sinTope:false}, cartelActivo:true, lecturas:[], reemplazos:[], subidas:[], lectura:null, subida:'ok', espera:false, esperaSubida:false, pedidas:[], aceptadas:[], descartes:[], sugerencia:null, falla:false, ...window.qaInicial};
      // Las acciones de la sugerencia (OL-323): \`sugerencia\` es lo que contesta el servidor; \`falla\`, que aceptar no se pudo.
      const contesta = (que, extra) => async (...args) => { window.qa.aceptadas.push({que, args}); if (window.qa.falla) return {ok:false, error:'No se pudo publicar la exposición. Intenta de nuevo.'}; return {ok:true, creado:{id:'0e0e0e0e-0000-4000-8000-0000000000aa', href: que === 'festival' ? '/eventos/festival-umbral-2026' : '/eventos/ecos-de-papel'}, ...extra}; };
      const sugerencias = {
        buscar: async (id, pistas) => { window.qa.pedidas.push({id, pistas}); return structuredClone(window.qa.sugerencia); },
        publicarExposicion: contesta('exposicion'),
        ligarExposicion: contesta('ligar'),
        relacionarFestival: contesta('festival', {actos: 2}),
        unirParecido: async (...args) => { window.qa.aceptadas.push({que:'parecido', args}); if (window.qa.falla) return {ok:false, error:'No se pudo unir al festival. Intenta de nuevo.'}; return {ok:true, creado:{id:'0f0f0f0f-0000-4000-8000-0000000000e1', href:'/eventos/electric-universe-festival'}, actos: args[1].modo === 'evento' ? 2 : 3}; },
        descartar: async (id, tipo, clave) => { window.qa.descartes.push({id, tipo, clave}); },
      };
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
        <AltaEvento accion={accion} lugares={lugares} mios={[]} ciudadContexto={window.qa.ciudad ?? null} salida={{href: abrir.salida ?? '/', texto:'Volver'}} usuarioId="usuaria-1" cartelActivo={window.qa.cartelActivo} cupo={window.qa.cupoAlAbrir} arranque={arranque} contexto={window.qa.contexto ?? {horarios:{}, festivales:[]}} sugerencias={sugerencias} />
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
/** Espera a que el paso con esa pregunta esté a la vista (elegir un resultado del mapa o «Estoy aquí» tarda lo que tarda el servicio). */
const enPaso = (p, texto) => p.locator("main h2").filter({ hasText: texto }).waitFor();

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
const dia = (p, nombre) => p.getByRole("gridcell", { name: new RegExp(`^${nombre}`) });
const datosRevisa = (p) => p.locator("main ul > li").allInnerTexts();

// ---------------------------------------------------------------- OL-323

const CAPTURAS_352 = process.env.CAPTURAS_352;
const foto352 = async (p, nombre) => {
  if (!CAPTURAS_352) return;
  await p.evaluate(() => document.fonts.ready);
  // La sugerencia entera a la vista, por encima del pie pegado (como la ve quien desplaza).
  await p.evaluate(() => {
    const s = [...document.querySelectorAll("main section")].at(-1);
    if (s) window.scrollTo({ top: Math.max(0, s.getBoundingClientRect().bottom + window.scrollY - (window.innerHeight - 260)) });
  });
  await p.waitForTimeout(450);
  await p.screenshot({ path: join(CAPTURAS_352, `${nombre}.png`) });
};
/** La lectura del cartel de una inauguración que trae su visita (H1). */
const LECTURA_H1 = { ...LEIDO, valores: { ...LEIDO.valores, titulo: "Inauguración de Ecos de papel", forma: { clase: "exposicion", visita: { desde: "2026-11-06", hasta: "2026-11-30" }, sesiones: [], actos: [] } } };
const H1 = { tipo: "exposicion", modo: "crear", titulo: "Ecos de papel", visita: { desde: "2026-11-06", hasta: "2026-11-30" }, lugar: "Teatro de la Paz", quien: ["Lucía Montaño"] };
const H2 = { tipo: "exposicion", modo: "periodo", titulo: "Ecos de papel", desde: "2026-10-10", lugar: "Teatro de la Paz", quien: [] };
const H4 = { tipo: "festival", modo: "relacionar", mencion: "Festival Umbral 2026", clave: "festival umbral|2026", otro: { id: "0e0e0e0e-0000-4000-8000-0000000000b1", titulo: "Concierto de Trío Bruma", dia: "2026-10-08", lugar: "Centro de las Artes" } };
const H5 = { tipo: "festival", modo: "marco", mencion: "Festival Umbral 2026", clave: "festival umbral|2026", marco: { id: "0f0f0f0f-0000-4000-8000-0000000000f5", slug: "festival-umbral-2026", titulo: "Festival Umbral 2026", actos: 3 }, otro: null };
const aceptadas = (p) => p.evaluate(() => window.qa.aceptadas);
const descartes = (p) => p.evaluate(() => window.qa.descartes);
const claseCompartir = (p) => p.getByRole("button", { name: "Compartir" }).getAttribute("class");

test("H1: la inauguración leída del cartel se publica como evento y «Publicado» propone la exposición en punteado; un toque la publica y queda la tarjeta de lo creado", TOPE, async (t) => {
  const p = await pagina(t, { qa: conClase({ lectura: LECTURA_H1, resultado: "publica", sugerencia: H1 }) });
  await subir(p);
  await p.getByText("Leído del cartel").waitFor();
  // Es la apertura: un evento de un día a una hora (no una exposición).
  assert.match((await datosRevisa(p))[0], /Evento\nCambiar/);
  await boton(p, "Publicar").click();
  await p.getByRole("heading", { name: "Evento publicado" }).waitFor();
  const sug = p.getByRole("region", { name: "Ecos de papel" });
  await sug.waitFor();
  assert.match(await sug.innerText(), /También puedes publicar\nEcos de papel\nDel 6 al 30 de nov · exposición\nTeatro de la Paz\nLucía Montaño · expone/);
  // Las pistas que mandó la pantalla: la visita leída y que es una apertura de una muestra.
  const [pedida] = await p.evaluate(() => window.qa.pedidas);
  assert.deepEqual(pedida.pistas, { visita: { desde: "2026-11-06", hasta: "2026-11-30" }, apertura: true, muestra: true, festival: null });
  // Con la sugerencia a la vista, «Compartir» deja de ser el botón principal.
  assert.match(await claseCompartir(p), /secundario/);
  // «Crea su cartel» sigue a la vista (OL-336), después y en una línea quieta: nunca dos cajas en punteado.
  assert.equal(await p.getByRole("heading", { name: "Crea su cartel" }).count(), 0);
  assert.match(await p.getByRole("link", { name: "Crear su cartel" }).getAttribute("href"), /\/cartel\?origen=publicado$/);
  await foto352(p, "01-h1-sugerencia-390");
  await sug.getByRole("button", { name: "Publicar exposición" }).click();
  await sug.getByText("Exposición publicada").waitFor();
  assert.match(await sug.innerText(), /Del 6 al 30 de nov/);
  assert.equal(await sug.getByRole("link", { name: "Ver la exposición" }).getAttribute("href"), "/eventos/ecos-de-papel");
  const [a] = await aceptadas(p);
  assert.equal(a.que, "exposicion");
  assert.deepEqual(a.args[1], { titulo: "Ecos de papel", desde: "2026-11-06", hasta: "2026-11-30", horario: null });
  assert.doesNotMatch(await claseCompartir(p), /secundario/);
  await foto352(p, "02-h1-exposicion-publicada-390");
  // Ya aceptada: salir no la anota como descartada.
  await boton(p, "Publicar otro").click();
  await p.waitForTimeout(50);
  assert.deepEqual(await descartes(p), []);
});

test("H2: sin periodo, «Agregar periodo de visita» abre «¿Cuándo se puede visitar?» con «Desde» puesto; Atrás vuelve sin crear nada y «Publicar exposición» la publica", TOPE, async (t) => {
  const p = await pagina(t, { qa: conClase({ resultado: "publica", sugerencia: H2 }) });
  await hastaHora(p, "Inauguración de la exposición Ecos de papel");
  await p.getByRole("group", { name: "Empieza" }).getByRole("button", { name: /^7:00/ }).click();
  await p.getByRole("group", { name: "¿Cuánto dura?" }).getByRole("button", { name: "2 horas" }).click();
  await elegirTeatro(p);
  await boton(p, /^Gratis/).click();
  // El título dice inauguración: es un evento, no una exposición.
  assert.match((await datosRevisa(p))[0], /Evento\nCambiar/);
  await boton(p, "Publicar").click();
  const sug = p.getByRole("region", { name: "Ecos de papel" });
  await sug.getByText("Exposición · ¿Hasta cuándo se puede visitar?").waitFor();
  await foto352(p, "03-h2-sugerencia-390");
  await sug.getByRole("button", { name: "Agregar periodo de visita" }).click();
  await enPaso(p, "¿Cuándo se puede visitar?");
  await p.getByText("Desde · sáb 10 de oct").waitFor();
  await boton(p, "Falta hasta cuándo").waitFor();
  await boton(p, "Atrás").click();
  await p.getByRole("heading", { name: "Evento publicado" }).waitFor();
  assert.deepEqual(await aceptadas(p), []);
  await p.getByRole("region", { name: "Ecos de papel" }).getByRole("button", { name: "Agregar periodo de visita" }).click();
  await dia(p, "sábado 31 de octubre").click();
  await p.getByText("Del 10 al 31 de oct").waitFor();
  await foto352(p, "04-h2-cuando-se-puede-visitar-390");
  await boton(p, "Publicar exposición").click();
  await p.getByRole("heading", { name: "Evento publicado" }).waitFor();
  await p.getByRole("region", { name: "Ecos de papel" }).getByText("Exposición publicada").waitFor();
  const [a] = await aceptadas(p);
  assert.deepEqual(a.args[1], { titulo: "Ecos de papel", desde: "2026-10-10", hasta: "2026-10-31", horario: null });
  await foto352(p, "05-h2-exposicion-publicada-390");
});

test("H4: «Estos dos eventos forman parte de» con los dos actos unidos; «Relacionar los dos» los junta y queda el programa registrado", TOPE, async (t) => {
  const p = await pagina(t, { qa: conClase({ resultado: "publica", sugerencia: H4 }) });
  await hastaRevisa(p);
  await boton(p, "Publicar").click();
  const sug = p.getByRole("region", { name: "Festival Umbral 2026" });
  await sug.waitFor();
  assert.match(await sug.innerText(), /Estos dos eventos forman parte de\nFestival Umbral 2026\nConcierto de Trío Bruma\njue 8 de oct · Centro de las Artes\nLectura en voz alta\nvie 9 de oct · Teatro de la Paz · recién publicado/);
  await foto352(p, "06-h4-sugerencia-390");
  await sug.getByRole("button", { name: "Relacionar los dos" }).click();
  await sug.getByText("Ya son parte del festival").waitFor();
  assert.match(await sug.innerText(), /Programa registrado: 2 actividades/);
  const [a] = await aceptadas(p);
  assert.deepEqual(a.args[1], { otro: H4.otro.id, marco: null, titulo: "Festival Umbral 2026" });
  await foto352(p, "07-h4-relacionados-390");
});

test("H5: con el festival propio, desde el primer acto: «Parte de» y «Relacionar»", TOPE, async (t) => {
  const p = await pagina(t, { qa: conClase({ resultado: "publica", sugerencia: H5 }) });
  await hastaRevisa(p);
  await boton(p, "Publicar").click();
  const sug = p.getByRole("region", { name: "Festival Umbral 2026" });
  await sug.waitFor();
  assert.match(await sug.innerText(), /Parte de\nFestival Umbral 2026\nFestival · Programa registrado: 3 actividades/);
  await sug.getByRole("button", { name: "Relacionar", exact: true }).click();
  await sug.getByText("Ya son parte del festival").waitFor();
  assert.deepEqual((await aceptadas(p))[0].args[1], { otro: null, marco: H5.marco.id, titulo: "Festival Umbral 2026" });
});

test("ignorar no es confirmar: salir con «Publicar otro» sin tocarla la anota con la clave del festival; «Ahora no» la quita y la anota una vez", TOPE, async (t) => {
  const p = await pagina(t, { qa: conClase({ resultado: "publica", sugerencia: H4 }) });
  await hastaRevisa(p);
  await boton(p, "Publicar").click();
  await p.getByRole("region", { name: "Festival Umbral 2026" }).waitFor();
  await boton(p, "Publicar otro").click();
  await p.waitForFunction(() => window.qa.descartes.length === 1);
  assert.deepEqual(await descartes(p), [{ id: "0e0e0e0e-0000-4000-8000-000000000001", tipo: "festival", clave: "festival umbral|2026" }]);
  // Otra vuelta: «Ahora no».
  await hastaRevisa(p);
  await boton(p, "Publicar").click();
  await p.getByRole("region", { name: "Festival Umbral 2026" }).getByRole("button", { name: "Ahora no" }).click();
  await p.getByRole("region", { name: "Festival Umbral 2026" }).waitFor({ state: "detached" });
  assert.equal((await descartes(p)).length, 2);
  assert.doesNotMatch(await claseCompartir(p), /secundario/);
  // Y salir después ya no anota otra vez.
  await boton(p, "Publicar otro").click();
  await p.waitForTimeout(50);
  assert.equal((await descartes(p)).length, 2);
});

test("si aceptar falla, el error se dice en la sugerencia y se vuelve a intentar con la misma clave", TOPE, async (t) => {
  const p = await pagina(t, { qa: conClase({ lectura: LECTURA_H1, resultado: "publica", sugerencia: H1, falla: true }) });
  await subir(p);
  await p.getByText("Leído del cartel").waitFor();
  await boton(p, "Publicar").click();
  const sug = p.getByRole("region", { name: "Ecos de papel" });
  await sug.getByRole("button", { name: "Publicar exposición" }).click();
  await sug.getByRole("alert").filter({ hasText: "No se pudo publicar la exposición" }).waitFor();
  await p.evaluate(() => (window.qa.falla = false));
  await sug.getByRole("button", { name: "Publicar exposición" }).click();
  await sug.getByText("Exposición publicada").waitFor();
  const [a, b] = await aceptadas(p);
  assert.equal(a.args[2], b.args[2], "la misma clave de operación");
});

test("sin sugerencia el final queda como siempre", TOPE, async (t) => {
  const p = await pagina(t, { qa: conClase({ resultado: "publica", sugerencia: null }) });
  await hastaRevisa(p);
  await boton(p, "Publicar").click();
  await p.getByRole("heading", { name: "Evento publicado" }).waitFor();
  await p.waitForFunction(() => window.qa.pedidas.length === 1);
  // La única sugerencia es «Crea su cartel» (OL-336: sale siempre), en punteado y con su botón secundario: «Compartir» sigue siendo el principal.
  assert.deepEqual(await p.locator("main section h3").allInnerTexts(), ["Crea su cartel"]);
  const crear = p.getByRole("link", { name: "Crear cartel" });
  assert.match(await crear.getAttribute("href"), /\/cartel\?origen=publicado$/);
  assert.match(await crear.getAttribute("class"), /secundario/);
  assert.doesNotMatch(await claseCompartir(p), /secundario/);
});

test("a 320 la sugerencia y la tarjeta de lo creado caben sin desbordes", TOPE, async (t) => {
  for (const [s, nombre] of [[H1, "08-h1-sugerencia-320"], [H4, "09-h4-sugerencia-320"]]) {
    const p = await pagina(t, { ancho: 320, qa: conClase({ lectura: LECTURA_H1, resultado: "publica", sugerencia: s }) });
    await subir(p);
    await p.getByText("Leído del cartel").waitFor();
    await boton(p, "Publicar").click();
    await p.locator("main section h3").waitFor();
    assert.deepEqual(await desborda(p), { scroll: 0, fuera: [] });
    await foto352(p, nombre);
    await p.locator("main section").getByRole("button", { name: /Publicar exposición|Relacionar los dos/ }).click();
    await p.locator("main section").getByText(/Exposición publicada|Ya son parte del festival/).waitFor();
    assert.deepEqual(await desborda(p), { scroll: 0, fuera: [] });
    if (s === H1) await foto352(p, "10-h1-exposicion-publicada-320");
  }
});

// ---------------------------------------------------------------- OL-341: el evento igual ya publicado (bitácora 370)

const CAPTURAS_370 = process.env.CAPTURAS_370;
const foto370 = async (p, nombre) => {
  if (!CAPTURAS_370) return;
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => {
    const s = [...document.querySelectorAll("main section")].at(-1);
    if (s) window.scrollTo({ top: Math.max(0, s.getBoundingClientRect().bottom + window.scrollY - (window.innerHeight - 260)) });
  });
  await p.waitForTimeout(450);
  await p.screenshot({ path: join(CAPTURAS_370, `${nombre}.png`) });
};
/** (b): otra cuenta publicó «Electric Universe Festival» ese día; el título es el mismo, así que se propone el nombre de la participación. */
const PARECIDO_EVENTO = { tipo: "parecido", modo: "evento", titulo: "DJ Nova en Electric Universe Festival", editable: true, existente: { id: "0e0e0e0e-0000-4000-8000-0000000000c1", titulo: "Electric Universe Festival", dia: "2026-10-09", lugar: "Teatro de la Paz" } };
/** (a): el festival ya está publicado y el título de la persona es otro (sin campo). */
const PARECIDO_FESTIVAL = { tipo: "parecido", modo: "festival", titulo: "Lectura en voz alta", editable: false, marco: { id: "0f0f0f0f-0000-4000-8000-0000000000e1", slug: "electric-universe-festival", titulo: "Electric Universe Festival", desde: "2026-10-09", hasta: "2026-10-10", lugar: "Teatro de la Paz", actos: 2 } };

test("OL-341 (b): «Ya hay un evento igual» con el nombre de la participación ya escrito; «Sí» lo manda (editado) y la tarjeta del evento lo dice", TOPE, async (t) => {
  const p = await pagina(t, { qa: conClase({ resultado: "publica", sugerencia: PARECIDO_EVENTO }) });
  await hastaRevisa(p);
  await boton(p, "Publicar").click();
  const sug = p.getByRole("region", { name: "Electric Universe Festival" });
  await sug.waitFor();
  assert.match(await sug.innerText(), /Ya hay un evento igual\nElectric Universe Festival\nvie 9 de oct\nTeatro de la Paz\nPublicado por otra persona\n+¿Es el mismo\?\n+Tu participación/);
  const campo = sug.getByLabel("Tu participación");
  assert.equal(await campo.inputValue(), "DJ Nova en Electric Universe Festival");
  // Una sola sugerencia: «Compartir» pasa a secundario y la otra caja (crear cartel) va en una línea quieta.
  assert.match(await claseCompartir(p), /secundario/);
  await foto370(p, "01-b-ya-hay-un-evento-igual-390");
  // Vacío, el botón dice qué falta; la ✕ lo vacía.
  await sug.getByRole("button", { name: "Borrar lo escrito" }).click();
  assert.equal(await sug.getByRole("button", { name: "Falta el nombre" }).isDisabled(), true);
  await campo.fill("DJ Nova · Electric Universe Festival");
  await sug.getByRole("button", { name: "Sí, es mi participación en él" }).click();
  await sug.getByText("Ya son parte del festival").waitFor();
  assert.match(await sug.innerText(), /Programa registrado: 2 actividades\nElectric Universe Festival\nvie 9 de oct · Teatro de la Paz\nDJ Nova · Electric Universe Festival/);
  assert.equal(await sug.getByRole("link", { name: "Ver el festival" }).getAttribute("href"), "/eventos/electric-universe-festival");
  const [a] = await aceptadas(p);
  assert.equal(a.que, "parecido");
  assert.deepEqual(a.args[1], { modo: "evento", con: PARECIDO_EVENTO.existente.id, titulo: "DJ Nova · Electric Universe Festival" });
  // La tarjeta del evento (lo que ve la gente) ya dice el nombre con que quedó.
  await p.locator("main ul").first().getByText("DJ Nova · Electric Universe Festival").waitFor();
  assert.doesNotMatch(await claseCompartir(p), /secundario/);
  await foto370(p, "02-b-ya-son-parte-del-festival-390");
});

test("OL-341 (a): «Este festival ya está publicado» con su programa y el acto como entrará; «Sí, publicar como parte de él» lo liga", TOPE, async (t) => {
  const p = await pagina(t, { qa: conClase({ resultado: "publica", sugerencia: PARECIDO_FESTIVAL }) });
  await hastaRevisa(p);
  await boton(p, "Publicar").click();
  const sug = p.getByRole("region", { name: "Electric Universe Festival" });
  await sug.waitFor();
  assert.match(await sug.innerText(), /Este festival ya está publicado\nElectric Universe Festival\nDel 9 al 10 de oct · festival\nTeatro de la Paz\nPrograma registrado: 2 actividades\n+¿Es tu participación\?\n+Lectura en voz alta\nvie 9 de oct · Teatro de la Paz · recién publicado/);
  assert.equal(await sug.getByLabel("Tu participación").count(), 0);
  await foto370(p, "03-a-este-festival-ya-esta-publicado-390");
  await sug.getByRole("button", { name: "Sí, publicar como parte de él" }).click();
  await sug.getByText("Ya es parte del festival").waitFor();
  assert.match(await sug.innerText(), /Programa registrado: 3 actividades/);
  assert.deepEqual((await aceptadas(p))[0].args[1], { modo: "festival", con: PARECIDO_FESTIVAL.marco.id, titulo: "Lectura en voz alta" });
});

test("OL-341: «No, es otro evento» la quita y la anota (una vez); el error de «Sí» se dice en la sugerencia y se reintenta con la misma clave", TOPE, async (t) => {
  const p = await pagina(t, { qa: conClase({ resultado: "publica", sugerencia: PARECIDO_EVENTO, falla: true }) });
  await hastaRevisa(p);
  await boton(p, "Publicar").click();
  const sug = p.getByRole("region", { name: "Electric Universe Festival" });
  await sug.getByRole("button", { name: "Sí, es mi participación en él" }).click();
  await sug.getByRole("alert").filter({ hasText: "No se pudo unir al festival. Intenta de nuevo." }).waitFor();
  await p.evaluate(() => (window.qa.falla = false));
  await sug.getByRole("button", { name: "Sí, es mi participación en él" }).click();
  await sug.getByText("Ya son parte del festival").waitFor();
  const [primera, segunda] = await aceptadas(p);
  assert.equal(primera.args[2], segunda.args[2], "la misma clave de operación: un reintento no crea dos festivales");
  // Otra vuelta: «No, es otro evento».
  await boton(p, "Publicar otro").click();
  await hastaRevisa(p);
  await boton(p, "Publicar").click();
  await p.getByRole("region", { name: "Electric Universe Festival" }).getByRole("button", { name: "No, es otro evento" }).click();
  await p.getByRole("region", { name: "Electric Universe Festival" }).waitFor({ state: "detached" });
  assert.deepEqual(await descartes(p), [{ id: "0e0e0e0e-0000-4000-8000-000000000002", tipo: "parecido", clave: null }]);
  await boton(p, "Publicar otro").click();
  await p.waitForTimeout(50);
  assert.equal((await descartes(p)).length, 1);
});

test("OL-341 a 320: la sugerencia con el campo no se sale de la pantalla", TOPE, async (t) => {
  const p = await pagina(t, { ancho: 320, qa: conClase({ resultado: "publica", sugerencia: PARECIDO_EVENTO }) });
  await hastaRevisa(p);
  await boton(p, "Publicar").click();
  await p.getByRole("region", { name: "Electric Universe Festival" }).getByLabel("Tu participación").waitFor();
  assert.deepEqual(await desborda(p), { scroll: 0, fuera: [] });
  await foto370(p, "04-b-ya-hay-un-evento-igual-320");
});
