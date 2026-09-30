// Copia capturas al repo como PNG de paleta (sharp): mismo tamaño en píxeles, 3-5 veces menos bytes.
// node comprimir.mjs <destino> <origen1> [<origen2>...]   (origen: ruta.png[=nombre-destino.png])
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
const require = createRequire(new URL("../../../node_modules/", import.meta.url));
const sharp = require("sharp");
const [, , destino, ...origenes] = process.argv;
fs.mkdirSync(destino, { recursive: true });
let total = 0;
for (const o of origenes) {
  const [ruta, nombre] = o.split("=");
  const salida = path.join(destino, nombre || path.basename(ruta));
  const meta = await sharp(ruta).metadata();
  await sharp(ruta).png({ palette: true, quality: 85, effort: 8, compressionLevel: 9 }).toFile(salida);
  const bytes = fs.statSync(salida).size;
  total += bytes;
  console.log(`${path.basename(salida)}  ${meta.width}×${meta.height}  ${Math.round(fs.statSync(ruta).size / 1024)} → ${Math.round(bytes / 1024)} KB`);
}
console.log(`total ${Math.round(total / 1024)} KB en ${origenes.length} archivos`);
