// Arma el prototipo de OL-493 (bitácora 525): Administración más simple (la portada en cinco bloques y la hoja «Todos los números») y la
// pantalla de Instagram con la ciudad del administrador y la conexión en un botón. Sobre las maquetas REALES de `maqueta-pantalla.mjs` (la app
// compilada contra el respaldo local, cuenta de administración, reloj fijo del mié 7 de oct de 2026):
//
//   RESPALDO_HISTORIAL=1 RESPALDO_INSTAGRAM_SEMANA=1 RESPALDO_INSTAGRAM_CONEXION=todo node scripts/ops/auditoria-ui/maqueta-pantalla.mjs <con> --solo=simple-
//   RESPALDO_HISTORIAL=1 RESPALDO_INSTAGRAM_SEMANA=1 node scripts/ops/auditoria-ui/maqueta-pantalla.mjs <sin> --solo=simple-ig-slp
//   node scripts/ops/auditoria-ui/prototipo/admin-simple.mjs <con> <sin>
//
// El CSS que se sirvió va tal cual; los cuerpos son los de producción y la propuesta solo mueve o copia piezas que ya existen con sus clases
// (con su hash: `c()` falla si una no está, así nunca se inventa una): `admin/indicador` y su desglose, `Renglon/ajuste` en `Renglon/tarjeta`,
// `admin/grupo` y `admin/nota`, `admin/enlace`, el embudo, las cifras del CAPO, `ui/Hoja` con título, `ui/Cabecera` con sus chips, `ui/BotonIcono`
// y el punto de la barra de la app (`Sesion/punto`), `admin/puede`, `ui/Boton`, `Lista/conteo` y el renglón «Falta material». Lo poco nuevo va en
// `NUEVO_CSS` (prefijo `as-`). Escribe `docs/rediseno/prototipos/admin-simple.html`; el armazón vive en la plantilla de al lado.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const RAIZ = path.resolve(AQUI, "../../../..");
const [CON, SIN] = process.argv.slice(2);
if (!CON || !SIN) { console.error("uso: admin-simple.mjs <maquetas-conectada> <maquetas-sin-conexion>"); process.exit(1); }
const SALIDA = path.join(RAIZ, "docs/rediseno/prototipos/admin-simple.html");
const leer = (carpeta, id) => fs.readFileSync(path.join(carpeta, id + ".html"), "utf8");
const MAQUETAS = ["simple-admin", "simple-ig-todas", "simple-ig-slp", "simple-ig-eventos", "simple-ig-hoja-ciudad", "simple-hoja-titulo", "simple-corridas"];
const esbuild = createRequire(path.join(RAIZ, "package.json"))("esbuild");

// 1. CSS: cada hoja una sola vez (por su ruta, sin el puerto), sin @font-face (la letra la trae Google Fonts, como en los demás prototipos).
const hojas = new Map();
for (const id of MAQUETAS) {
  const html = leer(CON, id);
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

// 2. Las clases de producción. Esta compilación las nombra `<hash de 6>_<clase>` (sin el nombre del módulo): el hash de cada módulo es el
//    prefijo cuyas clases salen TODAS de ese archivo (y con más clases en común). Cada módulo se nombra por su archivo.
const MODULOS = {
  admin: "src/app/admin/admin.module.css", Renglon: "src/components/ui/Renglon.module.css", Grupo: "src/components/ui/Grupo.module.css",
  Hoja: "src/components/ui/Hoja.module.css", Cabecera: "src/components/ui/Cabecera.module.css", Chip: "src/components/ui/Chip.module.css",
  BotonIcono: "src/components/ui/BotonIcono.module.css", Boton: "src/components/ui/Boton.module.css", Sesion: "src/components/Sesion.module.css",
  Lista: "src/components/Lista.module.css", Semana: "src/app/admin/instagram/SemanaInstagram.module.css", Pestanas: "src/components/ui/Pestanas.module.css",
  Capo: "src/app/admin/CapoComoVa.module.css",
};
const porPrefijo = new Map();
// El hash son 6 letras; si empieza con cifra, lleva un «_» delante (`_4WpgRW_grupo`, `_trgOq_icono`).
for (const m of CSS.matchAll(/\.(_[0-9][A-Za-z0-9_-]{5}|[A-Za-z_-][A-Za-z0-9_-]{5})_([a-zA-Z][a-zA-Z0-9]*)\b/g)) {
  if (!porPrefijo.has(m[1])) porPrefijo.set(m[1], new Set());
  porPrefijo.get(m[1]).add(m[2]);
}
const PREFIJO = {};
for (const [alias, archivo] of Object.entries(MODULOS)) {
  const fuente = fs.readFileSync(path.join(RAIZ, archivo), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/url\([^)]*\)/g, "");
  const suyas = new Set([...fuente.matchAll(/\.([a-zA-Z][a-zA-Z0-9]*)\b/g)].map((m) => m[1]));
  let mejor = null, comun = 0;
  for (const [p, nombres] of porPrefijo) {
    const n = [...nombres].filter((x) => suyas.has(x)).length;
    if (n === nombres.size && n > comun) { mejor = p; comun = n; }
  }
  if (!mejor) throw new Error("sin prefijo para " + alias);
  PREFIJO[alias] = mejor;
}
const c = (...nombres) => nombres.map((n) => { const [m, k] = n.split("/"); const p = PREFIJO[m]; if (!p || !porPrefijo.get(p).has(k)) throw new Error("clase desconocida " + n); return `${p}_${k}`; }).join(" ");
const sel = (n) => "." + c(n);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const uno = (texto, patron, que) => { const m = [...texto.matchAll(new RegExp(patron.source, "g"))]; if (m.length !== 1) throw new Error(`${que}: ${m.length} coincidencias`); return m[0]; };
const cambiar = (texto, patron, por, que) => { uno(texto, patron, que); return texto.replace(patron, por); };

