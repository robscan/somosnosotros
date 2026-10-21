// Capturas de la bitácora 468 (OL-435): la marca «Somos Nosotrxs» desde una sola constante (`src/lib/marca.ts`). La app compilada contra el
// respaldo local, con la sesión de Ana (la cuenta de `npm run medir`). Chrome real (playwright-core, channel: 'chrome'), 390×844 a 2×, reloj fijo.
// node scripts/ops/auditoria-ui/capturar-marca.mjs <raíz del árbol> <carpeta de salida>
// Compila `.next` contra el respaldo (SIN_BUILD=1 usa el `.next` que ya hay).
// Correrlo en un árbol SIN `.env`: con él, `next build` carga llaves reales (si lo encuentra, se niega a correr).
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

const [RAIZ, SALIDA] = process.argv.slice(2).map((p) => path.resolve(p));
if (fs.existsSync(path.join(RAIZ, ".env"))) { console.error("hay un .env en el árbol: la app cargaría llaves reales. Córrelo en un árbol sin .env"); process.exit(1); }
const { chromium } = await import(path.join(RAIZ, "node_modules/playwright-core/index.mjs"));
const { build } = await import(path.join(RAIZ, "node_modules/esbuild/lib/main.js"));
const { ANA, cookieDe } = await import(path.join(RAIZ, "scripts/ops/auditoria-ui/respaldo-local/fixture.mjs"));
const marca = await build({ entryPoints: [path.join(RAIZ, "src/lib/marca.ts")], bundle: true, platform: "node", format: "esm", write: false });
const { MARCA } = await import(`data:text/javascript;base64,${Buffer.from(marca.outputFiles[0].text).toString("base64")}`);
const NEXT = path.join(RAIZ, "node_modules/next/dist/bin/next");
const AQUI = path.join(RAIZ, "scripts/ops/auditoria-ui");
const AHORA = "2026-10-21T16:00:00Z"; // martes 21 de octubre, 10:00 en San Luis Potosí
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
  // La hoja de compartir del teléfono, imitada: anota lo que recibe y responde como compartida (headless no tiene hoja propia).
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
/** Toque real sobre el centro de un elemento (antes, `elementFromPoint` confirma que el centro es él). */
async function tocar(page, localizador) {
  const c = await localizador.boundingBox();
  const x = c.x + c.width / 2;
  const y = c.y + c.height / 2;
  const esEl = await localizador.evaluate((el, [px, py]) => el.contains(document.elementFromPoint(px, py)), [x, y]);
  if (!esEl) throw new Error("el centro del botón está tapado");
  await page.mouse.click(x, y);
}

