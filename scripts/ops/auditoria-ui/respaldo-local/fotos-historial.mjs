// OL-469 (bitácora 501): las fotos y los carteles inventados del historial grande (`RESPALDO_HISTORIAL=1`), que el respaldo sirve desde
// `RESPALDO_CARRUSEL_DIR` como `demo-carrusel/<nombre>.jpg`: la portada del museo y de cada lugar de San Luis (3:2, una forma de un color), la
// foto de siete artistas (cuadrada, con sus iniciales; dos no tienen) y la portada de Valeria Quiroz, y seis carteles 4:5. Nada sale de la red.
//   await dibujarFotosHistorial(carpeta)  →  la lista de archivos
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(new URL("../../../../node_modules/", import.meta.url));
const sharp = require("sharp");

const LUGARES = ["#7b4b2a", "#2f5d62", "#5b3f8c", "#8c3f3f", "#3f6b3a", "#6b5a2a", "#2a4f6b", "#6b2a55", "#4a4a4a"];
const ARTISTAS = [
  ["valeria", "VQ", "#b2452f", "#ffe7c7"],
  ["inigo", "IM", "#1f4e5f", "#cdeffd"],
  ["renata", "RS", "#6b3d8f", "#f1dcff"],
  ["ecos", "ET", "#2e6b3b", "#d9f7d2"],
  ["ximena", "XU", "#8f6a1f", "#fff2c2"],
  ["teodoro", "TA", "#3b3b3b", "#f2f2f2"],
  ["nube", "NP", "#1f3d8f", "#d5e2ff"],
];
const CARTELES = [
  ["Surrealismo", "#20152e", "#f0b04a"],
  ["Noche de museos", "#0e2a33", "#7fe0d0"],
  ["Concierto", "#3a0f12", "#ffb3a0"],
  ["Lectura", "#f2ead8", "#3b2a14"],
  ["Gráfica", "#13301c", "#c8f0a0"],
  ["Foro", "#2a2a2a", "#ffd34d"],
];

export async function dibujarFotosHistorial(carpeta) {
  const hechos = [];
  const guardar = async (nombre, svg) => {
    const archivo = path.join(carpeta, `${nombre}.jpg`);
    await sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toFile(archivo);
    hechos.push(archivo);
  };
  const portada = (fondo, i) => `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="${fondo}"/><circle cx="${250 + i * 45}" cy="300" r="170" fill="#ffffff" fill-opacity="0.18"/><rect x="520" y="160" width="240" height="280" rx="24" fill="#ffffff" fill-opacity="0.12"/><text x="870" y="44" fill="#ffffff" fill-opacity="0.55" font-family="Helvetica, Arial" font-size="22" text-anchor="end">(demo) · foto inventada</text></svg>`;
  for (let i = 0; i < LUGARES.length; i++) await guardar(`hist-lugar-${i + 1}`, portada(LUGARES[i], i));
  await guardar("hist-leonora", `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="#1d2b3a"/><circle cx="300" cy="260" r="150" fill="#e9c46a"/><path d="M520 470 L640 150 L760 470 Z" fill="#e76f51"/><rect x="0" y="470" width="900" height="130" fill="#264653"/><text x="870" y="44" fill="#ffffff" fill-opacity="0.55" font-family="Helvetica, Arial" font-size="22" text-anchor="end">(demo) · foto inventada</text></svg>`);
  await guardar("hist-valeria-portada", `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="#b2452f"/><circle cx="450" cy="300" r="210" fill="none" stroke="#ffe7c7" stroke-width="22"/><circle cx="450" cy="300" r="120" fill="#ffe7c7" fill-opacity="0.3"/></svg>`);
  for (const [clave, iniciales, fondo, tinta] of ARTISTAS) {
    await guardar(`hist-artista-${clave}`, `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="360"><rect width="360" height="360" fill="${fondo}"/><circle cx="180" cy="140" r="70" fill="${tinta}" fill-opacity="0.35"/><path d="M60 360 C70 250 290 250 300 360 Z" fill="${tinta}" fill-opacity="0.35"/><text x="180" y="330" fill="${tinta}" font-family="Helvetica, Arial" font-weight="700" font-size="54" text-anchor="middle">${iniciales}</text></svg>`);
  }
  for (let i = 0; i < CARTELES.length; i++) {
    const [titulo, fondo, tinta] = CARTELES[i];
    await guardar(`hist-cartel-${i}`, `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><rect width="800" height="1000" fill="${fondo}"/><circle cx="400" cy="380" r="200" fill="none" stroke="${tinta}" stroke-width="20"/><text x="400" y="760" fill="${tinta}" font-family="Helvetica, Arial" font-weight="700" font-size="76" text-anchor="middle">${titulo}</text><text x="400" y="940" fill="${tinta}" font-family="Helvetica, Arial" font-size="28" text-anchor="middle">(demo) · cartel inventado</text></svg>`);
  }
  return hechos;
}
