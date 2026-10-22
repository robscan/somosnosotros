// Capturas de la bitácora 477 (OL-445): lo que descubren las rutinas llega al perfil del artista —«Reconocimientos y obra» en su ficha, la
// «Presentación» en PDF con sus hitos por año, «Tu año» con la línea de sus hitos— y «Completar ficha» en la ficha del Showcase (una ficha sin
// reclamar, con toques reales en «Completar» y «Descartar», y una reclamada, que solo sugiere). La app compilada contra el respaldo local y la
// sesión de la cuenta de administración del respaldo. Chrome real (playwright-core, channel: 'chrome'), 390×844 a 2×. Toques reales (clics de
// Playwright). El PDF se convierte a imagen con `pdftoppm` (Homebrew, poppler).
// node scripts/ops/auditoria-ui/capturar-hitos-al-perfil.mjs <raíz del árbol> <carpeta de salida>
// Compila `.next` contra el respaldo (SIN_BUILD=1 usa el `.next` que ya hay, compilado por este script: el respaldo va en el puerto 8877). Correrlo
// en un árbol SIN `.env` (con él se niega a correr).
// Desde un arranque propio en una carpeta temporal (el fixture no cambia): los hitos públicos de Feleal (`artistas_hitos`, lo que deja el
// disparador de la migración 20261022130000 al aceptar; el disparador se prueba en PostgreSQL, `supabase/tests/pg/artistas-hitos.test.mjs`) con
// sus evidencias aceptadas, y una propuesta de artista aceptada para 0Backside0 y otra para Feleal (lo que trajo la rutina de artistas), más una
// evidencia de obra aceptada de 0Backside0 con su página de Bandcamp. Todo inventado, con dominios `.example` o de plataformas de música.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [RAIZ, SALIDA] = process.argv.slice(2).map((p) => path.resolve(p));
if (fs.existsSync(path.join(RAIZ, ".env"))) { console.error("hay un .env en el árbol: la app cargaría llaves reales. Córrelo en un árbol sin .env"); process.exit(1); }
const { chromium } = await import(path.join(RAIZ, "node_modules/playwright-core/index.mjs"));
const { ADMIN, cookieDe } = await import(path.join(RAIZ, "scripts/ops/auditoria-ui/respaldo-local/fixture.mjs"));
const NEXT = path.join(RAIZ, "node_modules/next/dist/bin/next");
const AQUI = path.join(RAIZ, "scripts/ops/auditoria-ui");
const AHORA = "2026-10-21T16:00:00Z"; // miércoles 21 de octubre, 10:00 en San Luis Potosí
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
fs.mkdirSync(SALIDA, { recursive: true });

