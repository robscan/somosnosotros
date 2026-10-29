// Recorrido de OL-473 (bitácora 505) en la APP REAL: el Historial del lugar y la Trayectoria del artista escalables, ya en código, contra lo
// firmado (prototipo `docs/rediseno/prototipos/historial-escalable.html`, bitácora 501, «F1 · L1 · A1»). La app compilada contra el respaldo
// local con el historial grande (`RESPALDO_HISTORIAL=1`: el Museo Leonora Carrington (demo) con 84 eventos pasados y 9 artistas con ficha;
// Valeria Quiroz (demo) con 30 fechas en 8 lugares), sin sesión y con la de Ana (que gestiona las dos fichas). Chrome real de la Mac
// (playwright-core), 390×844 a 2× y 320 y 430. Toques reales: cada toque con el ratón en el centro de su caja, comprobado antes con
// `elementFromPoint`; el carril se arrastra con un gesto táctil de Chrome (`Input.synthesizeScrollGesture`), nunca con `scrollLeft`.
// Cada estado se coloca como en el prototipo (lo que enseña a 150 px de arriba) y se mide igual que su estado firmado, abierto desde el disco
// en el mismo Chrome: las cajas de cada pieza (alto, ancho y distancia al renglón del plegado) tienen que coincidir (±1 px).
// Nunca toca producción ni un `.env`.
//   node scripts/ops/auditoria-ui/capturar-historial-escalable-codigo.mjs <carpeta de salida>
// SIN_BUILD=1 usa el `.next` que ya hay (compilado contra el mismo puerto: `PUERTO_RESPALDO`).
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const RAIZ = path.resolve(AQUI, "../../..");
const SALIDA = process.argv[2] && path.resolve(process.argv[2]);
if (!SALIDA) { console.error("uso: capturar-historial-escalable-codigo.mjs <carpeta>"); process.exit(1); }
if (fs.existsSync(path.join(RAIZ, ".env"))) { console.error("hay un .env en el árbol: la app cargaría llaves reales. Córrelo en un árbol sin .env"); process.exit(1); }
process.env.RESPALDO_HISTORIAL = "1";
const requerir = createRequire(path.join(RAIZ, "package.json"));
const { chromium } = requerir("playwright-core");
const { cookie, LLAVE_SERVICIO } = await import(path.join(AQUI, "respaldo-local/fixture.mjs"));
const { dibujarFotosHistorial } = await import(path.join(AQUI, "respaldo-local/fotos-historial.mjs"));
const NEXT = path.join(RAIZ, "node_modules/next/dist/bin/next");
const MAC = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PROTO = "file://" + path.join(RAIZ, "docs/rediseno/prototipos/historial-escalable.html");
const AHORA = "2026-10-07T16:00:00Z"; // mié 7 de oct, como `medir` y las maquetas del prototipo
fs.mkdirSync(SALIDA, { recursive: true });

// ---------- la app contra el respaldo ----------
const hijos = [];
process.on("exit", () => hijos.forEach((h) => h.exitCode === null && h.kill()));
const lanzar = (args, env) => {
  const h = spawn(process.execPath, args, { cwd: RAIZ, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  let salida = "";
  h.stdout.on("data", (d) => (salida += d));
  h.stderr.on("data", (d) => (salida += d));
  h.registro = () => salida.slice(-3000);
  hijos.push(h);
  return h;
};
const puertoLibre = () => new Promise((ok) => { const s = net.createServer().listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => ok(p)); }); });
async function esperar(url, h) {
  for (let i = 0; i < 300; i++) {
    if (h.exitCode !== null) throw new Error(`se cerró\n${h.registro()}`);
    try { if ((await fetch(url)).status < 500) return; } catch {}
    await new Promise((ok) => setTimeout(ok, 200));
  }
  throw new Error(`no respondió: ${url}\n${h.registro()}`);
}
const pr = Number(process.env.PUERTO_RESPALDO) || (await puertoLibre());
const pa = await puertoLibre();
const respaldo = `http://127.0.0.1:${pr}`;
const base = `http://127.0.0.1:${pa}`;
const fotos = fs.mkdtempSync(path.join(os.tmpdir(), "ol473-"));
await dibujarFotosHistorial(fotos);
const reloj = { RELOJ_FIJO: AHORA, TZ: "America/Mexico_City", NODE_OPTIONS: `--require=${path.join(AQUI, "reloj-fijo.cjs")}` };
const app = { NEXT_PUBLIC_SUPABASE_URL: respaldo, NEXT_PUBLIC_SUPABASE_ANON_KEY: "llave-anon-inventada", NEXT_PUBLIC_MAPBOX_TOKEN: "pk.inventado", SUPABASE_SERVICE_ROLE_KEY: LLAVE_SERVICIO };
const r = lanzar([path.join(AQUI, "respaldo-local/server.mjs"), String(pr)], { ...reloj, RESPALDO_URL: respaldo, RESPALDO_CARRUSEL_DIR: fotos });
await esperar(`${respaldo}/rest/v1/eventos?select=id&limit=1`, r);
if (!process.env.SIN_BUILD) {
  process.stdout.write("compilando la app contra el respaldo… ");
  const t = Date.now();
  const b = spawnSync(process.execPath, [NEXT, "build"], { cwd: RAIZ, env: { ...process.env, ...app }, encoding: "utf8", maxBuffer: 1 << 26 });
  if (b.status !== 0) throw new Error((b.stdout + b.stderr).slice(-3000));
  console.log(`${Math.round((Date.now() - t) / 1000)} s`);
}
const s = lanzar([NEXT, "start", "-p", String(pa)], { ...app, ...reloj });
await esperar(`${base}/entrar`, s);

const browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE || (fs.existsSync(MAC) ? MAC : undefined), headless: true, args: ["--hide-scrollbars"] });
const errores = [];
const fallos = [];
let comprobaciones = 0;
const comprobar = (si, texto) => { comprobaciones++; console.log(si ? "     ok" : "     FALLA", "·", texto); if (!si) fallos.push(texto); };

// ---------- lo que se mide, igual en la app y en el prototipo ----------
/** Las cajas de cada pieza de la sección abierta (y de la hoja, si hay una), relativas al renglón del plegado. */
const MEDIR = () => {
  const det = document.querySelector("details#historial, details#trayectoria");
  const base = det.querySelector(":scope > summary").getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const caja = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { arriba: Math.round(b.top - base.top), izq: Math.round(b.left), ancho: Math.round(b.width), alto: Math.round(b.height) }; };
  const texto = (el) => el?.textContent.replace(/\s+/g, " ").trim() ?? null;
  const botones = [...det.querySelectorAll(":scope > div > a, :scope > div > button")].filter((b) => /Tu año|Informe|Presentación/.test(b.textContent));
  const cabeza = [...det.querySelectorAll(":scope > p")].find((p) => /Han pasado por aquí|Se ha presentado en/.test(p.textContent));
  const carril = det.querySelector(":scope > ul[aria-label='Han pasado por aquí'], :scope > ul[aria-label='Se ha presentado en']");
  const avatares = carril ? [...carril.children] : [];
  const chips = det.querySelector(":scope > [role=group][aria-label='Año']");
  const h3 = det.querySelector(":scope > h3");
  const renglon = h3?.nextElementSibling?.firstElementChild;
  const mas = [...det.querySelectorAll("button")].find((b) => b.textContent.trim() === "Ver más");
  const hoja = [...document.querySelectorAll("[role=dialog]")].at(-1);
  const verLos = cabeza?.querySelector("a, button");
  return {
    pantalla: vw,
    desborda: document.documentElement.scrollWidth > vw + 1,
    resumen: { alto: Math.round(base.height), cuenta: texto(det.querySelector(":scope > summary > small")) },
    botones: botones.map((b) => ({ texto: texto(b), ...caja(b) })),
    cabeza: cabeza ? { texto: texto(cabeza.firstChild), ...caja(cabeza), verLos: verLos ? { texto: texto(verLos), ...caja(verLos) } : null } : null,
    carril: carril ? { ...caja(carril), avatares: avatares.length, foto: caja(avatares[0]?.querySelector("img")), columna: caja(avatares[0]), separacion: avatares[1] ? Math.round(avatares[1].getBoundingClientRect().left - avatares[0].getBoundingClientRect().right) : null, veces: texto(avatares[0]?.querySelector("a > span:last-child")), desplazable: carril.scrollWidth > carril.clientWidth } : null,
    chips: chips ? { ...caja(chips), cada: [...chips.children].map((c) => ({ texto: texto(c), alto: caja(c).alto, ancho: caja(c).ancho, elegido: c.getAttribute("aria-pressed") === "true" })) } : null,
    primerMes: h3 ? { texto: texto(h3), ...caja(h3) } : null,
    renglon: renglon ? { alto: caja(renglon).alto } : null,
    renglones: [...det.querySelectorAll(":scope > h3 + ul > li")].length,
    verMas: mas ? caja(mas) : null,
    hoja: hoja ? { etiqueta: hoja.getAttribute("aria-label"), ancho: Math.round(hoja.getBoundingClientRect().width), alto: Math.round(hoja.getBoundingClientRect().height), renglones: hoja.querySelectorAll("li").length, primero: hoja.querySelector("li") ? Math.round(hoja.querySelector("li").getBoundingClientRect().height) : null, nota: texto(hoja.querySelector("p")) } : null,
  };
};

