// Capturas de la bitácora 519 (OL-487): la semana de Instagram se arma sola los miércoles. La app compilada contra el respaldo local
// (`RESPALDO_HISTORIAL=1 RESPALDO_INSTAGRAM_SEMANA=1`, el reloj fijo el miércoles 7 de octubre a las 9:30 de San Luis Potosí), la sesión de la
// cuenta de administración y el trabajador de verdad (`/api/redes/correr`, con un CRON_SECRET inventado): se llama como lo llama el latido de
// Supabase y debe armar «la que viene» de San Luis sin que nadie abra la pestaña. La API de Instagram y Facebook, DE MENTIRA (no se publica nada:
// lo que se arma es para la semana siguiente). Chrome real (playwright-core), 390×844 a 2×.
//   node scripts/ops/auditoria-ui/capturar-semana-miercoles.mjs <raíz del árbol> <carpeta de salida>
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
const AHORA = "2026-10-07T15:30:00Z"; // miércoles 7 de octubre, 9:30 en San Luis Potosí
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
const SECRETO = "secreto-inventado-487";
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

const carpetaFotos = fs.mkdtempSync(path.join(os.tmpdir(), "ol487-fotos-"));
await (await import("./respaldo-local/fotos-historial.mjs")).dibujarFotosHistorial(carpetaFotos);
await (await import("./respaldo-local/fotos-instagram.mjs")).dibujarFotosInstagram(carpetaFotos);

const [pr, pa] = [await puertoLibre(), await puertoLibre()];
const respaldo = `http://127.0.0.1:${pr}`;
const base = `http://127.0.0.1:${pa}`;
const reloj = { RELOJ_FIJO: AHORA, TZ: "America/Mexico_City", NODE_OPTIONS: `--require=${path.join(AQUI, "reloj-fijo.cjs")}` };
const datos = { RESPALDO_HISTORIAL: "1", RESPALDO_INSTAGRAM_SEMANA: "1", RESPALDO_CARRUSEL_DIR: carpetaFotos, RESPALDO_URL: respaldo };
const app = { NEXT_PUBLIC_SUPABASE_URL: respaldo, NEXT_PUBLIC_SUPABASE_ANON_KEY: "llave-anon-inventada", NEXT_PUBLIC_MAPBOX_TOKEN: "pk.inventado", SUPABASE_SERVICE_ROLE_KEY: "llave-servicio-inventada" };
const instagram = { INSTAGRAM_API_URL: `${respaldo}/graph`, INSTAGRAM_TOKEN: "token-inventado", INSTAGRAM_USER_ID: "17841400000000458", FACEBOOK_PAGE_ID: "1374800000000461", CRON_SECRET: SECRETO };
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
const recorrido = [];
const comprobar = (ok, que) => {
  console.log(`     ${ok ? "ok" : "FALLA"} · ${que}`);
  recorrido.push(`${ok ? "ok" : "FALLA"} · ${que}`);
  if (!ok) fallas.push(que);
};
async function contexto() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.clock.setFixedTime(new Date(AHORA));
  await ctx.addCookies([{ name: "sb-127-auth-token", value: cookieDe(ADMIN), url: base }]);
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
const foto = async (page, nombre) => {
  await quieto(page);
  await page
    .waitForFunction(() => [...document.querySelectorAll("main img")].filter((i) => i.loading !== "lazy" || i.getBoundingClientRect().top < innerHeight).every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 45000 })
    .catch(() => comprobar(false, "las imágenes cargaron"));
  await page.screenshot({ path: path.join(SALIDA, `${nombre}.png`) });
  console.log("  ", nombre);
};
const texto = async (l) => (await l.first().innerText()).replace(/\s+/g, " ").trim();
/** Los días de «la que viene» de San Luis (del 12 al 18 de octubre) en el respaldo, con quién los armó. */
const laQueViene = async () => {
  const filas = await (await fetch(`${respaldo}/rest/v1/instagram_semana?select=fecha,tipo,armada_por,trabajo_id&ciudad=eq.san-luis-potosi&fecha=gte.2026-10-12&fecha=lte.2026-10-18&order=fecha`, { headers: { apikey: "llave-servicio-inventada" } })).json();
  return Array.isArray(filas) ? filas : [];
};
/** Lo que hace el latido de Supabase cada minuto: pedir un paso al trabajador con el secreto (aquí con `?esperar=1`, que devuelve qué pasó). */
const latido = async () => {
  const res = await fetch(`${base}/api/redes/correr?esperar=1`, { headers: { Authorization: `Bearer ${SECRETO}` } });
  return { status: res.status, cuerpo: await res.json().catch(() => null) };
};
const portada = async (page, nombre) => {
  await page.goto(`${base}/admin`, { waitUntil: "load" });
  const rIg = page.locator("a[href='/admin/instagram']");
  await rIg.waitFor();
  await rIg.evaluate((e) => e.scrollIntoView({ block: "center" }));
  await foto(page, nombre);
  const t = await texto(rIg);
  const aLoAncho = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const cortado = await rIg.evaluate((a) => [...a.querySelectorAll("*")].some((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).webkitLineClamp === "none"));
  comprobar(aLoAncho <= 0 && !cortado, `${nombre}: el renglón de Instagram sin textos cortados ni desplazamiento a lo ancho`);
  return t;
};

