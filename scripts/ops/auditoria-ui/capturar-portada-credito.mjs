// Capturas de la bitácora 523 (OL-491): el crédito de la portada de lugares y artistas. La ficha pública con la línea «Foto: …» debajo de la portada
// (a 320, 390, 430 y 1280; con dirección el nombre enlaza y abre el aviso de salida), la ficha dentro de la hoja de Lugares y la edición de lugar y
// de artista con el campo «Crédito de la foto» (con su ✕ y su ayuda), guardando con toques reales: el respaldo anota lo que llega y se comprueba
// que el cambio lleva `portada_credito`. La app compilada contra el respaldo local y la sesión de la cuenta de administración del respaldo. Chrome
// real (playwright-core, channel: 'chrome'), a 2×. Toques reales (clics de Playwright en coordenadas de la página).
// node scripts/ops/auditoria-ui/capturar-portada-credito.mjs <raíz del árbol> <carpeta de salida>
// Compila `.next` contra el respaldo (SIN_BUILD=1 usa el `.next` que ya hay, compilado por este script: el respaldo va en el puerto 8878). Correrlo
// en un árbol SIN `.env` (con él se niega a correr).
// Desde un arranque propio en una carpeta temporal (el fixture no cambia): el Teatro de la Paz con un crédito con dirección, el Museo del
// Ferrocarril con uno largo sin dirección y Feleal con portada y crédito. Todo inventado; las imágenes se contestan en el navegador.
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
const AHORA = "2026-10-28T16:00:00Z"; // miércoles 28 de octubre, 10:00 en San Luis Potosí
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
fs.mkdirSync(SALIDA, { recursive: true });

const CREDITO_PAZ = "Pablo Pérez · CC BY-SA 4.0 (https://commons.wikimedia.org/wiki/File:Teatro_de_la_Paz_demo.jpg)";
const CREDITO_FERRO = "Archivo fotográfico de la Asociación de Amigos del Ferrocarril de San Luis Potosí · CC BY 4.0";
const CREDITO_FELEAL = "Ana López · CC BY-SA 4.0";

