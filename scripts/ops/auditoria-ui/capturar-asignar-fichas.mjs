// Capturas de la bitácora 479 (OL-447): asignar desde la ficha de una persona en Administración una ficha de lugar o de artista, con la app
// compilada contra el respaldo local (RESPALDO_PERSONAS=1) y la sesión de la cuenta de administración del respaldo. Chrome real (playwright-core,
// channel: 'chrome'), 390×844 a 2×, toques reales (`tap` sobre el elemento) y el teclado para escribir. Asignar y quitar cambian las ligas del
// respaldo en memoria. La persona es Lucía (entró hace dos días y no administra nada); Feleal ya lo administra Marcos.
// node scripts/ops/auditoria-ui/capturar-asignar-fichas.mjs <raíz del árbol> <carpeta de salida>
// Compila `.next` contra el respaldo (SIN_BUILD=1 usa el `.next` que ya hay). Correrlo en un árbol SIN `.env`.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

const [RAIZ, SALIDA] = process.argv.slice(2).map((p) => path.resolve(p));
if (fs.existsSync(path.join(RAIZ, ".env"))) { console.error("hay un .env en el árbol: la app cargaría llaves reales. Córrelo en un árbol sin .env"); process.exit(1); }
const { chromium } = await import(path.join(RAIZ, "node_modules/playwright-core/index.mjs"));
const { ADMIN, cookieDe } = await import(path.join(RAIZ, "scripts/ops/auditoria-ui/respaldo-local/fixture.mjs"));
const sharp = (await import(path.join(RAIZ, "node_modules/sharp/dist/index.mjs"))).default;
const NEXT = path.join(RAIZ, "node_modules/next/dist/bin/next");
const AQUI = path.join(RAIZ, "scripts/ops/auditoria-ui");
const AHORA = "2026-10-22T16:00:00Z"; // jueves 22 de octubre, 10:00 en San Luis Potosí
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
const LUCIA = "99999999-1111-4000-8000-000000000001";
fs.mkdirSync(SALIDA, { recursive: true });

// Las fotos inventadas de las personas del respaldo (`retratos.example`), como en capturar-persona-publicado.mjs.
async function retrato([fondo, borde, figura], ancho = 900, alto = 1125) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 900 1125"><defs><radialGradient id="g" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="${fondo}"/><stop offset="1" stop-color="${borde}"/></radialGradient></defs><rect width="900" height="1125" fill="url(#g)"/><circle cx="450" cy="430" r="190" fill="${figura}"/><path d="M90 1125 C 110 820 270 690 450 690 C 630 690 790 820 810 1125 Z" fill="${figura}"/></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}
const RETRATOS = {
  "lucia.png": await retrato(["#d9e8b9", "#5d7d2f", "#2b381b"]),
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
/** Lo que mide la pantalla (para la bitácora): si hay desplazamiento a lo ancho y el alto de los renglones de la sección. */
const medir = () =>
  page.evaluate(() => ({
    anchoDePagina: document.documentElement.scrollWidth,
    renglones: [...document.querySelectorAll('main ul[aria-label="Fichas que administra"] > li')].map((li) => Math.round(li.getBoundingClientRect().height)),
    hoja: (() => { const d = document.querySelector('[role=dialog]'); if (!d) return null; const r = d.getBoundingClientRect(); return { arriba: Math.round(r.top), alto: Math.round(r.height), ancho: Math.round(r.width) }; })(),
  }));
const alGrupo = async () => {
  await page.getByRole("heading", { name: "Fichas que administra" }).evaluate((h) => h.scrollIntoView({ block: "start" }));
  await page.mouse.wheel(0, -40);
};
const hoja = () => page.getByRole("dialog", { name: "Asignar una ficha" });

try {
  // 1 · La ficha de Lucía: Actividad y, debajo, «Fichas que administra» con solo «Asignar una ficha».
  await page.goto(`${base}/admin/personas/${LUCIA}`, { waitUntil: "load" });
  await page.getByRole("heading", { name: "Lucía Barragán" }).waitFor();
  await alGrupo();
  await foto("01-ficha-sin-fichas");
  console.log("    ", JSON.stringify(await medir()));
  // 2 · La hoja vacía: el campo enfocado, sin ✕ y la frase que dice qué escribir.
  await page.getByRole("button", { name: /Asignar una ficha/ }).tap();
  await hoja().waitFor();
  await foto("02-hoja-vacia");
  console.log("    ", JSON.stringify(await medir()));
  // 3 · Con resultados: «fe» trae a Feleal (artista; lo administra Marcos) y el Museo del Ferrocarril (lugar; nadie).
  await page.keyboard.type("fe", { delay: 60 });
  await hoja().getByRole("list", { name: "Fichas halladas" }).waitFor();
  await foto("03-hoja-resultados");
  console.log("     resultados:", JSON.stringify(await hoja().getByRole("list", { name: "Fichas halladas" }).getByRole("button").allInnerTexts()));
  // 4 · Al asignar: Feleal elegido, el aviso de que Marcos la sigue administrando y el botón que dice lo que pasará.
  await hoja().getByRole("button", { name: /Feleal/ }).tap();
  await hoja().getByRole("button", { name: "Asignar Feleal a Lucía Barragán" }).waitFor();
  await foto("04-al-asignar");
  console.log("    ", JSON.stringify(await medir()));
  // 5 · Asignada: la hoja se cierra, la línea lo confirma y la lista la trae con «Quitar».
  await hoja().getByRole("button", { name: "Asignar Feleal a Lucía Barragán" }).tap();
  await hoja().waitFor({ state: "detached" });
  await page.getByRole("list", { name: "Fichas que administra" }).waitFor();
  await alGrupo();
  await foto("05-lista-con-quitar");
  console.log("    ", JSON.stringify(await medir()));
  // 6 · Una segunda (un lugar sin nadie), para ver la lista con dos.
  await page.getByRole("button", { name: /Asignar una ficha/ }).tap();
  await hoja().waitFor();
  await page.keyboard.type("teatro", { delay: 60 });
  await hoja().getByRole("button", { name: /Teatro de la Paz/ }).tap();
  await hoja().getByRole("button", { name: "Asignar Teatro de la Paz a Lucía Barragán" }).tap();
  await hoja().waitFor({ state: "detached" });
  await page.getByRole("button", { name: "Quitar Teatro de la Paz" }).waitFor();
  await alGrupo();
  await foto("06-lista-dos-fichas");
  console.log("    ", JSON.stringify(await medir()));
  // 7 · «Quitar» pide confirmación con un solo botón.
  await page.getByRole("button", { name: "Quitar Feleal" }).tap();
  await page.getByRole("dialog", { name: "Quitar la ficha" }).waitFor();
  await foto("07-quitar-confirmar");
  // 8 · Quitada: queda solo el Teatro.
  await page.getByRole("dialog", { name: "Quitar la ficha" }).getByRole("button", { name: "Quitar la ficha" }).tap();
  await page.getByRole("dialog", { name: "Quitar la ficha" }).waitFor({ state: "detached" });
  await page.getByRole("button", { name: "Quitar Feleal" }).waitFor({ state: "detached" });
  await alGrupo();
  await foto("08-tras-quitar");
  console.log("    ", JSON.stringify(await medir()));
  console.log("errores de página y consola:", errores.length ? errores : "ninguno");
} finally {
  await browser.close();
}
process.exit(0);
