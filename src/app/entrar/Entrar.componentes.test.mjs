/** Prueba de componente de Atrás tras entrar (ajuste 6 del founder, 2026-10-01): `FormularioEntrar`, `Atrás` (`useVolver`) y `Navegacion` reales, con un
 *  «router» de mentira sobre el historial del navegador (lo que hace Next.js con `pushState` y `replaceState`) y un servidor que repite la cadena de verdad
 *  de entrar con un proveedor: `/auth/apple` redirige a una página de otro dominio (el proveedor de mentira), esa vuelve a `/auth/callback`, que pone la
 *  sesión y redirige al destino (limpiando `?accion=`, como hace la pantalla de destino). Es una cadena de cargas completas en Chrome, así que el historial
 *  es el real. Por cada caso mide dónde queda la persona al tocar Atrás tras entrar con un proveedor (con uno o dos saltos dentro del proveedor) y con el
 *  código por correo: Voy desde la ficha, Seguir desde una lista y desde la ficha, el «+», Novedades y Perfil. Tras volver del proveedor, `Navegacion`
 *  retrocede con `history.go` hasta la pantalla de origen (o hasta Entrar, que con sesión redirige al destino): el historial queda como antes de salir,
 *  sin las páginas del proveedor, y por eso Atrás —con el botón o con el gesto— lleva a la pantalla de antes y, otra vez, a la que había antes de la app.
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
let browser, server, dir, origen, externo;

const mocks = {
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link(p){const {prefetch,...r}=p;return React.createElement('a',r)}",
  // El router de Next.js, reducido a lo que toca el historial: apilar, reemplazar, volver y releer. Una entrada que `Navegacion` repone (`_N`) la recarga entera, como Next.js.
  "next/navigation": `
    import { useSyncExternalStore } from 'react';
    const suscritos = new Set();
    const notificar = () => suscritos.forEach((f) => f());
    window.addEventListener('popstate', () => { if (history.state && history.state._N) location.reload(); else notificar(); });
    const router = {
      push(url) { history.pushState({ __NA: true }, '', url); notificar(); },
      replace(url) { history.replaceState({ __NA: true }, '', url); notificar(); },
      back() { history.back(); },
      refresh() { notificar(); },
    };
    window.__router = router;
    export const useRouter = () => router;
    const actual = () => location.pathname + location.search;
    const suscribir = (f) => { suscritos.add(f); return () => suscritos.delete(f); };
    export const usePathname = () => { useSyncExternalStore(suscribir, actual); return location.pathname; };
    export const useSearchParams = () => { useSyncExternalStore(suscribir, actual); return new URLSearchParams(location.search); };
  `,
  // Lo único que usa el formulario de la lógica de proveedores (la demás es de servidor y usa node:crypto).
  "@/lib/entrarCon": "export const NOMBRE_PROVEEDOR = { apple: 'Apple', google: 'Google' }",
  // El navegador de Supabase: entrar con el código pone la sesión (una cookie) como lo haría el servidor.
  "@/lib/supabase/navegador": "export function clienteNavegador(){return {auth:{signInWithOtp:async()=>({error:null}),verifyOtp:async()=>{document.cookie='sesion=1; path=/';return {error:null}}}}}",
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "entrar-componentes-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';import {usePathname, useSearchParams} from 'next/navigation';
      import Navegacion from './src/components/Navegacion';import Atras from './src/components/ui/Atras';import FormularioEntrar from './src/app/entrar/FormularioEntrar';
      import './src/app/globals.css';
      // Lo que ya hace Next.js al arrancar: escribe su estado sobre la entrada.
      history.replaceState({ __NA: true }, '', location.href);
      const sesion = () => document.cookie.includes('sesion=1');
      window.qa = { ir: (url) => window.__router.push(url) };
      function Pantalla() {
        const ruta = usePathname();
        const p = useSearchParams();
        if (ruta === '/entrar') return <main><h1>Entrar</h1><FormularioEntrar siguiente={p.get('siguiente') ?? '/perfil'} proveedores={['apple']} largo={8} /></main>;
        return (
          <main>
            <h1 data-ruta>{ruta}</h1>
            <p>{sesion() ? 'con sesión' : 'sin sesión'}</p>
            {ruta !== '/agenda' && <Atras href="/" texto="Inicio" />}
          </main>
        );
      }
      createRoot(document.getElementById('root')).render(<><Navegacion /><Pantalla /></>);
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
  const aplicacion = ["text/javascript", await readFile(join(dir, "app.js"))];
  const estilos = ["text/css", await readFile(join(dir, "app.css"))];
  const html = ["text/html", '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--fuente-bricolage:Arial}</style><div id="root"></div><script src="/app.js"></script>'];
  server = createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    const enviar = (tipo, cuerpo, extra = {}) => {
      res.writeHead(200, { "Content-Type": `${tipo}; charset=utf-8`, ...extra });
      res.end(cuerpo);
    };
    const redirigir = (a, extra = {}) => {
      res.writeHead(303, { Location: a, ...extra });
      res.end();
    };
    // Apple de mentira, en otro dominio (localhost): `saltos` páginas propias antes de volver, como las de Apple.
    if (url.pathname === "/apple") {
      const saltos = Number(url.searchParams.get("saltos") ?? 1);
      const paso = Number(url.searchParams.get("paso") ?? 1);
      const siguiente = url.searchParams.get("siguiente");
      const a = paso < saltos ? `${externo}/apple?saltos=${saltos}&paso=${paso + 1}&siguiente=${encodeURIComponent(siguiente)}` : `${origen}/auth/callback?siguiente=${encodeURIComponent(siguiente)}`;
      return enviar("text/html", `<!doctype html><title>Apple de mentira</title><p>Apple, paso ${paso}</p><script>setTimeout(() => location.href = ${JSON.stringify(a)}, 60)</script>`);
    }
    if (url.pathname === "/auth/apple") return redirigir(`${externo}/apple?saltos=${url.searchParams.get("saltos") ?? 1}&siguiente=${encodeURIComponent(url.searchParams.get("siguiente"))}`);
    if (url.pathname === "/auth/callback") {
      // La pantalla de destino aplica la intención y se redirige a su dirección limpia.
      const destino = new URL(url.searchParams.get("siguiente"), origen);
      destino.searchParams.delete("accion");
      return redirigir(`${destino.pathname}${destino.search}`, { "Set-Cookie": "sesion=1; Path=/" });
    }
    // Entrar con la sesión puesta redirige al destino, como la pantalla de Entrar (que además limpia la intención al aplicarla).
    if (url.pathname === "/entrar" && (req.headers.cookie ?? "").includes("sesion=1")) {
      const destino = new URL(url.searchParams.get("siguiente") ?? "/perfil", origen);
      destino.searchParams.delete("accion");
      return redirigir(`${destino.pathname}${destino.search}`);
    }
    // La vuelta de Apple en la app de iPhone: el envoltorio carga esta dirección a mano; canjea el enlace (la sesión) y sigue al destino.
    if (url.pathname === "/auth/app-regreso") return redirigir(url.searchParams.get("siguiente"), { "Set-Cookie": "sesion=1; Path=/" });
    // La pantalla de destino con la intención puesta se redirige a su dirección limpia con una carga completa (quita `?accion=`).
    if (url.pathname.startsWith("/eventos/") && url.searchParams.has("accion")) return enviar(html[0], html[1] + "<script>location.replace(location.pathname)</script>");
    if (url.pathname === "/app.js") return enviar(...aplicacion);
    if (url.pathname === "/app.css") return enviar(...estilos);
    return enviar(...html);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  origen = `http://127.0.0.1:${server.address().port}`;
  externo = `http://localhost:${server.address().port}`;
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE });
});
after(async () => {
  await browser?.close();
  if (server) await new Promise((r) => server.close(r));
  if (dir) await rm(dir, { recursive: true, force: true });
});

/**
 * Lo que hace `GestoAtrasPlugin.swift` en la app de iPhone: todo retroceso que cruza de un documento a otro se cancela (y avisa a la web). Aquí se anota
 * (`window.__cruces`) y, donde el navegador deja, se cancela: un Atrás que dependa de él se queda sin efecto, como en la app.
 */