/** Compara dos medidas: los números ±1 px; los textos iguales. Devuelve las diferencias. */
function diferencias(a, b, ruta = "") {
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) <= 1 ? [] : [`${ruta}: app ${a} · firmado ${b}`];
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return a === b ? [] : [`${ruta}: app ${JSON.stringify(a)} · firmado ${JSON.stringify(b)}`];
  const claves = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...claves].flatMap((k) => diferencias(a[k], b[k], ruta ? `${ruta}.${k}` : k));
}

// ---------- el prototipo firmado ----------
const pctx = await browser.newContext({ viewport: { width: 900, height: 1300 }, deviceScaleFactor: 1, hasTouch: true, locale: "es-MX" });
const ppage = await pctx.newPage();
await ppage.goto(PROTO);
await ppage.waitForFunction(() => window.prototipo && document.documentElement.dataset.pintado);
async function firmado(id, ancho) {
  await ppage.evaluate(async ([id, ancho]) => { await window.prototipo.ir(id, ancho); return window.prototipo.listo(); }, [id, ancho]);
  await ppage.waitForTimeout(250);
  const marco = await (await ppage.$("#tel")).contentFrame();
  return marco.evaluate(MEDIR);
}

// ---------- la app ----------
async function abrir(url, { sesion = true, ancho = 390 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.clock.setFixedTime(new Date(AHORA));
  if (sesion) await ctx.addCookies([{ name: "sb-127-auth-token", value: cookie, url: base }]);
  await ctx.route("**/_vercel/**", (q) => q.fulfill({ contentType: "text/javascript", body: "" }));
  await ctx.route((u) => u.hostname !== "127.0.0.1", (q) => q.abort());
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(String(e.message).slice(0, 300)));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource|ERR_FAILED/.test(m.text()) && errores.push(`consola: ${m.text().slice(0, 300)}`));
  await page.goto(base + url, { waitUntil: "networkidle" });
  return { ctx, page };
}
/** Un toque de verdad, con el ratón, en el centro de la caja, a media pantalla y sin nada encima (`elementFromPoint`). */
async function tocar(page, locator) {
  await locator.evaluate((el) => window.scrollBy(0, el.getBoundingClientRect().top - 300));
  await page.waitForTimeout(100);
  const punto = await locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const e = document.elementFromPoint(x, y);
    return e && (e === el || el.contains(e)) ? { x, y } : null;
  });
  if (!punto) {
    const quien = await locator.evaluate((el) => { const r = el.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return e ? `${e.tagName.toLowerCase()}.${String(e.className).split(" ")[0]} «${e.textContent.trim().slice(0, 40)}» (caja ${Math.round(r.top)}–${Math.round(r.bottom)})` : "nadie"; });
    await page.screenshot({ path: path.join(SALIDA, "tapado.png") });
    throw new Error(`algo tapa «${(await locator.textContent()).slice(0, 40)}»: ${quien}`);
  }
  await page.mouse.click(punto.x, punto.y);
  await page.waitForTimeout(300);
}
/** El dedo que desliza de derecha a izquierda (un gesto táctil de Chrome, como en el teléfono). */
async function deslizar(page, x, y, distancia = -300) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.synthesizeScrollGesture", { x: Math.round(x), y: Math.round(y), xDistance: distancia, yDistance: 0, gestureSourceType: "touch", speed: 800, repeatCount: 1 });
  await page.waitForTimeout(500);
}
/** Lo que el estado enseña, a 150 px de arriba, como lo coloca el prototipo. */
async function colocar(page, que) {
  await page.evaluate((que) => {
    const det = document.querySelector("details#historial, details#trayectoria");
    const el =
      que === "fila" ? [...det.querySelectorAll(":scope > p")].find((p) => /Han pasado por aquí|Se ha presentado en/.test(p.textContent))
      : que === "chips" ? det.querySelector(":scope > [role=group][aria-label='Año']")
      : que === "mas" ? [...det.querySelectorAll("button")].find((b) => b.textContent.trim() === "Ver más")?.parentElement
      : det.querySelector(":scope > summary");
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 150);
  }, que);
  await page.waitForTimeout(400);
}
const resumen = (page) => page.locator("details#historial > summary, details#trayectoria > summary").first();

