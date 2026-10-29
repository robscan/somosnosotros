// Evidencia de OL-480 (bitácora 512), con el Chrome real de la Mac. Nunca toca producción ni un `.env` real.
//   node scripts/ops/auditoria-ui/capturar-avisos-forma.mjs <carpeta>
// 1. El aviso simulado: los textos salen de `contenidoPush` + `cuerpoPush` + `payloadApns` (src/lib) compilados aquí, con las fechas del prototipo
//    firmado (jueves 8 de octubre de 2026, San Luis Potosí); se dibujan como en la pantalla de bloqueo (app) y en la web, con el payload debajo.
// 2. La app real compilada contra el respaldo local (`RESPALDO_SIN_PREGUNTAR=1`: a Ana aún no se le preguntó por los avisos; una llave pública de
//    avisos inventada para que el navegador los ofrezca): «Avisos abiertos» en Administración (y su desglose con un toque real), el «Atrás» de la
//    barra a 320 antes y después (el «antes» es la regla vieja puesta en la página), la hoja de consentimiento tras «Voy» sin «Por correo»,
//    «Boletín por correo» en Ajustes y «Activa las notificaciones» en Novedades, que abre los pasos con un toque.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { createRequire } from "node:module";
import { ADMIN, cookieDe } from "./respaldo-local/fixture.mjs";

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const RAIZ = path.resolve(AQUI, "../../..");
const requerir = createRequire(path.join(RAIZ, "package.json"));
const { chromium } = requerir("playwright-core");
const esbuild = requerir("esbuild");
const NEXT = path.join(RAIZ, "node_modules/next/dist/bin/next");
const SALIDA = process.argv[2];
if (!SALIDA) { console.error("uso: capturar-avisos-forma.mjs <carpeta>"); process.exit(1); }
if (fs.existsSync(path.join(RAIZ, ".env"))) { console.error("hay un .env en el árbol: córrelo en un árbol sin .env"); process.exit(1); }
fs.mkdirSync(SALIDA, { recursive: true });
const solo = (process.argv.find((a) => a.startsWith("--solo=")) ?? "").slice(7);

const fallos = [];
const comprobar = (si, texto, detalle) => { console.log(si ? "  ok" : "  FALLA", texto, si || detalle === undefined ? "" : JSON.stringify(detalle)); if (!si) fallos.push(texto); };
const MAC = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1";
const browser = await chromium.launch({ executablePath: MAC, headless: true, args: ["--hide-scrollbars"] });
const hijos = [];

