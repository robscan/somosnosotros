// Capturas de la bitácora 444 (OL-413): la app compilada contra el respaldo local con RESPALDO_CARTELES=1 y la lectura del cartel simulada en el
// respaldo (`/anthropic/v1/messages`, preparada con `POST /__lectura`). Chrome real (playwright-core, channel: 'chrome'), 390×844 a 2×.
// node scripts/ops/auditoria-ui/capturar-cartel-leido.mjs <raíz del árbol> <carpeta de salida> <carpeta con cumbiachella.png y trayectos-interactivos.png>
// (los carteles del founder no van en el repo: son de sus autores). Correrlo en un árbol sin `.env`: compila `.next` contra el respaldo.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

const [RAIZ, SALIDA, CARTELES] = process.argv.slice(2).map((p) => path.resolve(p));
const { chromium } = await import(path.join(RAIZ, "node_modules/playwright-core/index.mjs"));
const { cookie } = await import(path.join(RAIZ, "scripts/ops/auditoria-ui/respaldo-local/fixture.mjs"));
const sharp = (await import(path.join(RAIZ, "node_modules/sharp/dist/index.mjs"))).default;
const NEXT = path.join(RAIZ, "node_modules/next/dist/bin/next");
const AQUI = path.join(RAIZ, "scripts/ops/auditoria-ui");
const AHORA = "2026-10-16T16:00:00Z"; // viernes 16 de octubre, 10:00 en San Luis Potosí
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
fs.mkdirSync(SALIDA, { recursive: true });

