// OL-477 (bitácora 509), solo prototipo: dibuja las tarjetas de la semana de Instagram con las piezas de «Crear cartel» y arma sus textos, con los
// casos del respaldo (`RESPALDO_HISTORIAL=1 RESPALDO_INSTAGRAM_SEMANA=1`: las fichas completas y sus fotos dibujadas, nada de la red). Empaqueta
// `instagram-calendario-tarjetas.tsx` con esbuild (los `@/` de la app y `server-only` vacío, como en vitest), lo corre y deja:
//   · `<carpeta-png>/tarjeta-*.png` (1080 de ancho, sin pérdida) — las capturas reales de la bitácora;
//   · `<salida>/tarjetas.json`: cada tarjeta en JPEG de 720 (data URI) para el prototipo, los textos, el aviso previo, los iconos de producción y
//     la revisión de cada tarjeta (textos fuera del lienzo o encimados).
//
//   node scripts/ops/auditoria-ui/prototipo/instagram-calendario-tarjetas.mjs <salida> <carpeta-png>
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
const [SALIDA, PNG] = process.argv.slice(2);
if (!SALIDA || !PNG) { console.error("uso: instagram-calendario-tarjetas.mjs <salida> <carpeta-png>"); process.exit(1); }
fs.mkdirSync(SALIDA, { recursive: true });
fs.mkdirSync(PNG, { recursive: true });

