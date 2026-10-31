// OL-495 (bitácora 527): Administración › Instagram más simple, en la app de verdad compilada contra el respaldo local (nunca producción ni un
// `.env` real), con toques reales (el ratón en el punto del elemento, comprobado con elementFromPoint; nunca element.click()). Cuatro arranques
// del respaldo con el mismo puerto (la app se compila una vez): conectada, sin conexión, caducó y la semana vacía por falta de material. Escribe
// las capturas y `recorrido.txt` en la carpeta que se le pase.
//
//   node scripts/ops/auditoria-ui/capturar-instagram-simple.mjs docs/rediseno/capturas-527
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
const AHORA = "2026-10-07T16:00:00Z"; // el reloj fijo de `medir` y de las maquetas: el miércoles 7 de octubre
const SALIDA = process.argv[2];
if (!SALIDA) { console.error("uso: capturar-instagram-simple.mjs <carpeta>"); process.exit(1); }
if (fs.existsSync(path.join(RAIZ, ".env"))) { console.error("hay un .env en el árbol: la app cargaría llaves reales"); process.exit(1); }
fs.mkdirSync(SALIDA, { recursive: true });

const puertoLibre = () => new Promise((ok) => { const s = net.createServer(); s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => ok(p)); }); });
const esperar = async (url) => { for (let i = 0; i < 120; i++) { try { if ((await fetch(url)).status < 500) return; } catch {} await new Promise((r) => setTimeout(r, 500)); } throw new Error("no arranca " + url); };
const hijos = [];
const sinToken = () => { const e = { ...process.env }; delete e.INSTAGRAM_TOKEN; return e; };
const lanzar = (args, env) => { const h = spawn(process.execPath, args, { cwd: RAIZ, env: { ...sinToken(), ...env }, stdio: "ignore" }); hijos.push(h); return h; };
const parar = (h) => new Promise((ok) => { if (h.exitCode !== null) return ok(); h.once("exit", ok); h.kill(); });