try {
  const { ctx, page } = await contexto();
  // 01 · Antes: nadie ha abierto la pestaña; «la que viene» todavía no está.
  comprobar((await laQueViene()).length === 0, "antes del latido, la que viene no tiene ningún día");
  const antes = await portada(page, "01-portada-se-arma");
  console.log("     portada:", antes);
  comprobar(/Semana: \d de \d programadas · la que viene se arma el miércoles/.test(antes), "la portada dice «la que viene se arma el miércoles»");

  // 02 · Pasa el latido (miércoles 9:30 en San Luis): el trabajador arma la que viene sin que nadie abra la pestaña.
  const l1 = await latido();
  comprobar(l1.status === 200 && l1.cuerpo?.ok === true, `el latido llama al trabajador con el secreto (${l1.status})`);
  const armada = await laQueViene();
  console.log("     la que viene:", armada.map((f) => `${f.fecha} ${f.tipo} ${f.armada_por}${f.trabajo_id ? " en cola" : ""}`).join(" · "));
  comprobar(armada.length === 7 && armada.every((f) => f.armada_por === "latido"), "la que viene: siete días, armados por el latido");
  comprobar(armada.filter((f) => f.tipo !== "descanso").every((f) => !!f.trabajo_id), "cada día que publica espera en la cola a su hora");
  const despues = await portada(page, "02-portada-armada");
  console.log("     portada:", despues);
  comprobar(/Semana: \d de \d programadas · la que viene, armada el mié 7/.test(despues), "la portada dice «la que viene, armada el mié 7»");

  // Otra vuelta del latido el mismo minuto: no arma nada otra vez.
  const l2 = await latido();
  const otraVez = await laQueViene();
  comprobar(l2.status === 200 && otraVez.length === 7 && JSON.stringify(otraVez) === JSON.stringify(armada), "otra vuelta del latido: la misma semana, nada nuevo");

  // 03 · La pestaña «La que viene» enseña lo que armó el latido (y no vuelve a armar).
  await page.goto(`${base}/admin/instagram?ciudad=san-luis-potosi&semana=viene`, { waitUntil: "load" });
  await page.locator("main li").first().waitFor({ timeout: 30000 });
  await foto(page, "03-la-que-viene");
  const renglones = await page.locator("main li").count();
  comprobar(renglones >= 7, `la pestaña enseña los siete días (${renglones} renglones)`);
  comprobar(JSON.stringify(await laQueViene()) === JSON.stringify(armada), "abrir la pestaña no vuelve a armar la que viene");
  await ctx.close();
} finally {
  await browser.close();
  fs.rmSync(carpetaFotos, { recursive: true, force: true });
  const registro = s.registro();
  const avisos = registro.split("\n").filter((l) => l.startsWith("redes:"));
  fs.writeFileSync(path.join(SALIDA, "recorrido.txt"), `${recorrido.join("\n")}\n\n${fallas.length ? `FALLAS:\n${fallas.join("\n")}` : "todo bien"}\n${errores.length ? `errores:\n${errores.join("\n")}` : "sin errores de página ni de consola"}\n${avisos.length ? `registros de la ruta:\n${avisos.join("\n")}` : "sin avisos «redes:» en los registros de la ruta"}\n`);
}
console.log(errores.length ? `errores de página o consola:\n  ${errores.join("\n  ")}` : "sin errores de página ni de consola");
console.log(fallas.length ? `FALLAS: ${fallas.length}` : "todo bien");
process.exit(fallas.length ? 1 : 0);
