// Capturas de la bitácora 548 (OL-515): «Publicar en Instagram» desde la ficha de un lugar y de un artista, con la app compilada contra el respaldo
// local (la sesión de la cuenta de administración; `RESPALDO_HISTORIAL=1 RESPALDO_INSTAGRAM_SEMANA=1`: las fichas completas de demo con sus fotos
// dibujadas y Renata Saldaña ya publicada el lunes), la API de Instagram y la página de Facebook DE MENTIRA del respaldo y el trabajador de verdad
// (`/api/redes/correr`, con un CRON_SECRET inventado: «Publicar ahora» lo pide en seguida con `after()`). Nunca se llama a Instagram ni a Facebook.
// Chrome real (playwright-core) con la letra de la app, 390×844 a 2×. Toques reales: clics por coordenadas. Guarda las tarjetas que dibuja el
// servidor (`tarjeta-*.jpg`) y las pone juntas: la de la semana y la publicada a mano (sin «de la semana»).
//   node scripts/ops/auditoria-ui/capturar-publicar-desde-ficha.mjs <raíz del árbol> <carpeta de salida>
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
const { ADMIN, cookieDe, LLAVE_SERVICIO } = await import(path.join(RAIZ, "scripts/ops/auditoria-ui/respaldo-local/fixture.mjs"));
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

const carpetaFotos = fs.mkdtempSync(path.join(os.tmpdir(), "ol515-fotos-"));
await (await import("./respaldo-local/fotos-historial.mjs")).dibujarFotosHistorial(carpetaFotos);
await (await import("./respaldo-local/fotos-instagram.mjs")).dibujarFotosInstagram(carpetaFotos);

const [pr, pa] = [8889, await puertoLibre()];
const respaldo = `http://127.0.0.1:${pr}`;
const base = `http://127.0.0.1:${pa}`;
const reloj = { RELOJ_FIJO: AHORA, TZ: "America/Mexico_City", NODE_OPTIONS: `--require=${path.join(AQUI, "reloj-fijo.cjs")}` };
const datos = { RESPALDO_HISTORIAL: "1", RESPALDO_INSTAGRAM_SEMANA: "1", RESPALDO_CARRUSEL_DIR: carpetaFotos, RESPALDO_URL: respaldo };
const app = { NEXT_PUBLIC_SUPABASE_URL: respaldo, NEXT_PUBLIC_SUPABASE_ANON_KEY: "llave-anon-inventada", NEXT_PUBLIC_MAPBOX_TOKEN: "pk.inventado", SUPABASE_SERVICE_ROLE_KEY: LLAVE_SERVICIO };
const instagram = { INSTAGRAM_API_URL: `${respaldo}/graph`, INSTAGRAM_TOKEN: "token-inventado", INSTAGRAM_USER_ID: "17841400000000458", FACEBOOK_PAGE_ID: "1374800000000461", CRON_SECRET: "secreto-inventado-515" };
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

