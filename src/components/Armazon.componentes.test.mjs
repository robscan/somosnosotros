/** El armazón (OL-232, bitácora 260; OL-236, bitácora 264): una sola rejilla con la barra de la app, la pantalla y la navegación.
 *  El layout pone `data-vista` según la ruta y el CSS solo lee ese atributo: en el teléfono las raíces llevan la barra y la
 *  navegación (abajo) y las demás vistas no; al bajar se recogen las dos y la fila de contexto sube con ellas; desde 792 la barra
 *  y la navegación (un carril a la izquierda) están en todas las vistas menos en las que llenan la ventana y no se recogen.
 *  Todo lo que se toca en la barra mide 44 como mínimo.
 * PLAYWRIGHT_MODULE=/ruta/playwright-core/index.mjs CHROME_EXECUTABLE=/ruta/chromium node --test este-archivo
 * (no corre con `npm test`, que solo toma `.test.ts`, como las demás `.componentes.test.mjs` del repo). */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../", import.meta.url));
let dir, server, browser, origin;

const mocks = {
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link({prefetch,replace,...p}){return React.createElement('a',p)}",
  "next/image": "import React from 'react';export default function Image({unoptimized,preload,...p}){return React.createElement('img',p)}",
  // La ruta se cambia a mano (`window.__ponerRuta`), como al navegar.
  "next/navigation":
    "import {useSyncExternalStore} from 'react';const oy=new Set();window.__ruta='/agenda';window.__ponerRuta=(r)=>{window.__ruta=r;oy.forEach((f)=>f())};const sub=(f)=>{oy.add(f);return()=>oy.delete(f)};export function usePathname(){return useSyncExternalStore(sub,()=>window.__ruta,()=>'/')}export function useSearchParams(){return new URLSearchParams('')}export function useRouter(){return {push(){},replace(){},back(){},refresh(){},prefetch(){}}}",
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "armazon-componentes-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import Armazon from './src/components/Armazon';
      import BarraApp from './src/components/BarraApp';
      import NavSecciones from './src/components/NavSecciones';
      import EnBarra from './src/components/EnBarra';
      import Barra from './src/components/ui/Barra';
      import Cabecera from './src/components/ui/Cabecera';
      import Hecho from './src/components/Hecho';
      import BotonIcono from './src/components/ui/BotonIcono';
      import {IconoCampana, IconoHerramientas, IconoPuntos} from './src/components/ui/Iconos';
      import {usePathname} from 'next/navigation';
      import './src/app/globals.css';
      // Lo que la sesión pone en la barra (Sesion.tsx), a elegir con ?sesion=: la campana, nada (sin sesión) o la campana con la llave de administración.
      const campana = <BotonIcono href="/novedades" aria-label="Novedades"><IconoCampana width={26} height={26} /></BotonIcono>;
      const llave = <BotonIcono href="/admin" aria-label="Administración"><IconoHerramientas width={26} height={26} /></BotonIcono>;
      const menu = <BotonIcono aria-label="Más acciones"><IconoPuntos /></BotonIcono>;
      const sesion = new URLSearchParams(location.search).get('sesion');
      // Una tarea lleva su propia cabecera interior (la del alta, con su ✕); las demás pantallas de prueba no.
      function Tarea() {
        return usePathname() === '/nuevo' ? <Barra cerrar={{ href: '/agenda', texto: 'Agenda' }} titulo="Publicar un evento" /> : null;
      }
      function App() {
        return (
          <Armazon barra={<BarraApp admin={sesion === 'admin' ? llave : null} sesion={sesion === 'sin-sesion' ? null : campana} />} nav={<NavSecciones perfil={<span>A</span>} />}>
            <Tarea />
            <main className="raiz">
              <EnBarra volver={{ href: '/agenda', texto: 'Agenda' }} menu={menu} />
              <Cabecera contexto={<span style={{ height: 44 }}>chip</span>} />
              <div data-gutter style={{ margin: '0 var(--gutter)', height: 10 }} />
              {new URLSearchParams(location.search).get('hecho') && <Hecho texto="Te interesa «Concierto»" onDeshacer={() => {}} onCerrar={() => {}} />}
              <ul style={{ listStyle: 'none' }}>{Array.from({ length: 60 }, (_, i) => <li key={i} style={{ height: 80 }}>fila {i}</li>)}</ul>
            </main>
          </Armazon>
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
    ["/logotipo.svg", ["image/svg+xml", await readFile(join(root, "public/logotipo.svg"))]],
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

async function pagina(t, ancho = 390, alto = 844, consulta = "") {
  const context = await browser.newContext({ viewport: { width: ancho, height: alto } });
  t.after(() => context.close());
  const p = await context.newPage();
  p.setDefaultTimeout(5000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  t.after(() => assert.deepEqual(errors, []));
  await p.goto(origin + consulta);
  await p.locator("[data-vista]").waitFor();
  return p;
}

const ir = async (p, ruta) => {
  await p.evaluate((r) => window.__ponerRuta(r), ruta);
  await p.waitForTimeout(80);
};
/** Arriba (`top`) y alto de un elemento, redondeados a décimas. */
const caja = (loc) =>
  loc.evaluate((e) => {
    const r = e.getBoundingClientRect();
    const d = (v) => Math.round(v * 10) / 10;
    const cs = getComputedStyle(e);
    return { x: d(r.left), y: d(r.top), w: d(r.width), h: d(r.height), b: d(r.bottom), display: cs.display, position: cs.position };
  });
const barra = (p) => p.locator("[data-vista] > header");
const nav = (p) => p.locator("nav[aria-label=Secciones]");
const cabecera = (p) => p.locator("main header");
const bajar = async (p, y) => {
  await p.evaluate((v) => window.scrollTo(0, v), y);
  await p.waitForTimeout(600);
};

test("el layout pone data-vista según la ruta: raíz, ficha, tarea o pantalla completa", async (t) => {
  const p = await pagina(t);
  for (const [ruta, vista] of [["/", "raiz"], ["/agenda", "raiz"], ["/perfil", "raiz"], ["/eventos/concierto", "ficha"], ["/personas/8f1c", "ficha"], ["/nuevo", "tarea"], ["/ajustes", "tarea"], ["/obra/4d2e/pared", "completa"], ["/artistas/aaron/letrero", "completa"]]) {
    await ir(p, ruta);
    assert.equal(await p.locator("[data-vista]").getAttribute("data-vista"), vista, ruta);
  }
});

test("teléfono: la raíz lleva la barra (56) y la navegación (60); las demás vistas, ninguna", async (t) => {
  const p = await pagina(t);
  await ir(p, "/agenda");
  const b = await caja(barra(p));
  const n = await caja(nav(p));
  assert.deepEqual([b.y, b.h, n.y, n.h], [0, 56, 784, 60]);
  assert.equal((await caja(cabecera(p))).y, 56, "la fila de contexto va pegada bajo la barra");
  for (const ruta of ["/eventos/concierto", "/nuevo", "/obra/4d2e/pared"]) {
    await ir(p, ruta);
    assert.equal((await caja(barra(p))).display, "none", `${ruta}: sin barra de la app`);
    assert.equal((await caja(nav(p))).display, "none", `${ruta}: sin navegación`);
  }
});

test("teléfono: al bajar la barra sube, la navegación baja y la fila queda arriba; al subir un poco vuelven", async (t) => {
  const p = await pagina(t);
  await ir(p, "/agenda");
  await bajar(p, 900);
  assert.equal(await p.locator("[data-vista]").getAttribute("data-recogida"), "");
  assert.deepEqual([(await caja(barra(p))).y, (await caja(nav(p))).y, (await caja(cabecera(p))).y], [-56, 844, 0], "barra fuera por arriba, navegación fuera por abajo y la fila en el borde");
  assert.equal(await barra(p).evaluate((e) => getComputedStyle(e).visibility), "hidden", "lo recogido no se toca ni se lee");
  await p.waitForTimeout(400);
  await p.evaluate(() => window.scrollBy(0, -40));
  await p.waitForTimeout(600);
  assert.equal(await p.locator("[data-vista]").getAttribute("data-recogida"), null);
  assert.deepEqual([(await caja(barra(p))).y, (await caja(nav(p))).y, (await caja(cabecera(p))).y], [0, 784, 56]);
});

test("teléfono: al llegar al final vuelven, y cada pantalla nueva empieza con todo a la vista", async (t) => {
  const p = await pagina(t);
  await ir(p, "/agenda");
  await bajar(p, 900);
  await bajar(p, 99999);
  assert.equal(await p.locator("[data-vista]").getAttribute("data-recogida"), null, "en el final la navegación está a mano");
  await bajar(p, 0);
  await bajar(p, 900);
  assert.equal(await p.locator("[data-vista]").getAttribute("data-recogida"), "");
  await ir(p, "/lugares");
  assert.equal(await p.locator("[data-vista]").getAttribute("data-recogida"), null, "otra pantalla, la barra a la vista");
});

test("teléfono: la hoja de Lugares llena esconde la navegación; con la lista la barra sigue su desplazamiento y con la ficha se va entera", async (t) => {
  const p = await pagina(t);
  await ir(p, "/lugares");
  const avisa = (aviso) => p.evaluate((a) => window.dispatchEvent(new CustomEvent("armazon:hoja", { detail: a })), aviso);
  const atributo = (nombre) => p.locator("[data-vista]").getAttribute(nombre);
  // La lista llena, al principio: la navegación se va y la barra sigue a la vista, con la fila bajo ella.
  await avisa({ llena: true, pagina: false, y: 0, alFinal: false });
  await p.waitForTimeout(400);
  assert.equal(await atributo("data-llena"), "");
  assert.equal(await atributo("data-recogida"), null, "llena no recoge la barra por sí sola");
  assert.deepEqual([(await caja(barra(p))).y, (await caja(nav(p))).y, (await caja(cabecera(p))).y], [0, 844, 56], "barra y fila a la vista, navegación fuera por abajo");
  // Bajar la lista: la barra se recoge y la fila queda arriba; subir un poco: vuelve. La navegación sigue fuera.
  await avisa({ llena: true, pagina: false, y: 200, alFinal: false });
  await p.waitForTimeout(400);
  assert.equal(await atributo("data-recogida"), "");
  assert.deepEqual([(await caja(barra(p))).y, (await caja(nav(p))).y], [-56, 844]);
  await avisa({ llena: true, pagina: false, y: 180, alFinal: false });
  await p.waitForTimeout(400);
  assert.equal(await atributo("data-recogida"), null, "al subir un poco la barra vuelve");
  assert.equal((await caja(nav(p))).y, 844, "y la navegación sigue fuera mientras la hoja llene");
  // Bajar de nuevo y llegar al final de la lista: vuelve, como al final de una página.
  await avisa({ llena: true, pagina: false, y: 400, alFinal: false });
  await p.waitForTimeout(400);
  assert.equal(await atributo("data-recogida"), "");
  await avisa({ llena: true, pagina: false, y: 700, alFinal: true });
  assert.equal(await atributo("data-recogida"), null, "en el final de la lista la barra está a mano");
  // Dejar de llenarla: todo vuelve.
  await avisa({ llena: false });
  await p.waitForTimeout(400);
  assert.equal(await atributo("data-llena"), null);
  assert.equal((await caja(nav(p))).y, 784, "la navegación vuelve");
  // La ficha es una página: llena, se va la barra entera, sin esperar a que se desplace; al dejar de llenarla vuelve.
  await avisa({ llena: true, pagina: true, y: 0, alFinal: false });
  await p.waitForTimeout(400);
  assert.equal(await atributo("data-recogida"), "");
  assert.deepEqual([(await caja(barra(p))).y, (await caja(nav(p))).y], [-56, 844]);
  await avisa({ llena: false });
  await p.waitForTimeout(400);
  assert.equal(await atributo("data-recogida"), null);
  assert.equal(await atributo("data-llena"), null);
  // Lo que la hoja llena escondió no se queda escondido en la pantalla que sigue.
  await avisa({ llena: true, pagina: true, y: 0, alFinal: false });
  await ir(p, "/agenda");
  assert.equal(await atributo("data-recogida"), null, "otra pantalla, la barra a la vista");
});

test("la barra: cada botón de la barra y de la navegación se toca en 44×44 como mínimo", async (t) => {
  const p = await pagina(t);
  await ir(p, "/agenda");
  const medidas = await p.locator("[data-vista] > header a, [data-vista] > header button, nav[aria-label=Secciones] a").evaluateAll((els) => els.map((e) => ({ n: e.getAttribute("aria-label") || e.textContent.trim(), w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height) })));
  assert.equal(medidas.length, 4 + 5, "«+», logotipo, lupa, campana y los cinco destinos");
  for (const m of medidas) assert.ok(m.w >= 44 && m.h >= 44, `${m.n}: ${m.w}×${m.h}`);
});

test("la barra: el logotipo queda en el centro exacto con sesión, sin ella (ni «Entrar» ni campana) y con la llave de administración, a 390 y a 320", async (t) => {
  for (const ancho of [390, 320]) {
    for (const sesion of ["campana", "sin-sesion", "admin"]) {
      const p = await pagina(t, ancho, 844, `?sesion=${sesion}`);
      await ir(p, "/agenda");
      const logo = await caja(barra(p).locator("a[aria-label^='Somos Nosotros']"));
      const mas = await caja(barra(p).locator("a[aria-label='Publicar un evento']"));
      const lupa = await caja(barra(p).locator("a[aria-label='Buscar']"));
      const cuando = `${ancho} · ${sesion}`;
      assert.ok(Math.abs(logo.x + logo.w / 2 - ancho / 2) <= 0.5, `${cuando}: centro del logotipo en ${logo.x + logo.w / 2}`);
      assert.ok(mas.x + mas.w <= logo.x + 1 && logo.x + logo.w <= lupa.x + 1, `${cuando}: el logotipo no pisa al «+» ni a la lupa`);
      // Sin sesión la celda queda vacía: la barra no ofrece «Entrar» (el acceso está en Perfil y al seguir o marcar «Voy»).
      assert.equal(await barra(p).locator("a[href='/entrar']").count(), 0, `${cuando}: la barra no lleva «Entrar»`);
      assert.equal(await barra(p).locator("a[aria-label^='Novedades']").count(), sesion === "sin-sesion" ? 0 : 1, `${cuando}: la campana solo con sesión`);
    }
  }
});

test("la fila de contexto: el relleno blanco de 300 px sobre ella no tapa la barra", async (t) => {
  const p = await pagina(t);
  await ir(p, "/agenda");
  const r = await cabecera(p).evaluate((e) => {
    const s = getComputedStyle(e, "::before");
    const lupa = document.querySelector("[data-vista] > header a[aria-label='Buscar']").getBoundingClientRect();
    return { alto: s.height, fondo: s.backgroundColor, eventos: s.pointerEvents, encima: document.elementFromPoint(lupa.left + lupa.width / 2, lupa.top + lupa.height / 2)?.closest("a")?.getAttribute("aria-label") };
  });
  assert.deepEqual(r, { alto: "300px", fondo: "rgb(255, 255, 255)", eventos: "none", encima: "Buscar" });
});

test("desde 792: la barra está en las fichas y las tareas, con Atrás y el menú solo en la ficha; en la pantalla completa no; no se recoge", async (t) => {
  const p = await pagina(t, 1280, 800);
  await ir(p, "/agenda");
  assert.deepEqual((({ y, h }) => [y, h])(await caja(barra(p))), [0, 56]);
  await bajar(p, 900);
  assert.deepEqual([(await caja(barra(p))).y, (await caja(cabecera(p))).y], [0, 56], "la barra no se recoge");
  const lupa = (await caja(barra(p).locator("a[aria-label='Buscar']"))).x;
  const campana = (await caja(barra(p).locator("a[aria-label='Novedades']"))).x;
  await ir(p, "/eventos/concierto");
  const botones = await barra(p).locator("a, button").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
  assert.ok(botones.includes("Atrás (Agenda)") && botones.includes("Más acciones"), `${botones}`);
  const logo = await caja(barra(p).locator("a[aria-label^='Somos Nosotros']"));
  assert.ok(Math.abs(logo.x + logo.w / 2 - 640) <= 0.5, "el logotipo, al centro de la ventana");
  assert.deepEqual([(await caja(barra(p).locator("a[aria-label='Buscar']"))).x, (await caja(barra(p).locator("a[aria-label='Novedades']"))).x], [lupa, campana], "la lupa y la campana no se mueven cuando llegan Atrás y el menú");
  await ir(p, "/nuevo");
  assert.equal((await caja(barra(p))).display, "grid");
  assert.equal(await barra(p).locator("a[aria-label^='Atrás']").count(), 0, "las tareas no traen Atrás en la barra de la app");
  await ir(p, "/obra/4d2e/pared");
  assert.equal((await caja(barra(p))).display, "none");
});

test("desde 792: en una ficha el logotipo sigue al centro sin sesión y con la llave de administración, con Atrás y el menú a la vista", async (t) => {
  for (const sesion of ["entrar", "admin"]) {
    const p = await pagina(t, 1280, 800, `?sesion=${sesion}`);
    await ir(p, "/eventos/concierto");
    const logo = await caja(barra(p).locator("a[aria-label^='Somos Nosotros']"));
    assert.ok(Math.abs(logo.x + logo.w / 2 - 640) <= 0.5, `${sesion}: centro del logotipo en ${logo.x + logo.w / 2}`);
    assert.equal(await barra(p).locator("a[aria-label^='Atrás'], button[aria-label='Más acciones']").count(), 2, `${sesion}: Atrás y el menú a la vista`);
  }
});

test("una tarea lleva su título en el centro de la cabecera y no el logotipo: en el teléfono no hay ninguno; desde 792 el único es el de la barra de la app", async (t) => {
  const logotipos = (p) => p.locator("a[aria-label^='Somos Nosotros']:visible");
  const titulo = (p) => p.getByRole("heading", { name: "Publicar un evento" });
  const centro = async (p) => {
    const c = await caja(titulo(p));
    return c.x + c.w / 2;
  };
  const telefono = await pagina(t, 390, 844);
  await ir(telefono, "/nuevo");
  assert.equal(await logotipos(telefono).count(), 0, "teléfono: ni el de la barra de la app ni uno en la cabecera de la tarea");
  assert.ok(Math.abs((await centro(telefono)) - 195) <= 0.5, "teléfono: el título, al centro de la ventana");
  assert.equal(await telefono.locator("a[aria-label^='Cerrar']:visible").count(), 1, "y la ✕ de la cabecera");
  const escritorio = await pagina(t, 1280, 800);
  await ir(escritorio, "/nuevo");
  assert.equal(await logotipos(escritorio).count(), 1);
  assert.equal(await barra(escritorio).locator("a[aria-label^='Somos Nosotros']:visible").count(), 1, "escritorio: el de la barra de la app");
  assert.ok(Math.abs((await centro(escritorio)) - (88 + 296 + 300)) <= 0.5, "escritorio: el título, al centro de la columna de 600");
  assert.equal(await escritorio.locator("a[aria-label^='Cerrar']:visible").count(), 1, "y la cabecera de la tarea conserva su ✕");
});

// ---- Desde 792, el carril (OL-236) ----

const destinos = (p) => nav(p).locator("a");
const hrefs = (p) => destinos(p).evaluateAll((els) => els.map((e) => e.getAttribute("href")));
/** Dónde queda, y de qué ancho, lo que la pantalla pinta con el aire de página (`--gutter`). */
const columna = (p) =>
  p.locator("[data-gutter]").evaluate((e) => {
    const r = e.getBoundingClientRect();
    return [Math.round(r.left), Math.round(r.width)];
  });

test("teléfono: la navegación es la barra de abajo, de borde a borde, con las cinco secciones en fila", async (t) => {
  const p = await pagina(t);
  await ir(p, "/agenda");
  const n = await caja(nav(p));
  assert.deepEqual([n.x, n.w, n.h, n.position], [0, 390, 60, "fixed"]);
  const filas = await destinos(p).evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
  assert.equal(new Set(filas).size, 1, `los cinco destinos, en la misma fila: ${filas}`);
  assert.equal(await destinos(p).count(), 5);
});

test("desde 792: la navegación es un carril de 88 bajo la barra, del alto de la ventana, con las cuatro secciones arriba y Perfil abajo", async (t) => {
  for (const [ancho, alto] of [[820, 1180], [1280, 800]]) {
    const p = await pagina(t, ancho, alto);
    await ir(p, "/agenda");
    const n = await caja(nav(p));
    assert.deepEqual([n.x, n.y, n.w, n.h, n.position], [0, 56, 88, alto - 56, "sticky"], `${ancho}: de la barra al pie de la ventana`);
    assert.deepEqual(await hrefs(p), ["/", "/agenda", "/lugares", "/artistas", "/perfil"]);
    const cajas = await destinos(p).evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }));
    for (const c of cajas) assert.ok(c.w === 72 && c.h >= 44 && Math.abs(c.x + c.w / 2 - 44) <= 0.5, `${ancho}: cada destino, en el centro del carril y a 44 como mínimo: ${JSON.stringify(c)}`);
    assert.ok(cajas.slice(0, 4).every((c, i) => i === 0 || c.y > cajas[i - 1].y + cajas[i - 1].h - 1), `${ancho}: las cuatro secciones, una bajo otra`);
    assert.ok(cajas[3].y + cajas[3].h < alto / 2, `${ancho}: las cuatro, arriba`);
    assert.ok(Math.abs(cajas[4].y + cajas[4].h + 16 - alto) <= 1, `${ancho}: Perfil, al pie del carril`);
    const pantalla = await caja(p.locator("[data-vista] > div"));
    assert.deepEqual([pantalla.x, pantalla.w], [88, ancho - 88], `${ancho}: la pantalla es el resto de la rejilla`);
  }
});

