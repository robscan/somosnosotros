// La prueba del DOM (`npm run medir`; doc 50 § 9, punto 2). Levanta el respaldo local (datos inventados) y la app compilada contra él,
// abre cada pantalla de `pantallas-prod.json` y `pantallas-sesion.json` a 320, 390, 820 y 1280 px en Chromium y comprueba lo que dice
// `medidas.aceptadas.json`: nodos y profundidad dentro del presupuesto y, salvo excepción declarada con su porqué, ningún hijo fuera de
// la caja de su padre, ningún desplazamiento horizontal, ningún control con toque real menor de 44, ningún accionable tapado por un
// elemento fijo y ningún margen negativo. Además, la comprobación «teclado» (OL-305, OL-308): con el área visible a 390×508 —el iPhone con su
// teclado—, cada campo de texto visible de cada pantalla se enfoca y debe quedar entero dentro del área visible y sin nada pegado encima, y
// los botones de abajo (los del pie y los de todo lo pegado o fijo abajo) también deben verse enteros y sin nada encima: las acciones quedan
// sobre el teclado. Sin llaves reales ni red: las imágenes y el estilo del mapa se contestan en el navegador y
// el reloj está fijo (`reloj-fijo.cjs`), así que salen los mismos números cualquier día y a cualquier hora.
//   npm run medir                     la prueba entera (compila la app en `.next`, así que no la corras con `next dev` abierto)
//   npm run medir -- --aceptar        anota los presupuestos de hoy (las excepciones se escriben a mano, con su porqué)
//   npm run medir -- --solo=lugares   solo las pantallas cuyo id contiene el texto
// CHROME_EXECUTABLE elige el navegador; sin él, el Chrome de la Mac si existe y si no el Chromium de Playwright.
import { chromium } from "playwright-core";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cookie } from "./respaldo-local/fixture.mjs";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, "../../..");
const NEXT = path.join(RAIZ, "node_modules/next/dist/bin/next");
const ANCHOS = [320, 390, 820, 1280];
const ALTOS = [568, 844, 1180, 800]; // el iPhone SE de primera generación, un iPhone, un iPad, un escritorio
const AHORA = "2026-10-07T16:00:00Z"; // un miércoles a las 10:00 en Ciudad de México
const UA_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
const UA_IPAD = "Mozilla/5.0 (iPad; CPU OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
const dispositivo = (ancho) => (ancho >= 1000 ? {} : { isMobile: true, hasTouch: true, userAgent: ancho >= 800 ? UA_IPAD : UA_IPHONE });
// Un estilo vacío pero con atribución: así Mapbox pinta también su ⓘ, como con el estilo real.
const ESTILO_DE_MAPA = {
  version: 8,
  sources: { mapa: { type: "geojson", data: { type: "FeatureCollection", features: [] }, attribution: "© Mapbox" } },
  layers: [{ id: "fondo", type: "background", paint: { "background-color": "#e8e6df" } }, { id: "mapa", type: "line", source: "mapa" }],
};
const IMAGEN = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#b9b4a8"/></svg>';
const MAC = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const args = process.argv.slice(2);
const solo = args.find((a) => a.startsWith("--solo="))?.slice(7);
const leer = (archivo) => JSON.parse(fs.readFileSync(path.resolve(AQUI, archivo), "utf8"));
const ACEPTADAS = path.join(AQUI, "medidas.aceptadas.json");
const aceptadas = leer(ACEPTADAS);
const pantallas = [...leer("pantallas-prod.json").map((p) => ({ ...p, sesion: false })), ...leer("pantallas-sesion.json").map((p) => ({ ...p, sesion: true }))].filter((p) => !solo || p.id.includes(solo));
if (!pantallas.length) throw new Error(`ninguna pantalla contiene «${solo}»`);
if (args.includes("--aceptar") && solo) throw new Error("--aceptar pide la prueba entera: quita --solo");
if (JSON.stringify(aceptadas.anchos) !== JSON.stringify(ANCHOS)) throw new Error("los anchos de medidas.aceptadas.json no son los de la prueba: corre `npm run medir -- --aceptar`");

