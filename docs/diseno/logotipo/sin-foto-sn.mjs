// Imagen de lo que no tiene portada (evento, lugar o artista): el símbolo SN final del founder al centro, sobre el gris de
// miniatura de la línea gráfica, opaca. Se genera una vez y la app la usa como cualquier foto: nunca se compone en vivo
// (founder, 2026-09-16). Lo de artistas la recorta en círculo con su contenedor. Uso, desde la raíz del repo:
//   node docs/diseno/logotipo/sin-foto-sn.mjs
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const raiz = process.cwd();
const simbolo = fs.readFileSync(path.join(raiz, "docs/diseno/logotipo/LogoFinal/SN - Symbol.svg"), "utf8");
const [, vbx, vby, vbw, vbh] = simbolo.match(/viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"/).map(Number);
const d = simbolo.match(/ d="([^"]+)"/)[1];
const FONDO = "#e6e6e2"; // --fondo-miniatura
const TINTA = "#b1b0a9"; // se lee a 48 px sin competir con las fotos de al lado

/** Guarda en `rel` un PNG de `ancho`×`alto` con el símbolo centrado; su alto es `proporcion` del lado corto. */
async function imagen(rel, ancho, alto, proporcion) {
  const h = Math.min(ancho, alto) * proporcion;
  const w = (h * vbw) / vbh;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}"><rect width="${ancho}" height="${alto}" fill="${FONDO}"/>` +
    `<svg x="${(ancho - w) / 2}" y="${(alto - h) / 2}" width="${w}" height="${h}" viewBox="${vbx} ${vby} ${vbw} ${vbh}"><path fill="${TINTA}" d="${d}"/></svg></svg>`;
  const buf = await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true }).toBuffer();
  fs.writeFileSync(path.join(raiz, rel), buf);
  console.log(rel, `${ancho}×${alto}`, buf.length, "bytes");
}

// Cuadrada, a 3× del mayor uso (avatar de artista, 112 px): renglones (64), tarjeta del mapa, panel (48) y sugerencias (40 y 28).
await imagen("public/sin-foto.png", 336, 336, 0.4);
// Ancha, a 3× de la banda de las fichas (220 px de alto y hasta 560 de ancho): en el teléfono se recorta por los lados.
await imagen("public/sin-foto-ancha.png", 1680, 660, 0.36);