const puertoLibre = () => new Promise((ok) => { const s = net.createServer().listen(0, () => { const p = s.address().port; s.close(() => ok(p)); }); });
const [pr, pa] = [Number(process.env.PUERTO_RESPALDO ?? 8877), await puertoLibre()];

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "hitos-respaldo-"));
const arranque = path.join(tmp, "respaldo.mjs");
const fixture = pathToFileURL(path.join(AQUI, "respaldo-local/fixture.mjs")).href;
const servidor = pathToFileURL(path.join(AQUI, "respaldo-local/server.mjs")).href;
fs.writeFileSync(
  arranque,
  `import { tablas } from ${JSON.stringify(fixture)};
const FELEAL = "cccc0001-0000-4000-8000-000000000004", BACKSIDE = "cccc0001-0000-4000-8000-000000000005";
let n = 0;
const id = () => "cccc0477-0000-4000-8000-" + String(++n).padStart(12, "0");
// Los hitos de Feleal: los de sus dos evidencias aceptadas del fixture y cinco más aceptadas (cada uno con su evidencia, como lo deja la base).
const hito = (evidencia_id, tipo, titulo, url, fecha) => ({ id: id(), artista_id: FELEAL, evidencia_id, tipo, titulo, url, fuente: new URL(url).hostname, fecha, publicado_en: "2026-10-20T12:00:00Z" });
const deFeleal = tablas.showcase_evidencias.filter((e) => e.artista_id === FELEAL && e.estado === "aceptada");
tablas.artistas_hitos = deFeleal.map((e) => hito(e.id, e.tipo, e.titulo, e.url, e.fecha));
const mas = [
  ["obra", "premio", "Premio estatal de la juventud en música, 2026", "https://cultura-estatal.example/premios/juventud-2026", "2026-05-18"],
  ["obra", "beca", "Beca de creación para intérpretes jóvenes", "https://cultura-estatal.example/estimulos/2026", "2026-02-10"],
  ["circulacion", "presentacion", "Concierto en un festival de acordeón en Monterrey", "https://festival-acordeon.example/2026/programa", "2026-08-30"],
  ["circulacion", "prensa", "Entrevista sobre su disco en la radio universitaria", "https://radio-universitaria.example/entrevistas/feleal", "2026-09-12"],
  ["obra", "premio", "Mención en un concurso nacional de acordeón", "https://concurso-acordeon.example/2025/resultados", "2025-11-20"],
];
for (const [senal, tipo, titulo, url, fecha] of mas) {
  const e = { id: id(), artista_id: FELEAL, senal, tipo, titulo, url, fecha, fuente: new URL(url).hostname, leida_por: "rutina", estado: "aceptada", creado_en: "2026-10-20T12:00:00Z" };
  tablas.showcase_evidencias.push(e);
  tablas.artistas_hitos.push(hito(e.id, tipo, titulo, url, fecha));
}
// «Completar ficha»: lo que trajo la rutina de artistas en las propuestas aceptadas de las que nacieron las dos fichas, y la obra de 0Backside0.
tablas.propuestas ??= [];
const propuesta = (ficha_id, fuente, datos) => ({ id: id(), corrida_id: id(), tipo: "artista", fuente, datos, estado: "aceptada", motivo_rechazo: null, ficha_id, resuelto_por: null, resuelto_en: "2026-10-15T12:00:00Z", creado_en: "2026-10-14T12:00:00Z" });
tablas.propuestas.push(
  propuesta(BACKSIDE, "Catálogo de bandas del estado", { nombre: "0Backside0", disciplina: "musica", detalle: "Metal alternativo", tipo: "grupo", redes: ["https://open.spotify.com/artist/0backside0ejemplo", "https://instagram.com/0backside0"], obra: "Banda potosina de metal alternativo con dos discos de estudio y giras por el Bajío.", url: "https://catalogo-bandas.example/0backside0" }),
  propuesta(FELEAL, "Catálogo de intérpretes del estado", { nombre: "Feleal", disciplina: "musica", detalle: "Acordeón", tipo: "solista", redes: ["https://open.spotify.com/artist/felealejemplo"], obra: "Acordeonista que recorre música de distintos países en conciertos para todo público.", url: "https://catalogo-interpretes.example/feleal" }),
);
tablas.showcase_evidencias.push({ id: id(), artista_id: BACKSIDE, senal: "obra", tipo: "obra", titulo: "Segundo disco en Bandcamp", url: "https://0backside0.bandcamp.com/album/segundo", fecha: "2026-04-02", fuente: "bandcamp.com", leida_por: "rutina", estado: "aceptada", creado_en: "2026-10-18T12:00:00Z" });
for (const a of tablas.artistas) a.actualizado_en ??= "2026-10-20T12:00:00+00:00";
await import(${JSON.stringify(servidor)});
`,
);

const hijos = [];
process.on("exit", () => {
  hijos.forEach((h) => h.exitCode === null && h.kill());
  fs.rmSync(tmp, { recursive: true, force: true });
});
const lanzar = (args, env) => {
  const h = spawn(process.execPath, args, { cwd: RAIZ, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  let salida = "";
  h.stdout.on("data", (d) => (salida += d));
  h.stderr.on("data", (d) => (salida += d));
  h.registro = () => salida.slice(-3000);
  hijos.push(h);
  return h;
};
async function esperar(url, h) {
  for (let i = 0; i < 300; i++) {
    if (h.exitCode !== null) throw new Error(`se cerró\n${h.registro()}`);
    try { if ((await fetch(url)).status < 500) return; } catch {}
    await new Promise((ok) => setTimeout(ok, 200));
  }
  throw new Error(`no respondió: ${url}\n${h.registro()}`);
}

const respaldo = `http://127.0.0.1:${pr}`;
const base = `http://127.0.0.1:${pa}`;
const reloj = { RELOJ_FIJO: AHORA, TZ: "America/Mexico_City", NODE_OPTIONS: `--require=${path.join(AQUI, "reloj-fijo.cjs")}` };
const app = { NEXT_PUBLIC_SUPABASE_URL: respaldo, NEXT_PUBLIC_SUPABASE_ANON_KEY: "llave-anon-inventada", NEXT_PUBLIC_MAPBOX_TOKEN: "pk.inventado", SUPABASE_SERVICE_ROLE_KEY: "llave-servicio-inventada" };
const r = lanzar([arranque, String(pr)], reloj);
await esperar(`${respaldo}/rest/v1/eventos?select=id&limit=1`, r);
if (!process.env.SIN_BUILD) {
  process.stdout.write("compilando… ");
  const b = spawnSync(process.execPath, [NEXT, "build"], { cwd: RAIZ, env: { ...process.env, ...app }, encoding: "utf8", maxBuffer: 1 << 26 });
  if (b.status !== 0) throw new Error((b.stdout + b.stderr).slice(-3000));
  console.log("listo");
}
const s = lanzar([NEXT, "start", "-p", String(pa)], { ...app, ...reloj });
await esperar(`${base}/entrar`, s);

const IMAGEN = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#b9b4a8"/></svg>';
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--hide-scrollbars"] });
const errores = [];
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA, locale: "es-MX", timezoneId: "America/Mexico_City" });
await ctx.clock.setFixedTime(new Date(AHORA));
await ctx.addCookies([{ name: "sb-127-auth-token", value: cookieDe(ADMIN), url: base }]);
await ctx.route("**/_vercel/**", (q) => q.fulfill({ contentType: "text/javascript", body: "" }));
await ctx.route((u) => u.hostname !== "127.0.0.1", (q) => (q.request().resourceType() === "image" ? q.fulfill({ contentType: "image/svg+xml", body: IMAGEN }) : q.abort()));
const page = await ctx.newPage();
page.on("pageerror", (e) => errores.push(String(e.message).slice(0, 200)));
page.on("console", (m) => m.type() === "error" && errores.push(`consola: ${m.text().slice(0, 200)}`));

