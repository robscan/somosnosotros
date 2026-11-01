// Capturas y comprobaciones de la bitácora 530 (OL-498): la portada de Administración por bloques. La app compilada contra el respaldo local (reloj
// fijo del mié 7 de oct, cuenta de administración, los datos de `capturar-admin-portada.mjs`) a través de un intermediario que retrasa a mano las
// lecturas de un bloque: así se fotografía el instante en que solo llegó Pendiente (los números, Gestionar y las líneas, en gris) y luego la
// portada completa; también el renglón tocado «en camino» y la espera propia de Administración › Instagram. Chrome real (playwright-core,
// channel: 'chrome'), 390×844 a 2×, toques reales (`tap` sobre el punto del elemento; nunca `element.click()`).
// node scripts/ops/auditoria-ui/capturar-admin-sin-espera.mjs <raíz del árbol> <carpeta de salida>
// Compila `.next` contra el intermediario (SIN_BUILD=1 usa el `.next` que ya hay, compilado por este guion). Correrlo en un árbol SIN `.env`.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";

const [RAIZ, SALIDA] = process.argv.slice(2).map((p) => path.resolve(p));
if (fs.existsSync(path.join(RAIZ, ".env"))) { console.error("hay un .env en el árbol: la app cargaría llaves reales. Córrelo en un árbol sin .env"); process.exit(1); }
const { chromium } = await import(path.join(RAIZ, "node_modules/playwright-core/index.mjs"));
const { ADMIN, cookieDe } = await import(path.join(RAIZ, "scripts/ops/auditoria-ui/respaldo-local/fixture.mjs"));
const NEXT = path.join(RAIZ, "node_modules/next/dist/bin/next");
const AQUI = path.join(RAIZ, "scripts/ops/auditoria-ui");
const AHORA = "2026-10-07T16:00:00Z";
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
    if (h && h.exitCode !== null) throw new Error(`se cerró\n${h.registro()}`);
    try { if ((await fetch(url)).status < 500) return; } catch {}
    await new Promise((ok) => setTimeout(ok, 200));
  }
  throw new Error(`no respondió: ${url}`);
}

// El respaldo y, delante, el intermediario (puerto fijo: la app compilada lo lleva dentro). `retrasos`: lo que se frena, por el principio de la
// ruta (`/rest/v1/rpc/panel_resumen`, `/auth/v1/user`…), en ms. Solo lo que pide el servidor de la app (no el navegador).
const [pr, pi, pa] = [8847, 8848, await puertoLibre()];
const respaldo = `http://127.0.0.1:${pr}`;
const base = `http://127.0.0.1:${pa}`;
let retrasos = {};
http
  .createServer((req, res) => {
    const pasar = () => {
      const ida = http.request({ host: "127.0.0.1", port: pr, method: req.method, path: req.url, headers: req.headers }, (v) => {
        res.writeHead(v.statusCode, v.headers);
        v.pipe(res);
      });
      ida.on("error", () => { res.writeHead(502); res.end(); });
      req.pipe(ida);
    };
    const ms = Object.entries(retrasos).find(([r]) => req.url.startsWith(r))?.[1] ?? 0;
    if (ms) setTimeout(pasar, ms);
    else pasar();
  })
  .listen(pi, "127.0.0.1");
