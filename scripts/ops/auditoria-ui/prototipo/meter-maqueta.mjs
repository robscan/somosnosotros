// Mete en un prototipo lo que sale de las maquetas reales de Administración guardadas con `maqueta-pantalla.mjs` (OL-425, bitácora 458):
// el CSS que se sirvió (cada hoja una vez, sin @font-face: la letra la trae Google Fonts), el mapa «Modulo/clase» → la clase con su hash, el
// armazón alrededor de <main> y la portada entera, la barra de Atrás de Personas como plantilla, los iconos de producción (ui/Iconos, el del
// grafo, «Actualizar» y la ⓘ de ui/Ayuda, pintados con React) y la imagen sin foto redonda. Solo reemplaza lo que está entre las marcas
// /*@K*/ /*@ICONOS*/ /*@ENV*/ /*@BARRA*/ /*@IMG*/ … /*@fin*/ y el cuerpo de <template id="maqueta-css">; lo demás del prototipo no se toca.
//
//   node scripts/ops/auditoria-ui/maqueta-pantalla.mjs <carpeta> --solo=admin
//   node scripts/ops/auditoria-ui/prototipo/meter-maqueta.mjs <carpeta> docs/rediseno/prototipos/admin-paneles.html
//
// `--pantallas=a,b,c` elige de qué maquetas sale el CSS (por omisión, las cinco de OL-425); la portada y Personas tienen que estar, porque de ahí
// salen el armazón y la barra. OL-431 (Ciudades v2) le suma Ciudades, su hoja, la bandeja, Corridas y la hoja de ciudades de Artistas:
//   node scripts/ops/auditoria-ui/prototipo/meter-maqueta.mjs <carpeta> docs/rediseno/prototipos/ciudades-v2.html \
//     --pantallas=admin,admin-personas,admin-persona-hoja,admin-lugares,admin-grafo,admin-ciudades,admin-ciudades-hoja,admin-propuestas,admin-corridas,artistas-hoja-ciudad
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const RAIZ = path.resolve(AQUI, "../../../..");
const [MAQ, PROTO] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!MAQ || !PROTO) { console.error("uso: meter-maqueta.mjs <carpeta-de-maquetas> <prototipo.html> [--pantallas=a,b,c]"); process.exit(1); }
const opcion = process.argv.find((a) => a.startsWith("--pantallas="));
const PANTALLAS = opcion ? opcion.slice("--pantallas=".length).split(",").filter(Boolean) : ["admin", "admin-personas", "admin-persona-hoja", "admin-lugares", "admin-grafo"];
if (!PANTALLAS.includes("admin") || !PANTALLAS.includes("admin-personas")) { console.error("--pantallas necesita admin y admin-personas (el armazón y la barra)"); process.exit(1); }
const leer = (id) => fs.readFileSync(path.join(MAQ, id + ".html"), "utf8");

// 1. CSS: cada hoja una sola vez (por su ruta, sin el puerto), sin @font-face.
const hojas = new Map();
for (const id of PANTALLAS) {
  const html = leer(id);
  const css = html.slice(html.indexOf("<style>") + 7, html.indexOf("</style>"));
  const trozos = css.split(/\n\/\* (http:\/\/127\.0\.0\.1:\d+\/[^ ]+|inline) \*\/\n/);
  for (let i = 1; i < trozos.length; i += 2) {
    const clave = trozos[i] === "inline" ? "inline:" + trozos[i + 1].length : trozos[i].replace(/^http:\/\/127\.0\.0\.1:\d+/, "");
    if (!hojas.has(clave)) hojas.set(clave, trozos[i + 1]);
  }
}
let CSS = "";
for (const [clave, texto] of hojas) CSS += `\n/* ${clave} */\n` + texto.replace(/@font-face\s*\{[^}]*\}/g, "");
CSS = CSS.replace(/<\/style/gi, "<\\/style");

// 2. Clases de los módulos.
const K = {};
for (const m of CSS.matchAll(/\.([A-Za-z0-9_]+)-module__([A-Za-z0-9_-]{6})__([A-Za-z][A-Za-z0-9_]*)/g)) K[`${m[1]}/${m[3]}`] = `${m[1]}-module__${m[2]}__${m[3]}`;

