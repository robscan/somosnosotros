// Capturas de la forma de cada propuesta de evento en la bandeja de una ciudad (OL-434, bitácora 467) con la app compilada contra el respaldo
// local y la sesión de su cuenta de administración: la bandeja de San Luis Potosí con lo que deja la rutina de agendas de OL-433 (el festival
// «Xantolo 2026» antes que sus actos, un taller con sesiones, una feria de tres días, una serie, una exposición y el acto de un festival que ya
// existe). Chrome real (playwright-core, channel: 'chrome'), 390×844 a 2×. Recorrido con toques reales (clics por coordenadas que fallan si algo
// tapa el botón): «Aceptar» un acto antes que su festival (la frase de espera) y luego «Aceptar el festival y sus 3 actos aceptados» (qué se
// publicó), por las acciones de verdad contra el respaldo, que guarda en memoria las propuestas y los eventos que publica la rutina.
// node scripts/ops/auditoria-ui/capturar-bandeja-formas.mjs <raíz del árbol> <carpeta de salida>
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
const { ADMIN, cookieDe, LLAVE_SERVICIO } = await import(path.join(RAIZ, "scripts/ops/auditoria-ui/respaldo-local/fixture.mjs"));
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
const app = { NEXT_PUBLIC_SUPABASE_URL: respaldo, NEXT_PUBLIC_SUPABASE_ANON_KEY: "llave-anon-inventada", NEXT_PUBLIC_MAPBOX_TOKEN: "pk.inventado", SUPABASE_SERVICE_ROLE_KEY: LLAVE_SERVICIO };
const r = lanzar([path.join(AQUI, "respaldo-local/server.mjs"), String(pr)], reloj);
await esperar(`${respaldo}/rest/v1/eventos?select=id&limit=1`, r);
if (!process.env.SIN_BUILD) {
  process.stdout.write("compilando… ");
  const b = spawnSync(process.execPath, [NEXT, "build"], { cwd: RAIZ, env: { ...process.env, ...app }, encoding: "utf8", maxBuffer: 1 << 26 });
  if (b.status !== 0) throw new Error((b.stdout + b.stderr).slice(-3000));
  console.log("listo");
}
const s = lanzar([NEXT, "start", "-p", String(pa)], { ...app, ...reloj, MAPBOX_API_URL: `${respaldo}/mapbox` });
await esperar(`${base}/entrar`, s);

const IMAGEN = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#b9b4a8"/></svg>';
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--hide-scrollbars"] });
const errores = [];
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA, locale: "es-MX", timezoneId: "America/Mexico_City" });
await ctx.clock.setFixedTime(new Date(AHORA));
await ctx.addCookies([{ name: "sb-127-auth-token", value: cookieDe(ADMIN), url: base }]);
await ctx.route("**/_vercel/**", (q) => q.fulfill({ contentType: "text/javascript", body: "" }));
await ctx.route((u) => u.hostname !== "127.0.0.1", (q) => (q.request().resourceType() === "image" ? q.fulfill({ contentType: "image/svg+xml", body: IMAGEN }) : q.abort()));
const page = await ctx.newPage();
page.on("pageerror", (e) => errores.push(`página: ${String(e.message).slice(0, 200)}`));
page.on("console", (m) => m.type() === "error" && errores.push(`consola: ${m.text().slice(0, 200)}`));

