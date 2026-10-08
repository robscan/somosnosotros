/** OL-300 (bitácora 328), OL-301 (bitácora 329), OL-302 (bitácora 330) y OL-304 (bitácora 332): el alta de evento por pasos, sin cartel y con cartel, con el armazón
 *  real (`PorPasos`), la guardia real (`useSalirSinPublicar`), el hook real que sube y lee el cartel (`useLeerCartel`) y una acción simulada
 *  que guarda lo que recibe (y, con `window.qa.resultado = 'publica'`, contesta como `crearEvento`: lo creado, sin redirigir). «¿Dónde es?», «¿Es aquí?» y «No está en el directorio» son los de verdad; el servicio de Mapbox lo simula
 *  `page.route` (sugerencias, coordenadas y dirección de un punto) y el mapa es un doble con un botón que arrastra el pin (el real necesita
 *  WebGL y un token); Atrás y la ✕ de la barra preguntan a la guardia como `useVolver`. Del servidor y de Storage solo se simulan
 *  `leerCartelAccion` y `subirFoto`, y se gobiernan desde `window.qa` (el cupo con el que abre la pantalla va en `cupoAlAbrir`). Reloj fijo: miércoles 7 de
 *  octubre de 2026, así «Este viernes» es el 9.
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
let dir, server, browser, origin, MEDIR;
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
  // Nada de `await` suelto entre las pruebas (OL-344): las que vienen detrás se registran tarde y, con `--test-name-pattern` que solo
  // elige esas, node:test daba la raíz por terminada y corría el `after` antes que este `before`; el servidor y Chromium que este abría
  // ya no los cerraba nadie y el proceso quedaba vivo para siempre (cuatro así, de un día entero, en la Mac del founder).
  MEDIR = await readFile(join(root, "scripts/ops/auditoria-ui/medir.js"), "utf8");
  dir = await mkdtemp(join(tmpdir(), "alta-por-pasos-"));
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
        <AltaEvento accion={accion} lugares={lugares} mios={[]} ciudadContexto={window.qa.ciudad ?? null} salida={{href: abrir.salida ?? '/', texto:'Volver'}} usuarioId="usuaria-1" cartelActivo={window.qa.cartelActivo} cupo={window.qa.cupoAlAbrir} arranque={arranque} />
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

async function pagina(t, { movimiento = "reduce", ancho = 390, alto = 844, qa = {}, fotos = false, geolocation = { latitude: 22.1504, longitude: -100.97 } } = {}) {
  const context = await browser.newContext({ viewport: { width: ancho, height: alto }, reducedMotion: movimiento, timezoneId: "America/Mexico_City", deviceScaleFactor: capturas ? 2 : 1, locale: "es-MX", geolocation, permissions: ["geolocation"] });
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
/** true si el navegador pediría confirmar al recargar o cerrar: el oyente de `beforeunload` canceló el evento. */
const avisa = (p) => p.evaluate(() => !window.dispatchEvent(new Event("beforeunload", { cancelable: true })));

const buscar = (p) => p.getByLabel("Buscar el lugar");
/** Elige «Teatro de la Paz» del directorio: escribe y toca su renglón en la lista flotante. */
async function elegirTeatro(p) {
  await buscar(p).fill("teatro");
  await p.getByRole("option", { name: /Teatro de la Paz/ }).click();
}
/** Escribe en el campo de «¿Dónde es?» y toca el resultado del mapa (el único que trae el doble). */
async function elegirDelMapa(p, texto, nombre) {
  await buscar(p).fill(texto);
  await p.getByRole("option", { name: nombre }).click();
}
/** Los renglones de la lista flotante de «¿Dónde es?»: nombre y letra suave de cada uno. */
const opciones = (p) => p.getByRole("option").evaluateAll((li) => li.map((o) => ({ nombre: o.querySelector("b")?.textContent, detalle: o.querySelector("small")?.textContent })));
/** Hasta «¿Dónde es?» con nombre, día y hora ya contestados. */
async function hastaDonde(p) {
  await hastaHora(p);
  await p.getByRole("group", { name: "Empieza" }).getByRole("button", { name: /^7:00/ }).click();
  await p.getByRole("group", { name: "¿Cuánto dura?" }).getByRole("button", { name: "2 horas" }).click();
  assert.equal(await pregunta(p), "¿Dónde es?");
}
/** Lo que publica el alta con el sitio ya elegido: gratis, publicar y leer lo que recibió la acción. */
async function publicarGratis(p) {
  await boton(p, /^Gratis/).click();
  await p.locator("main ul > li").first().waitFor();
  await boton(p, "Publicar").click();
  await p.waitForFunction(() => window.qa.envios.length >= 1);
  return enviado(p);
}
/** Las cajas de texto que se ven en el paso (no las escondidas del formulario que publica). */
const cajas = (p) => p.locator("main input:not([type=hidden]):visible").count();

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

test("recorrido completo sin cartel: la acción recibe los campos de siempre, y un error del servidor sale en «Revisa» con la guardia de vuelta", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaRevisa(p);
  const renglones = await p.locator("main ul > li").allInnerTexts();
  // OL-321: arriba, cómo ocurre («Evento», propuesto por el título); abajo, «Parte de un festival», opcional.
  assert.equal(renglones.length, 5);
  assert.match(renglones[0], /Evento\nCambiar/);
  assert.match(renglones[1], /vie 9 de oct · 19:00–21:00/);
  assert.match(renglones[2], /Teatro de la Paz/);
  assert.match(renglones[3], /Gratis/);
  assert.match(renglones[4], /Parte de un festival\nAgregar/);
  // Sin etiqueta a la vista, pero con su nombre accesible: «Cambiar cuándo».
  await boton(p, "Cambiar cuándo").waitFor();
  await boton(p, "Publicar").click();
  await p.getByText(GENERAL, { exact: true }).waitFor();
  const d = await enviado(p);
  assert.deepEqual(
    { titulo: d.titulo, inicio: d.inicio, fin: d.fin, modo_sitio: d.modo_sitio, lugar_id: d.lugar_id, sitio_texto: d.sitio_texto, gratis: d.gratis, cooperacion: d.cooperacion, precio: d.precio, quien: d.quien, descripcion: d.descripcion, enlace: d.enlace, imagen: d.imagen },
    { titulo: "Lectura en voz alta", inicio: "2026-10-09T19:00", fin: "2026-10-09T21:00", modo_sitio: "lugar", lugar_id: LUGAR, sitio_texto: "", gratis: "si", cooperacion: "no", precio: "", quien: "[]", descripcion: "", enlace: "", imagen: "" },
  );
  assert.match(d.operacion, /^[0-9a-f-]{36}$/);
  // Los mismos campos que el alta de siempre (`leer` de eventos/acciones.ts), más la clave de la operación.
  for (const campo of ["sitio_direccion", "sitio_pin_pendiente", "sitio_lat", "sitio_lng", "direccion_privada", "privado_lat", "privado_lng", "revelar_horas", "indicaciones", "ciudad"]) assert.ok(campo in d, campo);
  assert.equal(await avisa(p), true);
  assert.equal(await p.evaluate(() => window.qa.pedirSalida(() => window.qa.salio++)), true);
  await p.getByText("¿Salir sin publicar?").waitFor();
  await boton(p, "Seguir editando").click();
  // Reintentar con los mismos datos conserva la clave: el servidor no publica dos veces.
  await boton(p, "Publicar").click();
  await p.waitForFunction(() => window.qa.envios.length === 2);
  assert.equal((await enviado(p)).operacion, d.operacion);
});

test("un error de un dato sale junto a él en «Revisa», y mientras el servidor contesta el botón dice «Publicando…»", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaRevisa(p);
  await p.evaluate(() => (window.qa.resultado = "enlace"));
  await boton(p, "Publicar").click();
  await p.getByRole("alert").filter({ hasText: "Ese enlace no se ve bien." }).waitFor();
  await p.evaluate(() => (window.qa.resultado = "pendiente"));
  await boton(p, "Publicar").click();
  await boton(p, "Publicando…").waitFor();
  assert.equal(await boton(p, "Publicando…").isDisabled(), true);
  // Publicando, la guardia queda apartada: si sale bien, se va a la ficha sin preguntar.
  assert.equal(await avisa(p), false);
});

test("Atrás vuelve al paso anterior con lo contestado intacto", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaHora(p);
  await p.getByRole("group", { name: "Empieza" }).getByRole("button", { name: /^7:00/ }).click();
  await boton(p, "Atrás").click();
  assert.equal(await pregunta(p), "¿Qué día es?");
  assert.equal(await boton(p, /^Este viernes/).getAttribute("aria-pressed"), "true");
  await boton(p, "Atrás").click();
  assert.equal(await p.getByLabel("Nombre del evento").inputValue(), "Lectura en voz alta");
  // Lo ya contestado no se vuelve a preguntar: «Siguiente» lleva a lo primero que falta, con la hora de inicio que se eligió.
  await boton(p, "Siguiente").click();
  assert.equal(await pregunta(p), "¿A qué hora?");
  assert.equal(await p.getByRole("group", { name: "Empieza" }).getByRole("button", { name: /^7:00/ }).getAttribute("aria-pressed"), "true");
  await boton(p, "Atrás").click();
  await boton(p, "Atrás").click();
  // En el primer paso la barra lleva la ✕, no Atrás.
  await p.getByRole("link", { name: "Cerrar (Volver)" }).waitFor();
  assert.equal(await boton(p, "Atrás").count(), 0);
});

test("el botón del pie dice qué falta y no avanza hasta tenerlo; Intro hace lo mismo que el botón", TOPE, async (t) => {
  const p = await pagina(t);
  await boton(p, "No tengo cartel").click();
  const campo = p.getByLabel("Nombre del evento");
  assert.equal(await p.evaluate(() => document.activeElement?.getAttribute("aria-label")), "Nombre del evento");
  const falta = boton(p, "Falta el nombre");
  assert.equal(await falta.getAttribute("aria-disabled"), "true");
  // Apagado con `aria-disabled` (se alcanza y se lee): el toque llega y no hace nada.
  await falta.click({ force: true });
  assert.equal(await pregunta(p), "¿Cómo se llama?");
  await campo.fill("Grabado");
  await boton(p, "Siguiente").waitFor();
  await boton(p, "Borrar lo escrito").click();
  await boton(p, "Falta el nombre").waitFor();
  assert.equal(await campo.inputValue(), "");
  await campo.fill("Grabado en vivo");
  await campo.press("Enter");
  assert.equal(await pregunta(p), "¿Qué día es?");
  // El foco va a la pregunta del paso nuevo: el lector dice dónde se está.
  assert.equal(await p.evaluate(() => document.activeElement?.textContent), "¿Qué día es?");
});

// OL-345 (bitácora 374): bajo el nombre, los chips de la clase con la propuesta del título marcada; un toque la fija y el paso sigue igual.
const fila = (p) => p.getByRole("group", { name: "Cómo ocurre" });
/** Los chips de la clase: su texto y si están marcados. */
const chipsDeClase = (p) => fila(p).getByRole("button").evaluateAll((bs) => bs.map((b) => `${b.textContent}${b.getAttribute("aria-pressed") === "true" ? "*" : ""}`));

test("los chips de la clase salen bajo el nombre en cuanto hay texto, con la propuesta del título marcada, en un solo renglón pegado al campo", TOPE, async (t) => {
  const p = await pagina(t);
  await boton(p, "No tengo cartel").click();
  const campo = p.getByLabel("Nombre del evento");
  // Sin texto, el paso queda solo con su campo.
  assert.equal(await fila(p).count(), 0);
  await campo.fill("Lectura");
  assert.deepEqual(await chipsDeClase(p), ["Evento*", "Exposición", "Taller", "Festival"]);
  await campo.fill("Festival de jazz");
  assert.deepEqual(await chipsDeClase(p), ["Evento", "Exposición", "Taller", "Festival*"]);
  await campo.fill("Muestra de grabado");
  assert.deepEqual(await chipsDeClase(p), ["Evento", "Exposición*", "Taller", "Festival"]);
  // Sin rótulo a la vista: la fila es solo sus cuatro chips. Justo bajo el campo y por encima del pie.
  assert.equal(await fila(p).innerText(), "Evento\nExposición\nTaller\nFestival");
  const caja = await p.evaluate(() => {
    const input = document.querySelector('input[aria-label="Nombre del evento"]').getBoundingClientRect();
    const grupo = document.querySelector('[role="group"][aria-label="Cómo ocurre"]');
    const chips = [...grupo.querySelectorAll("button")].map((b) => b.getBoundingClientRect());
    const pie = document.querySelector("main footer").getBoundingClientRect();
    return { hueco: chips[0].top - input.bottom, renglones: new Set(chips.map((c) => Math.round(c.top))).size, abajo: Math.max(...chips.map((c) => c.bottom)), pie: pie.top };
  });
  assert.equal(caja.renglones, 1);
  // El aire de la columna (20) más lo que la fila deja para el toque de sus chips (4): justo debajo, sin otra cosa en medio.
  assert.ok(caja.hueco > 0 && caja.hueco <= 24, `hueco ${caja.hueco}`);
  assert.ok(caja.abajo < caja.pie);
  // Borrar el nombre los quita (nadie eligió todavía).
  await boton(p, "Borrar lo escrito").click();
  assert.equal(await fila(p).count(), 0);
});

test("tocar un chip fija la clase: el nombre ya no la cambia y «Siguiente» lleva al paso de esa clase; «Revisa» la confirma", TOPE, async (t) => {
  const p = await pagina(t);
  await boton(p, "No tengo cartel").click();
  const campo = p.getByLabel("Nombre del evento");
  await campo.fill("Ecos de papel");
  await fila(p).getByRole("button", { name: "Exposición" }).click();
  // Sigue en el mismo paso: sin pregunta nueva.
  assert.equal(await pregunta(p), "¿Cómo se llama?");
  assert.deepEqual(await chipsDeClase(p), ["Evento", "Exposición*", "Taller", "Festival"]);
  await campo.fill("Festival de papel");
  assert.deepEqual(await chipsDeClase(p), ["Evento", "Exposición*", "Taller", "Festival"]);
  await campo.fill("Ecos de papel");
  await boton(p, "Siguiente").click();
  assert.equal(await pregunta(p), "¿Cuándo se puede visitar?");
  // Atrás: el chip elegido sigue marcado; elegir «Taller» lleva a sus sesiones.
  await boton(p, "Atrás").click();
  await fila(p).getByRole("button", { name: "Taller" }).click();
  await boton(p, "Siguiente").click();
  assert.equal(await pregunta(p), "¿Qué días son las sesiones?");
  await boton(p, "Atrás").click();
  await fila(p).getByRole("button", { name: "Festival" }).click();
  await boton(p, "Siguiente").click();
  assert.equal(await pregunta(p), "¿Qué actividades tiene?");
  await boton(p, "Atrás").click();
  await fila(p).getByRole("button", { name: "Evento" }).click();
  await boton(p, "Siguiente").click();
  assert.equal(await pregunta(p), "¿Qué día es?");
});

test("la exposición elegida en el primer paso llega a «Revisa» con «Exposición · Cambiar» y se publica como exposición", TOPE, async (t) => {
  const p = await pagina(t);
  await boton(p, "No tengo cartel").click();
  await p.getByLabel("Nombre del evento").fill("Ecos de papel");
  await fila(p).getByRole("button", { name: "Exposición" }).click();
  await boton(p, "Siguiente").click();
  await enPaso(p, "¿Cuándo se puede visitar?");
  await p.getByRole("gridcell", { name: /^viernes 9 de octubre/ }).click();
  await p.getByRole("gridcell", { name: /^domingo 18 de octubre/ }).click();
  await p.getByRole("button", { name: "Siguiente", exact: true }).click();
  await elegirTeatro(p);
  await boton(p, /^Gratis/).click();
  await p.locator("main ul > li").first().waitFor();
  const renglones = await p.locator("main ul > li").allInnerTexts();
  assert.match(renglones[0], /Exposición\nCambiar/);
  await boton(p, "Publicar exposición").click();
  await p.waitForFunction(() => window.qa.envios.length >= 1);
  assert.equal((await enviado(p)).clase, "exposicion");
});

test("a 320 los cuatro chips caben en un renglón o se deslizan de lado, sin desbordar la pantalla", TOPE, async (t) => {
  const p = await pagina(t, { ancho: 320 });
  await boton(p, "No tengo cartel").click();
  await p.getByLabel("Nombre del evento").fill("Festival de jazz");
  await p.evaluate(() => document.fonts.ready);
  const medida = await p.evaluate(() => {
    const grupo = document.querySelector('[role="group"][aria-label="Cómo ocurre"]');
    const tops = [...grupo.querySelectorAll("button")].map((b) => Math.round(b.getBoundingClientRect().top));
    const fila = grupo.getBoundingClientRect();
    const marcado = grupo.querySelector('[aria-pressed="true"]').getBoundingClientRect();
    return { renglones: new Set(tops).size, desliza: getComputedStyle(grupo).overflowX, pagina: document.documentElement.scrollWidth, marcadoEntero: marcado.left >= fila.left - 0.5 && marcado.right <= fila.right + 0.5 }; // medio píxel: el desplazamiento va en píxeles enteros
  });
  assert.equal(medida.renglones, 1);
  // «Festival», el último, no cabe a 320: la fila se desliza sola hasta dejar entero el marcado.
  assert.equal(medida.marcadoEntero, true);
  assert.equal(medida.desliza, "auto");
  assert.equal(medida.pagina, 320);
});

