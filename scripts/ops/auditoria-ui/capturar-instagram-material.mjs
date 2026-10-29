// Capturas de la bitácora 520 (OL-488): la semana de Instagram solo publica con material, señala lo que falta y deja publicar hoy. La app
// compilada contra el respaldo local (`RESPALDO_HISTORIAL=1 RESPALDO_INSTAGRAM_SEMANA=1 RESPALDO_IG_MATERIAL=1`: a Íñigo Montalvo le falta la
// portada y lo lleva Marcos; el museo Leonora Carrington no tiene portada y las demás son de otra página), el reloj fijo el JUEVES 8 de octubre a
// las 10:30 de San Luis Potosí (el miércoles ya pasó sin armarse y «Esta semana», a las 9:00, también), la sesión de la administración (y la de
// Marcos para ver su aviso) y el trabajador de verdad (`/api/redes/correr`) con la API de Instagram y Facebook DE MENTIRA. Chrome real
// (playwright-core), 390×844 a 2× (y 320), toques por coordenadas con lo que hay bajo el dedo (`elementFromPoint`).
//   node scripts/ops/auditoria-ui/capturar-instagram-material.mjs <raíz del árbol> <carpeta de salida>
// SIN_BUILD=1 usa el `.next` que ya hay. Correrlo en un árbol SIN `.env`.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const [RAIZ, SALIDA] = process.argv.slice(2).map((p) => path.resolve(p));
if (fs.existsSync(path.join(RAIZ, ".env"))) {
  console.error("hay un .env en el árbol: la app cargaría llaves reales. Córrelo en un árbol sin .env");
  process.exit(1);
}
const { chromium } = await import(path.join(RAIZ, "node_modules/playwright-core/index.mjs"));
const { ADMIN, MARCOS, cookieDe } = await import(path.join(RAIZ, "scripts/ops/auditoria-ui/respaldo-local/fixture.mjs"));
const NEXT = path.join(RAIZ, "node_modules/next/dist/bin/next");
const AQUI = path.join(RAIZ, "scripts/ops/auditoria-ui");
const AHORA = "2026-10-08T16:30:00Z"; // jueves 8 de octubre, 10:30 en San Luis Potosí
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
const SECRETO = "secreto-inventado-488";
fs.mkdirSync(SALIDA, { recursive: true });

