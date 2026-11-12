// Capturas de la bitácora 549 (OL-516): el carrusel de la ficha en las dos hojas que lo enseñan (la del día de la semana de Instagram y la de
// «Publicar en Instagram» de la ficha) y de punta a punta, con la app compilada contra el respaldo local (la sesión de la cuenta de administración;
// `RESPALDO_HISTORIAL=1 RESPALDO_INSTAGRAM_SEMANA=1`: el museo Leonora Carrington (demo) con dos eventos esta semana, el taller del sábado con su
// cartel dibujado y la visita guiada del domingo sin cartel), la API de Instagram y la página de Facebook DE MENTIRA del respaldo y el trabajador de
// verdad (`/api/redes/correr`). Nunca se llama a Instagram ni a Facebook. Chrome real (playwright-core) con la letra de la app, 390×844 a 2×.
// Toques reales: clics por coordenadas. Guarda las imágenes del carrusel que dibuja el servidor (`hoja-*-imagen-n.jpg`).
//   node scripts/ops/auditoria-ui/capturar-slider-ficha.mjs <raíz del árbol> <carpeta de salida>
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

const carpetaFotos = fs.mkdtempSync(path.join(os.tmpdir(), "ol516-fotos-"));
await (await import("./respaldo-local/fotos-historial.mjs")).dibujarFotosHistorial(carpetaFotos);
await (await import("./respaldo-local/fotos-instagram.mjs")).dibujarFotosInstagram(carpetaFotos);

const [pr, pa] = [8889, await puertoLibre()];
const respaldo = `http://127.0.0.1:${pr}`;
const base = `http://127.0.0.1:${pa}`;
const reloj = { RELOJ_FIJO: AHORA, TZ: "America/Mexico_City", NODE_OPTIONS: `--require=${path.join(AQUI, "reloj-fijo.cjs")}` };
const datos = { RESPALDO_HISTORIAL: "1", RESPALDO_INSTAGRAM_SEMANA: "1", RESPALDO_CARRUSEL_DIR: carpetaFotos, RESPALDO_URL: respaldo };
const app = { NEXT_PUBLIC_SUPABASE_URL: respaldo, NEXT_PUBLIC_SUPABASE_ANON_KEY: "llave-anon-inventada", NEXT_PUBLIC_MAPBOX_TOKEN: "pk.inventado", SUPABASE_SERVICE_ROLE_KEY: LLAVE_SERVICIO };
const instagram = { INSTAGRAM_API_URL: `${respaldo}/graph`, INSTAGRAM_TOKEN: "token-inventado", INSTAGRAM_USER_ID: "17841400000000458", FACEBOOK_PAGE_ID: "1374800000000461", CRON_SECRET: "secreto-inventado-516" };
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

