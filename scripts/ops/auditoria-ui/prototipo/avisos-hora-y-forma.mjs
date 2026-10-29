// Arma el prototipo de OL-478 (bitácora 510): los avisos al teléfono con hora y forma (resumen diario, título = evento, silencio de 9 pm a 9 am,
// «Esta semana en {ciudad}» con su permiso, sin duplicar web y app, y la medición de «aviso abierto»).
//
// Dos clases de pantalla en el mismo armazón:
//  · Lo que vive en la app (Inicio con Destacados, Ajustes › Avisos, Novedades y la portada de Administración) sale de las maquetas REALES de
//    `maqueta-pantalla.mjs` (la app compilada contra el respaldo local): el CSS que se sirvió y el cuerpo de cada pantalla tal cual. La propuesta
//    solo mueve o copia piezas que ya existen con sus clases de producción (con su hash: `c()` falla si una no está): la tarjeta de
//    `ActivarAvisos` (campana, frase, `ui/Boton` píldora y la ✕ de «Ahora no») en el sitio del banner de compartir, los renglones
//    `Renglon/ajuste` con `ui/Palanca` y el de «Perfil» (valor y chevron), la hoja de ciudades (`ui/Hoja` con los renglones de `Ciudad`), el
//    indicador de Administración (`admin/indicador` y su desglose). Lo poco nuevo va en `NUEVO_CSS` (prefijo `av-`).
//  · La pantalla de bloqueo, el centro de avisos y el permiso del sistema son de iOS, Android o macOS, no de la app: no hay maqueta real que copiar
//    y se dibujan en la plantilla (prefijo `ab-`), con la letra del sistema de la Mac (SF Pro) y medidas aproximadas de iOS 26 a 390 pt.
//
// Los textos de «Hoy» salen de `contenidoPush` (src/lib/avisos.ts) tal cual, compilado aquí con esbuild (sin escribir nada en el repo).
//
//   node scripts/ops/auditoria-ui/maqueta-pantalla.mjs <carpeta> --solo=av-
//   node scripts/ops/auditoria-ui/prototipo/avisos-hora-y-forma.mjs <carpeta>
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const RAIZ = path.resolve(AQUI, "../../../..");
const MAQ = process.argv[2];
if (!MAQ) { console.error("uso: avisos-hora-y-forma.mjs <carpeta-de-maquetas>"); process.exit(1); }
const SALIDA = path.join(RAIZ, "docs/rediseno/prototipos/avisos-hora-y-forma.html");
const leer = (id) => fs.readFileSync(path.join(MAQ, id + ".html"), "utf8");
const MAQUETAS = ["av-inicio", "av-ajustes", "av-novedades", "av-admin", "av-hoja-ciudad"];
const requerir = createRequire(path.join(RAIZ, "package.json"));
const esbuild = requerir("esbuild");

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

// 2. Las clases de producción (con su hash).
const K = {};
for (const m of CSS.matchAll(/\.([A-Za-z0-9_]+)-module__([A-Za-z0-9_-]{6})__([A-Za-z][A-Za-z0-9_]*)/g)) K[`${m[1]}/${m[3]}`] = `${m[1]}-module__${m[2]}__${m[3]}`;
const c = (...nombres) => nombres.map((n) => { if (!K[n]) throw new Error("clase desconocida " + n); return K[n]; }).join(" ");
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const uno = (texto, patron, que) => { const m = [...texto.matchAll(new RegExp(patron.source, "g"))]; if (m.length !== 1) throw new Error(`${que}: ${m.length} coincidencias`); return m[0]; };
const cambiar = (texto, patron, por, que) => { uno(texto, patron, que); return texto.replace(patron, por); };