// 3. Los iconos de producción (ui/Iconos y el del grafo), pintados con React desde su fuente.
async function compilar(contenido) {
  const r = await esbuild.build({
    stdin: { contents: contenido, loader: "tsx", resolveDir: RAIZ }, bundle: true, platform: "node", format: "esm", jsx: "automatic", write: false,
    alias: { "@": path.join(RAIZ, "src") }, logLevel: "error",
    banner: { js: `import { createRequire as __cr } from "node:module"; const require = __cr(${JSON.stringify(path.join(RAIZ, "package.json"))});` },
  });
  return (await import("data:text/javascript;base64," + Buffer.from(r.outputFiles[0].text).toString("base64"))).default;
}
const I = await compilar(`import { renderToStaticMarkup } from "react-dom/server";
import * as I from "@/components/ui/Iconos";
import IconoGrafo from "@/app/admin/grafo/IconoGrafo";
const salida = {};
for (const n of ["Personas", "Pin", "Calendario", "Estrella", "Pincel", "Instagram", "Destello", "Ubicacion", "Reloj", "Ok", "Facebook", "Personas", "Lapiz"]) salida[n] = renderToStaticMarkup(I["Icono" + n]({ width: 20, height: 20 }));
salida.Ig22 = renderToStaticMarkup(I.IconoInstagram({ width: 22, height: 22 }));
salida.Grafo = renderToStaticMarkup(IconoGrafo({ width: 20, height: 20 }));
salida.Chevron = renderToStaticMarkup(I.IconoChevronDerecha({}));
salida.Cerrar = renderToStaticMarkup(I.IconoCerrar({ width: 18, height: 18 }));
export default salida;`);

// 4. Los cuerpos tal cual.
const cuerpo = (html) => html.slice(html.indexOf(">", html.indexOf("<body")) + 1, html.lastIndexOf("</body>"));
const HTML_TAG = leer(CON, "simple-admin").match(/<html[^>]*>/)[0];
const B = Object.fromEntries(MAQUETAS.map((id) => [id, cuerpo(leer(CON, id))]));
B["sin-ig-slp"] = cuerpo(leer(SIN, "simple-ig-slp"));