/** Un estado: lo arma con toques reales, lo coloca, lo captura, lo mide y lo compara con su estado firmado. */
async function estado(nombre, { url, sesion, ancho = 390, firmadoId, ver = "resumen", pasos = async () => {} }) {
  console.log(`\n· ${nombre} (${ancho}${sesion ? ", Ana" : ", sin sesión"}) ← firmado ${firmadoId}@${ancho}`);
  const { ctx, page } = await abrir(url, { sesion, ancho });
  await tocar(page, resumen(page));
  await pasos(page);
  if (ver) await colocar(page, ver);
  await page.screenshot({ path: path.join(SALIDA, `${nombre}.png`) });
  const app = await page.evaluate(MEDIR);
  const ref = await firmado(firmadoId, ancho);
  await ctx.close();
  // El desplazamiento del carril y la página no se comparan (dependen del dedo); lo demás, sí. A 430 el marco del prototipo pinta su barra de
  // desplazamiento (18 px: su contenido mide 412): ahí solo se comparan las medidas verticales y los textos.
  const horizontal = new Set(["pantalla", "izq", "ancho"]);
  const quitar = (o) => (o && typeof o === "object" ? (Array.isArray(o) ? o.map(quitar) : Object.fromEntries(Object.entries(o).filter(([k]) => !horizontal.has(k)).map(([k, v]) => [k, quitar(v)]))) : o);
  const mismoAncho = app.pantalla === ref.pantalla;
  if (!mismoAncho) console.log(`     (el marco firmado mide ${ref.pantalla} de ancho a ${ancho}: se comparan solo las medidas verticales y los textos)`);
  const dif = mismoAncho ? diferencias(app, ref) : diferencias(quitar(app), quitar(ref));
  comprobar(dif.length === 0, `${nombre}: medidas iguales a las firmadas${dif.length ? "\n         " + dif.join("\n         ") : ""}`);
  comprobar(!app.desborda, `${nombre}: nada se sale de la pantalla`);
  return { app, ref, dif };
}

const LUGAR = "/lugares/museo-leonora-carrington-demo";
const ARTISTA = "/artistas/valeria-quiroz-demo";
const resultados = {};
const anios = (page) => page.getByRole("group", { name: "Año" });

