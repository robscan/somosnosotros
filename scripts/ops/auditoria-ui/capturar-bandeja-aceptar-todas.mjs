// Capturas de «Aceptar todas» en la bandeja de una ciudad (OL-438, bitácora 470) con la app compilada contra el respaldo local y la sesión de su
// cuenta de administración: la cabecera de «Buscar lugares» de Oaxaca con «Aceptar las 5» (y «Aceptar las N de esta fuente» también en la
// fuente que nunca tuvo una tanda aceptada), la hoja de confirmación de la búsqueda de agendas de San Luis Potosí, el avance en el botón
// («Aceptando 3 de 11…», con cada acción del servidor frenada 1,5 s solo en este recorrido) y el resultado («10 aceptadas · 1 por revisar»),
// con la que el respaldo trae repetida («Feleal…», el mismo título a la misma hora) por revisar con su razón y sus botones. Chrome real
// (playwright-core, channel: 'chrome'), 390×844 a 2×; toques reales (clics por coordenadas que fallan si algo tapa el botón), por las acciones
// de verdad contra el respaldo, que guarda en memoria las propuestas y los eventos que publica la rutina.
// node scripts/ops/auditoria-ui/capturar-bandeja-aceptar-todas.mjs <raíz del árbol> <carpeta de salida>
// Compila `.next` contra el respaldo (SIN_BUILD=1 usa el `.next` que ya hay, compilado con el mismo PUERTO_RESPALDO). Correrlo en un árbol SIN
// `.env` (si lo encuentra, se niega).
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

// PUERTO_RESPALDO fija el del respaldo: la compilación lleva su dirección dentro, así otra pasada con SIN_BUILD=1 y el mismo puerto la reutiliza.
const [pr, pa] = [Number(process.env.PUERTO_RESPALDO) || (await puertoLibre()), await puertoLibre()];
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
// El freno del avance: las acciones del servidor (POST a la bandeja) esperan `lento` ms antes de salir; con 0, como siempre.
let lento = 0;
await ctx.route(
  (u) => u.hostname === "127.0.0.1" && u.pathname.endsWith("/propuestas"),
  async (q) => {
    if (q.request().method() === "POST" && lento) await new Promise((ok) => setTimeout(ok, lento));
    await q.continue();
  },
);
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
const delRespaldo = async (consulta) => (await fetch(`${respaldo}/rest/v1/${consulta}`, { headers: { apikey: LLAVE_SERVICIO } })).json();

