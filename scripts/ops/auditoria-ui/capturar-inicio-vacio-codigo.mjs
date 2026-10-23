// Evidencia del código de OL-454 (bitácora 486) en la app real compilada contra el respaldo local (`RESPALDO_VACIO=1`: Querétaro con lugares y
// artistas y ningún evento próximo), con el Chrome real de la Mac a 390×844 (2×): Inicio de Querétaro sin sesión y con la de Ana (planes en San
// Luis), San Luis con eventos (el banner, sin llamado) y el recorrido con toques reales (clic por coordenadas en «Publicar un evento»): sin
// sesión a Entrar con el alta como `siguiente`, con sesión al alta de evento con la ciudad. Nunca toca producción ni un `.env` real.
//   node scripts/ops/auditoria-ui/capturar-inicio-vacio-codigo.mjs <carpeta>
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { createRequire } from "node:module";
import { cookie } from "./respaldo-local/fixture.mjs";

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const RAIZ = path.resolve(AQUI, "../../..");
const { chromium } = createRequire(path.join(RAIZ, "package.json"))("playwright-core");
const NEXT = path.join(RAIZ, "node_modules/next/dist/bin/next");
const SALIDA = process.argv[2];
if (!SALIDA) { console.error("uso: capturar-inicio-vacio-codigo.mjs <carpeta>"); process.exit(1); }
if (fs.existsSync(path.join(RAIZ, ".env"))) { console.error("hay un .env en el árbol: córrelo en un árbol sin .env"); process.exit(1); }
if (process.env.RESPALDO_VACIO !== "1") { console.error("falta RESPALDO_VACIO=1"); process.exit(1); }
fs.mkdirSync(SALIDA, { recursive: true });

const puertoLibre = () => new Promise((ok) => { const s = net.createServer(); s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => ok(p)); }); });
const hijos = [];
const lanzar = (args, env) => { const h = spawn(process.execPath, args, { cwd: RAIZ, env: { ...process.env, ...env }, stdio: "ignore" }); hijos.push(h); return h; };
const esperar = async (url) => { for (let i = 0; i < 80; i++) { try { if ((await fetch(url)).status < 500) return; } catch {} await new Promise((r) => setTimeout(r, 500)); } throw new Error("no arranca " + url); };
const fallos = [];
const comprobar = (si, texto) => { console.log(si ? "  ok" : "  FALLA", texto); if (!si) fallos.push(texto); };

