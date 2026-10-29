// Arma el prototipo de OL-477 (bitácora 509): la semana de Instagram con artistas y lugares destacados, sobre las maquetas REALES de
// `maqueta-pantalla.mjs` (la app compilada contra el respaldo con `RESPALDO_HISTORIAL=1 RESPALDO_INSTAGRAM_SEMANA=1`, cuenta de administración):
// Administración › Instagram como está hoy (la lista y su hoja de vista previa), el «···» de la ficha de un artista y Agenda (por `ui/Pestanas`).
// Cada estado reúne piezas que ya existen con sus clases de producción (con su hash: `c()` falla si una no está, así nunca se inventa una): la
// barra, `ui/Cabecera` con el chip de ciudad y `ui/Pestanas`, `ui/Chip` en la fila de contexto, `Lista/conteo`, `ui/Grupo`, `ui/Renglon` (lista y
// ajuste), `ui/Hoja` con su ✕, `HojaInstagram` (la vista, sus líneas, las etiquetas, la ubicación, `ui/CampoLargo` con su contador, la casilla
// «También en Facebook» y su nota), `admin/hecho`, `admin/enlace` y `ui/Boton`. Las tarjetas son PNG reales de `instagram-calendario-tarjetas.mjs`
// (las piezas de «Crear cartel»). Lo poco nuevo va en `NUEVO_CSS` (prefijo `ic-`). Escribe `docs/rediseno/prototipos/instagram-calendario.html`;
// el armazón (selectores, tamaños, notas y medidor) vive en la plantilla de al lado.
//
//   RESPALDO_HISTORIAL=1 RESPALDO_INSTAGRAM_SEMANA=1 node scripts/ops/auditoria-ui/maqueta-pantalla.mjs <maquetas> --solo=igc-
//   node scripts/ops/auditoria-ui/prototipo/instagram-calendario-tarjetas.mjs <tarjetas> docs/rediseno/capturas-509
//   node scripts/ops/auditoria-ui/prototipo/instagram-calendario.mjs <maquetas> <tarjetas>/tarjetas.json
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const RAIZ = path.resolve(AQUI, "../../../..");
const sharp = createRequire(path.join(RAIZ, "package.json"))("sharp");
const [MAQ, TARJETAS] = process.argv.slice(2);
if (!MAQ || !TARJETAS) { console.error("uso: instagram-calendario.mjs <maquetas> <tarjetas.json>"); process.exit(1); }
const SALIDA = path.join(RAIZ, "docs/rediseno/prototipos/instagram-calendario.html");
const leer = (id) => fs.readFileSync(path.join(MAQ, id + ".html"), "utf8");
const T = JSON.parse(fs.readFileSync(TARJETAS, "utf8"));
const MAQUETAS = ["igc-lista", "igc-hoja", "igc-artista-menu", "igc-agenda"];

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
const sel = (n) => "." + c(n);

// 3. Lo nuevo, solo en los estados de la propuesta:
//  · la miniatura de la tarjeta en el renglón, en 4:5 (el alto del renglón, cuatro quintos de ancho), con el borde de la vista;
//  · la tira de días (variante T): el carril de Inicio con una tarjeta por día (su día arriba, la tarjeta a 4:5 y su estado);
//  · el texto completo de una publicación o del mensaje en la hoja (el `<pre>` de la nota, que respeta los renglones del texto).
const NUEVO_CSS = `
${sel("Renglon/foto")}.ic-cartel { width: calc(var(--foto-renglon) * 4 / 5); height: var(--foto-renglon); border: 1px solid var(--borde); }
${sel("Renglon/frente")} > small > span.ic-hecho { color: var(--ok); }
${sel("Renglon/frente")} > small > span.ic-falta { color: var(--primario); font-weight: 600; }
ul.ic-tira { padding-block: var(--espacio-2) var(--espacio-4); }
ul.ic-tira > li > a { display: grid; grid-template-rows: auto auto auto; row-gap: var(--espacio-1); width: calc(var(--foto-renglon) * 2.5); color: var(--texto); text-decoration: none; }
ul.ic-tira > li > a > b { font-size: var(--letra-sm); }
ul.ic-tira > li > a > img { width: 100%; height: auto; aspect-ratio: 4 / 5; object-fit: cover; border: 1px solid var(--borde); border-radius: var(--radio-chico); background: var(--fondo-miniatura); }
ul.ic-tira > li > a > small { color: var(--texto-suave); font-size: var(--letra-sm); line-height: 1.25; }
${sel("Renglon/lista")} > a.${c("admin/enlace")}, ${sel("admin/hecho")} > a.${c("admin/enlace")} { min-width: var(--toque-min); justify-content: center; }
pre.ic-texto { margin: 0; padding: var(--espacio-3); border: 1px solid var(--borde); border-radius: var(--radio); background: var(--fondo-contenido); font: inherit; font-size: var(--letra-sm); line-height: 1.4; white-space: pre-wrap; overflow-wrap: anywhere; }
`;