const L_LEONORA = "aaaa0001-0000-4000-8000-000000000081";
const LUGAR = "/lugares/museo-leonora-carrington-demo";
/** Las imágenes del carrusel que dibuja el servidor (la ruta de la vista previa con `imagen=n`), a 720. */
const imagenesDelServidor = async (page, ruta, nombre, n) => {
  const archivos = [];
  for (let i = 0; i < n; i++) {
    const b = await page.evaluate(async (u) => { const r = await fetch(u); return r.ok ? Array.from(new Uint8Array(await r.arrayBuffer())) : null; }, `${ruta}${ruta.includes("?") ? "&" : "?"}imagen=${i}`);
    comprobar(!!b, `${nombre}: el servidor dibuja la imagen ${i + 1}`);
    if (b) {
      const archivo = path.join(SALIDA, `${nombre}-imagen-${i + 1}.jpg`);
      fs.writeFileSync(archivo, Buffer.from(b));
      archivos.push(archivo);
    }
  }
  return archivos;
};
/** La tira: tres miniaturas cargadas, la línea, que no desplaza la página y el texto con cada evento. */
async function revisarTira(page, hoja, que) {
  const t = await texto(hoja);
  comprobar(/Sale con 3 imágenes: su tarjeta y sus 2 eventos de esta semana\./.test(t), `${que}: «Sale con 3 imágenes: su tarjeta y sus 2 eventos de esta semana.»`);
  const tira = hoja.getByRole("list", { name: "Imágenes del carrusel" });
  await tira.evaluate((e) => e.scrollIntoView({ block: "center" }));
  await page.waitForFunction(() => [...document.querySelectorAll('[aria-label="Imágenes del carrusel"] img')].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 45000 }).catch(() => comprobar(false, `${que}: las miniaturas cargaron`));
  const alts = await tira.getByRole("img").evaluateAll((xs) => xs.map((x) => x.getAttribute("alt")));
  console.log("     tira:", alts.join(" | "));
  comprobar(alts.length === 3 && /^1: su tarjeta/.test(alts[0]) && /Taller de máscaras/.test(alts[1]) && /Visita guiada/.test(alts[2]), `${que}: la tira lleva la tarjeta, el taller del sábado y la visita guiada del domingo, en ese orden`);
  comprobar(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${que}: la tira no desplaza la página a lo ancho`);
  const valor = await hoja.locator('[name="texto"]').first().inputValue();
  const bloque = valor.match(/Esta semana:\n[^]*?(?=\n\n)/)?.[0] ?? "";
  console.log("     texto:", JSON.stringify(bloque));
  comprobar(/^Esta semana:\nSáb 10 · 11:00 am · Taller de máscaras para familias\nDom 11 · 7:00 pm · Visita guiada: Leonora y el teatro$/.test(bloque), `${que}: el texto nombra cada evento con su día y su hora`);
}
/** Las imágenes del servidor, juntas (como las vería quien desliza). */
async function hojaDeContacto(page, archivos, nombre, titulo) {
  const datos64 = (f) => `data:image/jpeg;base64,${fs.readFileSync(f).toString("base64")}`;
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:16px;background:#f4f2ee;font:600 14px system-ui;color:#222}h2{font-size:15px;margin:0 0 8px}div{display:grid;grid-template-columns:repeat(${archivos.length},1fr);gap:10px}img{width:100%;display:block;border-radius:6px}figure{margin:0}figcaption{margin-top:4px;font-weight:500;font-size:12px}</style>
    <h2>${titulo}</h2><div>${archivos.map((f, i) => `<figure><img src="${datos64(f)}"><figcaption>${i + 1}${i === 0 ? " · la tarjeta" : ""}</figcaption></figure>`).join("")}</div>`);
  await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
  await page.screenshot({ path: path.join(SALIDA, `${nombre}.png`), fullPage: true });
  console.log("  ", nombre);
}

