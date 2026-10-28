// Arma el prototipo de OL-466 (bitácora 498): el alta con cartel cuando el evento ya existe («Sí, es este: ponerle mi cartel»), sobre las
// maquetas REALES de `maqueta-pantalla.mjs` (la app compilada contra el respaldo local, con la lectura del cartel simulada): el CSS que se sirvió,
// el cuerpo de cada pantalla tal cual y, para la propuesta, solo piezas que ya existen con sus clases de producción (con su hash): `ui/Parecidos`
// con `RenglonParecido`, `ui/Boton` (primario, secundario, apagado con `aria-disabled`), la nota bajo un botón del canon (`notaBoton`), el pie de
// `PorPasos`, la cabeza de «Revisa» con el cartel (`CabezaCartel`), la espera del cartel (`PasoEspera`) y «Publicado». Nada se dibuja a mano.
// `data-propuesta` solo marca qué medir (no es una clase). Escribe `docs/rediseno/prototipos/alta-cartel-existente.html`; el armazón del
// prototipo (selectores, tamaños, notas y medidor) vive en la plantilla de al lado.
//
//   RESPALDO_CARTEL_EXISTENTE=1 MAQUETA_LECTURA=1 node scripts/ops/auditoria-ui/maqueta-pantalla.mjs <carpeta> --solo=cartel-
//   RESPALDO_CARTEL_EXISTENTE=despues MAQUETA_LECTURA=1 node scripts/ops/auditoria-ui/maqueta-pantalla.mjs <carpeta> --solo=cartel-ficha-despues
//   node scripts/ops/auditoria-ui/prototipo/alta-cartel-existente.mjs <carpeta>
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const RAIZ = path.resolve(AQUI, "../../../..");
const sharp = createRequire(path.join(RAIZ, "package.json"))("sharp");
const MAQ = process.argv[2];
if (!MAQ) { console.error("uso: alta-cartel-existente.mjs <carpeta-de-maquetas>"); process.exit(1); }
const SALIDA = path.join(RAIZ, "docs/rediseno/prototipos/alta-cartel-existente.html");
const leer = (id) => fs.readFileSync(path.join(MAQ, id + ".html"), "utf8");
const MAQUETAS = ["cartel-espera", "cartel-revisa-sin", "cartel-revisa-con", "cartel-publicado", "cartel-ficha", "cartel-ficha-despues", "cartel-ficha-feleal"];