const CANCELA_RETROCESOS_ENTRE_DOCUMENTOS = `
  window.__cruces = JSON.parse(sessionStorage.getItem('qa_cruces') ?? '0');
  navigation.addEventListener('navigate', (e) => {
    if (e.navigationType !== 'traverse' || e.destination.sameDocument) return;
    sessionStorage.setItem('qa_cruces', String(++window.__cruces));
    if (e.cancelable) e.preventDefault();
  });
`;

/** Cada caso: por dónde llega la persona a la pantalla de origen (desde Agenda), a dónde iba y a dónde debe llevar Atrás tras entrar. */
const CASOS = [
  { nombre: "Voy en la ficha de un evento", camino: ["/eventos/x"], siguiente: "/eventos/x?accion=voy", destino: "/eventos/x", atras: "/agenda" },
  { nombre: "Me interesa en la ficha de un evento", camino: ["/eventos/x"], siguiente: "/eventos/x?accion=me_interesa", destino: "/eventos/x", atras: "/agenda" },
  { nombre: "Seguir un lugar desde la lista de Lugares", camino: ["/lugares"], siguiente: "/lugares/7?accion=seguir", destino: "/lugares/7", atras: "/lugares" },
  { nombre: "Seguir un lugar desde su ficha", camino: ["/lugares", "/lugares/7"], siguiente: "/lugares/7?accion=seguir", destino: "/lugares/7", atras: "/lugares" },
  { nombre: "Seguir un artista desde su ficha", camino: ["/artistas", "/artistas/pimpolina"], siguiente: "/artistas/pimpolina?accion=seguir", destino: "/artistas/pimpolina", atras: "/artistas" },
  { nombre: "el «+» para publicar", camino: [], siguiente: "/nuevo?tipo=evento", destino: "/nuevo", atras: "/agenda" },
  { nombre: "Novedades (la campana)", camino: ["/novedades"], siguiente: "/novedades", destino: "/novedades", atras: "/agenda" },
  { nombre: "Perfil", camino: [], siguiente: "/perfil", destino: "/perfil", atras: "/agenda" },
];

