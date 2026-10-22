// Arma el prototipo de Inicio vacío (OL-454, bitácora 486) sobre las maquetas REALES de `maqueta-pantalla.mjs`: el CSS que se sirvió, el
// cuerpo de cada pantalla tal cual y, para la propuesta, solo piezas que ya existen con sus clases de producción (con su hash):
//   · el llamado a crear: el aviso de vacío de las listas (`Lista.module.css`, `.vacio`: título y texto) con la tira Evento · Lugar · Artista de
//     las altas (`TiraTipos`, la variante «en el pie»), cada tipo un enlace a su alta con la ciudad puesta;
//   · lo más cercano: el carril «Esta semana» de San Luis Potosí tal cual (`Destacados` + `TarjetaEvento` mediana), con la distancia de
//     `textoDistancia` (lib/agenda) en su título;
//   · lo que sí hay: el carril de avatares (`Destacados` + `TarjetaAvatar`, el de «Lugares de la semana») con los lugares y artistas de la ciudad.
// Nada se dibuja a mano. Escribe `docs/rediseno/prototipos/inicio-vacio.html` (el armazón del prototipo vive en la plantilla de abajo).
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
for (const id of ["inicio-slp", ...INICIOS, ...ALTAS]) {
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
const slp = cuerpo(leer("inicio-slp"));
const CHEVRON = slp.match(/Ver la agenda(<svg[\s\S]*?<\/svg>)/)[1];

// El carril «Esta semana» de San Luis, tal cual, con sus cuatro primeras tarjetas.
const ini = slp.lastIndexOf("<section", slp.indexOf(">Esta semana<"));
const semana = slp.slice(ini, slp.indexOf("</section>", ini) + 10);
const lis = [...semana.matchAll(/<li>[\s\S]*?<\/li>/g)].map((m) => m[0]);
const ulIni = semana.indexOf("<ul"), ulFin = semana.indexOf("</ul>") + 5;
const ulAbre = semana.slice(ulIni, semana.indexOf(">", ulIni) + 1);
const semanaCuatro = semana.slice(0, ulIni) + ulAbre + lis.slice(0, 4).join("") + "</ul>" + semana.slice(ulFin);

// La imagen sin foto redonda (el símbolo SN), la de los avatares sin foto.
const SIN_FOTO = "data:image/png;base64," + fs.readFileSync(path.join(RAIZ, "public/sin-foto-redonda.png")).toString("base64");

// 4. La distancia: `distanciaKm` (lib/geo) y `textoDistancia` (lib/agenda), copiadas tal cual.
const distanciaKm = (a, b) => { const R = 6371, rad = (x) => (x * Math.PI) / 180, dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng); const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const textoDistancia = (km) => (km < 1 ? `a ${Math.max(50, Math.round((km * 1000) / 50) * 50)} m` : `a ${km < 10 ? km.toFixed(1).replace(".0", "") : Math.round(km)} km`);
const SLP = { lat: 22.1497, lng: -100.9764 };
// Querétaro: el centro de sus lugares (como `cargarCiudades`). Ciudad de México no tiene lugares: su centro sale del catálogo de Ciudades.
const CIUDADES = {
  qro: { slug: "queretaro", nombre: "Querétaro", centro: { lat: (20.5925 + 20.605 + 20.588) / 3, lng: (-100.392 - 100.39 - 100.385) / 3 },
    lugares: [["foro-del-rio-demo", "Foro del Río (demo)"], ["casa-de-cultura-norte-demo", "Casa de Cultura Norte (demo)"], ["galeria-la-canada-demo", "Galería La Cañada (demo)"]],
    artistas: [["lucia-arteaga-demo", "Lucía Arteaga (demo)"], ["colectivo-tierra-fertil-demo", "Colectivo Tierra Fértil (demo)"]] },
  cdmx: { slug: "ciudad-de-mexico", nombre: "Ciudad de México", centro: { lat: 19.4326, lng: -99.1332 }, lugares: [], artistas: [["rocio-lozano", "Rocío Lozano"]] },
};

// 5. Las piezas de la propuesta, con su marcado de producción. `data-propuesta` solo marca qué medir (no es una clase).
const llamado = (ciudad) => {
  const tipo = (t, etiqueta) => `<a class="${c("TiraTipos/tipo")}" href="/nuevo/${t}?ciudad=${ciudad.slug}">${etiqueta}</a>`;
  return `<div class="${c("Lista/vacio")}" data-propuesta="llamado"><h2>¿Sabes de algo que pase en ${ciudad.nombre}?</h2><p>Aún no hay eventos próximos aquí. Publica el primero, o registra un lugar o a un artista.</p>` +
    `<div class="${c("TiraTipos/tira", "TiraTipos/enPie")}" role="group" aria-label="Qué publicar">${tipo("evento", "Evento")}${tipo("lugar", "Lugar")}${tipo("artista", "Artista")}</div></div>`;
};
const cercano = (ciudad) => {
  const titulo = `${textoDistancia(distanciaKm(ciudad.centro, SLP)).replace(/^a/, "A")}, en San Luis Potosí`;
  return semanaCuatro
    .replace(/<section /, '<section data-propuesta="cercano" ')
    .replace(/>Esta semana</, `>${titulo}<`)
    .replace(/aria-label="Ver la agenda: Esta semana"/, `aria-label="Ver la agenda de San Luis Potosí"`);
};
const avatares = (ciudad, que) => {
  const lista = que === "lugar" ? ciudad.lugares : ciudad.artistas;
  if (!lista.length) return "";
  const titulo = que === "lugar" ? "Lugares" : "Artistas";
  const ver = que === "lugar" ? "Ver lugares" : "Ver artistas";
  const raiz = que === "lugar" ? "/lugares" : "/artistas";
  const id = `p-${que}-${ciudad.slug}`;
  const items = lista.map(([slug, nombre]) => `<li><a class="${c("TarjetaAvatar/avatar")}" aria-label="${nombre}" href="${raiz}/${slug}"><img class="${c("TarjetaAvatar/foto")}" width="384" height="384" src="${SIN_FOTO}" alt="" loading="lazy" decoding="async"><span class="${c("TarjetaAvatar/nombre")}">${nombre}</span></a></li>`).join("");
  return `<section class="${c("Destacados/destacados")}" aria-labelledby="${id}" data-propuesta="${que === "lugar" ? "lugares" : "artistas"}"><div class="${c("Destacados/cabecera")}"><h2 id="${id}">${titulo}</h2><a class="${c("Destacados/verTodo")}" aria-label="${ver}: ${titulo}" href="${raiz}?ciudad=${ciudad.slug}">${ver}${CHEVRON}</a></div><ul class="${c("Destacados/carril", "Destacados/avatar")}">${items}</ul></section>`;
};

// La propuesta sobre el cuerpo de hoy: el llamado en el sitio del carril estelar (antes del banner, que sigue donde está) y, donde hoy sale el
// aviso de vacío (al final, tras los carriles colapsados), lo más cercano y luego lo que sí hay en la ciudad (eventos antes que lugares y artistas).
const VACIO = new RegExp(`<div class="${c("Lista/vacio")}"><h2>Próximos días</h2><p>[^<]*</p></div>`);
const BANNER = `<section class="${c("BannerCompartir/banner")}"`;
// Con sesión y planes en otra ciudad, hoy no sale el aviso de vacío (Tus planes cuenta como «no vacío»): lo nuevo va al final de <main>, el
// mismo sitio.
function propuesta(hoy, ciudad) {
  if (!hoy.includes(BANNER)) throw new Error("no encontré el banner");
  const abajo = cercano(ciudad) + avatares(ciudad, "lugar") + avatares(ciudad, "artista");
  const conLlamado = hoy.replace(BANNER, llamado(ciudad) + BANNER);
  if (VACIO.test(hoy)) return conLlamado.replace(VACIO, abajo);
  if (!hoy.includes("</main>")) throw new Error("no encontré </main>");
  return conLlamado.replace("</main>", abajo + "</main>");
}

const PANTALLAS = {};
for (const id of [...INICIOS, ...ALTAS]) PANTALLAS[id] = cuerpo(leer(id));
for (const [clave, ciudad] of Object.entries(CIUDADES)) {
  PANTALLAS[`propuesta-${clave}`] = propuesta(PANTALLAS[`inicio-${clave}`], ciudad);
  PANTALLAS[`propuesta-${clave}-sesion`] = propuesta(PANTALLAS[`inicio-${clave}-sesion`], ciudad);
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

// 6. Al prototipo: la plantilla (`inicio-vacio.plantilla.html`, al lado) con el CSS, la etiqueta <html>, las imágenes y las pantallas.
const js = (x) => JSON.stringify(x).replace(/<\//g, "<\\/").replace(/<!--/g, "<\\!--");
const plantilla = fs.readFileSync(path.join(AQUI, "inicio-vacio.plantilla.html"), "utf8");
const salida = plantilla
  .replace("/*@CSS*/", () => CSS)
  .replace("/*@DATOS*/", () => `const HTML_TAG = ${js(HTML_TAG)};\n  const IMAGENES = ${js(IMAGENES)};\n  const PANTALLAS = ${js(PANTALLAS)};`);
fs.writeFileSync(SALIDA, salida);
console.log(`hojas ${hojas.size} · CSS ${Math.round(CSS.length / 1024)} KB · pantallas ${Object.keys(PANTALLAS).length} · prototipo ${Math.round(salida.length / 1024)} KB`);
console.log("distancias:", Object.fromEntries(Object.entries(CIUDADES).map(([k, v]) => [k, textoDistancia(distanciaKm(v.centro, SLP))])));
