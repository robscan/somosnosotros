/** Prueba de componente de `FilaEventos` (docs/rediseno/50, P5): la fila de contexto de Inicio y Agenda con sus hojas Cuándo y
 *  Filtros, dentro de la `Cabecera` real y con sus estilos. Cubre: los atajos de Cuándo salen de hoy y el botón dice cuántos
 *  eventos da cada uno (o «Sin eventos» y apagado); «Elegir fecha…» abre el calendario en la misma hoja, con un punto en
 *  los días con eventos, un día con un toque y un rango con dos; Filtros cuenta lo gratis y lo que se sigue y lo puesto sale
 *  como chip con su ✕, y «Solo lo que sigo» solo se ofrece con sesión; la hoja de ciudades abre la lista directa y elige con replace; y la fila se desliza y
 *  avisa que sigue cuando los chips no caben (H-11). Y (ajuste del founder, 2026-09-30) lo que se pone en la fila se nota: el chip entra con el
 *  resorte y la fila se desliza para mostrarlo, Cuándo se anima en su sitio con su valor, y al quitar uno sale cerrando el hueco antes de quitarse
 *  el filtro; lo que trae la pantalla al abrir y «reducir movimiento» no se animan. Cerrar una hoja sin aplicar no cambia nada.
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

const root = fileURLToPath(new URL("../../", import.meta.url));
const HOY = "2026-09-29"; // martes: el fin de semana es el 3 y el 4 de octubre
// A las 19:00 de la ciudad (seis horas detrás de UTC): hoy, mañana, sábado 3 (cooperación), domingo 4 ($150) y el 10 de octubre.
const EVENTOS = [
  ["e1", "2026-09-30T01:00:00Z", null, null],
  ["e2", "2026-10-01T01:00:00Z", null, "L1"],
  ["e3", "2026-10-04T01:00:00Z", "Cooperación solidaria", null],
  ["e4", "2026-10-05T01:00:00Z", "$150", null],
  ["e5", "2026-10-11T01:00:00Z", null, null],
].map(([id, inicio, precio, lugar_id]) => ({ id, titulo: `Evento ${id}`, inicio, fin: null, imagen: null, precio, lugar_id, sitio_texto: null, sitio_reservado: false, zona: "America/Mexico_City", lugar: null, creado_en: "2026-09-01T00:00:00Z", van: 0 }));
let browser, server, dir, origin;

const mocks = {
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link(p){return React.createElement('a',p)}",
  "next/navigation": "export const useRouter=()=>({push(href){window.qa?.apilados?.push(href)},replace(href){window.qa?.reemplazos?.push(href)}});export const usePathname=()=>'/agenda';export const useSearchParams=()=>new URLSearchParams();",
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "filaeventos-componentes-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
      import React, {useState} from 'react';import {createRoot} from 'react-dom/client';
      import FilaEventos from './src/components/FilaEventos';import Cabecera from './src/components/ui/Cabecera';import './src/app/globals.css';
      const params = new URLSearchParams(location.search);
      const inicial = { cuando: null, cuanto: params.get('puestos') ? ['gratis','cooperacion'] : [], siguiendo: !!params.get('puestos') };
      window.qa = { cambios: [] };
      const agenda = Promise.resolve({ eventos: ${JSON.stringify(EVENTOS)}, seguidos: ['L1'], eventosSeguidos: [], asistencias: null, destacados: [] });
      const ciudad = { slug: 'san-luis-potosi', nombre: 'San Luis Potosí', centro: { lng: -100.97, lat: 22.14 }, centroConocido: true, zoom: 13, lugares: 9, eventos: 5, zona: 'America/Mexico_City' };
      const queretaro = { slug: 'queretaro', nombre: 'Querétaro', centro: { lng: -100.39, lat: 20.59 }, centroConocido: true, zoom: 13, lugares: 3, eventos: 12, zona: 'America/Mexico_City' };
      function App(){
        const [valor,setValor]=useState(inicial);
        return <Cabecera contexto={<FilaEventos ciudad={ciudad} ciudades={[ciudad, queretaro]} hrefDeCiudad={()=>'/agenda'} hoy='${HOY}' zona='America/Mexico_City' agenda={agenda} conSesion={!params.has('sinSesion')} valor={valor} onCambiar={(v)=>{window.qa.cambios.push(v);setValor(v);}} />} />;
      }
      createRoot(document.getElementById('root')).render(<App/>);
    `,
    },
    plugins: [{
      name: "dobles",
      setup(b) {
        b.onResolve({ filter: /.*/ }, (a) => (a.path in mocks ? { path: a.path, namespace: "mock" } : undefined));
        b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({ contents: mocks[a.path], loader: "js", resolveDir: root }));
      },
    }],
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