// La hoja de Lugares se lleva a «llena» con la rueda sobre su cuerpo; desde 792 px es un panel sin alturas y no hay nada que subir.
const PASOS = {
  "hoja-llena": async (page, ancho, alto) => {
    if (!(await page.locator("[data-hoja]").count())) return;
    await page.mouse.move(ancho / 2, alto * 0.75);
    await page.mouse.wheel(0, 3000);
    await page.waitForFunction(() => document.querySelector("[data-hoja]").dataset.hoja === "llena");
    await aquietar(page);
  },
};

// Las pantallas que piden un gesto antes de enseñar sus campos: el alta de evento por pasos, en «¿Cómo se llama?» y en «¿Es aquí?» con
// «Ponle nombre» abierto (sin Mapbox la dirección del punto no llega, así que el nombre se pide de entrada). Con «Estoy aquí» y una ubicación fija.
PASOS["evento-nombre"] = async (page) => {
  await page.getByRole("button", { name: "No tengo cartel" }).click();
  await page.getByRole("textbox", { name: "Nombre del evento" }).waitFor();
  await aquietar(page);
};
PASOS["evento-es-aqui"] = async (page) => {
  const ctx = page.context();
  await ctx.grantPermissions(["geolocation"]);
  await ctx.setGeolocation({ latitude: 22.1533, longitude: -100.9811 });
  await page.getByRole("button", { name: "No tengo cartel" }).click();
  await page.getByRole("textbox", { name: "Nombre del evento" }).fill("Ecos de papel");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: /^Este viernes/ }).click();
  await page.getByRole("button", { name: /^7:00 p\.m\./ }).click();
  await page.getByRole("button", { name: "Sin hora de fin" }).click();
  await page.getByRole("button", { name: /Estoy aquí/ }).click();
  await page.getByRole("heading", { name: "¿Es aquí?" }).waitFor();
  await aquietar(page);
};

// El alta de lugar por pasos (OL-315), en «Revisa» y con la hoja del horario abierta en dos franjas: el nombre (que dice su tipo), «Siguiente»,
// «¿Dónde está?» con «Estoy aquí» (una ubicación fija; sin Mapbox no hay dirección y el renglón dice «Pin en el mapa») y «Listo».
PASOS["lugar-revisa"] = async (page) => {
  const ctx = page.context();
  await ctx.grantPermissions(["geolocation"]);
  await ctx.setGeolocation({ latitude: 22.1533, longitude: -100.9811 });
  await page.getByLabel("Nombre del lugar").fill("Foro del Carmen");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("heading", { name: "¿Dónde está?" }).waitFor();
  await page.getByRole("button", { name: /Estoy aquí/ }).click();
  await page.getByRole("button", { name: "Listo" }).click();
  await page.getByRole("heading", { name: "Foro del Carmen" }).waitFor();
  await aquietar(page);
};
PASOS["lugar-horario"] = async (page, ancho, alto) => {
  await PASOS["lugar-revisa"](page, ancho, alto);
  await page.getByRole("button", { name: "Agregar horario" }).click();
  const hoja = page.getByRole("dialog", { name: "Horario" });
  await hoja.getByRole("button", { name: "Agregar otro horario" }).click();
  await aquietar(page);
};

// El alta de artista por pasos (OL-316), en «Revisa»: un nombre sin pista, «¿Qué hace?» → Teatro y «Seguir sin especificar»; el renglón de
// solista o grupo queda por completar (nunca «Solista» por omisión) y la casilla «Soy yo / es mi grupo» a la vista.
PASOS["artista-revisa"] = async (page) => {
  await page.getByLabel("Nombre de artista o grupo").fill("Mariana Ruvalcaba");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "Teatro" }).click();
  await page.getByRole("button", { name: "Seguir sin especificar" }).click();
  await page.getByRole("heading", { name: "Mariana Ruvalcaba" }).waitFor();
  await aquietar(page);
};