// 5. Lo nuevo (prefijo as-), solo en los estados de la propuesta:
//  · los números: la rejilla de `admin/indicadores` se acomoda sola (dos por fila en el teléfono, los cuatro en una fila desde la tableta); la
//    variante de tres por fila fija tres columnas;
//  · el botón de la conexión con el punto de la barra de la app en verde (conectada), gris (sin conexión) o rojo (dejó de publicar): en P, a la
//    derecha del renglón de las pestañas (donde sobra lugar: los chips de la fila no se mueven); en P2, en la fila, justo después de la ciudad;
//  · la hoja «Todos los números» y la de la conexión: los rótulos de grupo de Administración dentro del cuerpo de `ui/Hoja`.
const NUEVO_CSS = `
ul.as-numeros { grid-template-columns: repeat(auto-fit, minmax(136px, 1fr)); }
ul.as-tres { grid-template-columns: repeat(3, minmax(0, 1fr)); }
${sel("admin/enlace")}.as-ver-todos { justify-self: start; margin-top: var(--espacio-1); }
${sel("Cabecera/cabecera")} > .as-conexion { position: absolute; right: var(--gutter); bottom: 0; }
${sel("Cabecera/contexto")} > .as-conexion { flex: none; }
.as-conexion > svg { color: var(--texto); }
${sel("Sesion/punto")}.as-punto-ok { background: var(--ok); }
${sel("Sesion/punto")}.as-punto-no { background: var(--texto-suave); }
${sel("Sesion/punto")}.as-punto-mal { background: var(--error); }
${sel("Hoja/cuerpo")} > ${sel("admin/grupo")}:first-child { margin-top: var(--espacio-2); }
${sel("Hoja/cuerpo")} > ${sel("admin/puede")} { margin-top: var(--espacio-4); }
${sel("Hoja/cuerpo")} > ${sel("Renglon/tarjeta")} { margin-top: var(--espacio-1); }
${sel("Hoja/cuerpo")} > ${sel("Renglon/tarjeta")} + ${sel("Hoja/nota")} { margin-top: var(--espacio-3); }
`;

// 6. Las piezas de la portada, de la de hoy.
const admin = B["simple-admin"];
const inicio = admin.indexOf(`<h2 class="${c("admin/grupo", "admin/conNota")}">Últimos 7 días</h2>`);
const fin = admin.indexOf("</main>");
if (inicio < 0 || fin < inicio) throw new Error("no encuentro los bloques de la portada");
const antes = admin.slice(0, inicio), despues = admin.slice(fin);
const medio = admin.slice(inicio, fin);
/** El `<li>` de un indicador de hoy, por su nombre. */
const indicadorDeHoy = (nombre) => uno(medio, new RegExp(`<li><button type="button" class="${esc(c("admin/indicador"))}" aria-expanded="false"><span class="${esc(c("admin/nombreIndicador"))}">${esc(nombre)}</span>[\\s\\S]*?</button></li>`), nombre)[0];
const bloqueDeHoy = (titulo, hasta) => { const a = medio.indexOf(`>${titulo}</h2>`); const b = medio.indexOf(hasta, a); if (a < 0 || b < 0) throw new Error("bloque " + titulo); return medio.slice(medio.indexOf("</h2>", a) + 5, b); };
const EMBUDO = bloqueDeHoy("Cómo va la comunidad", `<h2 class="${c("admin/grupo", "admin/conNota")}">Fichas</h2>`);
const FICHAS = bloqueDeHoy("Fichas", `<h2 class="${c("admin/grupo")}">Invitaciones CAPO</h2>`);
const CAPO = bloqueDeHoy("Invitaciones CAPO", `<h2 class="${c("admin/grupo")}">Gestionar</h2>`);
const HOY = Object.fromEntries(["Personas activas", "Coincidencias", "Agenda de la semana", "Publica la comunidad", "Voy y Me interesa", "Primera publicación", "Avisos abiertos"].map((n) => [n, indicadorDeHoy(n)]));
// Los conteos de los renglones de Gestionar, los de hoy.
const total = (href) => uno(medio, new RegExp(`href="${esc(href)}">[\\s\\S]*?<span>(\\d+)<svg`), href)[1];

/** Un cuadro: la pieza `admin/indicador` con su nombre, su número, su frase y cómo cambió. */
const cuadro = (clave, nombre, valor, frase, cambio, abierto = false) =>
  `<li><button type="button" class="${c("admin/indicador")}" aria-expanded="${abierto}"${abierto ? ' aria-controls="desglose"' : ""} data-cuadro="${clave}"><span class="${c("admin/nombreIndicador")}">${nombre}</span><b>${valor}</b><small>${frase}</small>${cambio ? `<span class="${c("admin/cambio")}">${cambio}</span>` : ""}</button></li>`;