// 1. CSS: cada hoja una sola vez (por su ruta, sin el puerto), sin @font-face (la letra la trae Google Fonts, como en los demás prototipos).
const hojas = new Map();
for (const id of MAQUETAS) {
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

// 3. Cuerpos tal cual y piezas de ellos. `uno` falla si el trozo no está exactamente una vez: así una maqueta nueva que cambió se nota.
const cuerpo = (html) => html.slice(html.indexOf(">", html.indexOf("<body")) + 1, html.lastIndexOf("</body>"));
const HTML_TAG = leer("cartel-revisa-sin").match(/<html[^>]*>/)[0];
const B = Object.fromEntries(MAQUETAS.map((id) => [id, cuerpo(leer(id))]));
function uno(texto, patron, que) {
  const m = [...texto.matchAll(new RegExp(patron.source, "g"))];
  if (m.length !== 1) throw new Error(`${que}: ${m.length} coincidencias`);
  return m[0][0];
}
const cambiar = (texto, patron, por, que) => texto.replace(uno(texto, patron, que), () => (typeof por === "function" ? por(uno(texto, patron, que)) : por));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const PARECIDOS = new RegExp(`<div class="${esc(c("Parecidos/parecidos"))}" role="alert">[\\s\\S]*?</div>`);
const PIE = new RegExp(`<footer class="${esc(c("PorPasos/pie"))}" aria-live="polite">[\\s\\S]*?</footer>`);
const FORM = /<form id="publicar-evento"/;
const CABEZA = new RegExp(`<div class="${esc(c("PasoCartel/cabeza"))}[^"]*"[^>]*>[\\s\\S]*?</h2></div>`);
const LEYENDO = new RegExp(`<div class="${esc(c("PasoCartel/leyendo"))}" aria-busy="true"><img alt="" class="${esc(c("FotoSubida/subiendo"))}" src="([^"]+)"><p role="status">Leyendo el cartel…</p></div>`);
const NO_ES_OTRO = "No, es otro: publicar de todos modos";

// El marcado de `ui/Boton` (completo, como lo pinta React: boton, variante, completo) y el pie de `PorPasos`.
const boton = (variante, texto, extra = "") => `<button type="button" class="${c("Boton/boton", `Boton/${variante}`, "Boton/completo")}"${extra}>${texto}</button>`;
const enlace = (variante, texto, href) => `<a class="${c("Boton/boton", `Boton/${variante}`, "Boton/completo")}" href="${href}">${texto}</a>`;
const pie = (contenido) => `<footer class="${c("PorPasos/pie")}" aria-live="polite" data-propuesta="pie">${contenido}</footer>`;
const nota = (texto) => `<p class="${c("FormularioCanon/notaBoton")}">${texto}</p>`;
const FICHA_DANZON = "/eventos/noche-de-danzon-con-la-orquesta-tipica";
const FICHA_FELEAL = "/eventos/feleal-un-viaje-por-el-mundo-en-acordeon";

/** El bloque «¿Es este?» de hoy (`ui/Parecidos`) con sus botones de abajo cambiados: el texto y el renglón, tal cual. */
function bloque(revisa, botones) {
  const hoy = uno(revisa, PARECIDOS, "bloque");
  const cabeza = hoy.slice(0, hoy.indexOf("</ul>") + 5).replace('role="alert"', 'role="alert" data-propuesta="parecidos"');
  return `${cabeza}${botones}</div>`;
}
// Los botones de cada salida.
const PONER = "Sí, es este: ponerle mi cartel";
const CAMBIAR = "Sí, es este: cambiar su cartel por el mío";
const IR = "Sí, es este: ir al evento";
const SEGUIR = "No, es otro: seguir";
const cambiarApagado = boton("secundario", CAMBIAR, ' aria-disabled="true"') + nota("Solo quien lo publicó puede cambiarlo.");

// 4. Las pantallas.
const P = {};
// Revisa, como hoy (referencia) y las variantes del caso común (el parecido sin cartel).
P["revisa-hoy"] = B["cartel-revisa-sin"];
// A1 (recomendada): el pie dice la respuesta principal; en la caja queda «No, es otro», como hoy.
P["revisa-a1"] = cambiar(cambiar(B["cartel-revisa-sin"], PARECIDOS, bloque(B["cartel-revisa-sin"], boton("secundario", NO_ES_OTRO)), "a1"), PIE, pie(boton("primario", PONER)), "a1 pie");
// A2: las dos respuestas en la caja (la principal primero) y el pie sigue diciendo «Publicar».
P["revisa-a2"] = cambiar(B["cartel-revisa-sin"], PARECIDOS, bloque(B["cartel-revisa-sin"], boton("primario", PONER) + boton("secundario", NO_ES_OTRO)), "a2");
// B: el parecido ya tiene cartel. El pie lleva a su ficha (lo que hoy hace tocar el renglón, dicho); cambiar su cartel va en segundo plano.
P["revisa-b-dueno"] = cambiar(cambiar(B["cartel-revisa-con"], PARECIDOS, bloque(B["cartel-revisa-con"], boton("secundario", CAMBIAR) + boton("secundario", NO_ES_OTRO)), "b"), PIE, pie(enlace("primario", IR, FICHA_FELEAL)), "b pie");
P["revisa-b-ajeno"] = cambiar(cambiar(B["cartel-revisa-con"], PARECIDOS, bloque(B["cartel-revisa-con"], cambiarApagado + boton("secundario", NO_ES_OTRO)), "b ajeno"), PIE, pie(enlace("primario", IR, FICHA_FELEAL)), "b ajeno pie");
// Tras «No, es otro: seguir» en la pregunta de antes (C): «Revisa» ya no vuelve a preguntar (misma firma: título, día y sitio).
P["revisa-tras-c"] = cambiar(B["cartel-revisa-sin"], PARECIDOS, "", "tras c");

// C · Preguntar antes, al terminar de leer. C2 (recomendada): en la misma espera, el cartel se queda grande y la frase se vuelve la pregunta.
const imagenEspera = uno(B["cartel-espera"], LEYENDO, "espera").match(LEYENDO)[1];
const imagenFeleal = uno(B["cartel-revisa-con"], CABEZA, "cabeza feleal").match(/<img alt="" src="([^"]+)">/)[1];
const espera = (imagen) => `<div class="${c("PasoCartel/leyendo")}"><img alt="" src="${imagen}"></div>`;
const antesDelForm = (texto, insercion) => texto.replace(uno(texto, FORM, "form"), () => insercion + '<form id="publicar-evento"');
P["leer-hoy"] = B["cartel-espera"];
P["leer-c2-a"] = antesDelForm(cambiar(B["cartel-espera"], LEYENDO, espera(imagenEspera), "c2"), bloque(B["cartel-revisa-sin"], boton("secundario", SEGUIR)) + pie(boton("primario", PONER)));
P["leer-c2-b"] = antesDelForm(cambiar(B["cartel-espera"], LEYENDO, espera(imagenFeleal), "c2 b"), bloque(B["cartel-revisa-con"], cambiarApagado + boton("secundario", SEGUIR)) + pie(enlace("primario", IR, FICHA_FELEAL)));
// C1: como primer paso, con la cabeza de «Revisa» (miniatura, «Leído del cartel» y el título leído) en vez del cartel grande.
P["leer-c1-a"] = antesDelForm(cambiar(B["cartel-espera"], LEYENDO, uno(B["cartel-revisa-sin"], CABEZA, "cabeza"), "c1"), bloque(B["cartel-revisa-sin"], boton("secundario", SEGUIR)) + pie(boton("primario", PONER)));

