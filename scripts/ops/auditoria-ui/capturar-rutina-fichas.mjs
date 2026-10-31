// Capturas de la bitácora 521 (OL-489): «Completar fichas» con la app compilada contra el respaldo local (RESPALDO_COMPLETAR=1) y la sesión de la
// cuenta de administración del respaldo. Chrome real (playwright-core, channel: 'chrome'), 390×844 a 2×, toques reales (`tap`). Las miniaturas
// (`miniaturas.example`) se dibujan aquí con sharp: una foto cuadrada, dos portadas 3:2.
// node scripts/ops/auditoria-ui/capturar-rutina-fichas.mjs <raíz del árbol> <carpeta de salida>
// Compila `.next` contra el respaldo (SIN_BUILD=1 usa el `.next` que ya hay). Correrlo en un árbol SIN `.env`.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

const [RAIZ, SALIDA] = process.argv.slice(2).map((p) => path.resolve(p));
if (fs.existsSync(path.join(RAIZ, ".env"))) { console.error("hay un .env en el árbol: la app cargaría llaves reales. Córrelo en un árbol sin .env"); process.exit(1); }
const { chromium } = await import(path.join(RAIZ, "node_modules/playwright-core/index.mjs"));
const { ADMIN, CORRIDA_FICHAS, cookieDe } = await import(path.join(RAIZ, "scripts/ops/auditoria-ui/respaldo-local/fixture.mjs"));
const sharp = (await import(path.join(RAIZ, "node_modules/sharp/dist/index.mjs"))).default;
const NEXT = path.join(RAIZ, "node_modules/next/dist/bin/next");
const AQUI = path.join(RAIZ, "scripts/ops/auditoria-ui");
const AHORA = "2026-10-29T18:00:00Z"; // jueves 29 de octubre, 12:00 en San Luis Potosí
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
fs.mkdirSync(SALIDA, { recursive: true });

const png = (svg) => sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toBuffer();
const MINIATURAS = {
  "marea-foto": await png('<svg xmlns="http://www.w3.org/2000/svg" width="360" height="360"><rect width="360" height="360" fill="#2f4f6b"/><circle cx="180" cy="150" r="70" fill="#d8c3a5"/><path d="M60 360 C 80 250 130 220 180 220 C 230 220 280 250 300 360 Z" fill="#d8c3a5"/></svg>'),
  "marea-portada": await png('<svg xmlns="http://www.w3.org/2000/svg" width="360" height="240"><rect width="360" height="240" fill="#163a5f"/><path d="M0 170 Q 90 120 180 170 T 360 170 V240 H0Z" fill="#3c7ea8"/><circle cx="120" cy="110" r="26" fill="#f0e2c8"/><rect x="104" y="134" width="32" height="56" rx="10" fill="#f0e2c8"/><circle cx="240" cy="100" r="24" fill="#f0e2c8"/><rect x="226" y="122" width="28" height="60" rx="10" fill="#f0e2c8"/></svg>'),
  "lunaria-portada": await png('<svg xmlns="http://www.w3.org/2000/svg" width="360" height="240"><rect width="360" height="240" fill="#3b2a4f"/><rect x="40" y="150" width="280" height="90" fill="#22182f"/><rect x="120" y="40" width="120" height="90" fill="#f4d58d"/><circle cx="90" cy="160" r="14" fill="#c9b6e4"/><circle cx="270" cy="165" r="14" fill="#c9b6e4"/><circle cx="180" cy="170" r="14" fill="#c9b6e4"/></svg>'),
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
const r = lanzar([path.join(AQUI, "respaldo-local/server.mjs"), String(pr)], { ...reloj, RESPALDO_COMPLETAR: "1" });
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
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA, locale: "es-MX", timezoneId: "America/Mexico_City" });
await ctx.clock.setFixedTime(new Date(AHORA));
await ctx.addCookies([{ name: "sb-127-auth-token", value: cookieDe(ADMIN), url: base }]);
await ctx.route("**/_vercel/**", (q) => q.fulfill({ contentType: "text/javascript", body: "" }));
await ctx.route((u) => u.hostname !== "127.0.0.1", (q) => {
  const url = new URL(q.request().url());
  const mini = url.hostname === "miniaturas.example" && MINIATURAS[url.pathname.slice(1).replace(/\.jpg$/, "")];
  if (mini) return q.fulfill({ contentType: "image/jpeg", body: mini });
  if (q.request().resourceType() === "image") return q.fulfill({ contentType: "image/svg+xml", body: IMAGEN });
  return q.abort();
});
const page = await ctx.newPage();
const errores = [];
page.on("pageerror", (e) => errores.push(String(e.message).slice(0, 200)));
page.on("console", (m) => m.type() === "error" && errores.push(`consola: ${m.text().slice(0, 200)}`));

