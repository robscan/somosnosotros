/** OL-303 (bitácora 331): la hoja «¿Dónde es?» / «¿Dónde está?» de siempre (la del formulario de evento, alta y edición, y la del de
 *  lugar) lleva «Listo» en el PIE pegado abajo, no arriba (founder, 2026-10-05: el botón de confirmar va abajo). Con la hoja real
 *  (`HojaDonde`) y el pie real (`PiePaso`): la barra de arriba solo trae «Atrás» y el título; el pie dice «Falta el lugar» y está
 *  apagado mientras no hay sitio, y «Listo» con él; «Agregar «X» como lugar» va encima del pie; con el teclado (un `visualViewport`
 *  simulado) el pie sube y la lista flotante sigue bajo el campo sin tocar la barra ni el pie; con «Agregar lugar» abierto el pie se
 *  va (esa hoja trae su botón); y sin desbordes a 320 y 390. Mapbox lo simula `page.route` y el mapa es un doble con un botón que toca
 *  un punto (el real necesita WebGL y un token). Con `CAPTURAS=<carpeta>` guarda las capturas a 390×844 (bitácora 331).
 * PLAYWRIGHT_MODULE=/ruta/playwright-core/index.mjs node --test este-archivo   (o `npm run test:componentes`) */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../", import.meta.url));