/** Lo que guarda el respaldo (con la llave de servicio inventada): para comprobar el trabajo que quedó en la cola. */
const leer = async (ruta) => (await fetch(`${respaldo}/rest/v1/${ruta}`, { headers: { apikey: LLAVE_SERVICIO, Authorization: `Bearer ${LLAVE_SERVICIO}` } })).json();

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--hide-scrollbars"] });
const errores = [];
const fallas = [];
const comprobar = (ok, que) => {
  console.log(`     ${ok ? "ok" : "FALLA"} · ${que}`);
  if (!ok) fallas.push(que);
};
const recorrido = [];
/** Un `visualViewport` propio que `window.__teclado(px)` encoge, como `medir-pantallas.mjs` («area»): Chromium no saca el teclado de iOS. */
const simularVisualViewport = () => {
  const vv = new EventTarget();
  let tapado = 0;
  Object.defineProperties(vv, {
    height: { get: () => window.innerHeight - tapado },
    width: { value: window.innerWidth },
    offsetTop: { value: 0 },
    offsetLeft: { value: 0 },
    scale: { value: 1 },
    pageTop: { get: () => window.scrollY },
    pageLeft: { value: 0 },
  });
  Object.defineProperty(window, "visualViewport", { configurable: true, value: vv });
  window.__teclado = (px) => {
    tapado = px;
    vv.dispatchEvent(new Event("resize"));
  };
};
async function contexto() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.clock.setFixedTime(new Date(AHORA));
  await ctx.addCookies([{ name: "sb-127-auth-token", value: cookieDe(ADMIN), url: base }]);
  await ctx.addInitScript(simularVisualViewport);
  await ctx.route("**/_vercel/**", (q) => q.fulfill({ contentType: "text/javascript", body: "" }));
  const IMAGEN = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#b9b4a8"/></svg>';
  await ctx.route((u) => u.hostname !== "127.0.0.1", (q) => (q.request().resourceType() === "image" ? q.fulfill({ contentType: "image/svg+xml", body: IMAGEN }) : q.fulfill({ status: 204, body: "" })));
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(String(e.message).slice(0, 300)));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource: the server responded with a status of 404/.test(m.text()) && errores.push(`consola: ${m.text().slice(0, 300)}`));
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
  const debajo = await page.evaluate(([px, py]) => { const e = document.elementFromPoint(px, py); return e ? (e.closest("a,button,[role=tab],[role=checkbox]")?.textContent ?? e.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 60) : null; }, [x, y]);
  await page.mouse.click(x, y);
  recorrido.push(`${que ?? "toque"} → ${debajo}`);
}
const texto = async (l) => (await l.first().innerText()).replace(/\s+/g, " ").trim();
const alFondo = (hoja) => hoja.locator("[class*=cuerpo]").first().evaluate((c) => c.scrollTo(0, c.scrollHeight));
const letraDeLaApp = async (page) => comprobar(await page.evaluate(() => [...document.fonts].some((f) => /Bricolage/i.test(f.family) && f.status === "loaded")), "la letra de la app (Bricolage) cargó");
/** Abre el «···» de la ficha (solo el renglón nuevo cuenta) y deja el menú abierto. */
async function abrirMenu(page) {
  await tocar(page, page.getByRole("button", { name: "Más acciones" }), "···");
  const menu = page.getByRole("dialog", { name: "Más acciones" });
  await menu.waitFor();
  return menu;
}
async function abrirHoja(page) {
  const menu = await abrirMenu(page);
  await tocar(page, menu.getByRole("button", { name: /Publicar en Instagram/ }), "Publicar en Instagram");
  const hoja = page.getByRole("dialog", { name: "Publicar en Instagram" });
  await hoja.waitFor();
  await page.waitForFunction(() => !document.querySelector('[role=dialog] [aria-label="Preparando la vista previa"]'), null, { timeout: 30000 });
  await imagenesListas(page, "[role=dialog]");
  return hoja;
}
const ficha = async (page, ruta) => {
  await page.goto(`${base}${ruta}`, { waitUntil: "load" });
  await page.locator("main h1").first().waitFor({ timeout: 30000 });
  await quieto(page);
};
/** La tarjeta que dibuja el servidor (la de la ficha, con o sin «de la semana»), a 720. */
const tarjeta = async (page, id, tipo, nombre, rotulo, formato = "4x5") => {
  const b = await page.evaluate(async (u) => { const r = await fetch(u); return r.ok ? Array.from(new Uint8Array(await r.arrayBuffer())) : null; }, `/api/instagram/ficha/${id}?tipo=${tipo}&formato=${formato}${rotulo ? "" : "&rotulo=0"}`);
  const archivo = path.join(SALIDA, `tarjeta-${nombre}-${formato}-${rotulo ? "semana" : "a-mano"}.jpg`);
  if (b) fs.writeFileSync(archivo, Buffer.from(b));
  comprobar(!!b, `la tarjeta ${nombre} ${formato} ${rotulo ? "de la semana" : "a mano"} se dibuja en el servidor`);
  return b ? archivo : null;
};

const L_LEONORA = "aaaa0001-0000-4000-8000-000000000081";
const A_VALERIA = "cccc0015-0000-4000-8000-000000000009";
const LUGAR = "/lugares/museo-leonora-carrington-demo";
const ARTISTA_PUBLICADA = "/artistas/renata-saldana-demo";
const ARTISTA_PROGRAMADO = "/artistas/inigo-montalvo-demo";