/** Con `CAPTURAS_374=<carpeta>` (y `FUENTE`, y `CAPTURAS=1` para el 2×), las capturas de la bitácora 374. */
const CAPTURAS_374 = process.env.CAPTURAS_374;
const foto374 = async (p, nombre) => {
  if (!CAPTURAS_374) return;
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(300);
  await p.screenshot({ path: join(CAPTURAS_374, `${nombre}.png`) });
};

test("con el teclado abierto (390×508) el campo, los chips de la clase y «Siguiente» se ven enteros; capturas a 390 y 320", TOPE, async (t) => {
  for (const [ancho, alto] of [
    [390, 844],
    [320, 568],
  ]) {
    const p = await pagina(t, { ancho, alto });
    await boton(p, "No tengo cartel").click();
    const campo = p.getByLabel("Nombre del evento");
    await campo.waitFor();
    await foto374(p, `${ancho}-01-sin-texto`);
    await campo.fill("Festival de jazz del barrio");
    assert.deepEqual(await chipsDeClase(p), ["Evento", "Exposición", "Taller", "Festival*"]);
    await foto374(p, `${ancho}-02-festival-sugerido`);
    await fila(p).getByRole("button", { name: "Exposición" }).click();
    await campo.fill("Ecos de papel");
    assert.deepEqual(await chipsDeClase(p), ["Evento", "Exposición*", "Taller", "Festival"]);
    await foto374(p, `${ancho}-03-exposicion-elegida`);
  }
  // El iPhone con su teclado: lo que queda a la vista mide 390×508. El campo enfocado, la fila de chips y el pie, enteros y sin nada encima.
  const p = await pagina(t, { ancho: 390, alto: 508 });
  await boton(p, "No tengo cartel").click();
  const campo = p.getByLabel("Nombre del evento");
  await campo.fill("Festival de jazz del barrio");
  await campo.focus();
  const vista = await p.evaluate(() => {
    const caja = (el) => {
      const r = el.getBoundingClientRect();
      const encima = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { top: r.top, bottom: r.bottom, libre: !!encima && (el === encima || el.contains(encima)) };
    };
    const chips = [...document.querySelectorAll('[role="group"][aria-label="Cómo ocurre"] button')];
    const siguiente = [...document.querySelectorAll("main footer button")].find((b) => b.textContent === "Siguiente");
    return { alto: innerHeight, foco: document.activeElement?.getAttribute("aria-label"), campo: caja(document.querySelector('input[aria-label="Nombre del evento"]')), chips: chips.map(caja), siguiente: caja(siguiente) };
  });
  assert.equal(vista.foco, "Nombre del evento");
  // Los dos primeros chips siempre a la vista (a 390 caben los cuatro; si no cupieran, la fila se desliza).
  for (const c of [vista.campo, ...vista.chips.slice(0, 2), vista.siguiente]) {
    assert.ok(c.top >= 0 && c.bottom <= vista.alto, JSON.stringify(c));
    assert.ok(c.libre, JSON.stringify(c));
  }
  await foto374(p, "390x508-04-teclado");
});

/** Empieza a las 10:00 p.m. con la hoja de «Otra hora» (no es una hora sugerida) y deja a la vista el grupo «¿Cuánto dura?». */
async function hastaCuantoDura(p) {
  await hastaHora(p);
  await p.getByRole("group", { name: "Empieza" }).getByRole("button", { name: "Otra hora" }).click();
  await p.getByRole("dialog").getByRole("button", { name: /^10:00\s*p/ }).click();
  await p.getByRole("group", { name: "¿Cuánto dura?" }).waitFor();
  return p.getByRole("group", { name: "¿Cuánto dura?" });
}

test("«¿Cuánto dura?»: el grupo trae 1, 2 y 3 horas, «Otra hora» y «Sin hora de fin», en ese orden, y no dice nada del fin hasta elegir", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaHora(p);
  // Sin hora de inicio todavía no se pregunta cuánto dura.
  assert.equal(await p.getByRole("group", { name: "¿Cuánto dura?" }).count(), 0);
  await p.getByRole("group", { name: "Empieza" }).getByRole("button", { name: /^7:00/ }).click();
  const grupo = p.getByRole("group", { name: "¿Cuánto dura?" });
  assert.equal(await p.getByRole("group", { name: "Termina", exact: true }).count(), 0);
  assert.deepEqual(await grupo.getByRole("button").allInnerTexts(), ["1 hora", "2 horas", "3 horas", "Otra hora", "Sin hora de fin"]);
  assert.equal(await grupo.getByText(/^Termina/).count(), 0);
  if (capturas) {
    await p.mouse.move(0, 0);
    await p.waitForTimeout(400); // que acabe la transición del color del chip elegido
    await p.screenshot({ path: join(capturas, "dur-1-cuanto-dura.png") });
  }
});

test("elegir una duración avanza, y al volver dice a qué hora termina: 22:00 + 3 horas es 1:00 a.m. del día siguiente", TOPE, async (t) => {
  const p = await pagina(t);
  const grupo = await hastaCuantoDura(p);
  await grupo.getByRole("button", { name: "3 horas" }).click();
  assert.equal(await pregunta(p), "¿Dónde es?");
  await boton(p, "Atrás").click();
  assert.equal(await pregunta(p), "¿A qué hora?");
  assert.equal(await grupo.getByRole("button", { name: "3 horas" }).getAttribute("aria-pressed"), "true");
  assert.match(await grupo.locator("small").innerText(), /^Termina 1:00\s*a\.?\s?m\.? del día siguiente$/);
  if (capturas) {
    await p.waitForTimeout(400);
    await p.screenshot({ path: join(capturas, "dur-2-madrugada.png") });
  }
  // Una hora desde las 7:00 p.m. termina ese mismo día, sin «del día siguiente».
  await p.getByRole("group", { name: "Empieza" }).getByRole("button", { name: /^7:00/ }).click();
  await grupo.getByRole("button", { name: "1 hora" }).click();
  await boton(p, "Atrás").click();
  assert.match(await grupo.locator("small").innerText(), /^Termina 8:00\s*p\.?\s?m\.?$/);
});

test("«Otra hora» ofrece las 24 horas y rotula las del día siguiente; 1:00 a.m. con inicio a las 10:00 p.m. queda el día siguiente", TOPE, async (t) => {
  const p = await pagina(t);
  const grupo = await hastaCuantoDura(p);
  await grupo.getByRole("button", { name: "Otra hora" }).click();
  const hoja = p.getByRole("dialog");
  const horas = await hoja.locator("[role=group] button").allInnerTexts();
  assert.equal(horas.length, 95);
  // Primero lo que sigue esa misma noche, sin rótulo; después la madrugada, hasta un cuarto antes de la hora del inicio.
  assert.match(horas[0], /^10:15\s*p/);
  assert.doesNotMatch(horas[0], /día siguiente/);
  assert.match(horas[7], /^12:00\s*a/);
  assert.match(horas[7], /día siguiente/);
  // La misma hora del inicio no se ofrece (serían 24 horas): la lista acaba a las 9:45 p.m. del día siguiente.
  assert.match(horas.at(-1), /^9:45\s*p[\s\S]*día siguiente/);
  assert.equal(horas.filter((h) => /día siguiente/.test(h)).length, 88);
  if (capturas) await p.screenshot({ path: join(capturas, "dur-3-hoja-otra-hora.png") });
  await hoja.getByRole("button", { name: /^1:00\s*a[\s\S]*día siguiente/ }).click();
  assert.equal(await pregunta(p), "¿Dónde es?");
  await elegirTeatro(p);
  await boton(p, /^Gratis/).click();
  await p.locator("main ul > li").first().waitFor();
  await boton(p, "Publicar").click();
  await p.waitForFunction(() => window.qa.envios.length === 1);
  const d = await enviado(p);
  assert.deepEqual({ inicio: d.inicio, fin: d.fin }, { inicio: "2026-10-09T22:00", fin: "2026-10-10T01:00" });
});

test("varios días sigue preguntando a qué hora termina el último día: «Termina», sin duraciones, y «Sin hora de fin» acaba con su último día", TOPE, async (t) => {
  const p = await pagina(t);
  await boton(p, "No tengo cartel").click();
  await p.getByLabel("Nombre del evento").fill("Fiesta");
  await boton(p, "Siguiente").click();
  await boton(p, "Dura varios días").click();
  await p.locator('[data-fecha="2026-10-09"]').click();
  await p.locator('[data-fecha="2026-10-11"]').click();
  await p.getByRole("dialog").getByRole("button", { name: "Listo", exact: true }).click();
  await p.getByRole("group", { name: "Empieza" }).getByRole("button", { name: /^7:00/ }).click();
  const grupo = p.getByRole("group", { name: "Termina", exact: true });
  assert.equal(await p.getByRole("group", { name: "¿Cuánto dura?" }).count(), 0);
  const textos = await grupo.getByRole("button").allInnerTexts();
  assert.equal(textos.length, 5);
  assert.match(textos[0], /^8:00\s*p/); // el último día, una hora después del inicio
  assert.deepEqual(textos.slice(3), ["Otra hora", "Sin hora de fin"]);
  await grupo.getByRole("button", { name: "Sin hora de fin" }).click();
  await elegirTeatro(p);
  await boton(p, /^Gratis/).click();
  await p.locator("main ul > li").first().waitFor();
  await boton(p, "Publicar").click();
  await p.waitForFunction(() => window.qa.envios.length === 1);
  const d = await enviado(p);
  assert.deepEqual({ inicio: d.inicio, fin: d.fin }, { inicio: "2026-10-09T19:00", fin: "2026-10-11T23:59" });
});

/** Hasta «¿A qué hora, cada día?» de un evento del viernes 9 al domingo 11 de octubre. */
async function hastaVariosDias(p) {
  await boton(p, "No tengo cartel").click();
  await p.getByLabel("Nombre del evento").fill("Fiesta de barrio");
  await boton(p, "Siguiente").click();
  await boton(p, "Dura varios días").click();
  await p.locator('[data-fecha="2026-10-09"]').click();
  await p.locator('[data-fecha="2026-10-11"]').click();
  await p.getByRole("dialog").getByRole("button", { name: "Listo", exact: true }).click();
}

test("varios días: la pregunta es «¿A qué hora, cada día?» y, con el inicio, una línea dice el horario de cada día; sin hora de fin dice «desde»", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaVariosDias(p);
  assert.equal(await pregunta(p), "¿A qué hora, cada día?");
  const termina = p.getByRole("group", { name: "Termina", exact: true });
  // La línea del horario va bajo los chips y la casilla (prototipo de OL-310); sin hora de inicio todavía no hay horario que resumir.
  const resumen = p.locator("main > p").filter({ hasText: /^Del 9 al 11 de oct/ });
  assert.equal(await resumen.count(), 0);
  await p.getByRole("group", { name: "Empieza" }).getByRole("button", { name: /^8:00/ }).click();
  assert.match(await resumen.innerText(), /^Del 9 al 11 de oct · cada día desde las 8:00\s*p\.?\s?m\.?$/);
  if (capturas) await foto(p, "cada-dia-1-hora");
  // Un fin elegido avanza; al volver, la línea lo dice completo y «Revisa» lo enseña con días y horas.
  await termina.getByRole("button", { name: /^9:00/ }).click();
  await elegirTeatro(p);
  await boton(p, /^Gratis/).click();
  const cuando = p.locator("main ul > li").nth(1);
  assert.match(await cuando.innerText(), /Del 9 al 11 de oct · 20:00–21:00/);
  if (capturas) await foto(p, "cada-dia-3-revisa-cuando");
  await boton(p, "Atrás").click();
  await boton(p, "Atrás").click();
  await boton(p, "Atrás").click();
  assert.equal(await pregunta(p), "¿A qué hora, cada día?");
  assert.match(await resumen.innerText(), /^Del 9 al 11 de oct · cada día de 8:00 a 9:00\s*p\.?\s?m\.?$/);
  if (capturas) await foto(p, "cada-dia-2-resumen");
  // «Sin hora de fin»: acaba con su último día y «Revisa» solo dice la hora de inicio; lo guardado es el de siempre.
  await termina.getByRole("button", { name: "Sin hora de fin" }).click();
  assert.match(await p.locator("main ul > li").nth(1).innerText(), /Del 9 al 11 de oct · 20:00\nCambiar/);
  await boton(p, "Publicar").click();
  await p.waitForFunction(() => window.qa.envios.length === 1);
  const d = await enviado(p);
  assert.deepEqual({ inicio: d.inicio, fin: d.fin }, { inicio: "2026-10-09T20:00", fin: "2026-10-11T23:59" });
});

test("un solo día sigue preguntando «¿A qué hora?» y sin línea de «cada día»", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaHora(p);
  assert.equal(await pregunta(p), "¿A qué hora?");
  await p.getByRole("group", { name: "Empieza" }).getByRole("button", { name: /^7:00/ }).click();
  assert.equal(await p.locator("main").getByText(/cada día/).count(), 0);
  assert.equal(await p.getByRole("checkbox").count(), 0);
});

/** El horario común de un evento del 9 al 11 de octubre (de 8:00 a 9:00 p.m.) ya contestado, y de vuelta en «¿A qué hora, cada día?» con todo puesto. */
async function hastaCasilla(p) {
  await hastaVariosDias(p);
  await p.getByRole("group", { name: "Empieza" }).getByRole("button", { name: /^8:00/ }).click();
  await p.getByRole("group", { name: "Termina", exact: true }).getByRole("button", { name: /^9:00/ }).click();
  assert.equal(await pregunta(p), "¿Dónde es?");
  await boton(p, "Atrás").click();
  assert.equal(await pregunta(p), "¿A qué hora, cada día?");
}
const mismoHorario = (p) => p.getByRole("checkbox", { name: "Mismo horario todos los días" });
/** Los renglones de la lista de días: lo que dice cada uno. */
const listaDias = (p) => p.locator("main ul > li").allInnerTexts();
const hoja = (p) => p.getByRole("dialog");
/** La línea de abajo del paso (el resumen del horario). */
const resumenDe = (p) => p.locator("main > p").filter({ hasText: /^Del 9/ });
/** Las horas de un día en la lista, sin espacios raros: «de 8:00 p.m. a 9:00 p.m.». */
const limpio = (texto) => texto.replace(/\s+/g, " ").replace(/ | /g, " ").replace(/p\.\s?m\./g, "p.m.").replace(/a\.\s?m\./g, "a.m.");

test("horario por día, casilla marcada: nada cambia (sin lista ni sesiones, elegir el fin avanza) y lo publicado es lo de siempre", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaVariosDias(p);
  // La casilla llega con el horario común (después de «Empieza»), marcada, sin línea de fechas y sin «Siguiente» en el pie.
  assert.equal(await mismoHorario(p).count(), 0);
  await p.getByRole("group", { name: "Empieza" }).getByRole("button", { name: /^8:00/ }).click();
  assert.equal(await mismoHorario(p).getAttribute("aria-checked"), "true");
  assert.equal(await mismoHorario(p).locator("small").count(), 0);
  assert.equal(await p.locator("footer").count(), 0);
  assert.equal(await p.locator("main ul > li").count(), 0);
  if (capturas) await foto(p, "dia-1-casilla-marcada");
  await p.getByRole("group", { name: "Termina", exact: true }).getByRole("button", { name: /^9:00/ }).click();
  assert.equal(await pregunta(p), "¿Dónde es?");
  await elegirTeatro(p);
  await boton(p, /^Gratis/).click();
  await boton(p, "Publicar").click();
  await p.waitForFunction(() => window.qa.envios.length === 1);
  const d = await enviado(p);
  assert.deepEqual({ inicio: d.inicio, fin: d.fin, sesiones: d.sesiones }, { inicio: "2026-10-09T20:00", fin: "2026-10-11T21:00", sesiones: undefined });
});

