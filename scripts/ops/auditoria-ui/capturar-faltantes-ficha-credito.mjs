// Capturas de la bitácora 537 (OL-504): los dos faltantes chicos del cierre del 29 de octubre.
//   1. La hoja del día de Instagram (Administración › Instagram › Semana, «Hoy · 7:00 pm · Lugar») de un lugar con crédito de la portada (OL-491): el
//      texto de la vista previa lleva «Foto: autor · licencia», lo mismo que publica el trabajador (`textoDeFicha`). A 390×844.
//   2. La ficha de lugar a 1280×800 (y a 390, 768 y 1048): si algo se sale a lo ancho (desplazamiento horizontal de la página), qué es y la caja de
//      los bloques de la ficha, para comparar antes y después. A 1280 con la barra de desplazamiento visible (Chrome sin `--hide-scrollbars`).
// La app compilada contra el respaldo local (datos inventados; nunca producción ni un `.env` real), la sesión de la administración del respaldo,
// Chrome real (playwright-core, channel: 'chrome') a 2×, toques reales (el ratón en el centro del control, comprobado con elementFromPoint).
//   node scripts/ops/auditoria-ui/capturar-faltantes-ficha-credito.mjs <raíz del árbol> <carpeta de salida> [prefijo]
// `prefijo` (p. ej. «antes» o «despues») va delante de cada archivo. SIN_BUILD=1 usa el `.next` que ya hay (respaldo en el puerto 8897). Escribe
// `medidas-<prefijo>.json` con lo medido. Correrlo en un árbol SIN `.env`.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [RAIZ, SALIDA] = process.argv.slice(2, 4).map((p) => path.resolve(p));
const PREFIJO = process.argv[4] ?? "captura";
if (fs.existsSync(path.join(RAIZ, ".env"))) {
  console.error("hay un .env en el árbol: la app cargaría llaves reales. Córrelo en un árbol sin .env");
  process.exit(1);
}
const { chromium } = await import(path.join(RAIZ, "node_modules/playwright-core/index.mjs"));
const { ADMIN, cookieDe, L_LEONORA } = await import(path.join(RAIZ, "scripts/ops/auditoria-ui/respaldo-local/fixture.mjs"));
const NEXT = path.join(RAIZ, "node_modules/next/dist/bin/next");
const AQUI = path.join(RAIZ, "scripts/ops/auditoria-ui");
const AHORA = "2026-10-07T16:00:00Z"; // miércoles 7 de octubre, 10:00 en San Luis Potosí (el reloj de la semana de Instagram del respaldo)
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
const CREDITO = "Pablo Pérez · CC BY-SA 4.0 (https://commons.wikimedia.org/wiki/File:Museo_Leonora_demo.jpg)";
fs.mkdirSync(SALIDA, { recursive: true });

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ol504-"));
const hijos = [];
process.on("exit", () => {
  hijos.forEach((h) => h.exitCode === null && h.kill());
  fs.rmSync(tmp, { recursive: true, force: true });
});
// Un arranque propio (el fixture no cambia): el museo Leonora Carrington, el lugar de «hoy» en la semana, con crédito de su portada.
const arranque = path.join(tmp, "respaldo.mjs");
fs.writeFileSync(
  arranque,
  `import { tablas } from ${JSON.stringify(pathToFileURL(path.join(AQUI, "respaldo-local/fixture.mjs")).href)};
const museo = tablas.lugares.find((l) => l.id === ${JSON.stringify(L_LEONORA)});
museo.portada_credito = ${JSON.stringify(CREDITO)};
await import(${JSON.stringify(pathToFileURL(path.join(AQUI, "respaldo-local/server.mjs")).href)});
`,
);
const lanzar = (args, env) => {
  const h = spawn(process.execPath, args, { cwd: RAIZ, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  let salida = "";
  h.stdout.on("data", (d) => (salida += d));
  h.stderr.on("data", (d) => (salida += d));
  h.registro = () => salida.slice(-4000);
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

const carpetaFotos = fs.mkdtempSync(path.join(tmp, "fotos-"));
await (await import(path.join(AQUI, "respaldo-local/fotos-historial.mjs"))).dibujarFotosHistorial(carpetaFotos);
await (await import(path.join(AQUI, "respaldo-local/fotos-instagram.mjs"))).dibujarFotosInstagram(carpetaFotos);

const [pr, pa] = [8897, await puertoLibre()];
const respaldo = `http://127.0.0.1:${pr}`;
const base = `http://127.0.0.1:${pa}`;
const reloj = { RELOJ_FIJO: AHORA, TZ: "America/Mexico_City", NODE_OPTIONS: `--require=${path.join(AQUI, "reloj-fijo.cjs")}` };
const datos = { RESPALDO_HISTORIAL: "1", RESPALDO_INSTAGRAM_SEMANA: "1", RESPALDO_CARRUSEL_DIR: carpetaFotos, RESPALDO_URL: respaldo };
const app = { NEXT_PUBLIC_SUPABASE_URL: respaldo, NEXT_PUBLIC_SUPABASE_ANON_KEY: "llave-anon-inventada", NEXT_PUBLIC_MAPBOX_TOKEN: "pk.inventado", SUPABASE_SERVICE_ROLE_KEY: "llave-servicio-inventada" };
const r = lanzar([arranque, String(pr)], { ...reloj, ...datos });
await esperar(`${respaldo}/rest/v1/eventos?select=id&limit=1`, r);
if (!process.env.SIN_BUILD) {
  process.stdout.write("compilando… ");
  const b = spawnSync(process.execPath, [NEXT, "build"], { cwd: RAIZ, env: { ...process.env, ...app }, encoding: "utf8", maxBuffer: 1 << 26 });
  if (b.status !== 0) throw new Error((b.stdout + b.stderr).slice(-4000));
  console.log("listo");
}
const s = lanzar([NEXT, "start", "-p", String(pa)], { ...app, ...reloj });
await esperar(`${base}/entrar`, s);

const IMAGEN = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#b9b4a8"/></svg>';
const errores = [];
const fallas = [];
const comprobar = (ok, que) => {
  console.log(`     ${ok ? "ok" : "FALLA"} · ${que}`);
  if (!ok) fallas.push(que);
};
const medidas = {};
async function contexto(browser, { ancho, alto = 844, movil = true }) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 2, ...(movil ? { isMobile: true, hasTouch: true, userAgent: UA } : {}), locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.clock.setFixedTime(new Date(AHORA));
  await ctx.addCookies([{ name: "sb-127-auth-token", value: cookieDe(ADMIN), url: base }]);
  await ctx.route("**/_vercel/**", (q) => q.fulfill({ contentType: "text/javascript", body: "" }));
  await ctx.route((u) => u.hostname !== "127.0.0.1", (q) => (q.request().resourceType() === "image" ? q.fulfill({ contentType: "image/svg+xml", body: IMAGEN }) : q.fulfill({ status: 204, body: "" })));
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(String(e.message).slice(0, 300)));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errores.push(`consola: ${m.text().slice(0, 300)}`));
  return { ctx, page };
}
const foto = async (page, nombre) => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(SALIDA, `${PREFIJO}-${nombre}.png`) });
  console.log("  ", `${PREFIJO}-${nombre}`);
};
async function tocar(page, loc) {
  await loc.first().evaluate((e) => e.scrollIntoView({ block: "center" }));
  const b = await loc.first().boundingBox();
  const x = b.x + b.width / 2;
  const y = b.y + b.height / 2;
  const debajo = await page.evaluate(([px, py]) => { const e = document.elementFromPoint(px, py); return (e?.closest("a,button") ?? e)?.textContent?.replace(/\s+/g, " ").trim().slice(0, 60) ?? null; }, [x, y]);
  const esperado = (await loc.first().textContent()).replace(/\s+/g, " ").trim().slice(0, 60);
  comprobar(debajo === esperado, `bajo el dedo está «${esperado.slice(0, 40)}»`);
  await page.mouse.click(x, y);
}

