// Capturas de «Buscar carteles» (OL-444, bitácora 476) con la app compilada contra el respaldo local y la sesión de su cuenta de
// administración: la tarjeta «Carteles» del panel de San Luis Potosí («N eventos próximos sin cartel» y su botón), su hoja con el tope de
// 2,00 por omisión, la búsqueda «Pendiente» tras «Correr» y la bandeja con dos carteles propuestos («ver el cartel», la fuente y el evento).
// El respaldo es el de siempre con una corrida de carteles terminada y sus dos propuestas añadidas en memoria por este guion (no cambia el
// fixture: `npm run medir` sigue viendo lo mismo). Chrome real (playwright-core, channel: 'chrome'), 390×844 a 2×; toques reales (clics por
// coordenadas que fallan si algo tapa el botón).
// node scripts/ops/auditoria-ui/capturar-carteles.mjs <raíz del árbol> <carpeta de salida>
// Compila `.next` contra el respaldo (SIN_BUILD=1 usa el `.next` que ya hay, compilado con el mismo PUERTO_RESPALDO). Correrlo en un árbol SIN
// `.env` (si lo encuentra, se niega).
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [RAIZ, SALIDA] = process.argv.slice(2).map((p) => path.resolve(p));
if (fs.existsSync(path.join(RAIZ, ".env"))) {
  console.error("hay un .env en el árbol: la app cargaría llaves reales. Córrelo en un árbol sin .env");
  process.exit(1);
}
const { chromium } = await import(path.join(RAIZ, "node_modules/playwright-core/index.mjs"));
const { ADMIN, cookieDe } = await import(path.join(RAIZ, "scripts/ops/auditoria-ui/respaldo-local/fixture.mjs"));
const NEXT = path.join(RAIZ, "node_modules/next/dist/bin/next");
const AQUI = path.join(RAIZ, "scripts/ops/auditoria-ui");
const AHORA = "2026-10-22T16:00:00Z"; // miércoles 22 de octubre, 10:00 en San Luis Potosí
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
const CORRIDA = "cafe0444-0000-4000-8000-000000000001";
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

// El respaldo con la corrida de carteles: se importa el fixture, se le añaden las filas en memoria y se arranca el servidor en el mismo proceso
// (comparten el módulo, así que el servidor ve las filas).
const fixture = pathToFileURL(path.join(AQUI, "respaldo-local/fixture.mjs")).href;
const servidor = pathToFileURL(path.join(AQUI, "respaldo-local/server.mjs")).href;
const conCarteles = `
const { tablas, ADMIN } = await import(${JSON.stringify(fixture)});
const dia = (n, h) => new Date(Date.parse("2026-10-22T00:00:00-06:00") + n * 86400000 + h * 3600000).toISOString();
tablas.rutinas_corridas.push({ id: ${JSON.stringify(CORRIDA)}, tipo: "carteles", ciudad: "san-luis-potosi", parametros: { fuentes: ["sitio", "web"] }, tope_usd: 2, gasto_usd: 0.31, estado: "terminada",
  resumen: { paso: "2 de 2 búsquedas", avance: 1, propuestos: 2, eventos_sin_cartel: 9, descartados: { sin_cartel: 4, imagen_no_sirve: 1, pagina_no_vista: 0, rechazado_antes: 0, ya_propuesto: 0, de_mas: 0 },
    solo_redes: [{ lugar: "Galería del Centro", redes: ["https://www.instagram.com/galeriadelcentro.example/"], eventos: 2 }], avisos: ["2 eventos de lugares solo con Instagram o Facebook: se revisan a mano"] },
  creado_por: ADMIN, creado_en: "2026-10-22T15:20:00Z", inicio: "2026-10-22T15:20:05Z", fin: "2026-10-22T15:23:40Z" });
tablas.propuestas.push(
  { id: "cafe0444-0000-4000-8000-0000000000a1", corrida_id: ${JSON.stringify(CORRIDA)}, tipo: "cartel", fuente: "Sitio del lugar", estado: "propuesta", motivo_rechazo: null, ficha_id: null, resuelto_por: null, resuelto_en: null, creado_en: "2026-10-22T15:21:00Z",
    datos: { evento_id: "bbbb0444-0000-4000-8000-000000000001", titulo: "Noche de jazz en el patio", inicio: dia(2, 20), lugar: "Foro del Patio", imagen: "https://forodelpatio.example/carteles/jazz-octubre.jpg", pagina: "https://forodelpatio.example/agenda", url: "https://forodelpatio.example/agenda", ciudad: "San Luis Potosí", leida: "2026-10-22T15:21:00Z" } },
  { id: "cafe0444-0000-4000-8000-0000000000a2", corrida_id: ${JSON.stringify(CORRIDA)}, tipo: "cartel", fuente: "Búsqueda web", estado: "propuesta", motivo_rechazo: null, ficha_id: null, resuelto_por: null, resuelto_en: null, creado_en: "2026-10-22T15:22:30Z",
    datos: { evento_id: "bbbb0444-0000-4000-8000-000000000002", titulo: "Lectura en voz alta: cuentos del altiplano", inicio: dia(4, 18), lugar: "Casa de la Cultura", imagen: "https://noticias.example/fotos/lectura-altiplano.png", pagina: "https://noticias.example/cultura/lectura-altiplano", url: "https://noticias.example/cultura/lectura-altiplano", ciudad: "San Luis Potosí", leida: "2026-10-22T15:22:30Z" } },
);
await import(${JSON.stringify(servidor)});
`;

