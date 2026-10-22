// Capturas de la bitácora 471 (OL-439): «Investigar» a varios desde la lista del Showcase —el renglón que propone, su hoja, la lista
// investigando (con la recarga suave de 20 s) y la lista con evidencias por revisar— con la app compilada contra el respaldo local y la sesión de
// la cuenta de administración del respaldo. Chrome real (playwright-core, channel: 'chrome'), 390×844 a 2×. Toques reales (clics de Playwright).
// node scripts/ops/auditoria-ui/capturar-investigar-lote.mjs <raíz del árbol> <carpeta de salida>
// Compila `.next` contra el respaldo (SIN_BUILD=1 usa el `.next` que ya hay, compilado por este script: el respaldo va en el puerto 8871). Correrlo
// en un árbol SIN `.env` (con él se niega a correr).
// Desde un arranque propio en una carpeta temporal (el fixture no cambia): dos candidatos marcados más (Aaron Cadena y Rocío Lozano: con la
// Orquesta, revisada, y Abril Merlot son los cuatro «por investigar»), el crédito de la API y un puerto de control que hace de motor: `/avanzar`
// deja la orden a medias (dos terminadas con evidencias, una corriendo, una esperando) y `/terminar` la acaba. El motor de verdad no corre aquí
// (sin `CRON_SECRET`, el primer paso no sale): lo que se prueba es la pantalla.
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

const puertoLibre = () => new Promise((ok) => { const s = net.createServer().listen(0, () => { const p = s.address().port; s.close(() => ok(p)); }); });
const [pr, pa, pc] = [Number(process.env.PUERTO_RESPALDO ?? 8871), await puertoLibre(), await puertoLibre()];

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "investigar-lote-respaldo-"));
const arranque = path.join(tmp, "respaldo.mjs");
const fixture = pathToFileURL(path.join(AQUI, "respaldo-local/fixture.mjs")).href;
const servidor = pathToFileURL(path.join(AQUI, "respaldo-local/server.mjs")).href;
fs.writeFileSync(
  arranque,
  `import http from "node:http";
import { tablas, ADMIN } from ${JSON.stringify(fixture)};
const hace = (n) => new Date(Date.now() - n * 86400e3).toISOString();
const CADENA = "cccc0001-0000-4000-8000-000000000002", ROCIO = "cccc0003-0000-4000-8000-000000000001";
const marcado = (artista_id) => ({ artista_id, estado: "candidato", puntaje_circulacion: null, puntaje_obra: null, puntaje_actividad: null, puntaje_vinculo: null, notas: null, actualizado_por: ADMIN, actualizado_en: hace(1) });
tablas.showcase_candidatos.push(marcado(CADENA), marcado(ROCIO));
tablas.configuracion = [{ clave: "credito_api_usd", valor: 200 }, { clave: "credito_api_vence", valor: "2026-11-11" }];
// El «motor» de las capturas: cambia en memoria las corridas que creó la hoja (en el orden en que se crearon).
let n = 0;
const evidencia = (artista_id, titulo, url, senal = "obra", tipo = "prensa") => ({ id: "cccc0471-0000-4000-8000-" + String(++n).padStart(12, "0"), artista_id, senal, tipo, titulo, url, fecha: null, fuente: new URL(url).hostname, leida_por: "rutina", estado: "propuesta", creado_en: new Date().toISOString() });
const terminar = (c, gasto, propuestas, titulos) => {
  Object.assign(c, { estado: "terminada", gasto_usd: gasto, inicio: hace(0.01), fin: new Date().toISOString(), resumen: { paso: "4 de 4 búsquedas", avance: 1, propuestas } });
  titulos.forEach((t, i) => tablas.showcase_evidencias.push(evidencia(c.parametros.artista_id, t, "https://prensa-local.example/notas/" + c.parametros.artista_id.slice(-4) + "-" + i)));
};
http.createServer((req, res) => {
  const orden = tablas.rutinas_corridas.filter((c) => c.tipo === "showcase");
  if (req.url === "/avanzar") {
    terminar(orden[0], 0.41, 3, ["Reseña de su concierto de temporada", "Nota sobre su gira por el Bajío", "Entrevista en la radio universitaria"]);
    terminar(orden[1], 0.37, 0, []);
    Object.assign(orden[2], { estado: "corriendo", gasto_usd: 0.12, inicio: hace(0.002), resumen: { paso: "2 de 4 búsquedas", avance: 0.5, turno: 2, ocupada_hasta: new Date(Date.now() + 300e3).toISOString(), actualizada: new Date().toISOString(), propuestas: 1 } });
    tablas.showcase_evidencias.push(evidencia(orden[2].parametros.artista_id, "Seleccionada en un estímulo estatal a la creación", "https://cultura-estatal.example/estimulos/2025", "obra", "beca"));
  }
  if (req.url === "/terminar") {
    terminar(orden[2], 0.39, 1, []);
    terminar(orden[3], 0.44, 2, ["Exposición individual en una galería del centro", "Fotografía en el catálogo de una bienal"]);
  }
  res.end(JSON.stringify(orden.map((c) => [c.parametros.artista_id, c.estado])));
}).listen(${pc}, "127.0.0.1");
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
async function esperar(url, h) {
  for (let i = 0; i < 300; i++) {
    if (h.exitCode !== null) throw new Error(`se cerró\n${h.registro()}`);
    try { if ((await fetch(url)).status < 500) return; } catch {}
    await new Promise((ok) => setTimeout(ok, 200));
  }
  throw new Error(`no respondió: ${url}\n${h.registro()}`);
}

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
const motor = (que) => fetch(`http://127.0.0.1:${pc}/${que}`).then((x) => x.text());

const IMAGEN = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#b9b4a8"/></svg>';
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--hide-scrollbars"] });
const errores = [];
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA, locale: "es-MX", timezoneId: "America/Mexico_City" });
await ctx.clock.setFixedTime(new Date(AHORA));
await ctx.addCookies([{ name: "sb-127-auth-token", value: cookieDe(ADMIN), url: base }]);
await ctx.route("**/_vercel/**", (q) => q.fulfill({ contentType: "text/javascript", body: "" }));
await ctx.route((u) => u.hostname !== "127.0.0.1", (q) => (q.request().resourceType() === "image" ? q.fulfill({ contentType: "image/svg+xml", body: IMAGEN }) : q.abort()));
const page = await ctx.newPage();
page.on("pageerror", (e) => errores.push(String(e.message).slice(0, 200)));
page.on("console", (m) => m.type() === "error" && errores.push(`consola: ${m.text().slice(0, 200)}`));

