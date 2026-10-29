// Capturas de la bitácora 511 (OL-479): la semana de Instagram en Administración, con la app compilada contra el respaldo local (la sesión de la
// cuenta de administración; `RESPALDO_HISTORIAL=1 RESPALDO_INSTAGRAM_SEMANA=1`: las fichas completas de demo con sus fotos dibujadas, el lunes y
// el martes ya publicados), la API de Instagram y la página de Facebook DE MENTIRA del respaldo y el trabajador de verdad (`/api/redes/correr`, con
// un CRON_SECRET inventado: «Publicar ahora» lo pide en seguida con `after()`). Nunca se llama a Instagram ni a Facebook. Chrome real
// (playwright-core), 390×844 a 2× (y 320 y 430 donde cambia). Toques reales: clics por coordenadas. Mide textos cortados, desplazamiento a lo ancho
// y toques menores de 44 en lo nuevo, y guarda las tarjetas que dibuja el servidor (`tarjeta-*.jpg`).
//   node scripts/ops/auditoria-ui/capturar-instagram-semana.mjs <raíz del árbol> <carpeta de salida>
// SIN_BUILD=1 usa el `.next` que ya hay. Correrlo en un árbol SIN `.env`.
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
  h.registro = () => salida.slice(-4000);
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

// Las fotos y portadas de demo (las que sirve el respaldo como `demo-carrusel/<nombre>.jpg`).
const carpetaFotos = fs.mkdtempSync(path.join(os.tmpdir(), "ol479-fotos-"));
await (await import("./respaldo-local/fotos-historial.mjs")).dibujarFotosHistorial(carpetaFotos);
await (await import("./respaldo-local/fotos-instagram.mjs")).dibujarFotosInstagram(carpetaFotos);

const [pr, pa] = [8889, await puertoLibre()];
const respaldo = `http://127.0.0.1:${pr}`;
const base = `http://127.0.0.1:${pa}`;
const reloj = { RELOJ_FIJO: AHORA, TZ: "America/Mexico_City", NODE_OPTIONS: `--require=${path.join(AQUI, "reloj-fijo.cjs")}` };
const datos = { RESPALDO_HISTORIAL: "1", RESPALDO_INSTAGRAM_SEMANA: "1", RESPALDO_CARRUSEL_DIR: carpetaFotos, RESPALDO_URL: respaldo };
const app = { NEXT_PUBLIC_SUPABASE_URL: respaldo, NEXT_PUBLIC_SUPABASE_ANON_KEY: "llave-anon-inventada", NEXT_PUBLIC_MAPBOX_TOKEN: "pk.inventado", SUPABASE_SERVICE_ROLE_KEY: "llave-servicio-inventada" };
const instagram = { INSTAGRAM_API_URL: `${respaldo}/graph`, INSTAGRAM_TOKEN: "token-inventado", INSTAGRAM_USER_ID: "17841400000000458", FACEBOOK_PAGE_ID: "1374800000000461", CRON_SECRET: "secreto-inventado-479" };
const r = lanzar([path.join(AQUI, "respaldo-local/server.mjs"), String(pr)], { ...reloj, ...datos });
await esperar(`${respaldo}/rest/v1/eventos?select=id&limit=1`, r);
if (!process.env.SIN_BUILD) {
  process.stdout.write("compilando… ");
  const b = spawnSync(process.execPath, [NEXT, "build"], { cwd: RAIZ, env: { ...process.env, ...app }, encoding: "utf8", maxBuffer: 1 << 26 });
  if (b.status !== 0) throw new Error((b.stdout + b.stderr).slice(-4000));
  console.log("listo");
}
const s = lanzar([NEXT, "start", "-p", String(pa)], { ...app, ...reloj, ...instagram });
await esperar(`${base}/entrar`, s);

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--hide-scrollbars"] });
const errores = [];
const fallas = [];
const comprobar = (ok, que) => {
  console.log(`     ${ok ? "ok" : "FALLA"} · ${que}`);
  if (!ok) fallas.push(que);
};
const recorrido = [];
async function contexto({ ancho = 390 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.clock.setFixedTime(new Date(AHORA));
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: base });
  await ctx.addCookies([{ name: "sb-127-auth-token", value: cookieDe(ADMIN), url: base }]);
  await ctx.route("**/_vercel/**", (q) => q.fulfill({ contentType: "text/javascript", body: "" }));
  // Nada sale a la red: lo de fuera (ig.me, fuentes) se corta; las imágenes de fuera, un gris.
  const IMAGEN = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#b9b4a8"/></svg>';
  await ctx.route((u) => u.hostname !== "127.0.0.1", (q) => (q.request().resourceType() === "image" ? q.fulfill({ contentType: "image/svg+xml", body: IMAGEN }) : q.fulfill({ status: 204, body: "" })));
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(String(e.message).slice(0, 300)));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource: the server responded with a status of 404/.test(m.text()) && errores.push(`consola: ${m.text().slice(0, 300)}`));
  ctx.on("page", (p) => p !== page && p.close().catch(() => {}));
  return { ctx, page };
}
const quieto = async (page, ms = 700) => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
};
const imagenesListas = (page, dentro = "main, [role=dialog]") =>
  page
    .waitForFunction((sel) => [...document.querySelectorAll(sel)].flatMap((x) => [...x.querySelectorAll("img")]).filter((i) => i.loading !== "lazy" || i.getBoundingClientRect().top < innerHeight).every((i) => i.complete && i.naturalWidth > 0), dentro, { timeout: 45000 })
    .catch(() => comprobar(false, "las imágenes cargaron"));
