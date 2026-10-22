// Arma el prototipo de Inicio vacío (OL-454, bitácora 486) sobre las maquetas REALES de `maqueta-pantalla.mjs`: el CSS que se sirvió, el
// cuerpo de cada pantalla tal cual y, para la propuesta, solo piezas que ya existen con sus clases de producción (con su hash).
// Segunda vuelta (decisiones del founder): en una ciudad sin eventos próximos no sale el banner de compartir, no hay carril de la ciudad más
// cercana, lugares y artistas se quedan como hoy, y el llamado a crear es el aviso de vacío de las listas (`Lista.module.css`, `.vacio`: título
// y texto) con UN botón primario grande (`ui/Boton` primario, el «+» de `IconoMas` y la palabra): «Publicar un evento», al alta de evento con la
// ciudad puesta. La variante (la recomendación del operador) suma debajo el enlace quieto de `ui/Boton` («Registrar un lugar o a un artista»,
// al alta de lugar, cuya tira lleva a la de artista).
// Nada se dibuja a mano. Escribe `docs/rediseno/prototipos/inicio-vacio.html` (el armazón del prototipo vive en la plantilla de al lado).
//
//   RESPALDO_VACIO=1 node scripts/ops/auditoria-ui/maqueta-pantalla.mjs <carpeta> --solo=inicio,alta-evento,alta-lugar,alta-artista,entrar-alta
//   node scripts/ops/auditoria-ui/prototipo/inicio-vacio.mjs <carpeta>
import fs from "node:fs";
import path from "node:path";

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const RAIZ = path.resolve(AQUI, "../../../..");
const MAQ = process.argv[2];
if (!MAQ) { console.error("uso: inicio-vacio.mjs <carpeta-de-maquetas>"); process.exit(1); }
const SALIDA = path.join(RAIZ, "docs/rediseno/prototipos/inicio-vacio.html");
const leer = (id) => fs.readFileSync(path.join(MAQ, id + ".html"), "utf8");

const INICIOS = ["inicio-qro", "inicio-qro-sesion", "inicio-cdmx", "inicio-cdmx-sesion", "inicio-zac", "inicio-zac-sesion"];
const ALTAS = ["alta-evento", "alta-lugar", "alta-artista", "entrar-alta"];