// ---------- procesos ----------
const hijos = [];
process.on("exit", () => hijos.forEach((h) => h.exitCode === null && h.kill()));
for (const senal of ["SIGINT", "SIGTERM"]) process.on(senal, () => process.exit(130));
function lanzar(nombre, argumentos, env) {
  const h = spawn(process.execPath, argumentos, { cwd: RAIZ, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  let salida = "";
  h.stdout.on("data", (d) => (salida += d));
  h.stderr.on("data", (d) => (salida += d));
  h.registro = () => `${nombre}:\n${salida.slice(-2000)}`;
  hijos.push(h);
  return h;
}
const puertoLibre = () =>
  new Promise((ok) => {
    const s = net.createServer().listen(0, () => {
      const p = s.address().port;
      s.close(() => ok(p));
    });
  });
async function esperar(url, proceso) {
  for (let i = 0; i < 300; i++) {
    if (proceso.exitCode !== null) throw new Error(`se cerró antes de responder\n${proceso.registro()}`);
    try {
      if ((await fetch(url)).status < 500 && proceso.exitCode === null) return;
    } catch {}
    await new Promise((ok) => setTimeout(ok, 200));
  }
  throw new Error(`no respondió en 60 s: ${url}\n${proceso.registro()}`);
}

// ---------- una pantalla a un ancho ----------
// La pantalla está quieta cuando React colocó todo lo que llegó por streaming, el mapa terminó de cargar, no queda ninguna animación
// con fin ni el anillo del pulso del pin elegido en el DOM, y pasaron 30 cuadros sin cambios en el DOM. Se cuentan cuadros y no
// milisegundos: con la máquina cargada el mapa y sus animaciones también avanzan más despacio.
// El pulso (`Mapa.tsx`: un marcador que se quita en su `animationend`) hay que esperarlo por su presencia y no solo por su animación:
// con la máquina cargada `getAnimations()` ya lo da por terminado (`finished`) uno o varios cuadros antes de que se despache el
// `animationend` que lo retira, y la medición lo contaba (un nodo de más y un marcador fuera de la caja de su padre; OL-292).
async function aquietar(page) {
  await page.waitForLoadState("networkidle", { timeout: 20000 });
  const pendiente = await page.evaluate(async () => {
    await document.fonts.ready;
    const animando = () => document.getAnimations().some((a) => a.playState === "running" && a.effect?.getTiming().iterations !== Infinity);
    const pendiente = () => document.querySelectorAll('template[id^="B:"], [hidden][id^="S:"]').length > 0 || document.body.innerText.includes("Cargando el mapa") || animando() || document.querySelector('.mapboxgl-marker[class*="__pulso"]') !== null;
    const quieto = (cuadros) =>
      new Promise((ok) => {
        let n = 0;
        const o = new MutationObserver(() => (n = 0));
        o.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
        (function paso() {
          if (++n < cuadros) return requestAnimationFrame(paso);
          o.disconnect();
          ok();
        })();
      });
    let vueltas = 0;
    do await quieto(30); while (pendiente() && ++vueltas < 25);
    return pendiente();
  });
  if (pendiente) throw new Error("la pantalla no se aquietó (React, el mapa o una animación seguían pendientes)");
}
/** Abre la pantalla a un tamaño: contexto de Chromium con el reloj, la sesión, las imágenes y el mapa contestados, y los pasos que pide. */
async function abrir(browser, base, p, ancho, alto, antes = null) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 1, locale: "es-MX", timezoneId: "America/Mexico_City", ...dispositivo(ancho) });
  try {
    await ctx.clock.setFixedTime(new Date(AHORA));
    if (antes) await ctx.addInitScript(antes);
    if (p.sesion) await ctx.addCookies([{ name: "sb-127-auth-token", value: cookie, url: base }]);
    await ctx.route("**/_vercel/**", (r) => r.fulfill({ contentType: "text/javascript", body: "" }));
    await ctx.route((u) => u.hostname !== "127.0.0.1", (r) =>
      r.request().resourceType() === "image" ? r.fulfill({ contentType: "image/svg+xml", body: IMAGEN }) : /\/styles\/v1\//.test(r.request().url()) ? r.fulfill({ json: ESTILO_DE_MAPA }) : r.abort(),
    );
    const page = await ctx.newPage();
    const errores = [];
    page.on("pageerror", (e) => errores.push(String(e.message).slice(0, 200)));
    await page.goto(base + p.url, { waitUntil: "load", timeout: 45000 });
    await aquietar(page);
    if (p.paso) await PASOS[p.paso](page, ancho, alto);
    return { ctx, page, errores };
  } catch (e) {
    await ctx.close();
    throw e;
  }
}
async function medirPantalla(browser, medirJs, base, p, i) {
  const { ctx, page, errores } = await abrir(browser, base, p, ANCHOS[i], ALTOS[i]);
  try {
    const fuentes = await page.evaluate(() => [...document.fonts].map((f) => `${f.family} ${f.status}`));
    if (!fuentes.some((f) => /Bricolage.* loaded$/i.test(f))) throw new Error(`no cargó la fuente de la app, las medidas no valen (fuentes: ${fuentes.join(", ") || "ninguna"})`);
    return { ...(await page.evaluate(medirJs)), errores };
  } finally {
    await ctx.close();
  }
}

