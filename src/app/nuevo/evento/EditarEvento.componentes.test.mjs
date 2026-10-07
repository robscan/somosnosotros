/** OL-319 (bitácora 348): editar un evento por pasos. Entra directo en «Revisa» con todo el evento puesto (`respuestasAlEditar`) y cada
 *  renglón abre la pregunta de siempre del alta, que vuelve a «Revisa»; «Guardar cambios», la guardia «¿Salir sin guardar?», el cartel
 *  (cambiarlo, quitarlo, leerlo solo si se pide), el horario por día y los errores del servidor (con el conflicto de versión). Armazón,
 *  guardia, pasos y hook del cartel reales; la acción es un doble que guarda lo que recibe (`window.qa.resultado` dice qué contesta), y de
 *  Storage, de la lectura del cartel y de la zona del punto solo se simula la respuesta. Mapbox lo simula `page.route`. Reloj fijo: miércoles
 *  7 de octubre de 2026 (el evento es el viernes 9).
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
const ARTISTA = { id: "0a0a0a0a-0000-4000-8000-000000000009", nombre: "Lucía Montaño" };
const REVISION = "2026-10-01T10:00:00.123456+00:00";
const FICHA = "/eventos/ecos-de-papel";
const CONFLICTO = "El evento cambió mientras lo editabas. Tus cambios siguen aquí, pero no se guardaron. Revisa la versión actual antes de volver a editar.";
const TOPE = { timeout: 30000 };
/** Con `CAPTURAS=<carpeta>` las pruebas guardan sus capturas a 390×844 (y a 320 la suya). */
const capturas = process.env.CAPTURAS;
const svg = (fondo, texto) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><rect width="400" height="500" fill="${fondo}"/><text x="200" y="260" fill="#fff" font-family="Arial" font-size="40" font-weight="800" text-anchor="middle">${texto}</text></svg>`;
/** El viernes 9 de octubre de 2026, de 19:00 a 21:00 en San Luis (UTC−6), en el Teatro de la Paz, $150, con su cartel. */
const EVENTO = {
  titulo: "Ecos de papel", inicio: "2026-10-10T01:00:00.000Z", fin: "2026-10-10T03:00:00.000Z", lugar_id: LUGAR, precio: "$150", descripcion: "Lectura en voz alta.", enlace: "https://ejemplo.org",
  imagen: "/cartel-viejo.svg", sitio_texto: null, sitio_direccion: null, sitio_lat: null, sitio_lng: null, sitio_reservado: false, sitio_revelar_desde: null, zona: "America/Mexico_City", ciudad: "San Luis Potosí",
};
/** Del viernes 9 al domingo 11, de 20:00 a 21:00, con el sábado de 18:00 a 21:00 (horario por día de OL-311). */
const TRES_DIAS = { ...EVENTO, inicio: "2026-10-10T02:00:00.000Z", fin: "2026-10-12T03:00:00.000Z" };
const SESIONES = [
  { inicio: "2026-10-10T02:00:00.000Z", fin: "2026-10-10T03:00:00.000Z" },
  { inicio: "2026-10-11T00:00:00.000Z", fin: "2026-10-11T03:00:00.000Z" },
  { inicio: "2026-10-12T02:00:00.000Z", fin: "2026-10-12T03:00:00.000Z" },
];
const LEIDO = { ok: true, valores: { titulo: "Ecos de papel: segunda función", inicio: "2026-10-16T19:00", fin: "", gratis: true, precio: "", descripcion: "", enlace: "", lugar: "", direccion: "" }, lugarId: null, quien: [], horaLeida: true, costoLeido: true };

let dir, server, browser, origin;
const atras = "import React from 'react';import {pedirSalida} from './src/lib/guardiaSalida';export function useVolver(){return (e)=>{e.preventDefault();const ir=()=>window.qa.salio++;if(!pedirSalida(ir))ir();}}export function useTerminar(){return (destino)=>{window.qa.terminado=destino}}export default function Atras(){return null}export function AtrasIcono(){return null}";
const mocks = {
  "@/app/eventos/acciones": `
    export async function leerCartelAccion(url){const q=window.qa;q.lecturas.push(url);return structuredClone(q.lectura)}
    export async function zonaDelPunto(){return 'America/Mexico_City'}
  `,
  "@/lib/subirFoto": "export async function subirFoto(carpeta,usuario,prefijo,archivo){window.qa.subidas.push(archivo.name);return window.qa.subida==='error'?{error:'No se pudo subir la imagen. Intenta con otra.',motivo:'subida'}:{url:'/cartel.svg'}}",
  "@/components/MapaDondeEs": "import React from 'react';export default function M(){return React.createElement('div',{role:'region','aria-label':'Mapa de prueba',style:{height:'100%',background:'var(--fondo-mapa)'}})}",
  "@/app/lugares/acciones": "export async function crearLugarDesdeEvento(){return {ok:false,error:'sin red'}}",
  "./Atras": atras,
  "@/components/ui/Atras": atras,
  "./Navegacion": "export const registrarVolverVisible=()=>()=>{}",
  "@/app/eventos/SelectorQuien": "export default function C(){return null}",
  "@/lib/useAvisosTelefono": "export function usePlataforma(){return null}",
  "./Logotipo": "export default function Logotipo(){return null}",
  "next/navigation": "export function useRouter(){return {replace:()=>{},back:()=>{},refresh:()=>{}}}",
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link({prefetch,replace,...p}){return React.createElement('a',p)}",
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "editar-por-pasos-"));
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
      import EditarEvento from './src/app/nuevo/evento/EditarEvento';
      import {respuestasAlEditar} from './src/app/nuevo/evento/alEditar';
      import './src/app/globals.css';
      // resultado: 'guarda' (vuelve a la ficha) | 'general' (falla el guardado) | 'conflicto' (el evento cambió mientras se editaba)
      window.qa = {envios:[], resultado:'guarda', salio:0, terminado:null, lecturas:[], subidas:[], lectura:null, subida:'ok', esAdmin:false, cartelActivo:true, cupo:{usadas:1,tope:6,sinTope:false}, evento:${JSON.stringify(EVENTO)}, privado:null, sesiones:null, quien:[${JSON.stringify(ARTISTA)}], ...window.qaInicial};
      async function accion(_, fd){
        window.qa.envios.push(Object.fromEntries(fd.entries()));
        if (window.qa.resultado === 'conflicto') return {ok:false, errores:{}, conflicto:true, general:${JSON.stringify(CONFLICTO)}};
        if (window.qa.resultado === 'general') return {ok:false, errores:{}, general:'No se pudo guardar el evento completo. ¿Sigues con sesión y es tu evento?'};
        return {ok:true, id:'0e0e0e0e-0000-4000-8000-000000000001', volver:'/eventos/0e0e0e0e-0000-4000-8000-000000000001'};
      }
      const lugares = [
        {id:'${LUGAR}', nombre:'Teatro de la Paz', tipo:'foro', direccion:'Villerías 205', lat:22.15, lng:-100.97, portada:null, zona:'America/Mexico_City', privado:false},
        {id:'${OTRO_LUGAR}', nombre:'Centro de las Artes', tipo:'casa_de_cultura', direccion:'Calz. de Guadalupe 705', lat:22.1417, lng:-101.0021, portada:null, zona:'America/Mexico_City', privado:false},
      ];
      const q = window.qa;
      const respuestas = respuestasAlEditar({ evento: q.evento, privado: q.privado, lugares, quien: q.quien, sesiones: q.sesiones, zona: 'America/Mexico_City' });
      createRoot(document.getElementById('root')).render(
        <EditarEvento accion={accion} respuestas={respuestas} imagen={q.evento.imagen} revision="${REVISION}" zonaEvento="America/Mexico_City" zonaSitio="America/Mexico_City" lugares={lugares} mios={[]} ciudadContexto={null} ficha="${FICHA}" usuarioId="usuaria-1" esAdmin={q.esAdmin} cartelActivo={q.cartelActivo} cupo={q.cupo} />
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
    ["/cartel-viejo.svg", ["image/svg+xml", svg("#2f4a6b", "ECOS")]],
    ["/cartel.svg", ["image/svg+xml", svg("#6b3a4a", "NUEVO")]],
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

const SITIOS = {
  jardin: { id: "m-jardin", name: "Jardín de San Juan de Dios", full_address: "Calle Madero 1, Centro Histórico, San Luis Potosí, México", feature_type: "poi", poi_category: ["park"], lat: 22.1511, lng: -100.9772 },
};
const CONTEXTO = { place: { name: "San Luis Potosí" }, country: { name: "México", country_code: "mx" } };

async function pagina(t, { ancho = 390, qa = {} } = {}) {
  const context = await browser.newContext({ viewport: { width: ancho, height: 844 }, reducedMotion: "reduce", timezoneId: "America/Mexico_City", deviceScaleFactor: capturas ? 2 : 1, locale: "es-MX" });
  t.after(() => context.close());
  await context.clock.setFixedTime(new Date("2026-10-07T16:00:00Z"));
  const p = await context.newPage();
  p.setDefaultTimeout(8000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  t.after(() => assert.deepEqual(errors, []));
  await p.addInitScript((inicial) => (window.qaInicial = inicial), qa);
  await p.route("**/*", (r) => (new URL(r.request().url()).origin === origin ? r.continue() : r.abort()));
  await p.route("https://api.mapbox.com/**", (r) => {
    const url = new URL(r.request().url());
    const json = (cuerpo) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(cuerpo) });
    if (url.pathname.endsWith("/suggest")) {
      const q = (url.searchParams.get("q") ?? "").toLowerCase();
      const sitio = Object.entries(SITIOS).find(([clave]) => q.includes(clave))?.[1];
      return json({ suggestions: sitio ? [{ mapbox_id: sitio.id, name: sitio.name, full_address: sitio.full_address, feature_type: sitio.feature_type, poi_category: sitio.poi_category, distance: 120, context: CONTEXTO }] : [] });
    }
    if (url.pathname.includes("/retrieve/")) {
      const sitio = SITIOS.jardin;
      return json({ features: [{ geometry: { coordinates: [sitio.lng, sitio.lat] }, properties: { name: sitio.name, full_address: sitio.full_address, poi_category: sitio.poi_category, context: CONTEXTO } }] });
    }
    return r.abort();
  });
  await p.goto(origin);
  await p.getByRole("heading", { name: "Editar evento" }).waitFor();
  return p;
}
const boton = (p, nombre) => p.getByRole("button", { name: nombre });
const pregunta = (p) => p.locator("main h2").first().textContent();
/** Los datos de «Revisa» sin los renglones de cómo ocurre (OL-321: «Evento · Cambiar» arriba y «Parte de un festival · Agregar»), que prueba `ClasesEvento`. */
const renglones = async (p) => (await p.locator("main ul > li").allInnerTexts()).filter((t) => !/^cómo ocurre\n|^festival\n/i.test(t));
const enviado = (p) => p.evaluate(() => window.qa.envios.at(-1));
const avisa = (p) => p.evaluate(() => !window.dispatchEvent(new Event("beforeunload", { cancelable: true })));
const casilla = (p) => p.getByRole("checkbox", { name: /Lectura automática/ });
const mismoHorario = (p) => p.getByRole("checkbox", { name: "Mismo horario todos los días" });
const cerrar = (p) => p.getByRole("link", { name: "Cerrar (Volver al evento)" });
const limpio = (texto) => texto.replace(/\s+/g, " ").replace(/ | /g, " ").replace(/p\.\s?m\./g, "p.m.");
async function guardar(p) {
  const antes = await p.evaluate(() => window.qa.envios.length);
  await boton(p, "Guardar cambios").click();
  await p.waitForFunction((n) => window.qa.envios.length > n, antes);
  return enviado(p);
}
const foto = async (p, nombre) => {
  if (!capturas) return;
  await p.mouse.move(0, 0);
  await p.screenshot({ path: join(capturas, `${nombre}.png`) });
};

test("entra directo en «Revisa» con todo el evento puesto; guardar sin tocar nada manda lo mismo que estaba y vuelve a la ficha", TOPE, async (t) => {
  const p = await pagina(t);
  // La barra dice «Editar evento», con la ✕ (no hay pasos detrás) y sin avance; el nombre como título y el cartel con «Cambiar».
  assert.equal(await p.locator("header h1").textContent(), "Editar evento");
  assert.equal(await boton(p, "Atrás").count(), 0);
  assert.ok(await cerrar(p).isVisible());
  assert.equal(await p.getByRole("heading", { name: "Ecos de papel" }).count(), 1);
  assert.equal(await p.locator("main img").first().getAttribute("src"), "/cartel-viejo.svg");
  assert.ok(await boton(p, "Cambiar cartel").isVisible());
  const filas = (await renglones(p)).map(limpio);
  assert.equal(filas.length, 4);
  assert.match(filas[0], /vie 9 de oct/);
  assert.match(filas[0], /19:00/);
  assert.match(filas[1], /Teatro de la Paz/);
  assert.match(filas[2], /\$150/);
  assert.match(filas[3], /Lucía Montaño/);
  assert.ok(await boton(p, "Cambiar artistas, descripción o enlace").isVisible());
  assert.equal(await boton(p, "Guardar cambios").isEnabled(), true);
  await foto(p, "01-revisa-al-entrar");
  const d = await guardar(p);
  assert.deepEqual(
    { titulo: d.titulo, inicio: d.inicio, fin: d.fin, modo: d.modo_sitio, lugar: d.lugar_id, gratis: d.gratis, precio: d.precio, quien: JSON.parse(d.quien), descripcion: d.descripcion, enlace: d.enlace, imagen: d.imagen, revision: d.revision, sesiones: d.sesiones },
    { titulo: "Ecos de papel", inicio: "2026-10-09T19:00", fin: "2026-10-09T21:00", modo: "lugar", lugar: LUGAR, gratis: "no", precio: "150", quien: [ARTISTA], descripcion: "Lectura en voz alta.", enlace: "https://ejemplo.org", imagen: "/cartel-viejo.svg", revision: REVISION, sesiones: undefined },
  );
  assert.match(d.operacion, /^[0-9a-f-]{36}$/);
  // Guardado: vuelve a la ficha (como el formulario de siempre) y la guardia no pregunta nada.
  await p.waitForFunction(() => window.qa.terminado);
  assert.equal(await p.evaluate(() => window.qa.terminado), "/eventos/0e0e0e0e-0000-4000-8000-000000000001");
  assert.equal(await avisa(p), false);
  assert.equal(await p.getByText("Publicado").count(), 0);
});

test("sin cambios la ✕ sale sin preguntar; con cambios pregunta «¿Salir sin guardar?» y deja seguir editando", TOPE, async (t) => {
  const p = await pagina(t);
  await cerrar(p).click();
  assert.equal(await p.evaluate(() => window.qa.salio), 1);
  assert.equal(await avisa(p), false);
  await boton(p, "Cambiar cuánto").click();
  assert.equal(await pregunta(p), "¿Cuánto cuesta?");
  await boton(p, /^Gratis/).click();
  assert.match((await renglones(p))[2], /Gratis/);
  assert.equal(await avisa(p), true);
  await cerrar(p).click();
  await p.getByText("¿Salir sin guardar?").waitFor();
  assert.ok(await p.getByText("Se pierden los cambios que hiciste.").isVisible());
  await foto(p, "02-salir-sin-guardar");
  await boton(p, "Seguir editando").click();
  assert.equal(await p.evaluate(() => window.qa.salio), 1);
  await cerrar(p).click();
  await boton(p, "Salir sin guardar").click();
  assert.equal(await p.evaluate(() => window.qa.salio), 2);
});

test("«Cambiar» el día y la hora: las preguntas del alta y de vuelta en «Revisa»; Atrás vuelve sin cambiar nada", TOPE, async (t) => {
  const p = await pagina(t);
  await boton(p, "Cambiar cuándo").click();
  assert.equal(await pregunta(p), "¿Qué día es?");
  assert.ok(await boton(p, "Atrás").isVisible());
  await boton(p, "Atrás").click();
  assert.equal(await p.getByRole("heading", { name: "Ecos de papel" }).count(), 1);
  assert.equal(await avisa(p), false);
  await boton(p, "Cambiar cuándo").click();
  await boton(p, /^Este sábado/).click();
  assert.equal(await pregunta(p), "¿A qué hora?");
  await p.getByRole("group", { name: "Empieza" }).getByRole("button", { name: /^8:00/ }).click();
  await p.getByRole("group", { name: "¿Cuánto dura?" }).getByRole("button", { name: "2 horas" }).click();
  assert.match(limpio((await renglones(p))[0]), /sáb 10 de oct/);
  const d = await guardar(p);
  assert.deepEqual({ inicio: d.inicio, fin: d.fin }, { inicio: "2026-10-10T20:00", fin: "2026-10-10T22:00" });
});

test("«Cambiar» el nombre: la pregunta del alta con el nombre de ahora, su ✕ y su contador; vuelve con el nuevo", TOPE, async (t) => {
  const p = await pagina(t);
  await boton(p, "Cambiar nombre").click();
  assert.equal(await pregunta(p), "¿Cómo se llama?");
  const nombre = p.getByLabel("Nombre del evento");
  assert.equal(await nombre.inputValue(), "Ecos de papel");
  assert.ok(await boton(p, "Borrar").isVisible());
  await nombre.fill("Ecos de papel: lectura en voz alta");
  await boton(p, "Siguiente").click();
  await p.getByRole("heading", { name: "Ecos de papel: lectura en voz alta" }).waitFor();
  assert.equal((await guardar(p)).titulo, "Ecos de papel: lectura en voz alta");
});

test("«Cambiar» el precio: el campo con el precio de ahora y su ✕; vuelve con el nuevo", TOPE, async (t) => {
  const p = await pagina(t);
  await boton(p, "Cambiar cuánto").click();
  await boton(p, /^Tiene precio/).click();
  const campo = p.getByLabel("Precio (solo números)");
  assert.equal(await campo.inputValue(), "150");
  assert.ok(await boton(p, "Borrar").isVisible());
  await campo.fill("200");
  await foto(p, "03-cambiar-precio");
  await boton(p, "Siguiente").click();
  assert.match((await renglones(p))[2], /\$200/);
  assert.equal((await guardar(p)).precio, "200");
});

test("«Cambiar» dónde: el sitio de ahora escrito; otro lugar del directorio, u otro sitio confirmado en el mapa", TOPE, async (t) => {
  // Se guarda dos veces: el doble contesta con un error (guardar bien deja la pantalla volviendo a la ficha, con «Guardando…»).
  const p = await pagina(t, { qa: { resultado: "general" } });
  await boton(p, "Cambiar dónde").click();
  assert.equal(await pregunta(p), "¿Dónde es?");
  const buscar = p.getByLabel("Buscar el lugar");
  assert.equal(await buscar.inputValue(), "Teatro de la Paz");
  await buscar.fill("centro");
  await p.getByRole("option", { name: /Centro de las Artes/ }).click();
  assert.match((await renglones(p))[1], /Centro de las Artes/);
  assert.equal((await guardar(p)).lugar_id, OTRO_LUGAR);
  // Otro sitio: el mapa, «Sí, es aquí» y «Usarlo solo en este evento».
  await boton(p, "Cambiar dónde").click();
  await p.getByLabel("Buscar el lugar").fill("jardin");
  await p.getByRole("option", { name: /Jardín de San Juan de Dios/ }).click();
  await p.locator("main h2").filter({ hasText: "¿Es aquí?" }).waitFor();
  await boton(p, "Sí, es aquí").click();
  await boton(p, /^Usarlo solo en este evento/).click();
  assert.match((await renglones(p))[1], /Jardín de San Juan de Dios/);
  const d = await guardar(p);
  assert.deepEqual({ modo: d.modo_sitio, lugar: d.lugar_id, sitio: d.sitio_texto, lat: d.sitio_lat }, { modo: "otro", lugar: "", sitio: "Jardín de San Juan de Dios", lat: "22.1511" });
});

test("otro sitio con su pin conserva la ciudad guardada (OL-299), aunque no sea la de San Luis Potosí; sin punto no inventa ninguna", TOPE, async (t) => {
  const evento = { ...EVENTO, lugar_id: null, sitio_texto: "Plaza de Armas", sitio_direccion: "Calle Prueba 1", sitio_lat: 20.6, sitio_lng: -100.4, ciudad: "Querétaro" };
  const p = await pagina(t, { qa: { evento } });
  assert.match((await renglones(p))[1], /Plaza de Armas/);
  const d = await guardar(p);
  assert.deepEqual({ modo: d.modo_sitio, ciudad: d.ciudad, lat: d.sitio_lat, direccion: d.sitio_direccion }, { modo: "otro", ciudad: "Querétaro", lat: "20.6", direccion: "Calle Prueba 1" });
});

test("un sitio reservado llega con su dirección exacta, sus indicaciones y cuándo se revela; guardar los conserva", TOPE, async (t) => {
  const evento = { ...EVENTO, lugar_id: null, sitio_texto: "Casa de Ana", sitio_reservado: true, sitio_revelar_desde: "2026-10-09T19:00:00.000Z" };
  const privado = { direccion: "Calle Privada 4", lat: 22.16, lng: -100.99, indicaciones: "Tocar el timbre", revelar_desde: evento.sitio_revelar_desde };
  const p = await pagina(t, { qa: { evento, privado } });
  const donde = limpio((await renglones(p))[1]);
  assert.match(donde, /Casa de Ana/);
  assert.match(donde, /Sitio reservado/);
  const d = await guardar(p);
  assert.deepEqual(
    { modo: d.modo_sitio, sitio: d.sitio_texto, privada: d.direccion_privada, lat: d.privado_lat, indicaciones: d.indicaciones, revelar: d.revelar_horas },
    { modo: "reservado", sitio: "Casa de Ana", privada: "Calle Privada 4", lat: "22.16", indicaciones: "Tocar el timbre", revelar: "6" },
  );
});

test("horario por día: llega con cada día; se cambia un día, se guardan las sesiones; volver a marcar la casilla no manda ninguna", TOPE, async (t) => {
  const p = await pagina(t, { qa: { evento: TRES_DIAS, sesiones: SESIONES, resultado: "general" } });
  assert.match(limpio((await renglones(p))[0]), /Del 9 al 11 de oct · horarios por día/);
  await boton(p, "Cambiar cuándo").click();
  assert.equal(await pregunta(p), "¿A qué hora, cada día?");
  assert.equal(await mismoHorario(p).getAttribute("aria-checked"), "false");
  const dias = (await renglones(p)).map(limpio);
  assert.match(dias[0], /^vie 9 de oct de 8:00 p\.m\. a 9:00 p\.m\./);
  assert.match(dias[1], /^sáb 10 de oct de 6:00 p\.m\. a 9:00 p\.m\./);
  assert.match(dias[2], /^dom 11 de oct de 8:00 p\.m\. a 9:00 p\.m\./);
  await foto(p, "04-horario-por-dia");
  await boton(p, "Cambiar dom 11 de oct").click();
  await p.getByRole("dialog").getByRole("group", { name: "Empieza" }).getByRole("button", { name: /^7:00/ }).click();
  await boton(p, "Listo").click();
  await boton(p, "Siguiente").click();
  assert.match(limpio((await renglones(p))[0]), /horarios por día/);
  const d = await guardar(p);
  assert.deepEqual({ inicio: d.inicio, fin: d.fin }, { inicio: "2026-10-09T20:00", fin: "2026-10-11T21:00" });
  assert.deepEqual(JSON.parse(d.sesiones), [
    { inicio: "2026-10-09T20:00", fin: "2026-10-09T21:00" },
    { inicio: "2026-10-10T18:00", fin: "2026-10-10T21:00" },
    { inicio: "2026-10-11T19:00", fin: "2026-10-11T21:00" },
  ]);
  // La casilla marcada otra vez: el mismo horario cada día y sin sesiones (la base borra las de antes).
  await boton(p, "Cambiar cuándo").click();
  await mismoHorario(p).click();
  await p.getByRole("group", { name: "Termina", exact: true }).getByRole("button", { name: /^9:00/ }).click();
  assert.match(limpio((await renglones(p))[0]), /Del 9 al 11 de oct · 20:00–21:00/);
  const comun = await guardar(p);
  assert.equal(comun.sesiones, undefined);
  assert.deepEqual({ inicio: comun.inicio, fin: comun.fin }, { inicio: "2026-10-09T20:00", fin: "2026-10-11T21:00" });
});

test("horario por día: un evento de un día pasa a varios y se ajusta día por día", TOPE, async (t) => {
  const p = await pagina(t);
  await boton(p, "Cambiar cuándo").click();
  await boton(p, "Dura varios días").click();
  // El calendario abre con el día de ahora (el 9) como elección cerrada: el primer toque empieza de nuevo y el segundo hace el rango.
  await p.locator('[data-fecha="2026-10-09"]').click();
  await p.locator('[data-fecha="2026-10-10"]').click();
  await p.getByRole("dialog").getByRole("button", { name: "Listo", exact: true }).click();
  assert.equal(await pregunta(p), "¿A qué hora, cada día?");
  await p.getByRole("group", { name: "Empieza" }).getByRole("button", { name: /^7:00/ }).click();
  await mismoHorario(p).click();
  await boton(p, "Cambiar sáb 10 de oct").click();
  await p.getByRole("dialog").getByRole("group", { name: "Empieza" }).getByRole("button", { name: /^5:00/ }).click();
  await boton(p, "Listo").click();
  await boton(p, "Siguiente").click();
  const d = await guardar(p);
  assert.equal(JSON.parse(d.sesiones).length, 2);
  assert.equal(JSON.parse(d.sesiones)[1].inicio, "2026-10-10T17:00");
});

test("el cartel: «Cambiar» abre el paso del alta con la casilla desmarcada; «Quitar el cartel» lo quita y deja «Cartel · Agregar»", TOPE, async (t) => {
  const p = await pagina(t);
  await boton(p, "Cambiar cartel").click();
  assert.ok(await p.getByText("Sube el cartel", { exact: true }).isVisible());
  assert.equal(await casilla(p).getAttribute("aria-checked"), "false");
  assert.equal(await boton(p, "No tengo cartel").count(), 0);
  await foto(p, "05-cambiar-cartel");
  await boton(p, "Quitar el cartel").click();
  assert.equal(await p.getByRole("heading", { name: "Ecos de papel" }).count(), 1);
  assert.equal(await p.locator("main img").count(), 0);
  assert.match(limpio((await renglones(p)).at(-1)), /Cartel Agregar/);
  assert.equal((await guardar(p)).imagen, "");
  // Sin cartel, el renglón lo pone: abre el mismo paso, ahora sin «Quitar el cartel».
  await boton(p, "Agregar cartel").click();
  assert.equal(await boton(p, "Quitar el cartel").count(), 0);
});

test("el cartel nuevo se sube sin leerse si la casilla sigue desmarcada; marcada, lo leído cambia lo que dice el cartel y conserva lo demás", TOPE, async (t) => {
  const p = await pagina(t, { qa: { lectura: LEIDO } });
  const subir = () => p.locator("input[type=file]").setInputFiles({ name: "nuevo.svg", mimeType: "image/svg+xml", buffer: Buffer.from(svg("#6b3a4a", "NUEVO")) });
  await boton(p, "Cambiar cartel").click();
  await subir();
  await p.getByRole("heading", { name: "Ecos de papel" }).waitFor();
  assert.equal(await p.locator("main img").first().getAttribute("src"), "/cartel.svg");
  assert.equal(await p.evaluate(() => window.qa.lecturas.length), 0);
  assert.equal(await p.getByText("Leído del cartel").count(), 0);
  assert.equal((await guardar(p)).imagen, "/cartel.svg");
  // Con la casilla marcada: se lee, cambia el nombre, el día y el precio; el lugar y la artista (el cartel no los nombra) se quedan.
  await boton(p, "Cambiar cartel").click();
  await casilla(p).click();
  await subir();
  await p.getByRole("heading", { name: "Ecos de papel: segunda función" }).waitFor();
  assert.equal(await p.evaluate(() => window.qa.lecturas.length), 1);
  assert.ok(await p.getByText("Leído del cartel").isVisible());
  const filas = (await renglones(p)).map(limpio);
  assert.match(filas[0], /vie 16 de oct/);
  assert.match(filas[1], /Teatro de la Paz/);
  assert.match(filas[2], /Gratis/);
  assert.match(filas[3], /Lucía Montaño/);
  await foto(p, "06-revisa-cartel-leido");
});

test("la administración puede pegar la dirección de una imagen en el paso del cartel", TOPE, async (t) => {
  const p = await pagina(t, { qa: { esAdmin: true } });
  await boton(p, "Cambiar cartel").click();
  await p.getByLabel("O pega la dirección de una imagen").fill("https://museo.example/cartel.jpg");
  await boton(p, "Atrás").click();
  assert.equal((await guardar(p)).imagen, "https://museo.example/cartel.jpg");
});

test("lo opcional: «Cambiar artistas, descripción o enlace» abre lo de siempre con lo que ya tiene", TOPE, async (t) => {
  const p = await pagina(t);
  await boton(p, "Cambiar artistas, descripción o enlace").click();
  assert.equal(await pregunta(p), "¿Quieres agregar algo?");
  await p.getByRole("button", { name: "Descripción" }).click();
  assert.equal(await p.locator("textarea").inputValue(), "Lectura en voz alta.");
  await p.locator("textarea").fill("Lectura en voz alta con música.");
  await p.getByRole("dialog", { name: "Descripción" }).getByRole("button", { name: "Listo" }).click();
  await boton(p, "Listo").click();
  const d = await guardar(p);
  assert.deepEqual({ descripcion: d.descripcion, enlace: d.enlace }, { descripcion: "Lectura en voz alta con música.", enlace: "https://ejemplo.org" });
});

test("un precio sin número se pregunta: «Falta el precio» en el renglón y en el botón", TOPE, async (t) => {
  const p = await pagina(t, { qa: { evento: { ...EVENTO, precio: "taquilla" } } });
  assert.match((await renglones(p))[2], /Falta el precio/);
  const falta = boton(p, "Falta el precio");
  assert.equal(await falta.getAttribute("aria-disabled"), "true");
  await falta.click({ force: true });
  assert.equal(await p.evaluate(() => window.qa.envios.length), 0);
});

test("errores del servidor: el conflicto de versión enlaza la de ahora, los cambios siguen y la guardia vuelve; el reintento conserva su clave", TOPE, async (t) => {
  const p = await pagina(t, { qa: { resultado: "conflicto" } });
  await boton(p, "Cambiar cuánto").click();
  await boton(p, /^Gratis/).click();
  const primero = await guardar(p);
  await p.getByRole("alert").filter({ hasText: "El evento cambió mientras lo editabas" }).waitFor();
  const ver = p.getByRole("link", { name: "Ver versión actual en otra pestaña" });
  assert.equal(await ver.getAttribute("href"), FICHA);
  assert.equal(await ver.getAttribute("target"), "_blank");
  assert.match(await ver.getAttribute("rel"), /noopener/);
  assert.match((await renglones(p))[2], /Gratis/);
  assert.equal(await avisa(p), true);
  assert.equal(await p.evaluate(() => window.qa.terminado), null);
  await foto(p, "07-conflicto");
  await p.evaluate(() => (window.qa.resultado = "general"));
  const segundo = await guardar(p);
  assert.equal(segundo.operacion, primero.operacion);
  await p.getByText("No se pudo guardar el evento completo.", { exact: false }).waitFor();
});

for (const ancho of [320, 390]) {
  test(`a ${ancho}: «Revisa», el paso del cartel y el horario por día no se salen de la pantalla`, TOPE, async (t) => {
    const p = await pagina(t, { ancho, qa: { evento: { ...TRES_DIAS, titulo: "Festival de las Linternas en el Jardín de San Juan de Dios" }, sesiones: SESIONES } });
    const desborda = () => p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(await desborda(), false);
    if (ancho === 320) await foto(p, "08-revisa-320");
    await boton(p, "Cambiar cartel").click();
    assert.equal(await desborda(), false);
    await boton(p, "Atrás").click();
    await boton(p, "Cambiar cuándo").click();
    assert.equal(await desborda(), false);
    // El botón del pie queda a la vista.
    const pie = await boton(p, "Siguiente").boundingBox();
    assert.ok(pie.y + pie.height <= 844);
  });
}
