// Capturas y recorrido de la bitácora 499 (OL-467): tu cartel a un evento que ya está, en la APP REAL. Es el guion de capturas del prototipo
// (`capturar-alta-cartel-existente.mjs`, bitácora 498) adaptado a la app: la app compilada contra el respaldo local con la lectura del cartel
// simulada (`RESPALDO_CARTEL_EXISTENTE=1`: la Noche de danzón de Marcos sin cartel y Feleal con el suyo, los dos en el Teatro de la Paz; `/__lectura`
// deja lista la lectura de cada cartel), la sesión de Ana (o la de Marcos, quien publicó Feleal). Chrome real de la Mac (playwright-core), 390×844 a
// 2×, más 320 y 430 en las pantallas nuevas. Toques reales: antes de cada toque `elementFromPoint` en el centro del botón comprueba que nada lo
// tapa, y se toca ahí con el ratón (nunca `element.click()`). Mide cada estado como el prototipo (medir.js para la pantalla; el bloque nuevo —la
// caja, el pie y el final— marcado aquí con `data-propuesta`, solo para medir) y lo compara con las medidas firmadas (`capturas-498/medidas.json`).
// Nunca toca producción ni un `.env`.
//   node scripts/ops/auditoria-ui/capturar-alta-cartel-existente-app.mjs <carpeta de salida>
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
if (!SALIDA) { console.error("uso: capturar-alta-cartel-existente-app.mjs <carpeta>"); process.exit(1); }
if (fs.existsSync(path.join(RAIZ, ".env"))) { console.error("hay un .env en el árbol: la app cargaría llaves reales. Córrelo en un árbol sin .env"); process.exit(1); }
const requerir = createRequire(path.join(RAIZ, "package.json"));
const { chromium } = requerir("playwright-core");
const sharp = requerir("sharp");
const { cookie, cookieDe, MARCOS, LLAVE_SERVICIO } = await import(path.join(AQUI, "respaldo-local/fixture.mjs"));
const NEXT = path.join(RAIZ, "node_modules/next/dist/bin/next");
const MEDIR = fs.readFileSync(path.join(AQUI, "medir.js"), "utf8");
const FIRMADAS = JSON.parse(fs.readFileSync(path.join(RAIZ, "docs/rediseno/capturas-498/medidas.json"), "utf8"));
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
const reloj = { RELOJ_FIJO: AHORA, TZ: "America/Mexico_City", NODE_OPTIONS: `--require=${path.join(AQUI, "reloj-fijo.cjs")}` };
const app = { NEXT_PUBLIC_SUPABASE_URL: respaldo, NEXT_PUBLIC_SUPABASE_ANON_KEY: "llave-anon-inventada", NEXT_PUBLIC_MAPBOX_TOKEN: "pk.inventado", SUPABASE_SERVICE_ROLE_KEY: LLAVE_SERVICIO };
const r = lanzar([path.join(AQUI, "respaldo-local/server.mjs"), String(pr)], { ...reloj, RESPALDO_CARTEL_EXISTENTE: "1", RESPALDO_URL: respaldo });
await esperar(`${respaldo}/rest/v1/eventos?select=id&limit=1`, r);
if (!process.env.SIN_BUILD) {
  process.stdout.write("compilando la app contra el respaldo… ");
  const t = Date.now();
  const b = spawnSync(process.execPath, [NEXT, "build"], { cwd: RAIZ, env: { ...process.env, ...app }, encoding: "utf8", maxBuffer: 1 << 26 });
  if (b.status !== 0) throw new Error((b.stdout + b.stderr).slice(-3000));
  console.log(`${Math.round((Date.now() - t) / 1000)} s`);
}
const s = lanzar([NEXT, "start", "-p", String(pa)], { ...app, ...reloj, ANTHROPIC_API_KEY: "llave-inventada", ANTHROPIC_BASE_URL: `${respaldo}/anthropic` });
await esperar(`${base}/entrar`, s);