async function abrir(consulta = "", reducir = false, ancho = 390) {
  const context = await browser.newContext({ viewport: { width: ancho, height: 844 }, reducedMotion: reducir ? "reduce" : "no-preference" });
  const page = await context.newPage();
  await page.clock.install({ time: new Date(`${HOY}T12:00:00`) });
  await page.goto(origin + consulta);
  return { context, page };
}
const hoja = (page, nombre) => page.getByRole("dialog", { name: nombre });
const dia = (page, fecha) => page.locator(`[data-fecha="${fecha}"]`);
/** El botón que aplica: «Ver 2 eventos», «Ver 1 evento», «Sin eventos». */
const aplicar = (page, nombre) => hoja(page, nombre).getByRole("button", { name: /^(Ver|Sin) / });
const cerca = (a, b, t = 2) => assert.ok(Math.abs(a - b) <= t, `${a} debía estar a ${t} de ${b}`);

test("Cuándo: los atajos se cuentan desde hoy y el botón dice cuántos eventos da cada uno", async () => {
  const { context, page } = await abrir();
  await page.getByRole("button", { name: "Cuándo" }).click();
  const dialogo = hoja(page, "Cuándo");
  const cuenta = async (atajo) => {
    await dialogo.getByRole("button", { name: atajo, exact: true }).click();
    return aplicar(page, "Cuándo").innerText();
  };
  assert.equal(await cuenta("Hoy"), "Ver 1 evento");
  assert.equal(await cuenta("Mañana"), "Ver 1 evento");
  assert.equal(await cuenta("Fin de semana"), "Ver 2 eventos", "sábado 3 y domingo 4");
  assert.equal(await cuenta("Esta semana"), "Ver 4 eventos", "de hoy al lunes 5: el 5.º evento es del 10");
  assert.equal(await cuenta("Todos los próximos"), "Ver 5 eventos");
  await context.close();
});

test("Cuándo: aplicar un atajo cierra la hoja, pone el valor y el chip lo dice; cerrar sin aplicar no cambia nada", async () => {
  const { context, page } = await abrir();
  await page.getByRole("button", { name: "Cuándo" }).click();
  await hoja(page, "Cuándo").getByRole("button", { name: "Fin de semana", exact: true }).click();
  await hoja(page, "Cuándo").getByRole("button", { name: "Cerrar" }).click();
  assert.equal(await page.evaluate(() => window.qa.cambios.length), 0, "la ✕ no aplica");
  await page.getByRole("button", { name: "Cuándo" }).click();
  await hoja(page, "Cuándo").getByRole("button", { name: "Fin de semana", exact: true }).click();
  await aplicar(page, "Cuándo").click();
  assert.deepEqual(await page.evaluate(() => window.qa.cambios.at(-1).cuando), { desde: "2026-10-03", hasta: "2026-10-04" });
  await page.getByRole("dialog").waitFor({ state: "detached" });
  assert.match(await page.getByRole("button", { name: "Fin de semana" }).innerText(), /Fin de semana/);
  await context.close();
});

