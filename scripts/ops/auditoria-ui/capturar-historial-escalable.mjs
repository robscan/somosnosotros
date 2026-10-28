// Diagnóstico de la bitácora 501 (OL-469) en la APP REAL: por qué «Han pasado por aquí» no se desplaza y por qué el botón «Informe» queda
// cortado. La app compilada contra el respaldo local con el historial grande (`RESPALDO_HISTORIAL=1`: el Museo Leonora Carrington (demo) con
// 84 eventos pasados y 9 artistas con ficha; Valeria Quiroz (demo) con 30 fechas pasadas en 8 lugares con ficha), sin sesión y con la de Ana (que
// gestiona las dos fichas). Chrome real de la Mac (playwright-core), 390×844 a 2× y una pasada a 320 y 430. Toques reales: el plegado se abre con
// el ratón en el centro de su renglón, comprobado antes con `elementFromPoint`; el carril se arrastra con un gesto táctil de verdad
// (`Input.synthesizeScrollGesture` de Chrome, el dedo que desliza de derecha a izquierda), nunca con `scrollLeft`. Mide la fila, su contenedor y
// el botón, y repite todo con UNA regla de prueba inyectada solo en la página (`[data-cuerpo] { grid-template-columns: minmax(0, 1fr) }`): si
// con ella todo cabe y se desplaza, la causa queda demostrada. No cambia el código de la app. Nunca toca producción ni un `.env`.
//   node scripts/ops/auditoria-ui/capturar-historial-escalable.mjs <carpeta de salida>
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
if (!SALIDA) { console.error("uso: capturar-historial-escalable.mjs <carpeta>"); process.exit(1); }
if (fs.existsSync(path.join(RAIZ, ".env"))) { console.error("hay un .env en el árbol: la app cargaría llaves reales. Córrelo en un árbol sin .env"); process.exit(1); }
process.env.RESPALDO_HISTORIAL = "1";
const requerir = createRequire(path.join(RAIZ, "package.json"));
const { chromium } = requerir("playwright-core");
const { cookie, LLAVE_SERVICIO } = await import(path.join(AQUI, "respaldo-local/fixture.mjs"));
const { dibujarFotosHistorial } = await import(path.join(AQUI, "respaldo-local/fotos-historial.mjs"));
const NEXT = path.join(RAIZ, "node_modules/next/dist/bin/next");
const MAC = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
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
const fotos = fs.mkdtempSync(path.join(os.tmpdir(), "ol469-"));
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
const comprobar = (si, texto) => { console.log(si ? "     ok" : "     FALLA", "·", texto); if (!si) fallos.push(texto); };
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
/** Un toque de verdad, con el ratón: en el centro de la parte del elemento que se ve en la pantalla (hoy el renglón del plegado mide más que
 *  ella y su centro cae fuera), a media altura de la pantalla para que la pastilla «Seguir» no lo tape, y sin nada encima (`elementFromPoint`). */
async function tocar(page, locator) {
  await locator.evaluate((el) => window.scrollBy(0, el.getBoundingClientRect().top - 300));
  const punto = await locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const x = (Math.max(r.left, 0) + Math.min(r.right, document.documentElement.clientWidth)) / 2, y = (Math.max(r.top, 0) + Math.min(r.bottom, innerHeight)) / 2;
    const e = document.elementFromPoint(x, y);
    return e && (e === el || el.contains(e)) ? { x, y } : null;
  });
  if (!punto) throw new Error("algo tapa: " + (await locator.textContent()));
  await page.mouse.click(punto.x, punto.y);
}
/** El dedo que desliza de derecha a izquierda sobre la fila (un gesto táctil de Chrome, como en el teléfono). */
async function deslizar(page, x, y, distancia = -260) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.synthesizeScrollGesture", { x, y, xDistance: distancia, yDistance: 0, gestureSourceType: "touch", speed: 800, repeatCount: 1 });
  await page.waitForTimeout(400);
}
const REGLA = "[data-cuerpo] { grid-template-columns: minmax(0, 1fr) !important; }";