// 4. Piezas de las maquetas.
const cuerpo = (html) => html.slice(html.indexOf(">", html.indexOf("<body")) + 1, html.lastIndexOf("</body>"));
const etiquetaHtml = (id) => leer(id).match(/<html[^>]*>/)[0];
const uno = (texto, patron, que) => { const m = [...texto.matchAll(new RegExp(patron.source, "g"))]; if (m.length !== 1) throw new Error(`${que}: ${m.length} coincidencias`); return m[0][0]; };
const LISTA = cuerpo(leer("igc-lista"));
const HOJA = cuerpo(leer("igc-hoja"));
const MENU = cuerpo(leer("igc-artista-menu"));
const AGENDA = cuerpo(leer("igc-agenda"));
const MAIN = uno(LISTA, /<main class="[^"]*paginaContenido[^"]*">[\s\S]*?<\/main>/, "main");
const BARRA = uno(MAIN, /<header class="[^"]*Barra-module[^"]*">[\s\S]*?<\/header>/, "barra");
const CHIP_CIUDAD = uno(MAIN, /<button type="button" class="[^"]*Chip-module[^"]*__contexto[^"]*" aria-haspopup="dialog">[\s\S]*?<\/button>/, "chip de ciudad");
const SECCIONES = MAIN.slice(MAIN.indexOf("<section>"), MAIN.lastIndexOf("</section>") + 10);
const RENGLONES = Object.fromEntries([...SECCIONES.matchAll(/<li class="[^"]*Renglon-module[^"]*__lista"><a class="[^"]*" href="([^"]+)">[\s\S]*?<\/li>/g)].map((m) => [m[1], m[0]]));
const fotoDe = (href) => RENGLONES[href]?.match(/src="(data:[^"]+)"/)?.[1] ?? null;
const CERRAR = uno(HOJA, /<button type="button" class="[^"]*Hoja-module[^"]*__cerrar" aria-label="Cerrar">[\s\S]*?<\/button>/, "cerrar");
const FORMATO = uno(HOJA, /<div class="[^"]*Chip-module[^"]*__chips" role="group" aria-label="Formato">[\s\S]*?<\/div>/, "formato");
const CASILLA_FB = uno(HOJA, /<button type="button" role="checkbox"[\s\S]*?<\/button>/, "casilla");
const MENU_UL = uno(MENU, /<ul class="[^"]*Renglon-module[^"]*__tarjeta[^"]*">[\s\S]*?<\/ul>/, "menú");
const PESTANA_DEMO = uno(AGENDA, /<div role="tablist"[\s\S]*?<\/div>/, "pestañas");
if (!PESTANA_DEMO.includes(c("Pestanas/tira"))) throw new Error("pestañas sin su clase");
const I = T.iconos;
const icono = (n, tam = 22) => I[n].replace(/width="22" height="22"/, `width="${tam}" height="${tam}"`);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Imágenes de los eventos: las del renglón de hoy y, si no está en la lista, su cartel público (`imagenes.json`) o el dibujado del respaldo.
const imagenesRespaldo = JSON.parse(fs.readFileSync(path.join(RAIZ, "scripts/ops/auditoria-ui/respaldo-local/imagenes.json"), "utf8"));
const carpetaFotos = fs.mkdtempSync(path.join(os.tmpdir(), "ol477-proto-"));
await (await import("../respaldo-local/fotos-historial.mjs")).dibujarFotosHistorial(carpetaFotos);
const miniatura = async (bytes) => "data:image/jpeg;base64," + (await sharp(bytes).resize(360, 450, { fit: "cover", position: "attention" }).jpeg({ quality: 80 }).toBuffer()).toString("base64");
const deUrl = async (url) => { try { const r = await fetch(url); if (!r.ok) throw new Error(r.status); return await miniatura(Buffer.from(await r.arrayBuffer())); } catch { return null; } };
const SIN_FOTO = "data:image/png;base64," + fs.readFileSync(path.join(RAIZ, "public/sin-foto.png")).toString("base64");
const EV = {
  ecos: { titulo: "Los Ecos del Tangamanga en Aether", src: await miniatura(fs.readFileSync(path.join(carpetaFotos, "hist-cartel-2.jpg"))), lugar: "Aether" },
  pimpolina: { titulo: "Delirium Pollum, clown y pantomima con Pimpolina", src: fotoDe("/eventos/delirium-pollum-clown-y-pantomima-con-pimpolina") ?? (await deUrl(imagenesRespaldo.eventos["delirium-pollum-clown-y-pantomima-con-pimpolina"])), lugar: "Teatro de la Paz" },
  susurros: { titulo: "Susurros del inconsciente", src: fotoDe("/eventos/susurros-del-inconsciente") ?? (await deUrl(imagenesRespaldo.eventos["susurros-del-inconsciente"])), lugar: "Aether" },
  oca: { titulo: "OCA", src: await deUrl(imagenesRespaldo.eventos.oca), lugar: "Museo Nacional de la Máscara" },
};
fs.rmSync(carpetaFotos, { recursive: true, force: true });
for (const [k, v] of Object.entries(EV)) if (!v.src) { console.warn("sin imagen de", k); v.src = SIN_FOTO; }
const TJ = (k) => T.tarjetas[k].src;