const CUADROS = {
  nuevas: cuadro("nuevas", "Personas nuevas", 3, "cuentas nuevas, de 80", null),
  comunidad: cuadro("comunidad", "Eventos de la comunidad", 3, "publicados por gente que no es de administración", null),
  voy: cuadro("voy", "Voy y Me interesa", 18, "de 12 personas", "▲ 5 más"),
  avisos: cuadro("avisos", "Avisos abiertos", 11, "de 48 que salieron", "▲ 4 más"),
  agenda: cuadro("agenda", "Eventos esta semana", 37, "en 18 de 71 lugares", "▲ 2 más"),
};
const DESGLOSE_VOY = `<li class="${c("admin/desglose")}" id="desglose"><p>Veces que alguien dijo Voy o Me interesa en los últimos 7 días, sin contar administradores. Se compara con los 7 días anteriores.</p><ul><li>11 Voy</li><li>7 Me interesa</li><li>13 en los 7 días anteriores</li></ul><a class="${c("admin/enlace")}" href="/admin/personas">Ver las personas ›</a></li>`;

const renglon = (icono, titulo, detalle, href, cuenta = "") => `<li><a class="${c("Renglon/ajuste")}" href="${href}">${icono}<b>${titulo}</b>${detalle ? `<small>${detalle}</small>` : ""}<span>${cuenta}${I.Chevron}</span></a></li>`;
const grupo = (titulo, propuesta, filas) => `<h2 class="${c("admin/grupo")}">${titulo}</h2><ul class="${c("Renglon/tarjeta")}" data-propuesta="${propuesta}">${filas.join("")}</ul>`;
const R = {
  personas: renglon(I.Personas, "Personas", "3 nuevas · 6 nunca entraron · 1 correo rebota o se quejó", "/admin/personas", total("/admin/personas")),
  lugares: renglon(I.Pin, "Lugares", "53 sin fecha próxima · 2 ocultos · 1 privado", "/admin/lugares", total("/admin/lugares")),
  eventos: renglon(I.Calendario, "Eventos", "41 sin imagen", "/admin/eventos", total("/admin/eventos")),
  artistas: renglon(I.Estrella, "Artistas", "19 llevados por su gente · 4 ocultos", "/admin/artistas", total("/admin/artistas")),
  obras: renglon(I.Pincel, "Obras colectivas", "Pintar juntos sobre una pared proyectada", "/admin/obras-colectivas"),
  instagram: renglon(I.Instagram, "Instagram", "@smsnstrsapp · 4 publicadas esta semana · 5 sin material", "/admin/instagram"),
  showcase: renglon(I.Destello, "Showcase", "Artistas para presentar a foros · 16 candidatos · 2 invitados", "/admin/showcase"),
  ciudades: renglon(I.Ubicacion, "Ciudades", "4 abiertas · 3 detectadas · 1 oculta", "/admin/ciudades"),
  rutinas: renglon(I.Reloj, "Rutinas", "Completar fichas: apagada · 192,29 USD de crédito", "/admin/corridas"),
  grafo: renglon(I.Grafo, "Grafo cultural", "Mapa en 3D de lugares, artistas y público", "/admin/grafo"),
};

/** La portada propuesta: los números que se le dan, sus columnas y en qué grupo va Obras colectivas. */
function portada({ cuadros, tres = false, obrasEn = "gestionar", abierto = null }) {
  const lis = cuadros.map((k) => (k === abierto ? CUADROS[k].replace('aria-expanded="false"', 'aria-expanded="true" aria-controls="desglose"') : CUADROS[k]));
  if (abierto) lis.splice(Math.min(cuadros.indexOf(abierto) | 1, cuadros.length - 1) + 1, 0, DESGLOSE_VOY);
  const numeros = `<h2 class="${c("admin/grupo", "admin/conNota")}">Esta semana en números</h2><p class="${c("admin/nota")}">Comparado con la semana anterior</p>` +
    `<ul class="${c("admin/indicadores")} ${tres ? "as-tres" : "as-numeros"}" data-propuesta="numeros">${lis.join("")}</ul>` +
    `<button type="button" class="${c("admin/enlace")} as-ver-todos" aria-haspopup="dialog" data-accion="todos" data-propuesta="ver-todos">Ver todos los números ›</button>`;
  const gestionar = [R.personas, R.lugares, R.eventos, R.artistas, ...(obrasEn === "gestionar" ? [R.obras] : [])];
  const herramientas = [R.ciudades, R.rutinas, R.grafo, ...(obrasEn === "herramientas" ? [R.obras] : [])];
  return antes + numeros + grupo("Gestionar", "gestionar", gestionar) + grupo("Difusión", "difusion", [R.instagram, R.showcase]) + grupo("Herramientas", "herramientas", herramientas) + despues;
}

