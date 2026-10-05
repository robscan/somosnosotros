/** OL-270: componentes reales y ubicación real contra navegador simulado; ninguna llamada de red ni geocodificación. */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../", import.meta.url));
const SLP = { slug: "san-luis-potosi", nombre: "San Luis Potosí", centro: { lat: 22.1497, lng: -100.9764 }, centroConocido: true, zoom: 13, lugares: 63, eventos: 138, zona: "America/Mexico_City" };
const QRO = { ...SLP, slug: "queretaro", nombre: "Querétaro", centro: { lat: 20.59, lng: -100.39 }, lugares: 3, eventos: 3 };
const GDL = { ...SLP, slug: "guadalajara", nombre: "Guadalajara", centro: { lat: 20.67, lng: -103.35 }, lugares: 1, eventos: 1 };
const AGS = { ...SLP, slug: "aguascalientes", nombre: "Aguascalientes", lugares: 0, eventos: 1, centroConocido: false };
const artistas = [SLP, QRO, GDL, ...Array.from({ length: 10 }, (_, i) => ({ ...SLP, slug: `otra-${i}`, nombre: `Ciudad cultural con nombre muy largo ${i}` }))].map(c => ({ ...c, artistas: 1 }));
let browser, server, dir, origin;
before(async () => {
  dir = await mkdtemp(join(tmpdir(), "ciudad-componentes-"));
  const mocks = {
    "next/link": "import React from 'react';export const useLinkStatus=()=>({pending:false});export default function Link({children,replace,...p}){return React.createElement('a',p,children)}",
    "next/navigation": "const router={replace:(href)=>{window.qa.replaces.push(href);history.replaceState(null,'',href);window.elegirDesdeRouter?.()}};export const useRouter=()=>router;export const usePathname=()=>location.pathname;export const useSearchParams=()=>new URLSearchParams(location.search);",
    "@/app/lugares/acciones": "export const cambiarSeguimiento=()=>new Promise(r=>window.qa.completarSeguir=r);",
    "@/app/artistas/acciones": "export const cambiarSeguimientoArtista=async()=>true;",
    "./ConsentimientoAvisos": "export default function ConsentimientoAvisos(){return null}",
  };
  await build({
    absWorkingDir: root, bundle: true, outfile: join(dir, "app.js"), define: { "process.env.NODE_ENV": '"development"' },
    stdin: { resolveDir: root, loader: "tsx", contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import Ciudad from './src/components/Ciudad';import './src/app/globals.css';
      import PantallaConAviso,{useCanalDePantalla} from './src/components/useCanalDeListas';
      import {useSeguirEnLista} from './src/components/useSeguirEnLista';
      const params=new URLSearchParams(location.search);
      const seccion=params.get('seccion')||'eventos';
      const catalogo=seccion==='artistas'?${JSON.stringify(artistas)}:params.has('muchas')?${JSON.stringify(artistas.map(c => ({ ...c, artistas: undefined })))}:${JSON.stringify([SLP, QRO, GDL, AGS])};
      const seguidos=[];const avisos={cuenta:'cuenta-de-prueba',preguntado:true,correo:'a...@example.com',llavePush:''};
      function SeguirDePrueba(){
        const seguir=useSeguirEnLista('lugar',seguidos,avisos,useCanalDePantalla());
        const b=seguir.boton('museo','Museo de prueba');
        return <><button aria-label={b.nombreAccesible} onClick={b.alTocar}>Seguir</button>{seguir.extras}</>;
      }
      function App(){
        const [slug,setSlug]=React.useState(params.get('ciudad')||'san-luis-potosi');
        const [pantalla,setPantalla]=React.useState(params.get('pantalla'));
        const [,repintar]=React.useState(0);
        const resolver=()=>setSlug(new URLSearchParams(location.search).get('ciudad')||'san-luis-potosi');
        window.elegirDesdeRouter=()=>{if(params.has('esperar')){window.qa.completarCiudad=resolver;repintar(n=>n+1)}else resolver()};
        window.qa.cambiarRuta=(href,otraPantalla=pantalla)=>{history.replaceState(null,'',href);setPantalla(otraPantalla);resolver();repintar(n=>n+1)};
        React.useEffect(()=>{const volver=()=>{resolver();repintar(n=>n+1)};window.addEventListener('popstate',volver);return()=>window.removeEventListener('popstate',volver)},[]);
        const ciudad=catalogo.find(c=>c.slug===slug)||catalogo[0];
        const contenido=<><Ciudad ciudad={ciudad} ciudades={catalogo} seccion={seccion} hrefDe={c=>{const p=new URLSearchParams(location.search);p.set('seccion',seccion);p.set('ciudad',c.slug);return '?'+p.toString()}}/>{params.has('seguir')&&<SeguirDePrueba/>}</>;
        return pantalla==='inicio'||pantalla==='lugares'?<PantallaConAviso key={pantalla==='inicio'?slug:'lugares'}>{contenido}</PantallaConAviso>:contenido;
      }
      createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
    ` },
    plugins: [{ name: "router", setup(b) {
      b.onResolve({ filter: /^(next\/|@\/app\/|\.\/ConsentimientoAvisos$)/ }, a => a.path in mocks ? { path: a.path, namespace: "mock" } : undefined);
      b.onLoad({ filter: /.*/, namespace: "mock" }, a => ({ contents: mocks[a.path], loader: "js", resolveDir: root }));
    } }],
  });
  const assets = new Map([
    ["/", ["text/html", '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--fuente-bricolage:Arial}#root{padding:20px}</style><div id="root"></div><script src="/app.js"></script>']],
    ["/app.js", ["text/javascript", await readFile(join(dir, "app.js"))]],
    ["/app.css", ["text/css", await readFile(join(dir, "app.css"))]],
  ]);
  server = createServer((req, res) => {
    const a = assets.get(req.url.split("?")[0]);
    res.writeHead(a ? 200 : 404, { "Content-Type": `${a?.[0] ?? "text/plain"}; charset=utf-8` });
    res.end(a?.[1] ?? "");
  });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  origin = `http://127.0.0.1:${server.address().port}`;
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE });
});
after(async () => {
  await browser?.close();
  if (server) await new Promise(r => server.close(r));
  if (dir) await rm(dir, { recursive: true, force: true });
});

async function abrir(t, { ancho = 390, seccion = "eventos", permiso = "prompt", punto, edad = 0, ciudad, marcada, resultado = "bien", storage = true, muchas = false, pantalla, esperar = false, seguir = false } = {}) {
  const context = await browser.newContext({ viewport: { width: ancho, height: 844 } });
  t.after(() => context.close());
  await context.addInitScript(({ permiso, punto, edad, marcada, resultado, storage }) => {
    window.qa = { geo: 0, queries: 0, replaces: [], completar: null, permisos: [] };
    window.qa.darPermiso = () => window.qa.permisos.splice(0).forEach(r => r({ state: "granted" }));
    if (punto) localStorage.setItem("sn:ubicacion-cercana", JSON.stringify({ punto, en: Date.now() - edad }));
    if (marcada) localStorage.setItem("sn:ciudad-elegida", marcada);
    if (!storage) Object.defineProperty(window, "localStorage", { get() { throw new Error("almacenamiento bloqueado"); } });
    Object.defineProperty(navigator, "permissions", { value: { query: async () => {
      window.qa.queries++;
      if (permiso === "pendiente") return new Promise(r => window.qa.permisos.push(r));
      return { state: permiso };
    } } });
    Object.defineProperty(navigator, "geolocation", { value: { getCurrentPosition: (ok, mal) => {
      window.qa.geo++;
      const terminar = () => resultado === "negado" ? mal({ code: 1, PERMISSION_DENIED: 1 }) : resultado === "error" ? mal({ code: 2, PERMISSION_DENIED: 1 }) : ok({ coords: { latitude: 22.1497, longitude: -100.9764 } });
      if (resultado === "pendiente") window.qa.completar = () => ok({ coords: { latitude: 22.1497, longitude: -100.9764 } });
      else terminar();
    } } });
  }, { permiso, punto, edad, marcada, resultado, storage });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  t.after(() => assert.deepEqual(errors, []));
  await page.goto(`${origin}/?seccion=${seccion}${ciudad ? `&ciudad=${ciudad}` : ""}${muchas ? "&muchas=1" : ""}${pantalla ? `&pantalla=${pantalla}` : ""}${esperar ? "&esperar=1" : ""}${seguir ? "&seguir=1" : ""}`);
  await page.locator('#root > button[aria-haspopup="dialog"]').waitFor();
  return page;
}
const abrirHoja = async page => { await page.locator('#root > button[aria-haspopup="dialog"]').click(); await page.getByRole("dialog").waitFor(); };
const filas = page => page.getByRole("dialog").locator("li button");

const avisoCiudad = page => page.getByRole("status").filter({ hasText: /^Ciudad cambiada a / });
async function elegirCiudad(page, nombre = "Querétaro") {
  await abrirHoja(page);
  await page.getByRole("dialog").getByRole("button", { name: new RegExp(nombre) }).click();
}

test("aviso manual único: espera ciudad y ruta resueltas, incluso con el remonte de Inicio", async t => {
  for (const pantalla of ["inicio", "lugares"]) {
    const page = await abrir(t, { pantalla, esperar: true, ciudad: SLP.slug });
    await page.evaluate(() => {
      window.qa.anuncios = [];
      new MutationObserver(records => {
        for (const r of records) for (const n of r.addedNodes) {
          if (n.nodeType === 1 && n.matches('[role="status"]')) window.qa.anuncios.push(n.textContent);
        }
      }).observe(document.getElementById("root"), { childList: true, subtree: true });
    });
    assert.equal(await avisoCiudad(page).count(), 0, "entrada sin aviso");
    await elegirCiudad(page);
    assert.equal(new URL(page.url()).searchParams.get("ciudad"), QRO.slug);
    assert.equal(await page.locator("#root > button").innerText(), SLP.nombre, "ruta anunciada, datos todavía anteriores");
    assert.equal(await avisoCiudad(page).count(), 0, "no confirma antes de resolver la ciudad");
    await page.evaluate(() => window.qa.completarCiudad());
    await avisoCiudad(page).waitFor();
    assert.equal(await avisoCiudad(page).innerText(), "Ciudad cambiada a Querétaro");
    assert.equal(await avisoCiudad(page).count(), 1);
    assert.equal(await avisoCiudad(page).getByRole("button").count(), 0);
    assert.deepEqual(await page.evaluate(() => window.qa.anuncios), ["Ciudad cambiada a Querétaro"], "StrictMode no lo anuncia dos veces");
    await page.evaluate(() => window.qa.cambiarRuta(location.href));
    assert.deepEqual(await page.evaluate(() => window.qa.anuncios), ["Ciudad cambiada a Querétaro"], "marca consumida una sola vez");
  }
});

test("misma ciudad, preferencia, GPS, entrada explícita y recarga no anuncian cambio", async t => {
  const misma = await abrir(t, { pantalla: "inicio", ciudad: SLP.slug });
  await elegirCiudad(misma, SLP.nombre);
  assert.equal(await avisoCiudad(misma).count(), 0);
  assert.deepEqual(await misma.evaluate(() => window.qa.replaces), []);
  for (const opciones of [{ marcada: QRO.slug }, { punto: QRO.centro }, { ciudad: QRO.slug }]) {
    const page = await abrir(t, { pantalla: "inicio", ...opciones });
    await page.getByRole("button", { name: QRO.nombre, exact: true }).waitFor();
    assert.equal(await avisoCiudad(page).count(), 0);
  }
  const page = await abrir(t, { pantalla: "lugares", ciudad: SLP.slug });
  await elegirCiudad(page);
  await avisoCiudad(page).waitFor();
  assert.deepEqual(await page.evaluate(() => Object.keys(localStorage).filter(k => k.includes("ciudad"))), ["sn:ciudad-elegida"], "aviso efímero, sin marca persistida");
  await page.reload();
  await page.getByRole("button", { name: QRO.nombre, exact: true }).waitFor();
  assert.equal(await avisoCiudad(page).count(), 0);
});

test("Agenda, Artistas y Buscar conservan su cambio sin aviso", async t => {
  for (const [pantalla, seccion] of [["agenda", "eventos"], ["artistas", "artistas"], ["buscar", "buscar"]]) {
    const page = await abrir(t, { pantalla, seccion, ciudad: SLP.slug });
    await elegirCiudad(page);
    await page.getByRole("button", { name: QRO.nombre, exact: true }).waitFor();
    assert.equal(await avisoCiudad(page).count(), 0);
  }
});

test("Atrás y navegación cancelada descartan la confirmación pendiente", async t => {
  for (const cancelar of ["atras", "otra-ruta"]) {
    const page = await abrir(t, { pantalla: "inicio", esperar: true, ciudad: SLP.slug });
    await page.evaluate(() => history.pushState(null, "", location.href));
    await elegirCiudad(page);
    assert.equal(await avisoCiudad(page).count(), 0);
    if (cancelar === "atras") {
      await page.goBack();
      await page.waitForURL(u => u.searchParams.get("ciudad") === SLP.slug);
    } else {
      await page.evaluate(() => window.qa.cambiarRuta("/?seccion=eventos&ciudad=san-luis-potosi&pantalla=agenda", "agenda"));
    }
    await page.evaluate(() => window.qa.completarCiudad());
    assert.equal(await avisoCiudad(page).count(), 0);
    await page.evaluate(() => window.qa.cambiarRuta("/?seccion=eventos&ciudad=queretaro&pantalla=inicio", "inicio"));
    await page.getByRole("button", { name: QRO.nombre, exact: true }).waitFor();
    assert.equal(await avisoCiudad(page).count(), 0, "volver al destino no resucita un cambio cancelado");
  }
});

test("Atrás tampoco deja visible la confirmación de la ciudad que se acaba de abandonar", async t => {
  const page = await abrir(t, { pantalla: "lugares", ciudad: SLP.slug });
  await page.evaluate(() => history.pushState(null, "", location.href));
  await elegirCiudad(page);
  await avisoCiudad(page).waitFor();
  await page.goBack();
  await page.getByRole("button", { name: SLP.nombre, exact: true }).waitFor();
  assert.equal(await avisoCiudad(page).count(), 0, "el aviso de Querétaro no queda sobre San Luis Potosí");
});

test("Lugares comparte el aviso con un Seguir real todavía en curso", async t => {
  for (const guardado of [true, false]) {
    const page = await abrir(t, { pantalla: "lugares", seguir: true, ciudad: SLP.slug });
    await page.getByRole("button", { name: "Seguir — Museo de prueba", exact: true }).click();
    await page.waitForFunction(() => typeof window.qa.completarSeguir === "function");
    assert.equal(await page.locator('[role="status"], [role="alert"]').count(), 1);
    await elegirCiudad(page);
    await avisoCiudad(page).waitFor();
    assert.equal(await page.locator('[role="status"], [role="alert"]').count(), 1);
    await page.evaluate(guardado => window.qa.completarSeguir(guardado), guardado);
    if (!guardado) await page.getByRole("alert").waitFor();
    assert.equal(await page.locator('[role="status"], [role="alert"]').count(), 1);
    if (guardado) assert.equal(await avisoCiudad(page).innerText(), "Ciudad cambiada a Querétaro");
    else assert.equal(await page.getByRole("alert").getByRole("button", { name: "Reintentar" }).count(), 1, "el fallo de Seguir mantiene su salida canónica");
  }
});

test("lista directa a 320/390: nota y botones canónicos, selección por replace y foco devuelto", async t => {
  for (const ancho of [320, 390]) {
    const page = await abrir(t, { ancho });
    await abrirHoja(page);
    const hoja = page.getByRole("dialog", { name: "Ciudades con eventos" });
    await hoja.getByRole("button", { name: "Usar mi ubicación" }).waitFor();
    assert.equal(await filas(page).count(), 4);
    assert.match(await hoja.innerText(), /Solo salen ciudades donde ya hay eventos publicados/);
    assert.equal(await hoja.getByRole("searchbox").count(), 0);
    assert.equal(await hoja.getByRole("button", { name: /Otra ciudad|Cerca de ti/ }).count(), 0);
    assert.equal(await page.evaluate(() => window.qa.geo), 0, "sin petición de ubicación antes del toque");
    await hoja.getByRole("button", { name: /Querétaro/ }).click();
    assert.equal(await page.getByRole("dialog").count(), 0);
    assert.equal(await page.evaluate(() => localStorage.getItem("sn:ciudad-elegida")), QRO.slug);
    assert.deepEqual(await page.evaluate(() => window.qa.replaces), ["/?seccion=eventos&ciudad=queretaro"]);
    assert.equal(await page.locator("#root button").evaluate(e => document.activeElement === e), true);
  }
});

test("concedido: relectura automática sin toque, cercanía distinta de palomita y ubicación caducada", async t => {
  const page = await abrir(t, { permiso: "granted", punto: QRO.centro, edad: 16 * 60 * 1000, ciudad: QRO.slug });
  await abrirHoja(page);
  await page.getByText("Estás aquí", { exact: true }).waitFor();
  assert.match(await filas(page).first().innerText(), /San Luis Potosí.*Estás aquí/s);
  assert.match(await page.locator('[role=dialog] [aria-current="true"]').innerText(), /Querétaro/);
  assert.equal(await page.getByRole("button", { name: "Usar mi ubicación" }).count(), 0);
  assert.equal(await page.evaluate(() => window.qa.geo), 1, "relectura compartida incluso en StrictMode");
  assert.deepEqual(await page.evaluate(() => window.qa.replaces), []);
});

test("ciudad sin centro: conserva selección, sin 0 km ni aquí, después de centros conocidos", async t => {
  const page = await abrir(t, { punto: SLP.centro, ciudad: AGS.slug });
  await abrirHoja(page);
  const aguascalientes = filas(page).last();
  assert.equal(await filas(page).count(), 4);
  assert.match(await aguascalientes.innerText(), /Aguascalientes\s+1 evento/);
  assert.doesNotMatch(await aguascalientes.innerText(), /km|Estás aquí/);
  assert.equal(await aguascalientes.getAttribute("aria-current"), "true");
  assert.match(await filas(page).first().innerText(), /San Luis Potosí.*Estás aquí/s);
  assert.deepEqual(await page.evaluate(() => window.qa.replaces), []);
});

test("permiso pendiente y concedido no pintan el botón antes de la relectura", async t => {
  const page = await abrir(t, { permiso: "pendiente", resultado: "pendiente" });
  await abrirHoja(page);
  assert.equal(await page.getByRole("button", { name: "Usar mi ubicación" }).count(), 0);
  assert.equal(await page.evaluate(() => window.qa.geo), 0);
  await page.evaluate(() => window.qa.darPermiso());
  await page.waitForFunction(() => window.qa.geo === 1);
  assert.equal(await page.getByRole("button", { name: "Usar mi ubicación" }).count(), 0);
  await page.evaluate(() => window.qa.completar());
  await page.getByText("Estás aquí", { exact: true }).waitFor();
});

test("solo la primera visita sin elección toma la cercana; marca previa y storage bloqueado se respetan", async t => {
  const nueva = await abrir(t, { punto: QRO.centro });
  await nueva.getByRole("button", { name: "Querétaro", exact: true }).waitFor();
  assert.equal(await nueva.evaluate(() => localStorage.getItem("sn:ciudad-elegida")), QRO.slug);
  assert.equal(await nueva.evaluate(() => window.qa.replaces.length), 1);
  const vieja = await abrir(t, { punto: QRO.centro, marcada: SLP.slug });
  await abrirHoja(vieja);
  assert.match(await vieja.locator('[role=dialog] [aria-current="true"]').innerText(), /San Luis/);
  assert.deepEqual(await vieja.evaluate(() => window.qa.replaces), ["/?seccion=eventos&ciudad=san-luis-potosi"]);
  const privada = await abrir(t, { storage: false });
  await abrirHoja(privada);
  await privada.getByRole("button", { name: /Querétaro/ }).click();
  assert.equal(await privada.evaluate(() => window.qa.replaces.length), 1);
});

test("pedir tras toque: espera en la misma hoja, concede y reordena sin cerrar", async t => {
  const page = await abrir(t, { resultado: "pendiente", ciudad: QRO.slug });
  await abrirHoja(page);
  await page.getByRole("button", { name: "Usar mi ubicación" }).click();
  assert.equal(await page.getByRole("dialog").count(), 1);
  assert.equal(await page.getByRole("button", { name: "Usar mi ubicación" }).getAttribute("aria-busy"), "true");
  assert.equal(await page.evaluate(() => window.qa.geo), 1);
  await page.evaluate(() => window.qa.completar());
  await page.getByText("Estás aquí", { exact: true }).waitFor();
  assert.equal(await page.getByRole("dialog").count(), 1);
  assert.equal(await page.getByRole("button", { name: "Usar mi ubicación" }).count(), 0);
});

test("negado desaparece por la sesión; error permite reintentar con nota breve", async t => {
  const page = await abrir(t, { resultado: "negado" });
  await abrirHoja(page);
  await page.getByRole("button", { name: "Usar mi ubicación" }).click();
  await page.waitForFunction(() => sessionStorage.getItem("sn:ubicacion-negada") === "1");
  assert.equal(await page.getByRole("status").count(), 0);
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await abrirHoja(page);
  assert.equal(await page.getByRole("button", { name: "Usar mi ubicación" }).count(), 0);
  const error = await abrir(t, { resultado: "error" });
  await abrirHoja(error);
  await error.getByRole("button", { name: "Usar mi ubicación" }).click();
  await error.getByRole("status").waitFor();
  assert.equal(await error.getByRole("status").innerText(), "No pudimos leer tu ubicación.");
  assert.equal(await error.getByRole("button", { name: "Usar mi ubicación" }).isEnabled(), true);
});

test("Artistas: 13 ciudades, sin consultar ubicación; búsqueda sin acentos y resultados sobre el teclado", async t => {
  for (const ancho of [320, 390]) {
    const page = await abrir(t, { ancho, seccion: "artistas", permiso: "granted" });
    await abrirHoja(page);
    assert.equal(await filas(page).count(), 13);
    assert.equal(await page.getByRole("link", { name: "Agregar un lugar", exact: true }).count(), 0);
    assert.deepEqual(await page.evaluate(() => [window.qa.queries, window.qa.geo]), [0, 0]);
    assert.equal(await page.getByRole("button", { name: "Usar mi ubicación" }).count(), 0);
    const input = page.getByRole("searchbox", { name: "Nombre de la ciudad" });
    await input.fill("QUERETARO");
    assert.equal(await filas(page).count(), 1);
    await page.evaluate(() => {
      Object.defineProperty(visualViewport, "height", { configurable: true, value: 508 });
      visualViewport.dispatchEvent(new Event("resize"));
    });
    await page.waitForFunction(() => { const r = document.querySelector('[role=dialog]').getBoundingClientRect(); return r.bottom <= 508 && r.top <= 49; });
    const cajas = await page.evaluate(() => {
      const cuadro = e => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }; };
      return { input: cuadro(document.querySelector('input')), fila: cuadro(document.querySelector('li button')), hoja: cuadro(document.querySelector('[role=dialog]')), ancho: document.documentElement.scrollWidth };
    });
    assert.ok(cajas.fila.top >= cajas.input.bottom && cajas.fila.bottom <= 508);
    assert.ok(cajas.hoja.top <= 49 && cajas.ancho <= ancho);
    await input.fill("zzzzz");
    assert.equal(await filas(page).count(), 0);
    assert.match(await page.getByRole("dialog").innerText(), /Nada con «zzzzz»/);
    assert.equal(await page.getByRole("link", { name: "Agregar un lugar", exact: true }).count(), 0, "Artistas sin coincidencias conserva solo la nota");
  }
});