// El lugar, con la sesión de Ana: abierto, el carril, la hoja, un año, «Ver más», la segunda tanda y el informe.
resultados.lugarAna = await estado("01-lugar-ana", { url: LUGAR, sesion: true, firmadoId: "lugar-r-ana" });
comprobar(resultados.lugarAna.app.resumen.cuenta === "84 eventos · 9 artistas registrados", "la cuenta dice «84 eventos · 9 artistas registrados»");
comprobar(resultados.lugarAna.app.botones.map((b) => b.texto).join(" · ") === "Tu año · Informe", "«Tu año» e «Informe», lo primero de la sección");
resultados.carril = await estado("02-lugar-ana-carril-deslizado", {
  url: LUGAR, sesion: true, firmadoId: "lugar-r-carril-movido", ver: "fila",
  pasos: async (page) => {
    const carril = page.getByRole("list", { name: "Han pasado por aquí" });
    await carril.evaluate((el) => window.scrollBy(0, el.getBoundingClientRect().top - 300));
    const caja = await carril.boundingBox();
    const antes = await carril.evaluate((el) => el.scrollLeft);
    for (let i = 0; i < 3; i++) await deslizar(page, caja.x + caja.width - 60, caja.y + 50);
    const despues = await carril.evaluate((el) => ({ izq: el.scrollLeft, max: el.scrollWidth - el.clientWidth, pagina: window.scrollX + (window.visualViewport?.offsetLeft ?? 0) }));
    comprobar(antes === 0 && despues.izq > 0, `el dedo desliza el carril (0 → ${Math.round(despues.izq)} de ${despues.max})`);
    comprobar(despues.pagina === 0, "la página no se corre de lado");
    comprobar(new URL(page.url()).pathname === LUGAR, "deslizar no abre ningún avatar");
  },
});
resultados.todos = await estado("03-lugar-ana-ver-los-9", {
  url: LUGAR, sesion: true, firmadoId: "lugar-r-todos", ver: "fila",
  pasos: async (page) => {
    await tocar(page, page.getByRole("button", { name: "Ver los 9" }));
    await page.getByRole("dialog", { name: "Han pasado por aquí" }).waitFor();
    await page.waitForTimeout(500);
  },
});
comprobar(resultados.todos.app.hoja?.renglones === 9 && /9 artistas registrados/.test(resultados.todos.app.hoja?.nota ?? ""), "la hoja trae los 9 con su línea de qué cuenta");
resultados.anio = await estado("04-lugar-ana-2025", {
  url: LUGAR, sesion: true, firmadoId: "lugar-r-2025", ver: "chips",
  pasos: async (page) => {
    const historia = await page.evaluate(() => history.length);
    await tocar(page, anios(page).getByRole("button", { name: /2025/ }));
    comprobar((await page.evaluate(() => history.length)) === historia, "elegir un año no apila nada en Atrás");
  },
});
comprobar(resultados.anio.app.primerMes?.texto === "Diciembre de 2025", `el año 2025 empieza por diciembre (${resultados.anio.app.primerMes?.texto})`);
resultados.verMas = await estado("05-lugar-ana-ver-mas", { url: LUGAR, sesion: true, firmadoId: "lugar-r-ver-mas", ver: "mas" });
resultados.tanda2 = await estado("06-lugar-ana-tanda-2", {
  url: LUGAR, sesion: true, firmadoId: "lugar-r-tanda-2", ver: "mas",
  pasos: async (page) => {
    const historia = await page.evaluate(() => history.length);
    await tocar(page, page.getByRole("button", { name: "Ver más" }));
    comprobar((await page.evaluate(() => history.length)) === historia, "«Ver más» no apila nada en Atrás");
  },
});
comprobar(resultados.tanda2.app.renglones === 40, `la segunda tanda: 40 renglones (${resultados.tanda2.app.renglones})`);
resultados.informe = await estado("07-lugar-ana-informe", {
  url: LUGAR, sesion: true, firmadoId: "lugar-r-informe",
  pasos: async (page) => {
    await tocar(page, page.getByRole("button", { name: "Informe" }));
    await page.getByRole("dialog", { name: "Informe de actividad" }).waitFor();
    await page.waitForTimeout(500);
  },
});

// Volver de un evento repone el año, la tanda y el lugar de la página (memoria de pantalla).
{
  console.log("\n· 08-lugar-ana-volver (390, Ana): 2025, «Ver más», un evento y Atrás");
  const { ctx, page } = await abrir(LUGAR, { sesion: true });
  await tocar(page, resumen(page));
  await tocar(page, anios(page).getByRole("button", { name: /2025/ }));
  await tocar(page, page.getByRole("button", { name: "Ver más" }));
  const renglon = page.locator("details#historial > h3 + ul > li").nth(22).locator("a");
  // El renglón a 300 px de arriba, donde `tocar` lo deja: la posición que se recuerda es la de cuando se toca.
  await renglon.evaluate((el) => window.scrollBy(0, el.getBoundingClientRect().top - 300));
  await page.waitForTimeout(400);
  const antes = await page.evaluate(() => ({ y: Math.round(window.scrollY), renglones: document.querySelectorAll("details#historial > h3 + ul > li").length }));
  await tocar(page, renglon);
  await page.waitForURL((u) => u.pathname.startsWith("/eventos/"));
  await page.waitForLoadState("networkidle");
  await page.goBack();
  await page.waitForURL((u) => u.pathname === LUGAR);
  await page.locator("details#historial[open]").waitFor();
  await page.waitForTimeout(1500);
  const despues = await page.evaluate(() => ({ y: Math.round(window.scrollY), renglones: document.querySelectorAll("details#historial > h3 + ul > li").length, anio: document.querySelector("[role=group][aria-label='Año'] [aria-pressed=true]")?.textContent.replace(/\s+/g, " ").trim() }));
  await page.screenshot({ path: path.join(SALIDA, "08-lugar-ana-volver.png") });
  await ctx.close();
  comprobar(despues.anio === "2025 26" && despues.renglones === antes.renglones, `al volver: el plegado abierto en «${despues.anio}» con ${despues.renglones} renglones (antes ${antes.renglones})`);
  comprobar(Math.abs(despues.y - antes.y) <= 2, `al volver: la página donde estaba (${despues.y} / ${antes.y})`);
  resultados.volver = { antes, despues };
}