// 1. CSS: cada hoja una sola vez (por su ruta, sin el puerto), sin @font-face (la letra la trae Google Fonts, como en los demás prototipos).
const hojas = new Map();
for (const id of [...INICIOS, ...ALTAS]) {
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

// 2. Las clases de producción que usa la propuesta (falla si alguna no está: así nunca se inventa una).
const K = {};
for (const m of CSS.matchAll(/\.([A-Za-z0-9_]+)-module__([A-Za-z0-9_-]{6})__([A-Za-z][A-Za-z0-9_]*)/g)) K[`${m[1]}/${m[3]}`] = `${m[1]}-module__${m[2]}__${m[3]}`;
const c = (...nombres) => nombres.map((n) => { if (!K[n]) throw new Error("clase desconocida " + n); return K[n]; }).join(" ");

// 3. Cuerpos tal cual (lo que va entre <body> y </body>) y el <html> con su clase de la letra.
const cuerpo = (html) => html.slice(html.indexOf(">", html.indexOf("<body")) + 1, html.lastIndexOf("</body>"));
const HTML_TAG = leer("inicio-qro").match(/<html[^>]*>/)[0];
// `IconoMas` (ui/Iconos) a 20 px, como lo pinta React: `base` con strokeWidth 2.2.
const MAS = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>';
const CIUDADES = { qro: { slug: "queretaro", nombre: "Querétaro" }, cdmx: { slug: "ciudad-de-mexico", nombre: "Ciudad de México" } };

// 4. El llamado, con el marcado de producción: `Vacio` (h2 y p) y `Boton` como enlace (claseBoton: primario, recta, toque, completo; el icono y
//    el texto como hijos directos, como en el banner). `data-propuesta` solo marca qué medir (no es una clase).
function llamado(ciudad, variante) {
  const texto = variante ? "Aún no hay eventos próximos aquí. Publica el primero, o registra un lugar o a un artista." : "Aún no hay eventos próximos aquí. Publica el primero.";
  const principal = `<a class="${c("Boton/boton", "Boton/primario", "Boton/completo")}" href="/nuevo/evento?ciudad=${ciudad.slug}">${MAS}Publicar un evento</a>`;
  const quieto = variante ? `<a class="${c("Boton/boton", "Boton/quieto", "Boton/completo")}" href="/nuevo/lugar?ciudad=${ciudad.slug}">Registrar un lugar o a un artista</a>` : "";
  return `<div class="${c("Lista/vacio")}" data-propuesta="llamado"><h2>¿Sabes de algo que pase en ${ciudad.nombre}?</h2><p>${texto}</p>${principal}${quieto}</div>`;
}

// La propuesta sobre el cuerpo de hoy: el banner de compartir sale y en su sitio (tras el carril estelar, colapsado) va el llamado; el aviso de
// vacío de hoy, al final, se quita (el llamado lo sustituye). Con sesión, Tus planes queda debajo, en su orden firmado. Lugares y artistas, como hoy.
const VACIO = new RegExp(`<div class="${c("Lista/vacio")}"><h2>Próximos días</h2><p>[^<]*</p></div>`);
const BANNER = new RegExp(`<section class="${c("BannerCompartir/banner")}"[\\s\\S]*?</section>`);
function propuesta(hoy, ciudad, variante) {
  if (!BANNER.test(hoy)) throw new Error("no encontré el banner");
  return hoy.replace(BANNER, () => llamado(ciudad, variante)).replace(VACIO, "");
}

const PANTALLAS = {};
for (const id of [...INICIOS, ...ALTAS]) PANTALLAS[id] = cuerpo(leer(id));
for (const [clave, ciudad] of Object.entries(CIUDADES)) for (const sesion of ["", "-sesion"]) {
  PANTALLAS[`propuesta-${clave}${sesion}`] = propuesta(PANTALLAS[`inicio-${clave}${sesion}`], ciudad, false);
  PANTALLAS[`variante-${clave}${sesion}`] = propuesta(PANTALLAS[`inicio-${clave}${sesion}`], ciudad, true);
}

// Cada imagen (data URI) una sola vez: las pantallas con y sin sesión repiten los mismos carteles.
const IMAGENES = [];
const indice = new Map();
for (const id of Object.keys(PANTALLAS)) {
  PANTALLAS[id] = PANTALLAS[id].replace(/data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]+/g, (uri) => {
    if (!indice.has(uri)) { indice.set(uri, IMAGENES.length); IMAGENES.push(uri); }
    return `__IMG_${indice.get(uri)}__`;
  });
}

// 5. Al prototipo: la plantilla (`inicio-vacio.plantilla.html`, al lado) con el CSS, la etiqueta <html>, las imágenes y las pantallas.
const js = (x) => JSON.stringify(x).replace(/<\//g, "<\\/").replace(/<!--/g, "<\\!--");
const plantilla = fs.readFileSync(path.join(AQUI, "inicio-vacio.plantilla.html"), "utf8");
const salida = plantilla
  .replace("/*@CSS*/", () => CSS)
  .replace("/*@DATOS*/", () => `const HTML_TAG = ${js(HTML_TAG)};\n  const IMAGENES = ${js(IMAGENES)};\n  const PANTALLAS = ${js(PANTALLAS)};`);
fs.writeFileSync(SALIDA, salida);
console.log(`hojas ${hojas.size} · CSS ${Math.round(CSS.length / 1024)} KB · pantallas ${Object.keys(PANTALLAS).length} · prototipo ${Math.round(salida.length / 1024)} KB`);