// 5. Las casillas de cada semana. `tipo`: lo que pide la regla del día; `estado`: publicado, programado, hoy, publicando, descanso, quitado.
const F = T.fichas;
const SEMANAS = {
  esta: {
    rango: "5 al 11 de octubre",
    dias: [
      { id: "lun5", dia: "Lun 5", hora: "7:00 pm", tipo: "Artista", nombre: F.renata.nombre, img: TJ("renata-4x5"), estado: "publicado", medida: "31 visitas · 3 van" },
      { id: "mar6", dia: "Mar 6", hora: "9:00 am", tipo: "Evento del día", nombre: EV.ecos.titulo, img: EV.ecos.src, estado: "publicado", medida: "12 visitas · 2 van" },
      { id: "mie7", dia: "Hoy", hora: "7:00 pm", tipo: "Lugar", nombre: F.leonora.nombre, img: TJ("leonora-4x5"), estado: "hoy" },
      { id: "jue8", dia: "Jue 8", hora: "9:00 am", tipo: "Esta semana · carrusel de 3", nombre: "Del viernes 9 al domingo 11", img: TJ("semana-8-4x5"), estado: "programado" },
      { id: "vie9", dia: "Vie 9", hora: "7:00 pm", tipo: "Artista con fecha el fin", nombre: F.inigo.nombre, img: TJ("inigo-4x5"), estado: "programado", aviso: "Avisado el lun 5 · sin respuesta" },
      { id: "sab10", dia: "Sáb 10", hora: "9:00 am", tipo: "Evento del día", nombre: EV.pimpolina.titulo, img: EV.pimpolina.src, estado: "programado" },
      { id: "dom11", dia: "Dom 11", tipo: "Descanso", nombre: "Sin publicación", img: SIN_FOTO, estado: "descanso" },
    ],
  },
  viene: {
    rango: "12 al 18 de octubre",
    dias: [
      { id: "lun12", dia: "Lun 12", hora: "7:00 pm", tipo: "Artista", nombre: F.nube.nombre, img: TJ("nube-4x5"), estado: "programado", aviso: "Falta avisarle", falta: true },
      { id: "mar13", dia: "Mar 13", hora: "9:00 am", tipo: "Evento del día", nombre: EV.susurros.titulo, img: EV.susurros.src, estado: "programado" },
      { id: "mie14", dia: "Mié 14", hora: "7:00 pm", tipo: "Lugar", nombre: F.ferro.nombre, img: TJ("ferro-4x5"), estado: "programado" },
      { id: "jue15", dia: "Jue 15", hora: "9:00 am", tipo: "Esta semana · carrusel de 3", nombre: "Del viernes 16 al domingo 18", img: TJ("semana-15-4x5"), estado: "programado" },
      { id: "vie16", dia: "Vie 16", hora: "7:00 pm", tipo: "Artista con fecha el fin", nombre: F.valeria.nombre, img: TJ("valeria-4x5"), estado: "programado", aviso: "Falta avisarle", falta: true },
      { id: "sab17", dia: "Sáb 17", hora: "9:00 am", tipo: "Evento del día", nombre: EV.oca.titulo, img: EV.oca.src, estado: "programado" },
      { id: "dom18", dia: "Dom 18", tipo: "Descanso", nombre: "Sin publicación", img: SIN_FOTO, estado: "descanso" },
    ],
  },
};
const CONTEO = { esta: "2 publicadas · 4 programadas · el domingo descansa", viene: "6 programadas · 2 artistas por avisar · el domingo descansa" };