const TOPE = { timeout: 30000 };
const capturas = process.env.CAPTURAS;
const ALTO = 844;
const TECLADO = 336; // lo que ocupa el teclado del iPhone en vertical
let dir, server, browser, origin;
const mocks = {
  // El mapa: dice dónde está el pin y su botón toca un punto vacío del mapa (como `onPunto` del real).
  "./MapaDondeEs":
    "import React from 'react';const h=React.createElement;export default function M(p){return h('div',{role:'region','aria-label':'Mapa de prueba',style:{position:'absolute',inset:0,background:'var(--fondo-mapa)'}},h('svg',{viewBox:'0 0 24 24',width:44,height:44,fill:'currentColor',fillRule:'evenodd',style:{position:'absolute',left:'calc(50% - 22px)',top:'calc(50% - 44px)',color:'var(--primario)',display:p.seleccion?'block':'none'}},h('path',{d:'M12 22s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12zm0-9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z'})),h('button',{type:'button',style:{position:'absolute',left:0,top:0,width:44,height:44,opacity:0},onClick:()=>p.onPunto({lat:22.1533,lng:-100.9811})},'Tocar el mapa'))}",
  "@/app/lugares/acciones": "export async function crearLugarDesdeEvento(){return {ok:true,id:'0b0b0b0b-0000-4000-8000-0000000000aa',reutilizado:false}}",
  "./Atras": "export function useVolver(){return (e)=>e.preventDefault()}export function useTerminar(){return ()=>{}}export default function Atras(){return null}export function AtrasIcono(){return null}",
  "./Navegacion": "export const registrarVolverVisible=()=>()=>{}",
  "@/lib/useAvisosTelefono": "export function usePlataforma(){return null}",
  "./Logotipo": "export default function Logotipo(){return null}",
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link({prefetch,replace,...p}){return React.createElement('a',p)}",
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "hoja-donde-"));
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
      import HojaDonde from './src/components/HojaDonde';
      import useCampoVisible from './src/components/ui/useCampoVisible';
      import './src/app/globals.css';
      const q = new URLSearchParams(location.search);
      window.qa = {cerro:0, lugar:[], otro:[], listo:[]};
      const lugares = [
        {id:'0b0b0b0b-0000-4000-8000-000000000001', nombre:'Teatro de la Paz', tipo:'foro', direccion:'Villerías 205', lat:22.15, lng:-100.97, portada:null, zona:'America/Mexico_City', privado:false},
        ...['Alameda','Carranza','Guadalupe','Morales','Polivalente','Tangamanga'].map((n,i)=>({id:'0b0b0b0b-0000-4000-8000-00000000010'+i, nombre:'Teatro '+n, tipo:'foro', direccion:'Calle '+n+' '+(i+1), lat:22.14+i/1000, lng:-100.99, portada:null, zona:'America/Mexico_City', privado:false})),
      ];
      const otro = {reservado:false, sitioTexto:'', direccion:'', sitioPunto:null, direccionPrivada:'', privadoPunto:null, revelarHoras:24, indicaciones:'', ciudad:null};
      const comun = {lugares, yo:null, ubicando:false, avisoUbicacion:null, onEstoyAqui:()=>{}, onCerrar:()=>{window.qa.cerro++}};
      const lugarPara = q.get('para') === 'lugar';
      // El armazón real monta useCampoVisible una vez (OL-305/OL-308): publica --abajo-visible, el bottom del pie sobre el teclado.
      function Armazon({children}) { useCampoVisible(); return children; }
      createRoot(document.getElementById('root')).render(
        <Armazon>{lugarPara
          ? <HojaDonde {...comun} para="lugar" nombreForm="" conFoco={q.has('foco')} punto={q.has('punto') ? {lat:22.1533, lng:-100.9811} : null} direccion={q.has('punto') ? 'Av. Universidad 300' : ''} ciudad="" onListo={(v)=>window.qa.listo.push(v)} />
          : <HojaDonde {...comun} para="evento" modoSitio={q.has('registrado') ? 'lugar' : 'otro'} lugarId={q.has('registrado') ? lugares[0].id : ''} otro={otro} volverA="/nuevo/evento"
              onLugar={(id)=>window.qa.lugar.push(id)} onOtro={(o)=>window.qa.otro.push(o)} onGesto={()=>{}} />}</Armazon>
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

const CONTEXTO = { place: { name: "San Luis Potosí" }, country: { name: "México", country_code: "mx" } };

/** Abre la hoja (`consulta`: «?para=lugar», «?registrado»…). Un `visualViewport` simulado deja subir y bajar el teclado con `p.teclado(px)`. */
async function hoja(t, consulta = "", ancho = 390) {
  const context = await browser.newContext({ viewport: { width: ancho, height: ALTO }, reducedMotion: "reduce", locale: "es-MX", timezoneId: "America/Mexico_City" });
  t.after(() => context.close());
  await context.addInitScript(() => {
    const oyentes = { resize: [], scroll: [] };
    const vv = {
      height: window.innerHeight,
      offsetTop: 0,
      get pageTop() { return window.scrollY + this.offsetTop; },
      addEventListener: (n, f) => oyentes[n]?.push(f),
      removeEventListener: (n, f) => { if (oyentes[n]) oyentes[n] = oyentes[n].filter((x) => x !== f); },
    };
    Object.defineProperty(window, "visualViewport", { value: vv, configurable: true });
    window.__teclado = (px) => {
      vv.height = window.innerHeight - px;
      oyentes.resize.forEach((f) => f());
    };
  });
  const p = await context.newPage();
  p.setDefaultTimeout(8000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  t.after(() => assert.deepEqual(errors, []));
  await p.route("**/*", (r) => (new URL(r.request().url()).origin === origin ? r.continue() : r.abort()));
  await p.route("https://api.mapbox.com/**", (r) => {
    const url = new URL(r.request().url());
    const json = (cuerpo) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(cuerpo) });
    if (url.pathname.endsWith("/suggest")) return json({ suggestions: [] });
    if (url.pathname.endsWith("/reverse")) {
      const lat = Number(url.searchParams.get("latitude"));
      return json({ features: [{ properties: { name: "Av. Universidad 300", full_address: "Av. Universidad 300, Lomas, San Luis Potosí, México", coordinates: { latitude: lat, longitude: Number(url.searchParams.get("longitude")) }, context: CONTEXTO } }] });
    }
    return r.abort();
  });
  p.teclado = async (px) => {
    await p.evaluate((n) => window.__teclado(n), px);
    await p.waitForTimeout(250); // la transición de 120 ms de la barra y un cuadro de la lista
  };
  await p.goto(`${origin}/${consulta}`);
  await p.getByRole("dialog").waitFor();
  return p;
}