// Sin sesión, y los otros anchos.
resultados.lugarSin = await estado("09-lugar-sin-sesion", { url: LUGAR, sesion: false, firmadoId: "lugar-r-sin-sesion" });
comprobar(resultados.lugarSin.app.botones.length === 0, "sin sesión no hay «Tu año» ni «Informe»");
for (const ancho of [320, 430]) {
  resultados[`lugarAna${ancho}`] = await estado(`10-lugar-ana-${ancho}`, { url: LUGAR, sesion: true, ancho, firmadoId: "lugar-r-ana" });
  resultados[`lugarSin${ancho}`] = await estado(`11-lugar-sin-sesion-${ancho}`, { url: LUGAR, sesion: false, ancho, firmadoId: "lugar-r-sin-sesion" });
}
resultados.todos320 = await estado("12-lugar-ana-ver-los-9-320", {
  url: LUGAR, sesion: true, ancho: 320, firmadoId: "lugar-r-todos", ver: "fila",
  pasos: async (page) => { await tocar(page, page.getByRole("button", { name: "Ver los 9" })); await page.getByRole("dialog").waitFor(); await page.waitForTimeout(500); },
});
const [b1, b2] = resultados.lugarAna320.app.botones;
comprobar(b1 && b2 && b2.arriba > b1.arriba && b1.izq + b1.ancho <= 320 && b2.izq + b2.ancho <= 320, "a 320, «Tu año» e «Informe» uno bajo otro, enteros");

// La Trayectoria del artista.
resultados.artistaAna = await estado("13-artista-ana", { url: ARTISTA, sesion: true, firmadoId: "artista-r-ana" });
comprobar(resultados.artistaAna.app.resumen.cuenta === "30 fechas · 8 lugares", "la cuenta dice «30 fechas · 8 lugares»");
resultados.artistaTodos = await estado("14-artista-ana-ver-los-8", {
  url: ARTISTA, sesion: true, firmadoId: "artista-r-todos", ver: "fila",
  pasos: async (page) => { await tocar(page, page.getByRole("button", { name: "Ver los 8" })); await page.getByRole("dialog", { name: "Se ha presentado en" }).waitFor(); await page.waitForTimeout(500); },
});
resultados.artista2025 = await estado("15-artista-ana-2025", { url: ARTISTA, sesion: true, firmadoId: "artista-r-2025", ver: "chips", pasos: async (page) => tocar(page, anios(page).getByRole("button", { name: /2025/ })) });
resultados.presentacion = await estado("16-artista-ana-presentacion", {
  url: ARTISTA, sesion: true, firmadoId: "artista-r-presentacion",
  pasos: async (page) => { await tocar(page, page.getByRole("button", { name: "Presentación" })); await page.getByRole("dialog", { name: "Presentación" }).waitFor(); await page.waitForTimeout(500); },
});
resultados.artistaSin = await estado("17-artista-sin-sesion", { url: ARTISTA, sesion: false, firmadoId: "artista-r-sin-sesion" });
for (const ancho of [320, 430]) {
  resultados[`artistaAna${ancho}`] = await estado(`18-artista-ana-${ancho}`, { url: ARTISTA, sesion: true, ancho, firmadoId: "artista-r-ana" });
  resultados[`artistaSin${ancho}`] = await estado(`19-artista-sin-sesion-${ancho}`, { url: ARTISTA, sesion: false, ancho, firmadoId: "artista-r-sin-sesion" });
}

fs.writeFileSync(path.join(SALIDA, "recorrido.json"), JSON.stringify(resultados, null, 2));
console.log(`\nerrores de página: ${errores.length}${errores.length ? "\n  " + errores.join("\n  ") : ""}`);
comprobar(errores.length === 0, "cero errores de página");
console.log(fallos.length ? `\n${fallos.length} de ${comprobaciones} comprobaciones fallaron` : `\n${comprobaciones} de ${comprobaciones} comprobaciones en verde`);
await browser.close();
process.exit(fallos.length ? 1 : 0);
