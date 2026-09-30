// El inventario de los estilos como prueba (`npm run inventario`; doc 50 § 9, punto 1). Puro Node, sin navegador: recorre los
// `.css` de `src` y falla si aparece un `z-index` que no es un token, un color literal, `100vw` o un margen negativo que no estén en
// la lista de excepciones de `inventario.aceptado.json` (cada una con su porqué), o si el número de bloques duplicados o de medidas
// en duro sube respecto al último aceptado. Que baje está bien: `npm run inventario -- --aceptar` anota las cifras de hoy.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const postcss = createRequire(new URL("../../../node_modules/", import.meta.url))("postcss");
const SRC = new URL("../../../src", import.meta.url).pathname;
const ACEPTADO = new URL("./inventario.aceptado.json", import.meta.url).pathname;
const aceptado = JSON.parse(fs.readFileSync(ACEPTADO, "utf8"));

const REGLAS = {
  zIndex: { titulo: "z-index que no es un token", malo: (d) => d.prop === "z-index" && !/^(var\(--z-[a-z-]+\)|calc\(var\(--z-[a-z-]+\) [+-] \d+\))$/.test(d.value.trim()) },
  colores: { titulo: "color literal fuera de globals.css", malo: (d, sinVar, definicion) => !definicion && /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(|color-mix\(/i.test(sinVar) },
  vw100: { titulo: "100vw", malo: (d, sinVar) => /(^|[^\d.])100vw\b/.test(sinVar) },
  margenesNegativos: { titulo: "margen negativo", malo: (d) => d.prop.startsWith("margin") && /(^|[\s(,*/])-(?=[\d.]|var\()/.test(d.value) },
};
const hallazgos = Object.fromEntries(Object.keys(REGLAS).map((k) => [k, []]));
const usadas = new Set();
const bloques = new Map();
let medidasEnDuro = 0;
let reglasTotal = 0;
let archivos = 0;
(function andar(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) andar(p);
    else if (e.name.endsWith(".css")) inspeccionar(p);
  }
})(SRC);

function inspeccionar(ruta) {
  const archivo = path.relative(SRC, ruta);
  archivos++;
  postcss.parse(fs.readFileSync(ruta, "utf8")).walkRules((r) => {
    reglasTotal++;
    const firma = [];
    r.walkDecls((d) => {
      if (d.parent !== r) return;
      firma.push(`${d.prop}:${d.value}`);
      const definicion = archivo === "app/globals.css" && d.prop.startsWith("--"); // los tokens son el sitio de los números y colores en duro
      const sinVar = d.value.replace(/var\([^)]*\)/g, "");
      if (!definicion) for (const m of sinVar.matchAll(/(-?\d*\.?\d+)px/g)) if (![0, 1, 2].includes(parseFloat(m[1]))) medidasEnDuro++; // 0, 1 y 2 px son filetes
      for (const [regla, { malo }] of Object.entries(REGLAS)) {
        if (!malo(d, sinVar, definicion)) continue;
        const i = aceptado.excepciones[regla].findIndex((x) => x.archivo === archivo && (x.selector === undefined || x.selector === r.selector));
        if (i >= 0) usadas.add(`${regla}:${i}`);
        else hallazgos[regla].push(`${archivo} ${r.selector} { ${d.prop}: ${d.value} }`);
      }
    });
    if (firma.length < 4) return;
    const clave = firma.sort().join(";");
    bloques.set(clave, [...(bloques.get(clave) ?? []), `${archivo} ${r.selector}`]);
  });
}
const bloquesDuplicados = [...bloques.values()].filter((v) => v.length > 1);
const cifras = { bloquesDuplicados: bloquesDuplicados.length, medidasEnDuro };

if (process.argv.includes("--aceptar")) {
  const bloque = `"cifras": ${JSON.stringify(cifras, null, 4).replace(/\n}$/, "\n  }")}`;
  fs.writeFileSync(ACEPTADO, fs.readFileSync(ACEPTADO, "utf8").replace(/"cifras": \{[^}]*\}/, bloque));
  console.log("inventario: cifras aceptadas ->", JSON.stringify(cifras));
  process.exit(0);
}

const fallos = [];
console.log(`inventario de estilos: ${archivos} archivos, ${reglasTotal} reglas`);
for (const [regla, { titulo }] of Object.entries(REGLAS)) {
  const conExcepcion = aceptado.excepciones[regla].length;
  console.log(`  ${titulo}: ${hallazgos[regla].length} nuevos, ${conExcepcion} con excepción`);
  hallazgos[regla].forEach((h) => fallos.push(`${titulo} sin excepción: ${h}`));
  aceptado.excepciones[regla].forEach((x, i) => usadas.has(`${regla}:${i}`) || fallos.push(`excepción de ${titulo} que ya no hace falta (bórrala de inventario.aceptado.json): ${x.archivo} ${x.selector ?? ""}`));
}
for (const [cifra, valor] of Object.entries(cifras)) {
  const tope = aceptado.cifras[cifra];
  console.log(`  ${cifra}: ${valor} (aceptado ${tope})${valor < tope ? " — bajó: anótalo con `npm run inventario -- --aceptar`" : ""}`);
  if (valor > tope) fallos.push(`${cifra} subió de ${tope} a ${valor}`);
}
if (cifras.bloquesDuplicados > aceptado.cifras.bloquesDuplicados) bloquesDuplicados.forEach((v) => fallos.push(`  bloque repetido: ${v.join(" | ")}`));
if (fallos.length) {
  console.error("\nEl inventario falla:\n" + fallos.map((f) => "  - " + f).join("\n"));
  process.exit(1);
}
console.log("inventario: sin novedades");