test("horario por día: desmarcar pone un renglón por día; la hoja de un día cambia solo ese; «Siguiente» llega a «Revisa» con «horarios por día» y publicar manda tres sesiones", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaCasilla(p);
  await mismoHorario(p).click();
  assert.equal(await mismoHorario(p).getAttribute("aria-checked"), "false");
  // Los chips comunes se van; hay un renglón por día, todos con el horario común, y el pie dice «Siguiente».
  assert.equal(await p.getByRole("group", { name: "Empieza" }).count(), 0);
  assert.equal(await p.getByRole("group", { name: "Termina", exact: true }).count(), 0);
  const antes = (await listaDias(p)).map(limpio);
  assert.equal(antes.length, 3);
  assert.match(antes[0], /^vie 9 de oct de 8:00 p\.m\. a 9:00 p\.m\. Cambiar$/);
  assert.match(antes[1], /^sáb 10 de oct de 8:00 p\.m\. a 9:00 p\.m\. Cambiar$/);
  assert.match(antes[2], /^dom 11 de oct de 8:00 p\.m\. a 9:00 p\.m\. Cambiar$/);
  assert.match(await resumenDe(p).innerText(), /^Del 9 al 11 de oct · cada día igual$/);
  assert.ok(await boton(p, "Siguiente").isVisible());
  if (capturas) await foto(p, "dia-2-lista-de-dias");
  // Tocar el sábado abre su hoja, con sus dos grupos y «Listo».
  await boton(p, "Cambiar sáb 10 de oct").click();
  assert.equal(await hoja(p).getAttribute("aria-label"), "sáb 10 de oct");
  assert.equal(await hoja(p).getByRole("group", { name: "Empieza" }).getByRole("button", { name: /^8:00/ }).getAttribute("aria-pressed"), "true");
  assert.equal(await hoja(p).getByRole("group", { name: "Termina" }).getByRole("button", { name: /^9:00/ }).getAttribute("aria-pressed"), "true");
  if (capturas) await foto(p, "dia-3-hoja-del-sabado");
  await hoja(p).getByRole("group", { name: "Empieza" }).getByRole("button", { name: /^7:00/ }).click();
  await boton(p, "Listo").click();
  assert.equal(await hoja(p).count(), 0);
  const despues = (await listaDias(p)).map(limpio);
  assert.match(despues[1], /^sáb 10 de oct de 7:00 p\.m\. a 9:00 p\.m\. Cambiar$/);
  assert.equal(despues[0], antes[0]);
  assert.equal(despues[2], antes[2]);
  // Solo el sábado lleva sus horas en tinta y en negrita; los demás, en gris.
  const peso = (i) => p.locator("main ul > li").nth(i).locator("small").evaluate((e) => ({ peso: Number(getComputedStyle(e).fontWeight), color: getComputedStyle(e).color }));
  const [vie, sab, dom] = [await peso(0), await peso(1), await peso(2)];
  assert.ok(sab.peso >= 600 && vie.peso < 600 && dom.peso < 600);
  assert.notEqual(sab.color, vie.color);
  assert.equal(vie.color, dom.color);
  assert.match(await resumenDe(p).innerText(), /^Del 9 al 11 de oct · 1 día con otro horario$/);
  if (capturas) await foto(p, "dia-4-sabado-distinto");
  // «Siguiente» y a «Revisa»: el renglón del cuándo dice «horarios por día».
  await boton(p, "Siguiente").click();
  assert.equal(await pregunta(p), "¿Dónde es?");
  await elegirTeatro(p);
  await boton(p, /^Gratis/).click();
  const cuando = p.locator("main ul > li").nth(1);
  assert.match(await cuando.innerText(), /Del 9 al 11 de oct · horarios por día/);
  if (capturas) await foto(p, "dia-5-revisa-horarios-por-dia");
  // «Cambiar» vuelve al paso con la lista abierta (la casilla sigue desmarcada y el sábado, distinto).
  await boton(p, "Cambiar cuándo").click();
  assert.equal(await pregunta(p), "¿A qué hora, cada día?");
  assert.equal(await mismoHorario(p).getAttribute("aria-checked"), "false");
  assert.match(limpio((await listaDias(p))[1]), /7:00 p\.m\. a 9:00 p\.m\./);
  await boton(p, "Siguiente").click();
  await boton(p, "Publicar").click();
  await p.waitForFunction(() => window.qa.envios.length === 1);
  const d = await enviado(p);
  assert.deepEqual({ inicio: d.inicio, fin: d.fin }, { inicio: "2026-10-09T20:00", fin: "2026-10-11T21:00" });
  assert.deepEqual(JSON.parse(d.sesiones), [
    { inicio: "2026-10-09T20:00", fin: "2026-10-09T21:00" },
    { inicio: "2026-10-10T19:00", fin: "2026-10-10T21:00" },
    { inicio: "2026-10-11T20:00", fin: "2026-10-11T21:00" },
  ]);
});

test("horario por día: el inicio del primer día y el fin del último son los del evento; «Sin hora de fin» y «Otra hora» valen por día", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaCasilla(p);
  await mismoHorario(p).click();
  // El primer día empieza a las 12:00 y el último, sin hora de fin: el evento guarda el 12:00 del 9 y el fin del 11.
  await boton(p, "Cambiar vie 9 de oct").click();
  await hoja(p).getByRole("group", { name: "Empieza" }).getByRole("button", { name: /^12:00/ }).click();
  // Su fin (9:00 p.m.) sigue después de las 12:00; una hora propia sale de «Otra hora».
  await hoja(p).getByRole("group", { name: "Termina" }).getByRole("button", { name: "Otra hora" }).click();
  await p.getByRole("dialog", { name: /^Termina/ }).getByRole("button", { name: /^3:30/ }).click();
  await boton(p, "Listo").click();
  await boton(p, "Cambiar dom 11 de oct").click();
  await hoja(p).getByRole("group", { name: "Termina" }).getByRole("button", { name: "Sin hora de fin" }).click();
  await boton(p, "Listo").click();
  const lista = (await listaDias(p)).map(limpio);
  assert.match(lista[0], /^vie 9 de oct de 12:00 p\.m\. a 3:30 p\.m\. Cambiar$/);
  assert.match(lista[2], /^dom 11 de oct desde las 8:00 p\.m\. Cambiar$/);
  assert.match(await resumenDe(p).innerText(), /2 días con otro horario/);
  await boton(p, "Siguiente").click();
  await elegirTeatro(p);
  await boton(p, /^Gratis/).click();
  await boton(p, "Publicar").click();
  await p.waitForFunction(() => window.qa.envios.length === 1);
  const d = await enviado(p);
  assert.deepEqual({ inicio: d.inicio, fin: d.fin }, { inicio: "2026-10-09T12:00", fin: "2026-10-11T23:59" });
  assert.deepEqual(JSON.parse(d.sesiones).map((x) => x.fin), ["2026-10-09T15:30", "2026-10-10T21:00", ""]);
});

test("horario por día: volver a marcar la casilla devuelve a todos el horario común y no manda sesiones", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaCasilla(p);
  await mismoHorario(p).click();
  await boton(p, "Cambiar sáb 10 de oct").click();
  await hoja(p).getByRole("group", { name: "Empieza" }).getByRole("button", { name: /^12:00/ }).click();
  await boton(p, "Listo").click();
  assert.match(await resumenDe(p).innerText(), /1 día con otro horario/);
  await mismoHorario(p).click();
  assert.equal(await mismoHorario(p).getAttribute("aria-checked"), "true");
  assert.equal(await p.locator("main ul > li").count(), 0);
  assert.equal(await p.getByRole("group", { name: "Empieza" }).getByRole("button", { name: /^8:00/ }).getAttribute("aria-pressed"), "true");
  assert.match(await resumenDe(p).innerText(), /cada día de 8:00 a 9:00/);
  // Desmarcarla otra vez arranca de nuevo con el común: el sábado ya no es distinto.
  await mismoHorario(p).click();
  assert.match(limpio((await listaDias(p))[1]), /8:00 p\.m\. a 9:00 p\.m\./);
  await mismoHorario(p).click();
  await p.getByRole("group", { name: "Termina", exact: true }).getByRole("button", { name: /^9:00/ }).click();
  await elegirTeatro(p);
  await boton(p, /^Gratis/).click();
  await boton(p, "Publicar").click();
  await p.waitForFunction(() => window.qa.envios.length === 1);
  assert.equal((await enviado(p)).sesiones, undefined);
});

test("horario por día: cambiar los días borra el horario por día; con más de 31 días la casilla queda marcada y quieta y dice por qué", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaCasilla(p);
  await mismoHorario(p).click();
  assert.equal((await listaDias(p)).length, 3);
  // Atrás hasta «¿Qué día es?» y un rango de más de un mes (del 9 de octubre al 15 de noviembre: 38 días).
  await boton(p, "Atrás").click();
  assert.equal(await pregunta(p), "¿Qué día es?");
  await boton(p, "Dura varios días").click();
  // Con el rango anterior cerrado, el primer toque empieza de nuevo.
  await p.locator('[data-fecha="2026-10-09"]').click();
  await hoja(p).getByRole("button", { name: "Mes siguiente" }).click();
  await p.locator('[data-fecha="2026-11-15"]').click();
  await hoja(p).getByRole("button", { name: "Listo", exact: true }).click();
  // Las horas se preguntan de nuevo (el día nuevo las borra, y con ellas el horario por día).
  assert.equal(await pregunta(p), "¿A qué hora, cada día?");
  await p.getByRole("group", { name: "Empieza" }).getByRole("button", { name: /^8:00/ }).click();
  assert.equal(await mismoHorario(p).getAttribute("aria-checked"), "true");
  assert.equal(await mismoHorario(p).isDisabled(), true);
  assert.match(await mismoHorario(p).innerText(), /hasta 31 días/);
  await mismoHorario(p).click({ force: true });
  assert.equal(await mismoHorario(p).getAttribute("aria-checked"), "true");
  assert.equal(await p.locator("main ul > li").count(), 0);
  if (capturas) await foto(p, "dia-6-mas-de-31-dias");
});

for (const ancho of [320, 390]) {
  test(`horario por día a ${ancho}: la lista, la hoja de un día y el nombre largo de la casilla no desbordan`, TOPE, async (t) => {
    const p = await pagina(t, { ancho });
    await hastaCasilla(p);
    // El nombre de la casilla puede partirse en dos renglones en una pantalla angosta (no lleva «nowrap»); nada se sale.
    assert.equal(await mismoHorario(p).locator("b").evaluate((e) => getComputedStyle(e).whiteSpace), "normal");
    assert.deepEqual((await desborda(p)).fuera, []);
    await mismoHorario(p).click();
    const d = await desborda(p);
    assert.equal(d.scroll <= 0, true);
    assert.deepEqual(d.fuera, []);
    await boton(p, "Cambiar sáb 10 de oct").click();
    // La hoja vive fuera de `main`: se mide aparte. «Listo» queda siempre a la vista, bajo los chips.
    const fuera = await p.evaluate(() => {
      const w = document.documentElement.clientWidth;
      return [...document.querySelectorAll('[role="dialog"] *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > w + 0.5 || r.left < -0.5); }).map((e) => e.tagName + "." + e.className);
    });
    assert.deepEqual(fuera, []);
    const listo = await boton(p, "Listo").boundingBox();
    assert.ok(listo && listo.y + listo.height <= 844);
    if (ancho === 320 && capturas) await foto(p, "dia-7-hoja-a-320");
  });
}

for (const ancho of [320, 390]) {
  test(`varios días en «Revisa» a ${ancho}: las horas no se parten (CSS, no la cadena), el renglón parte entre los días y las horas y nada desborda`, TOPE, async (t) => {
    const p = await pagina(t, { ancho });
    await hastaVariosDias(p);
    await p.getByRole("group", { name: "Empieza" }).getByRole("button", { name: /^8:00/ }).click();
    await p.getByRole("group", { name: "Termina", exact: true }).getByRole("button", { name: /^9:00/ }).click();
    await elegirTeatro(p);
    await boton(p, /^Gratis/).click();
    const hora = p.locator("main ul > li").nth(1).locator("b span");
    assert.equal(await hora.innerText(), "20:00–21:00");
    // Una sola caja de línea: el span no se parte, aunque el renglón pase a dos líneas.
    assert.equal(await hora.evaluate((e) => e.getClientRects().length), 1);
    assert.equal(await hora.evaluate((e) => getComputedStyle(e).whiteSpace), "nowrap");
    // La cadena no lleva espacios no separables ni unidores: lo que viaja a compartir y a los avisos es texto limpio.
    assert.doesNotMatch(await p.locator("main ul > li").nth(1).innerText(), /[\u00a0\u202f\u2060]/);
    const d = await desborda(p);
    assert.equal(d.scroll <= 0, true);
    assert.deepEqual(d.fuera, []);
  });
}

test("«Tiene precio» abre el número, solo dígitos, y «Revisa» lo enseña con su signo", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaHora(p);
  await p.getByRole("group", { name: "Empieza" }).getByRole("button", { name: /^8:00/ }).click();
  await p.getByRole("group", { name: "¿Cuánto dura?" }).getByRole("button", { name: "Sin hora de fin" }).click();
  await elegirTeatro(p);
  await boton(p, /^Tiene precio/).click();
  const precio = p.getByLabel("Precio (solo números)");
  assert.equal(await p.evaluate(() => document.activeElement?.getAttribute("aria-label")), "Precio (solo números)");
  assert.equal(await boton(p, "Falta el precio").getAttribute("aria-disabled"), "true");
  await precio.fill("1a5$0");
  assert.equal(await precio.inputValue(), "150");
  await boton(p, "Siguiente").click();
  await p.locator("main ul > li").filter({ hasText: "$150" }).waitFor();
  await boton(p, "Publicar").click();
  await p.waitForFunction(() => window.qa.envios.length === 1);
  const d = await enviado(p);
  assert.deepEqual({ gratis: d.gratis, cooperacion: d.cooperacion, precio: d.precio, fin: d.fin }, { gratis: "no", cooperacion: "no", precio: "150", fin: "" });
});

test("tocar un dato en «Revisa» abre solo su pregunta y, al contestarla, vuelve; Atrás desde «Revisa» sigue el camino de ida", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaRevisa(p);
  await boton(p, "Cambiar cuánto").click();
  assert.equal(await pregunta(p), "¿Cuánto cuesta?");
  await boton(p, /^Cooperación/).click();
  await p.locator("main ul > li").filter({ hasText: "Cooperación solidaria" }).waitFor();
  // Cuándo: el día y después la hora (el día nuevo vuelve a preguntarla).
  await boton(p, "Cambiar cuándo").click();
  assert.equal(await pregunta(p), "¿Qué día es?");
  await boton(p, /^Este sábado/).click();
  assert.equal(await pregunta(p), "¿A qué hora?");
  assert.equal(await p.getByRole("group", { name: "¿Cuánto dura?" }).count(), 0);
  await p.getByRole("group", { name: "Empieza" }).getByRole("button", { name: /^12:00/ }).click();
  await p.getByRole("group", { name: "¿Cuánto dura?" }).getByRole("button", { name: "3 horas" }).click();
  await p.locator("main ul > li").filter({ hasText: "sáb 10 de oct · 12:00–15:00" }).waitFor();
  // Dónde: abre con el sitio elegido puesto en el campo; Atrás vuelve a «Revisa» sin cambiar nada.
  await boton(p, "Cambiar dónde").click();
  await boton(p, "Atrás").click();
  await p.locator("main ul > li").filter({ hasText: "Teatro de la Paz" }).waitFor();
  await boton(p, "Atrás").click();
  assert.equal(await pregunta(p), "¿Cuánto cuesta?");
});

test("la ✕ sale sin preguntar si nada cambió y pregunta «¿Salir sin publicar?» en cuanto hay algo escrito", TOPE, async (t) => {
  const p = await pagina(t);
  await p.getByRole("link", { name: "Cerrar (Volver)" }).click();
  assert.equal(await p.evaluate(() => window.qa.salio), 1);
  assert.equal(await avisa(p), false);
  await boton(p, "No tengo cartel").click();
  await p.getByLabel("Nombre del evento").fill("Lectura");
  assert.equal(await avisa(p), true);
  await boton(p, "Atrás").click();
  await p.getByRole("link", { name: "Cerrar (Volver)" }).click();
  await p.getByText("¿Salir sin publicar?").waitFor();
  assert.equal(await p.evaluate(() => window.qa.salio), 1);
  await boton(p, "Salir y borrar").click();
  assert.equal(await p.evaluate(() => window.qa.salio), 2);
});

