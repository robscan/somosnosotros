/** Prueba de componente de `HojaLugares` y `FichaHoja` (docs/rediseno/50, P5b), con sus estilos y en Chrome real a 390×844: las alturas de la lista
 *  (recogida = la franja de 64, asoma = dos renglones y medio, llena = hasta justo debajo de la fila de contexto, que queda a la vista, y la
 *  navegación se va), que jalar hacia abajo recoge y nunca cierra, que el mapa recibe los toques del hueco y la hoja los del cuerpo, que al
 *  filtrar la lista recogida sube a asoma, y la ficha: abre a foto y datos, llena cubre la pantalla entera (también la fila), la ✕ la cierra
 *  y la lista vuelve al desplazamiento que tenía, y su cabecera se vuelve compacta al desplazar. Y (docs/rediseno/50, P6 y OL-237) la pastilla de
 *  Seguir: en el héroe, junto al menú «···», mientras la portada se ve; al compactarse la cabecera flota abajo (al pie cuando está llena),
 *  escondida recogida; y el aviso sube sobre ella. Y (ajuste del founder, 2026-09-30) el movimiento: la ficha entra desde el borde de abajo, la ✕
 *  baja la hoja y solo después la cierra, la lista vuelve entrando igual sin que nada medido a media entrada falsee sus alturas, tocar la hoja
 *  termina la entrada, y con «reducir movimiento» o desde 792 nada se mueve. Y (ajuste del founder, 2026-09-30) el botón de volver arriba de
 *  las listas, en la hoja: aparece con la lista desplazada más de una pantalla, la devuelve a su principio sin cerrar la hoja (al instante con
 *  «reducir movimiento») y no sale con la ficha a la vista; desde 792 lo enseña el panel.
 *  Y (ajustes 3 y 4 del founder, 2026-10-01) que `recoger` baje la hoja a su altura más baja cuando la persona mueve el mapa, y que al soltar con el dedo (toques
 *  reales por CDP) la hoja vaya directo a su altura —un jalón rápido, a la siguiente; uno lento, a la más cercana— sin parar a medio camino, con la inercia de la
 *  lista llena entera.
 * PLAYWRIGHT_MODULE=/ruta/playwright-core/index.mjs CHROME_EXECUTABLE=/ruta/chrome node --test este-archivo
 */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../../", import.meta.url));
let browser, server, dir, origin;

