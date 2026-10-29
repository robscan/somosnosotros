// OL-477 (bitácora 509): las capturas, la medición y el recorrido con toques reales del prototipo `instagram-calendario.html` (Chrome de la Mac,
// playwright-core). Saca cada estado a 390 × 844 (2×) dentro del marco y el armazón entero a 1440; mide cada estado a 320, 390 y 430 con el medidor
// del prototipo (textos cortados, desborde, toques fuera de la pantalla y toques menores de 44 en lo nuevo) y recorre los toques: el ratón del
// navegador sobre el punto del elemento (Playwright `click`, que comprueba que lo que recibe el toque es ese elemento), nunca `element.click()`.
//
//   node scripts/ops/auditoria-ui/capturar-instagram-calendario.mjs <carpeta> [--solo=medir|capturas|recorrido]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const RAIZ = path.resolve(AQUI, "../../..");
const { chromium } = createRequire(path.join(RAIZ, "package.json"))("playwright-core");
const MAC = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SALIDA = process.argv[2];
const solo = (process.argv.find((a) => a.startsWith("--solo=")) ?? "").slice(7);
if (!SALIDA) { console.error("uso: capturar-instagram-calendario.mjs <carpeta>"); process.exit(1); }
fs.mkdirSync(SALIDA, { recursive: true });
const URL_PROTO = "file://" + path.join(RAIZ, "docs/rediseno/prototipos/instagram-calendario.html");

const browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE || (fs.existsSync(MAC) ? MAC : undefined), headless: true });
const errores = [];
const nueva = async (ancho = 1440) => {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: 1400 }, deviceScaleFactor: 2, locale: "es-MX" });
  await ctx.addInitScript(() => { try { localStorage.clear(); } catch {} });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error" && !/fonts\.g/.test(m.text())) errores.push(m.text()); });
  await page.goto(URL_PROTO);
  await page.evaluate(() => window.prototipo.listo());
  return page;
};
const ir = (page, id, ancho = 390) => page.evaluate(([i, a]) => window.prototipo.ir(i, a), [id, ancho]);
const tel = (page) => page.frameLocator("#tel");
const esperarFuentes = (page) => page.evaluate(() => document.getElementById("tel").contentDocument.fonts.ready.then(() => true));

const page = await nueva();
const estados = await page.evaluate(() => window.prototipo.estados());

// 1. La medición de cada estado a 320, 390 y 430.
if (!solo || solo === "medir") {
  const filas = [];
  for (const id of estados) for (const ancho of [320, 390, 430]) {
    const r = await ir(page, id, ancho);
    filas.push({ id, ancho, ...r });
  }
  fs.writeFileSync(path.join(SALIDA, "medicion.json"), JSON.stringify(filas, null, 1));
  const mal = filas.filter((f) => f.cortados || f.desborde || f.fuera || f.toques);
  for (const f of filas.filter((x) => x.ancho === 390)) console.log(`${f.id.padEnd(18)} nodos ${f.nodos} · prof ${f.prof} · nuevo ${f.bloque}/${f.profBloque} · sin clase ${f.sinClase} · cortes ${f.cortados} (a propósito ${f.cede}) · desborde ${f.desborde} · fuera ${f.fuera} · <44 ${f.toques}`);
  console.log(mal.length ? "CON NOVEDADES:\n" + mal.map((f) => `  ${f.id}@${f.ancho}: cortes ${f.queCorta.join(" | ")} · desborde ${f.desborde} · fuera ${f.fuera} · <44 ${f.chicos.join(", ")}`).join("\n") : "medición: 0 textos cortados, 0 desbordes, 0 toques fuera, 0 toques < 44 en todos los estados y anchos");
}