test("la tira de tipos (OL-313) está solo en el primer paso: Evento marcado, Lugar y Artista enlaces a /nuevo, sin la ciudad si el flujo no la trae", TOPE, async (t) => {
  const p = await pagina(t);
  const tira = p.getByRole("group", { name: "Qué publicar" });
  assert.deepEqual(await tira.locator("a, button, span").evaluateAll((e) => e.map((x) => x.textContent)), ["Evento", "Lugar", "Artista"]);
  // Evento es esta pantalla: marcada, y no es un enlace ni un botón.
  assert.equal(await tira.getByText("Evento", { exact: true }).getAttribute("aria-current"), "page");
  assert.equal(await tira.getByRole("link", { name: "Evento" }).count(), 0);
  assert.equal(await tira.getByRole("button").count(), 0);
  assert.equal(await tira.getByRole("link", { name: "Lugar" }).getAttribute("href"), "/nuevo/lugar");
  assert.equal(await tira.getByRole("link", { name: "Artista" }).getAttribute("href"), "/nuevo/artista");
  assert.equal(await tira.getByRole("link").count(), 2);
  // Es el pie de la pantalla: de borde a borde y pegada abajo.
  const caja = await tira.boundingBox();
  assert.equal(Math.round(caja.x), 0);
  assert.equal(Math.round(caja.width), 390);
  assert.equal(Math.round(caja.y + caja.height), 844);
  // El recuadro del cartel y «No tengo cartel» siguen en su sitio, encima de la tira.
  assert.ok((await p.getByText("Sube el cartel", { exact: true }).boundingBox()).y < caja.y);
  assert.ok((await boton(p, "No tengo cartel").boundingBox()).y + 40 < caja.y);
  if (capturas) await foto(p, "tira-1-primer-paso");
  // Nada escrito: la guardia deja pasar sin preguntar y la entrada se reemplaza (no se apila) con el enrutador.
  await tira.getByRole("link", { name: "Lugar" }).click();
  assert.deepEqual(await p.evaluate(() => window.qa.reemplazos), ["/nuevo/lugar"]);
  assert.equal(await p.getByText("¿Salir sin publicar?").count(), 0);
  await tira.getByRole("link", { name: "Artista" }).click();
  assert.deepEqual(await p.evaluate(() => window.qa.reemplazos), ["/nuevo/lugar", "/nuevo/artista"]);
});

test("la tira de tipos lleva la ciudad que se veía en Lugar y en Artista", TOPE, async (t) => {
  const p = await pagina(t, { qa: { ciudad: { slug: "queretaro", nombre: "Querétaro", centro: { lng: -100.39, lat: 20.59 }, zoom: 12 } } });
  const tira = p.getByRole("group", { name: "Qué publicar" });
  assert.equal(await tira.getByRole("link", { name: "Lugar" }).getAttribute("href"), "/nuevo/lugar?ciudad=queretaro");
  assert.equal(await tira.getByRole("link", { name: "Artista" }).getAttribute("href"), "/nuevo/artista?ciudad=queretaro");
});

test("la tira de tipos no sale en cuanto se avanza («No tengo cartel»), vuelve con Atrás al primer paso (y ahí pregunta si hay algo escrito) y tampoco sale mientras se lee un cartel", TOPE, async (t) => {
  const p = await pagina(t, { qa: { espera: true } });
  const tira = p.getByRole("group", { name: "Qué publicar" });
  await boton(p, "No tengo cartel").click();
  await p.getByLabel("Nombre del evento").waitFor();
  assert.equal(await tira.count(), 0);
  await boton(p, "Atrás").click();
  await tira.waitFor();
  // Con algo escrito (se vuelve al primer paso con Atrás), cambiar de tipo pregunta primero y no se va hasta confirmar.
  await boton(p, "No tengo cartel").click();
  await p.getByLabel("Nombre del evento").fill("Lectura");
  await boton(p, "Atrás").click();
  await tira.getByRole("link", { name: "Lugar" }).click();
  await p.getByText("¿Salir sin publicar?").waitFor();
  assert.deepEqual(await p.evaluate(() => window.qa.reemplazos), []);
  await boton(p, "Salir y borrar").click();
  assert.deepEqual(await p.evaluate(() => window.qa.reemplazos), ["/nuevo/lugar"]);
  // Subir un cartel: la espera («Leyendo el cartel…») no lleva la tira.
  await subir(p);
  await p.getByRole("status").filter({ hasText: "Leyendo el cartel…" }).waitFor();
  assert.equal(await tira.count(), 0);
});

test("el paso siguiente entra de lado y nada se mueve con «reducir movimiento»", TOPE, async (t) => {
  const con = await pagina(t, { movimiento: "no-preference" });
  await boton(con, "No tengo cartel").click();
  assert.equal(await con.locator("main").getAttribute("data-direccion"), "entra");
  const pasos = (p) => p.evaluate(() => document.getAnimations().map((a) => a.animationName ?? "").filter((n) => /entra|vuelve/.test(n)).length);
  assert.ok((await pasos(con)) > 0);
  await boton(con, "Atrás").click();
  assert.equal(await con.locator("main").getAttribute("data-direccion"), "vuelve");
  const sin = await pagina(t);
  await boton(sin, "No tengo cartel").click();
  assert.equal(await pasos(sin), 0);
});

test("«Revisa» entra de abajo para arriba, escalonada: la cabeza, cada renglón, «Agregar…» y el pie, con «reducir movimiento» ninguno", TOPE, async (t) => {
  /** Lo que anima cada hijo de la columna y cada renglón: su animación de CSS y su retraso (en segundos). */
  const entrada = (p) =>
    p.evaluate(() => {
      const de = (e) => {
        const c = getComputedStyle(e);
        return { animacion: c.animationName, retraso: parseFloat(c.animationDelay) };
      };
      const main = document.querySelector("main");
      return {
        cabeza: de(main.querySelector("h2")),
        lista: de(main.querySelector("ul")),
        renglones: [...main.querySelectorAll("ul > li")].map(de),
        agregar: de([...main.querySelectorAll("button")].find((b) => /Agregar artistas/.test(b.textContent))),
        pie: de(main.querySelector("footer")),
        nombres: document.getAnimations().map((a) => a.animationName ?? "").filter(Boolean),
      };
    });
  const con = await pagina(t, { movimiento: "no-preference" });
  await hastaRevisa(con);
  assert.equal(await con.locator("main").getAttribute("data-direccion"), "entra");
  const e = await entrada(con);
  const sube = (x) => /sube/.test(x.animacion);
  // La cabeza, los cinco renglones (con «Evento» y «Parte de un festival», OL-321), «Agregar…» y el pie suben, cada uno 50 ms después del anterior (el pie, siempre el sexto turno).
  assert.ok([e.cabeza, ...e.renglones, e.agregar, e.pie].every(sube));
  assert.deepEqual([e.cabeza, ...e.renglones, e.agregar, e.pie].map((x) => Math.round(x.retraso * 1000)), [0, 50, 100, 150, 200, 250, 300, 300]);
  // La lista no se mueve de lado (entran sus renglones, no ella) y nada de «Revisa» entra de lado.
  assert.equal(e.lista.animacion, "none");
  const suben = (nombres) => nombres.filter((n) => /sube/.test(n)).length;
  assert.equal(suben(e.nombres), 8);
  assert.equal(e.nombres.filter((n) => /entra|vuelve/.test(n)).length, 0);
  // Congelada a los 150 ms: la cabeza va a más de la mitad del camino, el segundo renglón empieza y el tercero y lo que sigue esperan.
  await con.evaluate(() => document.getAnimations().forEach((a) => (a.pause(), (a.currentTime = 150))));
  const alto = (sel) => con.evaluate((s) => Number(getComputedStyle(document.querySelector(s)).opacity), sel);
  assert.ok((await alto("main h2")) > 0.4 && (await alto("main h2")) < 1);
  assert.equal(await alto("main ul > li:nth-child(3)"), 0);
  assert.equal(await alto("main footer"), 0);
  if (capturas) await con.screenshot({ path: join(capturas, "revisa-1-a-150ms.png") });
  await con.evaluate(() => document.getAnimations().forEach((a) => a.finish()));
  if (capturas) await foto(con, "revisa-2-al-final");
  // Al volver de «Cambiar» un dato no corre: «Revisa» regresa por el otro lado y nada sube.
  await boton(con, "Cambiar cuánto").click();
  await boton(con, /^Cooperación/).click();
  await con.locator("main ul > li").filter({ hasText: "Cooperación solidaria" }).waitFor();
  assert.equal(await con.locator("main").getAttribute("data-direccion"), "vuelve");
  assert.equal(suben((await entrada(con)).nombres), 0);
  const sin = await pagina(t);
  await hastaRevisa(sin);
  const quieto = await entrada(sin);
  assert.equal(quieto.cabeza.animacion, "none");
  assert.deepEqual(quieto.nombres, []);
});

test("con cartel entra la cabeza entera, la foto y el nombre juntos, como una pieza", TOPE, async (t) => {
  const p = await pagina(t, { movimiento: "no-preference", qa: { lectura: LEIDO } });
  await subir(p);
  await p.getByText("Leído del cartel").waitFor();
  const e = await p.evaluate(() => {
    const cabeza = document.querySelector("main > div:has(img)");
    return { cabeza: getComputedStyle(cabeza).animationName, titulo: getComputedStyle(cabeza.querySelector("h2")).animationName, retrasos: [...document.querySelectorAll("main ul > li")].map((x) => parseFloat(getComputedStyle(x).animationDelay)) };
  });
  assert.match(e.cabeza, /sube/);
  assert.equal(e.titulo, "none");
  assert.deepEqual(e.retrasos.map((x) => Math.round(x * 1000)), [50, 100, 150, 200, 250, 300]);
});

/* ---- Con cartel (OL-302, bitácora 330; OL-307, bitácora 335: el cartel se sube siempre y la lectura es una casilla) ---- */

/** Lo que devuelve `leerCartelAccion` cuando el cartel se lee completo (caso «legible» del prototipo): nombre, día y hora, un lugar del
 *  directorio, gratis y un artista. */
const LEIDO = { ok: true, valores: { titulo: "Inauguración de Ecos de papel", inicio: "2026-11-05T19:00", fin: "", gratis: true, precio: "", descripcion: "", enlace: "", lugar: "Teatro de la Paz", direccion: "" }, lugarId: LUGAR, quien: [{ nombre: "Lucía Montaño" }], horaLeida: true, costoLeido: true };
/** Lo mismo con lo que el cartel no trae: sin lugar del directorio ni precio (caso «medias»). */
const MEDIAS = { ...LEIDO, valores: { ...LEIDO.valores, titulo: "Noche de son huasteco", inicio: "2026-11-14T20:00", gratis: false, lugar: "" }, lugarId: null, quien: [{ nombre: "Trío Bruma" }], costoLeido: false };
/** Las seis del mes ya usadas: la casilla queda apagada. */
const CUPO_AGOTADO = { usadas: 6, tope: 6, sinTope: false };
const subir = (p, nombre = "cartel.svg") => p.locator("input[type=file]").setInputFiles({ name: nombre, mimeType: "image/svg+xml", buffer: Buffer.from(CARTEL) });
/** Los datos de «Revisa» sin los renglones de cómo ocurre (OL-321: «Evento · Cambiar» arriba y «Parte de un festival · Agregar» abajo), que prueban las suyas. */
const renglones = async (p) => (await p.locator("main ul > li").allInnerTexts()).filter((t) => !/^cómo ocurre\n|^festival\n/i.test(t));
const casilla = (p) => p.getByRole("checkbox", { name: /Lectura automática/ });
/** La fila chica sobre la primera pregunta: miniatura y sello. */
const guardado = (p) => p.locator("main div").filter({ has: p.locator("img"), hasText: /Cartel guardado/ });
const foto = async (p, nombre) => {
  if (!capturas) return;
  await p.mouse.move(0, 0);
  // El aro de foco de un foco puesto por el programa (la pregunta de cada paso) no se ve en el teléfono con el dedo: la foto es del reposo.
  await p.evaluate(() => document.activeElement?.blur());
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(450);
  await p.screenshot({ path: join(capturas, `${nombre}.png`) });
};
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

test("el primer paso: un marco con el recuadro «Sube el cartel» y la casilla «Lectura automática» marcada; «No tengo cartel» fuera, con más aire", TOPE, async (t) => {
  const p = await pagina(t);
  const campo = p.locator("input[type=file]");
  assert.equal(await campo.getAttribute("accept"), "image/*");
  // El campo cubre el recuadro entero: el toque cae en él y el teléfono ofrece cámara o carrete.
  const recuadro = await campo.locator("xpath=..").boundingBox();
  const caja = await campo.boundingBox();
  assert.ok(Math.abs(caja.width - recuadro.width) <= 1 && Math.abs(caja.height - recuadro.height) <= 1, "el campo cubre el recuadro");
  assert.equal(await campo.evaluate((e) => getComputedStyle(e).opacity), "0");
  // Lo que dice el recuadro: para qué sirve el cartel, no lo que el sistema hará con él.
  await p.getByText("Será la portada del evento").waitFor();
  assert.equal(await p.getByText(/Leemos el nombre/).count(), 0);
  // La casilla: marcada de entrada, con el nombre arriba y «Quedan 5 este mes» debajo (1 de 6 usadas), los dos a la izquierda.
  const c = casilla(p);
  assert.equal(await c.getAttribute("aria-checked"), "true");
  assert.equal(await c.isDisabled(), false);
  assert.equal(await c.locator("b").innerText(), "Lectura automática");
  assert.equal(await c.locator("small").innerText(), "Quedan 5 este mes");
  const [nombre, detalle, caja2] = await Promise.all([c.locator("b").boundingBox(), c.locator("small").boundingBox(), c.boundingBox()]);
  assert.ok(detalle.y >= nombre.y + nombre.height - 2, "el contador va debajo del nombre");
  assert.ok(Math.abs(detalle.x - nombre.x) <= 1, "los dos a la izquierda, alineados");
  assert.equal(await c.locator("b").evaluate((e) => getComputedStyle(e).fontSize), "17px");
  assert.equal(await c.locator("small").evaluate((e) => getComputedStyle(e).fontSize), "14px");
  assert.equal(await c.locator("b").evaluate((e) => getComputedStyle(e).fontWeight), "700");
  // Región común: la casilla es la última fila del mismo marco del recuadro, pegada debajo y con su raya punteada.
  const marco = await c.locator("xpath=..").boundingBox();
  assert.ok(Math.abs(caja2.y - (recuadro.y + recuadro.height)) <= 1, "la casilla se toca con el recuadro");
  assert.ok(caja2.y + caja2.height <= marco.y + marco.height, "dentro del marco");
  assert.equal(await c.evaluate((e) => getComputedStyle(e).borderTopStyle), "dashed");
  assert.equal(await campo.locator("xpath=../..").evaluate((e) => getComputedStyle(e).borderTopStyle), "dashed");
  // «No tengo cartel»: una opción que avanza (texto a la izquierda, chevron a la derecha), fuera del marco y con más aire que entre las demás piezas.
  const otra = boton(p, "No tengo cartel");
  const o = await otra.boundingBox();
  assert.ok(o.y - (marco.y + marco.height) >= 35, `con más aire que el de la columna (20): ${o.y - (marco.y + marco.height)}`);
  assert.equal(await otra.locator("svg").count(), 1);
  const chevron = await otra.locator("svg").boundingBox();
  assert.ok(chevron.x > o.x + o.width / 2, "el chevron a la derecha");
  assert.equal(await otra.locator("b").evaluate((e) => getComputedStyle(e).textAlign), "left");
  assert.equal(Math.round(o.width), Math.round(marco.width));
  await foto(p, "335-01-inicio-casilla-marcada");
});

test("la casilla se desmarca y se vuelve a marcar con un toque", TOPE, async (t) => {
  const p = await pagina(t);
  await casilla(p).click();
  assert.equal(await casilla(p).getAttribute("aria-checked"), "false");
  await casilla(p).click();
  assert.equal(await casilla(p).getAttribute("aria-checked"), "true");
});

test("con la casilla marcada: subir → «Leyendo» (el cartel chico y el aviso, sin pie) → directo a «Revisa» con «Leído del cartel» y sus cuatro renglones; publicar manda la imagen", TOPE, async (t) => {
  const p = await pagina(t, { qa: { lectura: LEIDO, espera: true } });
  await subir(p);
  await p.getByRole("status").filter({ hasText: "Leyendo el cartel…" }).waitFor();
  // Se subió a la carpeta de siempre y la lectura se pidió con la dirección pública de lo subido.
  await p.waitForFunction(() => window.qa.lecturas.length === 1);
  assert.deepEqual(await p.evaluate(() => ({ subidas: window.qa.subidas, lecturas: window.qa.lecturas })), { subidas: [{ carpeta: "lugares", usuario: "usuaria-1", prefijo: "evento", archivo: "cartel.svg" }], lecturas: ["/cartel.svg"] });
  const miniatura = p.locator("main img");
  assert.match(await miniatura.getAttribute("src"), /^blob:/);
  assert.equal(Math.round((await miniatura.boundingBox()).width), 168);
  assert.equal(await p.locator("main footer").count(), 0);
  assert.equal(await p.locator("main h2").count(), 0);
  await foto(p, "335-06-leyendo");
  await p.evaluate(() => window.qa.liberar());
  await p.getByText("Leído del cartel").waitFor();
  // Los cuatro renglones, los leídos como cualquier otro; no se preguntó nada.
  const filas = await renglones(p);
  assert.equal(filas.length, 4);
  assert.match(filas[0], /jue 5 de nov · 19:00/);
  assert.match(filas[1], /Teatro de la Paz/);
  assert.match(filas[2], /Gratis/);
  assert.match(filas[3], /Lucía Montaño/);
  assert.equal(await pregunta(p), "Inauguración de Ecos de papel");
  assert.equal(await p.locator("main img").getAttribute("src"), "/cartel.svg");
  assert.equal(await p.locator("main img").evaluate((e) => e.naturalWidth > 0), true);
  await foto(p, "335-07-revisa-leido");
  await boton(p, "Publicar").click();
  await p.waitForFunction(() => window.qa.envios.length === 1);
  const d = await enviado(p);
  assert.deepEqual(
    { titulo: d.titulo, inicio: d.inicio, fin: d.fin, modo_sitio: d.modo_sitio, lugar_id: d.lugar_id, gratis: d.gratis, precio: d.precio, quien: d.quien, imagen: d.imagen },
    { titulo: "Inauguración de Ecos de papel", inicio: "2026-11-05T19:00", fin: "", modo_sitio: "lugar", lugar_id: LUGAR, gratis: "si", precio: "", quien: JSON.stringify([{ nombre: "Lucía Montaño" }]), imagen: "/cartel.svg" },
  );
});

