// OL-496 (bitácora 528): los faltantes del 29 de octubre en la app de verdad, compilada contra el respaldo local (nunca producción ni un `.env`
// real), con toques reales (el ratón en el punto del elemento, comprobado con elementFromPoint; nunca element.click()):
//   1. la hoja «Todos los números» sin lo que ya está en la portada (cinco en «Últimos 7 días», el quinto a todo lo ancho);
//   2. Administración › Instagram al volver de Meta (`?conectado=1`) con lo que se quedó sin salir por la conexión caducada
//      (`RESPALDO_INSTAGRAM_CONEXION=reconectada`): la hoja se abre sola con «Se quedó sin salir» y «Volver a publicar (3)», y al tocarlo los tres
//      vuelven a la cola una vez (al volver a entrar ya no se ofrecen).
// Escribe las capturas y `recorrido.txt` en la carpeta que se le pase.
//
//   node scripts/ops/auditoria-ui/capturar-faltantes-29-oct.mjs docs/rediseno/capturas-528
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { ADMIN, cookieDe, LLAVE_SERVICIO } from "./respaldo-local/fixture.mjs";

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const RAIZ = path.resolve(AQUI, "../../..");
const { chromium } = createRequire(path.join(RAIZ, "package.json"))("playwright-core");
const NEXT = path.join(RAIZ, "node_modules/next/dist/bin/next");
const MAC = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const AHORA = "2026-10-07T16:00:00Z"; // el reloj fijo de `medir` y de las maquetas: el miércoles 7 de octubre, 10:00 en la Ciudad de México
const SALIDA = process.argv[2];
if (!SALIDA) { console.error("uso: capturar-faltantes-29-oct.mjs <carpeta>"); process.exit(1); }
if (fs.existsSync(path.join(RAIZ, ".env"))) { console.error("hay un .env en el árbol: la app cargaría llaves reales"); process.exit(1); }
fs.mkdirSync(SALIDA, { recursive: true });

const puertoLibre = () => new Promise((ok) => { const s = net.createServer(); s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => ok(p)); }); });
const esperar = async (url) => { for (let i = 0; i < 120; i++) { try { if ((await fetch(url)).status < 500) return; } catch {} await new Promise((r) => setTimeout(r, 500)); } throw new Error("no arranca " + url); };
const hijos = [];
const sinToken = () => { const e = { ...process.env }; delete e.INSTAGRAM_TOKEN; delete e.CRON_SECRET; return e; };
const lanzar = (args, env) => { const h = spawn(process.execPath, args, { cwd: RAIZ, env: { ...sinToken(), ...env }, stdio: "ignore" }); hijos.push(h); return h; };
const parar = (h) => new Promise((ok) => { if (h.exitCode !== null) return ok(); h.once("exit", ok); h.kill(); });