test("Cuándo: «Elegir fecha…» abre el calendario en la misma hoja, con punto en los días con eventos, un día con un toque y un rango con dos", async () => {
  const { context, page } = await abrir();
  await page.getByRole("button", { name: "Cuándo" }).click();
  const dialogo = hoja(page, "Cuándo");
  assert.equal(await dialogo.getByRole("grid").count(), 0, "sin elegir, no hay calendario");
  await dialogo.getByRole("button", { name: "Elegir fecha…" }).click();
  assert.equal(await dialogo.getByRole("grid").count(), 1, "el calendario está dentro de la misma hoja");
  const punto = (fecha) => dia(page, fecha).evaluate((e) => getComputedStyle(e, "::after").content !== "none");
  assert.ok(await punto("2026-09-30"), "el 30 de septiembre tiene un evento");
  await dialogo.getByRole("button", { name: "Mes siguiente" }).click();
  assert.ok(await punto("2026-10-03"), "y el 3 de octubre");
  assert.ok(!(await punto("2026-10-06")), "el 6 de octubre no tiene nada");
  // Un día sin eventos se puede tocar, pero el botón lo dice y se apaga.
  await dia(page, "2026-10-06").click();
  assert.equal(await aplicar(page, "Cuándo").innerText(), "Sin eventos");
  assert.ok(await aplicar(page, "Cuándo").isDisabled());
  // El mismo día otra vez lo quita; dos toques cierran un rango.
  await dia(page, "2026-10-06").click();
  await dia(page, "2026-10-03").click();
  assert.equal(await aplicar(page, "Cuándo").innerText(), "Ver 1 evento");
  await dia(page, "2026-10-04").click();
  assert.equal(await aplicar(page, "Cuándo").innerText(), "Ver 2 eventos");
  assert.equal(await dia(page, "2026-10-03").getAttribute("aria-selected"), "true");
  await aplicar(page, "Cuándo").click();
  assert.deepEqual(await page.evaluate(() => window.qa.cambios.at(-1).cuando), { desde: "2026-10-03", hasta: "2026-10-04" });
  await context.close();
});

test("Cuándo: a 320, 390 y 1280 px los siete días caben en la hoja, el círculo mide 44 donde cabe y el toque llena la fila (OL-282)", async () => {
  for (const ancho of [320, 390, 1280]) {
    const { context, page } = await abrir("", false, ancho);
    await page.getByRole("button", { name: "Cuándo" }).click();
    await hoja(page, "Cuándo").getByRole("button", { name: "Elegir fecha…" }).click();
    await dia(page, "2026-09-30").waitFor();
    const m = await page.evaluate(() => {
      const grid = document.querySelector('[role="grid"]');
      const caja = grid.closest('[role="dialog"]').getBoundingClientRect();
      const dias = [...grid.querySelectorAll("button")];
      // El toque real: caminando desde el centro hacia arriba y hacia abajo mientras `elementFromPoint` siga devolviendo el día.
      const alto = (el) => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const suyo = (y) => document.elementFromPoint(cx, y) === el;
        let a = 0, b = 0;
        while (a < 30 && suyo(r.top - a - 1)) a++;
        while (b < 30 && suyo(r.bottom + b + 0.5)) b++;
        return r.height + a + b;
      };
      const visibles = dias.filter((d) => getComputedStyle(d).visibility !== "hidden");
      return {
        sobra: Math.max(...dias.map((d) => d.getBoundingClientRect().right)) - caja.right,
        desborda: grid.scrollWidth > grid.clientWidth,
        pagina: document.documentElement.scrollWidth > innerWidth,
        circulo: Math.min(...visibles.map((d) => d.getBoundingClientRect().width)),
        altoToque: Math.min(...visibles.map(alto)),
      };
    });
    assert.ok(m.sobra <= 0, `a ${ancho} px un día sobresale ${m.sobra} px de la hoja`);
    assert.ok(!m.desborda && !m.pagina, `a ${ancho} px la rejilla o la página se desplazan de lado`);
    assert.ok(m.circulo >= (ancho === 320 ? 38 : 44), `a ${ancho} px el círculo mide ${m.circulo}`);
    assert.ok(m.altoToque >= 44, `a ${ancho} px el toque mide ${m.altoToque} de alto`);
    await context.close();
  }
});