/** Las medidas que explican el fallo: la fila, el plegado, el cuerpo de la ficha y los botones del final, y quién está en cada punto. */
const MEDIR = () => {
  const fila = document.querySelector("details[open] ul[aria-label='Han pasado por aquí'], details[open] ul[aria-label='Se ha presentado en']");
  const det = fila?.closest("details");
  const cuerpo = document.querySelector("[data-cuerpo]");
  const vw = document.documentElement.clientWidth;
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { izq: Math.round(b.left), der: Math.round(b.right), ancho: Math.round(b.width) }; };
  const fotos = fila ? [...fila.children] : [];
  const enteras = fotos.filter((li) => { const b = li.getBoundingClientRect(); return b.left >= -1 && b.right <= vw + 1; }).length;
  const asoman = fotos.filter((li) => { const b = li.getBoundingClientRect(); return b.left < vw && b.right > vw + 1; }).length;
  const botones = det ? [...det.querySelectorAll(":scope > div > a, :scope > div > button")] : [];
  const cs = (el, p) => (el ? getComputedStyle(el)[p] : null);
  // Quién está en el centro de la última foto y del último botón (si cae fuera de la pantalla, nadie: `elementFromPoint` da null).
  const centro = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); const e = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return e ? (el.contains(e) || e === el ? "el mismo" : e.tagName.toLowerCase() + (e.className ? "." + String(e.className).split(" ")[0] : "")) : "nadie (fuera de la pantalla)"; };
  return {
    pantalla: vw,
    documento: { ancho: document.documentElement.scrollWidth, desborda: document.documentElement.scrollWidth > vw + 1, scrollX: Math.round(window.scrollX), panoramica: Math.round(window.visualViewport?.offsetLeft ?? 0) },
    cuerpo: { ...r(cuerpo), columnas: cs(cuerpo, "gridTemplateColumns"), scrollWidth: cuerpo?.scrollWidth, clientWidth: cuerpo?.clientWidth, overflowX: cs(cuerpo, "overflowX") },
    plegado: { ...r(det), minWidth: cs(det, "minWidth"), overflowX: cs(det, "overflowX"), display: cs(det, "display") },
    fila: { ...r(fila), fotos: fotos.length, enteras, asoman, scrollWidth: fila?.scrollWidth, clientWidth: fila?.clientWidth, scrollLeft: fila ? Math.round(fila.scrollLeft) : null, sePuedeDesplazar: fila ? fila.scrollWidth > fila.clientWidth + 1 : null },
    ultimaFoto: { ...r(fotos.at(-1)), enElCentro: centro(fotos.at(-1)) },
    botones: botones.map((b) => ({ texto: b.textContent.trim(), ...r(b), enElCentro: centro(b), cortado: b.getBoundingClientRect().right > vw + 1 })),
    cortadoPor: [...document.querySelectorAll("*")].filter((el) => el !== document.documentElement && el !== document.body && el.contains(fila) && ["hidden", "clip"].includes(getComputedStyle(el).overflowX)).map((el) => el.tagName.toLowerCase() + "." + String(el.className).split(" ")[0]),
  };
};

const resultados = {};
async function caso(nombre, url, { sesion, ancho = 390, regla = false, capturas = true }) {
  console.log(`\n· ${nombre} (${ancho}${sesion ? ", Ana" : ", sin sesión"}${regla ? ", con la regla de prueba" : ""})`);
  const { ctx, page } = await abrir(url, { sesion, ancho });
  if (regla) await page.addStyleTag({ content: REGLA });
  const resumen = page.locator("details#historial > summary, details#trayectoria > summary").first();
  if (capturas) { await resumen.scrollIntoViewIfNeeded(); await page.evaluate(() => window.scrollBy(0, -200)); await page.screenshot({ path: path.join(SALIDA, `${nombre}-1-plegado.png`) }); }
  await tocar(page, resumen);
  await page.waitForTimeout(300);
  const fila = page.locator("details[open] ul").first();
  await fila.scrollIntoViewIfNeeded();
  await page.evaluate(() => { const f = document.querySelector("details[open] ul"); window.scrollBy(0, f.getBoundingClientRect().top - 220); });
  await page.waitForTimeout(200);
  const antes = await page.evaluate(MEDIR);
  if (capturas) await page.screenshot({ path: path.join(SALIDA, `${nombre}-2-fila.png`) });
  const caja = await fila.boundingBox();
  await deslizar(page, Math.min(caja.x + caja.width - 40, ancho - 40), caja.y + 40);
  const despues = await page.evaluate(MEDIR);
  if (capturas) await page.screenshot({ path: path.join(SALIDA, `${nombre}-3-tras-deslizar.png`) });
  await ctx.close();
  // El final de la sección, en una página nueva (sin el gesto de antes): los botones «Tu año» e «Informe» / «Presentación» (solo con la sesión
  // de quien gestiona), donde quedan tras toda la lista.
  const otra = await abrir(url, { sesion, ancho });
  if (regla) await otra.page.addStyleTag({ content: REGLA });
  await tocar(otra.page, otra.page.locator("details#historial > summary, details#trayectoria > summary").first());
  const fin = await otra.page.evaluate(() => { const d = document.querySelector("details[open]"); const b = d.lastElementChild; b.scrollIntoView({ block: "center" }); return { alto: Math.round(d.getBoundingClientRect().height), meses: d.querySelectorAll(":scope > h3").length, renglones: d.querySelectorAll(":scope > h3 + ul > li").length }; });
  await otra.page.waitForTimeout(600);
  await otra.page.evaluate(() => document.querySelector("details[open]").lastElementChild.scrollIntoView({ block: "center" }));
  await otra.page.waitForTimeout(200);
  const alFinal = await otra.page.evaluate(MEDIR);
  if (capturas) await otra.page.screenshot({ path: path.join(SALIDA, `${nombre}-4-final.png`) });
  await otra.ctx.close();
  resultados[`${nombre}@${ancho}${regla ? "+regla" : ""}`] = { antes, despues, alFinal, fin };
  console.log(`  pantalla ${antes.pantalla} · cuerpo ${antes.cuerpo.ancho} (columnas «${antes.cuerpo.columnas}») · plegado ${antes.plegado.ancho} · fila ${antes.fila.ancho} (${antes.fila.scrollWidth}/${antes.fila.clientWidth}) · fotos ${antes.fila.enteras} enteras + ${antes.fila.asoman} asomando de ${antes.fila.fotos}`);
  console.log(`  tras deslizar: scrollLeft de la fila ${despues.fila.scrollLeft} · la página se corre de lado ${despues.documento.panoramica} px (antes ${antes.documento.panoramica}) · ancho del documento ${antes.documento.ancho}`);
  console.log(`  botones: ${alFinal.botones.map((b) => `${b.texto} ${b.izq}–${b.der}${b.cortado ? " CORTADO" : ""} (centro: ${b.enElCentro})`).join(" · ") || "ninguno"} · cortan: ${antes.cortadoPor.join(", ") || "nadie"} · sección ${fin.alto} px, ${fin.meses} meses, ${fin.renglones} renglones`);
  return { antes, despues, alFinal };
}