const hijos = [];
process.on("exit", () => hijos.forEach((h) => h.exitCode === null && h.kill()));
const lanzar = (args, env) => {
  const h = spawn(process.execPath, args, { cwd: RAIZ, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  let salida = "";
  h.stdout.on("data", (d) => (salida += d));
  h.stderr.on("data", (d) => (salida += d));
  h.registro = () => salida.slice(-6000);
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

const carpetaFotos = fs.mkdtempSync(path.join(os.tmpdir(), "ol488-fotos-"));
await (await import("./respaldo-local/fotos-historial.mjs")).dibujarFotosHistorial(carpetaFotos);
await (await import("./respaldo-local/fotos-instagram.mjs")).dibujarFotosInstagram(carpetaFotos);
// La portada que «sube» la administración para el museo: un JPEG de verdad (la sala con sus cuadros), que el teléfono prepara y sube al respaldo.
const sharp = (await import("node:module")).createRequire(path.join(RAIZ, "node_modules/"))("sharp");
const PORTADA_MUSEO = path.join(carpetaFotos, "subida-museo.jpg");
await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1000"><rect width="1500" height="1000" fill="#2d3a4a"/><rect y="760" width="1500" height="240" fill="#8a6a4a"/><rect x="180" y="220" width="360" height="440" fill="#f2c14e"/><rect x="210" y="250" width="300" height="380" fill="#c0392b"/><rect x="640" y="180" width="300" height="300" fill="#ecf0f1"/><circle cx="790" cy="330" r="110" fill="#16a085"/><rect x="1060" y="260" width="280" height="380" fill="#f2c14e"/><path d="M1090 600 L1200 300 L1310 600 Z" fill="#2c3e50"/></svg>')).jpeg({ quality: 85 }).toFile(PORTADA_MUSEO);

const [pr, pa] = [await puertoLibre(), await puertoLibre()];
const respaldo = `http://127.0.0.1:${pr}`;
const base = `http://127.0.0.1:${pa}`;
const reloj = { RELOJ_FIJO: AHORA, TZ: "America/Mexico_City", NODE_OPTIONS: `--require=${path.join(AQUI, "reloj-fijo.cjs")}` };
const datos = { RESPALDO_HISTORIAL: "1", RESPALDO_INSTAGRAM_SEMANA: "1", RESPALDO_IG_MATERIAL: "1", RESPALDO_CARRUSEL_DIR: carpetaFotos, RESPALDO_URL: respaldo };
const app = { NEXT_PUBLIC_SUPABASE_URL: respaldo, NEXT_PUBLIC_SUPABASE_ANON_KEY: "llave-anon-inventada", NEXT_PUBLIC_MAPBOX_TOKEN: "pk.inventado", SUPABASE_SERVICE_ROLE_KEY: "llave-servicio-inventada" };
const instagram = { INSTAGRAM_API_URL: `${respaldo}/graph`, INSTAGRAM_TOKEN: "token-inventado", INSTAGRAM_USER_ID: "17841400000000458", FACEBOOK_PAGE_ID: "1374800000000461", CRON_SECRET: SECRETO };
const r = lanzar([path.join(AQUI, "respaldo-local/server.mjs"), String(pr)], { ...reloj, ...datos });
await esperar(`${respaldo}/rest/v1/eventos?select=id&limit=1`, r);
if (!process.env.SIN_BUILD) {
  process.stdout.write("compilando… ");
  const b = spawnSync(process.execPath, [NEXT, "build"], { cwd: RAIZ, env: { ...process.env, ...app }, encoding: "utf8", maxBuffer: 1 << 26 });
  if (b.status !== 0) throw new Error((b.stdout + b.stderr).slice(-4000));
  console.log("listo");
}
const s = lanzar([NEXT, "start", "-p", String(pa)], { ...app, ...reloj, ...instagram });
await esperar(`${base}/entrar`, s);

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--hide-scrollbars"] });
const errores = [];
const fallas = [];
const recorrido = [];
const comprobar = (ok, que) => {
  console.log(`     ${ok ? "ok" : "FALLA"} · ${que}`);
  recorrido.push(`${ok ? "ok" : "FALLA"} · ${que}`);
  if (!ok) fallas.push(que);
};
async function contexto(quien = ADMIN, ancho = 390) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.clock.setFixedTime(new Date(AHORA));
  await ctx.addCookies([{ name: "sb-127-auth-token", value: cookieDe(quien), url: base }]);
  await ctx.route("**/_vercel/**", (q) => q.fulfill({ contentType: "text/javascript", body: "" }));
  const IMAGEN = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#b9b4a8"/></svg>';
  await ctx.route((u) => u.hostname !== "127.0.0.1", (q) => (q.request().resourceType() === "image" ? q.fulfill({ contentType: "image/svg+xml", body: IMAGEN }) : q.fulfill({ status: 204, body: "" })));
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(String(e.message).slice(0, 300)));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource: the server responded with a status of 404/.test(m.text()) && errores.push(`consola: ${m.text().slice(0, 300)}`));
  return { ctx, page };
}
const quieto = async (page, ms = 700) => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
};
const foto = async (page, nombre) => {
  await quieto(page);
  await page
    .waitForFunction(() => [...document.querySelectorAll("main img, [role=dialog] img")].filter((i) => i.loading !== "lazy" || i.getBoundingClientRect().top < innerHeight).every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 45000 })
    .catch(() => comprobar(false, `${nombre}: las imágenes cargaron`));
  await page.screenshot({ path: path.join(SALIDA, `${nombre}.png`) });
  console.log("  ", nombre);
};
async function tocar(page, loc, que) {
  await loc.first().evaluate((e) => e.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(150);
  const b = await loc.first().boundingBox();
  const x = b.x + b.width / 2;
  const y = b.y + b.height / 2;
  // Toque real: lo que está bajo el dedo tiene que ser el control (nada encima que se lo coma).
  const debajo = await page.evaluate(([px, py]) => { const e = document.elementFromPoint(px, py); return e ? (e.closest("a,button,label,[role=tab]")?.textContent ?? e.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 70) : null; }, [x, y]);
  await page.mouse.click(x, y);
  recorrido.push(`${que} → bajo el dedo: «${debajo}»`);
}
const texto = async (l) => (await l.first().innerText()).replace(/\s+/g, " ").trim();
const fila = (page, t) => page.locator("main li", { hasText: t }).first();
const filaFalta = (page) => page.locator("main li", { has: page.locator("b", { hasText: /^Falta material$/ }) }).first();
const hojaAbierta = (page) => page.getByRole("dialog").last();
const leer = async (tabla, q) => {
  const filas = await (await fetch(`${respaldo}/rest/v1/${tabla}?${q}`, { headers: { apikey: "llave-servicio-inventada" } })).json();
  return Array.isArray(filas) ? filas : [];
};
const sinCortes = async (page, que) => {
  const datos = await page.evaluate(() => {
    const fuera = [];
    for (const el of document.body.querySelectorAll("*")) {
      if (["SCRIPT", "STYLE", "TEXTAREA"].includes(el.tagName) || el.closest("svg")) continue;
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || getComputedStyle(el).visibility === "hidden" || el.closest("[inert]")) continue;
      if (getComputedStyle(el).webkitLineClamp !== "none") continue;
      if (el.scrollWidth > el.clientWidth + 1) fuera.push(`${el.tagName.toLowerCase()} «${el.textContent.trim().slice(0, 50)}»`);
    }
    const chicos = [];
    for (const el of document.querySelectorAll("main li > a, [role=dialog] button, [role=dialog] label, [role=dialog] li > a")) {
      const r = el.getBoundingClientRect();
      if (!r.width || el.closest("[inert]")) continue;
      const enFrase = el.parentElement?.tagName === "P" && el.parentElement.textContent.trim() !== el.textContent.trim();
      if (!enFrase && (r.height < 43.5 || r.width < 43.5)) chicos.push(`${el.textContent.trim().slice(0, 30) || el.getAttribute("aria-label")} ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
    return { fuera, chicos, ancho: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  comprobar(!datos.fuera.length && !datos.chicos.length && datos.ancho <= 0, `${que}: sin textos cortados, sin toques menores de 44 y sin desplazamiento a lo ancho${datos.fuera.length || datos.chicos.length ? ` (${[...datos.fuera, ...datos.chicos].join("; ")})` : ""}`);
};
const SEMANA = `${base}/admin/instagram?ciudad=san-luis-potosi`;
const abrirSemana = async (page, url = SEMANA) => {
  await page.goto(url, { waitUntil: "load" });
  await page.locator("main li").first().waitFor({ timeout: 45000 });
};

try {
  const { ctx, page } = await contexto();

  // ---- 1. La semana en curso: el miércoles ya pasó sin armarse (gris, una línea) y hoy, «Esta semana», ya no se programó: la sugerencia.
  await abrirSemana(page);
  await foto(page, "01-semana-esta");
  const pasado = await page.locator("main li", { hasText: "Mié 7 · antes de armar la semana" }).count();
  comprobar(pasado === 1, "el miércoles que ya pasó sin publicación: una línea gris «Mié 7 · antes de armar la semana»");
  const grisSinFoto = await page.locator("main li", { hasText: "Mié 7 · antes de armar la semana" }).first().evaluate((li) => !li.querySelector("img") && !li.querySelector("a"));
  comprobar(grisSinFoto, "la línea gris no lleva miniatura ni abre hoja");
  let pasadosGrandes = 0;
  for (const d of ["Lun 5", "Mar 6", "Mié 7"]) pasadosGrandes += await page.locator("main li", { hasText: d }).filter({ hasText: "Sin publicación" }).count();
  comprobar(pasadosGrandes === 0, "ningún «Sin publicación» en grande en lo que ya pasó");
  const hoy = fila(page, "Hoy · 9:00 am · Esta semana");
  comprobar((await hoy.count()) === 1 && /Sin programar: publícalo ahora/.test(await texto(hoy)), `hoy trae la sugerencia de la regla: «${(await texto(hoy)).slice(0, 110)}»`);
  const faltaFila = filaFalta(page);
  const tFalta = await texto(faltaFila);
  comprobar(/\d+ artistas? y \d+ lugar(es)? con fecha se quedaron fuera por falta de foto o portada/.test(tFalta), `el renglón «Falta material» al final de la semana: «${tFalta.slice(0, 120)}»`);
  await faltaFila.evaluate((e) => e.scrollIntoView({ block: "center" }));
  await foto(page, "01b-semana-esta-abajo");
  await sinCortes(page, "la semana en curso a 390");

  // ---- 2. «Publicar ahora» lo de hoy: la hoja de la sugerencia y el trabajo en la cola, ya.
  await tocar(page, hoy.locator("a"), "abrir la sugerencia de hoy");
  let hoja = hojaAbierta(page);
  await hoja.getByRole("button", { name: "Publicar ahora" }).waitFor();
  await foto(page, "02-sugerencia-hoy");
  comprobar((await hoja.getByRole("button", { name: "Programar" }).count()) === 0, "hoy, con su hora ya pasada, solo «Publicar ahora» (no «Programar»)");
  await sinCortes(page, "la hoja de la sugerencia");
  await tocar(page, hoja.getByRole("button", { name: "Publicar ahora" }), "Publicar ahora");
  await page.waitForFunction(() => !document.querySelector("[role=dialog]"), null, { timeout: 30000 });
  const delJueves = (await leer("instagram_semana", "select=id,tipo,estado,trabajo_id,eventos&ciudad=eq.san-luis-potosi&fecha=eq.2026-10-08"))[0];
  comprobar(delJueves?.tipo === "semana" && !!delJueves.trabajo_id && delJueves.eventos?.length >= 1, `el jueves queda guardado como «Esta semana» con su trabajo en la cola (${delJueves?.eventos?.length} eventos)`);
  const trabajo = delJueves?.trabajo_id ? (await leer("redes_trabajos", `select=id,estado,siguiente_en&id=eq.${delJueves.trabajo_id}`))[0] : null;
  comprobar(!!trabajo && Date.parse(trabajo.siguiente_en) <= Date.parse(AHORA) + 1000, `el trabajo sale ya (siguiente_en ${trabajo?.siguiente_en}, estado ${trabajo?.estado})`);
  await page.locator("main li", { hasText: /Hoy · 9:00 am · Esta semana/ }).first().waitFor();
  await page.waitForTimeout(1500);
  await foto(page, "03-publicando-hoy");
  const tHoy = await texto(fila(page, "Hoy · 9:00 am · Esta semana"));
  comprobar(/Publicando…|Publicado/.test(tHoy), `el renglón de hoy pasa a «Publicando…» o «Publicado»: «${tHoy.slice(0, 100)}»`);

  // ---- 3. «Falta material»: la lista, la ficha de Íñigo y «Pedírselo» (el aviso queda creado para Marcos).
  await tocar(page, filaFalta(page).locator("a"), "abrir «Falta material»");
  hoja = hojaAbierta(page);
  await hoja.locator("li", { hasText: "Íñigo Montalvo" }).first().waitFor();
  await foto(page, "04-falta-material");
  const tInigo = await texto(hoja.locator("li", { hasText: "Íñigo Montalvo" }));
  comprobar(/Falta la portada/.test(tInigo) && /Próxima fecha: dom 11/.test(tInigo) && /La lleva Marcos/.test(tInigo), `Íñigo: qué falta, su próxima fecha y quién lo lleva: «${tInigo}»`);
  const tEcos = await texto(hoja.locator("li", { hasText: "Museo del Ferrocarril" }));
  comprobar(/Su portada es de otra página: hay que subirla a la app/.test(tEcos), `una portada de otra página se dice aparte: «${tEcos.slice(0, 100)}»`);
  await sinCortes(page, "la lista de «Falta material»");
  await tocar(page, hoja.locator("li", { hasText: "Íñigo Montalvo" }).locator("a"), "abrir Íñigo");
  await hoja.getByRole("button", { name: "Pedírselo" }).waitFor();
  await foto(page, "05-ficha-inigo");
  comprobar((await hoja.getByRole("button", { name: "Subir yo" }).count()) === 1, "Íñigo: «Pedírselo» y «Subir yo»");
  await tocar(page, hoja.getByRole("button", { name: "Pedírselo" }), "Pedírselo");
  await hoja.getByText(/Se lo pedimos hoy/).waitFor({ timeout: 20000 });
  await foto(page, "06-pedido");
  const pedidos = await leer("instagram_material_pedidos", "select=usuario_id,artista_id,falta,semana");
  comprobar(pedidos.length === 1 && pedidos[0].usuario_id === MARCOS && pedidos[0].falta.join() === "portada" && pedidos[0].semana === "2026-10-05", `el aviso queda creado para Marcos (${JSON.stringify(pedidos)})`);
  comprobar((await hoja.getByRole("button", { name: "Pedírselo" }).count()) === 0, "ya pedido, no se vuelve a pedir esta semana");
  await tocar(page, hoja.getByRole("button", { name: "Volver a la lista" }), "Volver a la lista");
  // Un lugar que nadie lleva: solo «Subir yo».
  const sinNadie = hoja.locator("li", { hasText: "Nadie lleva la ficha" }).first();
  if (await sinNadie.count()) {
    await tocar(page, sinNadie.locator("a"), "abrir una ficha que nadie lleva");
    await hoja.getByRole("button", { name: "Subir yo" }).waitFor();
    comprobar((await hoja.getByRole("button", { name: "Pedírselo" }).count()) === 0, "si nadie lleva la ficha, solo «Subir yo»");
    await tocar(page, hoja.getByRole("button", { name: "Volver a la lista" }), "Volver a la lista");
  }
  await tocar(page, hoja.getByRole("button", { name: "Cerrar" }), "✕");
  await page.waitForFunction(() => !document.querySelector("[role=dialog]"), null, { timeout: 10000 });

  // ---- 4. La que viene, antes de subir nada: el miércoles 14 (lugar) no tiene a nadie con material.
  await abrirSemana(page, `${SEMANA}&semana=viene`);
  const mie = fila(page, "Mié 14 · 7:00 pm · Lugar");
  const tMie = await texto(mie);
  comprobar(/Nadie con material para el mié 14/.test(tMie), `la que viene: «${tMie.slice(0, 100)}»`);
  await mie.evaluate((e) => e.scrollIntoView({ block: "center" }));
  await foto(page, "07-viene-nadie");

  // ---- 5. «Subir yo» la portada del museo (desde «Falta material» de esta semana): vuelve con la portada puesta y el museo ya entra.
  await abrirSemana(page);
  await tocar(page, filaFalta(page).locator("a"), "abrir «Falta material»");
  hoja = hojaAbierta(page);
  await tocar(page, hoja.locator("li", { hasText: "Museo Leonora Carrington" }).locator("a"), "abrir el museo");
  await tocar(page, hoja.getByRole("button", { name: "Subir yo" }), "Subir yo");
  await hoja.getByText("Elegir la portada").waitFor();
  await foto(page, "08-subir-yo");
  await fetch(`${respaldo}/__lectura`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ archivo: PORTADA_MUSEO }) });
  const [elegir] = await Promise.all([page.waitForEvent("filechooser"), tocar(page, hoja.locator("label", { hasText: "Elegir la portada" }), "Elegir la portada")]);
  await elegir.setFiles(PORTADA_MUSEO);
  await hoja.getByRole("button", { name: "Guardar" }).waitFor({ timeout: 30000 });
  await page.waitForFunction(() => !document.querySelector("[role=dialog] [aria-busy=true]"), null, { timeout: 30000 });
  await foto(page, "09-portada-subida");
  await tocar(page, hoja.getByRole("button", { name: "Guardar" }), "Guardar");
  await hoja.getByText(/ya tiene su material/).waitFor({ timeout: 20000 });
  await foto(page, "10-guardado");
  const museo = (await leer("lugares", "select=portada&nombre=eq.Museo%20Leonora%20Carrington%20(demo)"))[0];
  comprobar(/\/storage\/v1\/object\/public\/fotos\/lugares\//.test(museo?.portada ?? ""), `la portada del museo queda en su ficha, en el Storage de la app (${museo?.portada})`);
  comprobar((await hoja.locator("li", { hasText: "Museo Leonora Carrington" }).count()) === 0, "vuelve a la lista y el museo ya no está en «Falta material»");
  await tocar(page, hoja.getByRole("button", { name: "Cerrar" }), "✕");

  // ---- 6. La que viene: el miércoles 14 ya tiene al museo (la sugerencia) y se programa a su hora.
  await abrirSemana(page, `${SEMANA}&semana=viene`);
  const mie2 = fila(page, "Mié 14 · 7:00 pm · Lugar");
  const tMie2 = await texto(mie2);
  comprobar(/Museo Leonora Carrington/.test(tMie2) && /Sin programar: prográmalo/.test(tMie2), `el museo ya entra: «${tMie2.slice(0, 120)}»`);
  await mie2.evaluate((e) => e.scrollIntoView({ block: "center" }));
  await foto(page, "11-viene-museo");
  await tocar(page, mie2.locator("a"), "abrir la sugerencia del mié 14");
  hoja = hojaAbierta(page);
  await hoja.getByRole("button", { name: "Programar" }).waitFor();
  await foto(page, "12-sugerencia-programar");
  comprobar((await hoja.getByRole("button", { name: "Publicar ahora" }).count()) === 0, "un día que no es hoy: solo «Programar»");
  await tocar(page, hoja.getByRole("button", { name: "Programar" }), "Programar");
  await page.waitForFunction(() => !document.querySelector("[role=dialog]"), null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  const del14 = (await leer("instagram_semana", "select=tipo,estado,trabajo_id,programado_para&ciudad=eq.san-luis-potosi&fecha=eq.2026-10-14"))[0];
  const tr14 = del14?.trabajo_id ? (await leer("redes_trabajos", `select=estado,siguiente_en&id=eq.${del14.trabajo_id}`))[0] : null;
  comprobar(del14?.tipo === "lugar" && tr14?.estado === "en_cola" && tr14.siguiente_en === "2026-10-15T01:00:00.000Z", `el mié 14 queda programado a las 7:00 pm (${JSON.stringify(del14)} · ${JSON.stringify(tr14)})`);
  const tMie3 = await texto(fila(page, "Mié 14 · 7:00 pm · Lugar"));
  comprobar(/Programado/.test(tMie3), `el renglón dice «Programado»: «${tMie3.slice(0, 100)}»`);
  await foto(page, "13-viene-programado");

  // ---- 7. La portada de Administración: «· N sin material».
  await page.goto(`${base}/admin`, { waitUntil: "load" });
  const rIg = page.locator("a[href='/admin/instagram']");
  await rIg.waitFor();
  await rIg.evaluate((e) => e.scrollIntoView({ block: "center" }));
  await foto(page, "14-portada-admin");
  const tPortada = await texto(rIg);
  comprobar(/· \d+ sin material/.test(tPortada), `la portada de Administración: «${tPortada}»`);
  await ctx.close();

  // ---- 8. Marcos ve su aviso en Novedades: el nombre de la ficha y la razón; abre la edición de la ficha.
  const m = await contexto(MARCOS);
  await m.page.goto(`${base}/novedades`, { waitUntil: "load" });
  const aviso = m.page.locator("main li", { hasText: "Íñigo Montalvo" }).first();
  await aviso.waitFor({ timeout: 30000 });
  await foto(m.page, "15-novedades-marcos");
  const tAviso = await texto(aviso);
  const href = await aviso.locator("a").getAttribute("href");
  comprobar(/Completa tu portada y te presentamos en Instagram/.test(tAviso) && /\/artistas\/inigo-montalvo-demo\/editar$/.test(href ?? ""), `Marcos: «${tAviso}» → ${href}`);
  await m.ctx.close();

  // ---- 9. A 320: la semana y «Falta material».
  const c = await contexto(ADMIN, 320);
  await abrirSemana(c.page);
  await foto(c.page, "16-semana-320");
  await sinCortes(c.page, "la semana a 320");
  await tocar(c.page, filaFalta(c.page).locator("a"), "abrir «Falta material» a 320");
  await hojaAbierta(c.page).locator("li").first().waitFor();
  await foto(c.page, "17-falta-320");
  await sinCortes(c.page, "«Falta material» a 320");
  await tocar(c.page, hojaAbierta(c.page).locator("li", { hasText: "Íñigo Montalvo" }).locator("a"), "abrir Íñigo a 320");
  await hojaAbierta(c.page).getByRole("button", { name: "Subir yo" }).waitFor();
  await foto(c.page, "18-ficha-320");
  await sinCortes(c.page, "la ficha de «Falta material» a 320");
  await c.ctx.close();
} finally {
  await browser.close();
  fs.rmSync(carpetaFotos, { recursive: true, force: true });
  const registro = s.registro();
  const avisos = registro.split("\n").filter((l) => l.startsWith("redes:"));
  fs.writeFileSync(path.join(SALIDA, "recorrido.txt"), `${recorrido.join("\n")}\n\n${fallas.length ? `FALLAS:\n${fallas.join("\n")}` : "todo bien"}\n${errores.length ? `errores:\n${errores.join("\n")}` : "sin errores de página ni de consola"}\n${avisos.length ? `registros de la ruta:\n${avisos.join("\n")}` : "sin avisos «redes:» en los registros de la ruta"}\n`);
}
console.log(errores.length ? `errores de página o consola:\n  ${errores.join("\n  ")}` : "sin errores de página ni de consola");
console.log(fallas.length ? `FALLAS: ${fallas.length}` : "todo bien");
process.exit(fallas.length ? 1 : 0);
