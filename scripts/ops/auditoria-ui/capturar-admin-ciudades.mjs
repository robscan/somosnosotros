// Capturas de Administración › Ciudades v2 (OL-432, bitácora 464; antes las de OL-427, bitácora 460) con la app compilada contra el respaldo
// local y la sesión de su cuenta de administración: la lista general, «Añadir ciudad» (Mapbox lo contesta el respaldo: `MAPBOX_API_URL` apunta
// a él), el panel de una ciudad recién abierta, con una búsqueda corriendo y propuestas por revisar, con «Falló» y «Llegó al tope», la bandeja
// de la ciudad, y la lista y el panel a 1280. Chrome real (playwright-core, channel: 'chrome'), 390×844 a 2×. Recorrido con toques reales (clics
// por coordenadas que fallan si algo tapa el botón): abrir la hoja, escribir, la ✕, elegir, «Cambiar» el nombre, «Abrir Puebla» al panel, la
// hoja de «Buscar lugares» con su ✕ y «Correr», Atrás a la lista, «Abrir» una detectada, «Ocultar» y «Deshacer», y la ruta vieja de la bandeja.
// node scripts/ops/auditoria-ui/capturar-admin-ciudades.mjs <raíz del árbol> <carpeta de salida>
// Compila `.next` contra el respaldo (SIN_BUILD=1 usa el `.next` que ya hay). Correrlo en un árbol SIN `.env` (si lo encuentra, se niega).
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

const [RAIZ, SALIDA] = process.argv.slice(2).map((p) => path.resolve(p));
if (fs.existsSync(path.join(RAIZ, ".env"))) {
  console.error("hay un .env en el árbol: la app cargaría llaves reales. Córrelo en un árbol sin .env");
  process.exit(1);
}
const { chromium } = await import(path.join(RAIZ, "node_modules/playwright-core/index.mjs"));
const { ADMIN, cookieDe } = await import(path.join(RAIZ, "scripts/ops/auditoria-ui/respaldo-local/fixture.mjs"));
const NEXT = path.join(RAIZ, "node_modules/next/dist/bin/next");
const AQUI = path.join(RAIZ, "scripts/ops/auditoria-ui");
const AHORA = "2026-10-21T16:00:00Z"; // miércoles 21 de octubre, 10:00 en San Luis Potosí
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
const puertoLibre = () =>
  new Promise((ok) => {
    const s = net.createServer().listen(0, () => {
      const p = s.address().port;
      s.close(() => ok(p));
    });
  });