test("un toque en resultado con campo enfocado conserva su sitio hasta elegir y hace un solo replace", async t => {
  for (const texto of ["queretaro", ""]) {
    const page = await abrir(t, { seccion: "artistas" });
    await abrirHoja(page);
    const input = page.getByRole("searchbox", { name: "Nombre de la ciudad" });
    await input.fill(texto);
    await input.focus();
    await page.evaluate(() => {
      Object.defineProperty(visualViewport, "height", { configurable: true, value: 508 });
      visualViewport.dispatchEvent(new Event("resize"));
    });
    await page.waitForFunction(() => document.querySelector('[role=dialog]').getBoundingClientRect().bottom <= 508);
    const resultado = page.getByRole("dialog").getByRole("button", { name: /Querétaro/ });
    await resultado.scrollIntoViewIfNeeded();
    const antes = await resultado.boundingBox();
    assert.ok(antes.y >= 0 && antes.y + antes.height <= 508, "la fila que se toca está visible");
    await page.mouse.move(antes.x + antes.width / 2, antes.y + antes.height / 2);
    await page.mouse.down();
    const trasQuitarFoco = await resultado.boundingBox();
    assert.ok(Math.abs(antes.y - trasQuitarFoco.y) < 1, "perder foco no mueve el resultado bajo el dedo, incluso sin texto");
    await page.mouse.up();
    await page.getByRole("dialog").waitFor({ state: "detached" });
    assert.deepEqual(await page.evaluate(() => window.qa.replaces), ["/?seccion=artistas&ciudad=queretaro"]);
  }
});

