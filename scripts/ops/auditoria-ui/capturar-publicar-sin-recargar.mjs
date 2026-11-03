// Capturas de la bitácora 539 (OL-506): publicar sin recargar, en la app de verdad. La app compilada contra el respaldo local (la sesión de la
// cuenta de administración), la API de Instagram y la página de Facebook DE MENTIRA del respaldo y el trabajador de verdad (`/api/redes/correr`,
// con un CRON_SECRET inventado: «Publicar» lo pide en seguida con `after()`, como en producción). Instagram «lento» (`/__lento?ms=`) para ver
// «Publicando…» un rato; las fallas se cambian sin reiniciar (`/__falla-instagram`, `/__falla-facebook`). Cada recorrido empieza con el respaldo
// recién levantado (la cola vacía). Nunca se llama a Instagram ni a Facebook. Chrome real (playwright-core), 390×844 a 2×; toques reales (clics
// por coordenadas). Los mismos estados que el prototipo firmado (bitácora 535, `docs/rediseno/capturas-535/`), sobre el mismo evento («Delirium
// Pollum», el sexto de «Para publicar»), a 300 px del borde de arriba; en cada estado de la lista se comprueba que el renglón sea el mismo nodo,
// en el mismo sitio, con el mismo desplazamiento y en el mismo grupo («Para publicar · 11»), y que no se haya pedido la pantalla otra vez.
//   node scripts/ops/auditoria-ui/capturar-publicar-sin-recargar.mjs <raíz del árbol> <carpeta de salida>
// SIN_BUILD=1 usa el `.next` que ya hay (compilado contra el respaldo en el puerto 8889). Correrlo en un árbol SIN `.env`.
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
const TITULO = "Delirium Pollum";
const LISTA = "/admin/instagram?ciudad=san-luis-potosi&pestana=eventos";
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
const instagram = { INSTAGRAM_API_URL: `${respaldo}/graph`, INSTAGRAM_TOKEN: "token-inventado", INSTAGRAM_USER_ID: "17841400000000458", FACEBOOK_PAGE_ID: "1374800000000461", CRON_SECRET: "secreto-inventado-506" };
let r = null;
/** El respaldo recién levantado: la cola vacía, sin fallas ni lentitud. */
async function respaldoNuevo() {
  if (r && r.exitCode === null) {
    r.kill();
    await new Promise((ok) => r.once("exit", ok));
  }
  // Como el prototipo (bitácora 535): la semana de Instagram con material y la conexión con todos los permisos.
  r = lanzar([path.join(AQUI, "respaldo-local/server.mjs"), String(pr)], { ...reloj, RESPALDO_INSTAGRAM_SEMANA: "1", RESPALDO_INSTAGRAM_CONEXION: "todo" });
  await esperar(`${respaldo}/rest/v1/eventos?select=id&limit=1`, r);
}
await respaldoNuevo();
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
const medicion = {};
const comprobar = (ok, que) => {
  console.log(`     ${ok ? "ok" : "FALLA"} · ${que}`);
  if (!ok) fallas.push(que);
};
async function contexto({ letra = 1, quieto = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA, locale: "es-MX", timezoneId: "America/Mexico_City", reducedMotion: quieto ? "reduce" : "no-preference" });
  await ctx.addCookies([{ name: "sb-127-auth-token", value: cookieDe(ADMIN), url: base }]);
  await ctx.route("**/_vercel/**", (q) => q.fulfill({ contentType: "text/javascript", body: "" }));
  await ctx.route((u) => u.hostname !== "127.0.0.1", (q) => (q.request().resourceType() === "image" ? q.fulfill({ contentType: "image/svg+xml", body: IMAGEN }) : q.abort()));
  const page = await ctx.newPage();
  // La letra al doble: la de fábrica del navegador, como `medir-pantallas.mjs --letra=2`.
  if (letra !== 1) await (await ctx.newCDPSession(page)).send("Page.setFontSizes", { fontSizes: { standard: Math.round(16 * letra), fixed: Math.round(13 * letra) } });
  page.on("pageerror", (e) => errores.push(String(e.message).slice(0, 300)));
  page.on("console", (m) => m.type() === "error" && errores.push(`consola: ${m.text().slice(0, 300)}`));
  // Cada vez que la pantalla se vuelve a pedir (refresco del enrutador: petición RSC con el árbol del enrutador).
  page.refrescos = 0;
  page.on("request", (q) => {
    const h = q.headers();
    if (h["rsc"] && h["next-router-state-tree"] && !h["next-router-prefetch"] && q.url().includes("/admin/instagram")) page.refrescos++;
  });
  return { ctx, page };
}
const quieto = async (page, ms = 500) => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
};
const foto = async (page, nombre, ms = 500) => {
  await quieto(page, ms);
  await page.screenshot({ path: path.join(SALIDA, `${nombre}.png`) });
  console.log("  ", nombre);
};
async function tocar(page, loc) {
  const b = await loc.boundingBox();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
}
const control = (ruta) => fetch(`${respaldo}${ruta}`);
const fila = (page) => page.locator("main li", { hasText: TITULO }).first();
const textoDe = async (l) => (await l.innerText()).replace(/\s+/g, " ").trim();
/** Instagram › Eventos, desde Administración: su renglón y la pestaña (como entra el founder). */
async function entrarDesdeAdministracion(page) {
  const renglon = page.locator('main a[href="/admin/instagram"]').first();
  await renglon.evaluate((e) => e.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(300);
  await tocar(page, renglon);
  await page.waitForURL((u) => u.pathname === "/admin/instagram", { timeout: 30000, waitUntil: "commit" });
  const eventos = page.getByRole("tab", { name: "Eventos" }).or(page.getByRole("button", { name: "Eventos", exact: true })).first();
  await eventos.waitFor({ timeout: 30000 });
  if ((await eventos.getAttribute("aria-selected")) !== "true" && (await eventos.getAttribute("aria-current")) === null) await tocar(page, eventos);
  await fila(page).waitFor({ timeout: 30000 });
}
/** La lista con el evento a 300 px del borde de arriba (como el prototipo), y una marca en su nodo. `desdeAdministracion`: se entra como el founder. */
async function abrirLista(page, desdeAdministracion = false) {
  if (desdeAdministracion) {
    await page.goto(base + "/admin", { waitUntil: "load" });
    await entrarDesdeAdministracion(page);
  } else await page.goto(base + LISTA, { waitUntil: "load" });
  await fila(page).waitFor({ timeout: 30000 });
  await fila(page).evaluate((e) => {
    window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 300);
    e.__marca = "original";
  });
  await quieto(page);
  // Desde aquí, cualquier petición de la lista con el árbol del enrutador sería volver a pedir la pantalla.
  page.refrescos = 0;
}
/** Dónde está el renglón: su `top`, si es el mismo nodo, el desplazamiento y su grupo. */
const dondeEsta = (page) =>
  page.evaluate((t) => {
    const li = [...document.querySelectorAll("main li")].find((x) => x.textContent.includes(t));
    return { top: Math.round(li.getBoundingClientRect().top), mismo: li.__marca === "original", scrollY: Math.round(scrollY), grupo: li.closest("section")?.querySelector("h2")?.textContent ?? null };
  }, TITULO);
