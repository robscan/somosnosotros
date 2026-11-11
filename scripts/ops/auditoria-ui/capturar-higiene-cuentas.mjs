// Capturas de la bitácora 545 (OL-512): perfiles sin nombre. La app compilada contra el respaldo local con `RESPALDO_SIN_NOMBRE=1` (Ana es una
// cuenta nueva sin nombre). Chrome real (playwright-core, channel: 'chrome'), 390×844 a 2×, reloj fijo.
// node scripts/ops/auditoria-ui/capturar-higiene-cuentas.mjs <raíz del árbol> <carpeta de salida>
// Compila `.next` contra el respaldo (SIN_BUILD=1 usa el `.next` que ya hay). Correrlo en un árbol SIN `.env`.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

const [RAIZ, SALIDA] = process.argv.slice(2).map((p) => path.resolve(p));
if (fs.existsSync(path.join(RAIZ, ".env"))) { console.error("hay un .env en el árbol: la app cargaría llaves reales. Córrelo en un árbol sin .env"); process.exit(1); }
const { chromium } = await import(path.join(RAIZ, "node_modules/playwright-core/index.mjs"));
const { ANA, MARCOS, cookieDe } = await import(path.join(RAIZ, "scripts/ops/auditoria-ui/respaldo-local/fixture.mjs"));
const NEXT = path.join(RAIZ, "node_modules/next/dist/bin/next");
const AQUI = path.join(RAIZ, "scripts/ops/auditoria-ui");
const AHORA = "2026-11-09T16:00:00Z"; // lunes 9 de noviembre, 10:00 en San Luis Potosí
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

const [pr, pa] = [await puertoLibre(), await puertoLibre()];
const respaldo = `http://127.0.0.1:${pr}`;
const base = `http://127.0.0.1:${pa}`;
const reloj = { RELOJ_FIJO: AHORA, TZ: "America/Mexico_City", NODE_OPTIONS: `--require=${path.join(AQUI, "reloj-fijo.cjs")}` };
const app = { NEXT_PUBLIC_SUPABASE_URL: respaldo, NEXT_PUBLIC_SUPABASE_ANON_KEY: "llave-anon-inventada", NEXT_PUBLIC_MAPBOX_TOKEN: "pk.inventado", SUPABASE_SERVICE_ROLE_KEY: "llave-servicio-inventada" };
const r = lanzar([path.join(AQUI, "respaldo-local/server.mjs"), String(pr)], { ...reloj, RESPALDO_SIN_NOMBRE: "1" });
await esperar(`${respaldo}/rest/v1/eventos?select=id&limit=1`, r);
if (!process.env.SIN_BUILD) {
  process.stdout.write("compilando… ");
  const b = spawnSync(process.execPath, [NEXT, "build"], { cwd: RAIZ, env: { ...process.env, ...app }, encoding: "utf8", maxBuffer: 1 << 26 });
  if (b.status !== 0) throw new Error((b.stdout + b.stderr).slice(-3000));
  console.log("listo");
}
const s = lanzar([NEXT, "start", "-p", String(pa)], { ...app, ...reloj });
await esperar(`${base}/entrar`, s);

const IMAGEN = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#b9b4a8"/></svg>';
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--hide-scrollbars"] });

async function contexto(quien) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.clock.setFixedTime(new Date(AHORA));
  if (quien) await ctx.addCookies([{ name: "sb-127-auth-token", value: cookieDe(quien), url: base }]);
  await ctx.route("**/_vercel/**", (q) => q.fulfill({ contentType: "text/javascript", body: "" }));
  await ctx.route((u) => u.hostname !== "127.0.0.1", (q) => (q.request().resourceType() === "image" ? q.fulfill({ contentType: "image/svg+xml", body: IMAGEN }) : q.abort()));
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("  error de página:", String(e.message).slice(0, 200)));
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
const medir = (page, que) => page.evaluate(que).then((m) => console.log("    ", JSON.stringify(m)));

