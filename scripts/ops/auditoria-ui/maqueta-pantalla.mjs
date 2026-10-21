// Guarda pantallas REALES de la app como HTML autónomo para prototipar sobre ellas (OL-409, bitácora 440): compila la app contra el
// respaldo local (nunca toca producción ni un `.env` real), abre cada pantalla en Chrome a 390×844 y escribe `<carpeta>/<id>.html` con el
// DOM ya pintado, todo el CSS que se sirvió (con sus fuentes dentro) y las imágenes como data URI, sin ningún script; y `<id>.png` al lado.
// Un prototipo mete ese HTML en un marco (`iframe`) y solo cambia los datos: así la maqueta es la de producción y no un dibujo a mano
// (el founder, 14 de octubre: «las maquetas de fichas no te salen bien… tienen un error de maquetación de origen»).
//
//   node scripts/ops/auditoria-ui/maqueta-pantalla.mjs <carpeta> [--solo=texto]
//
// Las pantallas están abajo (`PANTALLAS`); `--solo=` filtra por id. Correrlo en un árbol SIN `.env`: con él, `next build` carga llaves reales.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { createRequire } from "node:module";
import { ADMIN, cookie, cookieDe, LLAVE_SERVICIO } from "./respaldo-local/fixture.mjs";

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const RAIZ = path.resolve(AQUI, "../../..");
const { chromium } = createRequire(path.join(RAIZ, "package.json"))("playwright-core");
const NEXT = path.join(RAIZ, "node_modules/next/dist/bin/next");
const MAC = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const AHORA = "2026-10-07T16:00:00Z"; // el mismo reloj fijo que `medir`
const SALIDA = process.argv[2];
const solo = (process.argv.find((a) => a.startsWith("--solo=")) ?? "").slice(7);
if (!SALIDA) { console.error("uso: maqueta-pantalla.mjs <carpeta> [--solo=texto]"); process.exit(1); }
if (fs.existsSync(path.join(RAIZ, ".env"))) { console.error("hay un .env en el árbol: la app cargaría llaves reales. Córrelo en un árbol sin .env"); process.exit(1); }

/** Las pantallas que se guardan: con sesión (la cookie del respaldo; `cuenta: "admin"`, la de administración) y, si hace falta, los pasos
 *  para llegar a ellas. */
