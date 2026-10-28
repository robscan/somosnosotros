// Evidencia del prototipo OL-454 (bitácora 486, docs/rediseno/prototipos/inicio-vacio.html) con el Chrome real de la Mac (playwright-core del
// repo): 1) cada estado del teléfono a 390×844 (2×), arriba y desplazado, midiendo cada pantalla con medir.js (nodos, profundidad, desbordes,
// toques de menos de 44) y el llamado nuevo por su cuenta (nodos, profundidad, div o span sin clase); 2) la accesibilidad del llamado (nombre
// accesible, toque, contraste AA sobre el gris de Inicio, foco visible con Tab de verdad, orden de lectura; en <carpeta>/accesibilidad.json);
// 3) el recorrido con toques reales: clics de ratón por coordenadas (los selectores de arriba y, dentro del teléfono, el botón, «Mandarme el
// código», la ✕, el «+» de la barra y la tira del alta), que fallan si algo tapa el botón. Las capturas salen sin comprimir; al repo van con comprimir.mjs.
//   node scripts/ops/auditoria-ui/capturar-inicio-vacio.mjs <carpeta>
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const SALIDA = process.argv[2];
if (!SALIDA) { console.error("uso: capturar-inicio-vacio.mjs <carpeta>"); process.exit(1); }
const { chromium } = createRequire(path.join(RAIZ, "package.json"))("playwright-core");
const PROTO = pathToFileURL(path.join(RAIZ, "docs/rediseno/prototipos/inicio-vacio.html")).href;
const MEDIR = fs.readFileSync(path.join(RAIZ, "scripts/ops/auditoria-ui/medir.js"), "utf8");
fs.mkdirSync(SALIDA, { recursive: true });
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--hide-scrollbars"] });
const errores = [];
const filas = [];
const fallos = [];
const comprobar = (si, texto) => { console.log(si ? "  ok" : "  FALLA", texto); if (!si) fallos.push(texto); };

const ctx = await browser.newContext({ viewport: { width: 860, height: 1000 }, deviceScaleFactor: 2, locale: "es-MX" });
const page = await ctx.newPage();
page.on("pageerror", (e) => errores.push(String(e.message).slice(0, 200)));
page.on("console", (m) => { if (m.type() === "error") errores.push(m.text().slice(0, 200)); });
await page.goto(PROTO, { waitUntil: "load" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "load" });
await page.waitForFunction(() => document.documentElement.dataset.pintado);
await page.evaluate(() => document.fonts.ready);
const marco = () => page.frames().find((f) => f !== page.mainFrame());
const pintado = () => page.evaluate(() => document.documentElement.dataset.pintado);

/** Un clic de ratón en el centro de un elemento (de la página o del teléfono), por coordenadas. */
async function tocar(locator) {
  await locator.scrollIntoViewIfNeeded(); // la captura del teléfono desplaza la página: sin esto, el clic caería fuera de la ventana
  const caja = await locator.boundingBox();
  if (!caja) throw new Error("sin caja para tocar");
  await page.mouse.click(caja.x + caja.width / 2, caja.y + caja.height / 2);
  await page.evaluate(() => window.prototipo.listo().then(() => true));
  await page.waitForTimeout(250);
}
const boton = (grupo, texto) => page.locator(`[aria-label="${grupo}"] button`, { hasText: texto });
async function elegir(caso, version, sesion) {
  await tocar(boton("Caso", caso));
  await tocar(boton("Versión", version));
  await tocar(boton("Sesión", sesion));
}
async function medir(id) {
  const f = marco();
  await f.evaluate(() => document.fonts.ready);
  const m = await f.evaluate(MEDIR);
  const p = await page.evaluate(() => window.prototipo.medir());
  filas.push({ id, nodos: m.nodos, prof: m.profundidadMax, desbordes: m.desbordes.length, toques: m.toquesChicos.length, llamado: p.nodos || "–", sinClase: p.nodos ? p.sin : "–", bloques: p.bloques.join(" ") || "–" });
  for (const d of m.desbordes) console.log("  DESBORDE", id, d.padre, "→", d.hijo, JSON.stringify(d.fuera));
  for (const t of m.toquesChicos) console.log("  TOQUE", id, t.el, `${t.w}×${t.h}`, t.texto);
}
async function foto(nombre, scroll = 0) {
  const f = marco();
  await f.evaluate((y) => { document.scrollingElement.scrollTop = y; }, scroll);
  await page.waitForTimeout(300);
  await page.locator("#tel").screenshot({ path: path.join(SALIDA, nombre + ".png") });
  await medir(nombre);
  console.log(nombre, await pintado());
}
const alFinal = () => marco().evaluate(() => document.scrollingElement.scrollHeight - innerHeight);