// ---------- los carteles (los mismos del prototipo, dibujados aquí) y lo que «leería» el modelo ----------
const NULOS = { titulo: null, fecha: null, hora: null, hora_fin: null, lugar: null, direccion: null, gratis: null, precio: null, descripcion: null, enlace: null, artistas: null, clase: null, visita: null, sesiones: null, actos: null, festival: null };
const CARTELES = {
  danzon: {
    lectura: { ...NULOS, titulo: "Noche de Danzón", fecha: "2026-10-09", hora: "20:00", hora_fin: "23:00", lugar: "Teatro de la Paz", precio: "$150", descripcion: "Baile de salón con orquesta en vivo: danzón, mambo y chachachá. Clase abierta para principiantes a las 19:30.", artistas: ["Orquesta Típica de San Luis"], clase: "puntual" },
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><rect width="800" height="1000" fill="#7a1f2b"/><circle cx="400" cy="330" r="190" fill="#e9b949"/><text x="400" y="610" fill="#fff6e0" font-family="Georgia" font-size="96" font-style="italic" text-anchor="middle">Noche de</text><text x="400" y="720" fill="#e9b949" font-family="Georgia" font-size="120" font-weight="700" text-anchor="middle">DANZÓN</text><text x="400" y="820" fill="#fff6e0" font-family="Arial" font-size="34" text-anchor="middle">Orquesta Típica de San Luis</text><text x="400" y="900" fill="#fff6e0" font-family="Arial" font-size="34" font-weight="700" text-anchor="middle">VIE 9 OCT · 20:00 · TEATRO DE LA PAZ</text></svg>',
  },
  feleal: {
    lectura: { ...NULOS, titulo: "Feleal: un viaje en acordeón", fecha: "2026-10-14", hora: "19:00", lugar: "Teatro de la Paz", precio: "$120 a $250", artistas: ["Feleal"], clase: "puntual" },
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><rect width="800" height="1000" fill="#123b4a"/><rect x="60" y="60" width="680" height="880" fill="none" stroke="#f4d35e" stroke-width="8"/><text x="400" y="420" fill="#f4d35e" font-family="Arial" font-size="150" font-weight="800" text-anchor="middle">FELEAL</text><text x="400" y="520" fill="#fff" font-family="Arial" font-size="52" text-anchor="middle">un viaje en acordeón</text><text x="400" y="820" fill="#fff" font-family="Arial" font-size="38" font-weight="700" text-anchor="middle">MIÉ 14 OCT · 19:00</text><text x="400" y="880" fill="#fff" font-family="Arial" font-size="34" text-anchor="middle">Teatro de la Paz</text></svg>',
  },
  // Sin parecido: otro evento, otro día. La pregunta no sale y el alta sigue como hoy.
  otro: {
    lectura: { ...NULOS, titulo: "Taller de grabado en linóleo", fecha: "2026-10-16", hora: "17:00", hora_fin: "19:00", lugar: "Teatro de la Paz", precio: "$300", clase: "puntual" },
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><rect width="800" height="1000" fill="#2f4a2a"/><text x="400" y="480" fill="#e8f0d8" font-family="Arial" font-size="90" font-weight="800" text-anchor="middle">GRABADO</text><text x="400" y="580" fill="#e8f0d8" font-family="Arial" font-size="44" text-anchor="middle">vie 16 oct · 17:00</text></svg>',
  },
};
async function archivoDe(clave) {
  const archivo = path.join(os.tmpdir(), `ol467-${clave}.png`);
  if (!fs.existsSync(archivo)) await sharp(Buffer.from(CARTELES[clave].svg)).png().toFile(archivo);
  return archivo;
}

