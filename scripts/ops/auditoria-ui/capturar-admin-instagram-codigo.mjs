// Capturas `codigo-*` de la bitácora 490 (OL-458): «Publicar en Instagram» en código, lo firmado en el prototipo `admin-instagram.html`. Con la
// app compilada contra el respaldo local (la sesión de la cuenta de administración) y la API de Instagram DE MENTIRA del respaldo
// (`INSTAGRAM_API_URL=http://127.0.0.1:<puerto>/graph`, token inventado): nunca se llama a Instagram. Chrome real (playwright-core), 390×844 a 2×;
// una a 1280×800. Toques reales: clics por coordenadas. Mide los textos cortados (`scrollWidth > clientWidth`) a 320, 390 y 430.
//   node scripts/ops/auditoria-ui/capturar-admin-instagram-codigo.mjs <raíz del árbol> <carpeta de salida>
// Desde OL-461 (bitácora 493) el botón dice «Publicar» y el resultado «Instagram: publicado · Ver» (con la página de Facebook de mentira también).
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
const r = lanzar([path.join(AQUI, "respaldo-local/server.mjs"), String(pr)], reloj);
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
async function contexto({ ancho = 390, escritorio = false } = {}) {
  const ctx = await browser.newContext(
    escritorio
      ? { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, locale: "es-MX", timezoneId: "America/Mexico_City" }
      : { viewport: { width: ancho, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA, locale: "es-MX", timezoneId: "America/Mexico_City" },
  );
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

try {
  // 01 · La portada: el grupo «Instagram» con su renglón.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin`, { waitUntil: "load" });
    const renglon = page.getByRole("link", { name: /@smsnstrsapp/ });
    await renglon.evaluate((e) => window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 300));
    await foto(page, "codigo-01-portada");
    console.log("     renglón:", (await renglon.innerText()).replace(/\s+/g, " "));
    await tocar(page, renglon);
    await page.waitForURL(/\/admin\/instagram/);
    await page.getByRole("heading", { name: "Instagram", exact: true }).waitFor();
    await foto(page, "codigo-02-lista");
    const grupos = (await page.locator("main h2").allInnerTexts()).map((x) => x.replace(/\s+/g, " "));
    console.log("     grupos:", grupos.join(" | "), "·", await page.locator("main p").first().innerText());
    comprobar(grupos.some((g) => g.startsWith("Para publicar")) && grupos.some((g) => g.startsWith("Ya en Instagram")), "la lista trae «Para publicar» y «Ya en Instagram»");
    comprobar(!(await page.locator("main").innerText()).includes("Mercado"), "nada que ya empezó");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await foto(page, "codigo-03-lista-abajo");
    // 04 · La hoja de ciudades.
    await page.evaluate(() => window.scrollTo(0, 0));
    await tocar(page, page.locator("header button[aria-haspopup=dialog]").first());
    await page.getByRole("dialog", { name: "Ciudades con eventos" }).waitFor();
    await foto(page, "codigo-04-hoja-ciudades");
    await page.keyboard.press("Escape");
    await ctx.close();
  }
  // 05 a 09 · La hoja de vista previa: publicación, historia, texto abierto, etiqueta quitada, publicar.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/instagram?ciudad=san-luis-potosi`, { waitUntil: "load" });
    const fila = page.locator("main li", { hasText: "Delirium Pollum" }).locator("a").first();
    await tocar(page, fila);
    const hoja = page.getByRole("dialog", { name: "Publicar en Instagram" });
    await hoja.waitFor();
    await hoja.getByRole("button", { name: "Publicar", exact: true }).waitFor({ timeout: 15000 }).catch(async (e) => {
      await page.screenshot({ path: path.join(SALIDA, "error-hoja.png") });
      console.log("HOJA:", await hoja.innerText(), "\nSERVIDOR:", s.registro());
      throw e;
    });
    await imagenesListas(page);
    await foto(page, "codigo-05-hoja-publicacion");
    const tags = await hoja.getByRole("group", { name: "Etiquetas en la foto" }).getByRole("button").allInnerTexts().catch(() => []);
    console.log("     etiquetas:", tags.join(" · "));
    comprobar(tags.includes("@teatrodelapazslp"), "etiqueta al lugar (su Instagram sale de su ficha)");
    comprobar((await hoja.innerText()).includes("Ubicación: San Luis Potosí"), "la ubicación de la ciudad (el lugar no tiene la suya)");
    await hoja.locator("[class*=cuerpo]").first().evaluate((c) => c.scrollTo(0, c.scrollHeight));
    await foto(page, "codigo-06-hoja-abajo");
    await tocar(page, hoja.getByRole("button", { name: "Quitar @teatrodelapazslp" }));
    comprobar((await hoja.getByRole("button", { name: "Volver a etiquetar" }).count()) === 1, "quitar la etiqueta deja «Volver a etiquetar»");
    await foto(page, "codigo-07-etiqueta-quitada");
    await tocar(page, hoja.getByRole("button", { name: "Volver a etiquetar" }));
    // El texto, a pantalla completa.
    await tocar(page, hoja.getByRole("button", { name: "Texto de la publicación" }));
    const area = page.getByRole("textbox", { name: "Texto de la publicación" });
    await area.waitFor();
    const texto = await area.inputValue();
    console.log("     texto:\n" + texto.split("\n").map((l) => `       ${l}`).join("\n"));
    comprobar(texto.includes("📍 Teatro de la Paz @teatrodelapazslp · San Luis Potosí") && texto.includes("Sigue a @smsnstrsapp") && texto.includes("#SanLuisPotosi"), "el texto: 📍 lugar con su @ · ciudad, la invitación y las etiquetas sin acento");
    await foto(page, "codigo-08-texto");
    await tocar(page, page.getByRole("button", { name: "Listo" }));
    // Historia.
    await tocar(page, hoja.getByRole("button", { name: "Historia 9:16" }));
    await imagenesListas(page);
    comprobar((await hoja.getByRole("button", { name: "Texto de la publicación" }).count()) === 0, "la historia no lleva texto");
    await foto(page, "codigo-09-historia");
    await tocar(page, hoja.getByRole("button", { name: "Publicación 4:5" }));
    await imagenesListas(page);
    // Publicar (contra la API de mentira del respaldo).
    await tocar(page, hoja.getByRole("button", { name: "Publicar", exact: true }));
    await hoja.getByRole("status").waitFor({ timeout: 60000 });
    await foto(page, "codigo-10-publicado");
    comprobar((await hoja.getByRole("status").innerText()).includes("Instagram: publicado") && (await hoja.getByRole("link", { name: "Ver en Instagram" }).getAttribute("href")) === "https://www.instagram.com/p/DEMO458C/", "publicado, con «Ver en Instagram» (desde OL-461: «Instagram: publicado · Ver»)");
    const pedidos = await (await fetch(`${respaldo}/__registro`)).json();
    const alGraph = pedidos.filter((l) => l.includes("/graph/"));
    console.log("     a la API de mentira:", alGraph.map((l) => l.replace(/access_token=[^&\s]+/, "access_token=…").slice(0, 110)).join(" | "));
    comprobar(alGraph.some((l) => l.includes("/media_publish")), "pasó por contenedor y media_publish");
    await tocar(page, hoja.getByRole("button", { name: "Listo" }));
    await page.waitForTimeout(800);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await foto(page, "codigo-11-lista-despues");
    comprobar((await page.locator("main section", { hasText: "Ya en Instagram" }).innerText()).includes("Delirium Pollum"), "Delirium Pollum pasa a «Ya en Instagram»");
    await ctx.close();
  }
  // 12 y 13 · La ficha: «Publicar en Instagram» en el «···» y la misma hoja.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/eventos/macario-xantolo-camino-al-mictlan`, { waitUntil: "load" });
    await tocar(page, page.getByRole("button", { name: "Más acciones" }).first());
    const menu = page.getByRole("dialog", { name: "Más acciones" });
    await menu.waitFor();
    await foto(page, "codigo-12-ficha-menu");
    const filas = (await menu.locator("li b").allInnerTexts()).map((x) => x.trim());
    comprobar(filas.indexOf("Publicar en Instagram") === filas.indexOf("Destacar") + 1, `«Publicar en Instagram» después de «Destacar» (${filas.join(" · ")})`);
    await tocar(page, menu.getByRole("button", { name: /Publicar en Instagram/ }));
    const hoja = page.getByRole("dialog", { name: "Publicar en Instagram" });
    await hoja.waitFor();
    await hoja.getByRole("button", { name: "Publicar", exact: true }).waitFor();
    await imagenesListas(page);
    await foto(page, "codigo-13-hoja-desde-la-ficha");
    comprobar((await hoja.innerText()).includes("Sin cartel: un diseño de Crear cartel"), "sin cartel, el diseño de Crear cartel");
    await ctx.close();
  }
  // 14 · Un evento que ya pasó: su «···» no ofrece publicar.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/eventos/noche-de-acordeon-y-guitarra`, { waitUntil: "load" });
    await tocar(page, page.getByRole("button", { name: "Más acciones" }).first());
    const menu = page.getByRole("dialog", { name: "Más acciones" });
    await menu.waitFor();
    await foto(page, "codigo-14-menu-evento-pasado");
    comprobar((await menu.getByRole("button", { name: /Publicar en Instagram/ }).count()) === 0, "un evento que ya pasó no ofrece «Publicar en Instagram»");
    await ctx.close();
  }
  // 15 y 16 · La ubicación de una ciudad: el renglón y su hoja; guardar (la API de mentira contesta una página con ubicación).
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/ciudades/oaxaca`, { waitUntil: "load" });
    const renglon = page.getByRole("button", { name: /Ubicación en Instagram/ });
    await renglon.waitFor();
    await foto(page, "codigo-15-ciudad-ubicacion");
    await tocar(page, renglon);
    const hoja = page.getByRole("dialog", { name: "Ubicación en Instagram" });
    await hoja.waitFor();
    comprobar((await hoja.getByRole("button", { name: "Falta el enlace" }).isDisabled()), "sin enlace, «Falta el enlace»");
    await tocar(page, hoja.getByRole("textbox"));
    await page.keyboard.type("facebook.com/OaxacaMx", { delay: 10 });
    await foto(page, "codigo-16-hoja-ubicacion");
    await tocar(page, hoja.getByRole("button", { name: "Guardar" }));
    await hoja.waitFor({ state: "detached" });
    await page.waitForTimeout(800);
    await foto(page, "codigo-17-ubicacion-guardada");
    comprobar((await renglon.innerText()).includes("Oaxaca, Oaxaca"), "guardada: el renglón dice la página");
    await ctx.close();
  }
  // 18 · Escritorio.
  {
    const { ctx, page } = await contexto({ escritorio: true });
    await page.goto(`${base}/admin/instagram?ciudad=san-luis-potosi`, { waitUntil: "load" });
    await foto(page, "codigo-18-lista-1280");
    await ctx.close();
  }
  // Textos cortados a 320, 390 y 430: la portada, la lista, la hoja.
  for (const ancho of [320, 390, 430]) {
    const { ctx, page } = await contexto({ ancho });
    await page.goto(`${base}/admin/instagram?ciudad=san-luis-potosi`, { waitUntil: "load" });
    await quieto(page, 300);
    const lista = await cortados(page);
    await tocar(page, page.locator("main li a").first());
    await page.getByRole("dialog", { name: "Publicar en Instagram" }).getByRole("button", { name: /Publicar|Ya empezó/ }).waitFor();
    await imagenesListas(page);
    await quieto(page, 300);
    const hoja = await cortados(page);
    const ancho2 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    comprobar(!lista.length && !hoja.length && ancho2 <= 0, `a ${ancho}: sin textos cortados ni desplazamiento a lo ancho${[...lista, ...hoja].length ? ` (${[...lista, ...hoja].join(" | ")})` : ""}`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log(errores.length ? `errores de página o consola:\n  ${errores.join("\n  ")}` : "sin errores de página ni de consola");
console.log(fallas.length ? `FALLAS: ${fallas.length}` : "todo bien");
process.exit(fallas.length ? 1 : 0);
