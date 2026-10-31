// Tiempos de carga (OL-497, bitácora 529): cuánto tarda cada pantalla en el teléfono y qué espera a qué. No es una prueba de la CI: es la
// medición de la auditoría de carga, para repetirla cuando se cambie la carga. Levanta el respaldo local (datos inventados), un intermediario
// que cuenta y cronometra cada petición a la base y le suma un retraso fijo (lo que tarda de verdad un viaje de Vercel a Supabase), y la app
// compilada contra el intermediario. Nunca toca producción ni un `.env`: córrelo en un árbol SIN `.env`.
//
//   node scripts/ops/auditoria-ui/medir-tiempos.mjs [--corridas=5] [--latencia=80] [--solo=admin] [--sin-navegador] [--sin-publicar]
//        [--salida=<carpeta>]
//   SIN_BUILD=1 usa el `.next` que ya hay (compilado por este mismo guion: la dirección del intermediario va dentro del JavaScript).
//
// Cuatro partes, en este orden:
//   A · servidor: por pantalla, la petición del HTML desde Node (sin navegador) con 0 ms y con `--latencia` ms por consulta: primer byte, fin,
//       trozos del HTML (si hay streaming), cuántas consultas a la base, cuántas antes del primer byte y la cadena en serie más larga.
//   B · navegador en frío y en caliente: Chrome de la Mac (playwright-core) a 390×844 como iPhone, red «Fast 3G» de Chrome (562,5 ms, 180 KB/s)
//       y CPU ×4; primer byte, primer pintado (FCP), «contenido» (lo primero de verdad de la pantalla, no su esqueleto), «completa» (el último
//       cambio del DOM antes de 2 s quietos), peso del HTML, del JavaScript y de los datos de React (`__next_f`). Mediana de `--corridas`.
//   C · navegación dentro de la app (como la usa el founder, la app instalada): de Inicio a Administración con el botón de la barra y de
//       Administración a Instagram con su renglón: cuándo sale la espera (esqueleto) y cuándo el contenido.
//   D · publicar en Instagram: la lista de eventos, la persona baja hasta un evento, abre su hoja y toca «Publicar» con Instagram tardando 8 s
//       (`/__lento`); cada 500 ms una captura, el desplazamiento, dónde está el renglón, si es el mismo nodo (o se volvió a montar), qué dice, y
//       cada petición de React (refresco de la pantalla y acciones del servidor).
// Salida: `tiempos.json` con todo lo crudo y `tiempos.md` con las tablas, en `--salida` (por omisión, una carpeta temporal).
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { ADMIN, cookieDe } from "./respaldo-local/fixture.mjs";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, "../../..");
const NEXT = path.join(RAIZ, "node_modules/next/dist/bin/next");
const MAC = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const AHORA = "2026-10-07T16:00:00Z"; // el reloj de `npm run medir`: miércoles a las 10:00 en San Luis Potosí
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
// «Fast 3G» de las herramientas de Chrome: 562,5 ms de ida y vuelta, 1,6 Mbps × 0,9 de bajada, 750 kbps × 0,9 de subida.
const FAST_3G = { offline: false, latency: 562.5, downloadThroughput: (1.6 * 1000 * 1000) / 8 * 0.9, uploadThroughput: (750 * 1000) / 8 * 0.9 };
const CPU = 4;

const args = process.argv.slice(2);
const opcion = (n, d) => args.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d;
const CORRIDAS = Number(opcion("corridas", 5));
const LATENCIA = Number(opcion("latencia", 80));
// La parte A (sin navegador, barata) se repite con varios retrasos: así se ve cuánto pesa la cadena de consultas si Supabase queda más cerca o más lejos.
const LATENCIAS = [...new Set([0, ...opcion("latencias", "30,150").split(",").map(Number), LATENCIA])].sort((a, b) => a - b);
const SOLO = opcion("solo", null);
// `--extra=funcion:ms,…`: lo que tarda de más una función de la base (medido aparte con el banco de Postgres de la bitácora 529), sumado al retraso
// de esa consulta. El respaldo contesta todo al instante; así se ve qué pasa en la pantalla cuando una función es lenta de verdad.
const EXTRA = new Map(opcion("extra", "").split(",").filter(Boolean).map((x) => { const [f, n] = x.split(":"); return [f, Number(n)]; }));
const SALIDA = path.resolve(opcion("salida", fs.mkdtempSync(path.join(os.tmpdir(), "tiempos-"))));
fs.mkdirSync(SALIDA, { recursive: true });
if (fs.existsSync(path.join(RAIZ, ".env"))) {
  console.error("hay un .env en el árbol: la app cargaría llaves reales. Córrelo en un árbol sin .env");
  process.exit(1);
}