// ---------- el navegador ----------
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--hide-scrollbars"] });
const errores = [];
const fallos = [];
const filas = [];
const comprobar = (si, texto) => { console.log(si ? "     ok" : "     FALLA", "·", texto); if (!si) fallos.push(texto); };
async function abrir({ cuenta = "ana", ancho = 390 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.clock.setFixedTime(new Date(AHORA));
  await ctx.addCookies([{ name: "sb-127-auth-token", value: cuenta === "marcos" ? cookieDe(MARCOS) : cookie, url: base }]);
  await ctx.route("**/_vercel/**", (q) => q.fulfill({ contentType: "text/javascript", body: "" }));
  await ctx.route((u) => u.hostname !== "127.0.0.1", (q) => q.abort());
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(String(e.message).slice(0, 300)));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errores.push(`consola: ${m.text().slice(0, 300)}`));
  await page.goto(`${base}/nuevo/evento?ciudad=san-luis-potosi`, { waitUntil: "networkidle" });
  // El respaldo es http y `imagenPermitida` pide https: lo que manda «Publicar» (crearEvento) va sin la imagen, como en las maquetas del
  // prototipo, para que el servidor conteste «¿Es este?» y no «La imagen no se subió bien». Solo mientras se publica (`__alPublicar`): lo que manda
  // «Sí, es este: ponerle mi cartel» (ponerMiCartel) la lleva, y la acción solo admite un archivo de la carpeta de quien la subió.
  await page.locator("form#publicar-evento").evaluate((f) => f.addEventListener("formdata", (e) => { if (window.__alPublicar) e.formData.set("imagen", ""); }));
  return { ctx, page };
}
const caja = (page) => page.getByRole("alert").filter({ hasText: "¿Es este?" });
const pie = (page) => page.locator("main footer");
/** Un toque de verdad: el centro del botón, sin nada encima, con el ratón. */
async function tocar(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  const libre = await locator.evaluate((el) => { const r = el.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!e && (e === el || el.contains(e)); });
  if (!libre) throw new Error("algo tapa el botón: " + (await locator.textContent()));
  const c = await locator.boundingBox();
  await page.mouse.click(c.x + c.width / 2, c.y + c.height / 2);
}
async function subirCartel(page, clave, cambios = {}) {
  const archivo = await archivoDe(clave);
  await fetch(`${respaldo}/__lectura`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lectura: { ...CARTELES[clave].lectura, ...cambios }, archivo }) });
  await page.locator("input[type=file]").setInputFiles(archivo);
}
/** Sube el cartel sin la hora (la pregunta al leer no sale: le falta el día con su hora), contesta la hora y lo que pregunte, y llega a «Revisa». */
async function hastaRevisaSinHora(page, clave, hora, dura) {
  await subirCartel(page, clave, { hora: null, hora_fin: null });
  const revisa = page.getByRole("heading", { name: "Revisa", exact: true });
  let conHora = false;
  for (let i = 0; i < 8 && !(await revisa.isVisible()); i++) {
    const empieza = page.getByRole("group", { name: "Empieza" }).getByRole("button", { name: new RegExp(`^${hora}`) });
    const duracion = page.getByRole("group", { name: "¿Cuánto dura?" }).getByRole("button", { name: dura });
    const esAqui = page.getByRole("button", { name: /^Sí, es aquí/ });
    await Promise.race([revisa, empieza, duracion, esAqui].map((l) => l.waitFor({ timeout: 30000 }))).catch(() => {});
    if (await esAqui.isVisible()) await tocar(page, esAqui);
    else if (!conHora && (await empieza.isVisible())) (await tocar(page, empieza), (conHora = true));
    else if (await duracion.isVisible()) await tocar(page, duracion);
    await page.waitForTimeout(300);
  }
  await revisa.waitFor().catch(async (e) => { await page.screenshot({ path: path.join(SALIDA, `fallo-${clave}.png`) }); throw e; });
}
async function publicar(page) {
  await page.evaluate(() => (window.__alPublicar = true));
  await tocar(page, pie(page).getByRole("button", { name: "Publicar", exact: true }));
}