/** Lo que se lee de una página servida: lo que usa una vista previa de enlace (WhatsApp, Mensajes) y la pestaña. */
async function etiquetas(ruta) {
  const html = await (await fetch(`${base}${ruta}`, { headers: { "user-agent": UA, cookie: `sb-127-auth-token=${cookieDe(ANA)}` } })).text();
  const meta = (atributo, valor) => html.match(new RegExp(`<meta[^>]*${atributo}="${valor}"[^>]*content="([^"]*)"`))?.[1] ?? null;
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1])).find((x) => x["@type"] === "WebSite");
  return {
    ruta,
    titulo: html.match(/<title>([^<]*)<\/title>/)?.[1] ?? null,
    ogTitulo: meta("property", "og:title"),
    ogSitio: meta("property", "og:site_name"),
    appleTitulo: meta("name", "apple-mobile-web-app-title"),
    aplicacion: meta("name", "application-name"),
    jsonLd: ld ? { name: ld.name, alternateName: ld.alternateName } : null,
  };
}
const escapar = (t) => String(t ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;");

const lecturas = { compartido: [] };
try {
  // 1 · Inicio: el banner «¿Te gusta Somos Nosotrxs?»; tocar «Compartir» manda a la hoja del teléfono lo que dice `lib/marca`.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/`, { waitUntil: "load" });
    const banner = page.getByRole("region", { name: "Comparte la app" });
    await banner.waitFor({ timeout: 15000 });
    await banner.evaluate((b) => b.scrollIntoView({ block: "center" }));
    await quieto(page);
    await tocar(page, banner.getByRole("button", { name: "Compartir" }));
    await page.waitForFunction(() => window.__compartido.length > 0, null, { timeout: 3000 });
    lecturas.compartido.push({ desde: "Inicio (banner)", ...(await page.evaluate(() => window.__compartido[0])) });
    await page.getByText("Gracias por compartir").waitFor({ timeout: 3000 });
    await foto(page, "01-inicio-banner-compartir");
    console.log("     la hoja recibió:", JSON.stringify(lecturas.compartido.at(-1)));
    await ctx.close();
  }
  // 2 · Mi perfil: «Invitar a tus amigxs» comparte con el título de la marca.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/perfil`, { waitUntil: "load" });
    const invitar = page.locator("main button", { hasText: "Invita" }).first();
    await invitar.waitFor({ timeout: 15000 });
    await tocar(page, invitar);
    await page.waitForFunction(() => window.__compartido.length > 0, null, { timeout: 3000 });
    lecturas.compartido.push({ desde: "Mi perfil (Invitar a tus amigxs)", ...(await page.evaluate(() => window.__compartido[0])) });
    console.log("     la hoja recibió:", JSON.stringify(lecturas.compartido.at(-1)));
    await ctx.close();
  }
  // 3 · Ajustes: el grupo con el nombre de la marca.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/ajustes`, { waitUntil: "load" });
    await page.getByRole("heading", { name: "Ajustes", level: 1 }).waitFor();
    await page.getByRole("heading", { name: MARCA }).evaluate((h) => h.scrollIntoView({ block: "start" }));
    await page.mouse.wheel(0, -40);
    await foto(page, "02-ajustes-grupo-marca");
    await ctx.close();
  }
  // 4 · Ayuda: «¿Qué es Somos Nosotrxs?» y el título de la pestaña.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/ayuda`, { waitUntil: "load" });
    await page.getByRole("heading", { name: `¿Qué es ${MARCA}?` }).evaluate((h) => h.scrollIntoView({ block: "center" }));
    await foto(page, "03-ayuda-que-es");
    lecturas.tituloAyuda = await page.title();
    console.log("     título de la pestaña:", lecturas.tituloAyuda);
    await ctx.close();
  }
  // 5 · Lo que la app sirve a una vista previa de enlace y a la pestaña: títulos, Open Graph, JSON-LD y el manifiesto de la PWA.
  {
    const agenda = await (await fetch(`${base}/agenda`, { headers: { "user-agent": UA } })).text();
    const evento = agenda.match(/href="(\/eventos\/[^"?#]+)"/)?.[1];
    lecturas.paginas = [];
    for (const ruta of ["/", "/agenda", ...(evento ? [evento] : []), "/ayuda", "/una-ruta-que-no-existe"]) lecturas.paginas.push(await etiquetas(ruta));
    const manifiesto = await (await fetch(`${base}/manifest.webmanifest`)).json();
    lecturas.manifiesto = { name: manifiesto.name, short_name: manifiesto.short_name };
    console.log("     ", JSON.stringify(lecturas, null, 1));
    const filas = lecturas.paginas
      .map((p) => `<section><h2>${escapar(p.ruta)}</h2><dl><dt>&lt;title&gt;</dt><dd>${escapar(p.titulo)}</dd><dt>og:title</dt><dd>${escapar(p.ogTitulo)}</dd><dt>og:site_name</dt><dd>${escapar(p.ogSitio)}</dd>${p.ruta === "/" ? `<dt>apple-mobile-web-app-title</dt><dd>${escapar(p.appleTitulo)}</dd><dt>application-name</dt><dd>${escapar(p.aplicacion)}</dd><dt>JSON-LD WebSite</dt><dd>name: ${escapar(p.jsonLd?.name)} · alternateName: ${escapar(p.jsonLd?.alternateName)}</dd>` : ""}</dl></section>`)
      .join("");
    const compartidos = lecturas.compartido.map((c) => `<section><h2>Hoja de compartir · ${escapar(c.desde)}</h2><dl><dt>title</dt><dd>${escapar(c.title)}</dd><dt>text</dt><dd>${escapar(c.text)}</dd><dt>url</dt><dd>${escapar(c.url)}</dd></dl></section>`).join("");
    const { ctx, page } = await contexto();
    await page.goto(`${base}/entrar`, { waitUntil: "load" }); // misma letra (Bricolage servida por la app)
    await page.setContent(`<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
      body{margin:0;padding:16px;font:14px/1.35 -apple-system,system-ui,sans-serif;color:#1a1a1a;background:#f6f5f1}
      h1{font-size:17px;margin:0 0 4px} p.nota{margin:0 0 12px;color:#5c5c5c;font-size:12.5px}
      section{background:#fff;border:1px solid #e3e1da;border-radius:10px;padding:8px 10px;margin:0 0 8px}
      h2{font-size:13px;margin:0 0 4px;color:#6d34c8;word-break:break-all} dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:2px 8px}
      dt{color:#5c5c5c;font-size:11.5px} dd{margin:0;font-size:12.5px;word-break:break-word}
    </style></head><body><h1>Lo que lee un enlace compartido</h1><p class="nota">Lectura del HTML que sirve la app (respaldo local, OL-435), no una pantalla de la app. Manifiesto de la PWA: name «${escapar(lecturas.manifiesto.name)}», short_name «${escapar(lecturas.manifiesto.short_name)}».</p>${compartidos}${filas}</body></html>`);
    await foto(page, "04-lo-que-lee-un-enlace");
    await ctx.close();
  }
  fs.writeFileSync(path.join(SALIDA, "lecturas.json"), JSON.stringify(lecturas, null, 2) + "\n");
} finally {
  await browser.close();
}
process.exit(0);