test("a medias: se preguntan solo dónde y cuánto, sin la fila «Cartel guardado», y «Revisa» deja el sello; lo que se contesta se ve igual que lo leído", TOPE, async (t) => {
  const p = await pagina(t, { qa: { lectura: MEDIAS } });
  await subir(p);
  assert.equal(await pregunta(p), "¿Dónde es?");
  assert.equal(await guardado(p).count(), 0);
  await elegirTeatro(p);
  assert.equal(await pregunta(p), "¿Cuánto cuesta?");
  await boton(p, /^Cooperación/).click();
  await p.getByText("Leído del cartel").waitFor();
  const filas = await renglones(p);
  assert.equal(filas.length, 4);
  assert.match(filas[0], /sáb 14 de nov · 20:00/);
  assert.match(filas[1], /Teatro de la Paz/);
  assert.match(filas[2], /Cooperación solidaria/);
  assert.match(filas[3], /Trío Bruma/);
});

test("la única pregunta que falta (el precio) sale sola; Atrás vuelve al recuadro y otro cartel la contesta de nuevo", TOPE, async (t) => {
  const p = await pagina(t, { qa: { lectura: { ...LEIDO, valores: { ...LEIDO.valores, gratis: false }, costoLeido: false } } });
  await subir(p);
  assert.equal(await pregunta(p), "¿Cuánto cuesta?");
  await foto(p, "335-08-medias-cuanto");
  await boton(p, "Atrás").click();
  await p.getByText("Será la portada del evento").waitFor();
  await subir(p);
  await boton(p, /^Gratis/).click();
  await p.getByText("Leído del cartel").waitFor();
  assert.match((await renglones(p))[2], /Gratis/);
});

test("una fecha sin hora pregunta solo la hora, y las 19:00 de relleno no vienen marcadas", TOPE, async (t) => {
  const p = await pagina(t, { qa: { lectura: { ...LEIDO, valores: { ...LEIDO.valores, titulo: "Cine al aire libre", inicio: "2026-11-14T19:00" }, horaLeida: false } } });
  await subir(p);
  assert.equal(await pregunta(p), "¿A qué hora?");
  const empieza = p.getByRole("group", { name: "Empieza" });
  assert.equal(await empieza.getByRole("button", { name: /^7:00/ }).getAttribute("aria-pressed"), "false");
  await empieza.getByRole("button", { name: /^8:00/ }).click();
  await p.getByRole("group", { name: "¿Cuánto dura?" }).getByRole("button", { name: "Sin hora de fin" }).click();
  await p.getByText("Leído del cartel").waitFor();
  assert.match((await renglones(p))[0], /sáb 14 de nov · 20:00/);
});

test("un sitio que el cartel nombra y no está en el directorio se pregunta igual, con lo leído de partida", TOPE, async (t) => {
  const fuera = { ...LEIDO, valores: { ...LEIDO.valores, lugar: "Jardín de San Juan de Dios", direccion: "Galeana 100" }, lugarId: null };
  const p = await pagina(t, { qa: { lectura: fuera } });
  await subir(p);
  assert.equal(await pregunta(p), "¿Dónde es?");
  assert.equal(await buscar(p).inputValue(), "Jardín de San Juan de Dios");
});

test("con la casilla desmarcada el cartel se sube y no se lee: «Subiendo», y directo a «¿Cómo se llama?» con «Cartel guardado» solo en esa primera pregunta; la imagen viaja al publicar", TOPE, async (t) => {
  const p = await pagina(t, { qa: { lectura: LEIDO, esperaSubida: true } });
  await casilla(p).click();
  await subir(p);
  await p.getByRole("status").filter({ hasText: "Subiendo el cartel…" }).waitFor();
  assert.equal(await p.getByText("Leyendo el cartel…").count(), 0);
  await p.waitForFunction(() => window.qa.subidas.length === 1);
  await p.evaluate(() => window.qa.liberarSubida());
  await p.getByRole("heading", { name: "¿Cómo se llama?" }).waitFor();
  assert.equal(await pregunta(p), "¿Cómo se llama?");
  // No hubo lectura: ni se pidió ni se gastó nada.
  assert.equal(await p.evaluate(() => window.qa.lecturas.length), 0);
  // La fila chica arriba de la primera pregunta: la miniatura de 40 de ancho y el sello gris, sin «no pude leerlo».
  const fila = guardado(p);
  assert.equal(await fila.count(), 1);
  assert.equal(await fila.innerText(), "Cartel guardado");
  assert.equal(await fila.locator("img").getAttribute("src"), "/cartel.svg");
  assert.equal(Math.round((await fila.locator("img").boundingBox()).width), 40);
  const [f, h] = await Promise.all([fila.boundingBox(), p.locator("main h2").first().boundingBox()]);
  assert.ok(f.y + f.height <= h.y, "la fila va encima de la pregunta");
  await foto(p, "335-04-cartel-guardado");
  // Solo en la primera pregunta, y se queda al volver a ella.
  await p.getByLabel("Nombre del evento").fill("Lectura en voz alta");
  await boton(p, "Siguiente").click();
  assert.equal(await pregunta(p), "¿Qué día es?");
  assert.equal(await guardado(p).count(), 0);
  await boton(p, "Atrás").click();
  assert.equal(await guardado(p).count(), 1);
  await boton(p, "Siguiente").click();
  await boton(p, /^Este viernes/).click();
  await p.getByRole("group", { name: "Empieza" }).getByRole("button", { name: /^7:00/ }).click();
  await p.getByRole("group", { name: "¿Cuánto dura?" }).getByRole("button", { name: "2 horas" }).click();
  await elegirTeatro(p);
  await boton(p, /^Gratis/).click();
  await p.getByRole("heading", { name: "Lectura en voz alta" }).waitFor();
  // «Revisa»: la miniatura del cartel guardado y ningún sello «Leído del cartel».
  assert.equal(await p.locator("main img").getAttribute("src"), "/cartel.svg");
  assert.equal(await p.getByText("Leído del cartel").count(), 0);
  await boton(p, "Publicar").click();
  await p.waitForFunction(() => window.qa.envios.length === 1);
  assert.equal((await enviado(p)).imagen, "/cartel.svg");
});

test("con las seis del mes usadas la casilla queda apagada con «Se renueva el 1 de …»; el recuadro es el mismo y subir sigue a las preguntas sin leer", TOPE, async (t) => {
  const p = await pagina(t, { qa: { cupoAlAbrir: CUPO_AGOTADO, lectura: LEIDO } });
  const c = casilla(p);
  assert.equal(await c.isDisabled(), true);
  assert.equal(await c.getAttribute("aria-checked"), "false");
  assert.match(await c.locator("small").innerText(), /^Se renueva el 1 de [a-zé]+$/);
  assert.ok(Number(await c.evaluate((e) => getComputedStyle(e).opacity)) < 1, "atenuada");
  // El recuadro no cambia: ni «Se acabaron tus lecturas», ni «Pedir más», ni «Probar con otra foto».
  await p.getByText("Sube el cartel", { exact: true }).waitFor();
  await p.getByText("Será la portada del evento").waitFor();
  assert.equal(await p.getByText(/Se acabaron|Pedir más|Probar con otra foto/).count(), 0);
  await foto(p, "335-02-casilla-apagada");
  await subir(p);
  assert.equal(await pregunta(p), "¿Cómo se llama?");
  assert.equal(await guardado(p).innerText(), "Cartel guardado");
  assert.deepEqual(await p.evaluate(() => ({ subidas: window.qa.subidas.length, lecturas: window.qa.lecturas.length })), { subidas: 1, lecturas: 0 });
});

test("con una sola lectura que queda lo dice en singular, y la administración (sin tope) ve «Sin límite» y puede leer", TOPE, async (t) => {
  const una = await pagina(t, { qa: { cupoAlAbrir: { usadas: 5, tope: 6, sinTope: false } } });
  assert.equal(await casilla(una).locator("small").innerText(), "Queda 1 este mes");
  const admin = await pagina(t, { qa: { cupoAlAbrir: { usadas: 40, tope: 6, sinTope: true }, lectura: LEIDO } });
  assert.equal(await casilla(admin).locator("small").innerText(), "Sin límite");
  assert.equal(await casilla(admin).isDisabled(), false);
  assert.equal(await casilla(admin).getAttribute("aria-checked"), "true");
  await subir(admin);
  await admin.getByText("Leído del cartel").waitFor();
});

test("sin saber el cupo la casilla va marcada y sin contador; el servidor decide al leer", TOPE, async (t) => {
  const p = await pagina(t, { qa: { cupoAlAbrir: null, lectura: LEIDO } });
  assert.equal(await casilla(p).getAttribute("aria-checked"), "true");
  assert.equal(await casilla(p).locator("small").count(), 0);
  await subir(p);
  await p.getByText("Leído del cartel").waitFor();
});

test("cada lectura buena resta una al contador al volver al primer paso", TOPE, async (t) => {
  const p = await pagina(t, { qa: { lectura: { ...LEIDO, valores: { ...LEIDO.valores, gratis: false }, costoLeido: false } } });
  assert.equal(await casilla(p).locator("small").innerText(), "Quedan 5 este mes");
  await subir(p);
  assert.equal(await pregunta(p), "¿Cuánto cuesta?");
  await boton(p, "Atrás").click();
  assert.equal(await casilla(p).locator("small").innerText(), "Quedan 4 este mes");
});

test("si el servidor dice que ya no hay cupo (se gastó en otra pantalla), el cartel queda guardado y se sigue a las preguntas, sin decir que falló; la casilla se apaga", TOPE, async (t) => {
  const p = await pagina(t, { qa: { lectura: "sinCupo" } });
  await subir(p);
  assert.equal(await pregunta(p), "¿Cómo se llama?");
  assert.equal(await guardado(p).innerText(), "Cartel guardado");
  await boton(p, "Atrás").click();
  assert.equal(await casilla(p).isDisabled(), true);
  assert.match(await casilla(p).locator("small").innerText(), /^Se renueva el 1 de /);
  await boton(p, "No tengo cartel").click();
  await p.getByLabel("Nombre del evento").fill("Lectura en voz alta");
  await boton(p, "Siguiente").click();
  await boton(p, /^Este viernes/).click();
  await p.getByRole("group", { name: "Empieza" }).getByRole("button", { name: /^7:00/ }).click();
  await p.getByRole("group", { name: "¿Cuánto dura?" }).getByRole("button", { name: "2 horas" }).click();
  await elegirTeatro(p);
  await boton(p, /^Gratis/).click();
  await boton(p, "Publicar").click();
  await p.waitForFunction(() => window.qa.envios.length === 1);
  assert.equal((await enviado(p)).imagen, "/cartel.svg");
});

test("si la lectura falla: el cartel queda guardado, se sigue directo a «¿Cómo se llama?» con «Cartel guardado · no pude leerlo», y la imagen viaja al publicar, sin sello", TOPE, async (t) => {
  const p = await pagina(t, { qa: { lectura: "fallo" } });
  await subir(p);
  assert.equal(await pregunta(p), "¿Cómo se llama?");
  assert.equal(await guardado(p).innerText(), "Cartel guardado · no pude leerlo");
  // Nada de «Probar con otra foto»: la pantalla no vuelve al recuadro.
  assert.equal(await p.getByText(/Probar con otra foto|No pude leer el cartel/).count(), 0);
  await foto(p, "335-05-no-pude-leerlo");
  await p.getByLabel("Nombre del evento").fill("Lectura en voz alta");
  await boton(p, "Siguiente").click();
  assert.equal(await guardado(p).count(), 0);
  await boton(p, /^Este viernes/).click();
  await p.getByRole("group", { name: "Empieza" }).getByRole("button", { name: /^7:00/ }).click();
  await p.getByRole("group", { name: "¿Cuánto dura?" }).getByRole("button", { name: "2 horas" }).click();
  await elegirTeatro(p);
  await boton(p, /^Gratis/).click();
  await p.getByRole("heading", { name: "Lectura en voz alta" }).waitFor();
  assert.equal(await p.locator("main img").getAttribute("src"), "/cartel.svg");
  assert.equal(await p.getByText("Leído del cartel").count(), 0);
  await boton(p, "Publicar").click();
  await p.waitForFunction(() => window.qa.envios.length === 1);
  assert.equal((await enviado(p)).imagen, "/cartel.svg");
});

test("Atrás desde la primera pregunta vuelve al primer paso; otro cartel, esta vez bien leído, sigue por el camino con cartel", TOPE, async (t) => {
  const p = await pagina(t, { qa: { lectura: "fallo" } });
  await subir(p);
  assert.equal(await pregunta(p), "¿Cómo se llama?");
  await boton(p, "Atrás").click();
  await p.getByText("Será la portada del evento").waitFor();
  await p.evaluate((leido) => (window.qa.lectura = leido), LEIDO);
  await subir(p, "otra.svg");
  await p.getByText("Leído del cartel").waitFor();
  assert.equal((await renglones(p)).length, 4);
});

test("si no se pudo subir: lo dice con su causa bajo el marco, el recuadro sigue igual y no se lee; «No tengo cartel» sigue", TOPE, async (t) => {
  const p = await pagina(t, { qa: { subida: "error", lectura: LEIDO } });
  await subir(p);
  await p.getByRole("alert").filter({ hasText: "No pude subir el cartel. Puede ser tu conexión." }).waitFor();
  assert.equal(await p.evaluate(() => window.qa.lecturas.length), 0);
  await p.getByText("Será la portada del evento").waitFor();
  assert.equal(await casilla(p).getAttribute("aria-checked"), "true");
  await foto(p, "335-09-no-se-pudo-subir");
  // Se puede volver a intentar con el mismo recuadro, y el aviso se va al empezar.
  await p.evaluate(() => (window.qa.subida = "ok"));
  await subir(p);
  await p.getByText("Leído del cartel").waitFor();
  assert.equal(await p.getByRole("alert").count(), 0);
});

test("si se corta a mitad: antes de subir lo dice y no guarda nada; con el cartel ya subido y la lectura cortada, queda guardado y se sigue («no pude leerlo»)", TOPE, async (t) => {
  const p = await pagina(t, { qa: { subida: "throw", lectura: LEIDO } });
  await subir(p);
  await p.getByRole("alert").filter({ hasText: "Se cortó a la mitad. Puede ser tu conexión." }).waitFor();
  assert.equal(await p.getByRole("status").filter({ hasText: /Leyendo|Subiendo/ }).count(), 0);
  assert.equal(await p.evaluate(() => window.qa.lecturas.length), 0);
  await p.evaluate(() => { window.qa.subida = "ok"; window.qa.lectura = "throw"; });
  await subir(p);
  assert.equal(await pregunta(p), "¿Cómo se llama?");
  assert.equal(await guardado(p).innerText(), "Cartel guardado · no pude leerlo");
});

test("sin servicio de lectura el marco solo lleva el recuadro, sin casilla; el cartel se sube y se sigue a las preguntas", TOPE, async (t) => {
  const p = await pagina(t, { qa: { cartelActivo: false, cupoAlAbrir: null, lectura: LEIDO } });
  await p.getByText("Será la portada del evento").waitFor();
  assert.equal(await p.getByRole("checkbox").count(), 0);
  assert.equal(await p.getByText(/Lectura automática|Quedan|Se renueva/).count(), 0);
  const marco = await p.locator("input[type=file]").locator("xpath=../..").boundingBox();
  const recuadro = await p.locator("input[type=file]").locator("xpath=..").boundingBox();
  assert.ok(Math.abs(marco.height - recuadro.height) <= 4 + 0.5, "el marco solo envuelve el recuadro");
  await boton(p, "No tengo cartel").waitFor();
  await foto(p, "335-03-sin-servicio");
  await subir(p);
  await p.getByRole("heading", { name: "¿Cómo se llama?" }).waitFor();
  assert.equal(await guardado(p).innerText(), "Cartel guardado");
  assert.equal(await p.evaluate(() => window.qa.lecturas.length), 0);
});