test("desde 792: el carril no se guarda al bajar, sigue en las fichas y las tareas, y la pantalla completa no lo trae", async (t) => {
  const p = await pagina(t, 1280, 800);
  await ir(p, "/agenda");
  await bajar(p, 900);
  assert.equal(await p.locator("[data-vista]").getAttribute("data-recogida"), null, "en escritorio nada se recoge");
  for (const ruta of ["/agenda", "/eventos/concierto", "/nuevo"]) {
    await ir(p, ruta);
    const n = await caja(nav(p));
    assert.deepEqual([n.x, n.y, n.w, n.h], [0, 56, 88, 744], `${ruta}: el carril sigue a la vista con la página desplazada`);
  }
  await ir(p, "/obra/4d2e/pared");
  assert.equal((await caja(nav(p))).display, "none", "pantalla completa: sin carril");
  assert.equal((await caja(barra(p))).display, "none", "pantalla completa: sin barra");
  assert.deepEqual((({ x, w }) => [x, w])(await caja(p.locator("[data-vista] > div"))), [0, 1280], "pantalla completa: la pantalla se queda con toda la ventana");
});

test("el aire de página se mide sobre la pantalla: sin el carril queda centrado; las raíces y las fichas usan 960 desde 1048 y lo demás 600", async (t) => {
  const p = await pagina(t, 390, 844);
  await ir(p, "/agenda");
  assert.deepEqual(await columna(p), [20, 350], "teléfono: 20 a cada lado");
  await p.setViewportSize({ width: 820, height: 1180 });
  assert.deepEqual(await columna(p), [88 + 66, 600], "820: la columna de 600 en el centro de lo que deja el carril");
  await p.setViewportSize({ width: 1060, height: 800 });
  assert.deepEqual(await columna(p), [88 + 20, 1060 - 88 - 40], "1060: la columna ancha aún no cabe entera, queda el aire mínimo");
  await p.setViewportSize({ width: 1280, height: 800 });
  for (const [ruta, esperado] of [["/agenda", [88 + 116, 960]], ["/eventos/concierto", [88 + 116, 960]], ["/nuevo", [88 + 296, 600]], ["/obra/4d2e/pared", [340, 600]]]) {
    await ir(p, ruta);
    assert.deepEqual(await columna(p), esperado, ruta);
  }
});