const quieto = async (ms = 700) => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
};
const foto = async (nombre) => {
  await quieto();
  await page.screenshot({ path: path.join(SALIDA, `${nombre}.png`) });
  console.log("  ", nombre);
};
const medir = () =>
  page.evaluate(() => ({
    anchoDePagina: document.documentElement.scrollWidth,
    miniaturas: [...document.querySelectorAll("main img[loading=lazy]")].map((i) => `${Math.round(i.getBoundingClientRect().width)}×${Math.round(i.getBoundingClientRect().height)}`),
  }));
const a = async (nombre) => {
  await page.getByRole("heading", { name: new RegExp(`^${nombre}`) }).first().evaluate((h) => h.scrollIntoView({ block: "start" }));
  await page.mouse.wheel(0, -60);
};

try {
  // 1 · Administración › Rutinas: «Completar fichas» encendida, cómo le fue esta semana, y Corridas con el gasto.
  await page.goto(`${base}/admin`, { waitUntil: "load" });
  await a("Rutinas");
  await foto("01-rutinas-encendida");
  // 2 · Al tocar la palanca se apaga (se guarda al tocar).
  await page.getByRole("switch", { name: "Completar fichas cada semana" }).tap();
  await page.waitForFunction(() => document.querySelector('[role=switch][aria-label="Completar fichas cada semana"]')?.getAttribute("aria-checked") === "false");
  await foto("02-rutinas-apagada");
  // 3 · Corridas: la de fichas de hoy con lo que dejó.
  await page.goto(`${base}/admin/corridas`, { waitUntil: "load" });
  await foto("03-corridas");
  // 4 · Su informe: revisadas, propuestas por campo, gasto y «sin fuente».
  await page.getByRole("link", { name: /Fichas · San Miguel de Allende/ }).first().tap();
  await page.waitForURL(`**/admin/corridas/${CORRIDA_FICHAS}`);
  await foto("04-informe");
  console.log("    ", JSON.stringify(await medir()));
  await a("Sin fuente");
  await foto("05-informe-sin-fuente");
  // 6 · La bandeja de la ciudad: cada campo con su miniatura o su texto, su fuente y su confianza.
  await page.goto(`${base}/admin/ciudades/san-miguel-de-allende/propuestas`, { waitUntil: "load" });
  await page.getByRole("heading", { name: "Instagram de la ficha" }).first().evaluate((h) => h.scrollIntoView({ block: "start" }));
  await page.mouse.wheel(0, -60);
  await foto("06-propuestas");
  console.log("    ", JSON.stringify(await medir()));
  await page.mouse.wheel(0, 700);
  await foto("07-propuestas-abajo");
  // 8 · El panel de la ciudad: la tarjeta «Fichas» con su botón, y su hoja.
  await page.goto(`${base}/admin/ciudades/san-miguel-de-allende`, { waitUntil: "load" });
  await page.getByRole("group", { name: "Fichas" }).evaluate((g) => g.scrollIntoView({ block: "center" }));
  await foto("08-panel-tarjeta-fichas");
  await page.getByRole("group", { name: "Fichas" }).getByRole("button", { name: "Completar fichas" }).tap();
  await page.getByRole("dialog", { name: /Completar fichas en San Miguel de Allende/ }).waitFor();
  await foto("09-hoja-completar-fichas");
  console.log("errores de página y consola:", errores.length ? errores : "ninguno");
} finally {
  await browser.close();
}
process.exit(0);