const puertoLibre = () => new Promise((ok) => { const s = net.createServer().listen(0, () => { const p = s.address().port; s.close(() => ok(p)); }); });
const [pr, pa] = [Number(process.env.PUERTO_RESPALDO ?? 8878), await puertoLibre()];

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "credito-respaldo-"));
const arranque = path.join(tmp, "respaldo.mjs");
const fixture = pathToFileURL(path.join(AQUI, "respaldo-local/fixture.mjs")).href;
const servidor = pathToFileURL(path.join(AQUI, "respaldo-local/server.mjs")).href;
fs.writeFileSync(
  arranque,
  `import { tablas } from ${JSON.stringify(fixture)};
const lugar = (slug) => tablas.lugares.find((l) => l.slug === slug);
lugar("teatro-de-la-paz").portada_credito = ${JSON.stringify(CREDITO_PAZ)};
lugar("museo-del-ferrocarril-jesus-garcia-corona").portada_credito = ${JSON.stringify(CREDITO_FERRO)};
const feleal = tablas.artistas.find((a) => a.slug === "feleal");
feleal.portada = "https://viesoxgrfvftkgpjbnml.supabase.co/storage/v1/object/public/fotos/artistas/demo/feleal-portada.jpg";
feleal.portada_credito = ${JSON.stringify(CREDITO_FELEAL)};
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

// Una foto apaisada inventada, con algo de forma para que se vea dónde acaba la portada.
const IMAGEN = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#8a6f5a"/><rect y="520" width="1200" height="280" fill="#5b4636"/><circle cx="860" cy="260" r="120" fill="#e9c98f"/><rect x="180" y="300" width="420" height="260" fill="#c9b49a"/><rect x="250" y="360" width="80" height="200" fill="#5b4636"/><rect x="450" y="360" width="80" height="200" fill="#5b4636"/></svg>';
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--hide-scrollbars"] });
const errores = [];
const contexto = async (ancho, alto, movil = true) => {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 2, ...(movil ? { isMobile: true, hasTouch: true, userAgent: UA } : {}), locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.clock.setFixedTime(new Date(AHORA));
  await ctx.addCookies([{ name: "sb-127-auth-token", value: cookieDe(ADMIN), url: base }]);
  await ctx.route("**/_vercel/**", (q) => q.fulfill({ contentType: "text/javascript", body: "" }));
  await ctx.route((u) => u.hostname !== "127.0.0.1", (q) => (q.request().resourceType() === "image" ? q.fulfill({ contentType: "image/svg+xml", body: IMAGEN }) : q.abort()));
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(String(e.message).slice(0, 200)));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errores.push(`consola: ${m.text().slice(0, 200)}`));
  return { ctx, page };
};

const foto = async (page, nombre) => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(SALIDA, `${nombre}.png`) });
  console.log("  ", nombre);
};
/** Dónde queda la línea del crédito respecto a la portada y si algo se sale a lo ancho. */
const medirCredito = (page) =>
  page.evaluate(() => {
    const c = document.querySelector("[class*='credito']:not([class*='creditoEnlace'])");
    const f = document.querySelector("[data-portada]");
    const t = c?.previousElementSibling;
    if (!c || !f) return { hay: !!c };
    const rc = c.getBoundingClientRect(), rf = f.getBoundingClientRect();
    const a = c.querySelector("a")?.getBoundingClientRect();
    return {
      hay: true,
      texto: c.textContent,
      debajoDeLaFoto: rc.top >= rf.bottom - 0.5 || rc.left >= rf.right - 0.5, // a una columna, debajo; desde 1048, en la columna de la derecha
      sobreLaFoto: !(rc.bottom <= rf.top || rc.top >= rf.bottom || rc.right <= rf.left || rc.left >= rf.right),
      alto: Math.round(rc.height),
      altoEnlace: a ? Math.round(a.height) : null,
      letra: getComputedStyle(c).fontSize,
      color: getComputedStyle(c).color,
      anterior: t?.className?.toString().slice(0, 40),
      desborde: document.documentElement.scrollWidth - innerWidth,
    };
  });

try {
  // 01-03 · La ficha del Teatro de la Paz a 390, 320 y 430: «Foto: Pablo Pérez · CC BY-SA 4.0» debajo de la portada, el nombre enlazado.
  for (const [ancho, alto, n] of [[390, 844, "01"], [320, 568, "02"], [430, 932, "03"]]) {
    const { ctx, page } = await contexto(ancho, alto);
    await page.goto(`${base}/lugares/teatro-de-la-paz`, { waitUntil: "load" });
    await page.locator("[class*='credito']").first().waitFor();
    console.log(`     ${ancho}:`, JSON.stringify(await medirCredito(page)));
    await foto(page, `${n}-lugar-credito-${ancho}`);
    if (ancho === 390) {
      // 04 · Tocar el nombre: el aviso de salida dice a qué sitio se va (EnlaceExterno), como cualquier enlace a un tercero.
      const caja = await page.locator("[class*='credito'] a").boundingBox();
      await page.mouse.click(caja.x + caja.width / 2, caja.y + caja.height / 2);
      const aviso = page.getByRole("dialog");
      await aviso.waitFor();
      console.log("     aviso:", (await aviso.innerText()).replace(/\s+/g, " ").slice(0, 200));
      await foto(page, "04-lugar-credito-aviso-salida-390");
    }
    await ctx.close();
  }

  // 05 · Un crédito largo y sin dirección (Museo del Ferrocarril) a 320: va a dos líneas, sin enlace y sin romper la cabecera.
  {
    const { ctx, page } = await contexto(320, 568);
    await page.goto(`${base}/lugares/museo-del-ferrocarril-jesus-garcia-corona`, { waitUntil: "load" });
    await page.locator("[class*='credito']").first().waitFor();
    console.log("     largo 320:", JSON.stringify(await medirCredito(page)));
    await foto(page, "05-lugar-credito-largo-320");
    await ctx.close();
  }

  // 06-07 · La ficha de Feleal (con portada y avatar) a 390 y 320.
  for (const [ancho, alto, n] of [[390, 844, "06"], [320, 568, "07"]]) {
    const { ctx, page } = await contexto(ancho, alto);
    await page.goto(`${base}/artistas/feleal`, { waitUntil: "load" });
    await page.locator("[class*='credito']").first().waitFor();
    console.log(`     artista ${ancho}:`, JSON.stringify(await medirCredito(page)));
    await foto(page, `${n}-artista-credito-${ancho}`);
    await ctx.close();
  }

  // 08 · La ficha dentro de la hoja de Lugares: el crédito llega con el cuerpo de la ficha.
  {
    const { ctx, page } = await contexto(390, 844);
    await page.goto(`${base}/lugares?lugar=teatro-de-la-paz`, { waitUntil: "load" });
    await page.locator("[data-ficha-hoja] p[class*='credito']").waitFor({ timeout: 15000 });
    console.log("     hoja:", (await page.locator("[data-ficha-hoja] p[class*='credito']").innerText()).trim());
    await foto(page, "08-hoja-lugar-credito-390");
    await ctx.close();
  }

  // 09 · Escritorio (1280): la línea va en la columna de la derecha, bajo el título, nunca sobre la foto.
  {
    const { ctx, page } = await contexto(1280, 800, false);
    await page.goto(`${base}/lugares/teatro-de-la-paz`, { waitUntil: "load" });
    await page.locator("[class*='credito']").first().waitFor();
    console.log("     1280:", JSON.stringify(await medirCredito(page)));
    await foto(page, "09-lugar-credito-1280");
    await ctx.close();
  }

  // 10-12 · Editar el lugar (la administración): el campo «Crédito de la foto» bajo la portada, con su ✕ y su ayuda. Se toca la ✕, se escribe otro
  // crédito y se toca «Guardar cambios»: el cambio que llega al respaldo lleva `portada_credito`.
  for (const [ancho, alto, n] of [[390, 844, "10"], [320, 568, "11"]]) {
    const { ctx, page } = await contexto(ancho, alto);
    await page.goto(`${base}/lugares/teatro-de-la-paz/editar`, { waitUntil: "load" });
    const campo = page.locator("input[name='portada_credito']");
    await campo.waitFor();
    await campo.evaluate((el) => el.closest("div")?.scrollIntoView({ block: "center" }));
    console.log(`     editar lugar ${ancho}: valor «${await campo.inputValue()}»`);
    await foto(page, `${n}-editar-lugar-credito-${ancho}`);
    if (ancho === 390) {
      const x = await page.locator("input[name='portada_credito'] + button").boundingBox();
      console.log("     ✕:", JSON.stringify({ ancho: Math.round(x.width), alto: Math.round(x.height) }));
      await page.mouse.click(x.x + x.width / 2, x.y + x.height / 2);
      console.log(`     tras la ✕: «${await campo.inputValue()}»`);
      await page.keyboard.type("Luis Martínez · CC BY 4.0 (https://commons.wikimedia.org/wiki/File:Paz_demo.jpg)");
      await campo.evaluate((el) => el.closest("div")?.scrollIntoView({ block: "center" }));
      await foto(page, "12-editar-lugar-credito-escrito-390");
      const guardar = await page.getByRole("button", { name: "Guardar cambios" }).boundingBox();
      await page.mouse.click(guardar.x + guardar.width / 2, guardar.y + guardar.height / 2);
      await page.waitForURL((u) => !u.pathname.endsWith("/editar"), { timeout: 20000 }).catch(() => {});
      const registro = await (await fetch(`${respaldo}/__registro`)).json();
      const i = registro.findLastIndex((l) => l.startsWith("PATCH /rest/v1/lugares"));
      console.log("     guardó:", i >= 0 ? registro[i + 1]?.match(/"portada_credito":("[^"]*"|null)/)?.[0] ?? "sin portada_credito" : "no hubo PATCH");
    }
    await ctx.close();
  }

  // 13-14 · Editar el artista: el campo en el renglón de la Portada, solo porque la hay.
  for (const [ancho, alto, n] of [[390, 844, "13"], [320, 568, "14"]]) {
    const { ctx, page } = await contexto(ancho, alto);
    await page.goto(`${base}/artistas/feleal/editar`, { waitUntil: "load" });
    const campo = page.locator("input[name='portada_credito']");
    await campo.waitFor();
    await campo.evaluate((el) => el.closest("li")?.scrollIntoView({ block: "center" }));
    console.log(`     editar artista ${ancho}: valor «${await campo.inputValue()}»`, JSON.stringify(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)));
    await foto(page, `${n}-editar-artista-credito-${ancho}`);
    if (ancho === 390) {
      // Quitar la portada (toque real en «Quitar la portada»): el campo se va con ella.
      const quitar = await page.getByRole("button", { name: "Quitar la portada" }).boundingBox();
      await page.mouse.click(quitar.x + quitar.width / 2, quitar.y + quitar.height / 2);
      console.log("     sin portada, campos de crédito:", await page.locator("input[name='portada_credito']").count());
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log(errores.length ? `errores de página o consola:\n  ${[...new Set(errores)].slice(0, 10).join("\n  ")}` : "sin errores de página ni de consola");
// El respaldo y la app siguen vivos (son hijos): sin salir a mano el proceso no termina; `exit` los cierra.
process.exit(0);