test("«No tengo cartel» sigue: sin cartel, sin fila de cartel y sin imagen al publicar", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaRevisa(p);
  assert.equal(await p.locator("main img").count(), 0);
  await boton(p, "Publicar").click();
  await p.waitForFunction(() => window.qa.envios.length === 1);
  assert.equal((await enviado(p)).imagen, "");
});

test("«Leyendo» no tiene Atrás; con lo leído, salir sin publicar avisa y Atrás desde «Revisa» salta «Leyendo» y vuelve al primer paso", TOPE, async (t) => {
  const p = await pagina(t, { qa: { lectura: LEIDO, espera: true } });
  await subir(p);
  await p.getByRole("status").filter({ hasText: "Leyendo el cartel…" }).waitFor();
  assert.equal(await boton(p, "Atrás").count(), 0);
  await p.evaluate(() => window.qa.liberar());
  await p.getByText("Leído del cartel").waitFor();
  assert.equal(await avisa(p), true);
  await boton(p, "Atrás").click();
  await p.getByText("Será la portada del evento").waitFor();
});

test("el cartel chico late, y con «reducir movimiento» se queda quieto", TOPE, async (t) => {
  const anima = (p) => p.locator("main img").evaluate((e) => getComputedStyle(e).animationName);
  const con = await pagina(t, { movimiento: "no-preference", qa: { lectura: LEIDO, espera: true } });
  await subir(con);
  await con.locator("main img").waitFor();
  assert.notEqual(await anima(con), "none");
  const sin = await pagina(t, { qa: { lectura: LEIDO, espera: true } });
  await subir(sin);
  await sin.locator("main img").waitFor();
  assert.equal(await anima(sin), "none");
});

/** Las pantallas del camino con cartel, por ancho: cada una con su preparación; las usan la prueba de desbordes y la de `npm run medir`. */
const PANTALLAS_CARTEL = [
  ["primer paso con la casilla marcada", {}, null],
  ["primer paso con la casilla apagada", { cupoAlAbrir: CUPO_AGOTADO }, null],
  ["primer paso sin servicio de lectura", { cartelActivo: false, cupoAlAbrir: null }, null],
  ["primer paso con el aviso de que no se pudo subir", { subida: "error" }, async (p) => p.getByRole("alert").waitFor()],
  ["espera con el cartel", { lectura: LEIDO, espera: true }, async (p) => p.locator("main img").waitFor()],
  ["«¿Cómo se llama?» con «Cartel guardado»", { cupoAlAbrir: CUPO_AGOTADO }, async (p) => p.getByText("Cartel guardado").waitFor()],
  ["«¿Cómo se llama?» con «no pude leerlo»", { lectura: "fallo" }, async (p) => p.getByText("no pude leerlo").waitFor()],
  ["«Revisa» con cartel leído", { lectura: LEIDO }, async (p) => p.getByText("Leído del cartel").waitFor()],
  ["«Revisa» con un nombre del tope", { lectura: { ...LEIDO, valores: { ...LEIDO.valores, titulo: "Fiestas ".repeat(13).trim().slice(0, 120) } } }, async (p) => p.getByText("Leído del cartel").waitFor()],
];
/** Lleva la pantalla `[nombre, qa, esperar]` a su estado: las que traen «esperar» suben un cartel primero y esperan a verlo. */
async function aPantalla(t, ancho, [, qa, esperar]) {
  const p = await pagina(t, { ancho, qa });
  if (esperar) {
    await subir(p);
    await esperar(p);
  }
  return p;
}

for (const ancho of [320, 390]) {
  test(`sin desbordes a ${ancho}: el primer paso en sus tres formas, la espera, «¿Cómo se llama?» con el cartel guardado y «Revisa» con cartel`, TOPE, async (t) => {
    const limpio = { scroll: 0, fuera: [] };
    for (const pantalla of PANTALLAS_CARTEL) {
      const p = await aPantalla(t, ancho, pantalla);
      assert.deepEqual(await desborda(p), limpio, pantalla[0]);
    }
  });
}

/** La regla de `npm run medir` (toques de 44, accionables tapados, hijos fuera de su caja, márgenes negativos) en estas pantallas: `MEDIR`,
 *  que se lee en el `before` (ver allí por qué no aquí). */
test("con cartel, ninguna pantalla tiene toques menores de 44, controles tapados, hijos fuera de su caja ni márgenes negativos (320 y 390)", TOPE, async (t) => {
  const medidas = async (p) => {
    const m = await p.evaluate(MEDIR);
    return { toques: m.toquesChicos.filter((c) => !c.enTexto).map((c) => c.el), tapados: m.tapados.map((c) => c.el), desbordes: m.desbordes, fuera: m.fueraVentana, negativos: m.negativos, scroll: m.scrollHorizontal };
  };
  const limpio = { toques: [], tapados: [], desbordes: [], fuera: [], negativos: [], scroll: false };
  for (const ancho of [320, 390]) {
    for (const pantalla of PANTALLAS_CARTEL) {
      const p = await aPantalla(t, ancho, pantalla);
      assert.deepEqual(await medidas(p), limpio, `${pantalla[0]} a ${ancho}`);
    }
  }
});

test("«¿Dónde es?»: un solo campo con lupa y ✕, foco al llegar y «Estoy aquí» mientras no hay texto; ningún otro campo", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaDonde(p);
  assert.equal(await cajas(p), 1);
  assert.equal(await buscar(p).getAttribute("placeholder"), "Nombre del lugar o dirección");
  assert.equal(await p.evaluate(() => document.activeElement?.getAttribute("aria-label")), "Buscar el lugar");
  await boton(p, /^Estoy aquí/).waitFor();
  assert.match(await boton(p, /^Estoy aquí/).innerText(), /Usa la ubicación del teléfono/);
  // Sin pie: elegir avanza.
  assert.equal(await p.locator("main footer").count(), 0);
  assert.equal(await boton(p, "Borrar lo escrito").count(), 0);
  await foto(p, "donde-1-vacio");
  // Con texto aparece la ✕, y «Estoy aquí» cede su sitio a la lista.
  await buscar(p).fill("centro");
  await boton(p, "Borrar lo escrito").waitFor();
  assert.equal(await boton(p, /^Estoy aquí/).count(), 0);
  await boton(p, "Borrar lo escrito").click();
  assert.equal(await buscar(p).inputValue(), "");
  await boton(p, /^Estoy aquí/).waitFor();
});

test("la lista flotante junta los lugares del directorio y, debajo, lo que trae el mapa; con una sola letra no se abre", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaDonde(p);
  await buscar(p).fill("t");
  assert.equal(await p.getByRole("listbox").count(), 0);
  // «teatro» está en el directorio y en el mapa: primero el directorio y, debajo, lo del mapa. «jardin», solo en el mapa.
  await buscar(p).fill("teatro");
  await p.getByRole("option", { name: /Polivalente/ }).waitFor();
  assert.deepEqual(await opciones(p), [
    { nombre: "Teatro de la Paz", detalle: "Lugar del directorio · Villerías 205" },
    { nombre: "Teatro Polivalente", detalle: "Del mapa · Calle Reforma 5, Centro, San Luis Potosí, México" },
  ]);
  await foto(p, "donde-2-lista");
  await buscar(p).fill("jardin");
  await p.getByRole("option", { name: /Jardín de San Juan de Dios/ }).waitFor();
  assert.deepEqual(await opciones(p), [{ nombre: "Jardín de San Juan de Dios", detalle: "Del mapa · Calle Madero 1, Centro Histórico, San Luis Potosí, México" }]);
  await buscar(p).fill("galeana");
  await p.getByRole("option", { name: /Galeana 423/ }).waitFor();
});

test("la búsqueda en el mapa espera a que se deje de escribir (una sola consulta) y no empieza con menos de 3 letras", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaDonde(p);
  await buscar(p).pressSequentially("jar", { delay: 40 });
  await buscar(p).pressSequentially("din", { delay: 40 });
  await p.getByRole("option", { name: /Jardín/ }).waitFor();
  assert.deepEqual(p.mapbox.sugerir, ["jardin"]);
  await buscar(p).fill("");
  await buscar(p).fill("te");
  await p.waitForTimeout(600);
  assert.deepEqual(p.mapbox.sugerir, ["jardin"]);
});

test("un lugar del directorio avanza directo a «¿Cuánto cuesta?»: ni mapa ni «No está en el directorio»", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaDonde(p);
  await elegirTeatro(p);
  assert.equal(await pregunta(p), "¿Cuánto cuesta?");
  assert.equal(await p.getByRole("region", { name: "Mapa de prueba" }).count(), 0);
  assert.deepEqual(p.mapbox.recuperar, []);
});

test("un resultado del mapa lleva a «¿Es aquí?»: el nombre en negrita, la dirección debajo, el pin que se arrastra y ninguna caja de texto", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaDonde(p);
  await elegirDelMapa(p, "jardin", /Jardín de San Juan de Dios/);
  await enPaso(p, "¿Es aquí?");
  assert.equal(await cajas(p), 0);
  const tarjeta = p.getByRole("status").filter({ hasText: "Jardín de San Juan de Dios" });
  assert.equal(await tarjeta.locator("b").innerText(), "Jardín de San Juan de Dios");
  assert.equal(await tarjeta.locator("small").innerText(), "Calle Madero 1, Centro Histórico, San Luis Potosí, México");
  await p.getByText("Si el pin no está en su sitio, arrástralo.").waitFor();
  assert.equal(await p.getByRole("region", { name: "Mapa de prueba" }).getAttribute("data-pin"), "22.1511,-100.9772");
  assert.equal(await boton(p, "Ponle nombre").count(), 0);
  await boton(p, "Buscar otro").waitFor();
  await foto(p, "mapa-1-nombre");
  // Arrastrar el pin pide otra vez la dirección del punto y la tarjeta la muestra; el nombre sigue siendo el del sitio.
  await boton(p, "Arrastrar el pin").click();
  await p.getByText("Av. Universidad 300, Lomas, San Luis Potosí, México").waitFor();
  assert.deepEqual(p.mapbox.inversa, ["22.1533"]);
  assert.equal(await tarjeta.locator("b").innerText(), "Jardín de San Juan de Dios");
  assert.equal(await p.getByRole("region", { name: "Mapa de prueba" }).getAttribute("data-pin"), "22.1533,-100.9811");
});

test("«Sí, es aquí» con un sitio del mapa lleva a «No está en el directorio» con tres opciones; «Solo en este evento» publica un sitio «otro» con el pin donde quedó", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaDonde(p);
  await elegirDelMapa(p, "jardin", /Jardín de San Juan de Dios/);
  await boton(p, "Arrastrar el pin").click();
  await p.getByText("Av. Universidad 300, Lomas, San Luis Potosí, México").waitFor();
  await boton(p, "Sí, es aquí").click();
  assert.equal(await pregunta(p), "No está en el directorio");
  const opcionesUso = await p.getByRole("group", { name: "Qué hacer con este sitio" }).getByRole("button").allInnerTexts();
  assert.equal(opcionesUso.length, 3);
  assert.match(opcionesUso[0], /Usarlo solo en este evento[\s\S]*Sale con su nombre y su punto en el mapa/);
  assert.match(opcionesUso[1], /Guardarlo como lugar[\s\S]*Tendrá su ficha y servirá para otros eventos/);
  assert.match(opcionesUso[2], /Es un sitio reservado[\s\S]*La dirección solo se muestra a quien va/);
  await foto(p, "uso-1-tres");
  await boton(p, /^Usarlo solo en este evento/).click();
  assert.equal(await pregunta(p), "¿Cuánto cuesta?");
  const d = await publicarGratis(p);
  assert.deepEqual(
    { modo_sitio: d.modo_sitio, lugar_id: d.lugar_id, sitio_texto: d.sitio_texto, sitio_direccion: d.sitio_direccion, sitio_lat: d.sitio_lat, sitio_lng: d.sitio_lng, sitio_pin_pendiente: d.sitio_pin_pendiente, direccion_privada: d.direccion_privada, ciudad: d.ciudad },
    { modo_sitio: "otro", lugar_id: "", sitio_texto: "Jardín de San Juan de Dios", sitio_direccion: "Av. Universidad 300, Lomas, San Luis Potosí, México", sitio_lat: "22.1533", sitio_lng: "-100.9811", sitio_pin_pendiente: "no", direccion_privada: "", ciudad: "San Luis Potosí" },
  );
});

test("una dirección sin nombre: la tarjeta la muestra como título, «Ponle nombre» abre UNA sola caja con ✕, y sin nombre propio no se ofrece «Guardarlo como lugar»", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaDonde(p);
  await elegirDelMapa(p, "galeana", /Galeana 423/);
  await enPaso(p, "¿Es aquí?");
  const tarjeta = p.getByRole("status").filter({ hasText: "Galeana 423" });
  assert.equal(await tarjeta.locator("b").innerText(), "Galeana 423, Centro, San Luis Potosí, México");
  assert.equal(await tarjeta.locator("small").count(), 0);
  assert.equal(await cajas(p), 0);
  await boton(p, "Ponle nombre").click();
  assert.equal(await cajas(p), 1);
  assert.equal(await boton(p, "Ponle nombre").count(), 0);
  const caja = p.getByLabel("Nombre del lugar");
  assert.equal(await p.evaluate(() => document.activeElement?.getAttribute("aria-label")), "Nombre del lugar");
  await caja.fill("Casa Galeana");
  await boton(p, "Borrar lo escrito").waitFor();
  // El título pasa a ser el nombre y la dirección queda debajo, en letra suave.
  assert.equal(await tarjeta.locator("b").innerText(), "Casa Galeana");
  assert.equal(await tarjeta.locator("small").innerText(), "Galeana 423, Centro, San Luis Potosí, México");
  await foto(p, "mapa-2-ponle-nombre");
  await boton(p, "Borrar lo escrito").click();
  assert.equal(await tarjeta.locator("b").innerText(), "Galeana 423, Centro, San Luis Potosí, México");
  // Sin nombre: «No está en el directorio» solo trae dos opciones (una dirección no nombra un lugar).
  await boton(p, "Sí, es aquí").click();
  assert.equal(await p.getByRole("group", { name: "Qué hacer con este sitio" }).getByRole("button").count(), 2);
  assert.equal(await boton(p, /^Guardarlo como lugar/).count(), 0);
  // Con nombre, las tres.
  await boton(p, "Atrás").click();
  await boton(p, "Ponle nombre").click();
  await p.getByLabel("Nombre del lugar").fill("Casa Galeana");
  await boton(p, "Sí, es aquí").click();
  assert.equal(await p.getByRole("group", { name: "Qué hacer con este sitio" }).getByRole("button").count(), 3);
  // Atrás desde «No está en el directorio» vuelve al mapa con el nombre ya puesto: la tarjeta lo dice y no pide nada más.
  await boton(p, "Atrás").click();
  assert.equal(await tarjeta.locator("b").innerText(), "Casa Galeana");
  assert.equal(await boton(p, "Ponle nombre").count(), 0);
});

test("un bar, café o restaurante según el mapa también ofrece «Guardarlo como lugar» (los negocios entran al directorio, OL-315) y se guarda con lo que dice el mapa", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaDonde(p);
  await elegirDelMapa(p, "cantina", /La Cantina/);
  await boton(p, "Sí, es aquí").click();
  const grupo = p.getByRole("group", { name: "Qué hacer con este sitio" });
  const textos = await grupo.getByRole("button").allInnerTexts();
  assert.equal(textos.length, 3);
  assert.match(textos[0], /^Usarlo solo en este evento/);
  assert.match(textos[1], /^Guardarlo como lugar/);
  assert.match(textos[2], /^Es un sitio reservado/);
  await boton(p, /^Guardarlo como lugar/).click();
  await enPaso(p, "¿Cuánto cuesta?");
  assert.deepEqual((await p.evaluate(() => window.qa.lugares))[0].categorias, ["bar"]);
});

