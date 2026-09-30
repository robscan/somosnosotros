// Inventario estático de los CSS modules: tokens usados, literales, duplicados, alturas fijas, posiciones, z-index.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(new URL("../../../node_modules/", import.meta.url));
const postcss = require("postcss");
const RAIZ = new URL("../../../src", import.meta.url).pathname;
const archivos = [];
(function andar(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) andar(p);
    else if (e.name.endsWith(".css")) archivos.push(p);
  }
})(RAIZ);
const tokensDef = new Map();
const globals = fs.readFileSync(path.join(RAIZ, "app/globals.css"), "utf8");
for (const m of globals.matchAll(/^\s*(--[a-z0-9-]+):/gim)) tokensDef.set(m[1], 0);
const usoTokens = new Map();
const porArchivo = [];
const bloques = new Map(); // firma de declaraciones -> [archivo selector]
const alturas = [];
const zs = [];
const posiciones = [];
const literalesPx = new Map();
const coloresLit = new Map();
const propsCount = new Map();
let reglasTotal = 0;
for (const a of archivos) {
  const css = fs.readFileSync(a, "utf8");
  const rel = path.relative(RAIZ, a);
  const root = postcss.parse(css);
  let reglas = 0, decls = 0, literales = 0, conVar = 0, tokensLocales = new Set();
  root.walkRules((r) => {
    reglas++;
    reglasTotal++;
    const firma = [];
    r.walkDecls((d) => {
      if (d.parent !== r) return;
      decls++;
      propsCount.set(d.prop, (propsCount.get(d.prop) || 0) + 1);
      firma.push(`${d.prop}:${d.value}`);
      for (const m of d.value.matchAll(/var\((--[a-z0-9-]+)/gi)) {
        usoTokens.set(m[1], (usoTokens.get(m[1]) || 0) + 1);
        conVar++;
        if (!tokensDef.has(m[1])) tokensLocales.add(m[1]);
      }
      if (d.prop.startsWith("--")) tokensLocales.add(d.prop);
      const sinVar = d.value.replace(/var\([^)]*\)/g, "");
      for (const m of sinVar.matchAll(/(-?\d*\.?\d+)px/g)) {
        const v = parseFloat(m[1]);
        if (v === 0 || v === 1 || v === 2) continue; // hairlines
        literales++;
        const k = `${d.prop}:${v}px`;
        literalesPx.set(k, (literalesPx.get(k) || 0) + 1);
      }
      for (const m of sinVar.matchAll(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi)) {
        coloresLit.set(m[0], (coloresLit.get(m[0]) || 0) + 1);
      }
      if (/^(height|min-height|max-height)$/.test(d.prop) && /^\d+px$/.test(d.value.trim())) alturas.push({ archivo: rel, sel: r.selector, prop: d.prop, valor: d.value });
      if (d.prop === "z-index") zs.push({ archivo: rel, sel: r.selector, z: d.value });
      if (d.prop === "position" && d.value !== "static" && d.value !== "relative") posiciones.push({ archivo: rel, sel: r.selector, pos: d.value });
    });
    if (firma.length >= 4) {
      const k = firma.sort().join(";");
      if (!bloques.has(k)) bloques.set(k, []);
      bloques.get(k).push(`${rel} ${r.selector}`);
    }
  });
  porArchivo.push({ archivo: rel, lineas: css.split("\n").length, reglas, decls, literalesPx: literales, usosVar: conVar, tokensLocales: [...tokensLocales] });
}
const duplicados = [...bloques.entries()].filter(([, v]) => v.length > 1).map(([k, v]) => ({ decls: k.split(";").length, en: v, firma: k.slice(0, 160) }));
const tokensSinUso = [...tokensDef.keys()].filter((t) => !usoTokens.has(t));
const tokensMasUsados = [...usoTokens.entries()].sort((a, b) => b[1] - a[1]);
const salida = {
  archivos: archivos.length,
  reglasTotal,
  porArchivo: porArchivo.sort((a, b) => b.literalesPx - a.literalesPx),
  tokensDefinidos: tokensDef.size,
  tokensSinUso,
  tokensMasUsados,
  tokensLocalesPorArchivo: porArchivo.filter((p) => p.tokensLocales.length).map((p) => ({ archivo: p.archivo, tokens: p.tokensLocales })),
  literalesPx: [...literalesPx.entries()].sort((a, b) => b[1] - a[1]),
  coloresLiterales: [...coloresLit.entries()].sort((a, b) => b[1] - a[1]),
  alturasFijas: alturas,
  zIndex: zs.sort((a, b) => parseInt(a.z) - parseInt(b.z)),
  posiciones,
  duplicados: duplicados.sort((a, b) => b.decls - a.decls),
  propsMasUsadas: [...propsCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30),
};
fs.writeFileSync("inventario-css.json", JSON.stringify(salida, null, 1));
console.log("archivos", archivos.length, "reglas", reglasTotal);
console.log("tokens definidos", tokensDef.size, "sin uso:", tokensSinUso.join(", ") || "ninguno");
console.log("tokens locales (definidos fuera de globals):", salida.tokensLocalesPorArchivo.length, "archivos");
console.log("literales px (sin 0/1/2):", [...literalesPx.values()].reduce((a, b) => a + b, 0));
console.log("colores literales:", [...coloresLit.values()].reduce((a, b) => a + b, 0), "distintos", coloresLit.size);
console.log("alturas fijas:", alturas.length, "z-index:", zs.length, "posiciones abs/fixed/sticky:", posiciones.length);
console.log("bloques duplicados (>=4 decl iguales en >=2 reglas):", duplicados.length);
for (const d of duplicados.slice(0, 25)) console.log(" -", d.decls, "decl:", d.en.join(" | "));
console.log("--- top literales:"); for (const [k, v] of salida.literalesPx.slice(0, 30)) console.log("  ", v, k);
console.log("--- z-index:"); for (const z of zs) console.log("  ", z.z, z.archivo, z.sel);