// Las pantallas. `contenido`: lo primero de verdad (no la espera), en el DOM; `marca`: lo mismo, en el HTML que llega por trozos. Con sesión de
// administración, como la abre el founder.
const PANTALLAS = [
  { id: "inicio", nombre: "Inicio", url: "/", contenido: 'main a[href^="/eventos/"]', marca: 'href="/eventos/' },
  { id: "admin", nombre: "Administración (portada)", url: "/admin", contenido: "main h2", marca: "Esta semana en números" },
  { id: "instagram", nombre: "Administración › Instagram", url: "/admin/instagram?ciudad=san-luis-potosi&pestana=eventos", contenido: 'main [aria-label="Instagram"]', marca: 'aria-label="Instagram"' },
  { id: "ficha", nombre: "Ficha de evento", url: "/eventos/concierto-de-la-orquesta-sinfonica-de-san-luis-potosi", contenido: "main h1", marca: "<h1" },
].filter((p) => !SOLO || p.id.includes(SOLO));

// ---------- procesos ----------
const hijos = [];
process.on("exit", () => hijos.forEach((h) => h.exitCode === null && h.kill()));
for (const s of ["SIGINT", "SIGTERM"]) process.on(s, () => process.exit(130));
function lanzar(argumentos, env) {
  const h = spawn(process.execPath, argumentos, { cwd: RAIZ, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  let salida = "";
  h.stdout.on("data", (d) => (salida += d));
  h.stderr.on("data", (d) => (salida += d));
  h.registro = () => salida.slice(-3000);
  hijos.push(h);
  return h;
}
const puertoLibre = () => new Promise((ok) => { const s = net.createServer().listen(0, () => { const p = s.address().port; s.close(() => ok(p)); }); });
async function esperar(url, h) {
  for (let i = 0; i < 300; i++) {
    if (h && h.exitCode !== null) throw new Error(`se cerró antes de responder\n${h.registro()}`);
    try { if ((await fetch(url)).status < 500) return; } catch {}
    await new Promise((ok) => setTimeout(ok, 200));
  }
  throw new Error(`no respondió en 60 s: ${url}`);
}
const dormir = (ms) => new Promise((ok) => setTimeout(ok, ms));
const mediana = (xs) => {
  const v = xs.filter((x) => typeof x === "number" && Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};
const ms = (x) => (x === null || x === undefined ? "—" : `${Math.round(x).toLocaleString("es-MX")} ms`);
const kb = (x) => (x === null || x === undefined ? "—" : `${(x / 1024).toFixed(1).replace(".", ",")} KB`);

// ---------- el intermediario: cuenta, cronometra y retrasa cada petición a la base ----------
// Lo que pide el servidor (Node) se retrasa `retraso` ms antes de pasar al respaldo: es el viaje de Vercel a Supabase más lo que tarda la
// consulta, que el respaldo (en memoria) no tiene. Lo que pide el navegador no se retrasa aquí: ya lo frena la red simulada de Chrome.
const PUERTO_RESPALDO = 8897;
const PUERTO_INTERMEDIARIO = 8898;
const respaldoUrl = `http://127.0.0.1:${PUERTO_RESPALDO}`;
let retraso = 0;
let lote = null;
const registro = [];
const reloj0 = performance.now();
const intermediario = http.createServer((req, res) => {
  const ua = req.headers["user-agent"] ?? "";
  const origen = /mozilla/i.test(ua) ? "navegador" : "servidor";
  const fila = { lote, origen, metodo: req.method, ruta: decodeURIComponent(req.url).slice(0, 160), t0: performance.now() - reloj0, t1: null, estado: null, bytes: 0 };
  const control = req.url.startsWith("/__");
  if (!control) registro.push(fila);
  const pasar = () => {
    const ida = http.request({ host: "127.0.0.1", port: PUERTO_RESPALDO, method: req.method, path: req.url, headers: req.headers }, (vuelta) => {
      fila.estado = vuelta.statusCode;
      res.writeHead(vuelta.statusCode, vuelta.headers);
      vuelta.on("data", (d) => (fila.bytes += d.length));
      vuelta.pipe(res);
      vuelta.on("end", () => (fila.t1 = performance.now() - reloj0));
    });
    ida.on("error", () => { res.writeHead(502); res.end(); fila.t1 = performance.now() - reloj0; });
    req.pipe(ida);
  };
  const extra = [...EXTRA].find(([f]) => req.url.startsWith(`/rest/v1/rpc/${f}`))?.[1] ?? 0;
  if (origen === "servidor" && (retraso || extra) && !control) setTimeout(pasar, retraso + extra);
  else pasar();
});
await new Promise((ok) => intermediario.listen(PUERTO_INTERMEDIARIO, "127.0.0.1", ok));
const intermediarioUrl = `http://127.0.0.1:${PUERTO_INTERMEDIARIO}`;

/** La cadena en serie más larga: cuántas consultas van una detrás de otra (cada una empieza después de que terminó la anterior). */
function cadena(filas) {
  const v = [...filas].filter((f) => f.t1 !== null).sort((a, b) => a.t0 - b.t0);
  const largo = v.map(() => 1);
  for (let i = 0; i < v.length; i++) for (let j = 0; j < i; j++) if (v[j].t1 <= v[i].t0 + 0.5) largo[i] = Math.max(largo[i], largo[j] + 1);
  return v.length ? Math.max(...largo) : 0;
}
/** Una consulta en una línea: la tabla o la función, sin la consulta entera. */
const corta = (r) => r.replace(/^\/rest\/v1\//, "").replace(/^rpc\//, "rpc ").replace(/\?.*$/, "").replace(/^\/auth\/v1\//, "auth ");

// ---------- arranque ----------
const relojEnv = { RELOJ_FIJO: AHORA, TZ: "America/Mexico_City", NODE_OPTIONS: `--require=${path.join(AQUI, "reloj-fijo.cjs")}` };
const app = { NEXT_PUBLIC_SUPABASE_URL: intermediarioUrl, NEXT_PUBLIC_SUPABASE_ANON_KEY: "llave-anon-inventada", NEXT_PUBLIC_MAPBOX_TOKEN: "pk.inventado", SUPABASE_SERVICE_ROLE_KEY: "llave-servicio-inventada" };
// La API de Instagram y la página de Facebook DE MENTIRA del respaldo (como `capturar-redes-en-cola.mjs`): nunca se llama a Meta.
const instagram = { INSTAGRAM_API_URL: `${respaldoUrl}/graph`, INSTAGRAM_TOKEN: "token-inventado", INSTAGRAM_USER_ID: "17841400000000458", FACEBOOK_PAGE_ID: "1374800000000461", CRON_SECRET: "secreto-inventado-497" };
const respaldo = lanzar([path.join(AQUI, "respaldo-local/server.mjs"), String(PUERTO_RESPALDO)], relojEnv);
await esperar(`${respaldoUrl}/rest/v1/eventos?select=id&limit=1`, respaldo);
if (!process.env.SIN_BUILD) {
  process.stdout.write("compilando la app contra el intermediario… ");
  const t = Date.now();
  const b = spawnSync(process.execPath, [NEXT, "build"], { cwd: RAIZ, env: { ...process.env, ...app }, encoding: "utf8", maxBuffer: 1 << 26 });
  if (b.status !== 0) throw new Error(`next build falló\n${(b.stdout + b.stderr).slice(-3000)}`);
  console.log(`${Math.round((Date.now() - t) / 1000)} s`);
}
const puertoApp = await puertoLibre();
const base = `http://127.0.0.1:${puertoApp}`;
const servidor = lanzar([NEXT, "start", "-p", String(puertoApp)], { ...app, ...relojEnv, ...instagram });
await esperar(`${base}/entrar`, servidor);
const COOKIE = `sb-127-auth-token=${cookieDe(ADMIN)}`;
const resultado = { fecha: new Date().toISOString(), extra: Object.fromEntries(EXTRA), latencia: LATENCIA, corridas: CORRIDAS, red: "Fast 3G (562,5 ms, 180 KB/s) y CPU ×4", servidor: {}, navegador: {}, navegacion: {}, publicar: null };

// ---------- A · servidor ----------
/** Pide el HTML como el teléfono (con la sesión de administración) y anota cuándo llega cada trozo. */
function pedirHtml(url, marca) {
  return new Promise((ok, mal) => {
    const t0 = performance.now();
    const trozos = [];
    let texto = "";
    let contenido = null;
    const r = http.get(`${base}${url}`, { headers: { cookie: COOKIE, "user-agent": UA, accept: "text/html" } }, (res) => {
      const primerByte = performance.now() - t0;
      res.on("data", (d) => {
        trozos.push({ t: performance.now() - t0, bytes: d.length });
        texto += d.toString("utf8");
        if (contenido === null && marca && texto.includes(marca)) contenido = performance.now() - t0;
      });
      res.on("end", () => ok({ estado: res.statusCode, primerByte, contenido, fin: performance.now() - t0, bytes: trozos.reduce((s, x) => s + x.bytes, 0), trozos, t0: t0 - reloj0 }));
    });
    r.on("error", mal);
  });
}
async function medirServidor(p, lat) {
  retraso = lat;
  const corridas = [];
  await pedirHtml(p.url, p.marca); // la primera calienta el servidor (compilación perezosa de rutas, conexiones)
  await dormir(300);
  for (let i = 0; i < CORRIDAS; i++) {
    lote = `A:${p.id}:${lat}:${i}`;
    const h = await pedirHtml(p.url, p.marca);
    await dormir(400 + lat); // lo que sale con `after()` (anotar la ciudad) también cuenta, pero se separa del primer byte
    const filas = registro.filter((f) => f.lote === lote && f.origen === "servidor");
    const antes = filas.filter((f) => f.t0 < h.t0 + h.primerByte);
    const hastaContenido = filas.filter((f) => h.contenido !== null && f.t0 < h.t0 + h.contenido);
    corridas.push({
      estado: h.estado,
      primerByte: h.primerByte,
      contenido: h.contenido,
      antesDelContenido: hastaContenido.length,
      cadenaContenido: cadena(hastaContenido),
      fin: h.fin,
      bytes: h.bytes,
      trozos: h.trozos.length,
      // Streaming: cuánto del HTML llegó en el primer trozo con contenido y cuánto después.
      ultimoTrozo: h.trozos.at(-1)?.t ?? null,
      consultas: filas.length,
      antesDelPrimerByte: antes.length,
      cadena: cadena(filas),
      cadenaAntes: cadena(antes),
      lista: filas.map((f) => ({ q: `${f.metodo} ${corta(f.ruta)}`, desde: Math.round(f.t0 - h.t0), hasta: f.t1 === null ? null : Math.round(f.t1 - h.t0), bytes: f.bytes })),
    });
  }
  retraso = 0;
  lote = null;
  return corridas;
}
for (const lat of LATENCIAS) {
  for (const p of PANTALLAS) {
    const c = await medirServidor(p, lat);
    (resultado.servidor[p.id] ??= {})[lat] = {
      primerByte: mediana(c.map((x) => x.primerByte)),
      contenido: mediana(c.map((x) => x.contenido)),
      antesDelContenido: mediana(c.map((x) => x.antesDelContenido)),
      cadenaContenido: mediana(c.map((x) => x.cadenaContenido)),
      fin: mediana(c.map((x) => x.fin)),
      bytes: mediana(c.map((x) => x.bytes)),
      trozos: mediana(c.map((x) => x.trozos)),
      consultas: mediana(c.map((x) => x.consultas)),
      antesDelPrimerByte: mediana(c.map((x) => x.antesDelPrimerByte)),
      cadena: mediana(c.map((x) => x.cadena)),
      cadenaAntes: mediana(c.map((x) => x.cadenaAntes)),
      corridas: c,
    };
    console.log(`A · ${p.id} @${lat} ms: primer byte ${ms(resultado.servidor[p.id][lat].primerByte)}, contenido ${ms(resultado.servidor[p.id][lat].contenido)} (${resultado.servidor[p.id][lat].antesDelContenido} consultas antes, cadena ${resultado.servidor[p.id][lat].cadenaContenido}), fin ${ms(resultado.servidor[p.id][lat].fin)}, ${resultado.servidor[p.id][lat].consultas} consultas (${resultado.servidor[p.id][lat].antesDelPrimerByte} antes del primer byte, cadena ${resultado.servidor[p.id][lat].cadenaAntes})`);
  }
}

// ---------- B y C · navegador ----------
const ejecutable = process.env.CHROME_EXECUTABLE || (fs.existsSync(MAC) ? MAC : undefined);
const browser = args.includes("--sin-navegador") ? null : await chromium.launch({ executablePath: ejecutable, headless: true, args: ["--hide-scrollbars", "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1"] });

const FECHA_FIJA = `(() => {
  const A = ${Date.parse(AHORA)}, R = Date;
  function F(...a) { return new.target ? new R(...(a.length ? a : [A])) : new R(A).toString(); }
  F.prototype = R.prototype; F.now = () => A; F.parse = R.parse; F.UTC = R.UTC;
  globalThis.Date = F;
})();`;
/** Lo que se instala en cada página antes de su primer guion: cuándo aparece la espera, el contenido y el último cambio del DOM. */
const GUION = `(() => {
  const t = (window.__t = { esqueleto: null, contenido: null, ultimo: 0, cambios: [] });
  const ver = () => {
    const ahora = performance.now();
    t.ultimo = ahora;
    if (t.esqueleto === null && document.querySelector('[aria-busy="true"], [aria-label="Cargando"]')) t.esqueleto = ahora;
    if (t.contenido === null && window.__sel && document.querySelector(window.__sel)) t.contenido = ahora;
  };
  const quien = (n) => { const e = n && n.nodeType === 1 ? n : n && n.parentElement; return e ? e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + (e.getAttribute && e.getAttribute("class") ? "." + String(e.getAttribute("class")).split(" ")[0] : "") : "?"; };
  new MutationObserver((m) => { ver(); t.cambios.push([Math.round(performance.now()), m.length, quien(m[m.length - 1].target) + ":" + m[m.length - 1].type + (m[m.length - 1].attributeName ? "@" + m[m.length - 1].attributeName : "")]); }).observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
})();`;

async function contexto({ ancho = 390, alto = 844, escala = 1 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: escala, isMobile: true, hasTouch: true, userAgent: UA, locale: "es-MX", timezoneId: "America/Mexico_City" });
  // El reloj de la pantalla, el mismo del servidor: solo `Date` (el reloj de Playwright también cambia `performance`, y aquí se mide con él).
  await ctx.addInitScript(FECHA_FIJA);
  await ctx.addCookies([{ name: "sb-127-auth-token", value: cookieDe(ADMIN), url: base }]);
  await ctx.addInitScript(GUION);
  // Sin `ctx.route`: interceptar peticiones apaga la caché del navegador y la visita «en caliente» volvería a bajarlo todo. Lo de fuera
  // (carteles, Mapbox) no llega a ninguna parte: el navegador arranca con `--host-resolver-rules` y solo resuelve 127.0.0.1.
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  return { ctx, page, cdp };
}
const lento = async (cdp, si) => {
  await cdp.send("Network.emulateNetworkConditions", si ? FAST_3G : { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: si ? CPU : 1 });
};
/** Espera a que la pantalla se quede quieta: 2 s sin cambios en el DOM (tope 40 s). */
async function quieta(page) {
  await page.waitForLoadState("load", { timeout: 60000 }).catch(() => {});
  const inicio = Date.now();
  while (Date.now() - inicio < 40000) {
    const quieto = await page.evaluate(() => performance.now() - window.__t.ultimo);
    if (quieto > 2000) return;
    await dormir(250);
  }
}
const leerMetricas = (page) =>
  page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const fcp = performance.getEntriesByName("first-contentful-paint")[0];
    const recursos = performance.getEntriesByType("resource");
    const js = recursos.filter((r) => r.initiatorType === "script" || /\.js(\?|$)/.test(r.name));
    const css = recursos.filter((r) => /\.css(\?|$)/.test(r.name));
    // Los datos de React que viajan dentro del HTML (`self.__next_f.push(…)` en guiones en línea): lo que el servidor manda al teléfono.
    const datos = [...document.querySelectorAll("script:not([src])")].filter((x) => x.textContent.includes("__next_f")).reduce((s, x) => s + x.textContent.length, 0);
    return {
      htmlFin: nav?.responseEnd ?? null,
      fcp: fcp?.startTime ?? null,
      esqueleto: window.__t.esqueleto,
      contenido: window.__t.contenido,
      completa: window.__t.ultimo,
      html: nav?.encodedBodySize ?? null,
      htmlDecodificado: nav?.decodedBodySize ?? null,
      jsArchivos: js.length,
      jsBajado: js.reduce((s, r) => s + (r.transferSize || 0), 0),
      jsPeso: js.reduce((s, r) => s + (r.encodedBodySize || 0), 0),
      css: css.reduce((s, r) => s + (r.encodedBodySize || 0), 0),
      datosReact: datos,
      nodos: document.querySelectorAll("*").length,
      ultimosCambios: window.__t.cambios.slice(-4).map((c) => c.join(" ")).join(" | "),
    };
  });
async function medirNavegador(p, caliente) {
  const corridas = [];
  for (let i = 0; i < CORRIDAS; i++) {
    const { ctx, page, cdp } = await contexto();
    try {
      await page.addInitScript((s) => (window.__sel = s), p.contenido);
      if (caliente) {
        // Una visita completa antes (archivos en la caché del navegador, como la app instalada), sin red lenta.
        await page.goto(base + p.url, { waitUntil: "load", timeout: 60000 });
        await quieta(page);
      }
      await lento(cdp, true);
      // El primer byte, de las herramientas de Chrome: con la red simulada, `responseStart` de la página no cuenta el retraso (Chrome 156).
      const doc = {};
      const alPedir = (e) => e.type === "Document" && doc.id === undefined && ((doc.id = e.requestId), (doc.t0 = e.timestamp));
      const alResponder = (e) => e.requestId === doc.id && doc.t1 === undefined && (doc.t1 = e.timestamp);
      cdp.on("Network.requestWillBeSent", alPedir);
      cdp.on("Network.responseReceived", alResponder);
      lote = `B:${p.id}:${caliente ? "caliente" : "frio"}:${i}`;
      await page.goto(base + p.url, { waitUntil: "commit", timeout: 90000 });
      await quieta(page);
      const m = await leerMetricas(page);
      m.primerByte = doc.t1 !== undefined ? (doc.t1 - doc.t0) * 1000 : null;
      const filas = registro.filter((f) => f.lote === lote && f.origen === "servidor");
      m.consultasServidor = filas.length;
      if (i === 0) m.consultas = filas.map((f) => corta(f.ruta));
      m.consultasNavegador = registro.filter((f) => f.lote === lote && f.origen === "navegador").length;
      corridas.push(m);
      if (i === 0) await page.screenshot({ path: path.join(SALIDA, `B-${p.id}-${caliente ? "caliente" : "frio"}.png`) });
    } finally {
      lote = null;
      await ctx.close();
    }
  }
  const llaves = Object.keys(corridas[0]).filter((k) => typeof corridas[0][k] === "number" || corridas[0][k] === null);
  return { ...Object.fromEntries(llaves.map((k) => [k, mediana(corridas.map((c) => c[k]))])), corridas };
}
if (browser) {
  retraso = LATENCIA;
  for (const p of PANTALLAS) {
    for (const caliente of [false, true]) {
      const r = await medirNavegador(p, caliente);
      (resultado.navegador[p.id] ??= {})[caliente ? "caliente" : "frio"] = r;
      console.log(`B · ${p.id} ${caliente ? "caliente" : "frío"}: primer byte ${ms(r.primerByte)}, FCP ${ms(r.fcp)}, contenido ${ms(r.contenido)}, completa ${ms(r.completa)}, JS ${kb(r.jsPeso)}, datos React ${kb(r.datosReact)}`);
    }
  }

  // ---------- C · navegación dentro de la app ----------
  /** Toca un enlace (clic real por coordenadas) y mide desde el toque: la espera, el contenido y el último cambio. */
  async function navegar(page, enlace, sel, prisa) {
    const loc = page.locator(enlace).first();
    await loc.evaluate((e) => e.scrollIntoView({ block: "center" }));
    // El enlace ya a la vista: lo que Next adelanta al verlo (prefetch) tiene tiempo de llegar; con `prisa`, se toca en cuanto se ve.
    await dormir(prisa ? 50 : 1500);
    const b = await loc.boundingBox();
    await page.evaluate((s) => {
      window.__sel = s;
      window.__t.esqueleto = null;
      window.__t.contenido = null;
      window.__toque = performance.now();
    }, sel);
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    const inicio = Date.now();
    while (Date.now() - inicio < 40000) {
      const t = await page.evaluate(() => ({ quieto: performance.now() - window.__t.ultimo, contenido: window.__t.contenido }));
      if (t.contenido !== null && t.quieto > 2000) break;
      await dormir(250);
    }
    return page.evaluate(() => ({ esqueleto: window.__t.esqueleto === null ? null : window.__t.esqueleto - window.__toque, contenido: window.__t.contenido === null ? null : window.__t.contenido - window.__toque, completa: window.__t.ultimo - window.__toque }));
  }
  const viajes = [
    { id: "inicio-admin", nombre: "Inicio → Administración (botón de la barra)", desde: "/", enlace: 'header a[href="/admin"], a[href="/admin"]', contenido: "main h2" },
    { id: "admin-instagram", nombre: "Administración → Instagram (su renglón)", desde: "/admin", enlace: 'main a[href="/admin/instagram"]', contenido: 'main [aria-label="Instagram"]' },
    { id: "admin-instagram-prisa", nombre: "Administración → Instagram, tocado en cuanto se ve", desde: "/admin", enlace: 'main a[href="/admin/instagram"]', contenido: 'main [aria-label="Instagram"]', prisa: true },
  ].filter((v) => !SOLO || v.id.includes(SOLO));
  for (const v of viajes) {
    const corridas = [];
    for (let i = 0; i < CORRIDAS; i++) {
      const { ctx, page, cdp } = await contexto();
      try {
        await page.goto(base + v.desde, { waitUntil: "load", timeout: 60000 });
        await quieta(page);
        await lento(cdp, true);
        lote = `C:${v.id}:${i}`;
        const m = await navegar(page, v.enlace, v.contenido, v.prisa);
        await dormir(1000);
        const filas = registro.filter((f) => f.lote === lote && f.origen === "servidor");
        m.consultasServidor = filas.length;
        if (i === 0) m.consultas = filas.map((f) => corta(f.ruta));
        corridas.push(m);
        if (i === 0) await page.screenshot({ path: path.join(SALIDA, `C-${v.id}.png`) });
      } finally {
        lote = null;
        await ctx.close();
      }
    }
    resultado.navegacion[v.id] = { nombre: v.nombre, esqueleto: mediana(corridas.map((c) => c.esqueleto)), contenido: mediana(corridas.map((c) => c.contenido)), completa: mediana(corridas.map((c) => c.completa)), consultasServidor: mediana(corridas.map((c) => c.consultasServidor)), corridas };
    console.log(`C · ${v.id}: espera ${ms(resultado.navegacion[v.id].esqueleto)}, contenido ${ms(resultado.navegacion[v.id].contenido)}, completa ${ms(resultado.navegacion[v.id].completa)}`);
  }
  retraso = 0;
}

// ---------- D · publicar en Instagram ----------
if (browser && !args.includes("--sin-publicar") && (!SOLO || "instagram".includes(SOLO))) {
  const TITULO = "Delirium Pollum";
  await fetch(`${respaldoUrl}/__lento?ms=8000`);
  retraso = LATENCIA;
  const { ctx, page, cdp } = await contexto({ escala: 1 });
  const peticiones = [];
  const t0 = { v: null };
  page.on("request", (q) => {
    const h = q.headers();
    const tipo = h["next-action"] ? "acción del servidor" : h["rsc"] ? (h["next-router-state-tree"] ? "refresco/RSC" : "RSC") : null;
    if (tipo && t0.v !== null) peticiones.push({ tipo, t: Date.now() - t0.v, url: q.url().replace(base, "").slice(0, 100), q });
  });
  page.on("requestfinished", (q) => {
    const p = peticiones.find((x) => x.q === q);
    if (p) p.fin = Date.now() - t0.v;
  });
  try {
    await page.goto(`${base}/admin/instagram?ciudad=san-luis-potosi&pestana=eventos`, { waitUntil: "load" });
    await quieta(page);
    await lento(cdp, true);
    // La persona bajó por la lista hasta el evento (a media pantalla) y lo toca.
    const fila = () => page.locator("main li", { hasText: TITULO }).first();
    await fila().evaluate((e) => {
      window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 420);
      e.__marca = "original";
    });
    await dormir(400);
    const caja = await fila().locator("a").first().boundingBox();
    await page.mouse.click(caja.x + 60, caja.y + caja.height / 2);
    const hoja = page.getByRole("dialog", { name: "Publicar en Instagram" });
    const boton = hoja.getByRole("button", { name: "Publicar", exact: true });
    await boton.waitFor({ timeout: 40000 });
    await dormir(800);
    const antes = await page.evaluate((t) => {
      const li = [...document.querySelectorAll("main li")].find((x) => x.textContent.includes(t));
      return { scrollY: Math.round(window.scrollY), alto: document.documentElement.scrollHeight, fila: li ? Math.round(li.getBoundingClientRect().top) : null };
    }, TITULO);
    const b = await boton.boundingBox();
    lote = "D";
    t0.v = Date.now();
    const t0Registro = performance.now() - reloj0;
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    const cuadros = [];
    for (let i = 0; i <= 80; i++) {
      const t = Date.now() - t0.v;
      const estado = await page.evaluate((titulo) => {
        const lis = [...document.querySelectorAll("main li")];
        const li = lis.find((x) => x.textContent.includes(titulo));
        const grupo = li?.closest("section")?.querySelector("h2")?.textContent ?? null;
        const r = li?.getBoundingClientRect();
        return {
          scrollY: Math.round(window.scrollY),
          alto: document.documentElement.scrollHeight,
          hoja: !!document.querySelector('[role="dialog"]'),
          capas: document.documentElement.hasAttribute("data-capas"),
          fila: r ? Math.round(r.top) : null,
          filaAlto: r ? Math.round(r.height) : null,
          aLaVista: r ? r.bottom > 0 && r.top < window.innerHeight : false,
          mismoNodo: li ? li.__marca === "original" : null,
          texto: li ? li.innerText.replace(/\s+/g, " ").trim().slice(0, 240) : null,
          grupo,
          renglones: lis.length,
          cambios: window.__t.cambios.length,
        };
      }, TITULO);
      cuadros.push({ t, ...estado });
      await page.screenshot({ path: path.join(SALIDA, `D-${String(i).padStart(2, "0")}-${String(t).padStart(5, "0")}ms.jpg`), type: "jpeg", quality: 55 });
      if (cuadros.filter((c) => /^Ya en Instagram/.test(c.grupo ?? "")).length > 6) break;
      const siguiente = t0.v + (i + 1) * 500;
      await dormir(Math.max(0, siguiente - Date.now()));
    }
    const publicado = cuadros.find((c) => /^Ya en Instagram/.test(c.grupo ?? ""));
    const publicando = cuadros.find((c) => /Publicando/.test(c.texto ?? ""));
    resultado.publicar = {
      titulo: TITULO,
      antes,
      cuadros,
      peticiones: peticiones.map((p) => ({ tipo: p.tipo, t: p.t, fin: p.fin, url: p.url })),
      // Lo que pidió el servidor a la base durante el recorrido (la acción, los refrescos, las preguntas de cada 5 s, el trabajador de la cola).
      consultasServidor: registro.filter((f) => f.lote === "D" && f.origen === "servidor").map((f) => ({ t: Math.round(f.t0 - t0Registro), q: `${f.metodo} ${corta(f.ruta)}` })),
      publicandoEn: publicando?.t ?? null,
      publicadoEn: publicado?.t ?? null,
      hojaCerradaEn: cuadros.find((c) => !c.hoja)?.t ?? null,
    };
    console.log(`D · publicar: hoja cerrada a los ${ms(resultado.publicar.hojaCerradaEn)}, «Publicando…» a los ${ms(resultado.publicar.publicandoEn)}, «Publicado» a los ${ms(resultado.publicar.publicadoEn)}, ${peticiones.length} peticiones de React`);
  } finally {
    lote = null;
    await ctx.close();
    retraso = 0;
    await fetch(`${respaldoUrl}/__lento?ms=0`);
  }
}
if (browser) await browser.close();

