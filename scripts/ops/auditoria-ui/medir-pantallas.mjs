// La prueba del DOM (`npm run medir`; doc 50 § 9, punto 2). Levanta el respaldo local (datos inventados) y la app compilada contra él,
// abre cada pantalla de `pantallas-prod.json` y `pantallas-sesion.json` a 320, 390, 820 y 1280 px en Chromium y comprueba lo que dice
// `medidas.aceptadas.json`: nodos y profundidad dentro del presupuesto y, salvo excepción declarada con su porqué, ningún hijo fuera de
// la caja de su padre, ningún desplazamiento horizontal, ningún control con toque real menor de 44, ningún accionable tapado por un
// elemento fijo y ningún margen negativo. Sin llaves reales ni red: las imágenes y el estilo del mapa se contestan en el navegador y
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
// con fin (el pulso del pin elegido dura medio segundo y vive en el DOM) y pasaron 30 cuadros sin cambios en el DOM. Se cuentan cuadros
// y no milisegundos: con la máquina cargada el mapa y sus animaciones también avanzan más despacio.
async function aquietar(page) {
  await page.waitForLoadState("networkidle", { timeout: 20000 });
  const pendiente = await page.evaluate(async () => {
    await document.fonts.ready;
    const animando = () => document.getAnimations().some((a) => a.playState === "running" && a.effect?.getTiming().iterations !== Infinity);
    const pendiente = () => document.querySelectorAll('template[id^="B:"], [hidden][id^="S:"]').length > 0 || document.body.innerText.includes("Cargando el mapa") || animando();
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
async function medirPantalla(browser, medirJs, base, p, i) {
  const [ancho, alto] = [ANCHOS[i], ALTOS[i]];
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 1, locale: "es-MX", timezoneId: "America/Mexico_City", ...dispositivo(ancho) });
  try {
    await ctx.clock.setFixedTime(new Date(AHORA));
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
    const fuentes = await page.evaluate(() => [...document.fonts].map((f) => `${f.family} ${f.status}`));
    if (!fuentes.some((f) => /Bricolage.* loaded$/i.test(f))) throw new Error(`no cargó la fuente de la app, las medidas no valen (fuentes: ${fuentes.join(", ") || "ninguna"})`);
    return { ...(await page.evaluate(medirJs)), errores };
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
const reloj = { RELOJ_FIJO: AHORA, TZ: "America/Mexico_City", NODE_OPTIONS: `--require=${path.join(AQUI, "reloj-fijo.cjs")}` };
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
  console.log(`\nmedidas: ${pantallas.length} pantallas × ${ANCHOS.length} anchos en ${Math.round((Date.now() - inicio) / 1000)} s, ${problemas.length ? "CON FALLOS" : aceptar ? "presupuestos anotados" : "sin novedades"}`);
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await browser?.close();
  hijos.forEach((h) => h.kill());
}