test("Cuándo: el calendario del mes en curso arranca en la semana de hoy, sin las que ya pasaron", async () => {
  const { context, page } = await abrir();
  await page.getByRole("button", { name: "Cuándo" }).click();
  await hoja(page, "Cuándo").getByRole("button", { name: "Elegir fecha…" }).click();
  assert.equal(await dia(page, "2026-09-14").count(), 0, "el 14 de septiembre ya no está");
  assert.equal(await dia(page, "2026-09-28").count(), 1, "la semana de hoy sí");
  await context.close();
});

test("Filtros: lo gratis y lo que sigo se cuentan, y lo puesto sale como chip con su ✕", async () => {
  const { context, page } = await abrir();
  await page.getByRole("button", { name: "Filtros" }).click();
  const dialogo = hoja(page, "Filtros");
  await dialogo.getByRole("button", { name: "Gratis", exact: true }).click();
  assert.equal(await aplicar(page, "Filtros").innerText(), "Ver 3 eventos", "e1, e2 y e5 no traen precio");
  await dialogo.getByRole("switch", { name: "Solo lo que sigo" }).click();
  assert.equal(await aplicar(page, "Filtros").innerText(), "Ver 1 evento", "solo e2 es de un lugar que sigo");
  await aplicar(page, "Filtros").click();
  assert.deepEqual(await page.evaluate(() => window.qa.cambios.at(-1)), { cuando: null, cuanto: ["gratis"], siguiendo: true });
  await page.getByRole("button", { name: "Quitar Gratis" }).waitFor();
  assert.match(await page.getByRole("button", { name: /^Filtros/ }).innerText(), /^Filtros\s+2\s+puestos$/, "la cuenta de lo puesto va en el chip");
  await page.getByRole("button", { name: "Quitar Gratis" }).click();
  await page.waitForFunction(() => window.qa.cambios.at(-1).cuanto.length === 0); // el chip sale con su animación y solo entonces se quita el filtro
  assert.deepEqual(await page.evaluate(() => window.qa.cambios.at(-1)), { cuando: null, cuanto: [], siguiendo: true });
  await page.getByRole("button", { name: "Quitar Solo lo que sigo" }).click();
  await page.waitForFunction(() => !document.querySelector('[aria-label^="Quitar"]'));
  assert.equal(await page.getByRole("button", { name: /^Quitar/ }).count(), 0);
  await context.close();
});

test("Filtros: «Solo lo que sigo» solo se ofrece con sesión; sin ella queda Cuánto, sin título ni raya de más, y todo lo demás sigue igual", async () => {
  const con = await abrir();
  await con.page.getByRole("button", { name: "Filtros" }).click();
  assert.deepEqual(await hoja(con.page, "Filtros").locator("section h4").allTextContents(), ["Qué", "Cuánto", "Siguiendo"], "con sesión: los tres bloques (OL-322: «Qué» arriba)");
  assert.equal(await hoja(con.page, "Filtros").getByRole("switch", { name: "Solo lo que sigo" }).count(), 1);
  await con.context.close();

  const sin = await abrir("/?sinSesion=1");
  await sin.page.getByRole("button", { name: "Filtros" }).click();
  const dialogo = hoja(sin.page, "Filtros");
  assert.deepEqual(await dialogo.locator("section h4").allTextContents(), ["Qué", "Cuánto"], "sin sesión: ni el título «Siguiendo» ni su fila");
  assert.equal(await dialogo.getByText("Solo lo que sigo").count(), 0);
  assert.equal(await dialogo.getByRole("switch").count(), 0);
  assert.equal(await dialogo.locator("section").count(), 2, "Qué y Cuánto: no sobra ninguna raya entre bloques");
  await dialogo.getByRole("button", { name: "Gratis", exact: true }).click();
  assert.equal(await aplicar(sin.page, "Filtros").innerText(), "Ver 3 eventos", "la cuenta no se ve afectada");
  await aplicar(sin.page, "Filtros").click();
  assert.deepEqual(await sin.page.evaluate(() => window.qa.cambios.at(-1)), { cuando: null, cuanto: ["gratis"], siguiendo: false });
  await sin.context.close();
});

