// Capturas de la bitácora 503 (OL-471): el bloque «Conexión» de Administración › Instagram en la app compilada contra el respaldo local (la
// sesión de la cuenta de administración), con la API de Instagram DE MENTIRA del respaldo y un token inventado de respaldo: nunca se llama a Meta.
// El estado de `instagram_conexion` lo pone el respaldo (`RESPALDO_INSTAGRAM_CONEXION`): vacío, `todo` o `sin-lectura`; se reinicia el respaldo
// para cada uno. Chrome real (playwright-core), 390×844 a 2×. Toques reales: clics por coordenadas.
//   node scripts/ops/auditoria-ui/capturar-instagram-conectar.mjs <raíz del árbol> <carpeta de salida>
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
const { ADMIN, MARCOS, cookieDe } = await import(path.join(RAIZ, "scripts/ops/auditoria-ui/respaldo-local/fixture.mjs"));
const NEXT = path.join(RAIZ, "node_modules/next/dist/bin/next");
const AQUI = path.join(RAIZ, "scripts/ops/auditoria-ui");
const AHORA = "2026-10-07T16:00:00Z"; // el reloj del respaldo (sus eventos son de esa semana)
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

// El respaldo en su propio puerto (8889 lo usan otras capturas a la vez); la app lo lleva compilado, así que con SIN_BUILD=1 es el mismo.
const [pr, pa] = [Number(process.env.PUERTO_RESPALDO) || 8893, await puertoLibre()];
const respaldo = `http://127.0.0.1:${pr}`;
const base = `http://127.0.0.1:${pa}`;
const reloj = { RELOJ_FIJO: AHORA, TZ: "America/Mexico_City", NODE_OPTIONS: `--require=${path.join(AQUI, "reloj-fijo.cjs")}` };
const app = { NEXT_PUBLIC_SUPABASE_URL: respaldo, NEXT_PUBLIC_SUPABASE_ANON_KEY: "llave-anon-inventada", NEXT_PUBLIC_MAPBOX_TOKEN: "pk.inventado", SUPABASE_SERVICE_ROLE_KEY: "llave-servicio-inventada" };
const instagram = { INSTAGRAM_API_URL: `${respaldo}/graph`, INSTAGRAM_TOKEN: "token-inventado", INSTAGRAM_USER_ID: "17841400000000458", FACEBOOK_PAGE_ID: "1374800000000461", CRON_SECRET: "secreto-inventado-para-la-captura-471" };
let r = null;
async function respaldoCon(modo) {
  if (r) {
    r.kill();
    await new Promise((ok) => (r.exitCode !== null ? ok() : r.once("exit", ok)));
  }
  r = lanzar([path.join(AQUI, "respaldo-local/server.mjs"), String(pr)], { ...reloj, RESPALDO_INSTAGRAM_CONEXION: modo });
  await esperar(`${respaldo}/rest/v1/eventos?select=id&limit=1`, r);
}
await respaldoCon("");
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
async function contexto(ancho = 390) {
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
const foto = async (page, nombre) => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(SALIDA, `${nombre}.png`) });
  console.log("  ", nombre);
};
async function tocar(page, loc) {
  await loc.evaluate((e) => e.scrollIntoView({ block: "center" }));
  const b = await loc.boundingBox();
  const [x, y] = [b.x + b.width / 2, b.y + b.height / 2];
  comprobar(await loc.evaluate((e, [x, y]) => e.contains(document.elementFromPoint(x, y)), [x, y]), "nada tapa lo que se toca");
  await page.mouse.click(x, y);
}
const texto = (l) => l.innerText().then((x) => x.replace(/\s+/g, " ").trim());
/** Los textos cortados del bloque: lo que pasa de su caja. */
const cortados = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("main section:first-of-type *, main [role=status], main [role=alert]")]
      .filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && el.scrollWidth > el.clientWidth + 1)
      .map((el) => `«${el.textContent.trim().slice(0, 40)}» ${el.scrollWidth}>${el.clientWidth}`),
  );
async function abrir(consulta = "", ancho = 390) {
  const c = await contexto(ancho);
  await c.page.goto(`${base}/admin/instagram${consulta}`, { waitUntil: "load" });
  await c.page.getByRole("heading", { name: "Conexión" }).waitFor();
  return c;
}
const bloque = (page) => page.locator("main section", { has: page.getByRole("heading", { name: "Conexión" }) }).locator("li");

