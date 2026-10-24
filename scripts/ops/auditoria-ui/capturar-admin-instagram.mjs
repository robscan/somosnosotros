// Evidencia del prototipo OL-458 (bitácora 490, docs/rediseno/prototipos/admin-instagram.html) con el Chrome real de la Mac (playwright-core del
// repo): 1) cada estado del teléfono a 390×844 (2×) y dos a 1280×800, midiendo cada estado dentro del marco con medir.js (nodos, profundidad,
// desbordes, toques de menos de 44) y los textos cortados (`scrollWidth > clientWidth` en todo lo que tiene texto) a 320, 390 y 430 de ancho;
// 2) el recorrido con toques reales (clics de ratón por coordenadas, que fallan si algo tapa el botón, y teclas reales). Las capturas salen sin
// comprimir; al repo van con comprimir.mjs.
//   node scripts/ops/auditoria-ui/capturar-admin-instagram.mjs <carpeta>
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const SALIDA = process.argv[2];
if (!SALIDA) { console.error("uso: capturar-admin-instagram.mjs <carpeta>"); process.exit(1); }
const { chromium } = createRequire(path.join(RAIZ, "package.json"))("playwright-core");
const PROTO = pathToFileURL(path.join(RAIZ, "docs/rediseno/prototipos/admin-instagram.html")).href;
const MEDIR = fs.readFileSync(path.join(RAIZ, "scripts/ops/auditoria-ui/medir.js"), "utf8");
fs.mkdirSync(SALIDA, { recursive: true });
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--hide-scrollbars"] });
const errores = [];
const filas = [];
let cortes = 0;
let aparte = 0;

async function pagina(ancho, alto, dpr) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: dpr, locale: "es-MX" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(String(e.message).slice(0, 200)));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errores.push(m.type() + ": " + m.text().slice(0, 200)); });
  await page.goto(PROTO, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => document.documentElement.dataset.pintado);
  await page.frameLocator("#tel").locator("body").waitFor();
  await page.evaluate(() => document.fonts.ready);
  return { ctx, page };
}
const marco = (page) => page.frames().find((f) => f !== page.mainFrame());
/** Los textos cortados del marco: cualquier elemento visible con texto propio cuyo contenido pasa de su caja (con puntos suspensivos o sin ellos). */
const CORTADOS = () => {
  const fuera = [];
  for (const el of document.body.querySelectorAll("*")) {
    if (["SCRIPT", "STYLE", "svg", "TEXTAREA"].includes(el.tagName) || el.closest("svg")) continue;
    const propio = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!propio) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || getComputedStyle(el).visibility === "hidden") continue;
    if (el.scrollWidth > el.clientWidth + 1 || (getComputedStyle(el).webkitLineClamp !== "none" && el.scrollHeight > el.clientHeight + 1)) fuera.push(`${el.tagName.toLowerCase()} «${el.textContent.trim().slice(0, 50)}» ${el.scrollWidth}>${el.clientWidth}${getComputedStyle(el).webkitLineClamp !== "none" ? " (resumen a dos líneas)" : ""}`);
  }
  return fuera;
};
async function medir(page, id) {
  const f = marco(page);
  await f.evaluate(() => document.fonts.ready);
  const m = await f.evaluate(MEDIR);
  const c = await f.evaluate(CORTADOS);
  filas.push({ id, nodos: m.nodos, prof: m.profundidadMax, desbordes: m.desbordes.length, toques: m.toquesChicos.length, negativos: m.negativos.length, cortados: c.length });
  for (const d of m.desbordes) console.log("  DESBORDE", id, d.padre, "→", d.hijo, JSON.stringify(d.fuera));
  for (const t of m.toquesChicos) console.log("  TOQUE", id, t.el, `${t.w}×${t.h}`, t.texto);
  for (const x of c) console.log("  CORTADO", id, x);
}
async function foto(page, nombre, { ir, scroll, hoja } = {}) {
  if (ir) await page.evaluate(([l, s, v]) => window.prototipo.ir(l, s, v), ir);
  await page.waitForTimeout(500);
  const f = marco(page);
  if (scroll != null) await f.evaluate((y) => { document.scrollingElement.scrollTop = y; }, scroll);
  // El cuerpo de una hoja abierta (ui/Hoja) se desplaza por dentro.
  if (hoja != null) await f.evaluate((y) => { const c = [...document.querySelectorAll('[role="dialog"] *')].find((e) => getComputedStyle(e).overflowY === "auto"); if (c) c.scrollTop = y; }, hoja);
  await page.waitForTimeout(300);
  await page.locator("#tel").screenshot({ path: path.join(SALIDA, nombre + ".png") });
  await medir(page, nombre);
  console.log(nombre);
}

