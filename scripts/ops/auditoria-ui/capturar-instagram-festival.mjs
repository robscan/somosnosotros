// Capturas de la bitácora 495 (OL-463): un festival en Instagram y Facebook. Con la app compilada contra el respaldo local (la sesión de la cuenta
// de administración y el festival «Cultura Mística (demo)», `RESPALDO_FESTIVAL_IG=1`), la API de Instagram y la página de Facebook DE MENTIRA del
// respaldo (`INSTAGRAM_API_URL=http://127.0.0.1:<puerto>/graph`, token y página inventados): nunca se llama a Instagram ni a Facebook.
// Chrome real (playwright-core), 390×844 a 2×. Toques reales: clics por coordenadas. Mide los textos cortados (`scrollWidth > clientWidth`) a 320,
// 390 y 430.
//   node scripts/ops/auditoria-ui/capturar-instagram-festival.mjs <raíz del árbol> <carpeta de salida>
// SIN_BUILD=1 usa el `.next` que ya hay, compilado por este script (el respaldo va en el puerto 8889). Correrlo en un árbol SIN `.env`.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
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
const r = lanzar([path.join(AQUI, "respaldo-local/server.mjs"), String(pr)], { ...reloj, RESPALDO_FESTIVAL_IG: "1" });
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
/** Abre el texto a pantalla completa, lo fotografía arriba y abajo, y lo cierra con «Listo». */
async function fotosDelTexto(page, hoja, nombre) {
  await tocar(page, hoja.getByRole("button", { name: "Texto de la publicación" }));
  const area = page.getByRole("textbox", { name: "Texto de la publicación" });
  await area.waitFor();
  await area.evaluate((a) => { a.blur(); a.scrollTop = 0; });
  await foto(page, `${nombre}`);
  const alto = await area.evaluate((a) => a.scrollHeight - a.clientHeight);
  if (alto > 0) {
    await area.evaluate((a) => (a.scrollTop = a.scrollHeight));
    await foto(page, `${nombre}-abajo`);
  }
  await tocar(page, page.getByRole("button", { name: "Listo" }));
  await area.waitFor({ state: "detached" });
}

const ESPERADAS = ["@aether.slp", "@culturamistica.demo", "@marthafranco.demo", "@tamborancestral.demo", "@luna.arcana.demo", "@sahumerio.demo", "@ixchel.ramos.demo", "@rocio.mendoza.demo", "@oraculo.sonoro.demo"];
const ACTOS = ["Meditación con Martha Franco", "Taller de escritura", "Charla de tarot", "Yoga kundalini", "Mercadito místico", "Ceremonia de cacao", "Lectura de cartas", "Tambores al atardecer", "Astrología básica", "Concierto de cuencos", "Fogata y cantos"];