// Un cartel inventado para el festival de varios días (los otros dos son los del founder).
const FESTIVAL_PNG = path.join(CARTELES, "festival-cine-otono.png");
if (!fs.existsSync(FESTIVAL_PNG)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><rect width="800" height="1000" fill="#20304a"/><rect x="40" y="40" width="720" height="920" fill="none" stroke="#f2c14e" stroke-width="6"/><text x="400" y="380" fill="#f2c14e" font-family="Arial" font-size="72" font-weight="800" text-anchor="middle">FESTIVAL</text><text x="400" y="470" fill="#fff" font-family="Arial" font-size="64" font-weight="800" text-anchor="middle">DE CINE</text><text x="400" y="560" fill="#fff" font-family="Arial" font-size="64" font-weight="800" text-anchor="middle">DE OTOÑO</text><text x="400" y="700" fill="#f2c14e" font-family="Arial" font-size="40" text-anchor="middle">13 · 14 · 15 nov</text><text x="400" y="770" fill="#fff" font-family="Arial" font-size="34" text-anchor="middle">Teatro Paz</text></svg>`;
  await sharp(Buffer.from(svg)).png().toFile(FESTIVAL_PNG);
}

const nulos = { titulo: null, fecha: null, hora: null, hora_fin: null, lugar: null, direccion: null, gratis: null, precio: null, descripcion: null, enlace: null, artistas: null, clase: null, visita: null, sesiones: null, actos: null, festival: null };
// Lo que devolvería el modelo con el esquema nuevo (bitácora 444) para cada cartel.
const LECTURAS = {
  cumbiachella: { ...nulos, titulo: "Cumbiachella", fecha: "2026-10-30", hora: "20:00", hora_fin: "02:00", lugar: "Lunaria", descripcion: "Festival cumbiero potosino: cumbia, sonido, baile y disfraz.", artistas: ["Sonido Satanás", "Juan Escumbia", "Sonido Blasfemo", "Vinyl Box"], clase: "festival" },
  trayectos: { ...nulos, titulo: "Trayectos Interactivos", fecha: "2026-10-17", hora: "19:00", direccion: "5 de mayo 1100, Centro Histórico, San Luis Potosí, México", descripcion: "Concierto, cortometraje, exposición, charla y cócteles.", artistas: ["Disonáuta", "El Ermitaño", "Las brujas de la Cañada"], clase: "puntual" },
  // La lectura de antes (el esquema viejo): «festival» con cinco actos a la misma hora, sin nada que lo anuncie como festival.
  trayectosAntes: {
    ...nulos,
    titulo: "Trayectos Interactivos",
    fecha: "2026-10-17",
    hora: "19:00",
    direccion: "5 de mayo 1100, Centro Histórico, San Luis Potosí, México",
    artistas: ["Disonáuta", "El Ermitaño", "Las brujas de la Cañada"],
    clase: "festival",
    actos: ["Concierto: Disonáuta", "Cortometraje: El Ermitaño", "Exposición: Las brujas de la Cañada", "Charla: Charlemos", "Cócteles: Sorpresas"].map((titulo) => ({ titulo, fecha: "2026-10-17", hora: "19:00", lugar: null })),
  },
  festival: {
    ...nulos,
    titulo: "Festival de Cine de Otoño",
    fecha: "2026-11-13",
    hora: "18:00",
    lugar: "Teatro Paz",
    descripcion: "Tres noches de cine mexicano.",
    clase: "festival",
    actos: [
      { titulo: "Inauguración: Roma", fecha: "2026-11-13", hora: "18:00", lugar: "Teatro Paz" },
      { titulo: "Cortometrajes potosinos", fecha: "2026-11-14", hora: "18:00", lugar: null },
      { titulo: "Clausura: Macario", fecha: "2026-11-15", hora: "19:00", lugar: "Teatro Paz" },
    ],
  },
};

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
const r = lanzar([path.join(AQUI, "respaldo-local/server.mjs"), String(pr)], { ...reloj, RESPALDO_CARTELES: "1" });
await esperar(`${respaldo}/rest/v1/eventos?select=id&limit=1`, r);
if (!process.env.SIN_BUILD) {
  process.stdout.write("compilando… ");
  const b = spawnSync(process.execPath, [NEXT, "build"], { cwd: RAIZ, env: { ...process.env, ...app }, encoding: "utf8", maxBuffer: 1 << 26 });
  if (b.status !== 0) throw new Error((b.stdout + b.stderr).slice(-3000));
  console.log("listo");
}
const s = lanzar([NEXT, "start", "-p", String(pa)], { ...app, ...reloj, ANTHROPIC_API_KEY: "llave-inventada", ANTHROPIC_BASE_URL: `${respaldo}/anthropic` });
await esperar(`${base}/entrar`, s);

const ESTILO = { version: 8, sources: { mapa: { type: "geojson", data: { type: "FeatureCollection", features: [] }, attribution: "© Mapbox" } }, layers: [{ id: "fondo", type: "background", paint: { "background-color": "#e8e6df" } }] };
const IMAGEN = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#b9b4a8"/></svg>';
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--hide-scrollbars"] });

async function contexto() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.clock.setFixedTime(new Date(AHORA));
  await ctx.addCookies([{ name: "sb-127-auth-token", value: cookie, url: base }]);
  await ctx.route("**/_vercel/**", (q) => q.fulfill({ contentType: "text/javascript", body: "" }));
  await ctx.route((u) => u.hostname !== "127.0.0.1", (q) => {
    const url = q.request().url();
    if (q.request().resourceType() === "image") return q.fulfill({ contentType: "image/svg+xml", body: IMAGEN });
    if (/\/styles\/v1\//.test(url)) return q.fulfill({ json: ESTILO });
    if (/\/search\/searchbox\/v1\/suggest/.test(url)) return q.fulfill({ json: { suggestions: [] } });
    return q.abort();
  });
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
const preparar = (lectura, archivo) => fetch(`${respaldo}/__lectura`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lectura, archivo }) });
const pregunta = (page, texto) => page.locator("main h2").filter({ hasText: texto }).first().waitFor({ timeout: 30000 });
async function subirCartel(page, lectura, archivo) {
  await preparar(lectura, archivo);
  await page.goto(`${base}/nuevo/evento?ciudad=san-luis-potosi`, { waitUntil: "load" });
  await page.locator("input[type=file]").setInputFiles(archivo);
}

try {
  // 1 · Cumbiachella: una sola ficha de festival.
  {
    const { ctx, page } = await contexto();
    await subirCartel(page, LECTURAS.cumbiachella, path.join(CARTELES, "cumbiachella.png"));
    await pregunta(page, "¿Cuánto cuesta?");
    await foto(page, "01-cumbiachella-cuanto");
    await page.getByRole("button", { name: "Dejar por confirmar" }).click();
    await page.getByRole("heading", { name: "Cumbiachella" }).waitFor();
    await foto(page, "02-cumbiachella-revisa");
    await ctx.close();
  }
  // 2 · Trayectos Interactivos: «¿Es en Laboratorio Centro Histórico?»
  {
    const { ctx, page } = await contexto();
    await subirCartel(page, LECTURAS.trayectos, path.join(CARTELES, "trayectos-interactivos.png"));
    await pregunta(page, "¿Es en Laboratorio Centro Histórico?");
    await page.waitForTimeout(2500); // el mapa
    await foto(page, "04-trayectos-es-en-laboratorio");
    await page.getByRole("button", { name: "Sí, es aquí" }).click();
    await pregunta(page, "¿Cuánto cuesta?");
    await page.getByRole("button", { name: /^Gratis/ }).click();
    await page.getByRole("heading", { name: "Trayectos Interactivos" }).waitFor();
    await foto(page, "05-trayectos-revisa");
    await ctx.close();
  }
  // 3 · «¿Qué es?» con la lectura de antes de Trayectos (festival sin nada que lo anuncie).
  {
    const { ctx, page } = await contexto();
    await subirCartel(page, LECTURAS.trayectosAntes, path.join(CARTELES, "trayectos-interactivos.png"));
    await pregunta(page, "¿Qué es?");
    await foto(page, "06-que-es");
    await ctx.close();
  }
  // 4 · Festival de varios días con la sede preguntada una vez.
  {
    const { ctx, page } = await contexto();
    await subirCartel(page, LECTURAS.festival, FESTIVAL_PNG);
    await pregunta(page, "El cartel trae 3 eventos");
    await foto(page, "07-festival-programa-sede-del-festival");
    await page.getByRole("button", { name: "Revisar el festival" }).click();
    await pregunta(page, "¿Dónde es?");
    await page.getByRole("option", { name: /Teatro de la Paz/ }).waitFor();
    await foto(page, "08-festival-donde-una-vez");
    await page.getByRole("option", { name: /Teatro de la Paz/ }).click();
    await pregunta(page, "¿Cuánto cuesta?");
    await page.getByRole("button", { name: "Dejar por confirmar" }).click();
    await page.getByRole("heading", { name: "Festival de Cine de Otoño" }).waitFor();
    await foto(page, "09-festival-revisa");
    await ctx.close();
  }
  // 5 · El festival sin programa en su ficha, en Agenda, en Inicio y en la ficha de su lugar.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/eventos/noche-cumbiera-demo`, { waitUntil: "load" });
    await page.getByRole("heading", { name: "Noche cumbiera (demo)" }).first().waitFor();
    await foto(page, "10-ficha-festival-sin-programa");
    await page.mouse.wheel(0, 700);
    await foto(page, "11-ficha-festival-sin-programa-abajo");
    await page.goto(`${base}/agenda`, { waitUntil: "load" });
    const renglon = page.getByRole("link", { name: /Noche cumbiera \(demo\)/ }).first();
    await renglon.waitFor({ timeout: 30000 });
    await renglon.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await foto(page, "12-agenda-renglon");
    await page.goto(`${base}/`, { waitUntil: "load" });
    const tarjeta = page.getByRole("link", { name: /Noche cumbiera \(demo\)/ }).first();
    await tarjeta.waitFor({ timeout: 30000 });
    await tarjeta.evaluate((el) => el.scrollIntoView({ block: "center", inline: "start" }));
    await foto(page, "13-inicio-festivales-y-expos");
    await page.goto(`${base}/lugares/aaaa0001-0000-4000-8000-000000000052`, { waitUntil: "load" });
    await page.getByRole("heading", { name: "Foro lunaria" }).first().waitFor();
    await foto(page, "14-ficha-lugar-renglon");
    await ctx.close();
  }
} catch (e) {
  console.error(e);
  console.error("respaldo:", r.registro().slice(-1500));
  console.error("app:", s.registro().slice(-1500));
  process.exitCode = 1;
} finally {
  await browser.close();
}
process.exit();