// 1. Hoy: lo que ve el founder.
await elegir("2 · Lugares", "Hoy", "Sin sesión");
await foto("01-hoy-queretaro-sin-sesion");
comprobar((await marco().locator("h2", { hasText: "Próximos días" }).count()) === 1, "hoy, sin sesión: sale «Próximos días»");
await tocar(boton("Sesión", "Con sesión"));
await foto("02-hoy-queretaro-con-sesion");
comprobar((await marco().locator("h2", { hasText: "Próximos días" }).count()) === 0, "hoy, con sesión y planes en San Luis: el aviso de vacío NO sale");
comprobar((await marco().locator("h2", { hasText: "Tus planes" }).count()) === 1, "hoy, con sesión: sale Tus planes (de San Luis)");
await elegir("1 · Casi nueva", "Hoy", "Sin sesión");
await foto("03-hoy-cdmx-sin-sesion");
await elegir("3 · Eventos más adelante", "Hoy", "Sin sesión");
await foto("04-hoy-zacatecas-sin-sesion");
comprobar((await marco().locator("h2", { hasText: "Más adelante" }).count()) === 1, "Zacatecas: «Más adelante» ya sale");
await tocar(boton("Sesión", "Con sesión"));
await foto("05-hoy-zacatecas-con-sesion");

// 2. La propuesta (segunda vuelta): sin banner, sin ciudad cercana, lugares y artistas como hoy, un solo botón «+ Publicar un evento».
const titulos = () => marco().evaluate(() => [...document.querySelectorAll("main h2")].filter((h) => h.offsetParent).map((h) => h.textContent));
const sinBanner = async () => (await marco().locator('[aria-label="Comparte la app"]').count()) === 0;
await elegir("2 · Lugares", "Propuesta", "Sin sesión");
await foto("06-propuesta-queretaro-sin-sesion");
comprobar((await titulos()).join("|") === "¿Sabes de algo que pase en Querétaro?", "propuesta sin sesión: solo el llamado (ni cercano ni carriles nuevos)");
comprobar(await sinBanner(), "propuesta: sin el banner de compartir");
await tocar(boton("Sesión", "Con sesión"));
await foto("07-propuesta-queretaro-con-sesion");
comprobar((await titulos()).join("|") === "¿Sabes de algo que pase en Querétaro?|Tus planes", "propuesta con sesión: el llamado y debajo Tus planes");
comprobar(await sinBanner(), "propuesta con sesión: sin el banner");
await elegir("1 · Casi nueva", "Propuesta", "Sin sesión");
await foto("08-propuesta-cdmx-sin-sesion");
await elegir("2 · Lugares", "Variante", "Sin sesión");
await foto("09-variante-queretaro-sin-sesion");
await tocar(boton("Sesión", "Con sesión"));
await foto("10-variante-queretaro-con-sesion");
await elegir("3 · Eventos más adelante", "Propuesta", "Sin sesión");
comprobar((await marco().locator("[data-propuesta]").count()) === 0, "Zacatecas: la propuesta no cambia nada");