// 3. Iconos de producción (ui/Iconos) pintados con React desde su fuente, y los textos de hoy (`contenidoPush`) con las fechas del prototipo.
async function compilar(contenido) {
  const r = await esbuild.build({
    stdin: { contents: contenido, loader: "tsx", resolveDir: RAIZ }, bundle: true, platform: "node", format: "esm", jsx: "automatic", write: false,
    alias: { "@": path.join(RAIZ, "src"), "server-only": path.join(RAIZ, "node_modules/server-only/empty.js") }, logLevel: "error",
    banner: { js: `import { createRequire as __cr } from "node:module"; const require = __cr(${JSON.stringify(path.join(RAIZ, "package.json"))});` },
  });
  return (await import("data:text/javascript;base64," + Buffer.from(r.outputFiles[0].text).toString("base64"))).default;
}
const ICONOS = await compilar(`import { renderToStaticMarkup } from "react-dom/server";
import * as I from "@/components/ui/Iconos";
const salida = {};
for (const n of ["Campana", "Ok", "Estrella", "Telefono", "Pin", "Correo"]) salida[n] = renderToStaticMarkup(I["Icono" + n]({ width: 20, height: 20 }));
salida.Cerrar18 = renderToStaticMarkup(I.IconoCerrar({ width: 18, height: 18 }));
salida.Chevron = renderToStaticMarkup(I.IconoChevronDerecha({}));
export default salida;`);
const HOY = await compilar(`import { contenidoPush } from "@/lib/avisos";
const ev = { id: "e1", slug: "noche-de-danzon", titulo: "Noche de danzón", inicio: "2026-10-10T02:00:00Z", fin: null, zona: "America/Mexico_City", sitio_texto: null, sitio_reservado: false, lugar: { nombre: "Teatro de la Paz", portada: null } };
const largo = { ...ev, titulo: "Festival Internacional de Danza Contemporánea Lila López: función de clausura", inicio: "2026-10-11T01:00:00Z", lugar: { nombre: "Centro de las Artes de San Luis Potosí Centenario", portada: null } };
// El jueves 8 de octubre a las 9:00 (hora de San Luis Potosí) y, el recordatorio, al cumplirse las 24 h de antes (el jueves 8 a las 8:00 pm).
const jueves = new Date("2026-10-08T15:00:00Z"), vispera = new Date("2026-10-09T02:00:00Z");
export default { nuevo: contenidoPush("nuevo_evento", ev, "ambos", jueves), cambio: contenidoPush("cambio", ev, "cuando", jueves),
  recordatorio: contenidoPush("recordatorio", ev, "ambos", vispera), largo: contenidoPush("nuevo_evento", largo, "ambos", jueves) };`);

// 4. Cuerpos tal cual y la etiqueta <html> con su clase de la letra.
const cuerpo = (html) => html.slice(html.indexOf(">", html.indexOf("<body")) + 1, html.lastIndexOf("</body>"));
const HTML_TAG = leer("av-inicio").match(/<html[^>]*>/)[0];
const B = Object.fromEntries(MAQUETAS.map((id) => [id, cuerpo(leer(id))]));

// 5. Lo nuevo, en una sola hoja (prefijo av-), solo en los estados de la propuesta.
//  · A (al final del carril): la tarjeta de ActivarAvisos dentro del último <li> del carril, del ancho de una tarjeta XL, con la frase arriba y el
//    botón abajo (en 280 no caben en una fila).
//  · El permiso del sistema (iOS) sobre la pantalla: el velo y la alerta, dibujados (no son de la app).
const NUEVO_CSS = `
li.av-fin { display: grid; align-content: center; }
li.av-fin > p { margin: 0; width: 280px; grid-template-columns: var(--columna-icono) 1fr auto; grid-template-areas: "icono que cerrar" "icono detalle cerrar" ". boton boton"; row-gap: var(--espacio-2); padding: 14px 2px 14px 14px; }
li.av-fin > p > a, li.av-fin > p > button:not([aria-label]) { justify-self: start; }
.av-ios-velo { position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; background: rgba(0, 0, 0, 0.32); }
.av-ios-alerta { width: 270px; border-radius: 26px; background: rgba(242, 242, 247, 0.94); color: #000; font: 400 13px/1.3 -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif; text-align: center; overflow: hidden; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25); }
.av-ios-alerta > h2 { margin: 0; padding: 20px 16px 4px; font: 600 17px/1.25 -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif; }
.av-ios-alerta > p { margin: 0; padding: 0 16px 18px; }
.av-ios-alerta > div { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 0 14px 14px; }
.av-ios-alerta button { min-height: 44px; border: 0; border-radius: 22px; background: rgba(120, 120, 128, 0.16); color: #000; font: 500 17px/1 -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif; cursor: pointer; }
.av-ios-alerta button.av-ios-principal { background: #0a84ff; color: #fff; font-weight: 600; }
`;

