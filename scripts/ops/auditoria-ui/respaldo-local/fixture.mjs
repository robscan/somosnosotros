// Datos inventados y verosímiles (nombres de lugares y eventos públicos del sitio; personas inventadas *@example.com).
import fs from "node:fs";

let imagenes = { eventos: {}, lugares: {} };
try {
  imagenes = JSON.parse(fs.readFileSync(new URL("./imagenes.json", import.meta.url), "utf8"));
} catch {}

const ZONA = "America/Mexico_City";
const CIUDAD = "San Luis Potosí";
const hoyLocal = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date()); // YYYY-MM-DD
function fecha(dias, hora) {
  const d = new Date(`${hoyLocal}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return `${d.toISOString().slice(0, 10)}T${hora}:00-06:00`;
}
function iso(s) {
  return new Date(s).toISOString();
}
function masHoras(s, h) {
  return new Date(new Date(s).getTime() + h * 3600e3).toISOString();
}
const hace = (dias) => new Date(Date.now() - dias * 86400e3).toISOString();
// OL-370: cuántos días faltan para el primero de este mes y del que viene (negativo el primero), para fechas que cruzan de un mes a otro cualquier día.
const primeroDelMes = 1 - Number(hoyLocal.slice(8, 10));
const primeroDelMesQueViene = primeroDelMes + new Date(Date.UTC(Number(hoyLocal.slice(0, 4)), Number(hoyLocal.slice(5, 7)), 0)).getUTCDate();

// ---------- personas ----------
export const ANA = "11111111-1111-4111-8111-111111111111";
// OL-341: la segunda cuenta con sesión (el caso de dos cuentas que publican el mismo evento): su cookie es `cookieDe(MARCOS)`.
export const MARCOS = "22222222-2222-4222-8222-222222222222";
const perfiles = [
  { id: ANA, nombre: "Ana Rentería", foto: null, colonia: "Barrio de San Miguelito", bio: null, rol: "usuario", avisos_correo: true, avisos_push: false, avisos_preguntado: true, reservado: false, novedades_vistas_en: hace(1) },
  { id: MARCOS, nombre: "Marcos Ledesma", foto: null, colonia: "Centro", bio: null, rol: "usuario", avisos_correo: false, avisos_push: false, avisos_preguntado: true, reservado: false, novedades_vistas_en: null },
];

// ---------- lugares ----------
const L = {
  miguelito: "aaaa0001-0000-4000-8000-000000000001",
  paz: "aaaa0001-0000-4000-8000-000000000002",
  ferro: "aaaa0001-0000-4000-8000-000000000003",
  muni: "aaaa0001-0000-4000-8000-000000000004",
  ache: "aaaa0001-0000-4000-8000-000000000005",
  ccub: "aaaa0001-0000-4000-8000-000000000006",
  aether: "aaaa0001-0000-4000-8000-000000000007",
  poeta: "aaaa0001-0000-4000-8000-000000000008",
  mascara: "aaaa0001-0000-4000-8000-000000000009",
};
const lugar = (id, slug, nombre, tipo, direccion, lat, lng, redes = [], descripcion = null) => ({
  id, slug, nombre, tipo, direccion, lat, lng, portada: imagenes.lugares[slug] ?? null, descripcion, ciudad: CIUDAD, redes, creado_por: null, visible: true, privado: false, origen: null, zona: ZONA, creado_en: hace(30),
});
const lugares = [
  lugar(L.miguelito, "casa-de-cultura-del-barrio-de-san-miguelito", "Casa de Cultura del Barrio de San Miguelito", "casa_de_cultura", "5 de Mayo 1225, Barrio de San Miguelito, 78339, San Luis Potosí, S.L.P.", 22.1421, -100.9762, [{ url: "https://www.facebook.com/casadeculturasanmiguelito" }]),
  lugar(L.paz, "teatro-de-la-paz", "Teatro de la Paz", "foro", "Villerías 205, Centro, 78000, San Luis Potosí, S.L.P.", 22.1517, -100.9761, [{ url: "https://teatrodelapaz.slp.gob.mx" }, { url: "https://www.instagram.com/teatrodelapazslp" }], "Teatro histórico de 1894 con programación de ópera, danza, teatro y música sinfónica."),
  lugar(L.ferro, "museo-del-ferrocarril-jesus-garcia-corona", "Museo del Ferrocarril Jesús García Corona", "museo", "Manuel José Othón s/n esq. Chico Sein, Centro Histórico, 78000, San Luis Potosí, S.L.P.", 22.1531, -100.9701, [{ url: "https://museodelferrocarril.slp.gob.mx" }, { url: "https://www.facebook.com/museoferrocarrilslp" }, { url: "https://www.instagram.com/museoferrocarrilslp" }, { url: "https://www.youtube.com/@museoferrocarrilslp" }, { url: "https://www.tiktok.com/@museoferrocarrilslp" }], "Antigua estación de ferrocarril convertida en museo, con locomotoras, salas de exposición y un foro para conciertos."),
  lugar(L.muni, "muni-museo-universitario-uaslp", "MUNI Museo Universitario UASLP", "museo", "Av. Manuel Nava 101, Zona Universitaria, 78290, San Luis Potosí, S.L.P.", 22.1419, -101.0002, [{ url: "https://muni.uaslp.mx" }, { url: "https://www.instagram.com/muni.uaslp" }]),
  lugar(L.ache, "ache-galeria", "ACHE Galería", "galeria", "Valentín Gama 840, Centro, 78000, San Luis Potosí, S.L.P.", 22.1561, -100.9871, [{ url: "https://www.instagram.com/achegaleria" }]),
  lugar(L.ccub, "centro-cultural-universitario-bicentenario", "Centro Cultural Universitario Bicentenario", "foro", "Av. Sierra Leona 550, Lomas 2a. Sección, 78210, San Luis Potosí, S.L.P.", 22.1440, -101.0150, [{ url: "https://ccub.uaslp.mx" }]),
  lugar(L.aether, "aether", "Aether", "galeria", "Graciano Sánchez 220-A, Centro, 78000, San Luis Potosí, S.L.P.", 22.1548, -100.9820, [{ url: "https://www.instagram.com/aether.slp" }]),
  lugar(L.poeta, "casa-del-poeta-ramon-lopez-velarde", "Casa del Poeta Ramón López Velarde", "museo", "Vallejo 150, Centro, 78000, San Luis Potosí, S.L.P.", 22.1505, -100.9722, []),
  lugar(L.mascara, "museo-nacional-de-la-mascara", "Museo Nacional de la Máscara", "museo", "Villerías 2, Centro, 78000, San Luis Potosí, S.L.P.", 22.1523, -100.9752, [{ url: "https://museonacionaldelamascara.slp.gob.mx" }]),
];

// ---------- eventos ----------
const E = {
  sinfonica: "bbbb0001-0000-4000-8000-000000000001",
  macario: "bbbb0001-0000-4000-8000-000000000002",
  cristiada: "bbbb0001-0000-4000-8000-000000000003",
  fellini: "bbbb0001-0000-4000-8000-000000000004",
  pimpolina: "bbbb0001-0000-4000-8000-000000000005",
  colocaos: "bbbb0001-0000-4000-8000-000000000006",
  arttoy: "bbbb0001-0000-4000-8000-000000000007",
  susurros: "bbbb0001-0000-4000-8000-000000000008",
  feleal: "bbbb0001-0000-4000-8000-000000000009",
  master: "bbbb0001-0000-4000-8000-000000000010",
  leonora: "bbbb0001-0000-4000-8000-000000000011",
  oca: "bbbb0001-0000-4000-8000-000000000012",
  desierto: "bbbb0001-0000-4000-8000-000000000013",
  // OL-319: dos eventos de Ana, ocultos (no salen en ninguna lista ni cuenta), para medir y probar editar un evento por pasos.
  taller: "bbbb0001-0000-4000-8000-000000000014",
  linternas: "bbbb0001-0000-4000-8000-000000000015",
  // OL-321: una exposición con su inauguración y un festival con su programa (tres actos y un borrador), de Ana y ocultos como los de OL-319.
  ecos: "bbbb0001-0000-4000-8000-000000000016",
  ecosInaug: "bbbb0001-0000-4000-8000-000000000017",
  cine: "bbbb0001-0000-4000-8000-000000000018",
  cine1: "bbbb0001-0000-4000-8000-000000000019",
  cine2: "bbbb0001-0000-4000-8000-000000000020",
  cine3: "bbbb0001-0000-4000-8000-000000000021",
  cine4: "bbbb0001-0000-4000-8000-000000000022",
  // OL-320 (con OL-319 ya usaba «taller»; al apilar OL-322 este taller visible toma su propia clave).
  tallerLinoleo: "bbbb0001-0000-4000-8000-000000000023",
  // OL-370: un festival y una exposición visibles y en curso, de un mes a otro.
  kowai: "bbbb0001-0000-4000-8000-000000000024",
  mundo: "bbbb0001-0000-4000-8000-000000000025",
};
function evento({ id, slug, titulo, dias, hora, dur = 2, lugar_id = null, sitio = null, precio = null, creadoHace = 20, descripcion = null, enlace = null, imagen, autor = MARCOS, visible = true, clase = "puntual", evento_padre_id = null, inaugura_id = null, borrador = false, colores = null }) {
  const inicio = iso(fecha(dias, hora));
  const fin = masHoras(inicio, dur);
  return {
    clase, evento_padre_id, inaugura_id, borrador, retirado_por_admin: false,
    // OL-360: los colores guardados de su cartel (null = sin calcular: la tarjeta usa su paleta propia).
    colores_cartel: colores,
    id, slug, titulo, inicio, fin, termina: fin, descripcion, imagen: imagen ?? imagenes.eventos[slug] ?? null, precio, enlace, creado_por: autor, visible,
    sitio_texto: sitio?.texto ?? null, sitio_direccion: sitio?.direccion ?? null, sitio_lat: sitio?.lat ?? null, sitio_lng: sitio?.lng ?? null, sitio_reservado: false, sitio_revelar_desde: null,
    lugar_id, zona: ZONA, ciudad: CIUDAD, creado_en: hace(creadoHace),
    // La versión que editar manda de vuelta (OL-319): sin ella, «Guardar cambios» pide volver a abrir el evento.
    actualizado_en: hace(creadoHace),
  };
}
const eventos = [
  evento({ id: E.sinfonica, colores: ["#2c2820", "#bfa97c", "#b4aa72", "#a19c92"], slug: "concierto-de-la-orquesta-sinfonica-de-san-luis-potosi", titulo: "Concierto de la Orquesta Sinfónica de San Luis Potosí", dias: 0, hora: "18:00", sitio: { texto: "Templo de San Francisco", direccion: "Calle Jardín Guerrero 7, 78000 San Luis Potosí, San Luis Potosí, México", lat: 22.1497, lng: -100.9768 }, creadoHace: 3, descripcion: "Programa por los 435 años del Convento de San Francisco. Entrada libre.", enlace: "https://www.facebook.com/osslp" }),
  evento({ id: E.macario, slug: "macario-xantolo-camino-al-mictlan", titulo: "Macario, Xantolo camino al Mictlán", dias: 0, hora: "19:00", sitio: { texto: "Teatro del Centro de Difusión Cultural del IPBA Raúl Gamboa", direccion: "Av. Universidad 1385, Centro, San Luis Potosí", lat: 22.1465, lng: -100.9745 }, creadoHace: 12, imagen: null }),
  evento({ id: E.cristiada, slug: "charla-san-luis-potosi-en-la-cristiada-con-joserra-ortiz", titulo: "Charla: San Luis Potosí en la Cristiada, con Joserra Ortiz", dias: 1, hora: "19:30", lugar_id: L.miguelito, creadoHace: 2, descripcion: "Conversación sobre el papel de San Luis Potosí durante la guerra cristera, con el historiador Joserra Ortiz." }),
  evento({ id: E.fellini, slug: "cine-de-barrio-ciclo-fellini-2026-09-30", titulo: "Cine de barrio: ciclo Fellini", dias: 2, hora: "10:00", lugar_id: L.miguelito, creadoHace: 9 }),
  evento({ id: E.pimpolina, slug: "delirium-pollum-clown-y-pantomima-con-pimpolina", titulo: "Delirium Pollum, clown y pantomima con Pimpolina", dias: 3, hora: "18:00", lugar_id: L.paz, precio: "$150", creadoHace: 15, descripcion: "Un espectáculo de clown para toda la familia." }),
  evento({ id: E.colocaos, colores: ["#2d2d2d", "#6d829b", "#3c2f23", "#bdbcba"], slug: "lxs-colocaos-la-ultima-fogueada", titulo: "LXS COLOCAOS: La última fogueada", dias: 4, hora: "19:00", dur: 3, lugar_id: L.muni, creadoHace: 1, descripcion: "Inauguración de la exposición colectiva de cerámica LXS COLOCAOS. Paulina Lucciotto, Marilú Juárez, Arantxa Zoé Hernández, Jesús Orlando Acosta, Sayuri Álvarez, Flora Moreno y Samantha Méndez." }),
  evento({ id: E.arttoy, slug: "inauguracion-de-uno-de-uno-custom-art-toy-2026", titulo: "Inauguración de Uno de Uno · Custom Art Toy 2026", dias: 5, hora: "18:00", lugar_id: L.ache, creadoHace: 4 }),
  evento({ id: E.susurros, slug: "susurros-del-inconsciente", titulo: "Susurros del inconsciente", dias: 6, hora: "20:00", lugar_id: L.aether, precio: "Cooperación solidaria", creadoHace: 6 }),
  evento({ id: E.feleal, slug: "feleal-un-viaje-por-el-mundo-en-acordeon", titulo: "Feleal: un viaje por el mundo en acordeón", dias: 7, hora: "19:00", lugar_id: L.paz, precio: "$120 a $250", creadoHace: 10, enlace: "https://boletos.example.com/feleal" }),
  evento({ id: E.master, colores: ["#060605", "#3d3f23", "#181816", "#181816"], slug: "master-class-9-festival-de-cine-uaslp", titulo: "Master Class - 9° Festival de Cine UASLP", dias: 8, hora: "12:00", lugar_id: L.ccub, creadoHace: 2, descripcion: "Con el actor Daniel Giménez Cacho. Entrada libre, cupo limitado." }),
  evento({ id: E.leonora, slug: "leonora-in-the-morning-light", titulo: "Leonora in the morning light", dias: 9, hora: "17:00", lugar_id: L.ccub, creadoHace: 2, descripcion: "Película de Thor Klein y Lena Vurma. Con presencia de las productoras. Clasificación B15." }),
  evento({ id: E.oca, slug: "oca", titulo: "OCA", dias: 10, hora: "19:00", lugar_id: L.mascara, creadoHace: 5 }),
  evento({ id: E.desierto, colores: ["#0f1315", "#38505b", "#3b565c", "#424542"], slug: "desierto-observacion-y-espacio", titulo: "DESIERTO: Observación y Espacio", dias: 11, hora: "20:00", lugar_id: L.aether, creadoHace: 1, descripcion: "Inauguración de la exposición de escultura, en presencia del artista." }),
  // OL-319 (editar por pasos): de Ana y ocultos. Uno de un día con cartel; otro de tres días (del viernes al domingo) con horario por día.
  evento({ id: E.taller, slug: "taller-de-grabado-en-el-barrio", titulo: "Taller de grabado en el barrio", dias: 2, hora: "17:00", lugar_id: L.miguelito, precio: "$80", creadoHace: 3, descripcion: "Grabado en linóleo para principiantes. Trae ropa que se pueda manchar.", imagen: imagenes.eventos["oca"] ?? null, autor: ANA, visible: false }),
  evento({ id: E.linternas, slug: "festival-de-las-linternas", titulo: "Festival de las Linternas", dias: 2, hora: "20:00", dur: 49, sitio: { texto: "Jardín de San Juan de Dios", direccion: "Calle Madero 1, Centro Histórico, San Luis Potosí", lat: 22.1511, lng: -100.9772 }, creadoHace: 3, imagen: null, autor: ANA, visible: false }),
  // OL-321. La exposición: del día −3 (00:00) al día +20 (23:59), en el MUNI (que tiene horario: Ma–Do de 10:00 a 18:00; un lugar que `medir` no mide, así su ficha no cambia).
  { ...evento({ id: E.ecos, slug: "ecos-de-papel", titulo: "Ecos de papel", dias: -3, hora: "00:00", lugar_id: L.muni, creadoHace: 4, descripcion: "Grabado y papel hecho a mano de Mariana Ruvalcaba.", imagen: imagenes.eventos["desierto-observacion-y-espacio"] ?? null, autor: ANA, visible: false, clase: "exposicion", inaugura_id: E.ecosInaug }), fin: iso(fecha(20, "23:59")), termina: iso(fecha(20, "23:59")) },
  evento({ id: E.ecosInaug, slug: "inauguracion-ecos-de-papel", titulo: "Inauguración: Ecos de papel", dias: -4, hora: "19:00", lugar_id: L.muni, creadoHace: 4, autor: ANA, visible: false }),
  // El festival: el marco y su programa (del día 9 al 11), con un acto como borrador.
  { ...evento({ id: E.cine, slug: "festival-de-cine-de-invierno", titulo: "Festival de Cine de Invierno", dias: 9, hora: "19:00", lugar_id: L.ccub, creadoHace: 2, imagen: imagenes.eventos["leonora-in-the-morning-light"] ?? null, autor: ANA, visible: true, clase: "festival" }), fin: iso(fecha(12, "00:00")), termina: iso(fecha(12, "00:00")) },
  evento({ id: E.cine1, slug: "inauguracion-la-luz-que-queda", titulo: "Inauguración: «La luz que queda»", dias: 9, hora: "19:00", lugar_id: L.ccub, creadoHace: 2, autor: ANA, visible: false, evento_padre_id: E.cine }),
  evento({ id: E.cine2, slug: "charla-con-la-directora", titulo: "Charla con la directora", dias: 10, hora: "18:00", dur: 1, lugar_id: L.ccub, creadoHace: 2, autor: ANA, visible: false, evento_padre_id: E.cine }),
  evento({ id: E.cine3, slug: "funcion-cortometrajes-potosinos", titulo: "Función: cortometrajes potosinos", dias: 11, hora: "17:00", lugar_id: L.paz, creadoHace: 2, autor: ANA, visible: false, evento_padre_id: E.cine }),
  evento({ id: E.cine4, slug: "funcion-de-clausura", titulo: "Función de clausura", dias: 12, hora: "19:00", lugar_id: L.paz, creadoHace: 2, autor: ANA, visible: false, evento_padre_id: E.cine, borrador: true }),
  // OL-320: un taller con horario por día (tres sesiones, cada una con su hora): la agenda lo pone en los tres días. Empieza con su primera sesión y termina con la última.
  // OL-322: es un taller (`clase`), así cada día dice «Sesión n de 3».
  { ...evento({ id: E.tallerLinoleo, slug: "taller-de-grabado-en-linoleo", titulo: "Taller de grabado en linóleo", dias: 2, hora: "17:00", lugar_id: L.ache, precio: "$300", creadoHace: 3, clase: "taller", descripcion: "Tres sesiones para tallar, entintar y estampar tu primera plancha. Trae ropa que se pueda manchar." }), fin: iso(fecha(6, "19:00")), termina: iso(fecha(6, "19:00")) },
  // OL-370: para ver en «Festivales y expos» los sellos de un rango que ya empezó y cruza de mes («→ 23», «→ 8») y la línea «Hasta el…» del festival
  // en curso. El festival, del día 27 del mes pasado (más o menos) a la medianoche que cierra el 23 del que viene; la exposición, del 21 del mes
  // pasado al 8 del que viene (el MUNI tiene horario). Sin actos ni asistencias: no salen en otros carriles ni cambian los «van».
  { ...evento({ id: E.kowai, slug: "kowaifest", titulo: "KOWAIFEST: festival de cultura japonesa", dias: primeroDelMes - 4, hora: "18:00", lugar_id: L.ccub, creadoHace: 12, clase: "festival" }), fin: iso(fecha(primeroDelMesQueViene + 23, "00:00")), termina: iso(fecha(primeroDelMesQueViene + 23, "00:00")) },
  { ...evento({ id: E.mundo, slug: "un-mundo-para-mi", titulo: "Un mundo para mí", dias: primeroDelMes - 10, hora: "00:00", lugar_id: L.muni, creadoHace: 14, clase: "exposicion", descripcion: "Ilustración y gráfica de artistas potosinas." }), fin: iso(fecha(primeroDelMesQueViene + 7, "23:59")), termina: iso(fecha(primeroDelMesQueViene + 7, "23:59")) },
];
/** OL-321: el horario del MUNI Museo Universitario, de martes a domingo de 10:00 a 18:00 (la exposición «Ecos de papel» lo toma). */
const lugares_horarios = [{ id: "aaaa0002-0000-4000-8000-000000000001", lugar_id: L.muni, dias: [2, 3, 4, 5, 6, 7], abre: "10:00:00", cierra: "18:00:00", creado_en: hace(10) }];
/** El horario por día del Festival de las Linternas: viernes y domingo de 20:00 a 21:00, el sábado de 18:00 a 21:00. */
const eventos_sesiones = [0, 1, 2].map((d) => ({ id: `bbbb0002-0000-4000-8000-00000000000${d + 1}`, evento_id: E.linternas, fecha: fecha(2 + d, "20:00").slice(0, 10), inicio: iso(fecha(2 + d, d === 1 ? "18:00" : "20:00")), fin: iso(fecha(2 + d, "21:00")) }));

// Su horario por día: una fila por sesión, cada una con su hora (`fin` posterior al inicio y el mismo día).
const sesiones = [
  { dias: 2, hora: "17:00", fin: "19:00" },
  { dias: 4, hora: "18:00", fin: "20:00" },
  { dias: 6, hora: "17:00", fin: "19:00" },
].map((d, i) => ({ id: `bbbb0002-0000-4000-8000-00000000000${i + 4}`, evento_id: E.tallerLinoleo, fecha: fecha(d.dias, d.hora).slice(0, 10), inicio: iso(fecha(d.dias, d.hora)), fin: iso(fecha(d.dias, d.fin)) }));

// ---------- artistas ----------
const A = {
  osslp: "cccc0001-0000-4000-8000-000000000001",
  cadena: "cccc0001-0000-4000-8000-000000000002",
  pimpolina: "cccc0001-0000-4000-8000-000000000003",
  feleal: "cccc0001-0000-4000-8000-000000000004",
  backside: "cccc0001-0000-4000-8000-000000000005",
  merlot: "cccc0001-0000-4000-8000-000000000006",
};
// Inicio solo destaca a quien tiene foto (doc 50, H-03): los tres con evento próximo usan el cartel público de su propio evento.
const cartel = (slug) => imagenes.eventos[slug] ?? null;
const artista = (id, slug, nombre, disciplina, detalle, tipo, descripcion = null, redes = [], foto = null, portada = null) => ({
  id, slug, nombre, nombre_orden: nombre.toLowerCase(), disciplina, detalle, tipo, foto, portada, descripcion, ciudad: CIUDAD, redes, creado_por: null, visible: true, origen: null, creado_en: hace(40),
});
const artistas = [
  artista(A.osslp, "orquesta-sinfonica-de-san-luis-potosi", "Orquesta Sinfónica de San Luis Potosí", "musica", "Música académica y clásica", "grupo", "Orquesta estatal fundada en 1946.", [{ url: "https://www.facebook.com/osslp" }], cartel("concierto-de-la-orquesta-sinfonica-de-san-luis-potosi"), imagenes.lugares["teatro-de-la-paz"] ?? null),
  artista(A.cadena, "aaron-cadena", "Aaron Cadena", "artes_visuales", "Fotografía", "solista", "Artista visual, fotoperiodista y fotógrafo documental originario de San Luis Potosí.", [{ url: "https://aaroncadena.example.com" }]),
  artista(A.pimpolina, "pimpolina", "Pimpolina", "teatro", "Clown", "solista", null, [], cartel("delirium-pollum-clown-y-pantomima-con-pimpolina")),
  artista(A.feleal, "feleal", "Feleal", "musica", "Acordeón", "solista", null, [], cartel("feleal-un-viaje-por-el-mundo-en-acordeon")),
  // OL-372: con foto (un cartel público), para ver en «Artistas de la semana» un avatar con foto junto a los del símbolo SN.
  artista(A.backside, "0backside0", "0Backside0", "musica", "Rock, metal y alternativo", "grupo", null, [], cartel("susurros-del-inconsciente")),
  artista(A.merlot, "abril-merlot", "Abril Merlot", "musica", "Música académica y clásica", "solista"),
];
// OL-372: lo que hace falta para ver «Artistas destacadxs» con la tarjeta de un evento (E9) y los avatares (E5). Pimpolina la eligió la
// administración (sin novedad); la Orquesta («Nuevo audio», nombre largo que se corta, hoy) y Feleal («Nuevo video») entran por su novedad.
// Abril Merlot, sin foto, publicó un audio: no puede ser destacada (un destacado exige foto) y lo dice bajo su avatar en «Artistas de la semana».
const artistasElegidos = [A.pimpolina];
const novedad = (n, artista_id, proveedor, url, dias) => ({ id: `cccc0002-0000-4000-8000-00000000000${n}`, artista_id, url, proveedor, embed_id: null, titulo: null, texto: null, creado_en: hace(dias), visible: true, publicado_por: null });
const novedades_artista = [
  novedad(1, A.osslp, "soundcloud", "https://soundcloud.com/osslp/huapango-de-moncayo", 1),
  novedad(2, A.feleal, "youtube", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", 2),
  novedad(3, A.merlot, "soundcloud", "https://soundcloud.com/abril-merlot/preludio", 3),
];
const eventos_artistas = [
  { evento_id: E.sinfonica, artista_id: A.osslp, orden: 1 },
  { evento_id: E.pimpolina, artista_id: A.pimpolina, orden: 1 },
  { evento_id: E.feleal, artista_id: A.feleal, orden: 1 },
  // Sin foto y con evento esta semana: «Artistas de la semana» los pinta con el símbolo SN (OL-253). Los de arriba tienen
  // cartel, así que salen en «Artistas destacadxs» y no se repiten allí.
  { evento_id: E.macario, artista_id: A.backside, orden: 1 },
  { evento_id: E.cristiada, artista_id: A.merlot, orden: 1 },
  { evento_id: E.arttoy, artista_id: A.cadena, orden: 1 },
];

// ---------- lo de las personas ----------
const asistencias = [
  { id: "dddd0001-0000-4000-8000-000000000001", usuario_id: ANA, evento_id: E.colocaos, estado: "voy", creado_en: hace(1) },
  { id: "dddd0001-0000-4000-8000-000000000002", usuario_id: ANA, evento_id: E.cristiada, estado: "voy", creado_en: hace(1) },
  { id: "dddd0001-0000-4000-8000-000000000003", usuario_id: ANA, evento_id: E.leonora, estado: "me_interesa", creado_en: hace(0) },
  { id: "dddd0001-0000-4000-8000-000000000004", usuario_id: MARCOS, evento_id: E.colocaos, estado: "voy", creado_en: hace(2) },
  { id: "dddd0001-0000-4000-8000-000000000005", usuario_id: MARCOS, evento_id: E.feleal, estado: "voy", creado_en: hace(2) },
  // OL-364: «Tus planes» con un festival y un taller que le interesan a Ana, para medir la clase junto a la decisión en la tarjeta.
  { id: "dddd0001-0000-4000-8000-000000000006", usuario_id: ANA, evento_id: E.cine, estado: "me_interesa", creado_en: hace(0) },
  { id: "dddd0001-0000-4000-8000-000000000007", usuario_id: ANA, evento_id: E.tallerLinoleo, estado: "me_interesa", creado_en: hace(0) },
];
const seguimientos = [
  { id: "eeee0001-0000-4000-8000-000000000001", usuario_id: ANA, lugar_id: L.miguelito, artista_id: null, creado_en: hace(5) },
  { id: "eeee0001-0000-4000-8000-000000000002", usuario_id: ANA, lugar_id: null, artista_id: A.osslp, creado_en: hace(5) },
  { id: "eeee0001-0000-4000-8000-000000000003", usuario_id: MARCOS, lugar_id: L.paz, artista_id: null, creado_en: hace(9) },
];
const destacados = [E.colocaos, E.master, E.leonora, E.desierto].map((id, i) => ({ id: `ffff0001-0000-4000-8000-00000000000${i + 1}`, evento_id: id, lugar_id: null, artista_id: null, quitado: false, hasta: null, creado_en: hace(2) }));

export const tablas = {
  perfiles, lugares, eventos, artistas, eventos_artistas, asistencias, seguimientos, destacados,
  artistas_cuentas: [], lugares_cuentas: [], bloqueos: [], novedades: [], novedades_artista, reportes: [], suscripciones_push: [], fotos: [], eventos_sitio_privado: [], eventos_sesiones: [...eventos_sesiones, ...sesiones], lugares_horarios, eventos_horarios: [], ajustes_sitio: [], obras_colectivas: [], dispositivos_apns: [], cifrado: [],
};

/** Qué columna del padre apunta a cada tabla (para los `select` anidados). */
export const FK = {
  eventos: { lugares: "lugar_id", perfiles: "creado_por" },
  lugares: { perfiles: "creado_por" },
  artistas: { perfiles: "creado_por" },
  eventos_artistas: { eventos: "evento_id", artistas: "artista_id" },
  eventos_sesiones: { eventos: "evento_id" },
  lugares_horarios: { lugares: "lugar_id" },
  eventos_horarios: { eventos: "evento_id" },
  asistencias: { eventos: "evento_id", perfiles: "usuario_id" },
  seguimientos: { lugares: "lugar_id", artistas: "artista_id", perfiles: "usuario_id" },
  artistas_cuentas: { artistas: "artista_id", perfiles: "perfil_id" },
  lugares_cuentas: { lugares: "lugar_id", perfiles: "perfil_id" },
  bloqueos: { perfiles: "bloqueado" },
  novedades: { eventos: "evento_id", perfiles: "usuario_id" },
  novedades_artista: { artistas: "artista_id" },
  destacados: { eventos: "evento_id", lugares: "lugar_id", artistas: "artista_id" },
  reportes: { perfiles: "cambiado_por" },
};

// ---------- RPC ----------
const van = (id) => asistencias.filter((a) => a.evento_id === id && a.estado === "voy").length;
const resumenArtista = (a) => ({ id: a.id, slug: a.slug, nombre: a.nombre, disciplina: a.disciplina, detalle: a.detalle, tipo: a.tipo, foto: a.foto });
/** Como `novedades_recientes_artistas` (OL-275): la última novedad visible de cada artista visible de la ciudad, de menos de 168 horas. */
function ultimasNovedades(t, ciudad) {
  const ahora = Date.now();
  const ultimas = new Map();
  for (const n of [...t.novedades_artista].sort((x, y) => y.creado_en.localeCompare(x.creado_en) || y.id.localeCompare(x.id))) {
    const a = t.artistas.find((x) => x.id === n.artista_id);
    const edad = ahora - Date.parse(n.creado_en);
    if (!a?.visible || a.ciudad !== ciudad || !n.visible || edad < 0 || edad >= 168 * 3600e3 || ultimas.has(a.id)) continue;
    ultimas.set(a.id, { artista_id: a.id, novedad_id: n.id, proveedor: n.proveedor, creado_en: n.creado_en });
  }
  return ultimas;
}
export const rpcs = {
  // OL-268: mismo contrato agregado de SQL; los permisos/RLS se comprueban en PostgreSQL.
  ciudades_agregadas: ({ p_ahora = new Date().toISOString() }, t) => {
    const grupos = new Map();
    const grupo = (fila) => {
      const clave = JSON.stringify([fila.ciudad, fila.zona]);
      if (!grupos.has(clave)) grupos.set(clave, { ciudad: fila.ciudad, zona: fila.zona, lugares: 0, eventos: 0, lat_suma: 0, lng_suma: 0 });
      return grupos.get(clave);
    };
    for (const l of t.lugares.filter(l => l.visible && !l.privado)) {
      const g = grupo(l);
      g.lugares++; g.lat_suma += l.lat; g.lng_suma += l.lng;
    }
    for (const e of t.eventos.filter(e => e.visible && new Date(e.termina) >= new Date(p_ahora))) grupo(e).eventos++;
    return [...grupos.values()];
  },
  ciudades_artistas_agregadas: (_args, t) => {
    const grupos = new Map();
    for (const a of t.artistas.filter(a => a.visible)) grupos.set(a.ciudad, (grupos.get(a.ciudad) ?? 0) + 1);
    return [...grupos].map(([ciudad, artistas]) => ({ ciudad, artistas }));
  },
  // Respaldo sintético de la cuenta autenticada (la del token: Ana o, con su cookie, Marcos). Los permisos reales se prueban en PostgreSQL.
  mi_perfil: (_args, t, { sub } = {}) => t.perfiles.find(p => p.id === (sub ?? ANA)) ?? null,

  van_por_evento: ({ ids }) => (ids || []).map((id) => ({ evento_id: id, n: van(id) })).filter((x) => x.n > 0),
  tira_destacados: ({ p_tipo }) => (p_tipo === "eventos" ? destacados.map((d) => ({ id: d.evento_id, motivo: "elegido", hasta: null, van: van(d.evento_id) })) : []),
  // OL-372: los dos contratos de OL-275 (los permisos y el veto editorial se prueban en PostgreSQL). La tira de «Artistas destacadxs»: los que
  // eligió la administración y luego los que tienen una novedad vigente, de la más reciente a la más vieja; todos con foto, doce como mucho.
  artistas_destacados_novedades: ({ p_ciudad }, t) => {
    const ultimas = ultimasNovedades(t, p_ciudad);
    const conFoto = (id) => t.artistas.some((a) => a.id === id && a.visible && a.ciudad === p_ciudad && a.foto);
    const fila = (id, motivo) => ({ id, motivo, hasta: null, van: 0, novedad_id: ultimas.get(id)?.novedad_id ?? null, proveedor: ultimas.get(id)?.proveedor ?? null, novedad_creado_en: ultimas.get(id)?.creado_en ?? null });
    const elegidos = artistasElegidos.filter(conFoto).map((id) => fila(id, "elegido"));
    const porNovedad = [...ultimas.values()].filter((n) => conFoto(n.artista_id) && !artistasElegidos.includes(n.artista_id)).map((n) => fila(n.artista_id, "novedad"));
    return [...elegidos, ...porNovedad].slice(0, 12);
  },
  novedades_recientes_artistas: ({ p_ciudad, p_ids }, t) => [...ultimasNovedades(t, p_ciudad).values()].filter((n) => !p_ids || p_ids.includes(n.artista_id)),
  cuenta_seguidores: ({ p_lugar, p_artista }) => seguimientos.filter((s) => (p_lugar ? s.lugar_id === p_lugar : s.artista_id === p_artista)).length,
  disciplinas_con_artistas: () => Object.entries(artistas.reduce((m, a) => ((m[a.disciplina] = (m[a.disciplina] || 0) + 1), m), {})).map(([disciplina, n]) => ({ disciplina, n })),
  detalles_de_disciplina: () => [],
  // Como la base: la fila entera (con su ciudad: el mismo nombre en otra ciudad es otro artista), seis como mucho.
  artistas_con_nombre: ({ p_nombre }) => artistas.filter((a) => a.nombre.toLowerCase().includes(String(p_nombre || "").toLowerCase())).slice(0, 6).map((a) => ({ ...resumenArtista(a), ciudad: a.ciudad })),
  lugares_con_nombre: ({ p_nombre }) => lugares.filter((l) => l.nombre.toLowerCase().includes(String(p_nombre || "").toLowerCase())).map((l) => ({ id: l.id, slug: l.slug, nombre: l.nombre, tipo: l.tipo, direccion: l.direccion, lat: l.lat, lng: l.lng, portada: l.portada, zona: l.zona, privado: false })),
  lugares_parecidos: () => [],
  // OL-315: el alta de lugar con horario contesta lo creado (sin guardarlo: las escrituras no cambian el fixture); el horario se reemplaza sin más.
  crear_lugar_con_horario: ({ p_datos }) => ({ id: crypto.randomUUID(), slug: String(p_datos?.nombre ?? "lugar").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") }),
  guardar_horario_lugar: () => null,
  // OL-316: las subcategorías ya usadas en una disciplina, las más usadas primero (como `subcategorias_de`), de los artistas del respaldo.
  subcategorias_de: ({ p_disciplina }) => Object.entries(artistas.filter((a) => a.visible && a.disciplina === p_disciplina && a.detalle).reduce((m, a) => ((m[a.detalle] = (m[a.detalle] || 0) + 1), m), {})).map(([detalle, n]) => ({ detalle, artistas: n })).sort((x, y) => y.artistas - x.artistas || x.detalle.localeCompare(y.detalle)),
  mi_cupo_de_cartel: () => [],
  // OL-319: editar un evento por pasos contesta lo guardado (sin guardarlo: las escrituras no cambian el fixture).
  editar_evento_con_sesiones: ({ p_evento }) => ({ id: p_evento, artistas: [], artistas_anteriores: [], lugar_anterior: null, cambio: null }),
  // OL-321: guardar con la clase y publicar un programa contestan lo creado (sin guardarlo).
  guardar_evento_con_clase: ({ p_evento, p_operacion }) => ({ id: p_evento ?? p_operacion, artistas: [], artistas_anteriores: [], lugar_anterior: null, cambio: null, padre: null, inauguracion: null }),
  publicar_programa: ({ p_actos, p_operacion }) => ({ id: p_operacion, actos: (p_actos ?? []).filter((a) => a.publicar).map((a) => a.operacion), borradores: (p_actos ?? []).filter((a) => !a.publicar).map((a) => a.operacion) }),
  publicar_borrador_de_programa: ({ p_evento }) => ({ id: p_evento, padre: null }),
  // OL-323: publicar un evento lo deja en memoria (como las asistencias: el fixture no cambia y otro arranque empieza limpio), para que «Publicado»
  // encuentre su sugerencia; aceptar o descartar una sugerencia también queda en memoria.
  guardar_evento_con_avisos: ({ p_evento, p_datos, p_operacion, p_quien }, t, { sub } = {}) => enMemoria(t, p_evento, p_datos, p_operacion, sub, p_quien),
  guardar_evento_con_sesiones: ({ p_evento, p_datos, p_operacion, p_quien }, t, { sub } = {}) => enMemoria(t, p_evento, p_datos, p_operacion, sub, p_quien),
  publicar_exposicion_de_inauguracion: ({ p_inauguracion, p_titulo, p_inicio, p_fin, p_operacion }, t) => {
    const i = t.eventos.find((e) => e.id === p_inauguracion);
    const r = enMemoria(t, null, { ...i, titulo: p_titulo, inicio: p_inicio, fin: p_fin, precio: null, descripcion: null }, p_operacion);
    Object.assign(t.eventos.find((e) => e.id === r.id), { clase: "exposicion", inaugura_id: p_inauguracion, termina: p_fin });
    if (i) i.sugerencias = { ...i.sugerencias, exposicion: { estado: "aceptada" } };
    return { id: r.id, slug: t.eventos.find((e) => e.id === r.id).slug };
  },
  ligar_inauguracion: ({ p_exposicion, p_inauguracion }, t) => {
    const x = t.eventos.find((e) => e.id === p_exposicion);
    if (x) x.inaugura_id = p_inauguracion;
    return { id: p_exposicion, slug: x?.slug ?? null };
  },
  relacionar_en_festival: ({ p_eventos = [], p_marco, p_titulo, p_operacion }, t) => {
    const actos = t.eventos.filter((e) => p_eventos.includes(e.id)).sort((a, b) => a.inicio.localeCompare(b.inicio));
    const id = p_marco ?? p_operacion;
    if (!t.eventos.some((e) => e.id === id)) enMemoria(t, null, { ...actos[0], titulo: p_titulo, inicio: actos[0].inicio, fin: actos.at(-1).termina }, id);
    const marco = t.eventos.find((e) => e.id === id);
    marco.clase = "festival";
    for (const a of actos) Object.assign(a, { evento_padre_id: id, sugerencias: { ...a.sugerencias, festival: { estado: "aceptada" } } });
    return { id, slug: marco.slug, titulo: marco.titulo, actos: t.eventos.filter((e) => e.evento_padre_id === id && e.visible).length };
  },
  // OL-341 (a): el evento entra como acto del festival que ya estaba publicado, con el nombre de la participación (sin las comprobaciones de la
  // base: esas se prueban en `supabase/tests/pg/festival-parecido.test.mjs`).
  unir_a_festival_parecido: ({ p_evento, p_festival, p_titulo }, t) => {
    const e = t.eventos.find((x) => x.id === p_evento);
    const f = t.eventos.find((x) => x.id === p_festival);
    if (!e || !f) return null;
    Object.assign(e, { evento_padre_id: f.id, titulo: p_titulo?.trim() || e.titulo, sugerencias: { ...e.sugerencias, parecido: { estado: "aceptada" } } });
    return { id: f.id, slug: f.slug, titulo: f.titulo, actos: t.eventos.filter((x) => x.evento_padre_id === f.id && x.visible).length };
  },
  // OL-341 (b): el evento igual de otra cuenta se vuelve el marco de un festival (su título, sus fechas, su sitio y su autor) y los dos, sus actos.
  festival_de_dos_parecidos: ({ p_existente, p_nuevo, p_titulo, p_operacion }, t) => {
    const x = t.eventos.find((e) => e.id === p_existente);
    const n = t.eventos.find((e) => e.id === p_nuevo);
    if (!x || !n) return null;
    if (!t.eventos.some((e) => e.id === p_operacion)) {
      enMemoria(t, null, { ...x, descripcion: null, precio: null }, p_operacion, x.creado_por);
      Object.assign(t.eventos.find((e) => e.id === p_operacion), { clase: "festival", fin: x.fin, termina: x.termina });
    }
    x.evento_padre_id = p_operacion;
    Object.assign(n, { evento_padre_id: p_operacion, titulo: p_titulo?.trim() || n.titulo, sugerencias: { ...n.sugerencias, parecido: { estado: "aceptada" } } });
    const marco = t.eventos.find((e) => e.id === p_operacion);
    return { id: marco.id, slug: marco.slug, titulo: marco.titulo, actos: t.eventos.filter((e) => e.evento_padre_id === marco.id && e.visible).length };
  },
  anotar_sugerencia: ({ p_evento, p_tipo, p_estado, p_clave }, t) => {
    const e = t.eventos.find((x) => x.id === p_evento);
    if (e && e.sugerencias?.[p_tipo]?.estado !== "aceptada") e.sugerencias = { ...e.sugerencias, [p_tipo]: { estado: p_estado, ...(p_clave ? { clave: p_clave } : {}) } };
    return null;
  },
};

/**
 * Un evento que se publica desde la app (OL-323): a la memoria, con lo que guarda la base (la clave de la operación como id, su slug y la cuenta
 * del token: Ana o Marcos). Quién (OL-341): los artistas que ya existen se ligan por su id y uno nuevo se crea en memoria con su nombre.
 */
function enMemoria(t, p_evento, p_datos, p_operacion, autor = ANA, quien = []) {
  const vacio = { artistas: [], artistas_anteriores: [], lugar_anterior: null, cambio: null };
  if (p_evento) return { id: p_evento, ...vacio };
  if (t.eventos.some((e) => e.id === p_operacion)) return { id: p_operacion, ...vacio, repetido: true };
  const d = p_datos ?? {};
  const slug = `${String(d.titulo ?? "evento").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)}-${String(p_operacion).slice(0, 4)}`;
  const termina = d.fin ?? masHoras(d.inicio, 3); // como eventos.termina: fin o inicio + 3 h (OL-358)
  t.eventos.push({
    clase: "puntual", evento_padre_id: null, inaugura_id: null, borrador: false, retirado_por_admin: false, sugerencias: {},
    id: p_operacion, slug, titulo: d.titulo, inicio: d.inicio, fin: d.fin ?? null, termina, descripcion: d.descripcion ?? null, imagen: d.imagen ?? null, precio: d.precio ?? null, enlace: d.enlace ?? null,
    creado_por: autor ?? ANA, visible: true, sitio_texto: d.sitio_texto ?? null, sitio_direccion: d.sitio_direccion ?? null, sitio_lat: d.sitio_lat ?? null, sitio_lng: d.sitio_lng ?? null,
    sitio_reservado: !!d.sitio_reservado, sitio_revelar_desde: null, lugar_id: d.lugar_id ?? null, zona: d.zona ?? ZONA, ciudad: d.ciudad ?? CIUDAD, creado_en: new Date().toISOString(), actualizado_en: new Date().toISOString(),
  });
  (Array.isArray(quien) ? quien : []).forEach((q, orden) => {
    let artista = t.artistas.find((a) => a.id === q.id);
    if (!artista && q.nombre) {
      artista = { ...t.artistas[0], id: crypto.randomUUID(), slug: String(q.nombre).toLowerCase().replace(/[^a-z0-9]+/g, "-"), nombre: q.nombre, nombre_orden: String(q.nombre).toLowerCase(), foto: null, portada: null, descripcion: null, redes: [], creado_por: autor ?? ANA };
      t.artistas.push(artista);
    }
    if (artista) t.eventos_artistas.push({ evento_id: p_operacion, artista_id: artista.id, orden: orden + 1 });
  });
  return { id: p_operacion, ...vacio };
}

// ---------- sesión inventada (JWT HS256 sin firma válida: la app solo lo decodifica y pregunta a /auth/v1/user) ----------
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const ahora = Math.floor(Date.now() / 1000);
const CORREOS = { [ANA]: "ana@example.com", [MARCOS]: "marcos@example.com" };
/** La sesión inventada de una cuenta del respaldo (Ana por omisión; Marcos para el caso de dos cuentas, OL-341). */
export function sesionDe(sub = ANA) {
  const claims = { iss: "http://127.0.0.1:8823/auth/v1", sub, aud: "authenticated", exp: ahora + 365 * 86400, iat: ahora, email: CORREOS[sub], phone: "", app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {}, role: "authenticated", aal: "aal1", amr: [{ method: "otp", timestamp: ahora }], session_id: sub === ANA ? "33333333-3333-4333-8333-333333333333" : "44444444-4444-4444-8444-444444444444", is_anonymous: false };
  const jwt = `${b64({ alg: "HS256", typ: "JWT" })}.${b64(claims)}.ZmlybWFfZGVfcHJ1ZWJh`;
  const usuario = { id: sub, aud: "authenticated", role: "authenticated", email: CORREOS[sub], email_confirmed_at: hace(30), phone: "", confirmed_at: hace(30), last_sign_in_at: hace(0), app_metadata: claims.app_metadata, user_metadata: {}, identities: [], created_at: hace(30), updated_at: hace(0), is_anonymous: false };
  return { access_token: jwt, token_type: "bearer", expires_in: 365 * 86400, expires_at: claims.exp, refresh_token: `refresco-de-prueba-${sub.slice(0, 4)}`, user: usuario };
}
/** La cookie `sb-127-auth-token` de una cuenta del respaldo. */
export const cookieDe = (sub = ANA) => `base64-${Buffer.from(JSON.stringify(sesionDe(sub))).toString("base64url")}`;
/** La cuenta de un token (`Authorization: Bearer …` o el refresco), o Ana si no se lee. */
export function subDe(token) {
  if (String(token ?? "").startsWith("refresco-de-prueba-")) return Object.keys(CORREOS).find((id) => id.startsWith(String(token).slice(19))) ?? ANA;
  try {
    const sub = JSON.parse(Buffer.from(String(token).split(".")[1], "base64url").toString()).sub;
    return CORREOS[sub] ? sub : ANA;
  } catch {
    return ANA;
  }
}
export const sesion = sesionDe(ANA);
export const usuario = sesion.user;
export const cookie = cookieDe(ANA);