const [puertoRespaldo, puertoApp] = [await puertoLibre(), await puertoLibre()];
const app = { NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${puertoRespaldo}`, NEXT_PUBLIC_SUPABASE_ANON_KEY: "llave-anon-inventada", NEXT_PUBLIC_MAPBOX_TOKEN: "pk.inventado" };
const reloj = { RELOJ_FIJO: "2026-10-07T16:00:00Z", TZ: "America/Mexico_City", NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --require=${path.join(AQUI, "reloj-fijo.cjs")}` };
let browser;
try {
  lanzar([path.join(AQUI, "respaldo-local/server.mjs"), String(puertoRespaldo)], reloj);
  await esperar(`http://127.0.0.1:${puertoRespaldo}/rest/v1/eventos?select=id&limit=1`);
  const r = spawnSync(process.execPath, [NEXT, "build"], { cwd: RAIZ, env: { ...process.env, ...app }, encoding: "utf8", maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`next build falló\n${(r.stdout + r.stderr).slice(-3000)}`);
  lanzar([NEXT, "start", "-p", String(puertoApp)], { ...app, ...reloj });
  const base = `http://127.0.0.1:${puertoApp}`;
  await esperar(base + "/entrar");
  browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--hide-scrollbars"] });

  async function abrir(url, sesion) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "es-MX" });
    if (sesion) await ctx.addCookies([{ name: "sb-127-auth-token", value: cookie, url: base }]);
    const page = await ctx.newPage();
    await page.goto(base + url, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1200);
    return page;
  }
  const llamado = (p) => p.getByRole("heading", { name: "¿Sabes de algo que pase en Querétaro?", exact: true });
  const banner = (p) => p.getByRole("region", { name: "Comparte la app" });
  const tocar = async (p, loc) => { const c = await loc.boundingBox(); await p.mouse.click(c.x + c.width / 2, c.y + c.height / 2); };

  // Sin sesión.
  let p = await abrir("/?ciudad=queretaro", false);
  comprobar((await llamado(p).count()) === 1 && (await banner(p).count()) === 0, "Querétaro sin sesión: el llamado y sin banner");
  comprobar((await p.getByText(/Si sabes de uno, publícalo/).count()) === 0, "el aviso viejo de abajo ya no está");
  const forma = await p.evaluate(() => { const h = [...document.querySelectorAll("h2")].find((x) => x.textContent.startsWith("¿Sabes")); const a = h.parentElement.querySelector("a"); const c = a.getBoundingClientRect(); return { hijos: [...h.parentElement.children].map((e) => e.tagName).join(" "), letra: getComputedStyle(h).fontSize, alto: c.height, nombre: a.textContent, oculto: a.querySelector("svg")?.getAttribute("aria-hidden") }; });
  console.log(" ", JSON.stringify(forma));
  comprobar(forma.hijos === "H2 P A" && forma.letra === "26px" && forma.alto >= 44 && forma.nombre === "Publicar un evento" && forma.oculto === "true", "título de 26 px, texto y un botón de 48 con nombre «Publicar un evento» y el «+» oculto");
  await p.screenshot({ path: path.join(SALIDA, "17-codigo-queretaro-sin-sesion.png") });
  await tocar(p, p.getByRole("link", { name: "Publicar un evento", exact: true }).last());
  await p.waitForURL(/\/entrar\?/);
  comprobar(new URL(p.url()).searchParams.get("siguiente") === "/nuevo/evento?ciudad=queretaro", `sin sesión, el botón lleva a Entrar y vuelve al alta (${p.url().replace(base, "")})`);
  await p.context().close();

  // Con sesión (Ana, planes en San Luis).
  p = await abrir("/?ciudad=queretaro", true);
  await p.getByRole("heading", { name: "Tus planes", exact: true }).waitFor();
  comprobar((await llamado(p).count()) === 1 && (await banner(p).count()) === 0, "Querétaro con sesión: el llamado aunque haya Tus planes, y sin banner");
  const titulos = await p.evaluate(() => [...document.querySelectorAll("main h2")].filter((h) => h.offsetParent).map((h) => h.textContent));
  comprobar(titulos.join("|") === "¿Sabes de algo que pase en Querétaro?|Tus planes", "el llamado arriba y Tus planes debajo: " + titulos.join(" · "));
  await p.screenshot({ path: path.join(SALIDA, "18-codigo-queretaro-con-sesion.png") });
  await tocar(p, p.locator("main").getByRole("link", { name: "Publicar un evento", exact: true }));
  await p.waitForURL(/\/nuevo\/evento/);
  comprobar(p.url().endsWith("/nuevo/evento?ciudad=queretaro"), "con sesión, al alta de evento con la ciudad puesta");
  await p.getByRole("button", { name: "No tengo cartel" }).waitFor();
  await p.context().close();

  // Con eventos: Inicio como hoy (el banner, sin llamado).
  p = await abrir("/", true);
  await banner(p).waitFor();
  comprobar((await p.getByRole("heading", { name: /^¿Sabes de algo/ }).count()) === 0, "San Luis con eventos: el banner y ningún llamado");
  await p.screenshot({ path: path.join(SALIDA, "19-codigo-san-luis-con-eventos.png") });
  await p.context().close();
} finally {
  await browser?.close();
  for (const h of hijos) h.kill();
}
console.log(fallos.length ? `FALLAN ${fallos.length}` : "todas las comprobaciones pasan");
process.exit(fallos.length ? 1 : 0);