async function esperar(url, h) {
  for (let i = 0; i < 300; i++) {
    if (h.exitCode !== null) throw new Error(`se cerró\n${h.registro()}`);
    try {
      if ((await fetch(url)).status < 500) return;
    } catch {}
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
// Mapbox, desde el servidor, lo contesta el respaldo (la app solo acepta 127.0.0.1 en `MAPBOX_API_URL`).
const s = lanzar([NEXT, "start", "-p", String(pa)], { ...app, ...reloj, MAPBOX_API_URL: `${respaldo}/mapbox` });
await esperar(`${base}/entrar`, s);

const IMAGEN = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#b9b4a8"/></svg>';
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--hide-scrollbars"] });

async function contexto({ ancho = 390, alto = 844 } = {}) {
  const movil = ancho < 800;
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 2, isMobile: movil, hasTouch: movil, ...(movil ? { userAgent: UA } : {}), locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.clock.setFixedTime(new Date(AHORA));
  await ctx.addCookies([{ name: "sb-127-auth-token", value: cookieDe(ADMIN), url: base }]);
  await ctx.route("**/_vercel/**", (q) => q.fulfill({ contentType: "text/javascript", body: "" }));
  await ctx.route((u) => u.hostname !== "127.0.0.1", (q) => (q.request().resourceType() === "image" ? q.fulfill({ contentType: "image/svg+xml", body: IMAGEN }) : q.abort()));
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("  error de página:", String(e.message).slice(0, 200)));
  page.on("console", (m) => m.type() === "error" && console.log("  consola:", m.text().slice(0, 200)));
  return { ctx, page };
}
const quieto = async (page, ms = 700) => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
};
const medir = (page) => page.evaluate(() => ({ anchoDePagina: document.documentElement.scrollWidth, ancho: innerWidth, nodos: document.body.querySelectorAll("*").length }));
const foto = async (page, nombre) => {
  await quieto(page);
  await page.screenshot({ path: path.join(SALIDA, `${nombre}.png`) });
  const m = await medir(page);
  if (m.anchoDePagina > m.ancho) throw new Error(`${nombre}: la página se desplaza a lo ancho (${m.anchoDePagina} > ${m.ancho})`);
  console.log("  ", nombre, JSON.stringify(m));
};
let toques = 0;
/** Un toque real: al centro del elemento, por coordenadas (nunca element.click()), y solo si nada lo tapa. */
async function tocar(page, localizador) {
  await localizador.evaluate((el) => el.scrollIntoView({ block: "center" }));
  const caja = await localizador.boundingBox();
  if (!caja) throw new Error("sin caja para tocar");
  const [x, y] = [caja.x + caja.width / 2, caja.y + caja.height / 2];
  if (!(await localizador.evaluate((el, [x, y]) => el.contains(document.elementFromPoint(x, y)), [x, y]))) throw new Error("algo tapa lo que se toca");
  await page.mouse.click(x, y);
  toques++;
}
const violetas = (page) =>
  page.evaluate(() => {
    const p = document.createElement("i");
    p.style.background = "var(--primario)";
    document.body.append(p);
    const v = getComputedStyle(p).backgroundColor;
    p.remove();
    return [...document.querySelectorAll("main button, main a, [role=dialog] button")].filter((b) => getComputedStyle(b).backgroundColor === v).map((b) => b.textContent.trim());
  });
const comprobar = (cond, que) => {
  if (!cond) throw new Error(`no se cumple: ${que}`);
  console.log("     ✓", que);
};