const mocks = {
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link(p){return React.createElement('a',p)}",
  "next/navigation": "export const useRouter=()=>({push(){},replace(){}});export const usePathname=()=>'/lugares';export const useSearchParams=()=>new URLSearchParams();",
  // Lo que pide la pastilla de Seguir (`components/Seguir`): sin permisos ni avisos del teléfono, sin hablar con el servidor.
  "@/lib/useAvisosTelefono": "export function usePlataforma(){return null} export function useEstadoPush(){return [null,()=>{}]} export function useInstalarApp(){return {puede:false, instalar: async()=>false}}",
  "@/lib/pushCliente": "export function disponibilidadPush(){return 'no-soportado'} export async function suscribirPush(){return {ok:false,motivo:'fallo'}}",
  "@/app/avisos/acciones": "export async function elegirAvisos(){return true}",
  "@/app/perfil/acciones": "export async function guardarSuscripcionPush(){return true}",
  "./HojaInstalar": "export default function HojaInstalar(){return null}",
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "hojalugares-componentes-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React, {useRef, useState} from 'react';import {createRoot} from 'react-dom/client';
      import HojaLugares from './src/app/lugares/HojaLugares';import FichaHoja from './src/app/lugares/FichaHoja';import Seguir from './src/components/Seguir';import Cabecera from './src/components/ui/Cabecera';import lugares from './src/app/lugares/lugares.module.css';import './src/app/globals.css';
      const lugar = { id: 'l1', slug: 'l1', nombre: 'Museo de prueba', tipo: 'museo', direccion: 'Calle 1', lat: 0, lng: 0, portada: null, proximo: null };
      window.qa = { avisos: [], cambios: [], fallar: false, acciones: [], gesto: false };
      window.addEventListener('armazon:hoja', (e) => window.qa.avisos.push(e.detail));
      // Un Server Component real reenvía "sigo" al día tras guardar; aquí se imita guardando lo que la acción recibió.
      function SeguirDePrueba() {
        const [sigo, setSigo] = useState(false);
        async function accion(seguir) { window.qa.acciones.push(seguir); if (window.qa.fallar) return false; setSigo(seguir); return true; }
        return <Seguir que="lugar" nombre="Museo de prueba" sigo={sigo} conSesion cuenta="c1" accion={accion} hrefEntrar="/lugares/l1?accion=seguir" avisosPreguntado correo="p...@example.com" llavePush="" />;
      }
      function App() {
        const [abierta, setAbierta] = useState(false);
        const [entrada, setEntrada] = useState(0);
        const [lejos, setLejos] = useState(false);
        const manejo = useRef(null);
        const renglones = Number(new URLSearchParams(location.search).get('renglones') ?? 14);
        window.qa.mostrar = () => manejo.current.mostrarLista();
        window.qa.recoger = () => manejo.current.recoger();
        // El cuerpo es un solo elemento con data-cuerpo (así lo entrega CuerpoLugar) y la pastilla, otro hijo de la ficha.
        const piezas = {
          cuerpo: <div data-cuerpo><ul data-datos style={{ height: 130, listStyle: 'none' }}><li>datos</li></ul><div style={{ height: 1400 }}>el resto de la ficha</div></div>,
          opciones: <li>Reportar</li>,
          seguir: <SeguirDePrueba />,
        };
        const hoja = (
          <HojaLugares ref={manejo} resumen="12 lugares" entrada={entrada} ficha={abierta ? <FichaHoja lugar={lugar} piezas={piezas} onCerrar={() => setAbierta(false)} /> : null} alAsentar={(e) => window.qa.cambios.push(e)} alLejos={setLejos}>
            <ul style={{ listStyle: 'none' }}>
              {Array.from({ length: renglones }, (_, i) => (
                <li key={i} style={{ height: 100, borderBottom: '1px solid #ddd' }}>
                  <a href="#" onClick={(e) => { e.preventDefault(); setAbierta(true); setEntrada((n) => n + (window.qa.gesto ? 1 : 0)); }}>Renglón {i}</a>
                </li>
              ))}
            </ul>
          </HojaLugares>
        );
        // La pantalla de Lugares: la fila de contexto (la cabecera pegajosa de las raíces) y el mapa bajo ella, en la misma rejilla; la hoja es
        // una capa sobre el mapa y, desde 792, el panel de la izquierda.
        return (
          <main className={lugares.lugares}>
            <Cabecera contexto={<span style={{ height: 44 }}>chip</span>} volverArriba={{ lejos, volver: () => manejo.current.irA('llena') }} />
            <div id="mapa" className={lugares.mapa} data-techo-hoja style={{ background: '#dfe8df' }}>mapa</div>
            {hoja}
          </main>
        );
      }
      createRoot(document.getElementById('root')).render(<App />);
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

async function abrir(ancho = 390, alto = 844, reducir = false, consulta = "", tactil = false) {
  const context = await browser.newContext({ viewport: { width: ancho, height: alto }, reducedMotion: reducir ? "reduce" : "no-preference", hasTouch: tactil, isMobile: tactil });
  const page = await context.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await page.goto(origin + consulta, { waitUntil: "load" });
  // Con alturas (data-hoja) en el teléfono; desde 792 es el panel y no las tiene.
  await page.waitForSelector(ancho >= 792 ? '[role="region"][aria-label="Lugares"]' : '[role="region"][aria-label="Lugares"][data-hoja]');
  await page.waitForTimeout(400);
  page.errores = errores;
  return page;
}

/** Cómo está la hoja: su altura, el desplazamiento, cuánto se ve del cuerpo sobre la navegación (60) y si la ficha es compacta. */
const estado = (page) =>
  page.evaluate(() => {
    const hoja = document.querySelector('[role="region"][aria-label="Lugares"]');
    const c = hoja.firstElementChild;
    const ficha = hoja.querySelector("[data-ficha-hoja]");
    return { hoja: hoja.dataset.hoja, y: Math.round(hoja.scrollTop), cuerpoTop: Math.round(c.getBoundingClientRect().top), visible: Math.round(innerHeight - 60 - c.getBoundingClientRect().top), ficha: !!ficha, compacta: !!ficha?.hasAttribute("data-compacta"), max: hoja.scrollHeight - hoja.clientHeight };
  });
const rueda = async (page, dy) => {
  await page.mouse.move(195, 700);
  await page.mouse.wheel(0, dy);
  await page.waitForTimeout(900);
};
const cerca = (a, b, t = 2) => assert.ok(Math.abs(a - b) <= t, `${a} debía estar a ${t} de ${b}`);
/** El color llega en el cuadro siguiente (con «reducir movimiento» las transiciones duran 0,01 ms, pero no cero): se espera a que llegue. */
async function colorLlega(p, loc, propiedad, esperado, mensaje) {
  let visto;
  for (let i = 0; i < 100; i++) {
    visto = await loc.evaluate((e, k) => getComputedStyle(e)[k], propiedad);
    if (visto === esperado) return;
    await p.waitForTimeout(20);
  }
  assert.equal(visto, esperado, mensaje);
}

/** Lo que hay arriba de la ventana en un punto: la fila de contexto (la cabecera de la pantalla) o la hoja. */
const quienEsta = (page, x, y) =>
  page.evaluate(([x, y]) => {
    const e = document.elementFromPoint(x, y);
    return e?.closest('[role="region"][aria-label="Lugares"]') ? "hoja" : e?.closest("main > header") ? "fila" : (e?.id ?? "otro");
  }, [x, y]);
const ultimoAviso = (page) => page.evaluate(() => window.qa.avisos.at(-1));

test("la lista abre asomando dos renglones y medio; recogida es la franja y llena se detiene bajo la fila de contexto y esconde la navegación", async () => {
  const page = await abrir();
  const asoma = await estado(page);
  assert.equal(asoma.hoja, "asoma");
  cerca(asoma.y, 250); // dos renglones y medio de 100
  cerca(asoma.visible, 64 + 250); // la franja (asa y cantidad) más lo que asoma
  await rueda(page, -600);
  const recogida = await estado(page);
  assert.equal(recogida.hoja, "recogida");
  cerca(recogida.visible, 64); // solo el asa y «12 lugares»
  assert.equal(await page.getByRole("region", { name: "Lugares" }).getByText("12 lugares").isVisible(), true);
  await rueda(page, 350);
  assert.equal((await estado(page)).hoja, "asoma", "un empujón corto desde la franja la sube a asoma");
  await rueda(page, 300);
  const llena = await estado(page);
  assert.equal(llena.hoja, "llena", "de asoma, un empujón se asienta en llena");
  assert.equal(llena.cuerpoTop, 60, "llena sube solo hasta justo debajo de la fila de contexto (60)");
  assert.equal(await quienEsta(page, 195, 30), "fila", "la fila queda siempre a la vista con la lista llena");
  assert.equal(await quienEsta(page, 195, 100), "hoja");
  assert.deepEqual(await ultimoAviso(page), { llena: true, pagina: false, y: 0, alFinal: false }, "llena, la navegación se va; la barra sigue el desplazamiento de la lista");
  await rueda(page, 2000);
  const desplazada = await estado(page);
  assert.equal(desplazada.hoja, "llena");
  assert.ok(desplazada.cuerpoTop < 0, "con la lista larga, llena desplaza el contenido por debajo de la fila");
  assert.equal(await quienEsta(page, 195, 30), "fila", "y la fila sigue a la vista con la lista desplazada");
  assert.equal((await ultimoAviso(page)).llena, true);
  await rueda(page, -200);
  const arriba = await estado(page);
  assert.equal(arriba.hoja, "llena", "un poco hacia arriba sigue siendo desplazar el contenido de la hoja llena");
  assert.ok(arriba.y < desplazada.y && arriba.y > desplazada.y - 300, "llena desplaza el contenido");
  await rueda(page, -3000);
  assert.equal((await estado(page)).hoja, "recogida", "jalar hacia abajo la recoge hasta la franja: nunca la cierra");
  assert.deepEqual(await ultimoAviso(page), { llena: false }, "y la navegación vuelve");
  assert.deepEqual(page.errores, []);
});

test("con la barra recogida la fila de contexto sube con ella (la página no se desplaza, así que no la lleva el sticky) y la lista sigue bajo la fila", async () => {
  const page = await abrir();
  const fila = () => page.evaluate(() => Math.round(document.querySelector("main > header").getBoundingClientRect().bottom));
  assert.equal(await fila(), 60);
  // El armazón recoge la barra con `data-recogida` y `--recogida` (lo que la barra mide); aquí se ponen a mano, sin la barra.
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-recogida", "");
    document.documentElement.style.setProperty("--recogida", "56px");
  });
  await page.waitForTimeout(500);
  assert.equal(await fila(), 4, "la fila sube lo que mide la barra (56) y sigue a la vista");
  await page.evaluate(() => document.documentElement.removeAttribute("data-recogida"));
  await page.waitForTimeout(500);
  assert.equal(await fila(), 60, "y baja con ella al volver");
  assert.deepEqual(page.errores, []);
});