const quieto = async (ms = 700) => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
};
const foto = async (nombre) => {
  await quieto();
  await page.screenshot({ path: path.join(SALIDA, `${nombre}.png`) });
  const m = await page.evaluate(() => ({ anchoDePagina: document.documentElement.scrollWidth, ancho: innerWidth, nodos: document.body.querySelectorAll("*").length }));
  if (m.anchoDePagina > m.ancho) throw new Error(`${nombre}: la página se desplaza a lo ancho (${m.anchoDePagina} > ${m.ancho})`);
  console.log("  ", nombre, JSON.stringify(m));
};
/** Deja la tarjeta arriba, bajo la barra de la app (que se queda fija). */
const arriba = (localizador) => localizador.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 72));
let toques = 0;
/** Un toque real: al centro del elemento, por coordenadas (nunca element.click()), y solo si nada lo tapa. */
async function tocar(localizador) {
  await localizador.evaluate((el) => el.scrollIntoView({ block: "center" }));
  const caja = await localizador.boundingBox();
  if (!caja) throw new Error("sin caja para tocar");
  const [x, y] = [caja.x + caja.width / 2, caja.y + caja.height / 2];
  if (!(await localizador.evaluate((el, [x, y]) => el.contains(document.elementFromPoint(x, y)), [x, y]))) throw new Error("algo tapa lo que se toca");
  await page.mouse.click(x, y);
  toques++;
}
const comprobar = (cond, que) => {
  if (!cond) throw new Error(`no se cumple: ${que}`);
  console.log("     ✓", que);
};
const tarjeta = (titulo) => page.getByRole("listitem").filter({ has: page.getByText(titulo, { exact: true }) });
const renglones = async (l) => (await l.innerText()).replace(/\n+/g, "\n");
const delRespaldo = async (consulta) => (await fetch(`${respaldo}/rest/v1/${consulta}`, { headers: { apikey: LLAVE_SERVICIO } })).json();

