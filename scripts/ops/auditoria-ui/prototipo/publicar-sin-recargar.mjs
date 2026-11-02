// Arma el prototipo de OL-502 (bitácora 535): «publicar sin recargar», la tarjeta que se queda en su sitio y cambia sola al publicar en
// Instagram desde Administración. Sobre las maquetas REALES de `maqueta-pantalla.mjs` (la app compilada contra el respaldo local, cuenta de
// administración, reloj fijo del mié 7 de oct de 2026):
//
//   RESPALDO_INSTAGRAM_SEMANA=1 RESPALDO_INSTAGRAM_CONEXION=todo node scripts/ops/auditoria-ui/maqueta-pantalla.mjs <carpeta> --solo=simple-ig-eventos,igc-hoja
//   node scripts/ops/auditoria-ui/prototipo/publicar-sin-recargar.mjs <carpeta>
//
// Las dos maquetas (la lista de Eventos y la hoja «Publicar en Instagram») van enteras, tal cual se sirvieron, dentro del prototipo como JSON;
// el prototipo las carga en un iframe (`srcdoc`) y solo toca el renglón del evento con las clases de producción (`ui/Renglon`, `ui/Girando`,
// `ui/BotonIcono`, el verde de `SemanaInstagram/hecho`); lo poco nuevo lleva el prefijo `pr-`. El armazón vive en la plantilla de al lado.
import fs from "node:fs";
import path from "node:path";

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const RAIZ = path.resolve(AQUI, "../../../..");
const [CARPETA] = process.argv.slice(2);
if (!CARPETA) { console.error("uso: publicar-sin-recargar.mjs <carpeta de maquetas>"); process.exit(1); }
const SALIDA = path.join(RAIZ, "docs/rediseno/prototipos/publicar-sin-recargar.html");
const leer = (id) => fs.readFileSync(path.join(CARPETA, id + ".html"), "utf8");

// Las maquetas, sin @font-face (la letra la trae Google Fonts, como en los demás prototipos) y con la letra enlazada desde el iframe.
const FUENTE = '<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,400..800&display=swap" rel="stylesheet">';
const limpiar = (html) => html.replace(/@font-face\s*\{[^}]*\}/g, "").replace("<head>", "<head>" + FUENTE);
const maquetas = { lista: limpiar(leer("simple-ig-eventos")), hoja: limpiar(leer("igc-hoja")) };
for (const [id, html] of Object.entries(maquetas)) {
  for (const clase of ["XUODnW_lista", "XUODnW_frente", "XUODnW_envuelve", "_9jOBxa_girando", "_9jOBxa_anillo", "fBn7Pa_boton", "fBn7Pa_control", "y3n7sq_hecho", "q5sj2G_titulo", "XOpm9W_conteo"]) {
    if (id === "lista" && !html.includes(clase)) throw new Error(`la maqueta ${id} no trae la clase ${clase}: cambió la compilación, revisa el prototipo`);
  }
}
// Dentro de un <script type="application/json"> solo hay que esconder «<» para que ningún </script> cierre el bloque.
const json = JSON.stringify(maquetas).replace(/</g, "\\u003c");
const plantilla = fs.readFileSync(path.join(AQUI, "publicar-sin-recargar.plantilla.html"), "utf8");
if (!plantilla.includes("/*@MAQUETAS*/")) throw new Error("la plantilla no trae la marca /*@MAQUETAS*/");
fs.writeFileSync(SALIDA, plantilla.replace("/*@MAQUETAS*/", `<script type="application/json" id="maquetas">${json}</script>`));
console.log("escrito", path.relative(RAIZ, SALIDA), Math.round(fs.statSync(SALIDA).size / 1024), "KB");