test("«Guardarlo como lugar» crea el lugar con lo del sitio, y «Revisa» lo muestra por su nombre; se publica por su id, no como «otro»", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaDonde(p);
  await elegirDelMapa(p, "jardin", /Jardín de San Juan de Dios/);
  await boton(p, "Sí, es aquí").click();
  await boton(p, /^Guardarlo como lugar/).click();
  await enPaso(p, "¿Cuánto cuesta?");
  const llamadas = await p.evaluate(() => window.qa.lugares);
  assert.deepEqual(llamadas, [{ nombre: "Jardín de San Juan de Dios", direccion: "Calle Madero 1, Centro Histórico, San Luis Potosí, México", lat: 22.1511, lng: -100.9772, ciudad: "San Luis Potosí", volverA: "/nuevo/evento", privado: false, categorias: ["park"] }]);
  const d = await publicarGratis(p);
  assert.deepEqual({ modo_sitio: d.modo_sitio, lugar_id: d.lugar_id, sitio_texto: d.sitio_texto, sitio_lat: d.sitio_lat, ciudad: d.ciudad }, { modo_sitio: "lugar", lugar_id: "0b0b0b0b-0000-4000-8000-0000000000aa", sitio_texto: "", sitio_lat: "", ciudad: "" });
  await p.locator("main ul > li").filter({ hasText: "Jardín de San Juan de Dios" }).waitFor();
  // «Cambiar» lo encuentra en la lista: el campo abre con su nombre y el directorio de la prueba ya lo trae.
  await boton(p, "Cambiar dónde").click();
  assert.equal(await buscar(p).inputValue(), "Jardín de San Juan de Dios");
  await p.getByRole("option", { name: /Lugar del directorio · Calle Madero 1/ }).waitFor();
});

test("«Guardarlo como lugar» con un lugar que ya existía usa ese lugar", TOPE, async (t) => {
  const p = await pagina(t);
  await p.evaluate(() => (window.qa.lugar = "existe"));
  await hastaDonde(p);
  await elegirDelMapa(p, "jardin", /Jardín de San Juan de Dios/);
  await boton(p, "Sí, es aquí").click();
  await boton(p, /^Guardarlo como lugar/).click();
  await enPaso(p, "¿Cuánto cuesta?");
  const d = await publicarGratis(p);
  assert.deepEqual({ modo_sitio: d.modo_sitio, lugar_id: d.lugar_id }, { modo_sitio: "lugar", lugar_id: LUGAR });
  await p.locator("main ul > li").filter({ hasText: "Teatro de la Paz" }).waitFor();
});

test("mientras se guarda el lugar la opción dice «Guardando…» y las demás se apagan", TOPE, async (t) => {
  const p = await pagina(t);
  await p.evaluate(() => (window.qa.lugar = "lento"));
  await hastaDonde(p);
  await elegirDelMapa(p, "jardin", /Jardín de San Juan de Dios/);
  await boton(p, "Sí, es aquí").click();
  await boton(p, /^Guardarlo como lugar/).click();
  const guardando = boton(p, /^Guardando…/);
  await guardando.waitFor();
  assert.equal(await guardando.isDisabled(), true);
  assert.equal(await boton(p, /^Usarlo solo en este evento/).isDisabled(), true);
  assert.equal(await boton(p, /^Es un sitio reservado/).isDisabled(), true);
  assert.equal(await pregunta(p), "No está en el directorio");
  await foto(p, "uso-3-guardando");
});

test("si no se pudo guardar el lugar (la acción responde que no, o se cae la red) sale un aviso llano y las opciones siguen tocables", TOPE, async (t) => {
  for (const falla of ["falla", "lanza"]) {
    const p = await pagina(t);
    await p.evaluate((f) => (window.qa.lugar = f), falla);
    await hastaDonde(p);
    await elegirDelMapa(p, "jardin", /Jardín de San Juan de Dios/);
    await boton(p, "Sí, es aquí").click();
    await boton(p, /^Guardarlo como lugar/).click();
    const aviso = p.getByRole("alert").filter({ hasText: "No se pudo guardar el lugar. Puedes usarlo solo en este evento." });
    await aviso.waitFor();
    assert.equal(await pregunta(p), "No está en el directorio");
    assert.equal(await boton(p, /^Guardarlo como lugar/).isDisabled(), false);
    assert.equal(await boton(p, /^Usarlo solo en este evento/).isDisabled(), false);
    if (falla === "falla") await foto(p, "uso-4-no-se-guardo");
    // Sigue pudiendo usarlo solo en este evento.
    await boton(p, /^Usarlo solo en este evento/).click();
    assert.equal(await aviso.count(), 0);
    const d = await publicarGratis(p);
    assert.deepEqual({ modo_sitio: d.modo_sitio, sitio_texto: d.sitio_texto }, { modo_sitio: "otro", sitio_texto: "Jardín de San Juan de Dios" });
  }
});

test("un sitio reservado: «Revisa» dice su nombre y «Sitio reservado», y la acción recibe la dirección y el punto como privados", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaDonde(p);
  await elegirDelMapa(p, "jardin", /Jardín de San Juan de Dios/);
  await boton(p, "Sí, es aquí").click();
  await boton(p, /^Es un sitio reservado/).click();
  await boton(p, /^Gratis/).click();
  const renglon = p.locator("main ul > li").filter({ hasText: "Jardín de San Juan de Dios" });
  await renglon.waitFor();
  assert.equal(await renglon.locator("b > small").innerText(), "Sitio reservado");
  await foto(p, "revisa-1-reservado");
  await boton(p, "Publicar").click();
  await p.waitForFunction(() => window.qa.envios.length === 1);
  const d = await enviado(p);
  assert.deepEqual(
    { modo_sitio: d.modo_sitio, sitio_texto: d.sitio_texto, sitio_direccion: d.sitio_direccion, sitio_lat: d.sitio_lat, direccion_privada: d.direccion_privada, privado_lat: d.privado_lat, privado_lng: d.privado_lng, revelar_horas: d.revelar_horas },
    { modo_sitio: "reservado", sitio_texto: "Jardín de San Juan de Dios", sitio_direccion: "", sitio_lat: "", direccion_privada: "Calle Madero 1, Centro Histórico, San Luis Potosí, México", privado_lat: "22.1511", privado_lng: "-100.9772", revelar_horas: "24" },
  );
});

test("«Estoy aquí» con un lugar del directorio a menos de 50 m: la tarjeta lo ofrece como título y confirmar lo usa", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaDonde(p);
  await boton(p, /^Estoy aquí/).click();
  await enPaso(p, "¿Es aquí?");
  const tarjeta = p.getByRole("status").filter({ hasText: "Teatro de la Paz" });
  assert.equal(await tarjeta.locator("b").innerText(), "Teatro de la Paz");
  assert.equal(await tarjeta.locator("small").innerText(), "A 44 m de ti · lugar del directorio");
  assert.equal(await boton(p, "Ponle nombre").count(), 0);
  assert.equal(await cajas(p), 0);
  await foto(p, "mapa-3-estoy-aqui");
  await boton(p, "Sí, es aquí").click();
  assert.equal(await pregunta(p), "¿Cuánto cuesta?");
  const d = await publicarGratis(p);
  assert.deepEqual({ modo_sitio: d.modo_sitio, lugar_id: d.lugar_id }, { modo_sitio: "lugar", lugar_id: LUGAR });
});

test("«Estoy aquí» lejos de todo: la tarjeta dice la dirección del punto, «Buscar otro» vuelve al campo y Atrás conserva lo escrito", TOPE, async (t) => {
  const p = await pagina(t, { geolocation: { latitude: 22.16, longitude: -100.99 } });
  await hastaDonde(p);
  await boton(p, /^Estoy aquí/).click();
  await enPaso(p, "¿Es aquí?");
  const tarjeta = p.getByRole("status").filter({ hasText: "Av. Carranza 100" });
  assert.equal(await tarjeta.locator("b").innerText(), "Av. Carranza 100, Centro, San Luis Potosí, México");
  await boton(p, "Ponle nombre").waitFor();
  await boton(p, "Buscar otro").click();
  assert.equal(await pregunta(p), "¿Dónde es?");
  await boton(p, /^Estoy aquí/).waitFor();
  await elegirDelMapa(p, "jardin", /Jardín/);
  await boton(p, "Atrás").click();
  assert.equal(await buscar(p).inputValue(), "jardin");
  await p.getByRole("option", { name: /Jardín/ }).waitFor();
});

test("«Cambiar» el lugar en «Revisa» vuelve a «¿Dónde es?» con el sitio puesto, y elegir otro del mapa regresa a «Revisa» con el nuevo", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaRevisa(p);
  await boton(p, "Cambiar dónde").click();
  assert.equal(await pregunta(p), "¿Dónde es?");
  assert.equal(await buscar(p).inputValue(), "Teatro de la Paz");
  await buscar(p).fill("jardin");
  await p.getByRole("option", { name: /Jardín/ }).click();
  await boton(p, "Sí, es aquí").click();
  await boton(p, /^Usarlo solo en este evento/).click();
  await p.locator("main ul > li").filter({ hasText: "Jardín de San Juan de Dios" }).waitFor();
  assert.equal(await p.getByRole("heading", { name: "Lectura en voz alta" }).count(), 1);
});

test("sin desbordes a 320 y a 390 en los tres pasos de «Dónde» y en «Revisa» con un sitio reservado", TOPE, async (t) => {
  for (const ancho of [320, 390]) {
    const p = await pagina(t, { ancho });
    const desborda = () =>
      p.evaluate(() => {
        const w = document.documentElement.clientWidth;
        const fuera = [...document.querySelectorAll("body *")]
          .filter((e) => {
            const r = e.getBoundingClientRect();
            return r.width > 0 && (r.right > w + 0.5 || r.left < -0.5);
          })
          .map((e) => `${e.tagName}.${e.className || e.getAttribute("aria-label") || ""}`);
        return { scroll: document.documentElement.scrollWidth - w, fuera };
      });
    await hastaDonde(p);
    await buscar(p).fill("galeana");
    await p.getByRole("option", { name: /Galeana 423/ }).waitFor();
    assert.deepEqual(await desborda(), { scroll: 0, fuera: [] }, `lista a ${ancho}`);
    if (ancho === 320) await foto(p, "320-lista");
    await p.getByRole("option", { name: /Galeana 423/ }).click();
    await boton(p, "Ponle nombre").click();
    await p.getByLabel("Nombre del lugar").fill("Un nombre de lugar bastante largo para ver cómo se parte en una pantalla angosta");
    assert.deepEqual(await desborda(), { scroll: 0, fuera: [] }, `mapa a ${ancho}`);
    if (ancho === 320) await foto(p, "320-mapa");
    await boton(p, "Sí, es aquí").click();
    assert.deepEqual(await desborda(), { scroll: 0, fuera: [] }, `uso a ${ancho}`);
    if (ancho === 320) await foto(p, "320-uso");
    await boton(p, /^Es un sitio reservado/).click();
    await boton(p, /^Gratis/).click();
    await p.locator("main ul > li").first().waitFor();
    assert.deepEqual(await desborda(), { scroll: 0, fuera: [] }, `revisa a ${ancho}`);
    if (ancho === 320) await foto(p, "320-revisa");
  }
});

/** Los hijos directos de `main`, lo más hondo que llega el contenido (sin el `path` de los iconos) y cuántos nodos tiene el paso: la tabla de la bitácora. */
const niveles = (p) =>
  p.evaluate(() => {
    const main = document.querySelector("main");
    let hondo = 0;
    let nodos = 0;
    const recorrer = (e, nivel) => {
      if (e instanceof SVGElement && e.tagName.toLowerCase() !== "svg") return;
      nodos++;
      hondo = Math.max(hondo, nivel);
      for (const c of e.children) recorrer(c, nivel + 1);
    };
    for (const c of main.children) recorrer(c, 1);
    return { hijos: [...main.children].map((e) => e.tagName.toLowerCase()), hondo, nodos: nodos + 1 };
  });

test("niveles del DOM bajo `main` en los tres pasos de «Dónde» (el DOM llano del armazón: no se hunde)", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaDonde(p);
  const donde = await niveles(p);
  await elegirDelMapa(p, "jardin", /Jardín de San Juan de Dios/);
  await enPaso(p, "¿Es aquí?");
  const mapa = await niveles(p);
  await boton(p, "Sí, es aquí").click();
  await enPaso(p, "No está en el directorio");
  const uso = await niveles(p);
  assert.deepEqual(donde.hijos, ["header", "h2", "label", "button", "form"]);
  assert.deepEqual(mapa.hijos, ["header", "h2", "div", "div", "small", "footer", "form"]);
  assert.deepEqual(uso.hijos, ["header", "h2", "div", "form"]);
  for (const paso of [donde, mapa, uso]) assert.ok(paso.hondo <= 6, `hondo ${paso.hondo}`);
});

/* ---- «Publicado» (OL-304, bitácora 332) ---- */

/** Publica el recorrido corto con el servidor simulado contestando como `crearEvento` con `quedarse`, y espera la pantalla final. */
async function publicarYQuedarse(p) {
  await p.evaluate(() => (window.qa.resultado = "publica"));
  await boton(p, "Publicar").click();
  await p.getByRole("heading", { name: "Evento publicado" }).waitFor();
}
const tarjeta = (p) => p.locator("main ul > li a");

test("publicar no sale de la pantalla: «Evento publicado» con la tarjeta como quedó, «Compartir» y «Publicar otro», sin «Descargar el cartel» porque no hay cartel", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaRevisa(p);
  await publicarYQuedarse(p);
  // La acción recibió los campos de siempre; ya no hace falta la señal de quedarse (OL-312: `crearEvento` siempre devuelve lo creado).
  const d = await enviado(p);
  assert.equal("quedarse" in d, false);
  assert.equal(d.titulo, "Lectura en voz alta");
  assert.equal(await pregunta(p), "Evento publicado");
  await p.getByText("Ya está en la agenda. Así lo ve la gente:").waitFor();
  // La tarjeta es el renglón de las listas con lo publicado, y abre la ficha por su dirección (el slug que devolvió el servidor).
  assert.equal(await tarjeta(p).getAttribute("href"), "/eventos/lectura-en-voz-alta-ab11");
  const texto = await tarjeta(p).innerText();
  assert.match(texto, /Lectura en voz alta/);
  assert.match(texto, /vie 9 de oct · 19:00/);
  assert.match(texto, /Teatro de la Paz/);
  // Pie: Compartir, «Publicar otro» y nada de descargar (no hay cartel).
  await boton(p, "Compartir").waitFor();
  await boton(p, "Publicar otro").waitFor();
  assert.equal(await p.getByRole("link", { name: /Descargar el cartel/ }).count(), 0);
  // El foco va al encabezado; la línea de avance está completa; no hay Atrás, solo la ✕.
  assert.equal(await p.evaluate(() => document.activeElement?.textContent), "Evento publicado");
  assert.equal(await p.locator("header").evaluate((e) => e.style.getPropertyValue("--avance")), "1");
  assert.equal(await boton(p, "Atrás").count(), 0);
  await p.getByRole("link", { name: "Cerrar (Volver)" }).waitFor();
  await foto(p, "332-01-publicado-sin-cartel");
  // La guardia ya no pregunta: ni al recargar, ni con la ✕.
  assert.equal(await avisa(p), false);
  await p.getByRole("link", { name: "Cerrar (Volver)" }).click();
  assert.equal(await p.evaluate(() => window.qa.salio), 1);
  assert.equal(await p.getByText("¿Salir sin publicar?").count(), 0);
});

test("«Compartir» manda el mismo texto y la misma dirección que la ficha: título, cuándo y dónde, y el enlace aparte", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaRevisa(p);
  await publicarYQuedarse(p);
  await boton(p, "Compartir").click();
  await p.waitForFunction(() => window.compartidos.length === 1);
  const [c] = await p.evaluate(() => window.compartidos);
  assert.equal(c.titulo, "Lectura en voz alta");
  assert.equal(c.url, "https://somosnosotros.org/eventos/lectura-en-voz-alta-ab11");
  assert.match(c.texto, /^Lectura en voz alta\nvie 9 de oct · 19:00–21:00 · Teatro de la Paz$/);
});

/** El aviso flotante de confirmación (OL-318, `ui/Confirmacion`): un `status` con ese texto (el botón dice lo mismo en su letrero, por eso no se busca por texto suelto). */
const avisoDe = (p, texto) => p.getByRole("status").filter({ hasText: texto });
/** Con `CAPTURAS`: la secuencia del aviso, sin reloj falso (corre en tiempo real). Se llama en cuanto sale el aviso: saca el aviso asentado (la foto de `foto` espera 450 ms: la entrada, de 200 ms, ya terminó);
 *  devuelve lo que saca la segunda, a punto de irse (~1,8 s de los 2,5 s), para llamarlo al final de la prueba. La entrada a medio camino se ve en la escena de la ficha (`BotonDescargarCartel.componentes.test.mjs`). Sin `CAPTURAS` no hace nada. */
const secuenciaDelAviso = async (p, nombre) => {
  if (!capturas) return async () => {};
  const t0 = Date.now();
  await foto(p, `${nombre}-1-asentado`);
  return async () => {
    await p.waitForTimeout(Math.max(0, 1750 - (Date.now() - t0)));
    await p.screenshot({ path: join(capturas, `${nombre}-2-a-punto-de-irse.png`) });
  };
};

