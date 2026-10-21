// Capturas de la bitácora 465 (OL-430): «Investigar» en la ficha de showcase —sin investigar, su hoja con el tope, investigando y ya
// investigado— con la app compilada contra el respaldo local y la sesión de la cuenta de administración del respaldo. Chrome real (playwright-core,
// channel: 'chrome'), 390×844 a 2×. Toques reales (clics de Playwright).
// node scripts/ops/auditoria-ui/capturar-investigar.mjs <raíz del árbol> <carpeta de salida>
// Compila `.next` contra el respaldo (SIN_BUILD=1 usa el `.next` que ya hay, compilado por este script: el respaldo va en el puerto 8869). Correrlo
// en un árbol SIN `.env` (con él se niega a correr).
// El respaldo de siempre no tiene corridas de «Investigar» ni el crédito, y su servidor no entiende el filtro `parametros->>artista_id`: aquí, desde un
// arranque propio en la carpeta temporal (el fixture no cambia), se le añaden dos corridas inventadas (0Backside0 investigando; Pimpolina
// investigada, con cinco evidencias por revisar), el crédito y, en cada corrida, la clave plana que ese filtro busca.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [RAIZ, SALIDA] = process.argv.slice(2).map((p) => path.resolve(p));
if (fs.existsSync(path.join(RAIZ, ".env"))) { console.error("hay un .env en el árbol: la app cargaría llaves reales. Córrelo en un árbol sin .env"); process.exit(1); }
const { chromium } = await import(path.join(RAIZ, "node_modules/playwright-core/index.mjs"));
const { ADMIN, cookieDe } = await import(path.join(RAIZ, "scripts/ops/auditoria-ui/respaldo-local/fixture.mjs"));
const NEXT = path.join(RAIZ, "node_modules/next/dist/bin/next");
const AQUI = path.join(RAIZ, "scripts/ops/auditoria-ui");
const AHORA = "2026-10-21T16:00:00Z"; // miércoles 21 de octubre, 10:00 en San Luis Potosí
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
fs.mkdirSync(SALIDA, { recursive: true });

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "investigar-respaldo-"));
const arranque = path.join(tmp, "respaldo.mjs");
const fixture = pathToFileURL(path.join(AQUI, "respaldo-local/fixture.mjs")).href;
const servidor = pathToFileURL(path.join(AQUI, "respaldo-local/server.mjs")).href;
fs.writeFileSync(
  arranque,
  `import { tablas, ADMIN } from ${JSON.stringify(fixture)};
const hace = (n) => new Date(Date.now() - n * 86400e3).toISOString();
const BACKSIDE = "cccc0001-0000-4000-8000-000000000005", PIMPOLINA = "cccc0001-0000-4000-8000-000000000003";
const sho = (id, artista, estado, gasto, resumen, dias) => ({
  id, tipo: "showcase", ciudad: null, parametros: { artista_id: artista }, "parametros->>artista_id": artista, tope_usd: 1, gasto_usd: gasto, estado, resumen,
  creado_por: ADMIN, creado_en: hace(dias), inicio: hace(dias), fin: estado === "terminada" ? hace(dias - 0.003) : null,
});
tablas.rutinas_corridas.push(
  sho("abab0001-0000-4000-8000-000000000101", BACKSIDE, "corriendo", 0.12, { paso: "2 de 4 búsquedas", avance: 0.5, turno: 2, ocupada_hasta: new Date(Date.now() + 300e3).toISOString(), actualizada: hace(0.0005), propuestas: 2 }, 0.002),
  sho("abab0001-0000-4000-8000-000000000102", PIMPOLINA, "terminada", 0.38, { paso: "4 de 4 búsquedas", avance: 1, propuestas: 5, busquedas_web: 4 }, 0.1),
);
for (const c of tablas.rutinas_corridas) c["parametros->>artista_id"] ??= c.parametros?.artista_id ?? null;
tablas.configuracion = [{ clave: "credito_api_usd", valor: 200 }, { clave: "credito_api_vence", valor: "2026-11-11" }];
const ev = (n, senal, tipo, titulo, url, fecha, fuente) => ({ id: "cccc0027-0000-4000-8000-0000000001" + String(n).padStart(2, "0"), artista_id: PIMPOLINA, senal, tipo, titulo, url, fecha, fuente, leida_por: "rutina", estado: "propuesta", creado_en: hace(0.1) });
tablas.showcase_evidencias.push(
  ev(1, "obra", "beca", "Seleccionada en un estímulo estatal a la creación en teatro, 2025", "https://cultura-estatal.example/estimulos/2025/teatro", "2025-09-30", "Secretaría de Cultura del estado"),
  ev(2, "circulacion", "presentacion", "En el programa de un festival de clown en Guadalajara", "https://festival-clown.example/programa-2026", "2026-08-14", "Festival de Clown"),
  ev(3, "obra", "prensa", "Reseña de su temporada en el Teatro de la Paz", "https://prensa-local.example/teatro/pimpolina-temporada", "2026-09-02", "Prensa local"),
  ev(4, "circulacion", "presentacion", "Función en un foro de Querétaro", "https://agenda-qro.example/funciones/pimpolina", "2026-07-11", "Agenda de Querétaro"),
  ev(5, "actividad", "presentacion", "Anuncia funciones para noviembre en su sitio", "https://pimpolina.example/funciones", null, "pimpolina.example"),
);
await import(${JSON.stringify(servidor)});
`,
);