// ---------- la salida ----------
fs.writeFileSync(path.join(SALIDA, "tiempos.json"), JSON.stringify(resultado, null, 1));
const lineas = [];
lineas.push(`# Tiempos de carga · ${resultado.fecha}`, "", `Retraso por consulta a la base: ${LATENCIA} ms${EXTRA.size ? ` (y de más: ${[...EXTRA].map(([f, n]) => `${f} ${n} ms`).join(", ")})` : ""}. Corridas: ${CORRIDAS} (mediana). Navegador: ${resultado.red}.`, "");
lineas.push("## A · servidor (HTML pedido desde Node, sin navegador)", "", "| Pantalla | Retraso | Primer byte | Llega el contenido | Fin del HTML | HTML | Trozos | Consultas | Antes del contenido | Cadena en serie hasta el contenido |", "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
for (const p of PANTALLAS) for (const lat of LATENCIAS) {
  const s = resultado.servidor[p.id][lat];
  lineas.push(`| ${p.nombre} | ${lat} ms | ${ms(s.primerByte)} | ${ms(s.contenido)} | ${ms(s.fin)} | ${kb(s.bytes)} | ${s.trozos} | ${s.consultas} | ${s.antesDelContenido} | ${s.cadenaContenido} |`);
}
if (Object.keys(resultado.navegador).length) {
  lineas.push("", "## B · navegador (Fast 3G, CPU ×4)", "", "| Pantalla | Caché | Primer byte | FCP | Contenido | Completa | HTML | JS (peso · bajado) | Datos de React en el HTML | Nodos | Consultas (servidor · navegador) |", "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const p of PANTALLAS) for (const k of ["frio", "caliente"]) {
    const n = resultado.navegador[p.id]?.[k];
    if (n) lineas.push(`| ${p.nombre} | ${k === "frio" ? "fría" : "caliente"} | ${ms(n.primerByte)} | ${ms(n.fcp)} | ${ms(n.contenido)} | ${ms(n.completa)} | ${kb(n.html)} | ${kb(n.jsPeso)} · ${kb(n.jsBajado)} | ${kb(n.datosReact)} | ${n.nodos} | ${n.consultasServidor} · ${n.consultasNavegador} |`);
  }
}
if (Object.keys(resultado.navegacion).length) {
  lineas.push("", "## C · navegación dentro de la app (Fast 3G, CPU ×4)", "", "| Viaje | Espera visible | Contenido | Completa | Consultas del servidor |", "| --- | --- | --- | --- | --- |");
  for (const v of Object.values(resultado.navegacion)) lineas.push(`| ${v.nombre} | ${ms(v.esqueleto)} | ${ms(v.contenido)} | ${ms(v.completa)} | ${v.consultasServidor} |`);
}
if (resultado.publicar) {
  const r = resultado.publicar;
  lineas.push("", "## D · publicar en Instagram", "", `Antes de tocar «Publicar»: desplazamiento ${r.antes.scrollY}, renglón a ${r.antes.fila} px del borde de arriba, página de ${r.antes.alto} px.`, "", "| t | Hoja | Desplazamiento | Renglón (top) | A la vista | Mismo nodo | Grupo | Alto de la página | Texto |", "| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  let previo = "";
  for (const c of r.cuadros) {
    const clave = JSON.stringify([c.hoja, c.scrollY, c.fila, c.mismoNodo, c.grupo, c.alto, c.texto]);
    if (clave === previo) continue;
    previo = clave;
    lineas.push(`| ${ms(c.t)} | ${c.hoja ? "abierta" : "—"} | ${c.scrollY} | ${c.fila} | ${c.aLaVista ? "sí" : "no"} | ${c.mismoNodo === null ? "—" : c.mismoNodo ? "sí" : "no"} | ${c.grupo ?? "—"} | ${c.alto} | ${(c.texto ?? "").replace(/\|/g, "/")} |`);
  }
  lineas.push("", "Peticiones de React tras el toque:", "", ...r.peticiones.map((p) => `- ${ms(p.t)} → ${ms(p.fin)} · ${p.tipo} · ${p.url}`));
}
fs.writeFileSync(path.join(SALIDA, "tiempos.md"), lineas.join("\n") + "\n");
console.log(`\nlisto: ${path.join(SALIDA, "tiempos.md")}`);
process.exit(0);