// ---------- el teclado ----------
// El iPhone con su teclado abierto deja 844 − 336 = 508 px de alto de área visible. Chromium no puede sacar el teclado de iOS ni imitar cómo
// Safari desplaza la vista, así que la comprobación corre de dos maneras (OL-308):
//  - «ventana»: la ventana de Chromium a 390×508. Cubre «el campo y los botones de abajo no quedan fuera ni bajo lo pegado» con la ventana ya
//    reducida; no mueve `visualViewport`, así que `useCampoVisible` no publica `--teclado`.
//  - «area»: la ventana a 390×844 con un `visualViewport` simulado (un EventTarget con `height` y `pageTop`, como en `PorPasos.componentes.test.mjs`)
//    que se encoge 336 px al enfocar. Con él sí actúa el mecanismo del teclado: el pie sale del flujo y se ancla sobre el teclado, y la columna
//    deja sitio. Lo que no cubre (Safari de verdad desplazando por su cuenta, su `offsetTop` desfasado) lo prueban el simulador de iPhone
//    (bitácoras 333 y 336) y los componentes.
// Campos: texto, búsqueda, número, correo, enlace y teléfono. Botones: los de los `footer` y los de lo pegado (`sticky`) o fijo (`fixed`) que
// está en la mitad de abajo del área visible.
const ANCHO_TECLADO = 390;
const ALTO_TECLADO = 508;
const ALTO_VENTANA_TECLADO = 844;
const SELECTOR_CAMPOS = 'input:is(:not([type]), [type="text"], [type="search"], [type="number"], [type="email"], [type="url"], [type="tel"]), textarea';
/** Corre en la página antes de que cargue: un `visualViewport` propio que `window.__teclado(px)` encoge (y avisa con `resize`). */
const simularVisualViewport = () => {
  const vv = new EventTarget();
  // El alto se lee al pedirlo (la ventana menos lo que tapa el teclado): fijado al instalar el script, antes de que la ventana tenga su alto,
  // `ui/Hoja` creía que el área visible medía otra cosa y se colocaba fuera de la vista (s19, OL-315).
  let tapado = 0;
  Object.defineProperties(vv, {
    height: { get: () => window.innerHeight - tapado },
    width: { value: window.innerWidth },
    offsetTop: { value: 0 },
    offsetLeft: { value: 0 },
    scale: { value: 1 },
    pageTop: { get: () => window.scrollY },
    pageLeft: { value: 0 },
  });
  Object.defineProperty(window, "visualViewport", { configurable: true, value: vv });
  window.__teclado = (px) => {
    tapado = px;
    vv.dispatchEvent(new Event("resize"));
  };
};
/**
 * Corre en la página, una vez: `window.__campos()` da los campos de texto visibles, en el orden del documento. No cuentan los que nadie puede
 * tocar: el cebo del teclado (`layout.tsx`: de 1 px, `aria-hidden` y fuera del orden de tabulación), los deshabilitados y los de solo lectura.
 */