test("la barra y la navegación solo se recogen en el teléfono: una ventana que crece hasta 792 las trae de vuelta y ya no se recogen", async (t) => {
  const p = await pagina(t, 390, 844);
  await ir(p, "/agenda");
  await bajar(p, 900);
  assert.equal(await p.locator("[data-vista]").getAttribute("data-recogida"), "");
  await p.setViewportSize({ width: 1280, height: 800 });
  await p.waitForTimeout(300);
  assert.equal(await p.locator("[data-vista]").getAttribute("data-recogida"), null, "la ventana creció: nada recogido");
  assert.deepEqual([(await caja(barra(p))).y, (await caja(nav(p))).y], [0, 56]);
  await bajar(p, 1500);
  assert.equal(await p.locator("[data-vista]").getAttribute("data-recogida"), null, "con el carril, bajar no recoge nada");
});

test("lo que se pinta fijo (el aviso con Deshacer y volver arriba) pasa el carril: nace en el borde de la columna y, sin barra de abajo, a 12 y 16 del pie", async (t) => {
  // `pie`: lo que ocupa la navegación de abajo con la página arriba (60 en el teléfono, nada con el carril).
  for (const [ancho, alto, izquierda, pie] of [[390, 844, 20, 60], [820, 1180, 88 + 66, 0], [1280, 800, 88 + 116, 0]]) {
    const p = await pagina(t, ancho, alto, "?hecho=1");
    await ir(p, "/agenda");
    const aviso = await caja(p.locator("p[role=status]"));
    assert.deepEqual([aviso.x, aviso.b], [izquierda, alto - pie - 12], `${ancho}: el aviso, en la columna y sobre la navegación de abajo si la hay`);
    assert.equal(aviso.w, ancho < 792 ? ancho - 2 * izquierda : 420, `${ancho}: en el teléfono llena la columna; desde 792 no se estira`);
    await bajar(p, 1500);
    const volver = await caja(p.locator("button[aria-label='Volver arriba']"));
    assert.deepEqual([volver.x, volver.b], [izquierda, alto - 16], `${ancho}: volver arriba, en la columna y a 16 del pie (en el teléfono, con la navegación ya recogida)`);
  }
});