/** Las líneas del renglón de una casilla: cuándo y qué toca, cómo va y, si ya salió, lo que dio. */
function lineas(d, cambios = {}) {
  const x = { ...d, ...cambios };
  const cuando = x.hora ? `${x.dia} · ${x.hora} · ${x.tipo}` : `${x.dia} · ${x.tipo}`;
  const estado = {
    publicado: `<span class="${c("Renglon/envuelve")} ic-hecho">Publicado</span>`,
    hoy: `<span class="${c("Renglon/envuelve")}">Sale hoy a las ${x.hora}</span>`,
    programado: `<span class="${c("Renglon/envuelve")}">Programado</span>`,
    publicando: `<span class="${c("Renglon/envuelve")}">Publicando…</span>`,
    descanso: `<span class="${c("Renglon/envuelve")}">La cuenta descansa</span>`,
    quitado: `<span class="${c("Renglon/envuelve")}">Quitado: este día no se publica</span>`,
  }[x.estado];
  const aviso = x.aviso && !["publicado", "quitado"].includes(x.estado) ? `<span class="${c("Renglon/envuelve")}${x.falta ? " ic-falta" : ""}">${esc(x.aviso)}</span>` : "";
  const medida = x.medida ? `<span class="${c("Renglon/envuelve")}">${esc(x.medida)}</span>` : "";
  return `<span class="${c("Renglon/envuelve")}">${esc(cuando)}</span>${estado}${aviso}${medida}`;
}
function renglon(d, cambios = {}) {
  const x = { ...d, ...cambios };
  const ver = x.estado === "publicado" ? `<a class="${c("admin/enlace")}" href="https://www.instagram.com/p/DEMO477${x.id}/" data-accion="ver" aria-label="Ver en Instagram: ${esc(x.nombre)}">Ver</a>` : "";
  return `<li class="${c("Renglon/lista")}" data-casilla="${x.id}"><a class="${c("Renglon/frente")}" href="#${x.id}" data-casilla="${x.id}"><img alt="" width="45" height="56" class="${c("Renglon/foto")} ic-cartel" src="${x.img}"><b>${esc(x.nombre)}</b><small>${lineas(d, cambios)}</small></a>${ver}</li>`;
}
function tira(semana, cambios = {}) {
  const li = SEMANAS[semana].dias.map((d) => {
    const x = { ...d, ...(cambios[d.id] ?? {}) };
    const estado = { publicado: x.medida ? `Publicado · ${x.medida}` : "Publicado", hoy: `Hoy, ${x.hora}`, programado: `${x.hora} · programado`, descanso: "Descansa", publicando: "Publicando…", quitado: "Quitado" }[x.estado];
    return `<li><a href="#${x.id}" data-casilla="${x.id}"><b>${esc(x.dia === "Hoy" ? "Hoy · " + x.tipo : x.dia + " · " + x.tipo)}</b><img alt="${esc(x.nombre)}" width="140" height="175" src="${x.img}"><small>${esc(estado)}</small></a></li>`;
  });
  return `<ul class="${c("Destacados/carril", "Destacados/cartelMediana")} ic-tira" aria-label="La semana" data-propuesta="tira">${li.join("")}</ul>`;
}

// 6. La pantalla: la barra; la cabecera con el chip de ciudad (y los de semana) y, en A, las pestañas «Semana · Eventos»; y el contenido.
const pestanas = (activa) => `<div role="tablist" aria-label="Instagram" class="${c("Pestanas/tira")}" data-propuesta="pestanas"><button type="button" role="tab" aria-selected="${activa === "semana"}" class="${c("Pestanas/pestana")}" data-pestana="semana">Semana</button><button type="button" role="tab" aria-selected="${activa === "eventos"}" class="${c("Pestanas/pestana")}" data-pestana="eventos">Eventos</button></div>`;
const chipSemana = (semana) => ["esta", "viene"].map((s) => `<button type="button" class="${c("Chip/chip", "Chip/toque")}${s === semana ? " " + c("Chip/activo") : ""}" aria-pressed="${s === semana}" data-semana="${s}" data-propuesta="chip">${s === "esta" ? "Esta semana" : "La que viene"}</button>`).join("");
function pantalla({ variante = "A", forma = "R", pestana = "semana", semana = "esta", cambios = {} }) {
  const cabecera = `<header class="${c("Cabecera/cabecera")}"><div class="${c("Cabecera/contexto")}">${CHIP_CIUDAD}${pestana === "semana" ? chipSemana(semana) : ""}</div>${variante === "A" ? pestanas(pestana) : ""}</header>`;
  const s = SEMANAS[semana];
  const grupoSemana = forma === "T"
    ? `<p class="${c("Lista/conteo")}" data-propuesta="conteo">Del ${s.rango} · ${CONTEO[semana]}</p>${tira(semana, cambios)}`
    : `<p class="${c("Lista/conteo")}" data-propuesta="conteo">${CONTEO[semana]}</p><section data-propuesta="semana"><h2 class="${c("Grupo/titulo")}">Del ${s.rango}<span>· 7 días</span></h2><ul class="${c("Grupo/lista")}">${s.dias.map((d) => renglon(d, cambios[d.id])).join("")}</ul></section>`;
  let contenido;
  if (variante === "B") contenido = grupoSemana.replace(`data-propuesta="conteo"`, `data-propuesta="conteo"`) + SECCIONES;
  else if (pestana === "eventos") contenido = `<p class="${c("Lista/conteo")}">15 eventos en los próximos 7 días · 1 ya en Instagram</p>${SECCIONES}`;
  else contenido = grupoSemana;
  const main = MAIN.replace(/(<main[^>]*>)[\s\S]*<\/main>/, (_, a) => `${a}${BARRA}${cabecera}${contenido}</main>`);
  return LISTA.replace(MAIN, () => main);
}