// 2. Las capturas: cada estado a 390 dentro del marco, unos a 320 y 430, y el armazón entero.
const CAPTURAS = [
  ["01-hoy-lista", "hoy-lista"], ["02-hoy-hoja", "hoy-hoja"],
  ["03-semana-esta", "a-esta"], ["04-semana-viene", "a-viene"], ["05-pestana-eventos", "a-eventos"], ["06-publicando", "a-publicando"], ["07-quitado", "a-quitado"],
  ["08-variante-b", "b-esta"], ["09-variante-t", "t-esta"],
  ["10-dia-lugar", "h-leonora"], ["11-dia-lugar-historia", "h-leonora-916"], ["12-dia-artista-sin-fecha", "h-nube"], ["13-cambiar", "h-cambiar"], ["14-dia-artista-con-fecha", "h-valeria"],
  ["15-dia-evento", "h-susurros"], ["16-dia-esta-semana", "h-semana"], ["17-dia-descanso", "h-descanso"],
  ["18-texto-artista-con-fecha", "t-texto-valeria"], ["19-texto-artista-sin-fecha", "t-texto-nube"], ["20-texto-lugar", "t-texto-leonora"],
  ["21-avisar", "v-avisar"], ["22-avisado", "v-avisada"], ["23-dijo-no", "v-dijo-no"], ["24-cambiado", "a-cambiado"], ["25-ficha-fuera", "v-ficha"],
  ["26-publicado-medicion", "m-publicado"],
];
if (!solo || solo === "capturas") {
  for (const [nombre, id] of CAPTURAS) {
    await ir(page, id, 390);
    await esperarFuentes(page);
    await page.waitForTimeout(250);
    // La hoja abierta: su cuerpo arriba; la lista: arriba.
    await page.locator("#tel").screenshot({ path: path.join(SALIDA, `${nombre}.png`) });
  }
  // Abajo de la hoja (el texto, Facebook, «Quitar» y el botón) en dos días.
  for (const [nombre, id] of [["10b-dia-lugar-abajo", "h-leonora"], ["14b-dia-artista-con-fecha-abajo", "h-valeria"]]) {
    await ir(page, id, 390);
    await esperarFuentes(page);
    await page.evaluate(() => { const d = document.getElementById("tel").contentDocument; const c = d.querySelector('[role="dialog"] [class*="__cuerpo"]'); if (c) c.scrollTop = c.scrollHeight; });
    await page.waitForTimeout(250);
    await page.locator("#tel").screenshot({ path: path.join(SALIDA, `${nombre}.png`) });
  }
  for (const [nombre, id, ancho] of [["27-semana-320", "a-esta", 320], ["28-semana-430", "a-esta", 430], ["29-dia-artista-320", "h-nube", 320], ["30-semana-1280", "a-esta", 1280]]) {
    await ir(page, id, ancho);
    await esperarFuentes(page);
    await page.waitForTimeout(250);
    await page.locator("#tel").screenshot({ path: path.join(SALIDA, `${nombre}.png`) });
  }
  await ir(page, "a-esta", 390);
  await page.screenshot({ path: path.join(SALIDA, "00-armazon.png"), fullPage: false });
}

