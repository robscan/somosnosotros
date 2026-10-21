// Capturas de la bitácora 469 (OL-437): el Showcase con los puntajes que propone la base (circulación, actividad y vínculo; obra con lo aceptado)
// y lo fijado a mano: la lista (tarjetas con lo propuesto en contorno discontinuo, lo fijado relleno y «sin datos»), la ficha de Feleal con su
// rúbrica, la hoja de una señal propuesta y la de una fijada con «Volver al propuesto», una ficha con «sin datos» y la tabla a 1280. Con la app
// compilada contra el respaldo local y la sesión de la cuenta de administración del respaldo. Chrome real (playwright-core, channel: 'chrome'),
// 390×844 a 2×; la tabla, 1280×800 a 1×. Toques reales: clics por coordenadas (Playwright).
// node scripts/ops/auditoria-ui/capturar-showcase-puntajes.mjs <raíz del árbol> <carpeta de salida>
// Compila `.next` contra el respaldo (SIN_BUILD=1 usa el `.next` que ya hay, compilado por este script: el respaldo va en el puerto 8879). Correrlo en
// un árbol SIN `.env` (con él se niega a correr).
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
const AHORA = "2026-10-21T16:00:00Z"; // miércoles 21 de octubre, 10:00 en San Luis Potosí
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
const puertoLibre = () =>
  new Promise((ok) => {
    const s = net.createServer().listen(0, () => {
      const p = s.address().port;
      s.close(() => ok(p));
    });
  });
async function esperar(url, h) {
  for (let i = 0; i < 300; i++) {
    if (h.exitCode !== null) throw new Error(`se cerró\n${h.registro()}`);
    try {
      if ((await fetch(url)).status < 500) return;
    } catch {}
    await new Promise((ok) => setTimeout(ok, 200));
  }
  throw new Error(`no respondió: ${url}\n${h.registro()}`);
}

// El respaldo en un puerto fijo: su dirección queda dentro de la app compilada (NEXT_PUBLIC_…), así SIN_BUILD=1 sirve con el `.next` de la vez anterior.
const [pr, pa] = [Number(process.env.PUERTO_RESPALDO ?? 8879), await puertoLibre()];
const respaldo = `http://127.0.0.1:${pr}`;
const base = `http://127.0.0.1:${pa}`;
const reloj = { RELOJ_FIJO: AHORA, TZ: "America/Mexico_City", NODE_OPTIONS: `--require=${path.join(AQUI, "reloj-fijo.cjs")}` };
const app = { NEXT_PUBLIC_SUPABASE_URL: respaldo, NEXT_PUBLIC_SUPABASE_ANON_KEY: "llave-anon-inventada", NEXT_PUBLIC_MAPBOX_TOKEN: "pk.inventado", SUPABASE_SERVICE_ROLE_KEY: "llave-servicio-inventada" };
const r = lanzar([path.join(AQUI, "respaldo-local/server.mjs"), String(pr)], reloj);
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
const errores = [];

async function contexto({ escritorio = false } = {}) {
  const ctx = await browser.newContext(
    escritorio
      ? { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, locale: "es-MX", timezoneId: "America/Mexico_City" }
      : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA, locale: "es-MX", timezoneId: "America/Mexico_City" },
  );
  await ctx.clock.setFixedTime(new Date(AHORA));
  await ctx.addCookies([{ name: "sb-127-auth-token", value: cookieDe(ADMIN), url: base }]);
  await ctx.route("**/_vercel/**", (q) => q.fulfill({ contentType: "text/javascript", body: "" }));
  await ctx.route((u) => u.hostname !== "127.0.0.1", (q) => (q.request().resourceType() === "image" ? q.fulfill({ contentType: "image/svg+xml", body: IMAGEN }) : q.abort()));
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(String(e.message).slice(0, 200)));
  page.on("console", (m) => m.type() === "error" && errores.push(`consola: ${m.text().slice(0, 200)}`));
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
/** Lo que mide la pantalla para la bitácora: si hay desplazamiento a lo ancho y cuántos nodos tiene el `<main>`. */
const medir = (page) => page.evaluate(() => ({ ancho: document.documentElement.scrollWidth, nodos: document.querySelector("main").querySelectorAll("*").length }));
/** Lleva un elemento a la parte de arriba de lo que se ve, bajo la barra. */
const subir = (loc) => loc.evaluate((e) => window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 70));
/** La rúbrica de una tarjeta en texto: «Circ. 2 fijado · Obra 1 propuesto · …». */
const rubrica = (tarjeta) =>
  tarjeta.locator("ul[aria-label^='Rúbrica'] > li[data-origen]").evaluateAll((lis) => lis.map((li) => `${li.firstChild.textContent} ${(li.querySelector("b, small") ?? li).textContent} ${li.dataset.origen}`).join(" · "));

