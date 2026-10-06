/** OL-300 (bitácora 328) y OL-301 (bitácora 329): el alta de evento por pasos, camino «No tengo cartel», con el armazón real (`PorPasos`),
 *  la guardia real (`useSalirSinPublicar`) y una acción simulada que guarda lo que recibe. «¿Dónde es?», «¿Es aquí?» y «No está en el
 *  directorio» son los de verdad; el servicio de Mapbox lo simula `page.route` (sugerencias, coordenadas y dirección de un punto) y el
 *  mapa es un doble con un botón que arrastra el pin (el real necesita WebGL y un token); Atrás y la ✕ de la barra preguntan a la
 *  guardia como `useVolver`. Reloj fijo: miércoles 7 de octubre de 2026, así «Este viernes» es el 9.
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
/** Con `CAPTURAS=<carpeta>` el test de la duración guarda sus capturas a 390×844 (bitácora 328). */
const capturas = process.env.CAPTURAS;
let dir, server, browser, origin;
const mocks = {
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
  // La barra trae el logotipo de las pantallas interiores (con `next/image` y el enrutador), que fuera de Next no carga ni se usa aquí.
  "./Logotipo": "export default function Logotipo(){return null}",
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link({prefetch,replace,...p}){return React.createElement('a',p)}",
};

before(async () => {
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
      import {pedirSalida} from './src/lib/guardiaSalida';
      import './src/app/globals.css';
      // resultado: 'general' (falla el guardado) | 'enlace' (el servidor rechaza el enlace) | 'pendiente' (no contesta)
      window.qa = {envios:[], lugares:[], lugar:'creado', resultado:'general', salio:0, pedirSalida};
      async function accion(_, fd){
        window.qa.envios.push(Object.fromEntries(fd.entries()));
        if (window.qa.resultado === 'pendiente') return new Promise(() => {});
        if (window.qa.resultado === 'enlace') return {ok:false, errores:{enlace:'Ese enlace no se ve bien.'}};
        return {ok:false, errores:{}, general:${JSON.stringify(GENERAL)}};
      }
      const lugares = [
        {id:'${LUGAR}', nombre:'Teatro de la Paz', tipo:'foro', direccion:'Villerías 205', lat:22.15, lng:-100.97, portada:null, zona:'America/Mexico_City', privado:false},
        {id:'${OTRO_LUGAR}', nombre:'Centro de las Artes', tipo:'casa_de_cultura', direccion:'Calz. de Guadalupe 705', lat:22.1417, lng:-101.0021, portada:null, zona:'America/Mexico_City', privado:false},
      ];
      createRoot(document.getElementById('root')).render(
        <AltaEvento accion={accion} lugares={lugares} mios={[]} ciudadContexto={null} salida={{href:'/', texto:'Volver'}} />
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

/** Lo que contesta Mapbox (Search Box y geocodificación inversa) en estas pruebas: tres sitios y la dirección de un punto. */
const SITIOS = {
  jardin: { id: "m-jardin", name: "Jardín de San Juan de Dios", full_address: "Calle Madero 1, Centro Histórico, San Luis Potosí, México", feature_type: "poi", poi_category: ["park"], lat: 22.1511, lng: -100.9772 },
  galeana: { id: "m-galeana", name: "Galeana 423", full_address: "Galeana 423, Centro, San Luis Potosí, México", feature_type: "address", poi_category: [], lat: 22.15, lng: -100.98 },
  teatro: { id: "m-teatro", name: "Teatro Polivalente", full_address: "Calle Reforma 5, Centro, San Luis Potosí, México", feature_type: "poi", poi_category: ["theatre"], lat: 22.153, lng: -100.975 },
  cantina: { id: "m-cantina", name: "La Cantina", full_address: "Calle Zaragoza 12, Centro, San Luis Potosí, México", feature_type: "poi", poi_category: ["bar"], lat: 22.152, lng: -100.979 },
};
const CONTEXTO = { place: { name: "San Luis Potosí" }, country: { name: "México", country_code: "mx" } };
const DIRECCIONES = { "22.1533": "Av. Universidad 300, Lomas, San Luis Potosí, México", "22.16": "Av. Carranza 100, Centro, San Luis Potosí, México", "22.1504": "Villerías 207, Centro, San Luis Potosí, México" };

async function pagina(t, { movimiento = "reduce", ancho = 390, geolocation = { latitude: 22.1504, longitude: -100.97 } } = {}) {
  const context = await browser.newContext({ viewport: { width: ancho, height: 844 }, reducedMotion: movimiento, timezoneId: "America/Mexico_City", locale: "es-MX", geolocation, permissions: ["geolocation"] });
  t.after(() => context.close());
  await context.clock.setFixedTime(new Date("2026-10-07T16:00:00Z"));
  const p = await context.newPage();
  p.setDefaultTimeout(8000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  t.after(() => assert.deepEqual(errors, []));
  await p.route("**/*", (r) => (new URL(r.request().url()).origin === origin ? r.continue() : r.abort()));
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
  assert.equal(renglones.length, 3);
  assert.match(renglones[0], /vie 9 de oct · 19:00–21:00/);
  assert.match(renglones[1], /Teatro de la Paz/);
  assert.match(renglones[2], /Gratis/);
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
  await campo.fill("Taller");
  await boton(p, "Siguiente").waitFor();
  await boton(p, "Borrar lo escrito").click();
  await boton(p, "Falta el nombre").waitFor();
  assert.equal(await campo.inputValue(), "");
  await campo.fill("Taller de grabado");
  await campo.press("Enter");
  assert.equal(await pregunta(p), "¿Qué día es?");
  // El foco va a la pregunta del paso nuevo: el lector dice dónde se está.
  assert.equal(await p.evaluate(() => document.activeElement?.textContent), "¿Qué día es?");
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
  await p.getByLabel("Nombre del evento").fill("Festival");
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

const foto = (p, nombre) => (capturas ? p.screenshot({ path: join(capturas, `${nombre}.png`) }) : null);

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

test("un bar, café o restaurante según el mapa no ofrece «Guardarlo como lugar»", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaDonde(p);
  await elegirDelMapa(p, "cantina", /La Cantina/);
  await boton(p, "Sí, es aquí").click();
  const grupo = p.getByRole("group", { name: "Qué hacer con este sitio" });
  const textos = await grupo.getByRole("button").allInnerTexts();
  assert.equal(textos.length, 2);
  assert.match(textos[0], /^Usarlo solo en este evento/);
  assert.match(textos[1], /^Es un sitio reservado/);
  await foto(p, "uso-2-dos");
});

test("«Guardarlo como lugar» crea el lugar con lo del sitio, y «Revisa» lo muestra por su nombre; se publica por su id, no como «otro»", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaDonde(p);
  await elegirDelMapa(p, "jardin", /Jardín de San Juan de Dios/);
  await boton(p, "Sí, es aquí").click();
  await boton(p, /^Guardarlo como lugar/).click();
  await enPaso(p, "¿Cuánto cuesta?");
  const llamadas = await p.evaluate(() => window.qa.lugares);
  assert.deepEqual(llamadas, [{ nombre: "Jardín de San Juan de Dios", direccion: "Calle Madero 1, Centro Histórico, San Luis Potosí, México", lat: 22.1511, lng: -100.9772, ciudad: "San Luis Potosí", volverA: "/nuevo/evento", privado: false }]);
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