async function enSuSitio(page, estado, antes) {
  const d = await dondeEsta(page);
  medicion[estado] = { ...d, refrescos: page.refrescos, texto: await textoDe(fila(page)) };
  comprobar(d.top === 300 && d.mismo && d.scrollY === antes.scrollY && d.grupo === "Para publicar· 11", `${estado}: mismo nodo (${d.mismo}), top ${d.top}, desplazamiento ${d.scrollY}, grupo «${d.grupo}»`);
  comprobar(page.refrescos === 0, `${estado}: la pantalla no se volvió a pedir (${page.refrescos})`);
}
async function abrirHoja(page) {
  await tocar(page, fila(page).locator("a").first());
  const hoja = page.getByRole("dialog", { name: "Publicar en Instagram" });
  await hoja.getByRole("button", { name: /^(Publicar|Se está|Ya se publicó)/ }).waitFor({ timeout: 15000 });
  await page.waitForFunction(() => [...document.querySelectorAll('[role="dialog"] img')].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 30000 });
  return hoja;
}
/** «También en Facebook» como se pida (viene marcada). */
async function conFacebook(page, hoja, si) {
  const casilla = hoja.getByRole("checkbox", { name: /También en Facebook/ });
  if ((await casilla.getAttribute("aria-checked")) !== String(si)) {
    await casilla.evaluate((e) => e.scrollIntoView({ block: "center" }));
    await tocar(page, casilla);
  }
}
async function publicar(page, hoja) {
  const boton = hoja.getByRole("button", { name: "Publicar", exact: true });
  await tocar(page, boton);
  await hoja.waitFor({ state: "detached", timeout: 15000 });
}
async function hasta(page, texto, tope = 30000) {
  await fila(page).getByText(texto).waitFor({ timeout: tope });
}

