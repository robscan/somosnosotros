// OL-490 (bitácora 522), solo prototipo: dibuja las tarjetas del estilo propio «Somos Nosotrxs» (tres variantes, A · B · C) con las fichas del
// respaldo local (`RESPALDO_HISTORIAL=1 RESPALDO_INSTAGRAM_SEMANA=1`: sus fotos dibujadas, nada de la red) y arma el prototipo con el armazón de
// propuestas. Empaqueta `instagram-estilo-propio.tsx` con esbuild (los `@/` de la app y `server-only` vacío, como en vitest) y deja:
//   · `docs/rediseno/capturas-522/<variante>-<caso>-<formato>.png` (1080 de ancho, sin pérdida): las tarjetas reales;
//   · `docs/rediseno/prototipos/instagram-estilo-propio.html`: el prototipo, con cada tarjeta en JPEG de 540 dentro (data URI), la de hoy
//     (`capturas-509`) y las portadas del sistema de Inicio (`capturas-522/inicio-*.png`, recortadas de la maqueta real) para comparar.
//
//   node scripts/ops/auditoria-ui/prototipo/instagram-estilo-propio.mjs
//   node scripts/ops/auditoria-ui/prototipo/instagram-estilo-propio.mjs --solo-tercera   (dibuja solo la tercera vuelta, `A3-*`, y arma el
//     prototipo con las tarjetas A/B/C y A2 que ya están en `capturas-522/` y sus medidas, sin volver a dibujarlas)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

process.env.RESPALDO_HISTORIAL = "1";
process.env.RESPALDO_INSTAGRAM_SEMANA = "1";
const AQUI = path.dirname(new URL(import.meta.url).pathname);
const RAIZ = path.resolve(AQUI, "../../../..");
const requerir = createRequire(path.join(RAIZ, "package.json"));
const esbuild = requerir("esbuild");
const sharp = requerir("sharp");
const PNG = path.join(RAIZ, "docs/rediseno/capturas-522");
const HTML = path.join(RAIZ, "docs/rediseno/prototipos/instagram-estilo-propio.html");
fs.mkdirSync(PNG, { recursive: true });
process.chdir(RAIZ);

// 1. El empaquetado: junto a este archivo (así encuentra el node_modules del repo) y se borra al terminar.
const paquete = path.join(AQUI, ".instagram-estilo-propio.tmp.mjs");
const vacio = path.join(path.dirname(requerir.resolve("server-only")), "empty.js");
await esbuild.build({
  entryPoints: [path.join(AQUI, "instagram-estilo-propio.tsx")],
  bundle: true, platform: "node", format: "esm", outfile: paquete, jsx: "automatic", packages: "external", logLevel: "error",
  plugins: [{ name: "alias", setup(b) {
    b.onResolve({ filter: /^server-only$/ }, () => ({ path: vacio }));
    b.onResolve({ filter: /^@\// }, (a) => {
      const base = path.join(RAIZ, "src", a.path.slice(2));
      const hallado = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"].map((x) => base + x).find((x) => fs.existsSync(x) && fs.statSync(x).isFile());
      return hallado ? { path: hallado } : undefined;
    });
  } }],
});
let T;
try {
  T = await import(paquete + "?v=" + Date.now());
} finally {
  fs.rmSync(paquete, { force: true });
}