// 7. Las hojas (ui/Hoja con cabecera, como «Publicar en Instagram»).
const hoja = ({ titulo, cuerpoHtml, pie = "" }) => `<div class="${c("Hoja/fondo")}"><div tabindex="-1" class="${c("Hoja/hoja", "Hoja/conCabecera")}" role="dialog" aria-modal="true" aria-label="${esc(titulo)}" data-propuesta="hoja">${CERRAR}<h3>${esc(titulo)}</h3><div class="${c("Hoja/cuerpo")}">${cuerpoHtml}</div>${pie ? `<div class="${c("Hoja/pie")}">${pie}</div>` : ""}</div></div>`;
const nota = (html, extra = "") => `<p class="${c("Hoja/nota")}${extra ? " " + extra : ""}">${html}</p>`;
const enlace = (texto, accion) => `<button type="button" class="${c("admin/enlace")}" data-accion="${accion}">${esc(texto)}</button>`;
const hecho = (ic, texto, accion = "", extra = "") => `<p class="${c("admin/hecho")}${extra}">${icono(ic)}<span>${texto}</span>${accion}</p>`;
const primario = (texto, accion) => `<button type="button" class="${c("Boton/boton", "Boton/primario", "Boton/completo")}" data-accion="${accion}">${esc(texto)}</button>`;
const secundario = (texto, accion) => `<button type="button" class="${c("Boton/boton", "Boton/secundario", "Boton/completo")}" data-accion="${accion}">${esc(texto)}</button>`;
const vista = (src, alt, formato = "4x5") => `<img class="${c("HojaInstagram/vista")}" data-formato="${formato}" alt="${esc(alt)}" width="720" height="${formato === "9x16" ? 1280 : 900}" src="${src}">`;
// Los chips de formato, como los de la hoja real (Publicación 4:5 · Historia 9:16).
const formatoChips = (historia) => `<div class="${c("Chip/chips")}" role="group" aria-label="Formato">${[["Publicación 4:5", !historia, "4x5"], ["Historia 9:16", historia, "9x16"]].map(([t, si, f]) => `<button type="button" class="${c("Chip/chip", "Chip/toque")}${si ? " " + c("Chip/activo") : ""}" aria-pressed="${si}" data-formato="${f}">${t}</button>`).join("")}</div>`;
if (!FORMATO.includes("Publicación 4:5")) throw new Error("los chips de formato cambiaron");
const ubicacion = (texto) => `<p class="${c("Hoja/nota", "HojaInstagram/ubicacion")}">${icono("IconoPin", 16)}<span>${esc(texto)}</span></p>`;
const campo = (etiqueta, texto, contador) => `<div class="${c("Campo/campo")}"><button type="button" class="${c("CampoLargo/renglon")}" aria-label="${esc(etiqueta)}" data-accion="texto"><span class="${c("CampoLargo/filaEtiqueta")}"><span class="${c("CampoLargo/etiquetaRenglon")}">${esc(etiqueta)}</span>${contador ? `<span class="${c("ContadorCaracteres/contador")}">${contador}</span>` : ""}</span><span class="${c("CampoLargo/resumen")}">${esc(texto)}</span>${icono("IconoChevronDerecha", 18).replace("<svg", `<svg class="${c("CampoLargo/chevron")}"`)}</button></div>`;
const textoCompleto = (texto) => `<pre class="ic-texto" data-propuesta="texto">${esc(texto)}</pre>`;
// La ✕ de la etiqueta: la de producción es IconoCerrar (no está entre los iconos pedidos): se toma la de la hoja real.
const X16 = uno(HOJA, /aria-label="Quitar @teatrodelapazslp">@teatrodelapazslp(<svg[\s\S]*?<\/svg>)/, "x").match(/<svg[\s\S]*?<\/svg>/)[0];
const etiquetasOk = (cuenta) => `${nota("Se etiqueta en la foto y se menciona en el texto:", c("HojaInstagram/linea"))}<div class="${c("Chip/chips", "Chip/envuelve")}" role="group" aria-label="Etiquetas en la foto"><button type="button" class="${c("Chip/chip", "Chip/quitar", "Chip/toque", "Chip/activo")}" aria-label="Quitar @${esc(cuenta)}">@${esc(cuenta)}${X16}</button></div>`;
const fb = (texto) => `${CASILLA_FB}${nota(texto, c("HojaInstagram/trasCasilla"))}`;
const largo = (t) => `${[...t].length}/2200`;

/** La hoja de una casilla programada: la tarjeta, por qué la eligió el sistema con «Cambiar», el aviso (artistas), las etiquetas, la ubicación,
 *  el texto, Facebook, cuándo sale y «Quitar de la semana»; abajo, «Publicar ahora». */