// 3. Accesibilidad del llamado (propuesta y variante): nombre, toque, contraste, foco y orden de lectura.
const ACCESIBLE = () => {
  const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((m, n) => n - m); return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100; };
  const fondo = (el) => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; const v = rgb(c); if (v.length === 3 || (v.length === 4 && v[3] > 0)) return c; } return "rgb(255, 255, 255)"; };
  const b = document.querySelector('[data-propuesta="llamado"]');
  const [h2, p, a, q] = [b.querySelector("h2"), b.querySelector("p"), b.querySelector("a"), b.querySelectorAll("a")[1]];
  const caja = a.getBoundingClientRect();
  const r = {
    orden: [...b.children].map((e) => e.tagName.toLowerCase() + (e.tagName === "A" ? ":" + e.textContent : "")).join(" → "),
    nombre: a.textContent.trim(), etiquetaAria: a.getAttribute("aria-label"), iconoOculto: a.querySelector("svg").getAttribute("aria-hidden"),
    toque: `${Math.round(caja.width)}×${Math.round(caja.height)}`, alto: caja.height,
    titulo: ratio(getComputedStyle(h2).color, fondo(h2)), texto: ratio(getComputedStyle(p).color, fondo(p)),
    boton: ratio(getComputedStyle(a).color, getComputedStyle(a).backgroundColor), botonSobreFondo: ratio(getComputedStyle(a).backgroundColor, fondo(b)),
    fondo: fondo(b), colorBoton: getComputedStyle(a).backgroundColor,
  };
  if (q) { const cq = q.getBoundingClientRect(); Object.assign(r, { quieto: ratio(getComputedStyle(q).color, fondo(q)), toqueQuieto: `${Math.round(cq.width)}×${Math.round(cq.height)}`, altoQuieto: cq.height }); }
  return r;
};
const FOCO = () => { const a = document.activeElement; const s = getComputedStyle(a); return { texto: a.textContent.trim(), estilo: s.outlineStyle, ancho: parseFloat(s.outlineWidth), color: s.outlineColor, separacion: s.outlineOffset }; };
const CONTRASTE = ([c, f]) => { const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number); const lum = ([r, g, b]) => { const t = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * t(r) + 0.7152 * t(g) + 0.0722 * t(b); }; const [x, y] = [lum(rgb(c)), lum(rgb(f))].sort((m, n) => n - m); return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100; };
const accesibilidad = {};
for (const [version, captura] of [["Propuesta", "11-propuesta-foco"], ["Variante", "12-variante-foco"]]) {
  await elegir("2 · Lugares", version, "Sin sesión");
  const r = await marco().evaluate(ACCESIBLE);
  accesibilidad[version] = r;
  console.log(" ", version, JSON.stringify(r));
  comprobar(r.nombre === "Publicar un evento" && r.etiquetaAria === null && r.iconoOculto === "true", `${version}: el nombre accesible es el texto visible («Publicar un evento»), el «+» oculto al lector`);
  // El lector lo encuentra como enlace con ese nombre; hay otro igual, el «+» de la barra (aria-label «Publicar un evento»): mismo nombre, mismo
  // destino, así que no confunde (WCAG 2.4.4).
  comprobar((await page.frameLocator("#tel").locator('[data-propuesta="llamado"]').getByRole("link", { name: "Publicar un evento", exact: true }).count()) === 1, `${version}: el lector lo encuentra como enlace «Publicar un evento»`);
  comprobar((await page.frameLocator("#tel").getByRole("link", { name: "Publicar un evento", exact: true }).count()) === 2, `${version}: el otro enlace con el mismo nombre es el «+» de la barra (mismo destino)`);
  comprobar(r.alto >= 44, `${version}: toque del botón ${r.toque} (≥ 44)`);
  comprobar(r.titulo >= 4.5 && r.texto >= 4.5, `${version}: contraste AA del título ${r.titulo} y del texto ${r.texto} sobre el gris de Inicio`);
  comprobar(r.boton >= 4.5, `${version}: contraste AA del texto del botón ${r.boton}`);
  comprobar(r.botonSobreFondo >= 3, `${version}: el botón se distingue del gris (${r.botonSobreFondo}, ≥ 3)`);
  comprobar(r.orden.startsWith("h2 → p → a:Publicar un evento"), `${version}: orden de lectura ${r.orden}`);
  if (r.quieto) comprobar(r.quieto >= 4.5 && r.altoQuieto >= 44, `${version}: el enlace quieto, contraste ${r.quieto} y toque ${r.toqueQuieto}`);
  // Foco con el teclado de verdad: Tab desde el principio del teléfono hasta el botón.
  await marco().evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
  await page.locator("#tel").focus();
  let foco = null;
  for (let i = 0; i < 25; i++) { await page.keyboard.press("Tab"); foco = await marco().evaluate(FOCO); if (foco.texto === "Publicar un evento") break; }
  const contrasteFoco = await marco().evaluate(CONTRASTE, [foco.color, r.fondo]);
  accesibilidad[version].foco = { ...foco, contraste: contrasteFoco };
  comprobar(foco.texto === "Publicar un evento" && foco.estilo !== "none" && foco.ancho >= 2 && contrasteFoco >= 3, `${version}: foco visible con Tab (${foco.estilo} ${foco.ancho}px, separado ${foco.separacion}, contraste ${contrasteFoco} sobre el gris)`);
  await page.locator("#tel").screenshot({ path: path.join(SALIDA, captura + ".png") });
  console.log(captura);
}
fs.writeFileSync(path.join(SALIDA, "accesibilidad.json"), JSON.stringify(accesibilidad, null, 2));