test("búsqueda sin coincidencias ofrece una sola alta de lugar en Eventos, Lugares y Buscar con más de ocho ciudades", async t => {
  for (const seccion of ["eventos", "lugares", "buscar"]) {
    const page = await abrir(t, { seccion, muchas: true, punto: { lat: 40.4, lng: -3.7 }, ciudad: SLP.slug });
    await abrirHoja(page);
    const input = page.getByRole("searchbox", { name: "Nombre de la ciudad" });
    await input.fill("queretaro");
    assert.equal(await page.getByRole("link", { name: /donde estás/ }).count(), 0, "buscar con resultados no compite con alta lejana");
    await input.fill("zzzzz");
    const alta = page.getByRole("dialog").getByRole("link");
    assert.equal(await alta.count(), 1, "no duplica el alta lejana");
    assert.equal(await alta.innerText(), "Agregar un lugar");
    assert.equal(await alta.getAttribute("href"), "/nuevo?tipo=lugar");
    await page.evaluate(() => {
      Object.defineProperty(visualViewport, "height", { configurable: true, value: 508 });
      visualViewport.dispatchEvent(new Event("resize"));
    });
    await page.waitForFunction(() => document.querySelector('[role=dialog]').getBoundingClientRect().bottom <= 508);
    const caja = await alta.boundingBox();
    assert.ok(caja.y + caja.height <= 508, "alta visible encima del teclado");
    await input.fill(" ");
    assert.equal(await page.getByRole("link", { name: "Agregar un lugar", exact: true }).count(), 0);
    await input.fill("zzzzz");
    // El Link del montaje es un <a>: comprobar el cierre sin salir del documento de prueba.
    await alta.evaluate(e => e.addEventListener("click", evento => evento.preventDefault(), { once: true }));
    await alta.click();
    await page.getByRole("dialog").waitFor({ state: "detached" });
  }
});