async function llegarAEntrar(caso, contexto = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, ...contexto });
  if (contexto.userAgent) await context.addInitScript(CANCELA_RETROCESOS_ENTRE_DOCUMENTOS);
  const page = await context.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await page.goto(`${origen}/agenda`);
  await page.waitForSelector("[data-ruta]");
  for (const paso of caso.camino) {
    await page.evaluate((url) => window.qa.ir(url), paso);
    await page.waitForFunction((r) => document.querySelector("[data-ruta]")?.textContent === r, paso);
  }
  // Lo que hace el botón (Voy, Seguir, el «+»…) sin sesión: apila Entrar con el destino y la intención.
  await page.evaluate((s) => window.qa.ir(`/entrar?siguiente=${encodeURIComponent(s)}`), caso.siguiente);
  await page.getByRole("heading", { name: "Entrar" }).waitFor();
  await page.waitForTimeout(150); // el apunte se hace al llegar
  return { context, page, errores };
}

const rutaActual = (page) => page.evaluate(() => location.pathname);
/** Espera a que la pantalla (de ruta `ruta`) esté pintada. */
const enPantalla = (page, ruta) => page.waitForFunction((r) => document.querySelector("[data-ruta]")?.textContent === r, ruta, { timeout: 8000 });

/** Espera a que termine el retroceso de la vuelta (el apunte y el aterrizaje, gastados) y a que `ruta` esté pintada. Las cargas de por medio destruyen el contexto de la página: se reintenta. */
async function esperarAterrizaje(page, ruta) {
  const limite = Date.now() + 12000;
  let quieto = 0;
  while (Date.now() < limite) {
    try {
      const listo = await page.evaluate((r) => !sessionStorage.getItem("sn_rebobinado") && !sessionStorage.getItem("sn_vuelta") && document.querySelector("[data-ruta]")?.textContent === r, ruta);
      quieto = listo ? quieto + 1 : 0;
      if (quieto >= 5) return; // 5 lecturas seguidas (un segundo): no hay más cargas en camino
    } catch {
      quieto = 0;
    }
    await new Promise((ok) => setTimeout(ok, 200));
  }
  assert.fail(`el aterrizaje no terminó en ${ruta}`);
}

/** Volver: con el botón Atrás de la app, o con el gesto del navegador (el deslizar desde el borde del iPhone, el botón de Safari). */
async function volver(page, via) {
  if (via === "botón") await page.getByRole("button", { name: /Atrás/ }).or(page.getByRole("link", { name: /Atrás/ })).first().click();
  else await page.goBack({ waitUntil: "domcontentloaded" });
}

