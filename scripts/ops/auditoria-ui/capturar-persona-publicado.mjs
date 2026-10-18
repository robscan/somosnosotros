// Capturas de la bitácora 445 (OL-414): Administración › Personas con las fotos más grandes y «Lo que publicó», con la app compilada contra el respaldo
// local con RESPALDO_PERSONAS=1 y la sesión de la cuenta de administración del respaldo. Chrome real (playwright-core, channel: 'chrome'), 390×844 a 2×.
// Las fotos de las personas (`retratos.example`) son dibujos inventados que este script hace con sharp; las demás imágenes, gris.
// node scripts/ops/auditoria-ui/capturar-persona-publicado.mjs <raíz del árbol> <carpeta de salida>
// Correrlo en un árbol sin `.env`: compila `.next` contra el respaldo (SIN_BUILD=1 usa el `.next` que ya hay).
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

const [RAIZ, SALIDA] = process.argv.slice(2).map((p) => path.resolve(p));
const { chromium } = await import(path.join(RAIZ, "node_modules/playwright-core/index.mjs"));
const { ADMIN, ANA, MARCOS, cookieDe } = await import(path.join(RAIZ, "scripts/ops/auditoria-ui/respaldo-local/fixture.mjs"));
const sharp = (await import(path.join(RAIZ, "node_modules/sharp/dist/index.mjs"))).default;
const NEXT = path.join(RAIZ, "node_modules/next/dist/bin/next");
const AQUI = path.join(RAIZ, "scripts/ops/auditoria-ui");
const AHORA = "2026-10-18T16:00:00Z"; // domingo 18 de octubre, 10:00 en San Luis Potosí
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
const DIEGO = "99999999-1111-4000-8000-000000000002";
fs.mkdirSync(SALIDA, { recursive: true });

