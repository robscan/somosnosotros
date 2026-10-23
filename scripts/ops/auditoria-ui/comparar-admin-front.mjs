// OL-456 (bitácora 488): Administración contra su par del front. Lee las pantallas que guardó `maqueta-pantalla.mjs` (HTML autónomo con su CSS,
// sin scripts), las abre en el Chrome de la Mac a 390×844, mide lo mismo en las dos (la cabecera, el botón Atrás, el título, el relleno de la
// columna, los primeros renglones y su separación, la barra de abajo, la profundidad del DOM y los envoltorios sin clase) y pega sus capturas
// lado a lado (izquierda: Administración; derecha: el front) en `<salida>/NN-<pareja>.png`. Imprime la tabla y la guarda en `medidas.json`.
//   node scripts/ops/auditoria-ui/maqueta-pantalla.mjs <maquetas>
//   node scripts/ops/auditoria-ui/comparar-admin-front.mjs <maquetas> <salida>
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const [MAQ, SALIDA] = process.argv.slice(2);
if (!MAQ || !SALIDA) { console.error("uso: comparar-admin-front.mjs <maquetas> <salida>"); process.exit(1); }
const requerir = createRequire(path.join(RAIZ, "package.json"));
const { chromium } = requerir("playwright-core");
const sharp = requerir("sharp");
const MEDIR = fs.readFileSync(path.join(RAIZ, "scripts/ops/auditoria-ui/medir.js"), "utf8");

/** Cada pantalla de Administración con su par del front (null: no tiene). */
export const PAREJAS = [
  ["01-portada", "admin", "front-ajustes"],
  ["02-personas", "admin-personas", "front-artistas"],
  ["03-persona", "admin-persona", "front-persona"],
  ["04-lugares", "admin-lugares", "front-lugares"],
  ["05-eventos", "admin-eventos", "agenda"],
  ["06-artistas", "admin-artistas", "front-artistas"],
  ["07-ciudades", "admin-ciudades", "front-lugares-hoja-ciudad"],
  ["08-ciudad", "admin-ciudad", "ficha-lugar"],
  ["09-propuestas", "admin-propuestas", null],
  ["10-corridas", "admin-corridas", null],
  ["11-showcase", "admin-showcase", "front-artistas"],
  ["12-showcase-ficha", "admin-showcase-ficha", "front-ficha-artista"],
  ["13-por-aprobar", "admin-por-aprobar", null],
  ["14-grafo", "admin-grafo", null],
  ["15-obras", "admin-obras", null],
  ["16-manual", "admin-grafo-manual", "front-ayuda"],
];

/** Lo que se mide dentro de cada pantalla. */
const MEDIDAS = () => {
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
  const modulo = (el) => (el ? [...el.classList].map((c) => c.replace(/^(.+?)-module__[\w-]{5,8}__/, "$1/")).join(" ") : null);
  window.scrollTo(0, 0);
  const visible = (e) => e.getBoundingClientRect().height > 0 && getComputedStyle(e).visibility !== "hidden";
  const main = [...document.querySelectorAll("main")].find(visible);
  const cab = [...document.querySelectorAll("header")].find(visible);
  const atras = [...document.querySelectorAll("a, button")].find((e) => /^Atrás|Volver/.test(e.getAttribute("aria-label") ?? "") || e.textContent.trim() === "Atrás");
  const h1 = [...document.querySelectorAll("h1")].find(visible);
  const cs = main ? getComputedStyle(main) : null;
  // Renglones: los primeros cuatro <li> de main que se ven, de más de 40 de alto, sin contar los que van dentro de otro <li> ni los de una fila
  // horizontal (las acciones de una ficha).
  const lis = main ? [...main.querySelectorAll("li")].filter((li) => !li.parentElement.closest("li") && li.getBoundingClientRect().height > 40 && li.getBoundingClientRect().width > 200).slice(0, 4) : [];
  const huecos = lis.slice(1).map((li, i) => Math.round(li.getBoundingClientRect().top - lis[i].getBoundingClientRect().bottom));
  const sinClase = main ? [...main.querySelectorAll("div, span")].filter((e) => !e.className && !e.attributes.length && getComputedStyle(e).display !== "contents").length : 0;
  const nav = [...document.querySelectorAll("nav")].find((n) => visible(n) && getComputedStyle(n).position === "fixed");
  const primero = main && [...main.children].find((c) => c.tagName !== "HEADER" && c.getBoundingClientRect().height > 0);
  return {
    cabecera: cab ? { pieza: modulo(cab), ...r(cab) } : null,
    atras: atras ? { pieza: modulo(atras), texto: atras.textContent.trim() || atras.getAttribute("aria-label"), ...r(atras) } : null,
    titulo: h1 ? { texto: h1.textContent.trim().slice(0, 40), ...r(h1), letra: getComputedStyle(h1).fontSize } : null,
    columna: main ? { pieza: modulo(main), x: Math.round((primero ?? main).getBoundingClientRect().x), relleno: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].join(" "), alto: Math.round(main.scrollHeight) } : null,
    renglones: lis.length ? { pieza: modulo(lis[0]) || modulo(lis[0].firstElementChild), altos: lis.map((li) => Math.round(li.getBoundingClientRect().height)), huecos, x: Math.round(lis[0].getBoundingClientRect().x), w: Math.round(lis[0].getBoundingClientRect().width) } : null,
    barraAbajo: nav ? { pieza: modulo(nav), ...r(nav) } : null,
    sinClase,
  };
};