const [puertoRespaldo, puertoApp] = [await puertoLibre(), await puertoLibre()];
const respaldo = `http://127.0.0.1:${puertoRespaldo}`;
const base = `http://127.0.0.1:${puertoApp}`;
const reloj = { RELOJ_FIJO: AHORA, TZ: "America/Mexico_City", NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --require=${path.join(AQUI, "reloj-fijo.cjs")}` };
const app = { NEXT_PUBLIC_SUPABASE_URL: respaldo, NEXT_PUBLIC_SUPABASE_ANON_KEY: "llave-anon-inventada", NEXT_PUBLIC_MAPBOX_TOKEN: "pk.inventado", SUPABASE_SERVICE_ROLE_KEY: LLAVE_SERVICIO };
const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), "ol495-"));
await (await import("./respaldo-local/fotos-historial.mjs")).dibujarFotosHistorial(carpeta);
await (await import("./respaldo-local/fotos-instagram.mjs")).dibujarFotosInstagram(carpeta);

let respaldoVivo = null;
async function arrancarRespaldo({ conexion = "", semana = true }) {
  if (respaldoVivo) await parar(respaldoVivo);
  respaldoVivo = lanzar([path.join(AQUI, "respaldo-local/server.mjs"), String(puertoRespaldo)], {
    ...reloj, RESPALDO_URL: respaldo, RESPALDO_CARRUSEL_DIR: carpeta, RESPALDO_HISTORIAL: "1", RESPALDO_INSTAGRAM_SEMANA: semana ? "1" : "", RESPALDO_INSTAGRAM_CONEXION: conexion,
  });
  await esperar(`${respaldo}/rest/v1/eventos?select=id&limit=1`);
}

const lineas = [];
const anotar = (t) => { lineas.push(t); console.log(t); };
const comprobar = (cond, texto) => { if (!cond) throw new Error("falló: " + texto); anotar("  ✓ " + texto); };

/** Un toque real en el centro del elemento; antes comprueba que es él quien lo recibe (nada encima). */
async function tocar(page, l) {
  await l.scrollIntoViewIfNeeded();
  const b = await l.boundingBox();
  const x = b.x + b.width / 2;
  const y = b.y + b.height / 2;
  const suyo = await l.evaluate((e, [x, y]) => e.contains(document.elementFromPoint(x, y)), [x, y]);
  if (!suyo) throw new Error("algo tapa lo que se toca");
  await page.mouse.click(x, y);
}
/** Sin desplazamiento a lo ancho y el botón de la conexión con su tamaño. */
async function medir(page) {
  return page.evaluate(() => {
    const b = document.querySelector('main button[aria-haspopup="dialog"][aria-label*="Instagram"]');
    const caja = b?.getBoundingClientRect();
    return { ancho: document.documentElement.scrollWidth <= innerWidth + 0.5, boton: caja ? { w: Math.round(caja.width), h: Math.round(caja.height), dentro: caja.right <= innerWidth + 0.5 } : null };
  });
}
async function captura(page, nombre) {
  await page.waitForTimeout(600);
  const m = await medir(page);
  comprobar(m.ancho, `${nombre}: sin desplazamiento a lo ancho`);
  if (m.boton) comprobar(m.boton.w >= 44 && m.boton.h >= 44 && m.boton.dentro, `${nombre}: el botón de la conexión mide ${m.boton.w}×${m.boton.h} y cabe`);
  await page.screenshot({ path: path.join(SALIDA, `${nombre}.png`) });
  anotar(`  → ${nombre}.png`);
}

let browser;
const errores = [];
async function pagina(ancho = 390, alto = 844) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 2, isMobile: ancho < 768, hasTouch: true, locale: "es-MX", reducedMotion: "reduce" });
  await ctx.clock.setFixedTime(new Date(AHORA));
  await ctx.addCookies([{ name: "sb-127-auth-token", value: cookieDe(ADMIN), url: base }]);
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => errores.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errores.push(m.text()); });
  return { ctx, page };
}
const abrir = async (page, url) => { await page.goto(base + url, { waitUntil: "networkidle" }); await page.getByRole("tablist", { name: "Instagram" }).waitFor(); };
const botonConexion = (page) => page.locator("main").getByRole("button", { name: /Instagram|conexión/ }).and(page.locator('[aria-haspopup="dialog"]'));
const pestana = (page, nombre) => page.getByRole("tab", { name: nombre });
const chip = (page) => page.locator("header button").first();

try {
  await arrancarRespaldo({ conexion: "todo" });
  process.stdout.write("compilando la app contra el respaldo… ");
  const t = Date.now();
  const r = spawnSync(process.execPath, [NEXT, "build"], { cwd: RAIZ, env: { ...sinToken(), ...app }, encoding: "utf8", maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`next build falló\n${(r.stdout + r.stderr).slice(-3000)}`);
  console.log(`${Math.round((Date.now() - t) / 1000)} s`);
  lanzar([NEXT, "start", "-p", String(puertoApp)], { ...app, ...reloj });
  await esperar(base + "/entrar");
  browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE || (fs.existsSync(MAC) ? MAC : undefined), headless: true, args: ["--hide-scrollbars"] });

  // 1. Conectada: abre con la ciudad de quien entra, en «Semana» (tiene algo de hoy en adelante), sin el bloque «Conexión».
  anotar("Conectada (RESPALDO_INSTAGRAM_CONEXION=todo, la semana con seis programadas)");
  {
    const { ctx, page } = await pagina();
    await abrir(page, "/admin/instagram");
    comprobar((await chip(page).innerText()).includes("San Luis Potosí"), "sin ?ciudad ni galleta, abre con la ciudad de quien entra (en el respaldo no tiene ninguna: la inicial)");
    comprobar((await pestana(page, "Semana").getAttribute("aria-selected")) === "true", "abre en «Semana»: tiene algo de hoy en adelante");
    comprobar((await botonConexion(page).getAttribute("aria-label")) === "Instagram conectado como @smsnstrsapp", "el botón dice «Instagram conectado como @smsnstrsapp»");
    comprobar((await page.getByRole("heading", { name: "Conexión" }).count()) === 0 && (await page.getByText("Conectada como").count()) === 0, "conectada, el bloque «Conexión» no ocupa la pantalla");
    await captura(page, "01-conectada");
    await tocar(page, botonConexion(page));
    const hoja = page.getByRole("dialog", { name: "Conexión con Instagram" });
    await hoja.waitFor();
    const texto = (await hoja.innerText()).replace(/\s+/g, " ");
    comprobar(/@smsnstrsapp/.test(texto) && /conectada desde el 7 de octubre/.test(texto), "la hoja: la cuenta y «conectada desde el 7 de octubre»");
    comprobar(/Publicar en Instagram/.test(texto) && /Publicar en la página de Facebook/.test(texto) && /Leer otras cuentas para completar fichas/.test(texto), "la hoja: qué puede (publicar y leer cuentas)");
    comprobar((await hoja.getByRole("link", { name: "Reconectar" }).getAttribute("href")) === "/api/instagram/conectar", "«Reconectar» lleva al inicio de sesión de Meta");
    await captura(page, "02-hoja-conectada");
    await tocar(page, hoja.getByRole("button", { name: "Cerrar" }));
    await hoja.waitFor({ state: "detached" });
    comprobar(true, "la ✕ cierra la hoja");
    // La hoja de ciudades: «Todas las ciudades» sigue ahí; elegir guarda la galleta de Administración.
    await tocar(page, chip(page));
    const ciudades = page.getByRole("dialog", { name: /Ciudades con eventos/ });
    await ciudades.waitFor();
    await captura(page, "03-hoja-ciudades");
    await tocar(page, ciudades.getByRole("button", { name: /Todas las ciudades/ }));
    await page.waitForURL(/ciudad=todas/);
    await page.getByText("Cada ciudad tiene su semana").waitFor();
    comprobar(true, "«Todas las ciudades» se elige en la hoja (no es la de omisión)");
    await tocar(page, chip(page));
    await ciudades.waitFor();
    await tocar(page, ciudades.getByRole("button", { name: /San Luis Potosí/ }));
    await page.waitForURL(/ciudad=san-luis-potosi/);
    const galleta = (await ctx.cookies(base + "/admin/instagram")).find((c) => c.name === "sn_admin_ciudad")?.value;
    comprobar(galleta === "san-luis-potosi", "elegir San Luis la guarda en la misma memoria de Administración (sn_admin_ciudad)");
    // La elección de la persona en la sesión gana sobre la regla.
    await tocar(page, pestana(page, "Eventos"));
    await page.waitForURL(/pestana=eventos/);
    await abrir(page, "/admin/instagram");
    comprobar((await pestana(page, "Eventos").getAttribute("aria-selected")) === "true", "eligió «Eventos»: al volver a abrir la pantalla en la misma sesión, abre en «Eventos»");
    await tocar(page, pestana(page, "Semana"));
    await abrir(page, "/admin/instagram");
    comprobar((await pestana(page, "Semana").getAttribute("aria-selected")) === "true", "y al volver a «Semana», abre en «Semana»");
    // El nombre de la ciudad sale de `ciudades`.
    await abrir(page, "/admin/instagram?ciudad=queretaro&pestana=eventos");
    comprobar((await chip(page).innerText()).includes("Querétaro"), "con ?ciudad=queretaro (en «Eventos») el chip dice «Querétaro» (con su acento)");
    comprobar((await page.getByText("No hay eventos por publicar en Querétaro").count()) === 1, "y la lista «No hay eventos por publicar en Querétaro…»");
    await captura(page, "04-queretaro");
    await ctx.close();
    for (const [ancho, alto] of [[320, 700], [768, 1024]]) {
      const { ctx: c, page: p } = await pagina(ancho, alto);
      await abrir(p, "/admin/instagram");
      await captura(p, `05-conectada-${ancho}`);
      await tocar(p, botonConexion(p));
      await p.getByRole("dialog", { name: "Conexión con Instagram" }).waitFor();
      comprobar(true, `a ${ancho} el botón se toca y abre la hoja`);
      await c.close();
    }
  }

  // 2. Sin conexión: punto gris, el renglón con la causa a la vista y «Conectar Instagram» en la hoja.
  anotar("Sin conexión (sin fila y sin la llave de respaldo)");
  await arrancarRespaldo({ conexion: "" });
  {
    const { ctx, page } = await pagina();
    await abrir(page, "/admin/instagram");
    comprobar((await botonConexion(page).getAttribute("aria-label")) === "Instagram sin conexión", "el botón dice «Instagram sin conexión»");
    comprobar((await page.getByText("Conecta Instagram para publicar").count()) === 1, "el renglón «Sin conexión · Conecta Instagram para publicar» se queda a la vista");
    await captura(page, "06-sin-conexion");
    await tocar(page, botonConexion(page));
    const hoja = page.getByRole("dialog", { name: "Conexión con Instagram" });
    await hoja.waitFor();
    comprobar((await hoja.getByRole("link", { name: "Conectar Instagram" }).count()) === 1, "la hoja trae «Conectar Instagram»");
    await captura(page, "07-hoja-sin-conexion");
    await ctx.close();
  }

  // 3. Caducó: el último trabajo de Instagram falló por permiso después de conectar.
  anotar("Caducó (RESPALDO_INSTAGRAM_CONEXION=caduco: conectada hace 9 días, el último trabajo falló esta mañana por permiso)");
  await arrancarRespaldo({ conexion: "caduco" });
  {
    const { ctx, page } = await pagina();
    await abrir(page, "/admin/instagram");
    comprobar((await botonConexion(page).getAttribute("aria-label")) === "La conexión con Instagram caducó", "el botón dice «La conexión con Instagram caducó»");
    comprobar((await page.getByText("La conexión caducó el mié 7 de oct: reconecta").count()) === 1, "el renglón «Instagram dejó de publicar · La conexión caducó el mié 7 de oct: reconecta»");
    await captura(page, "08-caduco");
    await tocar(page, botonConexion(page));
    const hoja = page.getByRole("dialog", { name: "Conexión con Instagram" });
    await hoja.waitFor();
    comprobar((await hoja.getByText("Dejó de publicar el mié 7 de oct: la conexión caducó").count()) === 1, "la hoja dice cuándo dejó de publicar");
    await captura(page, "09-hoja-caduco");
    await ctx.close();
  }

  // 4. La semana vacía por falta de material: abre en «Eventos» con «Falta material» arriba.
  anotar("Semana vacía (sin RESPALDO_INSTAGRAM_SEMANA: nadie con la ficha completa)");
  await arrancarRespaldo({ conexion: "todo", semana: false });
  for (const [ancho, alto] of [[390, 844], [320, 700], [768, 1024]]) {
    const { ctx, page } = await pagina(ancho, alto);
    await abrir(page, "/admin/instagram");
    comprobar((await pestana(page, "Eventos").getAttribute("aria-selected")) === "true", `${ancho}: la semana no tiene nada de hoy en adelante: abre en «Eventos»`);
    comprobar((await page.getByText("Esta semana no hay nada programado: a nadie le alcanza el material.").count()) === 1, `${ancho}: la línea de la semana vacía`);
    const falta = page.getByRole("link", { name: /Falta material/ });
    comprobar((await falta.count()) === 1, `${ancho}: el renglón «Falta material» arriba de la lista`);
    await captura(page, `10-semana-vacia-${ancho}`);
    if (ancho === 390) {
      await tocar(page, falta);
      await page.getByRole("dialog").waitFor();
      comprobar(true, "tocar «Falta material» abre su hoja");
      await captura(page, "11-hoja-falta-material");
    }
    await ctx.close();
  }
  comprobar(errores.length === 0, `sin errores de página ni de consola${errores.length ? `: ${errores.join(" | ")}` : ""}`);
} finally {
  fs.writeFileSync(path.join(SALIDA, "recorrido.txt"), lineas.join("\n") + "\n");
  await browser?.close();
  for (const h of hijos) h.kill();
  fs.rmSync(carpeta, { recursive: true, force: true });
}