// Teléfono: la página a 860 de ancho (el marco mide 390×844 igual).
let { ctx, page } = await pagina(860, 1000, 2);
await foto(page, "01-A-portada", { ir: ["A", "portada", "telefono"] });
await foto(page, "02-A-portada-instagram", { ir: ["A", "portada", "telefono"], scroll: 1900 });
await foto(page, "03-B-lista", { ir: ["B", "slp", "telefono"] });
await foto(page, "04-B-lista-abajo", { ir: ["B", "abajo", "telefono"] });
await foto(page, "05-B-hoja-ciudades", { ir: ["B", "ciudades", "telefono"] });
await foto(page, "06-B-todas-las-ciudades", { ir: ["B", "todas", "telefono"] });
await foto(page, "07-B-ciudad-de-mexico", { ir: ["B", "cdmx", "telefono"] });
await foto(page, "08-C-publicacion", { ir: ["C", "pub", "telefono"] });
await foto(page, "09-C-publicacion-abajo", { ir: ["C", "pub", "telefono"], hoja: 2000 });
await foto(page, "10-C-recortado", { ir: ["C", "recorte", "telefono"] });
await foto(page, "11-C-historia", { ir: ["C", "historia", "telefono"] });
await foto(page, "12-C-texto-abierto", { ir: ["C", "texto", "telefono"] });
await foto(page, "13-C-texto-largo", { ir: ["C", "largo", "telefono"] });
await foto(page, "14-C-sin-cartel", { ir: ["C", "sincartel", "telefono"] });
await foto(page, "15-C-sin-cartel-otro-diseno", { ir: ["C", "otro", "telefono"] });
await foto(page, "16-C-comparar-portada", { ir: ["C", "portada", "telefono"] });
await foto(page, "17-C-ya-publicado", { ir: ["C", "yapub", "telefono"], hoja: 2000 });
await foto(page, "18-D-publicando", { ir: ["D", "publicando", "telefono"], hoja: 2000 });
await foto(page, "19-D-publicado", { ir: ["D", "publicado", "telefono"], hoja: 2000 });
await foto(page, "20-D-lista-despues", { ir: ["D", "lista", "telefono"] });
await foto(page, "21-D-error-cupo", { ir: ["D", "cupo", "telefono"] });
await foto(page, "22-D-error-imagen", { ir: ["D", "imagen", "telefono"] });
await foto(page, "23-D-error-permiso", { ir: ["D", "permiso", "telefono"] });
await foto(page, "24-E-ficha-menu", { ir: ["E", "menu", "telefono"] });
await foto(page, "25-E-hoja-desde-la-ficha", { ir: ["E", "hoja", "telefono"] });
await ctx.close();

// Escritorio: 1280×800 a escala 1.
({ ctx, page } = await pagina(1760, 1000, 1));
await foto(page, "26-B-lista-1280", { ir: ["B", "slp", "escritorio"] });
await foto(page, "27-C-publicacion-1280", { ir: ["C", "pub", "escritorio"] });
await ctx.close();

// La página entera del prototipo a 1440 (el marco y la hoja de notas).
({ ctx, page } = await pagina(1440, 1000, 1));
await page.evaluate(() => window.prototipo.ir("C", "pub", "telefono"));
await page.waitForTimeout(600);
await page.screenshot({ path: path.join(SALIDA, "00-pagina-entera.png") });
console.log("00-pagina-entera");
await ctx.close();
console.table(filas);

