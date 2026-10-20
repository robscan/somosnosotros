// Capturas de la bitácora 455 (OL-422, la ceja de la tarjeta de Inicio que no se corta), con la app compilada contra el respaldo local con
// `RESPALDO_NUEVAS=1` (dos festivales viejos con actividades nuevas: siete y una), la sesión de Ana y Chrome real (playwright-core, channel:
// 'chrome') a 2×. Inicio con el carril «Nuevos eventos» a la vista a 390×844, 320×568 y 430×932 (y deslizado hasta la tarjeta de las siete), y la
// pestaña Nuevos de la agenda (su renglón sigue diciendo «7 actividades nuevas»). Mide en cada ancho la ceja de las tarjetas del carril: su texto,
// sus renglones y si sale de la tarjeta.
// node scripts/ops/auditoria-ui/capturar-ceja-actividades.mjs <raíz del árbol> <carpeta de salida>
// Compila `.next` contra el respaldo cada vez. Correrlo en un árbol SIN `.env` (si lo encuentra, se niega).
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

const [RAIZ, SALIDA] = process.argv.slice(2).map((p) => path.resolve(p));
if (fs.existsSync(path.join(RAIZ, ".env"))) { console.error("hay un .env en el árbol: la app cargaría llaves reales. Córrelo en un árbol sin .env"); process.exit(1); }
const { chromium } = await import(path.join(RAIZ, "node_modules/playwright-core/index.mjs"));
const { ANA, cookieDe } = await import(path.join(RAIZ, "scripts/ops/auditoria-ui/respaldo-local/fixture.mjs"));
const NEXT = path.join(RAIZ, "node_modules/next/dist/bin/next");
const AQUI = path.join(RAIZ, "scripts/ops/auditoria-ui");
const AHORA = "2026-10-07T16:00:00Z"; // el de `npm run medir`
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
const r = lanzar([path.join(AQUI, "respaldo-local/server.mjs"), String(pr)], { ...reloj, RESPALDO_NUEVAS: "1" });
await esperar(`${respaldo}/rest/v1/eventos?select=id&limit=1`, r);
process.stdout.write("compilando… ");
const b = spawnSync(process.execPath, [NEXT, "build"], { cwd: RAIZ, env: { ...process.env, ...app }, encoding: "utf8", maxBuffer: 1 << 26 });
if (b.status !== 0) throw new Error((b.stdout + b.stderr).slice(-3000));
console.log("listo");
const s = lanzar([NEXT, "start", "-p", String(pa)], { ...app, ...reloj });
await esperar(`${base}/entrar`, s);

const IMAGEN = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#b9b4a8"/></svg>';
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--hide-scrollbars"] });

async function pagina(ancho, alto) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.clock.setFixedTime(new Date(AHORA));
  await ctx.addCookies([{ name: "sb-127-auth-token", value: cookieDe(ANA), url: base }]);
  await ctx.route("**/_vercel/**", (q) => q.fulfill({ contentType: "text/javascript", body: "" }));
  await ctx.route((u) => u.hostname !== "127.0.0.1", (q) => (q.request().resourceType() === "image" ? q.fulfill({ contentType: "image/svg+xml", body: IMAGEN }) : q.abort()));
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("  error de página:", String(e.message).slice(0, 200)));
  return { ctx, page };
}
const quieto = async (page, ms = 800) => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
};

/** Las cejas del carril: su texto, sus renglones y cuánto sale su texto de la tarjeta (o de la zona del título de la portada). */
const cejasDe = (carril) =>
  carril.evaluate((c) =>
    [...c.querySelectorAll("a")].map((a) => {
      const ceja = [...a.querySelectorAll("span")].find((s) => getComputedStyle(s).textTransform === "uppercase" && getComputedStyle(s).letterSpacing !== "normal" && s.parentElement.closest("span[style*='--base'],a") === s.parentElement);
      if (!ceja) return { titulo: a.getAttribute("aria-label").split(". ")[0], ceja: null };
      const padre = ceja.parentElement.getBoundingClientRect();
      const cs = getComputedStyle(ceja);
      const rango = document.createRange();
      rango.selectNodeContents(ceja);
      const trozos = [...rango.getClientRects()].filter((x) => x.width > 0);
      const derecha = Math.max(...trozos.map((x) => x.right));
      return {
        titulo: a.getAttribute("aria-label").split(". ")[0],
        ceja: ceja.innerText.replace(/\s+/g, " "),
        renglones: [...new Set(trozos.map((x) => Math.round(x.top)))].length,
        sale: Math.round((derecha - (padre.right - parseFloat(cs.marginRight))) * 10) / 10,
      };
    }),
  );

try {
  for (const [ancho, alto, nombre] of [[390, 844, "01-inicio-nuevos-390"], [320, 568, "02-inicio-nuevos-320"], [430, 932, "03-inicio-nuevos-430"]]) {
    const { ctx, page } = await pagina(ancho, alto);
    await page.goto(base, { waitUntil: "load" });
    const titulo = page.getByRole("heading", { name: "Nuevos eventos", exact: true });
    await titulo.waitFor();
    const carril = page.locator("section", { has: titulo });
    await titulo.evaluate((e) => window.scrollBy(0, e.getBoundingClientRect().top - 72));
    await quieto(page);
    console.log(`${ancho}:`, JSON.stringify(await cejasDe(carril), null, 0));
    await page.screenshot({ path: path.join(SALIDA, `${nombre}.png`) });
    console.log("  ", nombre);
    // El carril deslizado hasta la tarjeta de Raíces Sonoras («FESTIVAL ·» / «7 NUEVAS»), entera a la vista.
    await carril.locator('a[aria-label^="Festival Raíces"]').evaluate((a) => a.closest("ul").scrollBy({ left: a.getBoundingClientRect().right - innerWidth + 16 }));
    await quieto(page);
    await page.screenshot({ path: path.join(SALIDA, `${nombre}-raices.png`) });
    console.log("  ", `${nombre}-raices`);
    await ctx.close();
  }
  // La pestaña Nuevos de la agenda: el renglón del festival dice la frase entera, «7 actividades nuevas» (ahí cabe).
  {
    const { ctx, page } = await pagina(390, 844);
    await page.goto(`${base}/agenda?ver=nuevos`, { waitUntil: "load" });
    const renglon = page.getByText("7 actividades nuevas").first();
    await renglon.waitFor();
    await renglon.evaluate((e) => e.scrollIntoView({ block: "center" }));
    await quieto(page);
    await page.screenshot({ path: path.join(SALIDA, "04-agenda-nuevos-renglon.png") });
    console.log("   04-agenda-nuevos-renglon");
    await ctx.close();
  }
} finally {
  await browser.close();
}
process.exit(0);