const reloj = { RELOJ_FIJO: AHORA, TZ: "America/Mexico_City", NODE_OPTIONS: `--require=${path.join(AQUI, "reloj-fijo.cjs")}` };
const app = { NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${pi}`, NEXT_PUBLIC_SUPABASE_ANON_KEY: "llave-anon-inventada", NEXT_PUBLIC_MAPBOX_TOKEN: "pk.inventado", SUPABASE_SERVICE_ROLE_KEY: "llave-servicio-inventada" };
const DATOS = { RESPALDO_HISTORIAL: "1", RESPALDO_INSTAGRAM_SEMANA: "1", RESPALDO_INSTAGRAM_CONEXION: "todo" };
const r = lanzar([path.join(AQUI, "respaldo-local/server.mjs"), String(pr)], { ...reloj, ...DATOS });
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
const pasos = [];
const paso = (texto, ok = true) => { pasos.push(`${ok ? "✓" : "✗"} ${texto}`); console.log(ok ? "  ✓" : "  ✗", texto); };
async function contexto(ancho = 390, alto = 844) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.clock.setFixedTime(new Date(AHORA));
  await ctx.addCookies([{ name: "sb-127-auth-token", value: cookieDe(ADMIN), url: base }]);
  await ctx.route("**/_vercel/**", (q) => q.fulfill({ contentType: "text/javascript", body: "" }));
  await ctx.route((u) => u.hostname !== "127.0.0.1", (q) => (q.request().resourceType() === "image" ? q.fulfill({ contentType: "image/svg+xml", body: IMAGEN }) : q.abort()));
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(String(e.message).slice(0, 200)));
  page.on("console", (m) => m.type() === "error" && errores.push(`consola: ${m.text().slice(0, 200)} (${m.location().url})`));
  return { ctx, page };
}
const foto = async (page, nombre) => {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(SALIDA, `${nombre}.png`) });
  console.log("   ", nombre);
};
// Dónde está cada título de la portada (para comprobar que nada se mueve entre la espera y lo que llega).
const titulos = (page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll("main > h2")].filter((h) => h.getClientRects().length).map((h) => [h.textContent.replace(/\d+$/, ""), Math.round(h.getBoundingClientRect().top + scrollY)])));
const cuadros = (page) => page.evaluate(() => [...document.querySelectorAll("main > ul > li > :is(button, div)")].filter((x) => x.getClientRects().length && getComputedStyle(x).gridTemplateAreas.includes("nombre")).map((x) => Math.round(x.getBoundingClientRect().height)));
const renglones = (page) => page.evaluate(() => [...document.querySelectorAll("main > ul > li > a")].filter((x) => x.getClientRects().length).map((x) => [x.querySelector("b")?.textContent, Math.round(x.getBoundingClientRect().height)]));

// Lo que frena cada bloque (el respaldo contesta al instante).
const NUMEROS = { "/rest/v1/rpc/panel_resumen": 2500, "/rest/v1/rpc/panel_aportes": 2500 };
const LINEAS = { "/rest/v1/rpc/instagram_falta_material": 4000, "/rest/v1/instagram_publicaciones": 4000, "/rest/v1/showcase_candidatos": 4000, "/rest/v1/configuracion": 4000 };

try {
  // 1 · La portada en el instante en que solo llegó Pendiente; luego completa. Nada se mueve entre las dos.
  {
    const { ctx, page } = await contexto();
    retrasos = { ...NUMEROS, ...LINEAS };
    const t0 = Date.now();
    await page.goto(`${base}/admin`, { waitUntil: "commit" });
    await page.locator('[data-bloque="pendiente"]').waitFor({ state: "visible" });
    const tPendiente = Date.now() - t0;
    const espera = await page.evaluate(() => ({ busy: [...document.querySelectorAll('[aria-busy="true"]')].map((x) => x.getAttribute("aria-label")), lineas: document.querySelectorAll("main small > span[aria-hidden]").length }));
    paso(`Pendiente llegó a los ${tPendiente} ms con los números y Gestionar aún en espera (${espera.busy.join(", ")}) y ${espera.lineas} líneas en gris`, espera.busy.includes("Cargando los números"));
    const antes = await titulos(page);
    const cuadrosAntes = await cuadros(page);
    const renglonesAntes = await renglones(page);
    await foto(page, "01-solo-pendiente");
    await page.locator('main [aria-busy="true"]').first().waitFor({ state: "detached", timeout: 10000 });
    await page.waitForFunction(() => !document.querySelector("main small > span[aria-hidden]"), null, { timeout: 10000 });
    await page.waitForTimeout(400);
    const despues = await titulos(page);
    const cuadrosDespues = await cuadros(page);
    const renglonesDespues = await renglones(page);
    console.log("    títulos:", JSON.stringify(antes), "→", JSON.stringify(despues));
    console.log("    cuadros:", JSON.stringify(cuadrosAntes), "→", JSON.stringify(cuadrosDespues));
    console.log("    renglones:", JSON.stringify(renglonesAntes), "→", JSON.stringify(renglonesDespues));
    paso("los títulos no se mueven al llegar los números y las líneas", JSON.stringify(antes) === JSON.stringify(despues));
    paso("los renglones miden lo mismo con la línea en gris y con su texto", JSON.stringify(renglonesAntes) === JSON.stringify(renglonesDespues));
    await foto(page, "02-completa");
    const linea = await page.locator('main a[href="/admin/instagram"] small').textContent();
    paso(`la línea de Instagram llegó sola: «${linea}»`, /sin material|publicad/.test(linea));
    await ctx.close();
  }

  // 2 · El renglón tocado responde al instante (`EnCamino`) aunque el servidor tarde; luego, la espera propia de Instagram.
  {
    const { ctx, page } = await contexto();
    retrasos = {};
    await page.goto(`${base}/admin`, { waitUntil: "load" });
    await page.locator("main a[href=\"/admin/instagram\"] small").filter({ hasText: "@" }).waitFor();
    const fila = page.locator('main a[href="/admin/instagram"]');
    await fila.evaluate((e) => e.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(300);
    retrasos = { "/auth/v1/user": 1500, "/rest/v1/rpc/instagram_sugerencias": 4000 };
    await fila.tap();
    await page.waitForFunction(() => document.querySelector('main a[href="/admin/instagram"] > span[aria-hidden="true"]:empty'), null, { timeout: 3000 });
    paso("el renglón de Instagram dice «en camino» en cuanto se toca", true);
    await foto(page, "03-renglon-en-camino");
    await page.locator('main[aria-label="Cargando"]').waitFor({ timeout: 8000 });
    paso("Administración › Instagram tiene su propia espera (pestañas y renglones grises)", (await page.locator('main[aria-label="Cargando"] header').count()) > 0);
    await foto(page, "04-instagram-espera");
    retrasos = {};
    await page.locator('main [aria-label="Instagram"]').first().waitFor({ timeout: 15000 });
    await page.waitForTimeout(500);
    await foto(page, "05-instagram");
    await ctx.close();
  }

  // 3 · La espera de la portada al entrar desde Ajustes (`admin/loading.tsx`): el mismo armazón, en gris.
  {
    const { ctx, page } = await contexto();
    retrasos = {};
    await page.goto(`${base}/ajustes`, { waitUntil: "load" });
    const fila = page.locator('main a[href="/admin"]');
    await fila.evaluate((e) => e.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(1500);
    retrasos = { "/auth/v1/user": 2500 };
    await fila.tap();
    await page.locator('main[aria-busy="true"] [aria-label="Cargando lo pendiente"]').waitFor({ timeout: 5000 });
    paso("al entrar, la espera ya tiene la forma de la portada", true);
    await page.waitForTimeout(150);
    await foto(page, "06-portada-espera");
    retrasos = {};
    await ctx.close();
  }
} finally {
  await browser.close();
  fs.writeFileSync(path.join(SALIDA, "recorrido.txt"), [...pasos, "", "Errores de la página:", ...(errores.length ? errores : ["ninguno"])].join("\n") + "\n");
  console.log(errores.length ? `errores: ${errores.join(" | ")}` : "sin errores de la página");
  process.exit(pasos.some((p) => p.startsWith("✗")) ? 1 : 0);
}