// 2. Las fotos dibujadas del respaldo (las mismas que sirve a la app) y las fichas.
const fotos = fs.mkdtempSync(path.join(os.tmpdir(), "ol490-"));
await (await import("../respaldo-local/fotos-historial.mjs")).dibujarFotosHistorial(fotos);
await (await import("../respaldo-local/fotos-instagram.mjs")).dibujarFotosInstagram(fotos);
const { tablas } = await import("../respaldo-local/fixture.mjs");
const bytes = (url) => (url ? fs.readFileSync(path.join(fotos, url.split("/demo-carrusel/")[1])) : null);
const artista = (slug) => tablas.artistas.find((a) => a.slug === slug);
const lugar = (slug) => tablas.lugares.find((l) => l.slug === slug);
const cuentaDe = (redes) => (redes ?? []).map((r) => r.url.match(/instagram\.com\/([^/?#]+)/)?.[1]).find(Boolean) ?? null;
const DISC = { musica: "Música", artes_visuales: "Artes visuales", letras: "Letras", teatro: "Teatro", danza: "Danza" };
const TIPO = { museo: "Museo", galeria: "Galería", foro: "Foro", casa_de_cultura: "Casa de cultura" };
const fichaArtista = (slug, extra = {}) => {
  const a = artista(slug);
  return { tipo: "artista", id: a.id, nombre: a.nombre, ceja: [DISC[a.disciplina], a.detalle].filter(Boolean).join(" · "), ciudad: a.ciudad, cuenta: cuentaDe(a.redes), foto: bytes(a.foto), portada: bytes(a.portada), proxima: null, semana: null, ...extra };
};
const fichaLugar = (slug, extra = {}) => {
  const l = lugar(slug);
  return { tipo: "lugar", id: l.id, nombre: l.nombre, ceja: TIPO[l.tipo], ciudad: l.ciudad, cuenta: cuentaDe(l.redes), foto: bytes(l.portada), portada: bytes(l.portada), proxima: null, semana: null, ...extra };
};

// Los casos (las fechas, las de la semana del reloj fijo de las maquetas: mié 7 de oct de 2026).
const CASOS = {
  // Cálida: la portada de Valeria (círculos sobre terracota), con fecha próxima.
  artista: fichaArtista("valeria-quiroz-demo", { proxima: { mes: "oct", dia: "16", texto: "Vie 16 de oct, 7:00 pm · Teatro de la Paz" } }),
  // Fría: la portada del Teatro de la Paz (verde azulado), con eventos esta semana (dato de muestra).
  lugar: fichaLugar("teatro-de-la-paz", { semana: "Esta semana: 2 eventos" }),
  // La banda clara: la portada del museo Leonora Carrington; su color más vivo es el sol amarillo, y el amarillo va con negro (como en Inicio).
  clara: fichaLugar("museo-leonora-carrington-demo", { semana: "Esta semana: 2 eventos" }),
  // Sin portada ni foto: una ficha real del respaldo (el color sale del respaldo del sistema; en la figura, el símbolo SN).
  sinportada: fichaArtista("aaron-cadena"),
  // El nombre largo (41 letras): dos renglones.
  largo: fichaLugar("museo-del-ferrocarril-jesus-garcia-corona"),
};
const SEMANA = {
  id: "semana-san-luis-potosi-2026-10-09",
  ciudad: "San Luis Potosí",
  titulo: "Del viernes 9 al domingo 11 de octubre",
  mes: "oct",
  dias: "9–11",
  barras: ["Vie 9", "Sáb 10", "Dom 11"],
  eventos: [
    { cuando: "Vie 9 · 10:00 am", titulo: "Cine de barrio: ciclo Fellini" },
    { cuando: "Sáb 10 · 6:00 pm", titulo: "Delirium Pollum, clown y pantomima con Pimpolina" },
    { cuando: "Dom 11 · 7:00 pm", titulo: "LXS COLOCAOS: La última fogueada" },
  ],
};
const QUE = [
  ["artista", "4x5"], ["lugar", "4x5"], ["semana", "4x5"], ["artista", "9x16"], ["lugar", "9x16"], ["semana", "9x16"], ["clara", "4x5"], ["sinportada", "4x5"], ["largo", "4x5"],
];

if (process.argv.includes("--colores")) {
  for (const a of [...tablas.artistas, ...tablas.lugares].filter((x) => x.portada && x.portada.includes("/demo-carrusel/"))) {
    const c = await T.colorDeFicha(bytes(a.portada), a.id);
    console.log(a.slug, a.portada.split("/").pop(), JSON.stringify(c.colores), "→", c.origen, c.base, c.banda);
  }
  process.exit(0);
}
const tarjetas = {};
const revision = {};
const soloVariante = process.argv.find((a) => a.startsWith("--solo="))?.slice(7);
const soloTercera = process.argv.includes("--solo-tercera");
const jpgDe = async (archivo, ancho = 540) => "data:image/jpeg;base64," + (await sharp(archivo).resize({ width: ancho }).jpeg({ quality: 84, chromaSubsampling: "4:4:4" }).toBuffer()).toString("base64");
if (soloTercera) {
  // Las tarjetas A/B/C ya dibujadas: su PNG pasa a JPEG de 540 y su color y revisión salen de `medidas.json`.
  const m = JSON.parse(fs.readFileSync(path.join(PNG, "medidas.json"), "utf8"));
  for (const v of ["A", "B", "C"])
    for (const [caso, formato] of QUE) {
      const clave = `${v}-${caso}-${formato}`;
      tarjetas[clave] = { src: await jpgDe(path.join(PNG, `${clave}.png`)), color: m.colores[clave] };
      revision[clave] = m.revision[clave];
    }
}
for (const v of soloTercera ? [] : ["A", "B", "C"]) {
  if (soloVariante && !soloVariante.includes(v)) continue;
  for (const [caso, formato] of QUE) {
    const cosa = caso === "semana" ? { tipo: "semana", s: SEMANA } : { tipo: CASOS[caso].tipo, f: CASOS[caso] };
    const d = await T.dibujar(v, formato, cosa);
    const clave = `${v}-${caso}-${formato}`;
    fs.writeFileSync(path.join(PNG, `${clave}.png`), d.png);
    tarjetas[clave] = { src: "data:image/jpeg;base64," + d.jpeg.toString("base64"), color: d.color };
    revision[clave] = T.revisar(d, formato);
    console.log(clave, d.color.deDonde, d.color.origen, "→", d.color.base, d.color.banda, "·", revision[clave].length ? revision[clave].join(" | ") : "bien");
  }
}
fs.rmSync(fotos, { recursive: true, force: true });

// 3. Los nombres: de 8 a 72 letras, cuántos renglones y a qué tamaño (la regla: nada cortado hasta 32; los más largos, en dos renglones).
const NOMBRES = ["Ana Paz", "Íñigo Montalvo", "Valeria Quiroz (demo)", "Colectivo Nube de Papel (demo)", "Orquesta Típica de San Luis Potosí", "ORQUESTA MEXICANA DE MÚSICA MAYA", "Colectivo Mamá Wambú Mujeres Mimo", "Compañía Nacional de Danza Folklórica", "Museo del Ferrocarril Jesús García Corona", "Centro de las Artes de San Luis Potosí Centenario", "Museo Federico Silva, Escultura Contemporánea de San Luis Potosí"];
const nombres = T.medirNombres(NOMBRES);
for (const n of nombres) console.log(`${String(n.letras).padStart(2)} letras · ${n.renglones} renglón(es) a ${n.tamano} px${n.recortado ? " · CORTADO" : ""} · ${n.nombre}`);
if (!soloTercera) fs.writeFileSync(path.join(PNG, "medidas.json"), JSON.stringify({ nombres, revision, colores: Object.fromEntries(Object.entries(tarjetas).map(([k, t]) => [k, t.color])) }, null, 1));

// 3b. Segunda vuelta (solo A): fichas reales con sus fotos del Storage público (se bajan con fetch y se guardan en una carpeta temporal), la
// razón de la publicación arriba del nombre y la línea opcional con una frase de la descripción, con y sin ella.
const REALES = JSON.parse(fs.readFileSync(path.join(AQUI, "instagram-estilo-propio.reales.json"), "utf8"));
const cache = path.join(os.tmpdir(), "ol490-reales");
fs.mkdirSync(cache, { recursive: true });
async function bajar(ruta) {
  if (!ruta) return null;
  const archivo = path.join(cache, ruta.replace(/[^a-z0-9.-]+/gi, "_"));
  if (!fs.existsSync(archivo)) {
    const r = await fetch(REALES.base + ruta);
    if (!r.ok) throw new Error(`no se pudo bajar ${ruta}: ${r.status}`);
    fs.writeFileSync(archivo, Buffer.from(await r.arrayBuffer()));
  }
  return fs.readFileSync(archivo);
}
const segunda = { tarjetas: {}, revision: {}, fichas: {} };
const guardarA2 = (clave, d, formato) => {
  fs.writeFileSync(path.join(PNG, `A2-${clave}.png`), d.png);
  segunda.tarjetas[clave] = { src: "data:image/jpeg;base64," + d.jpeg.toString("base64"), color: d.color };
  segunda.revision[clave] = T.revisar(d, formato);
  console.log(`A2-${clave}`, d.color.deDonde, d.color.origen, "→", d.color.base, d.color.banda, "·", segunda.revision[clave].length ? segunda.revision[clave].join(" | ") : "bien");
};
if (soloTercera) {
  // La segunda vuelta ya dibujada: sus PNG y `medidas-A2.json`.
  const m = JSON.parse(fs.readFileSync(path.join(PNG, "medidas-A2.json"), "utf8"));
  Object.assign(segunda.fichas, m.fichas);
  for (const clave of Object.keys(m.colores)) {
    segunda.tarjetas[clave] = { src: await jpgDe(path.join(PNG, `A2-${clave}.png`)), color: m.colores[clave] };
    segunda.revision[clave] = m.revision[clave];
  }
} else if (!process.argv.includes("--sin-segunda")) {
  for (const a of REALES.artistas) {
    const f = { tipo: "artista", id: a.slug, nombre: a.nombre, ceja: [a.disciplina, a.detalle].filter(Boolean).join(" · "), ciudad: a.ciudad, cuenta: a.cuenta, foto: await bajar(a.foto), portada: await bajar(a.portada), proxima: a.proxima ?? null, razon: a.razon, frase: T.fraseDe(a.descripcion) };
    segunda.fichas[a.clave] = { nombre: a.nombre, razon: a.razon, frase: f.frase, letras: [...a.nombre].length };
    guardarA2(`${a.clave}-frase-4x5`, await T.dibujar("A", "4x5", { tipo: "artista", f }), "4x5");
    guardarA2(`${a.clave}-sin-frase-4x5`, await T.dibujar("A", "4x5", { tipo: "artista", f: { ...f, frase: null } }), "4x5");
    guardarA2(`${a.clave}-frase-9x16`, await T.dibujar("A", "9x16", { tipo: "artista", f }), "9x16");
  }
  for (const l of REALES.lugares) {
    const img = await bajar(l.portada);
    const f = { tipo: "lugar", id: l.slug, nombre: l.nombre, ceja: l.tipo, ciudad: l.ciudad, cuenta: l.cuenta, foto: img, portada: img, semana: l.semana ?? null, razon: l.razon, frase: T.fraseDe(l.descripcion) };
    segunda.fichas[l.clave] = { nombre: l.nombre, razon: l.razon, frase: f.frase, letras: [...l.nombre].length };
    guardarA2(`${l.clave}-frase-4x5`, await T.dibujar("A", "4x5", { tipo: "lugar", f }), "4x5");
    guardarA2(`${l.clave}-sin-frase-4x5`, await T.dibujar("A", "4x5", { tipo: "lugar", f: { ...f, frase: null } }), "4x5");
    guardarA2(`${l.clave}-frase-9x16`, await T.dibujar("A", "9x16", { tipo: "lugar", f }), "9x16");
  }
  const sm = REALES.semana;
  const sem = { id: sm.id, ciudad: sm.ciudad, titulo: sm.titulo, mes: "nov", dias: "6–8", barras: sm.eventos.map((e) => e.dia), eventos: sm.eventos.map((e) => ({ cuando: e.cuando, titulo: e.titulo })), carteles: await Promise.all(sm.eventos.map((e) => bajar(e.cartel))) };
  for (const formato of ["4x5", "9x16"]) guardarA2(`semana-${formato}`, await T.dibujar("A", formato, { tipo: "semana", s: sem }), formato);
  fs.writeFileSync(path.join(PNG, "medidas-A2.json"), JSON.stringify({ fichas: segunda.fichas, revision: segunda.revision, colores: Object.fromEntries(Object.entries(segunda.tarjetas).map(([k, t]) => [k, t.color])) }, null, 1));
}

// 3c. Tercera vuelta (solo A, «Repisa» sin portada): el artista con su foto de perfil (el color sale de ella; si es casi gris, el respaldo); el
// lugar en dos opciones, L1 (el arco con el símbolo SN en color, sin foto: el color, del respaldo por su id) y L2 (el arco con su portada, de la
// que sale el color; sin portada, cae en L1); «Esta semana» real con sus tres carteles. Cada caso en 4:5 con y sin la línea, y en 9:16 con ella.
const TERCERA = JSON.parse(fs.readFileSync(path.join(AQUI, "instagram-estilo-propio.tercera.json"), "utf8"));
const tercera = { tarjetas: {}, revision: {}, fichas: {} };
const guardarA3 = (clave, d, formato) => {
  fs.writeFileSync(path.join(PNG, `A3-${clave}.png`), d.png);
  tercera.tarjetas[clave] = { src: "data:image/jpeg;base64," + d.jpeg.toString("base64"), color: d.color };
  tercera.revision[clave] = T.revisar(d, formato);
  console.log(`A3-${clave}`, d.color.deDonde, d.color.origen, "→", d.color.base, d.color.banda, "·", tercera.revision[clave].length ? tercera.revision[clave].join(" | ") : "bien");
};
const bajar3 = async (ruta) => {
  if (!ruta) return null;
  const archivo = path.join(cache, ruta.replace(/[^a-z0-9.-]+/gi, "_"));
  if (!fs.existsSync(archivo)) {
    const r = await fetch(TERCERA.base + ruta);
    if (!r.ok) throw new Error(`no se pudo bajar ${ruta}: ${r.status}`);
    fs.writeFileSync(archivo, Buffer.from(await r.arrayBuffer()));
  }
  return fs.readFileSync(archivo);
};
/** Las tres tarjetas de un caso: 4:5 con la línea, 4:5 sin ella y 9:16 con ella (sin descripción en la ficha, «sin-linea» en los dos formatos). */
async function tresDe(prefijo, cosa) {
  const f = cosa.f;
  if (f.frase) {
    guardarA3(`${prefijo}-con-linea-4x5`, await T.dibujar("A", "4x5", cosa), "4x5");
    guardarA3(`${prefijo}-sin-linea-4x5`, await T.dibujar("A", "4x5", { ...cosa, f: { ...f, frase: null } }), "4x5");
    guardarA3(`${prefijo}-con-linea-9x16`, await T.dibujar("A", "9x16", cosa), "9x16");
  } else {
    guardarA3(`${prefijo}-sin-linea-4x5`, await T.dibujar("A", "4x5", cosa), "4x5");
    guardarA3(`${prefijo}-sin-linea-9x16`, await T.dibujar("A", "9x16", cosa), "9x16");
  }
}
for (const a of TERCERA.artistas) {
  const foto = await bajar3(a.foto);
  const f = { tipo: "artista", id: a.clave, nombre: a.nombre, ceja: [a.disciplina, a.detalle].filter(Boolean).join(" · "), ciudad: a.ciudad, cuenta: a.cuenta, foto, portada: foto, colorDe: "foto", proxima: a.proxima ?? null, razon: a.razon, frase: T.fraseDe(a.descripcion) };
  tercera.fichas[`artista-${a.clave}`] = { nombre: a.nombre, razon: a.razon, frase: f.frase, que: a.que, letras: [...a.nombre].length };
  await tresDe(`artista-${a.clave}`, { tipo: "artista", f });
}
for (const l of TERCERA.lugares) {
  const img = await bajar3(l.portada);
  const base = { tipo: "lugar", id: l.clave, nombre: l.nombre, ceja: l.tipo, ciudad: l.ciudad, cuenta: l.cuenta, semana: null, razon: l.razon, frase: T.fraseDe(l.descripcion) };
  tercera.fichas[`lugar-${l.clave}`] = { nombre: l.nombre, razon: l.razon, frase: base.frase, que: l.que, letras: [...l.nombre].length, portada: !!img, credito: l.credito ?? null };
  // L1: ninguna imagen; el color, del respaldo del sistema por el id.
  await tresDe(`lugar-L1-${l.clave}`, { tipo: "lugar", f: { ...base, foto: null, portada: null, snEnColor: true } });
  // L2: la portada en el arco y el color de ella; sin portada no hay L2 (sería igual a L1).
  if (img) await tresDe(`lugar-L2-${l.clave}`, { tipo: "lugar", f: { ...base, foto: img, portada: img, colorDe: "portada" } });
}
{
  const sm = TERCERA.semana;
  const sem = { id: sm.id, ciudad: sm.ciudad, titulo: sm.titulo, mes: "oct", dias: "30–1", barras: sm.eventos.map((e) => e.dia), eventos: sm.eventos.map((e) => ({ cuando: e.cuando, titulo: e.titulo })), carteles: await Promise.all(sm.eventos.map((e) => bajar3(e.cartel))), tope45: true };
  for (const formato of ["4x5", "9x16"]) guardarA3(`semana-${formato}`, await T.dibujar("A", formato, { tipo: "semana", s: sem }), formato);
  tercera.fichas.semana = { titulo: sm.titulo, eventos: sm.eventos.map((e) => `${e.cuando} · ${e.titulo}`) };
}
fs.writeFileSync(path.join(PNG, "medidas-A3.json"), JSON.stringify({ fichas: tercera.fichas, revision: tercera.revision, colores: Object.fromEntries(Object.entries(tercera.tarjetas).map(([k, t]) => [k, t.color])) }, null, 1));

if (soloVariante) process.exit(0);

// 4. Al prototipo: las tarjetas, las de hoy y las portadas del sistema de Inicio.
const jpg = async (archivo, ancho = 540) => "data:image/jpeg;base64," + (await sharp(archivo).resize({ width: ancho }).jpeg({ quality: 84 }).toBuffer()).toString("base64");
const hoy = {
  artista: await jpg(path.join(RAIZ, "docs/rediseno/capturas-509/tarjeta-valeria-4x5.png")),
  lugar: await jpg(path.join(RAIZ, "docs/rediseno/capturas-509/tarjeta-leonora-4x5.png")),
  semana: await jpg(path.join(RAIZ, "docs/rediseno/capturas-509/tarjeta-semana-8-4x5.png")),
  "artista-9x16": await jpg(path.join(RAIZ, "docs/rediseno/capturas-509/tarjeta-valeria-9x16.png")),
  "lugar-9x16": await jpg(path.join(RAIZ, "docs/rediseno/capturas-509/tarjeta-leonora-9x16.png")),
};
const inicio = {};
for (const a of fs.readdirSync(PNG).filter((x) => x.startsWith("inicio-") && x.endsWith(".png"))) inicio[a.replace(/\.png$/, "")] = await jpg(path.join(PNG, a), 330);
const plantilla = fs.readFileSync(path.join(AQUI, "instagram-estilo-propio.plantilla.html"), "utf8");
const datos = JSON.stringify({ tarjetas, revision, nombres, hoy, inicio, segunda, tercera }).replace(/</g, "\\u003c");
fs.writeFileSync(HTML, plantilla.replace("/*__DATOS__*/null", datos));
console.log("prototipo", HTML, Math.round(fs.statSync(HTML).size / 1024), "KB");