const LUGAR = "/lugares/museo-leonora-carrington-demo";
const ARTISTA = "/artistas/valeria-quiroz-demo";
const hoy = await caso("01-lugar-ana", LUGAR, { sesion: true });
comprobar(hoy.antes.plegado.ancho > hoy.antes.pantalla, `el plegado mide más que la pantalla (${hoy.antes.plegado.ancho} > ${hoy.antes.pantalla})`);
comprobar(!hoy.antes.fila.sePuedeDesplazar, "la fila no tiene nada que desplazar: mide lo que sus fotos (scrollWidth = clientWidth)");
comprobar(hoy.despues.fila.scrollLeft === 0, "el dedo no la mueve");
comprobar(hoy.despues.documento.panoramica > 0, `lo que se mueve es la página entera, de lado (${hoy.despues.documento.panoramica} px)`);
comprobar(hoy.alFinal.botones.some((b) => b.cortado), "un botón del final cae fuera de la pantalla");
const conRegla = await caso("02-lugar-ana-regla", LUGAR, { sesion: true, regla: true });
comprobar(conRegla.antes.plegado.ancho <= conRegla.antes.pantalla, "con la regla de prueba el plegado cabe en la pantalla");
comprobar(conRegla.antes.fila.sePuedeDesplazar && conRegla.despues.fila.scrollLeft > 0, `con la regla el dedo la desplaza (scrollLeft ${conRegla.despues.fila.scrollLeft})`);
comprobar(conRegla.alFinal.botones.every((b) => !b.cortado), "con la regla los dos botones caben enteros");
await caso("03-lugar-sin-sesion", LUGAR, { sesion: false });
const art = await caso("04-artista-ana", ARTISTA, { sesion: true });
comprobar(!art.antes.fila.sePuedeDesplazar && art.alFinal.botones.some((b) => b.cortado), "en la Trayectoria pasa lo mismo");
await caso("05-artista-ana-regla", ARTISTA, { sesion: true, regla: true });
for (const ancho of [320, 430]) {
  await caso(`06-lugar-ana-${ancho}`, LUGAR, { sesion: true, ancho, capturas: ancho === 320 });
  await caso(`07-artista-ana-${ancho}`, ARTISTA, { sesion: true, ancho, capturas: false });
}
fs.writeFileSync(path.join(SALIDA, "diagnostico.json"), JSON.stringify(resultados, null, 2));
console.log(`\nerrores de página: ${errores.length}${errores.length ? "\n  " + errores.join("\n  ") : ""}`);
console.log(fallos.length ? `\n${fallos.length} comprobaciones fallaron` : "\ntodas las comprobaciones en verde");
await browser.close();
process.exit(fallos.length ? 1 : 0);