function hojaCasilla({ titulo, img, alt, por, cuenta, texto, sale, aviso = "", formato = "4x5", sinCambiar = false }) {
  return hoja({
    titulo,
    cuerpoHtml: [
      formatoChips(formato === "9x16"),
      vista(img, alt, formato),
      nota(`${esc(por)}${sinCambiar ? "" : " " + enlace("Cambiar", "cambiar")}`, c("HojaInstagram/linea")),
      aviso,
      cuenta ? etiquetasOk(cuenta) : "",
      formato === "9x16" ? nota("Las historias no llevan texto y duran 24 horas.") : ubicacion("Ubicación: San Luis Potosí") + campo("Texto de la publicación", texto, largo(texto)),
      fb(sale),
      nota(enlace("Quitar de la semana", "quitar")),
    ].join(""),
    pie: primario("Publicar ahora", "ahora"),
  });
}
const avisoLinea = (cuenta, avisado) => avisado
  ? `${hecho("IconoInstagram", `Aviso a @${esc(cuenta)}: ${esc(avisado)}`, "", ` ${c("HojaInstagram/enCamino")}`)}${nota(`Si contesta que no, ${enlace("Dijo que no", "dijo-no")}`)}`
  : `${hecho("IconoInstagram", `Aviso a @${esc(cuenta)}: falta mandarlo`, enlace("Avisar", "avisar"), ` ${c("HojaInstagram/enCamino")}`)}`;

