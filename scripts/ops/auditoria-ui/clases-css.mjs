// Los nombres de clase de los módulos CSS en la app compilada (OL-483). Hasta Next 16.3 Turbopack los escribía en producción como
// `Archivo-module__<hash>__clase`, y las pruebas leen de ahí el archivo («Calendario/dia», «lugares/ubicacion»): las excepciones de
// `medidas.aceptadas.json` y el primer cuadro de Inicio (`<header class="BarraApp…`) se escriben así. Desde Next 16.4 (vercel/next.js#97944)
// en producción son `<hash>_clase`, con el hash de la ruta del archivo y sin su nombre (seis letras; con `_` delante si empieza por cifra:
// `_7y7WFW_kpi`; en `next dev` siguen largos). Los mapas de fuentes del servidor (`.next/server/**/*.js.map`) sí dicen de qué archivo sale
// cada hash: con esa tabla se devuelven los nombres a su forma larga y las pruebas no cambian.
import fs from "node:fs";
import path from "node:path";

const MODULO = /\/([^/]+)\.module\.css \[[^\]]+\] \(css module\)$/;

/** hash → nombre del archivo sin `.module.css`, sacado de los mapas de fuentes del servidor de la app compilada. */
export function tablaDeModulos(dirNext) {
  const tabla = new Map();
  const recorrer = (d) => (fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }) : []).flatMap((e) => (e.isDirectory() ? recorrer(path.join(d, e.name)) : [path.join(d, e.name)]));
  for (const archivo of recorrer(path.join(dirNext, "server")).filter((f) => f.endsWith(".js.map"))) {
    const texto = fs.readFileSync(archivo, "utf8");
    if (!texto.includes("(css module)")) continue;
    const mapa = JSON.parse(texto);
    (mapa.sources ?? []).forEach((fuente, i) => {
      const nombre = MODULO.exec(fuente)?.[1];
      const hash = nombre && /"([^"]+)":\s*"([A-Za-z0-9_-]+)_\1"/.exec(mapa.sourcesContent?.[i] ?? "")?.[2];
      if (hash) tabla.set(hash, nombre);
    });
  }
  return tabla;
}

/** `<hash>_clase` → `Archivo-module__<hash>__clase` (la forma de Next 16.3) en un texto, solo con los hash de la tabla. */
export function nombresLargos(texto, tabla) {
  if (!tabla.size) return String(texto);
  const hashes = [...tabla.keys()].sort((a, b) => b.length - a.length).map((h) => h.replace(/-/g, "\\-"));
  const corto = new RegExp(`(?<![A-Za-z0-9_-])(${hashes.join("|")})_(?=[A-Za-z_])`, "g");
  return String(texto).replace(corto, (_, hash) => `${tabla.get(hash)}-module__${hash}__`);
}

/** Lo mismo dentro de un resultado medido (objetos y listas con textos), y con la forma corta de las pruebas: `Archivo/clase`. */
export function conNombres(valor, tabla) {
  if (!tabla.size) return valor;
  return JSON.parse(nombresLargos(JSON.stringify(valor), tabla).replace(/-module__[\w-]{5,8}__/g, "/"));
}