const [pr, pa] = [Number(process.env.PUERTO_RESPALDO) || (await puertoLibre()), await puertoLibre()];
const respaldo = `http://127.0.0.1:${pr}`;
const base = `http://127.0.0.1:${pa}`;
const reloj = { RELOJ_FIJO: AHORA, TZ: "America/Mexico_City", NODE_OPTIONS: `--require=${path.join(AQUI, "reloj-fijo.cjs")}` };
const app = { NEXT_PUBLIC_SUPABASE_URL: respaldo, NEXT_PUBLIC_SUPABASE_ANON_KEY: "llave-anon-inventada", NEXT_PUBLIC_MAPBOX_TOKEN: "pk.inventado" };
const envoltura = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "respaldo-carteles-")), "respaldo.mjs");
fs.writeFileSync(envoltura, conCarteles);
const r = lanzar([envoltura], { ...reloj, PUERTO: String(pr) });
await esperar(`${respaldo}/rest/v1/eventos?select=id&limit=1`, r);
if (!process.env.SIN_BUILD) {
  process.stdout.write("compilando… ");
  const b = spawnSync(process.execPath, [NEXT, "build"], { cwd: RAIZ, env: { ...process.env, ...app }, encoding: "utf8", maxBuffer: 1 << 26 });
  if (b.status !== 0) throw new Error((b.stdout + b.stderr).slice(-3000));
  console.log("listo");
}
const s = lanzar([NEXT, "start", "-p", String(pa)], { ...app, ...reloj, MAPBOX_API_URL: `${respaldo}/mapbox` });
await esperar(`${base}/entrar`, s);

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--hide-scrollbars"] });
const errores = [];
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA, locale: "es-MX", timezoneId: "America/Mexico_City" });
await ctx.clock.setFixedTime(new Date(AHORA));
await ctx.addCookies([{ name: "sb-127-auth-token", value: cookieDe(ADMIN), url: base }]);
await ctx.route("**/_vercel/**", (q) => q.fulfill({ contentType: "text/javascript", body: "" }));
await ctx.route((u) => u.hostname !== "127.0.0.1", (q) => q.abort());
const page = await ctx.newPage();
page.on("pageerror", (e) => errores.push(`página: ${String(e.message).slice(0, 200)}`));
page.on("console", (m) => m.type() === "error" && errores.push(`consola: ${m.text().slice(0, 200)}`));

const foto = async (nombre) => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(SALIDA, `${nombre}.png`) });
  const m = await page.evaluate(() => ({ anchoDePagina: document.documentElement.scrollWidth, ancho: innerWidth, nodos: document.body.querySelectorAll("*").length }));
  if (m.anchoDePagina > m.ancho) throw new Error(`${nombre}: la página se desplaza a lo ancho (${m.anchoDePagina} > ${m.ancho})`);
  console.log("  ", nombre, JSON.stringify(m));
};
const arriba = (localizador) => localizador.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 72));
async function tocar(localizador) {
  await localizador.evaluate((el) => el.scrollIntoView({ block: "center" }));
  const caja = await localizador.boundingBox();
  if (!caja) throw new Error("sin caja para tocar");
  const [x, y] = [caja.x + caja.width / 2, caja.y + caja.height / 2];
  if (!(await localizador.evaluate((el, [x, y]) => el.contains(document.elementFromPoint(x, y)), [x, y]))) throw new Error("algo tapa lo que se toca");
  await page.mouse.click(x, y);
}
const comprobar = (cond, que) => {
  if (!cond) throw new Error(`no se cumple: ${que}`);
  console.log("     ✓", que);
};