try {
  // ---------- 1. El aviso simulado ----------
  if (!solo || solo === "aviso") {
    const r = await esbuild.build({
      stdin: { loader: "ts", resolveDir: RAIZ, contents: `
        import { contenidoPush, cuerpoPush } from "@/lib/avisos";
        import { payloadApns } from "@/lib/push";
        const ev = { id: "e1", slug: "noche-de-danzon", titulo: "Noche de danzón", inicio: "2026-10-10T02:00:00Z", fin: null, zona: "America/Mexico_City",
          sitio_texto: null, sitio_reservado: false, lugar: { nombre: "Teatro de la Paz", portada: null } };
        const largo = { ...ev, id: "e2", titulo: "Festival Internacional de Danza Contemporánea Lila López: función de clausura", inicio: "2026-10-11T01:00:00Z",
          lugar: { nombre: "Centro de las Artes de San Luis Potosí Centenario", portada: null } };
        const jueves = new Date("2026-10-08T15:00:00Z"), viernes = new Date("2026-10-09T15:00:00Z");
        const desc = "Baile de salón con orquesta en vivo: danzón, mambo y chachachá para todo el público";
        const casos = [
          ["Evento nuevo, por el lugar", contenidoPush("nuevo_evento", ev, "ambos", jueves, { motivo: "lugar", descripcion: desc })],
          ["Evento nuevo, por el artista", contenidoPush("nuevo_evento", ev, "ambos", jueves, { motivo: "artista:Luna Hermoso" })],
          ["Recordatorio (viernes 9:00)", contenidoPush("recordatorio", ev, "ambos", viernes, { direccion: "Villerías 2, Centro" })],
          ["Cambio de fecha", contenidoPush("cambio", { ...ev, inicio: "2026-10-11T02:00:00Z" }, "cuando", jueves)],
          ["Cambio para mañana", contenidoPush("cambio", ev, "cuando", new Date("2026-10-09T03:00:00Z"))],
          ["Se canceló (listo para la fase 4)", contenidoPush("cancelado", ev, "ambos", jueves)],
          ["Nombres largos", contenidoPush("nuevo_evento", largo, "ambos", jueves, { motivo: "lugar", descripcion: "Gala de clausura con compañías de México, Argentina y España en el foro principal" })],
        ];
        export default casos.map(([nombre, forma]) => { const app = cuerpoPush(forma, "app", "job-1"); return { nombre, app, web: cuerpoPush(forma, "web", "job-1"), apns: JSON.parse(payloadApns(JSON.stringify(app)).payload) }; });
      ` },
      bundle: true, platform: "node", format: "esm", write: false, logLevel: "error",
      alias: { "@": path.join(RAIZ, "src"), "server-only": path.join(RAIZ, "node_modules/server-only/empty.js") },
      banner: { js: `import { createRequire as __cr } from "node:module"; const require = __cr(${JSON.stringify(path.join(RAIZ, "package.json"))});` },
    });
    const casos = (await import("data:text/javascript;base64," + Buffer.from(r.outputFiles[0].text).toString("base64"))).default;
    const icono = "data:image/png;base64," + fs.readFileSync(path.join(RAIZ, "public/icono-192.png")).toString("base64");
    const esc = (t) => String(t ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
    const tarjeta = (a, conSub) => `<div class="aviso"><img src="${icono}" alt=""><div><p class="cab"><b>${esc(a.titulo)}</b><span>ahora</span></p>${conSub && a.subtitulo ? `<p class="sub">${esc(a.subtitulo)}</p>` : ""}<p class="cuerpo">${esc(a.cuerpo)}</p></div></div>`;
    const estilo = `*{box-sizing:border-box;margin:0}body{font-family:-apple-system,system-ui,sans-serif;background:linear-gradient(#3b4a6b,#1d2333);color:#fff;padding:16px 10px 40px}
      h1{font-size:15px;font-weight:600;margin:4px 6px 12px;opacity:.85}h2{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin:18px 6px 6px;opacity:.7}
      .aviso{display:grid;grid-template-columns:38px 1fr;gap:10px;background:rgba(245,245,245,.82);color:#111;border-radius:22px;padding:12px 14px;backdrop-filter:blur(20px)}
      .aviso img{width:38px;height:38px;border-radius:9px}.cab{display:flex;justify-content:space-between;gap:8px;font-size:15px;line-height:20px}
      .cab b{overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.cab span{color:#555;font-size:13px;flex:none}
      .sub{font-weight:600;font-size:15px;line-height:20px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.cuerpo{font-size:15px;line-height:20px;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
      pre{white-space:pre-wrap;word-break:break-word;font:11px/1.4 ui-monospace,Menlo,monospace;background:rgba(0,0,0,.35);border-radius:12px;padding:10px;margin-top:6px;color:#dfe6ff}`;
    const pagina = (titulo, cuerpo) => `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${estilo}</style><h1>${titulo}</h1>${cuerpo}`;
    const app = pagina("App del iPhone (APNs): título, subtítulo y cuerpo", casos.map((c) => `<h2>${esc(c.nombre)}</h2>${tarjeta(c.app, true)}`).join(""));
    const web = pagina("Web (Safari, Chrome, Android): sin subtítulo, la razón abre el cuerpo", casos.map((c) => `<h2>${esc(c.nombre)}</h2>${tarjeta(c.web, false)}`).join(""));
    const payload = pagina("Lo que sale a Apple (aps) y a la web, tal cual", casos.slice(0, 3).map((c) => `<h2>${esc(c.nombre)}</h2><pre>${esc(JSON.stringify(c.apns, null, 1))}</pre><pre>${esc(JSON.stringify(c.web, null, 1))}</pre>`).join(""));
    for (const c of casos) {
      comprobar(c.app.titulo.length <= 40 && (c.app.subtitulo ?? "").length <= 40 && c.app.cuerpo.length <= 110 && c.web.cuerpo.length <= 110, `${c.nombre}: título y subtítulo ≤ 40, cuerpo ≤ 110`);
      comprobar(c.apns.aps["thread-id"] === c.app.hilo && c.apns.aps.alert.subtitle === c.app.subtitulo && c.web.tag === c.app.hilo, `${c.nombre}: subtitle y thread-id en APNs, tag = hilo en la web`);
      comprobar(!/Mañana/.test(c.app.cuerpo.slice(1)) && !/ Mañana/.test(c.app.subtitulo ?? "") && !/ Mañana/.test(c.web.cuerpo), `${c.nombre}: sin «Mañana» con mayúscula a media frase`);
    }
    for (const [nombre, html, ancho] of [["aviso-app", app, 390], ["aviso-app-320", app, 320], ["aviso-web", web, 390], ["aviso-payload", payload, 390]]) {
      const ctx = await browser.newContext({ viewport: { width: ancho, height: 844 }, deviceScaleFactor: 2 });
      const p = await ctx.newPage();
      await p.setContent(html);
      await p.screenshot({ path: path.join(SALIDA, `${nombre}.png`), fullPage: true });
      await ctx.close();
    }
    console.log(JSON.stringify(casos.map((c) => ({ nombre: c.nombre, app: c.app, web: c.web.cuerpo })), null, 1));
  }

  // ---------- 2. La app real ----------
  if (!solo || solo === "app") {
    const puertoLibre = () => new Promise((ok) => { const s = net.createServer(); s.listen(0, "127.0.0.1", () => { const n = s.address().port; s.close(() => ok(n)); }); });
    const lanzar = (args, env) => { const h = spawn(process.execPath, args, { cwd: RAIZ, env: { ...process.env, ...env }, stdio: "ignore" }); hijos.push(h); return h; };
    const esperar = async (url) => { for (let i = 0; i < 80; i++) { try { if ((await fetch(url)).status < 500) return; } catch {} await new Promise((r) => setTimeout(r, 500)); } throw new Error("no arranca " + url); };
    const [puertoRespaldo, puertoApp] = [await puertoLibre(), await puertoLibre()];
    // Una llave pública de avisos inventada (65 bytes, el formato de VAPID): con ella el navegador ofrece activar los avisos; sin la privada, el
    // servidor no manda nada.
    const llave = Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 7)]).toString("base64url");
    const app = { NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${puertoRespaldo}`, NEXT_PUBLIC_SUPABASE_ANON_KEY: "llave-anon-inventada", NEXT_PUBLIC_MAPBOX_TOKEN: "pk.inventado", NEXT_PUBLIC_VAPID_PUBLIC_KEY: llave };
    const reloj = { RELOJ_FIJO: "2026-10-07T16:00:00Z", TZ: "America/Mexico_City", NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --require=${path.join(AQUI, "reloj-fijo.cjs")}` };
    lanzar([path.join(AQUI, "respaldo-local/server.mjs"), String(puertoRespaldo)], { ...reloj, RESPALDO_SIN_PREGUNTAR: "1" });
    await esperar(`http://127.0.0.1:${puertoRespaldo}/rest/v1/eventos?select=id&limit=1`);
    const r = spawnSync(process.execPath, [NEXT, "build"], { cwd: RAIZ, env: { ...process.env, ...app }, encoding: "utf8", maxBuffer: 1 << 26 });
    if (r.status !== 0) throw new Error(`next build falló\n${(r.stdout + r.stderr).slice(-3000)}`);
    lanzar([NEXT, "start", "-p", String(puertoApp)], { ...app, ...reloj });
    const base = `http://127.0.0.1:${puertoApp}`;
    await esperar(base + "/entrar");

    async function abrir(url, { ancho = 390, cuenta = null, iphone = false } = {}) {
      const ctx = await browser.newContext({ viewport: { width: ancho, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "es-MX",
        ...(iphone ? { userAgent: IPHONE } : {}) });
      await ctx.addCookies([{ name: "sb-127-auth-token", value: cookieDe(cuenta ?? undefined), url: base }]);
      const page = await ctx.newPage();
      const errores = [];
      page.on("pageerror", (e) => errores.push(e.message));
      await page.goto(base + url, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(900);
      return { page, ctx, errores };
    }
    /** Toque real: el ratón en el centro de lo que se ve, comprobado antes con elementFromPoint (nunca element.click()). */
    async function tocar(page, loc) {
      await loc.scrollIntoViewIfNeeded();
      const c = await loc.boundingBox();
      const x = c.x + c.width / 2, y = c.y + c.height / 2;
      const encima = await page.evaluate(([px, py]) => document.elementFromPoint(px, py)?.closest("button,a")?.textContent?.trim() ?? null, [x, y]);
      await page.mouse.click(x, y);
      return encima;
    }

    // Administración: «Avisos abiertos» en Últimos 7 días, y su desglose.
    for (const ancho of [390, 320]) {
      const { page, ctx, errores } = await abrir("/admin", { ancho, cuenta: ADMIN });
      const ind = page.getByRole("button", { name: /Avisos abiertos/ });
      comprobar((await ind.count()) === 1, `${ancho}: el indicador «Avisos abiertos» está en Últimos 7 días`);
      const texto = (await ind.innerText()).replace(/\s+/g, " ");
      comprobar(/Avisos abiertos 11 de 48 mandados, sin saber quién ▲ 4 más/.test(texto), `${ancho}: «11 · de 48 mandados, sin saber quién» y contra la semana anterior`, texto);
      const fuera = await ind.evaluate((b) => [...b.querySelectorAll("*")].filter((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== "visible").map((e) => e.textContent));
      comprobar(fuera.length === 0, `${ancho}: nada cortado dentro del indicador`, fuera);
      await ind.scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy(0, -180));
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(SALIDA, ancho === 390 ? "admin-avisos.png" : "admin-avisos-320.png") });
      if (ancho === 390) {
        const encima = await tocar(page, ind);
        comprobar(/Avisos abiertos/.test(encima ?? ""), "el toque cae en el indicador", encima);
        const desglose = page.locator("#desglose");
        await desglose.waitFor();
        const partes = await desglose.locator("li").allInnerTexts();
        comprobar(partes.join("|") === "Evento nuevo: 8 de 28|Cambio de fecha o lugar: 2 de 9|Recordatorio: 1 de 3|Se canceló: 0 de 8", "el desglose por tipo", partes);
        comprobar((await desglose.locator("a").count()) === 0 && /nunca por persona/.test(await desglose.innerText()), "sin enlace a una lista de personas y «nunca por persona»");
        await page.evaluate(() => document.querySelector("#desglose").scrollIntoView({ block: "center" }));
        await page.waitForTimeout(200);
        await page.screenshot({ path: path.join(SALIDA, "admin-avisos-desglose.png") });
      }
      comprobar(errores.length === 0, `${ancho}: sin errores en la consola de Administración`, errores);
      await ctx.close();
    }

    // El «Atrás» de la barra interior, a 320 antes y después, y a 390 el logotipo al centro como antes.
    const medirBarra = (page) => page.evaluate(() => {
      const barra = document.querySelector("main header");
      const atras = barra?.querySelector("a[aria-label^='Atrás']");
      const span = atras?.querySelector("span");
      const logo = barra?.querySelector("img")?.getBoundingClientRect();
      const b = barra?.getBoundingClientRect();
      return { texto: span?.textContent ?? null, cortado: span ? span.scrollWidth > span.clientWidth + 0.5 : null, ancho: atras?.getBoundingClientRect().width ?? null,
        alto: atras?.getBoundingClientRect().height ?? null, centroLogo: logo ? Math.round((logo.left + logo.width / 2 - (b.left + b.width / 2)) * 10) / 10 : null,
        logoDentro: logo ? logo.left >= b.left && logo.right <= b.right : null, desborde: document.scrollingElement.scrollWidth > innerWidth };
    });
    const reglaVieja = (page) => page.evaluate(() => { document.querySelector("main header").style.gridTemplateColumns = "1fr auto 1fr"; });
    for (const ancho of [320, 390]) {
      const { page, ctx } = await abrir("/ajustes", { ancho, iphone: true });
      const despues = await medirBarra(page);
      await page.screenshot({ path: path.join(SALIDA, `atras-${ancho}-despues.png`), clip: { x: 0, y: 0, width: ancho, height: 160 } });
      await reglaVieja(page);
      await page.waitForTimeout(150);
      const antes = await medirBarra(page);
      await page.screenshot({ path: path.join(SALIDA, `atras-${ancho}-antes.png`), clip: { x: 0, y: 0, width: ancho, height: 160 } });
      console.log(`  ${ancho} antes`, JSON.stringify(antes), "\n  después", JSON.stringify(despues));
      if (ancho === 320) {
        comprobar(antes.cortado === true, "320 antes: «Atrás» se cortaba (la regla vieja puesta en la página)", antes);
        comprobar(despues.cortado === false && despues.texto === "Atrás" && despues.alto >= 44 && despues.logoDentro && !despues.desborde, "320 después: «Atrás» entero, 44 de toque, el logotipo dentro y sin desborde", despues);
      } else {
        comprobar(antes.cortado === false && despues.cortado === false && Math.abs(despues.centroLogo - antes.centroLogo) < 0.6 && Math.abs(despues.centroLogo) < 0.6,
          "390: igual que antes, con el logotipo al centro exacto", { antes, despues });
      }
      await ctx.close();
    }
    // Las demás pantallas con la barra interior, a 320: el regreso entero y nada se sale.
    for (const [url, cuenta] of [["/ajustes/editar", null], ["/ajustes/bloqueados", null], ["/privacidad", null], ["/nuevo/lugar", null], ["/admin", ADMIN], ["/admin/personas", ADMIN]]) {
      const { page, ctx } = await abrir(url, { ancho: 320, cuenta });
      const m = await page.evaluate(() => {
        const barra = document.querySelector("main header");
        const cortados = barra ? [...barra.querySelectorAll("*")].filter((e) => e.scrollWidth > e.clientWidth + 0.5 && getComputedStyle(e).textOverflow === "ellipsis").map((e) => e.textContent) : null;
        const fuera = barra ? [...barra.children].filter((e) => { const r = e.getBoundingClientRect(), b = barra.getBoundingClientRect(); return r.left < b.left - 0.5 || r.right > b.right + 0.5; }).length : null;
        return { barra: !!barra, cortados, fuera, desborde: document.scrollingElement.scrollWidth > innerWidth };
      });
      comprobar(m.barra && m.cortados.length === 0 && m.fuera === 0 && !m.desborde, `320 ${url}: la barra sin cortes ni desbordes`, m);
      await ctx.close();
    }

    // Ajustes › Avisos: «Boletín por correo».
    for (const ancho of [390, 320]) {
      const { page, ctx, errores } = await abrir("/ajustes", { ancho, iphone: true });
      const palanca = page.getByRole("switch", { name: "Boletín por correo" });
      comprobar((await palanca.count()) === 1, `${ancho}: «Boletín por correo» con su palanca`);
      const renglon = page.locator("li", { has: palanca });
      const texto = (await renglon.innerText()).replace(/\s+/g, " ");
      comprobar(/Boletín por correo Por correo solo llegará el boletín, cuando exista/.test(texto) && (await page.getByText("Por correo", { exact: true }).count()) === 0, `${ancho}: dice que por correo solo llegará el boletín`, texto);
      await page.getByRole("heading", { name: "Avisos" }).scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy(0, -120));
      await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(SALIDA, ancho === 390 ? "ajustes-boletin.png" : "ajustes-boletin-320.png") });
      comprobar(errores.length === 0, `${ancho}: sin errores en Ajustes`, errores);
      await ctx.close();
    }

    // La hoja de consentimiento tras el primer «Voy»: solo «En el teléfono» · «No, gracias».
    for (const ancho of [390, 320]) {
      const { page, ctx, errores } = await abrir("/eventos/feleal-un-viaje-por-el-mundo-en-acordeon", { ancho, iphone: true });
      const voy = page.getByRole("button", { name: /^Voy/ }).first();
      if ((await voy.getAttribute("aria-pressed")) === "true") { await tocar(page, voy); await page.waitForTimeout(600); }
      const encima = await tocar(page, voy);
      comprobar(/Voy/.test(encima ?? ""), `${ancho}: el toque cae en «Voy»`, encima);
      await page.getByText("¿Te recordamos ese día?").waitFor({ timeout: 8000 });
      await page.waitForTimeout(500);
      const botones = await page.locator("[role=status]").filter({ hasText: "¿Te recordamos ese día?" }).locator("button").allInnerTexts();
      comprobar(botones.join("|") === "En el teléfono|No, gracias", `${ancho}: la hoja ofrece «En el teléfono» y «No, gracias», sin «Por correo»`, botones);
      await page.screenshot({ path: path.join(SALIDA, ancho === 390 ? "hoja-consentimiento.png" : "hoja-consentimiento-320.png") });
      if (ancho === 390) {
        await tocar(page, page.getByRole("button", { name: "No, gracias" }));
        await page.getByText("Sin avisos. Se cambia en Ajustes.").waitFor({ timeout: 8000 });
        comprobar((await page.locator("[role=status]").filter({ hasText: "Sin avisos" }).getByRole("link", { name: /A mi calendario/ }).count()) === 1, "«No, gracias»: «Sin avisos. Se cambia en Ajustes.» y el calendario");
        await page.screenshot({ path: path.join(SALIDA, "hoja-no-gracias.png") });
      }
      comprobar(errores.length === 0, `${ancho}: sin errores en la ficha`, errores);
      await ctx.close();
    }
    {
      // «En el teléfono» en Safari del iPhone sin instalar: los pasos para instalarla (y «Falta un paso», nunca una palomita antes de tiempo).
      const { page, ctx } = await abrir("/eventos/feleal-un-viaje-por-el-mundo-en-acordeon", { iphone: true });
      const voy = page.getByRole("button", { name: /^Voy/ }).first();
      if ((await voy.getAttribute("aria-pressed")) === "true") { await tocar(page, voy); await page.waitForTimeout(600); }
      await tocar(page, voy);
      await page.getByText("¿Te recordamos ese día?").waitFor({ timeout: 8000 });
      await tocar(page, page.getByRole("button", { name: "En el teléfono" }));
      await page.waitForTimeout(900);
      await page.screenshot({ path: path.join(SALIDA, "hoja-en-el-telefono.png") });
      await ctx.close();
    }

    // Novedades: la acción «Activa las notificaciones en este teléfono», que abre los pasos ahí mismo.
    for (const ancho of [390, 320]) {
      const { page, ctx, errores } = await abrir("/novedades", { ancho, iphone: true });
      const linea = page.getByText("Activa las notificaciones en este teléfono");
      await linea.waitFor({ timeout: 8000 });
      comprobar((await page.getByText(/aún no/).count()) === 0 && (await page.getByText(/te llega por correo/).count()) === 0, `${ancho}: ya no dice «aún no» ni lo del correo`);
      await linea.scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(SALIDA, ancho === 390 ? "novedades-activar.png" : "novedades-activar-320.png") });
      if (ancho === 390) {
        const encima = await tocar(page, page.getByRole("button", { name: "Activar" }));
        comprobar(encima === "Activar", "el toque cae en «Activar»", encima);
        await page.waitForTimeout(900);
        comprobar(new URL(page.url()).pathname === "/novedades" && (await page.getByRole("dialog").count()) >= 1, "«Activar» abre los pasos ahí mismo, sin ir a Ajustes");
        await page.screenshot({ path: path.join(SALIDA, "novedades-activar-pasos.png") });
      }
      comprobar(errores.length === 0, `${ancho}: sin errores en Novedades`, errores);
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  for (const h of hijos) h.kill();
}
console.log(fallos.length ? `FALLAN ${fallos.length}: ${fallos.join(" · ")}` : "todas las comprobaciones pasan");
process.exit(fallos.length ? 1 : 0);