try {
  // 01 a 04 · El lugar: el renglón en el «···», la hoja (la tarjeta, a quién etiqueta, la ubicación, el texto y Facebook) y el teclado.
  {
    const { ctx, page } = await contexto();
    await ficha(page, LUGAR);
    await letraDeLaApp(page);
    const menu = await abrirMenu(page);
    const renglon = menu.getByRole("button", { name: /Publicar en Instagram/ });
    comprobar(/Publicar en Instagram En @smsnstrsapp/.test(await texto(renglon)), "el renglón del lugar: «Publicar en Instagram · En @smsnstrsapp»");
    await foto(page, "01-lugar-menu", "[role=dialog]");
    await tocar(page, renglon, "Publicar en Instagram");
    const hoja = page.getByRole("dialog", { name: "Publicar en Instagram" });
    await hoja.waitFor();
    await page.waitForFunction(() => !document.querySelector('[role=dialog] [aria-label="Preparando la vista previa"]'), null, { timeout: 30000 });
    await foto(page, "02-lugar-hoja", "[role=dialog]");
    const t = await texto(hoja);
    comprobar(/Sale ahora en @smsnstrsapp, con su historia\./.test(t), "dice dónde sale, con su historia");
    comprobar((await hoja.locator("img").first().getAttribute("src")).endsWith("rotulo=0"), "la vista previa es la tarjeta sin «de la semana»");
    comprobar((await hoja.getByRole("button", { name: "Quitar @museoleonoracarrington.demo" }).count()) === 1, "la etiqueta de su cuenta, con su ✕");
    await alFondo(hoja);
    await foto(page, "03-lugar-hoja-abajo", "[role=dialog]");
    comprobar(/Ubicación|Sin ubicación/.test(await texto(hoja)) && (await hoja.getByRole("checkbox", { name: /También en Facebook/ }).count()) === 1, "abajo: la ubicación, el texto y «También en Facebook»");
    const boton = hoja.getByRole("button", { name: "Publicar ahora" });
    const caja = await boton.boundingBox();
    comprobar(caja && caja.y + caja.height <= 844 && caja.height >= 44, "«Publicar ahora» en el pie, entero y de 44 o más");
    // El texto con el teclado: se abre a pantalla completa (ui/CampoLargo) y el área visible se encoge 336 px, como el iPhone con su teclado.
    await tocar(page, hoja.getByRole("button", { name: "Texto de la publicación" }), "Texto de la publicación");
    const capa = page.getByRole("dialog", { name: "Texto de la publicación" });
    await capa.waitFor();
    await page.evaluate(() => window.__teclado(336));
    await page.keyboard.type(" ¡Hoy abrimos de noche!");
    await quieto(page, 400);
    // Un rectángulo donde estaría el teclado, para que la captura diga lo que tapa (Chromium no lo saca).
    await page.evaluate(() => {
      const k = document.createElement("div");
      k.id = "teclado-simulado";
      k.textContent = "Teclado (simulado: 336 px)";
      Object.assign(k.style, { position: "fixed", left: 0, right: 0, bottom: 0, height: "336px", background: "rgba(206,210,217,.96)", color: "#555", font: "15px system-ui", display: "grid", placeItems: "center", zIndex: 2147483647 });
      document.body.append(k);
    });
    const listo = await page.getByRole("button", { name: "Listo" }).boundingBox();
    const area = await capa.locator("textarea").boundingBox();
    comprobar(listo && listo.y >= 0 && listo.y + listo.height <= 508, "con el teclado, «Listo» queda a la vista (encima del teclado)");
    comprobar(area && area.y < 508 && area.y + Math.min(area.height, 60) <= 508, "y el área de texto empieza dentro de lo visible");
    await foto(page, "04-lugar-texto-teclado");
    await page.evaluate(() => document.getElementById("teclado-simulado")?.remove());
    await page.evaluate(() => window.__teclado(0));
    await tocar(page, page.getByRole("button", { name: "Listo" }), "Listo");
    // El pie con el teclado: el campo ya cerrado y el área visible encogida (como `medir`): el botón sigue sobre el teclado.
    comprobar((await hoja.getByRole("button", { name: "Volver al texto del sistema" }).count()) === 1, "lo escrito a mano ofrece «Volver al texto del sistema»");
    await ctx.close();
  }

  // 05 y 06 · El artista que ya salió (Renata Saldaña, el lunes): el renglón lo dice; «Publicar otra vez» y su confirmación.
  {
    const { ctx, page } = await contexto();
    await ficha(page, ARTISTA_PUBLICADA);
    const menu = await abrirMenu(page);
    const renglon = await texto(menu.getByRole("button", { name: /Publicar en Instagram/ }));
    console.log("     renglón:", renglon);
    comprobar(/Publicar en Instagram Salió en Instagram (hace \d+ días|ayer)/.test(renglon), "el renglón del artista: «Salió en Instagram hace …»");
    await foto(page, "05-artista-menu", "[role=dialog]");
    await tocar(page, menu.getByRole("button", { name: /Publicar en Instagram/ }), "Publicar en Instagram");
    const hoja = page.getByRole("dialog", { name: "Publicar en Instagram" });
    await hoja.waitFor();
    await page.waitForFunction(() => !document.querySelector('[role=dialog] [aria-label="Preparando la vista previa"]'), null, { timeout: 30000 });
    await foto(page, "06-artista-hoja-salio", "[role=dialog]");
    comprobar(/Se etiqueta en la foto, se menciona en el texto y se invita a su cuenta como coautora/.test(await texto(hoja)), "el artista: etiquetado e invitado como coautor");
    await tocar(page, hoja.getByRole("button", { name: "Publicar otra vez" }), "Publicar otra vez");
    const conf = page.getByRole("dialog", { name: /¿Publicar otra vez a Renata Saldaña/ });
    await conf.waitFor();
    await foto(page, "07-artista-otra-vez", "[role=dialog]");
    comprobar(/La publicación anterior sigue en Instagram: si ya no la quieres, se borra desde la cuenta\./.test(await texto(conf)), "la confirmación dice que la anterior sigue en Instagram");
    comprobar((await conf.getByRole("button", { name: "Sí, publicar otra vez" }).count()) === 1 && (await conf.getByRole("button", { name: "Mejor no" }).count()) === 1, "«Sí, publicar otra vez» / «Mejor no»");
    await tocar(page, conf.getByRole("button", { name: "Mejor no" }), "Mejor no");
    await page.getByRole("dialog", { name: "Publicar en Instagram" }).waitFor();
    await ctx.close();
  }

  // 08 · Ya programado en la semana: se arma la semana (al abrir su pestaña) e Íñigo Montalvo queda el viernes; su hoja lo dice.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/instagram?ciudad=san-luis-potosi`, { waitUntil: "load" });
    await page.locator("main li").first().waitFor({ timeout: 30000 });
    await quieto(page, 1500);
    await ficha(page, ARTISTA_PROGRAMADO);
    const hoja = await abrirHoja(page);
    await foto(page, "08-artista-programado", "[role=dialog]");
    const t = await texto(hoja);
    console.log("     programado:", t.match(/La semana de Instagram[^.]*\./)?.[0]);
    comprobar(/La semana de Instagram ya la tiene programada para el vie 9/.test(t), "avisa que la semana ya lo tiene programado (el viernes)");
    await ctx.close();
  }

  // 09 · Las tarjetas: la de la semana y la publicada a mano (sin «de la semana»), juntas.
  {
    const { ctx, page } = await contexto();
    await ficha(page, LUGAR);
    const pares = [];
    for (const [id, tipo, nombre] of [[L_LEONORA, "lugar", "leonora"], [A_VALERIA, "artista", "valeria"]]) pares.push([nombre, await tarjeta(page, id, tipo, nombre, true), await tarjeta(page, id, tipo, nombre, false)]);
    const datos64 = (f) => (f ? `data:image/jpeg;base64,${fs.readFileSync(f).toString("base64")}` : "");
    await page.setContent(`<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:16px;background:#f4f2ee;font:600 14px system-ui;color:#222}h2{font-size:15px;margin:10px 0 6px}div{display:grid;grid-template-columns:1fr 1fr;gap:10px}figure{margin:0}img{width:100%;display:block;border-radius:6px}figcaption{margin-top:4px;font-weight:500;font-size:12px}</style>
      ${pares.map(([n, a, b]) => `<h2>${n === "leonora" ? "Lugar" : "Artista"}</h2><div><figure><img src="${datos64(a)}"><figcaption>Semana (con rótulo)</figcaption></figure><figure><img src="${datos64(b)}"><figcaption>A mano (sin «de la semana»)</figcaption></figure></div>`).join("")}`);
    await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
    await page.screenshot({ path: path.join(SALIDA, "09-tarjetas-semana-y-a-mano.png"), fullPage: true });
    console.log("   09-tarjetas-semana-y-a-mano");
    comprobar(pares.every(([, a, b]) => a && b && fs.readFileSync(a).length !== fs.readFileSync(b).length), "la tarjeta a mano no es la misma que la de la semana");
    await ctx.close();
  }

  // 10 · De punta a punta con el respaldo: «Publicar ahora» del lugar guarda el trabajo por la función de la base (sin `casilla`) y el trabajador
  // lo publica en el Instagram de mentira; al volver, el renglón dice que salió.
  {
    const { ctx, page } = await contexto();
    await ficha(page, LUGAR);
    const hoja = await abrirHoja(page);
    await tocar(page, hoja.getByRole("button", { name: "Publicar ahora" }), "Publicar ahora");
    await page.waitForFunction(() => !document.querySelector('[role=dialog][aria-label="Publicar en Instagram"]'), null, { timeout: 15000 });
    const trabajos = await leer(`redes_trabajos?select=id,lugar_id,evento_id,estado,pedido&lugar_id=eq.${L_LEONORA}`);
    const aMano = trabajos.find((x) => !x.pedido?.casilla);
    console.log("     trabajo:", JSON.stringify(aMano));
    comprobar(!!aMano && aMano.evento_id === null && JSON.stringify(Object.keys(aMano.pedido).sort()) === JSON.stringify(["facebook", "quitadas", "texto", "tipo"]), "el trabajo queda en la cola sin evento ni día de la semana, con el pedido limpio");
    let estado = aMano?.estado;
    for (let i = 0; i < 60 && estado !== "publicado" && estado !== "fallido"; i++) {
      await new Promise((ok) => setTimeout(ok, 500));
      estado = (await leer(`redes_trabajos?select=estado&id=eq.${aMano?.id}`))[0]?.estado;
    }
    comprobar(estado === "publicado", `el trabajador lo publicó en el Instagram de mentira (${estado})`);
    const pubs = await leer(`instagram_publicaciones?select=formato,estado,etiquetas&lugar_id=eq.${L_LEONORA}`);
    console.log("     publicaciones:", JSON.stringify(pubs));
    comprobar(pubs.filter((x) => x.estado === "publicada").map((x) => x.formato).sort().join() === "4x5,9x16", "salieron la publicación 4:5 y su historia, a nombre del lugar");
    await ficha(page, LUGAR);
    const menu = await abrirMenu(page);
    const renglon = await texto(menu.getByRole("button", { name: /Publicar en Instagram/ }));
    comprobar(/Salió en Instagram hoy/.test(renglon), "al volver, el renglón dice «Salió en Instagram hoy»");
    await foto(page, "10-lugar-menu-salio", "[role=dialog]");
    await ctx.close();
  }
} finally {
  await browser.close();
  fs.writeFileSync(path.join(SALIDA, "recorrido.txt"), `${recorrido.join("\n")}\n\n${fallas.length ? `FALLAS:\n${fallas.join("\n")}` : "todo bien"}\n${errores.length ? `errores:\n${errores.join("\n")}` : "sin errores de página ni de consola"}\n`);
}
console.log(errores.length ? `errores de página: ${errores.length}` : "sin errores de página");
console.log(fallas.length ? `FALLAS: ${fallas.length}` : "todo bien");
process.exit(fallas.length ? 1 : 0);