/** La hoja «Todos los números»: lo de hoy (con sus desgloses), menos lo que ya está en la portada, y el CAPO como «Campañas pasadas». */
function hojaNumeros(enPortada) {
  const resto = ["Personas activas", "Coincidencias", "Agenda de la semana", "Publica la comunidad", "Primera publicación", "Voy y Me interesa", "Avisos abiertos"]
    .filter((n) => !(n === "Voy y Me interesa" && enPortada.includes("voy")) && !(n === "Avisos abiertos" && enPortada.includes("avisos")) && !(n === "Agenda de la semana" && enPortada.includes("agenda")));
  const cuerpoHoja =
    `<p class="${c("Hoja/nota")}">Toca un número para ver qué cuenta y de dónde sale.</p>` +
    `<h2 class="${c("admin/grupo", "admin/conNota")}">Últimos 7 días</h2><p class="${c("admin/nota")}">Comparado con hace una semana</p><ul class="${c("admin/indicadores")} as-numeros">${resto.map((n) => HOY[n]).join("")}</ul>` +
    `<h2 class="${c("admin/grupo")}">Cómo va la comunidad</h2>${EMBUDO}` +
    `<h2 class="${c("admin/grupo", "admin/conNota")}">Fichas</h2>${FICHAS.replace(`class="${c("admin/indicadores")}"`, `class="${c("admin/indicadores")} as-numeros"`)}` +
    `<h2 class="${c("admin/grupo", "admin/conNota")}">Campañas pasadas</h2><p class="${c("admin/nota")}">Invitaciones por correo a las fichas del catálogo del CAPO. Ya no se mandan; su medición se queda.</p>${CAPO}`;
  return `<div class="${c("Hoja/fondo")}"><div tabindex="-1" class="${c("Hoja/hoja", "Hoja/conCabecera")}" role="dialog" aria-modal="true" aria-label="Todos los números" data-propuesta="hoja-numeros"><button type="button" class="${c("Hoja/cerrar")}" aria-label="Cerrar">${I.Cerrar}</button><h3>Todos los números</h3><div class="${c("Hoja/cuerpo")}">${cuerpoHoja}</div></div></div>`;
}
const conHoja = (pantalla, hoja) => pantalla.replace(/<main /, '<main inert="" ') + hoja;

const A4 = ["nuevas", "comunidad", "voy", "avisos"];
const A4B = ["nuevas", "comunidad", "voy", "agenda"];
const B3 = ["nuevas", "comunidad", "voy"];
const PANTALLAS = {
  "p-hoy": admin,
  "p-a": portada({ cuadros: A4 }),
  "p-a-abierto": portada({ cuadros: A4, abierto: "voy" }),
  "p-a-hoja": conHoja(portada({ cuadros: A4 }), hojaNumeros(A4)),
  "p-b": portada({ cuadros: B3, tres: true }),
  "p-b-hoja": conHoja(portada({ cuadros: B3, tres: true }), hojaNumeros(B3)),
  "p-c": portada({ cuadros: A4B, obrasEn: "herramientas" }),
  "p-c-hoja": conHoja(portada({ cuadros: A4B, obrasEn: "herramientas" }), hojaNumeros(A4B)),
};

// 7. Instagram. La sección «Conexión» de hoy sale; en la fila de contexto, al final, el botón de la conexión con su punto.
const SECCION_CONEXION = new RegExp(`<section><h2 class="${esc(c("Grupo/titulo"))}">Conexión</h2>[\\s\\S]*?</section>`);
const botonConexion = (estado) => {
  const nombre = { ok: "Instagram: conectada", no: "Instagram: sin conexión", mal: "Instagram: dejó de publicar" }[estado];
  return `<button type="button" class="${c("BotonIcono/boton", "BotonIcono/control", "Sesion/conPunto")} as-conexion" aria-haspopup="dialog" aria-label="${nombre}" data-accion="conexion" data-propuesta="conexion">${I.Ig22}<span class="${c("Sesion/punto")} as-punto-${estado}" aria-hidden="true"></span></button>`;
};
const CIUDAD_CHIP = new RegExp(`(<div class="${esc(c("Cabecera/contexto"))}"[^>]*><button[\\s\\S]*?</button>)`);
const TIRA = /(<div role="tablist"[^>]*>[\s\S]*?<\/div>)(<\/header>)/;
const conBoton = (pantalla, estado, donde = "tira") => donde === "tira"
  ? cambiar(pantalla, TIRA, (_, tira, cierre) => tira + botonConexion(estado) + cierre, "renglón de las pestañas")
  : cambiar(pantalla, CIUDAD_CHIP, (_, chip) => chip + botonConexion(estado), "chip de ciudad");