/** Lo que anima un chip de la fila (por su nombre accesible): la duración y las propiedades de cada animación en curso. */
const animaciones = (page, nombre) =>
  page.getByRole("button", { name: nombre }).evaluate((e) => e.getAnimations().map((a) => ({ duracion: a.effect.getTiming().duration, propiedades: [...new Set(a.effect.getKeyframes().flatMap((k) => Object.keys(k)))].filter((k) => !["offset", "easing", "composite", "computedOffset"].includes(k)).sort() })));
/** La fila de contexto, la que se desliza. */
const tira = (page) => page.locator("header > div").first();

test("lo que la persona pone en la fila entra con el resorte y la fila se desliza para mostrarlo; lo que trae la pantalla al abrir no se anima", async () => {
  // Al abrir con los filtros ya puestos (la URL, la memoria de pantalla) nada se anima.
  const abierta = await abrir("/?puestos=1");
  await abierta.page.getByRole("button", { name: "Quitar Cooperación" }).waitFor();
  await abierta.page.waitForTimeout(200);
  assert.equal(await abierta.page.evaluate(() => document.getAnimations().length), 0, "nada se anima al abrir con filtros puestos");
  await abierta.context.close();

  const { context, page } = await abrir();
  await page.waitForTimeout(200);
  const antes = await page.evaluate(() => ({ scrollY, izquierda: [...document.querySelectorAll("header > div > *")].map((e) => e.offsetLeft) }));
  // Se ponen desde la hoja, que se va al aplicar: los tres chips nuevos entran al final.
  await page.getByRole("button", { name: "Filtros" }).click();
  await hoja(page, "Filtros").getByRole("button", { name: "Gratis", exact: true }).click();
  await hoja(page, "Filtros").getByRole("button", { name: "Cooperación", exact: true }).click();
  await hoja(page, "Filtros").getByRole("switch", { name: "Solo lo que sigo" }).click();
  await aplicar(page, "Filtros").click();
  await page.getByRole("button", { name: "Quitar Solo lo que sigo" }).waitFor();
  for (const nombre of ["Quitar Gratis", "Quitar Cooperación", "Quitar Solo lo que sigo"]) {
    assert.deepEqual(await animaciones(page, nombre), [{ duracion: 800, propiedades: ["opacity", "transform"] }], `${nombre} entra con el resorte`);
  }
  // La fila se desliza lo justo para que el último quede entero, y solo de lado; mientras el chip aún crece, recibe el toque (no se le quita).
  await page.waitForFunction(() => { const e = document.querySelector('[aria-label="Quitar Solo lo que sigo"]'); return e.getAnimations().length > 0 && e.getBoundingClientRect().right <= innerWidth; });
  assert.equal(await page.evaluate(() => { const e = document.querySelector('[aria-label="Quitar Solo lo que sigo"]'); const r = e.getBoundingClientRect(); return e.getAnimations().length > 0 && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest("button") === e; }), true, "el chip recibe el toque mientras todavía entra");
  await page.waitForTimeout(1100);
  const { chip, fila, relleno } = await page.evaluate(() => {
    const t = document.querySelector("header > div");
    return { chip: document.querySelector('[aria-label="Quitar Solo lo que sigo"]').getBoundingClientRect().toJSON(), fila: t.getBoundingClientRect().toJSON(), relleno: parseFloat(getComputedStyle(t).scrollPaddingRight) };
  });
  assert.ok(chip.right <= fila.right - relleno + 0.5 && chip.right > fila.right - relleno - 2, `el último chip queda entero y pegado al aire de la fila (${chip.right} contra ${fila.right - relleno})`);
  assert.ok((await tira(page).evaluate((e) => e.scrollLeft)) > 0, "la fila se deslizó");
  const despues = await page.evaluate(() => ({ scrollY, izquierda: [...document.querySelectorAll("header > div > *")].map((e) => e.offsetLeft) }));
  assert.equal(despues.scrollY, antes.scrollY, "la página no se desplazó hacia arriba ni hacia abajo");
  assert.deepEqual(despues.izquierda.slice(0, antes.izquierda.length), antes.izquierda, "los chips de antes no se movieron de su sitio");
  assert.equal(await page.evaluate(() => document.getAnimations().length), 0, "al terminar no queda ninguna animación");
  await context.close();
});

