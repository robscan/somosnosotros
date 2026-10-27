// Capturas de la bitácora 493 (OL-461): el espejo a Facebook en código. Con la app compilada contra el respaldo local (la sesión de la cuenta de
// administración), la API de Instagram y la página de Facebook DE MENTIRA del respaldo (`INSTAGRAM_API_URL=http://127.0.0.1:<puerto>/graph`, token
// y página inventados): nunca se llama a Instagram ni a Facebook. La falla de la página se cambia con `/__falla-facebook?clave=` del respaldo.
// Chrome real (playwright-core), 390×844 a 2×. Toques reales: clics por coordenadas. Mide los textos cortados (`scrollWidth > clientWidth`) a 320,
// 390 y 430.
//   node scripts/ops/auditoria-ui/capturar-espejo-facebook.mjs <raíz del árbol> <carpeta de salida>
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

const fallaFacebook = (clave) => fetch(`${respaldo}/__falla-facebook?clave=${clave}`);
const alFacebook = async () => (await (await fetch(`${respaldo}/__registro`)).json()).filter((l) => l.startsWith("  facebook:")).map((l) => JSON.parse(l.slice(12)));
const abrirHoja = async (page, titulo) => {
  await tocar(page, page.locator("main li", { hasText: titulo }).locator("a").first());
  const hoja = page.getByRole("dialog", { name: "Publicar en Instagram" });
  await hoja.getByRole("button", { name: /^Publicar/ }).waitFor({ timeout: 15000 });
  await imagenesListas(page);
  return hoja;
};
const alFondo = (hoja) => hoja.locator("[class*=cuerpo]").first().evaluate((c) => c.scrollTo(0, c.scrollHeight));
const aLaVista = (page, texto, margen = 120) => page.locator("main section", { hasText: texto }).first().evaluate((e, m) => window.scrollTo(0, e.getBoundingClientRect().top + scrollY - m), margen);