const instalarCampos = (selector) => {
  window.__campos = () =>
    [...document.querySelectorAll(selector)].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 2 && r.height > 2 && getComputedStyle(el).visibility !== "hidden" && !el.disabled && !el.readOnly && el.getAttribute("aria-hidden") !== "true" && !el.closest("[inert], [hidden], [aria-hidden=true]");
    });
};
/** Corre en la página: el nombre con el que se anuncia cada campo visible. */
const nombresDeCampos = () => window.__campos().map((el, i) => el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.name || el.id || `campo ${i + 1}`);
/** Corre en la página, con el campo `i` ya enfocado y asentado: dónde quedó, qué hay encima de su centro y dónde quedaron los botones de abajo. `alto` es el del área visible. */
const dondeQuedo = ([i, alto]) => {
  const encimaDe = (r, el) => {
    const encima = document.elementFromPoint(Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1), Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1));
    const tapa = encima && !(encima === el || el.contains(encima) || encima.contains(el)) ? encima : null;
    const clase = tapa && typeof tapa.className === "string" && tapa.className ? `.${tapa.className.split(" ")[0]}` : "";
    return tapa ? `${tapa.tagName.toLowerCase()}${clase} «${(tapa.textContent || "").trim().slice(0, 40)}»` : null;
  };
  const el = window.__campos()[i];
  const r = el.getBoundingClientRect();
  // Los botones de abajo: los de un `footer` y los de un ancestro `sticky` o `fixed` cuyo centro cae en la mitad de abajo del área visible.
  const botones = [];
  for (const b of document.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"]')) {
    const rb = b.getBoundingClientRect();
    if (rb.width < 2 || rb.height < 2 || getComputedStyle(b).visibility === "hidden" || b.closest("[inert], [hidden], [aria-hidden=true]")) continue;
    let pegado = null;
    for (let n = b; n && n !== document.body; n = n.parentElement) {
      const posicion = getComputedStyle(n).position;
      if (posicion === "sticky" || posicion === "fixed") {
        pegado = n;
        break;
      }
    }
    const caja = (pegado ?? b).getBoundingClientRect();
    const abajo = pegado ? caja.top + caja.height / 2 > alto / 2 : false;
    if (!abajo && !b.closest("footer")) continue;
    const nombre = b.getAttribute("aria-label") || (b.textContent || "").trim().slice(0, 40) || b.getAttribute("title") || "sin nombre";
    botones.push({ nombre, top: Math.round(rb.top), bottom: Math.round(rb.bottom), tapa: encimaDe(rb, b) });
  }
  return { activo: document.activeElement === el, top: Math.round(r.top), bottom: Math.round(r.bottom), alto, tapa: encimaDe(r, el), botones };
};
/** Espera a que el desplazamiento se asiente: la página sin moverse durante 12 cuadros seguidos (el de `useCampoVisible` es suave y llega tras dos cuadros). */
const asentar = (page) =>
  page.evaluate(
    () =>
      new Promise((ok) => {
        let antes = -1;
        let quieto = 0;
        let cuadros = 0;
        (function paso() {
          quieto = window.scrollY === antes ? quieto + 1 : 0;
          antes = window.scrollY;
          if (quieto >= 12 || ++cuadros > 120) return ok();
          requestAnimationFrame(paso);
        })();
      }),
  );
/** `modo`: «ventana» (390×508 de verdad) o «area» (390×844 con el `visualViewport` simulado). */
async function medirTeclado(browser, base, p, modo) {
  const enArea = modo === "area";
  const { ctx, page } = await abrir(browser, base, p, ANCHO_TECLADO, enArea ? ALTO_VENTANA_TECLADO : ALTO_TECLADO, enArea ? simularVisualViewport : null);
  const hallazgos = [];
  const botonesVistos = new Set();
  try {
    await page.evaluate(instalarCampos, SELECTOR_CAMPOS);
    const nombres = await page.evaluate(nombresDeCampos);
    for (const [i, nombre] of nombres.entries()) {
      await page.evaluate(() => window.scrollTo(0, 0));
      // Se suelta el foco antes (un campo con `autoFocus` ya lo tiene al llegar) y se enfoca sin desplazar: Chromium lleva solo el campo al
      // centro de la ventana, pero Safari del iPhone con el teclado no siempre lo hace, así que lo que se mide es lo que logra `useCampoVisible`.
      await page.evaluate(
        ([i, area]) => {
          document.activeElement?.blur();
          if (area) window.__teclado(0);
          window.__campos()[i].focus({ preventScroll: true });
        },
        [i, enArea],
      );
      // Con el área simulada, el teclado sube ya enfocado el campo, como en el iPhone.
      if (enArea) await page.evaluate((px) => window.__teclado(px), ALTO_VENTANA_TECLADO - ALTO_TECLADO);
      await asentar(page);
      const d = await page.evaluate(dondeQuedo, [i, ALTO_TECLADO]);
      if (!d.activo) continue; // un campo que no se deja enfocar (se quita al enfocar) no tiene teclado que lo tape
      if (d.top < 0 || d.bottom > d.alto) hallazgos.push({ que: nombre, detalle: `fuera del área visible de ${d.alto} px: va de ${d.top} a ${d.bottom}` });
      else if (d.tapa) hallazgos.push({ que: nombre, detalle: `queda bajo ${d.tapa} (va de ${d.top} a ${d.bottom} en ${d.alto} px)` });
      // Con el campo enfocado, las acciones de abajo se ven enteras sobre el teclado y sin nada encima.
      for (const b of d.botones) {
        botonesVistos.add(`${modo} · ${b.nombre}`);
        const que = `botón «${b.nombre}»`;
        if (b.top < 0 || b.bottom > d.alto) hallazgos.push({ que, detalle: `fuera del área visible de ${d.alto} px con «${nombre}» enfocado: va de ${b.top} a ${b.bottom}` });
        else if (b.tapa) hallazgos.push({ que, detalle: `queda bajo ${b.tapa} con «${nombre}» enfocado (va de ${b.top} a ${b.bottom} en ${d.alto} px)` });
      }
    }
    return { campos: nombres.length, hallazgos, botones: [...botonesVistos] };
  } finally {
    await ctx.close();
  }
}