test("al filtrar, la lista recogida sube a asoma; en asoma o llena, o con la ficha a la vista, se queda; y en todos avisa cómo quedó", async () => {
  const page = await abrir();
  /** Lo que pide quien filtra y lo que la hoja avisa al momento (`alAsentar`): la altura, dónde quedó y cuánto tapa del mapa. */
  const mostrar = () =>
    page.evaluate(() => {
      window.qa.cambios.length = 0;
      window.qa.mostrar();
      return window.qa.cambios.slice(-1)[0];
    });
  const asoma = await estado(page);
  const enAsoma = await mostrar();
  assert.deepEqual([enAsoma.detente, (await estado(page)).y], ["asoma", asoma.y], "en asoma se queda donde está");
  cerca(enAsoma.cubre, 64 + 250);
  await rueda(page, -600);
  assert.equal((await estado(page)).hoja, "recogida");
  const desdeRecogida = await mostrar();
  const arriba = await estado(page);
  assert.equal(arriba.hoja, "asoma", "recogida sube a asoma de un salto, ya en el aviso de la hoja");
  cerca(arriba.y, 250);
  assert.equal(desdeRecogida.detente, "asoma");
  cerca(desdeRecogida.cubre, 64 + 250); // el mapa se encuadra con lo que tapa asoma, no con la franja
  assert.equal(await quienEsta(page, 195, 30), "fila");
  await rueda(page, 300);
  const llena = await estado(page);
  assert.equal(llena.hoja, "llena");
  const enLlena = await mostrar();
  assert.deepEqual([enLlena.detente, enLlena.y, (await estado(page)).y], ["llena", llena.y, llena.y], "llena se queda donde está");
  cerca(enLlena.cubre, 64 + 250); // llena tapa todo el mapa: se cuenta lo que taparía en asoma, para cuando la hoja baje
  await rueda(page, -3000);
  await page.getByRole("link", { name: "Renglón 2", exact: true }).evaluate((a) => a.click());
  await page.waitForTimeout(900);
  await rueda(page, -3000);
  assert.deepEqual([(await estado(page)).ficha, (await estado(page)).hoja], [true, "recogida"]);
  const conFicha = await mostrar();
  assert.deepEqual([(await estado(page)).hoja, conFicha.detente], ["recogida", "recogida"], "con la ficha a la vista la lista no sube");
  assert.deepEqual(page.errores, []);
});

test("cuando la persona mueve el mapa, `recoger` baja la hoja a su altura más baja: de asoma, de llena y con la ficha; en recogida no hace nada, ni en el panel", async () => {
  const page = await abrir();
  const recoger = async () => {
    await page.evaluate(() => window.qa.recoger());
    await page.waitForTimeout(900);
    return estado(page);
  };
  assert.equal((await estado(page)).hoja, "asoma");
  const desdeAsoma = await recoger();
  assert.deepEqual([desdeAsoma.hoja, desdeAsoma.y], ["recogida", 0]);
  assert.deepEqual([(await recoger()).hoja, (await recoger()).y], ["recogida", 0], "ya recogida, no hace nada");
  await rueda(page, 650);
  assert.equal((await estado(page)).hoja, "llena");
  assert.equal((await recoger()).hoja, "recogida", "de llena también baja");
  await page.getByRole("link", { name: "Renglón 2", exact: true }).evaluate((a) => a.click());
  await page.waitForTimeout(900);
  assert.deepEqual([(await estado(page)).ficha, (await estado(page)).hoja], [true, "media"]);
  const conFicha = await recoger();
  assert.deepEqual([conFicha.hoja, conFicha.y], ["recogida", 0], "la ficha baja a su cabecera");
  assert.deepEqual(page.errores, []);
  const panel = await abrir(1280, 800);
  await panel.evaluate(() => { document.querySelector('[role="region"][aria-label="Lugares"]').scrollTop = 300; });
  await panel.evaluate(() => window.qa.recoger());
  await panel.waitForTimeout(500);
  assert.equal((await estado(panel)).y, 300, "desde 792 la hoja es un panel: no se recoge");
});

