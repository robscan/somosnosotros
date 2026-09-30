// Medidas puntuales (getBoundingClientRect) de los defectos candidatos, en el móvil de 390×844.
import { chromium } from "playwright-core";
const base = process.argv[2] || "https://somosnosotros.org";
const cookies = process.argv[3];
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader", "--hide-scrollbars"] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "es-MX", timezoneId: "America/Mexico_City", userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1" });
if (cookies) await ctx.addCookies(JSON.parse((await import("node:fs")).readFileSync(cookies, "utf8")));
const page = await ctx.newPage();
const r = (el) => {
  const b = el.getBoundingClientRect();
  return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), der: Math.round(b.right), aba: Math.round(b.bottom) };
};
const solape = (a, b) => {
  const w = Math.max(0, Math.min(a.der, b.der) - Math.max(a.x, b.x));
  const h = Math.max(0, Math.min(a.aba, b.aba) - Math.max(a.y, b.y));
  return { w, h, area: w * h };
};
async function ir(url, espera = 3000) {
  await page.goto(base + url, { waitUntil: "load", timeout: 90000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(espera);
}
const salida = {};

// 1. Agenda: el botón flotante contra los "+" y el texto de los renglones; alturas de la cabecera
await ir("/agenda");
salida.agenda = await page.evaluate(
  ([rs, so]) => {
    const r = new Function("el", `return (${rs})(el)`);
    const solape = new Function("a", "b", `return (${so})(a,b)`);
    const fab = document.querySelector('a[class*="Publicar"]');
    const nav = document.querySelector("nav");
    const cab = document.querySelector('header[class*="Cabecera"]');
    const barra = document.querySelector('header[class*="Barra"]');
    const botones = [...document.querySelectorAll('li[class*="renglon"] > button')].map(r);
    const renglones = [...document.querySelectorAll('li[class*="renglon"]')].map(r);
    const fabR = r(fab);
    const tapados = botones.filter((b) => solape(b, fabR).area > 0).length;
    const renglonesTapados = renglones.filter((b) => solape(b, fabR).area > 0).length;
    return { barra: r(barra), cabecera: r(cab), nav: r(nav), fab: fabR, primerBoton: botones[0], renglones: renglones.length, botonesEnPantalla: botones.filter((b) => b.aba > 0 && b.y < innerHeight).length, botonesTapadosPorFab: tapados, renglonesTapadosPorFab: renglonesTapados, fabDesdeDerecha: innerWidth - fabR.der, botonDesdeDerecha: innerWidth - botones[0].der, chromeArriba: r(cab).aba, chromeAbajo: innerHeight - r(nav).y, utilAlto: r(nav).y - r(cab).aba };
  },
  [r.toString(), solape.toString()],
);
// ...y con la cabecera compacta (tras bajar)
await page.evaluate(() => window.scrollTo(0, 600));
await page.waitForTimeout(400);
await page.evaluate(() => window.scrollTo(0, 900));
await page.waitForTimeout(600);
salida.agendaCompacta = await page.evaluate(() => {
  const cab = document.querySelector('header[class*="Cabecera"]');
  const b = cab.getBoundingClientRect();
  const h2 = [...document.querySelectorAll("h2")].map((h) => h.getBoundingClientRect()).find((x) => x.top >= 0 && x.top < 200);
  return { cabeceraTop: Math.round(b.top), cabeceraVisible: Math.round(b.bottom), compacta: "compacta" in cab.dataset, tituloDiaTop: h2 ? Math.round(h2.top) : null, altoCabeceraVar: getComputedStyle(document.documentElement).getPropertyValue("--alto-cabecera") };
});

// 2. Lugares lista: "Ver en mapa" + "Registrar lugar" contra los renglones
await ir("/lugares?vista=lista");
salida.lugaresLista = await page.evaluate(
  ([rs, so]) => {
    const r = new Function("el", `return (${rs})(el)`);
    const solape = new Function("a", "b", `return (${so})(a,b)`);
    const fab = r(document.querySelector('a[class*="Publicar"]'));
    const otra = r(document.querySelector('button[class*="verOtraVista"]'));
    const botones = [...document.querySelectorAll('li[class*="renglon"] > button')].map(r);
    const frentes = [...document.querySelectorAll('a[class*="frente"]')].map(r);
    return { fab, verOtraVista: otra, flotantesAltoTotal: fab.aba - otra.y, anchoFlotantes: innerWidth - Math.min(fab.x, otra.x), botonesTapados: botones.filter((b) => solape(b, fab).area + solape(b, otra).area > 0).length, frentesTapados: frentes.filter((b) => solape(b, fab).area + solape(b, otra).area > 0).length, tabsScrollWidth: document.querySelector('[role="tablist"]').scrollWidth, tabsClientWidth: document.querySelector('[role="tablist"]').clientWidth };
  },
  [r.toString(), solape.toString()],
);

// 3. Ficha de lugar con cinco enlaces: el carril de acciones
await ir("/lugares/museo-del-ferrocarril-jesus-garcia-corona", 5000);
salida.fichaLugar5 = await page.evaluate(
  ([rs]) => {
    const r = new Function("el", `return (${rs})(el)`);
    const carril = document.querySelector('div[class*="acciones"]');
    const acciones = [...carril.children].map((a) => ({ etiqueta: a.textContent.trim().slice(0, 14), ...r(a) }));
    const gap = acciones[1].x - acciones[0].der;
    return { carril: r(carril), scrollWidth: carril.scrollWidth, clientWidth: carril.clientWidth, gap, acciones, ultimaFueraPx: acciones.at(-1).der - innerWidth, visibleDeLaUltima: Math.round(((innerWidth - acciones.at(-1).x) / acciones.at(-1).w) * 100) + "%" };
  },
  [r.toString()],
);

// 4. Inicio: el botón flotante contra las tarjetas y sus "+"
await ir("/");
salida.inicio = await page.evaluate(
  ([rs, so]) => {
    const r = new Function("el", `return (${rs})(el)`);
    const solape = new Function("a", "b", `return (${so})(a,b)`);
    const fab = r(document.querySelector('a[class*="Publicar"]'));
    const botones = [...document.querySelectorAll('li > button')].map(r);
    const tarjetas = [...document.querySelectorAll('a[class*="tarjeta"]')].map(r);
    const cabs = [...document.querySelectorAll('section[class*="destacados"] h2')].map((h) => h.textContent.trim());
    return { carriles: cabs, fab, botonesTapados: botones.filter((b) => solape(b, fab).area > 0).length, tarjetasTapadas: tarjetas.filter((b) => solape(b, fab).area > 0).length, altoDocumento: document.documentElement.scrollHeight };
  },
  [r.toString(), solape.toString()],
);

// 5. Ficha de evento: barra inferior contra el mapa y el pie; altura de la foto
await ir("/eventos/concierto-de-la-orquesta-sinfonica-de-san-luis-potosi", 4000);
salida.fichaEvento = await page.evaluate(
  ([rs]) => {
    const r = new Function("el", `return (${rs})(el)`);
    const fija = r(document.querySelector('div[class*="accionFija"]'));
    const mapa = document.querySelector('a[class*="MapaFicha"]');
    const foto = document.querySelector("main img");
    const acciones = [...document.querySelectorAll('div[class*="acciones"] > *')].map((a) => ({ etiqueta: a.textContent.trim().slice(0, 14), ...r(a) }));
    return { barraFija: fija, mapa: mapa ? r(mapa) : null, foto: foto ? r(foto) : null, acciones, paddingBottomMain: getComputedStyle(document.querySelector("main")).paddingBottom, altoDocumento: document.documentElement.scrollHeight };
  },
  [r.toString()],
);
console.log(JSON.stringify(salida, null, 1));
await browser.close();