// 3. El recorrido con toques reales, desde el estado de entrada.
if (!solo || solo === "recorrido") {
  const p = await nueva();
  const pasos = [];
  const paso = async (que, fn, espera) => {
    await fn();
    await p.waitForFunction((e) => document.documentElement.dataset.pintado?.startsWith(e + "@"), espera, { timeout: 5000 }).then(() => pasos.push(`bien · ${que}`), () => pasos.push(`MAL · ${que} (esperaba ${espera}, está ${"?"})`));
  };
  const t = tel(p);
  await paso("entrar: Esta semana", async () => {}, "a-esta");
  await paso("chip «La que viene»", () => t.getByRole("button", { name: "La que viene" }).click(), "a-viene");
  await paso("chip «Esta semana»", () => t.getByRole("button", { name: "Esta semana" }).click(), "a-esta");
  await paso("pestaña «Eventos»", () => t.getByRole("tab", { name: "Eventos" }).click(), "a-eventos");
  await paso("pestaña «Semana»", () => t.getByRole("tab", { name: "Semana" }).click(), "a-esta");
  await paso("tocar el día de hoy (el museo)", () => t.locator('a[data-casilla="mie7"]').click(), "h-leonora");
  await paso("chip «Historia 9:16»", () => t.getByRole("button", { name: "Historia 9:16" }).click(), "h-leonora-916");
  await paso("chip «Publicación 4:5»", () => t.getByRole("button", { name: "Publicación 4:5" }).click(), "h-leonora");
  await paso("abrir el texto", () => t.getByRole("button", { name: "Texto de la publicación" }).click(), "t-texto-leonora");
  await paso("«Listo»", () => t.getByRole("button", { name: "Listo" }).click(), "h-leonora");
  await paso("«Publicar ahora»", () => t.getByRole("button", { name: "Publicar ahora" }).click(), "a-publicando");
  await paso("volver: «Esta semana»", () => t.getByRole("button", { name: "Esta semana" }).click(), "a-esta");
  await paso("el día de hoy otra vez", () => t.locator('a[data-casilla="mie7"]').click(), "h-leonora");
  await paso("«Quitar de la semana»", async () => { await t.getByRole("button", { name: "Quitar de la semana" }).scrollIntoViewIfNeeded(); await t.getByRole("button", { name: "Quitar de la semana" }).click(); }, "a-quitado");
  await paso("lunes 5 (publicado)", () => t.locator('a[data-casilla="lun5"]').click(), "m-publicado");
  await paso("la ✕ de la hoja", () => t.getByRole("button", { name: "Cerrar" }).click(), "a-quitado");
  await paso("«La que viene»", () => t.getByRole("button", { name: "La que viene" }).click(), "a-viene");
  await paso("lunes 12 (artista sin fecha)", () => t.locator('a[data-casilla="lun12"]').click(), "h-nube");
  await paso("«Cambiar»", () => t.getByRole("button", { name: "Cambiar" }).click(), "h-cambiar");
  await paso("elegir a Ximena", () => t.locator('a[data-elegir="ximena"]').click(), "a-cambiado");
  await paso("lunes 12 en «La que viene»", async () => { await t.getByRole("button", { name: "La que viene" }).click(); await p.waitForFunction(() => document.documentElement.dataset.pintado?.startsWith("a-viene@")); await t.locator('a[data-casilla="lun12"]').click(); }, "h-nube");
  await paso("«Avisar»", () => t.getByRole("button", { name: "Avisar" }).click(), "v-avisar");
  await paso("«Copiar y abrir su Instagram»", () => t.getByRole("button", { name: "Copiar y abrir su Instagram" }).click(), "v-avisada");
  await paso("«Dijo que no»", () => t.getByRole("button", { name: "Dijo que no" }).click(), "v-dijo-no");
  await paso("«Mejor no»", () => t.getByRole("button", { name: "Mejor no" }).click(), "v-avisada");
  await paso("«Dijo que no» otra vez", () => t.getByRole("button", { name: "Dijo que no" }).click(), "v-dijo-no");
  await paso("«Sí, sacarlo de Instagram»", () => t.getByRole("button", { name: "Sí, sacarlo de Instagram" }).click(), "a-cambiado");
  await paso("viernes 16 (artista con fecha)", async () => { await t.getByRole("button", { name: "La que viene" }).click(); await p.waitForFunction(() => document.documentElement.dataset.pintado?.startsWith("a-viene@")); await t.locator('a[data-casilla="vie16"]').click(); }, "h-valeria");
  await paso("el velo cierra la hoja", () => t.locator('[class*="Hoja-module"][class*="__fondo"]').click({ position: { x: 20, y: 20 } }), "a-viene");
  await paso("jueves 15 («Esta semana»)", () => t.locator('a[data-casilla="jue15"]').click(), "h-semana");
  await paso("la ✕", () => t.getByRole("button", { name: "Cerrar" }).click(), "a-viene");
  await paso("domingo 18 (descanso)", () => t.locator('a[data-casilla="dom18"]').click(), "h-descanso");
  // Ningún desplazamiento a lo ancho a 390 en la semana.
  await ir(p, "a-esta", 390);
  const ancho = await p.evaluate(() => { const d = document.getElementById("tel").contentDocument.documentElement; return [d.scrollWidth, d.clientWidth]; });
  pasos.push(`${ancho[0] <= ancho[1] ? "bien" : "MAL"} · sin desplazamiento a lo ancho a 390 (${ancho[0]}/${ancho[1]})`);
  fs.writeFileSync(path.join(SALIDA, "recorrido.txt"), pasos.join("\n") + "\n");
  console.log(pasos.join("\n"));
  console.log(`recorrido: ${pasos.filter((x) => x.startsWith("bien")).length} de ${pasos.length}`);
}
console.log(errores.length ? "ERRORES DE PÁGINA:\n" + [...new Set(errores)].join("\n") : "sin errores de página ni de consola");
await browser.close();