test("con cartel: la tarjeta lleva su miniatura y «Descargar el cartel» descarga el archivo (sin hoja de compartir), avisa «Cartel descargado» y no vuelve a descargar con toques repetidos", TOPE, async (t) => {
  const p = await pagina(t, { qa: { lectura: LEIDO } });
  await subir(p);
  await p.getByText("Leído del cartel").waitFor();
  await p.evaluate(() => (window.qa.resultado = "publica"));
  await boton(p, "Publicar").click();
  await p.getByRole("heading", { name: "Evento publicado" }).waitFor();
  assert.equal((await enviado(p)).imagen, "/cartel.svg");
  const miniatura = tarjeta(p).locator("img");
  assert.equal(await miniatura.getAttribute("src"), "/cartel.svg");
  assert.equal(await miniatura.evaluate((e) => e.naturalWidth > 0), true);
  assert.match(await tarjeta(p).innerText(), /jue 5 de nov · 19:00/);
  const descargar = p.getByRole("link", { name: "Descargar el cartel" });
  // Con la versión de su imagen (OL-338): un cartel nuevo no baja el anterior guardado.
  assert.match(await descargar.getAttribute("href"), /^\/api\/cartel\/0e0e0e0e-0000-4000-8000-000000000001\?v=[0-9a-f]{8}$/);
  await foto(p, "344-02-publicado-web-descargar-el-cartel");
  let archivos = 0;
  p.on("download", () => archivos++);
  const [archivo] = await Promise.all([p.waitForEvent("download"), descargar.click()]);
  await avisoDe(p, "Cartel descargado").waitFor();
  const cierre = await secuenciaDelAviso(p, "347-02-publicado-web");
  assert.equal(archivo.suggestedFilename(), "cartel-prueba.png");
  // El botón confirma también en sí mismo (palomita) y no responde a más toques mientras avisa: tres toques seguidos no bajan otro archivo.
  const listo = p.getByRole("link", { name: "Cartel descargado" });
  assert.equal(await listo.getAttribute("aria-disabled"), "true");
  for (let i = 0; i < 3; i++) await listo.click({ force: true });
  await p.waitForTimeout(300);
  assert.equal(archivos, 1);
  // Descargar no es compartir: la hoja del sistema no se abrió.
  assert.deepEqual(await p.evaluate(() => window.compartidos), []);
  await cierre();
});

test("en la app de iPhone (con el plugin de Fotos), «Publicado» ofrece «Guardar en Fotos» y un toque manda el cartel a Fotos, sin hoja ni descarga; avisa «Cartel guardado en Fotos» y los toques repetidos no guardan otra vez (OL-317, OL-318)", TOPE, async (t) => {
  const p = await pagina(t, { qa: { lectura: LEIDO }, fotos: true });
  await subir(p);
  await p.getByText("Leído del cartel").waitFor();
  await p.evaluate(() => (window.qa.resultado = "publica"));
  await boton(p, "Publicar").click();
  await p.getByRole("heading", { name: "Evento publicado" }).waitFor();
  const guardar = p.getByRole("link", { name: "Guardar en Fotos" });
  assert.equal(await p.getByRole("link", { name: "Descargar el cartel" }).count(), 0);
  await foto(p, "344-04-publicado-app-guardar-en-fotos");
  let descargas = 0;
  p.on("download", () => descargas++);
  await guardar.click();
  await avisoDe(p, "Cartel guardado en Fotos").waitFor();
  const cierre = await secuenciaDelAviso(p, "347-04-publicado-app");
  const listo = p.getByRole("link", { name: "Guardado en Fotos" });
  for (let i = 0; i < 3; i++) await listo.click({ force: true });
  await p.waitForTimeout(300);
  assert.deepEqual(await p.evaluate(() => window.guardadasEnFotos), [{ tipo: "image/png", bytes: PNG.length }]);
  assert.deepEqual(await p.evaluate(() => window.compartidos), []);
  assert.equal(descargas, 0);
  await cierre();
});

test("«Publicar otro» empieza de cero: el primer paso, nada escrito, otra clave de operación y la guardia armada de nuevo", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaRevisa(p);
  await publicarYQuedarse(p);
  const primera = (await enviado(p)).operacion;
  await boton(p, "Publicar otro").click();
  // El primer paso, con su recuadro y «No tengo cartel»; la ✕ de la barra, sin Atrás.
  await p.getByText("Será la portada del evento").waitFor();
  assert.equal(await boton(p, "Atrás").count(), 0);
  assert.equal(await p.locator("header").evaluate((e) => e.style.getPropertyValue("--avance")), "0");
  // Nada escrito (nada avisa) y, en cuanto se escribe algo, la guardia vuelve a preguntar.
  await boton(p, "No tengo cartel").click();
  assert.equal(await p.getByLabel("Nombre del evento").inputValue(), "");
  assert.equal(await avisa(p), false);
  await p.getByLabel("Nombre del evento").fill("Segundo evento");
  assert.equal(await avisa(p), true);
  assert.equal(await p.evaluate(() => window.qa.pedirSalida(() => window.qa.salio++)), true);
  await p.getByText("¿Salir sin publicar?").waitFor();
  await boton(p, "Seguir editando").click();
  // Se publica otro y el servidor no lo toma por el primero.
  await boton(p, "Siguiente").click();
  await boton(p, /^Este viernes/).click();
  await p.getByRole("group", { name: "Empieza" }).getByRole("button", { name: /^8:00/ }).click();
  await p.getByRole("group", { name: "¿Cuánto dura?" }).getByRole("button", { name: "Sin hora de fin" }).click();
  await elegirTeatro(p);
  await boton(p, /^Gratis/).click();
  await p.getByRole("heading", { name: "Segundo evento" }).waitFor();
  await publicarYQuedarse(p);
  const segunda = await enviado(p);
  assert.equal(segunda.titulo, "Segundo evento");
  assert.notEqual(segunda.operacion, primera);
  assert.equal(await tarjeta(p).getAttribute("href"), "/eventos/lectura-en-voz-alta-ab12");
  assert.match(await tarjeta(p).innerText(), /Segundo evento/);
});

test("un lugar guardado desde «No está en el directorio» sigue en la lista al publicar otro evento", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaDonde(p);
  await elegirDelMapa(p, "jardin", /Jardín de San Juan de Dios/);
  await boton(p, "Sí, es aquí").click();
  await boton(p, /^Guardarlo como lugar/).click();
  await boton(p, /^Gratis/).click();
  await p.getByRole("heading", { name: "Lectura en voz alta" }).waitFor();
  await publicarYQuedarse(p);
  await boton(p, "Publicar otro").click();
  await boton(p, "No tengo cartel").click();
  await p.getByLabel("Nombre del evento").fill("Otro");
  await boton(p, "Siguiente").click();
  await boton(p, /^Este viernes/).click();
  await p.getByRole("group", { name: "Empieza" }).getByRole("button", { name: /^7:00/ }).click();
  await p.getByRole("group", { name: "¿Cuánto dura?" }).getByRole("button", { name: "2 horas" }).click();
  await buscar(p).fill("jardin");
  // Ya es del directorio (con su nombre), no un resultado del mapa.
  await p.getByRole("option", { name: /Jardín de San Juan de Dios/ }).first().waitFor();
  const lista = await opciones(p);
  assert.equal(lista[0].nombre, "Jardín de San Juan de Dios");
  assert.doesNotMatch(lista[0].detalle ?? "", /Del mapa/);
});

test("«Evento publicado» entra con el sello que crece, y con «reducir movimiento» no se anima", TOPE, async (t) => {
  // Solo las animaciones de CSS con nombre (las transiciones de color de un botón no cuentan).
  const animaciones = (p) => p.evaluate(() => document.getAnimations().map((a) => a.animationName ?? "").filter(Boolean));
  const con = await pagina(t, { movimiento: "no-preference" });
  await hastaRevisa(con);
  await publicarYQuedarse(con);
  assert.equal(await con.locator("main").getAttribute("data-direccion"), "entra");
  assert.ok((await animaciones(con)).some((n) => /sella/.test(n)));
  assert.ok((await animaciones(con)).some((n) => /entra/.test(n)));
  const sin = await pagina(t);
  await hastaRevisa(sin);
  await publicarYQuedarse(sin);
  assert.deepEqual(await animaciones(sin), []);
});

test("un error al publicar no cambia nada: «Revisa» con su aviso, y no se llega a «Publicado»", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaRevisa(p);
  await boton(p, "Publicar").click();
  await p.getByText(GENERAL, { exact: true }).waitFor();
  assert.equal(await p.getByRole("heading", { name: "Evento publicado" }).count(), 0);
  assert.equal(await avisa(p), true);
});

test("sin desbordes a 320 y 390 en «Publicado», sin cartel y con cartel y un título largo; el pie va pegado abajo y sin toques menores de 44", TOPE, async (t) => {
  const LARGO = "Noche internacional de música de cámara y poesía en voz alta del barrio de San Miguelito";
  for (const ancho of [320, 390]) {
    for (const conCartel of [false, true]) {
      const p = await pagina(t, { ancho, qa: conCartel ? { lectura: { ...LEIDO, valores: { ...LEIDO.valores, titulo: LARGO } } } : {} });
      if (conCartel) {
        await subir(p);
        await p.getByText("Leído del cartel").waitFor();
        await p.evaluate(() => (window.qa.resultado = "publica"));
        await boton(p, "Publicar").click();
        await p.getByRole("heading", { name: "Evento publicado" }).waitFor();
      } else {
        await hastaRevisa(p);
        await publicarYQuedarse(p);
      }
      assert.deepEqual(await desborda(p), { scroll: 0, fuera: [] }, `a ${ancho} ${conCartel ? "con" : "sin"} cartel`);
      const medidas = await p.evaluate(() => {
        const pie = document.querySelector("main footer").getBoundingClientRect();
        const chicos = [...document.querySelectorAll("main footer a, main footer button")].filter((e) => e.getBoundingClientRect().height < 44).map((e) => e.textContent);
        return { pieAbajo: Math.round(window.innerHeight - pie.bottom), chicos };
      });
      assert.deepEqual(medidas, { pieAbajo: 0, chicos: [] }, `pie a ${ancho}`);
      if (ancho === 320) await foto(p, `332-04-publicado-320-${conCartel ? "con" : "sin"}-cartel`);
    }
  }
});

/* ---------- OL-312 (bitácora 340): el alta por pasos es la única, y se entra con lo que ya se sabe ---------- */

const ARTISTA = { id: "0a0a0a0a-0000-4000-8000-000000000009", nombre: "Lucía Montaño" };
/** El evento que se duplica, como lo lee la página (`select` de `eventos`) y con quién se presentó. */
const DUPLICADO = {
  evento: { titulo: "Ecos de papel", lugar_id: LUGAR, precio: "$150", descripcion: "Lectura en voz alta con música.", enlace: "https://ejemplo.org/ecos", sitio_texto: null, sitio_direccion: null, sitio_lat: null, sitio_lng: null, sitio_reservado: false, ciudad: "San Luis Potosí" },
  quien: [ARTISTA],
};
/** Hasta pasar la hora: 7:00 p.m. y dos horas. */
async function horaYDuracion(p) {
  await p.getByRole("group", { name: "Empieza" }).getByRole("button", { name: /^7:00/ }).click();
  await p.getByRole("group", { name: "¿Cuánto dura?" }).getByRole("button", { name: "2 horas" }).click();
}

test("«Publicar aquí» (`?lugar=`): «¿Dónde es?» no se pregunta, «Revisa» lleva el lugar y se publica por su id; en «Revisa» se cambia", TOPE, async (t) => {
  const p = await pagina(t, { qa: { abrir: { lugar: LUGAR, salida: `/lugares/${LUGAR}` } } });
  // La ✕ del primer paso vuelve a la ficha del lugar, y salir sin haber tocado nada no pregunta: el lugar es como se abrió.
  assert.equal(await p.getByRole("link", { name: "Cerrar (Volver)" }).getAttribute("href"), `/lugares/${LUGAR}`);
  assert.equal(await avisa(p), false);
  await hastaHora(p);
  await horaYDuracion(p);
  assert.equal(await pregunta(p), "¿Cuánto cuesta?");
  const d = await publicarGratis(p);
  assert.match((await renglones(p))[1], /Teatro de la Paz/);
  assert.deepEqual({ modo_sitio: d.modo_sitio, lugar_id: d.lugar_id, sitio_texto: d.sitio_texto }, { modo_sitio: "lugar", lugar_id: LUGAR, sitio_texto: "" });
  await boton(p, "Cambiar dónde").click();
  assert.equal(await pregunta(p), "¿Dónde es?");
  assert.equal(await buscar(p).inputValue(), "Teatro de la Paz");
});

test("«Publicar otro» tras entrar por un lugar empieza de cero: esta vez «¿Dónde es?» sí se pregunta", TOPE, async (t) => {
  const p = await pagina(t, { qa: { abrir: { lugar: LUGAR } } });
  await hastaHora(p);
  await horaYDuracion(p);
  await boton(p, /^Gratis/).click();
  await publicarYQuedarse(p);
  await boton(p, "Publicar otro").click();
  await hastaHora(p, "Otra lectura");
  await horaYDuracion(p);
  assert.equal(await pregunta(p), "¿Dónde es?");
});

test("«Publicar fecha» (`?artista=`): Quién empieza con el artista, «Revisa» lo enseña y se publica con su id", TOPE, async (t) => {
  const p = await pagina(t, { qa: { abrir: { artista: ARTISTA, salida: `/artistas/${ARTISTA.id}` } } });
  assert.equal(await p.getByRole("link", { name: "Cerrar (Volver)" }).getAttribute("href"), `/artistas/${ARTISTA.id}`);
  await hastaHora(p);
  await horaYDuracion(p);
  assert.equal(await pregunta(p), "¿Dónde es?");
  await elegirTeatro(p);
  const d = await publicarGratis(p);
  const filas = await renglones(p);
  assert.equal(filas.length, 4);
  assert.match(filas[3], /Lucía Montaño/);
  assert.deepEqual(JSON.parse(d.quien), [ARTISTA]);
});

test("lo que vino al abrir no lo pisa el cartel: con el lugar y el artista de las fichas, lo leído pone el día y la hora, no otro sitio ni otros artistas", TOPE, async (t) => {
  const otroCartel = { ...LEIDO, lugarId: OTRO_LUGAR, valores: { ...LEIDO.valores, lugar: "Centro de las Artes" }, quien: [{ nombre: "Trío Bruma" }] };
  const p = await pagina(t, { qa: { abrir: { lugar: LUGAR, artista: ARTISTA }, lectura: otroCartel } });
  await subir(p);
  await p.getByText("Leído del cartel").waitFor();
  const filas = await renglones(p);
  assert.match(filas[0], /jue 5 de nov · 19:00/);
  assert.match(filas[1], /Teatro de la Paz/);
  assert.match(filas[3], /Lucía Montaño/);
  assert.doesNotMatch(filas.join(" "), /Centro de las Artes|Trío Bruma/);
});

test("«Duplicar» (`?desde=`): entra en «¿Qué día es?» con el nombre, el lugar, el costo, quién, la descripción y el enlace del evento; sin cartel", TOPE, async (t) => {
  const p = await pagina(t, { qa: { abrir: { desde: DUPLICADO, salida: "/eventos/ecos-de-papel" } } });
  assert.equal(await pregunta(p), "¿Qué día es?");
  // Nada cambiado todavía: salir no pregunta. Atrás lleva al primer paso (para subir otro cartel); «No tengo cartel» vuelve aquí.
  assert.equal(await avisa(p), false);
  await boton(p, "Atrás").click();
  assert.equal(await p.getByRole("link", { name: "Cerrar (Volver)" }).getAttribute("href"), "/eventos/ecos-de-papel");
  await boton(p, "No tengo cartel").click();
  assert.equal(await pregunta(p), "¿Qué día es?");
  await boton(p, /^Este viernes/).click();
  await horaYDuracion(p);
  await p.getByRole("heading", { name: "Ecos de papel" }).waitFor();
  const filas = await renglones(p);
  assert.equal(filas.length, 4);
  assert.match(filas[0], /vie 9 de oct · 19:00–21:00/);
  assert.match(filas[1], /Teatro de la Paz/);
  assert.match(filas[2], /\$150/);
  assert.match(filas[3], /Lucía Montaño/);
  await boton(p, "Publicar").click();
  await p.waitForFunction(() => window.qa.envios.length === 1);
  const d = await enviado(p);
  assert.deepEqual(
    { titulo: d.titulo, inicio: d.inicio, fin: d.fin, modo_sitio: d.modo_sitio, lugar_id: d.lugar_id, gratis: d.gratis, cooperacion: d.cooperacion, precio: d.precio, quien: JSON.parse(d.quien), descripcion: d.descripcion, enlace: d.enlace, imagen: d.imagen },
    { titulo: "Ecos de papel", inicio: "2026-10-09T19:00", fin: "2026-10-09T21:00", modo_sitio: "lugar", lugar_id: LUGAR, gratis: "no", cooperacion: "no", precio: "150", quien: [ARTISTA], descripcion: "Lectura en voz alta con música.", enlace: "https://ejemplo.org/ecos", imagen: "" },
  );
});
