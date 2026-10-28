// Capturas de la bitácora 496 (OL-464): el carrusel de un festival con varios carteles en Instagram y Facebook. Con la app compilada contra el
// respaldo local (la sesión de la cuenta de administración y el festival «Cultura Mística (demo)» con carteles, `RESPALDO_CARRUSEL_IG=1`: el marco
// y once actos; la Fogata comparte el de los Tambores), la API de Instagram y la página de Facebook DE MENTIRA del respaldo
// (`INSTAGRAM_API_URL=http://127.0.0.1:<puerto>/graph`, token y página inventados): nunca se llama a Instagram ni a Facebook. Los carteles los
// dibuja este script con sharp (inventados, de medidas distintas: 4:5, cuadrados, verticales y apaisados).
// Chrome real (playwright-core), 390×844 a 2×. Toques reales: clics por coordenadas. Mide los textos cortados (`scrollWidth > clientWidth`) a 320,
// 390 y 430.
//   node scripts/ops/auditoria-ui/capturar-instagram-carrusel.mjs <raíz del árbol> <carpeta de salida>
// SIN_BUILD=1 usa el `.next` que ya hay, compilado por este script (el respaldo va en el puerto 8889). Correrlo en un árbol SIN `.env`.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const [RAIZ, SALIDA] = process.argv.slice(2).map((p) => path.resolve(p));
if (fs.existsSync(path.join(RAIZ, ".env"))) {
  console.error("hay un .env en el árbol: la app cargaría llaves reales. Córrelo en un árbol sin .env");
  process.exit(1);
}
const { chromium } = await import(path.join(RAIZ, "node_modules/playwright-core/index.mjs"));
const { ADMIN, cookieDe } = await import(path.join(RAIZ, "scripts/ops/auditoria-ui/respaldo-local/fixture.mjs"));
const NEXT = path.join(RAIZ, "node_modules/next/dist/bin/next");
const AQUI = path.join(RAIZ, "scripts/ops/auditoria-ui");
const AHORA = "2026-10-07T16:00:00Z"; // miércoles 7 de octubre, 10:00 en San Luis Potosí (el reloj del respaldo)
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
fs.mkdirSync(SALIDA, { recursive: true });

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
const puertoLibre = () => new Promise((ok) => { const s = net.createServer().listen(0, () => { const p = s.address().port; s.close(() => ok(p)); }); });
async function esperar(url, h) {
  for (let i = 0; i < 300; i++) {
    if (h.exitCode !== null) throw new Error(`se cerró\n${h.registro()}`);
    try { if ((await fetch(url)).status < 500) return; } catch {}
    await new Promise((ok) => setTimeout(ok, 200));
  }
  throw new Error(`no respondió: ${url}\n${h.registro()}`);
}