const dialogo = (p) => p.getByRole("dialog");
const pie = (p) => dialogo(p).locator("footer");
const listo = (p) => pie(p).getByRole("button");
const foto = (p, nombre) => (capturas ? p.screenshot({ path: join(capturas, `${nombre}.png`) }) : null);
/** El rectángulo de un localizador, en px de la ventana. */
const caja = async (loc) => loc.boundingBox();
const agregar = (p) => p.getByRole("button", { name: /^Agregar/ });
/** El elemento más bajo de una lista flotante en la ventana: su borde de abajo. */
const lista = (p) => p.getByRole("listbox");

test("«Listo» no está arriba: la barra solo trae «Atrás» y el título; el pie dice «Falta el lugar», apagado, pegado al borde de abajo", TOPE, async (t) => {
  const p = await hoja(t);
  const barra = dialogo(p).locator("> div").first();
  assert.deepEqual(await barra.getByRole("button").allTextContents(), ["Atrás"]);
  assert.equal(await barra.getByRole("heading", { name: "¿Dónde es?" }).count(), 1);
  assert.equal(await dialogo(p).getByRole("button", { name: "Listo" }).count(), 0);

  assert.equal(await pie(p).count(), 1);
  assert.equal(await listo(p).textContent(), "Falta el lugar");
  assert.equal(await listo(p).getAttribute("aria-disabled"), "true");
  const f = await caja(pie(p));
  assert.equal(Math.round(f.y + f.height), ALTO, "el pie llega al borde de abajo");
  assert.equal(Math.round(f.width), 390, "y es de borde a borde");
  const b = await caja(listo(p));
  assert.ok(b.width > 390 - 2 * 24 && b.width <= 390, "el botón ocupa todo el ancho de la columna");

  // Apagado: tocarlo no confirma nada ni cierra la hoja.
  await listo(p).click({ force: true });
  assert.deepEqual(await p.evaluate(() => ({ ...window.qa })), { cerro: 0, lugar: [], otro: [], listo: [] });
  await foto(p, "pie-1-falta-el-lugar");
});

test("un pin sin nombre dice «Falta el nombre del lugar»; con el nombre, «Listo» y confirma", TOPE, async (t) => {
  const p = await hoja(t);
  await p.getByRole("button", { name: "Tocar el mapa" }).click({ force: true });
  await dialogo(p).getByLabel("Nombre del lugar", { exact: true }).waitFor();
  assert.equal(await listo(p).textContent(), "Falta el nombre del lugar");
  assert.equal(await listo(p).getAttribute("aria-disabled"), "true");
  await dialogo(p).getByLabel("Nombre del lugar", { exact: true }).fill("Patio de mi casa");
  assert.equal(await listo(p).textContent(), "Listo");
  assert.equal(await listo(p).getAttribute("aria-disabled"), null);
  await foto(p, "pie-2-listo");
  await listo(p).click();
  const qa = await p.evaluate(() => window.qa);
  assert.equal(qa.cerro, 1);
  assert.equal(qa.otro.length, 1);
  assert.equal(qa.otro[0].sitioTexto, "Patio de mi casa");
  assert.deepEqual(qa.otro[0].sitioPunto, { lat: 22.1533, lng: -100.9811 });
});

test("al reabrir con un lugar registrado, el pie ya dice «Listo» y lo confirma", TOPE, async (t) => {
  const p = await hoja(t, "?registrado");
  assert.equal(await listo(p).textContent(), "Listo");
  await listo(p).click();
  const qa = await p.evaluate(() => window.qa);
  assert.deepEqual(qa.lugar, ["0b0b0b0b-0000-4000-8000-000000000001"]);
  assert.equal(qa.cerro, 1);
});