// Un retrato inventado: fondo en degradado y una silueta (cabeza y hombros) en otro tono. Vertical, como una foto de teléfono.
async function retrato([fondo, borde, figura], ancho = 900, alto = 1125) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 900 1125"><defs><radialGradient id="g" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="${fondo}"/><stop offset="1" stop-color="${borde}"/></radialGradient></defs><rect width="900" height="1125" fill="url(#g)"/><circle cx="450" cy="430" r="190" fill="${figura}"/><path d="M90 1125 C 110 820 270 690 450 690 C 630 690 790 820 810 1125 Z" fill="${figura}"/></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}
const RETRATOS = {
  "ana.png": await retrato(["#f4c9a8", "#c8603c", "#5b2a1c"], 1200, 1500),
  "marcos.png": await retrato(["#b9d7e8", "#2f5f7d", "#1b2b38"]),
  "lucia.png": await retrato(["#d9e8b9", "#5d7d2f", "#2b381b"]),
  "valeria.png": await retrato(["#e3c6ef", "#6c3a87", "#2e1a3a"]),
  "mariana.png": await retrato(["#f2e2a0", "#b08a1e", "#4a3a0c"]),
  "taller.png": await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#8a5a3c"/><rect y="520" width="1200" height="280" fill="#5b3a26"/><circle cx="380" cy="430" r="120" fill="#d9a074"/><circle cx="760" cy="460" r="90" fill="#c9875a"/></svg>')).png().toBuffer(),
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
const r = lanzar([path.join(AQUI, "respaldo-local/server.mjs"), String(pr)], { ...reloj, RESPALDO_PERSONAS: "1" });
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
  await ctx.addCookies([{ name: "sb-127-auth-token", value: cookieDe(ADMIN), url: base }]);
  await ctx.route("**/_vercel/**", (q) => q.fulfill({ contentType: "text/javascript", body: "" }));
  await ctx.route((u) => u.hostname !== "127.0.0.1", (q) => {
    const url = new URL(q.request().url());
    if (url.hostname === "retratos.example" && RETRATOS[url.pathname.slice(1)]) return q.fulfill({ contentType: "image/png", body: RETRATOS[url.pathname.slice(1)] });
    if (q.request().resourceType() === "image") return q.fulfill({ contentType: "image/svg+xml", body: IMAGEN });
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
/** Lo que mide la pantalla (para la bitácora): el lado del avatar, si hay desplazamiento a lo ancho y cuántos renglones de cada tipo. */
const medir = (page) =>
  page.evaluate(() => ({
    avatares: [...document.querySelectorAll("main [class*=avatar]")].slice(0, 3).map((a) => Math.round(a.getBoundingClientRect().width)),
    anchoDePagina: document.documentElement.scrollWidth,
    grupos: [...document.querySelectorAll("main h3")].map((h) => `${h.textContent} → ${h.nextElementSibling?.children.length ?? 0} renglones`),
  }));

try {
  // 1 · La lista con las fotos de 56.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/personas`, { waitUntil: "load" });
    await page.getByRole("heading", { name: "Personas" }).waitFor();
    await foto(page, "01-lista-personas");
    console.log("    ", JSON.stringify(await medir(page)));
    await ctx.close();
  }
  // 2 a 5 · La ficha de Ana: la foto grande, el visor, «Publicó» que baja a «Lo que publicó», y Lugares y Artistas.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/personas/${ANA}`, { waitUntil: "load" });
    await page.getByRole("heading", { name: "Ana Rentería" }).waitFor();
    await foto(page, "02-ficha-foto-grande");
    console.log("    ", JSON.stringify(await medir(page)));
    await page.getByRole("button", { name: /Ver la foto de Ana Rentería entera/ }).click();
    await page.getByRole("dialog").waitFor();
    await foto(page, "03-visor-foto");
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "detached" });
    await page.getByRole("link", { name: /Publicó/ }).click();
    await foto(page, "04-lo-que-publico-eventos");
    console.log("     url tras «Publicó»:", page.url().replace(base, ""), "· historial:", await page.evaluate(() => history.length));
    console.log("    ", JSON.stringify(await medir(page)));
    await page.getByRole("heading", { name: /^Lugares/ }).evaluate((h) => h.scrollIntoView({ block: "start" }));
    await page.mouse.wheel(0, -60);
    await foto(page, "05-lo-que-publico-lugares-artistas");
    await ctx.close();
  }
  // 6 y 7 · La ficha de Marcos: 27 eventos, 20 a la vista y «Ver más (7 más)»; al tocarlo, los 27 sin moverse de sitio ni apilar historial.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/personas/${MARCOS}`, { waitUntil: "load" });
    await page.getByRole("heading", { name: "Marcos Ledesma" }).waitFor();
    const verMas = page.getByRole("link", { name: /Ver más/ });
    await verMas.evaluate((b) => b.scrollIntoView({ block: "end" }));
    await page.mouse.wheel(0, 120);
    await foto(page, "06-ver-mas");
    console.log("    ", JSON.stringify(await medir(page)));
    const antes = await page.evaluate(() => [history.length, scrollY]);
    await verMas.click();
    await page.waitForURL(/eventos=40/);
    await page.waitForFunction(() => document.querySelector("main ul[aria-label=Eventos]")?.children.length === 27);
    await foto(page, "07-tras-ver-mas");
    console.log("     historial y scroll antes:", JSON.stringify(antes), "después:", JSON.stringify(await page.evaluate(() => [history.length, scrollY])));
    console.log("    ", JSON.stringify(await medir(page)));
    await ctx.close();
  }
  // 8 · Una cuenta sin foto ni nada publicado: la inicial, «Nada aún» y sin la sección.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/personas/${DIEGO}`, { waitUntil: "load" });
    await page.getByRole("heading", { name: "Diego Ortiz Cano" }).waitFor();
    await foto(page, "08-ficha-sin-foto");
    console.log("    ", JSON.stringify(await medir(page)));
    await ctx.close();
  }
} finally {
  await browser.close();
}
process.exit(0);