try {
  // 01 · Sin conexión propia: el token de respaldo de Vercel. Tocar «Conectar Instagram» en local (http) no sale a Meta: vuelve con su frase.
  {
    const { ctx, page } = await abrir("?ciudad=san-luis-potosi");
    const t = await texto(bloque(page));
    console.log("     bloque:", t);
    comprobar(t === "Sin conexión propia Usa el token de respaldo Conectar Instagram", "sin conexión propia: usa el token de respaldo");
    const grupos = (await page.locator("main h2").allInnerTexts()).map((x) => x.replace(/\s+/g, " "));
    comprobar(grupos[0] === "Conexión" && grupos.some((g) => g.startsWith("Para publicar")), `«Conexión» arriba de la lista (${grupos.join(" | ")})`);
    for (const ancho of [320, 390, 430]) {
      await page.setViewportSize({ width: ancho, height: 844 });
      const fuera = await cortados(page);
      comprobar(!fuera.length, `a ${ancho}, nada cortado${fuera.length ? `: ${fuera.join(", ")}` : ""}`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await foto(page, "01-sin-conexion");
    const ida = page.waitForResponse((q) => q.url().includes("/api/instagram/conectar"));
    await tocar(page, page.getByRole("link", { name: "Conectar Instagram" }));
    const respuesta = await ida;
    console.log("     /api/instagram/conectar:", respuesta.status(), respuesta.headers().location ?? "");
    await page.locator("main").getByRole("alert").waitFor();
    const aviso = await texto(page.locator("main").getByRole("alert"));
    console.log("     aviso:", aviso);
    comprobar(aviso === "Conectar Instagram solo funciona en somosnosotros.org.", "en local (http) no sale a Meta y lo dice llano");
    comprobar(await page.waitForFunction(() => !location.search.includes("error"), null, { timeout: 5000 }).then(() => true, () => false), "la dirección pierde ?error");
    await foto(page, "02-error-solo-en-el-dominio");
    await ctx.close();
  }
  // 03 · La vuelta con un error de Meta: la página no la administra quien entró.
  {
    const { ctx, page } = await abrir("?error=pagina");
    comprobar((await texto(page.locator("main").getByRole("alert"))) === "La cuenta que entró no administra la página Somos Nosotrxs.", "error de la vuelta: su frase llana");
    await foto(page, "03-error-pagina");
    await tocar(page, page.getByRole("button", { name: "Cerrar el aviso" }));
    await page.locator("main").getByRole("alert").waitFor({ state: "detached" });
    comprobar(true, "la ✕ cierra el aviso");
    await ctx.close();
  }
  // 04 y 05 · Conectada: la vuelta con «Instagram quedó conectado» y, al recargar, solo el renglón.
  await respaldoCon("todo");
  {
    const { ctx, page } = await abrir("?conectado=1");
    comprobar((await texto(page.locator("main").getByRole("status"))) === "Instagram quedó conectado", "la vuelta confirma en una línea");
    const t = await texto(bloque(page));
    console.log("     bloque:", t);
    comprobar(t === "Conectada como Somos Nosotrxs (@smsnstrsapp) Publica y lee cuentas · desde el 7 de octubre Reconectar", "conectada: cuenta, qué puede y desde cuándo");
    await foto(page, "04-conectada-vuelta");
    await page.reload({ waitUntil: "load" });
    await page.getByRole("heading", { name: "Conexión" }).waitFor();
    comprobar((await page.locator("main").getByRole("status").count()) === 0, "al recargar no repite la confirmación");
    for (const ancho of [320, 390, 430]) {
      await page.setViewportSize({ width: ancho, height: 844 });
      const fuera = await cortados(page);
      comprobar(!fuera.length, `a ${ancho}, nada cortado${fuera.length ? `: ${fuera.join(", ")}` : ""}`);
    }
    await page.setViewportSize({ width: 320, height: 844 });
    await foto(page, "05b-conectada-320");
    await page.setViewportSize({ width: 390, height: 844 });
    await foto(page, "05-conectada");
    await ctx.close();
  }
  // 06 · Sin el permiso de leer cuentas.
  await respaldoCon("sin-lectura");
  {
    const { ctx, page } = await abrir();
    comprobar(/Falta el permiso para leer cuentas: reconecta Reconectar$/.test(await texto(bloque(page))), "sin el permiso de leer cuentas: pide reconectar");
    await foto(page, "06-falta-permiso-leer");
    await ctx.close();
  }
  // Las rutas: sin sesión de administración, 403; sin `state`, la vuelta no llama a nada y vuelve con su frase.
  {
    const sin = await fetch(`${base}/api/instagram/conectar`, { redirect: "manual" });
    comprobar(sin.status === 403, `/api/instagram/conectar sin sesión: ${sin.status}`);
    const otra = await fetch(`${base}/api/instagram/vuelta?code=x&state=y`, { redirect: "manual", headers: { cookie: `sb-127-auth-token=${cookieDe(MARCOS)}` } });
    comprobar(otra.status === 403, `/api/instagram/vuelta con una cuenta que no es de la administración: ${otra.status}`);
    const admin = await fetch(`${base}/api/instagram/vuelta?code=x&state=y`, { redirect: "manual", headers: { cookie: `sb-127-auth-token=${cookieDe(ADMIN)}` } });
    comprobar(admin.status === 303 && /\/admin\/instagram\?error=origen$/.test(admin.headers.get("location") ?? ""), `la vuelta en local (http): ${admin.status} → ${admin.headers.get("location")}`);
  }
} finally {
  await browser.close();
}
console.log(errores.length ? `errores de página o consola:\n  ${errores.join("\n  ")}` : "sin errores de página ni de consola");
console.log(fallas.length ? `FALLAS: ${fallas.length}` : "todo bien");
process.exit(fallas.length ? 1 : 0);