try {
  // a · La ficha de Ana vista por otra cuenta: «Persona nueva» con la inicial «?».
  {
    const { ctx, page } = await contexto(MARCOS);
    await page.goto(`${base}/personas/${ANA}`, { waitUntil: "load" });
    await page.getByRole("heading", { name: "Persona nueva", level: 1 }).waitFor();
    await foto(page, "a-ficha-persona-nueva");
    await medir(page, () => ({ titulo: document.title, h1: document.querySelector("main h1")?.textContent, inicial: document.querySelector("main [aria-hidden=true]")?.textContent, url: location.pathname }));
    await ctx.close();
  }
  // b y c · Ana entra (Inicio): se la lleva una vez a editar su ficha con el nombre abierto y enfocado; con «teclado» (área visible 390×508);
  // vuelve atrás sin ponerlo y no se la vuelve a mandar; en Mi perfil ve «Ponle nombre a tu perfil».
  {
    const { ctx, page } = await contexto(ANA);
    await page.goto(`${base}/`, { waitUntil: "load" });
    await page.waitForURL(/\/ajustes\/editar\?pedir=nombre/, { timeout: 15000 });
    await page.getByRole("textbox", { name: "Nombre" }).waitFor();
    await foto(page, "b1-pedir-nombre-al-entrar");
    await medir(page, () => ({ url: location.pathname + location.search, linea: document.querySelector("main .subtitulo")?.textContent, enfocado: document.activeElement?.getAttribute("aria-label"), marca: sessionStorage.getItem("sn_nombre_pedido") }));
    await page.setViewportSize({ width: 390, height: 508 });
    await page.getByRole("textbox", { name: "Nombre" }).focus();
    await foto(page, "b2-pedir-nombre-con-teclado");
    await medir(page, () => {
      const c = document.querySelector('input[name="nombre"]').getBoundingClientRect();
      const g = [...document.querySelectorAll("button")].find((b) => b.textContent === "Guardar")?.getBoundingClientRect();
      return { campoDentro: c.top >= 0 && c.bottom <= innerHeight, campo: [Math.round(c.top), Math.round(c.bottom)], guardar: g && [Math.round(g.top), Math.round(g.bottom)], alto: innerHeight };
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goBack();
    await page.waitForURL((u) => u.pathname === "/", { timeout: 15000 });
    await quieto(page, 1500);
    await medir(page, () => ({ despuesDeAtras: location.pathname }));
    await page.goto(`${base}/perfil`, { waitUntil: "load" });
    await page.getByText("Ponle nombre a tu perfil").waitFor();
    await quieto(page, 1500);
    await foto(page, "c-mi-perfil-ponle-nombre");
    await medir(page, () => ({ url: location.pathname, h1: document.querySelector("main h1")?.textContent }));
    await ctx.close();
  }
  // d · Quién va con una persona sin nombre: la lista abierta, vista por Marcos.
  {
    const { ctx, page } = await contexto(MARCOS);
    await page.goto(`${base}/eventos/lxs-colocaos-la-ultima-fogueada`, { waitUntil: "load" });
    const boton = page.locator("#quien-va button[aria-expanded]");
    await boton.waitFor();
    await boton.evaluate((b) => b.scrollIntoView({ block: "center" }));
    const c = await boton.boundingBox();
    await page.mouse.click(c.x + c.width / 2, c.y + c.height / 2);
    await page.locator("#quien-va ul").waitFor();
    await page.locator("#quien-va").evaluate((s) => s.scrollIntoView({ block: "start" }));
    await page.mouse.wheel(0, -80);
    await foto(page, "d-quien-va-persona-nueva");
    await medir(page, () => ({ resumen: document.querySelector("#quien-va button b")?.textContent, lista: [...document.querySelectorAll("#quien-va li")].map((l) => l.innerText.replace(/\s+/g, " ").trim()) }));
    await ctx.close();
  }
} finally {
  await browser.close();
}
process.exit(0);
