// Capturas de la bitácora 497 (OL-465): publicar en redes en segundo plano. La app compilada contra el respaldo local (la sesión de la cuenta de
// administración), la API de Instagram y la página de Facebook DE MENTIRA del respaldo y el trabajador de verdad (`/api/redes/correr`, con un
// CRON_SECRET inventado: «Publicar» lo pide en seguida con `after()`, como en producción). Instagram «lento» (`/__lento?ms=`) para ver «Publicando…»
// un rato; la falla de Instagram y de la página se cambian sin reiniciar (`/__falla-instagram`, `/__falla-facebook`). Nunca se llama a Instagram
// ni a Facebook. Chrome real (playwright-core), 390×844 a 2×. Toques reales: clics por coordenadas. Mide textos cortados a 320, 390 y 430.
//   node scripts/ops/auditoria-ui/capturar-redes-en-cola.mjs <raíz del árbol> <carpeta de salida>
// SIN_BUILD=1 usa el `.next` que ya hay. Correrlo en un árbol SIN `.env`.
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
const instagram = { INSTAGRAM_API_URL: `${respaldo}/graph`, INSTAGRAM_TOKEN: "token-inventado", INSTAGRAM_USER_ID: "17841400000000458", FACEBOOK_PAGE_ID: "1374800000000461", CRON_SECRET: "secreto-inventado-465" };
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
const control = (ruta) => fetch(`${respaldo}${ruta}`);
const abrirHoja = async (page, titulo) => {
  await tocar(page, page.locator("main li", { hasText: titulo }).locator("a").first());
  const hoja = page.getByRole("dialog", { name: "Publicar en Instagram" });
  await hoja.getByRole("button", { name: /^(Publicar|Se está|Ya se publicó)/ }).waitFor({ timeout: 15000 });
  await imagenesListas(page);
  return hoja;
};
const alFondo = (hoja) => hoja.locator("[class*=cuerpo]").first().evaluate((c) => c.scrollTo(0, c.scrollHeight));
const fila = (page, titulo) => page.locator("main li", { hasText: titulo }).first();
const textoDe = async (l) => (await l.innerText()).replace(/\s+/g, " ").trim();
const aLaVista = (page, loc, margen = 300) => loc.evaluate((e, m) => window.scrollTo(0, e.getBoundingClientRect().top + scrollY - m), margen);
/** Volver a la app: la lista y la hoja vuelven a preguntar (como al regresar de otra app). */
const volver = (page) => page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
/** Espera a que el trabajador haya terminado lo que hay en la cola (lo dice el registro del respaldo: `media_publish` y el PATCH final). */
async function hastaQueTermine(page, titulo, texto) {
  for (let i = 0; i < 60; i++) {
    await volver(page);
    await page.waitForTimeout(700);
    if ((await textoDe(fila(page, titulo))).includes(texto)) return true;
  }
  return false;
}

