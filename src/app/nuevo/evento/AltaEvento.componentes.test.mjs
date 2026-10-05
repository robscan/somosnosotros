/** OL-300 (bitácora 328): el alta de evento por pasos, camino «No tengo cartel», con el armazón real (`PorPasos`), la guardia real
 *  (`useSalirSinPublicar`) y una acción simulada que guarda lo que recibe. La hoja «¿Dónde es?» es un doble que elige el primer lugar
 *  (la de verdad necesita Mapbox); Atrás y la ✕ de la barra preguntan a la guardia como `useVolver`. Reloj fijo: miércoles 7 de octubre
 *  de 2026, así «Este viernes» es el 9.
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
let dir, server, browser, origin;
const mocks = {
  "@/components/HojaDonde":
    "import React from 'react';export default function H(p){return React.createElement('div',{role:'dialog','aria-label':'¿Dónde es?'},React.createElement('h2',null,'¿Dónde es?'),React.createElement('button',{type:'button',onClick:()=>{p.onLugar(p.lugares[0].id);p.onCerrar();}},'Elegir el primero'),React.createElement('button',{type:'button',onClick:p.onCerrar},'Atrás de la hoja'))}",
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
      window.qa = {envios:[], resultado:'general', salio:0, pedirSalida};
      async function accion(_, fd){
        window.qa.envios.push(Object.fromEntries(fd.entries()));
        if (window.qa.resultado === 'pendiente') return new Promise(() => {});
        if (window.qa.resultado === 'enlace') return {ok:false, errores:{enlace:'Ese enlace no se ve bien.'}};
        return {ok:false, errores:{}, general:${JSON.stringify(GENERAL)}};
      }
      const lugares = [{id:'${LUGAR}', nombre:'Teatro de la Paz', tipo:'foro', direccion:'Villerías 205', lat:22.15, lng:-100.97, portada:null, zona:'America/Mexico_City', privado:false}];
      createRoot(document.getElementById('root')).render(
        <AltaEvento accion={accion} lugares={lugares} mios={[]} ciudadContexto={null} salida={{href:'/', texto:'Volver'}} volverA="/nuevo/evento" />
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

async function pagina(t, { movimiento = "reduce" } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: movimiento, timezoneId: "America/Mexico_City", locale: "es-MX" });
  t.after(() => context.close());
  await context.clock.setFixedTime(new Date("2026-10-07T16:00:00Z"));
  const p = await context.newPage();
  p.setDefaultTimeout(8000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  t.after(() => assert.deepEqual(errors, []));
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
  await p.getByRole("group", { name: "Termina" }).getByRole("button", { name: /^9:00/ }).click();
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

test("«Tiene precio» abre el número, solo dígitos, y «Revisa» lo enseña con su signo", TOPE, async (t) => {
  const p = await pagina(t);
  await hastaHora(p);
  await p.getByRole("group", { name: "Empieza" }).getByRole("button", { name: /^8:00/ }).click();
  await p.getByRole("group", { name: "Termina" }).getByRole("button", { name: "Sin hora de fin" }).click();
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
  assert.equal(await p.getByRole("group", { name: "Termina" }).count(), 0);
  await p.getByRole("group", { name: "Empieza" }).getByRole("button", { name: /^12:00/ }).click();
  await p.getByRole("group", { name: "Termina" }).getByRole("button", { name: /^3:00/ }).click();
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