// 6. Las piezas de la propuesta, con el marcado de producción.
const boton = (texto) => `<button type="button" class="${c("Boton/boton", "Boton/primario", "Boton/contenido", "Boton/pildora", "Boton/control", "ActivarAvisos/boton")}">${texto}</button>`;
const cerrar = `<button type="button" class="${c("ActivarAvisos/cerrar")}" aria-label="Ahora no">${ICONOS.Cerrar18}</button>`;
/** La tarjeta de `ActivarAvisos` («Activa los avisos en este teléfono»), con la frase de «Esta semana». */
const tarjeta = (titulo, detalle, texto) => `<p class="${c("ActivarAvisos/tarjeta")}" data-propuesta="tarjeta">${ICONOS.Campana}<b>${titulo}</b><small>${detalle}</small>${boton(texto)}${cerrar}</p>`;
const TARJETA = tarjeta("¿Te avisamos lo destacado?", "Cada jueves a las 7 pm, 3 planes en San Luis Potosí", "Activar");
const TARJETA_YA = tarjeta("¿También lo destacado de la semana?", "Cada jueves a las 7 pm, 3 planes en San Luis Potosí", "Sí, también");
const LISTO = `<p class="${c("ActivarAvisos/tarjeta", "ActivarAvisos/hecha")}" role="status" data-propuesta="tarjeta">${ICONOS.Ok}<b>Listo: te avisamos los jueves</b></p>`;
const ALERTA_IOS = `<div class="av-ios-velo" data-sistema="permiso"><div class="av-ios-alerta" role="alertdialog" aria-labelledby="av-ios-t"><h2 id="av-ios-t">“Somos Nosotrxs” quiere enviarte notificaciones</h2><p>Las notificaciones pueden incluir alertas, sonidos e indicadores en el icono. Puedes configurarlas en Ajustes.</p><div><button type="button">No permitir</button><button type="button" class="av-ios-principal">Permitir</button></div></div></div>`;

const BANNER = new RegExp(`<section class="${esc(c("BannerCompartir/banner"))}" aria-label="Comparte la app">[\\s\\S]*?</section>`);
const CARRIL = new RegExp(`(<ul class="${esc(c("Destacados/carril", "Destacados/cartelXl"))}">[\\s\\S]*?)(</ul>)`);
const inicio = B["av-inicio"];
const PANTALLAS = {
  "inicio-hoy": inicio,
  // B (recomendada): la tarjeta en el sitio del banner de compartir, esa visita (una cosa a la vez).
  "inicio-b": cambiar(inicio, BANNER, () => TARJETA, "banner"),
  "inicio-b-permiso": cambiar(inicio, BANNER, () => TARJETA, "banner") + ALERTA_IOS,
  "inicio-b-ya": cambiar(inicio, BANNER, () => TARJETA_YA, "banner"),
  "inicio-b-listo": cambiar(inicio, BANNER, () => LISTO, "banner"),
  // A: al final del carril Destacados (el banner sigue en su sitio).
  "inicio-a": cambiar(inicio, CARRIL, (_, ul, fin) => `${ul}<li class="av-fin">${TARJETA}</li>${fin}`, "carril"),
  "inicio-a-permiso": cambiar(inicio, CARRIL, (_, ul, fin) => `${ul}<li class="av-fin">${TARJETA}</li>${fin}`, "carril") + ALERTA_IOS,
  novedades: B["av-novedades"],
};

// Ajustes › Avisos. La maqueta sale de un Chrome de escritorio sin la llave de avisos («En esta computadora… no los recibe»): en todos los
// estados, también en «Hoy», ese renglón va como en el iPhone con la app (el mismo marcado de AvisosPerfil con el icono del teléfono).
const ajustes = B["av-ajustes"];
const TELEFONO = new RegExp(`<li class="${esc(c("Renglon/ajuste"))}"><svg[^>]*><rect x="3" y="4\\.5"[\\s\\S]*?</li>`);
const palanca = (encendida, etiqueta, apagada = false) => `<button type="button" role="switch" aria-checked="${encendida}" aria-label="${etiqueta}"${apagada ? ' disabled=""' : ""} class="${c("Palanca/palanca")}"></button>`;
const renglonPalanca = (icono, titulo, detalle, encendida, etiqueta, { apagada = false, propuesta = false } = {}) =>
  `<li class="${c("Renglon/ajuste")}"${propuesta ? ' data-propuesta="renglon"' : ""}>${icono}<b>${titulo}</b><small>${detalle}</small>${palanca(encendida, etiqueta, apagada)}</li>`;