try {
  // 01 · La portada: el renglón de Instagram dice cuántas salieron también en Facebook.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin`, { waitUntil: "load" });
    const renglon = page.getByRole("link", { name: /@smsnstrsapp/ });
    await renglon.evaluate((e) => window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 300));
    await foto(page, "01-portada");
    const texto = (await renglon.innerText()).replace(/\s+/g, " ");
    console.log("     renglón:", texto);
    comprobar(/1 en Facebook/.test(texto), "la portada dice cuántas salieron en Facebook");
    await ctx.close();
  }
  // 02 a 07 · La lista y la hoja: la casilla, publicar en las dos, el resultado en dos líneas; el reintento desde la lista.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/instagram?ciudad=todas`, { waitUntil: "load" });
    await aLaVista(page, "Ya en Instagram");
    await foto(page, "02-lista-ya-en-instagram");
    const ya = (await page.locator("main section", { hasText: "Ya en Instagram" }).innerText()).replace(/\s+/g, " ");
    console.log("     ya en Instagram:", ya);
    comprobar(/Susurros.*Historia · .*Facebook: sin publicar/.test(ya), "el renglón de «Ya en Instagram» dice cómo va en Facebook");
    comprobar((await page.getByRole("button", { name: /^Publicar en Facebook: Susurros/ }).count()) === 1 && (await page.getByRole("button", { name: /^Publicar en Facebook: .*Master Class/ }).count()) === 0, "solo lo que falta en Facebook lleva el botón");
    const caja = await page.getByRole("button", { name: /^Publicar en Facebook: Susurros/ }).boundingBox();
    comprobar(caja.width >= 44 && caja.height >= 44, `el botón «Publicar en Facebook» mide ${Math.round(caja.width)}×${Math.round(caja.height)}`);
    await page.goto(`${base}/admin/instagram?ciudad=san-luis-potosi`, { waitUntil: "load" });

    let hoja = await abrirHoja(page, "Delirium Pollum");
    await alFondo(hoja);
    await foto(page, "03-hoja-casilla");
    const casilla = () => hoja.getByRole("checkbox", { name: /También en Facebook/ });
    comprobar((await casilla().getAttribute("aria-checked")) === "true", "«También en Facebook» viene marcada");
    comprobar((await hoja.getByRole("button", { name: "Publicar", exact: true }).count()) === 1, "un solo botón, «Publicar»");
    const cajaCasilla = await casilla().boundingBox();
    comprobar(cajaCasilla.height >= 44, `la casilla mide ${Math.round(cajaCasilla.height)} de alto`);
    await tocar(page, casilla());
    comprobar((await casilla().getAttribute("aria-checked")) === "false", "un toque la desmarca");
    await foto(page, "04-hoja-sin-facebook");
    await page.keyboard.press("Escape");
    await hoja.waitFor({ state: "detached" });
    hoja = await abrirHoja(page, "Delirium Pollum");
    comprobar((await casilla().getAttribute("aria-checked")) === "false", "la hoja recuerda la última elección en la sesión");
    await alFondo(hoja);
    await tocar(page, casilla());
    comprobar((await casilla().getAttribute("aria-checked")) === "true", "otro toque la vuelve a marcar");
    // Publicar en las dos (Instagram y Facebook de mentira).
    await tocar(page, hoja.getByRole("button", { name: "Publicar", exact: true }));
    await hoja.getByRole("status").waitFor({ timeout: 60000 });
    await foto(page, "05-publicado-en-las-dos");
    const estado = (await hoja.getByRole("status").innerText()).replace(/\s+/g, " ");
    console.log("     resultado:", estado);
    comprobar(estado.includes("Instagram: publicado") && estado.includes("Facebook: publicado"), "el resultado en dos líneas: Instagram y Facebook");
    comprobar((await hoja.getByRole("link", { name: "Ver en Facebook" }).getAttribute("href")) === "https://www.facebook.com/1374800000000461/posts/122100000000000461", "«Ver» lleva a la publicación de Facebook");
    const fb = (await alFacebook()).at(-1);
    console.log("     a la página de mentira:\n" + String(fb?.message).split("\n").map((l) => `       ${l}`).join("\n"));
    comprobar(!!fb && fb.url?.includes("instagram-") && fb.message?.includes("utm_source=facebook&utm_medium=post&utm_campaign=") && fb.message.includes("https://somosnosotrxs.org/eventos/") && !/@/.test(fb.message) && fb.message.includes("entra a somosnosotrxs.org"), "Facebook recibe la misma imagen y el texto con el enlace marcado, sin @");
    await tocar(page, hoja.getByRole("button", { name: "Listo" }));
    await hoja.waitFor({ state: "detached" });
    await page.waitForTimeout(800);
    await aLaVista(page, "Ya en Instagram");
    await foto(page, "06-lista-despues");
    comprobar(/Delirium Pollum.*Facebook: publicado/.test((await page.locator("main section", { hasText: "Ya en Instagram" }).innerText()).replace(/\s+/g, " ")), "Delirium Pollum en «Ya en Instagram» con «Facebook: publicado»");
    // El reintento desde la lista: Susurros (una historia) a Facebook.
    await tocar(page, page.getByRole("button", { name: /^Publicar en Facebook: Susurros/ }));
    await page.locator("main li", { hasText: "Susurros" }).getByText("Facebook: publicado").waitFor({ timeout: 30000 });
    await page.waitForTimeout(600);
    await foto(page, "07-lista-reintento-historia");
    const registro = await alFacebook();
    const historia = registro.at(-1);
    comprobar(historia?.published === "false" && historia.message === null && historia.url === "https://respaldo.local.test/fotos/instagram-demo-458b.jpg", "la historia va a Facebook como foto sin publicar (luego photo_stories), con la imagen que usó Instagram");
    comprobar((await page.getByRole("button", { name: /^Publicar en Facebook: Susurros/ }).count()) === 0, "publicado, el botón se va");
    await ctx.close();
  }
  // 08 a 10 · Facebook sin permiso: Instagram queda publicado; la hoja dice «Facebook: falta permiso» y ofrece reintentar; la lista lo dice.
  {
    await fallaFacebook("permiso");
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/instagram?ciudad=san-luis-potosi`, { waitUntil: "load" });
    const hoja = await abrirHoja(page, "Macario");
    await alFondo(hoja);
    await tocar(page, hoja.getByRole("button", { name: "Publicar", exact: true }));
    await hoja.getByRole("status").waitFor({ timeout: 60000 });
    await alFondo(hoja);
    await foto(page, "08-facebook-falta-permiso");
    const estado = (await hoja.getByRole("status").innerText()).replace(/\s+/g, " ");
    console.log("     resultado:", estado);
    comprobar(estado.includes("Instagram: publicado") && estado.includes("Facebook: falta permiso") && estado.includes("En Instagram sí quedó publicado"), "sin permiso: Instagram publicado y «Facebook: falta permiso» en frase llana");
    const reintentar = hoja.getByRole("button", { name: "Reintentar en Facebook" });
    comprobar((await reintentar.count()) === 1, "el botón ofrece «Reintentar en Facebook»");
    // Se vuelve a conectar la página (en el respaldo) y se reintenta.
    await fallaFacebook("");
    await tocar(page, reintentar);
    await hoja.getByText("Facebook: publicado").waitFor({ timeout: 30000 });
    await foto(page, "09-reintento-en-la-hoja");
    comprobar((await hoja.getByRole("button", { name: "Listo" }).count()) === 1, "reintentado: «Facebook: publicado» y «Listo»");
    await tocar(page, hoja.getByRole("button", { name: "Listo" }));
    await hoja.waitFor({ state: "detached" });
    // Otra con la página sin permiso (la primera que queda por publicar), y la lista lo dice.
    await fallaFacebook("permiso");
    await page.waitForTimeout(800);
    const titulo = (await page.locator("main section", { hasText: "Para publicar" }).locator("li a b").first().innerText()).trim();
    const otra = await abrirHoja(page, titulo);
    await alFondo(otra);
    await tocar(page, otra.getByRole("button", { name: "Publicar", exact: true }));
    await otra.getByRole("status").waitFor({ timeout: 60000 });
    await page.keyboard.press("Escape");
    await otra.waitFor({ state: "detached" });
    await page.reload({ waitUntil: "load" });
    const filaOtra = page.locator("main li", { hasText: titulo }).first();
    await filaOtra.evaluate((e) => window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 300));
    await foto(page, "10-lista-falta-permiso");
    const fila = (await filaOtra.innerText()).replace(/\s+/g, " ");
    console.log(`     ${titulo}: ${fila}`);
    comprobar(fila.includes("Facebook: falta permiso") && (await filaOtra.getByRole("button", { name: /^Publicar en Facebook: / }).count()) === 1, "la lista dice «Facebook: falta permiso» y ofrece publicar en Facebook");
    await fallaFacebook("");
    await ctx.close();
  }
  // 11 · Sin la casilla, solo Instagram (Facebook ni se llama).
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/instagram?ciudad=san-luis-potosi`, { waitUntil: "load" });
    const antes = JSON.stringify((await alFacebook()).at(-1) ?? null);
    const titulo = (await page.locator("main section", { hasText: "Para publicar" }).locator("li a b").first().innerText()).trim();
    const hoja = await abrirHoja(page, titulo);
    await alFondo(hoja);
    await tocar(page, hoja.getByRole("checkbox", { name: /También en Facebook/ }));
    await tocar(page, hoja.getByRole("button", { name: "Publicar", exact: true }));
    await hoja.getByRole("status").waitFor({ timeout: 60000 });
    await foto(page, "11-solo-instagram");
    const estado = (await hoja.getByRole("status").innerText()).replace(/\s+/g, " ");
    comprobar(estado.includes("Instagram: publicado") && !estado.includes("Facebook") && JSON.stringify((await alFacebook()).at(-1) ?? null) === antes, "sin la casilla: solo Instagram, Facebook ni se llama");
    await ctx.close();
  }
  // Textos cortados a 320, 390 y 430: la lista (con «Ya en Instagram») y la hoja con la casilla.
  for (const ancho of [320, 390, 430]) {
    const { ctx, page } = await contexto({ ancho });
    await page.goto(`${base}/admin/instagram?ciudad=san-luis-potosi`, { waitUntil: "load" });
    await quieto(page, 300);
    const lista = await cortados(page);
    const hoja = await abrirHoja(page, "");
    await alFondo(hoja);
    await quieto(page, 300);
    const enHoja = await cortados(page);
    const ancho2 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    comprobar(!lista.length && !enHoja.length && ancho2 <= 0, `a ${ancho}: sin textos cortados ni desplazamiento a lo ancho${[...lista, ...enHoja].length ? ` (${[...lista, ...enHoja].join(" | ")})` : ""}`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log(errores.length ? `errores de página o consola:\n  ${errores.join("\n  ")}` : "sin errores de página ni de consola");
console.log(fallas.length ? `FALLAS: ${fallas.length}` : "todo bien");
process.exit(fallas.length ? 1 : 0);