const foto = async (nombre) => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(SALIDA, `${nombre}.png`) });
  console.log("  ", nombre);
};
const medir = () => page.evaluate(() => ({ ancho: document.documentElement.scrollWidth, alto: innerHeight }));
const renglon = () => page.getByRole("button", { name: /^Investigar/ });
const textoRenglon = () => renglon().locator("small").innerText();
const investiga = () =>
  page.locator("ul[aria-label=Candidatos] > li").evaluateAll((lis) =>
    lis.map((li) => [li.querySelector("a")?.textContent, [...li.querySelectorAll("p")].map((p) => p.textContent).find((t) => /Investig|por revisar/.test(t)) ?? "—", li.querySelector("p[data-revisar]") ? "violeta" : ""].join(" · ")),
  );

try {
  // 01 · Antes: el renglón propone a los cuatro candidatos marcados por investigar; Feleal dice sus dos evidencias por revisar (en violeta).
  await page.goto(`${base}/admin/showcase`, { waitUntil: "load" });
  await page.getByRole("heading", { name: "Showcase" }).waitFor();
  console.log("     renglón:", await textoRenglon(), JSON.stringify(await medir()));
  console.log("     tarjetas:", (await investiga()).join(" | "));
  await foto("01-lista-renglon-investigar");
  // 02 · La hoja con toques reales: a quiénes, el tope (1,00 y su ✕) y el total.
  await renglon().click();
  const hoja = page.getByRole("dialog", { name: "Investigar a varios" });
  await hoja.waitFor();
  console.log("     hoja:", (await hoja.innerText()).replace(/\s+/g, " ").slice(0, 600));
  await foto("02-hoja-investigar-a-varios");
  // 03 · «Los que se ven en la lista»: sin filtro, los siete del respaldo (ninguno investigado ni descartado), con su total.
  await hoja.getByRole("button", { name: /^Los que se ven en la lista/ }).click();
  console.log("     los que se ven:", (await hoja.getByRole("button", { name: /^Los que se ven en la lista/ }).innerText()).replace(/\s+/g, " "), "·", await hoja.locator("p[role=status]").last().innerText());
  await foto("03-hoja-los-que-se-ven");
  await hoja.getByRole("button", { name: /^Candidatos por investigar/ }).click();
  // Confirmar: «Investigar a los 4» crea las cuatro corridas de una orden y la lista dice «Investigando a 4».
  await hoja.getByRole("button", { name: "Investigar a los 4" }).click();
  await hoja.waitFor({ state: "detached" });
  await page.getByText(/^Investigando a 4 · 0 terminados/).waitFor();
  console.log("     tras confirmar:", await textoRenglon(), "· el respaldo:", await motor("estado"));
  // 04 · El motor avanza (aquí, el puerto de control): sin tocar nada, la recarga suave de 20 s trae lo nuevo.
  await motor("avanzar");
  const antes = Date.now();
  await page.getByText(/^Investigando a 4 · 2 terminados/).waitFor({ timeout: 30_000 });
  console.log(`     la lista se volvió a leer sola a los ${Math.round((Date.now() - antes) / 1000)} s:`, await textoRenglon(), "· barra:", await renglon().getByRole("progressbar").getAttribute("aria-valuenow"));
  console.log("     tarjetas:", (await investiga()).join(" | "));
  // Con el filtro «Candidatos» se ven juntos los de la orden.
  await page.getByRole("button", { name: /^Estado: Todos/ }).click();
  await page.getByRole("dialog", { name: "Ver por estado" }).getByRole("button", { name: /^Candidato/ }).click();
  await page.getByRole("dialog").waitFor({ state: "detached" });
  await page.waitForFunction(() => location.search === "?estado=candidato");
  console.log("     filtro candidato:", (await investiga()).join(" | "));
  await foto("04-lista-investigando");
  // 05 · La orden acaba: el renglón dice cuántos se investigaron hoy y cuántas evidencias dejan por revisar; cada tarjeta, la suya en violeta.
  await motor("terminar");
  await page.getByText(/^4 investigados hoy/).waitFor({ timeout: 30_000 });
  console.log("     acabada:", await textoRenglon());
  console.log("     tarjetas:", (await investiga()).join(" | "));
  await foto("05-lista-evidencias-por-revisar");
  console.log("     ancho:", JSON.stringify(await medir()));
} finally {
  await browser.close();
}
console.log(errores.length ? `errores de página o consola:\n  ${errores.join("\n  ")}` : "sin errores de página ni de consola");
process.exit(0);
