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
// OL-458 (Instagram) suma `--cuerpos=a,b`: el <body> entero de esas maquetas, tal cual, en la marca /*@CUERPOS*/ (por id; las imágenes de más de
// 60 KB se vuelven a comprimir a 720 de ancho y los `action` de formulario de React salen), para pintar una pantalla de la app que no es de
// Administración (la ficha de un evento con su «···») sin dibujarla:
//   node scripts/ops/auditoria-ui/prototipo/meter-maqueta.mjs <carpeta> docs/rediseno/prototipos/admin-instagram.html \
//     --pantallas=admin,admin-personas,admin-eventos,admin-eventos-hoja-ciudad,admin-evento-menu,admin-ciudad --cuerpos=admin-evento-menu,admin-ciudad
// OL-443 (Showcase v2) le suma la lista del Showcase, su ficha y su hoja de Estado; de la lista salen también las fotos de las tarjetas (IMG.fotos):
//   node scripts/ops/auditoria-ui/prototipo/meter-maqueta.mjs <carpeta> docs/rediseno/prototipos/showcase-v2.html \
//     --pantallas=admin,admin-personas,admin-persona-hoja,admin-lugares,admin-grafo,admin-ciudades,admin-ciudades-hoja,admin-showcase,admin-showcase-ficha,admin-showcase-estado
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
// OL-443: con la lista del Showcase entre las pantallas, también las fotos de sus tarjetas (por el slug de la ficha), solo las chicas (< 40 KB):
// la de la Orquesta es un cartel entero y no hace falta.
if (PANTALLAS.includes("admin-showcase")) {
  IMG.fotos = {};
  for (const m of leer("admin-showcase").matchAll(/<img[^>]*class="showcase-module__[^"]*__foto"[^>]*src="(data:[^"]+)"[^>]*><a class="showcase-module__[^"]*__nombre" href="\/admin\/showcase\/([^"]+)"/g)) {
    if (m[1].length < 40000 && !m[1].startsWith("data:image/png")) IMG.fotos[m[2]] = m[1];
  }
}

// 6. OL-458: los cuerpos enteros de las maquetas pedidas con `--cuerpos=` (para pantallas que no son de Administración).
const opcionCuerpos = process.argv.find((a) => a.startsWith("--cuerpos="));
let CUERPOS = null;
if (opcionCuerpos) {
  const sharp = requerir("sharp");
  CUERPOS = {};
  for (const id of opcionCuerpos.slice("--cuerpos=".length).split(",").filter(Boolean)) {
    const html = leer(id);
    let cuerpo = html.slice(html.indexOf(">", html.indexOf("<body")) + 1, html.lastIndexOf("</body>"));
    for (const uri of new Set([...cuerpo.matchAll(/data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+/g)].map((m) => m[0]).filter((u) => u.length > 60000))) {
      const bytes = Buffer.from(uri.slice(uri.indexOf(",") + 1), "base64");
      const chica = await sharp(bytes).resize({ width: 720, withoutEnlargement: true }).jpeg({ quality: 72 }).toBuffer();
      cuerpo = cuerpo.split(uri).join("data:image/jpeg;base64," + chica.toString("base64"));
    }
    CUERPOS[id] = cuerpo.replace(/ action="javascript:[^"]*"/g, "");
  }
}

// 7. Al prototipo.
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
if (CUERPOS) poner("CUERPOS", js(CUERPOS));
const a = '<template id="maqueta-css"><style>', b = "</style></template>";
const i = proto.indexOf(a), j = proto.indexOf(b);
if (i < 0 || j < 0) throw new Error("falta <template id=maqueta-css>");
proto = proto.slice(0, i + a.length) + CSS + "\n" + proto.slice(j);
fs.writeFileSync(PROTO, proto);
console.log(`hojas ${hojas.size} · CSS ${Math.round(CSS.length / 1024)} KB · clases ${Object.keys(K).length} · iconos ${Object.keys(ICONOS).length} · prototipo ${Math.round(proto.length / 1024)} KB`);