fs.mkdirSync(SALIDA, { recursive: true });
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--hide-scrollbars"] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "es-MX" });
const page = await ctx.newPage();
const medidas = {};
async function medir(id) {
  if (medidas[id]) return medidas[id];
  await page.goto(pathToFileURL(path.join(MAQ, id + ".html")).href, { waitUntil: "load" });
  await page.waitForTimeout(400);
  const m = await page.evaluate(MEDIR);
  medidas[id] = { ...(await page.evaluate(MEDIDAS)), nodos: m.nodos, profundidad: m.profundidadMax, desbordes: m.desbordes.length, toquesChicos: m.toquesChicos.map((t) => `${t.el} ${t.w}×${t.h}`) };
  return medidas[id];
}
const rotulo = (texto) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="780" height="72"><rect width="780" height="72" fill="#1a1a1a"/><text x="24" y="47" font-family="Helvetica, Arial" font-size="30" font-weight="700" fill="#fff">${texto}</text></svg>`);
for (const [nombre, admin, front] of PAREJAS) {
  await medir(admin);
  if (front) await medir(front);
  const lados = [admin, front];
  const capas = [];
  for (const [i, id] of lados.entries()) {
    capas.push({ input: rotulo(id ? (i ? `Front · ${id}` : `Admin · ${id}`) : "Sin par en el front"), left: i * 800, top: 0 });
    if (id) capas.push({ input: path.join(MAQ, id + ".png"), left: i * 800, top: 72 });
  }
  await sharp({ create: { width: 1580, height: 1760, channels: 3, background: "#e6e4de" } }).composite(capas).png().toFile(path.join(SALIDA, nombre + ".png"));
  console.log(nombre);
}
await browser.close();
fs.writeFileSync(path.join(SALIDA, "medidas.json"), JSON.stringify(medidas, null, 1));
const fila = (id) => {
  const m = medidas[id];
  return { id, cabecera: m.cabecera ? `${m.cabecera.pieza.split(" ")[0]} ${m.cabecera.h}` : "—", atras: m.atras ? `${m.atras.w}×${m.atras.h} @${m.atras.x},${m.atras.y}` : "—", h1: m.titulo ? `${m.titulo.y} ${m.titulo.letra}` : "—", x: m.columna?.x, renglon: m.renglones ? `${m.renglones.altos.join("/")} hueco ${m.renglones.huecos.join("/")}` : "—", abajo: m.barraAbajo ? m.barraAbajo.h : "—", nodos: m.nodos, prof: m.profundidad, sinClase: m.sinClase };
};
console.table(Object.keys(medidas).map(fila));