// Al terminar: «Publicado» (OL-304) con otra frase; la tarjeta es la del evento que ya estaba, ahora con el cartel y lo que se completó.
const FINAL = new RegExp(`<div class="${esc(c("Publicado/final"))}">`);
function final(titulo, frase, tarjeta) {
  let t = B["cartel-publicado"];
  t = cambiar(t, FINAL, `<div class="${c("Publicado/final")}" data-propuesta="final">`, "final");
  t = cambiar(t, /<h2 tabindex="-1">Evento publicado<\/h2><p>Ya está en la agenda\. Así lo ve la gente:<\/p>/, `<h2 tabindex="-1">${titulo}</h2><p>${frase}</p>`, "titulo final");
  return tarjeta(t);
}
// El enlace del evento recién publicado (la tarjeta y «Ver el evento») pasa a ser el de la ficha que ya estaba.
const slugNuevo = B["cartel-publicado"].match(/\/eventos\/noche-de-danzon-[0-9a-f]{4}/)[0];
P["final-a"] = final("Listo: tu cartel ya está en el evento", "Le pusimos tu cartel y completamos su precio, su descripción y quién se presenta. Así lo ve la gente:", (t) =>
  t.split(slugNuevo).join(FICHA_DANZON).replace("<b>Noche de Danzón</b>", "<b>Noche de danzón con la Orquesta Típica</b>"));
P["final-b"] = final("Listo: cambiamos su cartel por el tuyo", "Todo lo demás sigue igual. Así lo ve la gente:", (t) => {
  const img = uno(t, /<img width="56" height="56" class="[^"]+" alt="" loading="eager" decoding="async" src="[^"]+">/, "img tarjeta");
  return t
    .split(slugNuevo).join(FICHA_FELEAL)
    .replace(img, img.replace(/src="[^"]+"/, `src="${imagenFeleal}"`))
    .replace("<b>Noche de Danzón</b>", "<b>Feleal: un viaje por el mundo en acordeón</b>")
    .replace("<b>vie 9 de oct · 8:00–11:00 pm</b><span>· $150</span>", "<b>mié 14 de oct · 7:00–9:00 pm</b><span>· $120 a $250</span>");
});
P["final-publicado-hoy"] = B["cartel-publicado"];
P["ficha-antes"] = B["cartel-ficha"];
P["ficha-despues"] = B["cartel-ficha-despues"];
P["ficha-feleal"] = B["cartel-ficha-feleal"];
for (const [id, t] of Object.entries(P)) if (/Lorem|undefined/.test(t)) throw new Error("texto de relleno en " + id);

// 5. Cada imagen (data URI) una sola vez y, si pesa más de 60 KB, otra vez comprimida a 720 de ancho (como `meter-maqueta.mjs`).
const IMAGENES = [];
const indice = new Map();
for (const id of Object.keys(P)) {
  P[id] = P[id].replace(/data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]+/g, (uri) => {
    if (!indice.has(uri)) { indice.set(uri, IMAGENES.length); IMAGENES.push(uri); }
    return `__IMG_${indice.get(uri)}__`;
  });
}
for (let i = 0; i < IMAGENES.length; i++) {
  if (IMAGENES[i].length < 60_000 || IMAGENES[i].startsWith("data:image/svg")) continue;
  const bytes = Buffer.from(IMAGENES[i].split(",")[1], "base64");
  const jpg = await sharp(bytes).resize({ width: 720, withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
  if (jpg.length * 1.37 < IMAGENES[i].length) IMAGENES[i] = "data:image/jpeg;base64," + jpg.toString("base64");
}

// 6. Al prototipo: la plantilla con el CSS, la etiqueta <html>, las imágenes y las pantallas.
const js = (x) => JSON.stringify(x).replace(/<\//g, "<\\/").replace(/<!--/g, "<\\!--");
const plantilla = fs.readFileSync(path.join(AQUI, "alta-cartel-existente.plantilla.html"), "utf8");
const salida = plantilla
  .replace("/*@CSS*/", () => CSS)
  .replace("/*@DATOS*/", () => `const HTML_TAG = ${js(HTML_TAG)};\n  const IMAGENES = ${js(IMAGENES)};\n  const CUERPOS = ${js(P)};`);
fs.writeFileSync(SALIDA, salida);
console.log(`hojas ${hojas.size} · CSS ${Math.round(CSS.length / 1024)} KB · pantallas ${Object.keys(P).length} · imágenes ${IMAGENES.length} · prototipo ${Math.round(salida.length / 1024)} KB`);