// Textos cortados a 320, 390 y 430: el marco a ese ancho, en cada estado.
({ ctx, page } = await pagina(860, 1000, 1));
const presets = await page.evaluate(() => window.prototipo.presets());
for (const ancho of [320, 390, 430]) {
  await page.evaluate((a) => document.documentElement.style.setProperty("--ancho-tel", `${a}px`), ancho);
  for (const [letra, subs] of Object.entries(presets)) {
    for (const sub of subs) {
      await page.evaluate(([l, s]) => window.prototipo.ir(l, s, "telefono"), [letra, sub]);
      await page.waitForTimeout(250);
      const f = marco(page);
      const todos = await f.evaluate(CORTADOS);
      // Dos cortes son del diseño firmado y no de esta pieza: el resumen a dos líneas de ui/CampoLargo (OL-147, se abre a pantalla completa) y el
      // título de la barra de la ficha de la maqueta (ui/BarraFicha, tal cual en producción). Se cuentan aparte.
      const c = todos.filter((x) => !x.includes("(resumen a dos líneas)") && !(letra === "E" && x.startsWith("b «Concierto")));
      aparte += todos.length - c.length;
      const m = await f.evaluate(MEDIR);
      // Con el texto abierto a pantalla completa (ui/CampoLargo), los chips de formato quedan debajo de la capa: no se pueden tocar, como en la app.
      if (letra === "C" && (sub === "texto" || sub === "largo")) { aparte += m.toquesChicos.length; m.toquesChicos = []; }
      const ancho2 = await f.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (c.length || m.toquesChicos.length || m.desbordes.length || ancho2 > 0) {
        cortes += c.length + m.toquesChicos.length + m.desbordes.length + (ancho2 > 0 ? 1 : 0);
        console.log(`  ${ancho} ${letra}-${sub}:`, [...c, ...m.toquesChicos.map((t) => `toque ${t.el} ${t.w}×${t.h}`), ...m.desbordes.map((d) => `desborde ${d.hijo}`), ...(ancho2 > 0 ? [`a lo ancho ${ancho2}`] : [])].join(" | "));
      }
    }
  }
  console.log(`  ${ancho}: revisado`);
}
await ctx.close();
console.log(`textos cortados, toques chicos, desbordes y desplazamiento a lo ancho a 320/390/430: ${cortes} (aparte, del diseño firmado: ${aparte})`);

// ===== 2 · El recorrido con toques reales.
const ctxR = await browser.newContext({ viewport: { width: 860, height: 1300 }, deviceScaleFactor: 1, locale: "es-MX" });
const pageR = await ctxR.newPage();
pageR.on("pageerror", (e) => errores.push(String(e.message)));
await pageR.goto(PROTO, { waitUntil: "load" });
await pageR.evaluate(() => localStorage.clear());
await pageR.reload({ waitUntil: "load" });
await pageR.waitForFunction(() => document.documentElement.dataset.pintado);
await pageR.evaluate(() => window.prototipo.reiniciar());
await pageR.waitForTimeout(300);
const tel = pageR.frameLocator("#tel");
let ok = 0, mal = 0;
const comprobar = (nombre, cierto) => { if (cierto) ok++; else mal++; console.log(cierto ? "  bien" : "  MAL ", nombre); };
const toca = async (loc) => { await loc.click({ timeout: 3000 }); await pageR.waitForTimeout(250); };
const dialogo = tel.locator('[role="dialog"][aria-modal="true"]');
const etiqueta = async () => (await pageR.locator("#etiqueta").textContent()) ?? "";
const titulos = () => tel.locator("main h2").allInnerTexts();

