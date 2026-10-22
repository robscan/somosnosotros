// Capturas de la bitácora 478 (OL-446): el Showcase v2 en código, lo firmado en OL-443 (bitácora 475). La lista (Filtros · Orden · Vista, la fila
// de disciplinas, «Por aprobar» antes de «Investigar», el indicador de cada tarjeta), la hoja Filtros con sus cuentas y «Más filtros», la lista
// filtrada con lo puesto y su ✕, «Guardar como grupo», un grupo puesto, «Seleccionar» con la barra y la hoja de Investigar con los elegidos,
// «Por aprobar» (aceptar, la hoja del motivo al rechazar), la portada con «Evidencias del showcase» y la ficha (el nombre como enlace, el aviso
// «2 por revisar» y «Por revisar» con lo que cambia). Con la app compilada contra el respaldo local y la sesión de la cuenta de administración del
// respaldo. Chrome real (playwright-core, channel: 'chrome'), 390×844 a 2×; tres a 1280×800 a 1×. Toques reales: clics por coordenadas.
// node scripts/ops/auditoria-ui/capturar-admin-showcase-v2.mjs <raíz del árbol> <carpeta de salida>
// SIN_BUILD=1 usa el `.next` que ya hay, compilado por este script (el respaldo va en el puerto 8879). Correrlo en un árbol SIN `.env`.
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
const AHORA = "2026-10-22T16:00:00Z"; // jueves 22 de octubre, 10:00 en San Luis Potosí
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

const [pr, pa] = [Number(process.env.PUERTO_RESPALDO ?? 8879), await puertoLibre()];
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
const s = lanzar([NEXT, "start", "-p", String(pa)], { ...app, ...reloj });
await esperar(`${base}/entrar`, s);

const IMAGEN = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#b9b4a8"/></svg>';
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--hide-scrollbars"] });
const errores = [];
const fallas = [];
const comprobar = (ok, que) => {
  console.log(`     ${ok ? "ok" : "FALLA"} · ${que}`);
  if (!ok) fallas.push(que);
};

async function contexto({ escritorio = false } = {}) {
  const ctx = await browser.newContext(
    escritorio
      ? { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, locale: "es-MX", timezoneId: "America/Mexico_City" }
      : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA, locale: "es-MX", timezoneId: "America/Mexico_City" },
  );
  await ctx.clock.setFixedTime(new Date(AHORA));
  await ctx.addCookies([{ name: "sb-127-auth-token", value: cookieDe(ADMIN), url: base }]);
  await ctx.route("**/_vercel/**", (q) => q.fulfill({ contentType: "text/javascript", body: "" }));
  await ctx.route((u) => u.hostname !== "127.0.0.1", (q) => (q.request().resourceType() === "image" ? q.fulfill({ contentType: "image/svg+xml", body: IMAGEN }) : q.abort()));
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(String(e.message).slice(0, 300)));
  page.on("console", (m) => m.type() === "error" && errores.push(`consola: ${m.text().slice(0, 300)}`));
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
/** Si hay desplazamiento a lo ancho y cuántos nodos tiene el `<main>`. */
const medir = (page) => page.evaluate(() => ({ ancho: document.documentElement.scrollWidth, nodos: document.querySelector("main").querySelectorAll("*").length }));
const subir = (loc) => loc.evaluate((e) => window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 70));
/** Un toque real: el ratón en el centro del elemento, después de traerlo al centro de la vista (la barra de los elegidos no lo tapa). */
async function tocar(page, loc) {
  await loc.evaluate((e) => e.scrollIntoView({ block: "center" }));
  const b = await loc.boundingBox();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
}
const texto = (loc) => loc.innerText().then((x) => x.replace(/\s+/g, " ").trim());
/** El aire entre dos filas de chips que envuelven y si el toque de 44 de una pisa el de la otra (lo de `Chip.module.css`, OL-446). */
const filas = (grupo) =>
  grupo.evaluate((g) => {
    const tops = [...new Set([...g.children].map((c) => Math.round(c.getBoundingClientRect().top)))].sort((a, b) => a - b);
    const alto = g.children[0].getBoundingClientRect().height;
    return { filas: tops.length, aire: tops.length > 1 ? tops[1] - tops[0] - alto : null, alto };
  });