try {
  // 01 y 02 · La lista: arriba (Feleal con la circulación fijada y lo demás propuesto; 0Backside0, todo fijado) y las tarjetas con «sin datos».
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/showcase`, { waitUntil: "load" });
    await page.getByRole("heading", { name: "Showcase" }).waitFor();
    await foto(page, "01-lista-propuestos");
    console.log("    ", JSON.stringify(await medir(page)), "·", await page.locator("main p[role=status]").innerText());
    for (const t of await page.locator("main ul[aria-label=Candidatos] > li").all()) console.log("     ", (await t.locator("a").first().innerText()).padEnd(38), await rubrica(t));
    await subir(page.locator("main ul[aria-label=Candidatos] > li", { hasText: "Pimpolina" }));
    await foto(page, "02-lista-sin-datos");
    await ctx.close();
  }
  // 03 a 05 · La ficha de Feleal: la rúbrica; la hoja de Actividad (propuesta); la de Circulación (fijada, con «Volver al propuesto»).
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/showcase/feleal`, { waitUntil: "load" });
    await page.getByRole("heading", { name: "Feleal" }).waitFor();
    console.log("    ", JSON.stringify(await medir(page)), "·", await page.getByRole("heading", { name: /^Rúbrica/ }).innerText());
    await subir(page.getByRole("heading", { name: /^Rúbrica/ }));
    await foto(page, "03-ficha-rubrica");
    await page.getByRole("button", { name: /^Actividad/ }).click();
    const propuesta = page.getByRole("dialog", { name: "Puntaje de Actividad" });
    await propuesta.waitFor();
    console.log("     hoja propuesta:", (await propuesta.innerText()).replace(/\s+/g, " "));
    await foto(page, "04-hoja-senal-propuesta");
    await page.keyboard.press("Escape");
    await propuesta.waitFor({ state: "detached" });
    await page.getByRole("button", { name: /^Circulación/ }).click();
    const fijada = page.getByRole("dialog", { name: "Puntaje de Circulación" });
    await fijada.waitFor();
    console.log("     hoja fijada:", (await fijada.innerText()).replace(/\s+/g, " "));
    await foto(page, "05-hoja-senal-fijada");
    await ctx.close();
  }
  // 06 · Una ficha sin nada fijado y con «sin datos»: Aaron Cadena (sin fila en el showcase, un foro, sin lecturas ni evidencias).
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/showcase/aaron-cadena`, { waitUntil: "load" });
    await page.getByRole("heading", { name: "Aaron Cadena" }).waitFor();
    await subir(page.getByRole("heading", { name: /^Rúbrica/ }));
    console.log("    ", await page.getByRole("heading", { name: /^Rúbrica/ }).innerText());
    await foto(page, "06-ficha-sin-datos");
    await page.getByRole("button", { name: /^Obra y reconocimiento/ }).click();
    await page.getByRole("dialog").waitFor();
    console.log("     hoja sin datos:", (await page.getByRole("dialog").innerText()).replace(/\s+/g, " "));
    await foto(page, "07-hoja-senal-sin-datos");
    await ctx.close();
  }
  // 08 · La tabla a 1280: lo propuesto en contorno discontinuo y «sin datos» como raya.
  {
    const { ctx, page } = await contexto({ escritorio: true });
    await page.goto(`${base}/admin/showcase?vista=tabla`, { waitUntil: "load" });
    await page.getByRole("region", { name: "Candidatos en tabla" }).waitFor();
    await foto(page, "08-tabla-escritorio-1280");
    console.log("    ", JSON.stringify(await medir(page)));
    await ctx.close();
  }
  // El CSV para el consejo: la cabecera y la fila de Feleal.
  {
    const { ctx, page } = await contexto();
    const csv = await page.request.get(`${base}/api/showcase/csv`).then((x) => x.text());
    const [cabecera, ...filas] = csv.replace(/^﻿/, "").split("\r\n");
    console.log("     CSV:", cabecera);
    console.log("         ", filas.find((f) => f.startsWith("Feleal")));
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log(errores.length ? `errores de página o consola:\n  ${errores.join("\n  ")}` : "sin errores de página ni de consola");
process.exit(0);
