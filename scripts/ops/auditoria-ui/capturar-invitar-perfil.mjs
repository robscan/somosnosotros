// Capturas de la bitácora 448 (OL-416): «Invitar a tus amigxs» se mudó de Ajustes a Mi perfil. La app compilada contra el respaldo local, con la
// sesión de Ana (la cuenta de `npm run medir`). Chrome real (playwright-core, channel: 'chrome'), 390×844 a 2×, reloj fijo.
// node scripts/ops/auditoria-ui/capturar-invitar-perfil.mjs <raíz del árbol> <carpeta de salida>
// Compila `.next` contra el respaldo (SIN_BUILD=1 usa el `.next` que ya hay).
// Correrlo en un árbol SIN `.env`: con él, `next build` carga llaves reales (si lo encuentra, se niega a correr).
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
const AHORA = "2026-10-19T16:00:00Z"; // lunes 19 de octubre, 10:00 en San Luis Potosí
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

async function contexto() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.clock.setFixedTime(new Date(AHORA));
  await ctx.addCookies([{ name: "sb-127-auth-token", value: cookieDe(ANA), url: base }]);
  // La hoja de compartir del teléfono, imitada: anota lo que recibe y responde como compartida.
  await ctx.addInitScript(() => {
    window.__compartido = [];
    Object.defineProperty(navigator, "share", { configurable: true, value: async (datos) => void window.__compartido.push(datos) });
  });
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
/** ¿Hay algún «Invitar…» o «Invita…» en la pantalla? Y, si lo hay, dónde está y qué toca su centro. */
const invitar = (page) =>
  page.evaluate(() => {
    const b = [...document.querySelectorAll("main button, main a")].find((e) => /Invita/.test(e.textContent ?? ""));
    if (!b) return { hay: false, anchoDePagina: document.documentElement.scrollWidth };
    const c = b.getBoundingClientRect();
    const centro = document.elementFromPoint(c.left + c.width / 2, c.top + c.height / 2);
    return {
      hay: true,
      texto: b.innerText.replace(/\s+/g, " ").trim(),
      caja: { x: Math.round(c.left), y: Math.round(c.top), ancho: Math.round(c.width), alto: Math.round(c.height) },
      centroEsElBoton: !!centro && b.contains(centro),
      anchoDePagina: document.documentElement.scrollWidth,
    };
  });

try {
  // 1 y 2 · Mi perfil: el renglón bajo la cabecera, a la vista al abrir; tocarlo (ratón sobre su centro) abre la hoja con la invitación.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/perfil`, { waitUntil: "load" });
    await page.getByRole("heading", { name: "Ana Rentería" }).waitFor();
    await foto(page, "01-mi-perfil-invitar");
    const medida = await invitar(page);
    console.log("    ", JSON.stringify(medida));
    await page.mouse.click(medida.caja.x + medida.caja.ancho / 2, medida.caja.y + medida.caja.alto / 2);
    await page.waitForFunction(() => window.__compartido.length > 0, null, { timeout: 3000 });
    console.log("     la hoja recibió:", JSON.stringify(await page.evaluate(() => window.__compartido)));
    await ctx.close();
  }
  // 3 · Ajustes: el grupo «Somos Nosotrxs» sin el renglón.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/ajustes`, { waitUntil: "load" });
    await page.getByRole("heading", { name: "Ajustes", level: 1 }).waitFor();
    await page.getByRole("heading", { name: "Somos Nosotrxs" }).evaluate((h) => h.scrollIntoView({ block: "start" }));
    await page.mouse.wheel(0, -40);
    await foto(page, "02-ajustes-sin-invitar");
    console.log("    ", JSON.stringify(await invitar(page)));
    console.log("     renglones del grupo:", JSON.stringify(await page.evaluate(() => [...document.querySelectorAll("h2")].find((h) => h.textContent === "Somos Nosotrxs")?.nextElementSibling?.innerText.split("\n").filter(Boolean))));
    await ctx.close();
  }
  // 4 · La ficha de otra persona (Marcos): sin el renglón.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/personas/${MARCOS}`, { waitUntil: "load" });
    await page.getByRole("heading", { name: "Marcos Ledesma", level: 1 }).waitFor();
    await foto(page, "03-ficha-de-otra-persona-sin-invitar");
    console.log("    ", JSON.stringify(await invitar(page)));
    await ctx.close();
  }
  // 5 · La propia ficha como la ve la gente («Así te ve la gente»): tampoco.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/personas/${ANA}`, { waitUntil: "load" });
    await page.getByText("Así te ve la gente.").waitFor();
    await foto(page, "04-asi-te-ve-la-gente-sin-invitar");
    console.log("    ", JSON.stringify(await invitar(page)));
    await ctx.close();
  }
} finally {
  await browser.close();
}
process.exit(0);