// ---------- las reglas ----------
const REGLAS = {
  "fuera-de-la-caja": (m) => m.desbordes.map((d) => ({ que: `${d.padre} > ${d.hijo}`, detalle: `sale ${JSON.stringify(d.fuera)} px de su padre` })),
  "desplazamiento-horizontal": (m) => (m.scrollHorizontal ? [{ que: "la página", detalle: `mide ${m.anchoDocumento} px en una ventana de ${m.vw}` }] : []),
  toque: (m) => m.toquesChicos.filter((t) => !t.enTexto).map((t) => ({ que: t.el, detalle: `se toca de ${t.w}×${t.h} (su caja mide ${t.caja}) «${t.texto}»` })),
  tapado: (m) => m.tapados.map((t) => ({ que: t.el, detalle: `queda bajo ${t.capa} «${t.texto}»` })),
  "margen-negativo": (m) => m.negativos.map((n) => ({ que: n.el, detalle: `margen ${n.margen.join(" ")}` })),
  "error-de-pagina": (m) => m.errores.map((e) => ({ que: "la página", detalle: e })),
};
const usadas = new Set();
function permitido(regla, id, ancho, que) {
  const coinciden = aceptadas.excepciones.flatMap((e, i) => (e.regla === regla && que.includes(e.elemento) && (!e.pantalla || id.includes(e.pantalla)) && (!e.anchos || e.anchos.includes(ancho)) ? [i] : []));
  coinciden.forEach((i) => usadas.add(i));
  return coinciden.length > 0;
}
function juzgar(p, i, m) {
  const fallos = [];
  const tope = aceptadas.presupuestos[p.id];
  if (!tope) fallos.push({ regla: "presupuesto", que: p.id, detalle: "sin presupuesto aceptado: corre `npm run medir -- --aceptar`" });
  else {
    if (m.nodos > tope.nodos[i]) fallos.push({ regla: "presupuesto", que: p.id, detalle: `${m.nodos} nodos, el presupuesto es ${tope.nodos[i]}` });
    if (m.profundidadMax > tope.profundidad[i]) fallos.push({ regla: "presupuesto", que: p.id, detalle: `${m.profundidadMax} de profundidad, el presupuesto es ${tope.profundidad[i]} (${m.masProfundo})` });
  }
  for (const [regla, hallar] of Object.entries(REGLAS)) for (const h of hallar(m)) if (!permitido(regla, p.id, ANCHOS[i], h.que)) fallos.push({ regla, ...h });
  return fallos;
}