// 1 · La portada: el grupo Instagram con su renglón; lleva a la lista.
const renglon = tel.getByRole("link", { name: /@smsnstrsapp/ });
comprobar("la portada trae el grupo «Instagram» con «@smsnstrsapp»", (await tel.locator("main h2", { hasText: /^Instagram$/ }).count()) === 1 && (await renglon.count()) === 1);
comprobar("el renglón dice lo publicado y lo que espera («3 publicadas esta semana · 7 por publicar en San Luis Potosí»)", (await renglon.innerText()).replace(/\s+/g, " ").includes("3 publicadas esta semana · 7 por publicar en San Luis Potosí"));
await toca(renglon);
comprobar("lleva a la lista «Instagram» con la barra de título", (await tel.locator("main header h1").innerText()) === "Instagram");
// 2 · La lista: el orden por señal; el chip de ciudad; lo publicado abajo.
const primeros = await tel.locator("main section").first().locator("li b").allInnerTexts();
comprobar(`el orden: Feleal (destacado) primero, luego Café Chairel y DESIERTO (${primeros.slice(0, 3).join(" · ")})`, primeros[0].startsWith("Feleal") && primeros[1].startsWith("Café Chairel") && primeros[2].startsWith("DESIERTO"));
comprobar("dos grupos: «Para publicar · 7» y «Ya en Instagram · 3»", JSON.stringify(await titulos()) === JSON.stringify(["Para publicar· 7", "Ya en Instagram· 3"]) || (await titulos()).map((x) => x.replace(/\s+/g, " ")).join("|") === "Para publicar · 7|Ya en Instagram · 3");
await toca(tel.getByRole("button", { name: "San Luis Potosí" }));
comprobar("el chip abre «Ciudades con eventos» con San Luis elegido", (await dialogo.getAttribute("aria-label")) === "Ciudades con eventos" && (await dialogo.locator('[aria-current="true"]').innerText()).includes("San Luis Potosí"));
await toca(dialogo.getByRole("button", { name: /Ciudad de México/ }));
comprobar("elegir Ciudad de México cierra la hoja y cambia la lista (2 eventos, sin cartel)", (await dialogo.count()) === 0 && (await tel.locator("main li").count()) === 2 && (await tel.getByRole("button", { name: "Ciudad de México" }).count()) === 1);
await toca(tel.getByRole("button", { name: "Ciudad de México" }));
await toca(dialogo.getByRole("button", { name: /San Luis Potosí/ }));
// 3 · La vista previa: Feleal, con margen; recortar y volver; historia sin texto.
await toca(tel.getByRole("link", { name: /^Feleal/ }));
comprobar("tocar Feleal abre «Publicar en Instagram»", (await dialogo.getAttribute("aria-label")) === "Publicar en Instagram");
comprobar("Publicación 4:5 elegida y la imagen a 4:5", (await dialogo.getByRole("button", { name: "Publicación 4:5" }).getAttribute("aria-pressed")) === "true" && (await dialogo.locator(".ps-vista").evaluate((i) => Math.abs(i.getBoundingClientRect().width / i.getBoundingClientRect().height - 0.8) < 0.01)));
comprobar("dice que va completo con margen", (await dialogo.locator(".ps-linea").innerText()).includes("completo, con margen"));
await toca(dialogo.getByRole("button", { name: "Recortar" }));
comprobar("«Recortar» cambia la imagen y la línea", (await dialogo.locator(".ps-linea").innerText()).includes("Recortado") && (await dialogo.getByRole("button", { name: "Usar el cartel completo" }).count()) === 1);
await toca(dialogo.getByRole("button", { name: "Usar el cartel completo" }));
await toca(dialogo.getByRole("button", { name: "Historia 9:16" }));
comprobar("Historia 9:16: la imagen a 9:16 y sin campo de texto", (await dialogo.locator(".ps-vista").evaluate((i) => Math.abs(i.getBoundingClientRect().width / i.getBoundingClientRect().height - 0.5625) < 0.01)) && (await dialogo.getByRole("button", { name: "Texto de la publicación" }).count()) === 0 && (await dialogo.innerText()).includes("Las historias no llevan texto"));
await toca(dialogo.getByRole("button", { name: "Publicación 4:5" }));
// 4 · El texto: el resumen trae el título; abrirlo, escribir, Listo.
const campo = dialogo.getByRole("button", { name: "Texto de la publicación" });
comprobar("el texto armado empieza por el título y trae «@feleal» y las etiquetas", (await pageR.evaluate(() => window.prototipo.texto("feleal"))).match(/^Feleal: un viaje[\s\S]*Con @feleal[\s\S]*#SanLuisPotosi #AgendaCultural/) !== null);
await campo.scrollIntoViewIfNeeded();
await toca(campo);
const area = tel.locator("textarea[data-texto-area]");
comprobar("tocar el texto lo abre a pantalla completa con «Listo», y el foco en el texto", (await area.count()) === 1 && (await area.evaluate((a) => document.activeElement === a)) && (await tel.getByRole("button", { name: "Listo" }).count()) === 1);
await pageR.keyboard.type(" Nos vemos ahí.", { delay: 10 });
await toca(tel.getByRole("button", { name: "Listo" }));
comprobar("«Listo» cierra y el resumen guarda lo escrito", (await pageR.evaluate(() => window.prototipo.estado().textos.feleal)).endsWith("Nos vemos ahí.") && (await dialogo.getByRole("button", { name: "Texto de la publicación" }).count()) === 1);
// 5 · Publicar: un solo botón; «Publicando…»; publicado con «Ver en Instagram»; la lista lo baja.
comprobar("un solo botón violeta en la hoja", (await dialogo.locator('button[class*="primario"]').count()) === 1);
await toca(dialogo.getByRole("button", { name: "Publicar en Instagram" }));
comprobar("«Publicando…» y el botón quieto", (await dialogo.locator("[data-publicar]").innerText()) === "Publicando…" && (await dialogo.locator("[data-publicar]").isDisabled()));
await pageR.waitForTimeout(1600);
comprobar("publicado: la línea de lo hecho con «Ver en Instagram»", (await dialogo.locator('[role="status"]').innerText()).includes("Publicado en @smsnstrsapp") && (await dialogo.getByRole("link", { name: "Ver en Instagram" }).count()) === 1);
await toca(dialogo.getByRole("button", { name: "Listo" }));
comprobar("«Listo» cierra y Feleal pasa a «Ya en Instagram · 4»", (await dialogo.count()) === 0 && (await titulos()).map((x) => x.replace(/\s+/g, " ")).includes("Ya en Instagram · 4") && (await tel.locator("main section").nth(1).innerText()).includes("Feleal"));
// 6 · Sin cartel: Macario con el diseño de Crear cartel y «Otro diseño».
await toca(tel.getByRole("link", { name: /^Macario/ }));
comprobar("Macario: «Sin cartel: un diseño de Crear cartel»", (await dialogo.locator(".ps-linea").innerText()).startsWith("Sin cartel"));
const antes = await dialogo.locator(".ps-vista").getAttribute("src");
await toca(dialogo.getByRole("button", { name: "Otro diseño" }));
comprobar("«Otro diseño» cambia la imagen", (await dialogo.locator(".ps-vista").getAttribute("src")) !== antes);
await pageR.keyboard.press("Escape");
await pageR.waitForTimeout(200);
comprobar("Escape cierra la hoja", (await dialogo.count()) === 0);
// 7 · Atrás de la lista vuelve a la portada.
await toca(tel.getByRole("link", { name: /^Atrás/ }));
comprobar("Atrás vuelve a la portada", (await tel.locator("main header h1").innerText()) === "Administración");
// 8 · La ficha: el «···» trae «Publicar en Instagram» junto a «Destacar», y abre la misma hoja.
await pageR.evaluate(() => window.prototipo.ir("E", "ficha"));
await pageR.waitForTimeout(300);
await toca(tel.getByRole("button", { name: "Más acciones" }));
const menu = await dialogo.locator("li b").allInnerTexts();
comprobar(`el «···»: «Publicar en Instagram» después de «Destacar» (${menu.join(" · ")})`, menu.indexOf("Publicar en Instagram") === menu.indexOf("Destacar") + 1);
await toca(dialogo.getByRole("button", { name: /Publicar en Instagram/ }));
comprobar("abre la hoja con el cartel de la ficha", (await dialogo.getAttribute("aria-label")) === "Publicar en Instagram" && (await dialogo.locator(".ps-vista").getAttribute("alt")).includes("Orquesta Sinfónica"));
// 9 · Las notas en el teléfono: a 390 de ancho, la hoja sube con «Notas» y no hay desplazamiento horizontal.
const chica = await browser.newPage({ viewport: { width: 390, height: 844 } });
await chica.goto(PROTO, { waitUntil: "load" });
await chica.waitForFunction(() => document.documentElement.dataset.pintado);
comprobar("a 390, sin desplazamiento horizontal", await chica.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
await chica.getByRole("button", { name: "Notas" }).click();
await chica.waitForTimeout(400);
comprobar("a 390, «Notas» sube la hoja", await chica.evaluate(() => document.getElementById("hoja").classList.contains("abierta")));
void etiqueta;
console.log(`recorrido: ${ok} de ${ok + mal}`);
console.log("errores de página:", errores.length ? errores : "ninguno");
await browser.close();
process.exit(mal || errores.length ? 1 : 0);