// La medición: medir.js para la pantalla y, del bloque nuevo (`data-propuesta`, puesto aquí solo para medir), lo mismo que el medidor del prototipo.
const MEDIR_BLOQUE = () => {
  document.querySelectorAll("[data-propuesta]").forEach((e) => e.removeAttribute("data-propuesta"));
  const caja = [...document.querySelectorAll('[role="alert"]')].find((e) => e.textContent.includes("¿Es este?"));
  caja?.setAttribute("data-propuesta", "parecidos");
  const pie = document.querySelector("main footer");
  if (pie && /Sí, es este/.test(pie.textContent)) pie.setAttribute("data-propuesta", "pie");
  [...document.querySelectorAll("main h2")].find((h) => /^Listo:/.test(h.textContent))?.parentElement.setAttribute("data-propuesta", "final");
  const OMITIDOS = new Set(["SCRIPT", "STYLE", "LINK", "META", "TITLE", "TEMPLATE", "NOSCRIPT", "NEXT-ROUTE-ANNOUNCER"]);
  const visible = (el) => !OMITIDOS.has(el.tagName) && !el.hidden && getComputedStyle(el).display !== "none";
  const bloques = [...document.querySelectorAll("[data-propuesta]")];
  let nodos = 0, prof = 0, sin = 0;
  const contar = (el, d) => { nodos++; prof = Math.max(prof, d); if (/^(DIV|SPAN)$/.test(el.tagName) && !el.getAttribute("class") && !el.closest("[data-propuesta] ul")) sin++; if (el.tagName.toLowerCase() !== "svg") for (const h of el.children) if (visible(h)) contar(h, d + 1); };
  for (const b of bloques) contar(b, 1);
  const todos = [...document.body.querySelectorAll("*")].filter((el) => { if (!visible(el) || el.children.length || (el.clientWidth <= 1 && el.clientHeight <= 1)) return false; const s = getComputedStyle(el); return (s.overflow !== "visible" || s.textOverflow === "ellipsis") && el.scrollWidth > el.clientWidth + 1; });
  const cede = todos.filter((el) => (el.matches("small > span > span:last-child") && el.closest("a")?.matches('[class*="__frente"]')) || el.matches('[aria-hidden="true"][class*="__tituloBarra"]')).length;
  const toques = bloques.flatMap((b) => [...b.querySelectorAll("a, button")]).filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.width < 44 || r.height < 44); }).length;
  return { bloque: nodos, profBloque: prof, sinClase: sin, cortados: todos.length - cede, cede, toques, hay: bloques.length > 0 };
};
async function medir(page, id) {
  await page.evaluate(() => document.fonts.ready);
  const m = await page.evaluate(MEDIR);
  const b = await page.evaluate(MEDIR_BLOQUE);
  filas.push({ id, nodos: m.nodos, prof: m.profundidadMax, desbordes: m.desbordes.length, "toques<44 (pantalla)": m.toquesChicos.length, bloque: b.hay ? b.bloque : "–", "prof. bloque": b.hay ? b.profBloque : "–", "sin clase": b.hay ? b.sinClase : "–", cortados: b.cortados, "a propósito": b.cede, "toques<44 (bloque)": b.hay ? b.toques : "–" });
  for (const d of m.desbordes) console.log("     DESBORDE", id, d.padre, "→", d.hijo);
}
/** La foto con lo nuevo a la vista (la caja o el final al centro; sin ellos, arriba), y su medida; con `anchos`, también a esos anchos. */
async function foto(page, nombre, { arriba = false, anchos = [] } = {}) {
  for (const ancho of [390, ...anchos]) {
    if (ancho !== 390) await page.setViewportSize({ width: ancho, height: 844 });
    await page.mouse.move(0, 0);
    await page.evaluate(() => document.activeElement?.blur());
    await page.evaluate((arr) => {
      const b = [...document.querySelectorAll('[role="alert"]')].find((e) => e.textContent.includes("¿Es este?")) ?? [...document.querySelectorAll("main h2")].find((h) => /^Listo:/.test(h.textContent));
      if (b && !arr) b.scrollIntoView({ block: "center" }); else window.scrollTo(0, 0);
    }, arriba);
    await page.waitForTimeout(700);
    const id = ancho === 390 ? nombre : `${nombre}-${ancho}`;
    await page.screenshot({ path: path.join(SALIDA, `${id}.png`) });
    await medir(page, id);
    console.log("  ", id);
  }
  if (anchos.length) await page.setViewportSize({ width: 390, height: 844 });
}