const PANTALLAS = [
  { id: "ficha-lugar", url: "/lugares/teatro-de-la-paz", sesion: true },
  { id: "ficha-festival", url: "/eventos/festival-de-cine-de-invierno", sesion: true },
  { id: "ficha-exposicion", url: "/eventos/ecos-de-papel", sesion: true },
  { id: "agenda", url: "/agenda", sesion: true },
  { id: "alta-cuanto", url: "/nuevo/evento", sesion: true, paso: "evento-cuanto" },
  // OL-425: Administración: la portada, una lista con buscador y chips (Personas), una hoja abierta (hacer administrador a Ana), la lista de
  // lugares (por el CSS del campo con su ✕ y la hoja con título) y el grafo (por el panel de ayuda).
  { id: "admin", url: "/admin", sesion: true, cuenta: "admin" },
  { id: "admin-personas", url: "/admin/personas", sesion: true, cuenta: "admin" },
  { id: "admin-persona-hoja", url: "/admin/personas/11111111-1111-4111-8111-111111111111", sesion: true, cuenta: "admin", paso: "admin-hoja-rol" },
  { id: "admin-lugares", url: "/admin/lugares", sesion: true, cuenta: "admin" },
  { id: "admin-grafo", url: "/admin/grafo", sesion: true, cuenta: "admin" },
  // OL-431: Administración › Ciudades como está hoy (OL-427): la lista con sus tarjetas, la hoja de «Buscar lugares» de Querétaro, la bandeja de
  // una corrida y Corridas; y la hoja de ciudades de la app (el chip de la ciudad en Artistas), que es la de elegir una ciudad.
  { id: "admin-ciudades", url: "/admin/ciudades", sesion: true, cuenta: "admin" },
  { id: "admin-ciudades-hoja", url: "/admin/ciudades", sesion: true, cuenta: "admin", paso: "admin-ciudades-hoja" },
  { id: "admin-propuestas", url: "/admin/ciudades/propuestas/abab0001-0000-4000-8000-000000000001", sesion: true, cuenta: "admin" },
  { id: "admin-corridas", url: "/admin/corridas", sesion: true, cuenta: "admin" },
  { id: "artistas-hoja-ciudad", url: "/artistas", sesion: true, paso: "hoja-ciudad" },
];
const PASOS = {
  // La hoja de «Buscar lugares» de Querétaro en Administración › Ciudades (ui/Hoja con título, ui/Campo con su ✕ y el pie).
  "admin-ciudades-hoja": async (page) => {
    await page.getByRole("list", { name: "Querétaro" }).getByRole("button", { name: /^Buscar lugares/ }).click();
    await page.getByRole("dialog", { name: "Buscar lugares en Querétaro" }).waitFor();
  },
  // La hoja de ciudades de la app: el chip de la ciudad de Artistas (ui/Hoja plana con los renglones de cada ciudad).
  "hoja-ciudad": async (page) => {
    await page.getByRole("button", { name: /San Luis Potosí/ }).first().click();
    await page.getByRole("dialog").waitFor();
  },
  // La hoja «Hacer administrador» de la ficha de una persona en Administración (ui/Hoja sin título, con su botón principal).
  "admin-hoja-rol": async (page) => {
    await page.getByRole("button", { name: "Hacer administrador" }).first().click();
    await page.getByRole("dialog").waitFor();
  },
  // El alta de un evento hasta «¿Cuánto cuesta?»: sin cartel, nombre, este viernes a las 7, sin fin, «Estoy aquí» con un sitio nuevo usado solo aquí.
  "evento-cuanto": async (page) => {
    const ctx = page.context();
    await ctx.grantPermissions(["geolocation"]);
    await ctx.setGeolocation({ latitude: 22.1533, longitude: -100.9811 });
    await page.getByRole("button", { name: "No tengo cartel" }).click();
    await page.getByRole("textbox", { name: "Nombre del evento" }).fill("Ecos de papel");
    await page.getByRole("button", { name: "Siguiente", exact: true }).click();
    await page.getByRole("button", { name: /^Este viernes/ }).click();
    await page.getByRole("button", { name: /^7:00 pm/ }).click();
    await page.getByRole("button", { name: "Sin hora de fin" }).click();
    await page.getByRole("button", { name: /Estoy aquí/ }).click();
    await page.getByRole("heading", { name: "¿Es aquí?" }).waitFor();
    await page.getByRole("textbox", { name: "Nombre del lugar" }).fill("Cinema 7B");
    await page.getByRole("button", { name: /^Sí, es aquí/ }).click();
    await page.getByRole("button", { name: /^Usarlo solo en este evento/ }).click();
    await page.getByRole("heading", { name: "¿Cuánto cuesta?" }).waitFor();
  },
};

const puertoLibre = () => new Promise((ok) => { const s = net.createServer(); s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => ok(p)); }); });
const hijos = [];
const lanzar = (args, env) => { const h = spawn(process.execPath, args, { cwd: RAIZ, env: { ...process.env, ...env }, stdio: "ignore" }); hijos.push(h); return h; };
const esperar = async (url) => { for (let i = 0; i < 80; i++) { try { if ((await fetch(url)).status < 500) return; } catch {} await new Promise((r) => setTimeout(r, 500)); } throw new Error("no arranca " + url); };