const [pr, pa] = [8889, await puertoLibre()];
const respaldo = `http://127.0.0.1:${pr}`;
const base = `http://127.0.0.1:${pa}`;
const reloj = { RELOJ_FIJO: AHORA, TZ: "America/Mexico_City", NODE_OPTIONS: `--require=${path.join(AQUI, "reloj-fijo.cjs")}` };
const app = { NEXT_PUBLIC_SUPABASE_URL: respaldo, NEXT_PUBLIC_SUPABASE_ANON_KEY: "llave-anon-inventada", NEXT_PUBLIC_MAPBOX_TOKEN: "pk.inventado", SUPABASE_SERVICE_ROLE_KEY: "llave-servicio-inventada" };
const instagram = { INSTAGRAM_API_URL: `${respaldo}/graph`, INSTAGRAM_TOKEN: "token-inventado", INSTAGRAM_USER_ID: "17841400000000458", FACEBOOK_PAGE_ID: "1374800000000461" };
// Los carteles inventados: el marco y diez de sus actos, cada uno de un color y una medida (la Fogata usa el de los Tambores).
const { default: sharp } = await import(path.join(RAIZ, "node_modules/sharp/dist/index.mjs"));
const CARTELES = fs.mkdtempSync(path.join(os.tmpdir(), "carrusel-496-"));
const MEDIDAS = { "4x5": [1080, 1350], "1x1": [1080, 1080], "9x16": [1080, 1920], "3x2": [1200, 800] };
const DIBUJOS = [
  ["marco", "Cultura Mística", "9 al 11 de oct · Aether", "#2b1846", "#f4c95d", "4x5"],
  ["acto-1", "Meditación", "vie 9 · 5:30 pm", "#123c3a", "#c8f1e4", "1x1"],
  ["acto-2", "Taller de escritura", "vie 9 · 6:30 pm", "#f1e3c8", "#4a2a12", "4x5"],
  ["acto-3", "Charla de tarot", "vie 9 · 9:00 pm", "#3b0d2c", "#f7b2d9", "9x16"],
  ["acto-4", "Yoga kundalini", "sáb 10 · 11:00 am", "#e7f0d2", "#2f4a10", "3x2"],
  ["acto-5", "Mercadito místico", "sáb 10 · 1:00 pm", "#7a2e12", "#ffe2c2", "4x5"],
  ["acto-6", "Ceremonia de cacao", "sáb 10 · 5:00 pm", "#3d2314", "#e9c08f", "1x1"],
  ["acto-7", "Lectura de cartas", "sáb 10 · 7:00 pm", "#0e1f4d", "#9fc0ff", "4x5"],
  ["acto-8", "Tambores y fogata", "sáb 10 y dom 11", "#1b1b1b", "#ff8a3d", "9x16"],
  ["acto-9", "Astrología básica", "dom 11 · 12:00 pm", "#2d0f57", "#e2d0ff", "3x2"],
  ["acto-10", "Concierto de cuencos", "dom 11 · 6:00 pm", "#0f3d2a", "#b7f5d2", "4x5"],
];
for (const [nombre, titulo, cuando, fondo, tinta, medida] of DIBUJOS) {
  const [w, h] = MEDIDAS[medida];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${fondo}"/>
    <circle cx="${w / 2}" cy="${h * 0.36}" r="${Math.min(w, h) * 0.2}" fill="none" stroke="${tinta}" stroke-width="18"/>
    <text x="${w / 2}" y="${h * 0.7}" font-family="Helvetica, Arial" font-weight="700" font-size="${Math.round(w / 13)}" fill="${tinta}" text-anchor="middle">${titulo}</text>
    <text x="${w / 2}" y="${h * 0.7 + w / 11}" font-family="Helvetica, Arial" font-size="${Math.round(w / 24)}" fill="${tinta}" text-anchor="middle">${cuando}</text>
    <text x="${w / 2}" y="${h * 0.95}" font-family="Helvetica, Arial" font-size="${Math.round(w / 34)}" fill="${tinta}" text-anchor="middle">(demo) · cartel inventado</text></svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toFile(path.join(CARTELES, `${nombre}.jpg`));
}
const r = lanzar([path.join(AQUI, "respaldo-local/server.mjs"), String(pr)], { ...reloj, RESPALDO_CARRUSEL_IG: "1", RESPALDO_CARRUSEL_DIR: CARTELES, RESPALDO_URL: `http://127.0.0.1:${pr}` });
await esperar(`${respaldo}/rest/v1/eventos?select=id&limit=1`, r);
if (!process.env.SIN_BUILD) {
  process.stdout.write("compilando… ");
  const b = spawnSync(process.execPath, [NEXT, "build"], { cwd: RAIZ, env: { ...process.env, ...app }, encoding: "utf8", maxBuffer: 1 << 26 });
  if (b.status !== 0) throw new Error((b.stdout + b.stderr).slice(-3000));
  console.log("listo");
}
const s = lanzar([NEXT, "start", "-p", String(pa)], { ...app, ...reloj, ...instagram });
await esperar(`${base}/entrar`, s);