const foto = async (nombre) => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(SALIDA, `${nombre}.png`) });
  console.log("  ", nombre);
};
const medir = () => page.evaluate(() => ({ ancho: document.documentElement.scrollWidth, vista: innerWidth }));
/** Sube la página hasta que el elemento quede arriba, bajo la barra de la ficha. */
const llevarArriba = (sel) => page.evaluate((s) => { const el = document.querySelector(s); scrollTo(0, scrollY + el.getBoundingClientRect().top - 72); }, sel);

try {
  // 01 · La ficha pública de Feleal: «Reconocimientos y obra» plegado bajo la trayectoria, con su cuenta.
  await page.goto(`${base}/artistas/feleal`, { waitUntil: "load" });
  const seccion = page.locator("#reconocimientos");
  await seccion.waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  console.log("     renglón:", (await seccion.locator("summary").innerText()).replace(/\s+/g, " "), JSON.stringify(await medir()));
  await llevarArriba("#trayectoria");
  await foto("01-perfil-reconocimientos-plegado");
  // 02 · Al tocarlo se abre: por año, premios y becas primero, cada uno con qué es, la fuente y el día; lleva a la fuente.
  await seccion.locator("summary").click();
  await page.waitForFunction(() => document.querySelector("#reconocimientos")?.open);
  await llevarArriba("#reconocimientos");
  console.log("     abierto:", (await seccion.innerText()).replace(/\s+/g, " ").slice(0, 700));
  await foto("02-perfil-reconocimientos-abierto");
  // 03 · Tocar un hito: el aviso de salida dice a qué sitio se va (EnlaceExterno).
  await seccion.locator("a", { hasText: "Premio estatal de la juventud" }).click();
  const aviso = page.getByRole("dialog");
  await aviso.waitFor();
  console.log("     aviso:", (await aviso.innerText()).replace(/\s+/g, " ").slice(0, 200));
  await foto("03-perfil-hito-aviso-salida");
  await page.keyboard.press("Escape");
  // 04 · La trayectoria abierta: «Tu año» y la «Presentación» en PDF, como siempre.
  await page.goto(`${base}/artistas/feleal`, { waitUntil: "load" });
  await page.locator("#trayectoria > summary").click();
  await page.getByRole("link", { name: /Tu año/ }).waitFor();
  await page.evaluate(() => { const b = document.querySelector("#trayectoria a[href*='tu-anio']"); scrollTo(0, scrollY + b.getBoundingClientRect().top - 500); });
  await foto("04-perfil-trayectoria-botones");
  // 05 · «Tu año» con la línea de sus hitos del año.
  await page.goto(`${base}/artistas/feleal/tu-anio`, { waitUntil: "load" });
  const img = page.locator("main img").first();
  await img.waitFor();
  await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
  console.log("     alt:", await img.getAttribute("alt"));
  await foto("05-tu-anio-con-hitos");
  const grande = await ctx.request.get(`${base}/api/tu-anio?que=artista&id=feleal&ancho=1080`);
  fs.writeFileSync(path.join(SALIDA, "06-tu-anio-imagen-1080.jpg"), await grande.body());
  console.log("     imagen 1080:", grande.status(), grande.headers()["content-type"]);
  // 07 · La «Presentación» en PDF: la primera página (Reseña, Reconocimientos y obra, Trayectoria).
  const pdf = await ctx.request.get(`${base}/api/documento?que=artista&id=feleal&formato=carta`);
  console.log("     pdf:", pdf.status(), pdf.headers()["content-type"]);
  const archivo = path.join(tmp, "presentacion.pdf");
  fs.writeFileSync(archivo, await pdf.body());
  const conv = spawnSync("pdftoppm", ["-png", "-r", "110", "-f", "1", "-l", "1", "-singlefile", archivo, path.join(SALIDA, "07-presentacion-pdf-pagina-1")], { encoding: "utf8" });
  if (conv.status !== 0) throw new Error(conv.stderr);
  const texto = spawnSync("pdftotext", ["-layout", archivo, "-"], { encoding: "utf8" });
  console.log("     pdf (texto):", texto.stdout ? texto.stdout.replace(/\s+/g, " ").slice(0, 300) : "(el PDF es de imágenes)");
  // 08 · La ficha del Showcase de 0Backside0 (sin reclamar): «Completar ficha» con lo que trajo la rutina.
  await page.goto(`${base}/admin/showcase/0backside0`, { waitUntil: "load" });
  const completar = page.getByRole("heading", { name: /^Completar ficha/ });
  await completar.waitFor();
  await page.evaluate(() => { const h = [...document.querySelectorAll("h2")].find((x) => x.textContent.startsWith("Completar ficha")); scrollTo(0, scrollY + h.getBoundingClientRect().top - 72); });
  const tarjetas = () => page.locator("h2:has-text('Completar ficha') + p + ul > li").evaluateAll((lis) => lis.map((li) => li.innerText.replace(/\s+/g, " ")));
  console.log("     tarjetas:", (await tarjetas()).join(" | "), JSON.stringify(await medir()));
  await foto("08-showcase-completar-ficha");
  // 09 · Tocar «Completar» en el texto de «Sobre» y «Descartar» en el enlace de Instagram: la línea de lo hecho en su sitio.
  const tarjeta = (que) => page.locator("h2:has-text('Completar ficha') + p + ul > li", { hasText: que });
  await tarjeta("Sobre · falta en su ficha").getByRole("button", { name: "Completar" }).click();
  await page.getByText(/Completaste sobre/).waitFor();
  await tarjeta("Instagram").getByRole("button", { name: "Descartar" }).click();
  await page.getByText(/Descartaste Instagram/).waitFor();
  console.log("     tras tocar:", (await tarjetas()).join(" | "));
  await foto("09-showcase-completar-hecho");
  // 10 · La ficha del Showcase de Feleal (reclamada): «Por revisar» dice que lo aceptado se publica; aceptar el premio lo dice en su línea.
  await page.goto(`${base}/admin/showcase/feleal`, { waitUntil: "load" });
  const porRevisar = page.getByRole("heading", { name: /^Por revisar/ });
  await porRevisar.waitFor();
  await page.locator("li", { hasText: "Mención en un concurso estatal de acordeón" }).getByRole("button", { name: "Aceptar" }).click();
  await page.getByText(/Aceptaste Mención en un concurso estatal/).waitFor();
  await page.evaluate(() => { const h = [...document.querySelectorAll("h2")].find((x) => x.textContent.startsWith("Por revisar")); scrollTo(0, scrollY + h.getBoundingClientRect().top - 72); });
  console.log("     por revisar:", (await page.locator("h2:has-text('Por revisar') + p").innerText()), "·", await page.getByText(/Aceptaste Mención/).innerText());
  await foto("10-showcase-aceptar-se-publica");
  // 11 · Su «Completar ficha» reclamada: la nota lo dice y solo queda «Descartar».
  await page.evaluate(() => { const h = [...document.querySelectorAll("h2")].find((x) => x.textContent.startsWith("Completar ficha")); scrollTo(0, scrollY + h.getBoundingClientRect().top - 72); });
  console.log("     reclamada:", (await tarjetas()).join(" | "));
  await foto("11-showcase-completar-reclamada");
  console.log("     ancho:", JSON.stringify(await medir()));
} finally {
  await browser.close();
}
console.log(errores.length ? `errores de página o consola:\n  ${errores.join("\n  ")}` : "sin errores de página ni de consola");
process.exit(0);