try {
  // 1 · Oaxaca: «Buscar lugares» con «Aceptar las 5» bajo lo que trajo; cada fuente con el suyo (la búsqueda web nunca tuvo una tanda aceptada).
  await page.goto(`${base}/admin/ciudades/oaxaca/propuestas`, { waitUntil: "load" });
  await page.getByRole("heading", { name: "Propuestas de Oaxaca", level: 1 }).waitFor();
  const cabeza = await page.locator("main > *").evaluateAll((els) => els.slice(3, 7).map((e) => `${e.tagName.toLowerCase()}:${e.textContent.trim()}`));
  comprobar(/^h2:Buscar lugares,p:.*14 propuestos · 9 aceptados,button:Aceptar las 5,h3:Sistema de Información Cultural3$/.test(cabeza.join(",")), `la cabecera de la búsqueda con su botón: ${cabeza.join(" | ")}`);
  comprobar((await page.getByRole("button", { name: "Aceptar las 3 de esta fuente" }).count()) === 1 && (await page.getByRole("button", { name: "Aceptar las 2 de esta fuente" }).count()) === 1, "«Aceptar las N de esta fuente» también en la búsqueda web, sin tanda anterior");
  comprobar((await page.getByRole("button", { name: /Rechazar (todas|las)/ }).count()) === 0, "sin «Rechazar todas»");
  await foto("01-cabecera-con-el-boton");

  // 2 · San Luis: «Buscar agendas y eventos» con «Aceptar las 11»; la hoja dice cuántas y qué pasa con las que no se puedan publicar.
  await page.goto(`${base}/admin/ciudades/san-luis-potosi/propuestas`, { waitUntil: "load" });
  await page.getByRole("heading", { name: "Propuestas de San Luis Potosí", level: 1 }).waitFor();
  const todas = page.getByRole("button", { name: "Aceptar las 11", exact: true });
  comprobar((await todas.count()) === 1, "«Aceptar las 11» en la cabecera de la búsqueda de agendas");
  const deFuente = await page.getByRole("button", { name: /de esta fuente/ }).allTextContents();
  comprobar(JSON.stringify(deFuente) === JSON.stringify(["Aceptar las 7 de esta fuente", "Aceptar las 3 de esta fuente"]), `cada fuente con 2 o más conserva el suyo; la búsqueda web, con una, no: ${deFuente.join(" · ")}`);
  await tocar(todas);
  const hoja = page.getByRole("dialog", { name: "Aceptar todas" });
  await hoja.waitFor();
  const textoHoja = (await hoja.innerText()).replace(/\n+/g, "\n");
  comprobar(
    textoHoja ===
      "Aceptar todas\nVas a aceptar 11 propuestas de eventos de San Luis Potosí.\nLas que no se puedan publicar (un repetido, un sitio sin punto, un acto cuyo festival no se ha aceptado) se quedan por revisar con su razón.\nCancelar\nAceptar las 11",
    `la hoja: «${textoHoja.replace(/\n/g, " / ")}»`,
  );
  await foto("02-hoja-de-confirmacion");

  // 3 · El avance: cada acción del servidor tarda 1,5 s más (solo en este recorrido) para verlo en el botón.
  lento = 1500;
  await tocar(hoja.getByRole("button", { name: "Aceptar las 11" }));
  const avance = page.getByRole("button", { name: "Aceptando 3 de 11…" });
  await avance.waitFor({ timeout: 20000 });
  comprobar((await avance.getAttribute("aria-busy")) === "true", "«Aceptando 3 de 11…» en el mismo botón, latiendo");
  comprobar((await page.getByRole("button", { name: /de esta fuente/ }).count()) === 0, "mientras acepta todas, sin los botones de cada fuente");
  await page.getByRole("status").filter({ hasText: "Aceptaste Xantolo 2026" }).waitFor();
  comprobar(true, "el festival, primero que sus actos, ya aceptado");
  await page.evaluate(() => window.scrollTo(0, 0));
  await foto("03-avance");
  lento = 0;

  // 4 · El resultado: la cabecera dice cuántas se aceptaron y cuántas quedan; la repetida se queda con su razón y sus botones.
  const hecho = page.getByRole("status").filter({ hasText: /aceptadas/ });
  await hecho.waitFor({ timeout: 60000 });
  comprobar((await hecho.innerText()) === "10 aceptadas · 1 por revisar", `la cabecera: «${await hecho.innerText()}»`);
  comprobar((await page.getByRole("status").filter({ hasText: /^Aceptaste/ }).count()) === 10, "diez líneas de lo hecho");
  const feleal = tarjeta("Feleal: un viaje por el mundo en acordeón");
  const razon = await feleal.getByRole("alert").innerText();
  comprobar(razon === "Ya está «Feleal: un viaje por el mundo en acordeón» a esa hora: recházala como duplicado.", `la que se quedó, con su razón: «${razon}»`);
  comprobar((await feleal.getByRole("button", { name: "Rechazar" }).count()) === 1 && (await feleal.getByRole("button", { name: "Aceptar" }).count()) === 1, "y con sus dos botones");
  comprobar((await page.getByRole("button", { name: /^Aceptar las/ }).count()) === 0, "tras la tanda, lo que queda va una por una");
  await page.evaluate(() => window.scrollTo(0, 0));
  await foto("04-resultado");
  await arriba(page.getByRole("status").filter({ hasText: "Aceptaste Feria del libro infantil" }));
  await foto("05-la-que-se-quedo");

  // En el respaldo: diez aceptadas por las acciones de verdad, el festival con sus actos colgados de él y la repetida sin tocar.
  const deLaBusqueda = await delRespaldo("propuestas?select=id,estado,datos&corrida_id=eq.abab0001-0000-4000-8000-000000000008");
  const porEstado = deLaBusqueda.reduce((m, p) => ((m[p.estado] = (m[p.estado] ?? 0) + 1), m), {});
  comprobar(porEstado.aceptada === 14 && porEstado.propuesta === 1, `en el respaldo: ${JSON.stringify(porEstado)} (las 4 aceptadas antes y las 10 de la tanda; la repetida, por revisar)`);
  const publicados = await delRespaldo("eventos?select=id,titulo,clase,evento_padre_id&origen=eq.rutina-agendas");
  const festival = publicados.find((e) => e.titulo === "Xantolo 2026");
  const actos = publicados.filter((e) => e.evento_padre_id === festival?.id).map((e) => e.titulo).sort();
  comprobar(
    festival?.clase === "festival" && JSON.stringify(actos) === JSON.stringify(["Altar monumental de Xantolo", "Concurso de calaveritas literarias", "Danza de Huehues", "Son huasteco en la plaza"]),
    `el festival y sus cuatro actos colgados de él (${actos.join(", ")})`,
  );

  // 6 · Oaxaca, todas se pueden publicar: al aceptar la última, el servidor ya no trae esa búsqueda (no le queda nada por revisar), pero se
  // queda en pantalla con sus líneas de lo hecho y la cabecera dice cuántas, con lo que trajo al día.
  await page.goto(`${base}/admin/ciudades/oaxaca/propuestas`, { waitUntil: "load" });
  await tocar(page.getByRole("button", { name: "Aceptar las 5", exact: true }));
  await tocar(page.getByRole("dialog", { name: "Aceptar todas" }).getByRole("button", { name: "Aceptar las 5" }));
  const todasOax = page.getByRole("status").filter({ hasText: /aceptadas/ });
  await todasOax.waitFor({ timeout: 30000 });
  comprobar((await todasOax.innerText()) === "5 aceptadas", `la cabecera: «${await todasOax.innerText()}»`);
  comprobar((await page.getByRole("status").filter({ hasText: /^Aceptaste/ }).count()) === 5, "las cinco líneas de lo hecho siguen en pantalla");
  const notaOax = await page.getByRole("heading", { name: "Buscar lugares", level: 2 }).evaluate((h) => h.nextElementSibling?.textContent ?? "");
  comprobar(/14 propuestos · 14 aceptados$/.test(notaOax), `lo que trajo, al día: «${notaOax}»`);
  await page.evaluate(() => window.scrollTo(0, 0));
  await foto("06-todas-aceptadas");
  comprobar(errores.length === 0, `sin errores de consola ni de página${errores.length ? `: ${errores.join(" | ")}` : ""}`);
  console.log(`listo: ${toques} toques reales`);
} catch (e) {
  console.error(e);
  console.error(s.registro());
  process.exitCode = 1;
} finally {
  await browser.close();
  // El respaldo y la app son hijos de este proceso: al salir se cierran (`process.on("exit")`).
  process.exit();
}