// 1. El empaquetado: junto a este archivo (así encuentra el node_modules del repo) y se borra al terminar.
const paquete = path.join(AQUI, ".instagram-calendario-tarjetas.tmp.mjs");
const vacio = path.join(path.dirname(requerir.resolve("server-only")), "empty.js");
await esbuild.build({
  entryPoints: [path.join(AQUI, "instagram-calendario-tarjetas.tsx")],
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

// 2. Las fotos dibujadas del respaldo (las mismas que sirve a la app) y los datos de las fichas.
const fotos = fs.mkdtempSync(path.join(os.tmpdir(), "ol477-"));
await (await import("../respaldo-local/fotos-historial.mjs")).dibujarFotosHistorial(fotos);
await (await import("../respaldo-local/fotos-instagram.mjs")).dibujarFotosInstagram(fotos);
const { tablas } = await import("../respaldo-local/fixture.mjs");
const sharp = requerir("sharp");
const sharpDe = (b) => sharp(b).resize(112, 112, { fit: "cover" }).jpeg({ quality: 82 }).toBuffer();
const bytes = (url) => fs.readFileSync(path.join(fotos, url.split("/demo-carrusel/")[1]));
const artista = (slug) => tablas.artistas.find((a) => a.slug === slug);
const lugar = (slug) => tablas.lugares.find((l) => l.slug === slug);
const cuentaDe = (redes) => (redes ?? []).map((r) => r.url.match(/instagram\.com\/([^/?#]+)/)?.[1]).find(Boolean) ?? null;
const DISC = { musica: "Música", artes_visuales: "Artes visuales", letras: "Letras", teatro: "Teatro", danza: "Danza" };
const TIPO = { museo: "Museo", galeria: "Galería", foro: "Foro", casa_de_cultura: "Casa de cultura" };

// Los casos (las fechas, las de la semana del reloj fijo de las maquetas: mié 7 de oct de 2026).
const ARTISTAS = {
  valeria: { slug: "valeria-quiroz-demo", saludo: "Valeria", dia: "viernes 16 de octubre", proxima: { cuando: "viernes 16 de octubre, 7:00 pm", corto: "Vie 16 de oct, 7:00 pm · Teatro de la Paz", lugar: "el Teatro de la Paz", cuentaLugar: "teatrodelapazslp" } },
  nube: { slug: "colectivo-nube-de-papel-demo", saludo: "Colectivo Nube de Papel", dia: "lunes 12 de octubre", proxima: null },
  inigo: { slug: "inigo-montalvo-demo", saludo: "Íñigo", dia: "viernes 9 de octubre", proxima: { cuando: "sábado 10 de octubre, 8:00 pm", corto: "Sáb 10 de oct, 8:00 pm · Aether", lugar: "Aether", cuentaLugar: "aether.slp" } },
  renata: { slug: "renata-saldana-demo", saludo: "Renata", dia: "lunes 5 de octubre", proxima: null },
  ximena: { slug: "ximena-urquidi-demo", saludo: "Ximena", dia: "lunes 12 de octubre", proxima: null },
  teodoro: { slug: "teodoro-alcantara-demo" },
};
const LUGARES = {
  leonora: { slug: "museo-leonora-carrington-demo", direccion: "Calzada de Guadalupe 705, Centro", semana: [{ cuando: "sáb 10, 11:00 am", titulo: "Taller de máscaras para familias" }, { cuando: "dom 11, 7:00 pm", titulo: "Visita guiada: Leonora y el teatro" }] },
  ferro: { slug: "museo-del-ferrocarril-jesus-garcia-corona", direccion: "Manuel José Othón s/n, Centro Histórico", semana: [] },
};

const salida = { tarjetas: {}, textos: {}, avisos: {}, revision: {}, fichas: {}, iconos: T.iconos(["IconoInstagram", "IconoFacebook", "IconoReloj", "IconoCalendario", "IconoPin", "IconoOk", "IconoEnlace", "IconoOjo", "IconoPersonas", "IconoCompartir", "IconoBasura", "IconoGiro", "IconoBandera", "IconoChevronDerecha", "IconoTexto"]) };
const guardar = (clave, d, formato) => {
  fs.writeFileSync(path.join(PNG, `tarjeta-${clave}-${formato}.png`), d.png);
  salida.tarjetas[`${clave}-${formato}`] = { src: "data:image/jpeg;base64," + d.jpeg.toString("base64"), paleta: d.paleta };
  salida.revision[`${clave}-${formato}`] = formato === "4x5" || formato === "9x16" ? T.revisarNodos(d, formato) : [];
};
for (const [clave, c] of Object.entries(ARTISTAS)) {
  const a = artista(c.slug);
  const cuenta = cuentaDe(a.redes);
  const ceja = `${DISC[a.disciplina]} · ${a.detalle}`;
  const fotoSrc = "data:image/jpeg;base64," + (await sharpDe(bytes(a.foto))).toString("base64");
  salida.fichas[clave] = { nombre: a.nombre, slug: a.slug, ceja, ciudad: a.ciudad, cuenta, fotoSrc, disciplina: a.disciplina, descripcion: a.descripcion, proxima: c.proxima?.corto ?? null };
  if (!c.saludo) continue;
  for (const formato of ["4x5", "9x16"]) {
    if (formato === "9x16" && !["valeria", "nube"].includes(clave)) continue;
    guardar(clave, await T.dibujarTarjeta({ tipo: "artista", formato, portada: bytes(a.portada), foto: bytes(a.foto), nombre: a.nombre, ceja, ciudad: a.ciudad, cuenta, proxima: c.proxima?.corto ?? null }), formato);
  }
  salida.textos[clave] = T.textoArtista({ nombre: a.nombre, slug: a.slug, descripcion: a.descripcion, disciplina: a.disciplina, ceja, ciudad: a.ciudad, cuenta, proxima: c.proxima });
  salida.avisos[clave] = T.avisoPrevio({ saludo: c.saludo, dia: c.dia, ficha: `somosnosotrxs.org/artistas/${a.slug}` });
}
for (const [clave, c] of Object.entries(LUGARES)) {
  const l = lugar(c.slug);
  const cuenta = cuentaDe(l.redes);
  const semana = c.semana.length ? `Esta semana: ${c.semana.length} ${c.semana.length === 1 ? "evento" : "eventos"}` : null;
  salida.fichas[clave] = { nombre: l.nombre, slug: l.slug, ceja: TIPO[l.tipo], ciudad: l.ciudad, cuenta, foto: l.portada, semana };
  for (const formato of ["4x5", "9x16"]) {
    if (formato === "9x16" && clave !== "leonora") continue;
    guardar(clave, await T.dibujarTarjeta({ tipo: "lugar", formato, portada: bytes(l.portada), nombre: l.nombre, ceja: TIPO[l.tipo], ciudad: l.ciudad, cuenta, semana }), formato);
  }
  salida.textos[clave] = T.textoLugar({ nombre: l.nombre, slug: l.slug, descripcion: l.descripcion, ceja: TIPO[l.tipo], tipo: l.tipo, ciudad: l.ciudad, direccion: c.direccion, cuenta, semana: c.semana });
}
guardar("semana-8", await T.dibujarPortadaSemana({ ciudad: "San Luis Potosí", titulo: "Del viernes 9 al domingo 11 de octubre", eventos: [{ cuando: "Vie 9 · 10:00 am", titulo: "Cine de barrio: ciclo Fellini" }, { cuando: "Sáb 10 · 6:00 pm", titulo: "Delirium Pollum, clown y pantomima con Pimpolina" }, { cuando: "Dom 11 · 7:00 pm", titulo: "LXS COLOCAOS: La última fogueada" }] }), "4x5");
guardar("semana-15", await T.dibujarPortadaSemana({ ciudad: "San Luis Potosí", titulo: "Del viernes 16 al domingo 18 de octubre", eventos: [{ cuando: "Vie 16 · 7:00 pm", titulo: "Valeria Quiroz: canciones nuevas" }, { cuando: "Sáb 17 · 7:00 pm", titulo: "OCA" }, { cuando: "Dom 18 · 8:00 pm", titulo: "DESIERTO: Observación y Espacio" }] }), "4x5");
for (const [clave, texto] of Object.entries(salida.textos)) salida.revision[`texto-${clave}`] = T.revisarTexto(texto);
fs.writeFileSync(path.join(SALIDA, "tarjetas.json"), JSON.stringify(salida));
fs.rmSync(fotos, { recursive: true, force: true });
for (const [k, v] of Object.entries(salida.revision)) console.log(k, Array.isArray(v) ? (v.length ? v.join(" | ") : "bien") : `${v.caracteres} letras · ${v.hashtags} # · ${v.menciones} @ · ${v.problema ?? "bien"}`);