try {
  // 01 a 04 · La hoja del día de hoy (el lugar de la semana: el museo, con dos eventos esta semana): la tarjeta, «Sale con 3 imágenes…», la tira y
  // la historia (la tarjeta sola).
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/instagram?ciudad=san-luis-potosi`, { waitUntil: "load" });
    await page.locator("main li").first().waitFor({ timeout: 30000 });
    await imagenesListas(page, "main");
    await letraDeLaApp(page);
    await tocar(page, page.locator("main li", { hasText: "Hoy · 7:00 pm" }).first().locator("a").first(), "abrir Hoy · 7:00 pm");
    const hoja = page.getByRole("dialog").last();
    await hoja.waitFor();
    await page.waitForFunction(() => !document.querySelector('[role=dialog] [aria-label="Preparando la vista previa"]'), null, { timeout: 30000 });
    await imagenesListas(page, "[role=dialog]");
    comprobar(/Hoy · 7:00 pm · Lugar/.test(await hoja.getAttribute("aria-label")), "la hoja del día del lugar");
    await foto(page, "01-dia-lugar", "[role=dialog]");
    await revisarTira(page, hoja, "hoja del día");
    await foto(page, "02-dia-lugar-tira", "[role=dialog]");
    const src = await hoja.getByRole("list", { name: "Imágenes del carrusel" }).getByRole("img").first().getAttribute("src");
    const id = src.match(/semana\/([0-9a-f-]{36})/)?.[1];
    const archivos = await imagenesDelServidor(page, `/api/instagram/semana/${id}`, "hoja-dia", 3);
    await hoja.locator("[class*=cuerpo]").first().evaluate((c) => c.scrollTo(0, 0));
    await tocar(page, hoja.getByRole("button", { name: "Historia 9:16" }), "Historia 9:16");
    await imagenesListas(page, "[role=dialog]");
    comprobar(/La historia lleva solo su tarjeta\./.test(await texto(hoja)) && (await hoja.getByRole("list", { name: "Imágenes del carrusel" }).count()) === 0, "hoja del día: en la historia, la tarjeta sola");
    await foto(page, "03-dia-lugar-historia", "[role=dialog]");
    await hojaDeContacto(page, archivos, "04-dia-imagenes-del-servidor", "Hoja del día · las imágenes que dibuja el servidor (lugar de la semana)");
    await ctx.close();
  }

  // 05 a 07 · La hoja de «Publicar en Instagram» de la ficha del museo: lo mismo, sin «de la semana».
  {
    const { ctx, page } = await contexto();
    await ficha(page, LUGAR);
    const hoja = await abrirHoja(page);
    await foto(page, "05-ficha-hoja", "[role=dialog]");
    await revisarTira(page, hoja, "hoja de la ficha");
    await foto(page, "06-ficha-hoja-tira", "[role=dialog]");
    const srcs = await hoja.getByRole("list", { name: "Imágenes del carrusel" }).getByRole("img").evaluateAll((xs) => xs.map((x) => x.getAttribute("src")));
    comprobar(srcs.every((s, i) => s.includes(`imagen=${i}`) && s.includes("rotulo=0")), "hoja de la ficha: cada miniatura pide su imagen, sin «de la semana»");
    const archivos = await imagenesDelServidor(page, `/api/instagram/ficha/${L_LEONORA}?tipo=lugar&rotulo=0`, "hoja-ficha", 3);
    await hojaDeContacto(page, archivos, "07-ficha-imagenes-del-servidor", "Hoja de la ficha · las imágenes que dibuja el servidor (a mano, sin «de la semana»)");
    await ctx.close();
  }

  // 08 · De punta a punta con el respaldo: «Publicar ahora» desde la ficha; el trabajador publica el carrusel de 3 en el Instagram de mentira, su
  // historia sola y las 3 fotos en la página de mentira.
  {
    const { ctx, page } = await contexto();
    await ficha(page, LUGAR);
    const hoja = await abrirHoja(page);
    await tocar(page, hoja.getByRole("button", { name: "Publicar ahora" }), "Publicar ahora");
    await page.waitForFunction(() => !document.querySelector('[role=dialog][aria-label="Publicar en Instagram"]'), null, { timeout: 15000 });
    const trabajos = await leer(`redes_trabajos?select=id,estado,pedido&lugar_id=eq.${L_LEONORA}`);
    const aMano = trabajos.find((x) => !x.pedido?.casilla);
    let estado = aMano?.estado;
    for (let i = 0; i < 120 && estado !== "publicado" && estado !== "fallido"; i++) {
      await new Promise((ok) => setTimeout(ok, 500));
      estado = (await leer(`redes_trabajos?select=estado&id=eq.${aMano?.id}`))[0]?.estado;
    }
    comprobar(estado === "publicado", `el trabajador lo publicó en el Instagram de mentira (${estado})`);
    const pubs = await leer(`instagram_publicaciones?select=formato,estado,imagenes,etiquetas,carrusel&lugar_id=eq.${L_LEONORA}`);
    console.log("     publicaciones:", JSON.stringify(pubs.map(({ carrusel, ...x }) => ({ ...x, carrusel: carrusel?.length ?? null }))));
    comprobar(pubs.some((x) => x.estado === "publicada" && x.formato === "carrusel" && x.imagenes === 3 && x.carrusel?.length === 3), "salió el carrusel de 3 imágenes, anotado a nombre del lugar");
    comprobar(pubs.some((x) => x.estado === "publicada" && x.formato === "9x16" && x.imagenes === 1), "y su historia, la tarjeta sola");
    const fbs = await leer(`facebook_publicaciones?select=formato,estado&lugar_id=eq.${L_LEONORA}`);
    console.log("     facebook:", JSON.stringify(fbs));
    comprobar(fbs.some((x) => x.estado === "publicada" && x.formato === "carrusel"), "Facebook espejó el carrusel (todas las fotos)");
    await ficha(page, LUGAR);
    const menu = await abrirMenu(page);
    comprobar(/Salió en Instagram hoy/.test(await texto(menu.getByRole("button", { name: /Publicar en Instagram/ }))), "al volver, el renglón dice «Salió en Instagram hoy»");
    await foto(page, "08-lugar-menu-salio", "[role=dialog]");
    await ctx.close();
  }
} finally {
  await browser.close();
  fs.writeFileSync(path.join(SALIDA, "recorrido.txt"), `${recorrido.join("\n")}\n\n${fallas.length ? `FALLAS:\n${fallas.join("\n")}` : "todo bien"}\n${errores.length ? `errores:\n${errores.join("\n")}` : "sin errores de página ni de consola"}\n`);
}
console.log(errores.length ? `errores de página: ${errores.length}` : "sin errores de página");
console.log(fallas.length ? `FALLAS: ${fallas.length}` : "todo bien");
process.exit(fallas.length ? 1 : 0);