// 3. El armazón de una pantalla de Administración (vista «tarea») alrededor de <main>, la portada entera y la barra de Atrás de Personas.
const admin = leer("admin");
const cuerpo = admin.slice(admin.indexOf(">", admin.indexOf("<body")) + 1, admin.lastIndexOf("</body>"));
const ini = cuerpo.indexOf("<main"), fin = cuerpo.indexOf("</main>") + 7;
const ENV = { antes: cuerpo.slice(0, ini), despues: cuerpo.slice(fin), html: admin.match(/<html[^>]*>/)[0], portada: cuerpo.slice(ini, fin) };
const barra = leer("admin-personas").match(/<header class="Barra-module__[^"]*"[\s\S]*?<\/header>/)[0];
const BARRA = barra.replace(/aria-label="Atrás \(Administración\)"( class="[^"]*")? href="\/admin"/, (_, clase) => `aria-label="Atrás ({{VOLVER}})"${clase ?? ""} href="#"`);
if (BARRA === barra) throw new Error("no encontré la barra de Atrás de Personas");

// 4. Iconos de producción a 20 px, pintados con React desde su fuente (esbuild del árbol, sin escribir nada en el repo).
const requerir = createRequire(path.join(RAIZ, "package.json"));
const esbuild = requerir("esbuild");
const entrada = `import { renderToStaticMarkup } from "react-dom/server";
import * as I from "@/components/ui/Iconos";
import IconoGrafo, { IconoActualizar } from "@/app/admin/grafo/IconoGrafo";
const salida = {};
for (const [nombre, Icono] of Object.entries(I)) if (typeof Icono === "function" && nombre.startsWith("Icono")) salida[nombre.slice(5)] = renderToStaticMarkup(Icono({ width: 20, height: 20 }));
salida.Grafo = renderToStaticMarkup(IconoGrafo({ width: 20, height: 20 }));
salida.Actualizar = renderToStaticMarkup(IconoActualizar({ width: 20, height: 20 }));
export default salida;`;
const paquete = await esbuild.build({
  stdin: { contents: entrada, loader: "tsx", resolveDir: RAIZ }, bundle: true, platform: "node", format: "esm", jsx: "automatic", write: false,
  alias: { "@": path.join(RAIZ, "src") }, logLevel: "warning",
  banner: { js: `import { createRequire as __cr } from "node:module"; const require = __cr(${JSON.stringify(path.join(RAIZ, "package.json"))});` },
});
const temporal = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "meter-maqueta-")), "iconos.mjs");
fs.writeFileSync(temporal, paquete.outputFiles[0].text);
const ICONOS = (await import(pathToFileURL(temporal).href)).default;
fs.rmSync(path.dirname(temporal), { recursive: true, force: true });
// La ⓘ de ui/Ayuda (vive dentro de Ayuda.tsx), con el mismo trazo.
ICONOS.Info = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"></circle><path d="M12 11v5"></path><circle cx="12" cy="7.9" r="0.6" fill="currentColor"></circle></svg>';

// 5. La imagen sin foto redonda (el símbolo SN).
const IMG = { sinFotoRedonda: "data:image/png;base64," + fs.readFileSync(path.join(RAIZ, "public/sin-foto-redonda.png")).toString("base64") };

// 6. Al prototipo.
const js = (x) => JSON.stringify(x).replace(/<\//g, "<\\/");
let proto = fs.readFileSync(PROTO, "utf8");
const poner = (marca, valor) => {
  const re = new RegExp(`/\\*@${marca}\\*/[\\s\\S]*?/\\*@fin\\*/`);
  if (!re.test(proto)) throw new Error("falta la marca " + marca);
  proto = proto.replace(re, () => `/*@${marca}*/${valor}/*@fin*/`);
};
poner("K", js(K));
poner("ICONOS", js(ICONOS));
poner("ENV", js(ENV));
poner("BARRA", js(BARRA));
poner("IMG", js(IMG));
const a = '<template id="maqueta-css"><style>', b = "</style></template>";
const i = proto.indexOf(a), j = proto.indexOf(b);
if (i < 0 || j < 0) throw new Error("falta <template id=maqueta-css>");
proto = proto.slice(0, i + a.length) + CSS + "\n" + proto.slice(j);
fs.writeFileSync(PROTO, proto);
console.log(`hojas ${hojas.size} · CSS ${Math.round(CSS.length / 1024)} KB · clases ${Object.keys(K).length} · iconos ${Object.keys(ICONOS).length} · prototipo ${Math.round(proto.length / 1024)} KB`);