try {
  // 01 · La lista: Filtros · Orden · Vista, la fila de disciplinas, la línea de cifras con «Seleccionar», Por aprobar e Investigar.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/showcase`, { waitUntil: "load" });
    await page.getByRole("heading", { name: "Showcase" }).waitFor();
    await foto(page, "01-lista");
    console.log("    ", JSON.stringify(await medir(page)), "·", await texto(page.locator("main p[role=status] > span").first()));
    comprobar((await page.getByRole("button", { name: /^Estado:/ }).count()) === 0, "Estado ya no está arriba: entra a la hoja");
    const aprobar = page.getByRole("link", { name: /^Por aprobar/ });
    comprobar((await texto(aprobar)).startsWith("Por aprobar 5 evidencias de 2 artistas"), `el renglón «${await texto(aprobar)}»`);
    // 02 · El indicador de Feleal, tocable con su chevron; tocarlo entra a Por aprobar en Feleal.
    const feleal = page.locator("main ul[aria-label=Candidatos] > li", { hasText: "Feleal" });
    const indicador = feleal.getByRole("link", { name: /por revisar/ });
    await subir(indicador);
    await foto(page, "02-lista-indicador");
    comprobar((await indicador.boundingBox()).height >= 44, "el indicador mide 44 o más de alto");
    await tocar(page, indicador);
    await page.waitForURL(/por-aprobar#a-/);
    comprobar(true, `el indicador lleva a ${new URL(page.url()).pathname}${new URL(page.url()).hash}`);
    await ctx.close();
  }
  // 03 a 05 · La hoja Filtros: arriba, con «4 o más» y Música, y «Más filtros» abierto. Medir el aire entre filas de chips (12).
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/showcase`, { waitUntil: "load" });
    await tocar(page, page.getByRole("button", { name: /^Filtros/ }));
    const hoja = page.getByRole("dialog", { name: "Filtros" });
    await hoja.waitFor();
    await foto(page, "03-hoja-filtros");
    console.log("     bloques:", (await hoja.locator("h4").allInnerTexts()).join(" · "));
    const puntaje = await filas(hoja.getByRole("group", { name: "Puntaje", exact: true }));
    comprobar(puntaje.filas < 2 || puntaje.aire >= 12, `entre filas de chips, ${puntaje.aire ?? "—"} px (chip de ${puntaje.alto})`);
    await tocar(page, hoja.getByRole("button", { name: /^4 o más/ }));
    await tocar(page, hoja.getByRole("group", { name: "Disciplina", exact: true }).getByRole("button", { name: /^Música/ }));
    await foto(page, "04-hoja-filtros-elegidos");
    console.log("     disciplina con 4 o más:", (await hoja.getByRole("group", { name: "Disciplina", exact: true }).getByRole("button").allInnerTexts()).map((x) => x.replace(/\s+/g, " ")).join(" · "));
    await tocar(page, hoja.getByRole("button", { name: /^Más filtros/ }));
    await subir(hoja.getByRole("button", { name: /^Más filtros/ }));
    await hoja.getByRole("button", { name: /^Más filtros/ }).evaluate((e) => e.scrollIntoView({ block: "start" }));
    await foto(page, "05-hoja-mas-filtros");
    const ver = hoja.getByRole("button", { name: /^Ver / });
    console.log("     botón:", await ver.innerText());
    await tocar(page, ver);
    await hoja.waitFor({ state: "detached" });
    await page.waitForURL(/\?puntaje=/);
    // 06 · La lista filtrada: lo puesto con su ✕ y «Guardar como grupo»; la línea de cifras.
    comprobar(new URL(page.url()).search === "?puntaje=4&disciplina=musica", `la URL: ${new URL(page.url()).search}`);
    await page.evaluate(() => window.scrollTo(0, 0));
    await foto(page, "06-lista-filtrada");
    console.log("     cifras:", await texto(page.locator("main p[role=status] > span").first()));
    // 07 · Guardar como grupo: el nombre propuesto con su ✕.
    await tocar(page, page.getByRole("button", { name: "Guardar como grupo" }));
    const guardar = page.getByRole("dialog", { name: "Guardar como grupo" });
    await guardar.waitFor();
    console.log("     nombre propuesto:", await guardar.getByRole("textbox").inputValue());
    await foto(page, "07-guardar-grupo");
    await page.keyboard.press("Escape");
    await ctx.close();
  }
  // 08 · Un grupo puesto (el del respaldo): un solo chip con su nombre y «Editar grupo»; la hoja Filtros con «Tus grupos».
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/showcase?puntaje=4&cuenta=con&disciplina=musica`, { waitUntil: "load" });
    await page.getByRole("button", { name: "Quitar Música con cuenta, 4+" }).waitFor();
    await foto(page, "08-grupo-puesto");
    await tocar(page, page.getByRole("button", { name: "Editar grupo" }));
    await page.getByRole("dialog", { name: "Editar grupo" }).waitFor();
    await foto(page, "09-editar-grupo");
    await ctx.close();
  }
  // 10 y 11 · Seleccionar: dos tarjetas elegidas (una con la casilla, otra tocando la tarjeta) y la hoja de Investigar con los elegidos.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/showcase`, { waitUntil: "load" });
    await tocar(page, page.getByRole("button", { name: "Seleccionar" }));
    const tarjetas = page.locator("main ul[aria-label=Candidatos] > li");
    await tocar(page, tarjetas.nth(0).getByRole("checkbox"));
    await tocar(page, tarjetas.nth(1).locator("a").first());
    comprobar(new URL(page.url()).pathname === "/admin/showcase", "tocar la tarjeta elige, no navega");
    await page.evaluate(() => window.scrollTo(0, 0));
    const barra = page.getByRole("toolbar", { name: "Con los elegidos" });
    console.log("     barra:", await texto(barra));
    await foto(page, "10-seleccionar");
    await tocar(page, barra.getByRole("button").last());
    const hoja = page.getByRole("dialog", { name: "Investigar a varios" });
    await hoja.waitFor();
    console.log("     hoja:", (await texto(hoja)).slice(0, 220));
    await foto(page, "11-hoja-investigar-elegidos");
    await ctx.close();
  }
  // 12 a 14 · Por aprobar: dos artistas, aceptar la mención de Feleal (Obra 1 → 2, 8 de 8) y la hoja del motivo al rechazar.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/showcase/por-aprobar`, { waitUntil: "load" });
    await page.getByRole("heading", { name: "Por aprobar" }).waitFor();
    console.log("    ", JSON.stringify(await medir(page)), "·", await page.locator("main > p[role=status]").innerText());
    for (const l of await page.locator("main ul[aria-label] a").all()) console.log("      renglón:", await texto(l));
    await foto(page, "12-por-aprobar");
    const mencion = page.locator("li", { has: page.getByRole("link", { name: /Mención en un concurso/ }) });
    console.log("      mención:", await texto(mencion.locator("p").last()));
    await tocar(page, mencion.getByRole("button", { name: "Aceptar" }));
    await page.getByText("Aceptaste").waitFor();
    await subir(page.getByRole("list", { name: "Feleal" }));
    console.log("      tras aceptar:", await texto(page.getByRole("list", { name: "Feleal" })));
    await foto(page, "13-por-aprobar-aceptada");
    const nota = page.locator("li", { has: page.getByRole("link", { name: /Nota sobre su gira/ }) });
    await tocar(page, nota.getByRole("button", { name: "Rechazar" }));
    await page.getByRole("dialog", { name: /^Rechazar/ }).waitFor();
    await foto(page, "14-hoja-motivo");
    await tocar(page, page.getByRole("dialog").getByRole("button", { name: /^No es esta persona/ }));
    await page.getByText("Rechazaste").waitFor();
    comprobar(true, `rechazada: ${await texto(page.getByRole("status").filter({ hasText: "Rechazaste" }))}`);
    await ctx.close();
  }
  // 15 · La portada de Administración: «Evidencias del showcase» en Pendiente.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin`, { waitUntil: "load" });
    await page.getByRole("heading", { name: "Administración" }).waitFor();
    const fila = page.getByRole("link", { name: /^Evidencias del showcase/ });
    console.log("     portada:", await texto(fila), "→", await fila.getAttribute("href"));
    await foto(page, "15-portada-pendiente");
    await ctx.close();
  }
  // 16 y 17 · La ficha de Feleal: el nombre como enlace, el aviso «2 por revisar» y, abajo, «Por revisar» con lo que cambia.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/showcase/feleal`, { waitUntil: "load" });
    await page.getByRole("heading", { name: "Feleal" }).waitFor();
    console.log("    ", JSON.stringify(await medir(page)), "· nombre →", await page.getByRole("link", { name: "Feleal" }).getAttribute("href"));
    await foto(page, "16-ficha");
    await tocar(page, page.getByRole("button", { name: "2 por revisar" }));
    await page.waitForFunction(() => document.activeElement?.id === "por-revisar");
    await page.waitForTimeout(600);
    await foto(page, "17-ficha-por-revisar");
    await ctx.close();
  }
  // 18 a 20 · A 1280: la lista filtrada, Por aprobar y la ficha.
  {
    const { ctx, page } = await contexto({ escritorio: true });
    await page.goto(`${base}/admin/showcase?puntaje=4&disciplina=musica`, { waitUntil: "load" });
    await foto(page, "18-lista-filtrada-1280");
    await page.goto(`${base}/admin/showcase/por-aprobar`, { waitUntil: "load" });
    await foto(page, "19-por-aprobar-1280");
    await page.goto(`${base}/admin/showcase/feleal`, { waitUntil: "load" });
    await foto(page, "20-ficha-1280");
    console.log("    ", JSON.stringify(await medir(page)));
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log(errores.length ? `errores de página o consola:\n  ${errores.join("\n  ")}` : "sin errores de página ni de consola");
console.log(fallas.length ? `FALLAS: ${fallas.length}` : "todas las comprobaciones bien");
process.exit(fallas.length ? 1 : 0);