test("la hoja del punto de un lugar también: «Falta la ubicación» sin punto y «Listo» con él", TOPE, async (t) => {
  const p = await hoja(t, "?para=lugar");
  assert.equal(await dialogo(p).getByRole("heading", { name: "¿Dónde está?" }).count(), 1);
  assert.equal(await dialogo(p).getByRole("button", { name: "Listo" }).count(), 0);
  assert.equal(await listo(p).textContent(), "Falta la ubicación");
  assert.equal(await listo(p).getAttribute("aria-disabled"), "true");
  await p.getByRole("button", { name: "Tocar el mapa" }).click({ force: true });
  await p.getByText("Av. Universidad 300, Lomas").waitFor();
  assert.equal(await listo(p).textContent(), "Listo");
  await listo(p).click();
  const qa = await p.evaluate(() => window.qa);
  assert.equal(qa.listo.length, 1);
  assert.deepEqual(qa.listo[0].punto, { lat: 22.1533, lng: -100.9811 });
  assert.equal(qa.cerro, 1);
});

test("con texto, «Agregar «X» como lugar» va encima del pie, sin tapar su botón ni la lista", TOPE, async (t) => {
  const p = await hoja(t);
  await p.getByLabel("Buscar el lugar").fill("teatro");
  await lista(p).waitFor();
  await agregar(p).waitFor();
  assert.equal(await agregar(p).textContent(), "Agregar «teatro» como lugar");
  await p.waitForTimeout(250); // «Estoy aquí» sube con su transición de 120 ms
  const a = await caja(agregar(p));
  const f = await caja(pie(p));
  const estoy = await caja(p.getByRole("button", { name: "Estoy aquí" }));
  assert.ok(a.y + a.height <= f.y, `«Agregar» (abajo en ${a.y + a.height}) queda sobre el pie (arriba en ${f.y})`);
  assert.ok(estoy.y + estoy.height <= a.y, "«Estoy aquí» queda sobre «Agregar»");
  assert.equal(await listo(p).textContent(), "Falta el lugar", "el pie sigue ahí, con lo suyo");
  const l = await caja(lista(p));
  assert.ok(l.y + l.height <= a.y, "la lista termina antes de «Agregar»");
  await foto(p, "pie-3-agregar-sobre-el-pie");
});

test("con el teclado abierto el pie sube con él, «Agregar» sigue encima y la lista, bajo el campo", TOPE, async (t) => {
  const p = await hoja(t);
  await p.getByLabel("Buscar el lugar").fill("teatro");
  await lista(p).waitFor();
  await p.teclado(TECLADO);
  const f = await caja(pie(p));
  assert.equal(Math.round(f.y + f.height), ALTO - TECLADO, "el pie queda justo encima del teclado");
  const a = await caja(agregar(p));
  assert.ok(a.y + a.height <= f.y, "«Agregar» sigue sobre el pie");
  const campo = await caja(p.getByLabel("Buscar el lugar"));
  const l = await caja(lista(p));
  assert.ok(l.y >= campo.y + campo.height, "la lista abre bajo el campo, no encima");
  assert.ok(l.y + l.height <= a.y, `la lista (abajo en ${l.y + l.height}) no tapa «Agregar» (arriba en ${a.y})`);
  await foto(p, "pie-4-con-teclado");
  // Y al bajar el teclado, todo vuelve al borde.
  await p.teclado(0);
  const g = await caja(pie(p));
  assert.equal(Math.round(g.y + g.height), ALTO);
});