try {
  // 1 a 11 · La lista, «Añadir ciudad» con una ciudad nueva (Puebla) hasta su panel y su primera búsqueda, y Atrás a la lista.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/ciudades`, { waitUntil: "load" });
    await page.getByRole("heading", { name: "Ciudades", level: 1 }).waitFor();
    await foto(page, "01-lista");
    comprobar(JSON.stringify(await violetas(page)) === '["Añadir ciudad"]', "en la lista, el único violeta es «Añadir ciudad»");
    const orden = await page.getByRole("list", { name: "Ciudades" }).getByRole("listitem").evaluateAll((ls) => ls.map((l) => l.querySelector("b").firstChild.textContent.trim()));
    comprobar(JSON.stringify(orden) === JSON.stringify(["Oaxaca", "Ciudad de México", "Querétaro", "Aguascalientes", "San Luis Potosí", "San Miguel de Allende"]), `el orden: ${orden.join(", ")} (lo que tiene algo por decidir, las detectadas, el resto; ni Zacatecas oculta ni «Oaxaca de Juárez», que se junta con Oaxaca)`);
    await page.mouse.wheel(0, 600);
    await foto(page, "02-lista-abajo");

    await tocar(page, page.getByRole("button", { name: "Añadir ciudad" }));
    const hoja = page.getByRole("dialog", { name: "Añadir ciudad" });
    await hoja.waitFor();
    await foto(page, "03-anadir-detectadas");
    const campo = hoja.getByRole("searchbox", { name: "Nombre de la ciudad" });
    await tocar(page, campo);
    await page.keyboard.type("San");
    await hoja.getByRole("button", { name: /San Luis Potosí/ }).waitFor();
    await foto(page, "04-anadir-san");
    await tocar(page, hoja.getByRole("button", { name: "Borrar la búsqueda" }));
    comprobar((await campo.inputValue()) === "" && (await campo.evaluate((c) => c === document.activeElement)), "la ✕ vacía el campo y deja el foco");
    await page.keyboard.type("Pue");
    await hoja.getByRole("button", { name: /Heroica Puebla de Zaragoza/ }).waitFor();
    await foto(page, "05-anadir-puebla");
    await tocar(page, hoja.getByRole("button", { name: /Heroica Puebla de Zaragoza/ }));
    await hoja.getByRole("list", { name: "Lo que resolvió el sistema" }).waitFor();
    await page.evaluate(() => document.activeElement?.blur());
    await foto(page, "06-elegida-puebla");
    console.log("     resuelto:", JSON.stringify(await hoja.getByRole("list", { name: "Lo que resolvió el sistema" }).getByRole("listitem").allInnerTexts()));
    await tocar(page, hoja.getByRole("button", { name: "Cambiar" }));
    await hoja.getByLabel("Nombre en la app").waitFor();
    await foto(page, "07-cambiando-nombre");
    await tocar(page, hoja.getByRole("button", { name: "Borrar lo escrito" }));
    comprobar(await hoja.getByRole("button", { name: "Falta el nombre" }).isDisabled(), "vacío, el botón dice «Falta el nombre» y no se toca");
    await page.keyboard.type("Puebla");
    await tocar(page, hoja.getByRole("button", { name: "Abrir Puebla" }));
    await page.waitForURL(/\/admin\/ciudades\/puebla$/);
    await page.getByRole("heading", { name: /^Puebla/ }).waitFor();
    await foto(page, "08-panel-puebla");
    comprobar(JSON.stringify(await violetas(page)) === '["Buscar lugares"]', "recién abierta, el único violeta es «Buscar lugares»");
    const alta = (await (await fetch(`${respaldo}/__registro`)).json()).filter((l) => l.includes("cuerpo") && l.includes("puebla")).slice(-1);
    console.log("     «Abrir Puebla» guardó:", alta.join(" "));

    await tocar(page, page.getByRole("group", { name: "Lugares" }).getByRole("button", { name: "Buscar lugares" }));
    const correr = page.getByRole("dialog", { name: "Buscar lugares en Puebla" });
    await correr.waitFor();
    await foto(page, "09-hoja-buscar-lugares");
    await tocar(page, correr.getByRole("button", { name: "Borrar lo escrito" }));
    await page.keyboard.type("2,50");
    await tocar(page, correr.getByRole("button", { name: "Correr" }));
    await correr.waitFor({ state: "detached" });
    await page.getByRole("group", { name: "Lugares" }).getByRole("button", { name: "Cancelar la búsqueda" }).waitFor();
    await page.evaluate(() => scrollTo(0, 0));
    await foto(page, "10-panel-puebla-pendiente");
    comprobar(JSON.stringify(await violetas(page)) === "[]", "mientras espera, ningún violeta");
    await tocar(page, page.getByRole("link", { name: /^Atrás/ }));
    await page.waitForURL(/\/admin\/ciudades$/);
    await page.getByRole("list", { name: "Ciudades" }).waitFor();
    await foto(page, "11-lista-con-puebla");
    await ctx.close();
  }
  // 12 a 13 · Una detectada: «Abrir» con la hoja ya llena; «Ocultar» y «Deshacer».
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/ciudades`, { waitUntil: "load" });
    await tocar(page, page.getByRole("button", { name: "Abrir Aguascalientes" }));
    const hoja = page.getByRole("dialog", { name: "Añadir ciudad" });
    await hoja.getByRole("button", { name: "Abrir Aguascalientes" }).waitFor();
    await foto(page, "12-abrir-detectada");
    await page.keyboard.press("Escape");
    await hoja.waitFor({ state: "detached" });
    await tocar(page, page.getByRole("button", { name: "Ocultar Querétaro" }));
    await page.getByText("No vuelve a salir aunque la consulten").waitFor();
    await foto(page, "13-ocultada");
    await tocar(page, page.getByRole("button", { name: "Deshacer" }));
    await page.getByRole("button", { name: "Abrir Querétaro" }).waitFor();
    console.log("     «Ocultar» y «Deshacer» de Querétaro:", JSON.stringify((await (await fetch(`${respaldo}/__registro`)).json()).filter((l) => l.startsWith("PATCH /rest/v1/ciudades")).slice(-2)));
    await ctx.close();
  }
  // 14 a 19 · Los paneles: Oaxaca (una búsqueda corriendo y propuestas por revisar), Ciudad de México («Llegó al tope» y «Falló», y la hoja que
  // lo recuerda) y San Luis (las consultas con su tendencia).
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/ciudades/oaxaca`, { waitUntil: "load" });
    await page.getByRole("heading", { name: /^Oaxaca/ }).waitFor();
    await foto(page, "14-panel-oaxaca");
    comprobar(JSON.stringify(await violetas(page)) === '["Revisar las 5"]', "con propuestas, el único violeta es «Revisar las 5»");
    await page.getByRole("group", { name: "Gasto" }).evaluate((g) => g.scrollIntoView({ block: "end" }));
    await foto(page, "15-panel-oaxaca-abajo");
    await page.goto(`${base}/admin/ciudades/ciudad-de-mexico`, { waitUntil: "load" });
    await page.getByRole("heading", { name: /^Ciudad de México/ }).waitFor();
    await foto(page, "16-panel-cdmx");
    await page.getByRole("group", { name: "Gasto" }).evaluate((g) => g.scrollIntoView({ block: "end" }));
    await foto(page, "17-panel-cdmx-abajo");
    await tocar(page, page.getByRole("group", { name: "Lugares" }).getByRole("button", { name: "Buscar lugares" }));
    await page.getByRole("dialog", { name: "Buscar lugares en Ciudad de México" }).waitFor();
    await foto(page, "18-hoja-tras-tope");
    await page.goto(`${base}/admin/ciudades/san-luis-potosi`, { waitUntil: "load" });
    await page.getByRole("group", { name: "Consultas" }).evaluate((g) => g.scrollIntoView({ block: "center" }));
    await foto(page, "19-panel-san-luis-consultas");
    await ctx.close();
  }
  // 20 · La bandeja de Oaxaca (todas sus búsquedas), y la ruta vieja por corrida que lleva a ella.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/ciudades/propuestas/abab0001-0000-4000-8000-000000000001`, { waitUntil: "load" });
    await page.waitForURL(/\/admin\/ciudades\/oaxaca\/propuestas$/);
    comprobar(true, "la ruta vieja de la bandeja lleva a la de la ciudad");
    await page.getByRole("heading", { name: "Propuestas de Oaxaca" }).waitFor();
    await foto(page, "20-bandeja-oaxaca");
    await ctx.close();
  }
  // 21 y 22 · A 1280: el panel en la columna ancha con la rejilla de tres, y la lista en la de la tarea.
  {
    const { ctx, page } = await contexto({ ancho: 1280, alto: 800 });
    await page.goto(`${base}/admin/ciudades/ciudad-de-mexico`, { waitUntil: "load" });
    await page.getByRole("heading", { name: /^Ciudad de México/ }).waitFor();
    await foto(page, "21-panel-cdmx-1280");
    console.log("     columnas de la rejilla:", await page.getByRole("list", { name: /^Cómo va/ }).evaluate((l) => getComputedStyle(l).gridTemplateColumns));
    await page.goto(`${base}/admin/ciudades`, { waitUntil: "load" });
    await page.getByRole("list", { name: "Ciudades" }).waitFor();
    await foto(page, "22-lista-1280");
    await ctx.close();
  }
  console.log(`   toques reales: ${toques}`);
} finally {
  await browser.close();
}
process.exit(0);