try {
  await page.goto(`${base}/admin/ciudades/san-luis-potosi/propuestas`, { waitUntil: "load" });
  await page.getByRole("heading", { name: "Propuestas de San Luis Potosí", level: 1 }).waitFor();
  const titulos = await page.locator("main li").evaluateAll((lis) => lis.map((li) => li.querySelector("span")?.textContent));
  comprobar(
    JSON.stringify(titulos) ===
      // OL-438: «Feleal…», al final de su fuente, es la que el respaldo trae repetida para «Aceptar todas».
      JSON.stringify(["Xantolo 2026", "Danza de Huehues", "Son huasteco en la plaza", "Recital de guitarra clásica", "Taller de papel picado", "Feria del libro infantil", "Feleal: un viaje por el mundo en acordeón", "Cineclub de los miércoles", "Cineclub de los miércoles", "Inauguración: Raíces", "Función de clausura: cortometrajes potosinos"]),
    `el festival antes que sus actos, y el que llegó por la búsqueda web con ellos: ${titulos.join(" · ")}`,
  );
  const x = async (l) => (await l.boundingBox()).x;
  comprobar((await x(tarjeta("Son huasteco en la plaza"))) - (await x(tarjeta("Xantolo 2026"))) === 24, "sus actos, con 24 de sangría");
  const fest = tarjeta("Xantolo 2026");
  comprobar(/Festival · 4 actos\nDel 28 de oct al 2 de nov\nfuente: cultura\.example/.test(await renglones(fest)), "«Festival · 4 actos», su periodo, sin fecha ni sitio repetidos");
  comprobar((await fest.getByRole("button", { name: "Aceptar el festival y sus 2 actos aceptados" }).count()) === 1, "«Aceptar el festival y sus 2 actos aceptados»");
  await foto("01-festival-y-sus-actos");
  await arriba(tarjeta("Danza de Huehues"));
  comprobar(/^Acto · propuesto por la rutina\nSon huasteco en la plaza\n30 oct, 7:00\spm · Plaza de Armas · fuente: cultura\.example · leída el 21 oct\nTambién llegó como: «Noche de son huasteco»/.test(await renglones(tarjeta("Son huasteco en la plaza"))), "el acto que llegó por la búsqueda web, con su otro título");
  await foto("02-actos-bajo-su-festival");
  await arriba(tarjeta("Recital de guitarra clásica"));
  comprobar(/Taller · 4 sesiones\nmar 3, jue 5, mar 10 y jue 12 de nov · 5:00\s?–\s?7:00\spm\nCasa de Cultura del Barrio de San Miguelito · fuente/.test(await renglones(tarjeta("Taller de papel picado"))), "el taller: sus sesiones y su sitio, sin la fecha de la primera");
  comprobar(/Evento de 3 días\nvie 23, sáb 24 y dom 25 de oct · 11:00\sam\nJardín de San Francisco/.test(await renglones(tarjeta("Feria del libro infantil"))), "la feria de tres días seguidos");
  comprobar((await tarjeta("Recital de guitarra clásica").locator("p").count()) === 0, "un evento como siempre, sin línea de forma");
  await foto("03-taller-y-dias-seguidos");
  await arriba(page.getByRole("heading", { name: "Universidades y museos" }));
  comprobar(/Serie · 4 fechas, cada semana\nmié 28 de oct y mié 4, mié 11 y mié 18 de nov · 7:00\spm\n28 oct, 7:00\spm · Casa del Poeta/.test(await renglones(tarjeta("Cineclub de los miércoles").first())), "la serie con sus fechas");
  comprobar(/Exposición «Raíces» · hasta el lun 30 de nov\n23 oct, 7:00\spm · Museo Nacional de la Máscara/.test(await renglones(tarjeta("Inauguración: Raíces"))), "la exposición y hasta cuándo");
  await foto("04-serie-y-exposicion");
  await arriba(tarjeta("Inauguración: Raíces"));
  const enlace = tarjeta("Función de clausura: cortometrajes potosinos").getByRole("link", { name: "«Festival de Cine de Invierno»" });
  comprobar((await enlace.getAttribute("href")) === "/eventos/bbbb0001-0000-4000-8000-000000000018", "el acto de un festival que ya existe enlaza a él");
  await foto("05-acto-de-festival-registrado");

  // El acto antes que su festival: se acepta y espera (por la acción de verdad: `prepararEvento` lee el festival por decidir).
  await tocar(tarjeta("Danza de Huehues").getByRole("button", { name: "Aceptar" }));
  const espera = page.getByRole("status").filter({ hasText: "Danza de Huehues" });
  await espera.waitFor();
  comprobar((await espera.innerText()) === "Aceptaste Danza de Huehues · se publica cuando aceptes el festival «Xantolo 2026»", `la línea: «${await espera.innerText()}»`);
  await fest.getByRole("button", { name: "Aceptar el festival y sus 3 actos aceptados" }).waitFor();
  comprobar(true, "el festival ya cuenta 3 actos aceptados");
  await page.evaluate(() => window.scrollTo(0, 0));
  await foto("06-acto-en-espera");

  // El festival: se publica con sus tres actos que esperaban, colgados de él.
  await tocar(fest.getByRole("button", { name: "Aceptar el festival y sus 3 actos aceptados" }));
  const hecho = page.getByRole("status").filter({ hasText: "Aceptaste Xantolo 2026" });
  await hecho.waitFor({ timeout: 20000 });
  comprobar((await renglones(hecho)) === "Aceptaste Xantolo 2026 · se publicó con sus 3 actos\nVer ficha", `la línea: «${(await hecho.innerText()).replace(/\n/g, " / ")}»`);
  comprobar((await hecho.getByRole("link", { name: "Ver ficha" }).getAttribute("href")) === "/eventos/xantolo-2026", "«Ver ficha» lleva al festival");
  comprobar((await espera.innerText()) === "Aceptaste Danza de Huehues · se publicó con el festival", "el acto que esperaba ya no espera");
  const publicados = await delRespaldo("eventos?select=id,titulo,clase,evento_padre_id&origen=eq.rutina-agendas");
  const festival = publicados.find((e) => e.titulo === "Xantolo 2026");
  const actos = publicados.filter((e) => e.evento_padre_id === festival?.id).map((e) => e.titulo).sort();
  comprobar(festival?.clase === "festival" && JSON.stringify(actos) === JSON.stringify(["Altar monumental de Xantolo", "Concurso de calaveritas literarias", "Danza de Huehues"]), `en el respaldo: el festival y sus actos colgados de él (${actos.join(", ")})`);
  await page.evaluate(() => window.scrollTo(0, 0));
  await foto("07-festival-aceptado");
  comprobar(errores.length === 0, `sin errores de consola ni de página${errores.length ? `: ${errores.join(" | ")}` : ""}`);
  console.log(`listo: ${toques} toques reales`);
} catch (e) {
  console.error(e);
  console.error(s.registro());
  process.exitCode = 1;
} finally {
  await browser.close();
}