const IMAGEN = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#b9b4a8"/></svg>';
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--hide-scrollbars"] });
const errores = [];
const fallas = [];
const comprobar = (ok, que) => {
  console.log(`     ${ok ? "ok" : "FALLA"} · ${que}`);
  if (!ok) fallas.push(que);
};
async function contexto({ ancho = 390 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.clock.setFixedTime(new Date(AHORA));
  await ctx.addCookies([{ name: "sb-127-auth-token", value: cookieDe(ADMIN), url: base }]);
  await ctx.route("**/_vercel/**", (q) => q.fulfill({ contentType: "text/javascript", body: "" }));
  await ctx.route((u) => u.hostname !== "127.0.0.1", (q) => (q.request().resourceType() === "image" ? q.fulfill({ contentType: "image/svg+xml", body: IMAGEN }) : q.abort()));
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(String(e.message).slice(0, 300)));
  page.on("console", (m) => m.type() === "error" && errores.push(`consola: ${m.text().slice(0, 300)}`));
  return { ctx, page };
}
const quieto = async (page, ms = 700) => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
};
const foto = async (page, nombre) => {
  await quieto(page);
  await page.screenshot({ path: path.join(SALIDA, `${nombre}.png`) });
  console.log("  ", nombre);
};
async function tocar(page, loc) {
  await loc.evaluate((e) => e.scrollIntoView({ block: "center" }));
  const b = await loc.boundingBox();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
}
const imagenesListas = (page) => page.waitForFunction(() => [...document.querySelectorAll('[role="dialog"] img')].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 30000 });
/** Los textos cortados de la página: todo lo visible con texto propio cuyo contenido pasa de su caja. Fuera: el resumen a dos líneas de ui/CampoLargo (firmado, OL-147). */
const cortados = (page) =>
  page.evaluate(() => {
    const fuera = [];
    for (const el of document.body.querySelectorAll("*")) {
      if (["SCRIPT", "STYLE", "TEXTAREA"].includes(el.tagName) || el.closest("svg")) continue;
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || getComputedStyle(el).visibility === "hidden" || el.closest("[inert]")) continue;
      if (getComputedStyle(el).webkitLineClamp !== "none") continue;
      if (el.scrollWidth > el.clientWidth + 1) fuera.push(`${el.tagName.toLowerCase()} «${el.textContent.trim().slice(0, 50)}» ${el.scrollWidth}>${el.clientWidth}`);
    }
    return fuera;
  });
const registro = async (red) => (await (await fetch(`${respaldo}/__registro`)).json()).filter((l) => l.startsWith(`  ${red}:`)).map((l) => JSON.parse(l.slice(red.length + 4)));
const abrirHoja = async (page, titulo) => {
  await tocar(page, page.locator("main li", { hasText: titulo }).locator("a").first());
  const hoja = page.getByRole("dialog", { name: "Publicar en Instagram" });
  await hoja.getByRole("button", { name: /^Publicar/ }).waitFor({ timeout: 15000 });
  await imagenesListas(page);
  return hoja;
};
const cuerpoDe = (hoja) => hoja.locator("[class*=cuerpo]").first();
const alFondo = (hoja) => cuerpoDe(hoja).evaluate((c) => c.scrollTo(0, c.scrollHeight));
/** El texto armado: cerrado, `ui/CampoLargo` lo lleva en su campo oculto (lo que se publica). */
const textoDeLaHoja = (hoja) => hoja.locator('input[name="texto"]').inputValue();
const ACTO = (n) => `bbbb0013-0000-4000-8000-0000000000${String(n + 1).padStart(2, "0")}`;
/** La tira del carrusel y su orden, por las claves de sus miniaturas («portada» o el id del acto). */
const tira = (hoja) => hoja.getByRole("list", { name: "Imágenes del carrusel" });
const ordenDe = (hoja) => tira(hoja).locator("img").evaluateAll((xs) => xs.map((i) => new URL(i.src).searchParams.get("imagen") ?? "portada"));
const ESPERADO = ["portada", ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(ACTO)];
const tiraAlFin = (hoja) => tira(hoja).evaluate((t) => t.scrollTo(t.scrollWidth, 0));
const verTira = (hoja) => tira(hoja).evaluate((t) => t.scrollIntoView({ block: "center" }));