// 4. Recorrido con toques reales dentro del teléfono.
const llamadoEn = (nombre) => page.frameLocator("#tel").locator('[data-propuesta="llamado"] a', { hasText: nombre });
const cerrarAlta = () => tocar(page.frameLocator("#tel").locator('[aria-label^="Cerrar"]').first());
await elegir("2 · Lugares", "Propuesta", "Sin sesión");
comprobar((await llamadoEn("Publicar un evento").getAttribute("href")) === "/nuevo/evento?ciudad=queretaro", "el botón lleva al alta de evento con Querétaro puesto");
await tocar(llamadoEn("Publicar un evento"));
comprobar((await pintado()) === "entrar-alta", "sin sesión, el botón pasa por Entrar");
await foto("13-recorrido-entrar");
await tocar(page.frameLocator("#tel").getByRole("button", { name: "Mandarme el código" }));
comprobar((await pintado()) === "alta-evento", "tras entrar, vuelve al alta de evento");
await foto("14-recorrido-alta-evento");
await cerrarAlta();
comprobar((await pintado()) === "propuesta-qro", "la ✕ del alta vuelve a Inicio");
await tocar(boton("Sesión", "Con sesión"));
await tocar(llamadoEn("Publicar un evento"));
comprobar((await pintado()) === "alta-evento", "con sesión, el botón va directo al alta de evento");
await cerrarAlta();
await tocar(page.frameLocator("#tel").locator('header a[aria-label="Publicar un evento"]'));
comprobar((await pintado()) === "alta-evento", "el «+» de la barra sigue llevando al alta (lugar y artista, en su tira)");
await tocar(page.frameLocator("#tel").locator("footer a", { hasText: "Lugar" }));
comprobar((await pintado()) === "alta-lugar", "desde el alta, la tira pasa a lugar");
await foto("15-recorrido-barra-alta-lugar");
await elegir("2 · Lugares", "Variante", "Con sesión");
await tocar(llamadoEn("Registrar un lugar o a un artista"));
comprobar((await pintado()) === "alta-lugar", "variante: el enlace quieto va al alta de lugar");

// 5. La página entera del prototipo, a 1280.
await page.setViewportSize({ width: 1280, height: 1000 });
await elegir("2 · Lugares", "Propuesta", "Sin sesión");
await page.screenshot({ path: path.join(SALIDA, "16-prototipo-1280.png"), fullPage: true });

console.table(filas);
console.log("errores de la página:", errores.length ? errores : "ninguno");
console.log(fallos.length ? `FALLAN ${fallos.length}: ${fallos.join(" · ")}` : "todas las comprobaciones pasan");
await browser.close();
process.exit(fallos.length || errores.length ? 1 : 0);