try {
  // 01 · La lista: el festival, un solo renglón con «11 actos»; ninguno de sus actos va aparte.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/instagram?ciudad=san-luis-potosi`, { waitUntil: "load" });
    const fila = page.locator("main li", { hasText: "Cultura Mística (demo)" });
    await fila.evaluate((e) => window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 300));
    await foto(page, "01-lista-festival");
    const texto = (await fila.innerText()).replace(/\s+/g, " ");
    console.log("     renglón:", texto);
    comprobar((await fila.count()) === 1 && /· 11 actos/.test(texto), "el festival es un solo renglón con «11 actos»");
    const lista = (await page.locator("main").innerText()).replace(/\s+/g, " ");
    comprobar(ACTOS.every((a) => !lista.includes(a)), "sus actos no se sugieren aparte");
    await ctx.close();
  }
  // 02 a 06 · La hoja del festival: etiquetas de todos, precio de sus actos, programa; quitar una; publicar en las dos.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/instagram?ciudad=san-luis-potosi`, { waitUntil: "load" });
    const hoja = await abrirHoja(page, "Cultura Mística (demo)");
    await foto(page, "02-hoja-festival");
    const grupo = hoja.getByRole("group", { name: "Etiquetas en la foto" });
    await grupo.evaluate((e) => e.scrollIntoView({ block: "start" }));
    await foto(page, "03-hoja-etiquetas");
    const chips = (await grupo.getByRole("button").allInnerTexts()).map((c) => c.trim());
    console.log("     etiquetas:", chips.join(" "));
    comprobar(JSON.stringify(chips) === JSON.stringify(ESPERADAS), "se etiqueta al lugar, a quien organiza y a los siete artistas con Instagram de sus actos, sin repetir");
    const t = await textoDeLaHoja(hoja);
    console.log("     texto armado:\n" + t.split("\n").map((l) => `       ${l}`).join("\n"));
    comprobar(/\nEntrada libre · actividades con cooperación \(\$80–\$130\)\n/.test(t) && !/^Gratis$/m.test(t), "el precio sale de sus actos, nunca «Gratis»");
    comprobar(/^Vie 9 · 5:30 pm Meditación con Martha Franco \(demo\) @marthafranco\.demo · 6:30 pm Taller de escritura con Gustoño \(demo\) · 9:00 pm Charla de tarot con @luna\.arcana\.demo$/m.test(t), "el programa por día con su hora, el acto y su artista con @");
    comprobar(ACTOS.every((a) => t.includes(a)), "las once actividades en el programa");
    const menciones = t.match(/@[A-Za-z0-9._]+/g);
    comprobar(new Set(menciones).size === menciones.length, `cada @ una sola vez (${menciones.length} menciones)`);
    await fotosDelTexto(page, hoja, "04-texto-programa");
    // Quitar una etiqueta: sale de la foto y del programa (queda su nombre).
    await tocar(page, hoja.getByRole("button", { name: "Quitar @luna.arcana.demo" }));
    await grupo.evaluate((e) => e.scrollIntoView({ block: "start" }));
    await foto(page, "05-etiqueta-quitada");
    const t2 = await textoDeLaHoja(hoja);
    comprobar(t2.includes("9:00 pm Charla de tarot con Luna Arcana (demo)") && !t2.includes("@luna.arcana.demo"), "quitada, el programa dice su nombre sin @");
    // Publicar en las dos (Instagram y Facebook de mentira).
    await alFondo(hoja);
    await tocar(page, hoja.getByRole("button", { name: "Publicar", exact: true }));
    await hoja.getByRole("status").waitFor({ timeout: 60000 });
    await foto(page, "06-publicado");
    const ig = (await registro("instagram")).at(-1);
    const etiquetas = JSON.parse(ig?.user_tags ?? "[]").map((x) => x.username);
    console.log("     a Instagram:", etiquetas.join(" "));
    comprobar(ig?.caption === t2 && etiquetas.length === 8 && !etiquetas.includes("luna.arcana.demo"), "Instagram recibe el texto de la hoja y ocho etiquetas (sin la quitada)");
    const fb = (await registro("facebook")).at(-1);
    console.log("     a la página de mentira:\n" + String(fb?.message).split("\n").map((l) => `       ${l}`).join("\n"));
    comprobar(!!fb && !/@/.test(fb.message) && fb.message.includes("5:30 pm Meditación con Martha Franco (demo) · 6:30 pm") && fb.message.includes("Ceremonia de cacao con Sahumerio Colectivo (demo)"), "Facebook recibe el programa con nombres, sin @ y sin repetir el que ya dice el título");
    await ctx.close();
  }
  // 07 · Un acto del festival: desde el «···» de su ficha sí se puede publicar solo.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/eventos/mistica-demo-3`, { waitUntil: "load" });
    await tocar(page, page.getByRole("button", { name: "Más acciones" }).first());
    const menu = page.getByRole("dialog", { name: "Más acciones" });
    await menu.waitFor();
    await foto(page, "07-acto-menu");
    comprobar((await menu.getByRole("button", { name: /Publicar en Instagram/ }).count()) === 1, "el «···» de un acto ofrece «Publicar en Instagram»");
    await tocar(page, menu.getByRole("button", { name: /Publicar en Instagram/ }));
    const hoja = page.getByRole("dialog", { name: "Publicar en Instagram" });
    await hoja.getByRole("button", { name: "Publicar", exact: true }).waitFor();
    const t = await textoDeLaHoja(hoja);
    comprobar(/\n\$130\n/.test(t) && t.startsWith("Charla de tarot\n"), "el acto solo, con su precio");
    await ctx.close();
  }
  // 08 y 09 · Taller con sesiones y exposición sin precio: el cuándo y el precio no mienten.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/instagram?ciudad=san-luis-potosi`, { waitUntil: "load" });
    let hoja = await abrirHoja(page, "Taller de grabado en linóleo");
    const taller = await textoDeLaHoja(hoja);
    console.log("     taller:", taller.split("\n").slice(0, 4).join(" | "));
    comprobar(/^3 sesiones: vie 9 · 5:00–7:00 pm, dom 11 · 6:00–8:00 pm y mar 13 de oct · 5:00–7:00 pm$/m.test(taller) && /\n\$300\n/.test(taller), "el taller dice sus tres sesiones con su hora y su precio");
    await fotosDelTexto(page, hoja, "08-taller-sesiones");
    await page.keyboard.press("Escape");
    await hoja.waitFor({ state: "detached" });
    hoja = await abrirHoja(page, "Un mundo para mí");
    const expo = await textoDeLaHoja(hoja);
    console.log("     exposición:", expo.split("\n").slice(0, 4).join(" | "));
    comprobar(!/^Gratis$/m.test(expo) && /^Hasta el /m.test(expo), "la exposición sin precio no dice «Gratis» (no se sabe) y dice hasta cuándo");
    await fotosDelTexto(page, hoja, "09-exposicion-sin-precio");
    await ctx.close();
  }
  // 10 · La ficha del festival en la app: sin precio dice «Por confirmar», nunca «Gratis» (OL-411; no cambia).
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/eventos/cultura-mistica-demo`, { waitUntil: "load" });
    await foto(page, "10-ficha-festival");
    const kpi = (await page.locator("main").innerText()).replace(/\s+/g, " ");
    comprobar(/Costo Por confirmar/i.test(kpi) && !/Costo Gratis/i.test(kpi), "la ficha del festival dice «Por confirmar», no «Gratis»");
    await ctx.close();
  }
  // Textos cortados a 320, 390 y 430: la lista y la hoja del festival.
  for (const ancho of [320, 390, 430]) {
    const { ctx, page } = await contexto({ ancho });
    await page.goto(`${base}/admin/instagram?ciudad=san-luis-potosi`, { waitUntil: "load" });
    await quieto(page, 300);
    const lista = await cortados(page);
    const hoja = await abrirHoja(page, "Cultura Mística (demo)");
    await quieto(page, 300);
    const arriba = await cortados(page);
    await alFondo(hoja);
    await quieto(page, 300);
    const abajo = await cortados(page);
    const ancho2 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const todos = [...lista, ...arriba, ...abajo];
    comprobar(!todos.length && ancho2 <= 0, `a ${ancho}: sin textos cortados ni desplazamiento a lo ancho${todos.length ? ` (${todos.join(" | ")})` : ""}`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log(errores.length ? `errores de página o consola:\n  ${errores.join("\n  ")}` : "sin errores de página ni de consola");
console.log(fallas.length ? `FALLAS: ${fallas.length}` : "todo bien");
process.exit(fallas.length ? 1 : 0);