// ---------- la corrida ----------
const inicio = Date.now();
const [puertoRespaldo, puertoApp] = [await puertoLibre(), await puertoLibre()];
const base = `http://127.0.0.1:${puertoApp}`;
const app = { NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${puertoRespaldo}`, NEXT_PUBLIC_SUPABASE_ANON_KEY: "llave-anon-inventada", NEXT_PUBLIC_MAPBOX_TOKEN: "pk.inventado" };
const reloj = { RELOJ_FIJO: AHORA, TZ: "America/Mexico_City", NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --require=${path.join(AQUI, "reloj-fijo.cjs")}` };
let browser;
try {
  const respaldo = lanzar("respaldo", [path.join(AQUI, "respaldo-local/server.mjs"), String(puertoRespaldo)], reloj);
  await esperar(`http://127.0.0.1:${puertoRespaldo}/rest/v1/eventos?select=id&limit=1`, respaldo);
  process.stdout.write("compilando la app contra el respaldo… ");
  const t = Date.now();
  const r = spawnSync(process.execPath, [NEXT, "build"], { cwd: RAIZ, env: { ...process.env, ...app }, encoding: "utf8", maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`next build falló\n${(r.stdout + r.stderr).slice(-3000)}`);
  console.log(`${Math.round((Date.now() - t) / 1000)} s`);
  const servidor = lanzar("next start", [NEXT, "start", "-p", String(puertoApp)], { ...app, ...reloj });
  await esperar(base + "/entrar", servidor);
  const ejecutable = process.env.CHROME_EXECUTABLE || (fs.existsSync(MAC) ? MAC : undefined);
  browser = await chromium.launch({ executablePath: ejecutable, headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--hide-scrollbars"] });
  const medirJs = fs.readFileSync(path.join(AQUI, "medir.js"), "utf8");

  const trabajos = pantallas.flatMap((p) => ANCHOS.map((_, i) => ({ p, i })));
  const medidas = new Map();
  const fallos = [];
  await Promise.all(
    Array.from({ length: Math.min(Number(process.env.MEDIR_HILOS) || 4, os.availableParallelism()) }, async () => {
      for (let t = trabajos.shift(); t; t = trabajos.shift()) {
        try {
          const m = await medirPantalla(browser, medirJs, base, t.p, t.i);
          medidas.set(`${t.p.id}@${t.i}`, m);
          fallos.push(...juzgar(t.p, t.i, m).map((f) => ({ ...f, pantalla: t.p.id, ancho: ANCHOS[t.i] })));
        } catch (e) {
          fallos.push({ pantalla: t.p.id, ancho: ANCHOS[t.i], regla: "carga", que: t.p.url, detalle: String(e.message).split("\n")[0] });
        }
      }
    }),
  );

  // Android (OL-308): el HTML trae `interactive-widget=resizes-content` en el viewport, para que Chrome encoja la ventana con el teclado.
  try {
    const html = await (await fetch(`${base}/`)).text();
    const viewport = html.match(/<meta[^>]*name="viewport"[^>]*>/)?.[0] ?? "";
    if (!/interactive-widget=resizes-content/.test(viewport)) fallos.push({ regla: "viewport", pantalla: "layout", ancho: 0, que: "meta viewport", detalle: `falta interactive-widget=resizes-content (Android): ${viewport || "sin meta viewport"}` });
  } catch (e) {
    fallos.push({ regla: "carga", pantalla: "layout", ancho: 0, que: "/", detalle: `viewport: ${String(e.message).split("\n")[0]}` });
  }

  // El teclado: cada campo de texto visible de cada pantalla y los botones de abajo, de las dos maneras (ver `medirTeclado`).
  const conTeclado = new Map();
  const botonesDeAbajo = new Map();
  const colaTeclado = pantallas.flatMap((p) => ["ventana", "area"].map((modo) => ({ p, modo })));
  await Promise.all(
    Array.from({ length: Math.min(Number(process.env.MEDIR_HILOS) || 4, os.availableParallelism()) }, async () => {
      for (let t = colaTeclado.shift(); t; t = colaTeclado.shift()) {
        const { p, modo } = t;
        try {
          const m = await medirTeclado(browser, base, p, modo);
          conTeclado.set(p.id, m.campos);
          botonesDeAbajo.set(`${p.id}@${modo}`, m.botones);
          for (const h of m.hallazgos) if (!permitido("teclado", p.id, ANCHO_TECLADO, h.que)) fallos.push({ regla: "teclado", pantalla: p.id, ancho: ANCHO_TECLADO, ...h, detalle: `(${modo}) ${h.detalle}` });
        } catch (e) {
          fallos.push({ pantalla: p.id, ancho: ANCHO_TECLADO, regla: "carga", que: p.url, detalle: `teclado (${modo}): ${String(e.message).split("\n")[0]}` });
        }
      }
    }),
  );

  // ---------- el resultado ----------
  const limpio = (s) => String(s).replace(/-module__[\w-]{5,8}__/g, "/");
  const cifras = (p, campo) => ANCHOS.map((_, i) => medidas.get(`${p.id}@${i}`)?.[campo] ?? "—");
  const aceptar = args.includes("--aceptar");
  if (aceptar) {
    const bloque = pantallas.map((p) => `    ${JSON.stringify(p.id)}: { "nodos": [${cifras(p, "nodos").join(", ")}], "profundidad": [${cifras(p, "profundidadMax").join(", ")}] }`);
    const previo = fs.readFileSync(ACEPTADAS, "utf8"); // los presupuestos van al final del archivo: lo de antes (anchos, excepciones) no se toca
    fs.writeFileSync(ACEPTADAS, `${previo.slice(0, previo.indexOf('  "presupuestos"'))}  "presupuestos": {\n${bloque.join(",\n")}\n  }\n}\n`);
  }
  const problemas = aceptar ? fallos.filter((f) => f.regla !== "presupuesto") : fallos; // al aceptar, el presupuesto es justo lo que se anota
  console.log(`\n${"plantilla".padEnd(10)}${"pantalla".padEnd(28)}nodos ${ANCHOS.join(" ")}   profundidad`);
  for (const p of pantallas) console.log(`${(p.plantilla ?? "").padEnd(10)}${p.id.padEnd(28)}${cifras(p, "nodos").join(" ").padEnd(22)}${cifras(p, "profundidadMax").join(" ")}`);
  const bajaron = pantallas.filter((p) => ANCHOS.some((_, i) => medidas.get(`${p.id}@${i}`)?.nodos < aceptadas.presupuestos[p.id]?.nodos[i]));
  if (bajaron.length && !aceptar) console.log(`\n${bajaron.length} pantallas bajaron de nodos: anótalo con \`npm run medir -- --aceptar\``);
  if (!solo) aceptadas.excepciones.forEach((e, i) => usadas.has(i) || console.log(`excepción sin uso en esta corrida (¿ya no hace falta?): ${e.regla} ${e.elemento}`));
  if (problemas.length) {
    const grupos = Map.groupBy(problemas, (f) => `${f.regla} · ${f.pantalla} · ${limpio(f.que)}`);
    console.error(`\nLa prueba falla (${grupos.size} hallazgos):`);
    for (const [clave, lista] of grupos) {
      const anchos = [...new Set(lista.map((f) => f.ancho))].sort((a, b) => a - b);
      const iguales = Math.round(lista.length / anchos.length);
      console.error(`  - ${clave}\n      a ${anchos.join(", ")} px: ${limpio(lista[0].detalle)}${iguales > 1 ? ` (y ${iguales - 1} elementos más iguales)` : ""}`);
    }
    process.exitCode = 1;
  }
  const conCampos = pantallas.filter((p) => conTeclado.get(p.id) > 0);
  console.log(`\nteclado (${ANCHO_TECLADO}×${ALTO_TECLADO}, de dos maneras): ${[...conTeclado.values()].reduce((a, b) => a + b, 0)} campos de texto en ${conCampos.length} pantallas (${conCampos.map((p) => `${p.id} ${conTeclado.get(p.id)}`).join(", ")})`);
  console.log(`botones de abajo comprobados con el teclado: ${conCampos.map((p) => `${p.id} ${["ventana", "area"].map((m) => `${m} [${(botonesDeAbajo.get(`${p.id}@${m}`) ?? []).map((b) => b.split(" · ")[1]).join(", ") || "—"}]`).join(" ")}`).join("; ")}`);
  console.log(`\nmedidas: ${pantallas.length} pantallas × ${ANCHOS.length} anchos en ${Math.round((Date.now() - inicio) / 1000)} s, ${problemas.length ? "CON FALLOS" : aceptar ? "presupuestos anotados" : "sin novedades"}`);
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await browser?.close();
  hijos.forEach((h) => h.kill());
}