const hijos = [];
process.on("exit", () => {
  hijos.forEach((h) => h.exitCode === null && h.kill());
  fs.rmSync(tmp, { recursive: true, force: true });
});
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

const [pr, pa] = [Number(process.env.PUERTO_RESPALDO ?? 8869), await puertoLibre()];
const respaldo = `http://127.0.0.1:${pr}`;
const base = `http://127.0.0.1:${pa}`;
const reloj = { RELOJ_FIJO: AHORA, TZ: "America/Mexico_City", NODE_OPTIONS: `--require=${path.join(AQUI, "reloj-fijo.cjs")}` };
const app = { NEXT_PUBLIC_SUPABASE_URL: respaldo, NEXT_PUBLIC_SUPABASE_ANON_KEY: "llave-anon-inventada", NEXT_PUBLIC_MAPBOX_TOKEN: "pk.inventado", SUPABASE_SERVICE_ROLE_KEY: "llave-servicio-inventada" };
const r = lanzar([arranque, String(pr)], reloj);
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
async function contexto() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.clock.setFixedTime(new Date(AHORA));
  await ctx.addCookies([{ name: "sb-127-auth-token", value: cookieDe(ADMIN), url: base }]);
  await ctx.route("**/_vercel/**", (q) => q.fulfill({ contentType: "text/javascript", body: "" }));
  await ctx.route((u) => u.hostname !== "127.0.0.1", (q) => (q.request().resourceType() === "image" ? q.fulfill({ contentType: "image/svg+xml", body: IMAGEN }) : q.abort()));
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(String(e.message).slice(0, 200)));
  page.on("console", (m) => m.type() === "error" && errores.push(`consola: ${m.text().slice(0, 200)}`));
  return { ctx, page };
}
const foto = async (page, nombre) => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(SALIDA, `${nombre}.png`) });
  console.log("  ", nombre);
};
const medir = (page) => page.evaluate(() => ({ ancho: document.documentElement.scrollWidth, nodos: document.querySelector("main").querySelectorAll("*").length }));
const subir = (loc) => loc.evaluate((e) => window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 70));
const renglon = (page) => page.getByRole("button", { name: /^Investigar/ });

try {
  // 01 y 02 · Feleal, sin investigar: el renglón dice lo que hace; su hoja, con el tope de 1,00 y el crédito.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/showcase/feleal`, { waitUntil: "load" });
    await page.getByRole("heading", { name: "Feleal" }).waitFor();
    await subir(page.getByRole("heading", { name: "Investigación" }));
    console.log("     renglón:", (await renglon(page).innerText()).replace(/\s+/g, " "), JSON.stringify(await medir(page)));
    await foto(page, "01-ficha-investigar");
    await renglon(page).click();
    await page.getByRole("dialog", { name: "Investigar a Feleal" }).waitFor();
    await foto(page, "02-hoja-investigar");
    // 05 · La ⓘ abierta: tocar el renglón lo explica (qué hace y cuánto cuesta) en vez de abrir su hoja.
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "detached" });
    await page.getByRole("button", { name: /^Ayuda/ }).click();
    await renglon(page).click();
    await page.getByText(/^La rutina busca en la web premios/).waitFor();
    await foto(page, "05-ayuda-investigar");
    await ctx.close();
  }
  // 03 · 0Backside0, investigando: «Investigando · 2 de 4 búsquedas · 0,12 de 1,00 USD» con su barra.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/showcase/0backside0`, { waitUntil: "load" });
    await page.getByRole("heading", { name: "0Backside0" }).waitFor();
    await subir(page.getByRole("heading", { name: "Investigación" }));
    console.log("     renglón:", (await renglon(page).innerText()).replace(/\s+/g, " "), JSON.stringify(await medir(page)));
    await foto(page, "03-ficha-investigando");
    await ctx.close();
  }
  // 04 · Pimpolina, investigada: «Investigado el 21 oct · 5 evidencias por revisar · 0,38 USD» y, debajo, «Por revisar» con lo que trajo.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/showcase/pimpolina`, { waitUntil: "load" });
    await page.getByRole("heading", { name: "Pimpolina" }).waitFor();
    await subir(page.getByRole("heading", { name: "Investigación" }));
    console.log("     renglón:", (await renglon(page).innerText()).replace(/\s+/g, " "), JSON.stringify(await medir(page)));
    await foto(page, "04-ficha-investigado");
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log(errores.length ? `errores de página o consola:\n  ${errores.join("\n  ")}` : "sin errores de página ni de consola");
process.exit(0);