test("app de la tienda (Capacitor: el visualViewport no cambia, el teclado llega por los eventos del plugin): el pie, «Agregar» y «Estoy aquí» quedan sobre el teclado", TOPE, async (t) => {
  const p = await hoja(t);
  await p.getByLabel("Buscar el lugar").fill("teatro");
  await lista(p).waitFor();
  const antes = await caja(p.getByRole("button", { name: "Estoy aquí" }));
  // Como `@capacitor/keyboard` en modo body: `keyboardHeight` puesto en el propio evento (sin `detail`) y el `<body>` encogido a mano.
  await p.evaluate((alto) => {
    for (const nombre of ["keyboardWillShow", "keyboardDidShow"]) {
      const ev = document.createEvent("Events");
      ev.initEvent(nombre, false, false);
      ev.keyboardHeight = alto;
      window.dispatchEvent(ev);
    }
    document.body.style.height = `${window.innerHeight - alto}px`;
  }, TECLADO);
  await p.waitForTimeout(250);
  assert.equal(await p.evaluate(() => window.visualViewport.height), ALTO, "el área visible no cambió");
  const f = await caja(pie(p));
  assert.equal(Math.round(f.y + f.height), ALTO - TECLADO, "el pie queda justo encima del teclado");
  const a = await caja(agregar(p));
  assert.ok(a.y + a.height <= f.y, `«Agregar» (abajo en ${a.y + a.height}) queda sobre el pie (arriba en ${f.y})`);
  const campo = await caja(p.getByLabel("Buscar el lugar"));
  const l = await caja(lista(p));
  assert.ok(l.y >= campo.y + campo.height && l.y + l.height <= a.y, "la lista abre bajo el campo y no tapa «Agregar»");
  const aqui = await caja(p.getByRole("button", { name: "Estoy aquí" }));
  assert.ok(aqui.y + aqui.height <= ALTO - TECLADO, `«Estoy aquí» (abajo en ${aqui.y + aqui.height}) queda sobre el teclado (desde ${ALTO - TECLADO})`);
  assert.ok(aqui.y < antes.y, "«Estoy aquí» subió con el teclado");
  // Al esconderse, todo vuelve al borde.
  await p.evaluate(() => {
    for (const nombre of ["keyboardWillHide", "keyboardDidHide"]) {
      const ev = document.createEvent("Events");
      ev.initEvent(nombre, false, false);
      window.dispatchEvent(ev);
    }
    document.body.style.height = "";
  });
  await p.waitForTimeout(250);
  const g = await caja(pie(p));
  assert.equal(Math.round(g.y + g.height), ALTO);
});

test("«Agregar» abre su hoja, que trae su propio botón: el pie se va", TOPE, async (t) => {
  const p = await hoja(t);
  await p.getByLabel("Buscar el lugar").fill("teatro");
  await agregar(p).click();
  const panel = p.getByRole("group", { name: "Agregar lugar" });
  await panel.waitFor();
  assert.equal(await pie(p).count(), 0);
  assert.equal(await panel.getByRole("button", { name: "Guardar y usar este lugar" }).count(), 1);
  const g = await caja(panel);
  assert.equal(Math.round(g.y + g.height), ALTO, "la hoja de «Agregar lugar» ocupa el fondo, sin pie debajo");
  await p.waitForTimeout(250); // «Estoy aquí» sube con su transición de 120 ms
  const estoy = await caja(p.getByRole("button", { name: "Estoy aquí" }));
  assert.ok(estoy.y + estoy.height <= g.y, "«Estoy aquí» queda encima de la hoja, nunca debajo");
  await foto(p, "pie-5-agregar-lugar-sin-pie");
});

test("sin desbordes a 320 y a 390: vacía, con pin, con lista y «Agregar», y con el teclado", TOPE, async (t) => {
  for (const ancho of [320, 390]) {
    const p = await hoja(t, "", ancho);
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
    assert.deepEqual(await desborda(), { scroll: 0, fuera: [] }, `vacía a ${ancho}`);
    await p.getByRole("button", { name: "Tocar el mapa" }).click({ force: true });
    await dialogo(p).getByLabel("Nombre del lugar", { exact: true }).fill("Un nombre de lugar bastante largo para ver cómo se parte en una pantalla angosta");
    assert.deepEqual(await desborda(), { scroll: 0, fuera: [] }, `con pin a ${ancho}`);
    assert.equal(await listo(p).textContent(), "Listo");
    await p.getByLabel("Buscar el lugar").fill("teatro de un nombre larguísimo que no cabe en una sola línea de la pantalla");
    await agregar(p).waitFor();
    assert.deepEqual(await desborda(), { scroll: 0, fuera: [] }, `con «Agregar» a ${ancho}`);
    const a = await caja(agregar(p));
    assert.ok(a.height < 70, "el texto largo se corta con puntos suspensivos en una línea");
    assert.ok((await caja(agregar(p).locator("svg"))).width >= 18, "el + no se aplasta con el texto largo");
    if (ancho === 320) await foto(p, "pie-6-320-texto-largo");
    await p.teclado(TECLADO);
    assert.deepEqual(await desborda(), { scroll: 0, fuera: [] }, `con teclado a ${ancho}`);
  }
});