try {
  // 01 a 07 · Publicar → «Publicando…» → la hoja mientras va → confirmar repetir → «Ya en Instagram» → la hoja con lo que pasó.
  {
    await control("/__lento?ms=12000");
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/instagram?ciudad=san-luis-potosi`, { waitUntil: "load" });
    const hoja = await abrirHoja(page, "Delirium Pollum");
    await alFondo(hoja);
    await foto(page, "01-hoja-antes");
    comprobar(/Te avisamos en el teléfono cuando termine\./.test(await textoDe(hoja)), "la hoja dice que avisará al terminar");
    const t0 = Date.now();
    await tocar(page, hoja.getByRole("button", { name: "Publicar", exact: true }));
    await hoja.waitFor({ state: "detached", timeout: 10000 });
    const ms = Date.now() - t0;
    comprobar(ms < 1000, `«Publicar» responde y la hoja se cierra en ${ms} ms (< 1 s)`);
    await fila(page, "Delirium Pollum").getByText("Publicando…").waitFor({ timeout: 10000 });
    await aLaVista(page, fila(page, "Delirium Pollum"));
    await foto(page, "02-lista-publicando");
    comprobar(/Publicando…/.test(await textoDe(fila(page, "Delirium Pollum"))), "el renglón dice «Publicando…»");
    // La hoja otra vez, mientras va: cómo va y el botón «Se está publicando».
    const otra = await abrirHoja(page, "Delirium Pollum");
    await foto(page, "03-hoja-mientras-va");
    const estado = await textoDe(otra.getByRole("status").first());
    console.log("     mientras va:", estado);
    comprobar(estado.startsWith("Instagram: publicando… Facebook: después de Instagram"), "la hoja dice «Instagram: publicando…» y «Facebook: después de Instagram»");
    const boton = otra.getByRole("button", { name: "Se está publicando" });
    comprobar((await boton.count()) === 1, "el botón dice «Se está publicando»");
    await tocar(page, boton);
    await otra.getByText("Este evento ya se está publicando. ¿Publicarlo otra vez?").waitFor();
    await alFondo(otra);
    await foto(page, "04-confirmar-repetir");
    const si = otra.getByRole("button", { name: "Sí, publicar otra vez" });
    const caja = await si.boundingBox();
    comprobar(caja.height >= 44, `«Sí, publicar otra vez» mide ${Math.round(caja.height)} de alto`);
    await tocar(page, otra.getByRole("button", { name: "Mejor no" }));
    await otra.getByRole("button", { name: "Se está publicando" }).waitFor();
    await page.keyboard.press("Escape");
    await otra.waitFor({ state: "detached" });
    // El trabajador termina (Instagram tarda 12 s) y la lista se entera al volver.
    comprobar(await hastaQueTermine(page, "Delirium Pollum", "Facebook: publicado"), "al terminar, el renglón pasa a «Ya en Instagram» con «Facebook: publicado»");
    await aLaVista(page, fila(page, "Delirium Pollum"));
    await foto(page, "05-lista-publicado");
    // Lo anotado en Instagram durante el recorrido (el reloj del respaldo está quieto: todo lo nuevo lleva su «ahora»).
    const nuevas = (await (await fetch(`${respaldo}/rest/v1/instagram_publicaciones?select=evento_id,estado,creado_en`)).json()).filter((x) => x.creado_en === new Date(AHORA).toISOString() && x.estado === "publicada");
    comprobar(nuevas.length === 1, `una sola publicación en Instagram (el segundo toque solo preguntó) (${nuevas.length})`);
    const hecha = await abrirHoja(page, "Delirium Pollum");
    await foto(page, "06-hoja-publicado");
    const hecho = await textoDe(hecha.getByRole("status").first());
    console.log("     publicado:", hecho);
    comprobar(hecho === "Instagram: publicado Ver Facebook: publicado Ver", "la hoja dice lo que pasó, con sus «Ver»");
    comprobar((await hecha.getByRole("button", { name: /^Ya se publicó hace/ }).count()) === 1, "el botón dice «Ya se publicó hace …» y pide confirmar");
    await tocar(page, hecha.getByRole("button", { name: /^Ya se publicó hace/ }));
    await hecha.getByText(/Este evento se publicó hace .*¿Publicarlo otra vez\?/).waitFor();
    await alFondo(hecha);
    await foto(page, "07-confirmar-ya-publicado");
    await ctx.close();
    await control("/__lento?ms=0");
  }
  // 08 · La ficha: el «···» dice «Publicando…» mientras va.
  {
    await control("/__lento?ms=15000");
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/instagram?ciudad=san-luis-potosi`, { waitUntil: "load" });
    const hoja = await abrirHoja(page, "Macario");
    await alFondo(hoja);
    await tocar(page, hoja.getByRole("checkbox", { name: /También en Facebook/ }));
    await tocar(page, hoja.getByRole("button", { name: "Publicar", exact: true }));
    await hoja.waitFor({ state: "detached" });
    const href = await fila(page, "Macario").locator("a").first().getAttribute("href");
    await page.goto(`${base}${href}`, { waitUntil: "load" });
    await tocar(page, page.getByRole("button", { name: "Más acciones" }).first());
    const renglonMenu = page.getByRole("dialog", { name: "Más acciones" }).getByRole("button", { name: /Publicar en Instagram/ });
    await renglonMenu.waitFor();
    await foto(page, "08-ficha-menu-publicando");
    comprobar(/Publicando…/.test(await textoDe(renglonMenu)), "el «···» de la ficha dice «Publicando…»");
    await ctx.close();
    await control("/__lento?ms=0");
    await new Promise((ok) => setTimeout(ok, 16000));
  }
  // 09 y 10 · Facebook sin permiso: Instagram sale y la hoja ofrece «Reintentar en Facebook», que va a la cola.
  {
    await control("/__falla-facebook?clave=permiso");
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/instagram?ciudad=san-luis-potosi`, { waitUntil: "load" });
    const titulo = (await page.locator("main section", { hasText: "Para publicar" }).locator("li a b").first().innerText()).trim();
    const hoja = await abrirHoja(page, titulo);
    await tocar(page, hoja.getByRole("button", { name: "Publicar", exact: true }));
    await hoja.waitFor({ state: "detached" });
    comprobar(await hastaQueTermine(page, titulo, "Facebook: falta permiso"), `${titulo}: «Facebook: falta permiso» en el renglón`);
    const otra = await abrirHoja(page, titulo);
    await foto(page, "09-hoja-facebook-falta-permiso");
    const estado = await textoDe(otra.getByRole("status").first());
    console.log("     facebook sin permiso:", estado);
    comprobar(estado.includes("Instagram: publicado") && estado.includes("Facebook: falta permiso") && estado.includes("Reintentar en Facebook"), "la hoja: Instagram publicado, «Facebook: falta permiso» y «Reintentar en Facebook»");
    await control("/__falla-facebook?clave=");
    await tocar(page, otra.getByRole("button", { name: "Reintentar en Facebook" }));
    await otra.waitFor({ state: "detached" });
    comprobar(await hastaQueTermine(page, titulo, "Facebook: publicado"), "reintentado desde la cola: «Facebook: publicado»");
    await aLaVista(page, fila(page, titulo));
    await foto(page, "10-lista-facebook-reintentado");
    await ctx.close();
  }
  // 11 y 12 · No se pudo: Instagram sin permiso (no se reintenta). El renglón y la hoja lo dicen.
  {
    await control("/__falla-instagram?clave=permiso");
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/instagram?ciudad=san-luis-potosi`, { waitUntil: "load" });
    const titulo = (await page.locator("main section", { hasText: "Para publicar" }).locator("li a b").first().innerText()).trim();
    const hoja = await abrirHoja(page, titulo);
    await tocar(page, hoja.getByRole("button", { name: "Publicar", exact: true }));
    await hoja.waitFor({ state: "detached" });
    comprobar(await hastaQueTermine(page, titulo, "No se publicó"), `${titulo}: «No se publicó: …» en el renglón`);
    await aLaVista(page, fila(page, titulo));
    await foto(page, "11-lista-no-se-publico");
    console.log("     renglón:", await textoDe(fila(page, titulo)));
    const otra = await abrirHoja(page, titulo);
    await foto(page, "12-hoja-no-se-publico");
    const aviso = await textoDe(otra.getByRole("alert").first());
    console.log("     hoja:", aviso);
    comprobar(/hay que volver a conectar la cuenta/.test(aviso), "la hoja dice por qué no se publicó, en llano");
    comprobar((await otra.getByRole("button", { name: "Publicar", exact: true }).count()) === 1, "y deja publicar otra vez sin preguntar");
    await control("/__falla-instagram?clave=");
    await ctx.close();
  }
  // Textos cortados a 320, 390 y 430: la lista con lo que se publicó y la hoja con lo que pasó.
  for (const ancho of [320, 390, 430]) {
    const { ctx, page } = await contexto({ ancho });
    await page.goto(`${base}/admin/instagram?ciudad=san-luis-potosi`, { waitUntil: "load" });
    await quieto(page, 300);
    const lista = await cortados(page);
    const hoja = await abrirHoja(page, "Delirium Pollum");
    await quieto(page, 300);
    const enHoja = await cortados(page);
    await alFondo(hoja);
    const enHojaAbajo = await cortados(page);
    const ancho2 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const todos = [...lista, ...enHoja, ...enHojaAbajo];
    comprobar(!todos.length && ancho2 <= 0, `a ${ancho}: sin textos cortados ni desplazamiento a lo ancho${todos.length ? ` (${todos.join(" | ")})` : ""}`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log(errores.length ? `errores de página o consola:\n  ${errores.join("\n  ")}` : "sin errores de página ni de consola");
console.log(fallas.length ? `FALLAS: ${fallas.length}` : "todo bien");
process.exit(fallas.length ? 1 : 0);