/** El renglón de «Perfil» (ReservaPerfil): un botón con el valor y el chevron que abre una hoja. */
const renglonValor = (icono, titulo, valor) => `<li data-propuesta="renglon"><button type="button" class="${c("Renglon/ajuste")}" aria-haspopup="dialog">${icono}<b>${titulo}</b><span>${valor}${ICONOS.Chevron}</span></button></li>`;
const nota = (texto) => `<li class="${c("ajustes/nota")}" data-propuesta="renglon">${texto}</li>`;
const telefono = (detalle, encendida = true, apagada = false) => renglonPalanca(ICONOS.Telefono, "En el teléfono", detalle, encendida, "Avisos en el teléfono", { apagada });
const AVISOS = new RegExp(`(<h2>Avisos</h2><ul class="${esc(c("Renglon/tarjeta"))}">)([\\s\\S]*?)(</ul>)`);
function ajustesCon({ tel, destacados, ciudad, dondeLlegan }) {
  return cambiar(ajustes, AVISOS, (_, abre, dentro, cierra) => {
    let filas = cambiar(dentro, TELEFONO, () => tel, "renglón del teléfono");
    if (destacados) filas += destacados;
    if (ciudad) filas += ciudad;
    if (dondeLlegan) filas += nota(dondeLlegan);
    return abre + filas + cierra;
  }, "grupo Avisos");
}
const DESTACADOS_SI = renglonPalanca(ICONOS.Estrella, "Lo destacado de la semana", "Los jueves a las 7 pm, 3 planes", true, "Lo destacado de la semana", { propuesta: true });
const DESTACADOS_NO = renglonPalanca(ICONOS.Estrella, "Lo destacado de la semana", "Los jueves a las 7 pm, 3 planes de tu ciudad", false, "Lo destacado de la semana", { propuesta: true });
const DESTACADOS_BLOQ = renglonPalanca(ICONOS.Estrella, "Lo destacado de la semana", "Primero activa los avisos en el teléfono", false, "Lo destacado de la semana", { apagada: true, propuesta: true });
const CIUDAD = (nombre) => renglonValor(ICONOS.Pin, "Ciudad", nombre);
const LLEGAN = "Te llegan en: iPhone (app) · Mac (Safari)";
Object.assign(PANTALLAS, {
  "ajustes-hoy": ajustesCon({ tel: telefono("Activados en este iPhone") }),
  "ajustes-si": ajustesCon({ tel: telefono("Activados en este iPhone"), destacados: DESTACADOS_SI, ciudad: CIUDAD("San Luis Potosí"), dondeLlegan: LLEGAN }),
  "ajustes-no": ajustesCon({ tel: telefono("Activados en este iPhone"), destacados: DESTACADOS_NO, dondeLlegan: LLEGAN }),
  "ajustes-queretaro": ajustesCon({ tel: telefono("Activados en este iPhone"), destacados: DESTACADOS_SI, ciudad: CIUDAD("Querétaro"), dondeLlegan: LLEGAN }),
  "ajustes-bloqueado": ajustesCon({ tel: telefono("Bloqueados: se activan en Ajustes del iPhone", false, true), destacados: DESTACADOS_BLOQ }),
  "ajustes-web": ajustesCon({ tel: telefono("En este iPhone te llegan por la app", true), destacados: DESTACADOS_SI, ciudad: CIUDAD("San Luis Potosí"), dondeLlegan: LLEGAN }),
});
// La hoja de ciudades (la de Artistas, ui/Hoja con los renglones de `Ciudad`), con el título y la nota de esta elección, sobre Ajustes.
const hojaCiudad = uno(B["av-hoja-ciudad"], new RegExp(`<div class="${esc(c("Hoja/fondo"))}">[\\s\\S]*?</div></div></div></div>`), "hoja de ciudades")[0];
const renglonCiudad = (nombre, actual) => `<li><button type="button" class="${c("Renglon/ajuste")}"${actual ? ' aria-current="true"' : ""}>${ICONOS.Pin}<b>${nombre}</b>${actual ? hojaCiudad.match(/<svg[^>]*><path d="M5 12\.5[^"]*"><\/path><\/svg>/)[0] : ""}</button></li>`;
const HOJA = hojaCiudad
  .replace(/aria-label="Ciudades con artistas"/, 'aria-label="Ciudad de lo destacado"')
  .replace(/<h3>Ciudades con artistas<\/h3>/, "<h3>Ciudad de lo destacado</h3>")
  .replace(/(<p class="[^"]*">)Solo salen ciudades donde ya hay artistas registrados\.(<\/p>)/, "$1Te mandamos los jueves lo destacado de esta ciudad.$2")
  .replace(/(<ul class="[^"]*">)[\s\S]*(<\/ul>)/, (_, a, z) => a + ["San Luis Potosí", "Ciudad de México", "Querétaro", "Oaxaca"].map((n, i) => renglonCiudad(n, i === 0)).join("") + z);
if (!HOJA.includes("Ciudad de lo destacado</h3>") || !HOJA.includes("Te mandamos")) throw new Error("no pude rehacer la hoja de ciudades");
PANTALLAS["ajustes-hoja"] = PANTALLAS["ajustes-si"] + HOJA;

// Administración: el indicador «Avisos abiertos» en «Últimos 7 días» (el marcado de los demás) y su desglose por tipo.
const admin = B["av-admin"];
const INDICADORES = new RegExp(`(<ul class="${esc(c("admin/indicadores"))}">[\\s\\S]*?)(</ul><h2 class="${esc(c("admin/grupo"))}">Cómo va la comunidad)`);
const indicador = (abierto) => `<li data-propuesta="indicador"><button type="button" class="${c("admin/indicador")}" aria-expanded="${abierto}"${abierto ? ' aria-controls="desglose"' : ""}><span class="${c("admin/nombreIndicador")}">Avisos abiertos</span><b>11</b><small>de 48 que salieron, sin saber quién</small><span class="${c("admin/cambio")}">▲ 4 más</span></button></li>`;
const DESGLOSE = `<li class="${c("admin/desglose")}" id="desglose" data-propuesta="indicador"><p>Los que se tocaron, de los que salieron en 7 días, por tipo. Nunca por persona.</p><ul><li>Lo nuevo de lo que sigues: 8 de 28</li><li>Recordatorio: 2 de 9</li><li>Cambio o cancelación: 1 de 3</li><li>Esta semana en San Luis Potosí: 0 de 8</li></ul></li>`;
Object.assign(PANTALLAS, {
  "admin-hoy": admin,
  "admin-si": cambiar(admin, INDICADORES, (_, lista, fin) => lista + indicador(false) + fin, "indicadores"),
  "admin-desglose": cambiar(admin, INDICADORES, (_, lista, fin) => lista + indicador(true) + DESGLOSE + fin, "indicadores"),
});

// Cada imagen (data URI) una sola vez: Inicio repite los mismos carteles.
const IMAGENES = [];
const indice = new Map();
for (const id of Object.keys(PANTALLAS)) {
  PANTALLAS[id] = PANTALLAS[id].replace(/data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]+/g, (uri) => {
    if (!indice.has(uri)) { indice.set(uri, IMAGENES.length); IMAGENES.push(uri); }
    return `__IMG_${indice.get(uri)}__`;
  });
}
// El icono de la app (el mismo que el de la web instalada: el SN negro sobre el crema, `public/icono-192.png`) y el SN de Android.
const ICONO_APP = "data:image/png;base64," + fs.readFileSync(path.join(RAIZ, "public/icono-192.png")).toString("base64");
const ICONO_ANDROID = "data:image/png;base64," + fs.readFileSync(path.join(RAIZ, "public/icono-aviso.png")).toString("base64");

// 7. Al prototipo: la plantilla de al lado con el CSS, la etiqueta <html>, las imágenes, las pantallas y los textos de hoy.
const js = (x) => JSON.stringify(x).replace(/<\//g, "<\\/").replace(/<!--/g, "<\\!--");
const plantilla = fs.readFileSync(path.join(AQUI, "avisos-hora-y-forma.plantilla.html"), "utf8");
const salida = plantilla
  .replace("/*@CSS*/", () => CSS + "\n/* OL-478: lo nuevo */\n" + NUEVO_CSS)
  .replace("/*@DATOS*/", () => `const HTML_TAG = ${js(HTML_TAG)};\n  const IMAGENES = ${js(IMAGENES)};\n  const PANTALLAS_APP = ${js(PANTALLAS)};\n  const HOY = ${js(HOY)};\n  const ICONO_APP = ${js(ICONO_APP)};\n  const ICONO_ANDROID = ${js(ICONO_ANDROID)};`);
fs.writeFileSync(SALIDA, salida);
console.log(`hojas ${hojas.size} · CSS ${Math.round(CSS.length / 1024)} KB · pantallas ${Object.keys(PANTALLAS).length} · imágenes ${IMAGENES.length} · prototipo ${Math.round(salida.length / 1024)} KB`);
console.log("hoy:", JSON.stringify(HOY));