const H = {};
H.leonora = hojaCasilla({ titulo: "Hoy · 7:00 pm · Lugar", img: TJ("leonora-4x5"), alt: `Tarjeta: ${F.leonora.nombre}`, por: "Lugar con 2 eventos esta semana, de San Luis Potosí, nunca en Instagram.", cuenta: F.leonora.cuenta, texto: T.textos.leonora, sale: "Sale sola hoy a las 7:00 pm en @smsnstrsapp y en su página de Facebook. Te avisamos en el teléfono cuando salga." });
H.leonora916 = hojaCasilla({ titulo: "Hoy · 7:00 pm · Lugar", img: TJ("leonora-9x16"), alt: `Historia: ${F.leonora.nombre}`, por: "Lugar con 2 eventos esta semana, de San Luis Potosí, nunca en Instagram.", cuenta: F.leonora.cuenta, texto: T.textos.leonora, sale: "La historia sale con la publicación, hoy a las 7:00 pm.", formato: "9x16" });
H.nube = hojaCasilla({ titulo: "Lun 12 · 7:00 pm · Artista", img: TJ("nube-4x5"), alt: `Tarjeta: ${F.nube.nombre}`, por: "Artista sin fecha próxima, de San Luis Potosí, nunca en Instagram.", cuenta: F.nube.cuenta, texto: T.textos.nube, sale: "Sale sola el lunes 12 a las 7:00 pm en @smsnstrsapp y en su página de Facebook.", aviso: avisoLinea(F.nube.cuenta, null) });
H.nubeAvisada = H.nube.replace(avisoLinea(F.nube.cuenta, null), avisoLinea(F.nube.cuenta, "avisado hoy, 10:05 am · sin respuesta"));
H.valeria = hojaCasilla({ titulo: "Vie 16 · 7:00 pm · Artista con fecha el fin", img: TJ("valeria-4x5"), alt: `Tarjeta: ${F.valeria.nombre}`, por: "Artista con fecha ese mismo viernes en el Teatro de la Paz, de San Luis Potosí, nunca en Instagram.", cuenta: F.valeria.cuenta, texto: T.textos.valeria, sale: "Sale sola el viernes 16 a las 7:00 pm en @smsnstrsapp y en su página de Facebook.", aviso: avisoLinea(F.valeria.cuenta, null) });
H.susurros = hojaCasilla({ titulo: "Mar 13 · 9:00 am · Evento del día", img: EV.susurros.src, alt: "Cartel: Susurros del inconsciente", por: "El evento de ese día con más señal: destacado, 4 les interesa.", cuenta: "aether.slp", texto: "Susurros del inconsciente\nMartes 13 de octubre · 8:00–10:00 pm\n📍 Aether @aether.slp · San Luis Potosí\nCooperación solidaria\n\nSigue a @smsnstrsapp para enterarte de más planes. Este y otros eventos, en somosnosotrxs.org (enlace en la bio).\n\n#SanLuisPotosi #AgendaCultural #SomosNosotrxs", sale: "Sale sola el martes 13 a las 9:00 am en @smsnstrsapp y en su página de Facebook." });
H.semana = hojaCasilla({ titulo: "Jue 15 · 9:00 am · Esta semana", img: TJ("semana-15-4x5"), alt: "Portada del carrusel: del viernes 16 al domingo 18 de octubre", por: "Carrusel de 4 imágenes: esta portada y los carteles de los tres eventos con más señal del fin.", cuenta: null, texto: "Este fin en San Luis Potosí:\nVie 16 · Valeria Quiroz: canciones nuevas · Teatro de la Paz @teatrodelapazslp\nSáb 17 · OCA · Museo Nacional de la Máscara\nDom 18 · DESIERTO: Observación y Espacio · Aether @aether.slp\n\nSigue a @smsnstrsapp para enterarte de más planes. Estos y otros eventos, en somosnosotrxs.org (enlace en la bio).\n\n#SanLuisPotosi #AgendaCultural #FinDeSemana #SomosNosotrxs", sale: "Sale solo el jueves 15 a las 9:00 am en @smsnstrsapp y en su página de Facebook." });
H.descanso = hoja({ titulo: "Dom 18 · Descanso", cuerpoHtml: nota("Los domingos la cuenta descansa: así la semana lleva seis publicaciones y ninguna se pisa con otra.") + nota("Si quieres, ese día puede salir un lugar más (el siguiente de la rotación)."), pie: secundario("Poner un lugar este domingo", "poner-lugar") });
// Cambiar: los candidatos que quedan, en el orden de la regla; tocar uno lo pone en la casilla.
const candidato = (k, linea2) => `<li class="${c("Renglon/lista")}"><a class="${c("Renglon/frente")}" href="#elegir-${k}" data-elegir="${k}"><img alt="" width="56" height="56" class="${c("Renglon/foto", "Renglon/redonda")}" src="${F[k].fotoSrc}"><b>${esc(F[k].nombre)}</b><small><span class="${c("Renglon/envuelve")}">${esc(F[k].ceja)} · ${esc(F[k].ciudad)}</span><span class="${c("Renglon/envuelve")}">${esc(linea2)}</span></small></a></li>`;
H.cambiar = hoja({
  titulo: "Cambiar el lunes 12",
  cuerpoHtml: nota("Van primero quienes tienen fecha en los próximos 30 días y luego los de San Luis Potosí. Solo fichas completas (foto, portada, descripción e Instagram), nadie que haya salido en los últimos 6 meses ni que haya dicho que no.") +
    `<ul class="${c("Grupo/lista")}" data-propuesta="candidatos">${candidato("ximena", "Sin fecha próxima · nunca en Instagram")}${candidato("teodoro", "Sin fecha próxima · nunca en Instagram")}</ul>` +
    nota("Valeria Quiroz (demo) ya va el viernes 16; Renata Saldaña (demo) e Íñigo Montalvo (demo) salieron esta semana."),
});
H.avisar = hoja({
  titulo: `Avisar a ${F.nube.nombre}`,
  cuerpoHtml: nota(`Sale el lunes 12. Instagram no deja que la app mande el primer mensaje: se manda desde @smsnstrsapp, en tu teléfono o en el Chrome. El texto ya está listo.`) + textoCompleto(T.avisos.nube) + nota(`Si contesta que no, ${enlace("Dijo que no", "dijo-no")}: sale de la semana y de la rotación, y su ficha lo recuerda.`),
  pie: primario("Copiar y abrir su Instagram", "copiar"),
});
H.dijoNo = hoja({
  titulo: `¿Sacar a ${F.nube.nombre} de Instagram?`,
  cuerpoHtml: nota("No vuelve a salir en la semana. Su lugar del lunes 12 lo toma la siguiente ficha de la rotación. Se puede volver a poner desde el «···» de su ficha.") + nota(`¿Te equivocaste? ${enlace("Mejor no", "mejor-no")}`),
  pie: secundario("Sí, sacarlo de Instagram", "sacar"),
});
H.publicado = hoja({
  titulo: "Lun 5 · Artista",
  cuerpoHtml: [
    vista(TJ("renata-4x5"), `Tarjeta: ${F.renata.nombre}`),
    `<div role="status" data-propuesta="medida">${hecho("IconoInstagram", "Instagram: publicado, lun 5 a las 7:00 pm", `<a class="${c("admin/enlace")}" href="https://www.instagram.com/p/DEMO477lun5/" aria-label="Ver en Instagram">Ver</a>`)}${hecho("IconoFacebook", "Facebook: publicado", `<a class="${c("admin/enlace")}" href="https://www.facebook.com/" aria-label="Ver en Facebook">Ver</a>`)}${hecho("IconoOjo", "31 visitas a su ficha desde Instagram")}${hecho("IconoPersonas", "3 dieron «Voy» a su próxima fecha después de verla")}</div>`,
    nota("Cuenta las visitas a su ficha que llegan con la marca de Instagram (la página del enlace de la bio y la historia) y quién, con cuenta, da «Voy» a uno de sus eventos en los 7 días siguientes. Sin datos de nadie: solo las cifras."),
  ].join(""),
});
H.textoAbierto = (k) => hoja({ titulo: k === "leonora" ? "Texto · Museo Leonora Carrington (demo)" : `Texto · ${F[k].nombre}`, cuerpoHtml: nota(`${largo(T.textos[k])} letras · lo que se ve antes de «más» es la primera frase.`) + textoCompleto(T.textos[k]), pie: primario("Listo", "listo") });
// La ficha del artista con su «···» (cuenta de administración): un renglón más, «Fuera de Instagram».
const menuFuera = MENU.replace(MENU_UL, MENU_UL.replace(/<\/ul>$/, `<li data-propuesta="menu"><button type="button" class="${c("Renglon/ajuste")}" data-accion="volver-a-poner">${icono("IconoInstagram", 20)}<b>Fuera de Instagram</b><small>Dijo que no el mié 7 de oct · Volver a poner</small></button></li></ul>`).replace(/(<\/a><\/li>)/, `$1`));