/** Lo que se sale a lo ancho: el desplazamiento de la página y los elementos cuya caja pasa del borde derecho (con su clase y su transform). */
const desbordes = (page) =>
  page.evaluate(() => {
    const ancho = document.documentElement.clientWidth;
    const fuera = [];
    for (const el of document.body.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (r.right > ancho + 0.5) fuera.push({ que: `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 80)}`, izquierda: Math.round(r.left), derecha: Math.round(r.right), transform: getComputedStyle(el).transform });
    }
    // Solo los más de fuera (el primero de cada rama): sus hijos se salen con él.
    const raices = fuera.filter((f, i) => i === 0 || !fuera.slice(0, i).some((g) => g.izquierda <= f.izquierda && g.derecha >= f.derecha && g.transform !== "none"));
    return { ancho, scrollWidth: document.documentElement.scrollWidth, desplaza: document.documentElement.scrollWidth > ancho, fuera: raices.slice(0, 8), total: fuera.length };
  });
/** Las cajas de los bloques de la ficha (el envoltorio de la entrada, el armazón y sus hijos directos) para comparar antes y después. */
const cajas = (page) =>
  page.evaluate(() => {
    const ficha = document.querySelector("[class*=EntradaFicha], [class*=ficha]")?.closest("div");
    const main = document.querySelector("main");
    const de = (el) => { const r = el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top + scrollY), Math.round(r.width), Math.round(r.height)].join(","); };
    return {
      main: main ? de(main) : null,
      hijosDeMain: main ? [...main.children].map((c) => `${c.tagName.toLowerCase()} ${de(c)}`) : [],
      alto: document.documentElement.scrollHeight,
      ficha: ficha ? String(ficha.className) : null,
    };
  });