test("buscar a358 en320/390: ubicación y error se ocultan, campo y alta quedan completos y tocables, ubicación vuelve al reabrir", async t => {
  for (const ancho of [320, 390]) {
    const page = await abrir(t, { ancho, seccion: "lugares", muchas: true, resultado: "error" });
    await abrirHoja(page);
    await page.getByRole("button", { name: "Usar mi ubicación" }).click();
    await page.getByRole("status").waitFor();
    await page.getByRole("searchbox", { name: "Nombre de la ciudad" }).fill("zzzzz");
    await page.evaluate(() => {
      Object.defineProperty(visualViewport, "height", { configurable: true, value: 358 });
      visualViewport.dispatchEvent(new Event("resize"));
    });
    await page.waitForFunction(() => document.querySelector('[role=dialog]').getBoundingClientRect().bottom <= 358);
    assert.equal(await page.getByRole("button", { name: "Usar mi ubicación" }).count(), 0);
    assert.equal(await page.getByRole("status").count(), 0);
    const alta = page.getByRole("link", { name: "Agregar un lugar", exact: true });
    const cajas = await alta.evaluate(e => {
      const caja = x => { const r = x.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; };
      const centro = e.getBoundingClientRect();
      return { alta: caja(e), campo: caja(document.querySelector('input[type=search]').closest('label')), cuerpo: caja(e.parentElement.parentElement), tocable: document.elementFromPoint(centro.x + centro.width / 2, centro.y + centro.height / 2)?.closest('a') === e };
    });
    for (const elemento of [cajas.alta, cajas.campo]) assert.ok(elemento.top >= cajas.cuerpo.top && elemento.bottom <= cajas.cuerpo.bottom, "rectángulo completo dentro del cuerpo visible");
    assert.equal(cajas.tocable, true, "sin scroll automático que esconda un recorte");
    await page.getByRole("button", { name: "Cerrar", exact: true }).click();
    await abrirHoja(page);
    await page.getByRole("button", { name: "Usar mi ubicación" }).waitFor();
    assert.equal(await page.getByRole("searchbox").inputValue(), "");
    assert.equal(await page.getByRole("status").count(), 0);
  }
});