const [puertoRespaldo, puertoApp] = [await puertoLibre(), await puertoLibre()];
const respaldo = `http://127.0.0.1:${puertoRespaldo}`;
const base = `http://127.0.0.1:${puertoApp}`;
const reloj = { RELOJ_FIJO: AHORA, TZ: "America/Mexico_City", NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --require=${path.join(AQUI, "reloj-fijo.cjs")}` };
const app = { NEXT_PUBLIC_SUPABASE_URL: respaldo, NEXT_PUBLIC_SUPABASE_ANON_KEY: "llave-anon-inventada", NEXT_PUBLIC_MAPBOX_TOKEN: "pk.inventado", SUPABASE_SERVICE_ROLE_KEY: LLAVE_SERVICIO };
const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), "ol496-"));
await (await import("./respaldo-local/fotos-historial.mjs")).dibujarFotosHistorial(carpeta);
await (await import("./respaldo-local/fotos-instagram.mjs")).dibujarFotosInstagram(carpeta);

let respaldoVivo = null;
async function arrancarRespaldo(conexion) {
  if (respaldoVivo) await parar(respaldoVivo);
  respaldoVivo = lanzar([path.join(AQUI, "respaldo-local/server.mjs"), String(puertoRespaldo)], {
    ...reloj, RESPALDO_URL: respaldo, RESPALDO_CARRUSEL_DIR: carpeta, RESPALDO_HISTORIAL: "1", RESPALDO_INSTAGRAM_SEMANA: "1", RESPALDO_INSTAGRAM_CONEXION: conexion,
  });
  await esperar(`${respaldo}/rest/v1/eventos?select=id&limit=1`);
}
/** La cola de redes tal como la tiene el respaldo (con la llave de servicio inventada). */
const cola = async () => (await fetch(`${respaldo}/rest/v1/redes_trabajos?select=id,evento_id,red,formato,estado,error,pedido`, { headers: { apikey: LLAVE_SERVICIO, Authorization: `Bearer ${LLAVE_SERVICIO}` } })).json();

const lineas = [];
const anotar = (t) => { lineas.push(t); console.log(t); };
const comprobar = (cond, texto) => { if (!cond) throw new Error("falló: " + texto); anotar("  ✓ " + texto); };

/** Un toque real en el centro del elemento; antes comprueba que es él quien lo recibe (nada encima). */
async function tocar(page, l) {
  await l.evaluate((e) => e.scrollIntoView({ block: "center" }));
  const b = await l.boundingBox();
  const x = b.x + b.width / 2;
  const y = b.y + b.height / 2;
  const suyo = await l.evaluate((e, [x, y]) => e.contains(document.elementFromPoint(x, y)), [x, y]);
  if (!suyo) throw new Error("algo tapa lo que se toca");
  await page.mouse.click(x, y);
}
async function captura(page, nombre) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  comprobar(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 0.5), `${nombre}: sin desplazamiento a lo ancho`);
  await page.screenshot({ path: path.join(SALIDA, `${nombre}.png`) });
  anotar(`  → ${nombre}.png`);
}

let browser;
const errores = [];
async function pagina(ancho = 390, alto = 844) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 2, isMobile: ancho < 768, hasTouch: true, locale: "es-MX", timezoneId: "America/Mexico_City", reducedMotion: "reduce" });
  await ctx.clock.setFixedTime(new Date(AHORA));
  await ctx.addCookies([{ name: "sb-127-auth-token", value: cookieDe(ADMIN), url: base }]);
  await ctx.route((u) => u.hostname !== "127.0.0.1", (q) => q.abort());
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => errores.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errores.push(m.text()); });
  return { ctx, page };
}

try {
  await arrancarRespaldo("todo");
  process.stdout.write("compilando la app contra el respaldo… ");
  const t = Date.now();
  const r = spawnSync(process.execPath, [NEXT, "build"], { cwd: RAIZ, env: { ...sinToken(), ...app }, encoding: "utf8", maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`next build falló\n${(r.stdout + r.stderr).slice(-3000)}`);
  console.log(`${Math.round((Date.now() - t) / 1000)} s`);
  lanzar([NEXT, "start", "-p", String(puertoApp)], { ...app, ...reloj });
  await esperar(base + "/entrar");
  browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE || (fs.existsSync(MAC) ? MAC : undefined), headless: true, args: ["--hide-scrollbars"] });

  // 1. La hoja «Todos los números» sin repetidos.
  anotar("1 · La hoja «Todos los números» sin lo que ya está en la portada");
  for (const [ancho, alto] of [[390, 844], [768, 1024]]) {
    const { ctx, page } = await pagina(ancho, alto);
    await page.goto(base + "/admin", { waitUntil: "networkidle" });
    const arriba = await page.locator("main > ul button[aria-expanded]").evaluateAll((bs) => bs.map((b) => b.querySelector("span")?.textContent));
    comprobar(arriba.join(" · ") === "Personas nuevas · Eventos de la comunidad · Voy y Me interesa · Eventos esta semana", `${ancho}: la portada: ${arriba.join(" · ")}`);
    await tocar(page, page.getByRole("button", { name: "Ver todos los números ›" }));
    const hoja = page.getByRole("dialog", { name: "Todos los números" });
    await hoja.getByRole("heading", { name: "Campañas pasadas" }).waitFor();
    const enHoja = await hoja.evaluate((h) => {
      const listas = [...h.querySelectorAll("ul")].filter((u) => u.querySelector(":scope > li > button[aria-expanded]"));
      const ancho = (u) => u.getBoundingClientRect().width;
      return listas.map((u) => ({ ancho: Math.round(ancho(u)), cuadros: [...u.querySelectorAll(":scope > li > button[aria-expanded]")].map((b) => ({ nombre: b.querySelector("span")?.textContent, ancho: Math.round(b.getBoundingClientRect().width), arriba: Math.round(b.getBoundingClientRect().top) })) }));
    });
    const siete = enHoja[0];
    const nombres = siete.cuadros.map((c) => c.nombre);
    comprobar(nombres.join(" · ") === "Personas activas · Coincidencias · Publica la comunidad · Primera publicación · Avisos abiertos", `${ancho}: «Últimos 7 días» de la hoja: ${nombres.join(" · ")}`);
    comprobar(!nombres.includes("Voy y Me interesa") && !nombres.includes("Agenda de la semana"), `${ancho}: sin «Voy y Me interesa» ni la agenda (ya están arriba)`);
    const ultimo = siete.cuadros.at(-1);
    comprobar(Math.abs(ultimo.ancho - siete.ancho) <= 1 && siete.cuadros[0].ancho < siete.ancho / 2, `${ancho}: dos por fila y el quinto a todo lo ancho (${ultimo.ancho} de ${siete.ancho})`);
    comprobar(new Set(siete.cuadros.map((c) => c.arriba)).size === 3, `${ancho}: tres filas, ningún cuadro solo a la mitad`);
    comprobar(enHoja[1]?.cuadros.length === 2, `${ancho}: Fichas sigue con sus dos`);
    await captura(page, ancho === 390 ? "01-hoja-numeros" : "02-hoja-numeros-768");
    if (ancho === 390) {
      await tocar(page, hoja.getByRole("button", { name: /^Primera publicación/ }));
      await hoja.locator("#desglose-hoja").waitFor();
      comprobar(true, "tocar «Primera publicación» abre su desglose bajo su fila; «Avisos abiertos» sigue entero debajo");
      await captura(page, "01b-hoja-numeros-desglose");
    }
    await ctx.close();
  }

  // 2. Volver a publicar lo que se quedó sin salir al reconectar Instagram.
  anotar("2 · Al volver de Meta con la conexión hecha (RESPALDO_INSTAGRAM_CONEXION=reconectada)");
  await arrancarRespaldo("reconectada");
  const antes = await cola();
  {
    const { ctx, page } = await pagina(320, 700);
    await page.goto(base + "/admin/instagram?conectado=1", { waitUntil: "networkidle" });
    const hoja = page.getByRole("dialog", { name: "Conexión con Instagram" });
    await hoja.waitFor();
    await captura(page, "03b-hoja-sin-salir-320");
    await ctx.close();
  }
  const { ctx, page } = await pagina();
  await page.goto(base + "/admin/instagram?conectado=1", { waitUntil: "networkidle" });
  const hoja = page.getByRole("dialog", { name: "Conexión con Instagram" });
  await hoja.waitFor();
  comprobar(true, "la hoja de la conexión se abre sola al volver de Meta");
  const filas = (await hoja.locator("li").filter({ hasText: "no salió" }).allInnerTexts()).map((x) => x.replace(/\s+/g, " ").trim());
  comprobar(filas.length === 3, `tres pendientes: ${filas.join(" | ")}`);
  comprobar(/^Master Class/.test(filas[0]) && /Instagram y Facebook · publicación · no salió el mié 7 de oct$/.test(filas[0]), "la Master Class una vez (falló dos veces), «Instagram y Facebook · publicación · no salió el mié 7 de oct»");
  comprobar(/^Leonora/.test(filas[1]) && /Instagram · historia · no salió el mar 6 de oct$/.test(filas[1]), "Leonora, «Instagram · historia · no salió el mar 6 de oct»");
  comprobar(/^Feleal/.test(filas[2]) && /Facebook · no salió el lun 5 de oct$/.test(filas[2]), "Feleal, «Facebook · no salió el lun 5 de oct»");
  comprobar(!filas.some((f) => /OCA|Delirium|Uno de Uno/.test(f)), "no salen la que falló por la imagen, la de la semana pasada ni la que ya volvió a salir");
  const volver = hoja.getByRole("button", { name: /^Volver a publicar \(/ });
  comprobar((await volver.innerText()) === "Volver a publicar (3)", "el botón: «Volver a publicar (3)», en una línea");
  comprobar((await volver.boundingBox()).height < 60, "el botón no se parte en dos renglones");
  comprobar((await volver.boundingBox()).height >= 44 && (await hoja.getByRole("link", { name: "Reconectar" }).count()) === 1, "mide 44 o más y «Reconectar» sigue debajo");
  await captura(page, "03-hoja-sin-salir");
  await tocar(page, hoja.getByRole("button", { name: "Cerrar" }));
  await hoja.waitFor({ state: "detached" });
  const ver = page.getByRole("button", { name: "3 no salieron ›" });
  comprobar((await ver.count()) === 1, "cerrada, la línea verde «Instagram quedó conectado» lleva «3 no salieron ›»");
  await page.evaluate(() => scrollTo(0, 0));
  await captura(page, "04-linea-verde");
  await tocar(page, ver);
  await hoja.waitFor();
  await tocar(page, volver);
  await hoja.getByRole("status").waitFor();
  const dice = (await hoja.getByRole("status").innerText()).replace(/\s+/g, " ").trim();
  comprobar(dice === "3 van en camino. Te avisamos en el teléfono cuando salgan.", `al tocarlo: «${dice}»`);
  comprobar((await volver.count()) === 0, "y ya no se ofrece");
  await captura(page, "05-vueltos");
  const despues = await cola();
  // Los de la semana de Instagram (`pedido.casilla`) los programa la pestaña «Semana» al abrirse: no cuentan aquí.
  const nuevos = despues.filter((x) => !antes.some((y) => y.id === x.id) && !x.pedido?.casilla);
  comprobar(nuevos.length === 3 && nuevos.every((x) => x.estado === "en_cola"), `la cola tiene tres trabajos nuevos en cola, uno por publicación: ${nuevos.map((x) => `${x.red} ${x.formato}`).join(", ")}`);
  await ctx.close();
  // Volver a entrar como si se volviera de Meta otra vez: ya están en camino, no se ofrecen (sin duplicar).
  {
    const { ctx: c, page: p } = await pagina();
    await p.goto(base + "/admin/instagram?conectado=1", { waitUntil: "networkidle" });
    await p.getByRole("tablist", { name: "Instagram" }).waitFor();
    await p.waitForTimeout(500);
    comprobar((await p.getByRole("dialog", { name: "Conexión con Instagram" }).count()) === 0 && (await p.getByRole("button", { name: /no salieron/ }).count()) === 0, "al volver otra vez de Meta ya no se ofrecen: van en camino (sin duplicar)");
    await c.close();
  }
  comprobar(errores.length === 0, `sin errores de página ni de consola${errores.length ? `: ${errores.join(" | ")}` : ""}`);
} finally {
  fs.writeFileSync(path.join(SALIDA, "recorrido.txt"), lineas.join("\n") + "\n");
  await browser?.close();
  for (const h of hijos) h.kill();
  fs.rmSync(carpeta, { recursive: true, force: true });
}