const URL_FICHA = `${base}/lugares/teatro-de-la-paz`;
let browserMovil;
let browserEscritorio;
try {
  browserMovil = await chromium.launch({ channel: "chrome", headless: true, args: ["--hide-scrollbars"] });
  // 1 · La hoja del día de hoy (un lugar con crédito): el texto de la vista previa.
  {
    const { ctx, page } = await contexto(browserMovil, { ancho: 390 });
    await page.goto(`${base}/admin/instagram?ciudad=san-luis-potosi`, { waitUntil: "load" });
    const hoy = page.locator("main li", { hasText: "Hoy · 7:00 pm" }).first().locator("a").first();
    await hoy.waitFor({ timeout: 30000 });
    await tocar(page, hoy);
    const hoja = page.getByRole("dialog").last();
    await hoja.waitFor();
    await page.waitForFunction(() => !document.querySelector('[role=dialog] [aria-label="Preparando la vista previa"]'), null, { timeout: 30000 });
    comprobar(/museo-leonora-carrington/.test(await hoja.locator('[name="texto"]').first().inputValue()), "el día de hoy es el museo Leonora Carrington");
    const renglon = hoja.getByRole("button", { name: "Texto de la publicación" });
    await renglon.evaluate((e) => e.scrollIntoView({ block: "center" }));
    const valor = await hoja.locator('[name="texto"]').first().inputValue();
    medidas.hojaDia = { texto: valor };
    console.log("     texto:\n" + valor.replace(/^/gm, "       "));
    await foto(page, "01-hoja-dia-renglon-texto-390");
    await tocar(page, renglon);
    await page.locator("#campo-texto-dia").waitFor();
    await page.waitForTimeout(400);
    await foto(page, "02-hoja-dia-texto-abierto-390");
    comprobar(/^Foto: Pablo Pérez · CC BY-SA 4\.0 /m.test(await page.locator("#campo-texto-dia").inputValue()), "el texto de la vista previa dice el crédito (lo que se publica)");
    await ctx.close();
  }
  await browserMovil.close();
  // 2 · La ficha de lugar a 390, 768, 1048 y 1280: lo que se sale a lo ancho, en cuanto llega (antes de la entrada) y ya quieta.
  browserEscritorio = await chromium.launch({ channel: "chrome", headless: true });
  for (const ancho of [390, 768, 1048, 1280]) {
    const { ctx, page } = await contexto(browserEscritorio, { ancho, alto: ancho >= 1048 ? 800 : 844, movil: ancho < 768 });
    await page.goto(URL_FICHA, { waitUntil: "load" });
    await page.locator("main h1").first().waitFor({ timeout: 30000 });
    await page.waitForTimeout(1500);
    const d = await desbordes(page);
    const c = await cajas(page);
    // Lo pegado y lo fijo (la barra de la ficha, la de la app) con la página a media altura: el recorte no los mueve.
    await page.evaluate(() => scrollTo(0, 600));
    await page.waitForTimeout(400);
    const pegados = await page.evaluate(() =>
      [...document.querySelectorAll("body *")]
        .filter((e) => ["sticky", "fixed"].includes(getComputedStyle(e).position) && e.getBoundingClientRect().height > 0)
        .map((e) => { const r = e.getBoundingClientRect(); return `${getComputedStyle(e).position} ${e.tagName.toLowerCase()}.${String(e.className).split(" ")[0].slice(0, 30)} ${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)},${Math.round(r.height)}`; }),
    );
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(300);
    medidas[`ficha-${ancho}`] = { desbordes: d, cajas: c, pegados };
    console.log(`     ${ancho}: scrollWidth ${d.scrollWidth} de ${d.ancho}; ${d.total} elementos fuera${d.fuera.length ? ": " + d.fuera.map((f) => `${f.que} (${f.izquierda}→${f.derecha}, ${f.transform})`).join(" · ") : ""}`);
    comprobar(!d.desplaza, `a ${ancho} la ficha de lugar no se desplaza a lo ancho`);
    if (ancho === 1280 || ancho === 390) await foto(page, `0${ancho === 1280 ? 3 : 4}-ficha-lugar-${ancho}`);
    if (ancho === 1280) {
      const ancestros = await page.evaluate(() => {
        const f = [...document.querySelectorAll("div")].find((d) => /(^|\s|_)ficha(\s|$)/.test(d.className) && /quieta|abierta|cerrada/.test(d.className));
        const linea = [];
        for (let e = f; e && e !== document.documentElement; e = e.parentElement) linea.push(`${e.tagName.toLowerCase()}.${String(e.className).slice(0, 60)} overflow-x:${getComputedStyle(e).overflowX}`);
        return linea;
      });
      medidas.ancestros = ancestros;
      console.log("     la ficha y sus ancestros:\n       " + ancestros.join("\n       "));
    }
    if (ancho === 1280) {
      // Lo de abajo a 1280 (la barra horizontal, si la hay, queda al pie de la ventana).
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      await foto(page, "05-ficha-lugar-1280-abajo");
    }
    await ctx.close();
  }
  // 3 · La entrada de la ficha (al llegar desde un listado o al abrirla): `ui/EntradaFicha` arranca «cerrada» (translateX(100%), fuera de la vista,
  // a la derecha) y se desliza 220 ms. Con las animaciones a 1/50 de su velocidad (CDP), la entrada dura 11 s y se puede mirar: cuánto mide la
  // página a lo ancho mientras entra y si aparece la barra de desplazamiento horizontal. Además, desde el primer momento, el mayor `scrollWidth`
  // que ve la página (un muestreo en cada cuadro desde antes de que exista la ficha).
  for (const ancho of [390, 768, 1048, 1280]) {
    const { ctx, page } = await contexto(browserEscritorio, { ancho, alto: ancho >= 1048 ? 800 : 844, movil: false });
    await page.addInitScript(() => {
      window.__mayor = { ancho: 0, estado: null };
      const mirar = () => {
        const w = document.documentElement?.scrollWidth ?? 0;
        if (w > window.__mayor.ancho) {
          const f = [...document.querySelectorAll("div")].find((d) => /quieta|abierta|cerrada/.test(d.className));
          window.__mayor = { ancho: w, estado: f ? String(f.className) : null };
        }
        requestAnimationFrame(mirar);
      };
      requestAnimationFrame(mirar);
    });
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Animation.enable");
    await cdp.send("Animation.setPlaybackRate", { playbackRate: 0.02 });
    await page.goto(URL_FICHA, { waitUntil: "load" });
    await page.locator("main h1").first().waitFor({ timeout: 30000 });
    await page.waitForTimeout(2500);
    const d = await desbordes(page);
    medidas[`entrada-${ancho}`] = d;
    console.log(`     entrando a ${ancho}: scrollWidth ${d.scrollWidth} de ${d.ancho}${d.fuera.length ? ": " + d.fuera.slice(0, 1).map((f) => `${f.que} (${f.izquierda}→${f.derecha}, ${f.transform})`).join(" · ") : ""}`);
    if (ancho === 1280) await foto(page, "06-ficha-lugar-1280-entrando");
    // ¿Se puede desplazar la página de lado? (la rueda o el trackpad a la derecha: `scrollBy` hace lo mismo).
    const deLado = await page.evaluate(() => { scrollBy(500, 0); return scrollX; });
    // El navegador sin cabeza no pinta la barra de desplazamiento horizontal: la captura enseña la página ya corrida de lado (si se pudo).
    if (ancho === 1280) await foto(page, "07-ficha-lugar-1280-entrando-corrida-de-lado");
    await page.evaluate(() => scrollTo(0, scrollY));
    medidas[`entrada-${ancho}`].deLado = deLado;
    console.log(`     entrando a ${ancho}: la página se corre ${deLado} px de lado`);
    comprobar(deLado === 0, `a ${ancho} la página no se corre de lado mientras la ficha entra`);
    await page.waitForTimeout(12000);
    const mayor = await page.evaluate(() => window.__mayor);
    medidas[`mayorAncho-${ancho}`] = mayor;
    console.log(`     el mayor scrollWidth visto a ${ancho}: ${mayor.ancho} (${mayor.estado})`);
    comprobar(mayor.ancho <= ancho, `a ${ancho} la página nunca se desplaza a lo ancho mientras la ficha entra`);
    await ctx.close();
  }
} finally {
  await browserMovil?.close().catch(() => {});
  await browserEscritorio?.close().catch(() => {});
}
fs.writeFileSync(path.join(SALIDA, `medidas-${PREFIJO}.json`), JSON.stringify(medidas, null, 2));
if (errores.length) console.log("errores de página:\n  " + [...new Set(errores)].join("\n  "));
console.log(fallas.length ? `\n${fallas.length} FALLAS:\n  ${fallas.join("\n  ")}` : "\ntodo bien");
process.exit(0);
