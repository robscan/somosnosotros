// OL-464 (bitácora 496): los carteles inventados del festival del carrusel (`RESPALDO_CARRUSEL_IG=1`), que el respaldo sirve desde
// `RESPALDO_CARRUSEL_DIR` como `demo-carrusel/<nombre>.jpg`. El marco y diez actos, cada uno de un color y una medida (4:5, cuadrados,
// verticales y apaisados). La Fogata trae `acto-8-copia.jpg`: el cartel de los Tambores re-codificado (otra dirección y otros bytes, la misma
// imagen), como las copias que guarda `ponerCartel` al aceptar cada acto; el carrusel debe reconocerla por su huella y no repetirla.
//   await dibujarCartelesCarrusel(carpeta)  →  la lista de archivos
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(new URL("../../../../node_modules/", import.meta.url));
const sharp = require("sharp");

const MEDIDAS = { "4x5": [1080, 1350], "1x1": [1080, 1080], "9x16": [1080, 1920], "3x2": [1200, 800] };
const DIBUJOS = [
  ["marco", "Cultura Mística", "9 al 11 de oct · Aether", "#2b1846", "#f4c95d", "4x5"],
  ["acto-1", "Meditación", "vie 9 · 5:30 pm", "#123c3a", "#c8f1e4", "1x1"],
  ["acto-2", "Taller de escritura", "vie 9 · 6:30 pm", "#f1e3c8", "#4a2a12", "4x5"],
  ["acto-3", "Charla de tarot", "vie 9 · 9:00 pm", "#3b0d2c", "#f7b2d9", "9x16"],
  ["acto-4", "Yoga kundalini", "sáb 10 · 11:00 am", "#e7f0d2", "#2f4a10", "3x2"],
  ["acto-5", "Mercadito místico", "sáb 10 · 1:00 pm", "#7a2e12", "#ffe2c2", "4x5"],
  ["acto-6", "Ceremonia de cacao", "sáb 10 · 5:00 pm", "#3d2314", "#e9c08f", "1x1"],
  ["acto-7", "Lectura de cartas", "sáb 10 · 7:00 pm", "#0e1f4d", "#9fc0ff", "4x5"],
  ["acto-8", "Tambores y fogata", "sáb 10 y dom 11", "#1b1b1b", "#ff8a3d", "9x16"],
  ["acto-9", "Astrología básica", "dom 11 · 12:00 pm", "#2d0f57", "#e2d0ff", "3x2"],
  ["acto-10", "Concierto de cuencos", "dom 11 · 6:00 pm", "#0f3d2a", "#b7f5d2", "4x5"],
];

export async function dibujarCartelesCarrusel(carpeta) {
  const hechos = [];
  for (const [nombre, titulo, cuando, fondo, tinta, medida] of DIBUJOS) {
    const [w, h] = MEDIDAS[medida];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${fondo}"/>
      <circle cx="${w / 2}" cy="${h * 0.36}" r="${Math.min(w, h) * 0.2}" fill="none" stroke="${tinta}" stroke-width="18"/>
      <text x="${w / 2}" y="${h * 0.7}" font-family="Helvetica, Arial" font-weight="700" font-size="${Math.round(w / 13)}" fill="${tinta}" text-anchor="middle">${titulo}</text>
      <text x="${w / 2}" y="${h * 0.7 + w / 11}" font-family="Helvetica, Arial" font-size="${Math.round(w / 24)}" fill="${tinta}" text-anchor="middle">${cuando}</text>
      <text x="${w / 2}" y="${h * 0.95}" font-family="Helvetica, Arial" font-size="${Math.round(w / 34)}" fill="${tinta}" text-anchor="middle">(demo) · cartel inventado</text></svg>`;
    const archivo = path.join(carpeta, `${nombre}.jpg`);
    await sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toFile(archivo);
    hechos.push(archivo);
  }
  // La copia: el de los Tambores, más chico y a otra calidad (lo que dejaría otra aceptación del mismo cartel).
  const copia = path.join(carpeta, "acto-8-copia.jpg");
  await sharp(path.join(carpeta, "acto-8.jpg")).resize(900).jpeg({ quality: 68, mozjpeg: true }).toFile(copia);
  hechos.push(copia);
  return hechos;
}