// 8. Los estados.
const conHoja = (base, h) => base + h;
const P = {};
const tag = {};
const poner = (id, html, conCapas = false) => { P[id] = html; tag[id] = etiquetaHtml(conCapas ? "igc-hoja" : "igc-lista"); };
poner("hoy-lista", LISTA);
poner("hoy-hoja", HOJA, true);
poner("a-esta", pantalla({ semana: "esta" }));
poner("a-viene", pantalla({ semana: "viene" }));
poner("a-eventos", pantalla({ pestana: "eventos" }));
poner("a-publicando", pantalla({ semana: "esta", cambios: { mie7: { estado: "publicando" } } }));
poner("a-quitado", pantalla({ semana: "esta", cambios: { mie7: { estado: "quitado", img: SIN_FOTO } } }));
poner("a-cambiado", pantalla({ semana: "viene", cambios: { lun12: { nombre: F.ximena.nombre, img: TJ("ximena-4x5"), aviso: "Falta avisarle · en lugar del Colectivo Nube de Papel", falta: true } } }));
poner("b-esta", pantalla({ variante: "B", semana: "esta" }));
poner("t-esta", pantalla({ forma: "T", semana: "esta" }));
poner("h-leonora", conHoja(pantalla({ semana: "esta" }), H.leonora), true);
poner("h-leonora-916", conHoja(pantalla({ semana: "esta" }), H.leonora916), true);
poner("h-nube", conHoja(pantalla({ semana: "viene" }), H.nube), true);
poner("h-cambiar", conHoja(pantalla({ semana: "viene" }), H.cambiar), true);
poner("h-valeria", conHoja(pantalla({ semana: "viene" }), H.valeria), true);
poner("h-susurros", conHoja(pantalla({ semana: "viene" }), H.susurros), true);
poner("h-semana", conHoja(pantalla({ semana: "viene" }), H.semana), true);
poner("h-descanso", conHoja(pantalla({ semana: "viene" }), H.descanso), true);
poner("t-texto-valeria", conHoja(pantalla({ semana: "viene" }), H.textoAbierto("valeria")), true);
poner("t-texto-nube", conHoja(pantalla({ semana: "viene" }), H.textoAbierto("nube")), true);
poner("t-texto-leonora", conHoja(pantalla({ semana: "esta" }), H.textoAbierto("leonora")), true);
poner("v-avisar", conHoja(pantalla({ semana: "viene" }), H.avisar), true);
poner("v-avisada", conHoja(pantalla({ semana: "viene", cambios: { lun12: { aviso: "Avisado hoy · sin respuesta", falta: false } } }), H.nubeAvisada), true);
poner("v-dijo-no", conHoja(pantalla({ semana: "viene" }), H.dijoNo), true);
poner("v-ficha", menuFuera, true);
poner("m-publicado", conHoja(pantalla({ semana: "esta" }), H.publicado), true);
for (const [id, html] of Object.entries(P)) if (/Lorem|undefined|null"/.test(html.replace(/data:[^"]+/g, ""))) throw new Error("texto de relleno en " + id);

// 9. Cada imagen (data URI) una sola vez y, si pesa más de 60 KB, otra vez comprimida a 720 de ancho (como `meter-maqueta.mjs`).
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

// 10. Al prototipo: la plantilla con el CSS (y lo nuevo), las etiquetas <html>, las imágenes, las pantallas y los textos (para las notas).
const js = (x) => JSON.stringify(x).replace(/<\//g, "<\\/").replace(/<!--/g, "<\\!--");
const plantilla = fs.readFileSync(path.join(AQUI, "instagram-calendario.plantilla.html"), "utf8");
const salida = plantilla
  .replace("/*@CSS*/", () => CSS + "\n/* OL-477: lo nuevo (prefijo ic-) */\n" + NUEVO_CSS)
  .replace("/*@DATOS*/", () => `const ETIQUETAS = ${js(tag)};\n  const IMAGENES = ${js(IMAGENES)};\n  const CUERPOS = ${js(P)};\n  const TEXTOS = ${js(T.textos)};\n  const AVISOS = ${js(T.avisos)};`);
fs.writeFileSync(SALIDA, salida);
console.log(`hojas ${hojas.size} · CSS ${Math.round(CSS.length / 1024)} KB · estados ${Object.keys(P).length} · imágenes ${IMAGENES.length} · prototipo ${Math.round(salida.length / 1024)} KB`);