const [puertoRespaldo, puertoApp] = [await puertoLibre(), await puertoLibre()];
const app = { NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${puertoRespaldo}`, NEXT_PUBLIC_SUPABASE_ANON_KEY: "llave-anon-inventada", NEXT_PUBLIC_MAPBOX_TOKEN: "pk.inventado", SUPABASE_SERVICE_ROLE_KEY: LLAVE_SERVICIO };
const reloj = { RELOJ_FIJO: AHORA, TZ: "America/Mexico_City", NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --require=${path.join(AQUI, "reloj-fijo.cjs")}` };
let browser;
try {
  lanzar([path.join(AQUI, "respaldo-local/server.mjs"), String(puertoRespaldo)], reloj);
  await esperar(`http://127.0.0.1:${puertoRespaldo}/rest/v1/eventos?select=id&limit=1`);
  process.stdout.write("compilando la app contra el respaldo… ");
  const t = Date.now();
  const r = spawnSync(process.execPath, [NEXT, "build"], { cwd: RAIZ, env: { ...process.env, ...app }, encoding: "utf8", maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`next build falló\n${(r.stdout + r.stderr).slice(-3000)}`);
  console.log(`${Math.round((Date.now() - t) / 1000)} s`);
  lanzar([NEXT, "start", "-p", String(puertoApp)], { ...app, ...reloj });
  const base = `http://127.0.0.1:${puertoApp}`;
  await esperar(base + "/entrar");
  browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE || (fs.existsSync(MAC) ? MAC : undefined), headless: true, args: ["--hide-scrollbars"] });
  fs.mkdirSync(SALIDA, { recursive: true });
  for (const p of PANTALLAS.filter((x) => !solo || x.id.includes(solo))) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "es-MX" });
    if (p.sesion) await ctx.addCookies([{ name: "sb-127-auth-token", value: p.cuenta === "admin" ? cookieDe(ADMIN) : cookie, url: base }]);
    const page = await ctx.newPage();
    await page.goto(base + p.url, { waitUntil: "networkidle" });
    if (p.paso) await PASOS[p.paso](page);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SALIDA, `${p.id}.png`) });
    const html = await page.evaluate(async () => {
      const aDataUri = async (url) => { try { const b = await (await fetch(url)).blob(); return await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(b); }); } catch { return url; } };
      // El CSS: cada hoja entera, con sus fuentes dentro.
      let css = "";
      for (const hoja of document.styleSheets) {
        let texto = hoja.href ? await (await fetch(hoja.href)).text() : [...hoja.cssRules].map((x) => x.cssText).join("\n");
        for (const u of new Set([...texto.matchAll(/url\((["']?)(\/_next\/[^)"']+)\1\)/g)].map((m) => m[2]))) texto = texto.split(u).join(await aDataUri(u));
        css += `\n/* ${hoja.href ?? "inline"} */\n${texto}`;
      }
      // Las imágenes del DOM, dentro; los scripts, fuera.
      for (const img of document.images) { const src = img.currentSrc || img.src; if (src && !src.startsWith("data:")) { img.setAttribute("src", await aDataUri(src)); img.removeAttribute("srcset"); img.removeAttribute("sizes"); } }
      for (const el of document.querySelectorAll("[style*='url(']")) { const m = el.getAttribute("style").match(/url\((["']?)([^)"']+)\1\)/); if (m && !m[2].startsWith("data:")) el.setAttribute("style", el.getAttribute("style").replace(m[2], await aDataUri(m[2]))); }
      document.querySelectorAll("script, link, noscript, next-route-announcer").forEach((e) => e.remove());
      const attrs = (el) => [...el.attributes].map((a) => `${a.name}="${a.value.replace(/"/g, "&quot;")}"`).join(" ");
      return `<!doctype html>\n<html ${attrs(document.documentElement)}>\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<title>${document.title}</title>\n<style>${css}\n</style>\n</head>\n<body ${attrs(document.body)}>\n${document.body.innerHTML}\n</body>\n</html>\n`;
    });
    fs.writeFileSync(path.join(SALIDA, `${p.id}.html`), html);
    console.log(p.id, Math.round(html.length / 1024), "KB");
    await ctx.close();
  }
} finally {
  await browser?.close();
  for (const h of hijos) h.kill();
}