try {
  // 1 · El panel de San Luis: al final, la tarjeta «Carteles» con los eventos próximos sin cartel, la última búsqueda y su botón.
  await page.goto(`${base}/admin/ciudades/san-luis-potosi`, { waitUntil: "load" });
  const tarjeta = page.getByRole("group", { name: "Carteles" });
  await tarjeta.waitFor();
  const texto = (await tarjeta.innerText()).replace(/\s+/g, " ");
  comprobar(/Carteles \d+ eventos? próximos? sin cartel/.test(texto), `la tarjeta: «${texto}»`);
  comprobar(texto.includes("Terminada") && texto.includes("2 propuestos"), "con la última búsqueda: Terminada · 2 propuestos");
  const boton = tarjeta.getByRole("button", { name: "Buscar carteles" });
  comprobar((await boton.getAttribute("class")).includes("secundario") || !(await boton.getAttribute("class")).includes("primario"), "«Buscar carteles» nunca es el botón violeta");
  await arriba(tarjeta);
  await foto("01-panel-tarjeta-carteles");

  // 2 · La hoja: qué hace, sus fuentes y el tope de 2,00 por omisión.
  await tocar(boton);
  const hoja = page.getByRole("dialog", { name: "Buscar carteles en San Luis Potosí" });
  await hoja.waitFor();
  comprobar((await hoja.getByRole("textbox", { name: "Tope de gasto (USD)" }).inputValue()) === "2,00", "el tope empieza en 2,00");
  const th = (await hoja.innerText()).replace(/\s+/g, " ");
  comprobar(th.includes("Instagram y Facebook no se pueden leer desde aquí") && th.includes("Sitio del lugar y página del evento") && th.includes("notas de prensa y agendas"), "la hoja dice qué busca y qué no puede leer");
  await foto("02-hoja-buscar-carteles");

  // 3 · «Correr»: la tarjeta queda «Pendiente» con su tope y «Cancelar la búsqueda».
  await tocar(hoja.getByRole("button", { name: "Correr" }));
  await hoja.waitFor({ state: "detached" });
  await page.reload({ waitUntil: "load" });
  const pendiente = page.getByRole("group", { name: "Carteles" });
  await pendiente.waitFor();
  const tp = (await pendiente.innerText()).replace(/\s+/g, " ");
  comprobar(tp.includes("Pendiente") && tp.includes("tope 2,00 USD") && tp.includes("Cancelar la búsqueda"), `pendiente: «${tp}»`);
  await arriba(pendiente);
  await foto("03-panel-carteles-pendiente");

  // 4 · La bandeja: los dos carteles propuestos, con «ver el cartel», la fuente y el evento al que pertenecen.
  await page.goto(`${base}/admin/ciudades/san-luis-potosi/propuestas`, { waitUntil: "load" });
  const titulo = page.getByRole("heading", { name: "Buscar carteles" });
  await titulo.waitFor();
  const jazz = page.getByRole("listitem").filter({ hasText: "Noche de jazz en el patio" });
  const tj = (await jazz.innerText()).replace(/\s+/g, " ");
  comprobar(tj.includes("Cartel · propuesto por la rutina") && tj.includes("Foro del Patio") && tj.includes("ver el cartel") && tj.includes("forodelpatio.example"), `la tarjeta del cartel: «${tj}»`);
  comprobar((await jazz.getByRole("link", { name: "ver el cartel" }).getAttribute("href")) === "https://forodelpatio.example/carteles/jazz-octubre.jpg", "«ver el cartel» abre la imagen propuesta");
  await arriba(titulo);
  await foto("04-bandeja-carteles");
  await tocar(jazz.getByRole("button", { name: "Rechazar" }));
  const rechazo = page.getByRole("dialog");
  await rechazo.waitFor();
  comprobar((await rechazo.innerText()).includes("El cartel de «Noche de jazz en el patio». La rutina aprende"), "la hoja de rechazo nombra el cartel con mayúscula");
  await foto("05-rechazar-cartel");
  console.log("errores de página:", errores.length ? errores : "ninguno");
} catch (e) {
  console.error(e.message);
  console.error("errores de página:", errores);
  await page.screenshot({ path: path.join(SALIDA, "error.png") }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
// El respaldo y la app siguen vivos: se cierran al salir (`process.on("exit")`).
process.exit(process.exitCode ?? 0);