test("Cuándo con un valor nuevo se anima en su sitio; con «reducir movimiento» no se anima nada y la fila se desliza de golpe", async () => {
  const { context, page } = await abrir();
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: "Cuándo" }).click();
  await hoja(page, "Cuándo").getByRole("button", { name: "Hoy", exact: true }).click();
  await aplicar(page, "Cuándo").click();
  assert.deepEqual(await animaciones(page, /^Hoy/), [{ duracion: 800, propiedades: ["opacity", "transform"] }], "el chip de Cuándo entra en su sitio con su valor");
  await page.getByRole("button", { name: /^Hoy/ }).click();
  await hoja(page, "Cuándo").getByRole("button", { name: "Mañana", exact: true }).click();
  await aplicar(page, "Cuándo").click();
  assert.deepEqual(await animaciones(page, /^Mañana/), [{ duracion: 800, propiedades: ["opacity", "transform"] }], "y cada valor nuevo lo vuelve a animar");
  await context.close();

  const quieto = await abrir("", true);
  await quieto.page.waitForTimeout(200);
  await quieto.page.getByRole("button", { name: "Filtros" }).click();
  for (const nombre of ["Gratis", "Cooperación"]) await hoja(quieto.page, "Filtros").getByRole("button", { name: nombre, exact: true }).click();
  await hoja(quieto.page, "Filtros").getByRole("switch", { name: "Solo lo que sigo" }).click();
  await aplicar(quieto.page, "Filtros").click();
  await quieto.page.getByRole("button", { name: "Quitar Solo lo que sigo" }).waitFor();
  assert.equal(await quieto.page.evaluate(() => document.getAnimations().length), 0, "con «reducir movimiento» nada se anima");
  const chip = await quieto.page.evaluate(() => ({ derecha: document.querySelector('[aria-label="Quitar Solo lo que sigo"]').getBoundingClientRect().right, fila: document.querySelector("header > div").getBoundingClientRect().right }));
  assert.ok(chip.derecha <= chip.fila, "la fila ya lo enseña entero en el primer cuadro: se desliza de golpe");
  await quieto.context.close();
});