try {
  // 1 · C2 sin cartel: la Noche de danzón de Marcos; Ana sube su cartel y se lee.
  {
    const { ctx, page } = await abrir();
    await subirCartel(page, "danzon");
    await caja(page).waitFor({ timeout: 30000 });
    await foto(page, "01-c2-sin-cartel", { arriba: true, anchos: [320, 430] });
    comprobar((await page.getByRole("status").count()) === 0 && (await page.locator('[aria-busy="true"]').count()) === 0, "C2: la espera ya no late ni dice «Leyendo el cartel…»");
    comprobar((await page.locator("main h2").count()) === 0, "C2: sin la pregunta de un paso (la misma espera)");
    comprobar((await pie(page).getByRole("button").allInnerTexts()).join() === "Sí, es este: ponerle mi cartel", "C2: el pie dice «Sí, es este: ponerle mi cartel»");
    comprobar((await caja(page).getByRole("button").allInnerTexts()).join() === "No, es otro: seguir", "C2: en la caja, «No, es otro: seguir»");
    comprobar((await page.locator('main [class*="Boton-module"][class*="__primario"]').count()) === 1, "C2: un solo botón principal en la pantalla");
    const cabe = await page.evaluate(() => { const b = [...document.querySelectorAll('[role="alert"]')].find((e) => e.textContent.includes("¿Es este?")).getBoundingClientRect(); const p = document.querySelector("main footer").getBoundingClientRect(); return b.bottom <= p.top + 1 && b.top >= 0 && window.scrollY === 0; });
    comprobar(cabe, "C2 a 390: el cartel, la caja y el pie se ven juntos sin desplazar");
    // «No, es otro: seguir» → «Revisa» sin volver a preguntar; publicar publica como hoy (con la confirmación).
    await tocar(page, caja(page).getByRole("button", { name: "No, es otro: seguir" }));
    await page.getByRole("heading", { name: "Revisa", exact: true }).waitFor();
    await page.waitForTimeout(800);
    comprobar((await caja(page).count()) === 0, "«No, es otro: seguir» sigue a «Revisa», que ya no pregunta");
    await foto(page, "06-revisa-tras-no-es-otro", { arriba: true });
    // (Publicar aquí dejaría otro evento parecido en el respaldo: se prueba al final, en el 8.)
    await ctx.close();
  }
  // 2 · C2 ya tiene cartel, de otra persona (Feleal, de Marcos; Ana sube otro).
  {
    const { ctx, page } = await abrir();
    await subirCartel(page, "feleal");
    await caja(page).waitFor({ timeout: 30000 });
    await foto(page, "02-c2-ya-tiene-cartel-otra-persona", { arriba: true, anchos: [320] });
    const cambiar = caja(page).getByRole("button", { name: "Sí, es este: cambiar su cartel por el mío" });
    comprobar((await cambiar.getAttribute("aria-disabled")) === "true", "B ajeno: cambiar su cartel va apagado (aria-disabled)");
    comprobar((await caja(page).getByText("Solo quien lo publicó puede cambiarlo.").count()) === 1, "y debajo «Solo quien lo publicó puede cambiarlo.»");
    const acc = await caja(page).evaluate((b) => {
      const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number);
      const lum = ([r, g, bl]) => { const t = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * t(r) + 0.7152 * t(g) + 0.0722 * t(bl); };
      const fondo = (el) => { for (let e = el; e; e = e.parentElement) { const v = rgb(getComputedStyle(e).backgroundColor); if (v.length === 3 || (v.length === 4 && v[3] > 0)) return getComputedStyle(e).backgroundColor; } return "rgb(255, 255, 255)"; };
      const ratio = (el) => { const [x, y] = [lum(rgb(getComputedStyle(el).color)), lum(rgb(fondo(el)))].sort((m, n) => n - m); return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100; };
      const nota = b.querySelector("p:not(:first-child)");
      return { orden: [...b.children].map((e) => e.tagName.toLowerCase() + (e.tagName === "BUTTON" ? ":" + e.textContent : "")).join(" → "), texto: ratio(b.querySelector("p")), nota: ratio(nota) };
    });
    comprobar(acc.texto >= 4.5 && acc.nota >= 4.5, `B ajeno: contraste AA del texto (${acc.texto}) y de la nota (${acc.nota})`);
    comprobar(acc.orden === "p → ul → button:Sí, es este: cambiar su cartel por el mío → p → button:No, es otro: seguir", `B ajeno: orden de lectura ${acc.orden}`);
    await tocar(page, cambiar);
    await page.waitForTimeout(800);
    comprobar((await caja(page).count()) === 1 && new URL(page.url()).pathname === "/nuevo/evento", "B ajeno: el botón apagado no hace nada");
    await tocar(page, pie(page).getByRole("link", { name: "Sí, es este: ir al evento" }));
    await page.waitForURL(/\/eventos\/feleal-un-viaje-por-el-mundo-en-acordeon/);
    await page.getByRole("heading", { level: 1 }).first().waitFor();
    comprobar(true, "B: «Sí, es este: ir al evento» abre su ficha");
    await ctx.close();
  }
  // 3 · C2 ya tiene cartel, de quien lo publicó (Marcos con otro cartel de Feleal): cambiarlo, en la caja.
  {
    const { ctx, page } = await abrir({ cuenta: "marcos" });
    await subirCartel(page, "feleal");
    await caja(page).waitFor({ timeout: 30000 });
    await foto(page, "03-c2-ya-tiene-cartel-quien-lo-publico", { arriba: true });
    comprobar((await caja(page).getByRole("button", { name: "Sí, es este: cambiar su cartel por el mío" }).getAttribute("aria-disabled")) === null, "B dueño: cambiar su cartel, encendido y en segundo plano");
    await ctx.close();
  }
  // 4 · A1: el cartel sin hora (la pregunta al leer no sale); en «Revisa», al publicar, «¿Es este?» con la respuesta en el pie.
  {
    const { ctx, page } = await abrir();
    await hastaRevisaSinHora(page, "danzon", "8:00", "3 horas");
    await publicar(page);
    await caja(page).waitFor();
    await page.evaluate(() => (window.__alPublicar = false));
    await page.waitForTimeout(800);
    await foto(page, "04-revisa-a1-sin-cartel", { anchos: [320, 430] });
    comprobar((await pie(page).getByRole("button").allInnerTexts()).join() === "Sí, es este: ponerle mi cartel", "A1: el pie dice «Sí, es este: ponerle mi cartel»");
    comprobar((await caja(page).getByRole("button").allInnerTexts()).join() === "No, es otro: publicar de todos modos", "A1: en la caja, «No, es otro: publicar de todos modos», como hoy");
    comprobar((await page.locator('main [class*="Boton-module"][class*="__primario"]').count()) === 1, "A1: un solo botón principal en la pantalla");
    const vista = await page.evaluate(() => { const b = [...document.querySelectorAll('[role="alert"]')].find((e) => e.textContent.includes("¿Es este?")).getBoundingClientRect(); const p = document.querySelector("main footer").getBoundingClientRect(); return b.top >= 0 && b.bottom <= p.top + 1; });
    comprobar(vista, "A1: la caja llega a la vista sola");
    // Foco con Tab de verdad hasta el botón del pie.
    let foco = null;
    for (let i = 0; i < 40; i++) { await page.keyboard.press("Tab"); foco = await page.evaluate(() => { const a = document.activeElement; const st = getComputedStyle(a); return { texto: a.textContent.trim(), estilo: st.outlineStyle, ancho: parseFloat(st.outlineWidth) }; }); if (foco.texto === "Sí, es este: ponerle mi cartel") break; }
    comprobar(foco.texto === "Sí, es este: ponerle mi cartel" && foco.estilo !== "none" && foco.ancho >= 2, `A1: foco visible con Tab en el botón del pie (${foco.estilo} ${foco.ancho}px)`);
    await page.screenshot({ path: path.join(SALIDA, "10-revisa-a1-foco.png") });
    // El renglón sigue abriendo la ficha (no se quita lo que existe).
    const href = await caja(page).getByRole("link").getAttribute("href");
    comprobar(href === "/eventos/noche-de-danzon-con-la-orquesta-tipica", `A1: el renglón enlaza la ficha del que ya está (${href})`);
    // «Sí, es este: ponerle mi cartel» → el final.
    await tocar(page, pie(page).getByRole("button", { name: "Sí, es este: ponerle mi cartel" }));
    await page.getByRole("heading", { name: "Listo: tu cartel ya está en el evento" }).waitFor({ timeout: 30000 });
    await foto(page, "07-final-tu-cartel", { anchos: [320, 430] });
    const frase = await page.locator("main h2 + p").first().innerText();
    comprobar(frase === "Le pusimos tu cartel y completamos su precio, su descripción y quién se presenta. Así lo ve la gente:", `el final dice lo que se completó: «${frase}»`);
    comprobar((await page.locator("main ul a").first().getAttribute("href")) === "/eventos/noche-de-danzon-con-la-orquesta-tipica", "la tarjeta es la del evento que ya estaba");
    comprobar((await page.getByText("Crear su cartel").count()) === 0, "con cartel ya no se ofrece crear uno");
    // «Ver el evento» → la ficha real con el cartel, el precio, quién se presenta y quien lo publicó.
    await tocar(page, page.getByRole("link", { name: "Ver el evento" }));
    await page.waitForURL(/\/eventos\/noche-de-danzon-con-la-orquesta-tipica/);
    await page.waitForLoadState("networkidle");
    await foto(page, "08-ficha-despues", { arriba: true });
    const ficha = await page.locator("main").innerText();
    comprobar(/\$150/.test(ficha) && /Orquesta Típica de San Luis/.test(ficha) && /Marcos Ledesma/.test(ficha) && /Baile de salón/.test(ficha), "la ficha del que ya estaba: $150, la Orquesta Típica, la descripción leída y «Publicado por Marcos Ledesma»");
    const imagenes = await page.locator("main img").evaluateAll((l) => l.map((i) => decodeURIComponent(i.currentSrc || i.src)));
    comprobar(imagenes.some((u) => u.includes("/fotos/lugares/11111111-1111-4111-8111-111111111111/evento-")), "con el cartel de Ana (de su carpeta) en la ficha");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SALIDA, "08b-ficha-despues-abajo.png") });
    await ctx.close();
  }
  // 5 · A1/B: Feleal sin hora en el cartel; en «Revisa», al publicar, ya tiene cartel de otra persona.
  {
    const { ctx, page } = await abrir();
    await hastaRevisaSinHora(page, "feleal", "7:00", "2 horas");
    await publicar(page);
    await caja(page).waitFor();
    await page.evaluate(() => (window.__alPublicar = false));
    await page.waitForTimeout(800);
    await foto(page, "05-revisa-b-otra-persona", { anchos: [320, 430] });
    comprobar((await pie(page).getByRole("link", { name: "Sí, es este: ir al evento" }).count()) === 1, "B en «Revisa»: el pie es «Sí, es este: ir al evento»");
    comprobar((await caja(page).getByRole("button", { name: "Sí, es este: cambiar su cartel por el mío" }).getAttribute("aria-disabled")) === "true", "B en «Revisa»: cambiarlo, apagado");
    await ctx.close();
  }
  // 6 · Sin parecido: el cartel de otra cosa; la pregunta no sale y el alta sigue como hoy.
  {
    const { ctx, page } = await abrir();
    await subirCartel(page, "otro");
    await page.getByText("Leído del cartel").waitFor({ timeout: 30000 });
    comprobar((await caja(page).count()) === 0 && (await pie(page).getByRole("button", { name: "Publicar", exact: true }).count()) === 1, "sin parecido: directo a «Revisa» con «Publicar», como hoy");
    await page.waitForTimeout(800);
    await foto(page, "11-sin-parecido-como-hoy", { arriba: true });
    await ctx.close();
  }
  // 7 · B dueño: Marcos cambia el cartel de Feleal por el suyo → «Listo: cambiamos su cartel por el tuyo» (al final: cambia Feleal en el respaldo).
  {
    const { ctx, page } = await abrir({ cuenta: "marcos" });
    await subirCartel(page, "feleal");
    await caja(page).waitFor({ timeout: 30000 });
    await tocar(page, caja(page).getByRole("button", { name: "Sí, es este: cambiar su cartel por el mío" }));
    await page.getByRole("heading", { name: "Listo: cambiamos su cartel por el tuyo" }).waitFor({ timeout: 30000 });
    await foto(page, "09-final-cambiamos-su-cartel");
    comprobar((await page.locator("main h2 + p").first().innerText()) === "Todo lo demás sigue igual. Así lo ve la gente:", "B dueño: «Todo lo demás sigue igual»");
    await ctx.close();
  }
  // 8 · Lo de hoy no se quita: «No, es otro: seguir» y luego «Publicar» publica sin volver a preguntar (la Noche de danzón ya tiene el cartel de Ana).
  {
    const { ctx, page } = await abrir();
    await subirCartel(page, "danzon");
    await caja(page).waitFor({ timeout: 30000 });
    await tocar(page, caja(page).getByRole("button", { name: "No, es otro: seguir" }));
    await page.getByRole("heading", { name: "Revisa", exact: true }).waitFor();
    await publicar(page);
    await page.getByRole("heading", { name: "Evento publicado" }).waitFor({ timeout: 30000 });
    comprobar(true, "«No, es otro: seguir» y «Publicar»: publica sin volver a preguntar");
    await ctx.close();
  }
  // 9 · «No, es otro: publicar de todos modos» en «Revisa» publica como hoy.
  {
    const { ctx, page } = await abrir();
    await hastaRevisaSinHora(page, "feleal", "7:00", "2 horas");
    await publicar(page);
    await caja(page).waitFor();
    await tocar(page, caja(page).getByRole("button", { name: "No, es otro: publicar de todos modos" }));
    await page.getByRole("heading", { name: "Evento publicado" }).waitFor({ timeout: 30000 });
    comprobar(true, "«No, es otro: publicar de todos modos» publica como hoy");
    await ctx.close();
  }
} finally {
  // Las medidas, junto a las firmadas del prototipo (bitácora 498).
  const PAR = { "01-c2-sin-cartel": "02-c2-sin-cartel", "01-c2-sin-cartel-320": "02-c2-sin-cartel-320", "01-c2-sin-cartel-430": "02-c2-sin-cartel-430", "02-c2-ya-tiene-cartel-otra-persona": "03-c2-ya-tiene-cartel-otra-persona", "02-c2-ya-tiene-cartel-otra-persona-320": "03-c2-ya-tiene-cartel-otra-persona-320", "04-revisa-a1-sin-cartel": "06-revisa-a1-sin-cartel", "04-revisa-a1-sin-cartel-320": "06-revisa-a1-sin-cartel-320", "04-revisa-a1-sin-cartel-430": "06-revisa-a1-sin-cartel-430", "05-revisa-b-otra-persona": "09-revisa-b-otra-persona", "05-revisa-b-otra-persona-320": "09-revisa-b-otra-persona-320", "05-revisa-b-otra-persona-430": "09-revisa-b-otra-persona-430", "06-revisa-tras-no-es-otro": "10-revisa-tras-no-es-otro", "07-final-tu-cartel": "11-final-tu-cartel", "07-final-tu-cartel-320": "11-final-tu-cartel-320", "07-final-tu-cartel-430": "11-final-tu-cartel-430", "08-ficha-despues": "13-ficha-despues", "09-final-cambiamos-su-cartel": "12-final-cambiamos-su-cartel" };
  for (const f of filas) {
    const firmada = FIRMADAS.find((x) => x.id === PAR[f.id]);
    f.firmada = firmada ? `${firmada.id}: ${firmada.nodos}/${firmada.prof} · ${firmada.bloque}/${firmada["prof. bloque"]}` : "–";
    if (f.bloque !== "–") comprobar(f["sin clase"] === 0 && f.cortados === 0 && f.desbordes === 0 && f["toques<44 (bloque)"] === 0, `${f.id}: sin envoltorios sin clase, sin textos cortados, sin desbordes ni toques < 44 en el bloque`);
  }
  console.table(filas);
  fs.writeFileSync(path.join(SALIDA, "medidas.json"), JSON.stringify(filas, null, 2));
  console.log("errores de la página:", errores.length ? errores : "ninguno");
  console.log(fallos.length ? `FALLAN ${fallos.length}: ${fallos.join(" · ")}` : "todas las comprobaciones pasan");
  await browser.close();
}
process.exit(fallos.length || errores.length ? 1 : 0);