const foto = async (page, nombre, dentro) => {
  await quieto(page);
  await imagenesListas(page, dentro);
  await page.screenshot({ path: path.join(SALIDA, `${nombre}.png`) });
  console.log("  ", nombre);
};
async function tocar(page, loc, que) {
  await loc.first().evaluate((e) => e.scrollIntoView({ block: "center" }));
  const b = await loc.first().boundingBox();
  const x = b.x + b.width / 2;
  const y = b.y + b.height / 2;
  // Toque real: lo que está bajo el dedo tiene que ser el control (nada encima que se lo coma).
  const debajo = await page.evaluate(([px, py]) => { const e = document.elementFromPoint(px, py); return e ? (e.closest("a,button,[role=tab],[role=checkbox]")?.textContent ?? e.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 60) : null; }, [x, y]);
  await page.mouse.click(x, y);
  recorrido.push(`${que ?? "toque"} → ${debajo}`);
}
const texto = async (l) => (await l.first().innerText()).replace(/\s+/g, " ").trim();
const fila = (page, t) => page.locator("main li", { hasText: t }).first();
const hojaAbierta = (page) => page.getByRole("dialog").last();
const alFondo = (hoja) => hoja.locator("[class*=cuerpo]").first().evaluate((c) => c.scrollTo(0, c.scrollHeight));
const volver = (page) => page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
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
/** Toques menores de 44 en lo nuevo (pestañas, chips de la semana, renglones, «Ver», la hoja del día); los enlaces dentro de una frase, exentos. */
const toquesChicos = (page) =>
  page.evaluate(() => {
    const chicos = [];
    for (const el of document.querySelectorAll("[role=tab], main li > a, main li > a + a, [role=dialog] button, [role=dialog] a, header button")) {
      const r = el.getBoundingClientRect();
      if (!r.width || el.closest("[inert]")) continue;
      const enFrase = el.parentElement?.tagName === "P" && el.parentElement.textContent.trim() !== el.textContent.trim() && !el.parentElement.className.includes("hecho");
      const chip = getComputedStyle(el, "::before").content !== "none" && r.height >= 32;
      if (!enFrase && !chip && (r.height < 43.5 || r.width < 43.5)) chicos.push(`${el.textContent.trim().slice(0, 30) || el.getAttribute("aria-label")} ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
    return chicos;
  });
const abrirDia = async (page, t) => {
  await tocar(page, fila(page, t).locator("a").first(), `abrir ${t}`);
  const hoja = hojaAbierta(page);
  await hoja.waitFor();
  await page.waitForFunction(() => !document.querySelector('[role=dialog] [aria-label="Preparando la vista previa"]'), null, { timeout: 30000 });
  await imagenesListas(page, "[role=dialog]");
  return hoja;
};
const cerrarHoja = async (page) => {
  await tocar(page, hojaAbierta(page).getByRole("button", { name: "Cerrar" }), "✕");
  await page.waitForFunction(() => !document.querySelector("[role=dialog]"), null, { timeout: 10000 });
};
const semanaUrl = `${base}/admin/instagram?ciudad=san-luis-potosi`;
const listaLista = async (page) => {
  await page.locator("main li").first().waitFor({ timeout: 30000 });
  await imagenesListas(page, "main");
};
const tarjeta = async (page, id, nombre, formato = "4x5") => {
  const b = await page.evaluate(async (u) => { const r = await fetch(u); return r.ok ? Array.from(new Uint8Array(await r.arrayBuffer())) : null; }, `/api/instagram/semana/${id}?formato=${formato}`);
  if (b) fs.writeFileSync(path.join(SALIDA, `tarjeta-${nombre}-${formato}.jpg`), Buffer.from(b));
  comprobar(!!b, `la tarjeta ${nombre} ${formato} se dibuja en el servidor`);
};
const idDe = async (page, t) => (await fila(page, t).locator("a").first().evaluate((a) => a.closest("li")?.querySelector("img")?.getAttribute("src") ?? "")).match(/semana\/([0-9a-f-]{36})/)?.[1];

try {
  // 01 · La semana: la pestaña «Semana» primero, «Esta semana», un renglón por día.
  {
    const { ctx, page } = await contexto();
    await page.goto(semanaUrl, { waitUntil: "load" });
    await listaLista(page);
    await foto(page, "01-semana-esta");
    // Los renglones del grupo de la semana (el bloque «Conexión» de OL-471 lleva el suyo aparte).
    const renglones = await page.locator("main section", { hasText: "· 7 días" }).locator("li").count();
    comprobar(renglones === 7, `siete renglones, uno por día (${renglones})`);
    comprobar((await page.getByRole("tab", { name: "Semana" }).getAttribute("aria-selected")) === "true", "la pestaña «Semana» va primero y elegida");
    const resumen = await texto(page.locator("main p").first());
    console.log("     resumen:", resumen);
    comprobar(/^2 publicadas · 4 programadas/.test(resumen) && resumen.endsWith("el domingo descansa"), "el resumen: 2 publicadas, 4 programadas y el domingo descansa");
    const lunes = await texto(fila(page, "Renata Saldaña"));
    console.log("     lunes:", lunes);
    comprobar(/Lun 5 · 7:00 pm · Artista Publicado 31 visitas · 3 van Ver/.test(lunes), "el lunes: Renata Saldaña, publicado, 31 visitas · 3 van y «Ver»");
    const hoy = await texto(fila(page, "Hoy · 7:00 pm"));
    console.log("     hoy:", hoy);
    comprobar(/Hoy · 7:00 pm · Lugar Sale hoy a las 7:00 pm/.test(hoy), "hoy: el lugar, «Sale hoy a las 7:00 pm»");
    const viernes = await texto(fila(page, "Vie 9"));
    console.log("     viernes:", viernes);
    comprobar(/Íñigo Montalvo/.test(viernes) && /Artista con fecha el fin/.test(viernes), "el viernes: Íñigo Montalvo (tiene fecha el sábado), «Artista con fecha el fin»");
    comprobar(/Esta semana · carrusel de/.test(await texto(fila(page, "Jue 8"))), "el jueves: «Esta semana», carrusel");
    comprobar(/Dom 11 · Descanso/.test(await texto(fila(page, "Dom 11"))), "el domingo descansa");
    // Las tarjetas que dibuja el servidor, a 720.
    for (const [t, n] of [["Hoy · 7:00 pm", "lugar-hoy"], ["Vie 9", "artista-viernes"], ["Jue 8", "esta-semana"], ["Renata Saldaña", "artista-lunes"]]) {
      const id = await idDe(page, t);
      if (id) {
        await tarjeta(page, id, n);
        if (n !== "esta-semana") await tarjeta(page, id, n, "9x16");
      } else comprobar(false, `el renglón ${t} lleva su tarjeta`);
    }
    // 02 · La que viene (el chip reemplaza la dirección: no apila historial).
    const largo = await page.evaluate(() => history.length);
    await tocar(page, page.getByRole("button", { name: "La que viene" }), "La que viene");
    await page.waitForURL(/semana=viene/);
    await page.locator("main section h2", { hasText: "Del 12 al 18 de octubre" }).waitFor({ timeout: 30000 });
    await listaLista(page);
    await foto(page, "02-semana-viene");
    comprobar((await page.evaluate(() => history.length)) === largo, "«La que viene» no apila historial");
    const viene = await texto(page.locator("main"));
    comprobar(/Falta avisarle/.test(viene), "la que viene: «Falta avisarle» en los artistas");
    comprobar(/\d programadas/.test(viene), "la que viene: lo programado (un día sin eventos en el respaldo descansa y lo dice)");
    // 03 · Eventos: la lista de hoy tal cual.
    await tocar(page, page.getByRole("tab", { name: "Eventos" }), "Eventos");
    await page.getByText("Para publicar").waitFor();
    await foto(page, "03-pestana-eventos");
    comprobar((await page.evaluate(() => history.length)) === largo && /pestana=eventos/.test(page.url()), "la pestaña vive en la dirección sin apilar historial");
    await ctx.close();
  }
  // 04 a 08 · El día de hoy (un lugar): la tarjeta, por qué, «Cambiar», el texto, Facebook y «Publicar ahora»; la historia; «Cambiar».
  {
    const { ctx, page } = await contexto();
    await page.goto(semanaUrl, { waitUntil: "load" });
    await listaLista(page);
    const hoja = await abrirDia(page, "Hoy · 7:00 pm");
    await foto(page, "04-dia-lugar");
    const t = await texto(hoja);
    comprobar(/Hoy · 7:00 pm · Lugar/.test(t) && /Lugar con \d eventos? esta semana/.test(t) && /Cambiar/.test(t), "la hoja: el día, por qué y «Cambiar»");
    comprobar((await hoja.getByRole("button", { name: "Publicar ahora" }).count()) === 1, "el botón dice «Publicar ahora»");
    await alFondo(hoja);
    await foto(page, "04b-dia-lugar-abajo");
    comprobar(/Sale sola hoy a las 7:00 pm en @smsnstrsapp y en su página de Facebook/.test(await texto(hoja)), "dice cuándo sale sola");
    comprobar((await hoja.getByRole("button", { name: "Quitar de la semana" }).count()) === 1, "y «Quitar de la semana»");
    await hoja.locator("[class*=cuerpo]").first().evaluate((c) => c.scrollTo(0, 0));
    await tocar(page, hoja.getByRole("button", { name: "Historia 9:16" }), "Historia 9:16");
    await imagenesListas(page, "[role=dialog]");
    await foto(page, "05-dia-historia");
    comprobar(/La historia sale con la publicación/.test(await texto(hoja)), "la historia sale con la publicación");
    await tocar(page, hoja.getByRole("button", { name: "Publicación 4:5" }), "Publicación 4:5");
    await tocar(page, hoja.getByRole("button", { name: "Cambiar" }), "Cambiar");
    await page.getByRole("dialog", { name: /^Cambiar/ }).waitFor();
    await page.waitForFunction(() => !/Buscando quién puede salir/.test(document.querySelector("[role=dialog]")?.textContent ?? ""), null, { timeout: 20000 });
    await foto(page, "06-cambiar-lugar");
    // En el respaldo solo hay dos lugares con la ficha completa y el otro ya va el miércoles que viene: lo dice.
    comprobar(/ya va el mié 14/.test(await texto(page.getByRole("dialog"))), "«Cambiar» dice quién no entra y por qué (ya va otro día)");
    await tocar(page, page.getByRole("dialog").getByRole("button", { name: "Volver al día" }), "Volver al día");
    await page.getByRole("dialog", { name: /Hoy · 7:00 pm/ }).waitFor();
    await ctx.close();
  }
  // 07 a 13 · La que viene: el artista del lunes, «Cambiar» y elegir a otra, «Avisar», el mensaje, «Copiar y abrir su Instagram», «Dijo que no» y
  // la ficha.
  let fueraNombre = null;
  let fueraHref = null;
  {
    const { ctx, page } = await contexto();
    await page.goto(`${semanaUrl}&semana=viene`, { waitUntil: "load" });
    await listaLista(page);
    const antes = (await fila(page, "Lun 12").locator("b").first().innerText()).trim();
    const miniaturaAntes = await fila(page, "Lun 12").locator("img").first().getAttribute("src");
    const primera = await abrirDia(page, "Lun 12");
    await tocar(page, primera.getByRole("button", { name: "Cambiar" }), "Cambiar");
    await page.getByRole("dialog", { name: /^Cambiar el lunes 12/ }).waitFor();
    await page.waitForFunction(() => !/Buscando quién puede salir/.test(document.querySelector("[role=dialog]")?.textContent ?? ""), null, { timeout: 20000 });
    await foto(page, "07-cambiar-artista");
    const opciones = await page.getByRole("dialog").locator("li").count();
    comprobar(opciones >= 1, `«Cambiar» enseña los candidatos, en el orden de la regla y con por qué (${opciones})`);
    const otro = (await page.getByRole("dialog").locator("li b").first().innerText()).trim();
    await tocar(page, page.getByRole("dialog").locator("li a").first(), `elegir ${otro}`);
    await page.getByRole("dialog", { name: /Lun 12/ }).waitFor();
    await page.waitForFunction((n) => (document.querySelector("[role=dialog] img")?.getAttribute("alt") ?? "").includes(n), otro, { timeout: 20000 });
    await cerrarHoja(page);
    await page.waitForFunction((n) => document.querySelector("main")?.textContent?.includes(n), otro, { timeout: 20000 });
    comprobar(/Lun 12 · 7:00 pm · Artista/.test(await texto(fila(page, otro))) && !(await texto(page.locator("main"))).includes(antes), `el lunes 12 ya dice ${otro} (en lugar de ${antes})`);
    const lunes = fila(page, "Lun 12");
    fueraNombre = (await lunes.locator("b").first().innerText()).trim();
    fueraHref = await lunes.locator("a").first().getAttribute("href");
    const hoja = await abrirDia(page, "Lun 12");
    await foto(page, "08-dia-artista-viene");
    const src = await hoja.locator("img").first().getAttribute("src");
    const deLaLista = await fila(page, "Lun 12").locator("img").first().getAttribute("src");
    const slug = fueraHref.split("/").pop();
    comprobar(src.includes(`f=${slug}`) && deLaLista !== miniaturaAntes, `la tarjeta y la miniatura son de ${fueraNombre}, no las guardadas de ${antes}`);
    const t = await texto(hoja);
    comprobar(/Aviso a @[a-z0-9._]+: falta mandarlo/.test(t), "el artista: «Aviso a @…: falta mandarlo» con «Avisar»");
    comprobar(/se invita a su cuenta como coautora/.test(t), "dice que se le invita como coautora");
    await tocar(page, hoja.getByRole("button", { name: "Avisar" }), "Avisar");
    const avisar = page.getByRole("dialog", { name: /^Avisar a / });
    await avisar.waitFor();
    await foto(page, "09-avisar");
    const mensaje = await texto(avisar.locator("pre"));
    comprobar(/^¡Hola, .+! Te escribimos de Somos Nosotrxs \(@smsnstrsapp\)/.test(mensaje) && /contéstanos «no» y no se publica/.test(mensaje), "el mensaje listo, con cómo decir que no");
    await tocar(page, avisar.getByRole("button", { name: "Copiar y abrir su Instagram" }), "Copiar y abrir su Instagram");
    await page.getByRole("dialog", { name: /Lun 12/ }).getByText(/avisado hoy, 10:00 am · sin respuesta/).waitFor({ timeout: 20000 });
    const copiado = await page.evaluate(() => navigator.clipboard.readText().catch(() => ""));
    comprobar(copiado.startsWith("¡Hola,"), "el mensaje quedó en el portapapeles");
    await foto(page, "10-avisado");
    await tocar(page, page.getByRole("dialog").getByRole("button", { name: "Dijo que no" }), "Dijo que no");
    const dijo = page.getByRole("dialog", { name: /^¿Sacar a / });
    await dijo.waitFor();
    await foto(page, "11-dijo-no");
    await tocar(page, dijo.getByRole("button", { name: "Mejor no" }), "Mejor no");
    await page.getByRole("dialog", { name: /Lun 12/ }).waitFor();
    await tocar(page, page.getByRole("dialog").getByRole("button", { name: "Dijo que no" }), "Dijo que no");
    await tocar(page, page.getByRole("dialog").getByRole("button", { name: "Sí, sacarlo de Instagram" }), "Sí, sacarlo de Instagram");
    await page.getByRole("dialog", { name: /Lun 12/ }).getByText(/En lugar de .*, que dijo que no\./).waitFor({ timeout: 20000 });
    await imagenesListas(page, "[role=dialog]");
    await foto(page, "12-tras-dijo-no");
    await cerrarHoja(page);
    const nuevo = await texto(fila(page, "Lun 12"));
    console.log("     lunes 12:", nuevo);
    comprobar(!nuevo.includes(fueraNombre) && /Falta avisarle · en lugar de/.test(nuevo), "el lunes 12 lo toma el siguiente, con «en lugar de …»");
    // La ficha: el «···» dice «Fuera de Instagram» con «Volver a poner».
    await page.goto(`${base}${fueraHref}`, { waitUntil: "load" });
    await tocar(page, page.getByRole("button", { name: "Más acciones" }), "Más acciones");
    const menu = page.getByRole("dialog", { name: "Más acciones" });
    await menu.getByRole("button", { name: /Fuera de Instagram/ }).waitFor();
    await foto(page, "13-ficha-fuera", "[role=dialog]");
    comprobar(/Dijo que no el .* · Volver a poner/.test(await texto(menu.getByRole("button", { name: /Fuera de Instagram/ }))), "el «···» de la ficha: «Fuera de Instagram · Dijo que no el … · Volver a poner»");
    await tocar(page, menu.getByRole("button", { name: /Fuera de Instagram/ }), "Volver a poner");
    const yaNo = await page.waitForFunction(() => !document.body.textContent.includes("Fuera de Instagram"), null, { timeout: 20000 }).then(() => true, () => false);
    comprobar(yaNo, "«Volver a poner»: ya no está fuera (el «···» se refresca sin el renglón)");
    await ctx.close();
  }
  // 14 a 16 · «Publicar ahora» el viernes: la hoja se cierra, «Publicando…», el trabajador de verdad, «Publicado» y la hoja con lo que salió.
  {
    const { ctx, page } = await contexto();
    await page.goto(semanaUrl, { waitUntil: "load" });
    await listaLista(page);
    const nombre = (await fila(page, "Vie 9").locator("b").first().innerText()).trim();
    const hoja = await abrirDia(page, "Vie 9");
    await tocar(page, hoja.getByRole("button", { name: "Publicar ahora" }), "Publicar ahora");
    await page.waitForFunction(() => !document.querySelector("[role=dialog]"), null, { timeout: 15000 });
    let listo = false;
    let vio = false;
    for (let i = 0; i < 80 && !listo; i++) {
      await volver(page);
      await page.waitForTimeout(800);
      const t = await texto(fila(page, nombre));
      if (/Publicando…/.test(t) && !vio) {
        vio = true;
        await foto(page, "14-publicando");
      }
      listo = /Publicado/.test(t);
    }
    comprobar(listo, `«Publicar ahora»: ${nombre} queda «Publicado»`);
    await foto(page, "15-publicado");
    const registro = await (await fetch(`${respaldo}/__registro`)).json();
    const media = registro.filter((x) => x.startsWith("  instagram:")).map((x) => JSON.parse(x.slice(13)));
    console.log("     a Instagram:", media.map((m) => `${m.media_type ?? "foto"}${m.caption ? " con texto" : ""}${m.user_tags ? " etiquetada" : ""}`).join(" · "));
    comprobar(media.length >= 2 && media.some((m) => m.media_type === "STORIES"), "salieron la publicación y su historia");
    comprobar(registro.some((x) => x.includes('"caption":"') && x.includes("Lee su ficha en somosnosotrxs.org/artistas/")), "el texto lleva su ficha");
    const fb = registro.filter((x) => x.startsWith("  facebook:")).map((x) => x.slice(12));
    comprobar(fb.some((x) => x.includes("Lee su ficha: https://somosnosotrxs.org/artistas/") && x.includes("utm_source=facebook")), "Facebook lleva el enlace a su ficha con su marca de origen");
    const d = await abrirDia(page, nombre);
    await foto(page, "16-dia-publicado");
    const estado = await texto(d.getByRole("status").first());
    console.log("     hoja:", estado);
    comprobar(/Instagram: publicado/.test(estado) && /Facebook: publicado/.test(estado) && /Historia: publicada/.test(estado), "la hoja: Instagram, Facebook e historia, con sus «Ver»");
    await cerrarHoja(page);
    // 17 · Lo que dio el lunes (Renata Saldaña): las visitas y quién fue.
    const lunes = await abrirDia(page, "Renata Saldaña");
    await foto(page, "17-dia-medicion");
    const m = await texto(lunes.getByRole("status").first());
    comprobar(/31 visitas a su ficha desde Instagram/.test(m) && /3 dieron «Voy» a una de sus fechas después de verla/.test(m), "lo que dio: 31 visitas y 3 que fueron");
    await cerrarHoja(page);
    // 18 · Quitar el sábado.
    const sab = await abrirDia(page, "Sáb 10");
    await alFondo(sab);
    await tocar(page, sab.getByRole("button", { name: "Quitar de la semana" }), "Quitar de la semana");
    await page.getByRole("dialog").getByText("Quitado: este día no se publica.").waitFor({ timeout: 20000 });
    await foto(page, "18-dia-quitado");
    await cerrarHoja(page);
    await page.waitForFunction(() => /Quitado: este día no se publica/.test(document.querySelector("main")?.textContent ?? ""), null, { timeout: 20000 });
    await foto(page, "19-semana-quitado");
    // 20 · «Esta semana» (el jueves) y 21 · el descanso.
    await abrirDia(page, "Jue 8");
    await foto(page, "20-dia-esta-semana");
    comprobar(/Este fin en San Luis Potosí/.test(await texto(page.getByRole("dialog").locator("textarea, [class*=resumen]"))), "«Esta semana»: el texto con los eventos del fin");
    await cerrarHoja(page);
    const dom = await abrirDia(page, "Dom 11");
    await foto(page, "21-dia-descanso");
    comprobar((await dom.getByRole("button", { name: "Poner un lugar este día" }).count()) === 1, "el descanso: «Poner un lugar este día»");
    await cerrarHoja(page);
    // 22 · La página de la bio: lo publicado esta semana, con su marca de origen.
    await page.goto(`${base}/ig`, { waitUntil: "load" });
    await page.locator("main li").first().waitFor();
    await foto(page, "22-bio");
    const enlaces = await page.locator("main li a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    console.log("     bio:", enlaces.join(" "));
    comprobar(enlaces.length >= 3 && enlaces.every((h) => /utm_source=instagram&utm_medium=bio&utm_campaign=semana-2026-10-05&utm_content=/.test(h)), "la bio: lo publicado, cada ficha con su marca de origen");
    // 23 · La portada de Administración dice cómo va la semana.
    await page.goto(`${base}/admin`, { waitUntil: "load" });
    const rIg = page.locator("a[href='/admin/instagram']");
    await rIg.waitFor();
    await rIg.evaluate((e) => e.scrollIntoView({ block: "center" }));
    await foto(page, "23-portada-admin");
    comprobar(/Semana: \d de \d programadas/.test(await texto(rIg)), "la portada: «Semana: N de M programadas»");
    await ctx.close();
  }
  // 320, 390 y 430: la semana, un día y la hoja abajo, sin textos cortados, sin desplazamiento a lo ancho y sin toques chicos en lo nuevo.
  for (const ancho of [320, 390, 430]) {
    const { ctx, page } = await contexto({ ancho });
    await page.goto(`${semanaUrl}&semana=viene`, { waitUntil: "load" });
    await listaLista(page);
    if (ancho !== 390) await foto(page, `24-semana-${ancho}`);
    const enLista = await cortados(page);
    const chicosLista = await toquesChicos(page);
    const hoja = await abrirDia(page, "Vie 16");
    if (ancho !== 390) await foto(page, `25-dia-artista-${ancho}`);
    const enHoja = await cortados(page);
    await alFondo(hoja);
    const enHojaAbajo = await cortados(page);
    const chicosHoja = await toquesChicos(page);
    const aLoAncho = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const todos = [...enLista, ...enHoja, ...enHojaAbajo];
    comprobar(!todos.length && aLoAncho <= 0, `a ${ancho}: sin textos cortados ni desplazamiento a lo ancho${todos.length ? ` (${todos.join(" | ")})` : ""}`);
    const chicos = [...chicosLista, ...chicosHoja];
    comprobar(!chicos.length, `a ${ancho}: ningún toque menor de 44 en lo nuevo${chicos.length ? ` (${chicos.join(" | ")})` : ""}`);
    await ctx.close();
  }
} finally {
  await browser.close();
  fs.rmSync(carpetaFotos, { recursive: true, force: true });
  fs.writeFileSync(path.join(SALIDA, "recorrido.txt"), `${recorrido.join("\n")}\n\n${fallas.length ? `FALLAS:\n${fallas.join("\n")}` : "todo bien"}\n${errores.length ? `errores:\n${errores.join("\n")}` : "sin errores de página ni de consola"}\n`);
}
console.log(errores.length ? `errores de página o consola:\n  ${errores.join("\n  ")}` : "sin errores de página ni de consola");
console.log(fallas.length ? `FALLAS: ${fallas.length}` : "todo bien");
process.exit(fallas.length ? 1 : 0);