const sinSeccion = (pantalla) => cambiar(pantalla, SECCION_CONEXION, "", "sección Conexión");
/** El renglón suelto de la conexión (el de hoy, `ConexionInstagram`), sin el rótulo «Conexión»: solo cuando pide algo. */
const renglonConexion = (titulo, detalle, boton) => `<section data-propuesta="conexion-renglon"><ul class="${c("Grupo/lista")}"><li class="${c("Renglon/ajuste", "Renglon/sola")}">${I.Instagram}<b>${titulo}</b><small class="${c("admin/conexionFalta")}">${detalle}</small><a class="${c("admin/pildora")}" href="/api/instagram/conectar" data-accion="reconectar">${boton}</a></li></ul></section>`;
const trasCabecera = (pantalla, extra) => cambiar(pantalla, /(<\/header>)(<p class=")/, (_, h, p) => h + extra + p, "tras la cabecera");
const slp = B["simple-ig-slp"];
const eventos = B["simple-ig-eventos"];
const NO = renglonConexion("Sin conexión", "Conecta Instagram para publicar", "Conectar Instagram");
const MAL = renglonConexion("Instagram dejó de publicar", "La conexión caducó el lun 5 de oct: reconecta", "Reconectar");

/** La hoja de la conexión: la cuenta, desde cuándo, qué puede y el botón. */
function hojaConexion(estado) {
  const fila = (titulo, detalle, falta) => `<ul class="${c("Renglon/tarjeta")}"><li class="${c("Renglon/ajuste")}">${I.Instagram}<b>${titulo}</b><small${falta ? ` class="${c("admin/conexionFalta")}"` : ""}>${detalle}</small></li></ul>`;
  const puede = (items) => `<ul class="${c("admin/puede")}">${items.map((t) => `<li>${I.Ok}${t}</li>`).join("")}</ul>`;
  const cuerpoHoja = {
    ok: fila("@smsnstrsapp", "Página Somos Nosotrxs · conectada desde el 7 de octubre", false) +
      `<h2 class="${c("admin/grupo")}">Puede</h2>` + puede(["Publicar en Instagram", "Publicar en la página de Facebook", "Leer otras cuentas para completar fichas"]) +
      `<p class="${c("Hoja/nota")}">Solo hace falta reconectar si cambia la contraseña de Facebook o si deja de publicar; aquí te avisamos.</p>`,
    no: fila("Sin conexión", "Conecta Instagram para publicar", true) +
      `<p class="${c("Hoja/nota")}">Entra con la cuenta de Facebook que administra la página Somos Nosotrxs y acepta todos los permisos.</p>`,
    mal: fila("@smsnstrsapp", "Dejó de publicar el lun 5 de oct: la conexión caducó", true) +
      `<p class="${c("Hoja/nota")}">Pasa si cambia la contraseña de Facebook o si se quitan los permisos. Reconecta con la cuenta que administra la página y lo que se quedó sin salir se publica solo.</p>`,
  }[estado];
  const boton = estado === "ok"
    ? `<a class="${c("Boton/boton", "Boton/secundario", "Boton/completo")}" href="/api/instagram/conectar" data-accion="reconectar">Reconectar</a>`
    : `<a class="${c("Boton/boton", "Boton/primario", "Boton/completo")}" href="/api/instagram/conectar" data-accion="reconectar">${estado === "no" ? "Conectar Instagram" : "Reconectar"}</a>`;
  return `<div class="${c("Hoja/fondo")}"><div tabindex="-1" class="${c("Hoja/hoja", "Hoja/conCabecera")}" role="dialog" aria-modal="true" aria-label="Conexión con Instagram" data-propuesta="hoja-conexion"><button type="button" class="${c("Hoja/cerrar")}" aria-label="Cerrar">${I.Cerrar}</button><h3>Conexión con Instagram</h3><div class="${c("Hoja/cuerpo")}">${cuerpoHoja}</div><div class="${c("Hoja/pie")}">${boton}</div></div></div>`;
}

// La semana vacía (simulada sobre San Luis: en el respaldo su semana tiene 6 programadas): se abre en «Eventos», con «Falta material» primero.
const FALTA = uno(slp, new RegExp(`<section><ul class="${esc(c("Grupo/lista"))}"><li class="${esc(c("Renglon/lista"))}"><a class="${esc(c("Renglon/frente"))}" href="/admin/instagram"><img alt[\\s\\S]*?Falta material[\\s\\S]*?</section>`), "Falta material")[0];
const vacia = cambiar(sinSeccion(conBoton(eventos, "ok")), new RegExp(`(<p class="${esc(c("Lista/conteo"))}">)`), (_, p) => `<p class="${c("Lista/conteo")}" data-propuesta="semana-vacia">Esta semana no hay nada programado: a nadie le alcanza el material.</p>${FALTA.replace("<section>", '<section data-propuesta="semana-vacia">')}${p}`, "conteo de Eventos");

Object.assign(PANTALLAS, {
  "i-hoy-todas": B["simple-ig-todas"],
  "i-hoy-slp": slp,
  "i-ok": sinSeccion(conBoton(slp, "ok")),
  "i-ok-hoja": conHoja(sinSeccion(conBoton(slp, "ok")), hojaConexion("ok")),
  "i-ok-junto": sinSeccion(conBoton(slp, "ok", "fila")),
  "i-no": trasCabecera(sinSeccion(conBoton(B["sin-ig-slp"], "no")), NO),
  "i-no-hoja": conHoja(trasCabecera(sinSeccion(conBoton(B["sin-ig-slp"], "no")), NO), hojaConexion("no")),
  "i-mal": trasCabecera(sinSeccion(conBoton(slp, "mal")), MAL),
  "i-mal-hoja": conHoja(trasCabecera(sinSeccion(conBoton(slp, "mal")), MAL), hojaConexion("mal")),
  "i-vacia": vacia,
  "i-hoja-ciudad": B["simple-ig-hoja-ciudad"],
});
for (const [id, html] of Object.entries(PANTALLAS)) if (html.includes("undefined")) throw new Error("«undefined» en " + id);

// Cada imagen (data URI) una sola vez: las pantallas de Instagram repiten las mismas tarjetas.
const IMAGENES = [];
const indice = new Map();
for (const id of Object.keys(PANTALLAS)) {
  PANTALLAS[id] = PANTALLAS[id].replace(/data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]+/g, (uri) => {
    if (!indice.has(uri)) { indice.set(uri, IMAGENES.length); IMAGENES.push(uri); }
    return `__IMG_${indice.get(uri)}__`;
  });
}

// 8. Al prototipo: la plantilla de al lado con el CSS, la etiqueta <html>, las imágenes y las pantallas.
const js = (x) => JSON.stringify(x).replace(/<\//g, "<\\/").replace(/<!--/g, "<\\!--");
const plantilla = fs.readFileSync(path.join(AQUI, "admin-simple.plantilla.html"), "utf8");
// El símbolo SN del arte final (regla del founder: en las propuestas, el símbolo y no el logotipo).
const SN = fs.readFileSync(path.join(RAIZ, "docs/diseno/logotipo/LogoFinal/SN - Symbol.svg"), "utf8").replace(/<\?xml[^>]*>/, "").replace("<svg ", '<svg role="img" aria-label="Somos Nosotrxs" ');
const salida = plantilla
  .replace("<!--@SN-->", () => SN)
  .replace("/*@CSS*/", () => CSS + "\n/* OL-493: lo nuevo */\n" + NUEVO_CSS)
  .replace("/*@DATOS*/", () => `const HTML_TAG = ${js(HTML_TAG)};\n  const IMAGENES = ${js(IMAGENES)};\n  const CUERPOS = ${js(PANTALLAS)};`);
fs.writeFileSync(SALIDA, salida);
console.log(`hojas ${hojas.size} · CSS ${Math.round(CSS.length / 1024)} KB · pantallas ${Object.keys(PANTALLAS).length} · imágenes ${IMAGENES.length} · prototipo ${Math.round(salida.length / 1024)} KB`);
console.log("prefijos:", JSON.stringify(PREFIJO));