/** Un jalón con el dedo, a mano (toques reales por CDP): `ms` de recorrido, `freno` > 1 lo va deteniendo y `quieto` es lo que espera parado antes de soltar.
 *  Devuelve el desplazamiento cuadro a cuadro desde el momento de soltar y dónde quedó. */
async function jalar(page, cdp, { y0, dy, ms, freno = 1, quieto = 0 }) {
  await page.evaluate(() => {
    const hoja = document.querySelector('[role="region"][aria-label="Lugares"]');
    window.__traza = { soltado: null, y: [] };
    hoja.addEventListener("touchend", () => (window.__traza.soltado = performance.now()), { once: true });
    const paso = () => {
      window.__traza.y.push([performance.now(), hoja.scrollTop]);
      if (window.__traza.y.length < 1200) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  });
  // Los toques llevan su propia hora (16 ms entre uno y otro): con varias pruebas a la vez, Chrome tarda más en recibirlos y, sin esto, el jalón saldría lento.
  let hora = Date.now() / 1000;
  const toque = (type, y) => cdp.send("Input.dispatchTouchEvent", { type, timestamp: hora, touchPoints: type === "touchEnd" ? [] : [{ x: 195, y, id: 0 }] });
  await toque("touchStart", y0);
  const pasos = Math.max(2, Math.round(ms / 16));
  for (let i = 1; i <= pasos; i++) {
    hora += 0.016;
    await toque("touchMove", y0 + dy * (1 - Math.pow(1 - i / pasos, freno)));
    await page.waitForTimeout(16);
  }
  hora += quieto / 1000;
  if (quieto) await page.waitForTimeout(quieto);
  hora += 0.016;
  await toque("touchEnd", 0);
  await page.waitForTimeout(2600);
  const { soltado, y } = await page.evaluate(() => window.__traza);
  const trasSoltar = y.filter(([t]) => t >= soltado);
  const final = Math.round(trasSoltar.at(-1)[1]);
  let ultimo = 0;
  trasSoltar.forEach(([, v], i) => {
    if (i && Math.abs(v - trasSoltar[i - 1][1]) > 0.5) ultimo = i;
  });
  // Una parada a medio camino: 90 ms o más casi quieta (menos de 0,3 px por cuadro) antes de la última vez que se movió.
  let parada = 0;
  let desde = null;
  for (let i = 1; i <= ultimo; i++) {
    if (Math.abs(trasSoltar[i][1] - trasSoltar[i - 1][1]) < 0.3) {
      desde ??= trasSoltar[i - 1][0];
      if (trasSoltar[i][0] - desde >= 90) {
        parada++;
        desde = Infinity;
      }
    } else desde = null;
  }
  return { final, hastaQuieta: Math.round(trasSoltar[ultimo][0] - trasSoltar[0][0]), parada, mayor: Math.round(Math.max(...trasSoltar.map(([, v]) => v))), alSoltar: Math.round(trasSoltar[0][1]) };
}

test("al soltar, la hoja va directo a su altura: un jalón rápido, a la siguiente; un arrastre lento, a la más cercana; la lista llena conserva su inercia y la que baja de ella no queda entre dos alturas", async () => {
  const page = await abrir(390, 844, false, "", true);
  const cdp = await page.context().newCDPSession(page);
  const poner = async (y) => {
    await page.evaluate((y) => { document.querySelector('[role="region"][aria-label="Lugares"]').scrollTop = y; }, y);
    await page.waitForTimeout(700);
  };
  const asoma = (await estado(page)).y;
  cerca(asoma, 250);
  const LLENA = 660;
  const alturas = async (esperado, mensaje) => { const e = await estado(page); cerca(e.y, esperado, 2); assert.equal(e.hoja, { 0: "recogida", 250: "asoma", 660: "llena" }[esperado], mensaje); };

  // Rápido hacia arriba, aunque no pase de la mitad: a la siguiente (de asoma, llena; de recogida, asoma), sin pararse a medio camino.
  const sube = await jalar(page, cdp, { y0: 700, dy: -100, ms: 70 });
  cerca(sube.final, LLENA, 2);
  assert.equal(sube.parada, 0, "una sola animación, sin parar a medio camino");
  assert.ok(sube.mayor <= LLENA + 1, "no se pasa de llena");
  assert.ok(sube.hastaQuieta < 1000, `llega pronto (${sube.hastaQuieta} ms)`);
  await alturas(LLENA, "llena");
  // Rápido hacia abajo: a la anterior.
  const baja = await jalar(page, cdp, { y0: 300, dy: 160, ms: 90 });
  cerca(baja.final, asoma, 2);
  assert.equal(baja.parada, 0);
  assert.ok(baja.hastaQuieta < 1000);
  const recoge = await jalar(page, cdp, { y0: 500, dy: 100, ms: 70 });
  cerca(recoge.final, 0, 2);
  assert.equal(recoge.parada, 0);
  const sube2 = await jalar(page, cdp, { y0: 750, dy: -110, ms: 70 });
  cerca(sube2.final, asoma, 2);
  assert.equal(sube2.parada, 0);
  // Lento y soltando quieto: a la más cercana, que es la de donde salió.
  await poner(asoma);
  cerca((await jalar(page, cdp, { y0: 700, dy: -70, ms: 900, freno: 3, quieto: 150 })).final, asoma, 2);
  cerca((await jalar(page, cdp, { y0: 500, dy: 70, ms: 900, freno: 3, quieto: 150 })).final, asoma, 2);
  // Pasado más de la mitad y soltado quieto: a la de ese lado.
  const larga = await jalar(page, cdp, { y0: 700, dy: -400, ms: 1200, freno: 3, quieto: 150 });
  cerca(larga.final, LLENA, 2);
  // Llena: el contenido se desplaza con su inercia entera (no se acorta ni se ancla)...
  await poner(LLENA);
  const lista = await jalar(page, cdp, { y0: 600, dy: -200, ms: 150 });
  assert.ok(lista.final > LLENA + 150, `la inercia de la lista sigue: terminó en ${lista.final}`);
  // ...y la que baja de llena termina en una altura, nunca entre dos (en Safari se detiene en llena; Chrome sigue y se ancla en la de abajo).
  const vuelve = await jalar(page, cdp, { y0: 300, dy: 300, ms: 120 });
  assert.ok([asoma, LLENA].some((altura) => Math.abs(vuelve.final - altura) <= 2), `terminó en ${vuelve.final}`);
  assert.deepEqual(page.errores, []);
});

test("en reposo el mapa recibe los toques del hueco y la hoja los del cuerpo", async () => {
  const page = await abrir();
  const arriba = await page.evaluate(() => document.elementFromPoint(195, 100)?.id);
  assert.equal(arriba, "mapa");
  const cuerpo = await page.evaluate(() => !!document.elementFromPoint(195, 700)?.closest('[role="region"][aria-label="Lugares"]'));
  assert.equal(cuerpo, true);
  await page.mouse.move(195, 700);
  await page.mouse.wheel(0, 30);
  await page.waitForTimeout(50);
  const enMovimiento = await page.evaluate(() => document.elementFromPoint(195, 100)?.id);
  assert.notEqual(enMovimiento, "mapa", "mientras se mueve, el desplazador recibe todo (el recorte llegaría tarde y cortaría el borde)");
  await page.waitForTimeout(900);
  assert.equal(await page.evaluate(() => document.elementFromPoint(195, 100)?.id), "mapa");
});

test("la ficha abre a foto y datos, la ✕ la cierra y la lista vuelve a donde estaba", async () => {
  const page = await abrir();
  await rueda(page, 2000); // la lista, llena y desplazada hasta el final
  const antes = await estado(page);
  assert.equal(antes.hoja, "llena");
  await page.getByRole("link", { name: "Renglón 13", exact: true }).evaluate((a) => a.click());
  await page.waitForTimeout(900);
  const media = await estado(page);
  assert.equal(media.ficha, true);
  assert.equal(media.hoja, "media");
  // Foto y datos, hasta donde empieza lo que sigue: lo que se ve es el borde de arriba del segundo bloque de la ficha.
  const esperada = await page.evaluate(() => {
    const c = document.querySelector('[role="region"][aria-label="Lugares"]').firstElementChild;
    return Math.round(document.querySelector("[data-cuerpo] > :nth-child(2)").getBoundingClientRect().top - c.getBoundingClientRect().top);
  });
  cerca(media.visible, esperada, 3);
  assert.equal(media.compacta, false);
  await rueda(page, 3000);
  assert.deepEqual([(await estado(page)).hoja, (await estado(page)).compacta], ["llena", false], "un empujón largo desde media se detiene en llena, con la portada todavía a la vista");
  await rueda(page, 3000);
  const llena = await estado(page);
  assert.equal(llena.hoja, "llena");
  assert.equal(llena.compacta, true, "desplazada, la cabecera se vuelve compacta con la portada detrás del título");
  assert.equal(await quienEsta(page, 195, 30), "hoja", "la ficha es una página: llena cubre toda la pantalla, también la fila de contexto");
  assert.equal((await ultimoAviso(page)).pagina, true, "y se lleva la barra entera");
  assert.equal(await page.getByRole("button", { name: "Atrás" }).isVisible(), true, "llena, el mando es Atrás");
  assert.equal(await page.getByRole("button", { name: "Cerrar la ficha" }).isVisible(), false);
  await page.getByRole("button", { name: "Atrás" }).click();
  await page.waitForTimeout(900);
  assert.equal((await estado(page)).hoja, "media", "Atrás vuelve a foto y datos");
  await rueda(page, -3000);
  const recogida = await estado(page);
  assert.equal(recogida.hoja, "recogida");
  assert.equal(recogida.ficha, true, "jalar la recoge a su cabecera pero no la cierra");
  cerca(recogida.visible, 76);
  await page.getByRole("button", { name: "Cerrar la ficha" }).click();
  await page.waitForTimeout(900);
  const despues = await estado(page);
  assert.equal(despues.ficha, false, "solo la ✕ cierra la ficha");
  assert.equal(despues.hoja, antes.hoja);
  cerca(despues.y, antes.y);
  assert.deepEqual(page.errores, []);
});

/** El movimiento de la hoja ahora: cuánto lleva corrida hacia abajo (px), cuántas animaciones de `transform` tiene (con «reducir movimiento» las
 *  transiciones de lo demás duran 0,01 ms y aparecen en `getAnimations`), si la ficha sigue a la vista y si ya no recibe toques. */
const movimiento = (page) =>
  page.evaluate(() => {
    const hoja = document.querySelector('[role="region"][aria-label="Lugares"]');
    return { y: new DOMMatrixReadOnly(getComputedStyle(hoja).transform).m42, animaciones: hoja.getAnimations().filter((a) => a.effect.getKeyframes().some((k) => "transform" in k)).length, ficha: !!hoja.querySelector("[data-ficha-hoja]"), sale: hoja.hasAttribute("data-sale") };
  });
const abrirRenglon = (page, n) => page.getByRole("link", { name: `Renglón ${n}`, exact: true }).evaluate((a) => a.click());

test("con movimiento, la ficha entra desde el borde de abajo, la ✕ la baja y solo después la cierra, y la lista vuelve entrando igual sin perder sus alturas; tocar la hoja termina la entrada", async () => {
  const page = await abrir();
  await page.evaluate(() => (window.qa.gesto = true)); // abrir la ficha desde un renglón es un gesto: la hoja entra con movimiento
  const asoma = await estado(page);
  // Las alturas de la lista, con la hoja quieta: a dónde la lleva el asa desde asoma (llena) y de vuelta.
  const asaLista = page.getByRole("button", { name: "Subir o bajar la lista" });
  await asaLista.click();
  await page.waitForTimeout(900);
  const llena = (await estado(page)).y;
  await asaLista.click();
  await asaLista.click();
  await page.waitForTimeout(900);
  assert.equal((await estado(page)).hoja, "asoma");
  // Entrada: en el primer cuadro la hoja lleva corrido todo lo que se ve de su cuerpo (empieza en el borde de abajo, sin tiempo muerto) y en menos de un segundo queda en su altura.
  await abrirRenglon(page, 2);
  const entra = await movimiento(page);
  assert.equal(entra.animaciones, 1, "la entrada es una animación de la hoja entera");
  await page.waitForTimeout(1200);
  const media = await estado(page);
  assert.equal(media.hoja, "media");
  cerca(entra.y, media.visible + 60, 30); // `visible` de `estado` ya resta la navegación (60)
  assert.deepEqual([(await movimiento(page)).animaciones, (await movimiento(page)).y], [0, 0], "al terminar, la hoja queda sin transform");
  // Salida: la ficha sigue ahí mientras la hoja baja, sin recibir toques (los recibe el mapa), y solo al salir se cierra.
  const antes = Date.now();
  await page.getByRole("button", { name: "Cerrar la ficha" }).click();
  const sale = await movimiento(page);
  assert.deepEqual([sale.ficha, sale.sale, sale.animaciones], [true, true, 1]);
  assert.equal(await page.evaluate(() => document.elementFromPoint(195, 700)?.id), "mapa", "mientras baja, el mapa recibe los toques");
  await page.waitForFunction(() => !document.querySelector("[data-ficha-hoja]"), null, { timeout: 2000 });
  const tarda = Date.now() - antes;
  assert.ok(tarda >= 300 && tarda < 1000, `la ficha se cierra al terminar de salir (${tarda} ms)`);
  // La lista vuelve entrando igual desde abajo. Si algo mide mientras entra (aquí, un renglón que llega), sus alturas no se falsean.
  const entraLista = await movimiento(page);
  assert.deepEqual([entraLista.ficha, entraLista.sale, entraLista.animaciones], [false, false, 1]);
  assert.ok(entraLista.y > 100, `la lista entra desde abajo (${entraLista.y})`);
  await page.evaluate(() => {
    const li = document.createElement("li");
    li.style.height = "100px";
    document.querySelector('[role="region"][aria-label="Lugares"] ul').append(li);
  });
  await page.waitForTimeout(1500);
  const vuelve = await estado(page);
  assert.equal(vuelve.hoja, asoma.hoja);
  cerca(vuelve.y, asoma.y, 1);
  assert.deepEqual([(await movimiento(page)).animaciones, (await movimiento(page)).y], [0, 0]);
  await asaLista.click();
  await page.waitForTimeout(900);
  cerca((await estado(page)).y, llena, 1); // «llena» sigue donde estaba: lo medido a media entrada no lo movió
  await asaLista.click();
  await asaLista.click();
  await page.waitForTimeout(900);
  // El gesto gana: un dedo sobre la hoja a media entrada la termina de golpe.
  await abrirRenglon(page, 3);
  assert.equal((await movimiento(page)).animaciones, 1);
  await page.evaluate(() => document.querySelector('[role="region"][aria-label="Lugares"]').dispatchEvent(new TouchEvent("touchstart", { bubbles: true, cancelable: true })));
  assert.deepEqual([(await movimiento(page)).animaciones, (await movimiento(page)).y, (await movimiento(page)).ficha], [0, 0, true]);
  assert.deepEqual(page.errores, []);
});

test("con «reducir movimiento», y desde 792, la ficha aparece en su sitio y la ✕ la cierra al instante", async () => {
  for (const [ancho, alto, reducir] of [[390, 844, true], [1280, 800, false]]) {
    const page = await abrir(ancho, alto, reducir);
    await page.evaluate(() => (window.qa.gesto = true));
    await abrirRenglon(page, 2);
    const abierta = await movimiento(page);
    assert.deepEqual([abierta.animaciones, abierta.y, abierta.ficha], [0, 0, true], `a ${ancho} la ficha aparece sin animarse`);
    await page.getByRole("button", { name: "Cerrar la ficha" }).click();
    const cerrada = await movimiento(page);
    assert.deepEqual([cerrada.animaciones, cerrada.y, cerrada.ficha, cerrada.sale], [0, 0, false, false], `a ${ancho} la ✕ cierra sin esperar nada`);
    assert.deepEqual(page.errores, []);
  }
});

/** Dónde están la pastilla de Seguir y el menú «···» de la ficha: sus cajas y lo que hay entre la pastilla y el pie de la ventana. */
const dondeEstaLaPastilla = (page) =>
  page.evaluate(() => {
    const r = (e) => e.getBoundingClientRect();
    const p = r(document.querySelector("[data-flotantes] button"));
    const m = r(document.querySelector("[data-ficha-hoja] header button[aria-haspopup]"));
    return { centroP: p.top + p.height / 2, centroM: m.top + m.height / 2, hueco: m.left - p.right, alto: p.height, abajo: innerHeight - p.bottom };
  });

test("la pastilla de Seguir vive en el héroe junto al menú «···» mientras la portada se ve; compacta, flota al pie y recogida se esconde", async () => {
  const page = await abrir();
  await page.getByRole("link", { name: "Renglón 2", exact: true }).evaluate((a) => a.click());
  await page.waitForTimeout(900);
  assert.equal((await estado(page)).hoja, "media");
  assert.equal((await estado(page)).compacta, false);
  const enElHeroe = await dondeEstaLaPastilla(page);
  cerca(enElHeroe.centroP, enElHeroe.centroM, 1); // en la fila del menú
  cerca(enElHeroe.hueco, 8, 1); // pegada a su izquierda
  assert.equal(Math.round(enElHeroe.alto), 48, "la pastilla mide lo de un toque");
  await rueda(page, 3000); // llena: el empujón se detiene ahí
  await rueda(page, 3000); // y este desplaza la ficha
  const llena = await estado(page);
  assert.equal(llena.hoja, "llena");
  assert.equal(llena.compacta, true);
  cerca((await dondeEstaLaPastilla(page)).abajo, 16, 1); // compacta y llena, la navegación se guarda y la pastilla baja al pie
  await rueda(page, -3000);
  assert.equal((await estado(page)).hoja, "recogida");
  assert.equal(await page.locator("[data-flotantes]").evaluate((e) => getComputedStyle(e).visibility), "hidden", "recogida, la pastilla no se ve");
  assert.deepEqual(page.errores, []);
});

test("la pastilla cambia de sitio justo cuando la cabecera se compacta, sin un cuadro de por medio", async () => {
  const page = await abrir();
  await page.getByRole("link", { name: "Renglón 2", exact: true }).evaluate((a) => a.click());
  await page.waitForTimeout(900);
  await rueda(page, 300); // llena, con la portada todavía a la vista
  const visto = { arriba: 0, abajo: 0 };
  // De poco en poco, hasta que se compacte: en cada paso la pastilla está donde dice la cabecera (en el héroe o al pie).
  for (let paso = 0; paso < 40 && visto.abajo < 2; paso++) {
    await page.mouse.wheel(0, 60);
    await page.waitForTimeout(250);
    const { compacta } = await estado(page);
    const p = await dondeEstaLaPastilla(page);
    if (compacta) {
      visto.abajo++;
      cerca(p.abajo, 16, 1);
    } else {
      visto.arriba++;
      cerca(p.centroP, p.centroM, 1);
    }
  }
  assert.ok(visto.arriba > 0 && visto.abajo > 0, `se vieron los dos lados: ${JSON.stringify(visto)}`);
  assert.deepEqual(page.errores, []);
});

test("Seguir en la ficha de la hoja: «Sigues» en verde, tocarlo otra vez deja de seguir, y un fallo avisa sobre la pastilla", async () => {
  const page = await abrir();
  await page.getByRole("link", { name: "Renglón 2", exact: true }).evaluate((a) => a.click());
  await page.waitForTimeout(900);
  const pastilla = (nombre) => page.getByRole("button", { name: nombre, exact: true });
  await pastilla("Seguir").click();
  await pastilla("Sigues").waitFor();
  assert.equal(await pastilla("Sigues").getAttribute("aria-pressed"), "true");
  await colorLlega(page, pastilla("Sigues"), "backgroundColor", "rgb(31, 111, 67)", "decidido: el verde de lo que ya quedó");
  assert.equal(await pastilla("Sigues").innerText(), "Sigues", "sin nota dentro de la pastilla");
  await pastilla("Sigues").click();
  await pastilla("Seguir").waitFor();
  assert.deepEqual(await page.evaluate(() => window.qa.acciones), [true, false]);
  // Un guardado que falla: el aviso «No se pudo guardar» sale sin tapar la pastilla (con la portada a la vista, ella va arriba y el aviso abajo).
  await page.evaluate(() => (window.qa.fallar = true));
  await pastilla("Seguir").click();
  await page.getByText("No se pudo guardar").waitFor();
  const { aviso, flotante } = await page.evaluate(() => ({ aviso: document.querySelector('[role="alert"]').getBoundingClientRect(), flotante: document.querySelector("[data-flotantes] button").getBoundingClientRect() }));
  assert.ok(aviso.bottom <= flotante.top || aviso.top >= flotante.bottom, `el aviso (${aviso.top}-${aviso.bottom}) no cubre la pastilla (${flotante.top}-${flotante.bottom})`);
  assert.deepEqual(page.errores, []);
});

test("desde 792 la hoja es el panel: la ficha no lleva asa y su ✕ queda a un respiro del borde", async () => {
  const page = await abrir(1280, 800);
  await page.getByRole("link", { name: "Renglón 2", exact: true }).evaluate((a) => a.click());
  await page.waitForSelector("[data-ficha-hoja]");
  const asa = page.locator('button[aria-label="Subir o bajar la ficha"]');
  assert.equal(await asa.evaluate((e) => getComputedStyle(e).display), "none", "sin alturas no hay asa");
  const { cerrar, ficha } = await page.evaluate(() => ({
    cerrar: document.querySelector('[aria-label="Cerrar la ficha"]').getBoundingClientRect().top,
    ficha: document.querySelector("[data-ficha-hoja]").getBoundingClientRect().top,
  }));
  cerca(cerrar - ficha, 12, 1); // `--espacio-3`: sin asa solo queda un respiro sobre la ✕
  const panel = await estado(page);
  await page.evaluate(() => window.qa.mostrar());
  assert.equal((await estado(page)).y, panel.y, "el panel no tiene alturas: al filtrar no sube nada");
  assert.deepEqual(page.errores, []);
});

/** La fila de la lista que se ve a media pantalla, para abrir su ficha. */
const abrirRenglonVisible = (page) => page.evaluate(() => [...document.querySelectorAll("a")].find((a) => /^Renglón/.test(a.textContent) && a.getBoundingClientRect().top > 120 && a.getBoundingClientRect().bottom < 700).click());

test("volver arriba, como en las listas: la hoja llena y desplazada más de una pantalla lo enseña, tocarlo devuelve la lista a su principio sin cerrar la hoja, y con la ficha a la vista no sale", async () => {
  const page = await abrir(390, 844, false, "/?renglones=40");
  const boton = page.getByRole("button", { name: "Volver arriba" });
  assert.equal(await boton.count(), 0, "asomando, sin botón");
  await rueda(page, 300);
  const principio = await estado(page);
  assert.equal(principio.hoja, "llena");
  assert.equal(await boton.count(), 0, "llena y sin desplazar, sin botón");
  await rueda(page, 600);
  assert.ok((await estado(page)).y - principio.y < 844, "esto es menos de una pantalla desplazada");
  assert.equal(await boton.count(), 0, "menos de una pantalla desplazada, sin botón");
  await rueda(page, 600);
  await boton.waitFor();
  assert.ok((await estado(page)).y - principio.y > 844, "más de una pantalla desplazada");
  // Abajo a la izquierda y sobre la hoja (en la pantalla real, pegado al piso: llena, el armazón esconde la navegación).
  const caja = await boton.boundingBox();
  assert.ok(caja.x < 40 && caja.y + caja.height > 844 - 100, `abajo a la izquierda: (${caja.x}, ${caja.y + caja.height})`);
  assert.equal(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest("button")?.getAttribute("aria-label"), [caja.x + caja.width / 2, caja.y + caja.height / 2]), "Volver arriba", "flota sobre la hoja: recibe el toque");
  assert.ok(caja.width >= 44 && caja.height >= 44, "de 44 o más");
  await boton.click();
  await page.waitForFunction((y) => Math.abs(document.querySelector('[role="region"][aria-label="Lugares"]').scrollTop - y) < 2, principio.y);
  await page.waitForTimeout(400); // que termine de asentarse
  const vuelta = await estado(page);
  assert.equal(vuelta.hoja, "llena", "la hoja sigue llena");
  assert.equal(vuelta.cuerpoTop, 60, "y el principio de la lista queda bajo la fila de contexto");
  assert.ok(await page.getByRole("link", { name: "Renglón 0", exact: true }).isVisible(), "el primer renglón a la vista");
  await boton.waitFor({ state: "detached" });
  // Con la ficha a la vista no hay botón; al cerrarla, la lista vuelve a donde estaba (lejos) y el botón con ella.
  await rueda(page, 1800);
  await boton.waitFor();
  await abrirRenglonVisible(page);
  await page.waitForSelector("[data-ficha-hoja]");
  assert.equal(await boton.count(), 0, "con la ficha a la vista, sin botón");
  await page.locator('button[aria-label="Cerrar la ficha"]').click();
  await page.waitForSelector("[data-ficha-hoja]", { state: "detached" });
  await boton.waitFor();
  assert.deepEqual(page.errores, []);
});

