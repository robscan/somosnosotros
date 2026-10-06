/** OL-300 y OL-302 (bitácoras 328 y 330): el alta de evento por pasos, sin cartel y con cartel, con el armazón real (`PorPasos`), la
 *  guardia real (`useSalirSinPublicar`), el hook real que sube y lee el cartel (`useLeerCartel`) y una acción simulada que guarda lo que
 *  recibe. La hoja «¿Dónde es?» es un doble que elige el primer lugar (la de verdad necesita Mapbox); Atrás y la ✕ de la barra preguntan a
 *  la guardia como `useVolver`. Del servidor y de Storage solo se simulan `cupoDeCartel`, `leerCartelAccion`, `pedirMasLecturas` y
 *  `subirFoto`, y se gobiernan desde `window.qa`. Reloj fijo: miércoles 7 de octubre de 2026, así «Este viernes» es el 9.
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
const GENERAL = "No se pudo publicar el evento completo. Intenta de nuevo.";
const TOPE = { timeout: 30000 };
/** Con `CAPTURAS=<carpeta>` las pruebas de la duración (bitácora 328) y del cartel (bitácora 330) guardan sus capturas a 390×844. */
const capturas = process.env.CAPTURAS;
/** Un cartel de mentira, vertical (4:5): lo que «sube» la persona y lo que Storage devuelve. */
const CARTEL = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><rect width="400" height="500" fill="#4a3a6b"/><rect x="30" y="30" width="340" height="440" fill="none" stroke="#e8dff5" stroke-width="3"/><text x="200" y="230" fill="#fff" font-family="Arial" font-size="42" font-weight="800" text-anchor="middle">ECOS DE</text><text x="200" y="285" fill="#fff" font-family="Arial" font-size="42" font-weight="800" text-anchor="middle">PAPEL</text><text x="200" y="360" fill="#e8dff5" font-family="Arial" font-size="22" text-anchor="middle">Jueves 5 de noviembre · 19:00</text></svg>';
let dir, server, browser, origin;
const mocks = {
  "@/app/eventos/acciones": `
    export async function cupoDeCartel(){const q=window.qa;q.consultas++;if(q.errorCupo)throw Error('corte');return q.cupo&&structuredClone(q.cupo)}
    export async function leerCartelAccion(url){
      const q=window.qa;q.lecturas.push(url);
      if(q.espera)await new Promise((r)=>{q.liberar=r});
      if(q.lectura==='throw')throw Error('corte del modelo');
      if(q.lectura==='fallo')return {ok:false,mensaje:'Llena los datos a mano; la imagen se queda puesta.'};
      if(q.lectura==='sinCupo')return {ok:false,sinCupo:true};
      return structuredClone(q.lectura);
    }
    export async function pedirMasLecturas(){const q=window.qa;q.peticiones++;if(q.peticion==='throw')throw Error('corte');return {ok:q.peticion!=='fallo'}}
  `,
  "@/lib/subirFoto": "export async function subirFoto(carpeta,usuario,prefijo,archivo){const q=window.qa;q.subidas.push({carpeta,usuario,prefijo,archivo:archivo.name});if(q.subida==='throw')throw Error('corte');return q.subida==='error'?{error:'No se pudo subir la imagen. Intenta con otra.',motivo:'subida'}:{url:'/cartel.svg'}}",
  "@/components/HojaDonde":
    "import React from 'react';export default function H(p){return React.createElement('div',{role:'dialog','aria-label':'¿Dónde es?'},React.createElement('h2',null,'¿Dónde es?'),p.otro.sitioTexto&&React.createElement('p',null,'Leído: '+p.otro.sitioTexto+(p.otro.pinPendiente?' (por confirmar)':'')),React.createElement('button',{type:'button',onClick:()=>{p.onLugar(p.lugares[0].id);p.onCerrar();}},'Elegir el primero'),React.createElement('button',{type:'button',onClick:p.onCerrar},'Atrás de la hoja'))}",
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
    define: { "process.env.NEXT_PUBLIC_MAPBOX_TOKEN": '""', "process.env.NEXT_PUBLIC_MAPBOX_STYLE": '""', "process.env.NEXT_PUBLIC_SUPABASE_URL": '""', "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": '""' },
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import AltaEvento from './src/app/nuevo/evento/AltaEvento';
      import {pedirSalida} from './src/lib/guardiaSalida';
      import './src/app/globals.css';
      // resultado: 'general' (falla el guardado) | 'enlace' (el servidor rechaza el enlace) | 'pendiente' (no contesta)
      // Lo que simulan el servidor y Storage (ver los dobles de arriba): el cupo con el que abre la pantalla, si hay lectura de cartel,
      // qué contesta la lectura ('fallo' | 'sinCupo' | 'throw' | un objeto con el resultado), si «espera» a que el test la libere.
      window.qa = {envios:[], resultado:'general', salio:0, pedirSalida, cupo:{usadas:1,tope:20,sinTope:false,pedida:false}, cupoAlAbrir:{usadas:1,tope:20,sinTope:false,pedida:false}, cartelActivo:true, consultas:0, lecturas:[], subidas:[], peticiones:0, lectura:null, subida:'ok', espera:false, errorCupo:false, ...window.qaInicial};
      async function accion(_, fd){
        window.qa.envios.push(Object.fromEntries(fd.entries()));
        if (window.qa.resultado === 'pendiente') return new Promise(() => {});
        if (window.qa.resultado === 'enlace') return {ok:false, errores:{enlace:'Ese enlace no se ve bien.'}};
        return {ok:false, errores:{}, general:${JSON.stringify(GENERAL)}};
      }
      const lugares = [{id:'${LUGAR}', nombre:'Teatro de la Paz', tipo:'foro', direccion:'Villerías 205', lat:22.15, lng:-100.97, portada:null, zona:'America/Mexico_City', privado:false}];
      createRoot(document.getElementById('root')).render(
        <AltaEvento accion={accion} lugares={lugares} mios={[]} ciudadContexto={null} salida={{href:'/', texto:'Volver'}} volverA="/nuevo/evento" usuarioId="usuaria-1" cartelActivo={window.qa.cartelActivo} cupo={window.qa.cupoAlAbrir} />
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

async function pagina(t, { movimiento = "reduce", ancho = 390, qa = {} } = {}) {
  const context = await browser.newContext({ viewport: { width: ancho, height: 844 }, deviceScaleFactor: capturas ? 2 : 1, reducedMotion: movimiento, timezoneId: "America/Mexico_City", locale: "es-MX" });
  t.after(() => context.close());
  await context.clock.setFixedTime(new Date("2026-10-07T16:00:00Z"));
  const p = await context.newPage();
  p.setDefaultTimeout(8000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  t.after(() => assert.deepEqual(errors, []));
  await p.addInitScript((inicial) => (window.qaInicial = inicial), qa);
  await p.route("**/*", (r) => (new URL(r.request().url()).origin === origin ? r.continue() : r.abort()));
  await p.goto(origin);
  return p;
}
const boton = (p, nombre) => p.getByRole("button", { name: nombre });
const pregunta = (p) => p.locator("main h2").first().textContent();
const enviado = (p) => p.evaluate(() => window.qa.envios.at(-1));
/** true si el navegador pediría confirmar al recargar o cerrar: el oyente de `beforeunload` canceló el evento. */
const avisa = (p) => p.evaluate(() => !window.dispatchEvent(new Event("beforeunload", { cancelable: true })));

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
  await boton(p, "Elegir el primero").click();
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
  // «¿Dónde es?» es una hoja (el doble trae su «Atrás de la hoja»): cerrarla vuelve al paso anterior.
  await boton(p, "Atrás de la hoja").click();
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
  await boton(p, "Atrás de la hoja").click();
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
  await boton(p, "Elegir el primero").click();
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
  await boton(p, "Elegir el primero").click();
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
  await boton(p, "Elegir el primero").click();
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
  // Dónde: la hoja abierta como paso; su Atrás vuelve a «Revisa» sin cambiar nada.
  await boton(p, "Cambiar dónde").click();
  await boton(p, "Atrás de la hoja").click();
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


/* ---- Con cartel (OL-302, bitácora 330) ---- */

/** Lo que devuelve `leerCartelAccion` cuando el cartel se lee completo (caso «legible» del prototipo): nombre, día y hora, un lugar del
 *  directorio, gratis y un artista. */
const LEIDO = { ok: true, valores: { titulo: "Inauguración de Ecos de papel", inicio: "2026-11-05T19:00", fin: "", gratis: true, precio: "", descripcion: "", enlace: "", lugar: "Teatro de la Paz", direccion: "" }, lugarId: LUGAR, quien: [{ nombre: "Lucía Montaño" }], horaLeida: true, costoLeido: true };
/** Lo mismo con lo que el cartel no trae: sin lugar del directorio ni precio (caso «medias»). */
const MEDIAS = { ...LEIDO, valores: { ...LEIDO.valores, titulo: "Noche de son huasteco", inicio: "2026-11-14T20:00", gratis: false, lugar: "" }, lugarId: null, quien: [{ nombre: "Trío Bruma" }], costoLeido: false };
const CUPO_AGOTADO = { usadas: 20, tope: 20, sinTope: false, pedida: false };
const subir = (p, nombre = "cartel.svg") => p.locator("input[type=file]").setInputFiles({ name: nombre, mimeType: "image/svg+xml", buffer: Buffer.from(CARTEL) });
const renglones = (p) => p.locator("main ul > li").allInnerTexts();
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

test("el primer paso: el recuadro «Sube el cartel» (campo de imagen escondido que cubre todo el recuadro) y «No tengo cartel», del mismo ancho", TOPE, async (t) => {
  const p = await pagina(t);
  const campo = p.locator("input[type=file]");
  assert.equal(await campo.getAttribute("accept"), "image/*");
  // El campo cubre el recuadro entero: el toque cae en él y el teléfono ofrece cámara o carrete.
  const recuadro = await campo.locator("xpath=..").boundingBox();
  const caja = await campo.boundingBox();
  assert.ok(Math.abs(caja.width - recuadro.width) <= 4 && Math.abs(caja.height - recuadro.height) <= 4, "el campo cubre el recuadro (menos su borde de 2 px)");
  assert.equal(await campo.evaluate((e) => getComputedStyle(e).opacity), "0");
  await p.getByText("Leemos el nombre, la fecha, el lugar y el precio").waitFor();
  const sinCartel = await boton(p, "No tengo cartel").boundingBox();
  assert.equal(Math.round(sinCartel.width), Math.round(recuadro.width));
  await foto(p, "330-01-inicio");
});

test("con todo leído: subir → «Leyendo» (el cartel chico y el aviso, sin pie) → directo a «Revisa» con «Leído del cartel» y sus cuatro renglones; publicar manda la imagen", TOPE, async (t) => {
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
  await foto(p, "330-02-leyendo");
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
  await foto(p, "330-03-revisa-leido");
  await boton(p, "Publicar").click();
  await p.waitForFunction(() => window.qa.envios.length === 1);
  const d = await enviado(p);
  assert.deepEqual(
    { titulo: d.titulo, inicio: d.inicio, fin: d.fin, modo_sitio: d.modo_sitio, lugar_id: d.lugar_id, gratis: d.gratis, precio: d.precio, quien: d.quien, imagen: d.imagen },
    { titulo: "Inauguración de Ecos de papel", inicio: "2026-11-05T19:00", fin: "", modo_sitio: "lugar", lugar_id: LUGAR, gratis: "si", precio: "", quien: JSON.stringify([{ nombre: "Lucía Montaño" }]), imagen: "/cartel.svg" },
  );
});

test("a medias: se preguntan solo dónde y cuánto, y «Revisa» deja el sello; lo que se contesta se ve igual que lo leído", TOPE, async (t) => {
  const p = await pagina(t, { qa: { lectura: MEDIAS } });
  await subir(p);
  assert.equal(await pregunta(p), "¿Dónde es?");
  await boton(p, "Elegir el primero").click();
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
  await foto(p, "330-04-medias-cuanto");
  await boton(p, "Atrás").click();
  await p.getByText("Leemos el nombre, la fecha, el lugar y el precio").waitFor();
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
  await p.getByText("Leído: Jardín de San Juan de Dios (por confirmar)").waitFor();
});

test("sin lecturas al abrir: el recuadro lo dice con su fecha y ofrece pedir más; «No tengo cartel» sigue", TOPE, async (t) => {
  const p = await pagina(t, { qa: { cupoAlAbrir: CUPO_AGOTADO } });
  assert.equal(await p.locator("input[type=file]").count(), 0);
  await p.getByText("Se acabaron tus lecturas del mes").waitFor();
  await p.getByText(/^Se renuevan el 1 de /).waitFor();
  await foto(p, "330-05-sin-cupo");
  await boton(p, "Pedir más lecturas").click();
  await p.getByText("Ya pedimos más para ti").waitFor();
  assert.equal(await p.evaluate(() => window.qa.peticiones), 1);
  assert.equal(await boton(p, "Pedir más lecturas").count(), 0);
  await boton(p, "No tengo cartel").click();
  assert.equal(await pregunta(p), "¿Cómo se llama?");
  assert.equal(await p.evaluate(() => window.qa.subidas.length), 0);
});

test("pedir más sin conexión lo dice en el recuadro y se puede volver a intentar", TOPE, async (t) => {
  const p = await pagina(t, { qa: { cupoAlAbrir: CUPO_AGOTADO, peticion: "fallo" } });
  await boton(p, "Pedir más lecturas").click();
  await p.getByText("No pude mandar la petición. Puede ser tu conexión.").waitFor();
  await p.evaluate(() => (window.qa.peticion = "ok"));
  await boton(p, "Pedir más lecturas").click();
  await p.getByText("Ya pedimos más para ti").waitFor();
});

test("si el cupo se acabó mientras tanto, no se sube nada: el recuadro lo dice", TOPE, async (t) => {
  const p = await pagina(t, { qa: { cupo: CUPO_AGOTADO } });
  await subir(p);
  await p.getByText("Se acabaron tus lecturas del mes").waitFor();
  assert.deepEqual(await p.evaluate(() => ({ subidas: window.qa.subidas.length, lecturas: window.qa.lecturas.length })), { subidas: 0, lecturas: 0 });
  await boton(p, "No tengo cartel").click();
  assert.equal(await pregunta(p), "¿Cómo se llama?");
});

test("si el servidor rechaza la lectura por cupo, la foto no se queda y «No tengo cartel» publica sin imagen", TOPE, async (t) => {
  const p = await pagina(t, { qa: { lectura: "sinCupo" } });
  await subir(p);
  await p.getByText("Se acabaron tus lecturas del mes").waitFor();
  await hastaRevisa(p);
  assert.equal(await p.locator("main img").count(), 0);
  await boton(p, "Publicar").click();
  await p.waitForFunction(() => window.qa.envios.length === 1);
  assert.equal((await enviado(p)).imagen, "");
});

test("si no se pudo leer, el recuadro lo dice con su causa; «No tengo cartel» sigue y la imagen se queda, sin sello", TOPE, async (t) => {
  const p = await pagina(t, { qa: { lectura: "fallo" } });
  await subir(p);
  await p.getByText("No pude leer el cartel", { exact: true }).waitFor();
  await p.getByText("Llena los datos a mano; la imagen se queda puesta.").waitFor();
  await p.getByText("Probar con otra foto").first().waitFor();
  await foto(p, "330-06-fallo-al-leer");
  await hastaRevisa(p);
  assert.equal(await p.locator("main img").getAttribute("src"), "/cartel.svg");
  assert.equal(await p.getByText("Leído del cartel").count(), 0);
  await boton(p, "Publicar").click();
  await p.waitForFunction(() => window.qa.envios.length === 1);
  assert.equal((await enviado(p)).imagen, "/cartel.svg");
});

test("«Probar con otra foto» después de un fallo lee de nuevo y sigue por el camino con cartel", TOPE, async (t) => {
  const p = await pagina(t, { qa: { lectura: "fallo" } });
  await subir(p);
  await p.getByText("No pude leer el cartel", { exact: true }).waitFor();
  await p.evaluate((leido) => (window.qa.lectura = leido), LEIDO);
  await subir(p, "otra.svg");
  await p.getByText("Leído del cartel").waitFor();
  assert.equal((await renglones(p)).length, 4);
});

test("si no se pudo subir, lo dice con su causa y no llega a leer; si se corta a mitad, tampoco se queda leyendo para siempre", TOPE, async (t) => {
  const p = await pagina(t, { qa: { subida: "error", lectura: LEIDO } });
  await subir(p);
  await p.getByText("No pude subir el cartel").waitFor();
  assert.equal(await p.evaluate(() => window.qa.lecturas.length), 0);
  await p.evaluate(() => (window.qa.subida = "ok"));
  await p.evaluate(() => (window.qa.lectura = "throw"));
  await subir(p);
  await p.getByText("Se cortó a la mitad").waitFor();
  assert.equal(await p.getByRole("status").filter({ hasText: "Leyendo el cartel…" }).count(), 0);
  await boton(p, "No tengo cartel").click();
  assert.equal(await pregunta(p), "¿Cómo se llama?");
});

test("sin lectura de carteles en el servidor no se ofrece el recuadro: solo «No tengo cartel»", TOPE, async (t) => {
  const p = await pagina(t, { qa: { cartelActivo: false } });
  assert.equal(await p.locator("input[type=file]").count(), 0);
  await boton(p, "No tengo cartel").waitFor();
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
  await p.getByText("Leemos el nombre, la fecha, el lugar y el precio").waitFor();
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

for (const ancho of [320, 390]) {
  test(`sin desbordes a ${ancho}: el recuadro, «Leyendo», «Revisa» con cartel, sin lecturas, con fallo y con el nombre del tope`, TOPE, async (t) => {
    const limpio = { scroll: 0, fuera: [] };
    const p = await pagina(t, { ancho, qa: { lectura: LEIDO, espera: true } });
    assert.deepEqual(await desborda(p), limpio, "recuadro");
    await subir(p);
    await p.locator("main img").waitFor();
    assert.deepEqual(await desborda(p), limpio, "leyendo");
    await p.evaluate(() => window.qa.liberar());
    await p.getByText("Leído del cartel").waitFor();
    assert.deepEqual(await desborda(p), limpio, "revisa");
    const sinCupo = await pagina(t, { ancho, qa: { cupoAlAbrir: CUPO_AGOTADO } });
    assert.deepEqual(await desborda(sinCupo), limpio, "sin lecturas");
    const fallo = await pagina(t, { ancho, qa: { lectura: "fallo" } });
    await subir(fallo);
    await fallo.getByText("No pude leer el cartel", { exact: true }).waitFor();
    assert.deepEqual(await desborda(fallo), limpio, "fallo");
    const largo = await pagina(t, { ancho, qa: { lectura: { ...LEIDO, valores: { ...LEIDO.valores, titulo: "Festival ".repeat(13).trim().slice(0, 120) } } } });
    await subir(largo);
    await largo.getByText("Leído del cartel").waitFor();
    assert.deepEqual(await desborda(largo), limpio, "revisa con nombre largo");
  });
}

/** La regla de `npm run medir` (toques de 44, accionables tapados, hijos fuera de su caja, márgenes negativos) en estas pantallas. */
const MEDIR = await readFile(join(root, "scripts/ops/auditoria-ui/medir.js"), "utf8");
test("con cartel, ninguna pantalla tiene toques menores de 44, controles tapados, hijos fuera de su caja ni márgenes negativos (320 y 390)", TOPE, async (t) => {
  const medidas = async (p) => {
    const m = await p.evaluate(MEDIR);
    return { toques: m.toquesChicos.filter((c) => !c.enTexto).map((c) => c.el), tapados: m.tapados.map((c) => c.el), desbordes: m.desbordes, fuera: m.fueraVentana, negativos: m.negativos, scroll: m.scrollHorizontal };
  };
  const limpio = { toques: [], tapados: [], desbordes: [], fuera: [], negativos: [], scroll: false };
  for (const ancho of [320, 390]) {
    const p = await pagina(t, { ancho, qa: { lectura: LEIDO, espera: true } });
    assert.deepEqual(await medidas(p), limpio, `recuadro a ${ancho}`);
    await subir(p);
    await p.locator("main img").waitFor();
    assert.deepEqual(await medidas(p), limpio, `leyendo a ${ancho}`);
    await p.evaluate(() => window.qa.liberar());
    await p.getByText("Leído del cartel").waitFor();
    assert.deepEqual(await medidas(p), limpio, `revisa a ${ancho}`);
    const sinCupo = await pagina(t, { ancho, qa: { cupoAlAbrir: CUPO_AGOTADO } });
    assert.deepEqual(await medidas(sinCupo), limpio, `sin lecturas a ${ancho}`);
    const fallo = await pagina(t, { ancho, qa: { lectura: "fallo" } });
    await subir(fallo);
    await fallo.getByText("No pude leer el cartel", { exact: true }).waitFor();
    assert.deepEqual(await medidas(fallo), limpio, `fallo a ${ancho}`);
  }
});