try {
  // 01 · 02 · 03 · 05 · 09 · 10: el recorrido de siempre, sin Facebook: antes, la hoja, «Publicando…» a 0,1 s, publicado con «Ver», Atrás antes
  // del minuto (la lista de la caché) y la lista pedida otra vez (Atrás pasado el minuto: la pantalla de siempre).
  {
    await respaldoNuevo();
    await control("/__lento?ms=6000");
    const { ctx, page } = await contexto();
    await abrirLista(page, true);
    console.log("   la lista:", new URL(page.url()).pathname + new URL(page.url()).search);
    const antes = await dondeEsta(page);
    medicion.antes = antes;
    comprobar(antes.top === 300 && antes.grupo === "Para publicar· 11", `antes: top ${antes.top}, grupo «${antes.grupo}»`);
    await foto(page, "01-antes");
    const hoja = await abrirHoja(page);
    await conFacebook(page, hoja, false);
    await foto(page, "02-hoja");
    await publicar(page, hoja);
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(SALIDA, "03-publicando.png") });
    console.log("   03-publicando (0,1 s después de cerrarse la hoja)");
    comprobar((await textoDe(fila(page))).endsWith("Publicando…"), "03: el renglón dice «Publicando…»");
    comprobar((await fila(page).locator('[data-estado="en-camino"][role="status"]').count()) === 1, "03: la línea del estado se anuncia (role=status)");
    await enSuSitio(page, "03-publicando", antes);
    await hasta(page, "Publicado · hace un momento");
    const ver = fila(page).getByRole("link", { name: /^Ver en Instagram: Delirium Pollum/ });
    comprobar((await ver.getAttribute("href"))?.startsWith("https://www.instagram.com/"), `05: «Ver» lleva a ${await ver.getAttribute("href")}`);
    comprobar((await ver.getAttribute("target")) === "_blank" && (await ver.getAttribute("rel")) === "noopener noreferrer", "05: «Ver» abre fuera");
    await foto(page, "05-publicado");
    await enSuSitio(page, "05-publicado", antes);
    // Antes del minuto: «Atrás» de la barra (a Administración) y otra vez a Instagram; la lista sale de la caché del enrutador
    // (`staleTimes.dynamic: 60`) con el evento todavía en «Para publicar» y su línea vieja.
    await tocar(page, page.getByRole("link", { name: /^Atrás/ }).first());
    await page.waitForURL((u) => u.pathname === "/admin", { timeout: 15000, waitUntil: "commit" });
    await page.locator('main a[href="/admin/instagram"]').first().waitFor({ timeout: 15000 });
    await page.waitForTimeout(600);
    const pedidas = page.refrescos;
    const rsc = [];
    const contar = (q) => q.headers()["rsc"] && q.url().includes("/admin/instagram") && rsc.push(q.url().replace(base, ""));
    page.on("request", contar);
    await entrarDesdeAdministracion(page);
    page.off("request", contar);
    medicion["09-peticiones-al-volver"] = rsc;
    console.log(`   al volver a entrar: ${rsc.length} peticiones RSC de la lista (${pedidas} refrescos antes)`);
    await fila(page).evaluate((e) => window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 300));
    await hasta(page, "Publicado · hace un momento", 5000);
    const atras = await dondeEsta(page);
    medicion["09-atras-cache"] = { ...atras, texto: await textoDe(fila(page)) };
    comprobar(atras.grupo === "Para publicar· 11", `09: la lista de la caché (grupo «${atras.grupo}») y la tarjeta como se dejó: «${await textoDe(fila(page))}»`);
    await foto(page, "09-atras-cache");
    // La lista pedida otra vez: el servidor ya lo pone en «Ya en Instagram», con las palabras de siempre.
    await page.reload({ waitUntil: "load" });
    await fila(page).waitFor({ timeout: 30000 });
    await fila(page).evaluate((e) => e.scrollIntoView({ block: "center" }));
    const fresco = await dondeEsta(page);
    medicion["10-atras-fresco"] = { ...fresco, texto: await textoDe(fila(page)) };
    comprobar(/^Ya en Instagram/.test(fresco.grupo ?? "") && /Publicación · /.test(await textoDe(fila(page))), `10: en «${fresco.grupo}»: «${await textoDe(fila(page))}»`);
    await foto(page, "10-atras-fresco");
    await ctx.close();
  }

  // 04 · 12: «Reintentando…» (Instagram no aceptó la imagen: un error pasajero, la cola lo repite) y, con «reducir movimiento», el anillo quieto.
  {
    await respaldoNuevo();
    await control("/__lento?ms=1500");
    await control("/__falla-instagram?clave=imagen");
    const { ctx, page } = await contexto({ quieto: true });
    await abrirLista(page);
    const antes = await dondeEsta(page);
    const hoja = await abrirHoja(page);
    await conFacebook(page, hoja, false);
    await publicar(page, hoja);
    await page.waitForTimeout(100);
    const anillo = fila(page).locator('[class*="anillo"]');
    const giro = await anillo.evaluate((e) => ({ animacion: getComputedStyle(e).animationName, corriendo: e.getAnimations().length }));
    comprobar(giro.animacion === "none" && giro.corriendo === 0, `12: con «reducir movimiento» el anillo no gira (${JSON.stringify(giro)})`);
    await page.screenshot({ path: path.join(SALIDA, "12-quieto.png") });
    console.log("   12-quieto");
    await hasta(page, "Reintentando…");
    await foto(page, "04-reintentando");
    await enSuSitio(page, "04-reintentando", antes);
    await ctx.close();
  }

  // 06 · 07: con espejo a Facebook. Instagram sale y la página falla (falta el permiso); desde la hoja, «Reintentar en Facebook»: su línea dice
  // «Facebook: publicando…» y luego «Facebook: publicado».
  {
    await respaldoNuevo();
    await control("/__lento?ms=1500");
    await control("/__falla-facebook?clave=permiso");
    const { ctx, page } = await contexto();
    await abrirLista(page);
    const antes = await dondeEsta(page);
    let hoja = await abrirHoja(page);
    await conFacebook(page, hoja, true);
    await publicar(page, hoja);
    await hasta(page, "Facebook: falta permiso");
    await foto(page, "06a-facebook-falta-permiso");
    await control("/__falla-facebook?clave=");
    hoja = await abrirHoja(page);
    const reintentar = hoja.getByRole("button", { name: "Reintentar en Facebook" });
    await reintentar.evaluate((e) => e.scrollIntoView({ block: "center" }));
    await tocar(page, reintentar);
    await hoja.waitFor({ state: "detached", timeout: 15000 });
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(SALIDA, "06-facebook.png") });
    console.log("   06-facebook");
    comprobar(/Publicado · hace un momento Facebook: publicando…$/.test(await textoDe(fila(page))), `06: «${await textoDe(fila(page))}»`);
    await enSuSitio(page, "06-facebook", antes);
    await hasta(page, "Facebook: publicado");
    await foto(page, "07-facebook-ok");
    await enSuSitio(page, "07-facebook-ok", antes);
    await ctx.close();
  }

  // 08: no se publicó (el cupo del día: no se reintenta). La frase de hoy, en rojo, en el mismo sitio.
  {
    await respaldoNuevo();
    await control("/__lento?ms=1500");
    await control("/__falla-instagram?clave=cupo");
    const { ctx, page } = await contexto();
    await abrirLista(page);
    const antes = await dondeEsta(page);
    const hoja = await abrirHoja(page);
    await conFacebook(page, hoja, false);
    await publicar(page, hoja);
    await hasta(page, "No se publicó");
    const linea = fila(page).locator('[data-estado="fallido"][role="status"]');
    comprobar((await linea.count()) === 1, `08: «${await textoDe(linea)}» en rojo, anunciada`);
    await foto(page, "08-fallido");
    await enSuSitio(page, "08-fallido", antes);
    await ctx.close();
  }

  // 11: la letra al doble: la línea verde se parte en dos renglones y «Ver» sigue en su hueco sin montarse.
  {
    await respaldoNuevo();
    await control("/__lento?ms=1500");
    const { ctx, page } = await contexto({ letra: 2 });
    await page.goto(base + LISTA, { waitUntil: "load" });
    await fila(page).waitFor({ timeout: 30000 });
    await fila(page).evaluate((e) => e.scrollIntoView({ block: "center" }));
    const hoja = await abrirHoja(page);
    await conFacebook(page, hoja, false);
    await publicar(page, hoja);
    await hasta(page, "Publicado · hace un momento");
    await fila(page).evaluate((e) => e.scrollIntoView({ block: "center" }));
    const geo = await fila(page).evaluate((li) => {
      const ver = li.querySelector('a[aria-label^="Ver en Instagram"]').getBoundingClientRect();
      const linea = li.querySelector("[data-estado]").getBoundingClientRect();
      const frente = li.querySelector("a").getBoundingClientRect();
      const fila = li.getBoundingClientRect();
      return { lineaDerecha: Math.round(linea.right), frenteDerecha: Math.round(frente.right), verIzquierda: Math.round(ver.left), verAbajo: Math.round(ver.bottom), filaAbajo: Math.round(fila.bottom), lineaAlto: Math.round(linea.height) };
    });
    medicion["11-letra"] = geo;
    comprobar(geo.frenteDerecha <= geo.verIzquierda && geo.verAbajo <= geo.filaAbajo, `11: «Ver» no se monta (${JSON.stringify(geo)})`);
    await foto(page, "11-letra");
    await ctx.close();
  }
} finally {
  fs.writeFileSync(path.join(SALIDA, "medicion.json"), JSON.stringify(medicion, null, 1));
  await browser.close();
}
console.log(errores.length ? `errores de página:\n${errores.join("\n")}` : "sin errores de página");
console.log(fallas.length ? `${fallas.length} FALLAS` : "todo en orden");
process.exit(fallas.length || errores.length ? 1 : 0);