try {
  // 01 · La lista: el festival con su cartel, un solo renglón.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/instagram?ciudad=san-luis-potosi`, { waitUntil: "load" });
    const fila = page.locator("main li", { hasText: "Cultura Mística (demo)" });
    await fila.evaluate((e) => window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 300));
    await foto(page, "01-lista-festival");
    comprobar((await fila.count()) === 1, "el festival es un solo renglón");
    await ctx.close();
  }
  // 02 a 09 · La hoja: el carrusel, la tira, quitar, mover, publicar en las dos.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/instagram?ciudad=san-luis-potosi`, { waitUntil: "load" });
    const hoja = await abrirHoja(page, "Cultura Mística (demo)");
    await foto(page, "02-hoja-carrusel");
    const dice = (await hoja.innerText()).replace(/\s+/g, " ");
    comprobar(dice.includes("Carrusel de 10 imágenes, en este orden:") && dice.includes("Instagram deja 10: queda fuera «Concierto de cuencos»."), "«Carrusel de 10 imágenes» y el que queda fuera, dicho");
    const orden = await ordenDe(hoja);
    console.log("     tira:", orden.map((c) => (c === "portada" ? c : c.slice(-2))).join(" "));
    comprobar(JSON.stringify(orden) === JSON.stringify(ESPERADO), "la portada y nueve carteles distintos en orden de fecha (la Fogata comparte el de los Tambores)");
    await verTira(hoja);
    await imagenesListas(page);
    await foto(page, "03-tira");
    const medidas = await tira(hoja).locator("img").evaluateAll((xs) => xs.map((i) => [i.naturalWidth, i.naturalHeight]));
    comprobar(medidas.every(([w, h]) => w === 240 && h === 300), "cada miniatura es el cartel a 4:5 (240 × 300) dibujado por el servidor");
    const chicos = await tira(hoja).getByRole("button").evaluateAll((bs) => bs.filter((b) => b.getBoundingClientRect().width < 44 || b.getBoundingClientRect().height < 44).length);
    comprobar(chicos === 0, "los botones de la tira miden 44 o más");
    await tiraAlFin(hoja);
    await quieto(page, 400);
    await foto(page, "04-tira-al-final");
    // Quitar una: entra la que quedaba fuera.
    await tocar(page, hoja.getByRole("button", { name: "Quitar del carrusel: Yoga kundalini" }));
    await imagenesListas(page);
    await verTira(hoja);
    await tiraAlFin(hoja);
    await quieto(page, 400);
    await foto(page, "05-quitada");
    const tras = await ordenDe(hoja);
    comprobar(!tras.includes(ACTO(4)) && tras.at(-1) === ACTO(10) && tras.length === 10, "quitado el Yoga, entra el Concierto de cuencos");
    // Mover: la portada después de la Meditación; la imagen grande es la nueva primera.
    await tira(hoja).evaluate((t) => t.scrollTo(0, 0));
    await tocar(page, hoja.getByRole("button", { name: /^Mover después: la portada/ }));
    await imagenesListas(page);
    await hoja.locator("[class*=cuerpo]").first().evaluate((c) => c.scrollTo(0, 0));
    await foto(page, "06-reordenada");
    const grande = await hoja.locator("img").first().evaluate((i) => new URL(i.src).searchParams.get("imagen"));
    comprobar(grande === ACTO(1) && (await ordenDe(hoja))[1] === "portada", "la Meditación pasa primero y es la imagen grande");
    const vamos = await ordenDe(hoja);
    const textoHoja = await textoDeLaHoja(hoja);
    await alFondo(hoja);
    await foto(page, "07-hoja-abajo");
    await tocar(page, hoja.getByRole("button", { name: "Publicar", exact: true }));
    await hoja.getByRole("status").waitFor({ timeout: 90000 });
    await foto(page, "08-publicado");
    const estado = (await hoja.getByRole("status").innerText()).replace(/\s+/g, " ");
    comprobar(/Instagram: carrusel publicado, 10 imágenes/.test(estado) && /Facebook: publicado, 10 fotos/.test(estado), `el resultado dice el carrusel en las dos («${estado}»)`);
    // Lo que llegó a Instagram: diez hijos con sus etiquetas y el carrusel con sus hijos, el texto y la ubicación.
    const ig = await registro("instagram");
    const hijos = ig.filter((x) => x.is_carousel_item === "true");
    const carrusel = ig.filter((x) => x.media_type === "CAROUSEL").at(-1);
    const tags = hijos.map((h) => JSON.parse(h.user_tags ?? "[]").map((t) => t.username));
    tags.forEach((t, i) => console.log(`     imagen ${i + 1} (${vamos[i] === "portada" ? "portada" : vamos[i].slice(-2)}): ${t.join(" ")}`));
    comprobar(hijos.length === 10 && carrusel?.children?.split(",").length === 10, "diez contenedores hijos y un carrusel con los diez, en orden");
    comprobar(tags.every((t) => t[0] === "aether.slp"), "el lugar etiquetado en todas");
    comprobar(tags[0].includes("marthafranco.demo") && tags[1].includes("culturamistica.demo"), "cada imagen con los artistas de su acto (la Meditación con Martha Franco) y quien organiza en la portada");
    const iTambores = vamos.indexOf(ACTO(8));
    comprobar(iTambores > 0 && tags[iTambores].includes("tamborancestral.demo") && tags[iTambores].includes("marthafranco.demo"), "el cartel compartido (Tambores y Fogata) etiqueta a los artistas de los dos actos");
    comprobar(!!carrusel?.caption && carrusel.caption === textoHoja && carrusel.caption.startsWith("Cultura Mística (demo)\n") && !hijos.some((h) => h.caption), "el texto de la hoja va en el carrusel, no en los hijos");
    console.log("     a Instagram (carrusel):", JSON.stringify({ children: carrusel?.children, location_id: carrusel?.location_id }));
    const fb = await registro("facebook");
    const muro = fb.filter((x) => x.feed).at(-1);
    comprobar(fb.filter((x) => x.published === "false").length >= 10 && muro?.attached_media?.length === 10 && /Ficha del evento: https:\/\/somosnosotrxs\.org\/eventos\/cultura-mistica-demo\?utm_source=facebook/.test(muro.message ?? ""), "Facebook: diez fotos sin publicar y una publicación con las diez y el texto con el enlace");
    await tocar(page, hoja.getByRole("button", { name: "Listo" }));
    await hoja.waitFor({ state: "detached" });
    const ya = page.locator("main li", { hasText: "Cultura Mística (demo)" });
    await ya.evaluate((e) => e.scrollIntoView({ block: "center" }));
    await foto(page, "09-lista-despues");
    comprobar(/Carrusel · Hoy/.test((await ya.innerText()).replace(/\s+/g, " ")), "en «Ya en Instagram»: «Carrusel · Hoy, …»");
    await ctx.close();
  }
  // 10 · La historia: una sola imagen (la portada).
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/instagram?ciudad=san-luis-potosi`, { waitUntil: "load" });
    const hoja = await abrirHoja(page, "Cultura Mística (demo)");
    await tocar(page, hoja.getByRole("button", { name: "Historia 9:16" }));
    await imagenesListas(page);
    await foto(page, "10-historia");
    comprobar((await tira(hoja).count()) === 0 && (await hoja.innerText()).includes("Lleva solo la portada."), "la historia lleva solo la portada, sin tira");
    await ctx.close();
  }
  // 11 · Un evento de siempre (una imagen): la hoja como antes, sin tira.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/instagram`, { waitUntil: "load" });
    const hoja = await abrirHoja(page, "Delirium Pollum");
    await foto(page, "11-una-imagen");
    comprobar((await tira(hoja).count()) === 0 && !(await hoja.innerText()).includes("Carrusel"), "un evento con una imagen: la hoja de siempre");
    await ctx.close();
  }
  // Textos cortados a 320, 390 y 430: la hoja del festival arriba, en la tira y abajo.
  for (const ancho of [320, 390, 430]) {
    const { ctx, page } = await contexto({ ancho });
    await page.goto(`${base}/admin/instagram?ciudad=san-luis-potosi`, { waitUntil: "load" });
    const hoja = await abrirHoja(page, "Cultura Mística (demo)");
    await quieto(page, 300);
    const arriba = await cortados(page);
    await verTira(hoja);
    await quieto(page, 300);
    const enTira = await cortados(page);
    if (ancho === 320) await foto(page, "12-tira-320");
    await alFondo(hoja);
    await quieto(page, 300);
    const abajo = await cortados(page);
    const ancho2 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const todos = [...arriba, ...enTira, ...abajo];
    comprobar(!todos.length && ancho2 <= 0, `a ${ancho}: sin textos cortados ni desplazamiento a lo ancho${todos.length ? ` (${todos.join(" | ")})` : ""}`);
    await ctx.close();
  }
} finally {
  await browser.close();
  fs.rmSync(CARTELES, { recursive: true, force: true });
}
console.log(errores.length ? `errores de página o consola:\n  ${errores.join("\n  ")}` : "sin errores de página ni de consola");
console.log(fallas.length ? `FALLAS: ${fallas.length}` : "todo bien");
process.exit(fallas.length || errores.length ? 1 : 0);