for (const caso of CASOS) {
  for (const via of ["botón", "gesto"]) {
    for (const saltos of [1, 2]) {
      test(`${caso.nombre}, con un proveedor (${saltos} ${saltos === 1 ? "página propia" : "páginas propias"}): tras volver, Atrás (${via}) lleva a ${caso.atras}`, async () => {
        const { context, page, errores } = await llegarAEntrar(caso);
        await page.evaluate((n) => {
          for (const a of document.querySelectorAll('a[href^="/auth/apple"]')) a.href += `&saltos=${n}`;
        }, saltos);
        await page.getByRole("link", { name: /Continuar con Apple/ }).click();
        await page.waitForURL(`${origen}${caso.destino}*`, { timeout: 10000 });
        await enPantalla(page, caso.destino);
        // La vuelta retrocede por su cuenta hasta la pantalla de origen (o Entrar) y de ahí llega de nuevo al destino: se espera a que termine.
        await esperarAterrizaje(page, caso.destino);
        assert.equal(await page.getByText("con sesión").count(), 1, "vuelve con la sesión puesta");
        // Atrás lleva a la pantalla de antes de la tarea y nunca se queda: ni en el destino, ni en la pantalla de Entrar, ni en la del proveedor.
        await volver(page, via);
        await enPantalla(page, caso.atras);
        assert.equal(await rutaActual(page), caso.atras);
        // Y otro Atrás no entra a las páginas del proveedor ni a Entrar: el historial es el de antes de salir (Agenda venía de una página en blanco).
        if (caso.atras === "/agenda") {
          await page.goBack({ waitUntil: "domcontentloaded" });
          await page.waitForURL("about:blank", { timeout: 8000 });
        }
        assert.deepEqual(errores, []);
        await context.close();
      });
    }
    test(`${caso.nombre}, con el código por correo: Atrás (${via}) lleva a ${caso.atras}`, async () => {
      const { context, page, errores } = await llegarAEntrar(caso);
      await page.getByRole("button", { name: /Continuar con tu correo/ }).click();
      await page.getByLabel("Tu correo").fill("ana@example.com");
      await page.getByRole("button", { name: "Mandarme el código" }).click();
      await page.getByLabel(/Código de 8/).fill("12345678");
      await enPantalla(page, caso.destino);
      assert.equal(await page.getByText("con sesión").count(), 1);
      await volver(page, via);
      await enPantalla(page, caso.atras);
      assert.equal(await rutaActual(page), caso.atras);
      assert.deepEqual(errores, []);
      await context.close();
    });
  }
}

test("la app de iPhone, Voy desde una ficha: la vuelta cargada a mano (sin páginas de proveedor) deja a Atrás llevar a Agenda y, desde un lugar abierto después, a la ficha", async () => {
  const caso = CASOS[0];
  const { context, page, errores } = await llegarAEntrar(caso, { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 SomosNosotrosApp" });
  // Lo que hace el envoltorio: la ida a Apple no entra al historial; al volver carga la vuelta a mano en el mismo WebView (una carga completa más).
  await page.goto(`${origen}/auth/app-regreso?token_hash=x&siguiente=${encodeURIComponent(caso.siguiente)}`);
  await page.waitForURL(`${origen}/eventos/x`, { timeout: 10000 });
  await enPantalla(page, "/eventos/x");
  await page.waitForTimeout(500); // la segunda carga (la dirección limpia) y lo que sigue
  assert.equal(await page.getByText("con sesión").count(), 1, "vuelve con la sesión puesta");
  assert.equal(await page.evaluate(() => sessionStorage.getItem("sn_rebobinado")), null, "no queda ningún estado de rebobinado");
  // Un lugar abierto después es de este documento: Atrás vuelve a la ficha con el historial.
  await page.evaluate(() => window.qa.ir("/lugares/7"));
  await enPantalla(page, "/lugares/7");
  await volver(page, "botón");
  await enPantalla(page, "/eventos/x");
  // Y desde la ficha, Atrás no depende del historial de otro documento (que el envoltorio cancela): va a la pantalla de antes de entrar.
  await volver(page, "botón");
  await enPantalla(page, "/agenda");
  assert.equal(await page.evaluate(() => Number(sessionStorage.getItem("qa_cruces") ?? 0)), 0, "ningún retroceso cruzó a otro documento");
  assert.deepEqual(errores, []);
  await context.close();
});