test("al quitar un chip, su ✕ lo encoge y cierra el hueco, y solo entonces se quita el filtro: los de detrás no saltan", async () => {
  const { context, page } = await abrir("/?puestos=1");
  const gratis = page.getByRole("button", { name: "Quitar Gratis" });
  const cooperacion = page.getByRole("button", { name: "Quitar Cooperación" });
  await cooperacion.waitFor();
  await page.waitForTimeout(200);
  // Pausar la animación real al crearla: el reloj de la prueba no depende de cuántos cuadros entregue CI.
  await gratis.evaluate((chip) => {
    const animar = chip.animate.bind(chip);
    chip.animate = (...args) => {
      const animacion = animar(...args);
      animacion.pause();
      animacion.currentTime = 0;
      window.salida = animacion;
      return animacion;
    };
  });
  await gratis.click();
  assert.equal(await page.evaluate(() => window.qa.cambios.length), 0, "el filtro no se quita hasta que el chip termina de salir");
  assert.deepEqual(await animaciones(page, "Quitar Gratis"), [{ duracion: 366, propiedades: ["marginRight", "opacity", "transform"] }], "sale con el recorte del resorte");
  const antes = (await cooperacion.boundingBox()).x;
  const finalConChip = await page.evaluate(() => {
    window.salida.finish();
    // La animación ya tiene su estilo final; la promesa finished aún no ha retirado el nodo.
    return { x: document.querySelector('[aria-label="Quitar Cooperación"]').getBoundingClientRect().x,
      chip: !!document.querySelector('[aria-label="Quitar Gratis"]'), cambios: window.qa.cambios.length };
  });
  assert.equal(finalConChip.chip, true);
  assert.equal(finalConChip.cambios, 0);
  assert.ok(finalConChip.x < antes - 40, `el hueco se cerró antes de retirar el chip (de ${antes} a ${finalConChip.x})`);
  await page.waitForFunction(() => window.qa.cambios.length === 1);
  await gratis.waitFor({ state: "detached" });
  assert.deepEqual(await page.evaluate(() => window.qa.cambios.at(-1).cuanto), ["cooperacion"]);
  cerca((await cooperacion.boundingBox()).x, finalConChip.x, 2.5); // misma tolerancia, ahora entre dos estados finales
  await context.close();
});

test("la fila se desliza cuando los chips no caben y avisa que sigue hasta llegar al final (H-11)", async () => {
  const { context, page } = await abrir("/?puestos=1");
  const fila = page.locator("header > div").first();
  await page.getByRole("button", { name: "Quitar Cooperación" }).waitFor();
  assert.ok(await fila.evaluate((e) => e.scrollWidth > e.clientWidth), "los cinco chips no caben en 390");
  assert.equal(await fila.getAttribute("data-sigue"), "", "todavía hay más a la derecha");
  assert.notEqual(await fila.evaluate((e) => getComputedStyle(e).maskImage), "none", "y el borde se desvanece");
  await fila.evaluate((e) => e.scrollTo({ left: e.scrollWidth }));
  await page.waitForFunction(() => document.querySelector("header > div").getAttribute("data-sigue") === null);
  assert.equal(await fila.evaluate((e) => getComputedStyle(e).maskImage), "none", "al final, sin desvanecer");
  await context.close();
});

test("Ciudades: lista directa, elección con replace y cierre sin apilar ni pasos anteriores", async () => {
  const { context, page } = await abrir();
  await page.evaluate(() => { history.replaceState(null, "", "/agenda?ciudad=san-luis-potosi"); window.qa.reemplazos = []; window.qa.apilados = []; });
  await page.getByRole("button", { name: /San Luis Potosí/ }).first().click();
  const dialogo = hoja(page, "Ciudades con eventos");
  await dialogo.waitFor();
  assert.equal(await dialogo.locator("li button").count(), 2, "ambas ciudades están desde que abre");
  assert.match(await dialogo.getByRole("button", { name: /Querétaro/ }).innerText(), /Querétaro\s+3 lugares · 12 eventos/);
  assert.equal(await dialogo.getByRole("searchbox").count(), 0, "dos ciudades no necesitan buscador");
  assert.equal(await hoja(page, "Dónde estás").count(), 0);
  assert.equal(await dialogo.getByRole("button", { name: /Otra ciudad|Cerca de ti/ }).count(), 0);
  await dialogo.getByRole("button", { name: /Querétaro/ }).click();
  await dialogo.waitFor({ state: "detached" });
  assert.deepEqual(await page.evaluate(() => window.qa.reemplazos), ["/agenda?ciudad=queretaro"]);
  assert.deepEqual(await page.evaluate(() => window.qa.apilados), []);
  assert.equal(await page.evaluate(() => localStorage.getItem("sn:ciudad-elegida")), "queretaro");
  await context.close();
});