test("volver arriba con «reducir movimiento» llega al instante, y desde 792 el panel lo enseña igual", async () => {
  const quieto = await abrir(390, 844, true, "/?renglones=40");
  await rueda(quieto, 1400); // el empujón sube la hoja y se detiene en llena
  const principio = await estado(quieto);
  assert.equal(principio.hoja, "llena");
  await rueda(quieto, 1400);
  const boton = quieto.getByRole("button", { name: "Volver arriba" });
  await boton.waitFor();
  await boton.click();
  cerca((await estado(quieto)).y, principio.y, 2); // sin esperar: sin desplazamiento animado
  await quieto.context().close();

  const panel = await abrir(1280, 800, false, "/?renglones=40");
  const botonDelPanel = panel.getByRole("button", { name: "Volver arriba" });
  await rueda(panel, 600);
  assert.equal(await botonDelPanel.count(), 0, "menos de una pantalla desplazada, sin botón");
  await rueda(panel, 600);
  await botonDelPanel.waitFor();
  await botonDelPanel.click();
  await panel.waitForFunction(() => document.querySelector('[role="region"][aria-label="Lugares"]').scrollTop < 2);
  await botonDelPanel.waitFor({ state: "detached" });
  assert.deepEqual(panel.errores, []);
  await panel.context().close();
});