test("lejos: alta por tipo sin coordenadas en URL; Artistas no ofrece alta por distancia", async t => {
  for (const seccion of ["eventos", "lugares", "artistas", "buscar"]) {
    const page = await abrir(t, { seccion, punto: { lat: 40.4, lng: -3.7 } });
    await abrirHoja(page);
    const alta = page.getByRole("link", { name: /^Agregar un/ });
    const conAlta = seccion === "eventos" || seccion === "lugares";
    assert.equal(await alta.count(), conAlta ? 1 : 0);
    if (conAlta) assert.equal(await alta.getAttribute("href"), `/nuevo?tipo=${seccion === "eventos" ? "evento" : "lugar"}`);
    if (seccion === "buscar") assert.equal(await page.getByRole("dialog").getAttribute("aria-label"), "Ciudades");
    assert.equal(await page.getByText("Estás aquí", { exact: true }).count(), 0);
  }
});


test("entrada sin ciudad y recarga recuperan la elección manual antes de la cercanía", async t => {
  const page = await abrir(t, {marcada:QRO.slug, punto:SLP.centro});
  await page.getByRole("button", {name:"Querétaro",exact:true}).waitFor();
  assert.equal(new URL(page.url()).searchParams.get("ciudad"), QRO.slug);
  assert.equal(await page.evaluate(() => localStorage.getItem("sn:ciudad-elegida")), QRO.slug);
  await page.reload();
  await page.getByRole("button", {name:"Querétaro",exact:true}).waitFor();
});


test("URL explícita gana a la preferencia y al GPS sin sobrescribir la elección guardada", async t => {
  const page = await abrir(t, {ciudad:GDL.slug,marcada:QRO.slug,punto:SLP.centro});
  await page.getByRole("button", {name:"Guadalajara",exact:true}).waitFor();
  assert.deepEqual(await page.evaluate(() => window.qa.replaces), []);
  assert.equal(await page.evaluate(() => localStorage.getItem("sn:ciudad-elegida")), QRO.slug);
});
