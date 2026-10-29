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
// OL-401: la cuenta de administración del respaldo (el grafo cultural de /admin/grafo): su cookie es `cookieDe(ADMIN)`. Su perfil solo lo
// devuelve `mi_perfil` (no está en `perfiles`), así ninguna lista ni cuenta de las pantallas que se miden cambia.
export const ADMIN = "55555555-5555-4555-8555-555555555555";
// Una segunda cuenta de administración sin ninguna asistencia (el aviso «Aún no tienes asistencias» del interruptor «Yo»): `cookieDe(ADMIN_SIN)`.
export const ADMIN_SIN = "77777777-7777-4777-8777-777777777777";
const perfilAdmin = { id: ADMIN, nombre: "Admin de prueba", foto: null, colonia: null, bio: null, rol: "admin", avisos_correo: false, avisos_push: false, avisos_preguntado: true, reservado: false, novedades_vistas_en: hace(1) };
const perfiles = [
  // OL-480: con `RESPALDO_SIN_PREGUNTAR=1` a Ana todavía no se le preguntó por los avisos: el primer «Voy» o «Seguir» abre la hoja.
  { id: ANA, nombre: "Ana Rentería", foto: null, colonia: "Barrio de San Miguelito", bio: null, rol: "usuario", avisos_correo: true, avisos_push: false, avisos_preguntado: process.env.RESPALDO_SIN_PREGUNTAR !== "1", reservado: false, novedades_vistas_en: hace(1) },
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
  // OL-375: una exposición sin cartel (enseña la foto de su lugar): su portada del sistema toma su color de respaldo. Su id da el amarillo
  // («Xantolo»), el caso de la bitácora 405 junto a la mostaza de «Un mundo para mí» (vecinas casi del mismo color).
  reflejo: "bbbb0001-0000-4000-8000-000000000039",
};
function evento({ id, slug, titulo, dias, hora, dur = 2, lugar_id = null, sitio = null, precio = null, creadoHace = 20, descripcion = null, enlace = null, imagen, autor = MARCOS, visible = true, clase = "puntual", evento_padre_id = null, inaugura_id = null, borrador = false, colores = null, cancelado = false }) {
  const inicio = iso(fecha(dias, hora));
  const fin = masHoras(inicio, dur);
  return {
    // OL-391: «se canceló» (solo en lo que ya pasó).
    clase, evento_padre_id, inaugura_id, borrador, retirado_por_admin: false, cancelado,
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
  // El festival: el marco y su programa (del día 9 al 11), con un acto como borrador. OL-375: su cartel es gris (los colores de Fotovisión 31): su
  // portada del sistema toma su color de respaldo.
  { ...evento({ id: E.cine, colores: ["#111112", "#614b47", "#363e4a", "#49494b"], slug: "festival-de-cine-de-invierno", titulo: "Festival de Cine de Invierno", dias: 9, hora: "19:00", lugar_id: L.ccub, creadoHace: 2, imagen: imagenes.eventos["leonora-in-the-morning-light"] ?? null, autor: ANA, visible: true, clase: "festival" }), fin: iso(fecha(12, "00:00")), termina: iso(fecha(12, "00:00")) },
  evento({ id: E.cine1, slug: "inauguracion-la-luz-que-queda", titulo: "Inauguración: «La luz que queda»", dias: 9, hora: "19:00", lugar_id: L.ccub, creadoHace: 2, autor: ANA, visible: false, evento_padre_id: E.cine }),
  evento({ id: E.cine2, slug: "charla-con-la-directora", titulo: "Charla con la directora", dias: 10, hora: "18:00", dur: 1, lugar_id: L.ccub, creadoHace: 2, autor: ANA, visible: false, evento_padre_id: E.cine }),
  evento({ id: E.cine3, slug: "funcion-cortometrajes-potosinos", titulo: "Función: cortometrajes potosinos", dias: 11, hora: "17:00", lugar_id: L.paz, creadoHace: 2, autor: ANA, visible: false, evento_padre_id: E.cine }),
  evento({ id: E.cine4, slug: "funcion-de-clausura", titulo: "Función de clausura", dias: 12, hora: "19:00", lugar_id: L.paz, creadoHace: 2, autor: ANA, visible: false, evento_padre_id: E.cine, borrador: true }),
  // OL-320: un taller con horario por día (tres sesiones, cada una con su hora): la agenda lo pone en los tres días. Empieza con su primera sesión y termina con la última.
  // OL-322: es un taller (`clase`), así cada día dice «Sesión n de 3». OL-375: con su cartel y sus colores (los del laboratorio de exploración
  // sonora, olivo: la banda clara con tinta negra).
  { ...evento({ id: E.tallerLinoleo, colores: ["#060605", "#3e3f23", "#181817", "#181817"], imagen: imagenes.eventos["9-festival-de-cine-uaslp-cafe-chairel"] ?? null, slug: "taller-de-grabado-en-linoleo", titulo: "Taller de grabado en linóleo", dias: 2, hora: "17:00", lugar_id: L.ache, precio: "$300", creadoHace: 3, clase: "taller", descripcion: "Tres sesiones para tallar, entintar y estampar tu primera plancha. Trae ropa que se pueda manchar." }), fin: iso(fecha(6, "19:00")), termina: iso(fecha(6, "19:00")) },
  // OL-370: para ver en «Festivales y expos» los sellos de un rango que ya empezó y cruza de mes («→ 23», «→ 8») y la línea «Hasta el…» del festival
  // en curso. El festival, del día 27 del mes pasado (más o menos) a la medianoche que cierra el 23 del que viene; la exposición, del 21 del mes
  // pasado al 8 del que viene (el MUNI tiene horario). Sin actos ni asistencias: no salen en otros carriles ni cambian los «van».
  // OL-375: el festival con los colores de su cartel (los de KOWAIFEST) y la exposición con los de una mostaza («Una vez más»: la banda clara).
  { ...evento({ id: E.kowai, colores: ["#18070a", "#721323", "#194541", "#232121"], slug: "kowaifest", titulo: "KOWAIFEST: festival de cultura japonesa", dias: primeroDelMes - 4, hora: "18:00", lugar_id: L.ccub, creadoHace: 12, clase: "festival" }), fin: iso(fecha(primeroDelMesQueViene + 23, "00:00")), termina: iso(fecha(primeroDelMesQueViene + 23, "00:00")) },
  { ...evento({ id: E.mundo, colores: ["#312d08", "#e3cb00", "#d52713", "#a09f9f"], slug: "un-mundo-para-mi", titulo: "Un mundo para mí", dias: primeroDelMes - 10, hora: "00:00", lugar_id: L.muni, creadoHace: 14, clase: "exposicion", descripcion: "Ilustración y gráfica de artistas potosinas." }), fin: iso(fecha(primeroDelMesQueViene + 7, "23:59")), termina: iso(fecha(primeroDelMesQueViene + 7, "23:59")) },
  // OL-375: sin cartel (la foto del MUNI); cierra entre «Un mundo para mí» y KOWAIFEST, así en «Festivales y expos» va justo después de la mostaza.
  { ...evento({ id: E.reflejo, slug: "reflejo-atemporal-pintura-y-grafica", titulo: "Reflejo atemporal: pintura y gráfica", dias: -6, hora: "00:00", lugar_id: L.muni, creadoHace: 20, imagen: null, clase: "exposicion", descripcion: "Pintura y gráfica de Bernardo Cid." }), fin: iso(fecha(primeroDelMesQueViene + 14, "23:59")), termina: iso(fecha(primeroDelMesQueViene + 14, "23:59")) },
];
// OL-390: lo que ya pasó, para la «Trayectoria» de un artista y el «Historial» de un lugar. Solo en ACHE Galería y el Centro Cultural
// Universitario Bicentenario y con Feleal, Abril Merlot, 0Backside0 y Rocío Lozano (de visita, sin fechas próximas): ninguna pantalla que mide
// `npm run medir` los enseña (Teatro de la Paz, el Museo del Ferrocarril y Aaron Cadena no cambian). Visibles y ya terminados: no salen en
// ninguna lista de lo que viene. Dos meses (este y el anterior), un acto de un festival que ya pasó, un sitio sin ficha y quiénes fueron.
const EP = {
  noche: "bbbb0003-0000-4000-8000-000000000001",
  retratos: "bbbb0003-0000-4000-8000-000000000002",
  otono: "bbbb0003-0000-4000-8000-000000000003",
  otonoDuo: "bbbb0003-0000-4000-8000-000000000004",
  otonoCierre: "bbbb0003-0000-4000-8000-000000000005",
  acordeonAche: "bbbb0003-0000-4000-8000-000000000006",
  jardin: "bbbb0003-0000-4000-8000-000000000007",
  rocioCcub: "bbbb0003-0000-4000-8000-000000000008",
  // OL-391: una exposición que ya cerró en la Casa del Poeta y su inauguración, que se canceló (lo ligado que se canceló: «Se canceló»).
  agua: "bbbb0003-0000-4000-8000-000000000009",
  aguaInaug: "bbbb0003-0000-4000-8000-000000000010",
};
eventos.push(
  evento({ id: EP.noche, slug: "noche-de-acordeon-y-guitarra", titulo: "Noche de acordeón y guitarra", dias: -2, hora: "20:00", lugar_id: L.ache, creadoHace: 12, imagen: null }),
  evento({ id: EP.retratos, slug: "retratos-de-barrio-en-vivo", titulo: "Retratos de barrio en vivo", dias: -5, hora: "19:00", lugar_id: L.ache, creadoHace: 15, imagen: null }),
  // Un festival que ya pasó (del mes anterior), con dos actos en el Bicentenario: la ceja del festival en los renglones.
  // OL-391: el cierre del festival se canceló: en su «Ya pasó», tachado y con «Se canceló» delante de la hora; no cuenta en el historial del
  // Bicentenario ni en la trayectoria de 0Backside0.
  { ...evento({ id: EP.otono, slug: "festival-otono-sonoro", titulo: "Festival Otoño Sonoro", dias: primeroDelMes - 9, hora: "18:00", lugar_id: L.ccub, creadoHace: 40, imagen: null, clase: "festival" }), fin: iso(fecha(primeroDelMes - 7, "23:00")), termina: iso(fecha(primeroDelMes - 7, "23:00")) },
  evento({ id: EP.otonoDuo, slug: "feleal-y-abril-merlot-a-duo", titulo: "Feleal y Abril Merlot a dúo", dias: primeroDelMes - 9, hora: "19:00", lugar_id: L.ccub, creadoHace: 40, imagen: null, evento_padre_id: EP.otono }),
  evento({ id: EP.otonoCierre, slug: "cierre-otono-sonoro", titulo: "Cierre de Otoño Sonoro", dias: primeroDelMes - 7, hora: "20:00", lugar_id: L.ccub, creadoHace: 40, imagen: null, evento_padre_id: EP.otono, cancelado: true }),
  // OL-391: se canceló. Feleal: «3 fechas · 1 cancelado · 2 lugares» (ACHE sigue por la «Noche de acordeón y guitarra»).
  evento({ id: EP.acordeonAche, slug: "feleal-acordeon-en-ache", titulo: "Feleal: acordeón en ACHE", dias: primeroDelMes - 4, hora: "20:00", lugar_id: L.ache, creadoHace: 35, imagen: null, cancelado: true }),
  // En un sitio sin ficha: cuenta en la trayectoria, pero no en «Se ha presentado en».
  evento({ id: EP.jardin, slug: "feleal-en-el-jardin-de-san-juan-de-dios", titulo: "Feleal en el Jardín de San Juan de Dios", dias: primeroDelMes - 12, hora: "12:00", sitio: { texto: "Jardín de San Juan de Dios", direccion: "Calle Madero 1, Centro Histórico, San Luis Potosí", lat: 22.1511, lng: -100.9772 }, creadoHace: 45, imagen: null }),
  evento({ id: EP.rocioCcub, slug: "rocio-lozano-canciones-de-ida-y-vuelta", titulo: "Rocío Lozano: canciones de ida y vuelta", dias: primeroDelMes - 3, hora: "19:30", lugar_id: L.ccub, creadoHace: 30, imagen: null }),
  // OL-391: la exposición abrió sin su inauguración (se canceló) y ya cerró; en la Casa del Poeta, que ninguna pantalla medida enseña.
  { ...evento({ id: EP.agua, slug: "cartografias-del-agua", titulo: "Cartografías del agua", dias: primeroDelMes - 20, hora: "00:00", lugar_id: L.poeta, creadoHace: 50, imagen: null, clase: "exposicion", inaugura_id: EP.aguaInaug, descripcion: "Grabado y mapas dibujados a mano sobre los ríos de la Huasteca." }), fin: iso(fecha(primeroDelMes - 2, "23:59")), termina: iso(fecha(primeroDelMes - 2, "23:59")) },
  evento({ id: EP.aguaInaug, slug: "inauguracion-cartografias-del-agua", titulo: "Inauguración: Cartografías del agua", dias: primeroDelMes - 20, hora: "19:00", lugar_id: L.poeta, creadoHace: 50, imagen: null, cancelado: true }),
);
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
  // OL-390: de visita (de otra ciudad, así no entra en Artistas de San Luis), sin fechas próximas y con dos pasadas en San Luis: «Lugares» baja
  // a su trayectoria.
  rocio: "cccc0003-0000-4000-8000-000000000001",
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
  { ...artista(A.rocio, "rocio-lozano", "Rocío Lozano", "musica", "Canción", "solista", "Cantautora de la Ciudad de México que se presenta seguido en San Luis Potosí."), ciudad: "Ciudad de México" },
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
  // OL-390: lo que ya pasó. «Noche de acordeón y guitarra» con cuatro artistas («con Abril Merlot, 0Backside0 y 1 más»).
  { evento_id: EP.noche, artista_id: A.feleal, orden: 1 },
  { evento_id: EP.noche, artista_id: A.merlot, orden: 2 },
  { evento_id: EP.noche, artista_id: A.backside, orden: 3 },
  { evento_id: EP.noche, artista_id: A.rocio, orden: 4 },
  { evento_id: EP.retratos, artista_id: A.backside, orden: 1 },
  { evento_id: EP.otonoDuo, artista_id: A.feleal, orden: 1 },
  { evento_id: EP.otonoDuo, artista_id: A.merlot, orden: 2 },
  { evento_id: EP.otonoCierre, artista_id: A.backside, orden: 1 },
  { evento_id: EP.acordeonAche, artista_id: A.feleal, orden: 1 },
  { evento_id: EP.jardin, artista_id: A.feleal, orden: 1 },
  { evento_id: EP.rocioCcub, artista_id: A.rocio, orden: 1 },
];

// OL-410 (lo firmado en OL-409): una ficha de lugar y una de artista con lo que antes salía mal, para ver el bloque de un festival, la hora de cada
// función en su día y «Para visitar». En otra ciudad (Aguascalientes), así Inicio, Agenda y las fichas de San Luis que mide `npm run medir` no
// cambian. Todo inventado: el «Cine Foro Alameda (demo)», su cartelera (en curso, tres actos: dos con varias funciones en días distintos), una
// función de una muestra que empezó hace dos semanas en otro sitio (su marco no es de la ficha), un taller de tres sesiones, una exposición abierta
// con su horario (martes a domingo, 17:00 a 22:00) y el «Cineclub Cuadro Negro (demo)», que presenta dos actos de la cartelera y el taller.
// Solo con `RESPALDO_FICHAS=1` en el entorno del respaldo: el grafo de /admin/grafo lee todos los lugares, artistas y eventos de todas las ciudades
// y con ellos pasaba de su presupuesto (460 → 487 nodos); `npm run medir` no la pone, así ninguna pantalla medida cambia.
const CON_FICHAS = process.env.RESPALDO_FICHAS === "1";
const AGS = "Aguascalientes";
const L_CINE = "aaaa0001-0000-4000-8000-000000000041";
const EF = {
  cartelera: "bbbb0004-0000-4000-8000-000000000001",
  arrebato: "bbbb0004-0000-4000-8000-000000000002",
  montana: "bbbb0004-0000-4000-8000-000000000003",
  espinazo: "bbbb0004-0000-4000-8000-000000000004",
  muestra: "bbbb0004-0000-4000-8000-000000000005",
  muestraAqui: "bbbb0004-0000-4000-8000-000000000006",
  muestraFuera: "bbbb0004-0000-4000-8000-000000000007",
  guion: "bbbb0004-0000-4000-8000-000000000008",
  fotogramas: "bbbb0004-0000-4000-8000-000000000009",
};
const A_CUADRO = "cccc0004-0000-4000-8000-000000000001";
if (CON_FICHAS) lugares.push({ ...lugar(L_CINE, "cine-foro-alameda-demo", "Cine Foro Alameda (demo)", "foro", "Calle inventada 123, Centro, Aguascalientes, Ags.", 21.8818, -102.2916, [], "Cine foro inventado para la prueba de las fichas (OL-410)."), ciudad: AGS });
/** Un evento de la ficha de prueba, en Aguascalientes. */
const enAgs = (datos) => ({ ...evento({ lugar_id: L_CINE, imagen: null, creadoHace: 5, ...datos }), ciudad: AGS });
/** Su horario por día: empieza con su primera sesión y termina con la última (como lo guarda la base). */
const conSesionesDe = (ev, lista, base) => {
  const filas = lista.map(([dias, hora, finHora], i) => ({ id: `bbbb0005-0000-4000-8000-0000000${String(base + i).padStart(5, "0")}`, evento_id: ev.id, fecha: fecha(dias, hora).slice(0, 10), inicio: iso(fecha(dias, hora)), fin: iso(fecha(dias, finHora)) }));
  sesiones.push(...filas);
  return { ...ev, inicio: filas[0].inicio, fin: filas[filas.length - 1].fin, termina: filas[filas.length - 1].fin };
};
if (CON_FICHAS) eventos.push(
  { ...enAgs({ id: EF.cartelera, slug: "cartelera-de-otono-cine-de-culto-demo", titulo: "Cartelera de otoño: cine de culto (demo)", dias: -2, hora: "17:30", clase: "festival" }), fin: iso(fecha(3, "22:00")), termina: iso(fecha(3, "22:00")) },
  conSesionesDe(enAgs({ id: EF.arrebato, slug: "arrebato-de-ivan-zulueta-demo", titulo: "Arrebato, de Iván Zulueta (1979)", dias: -2, hora: "17:30", precio: "$70", evento_padre_id: EF.cartelera }), [[-2, "17:30", "19:20"], [0, "21:00", "22:50"], [2, "17:30", "19:20"]], 1),
  conSesionesDe(enAgs({ id: EF.montana, slug: "la-montana-sagrada-demo", titulo: "La montaña sagrada, de Alejandro Jodorowsky (1973)", dias: -1, hora: "17:00", precio: "$70", evento_padre_id: EF.cartelera }), [[-1, "17:00", "19:00"], [1, "17:00", "19:00"], [3, "20:00", "22:00"]], 4),
  enAgs({ id: EF.espinazo, slug: "el-espinazo-del-diablo-demo", titulo: "El espinazo del diablo, de Guillermo del Toro (2001)", dias: 3, hora: "17:00", dur: 2, precio: "$70", evento_padre_id: EF.cartelera }),
  // La muestra empezó hace dos semanas en otra sede y tiene una función aquí pasado mañana.
  { ...enAgs({ id: EF.muestra, slug: "muestra-internacional-de-cine-demo", titulo: "Muestra Internacional de Cine (demo)", dias: -14, hora: "18:00", lugar_id: null, sitio: { texto: "Teatro inventado", direccion: "Calle inventada 9, Aguascalientes", lat: 21.8823, lng: -102.2950 }, clase: "festival" }), fin: iso(fecha(10, "20:00")), termina: iso(fecha(10, "20:00")) },
  enAgs({ id: EF.muestraAqui, slug: "muestra-funcion-en-el-foro-alameda-demo", titulo: "Muestra: Roma, de Alfonso Cuarón (2018)", dias: 2, hora: "18:00", dur: 2.5, evento_padre_id: EF.muestra }),
  enAgs({ id: EF.muestraFuera, slug: "muestra-clausura-demo", titulo: "Muestra: clausura", dias: 10, hora: "18:00", lugar_id: null, sitio: { texto: "Teatro inventado", direccion: "Calle inventada 9, Aguascalientes", lat: 21.8823, lng: -102.2950 }, evento_padre_id: EF.muestra }),
  conSesionesDe(enAgs({ id: EF.guion, slug: "taller-de-guion-la-escena-corta-demo", titulo: "Taller de guion: la escena corta (demo)", dias: 4, hora: "18:00", precio: "$450", clase: "taller" }), [[4, "18:00", "20:00"], [6, "18:00", "20:00"], [9, "18:00", "20:00"]], 7),
  { ...enAgs({ id: EF.fotogramas, slug: "fotogramas-carteles-del-cine-demo", titulo: "Fotogramas: carteles del cine (demo)", dias: -9, hora: "00:00", clase: "exposicion" }), fin: iso(fecha(25, "23:59")), termina: iso(fecha(25, "23:59")) },
);
const eventos_horarios = !CON_FICHAS ? [] : [{ id: "bbbb0006-0000-4000-8000-000000000001", evento_id: EF.fotogramas, dias: [2, 3, 4, 5, 6, 7], abre: "17:00:00", cierra: "22:00:00", creado_en: hace(5) }];
if (CON_FICHAS) artistas.push({ ...artista(A_CUADRO, "cineclub-cuadro-negro-demo", "Cineclub Cuadro Negro (demo)", "cine", "Cineclub", "grupo", "Cineclub inventado para la prueba de las fichas (OL-410)."), ciudad: AGS });
if (CON_FICHAS) eventos_artistas.push({ evento_id: EF.arrebato, artista_id: A_CUADRO, orden: 1 }, { evento_id: EF.montana, artista_id: A_CUADRO, orden: 1 }, { evento_id: EF.guion, artista_id: A_CUADRO, orden: 1 });

// OL-413 (bitácora 444): los dos lugares de los carteles del founder y un festival de una noche sin programa, para ver el alta con lectura del cartel
// (Cumbiachella en Lunaria; Trayectos Interactivos por la dirección del Laboratorio Centro Histórico) y el festival sin programa en su ficha, en la
// ficha de su lugar, en Agenda y en Inicio. Todo inventado salvo los nombres y las direcciones de los dos lugares. Solo con `RESPALDO_CARTELES=1`:
// `npm run medir` no lo pone, así ninguna pantalla medida cambia.
export const CON_CARTELES = process.env.RESPALDO_CARTELES === "1";
export const L_LAB = "aaaa0001-0000-4000-8000-000000000051";
export const L_LUNARIA = "aaaa0001-0000-4000-8000-000000000052";
export const E_CUMBIA = "bbbb0010-0000-4000-8000-000000000001";
if (CON_CARTELES) {
  lugares.push(
    lugar(L_LAB, "laboratorio-centro-historico", "Laboratorio Centro Histórico", "foro", "C. 5 de Mayo 1100, 78339 San Luis Potosí, Mexico", 22.1469, -100.9771),
    lugar(L_LUNARIA, "foro-lunaria", "Foro lunaria", "foro", "Calle Hermenegildo Galeana 423, Centro, 78000, San Luis Potosí, S.L.P.", 22.1512, -100.9768),
  );
  eventos.push({ ...evento({ id: E_CUMBIA, slug: "noche-cumbiera-demo", titulo: "Noche cumbiera (demo)", dias: 1, hora: "20:00", dur: 6, lugar_id: L_LUNARIA, imagen: null, creadoHace: 3, clase: "festival", descripcion: "Festival cumbiero de una noche: sonidos, baile y disfraz." }) });
}

// OL-422 (bitácora 455): dos festivales que no son nuevos con actividades nuevas, para ver en «Nuevos eventos» la ceja «FESTIVAL · 7 NUEVAS» y
// «FESTIVAL · 1 NUEVA»: Raíces Sonoras (publicado hace 20 días, del día 14 al 20) con siete actividades de hoy, y la Muestra de Danza (hace 25 días,
// del 15 al 17) con una de hoy. Las actividades, las más recientes de todo lo nuevo. Todo inventado.
// Solo con `RESPALDO_NUEVAS=1`: `npm run medir` no lo pone, así ninguna pantalla medida cambia.
export const CON_NUEVAS = process.env.RESPALDO_NUEVAS === "1";
export const E_RAICES = "bbbb0011-0000-4000-8000-000000000001";
export const E_DANZA = "bbbb0011-0000-4000-8000-000000000002";
if (CON_NUEVAS) {
  eventos.push(
    { ...evento({ id: E_RAICES, slug: "festival-raices-sonoras-demo", titulo: "Festival Raíces Sonoras (demo)", dias: 14, hora: "18:00", lugar_id: L.ccub, creadoHace: 20, imagen: null, clase: "festival", colores: ["#18070a", "#721323", "#194541", "#232121"] }), fin: iso(fecha(21, "00:00")), termina: iso(fecha(21, "00:00")) },
    ...["Son huasteco al atardecer", "Jarana y zapateado", "Marimba de la sierra", "Cantos del desierto", "Banda de viento infantil", "Trova potosina", "Cierre con huapango"].map((titulo, i) =>
      evento({ id: `bbbb0011-0000-4000-8000-00000000001${i}`, slug: `raices-sonoras-demo-${i + 1}`, titulo, dias: 14 + i, hora: "19:00", lugar_id: i % 2 ? L.paz : L.ccub, creadoHace: 0.2, imagen: null, evento_padre_id: E_RAICES }),
    ),
    { ...evento({ id: E_DANZA, slug: "muestra-de-danza-contemporanea-demo", titulo: "Muestra de Danza Contemporánea (demo)", dias: 15, hora: "18:00", lugar_id: L.paz, creadoHace: 25, imagen: null, clase: "festival", colores: ["#0f1315", "#38505b", "#3b565c", "#424542"] }), fin: iso(fecha(18, "00:00")), termina: iso(fecha(18, "00:00")) },
    evento({ id: "bbbb0011-0000-4000-8000-000000000020", slug: "muestra-de-danza-demo-1", titulo: "Cuerpos en tránsito", dias: 16, hora: "20:00", lugar_id: L.paz, creadoHace: 0.3, imagen: null, evento_padre_id: E_DANZA }),
  );
}

// OL-414 (bitácora 445): Administración › Personas con fotos y «Lo que publicó» con eventos, lugares y artistas. Ana y Marcos con foto, tres cuentas
// más en la lista (dos con foto, una sin ella), y lo que Ana dio de alta además de sus eventos: un lugar a la vista y uno oculto, un artista a la
// vista y uno oculto; su festival y sus actos con la misma hora de alta (como los guarda la base: se dan de alta juntos). Todo inventado; las
// fotos (`retratos.example`) las dibuja `capturar-persona-publicado.mjs`. Solo con `RESPALDO_PERSONAS=1`: `npm run medir` no lo pone, así ninguna
// pantalla medida cambia.
export const CON_PERSONAS = process.env.RESPALDO_PERSONAS === "1";
export const RETRATOS = "https://retratos.example";
const L_ANA = { taller: "aaaa0001-0000-4000-8000-000000000061", patio: "aaaa0001-0000-4000-8000-000000000062" };
const A_ANA = { mariana: "cccc0001-0000-4000-8000-000000000061", tinta: "cccc0001-0000-4000-8000-000000000062" };
if (CON_PERSONAS) {
  perfiles.find((p) => p.id === ANA).foto = `${RETRATOS}/ana.png`;
  perfiles.find((p) => p.id === MARCOS).foto = `${RETRATOS}/marcos.png`;
  lugares.push(
    { ...lugar(L_ANA.taller, "taller-barro-y-fuego-demo", "Taller Barro y Fuego (demo)", "colectivo", "Calle inventada 45, Barrio de San Miguelito, San Luis Potosí", 22.1430, -100.9750), portada: `${RETRATOS}/taller.png`, creado_por: ANA, creado_en: hace(6) },
    { ...lugar(L_ANA.patio, "patio-de-la-vecindad-demo", "Patio de la Vecindad (demo)", "otro", "Calle inventada 12, Centro, San Luis Potosí", 22.1500, -100.9790), detalle: "Patio de vecindad", creado_por: ANA, visible: false, creado_en: hace(9) },
  );
  artistas.push(
    { ...artista(A_ANA.mariana, "mariana-ruvalcaba-demo", "Mariana Ruvalcaba (demo)", "artes_visuales", "Grabado", "solista", "Grabadora y papelera inventada para la prueba de Administración (OL-414).", [], `${RETRATOS}/mariana.png`), creado_por: ANA, creado_en: hace(5) },
    { ...artista(A_ANA.tinta, "colectivo-tinta-roja-demo", "Colectivo Tinta Roja (demo)", "artes_visuales", "Gráfica", "grupo"), creado_por: ANA, visible: false, creado_en: hace(8) },
  );
  const altaDelFestival = hace(2);
  for (const e of eventos) if (e.id === E.cine || e.evento_padre_id === E.cine) e.creado_en = altaDelFestival;
}

// OL-454 (bitácora 486): Inicio vacío. Dos ciudades más para ver Inicio sin eventos: Querétaro con tres lugares y dos artistas y ningún evento
// próximo (la ciudad «vieja» sin agenda) y Zacatecas con un lugar y tres eventos que empiezan pasada esta semana (el caso de «Más adelante»).
// Todo inventado. Solo con `RESPALDO_VACIO=1`: `npm run medir` no lo pone, así ninguna pantalla medida cambia.
const CON_VACIO = process.env.RESPALDO_VACIO === "1";
if (CON_VACIO) {
  const QRO = "Querétaro", ZAC = "Zacatecas";
  const L_ZAC = "aaaa0001-0000-4000-8000-000000000074";
  lugares.push(
    { ...lugar("aaaa0001-0000-4000-8000-000000000071", "foro-del-rio-demo", "Foro del Río (demo)", "foro", "Calle inventada 8, Centro, Querétaro, Qro.", 20.5925, -100.3920), ciudad: QRO },
    { ...lugar("aaaa0001-0000-4000-8000-000000000072", "casa-de-cultura-norte-demo", "Casa de Cultura Norte (demo)", "casa_de_cultura", "Calle inventada 31, Querétaro, Qro.", 20.6050, -100.3900), ciudad: QRO },
    { ...lugar("aaaa0001-0000-4000-8000-000000000073", "galeria-la-canada-demo", "Galería La Cañada (demo)", "galeria", "Calle inventada 4, Querétaro, Qro.", 20.5880, -100.3850), ciudad: QRO },
    { ...lugar(L_ZAC, "teatro-del-cerro-demo", "Teatro del Cerro (demo)", "foro", "Calle inventada 2, Centro, Zacatecas, Zac.", 22.7709, -102.5832), ciudad: ZAC },
  );
  artistas.push(
    { ...artista("cccc0005-0000-4000-8000-000000000001", "lucia-arteaga-demo", "Lucía Arteaga (demo)", "musica", "Canción", "solista"), ciudad: QRO },
    { ...artista("cccc0005-0000-4000-8000-000000000002", "colectivo-tierra-fertil-demo", "Colectivo Tierra Fértil (demo)", "teatro", "Teatro comunitario", "grupo"), ciudad: QRO },
  );
  const enZac = (id, slug, titulo, dias) => ({ ...evento({ id, slug, titulo, dias, hora: "19:00", lugar_id: L_ZAC, imagen: null, creadoHace: 20 }), ciudad: ZAC });
  eventos.push(
    enZac("bbbb0012-0000-4000-8000-000000000001", "noche-de-son-jarocho-demo", "Noche de son jarocho (demo)", 12),
    enZac("bbbb0012-0000-4000-8000-000000000002", "lectura-en-voz-alta-demo", "Lectura en voz alta (demo)", 19),
    enZac("bbbb0012-0000-4000-8000-000000000003", "muestra-de-grabado-demo", "Muestra de grabado (demo)", 33),
  );
}

// OL-463 (bitácora 495): un festival como «Cultura Mística» (el que probó el founder): un marco en Aether, de pasado mañana a dentro de cuatro días,
// sin precio, ligado a quien lo organiza, con once actos con precios distintos (gratis, $80, $100, $130) y nueve artistas (siete con Instagram;
// Martha Franco y el Tambor Ancestral en dos actos), para ver en Administración › Instagram el festival como un solo renglón con «11 actos» y en su
// hoja las etiquetas de todos, el programa y el precio que sale de sus actos. Todo inventado. Solo con `RESPALDO_FESTIVAL_IG=1`: `npm run medir` no
// lo pone, así ninguna pantalla medida cambia.
// OL-464 (bitácora 496): con `RESPALDO_CARRUSEL_IG=1` (lleva al festival consigo), el marco y sus once actos tienen cartel, servidos por el
// respaldo desde `demo-carrusel/<n>.jpg` (los dibuja `carteles-carrusel.mjs` en `RESPALDO_CARRUSEL_DIR`): la «Fogata» trae su propia copia del
// de los «Tambores» (`acto-8-copia`: otra dirección y otros bytes, la misma imagen, como las que guarda `ponerCartel`); así el carrusel sale con la
// portada y diez carteles distintos (la copia reconocida por su huella), y el último («Concierto de cuencos») queda fuera del tope de 10.
export const CON_CARRUSEL_IG = process.env.RESPALDO_CARRUSEL_IG === "1";
export const CON_FESTIVAL_IG = process.env.RESPALDO_FESTIVAL_IG === "1" || CON_CARRUSEL_IG;
const cartelCarrusel = (n) => (CON_CARRUSEL_IG ? `${process.env.RESPALDO_URL ?? "http://127.0.0.1:8889"}/storage/v1/object/public/fotos/demo-carrusel/${n}.jpg` : null);
export const E_MISTICA = "bbbb0013-0000-4000-8000-000000000001";
if (CON_FESTIVAL_IG) {
  const ig = (usuario) => [{ url: `https://www.instagram.com/${usuario}` }];
  const AM = Object.fromEntries(
    [
      ["organiza", "Colectivo Cultura Mística (demo)", "otro", "Colectivo", "grupo", "culturamistica.demo"],
      ["martha", "Martha Franco (demo)", "otro", "Meditación", "solista", "marthafranco.demo"],
      ["gustono", "Gustoño (demo)", "letras", "Escritura", "solista", null],
      ["luna", "Luna Arcana (demo)", "otro", "Tarot", "solista", "luna.arcana.demo"],
      ["sahumerio", "Sahumerio Colectivo (demo)", "otro", "Ceremonia", "grupo", "sahumerio.demo"],
      ["ixchel", "Ixchel Ramos (demo)", "otro", "Cartas", "solista", "ixchel.ramos.demo"],
      ["tambor", "Tambor Ancestral (demo)", "musica", "Percusión", "grupo", "tamborancestral.demo"],
      ["paloma", "Paloma Ríos (demo)", "danza", "Yoga", "solista", null],
      ["oraculo", "Oráculo Sonoro (demo)", "musica", "Cuencos", "grupo", "oraculo.sonoro.demo"],
      ["rocio", "Rocío Mendoza (demo)", "otro", "Astrología", "solista", "rocio.mendoza.demo"],
    ].map(([clave, nombre, disciplina, detalle, tipo, usuario], i) => {
      const id = `cccc0006-0000-4000-8000-0000000000${String(i + 1).padStart(2, "0")}`;
      artistas.push(artista(id, `${clave}-mistica-demo`, nombre, disciplina, detalle, tipo, null, usuario ? ig(usuario) : []));
      return [clave, id];
    }),
  );
  eventos.push({ ...evento({ id: E_MISTICA, slug: "cultura-mistica-demo", titulo: "Cultura Mística (demo)", dias: 2, hora: "17:30", lugar_id: L.aether, imagen: cartelCarrusel("marco"), creadoHace: 4, clase: "festival", descripcion: "Tres días de meditación, tarot, sonido y cantos." }), fin: iso(fecha(4, "23:59")), termina: iso(fecha(4, "23:59")) });
  eventos_artistas.push({ evento_id: E_MISTICA, artista_id: AM.organiza, orden: 1 });
  [
    [2, "17:30", "Meditación con Martha Franco (demo)", "Gratis", ["martha"]],
    [2, "18:30", "Taller de escritura", "$80", ["gustono"]],
    [2, "21:00", "Charla de tarot", "$130", ["luna"]],
    [3, "11:00", "Yoga kundalini", "$100", ["paloma"]],
    [3, "13:00", "Mercadito místico", "Gratis", []],
    [3, "17:00", "Ceremonia de cacao", "$100", ["sahumerio"]],
    [3, "19:00", "Lectura de cartas", "$80", ["ixchel"]],
    [3, "21:00", "Tambores al atardecer", "Gratis", ["tambor"]],
    [4, "12:00", "Astrología básica", "$80", ["rocio"]],
    [4, "18:00", "Concierto de cuencos", "$130", ["oraculo"]],
    [4, "20:30", "Fogata y cantos de cierre", "Gratis", ["tambor", "martha"]],
  ].forEach(([dias, hora, titulo, precio, quienes], i) => {
    const id = `bbbb0013-0000-4000-8000-0000000000${String(i + 2).padStart(2, "0")}`;
    // Los carteles del carrusel: cada acto el suyo; la Fogata, una copia del de los Tambores en otra dirección.
    const cartel = cartelCarrusel(i === 10 ? "acto-8-copia" : `acto-${i + 1}`);
    eventos.push(evento({ id, slug: `mistica-demo-${i + 1}`, titulo, dias, hora, dur: 1, lugar_id: L.aether, precio, imagen: cartel, creadoHace: 4, evento_padre_id: E_MISTICA }));
    quienes.forEach((q, j) => eventos_artistas.push({ evento_id: id, artista_id: AM[q], orden: j + 1 }));
  });
}

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
  // OL-390: quiénes fueron a lo que ya pasó («2 fueron», «1 fue»): Marcos y una cuenta sin perfil, nunca Ana (su perfil y sus novedades se miden).
  { id: "dddd0003-0000-4000-8000-000000000001", usuario_id: MARCOS, evento_id: EP.noche, estado: "voy", creado_en: hace(4) },
  { id: "dddd0003-0000-4000-8000-000000000002", usuario_id: "33333333-3333-4333-8333-333333333333", evento_id: EP.noche, estado: "voy", creado_en: hace(4) },
  { id: "dddd0003-0000-4000-8000-000000000003", usuario_id: MARCOS, evento_id: EP.otonoDuo, estado: "voy", creado_en: hace(30) },
  // OL-394: el año de Marcos («Tu año» en su perfil): seis «Voy» que ya pasaron, tres en ACHE («Donde más fuiste: ACHE Galería · 3 veces»), dos
  // en el Bicentenario y uno en un sitio sin ficha. Nunca Ana (su perfil se mide).
  { id: "dddd0004-0000-4000-8000-000000000001", usuario_id: MARCOS, evento_id: EP.retratos, estado: "voy", creado_en: hace(6) },
  { id: "dddd0004-0000-4000-8000-000000000002", usuario_id: MARCOS, evento_id: EP.acordeonAche, estado: "voy", creado_en: hace(20) },
  { id: "dddd0004-0000-4000-8000-000000000003", usuario_id: MARCOS, evento_id: EP.rocioCcub, estado: "voy", creado_en: hace(20) },
  { id: "dddd0004-0000-4000-8000-000000000004", usuario_id: MARCOS, evento_id: EP.jardin, estado: "voy", creado_en: hace(25) },
];
// OL-394: Marcos gestiona la ficha de Feleal y la de ACHE Galería (cuentas ligadas), para ver «Tu año» al final de «Trayectoria» y de
// «Historial». Ana no gestiona ninguna: las fichas que se miden no cambian.
const artistas_cuentas = [{ artista_id: A.feleal, perfil_id: MARCOS, creado_en: hace(30) }];
const lugares_cuentas = [{ lugar_id: L.ache, perfil_id: MARCOS, creado_en: hace(30) }];
const seguimientos = [
  { id: "eeee0001-0000-4000-8000-000000000001", usuario_id: ANA, lugar_id: L.miguelito, artista_id: null, creado_en: hace(5) },
  { id: "eeee0001-0000-4000-8000-000000000002", usuario_id: ANA, lugar_id: null, artista_id: A.osslp, creado_en: hace(5) },
  { id: "eeee0001-0000-4000-8000-000000000003", usuario_id: MARCOS, lugar_id: L.paz, artista_id: null, creado_en: hace(9) },
];
const destacados = [E.colocaos, E.master, E.leonora, E.desierto].map((id, i) => ({ id: `ffff0001-0000-4000-8000-00000000000${i + 1}`, evento_id: id, lugar_id: null, artista_id: null, quitado: false, hasta: null, creado_en: hace(2) }));

// OL-426 (bitácora 459): Administración › Showcase. Las cuatro tablas del showcase (migración 20261020130000) con datos inventados sobre los
// artistas del respaldo: estados, puntajes, notas neutras, lecturas de redes con cifras inventadas y evidencias con dominio `.example` (dos
// aceptadas, una rechazada y dos propuestas «por la rutina» en Feleal, que tiene ficha reclamada y novedades). Los cambios de estado son de la cuenta
// de administración del respaldo («por ti»). Solo las leen /admin/showcase y su ficha: ninguna otra pantalla que mide `npm run medir` cambia.
const diaHace = (dias) => fecha(-dias, "12:00").slice(0, 10);
const candidatoShowcase = (artista_id, estado, [c, o, a, v], notas = null) => ({ artista_id, estado, puntaje_circulacion: c, puntaje_obra: o, puntaje_actividad: a, puntaje_vinculo: v, notas, actualizado_por: ADMIN, actualizado_en: hace(2) });
// OL-437 (bitácora 469): la base propone los puntajes; null es «nadie lo fijó» y vale lo propuesto. Feleal tiene la circulación fijada a mano
// en 2 (su fecha en Aguascalientes, aceptada, no está en la base: la base propone 1) y lo demás propuesto; 0Backside0 y la Orquesta, todo fijado;
// Pimpolina y Abril Merlot, nada fijado (como los 692 de producción el 21 de octubre). Aaron Cadena y Rocío Lozano no tienen fila.
const showcase_candidatos = [
  candidatoShowcase(A.feleal, "invitado", [2, null, null, null], "Circula por los foros del centro y por un festival; falta evidencia de obra grabada reciente.\nPreguntar a ACHE si le sirve el apoyo para grabar."),
  candidatoShowcase(A.backside, "confirmado", [2, 2, 1, 1], "Obra publicada y circulación estable; confirmó su lugar en el showcase."),
  candidatoShowcase(A.pimpolina, "invitado", [null, null, null, null], "Temporada en el Teatro de la Paz; publica cada mes."),
  candidatoShowcase(A.osslp, "revisado", [1, 2, 0, 0]),
  candidatoShowcase(A.merlot, "candidato", [null, null, null, null], "Activa en redes; la rutina aún no la investiga."),
];
const showcase_cambios_estado = [
  { id: "cccc0026-0000-4000-8000-000000000001", artista_id: A.feleal, estado: "revisado", por: ADMIN, creado_en: hace(5) },
  { id: "cccc0026-0000-4000-8000-000000000002", artista_id: A.feleal, estado: "invitado", por: ADMIN, creado_en: hace(2) },
  { id: "cccc0026-0000-4000-8000-000000000003", artista_id: A.backside, estado: "confirmado", por: ADMIN, creado_en: hace(3) },
  { id: "cccc0026-0000-4000-8000-000000000004", artista_id: A.pimpolina, estado: "invitado", por: ADMIN, creado_en: hace(4) },
  { id: "cccc0026-0000-4000-8000-000000000005", artista_id: A.osslp, estado: "revisado", por: ADMIN, creado_en: hace(6) },
];
const evidencia = (n, artista_id, senal, tipo, titulo, url, fechaEv, estado, leida_por, dias) => ({ id: `cccc0027-0000-4000-8000-00000000000${n}`, artista_id, senal, tipo, titulo, url, fecha: fechaEv, fuente: new URL(url).hostname, leida_por, estado, creado_en: hace(dias) });
const showcase_evidencias = [
  evidencia(1, A.feleal, "circulacion", "presentacion", "Fecha en un foro de Aguascalientes", "https://agenda-ags.example/fechas/feleal", diaHace(100), "aceptada", "rutina", 8),
  evidencia(2, A.feleal, "obra", "obra", "Sencillo en plataformas de música", "https://musica.example/feleal/sencillo", diaHace(200), "aceptada", "persona", 8),
  evidencia(3, A.feleal, "actividad", "redes", "Perfil de Instagram duplicado", "https://perfiles.example/feleal-2", null, "rechazada", "rutina", 8),
  evidencia(4, A.feleal, "obra", "premio", "Mención en un concurso estatal de acordeón, 2025", "https://cultura-estatal.example/premios/2025", "2025-11-20", "propuesta", "rutina", 0),
  evidencia(5, A.feleal, "circulacion", "prensa", "Nota sobre su gira por el Bajío", "https://prensa-local.example/notas/gira-bajio", diaHace(95), "propuesta", "rutina", 0),
  evidencia(6, A.backside, "obra", "obra", "Disco en plataformas de música", "https://musica.example/0backside0/disco", diaHace(300), "aceptada", "persona", 20),
  // OL-446: Abril Merlot (candidata, nada fijado) con tres hallazgos de la rutina de ayer, para «Por aprobar» con dos artistas.
  evidencia(7, A.merlot, "obra", "obra", "Serie «Bordes» expuesta en una galería de Zacatecas", "https://galeria-zac.example/bordes", diaHace(60), "propuesta", "rutina", 1),
  evidencia(8, A.merlot, "circulacion", "presentacion", "Mesa en un encuentro de arte joven del Bajío", "https://encuentro-bajio.example/mesas", diaHace(120), "propuesta", "rutina", 1),
  evidencia(9, A.merlot, "obra", "beca", "Beca estatal de creación, 2025", "https://cultura-estatal.example/becas/2025", "2025-06-30", "propuesta", "rutina", 1),
];
// OL-446: un grupo guardado (un filtro con nombre), para ver «Tus grupos» en la hoja Filtros.
const showcase_grupos = [{ id: "cccc0029-0000-4000-8000-000000000001", nombre: "Música con cuenta, 4+", filtros: { puntaje: 4, cuenta: "con", disciplina: "musica" }, creado_por: ADMIN, creado_en: hace(1) }];
const lectura = (n, artista_id, red, seguidores, publicaciones, ultima, leido) => ({ id: `cccc0028-0000-4000-8000-00000000000${n}`, artista_id, red, seguidores, publicaciones, ultima_publicacion: ultima === null ? null : diaHace(ultima), leido_en: hace(leido), leido_por: ADMIN });
const lecturas_redes = [
  lectura(1, A.feleal, "instagram", 3200, 412, 2, 4),
  lectura(2, A.feleal, "youtube", 640, 38, 21, 4),
  lectura(3, A.feleal, "instagram", 2900, 380, 30, 40),
  lectura(4, A.backside, "instagram", 5800, 640, 6, 4),
  lectura(5, A.pimpolina, "instagram", 1100, 205, 12, 9),
  lectura(6, A.osslp, "facebook", 12400, 1320, 60, 9),
  lectura(7, A.merlot, "instagram", 2400, 330, 4, 4),
];

// OL-466 (bitácora 498): el alta con cartel de un evento que ya está publicado. Con `RESPALDO_CARTEL_EXISTENTE=1` el respaldo suma «Noche de
// danzón con la Orquesta Típica», de Marcos, en el Teatro de la Paz pasado mañana a las 20:00, sin cartel, sin precio ni descripción (el caso
// común: lo cargó una agenda y nadie le puso cartel), y contesta `eventos_parecidos` con la regla de la base en corto (el mismo día local, el mismo
// sitio, el mismo título o dos palabras con contenido en común). Sin la marca, `eventos_parecidos` sigue contestando nada: `npm run medir` y las
// demás capturas no cambian. Todo inventado.
// Con `RESPALDO_CARTEL_EXISTENTE=despues`, la misma ficha como queda tras «Sí, es este: ponerle mi cartel»: con el cartel de Ana (servido por el
// respaldo desde `RESPALDO_CARRUSEL_DIR`, como los del carrusel), el precio, la descripción y quién se presenta, que leyó el cartel; lo demás, igual.
export const CON_CARTEL_EXISTENTE = ["1", "despues"].includes(process.env.RESPALDO_CARTEL_EXISTENTE ?? "");
const DANZON_DESPUES = process.env.RESPALDO_CARTEL_EXISTENTE === "despues";
export const E_DANZON = "bbbb0014-0000-4000-8000-000000000001";
if (CON_CARTEL_EXISTENTE) {
  const despues = DANZON_DESPUES ? { imagen: `${process.env.RESPALDO_URL ?? "http://127.0.0.1:8889"}/storage/v1/object/public/fotos/demo-carrusel/ol466-danzon.jpg`, precio: "$150", descripcion: "Baile de salón con orquesta en vivo: danzón, mambo y chachachá. Clase abierta para principiantes a las 19:30." } : { imagen: null };
  eventos.push(evento({ id: E_DANZON, slug: "noche-de-danzon-con-la-orquesta-tipica", titulo: "Noche de danzón con la Orquesta Típica", dias: 2, hora: "20:00", dur: 3, lugar_id: L.paz, creadoHace: 6, ...despues }));
  // Después, también quién se presenta (lo leyó el cartel): la ficha nueva que el alta crea para un nombre que no está en el directorio.
  if (DANZON_DESPUES) {
    const orquesta = "cccc0014-0000-4000-8000-000000000001";
    artistas.push(artista(orquesta, "orquesta-tipica-de-san-luis", "Orquesta Típica de San Luis", "musica", "Orquesta", "grupo"));
    eventos_artistas.push({ evento_id: E_DANZON, artista_id: orquesta, orden: 1 });
  }
}
const VACIAS = new Set(["de", "del", "la", "las", "los", "el", "y", "e", "en", "con", "a", "al", "para", "por", "un", "una", "o", "u", "the", "of", "and"]);
const normal = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const palabras = (s) => new Set(normal(s).split(" ").filter((w) => w && !VACIAS.has(w) && !/^(19|20)[0-9]{2}$/.test(w)));
const diaEn = (inicio, zona) => new Intl.DateTimeFormat("en-CA", { timeZone: zona || ZONA }).format(new Date(inicio));
// OL-469 (bitácora 501): un historial grande, para el prototipo del Historial del lugar y la Trayectoria del artista escalables. El «Museo Leonora
// Carrington (demo)» (el caso del founder: «se dice "han pasado por aquí 9"… Solo se muestran 5 de 9») con 81 eventos pasados en tres años (47
// de 2026, 24 de 2025 y 10 de 2024): exposiciones colectivas, visitas y talleres sin artistas ligados y conciertos, charlas y lecturas con nueve
// artistas con ficha; y «Valeria Quiroz (demo)», con 29 fechas pasadas en ocho lugares con ficha y una en un sitio sin ficha. Los dos de Ana
// (con su sesión, gestiona las dos fichas: «Tu año» e «Informe» / «Presentación»). Las fotos y los carteles son dibujos inventados que el
// respaldo sirve desde `RESPALDO_CARRUSEL_DIR` (`fotos-historial.mjs`); con la marca, las portadas de los lugares de San Luis también, así ninguna
// imagen sale del respaldo. Todo inventado salvo el nombre y la dirección del museo. Solo con `RESPALDO_HISTORIAL=1`: `npm run medir` no lo pone,
// así ninguna pantalla medida cambia.
export const CON_HISTORIAL = process.env.RESPALDO_HISTORIAL === "1";
export const L_LEONORA = "aaaa0001-0000-4000-8000-000000000081";
export const A_VALERIA = "cccc0015-0000-4000-8000-000000000009";
if (CON_HISTORIAL) {
  const fotoH = (n) => `${process.env.RESPALDO_URL ?? "http://127.0.0.1:8889"}/storage/v1/object/public/fotos/demo-carrusel/${n}.jpg`;
  lugares.forEach((l, i) => { l.portada = fotoH(`hist-lugar-${i + 1}`); });
  lugares.push({ ...lugar(L_LEONORA, "museo-leonora-carrington-demo", "Museo Leonora Carrington (demo)", "museo", "Calzada de Guadalupe 705, Centro, 78000, San Luis Potosí, S.L.P.", 22.1432, -100.9765, [{ url: "https://www.instagram.com/museoleonoracarrington.demo" }], "Museo dedicado a la obra surrealista de Leonora Carrington, con salas de exposición temporal, talleres y un foro."), portada: fotoH("hist-leonora"), creado_por: ANA });
  const AH = [
    ["valeria", "valeria-quiroz-demo", "Valeria Quiroz (demo)", "musica", "Canción", "solista", true],
    ["inigo", "inigo-montalvo-demo", "Íñigo Montalvo (demo)", "musica", "Guitarra", "solista", true],
    ["renata", "renata-saldana-demo", "Renata Saldaña (demo)", "artes_visuales", "Pintura", "solista", true],
    ["ecos", "los-ecos-del-tangamanga-demo", "Los Ecos del Tangamanga (demo)", "musica", "Son huasteco", "grupo", true],
    ["maripaz", "maripaz-oyarzabal-demo", "Maripaz Oyarzábal (demo)", "danza", "Danza contemporánea", "solista", false],
    ["ximena", "ximena-urquidi-demo", "Ximena Urquidi (demo)", "letras", "Poesía", "solista", true],
    ["piedra", "taller-de-grabado-la-piedra-demo", "Taller de Grabado La Piedra (demo)", "artes_visuales", "Grabado", "grupo", false],
    ["teodoro", "teodoro-alcantara-demo", "Teodoro Alcántara (demo)", "teatro", "Performance", "solista", true],
    ["nube", "colectivo-nube-de-papel-demo", "Colectivo Nube de Papel (demo)", "artes_visuales", "Ilustración", "grupo", true],
  ];
  const idA = (i) => (i === 0 ? A_VALERIA : `cccc0015-0000-4000-8000-00000000000${i}`);
  AH.forEach(([clave, slug, nombre, disciplina, detalle, tipo, conFoto], i) =>
    artistas.push({ ...artista(idA(i), slug, nombre, disciplina, detalle, tipo, i === 0 ? "Cantautora potosina que toca en museos, galerías y foros de la ciudad desde 2024." : null, [], conFoto ? fotoH(`hist-artista-${clave}`) : null, i === 0 ? fotoH("hist-valeria-portada") : null), creado_por: i === 0 ? ANA : null }),
  );
  const utc = (ymd) => { const [a, m, d] = ymd.split("-").map(Number); return Date.UTC(a, m - 1, d); };
  const diasA = (ymd) => Math.round((utc(ymd) - utc(hoyLocal)) / 86400e3);
  let n = 0;
  const idE = () => `bbbb0015-0000-4000-8000-${String(++n).padStart(12, "0")}`;
  const slugDe = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  /** Un evento pasado en una fecha dicha (AAAA-MM-DD); `semanas` lo vuelve exposición (termina tantas semanas después, a las 23:59). */
  const pasado = ({ ymd, hora = "19:00", titulo, lugar_id = L_LEONORA, sitio = null, cartel = null, semanas = 0, quien = [] }) => {
    const id = idE();
    const base = evento({ id, slug: `${slugDe(titulo)}-${ymd}`, titulo, dias: diasA(ymd), hora: semanas ? "00:00" : hora, lugar_id: sitio ? null : lugar_id, sitio, creadoHace: 400, imagen: cartel ? fotoH(cartel) : null, autor: ANA, clase: semanas ? "exposicion" : "puntual" });
    const fin = semanas ? iso(fecha(diasA(ymd) + semanas * 7, "23:59")) : null;
    eventos.push(semanas ? { ...base, fin, termina: fin } : base);
    quien.forEach((a, orden) => eventos_artistas.push({ evento_id: id, artista_id: idA(a), orden: orden + 1 }));
  };
  // El museo: por mes, en orden; un tercio sin artistas ligados (las colectivas, las visitas y los talleres: el caso «aparecen exposiciones
  // colectivas y eventos que pudieron tener artistas y no se detectaron»).
  const SIN = ["Exposición colectiva: Surrealismo en San Luis", "Visita guiada nocturna", "Taller infantil de máscaras", "Muestra colectiva de gráfica potosina", "Noche de museos", "Recorrido por el jardín escultórico", "Exposición colectiva: Mujeres que sueñan", "Cineclub: las amigas surrealistas", "Taller de collage para familias", "Muestra de fin de cursos"];
  const CON = [(a) => `Concierto de ${a}`, (a) => `Charla con ${a}`, (a) => `Lectura en voz alta con ${a}`, (a) => `${a} en el foro del museo`, (a) => `Inauguración con ${a}`];
  const porMes = (anio, mes) => (anio === 2024 ? 1 : anio === 2025 ? 2 : mes === 10 ? 2 : 5);
  const meses = [];
  for (let m = 3; m <= 12; m++) meses.push([2024, m]);
  for (let m = 1; m <= 12; m++) meses.push([2025, m]);
  for (let m = 1; m <= 10; m++) meses.push([2026, m]);
  let k = 0;
  for (const [anio, mes] of meses) {
    const cuantos = porMes(anio, mes);
    for (let j = 0; j < cuantos; j++, k++) {
      const dia = mes === 10 && anio === 2026 ? 2 + j * 2 : 3 + j * Math.floor(24 / cuantos);
      const ymd = `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
      const cartel = k % 4 === 1 ? `hist-cartel-${k % 6}` : null;
      if (k % 3 === 0) {
        const t = SIN[(k / 3) % SIN.length];
        const expo = (t.startsWith("Exposición") || t.startsWith("Muestra")) && !(anio === 2026 && mes >= 9);
        pasado({ ymd, titulo: t, cartel, hora: t.startsWith("Taller") ? "11:00" : "19:00", semanas: expo ? 3 : 0 });
      } else {
        const a = 1 + (k % 8);
        const quien = k % 7 === 0 ? [a, 1 + ((k + 3) % 8)] : [a];
        pasado({ ymd, titulo: CON[k % CON.length](AH[a][2].replace(" (demo)", "")), cartel, quien });
      }
    }
  }
  // Valeria Quiroz: también en el museo y en siete lugares más de San Luis, de marzo de 2024 a la semana pasada; y una vez en un jardín sin ficha.
  const SITIOS = [L.paz, L.ferro, L.muni, L.ache, L.ccub, L.aether, L.poeta, L_LEONORA];
  const fechasV = ["2024-03-15", "2024-05-24", "2024-08-09", "2024-10-18", "2024-12-06", "2025-01-24", "2025-02-21", "2025-03-28", "2025-04-25", "2025-05-30", "2025-06-27", "2025-08-22", "2025-09-26", "2025-10-31", "2025-11-28", "2025-12-12", "2026-01-23", "2026-02-13", "2026-02-27", "2026-03-20", "2026-04-17", "2026-05-08", "2026-05-29", "2026-06-19", "2026-07-17", "2026-08-07", "2026-08-28", "2026-09-18", "2026-10-02"];
  fechasV.forEach((ymd, i) => {
    const duo = i % 5 === 2;
    pasado({ ymd, hora: "20:00", titulo: duo ? "Valeria Quiroz e Íñigo Montalvo a dúo" : i % 3 === 0 ? "Valeria Quiroz: canciones del desierto" : "Valeria Quiroz en concierto", lugar_id: SITIOS[i % SITIOS.length], cartel: i % 3 === 1 ? `hist-cartel-${i % 6}` : null, quien: duo ? [0, 1] : [0] });
  });
  pasado({ ymd: "2025-07-12", hora: "12:00", titulo: "Valeria Quiroz en el Jardín de San Juan de Dios", sitio: { texto: "Jardín de San Juan de Dios", direccion: "Calle Madero 1, Centro Histórico, San Luis Potosí", lat: 22.1511, lng: -100.9772 }, quien: [0] });
  // Lo que viene: una fecha de Valeria en el Teatro de la Paz y dos eventos en el museo, para que «Próximas fechas» / «Próximos eventos» no estén vacíos.
  const proximo = (dias, titulo, quien = []) => {
    const id = idE();
    eventos.push(evento({ id, slug: `${slugDe(titulo)}-proximo`, titulo, dias, hora: "19:00", lugar_id: quien.includes(0) ? L.paz : L_LEONORA, creadoHace: 5, imagen: null, autor: ANA }));
    quien.forEach((a, orden) => eventos_artistas.push({ evento_id: id, artista_id: idA(a), orden: orden + 1 }));
  };
  proximo(9, "Valeria Quiroz: canciones nuevas", [0]);
  proximo(4, "Visita guiada: Leonora y el teatro");
  proximo(12, "Charla con Renata Saldaña", [2]);
}

// OL-477 (bitácora 509): la semana de Instagram con artistas y lugares destacados (prototipo). Sobre el historial grande (`RESPALDO_HISTORIAL=1`), con
// `RESPALDO_INSTAGRAM_SEMANA=1` seis artistas y dos lugares quedan con la ficha completa (foto, portada, descripción de 120 o más y su Instagram):
// Valeria Quiroz (música, con fecha el vie 16), Íñigo Montalvo (música, con fecha el sáb 10), Renata Saldaña (pintura), el Colectivo Nube de Papel
// (ilustración, sin nada por venir) y, para «Cambiar», Ximena Urquidi y Teodoro Alcántara; el museo Leonora Carrington (dos eventos esta semana)
// y el Museo del Ferrocarril; y tres eventos más con su cartel dibujado: el martes 6 (ya pasó: el «evento del día» publicado), el taller del
// sábado 10 en el museo y la noche de Íñigo. Las portadas nuevas las dibuja `fotos-instagram.mjs` en la misma carpeta (`RESPALDO_CARRUSEL_DIR`).
// Todo inventado; `npm run medir` no lo pone.
export const CON_IG_SEMANA = CON_HISTORIAL && process.env.RESPALDO_INSTAGRAM_SEMANA === "1";
if (CON_IG_SEMANA) {
  const fotoI = (n) => `${process.env.RESPALDO_URL ?? "http://127.0.0.1:8889"}/storage/v1/object/public/fotos/demo-carrusel/${n}.jpg`;
  const igDe = (usuario) => [{ url: `https://www.instagram.com/${usuario}` }];
  const completar = (slug, cambios) => {
    const a = artistas.find((x) => x.slug === slug);
    if (!a) throw new Error("sin artista " + slug);
    Object.assign(a, cambios);
    return a;
  };
  completar("valeria-quiroz-demo", {
    descripcion: "Cantautora potosina. Escribe canciones sobre el desierto, la carretera y las abuelas, con guitarra y una loop station. Toca en museos, galerías y foros de la ciudad desde 2024 y prepara su primer disco.",
    redes: igDe("valeriaquiroz.demo"),
  });
  const inigo = completar("inigo-montalvo-demo", {
    descripcion: "Guitarrista de San Luis Potosí. Toca música latinoamericana para guitarra sola, de Agustín Barrios a Chabuca Granda, y acompaña a cantautoras de la ciudad. Da clases en el barrio de San Miguelito.",
    redes: igDe("inigomontalvo.demo"),
    portada: fotoI("ig-inigo-portada"),
  });
  completar("renata-saldana-demo", {
    descripcion: "Pintora potosina. Trabaja el paisaje del altiplano en óleo y acuarela grande, con los colores del atardecer y de la tierra roja. Ha expuesto en el museo Leonora Carrington y en galerías del Centro.",
    redes: igDe("renatasaldana.demo"),
    portada: fotoI("ig-renata-portada"),
  });
  completar("colectivo-nube-de-papel-demo", {
    descripcion: "Colectivo de ilustración y fanzine de San Luis Potosí. Hacen libros de artista, carteles y talleres de dibujo para gente de todas las edades, y una feria de gráfica cada primavera en el Centro.",
    redes: igDe("nubedepapel.demo"),
    portada: fotoI("ig-nube-portada"),
  });
  // Dos más, sin nada por venir, para la hoja «Cambiar» (con portadas de las que ya dibuja el historial).
  completar("ximena-urquidi-demo", {
    descripcion: "Poeta potosina. Escribe sobre el barrio, las fiestas y la gente que lo habita; lee en voz alta en librerías y cafés y coordina un taller de escritura para jóvenes los sábados.",
    redes: igDe("ximenaurquidi.demo"),
    portada: fotoI("hist-lugar-5"),
  });
  completar("teodoro-alcantara-demo", {
    descripcion: "Artista de performance y teatro de calle. Sus piezas suceden en plazas, mercados y paradas de camión, y siempre invitan a quien pasa a entrar en la obra un rato.",
    redes: igDe("teodoroalcantara.demo"),
    portada: fotoI("hist-lugar-7"),
  });
  const museo = lugares.find((l) => l.id === L_LEONORA);
  museo.descripcion = "Museo dedicado a la obra surrealista de Leonora Carrington, con salas de exposición temporal, talleres para familias, visitas guiadas de noche y un foro para conciertos y charlas.";
  const ferro = lugares.find((l) => l.id === L.ferro);
  ferro.descripcion = "Antigua estación de ferrocarril convertida en museo, con locomotoras de vapor, salas de exposición sobre la historia del tren en San Luis y un foro al aire libre para conciertos.";
  let m = 0;
  const idI = () => `bbbb0477-0000-4000-8000-${String(++m).padStart(12, "0")}`;
  const ecos = artistas.find((x) => x.slug === "los-ecos-del-tangamanga-demo");
  const martes = idI();
  eventos.push(evento({ id: martes, slug: "los-ecos-del-tangamanga-en-aether-demo", titulo: "Los Ecos del Tangamanga en Aether", dias: -1, hora: "20:00", lugar_id: L.aether, precio: "$100", creadoHace: 9, imagen: fotoI("hist-cartel-2"), descripcion: "Son huasteco con violín, jarana y huapanguera." }));
  eventos_artistas.push({ evento_id: martes, artista_id: ecos.id, orden: 1 });
  eventos.push(evento({ id: idI(), slug: "taller-de-mascaras-para-familias-demo", titulo: "Taller de máscaras para familias", dias: 3, hora: "11:00", lugar_id: L_LEONORA, creadoHace: 6, imagen: fotoI("hist-cartel-4"), autor: ANA }));
  const guitarra = idI();
  eventos.push(evento({ id: guitarra, slug: "inigo-montalvo-guitarra-sola-demo", titulo: "Íñigo Montalvo: guitarra sola", dias: 3, hora: "20:00", lugar_id: L.aether, precio: "$120", creadoHace: 7, imagen: fotoI("hist-cartel-5") }));
  eventos_artistas.push({ evento_id: guitarra, artista_id: inigo.id, orden: 1 });
}

/** `eventos_parecidos` en corto (la regla completa y sus pruebas viven en la base, OL-384): solo con `RESPALDO_CARTEL_EXISTENTE=1`. */
function parecidosEnMemoria({ p_titulo, p_inicio, p_zona, p_lugar_id, p_sitio_texto, p_excluir }, t) {
  if (!CON_CARTEL_EXISTENTE || !p_inicio) return [];
  const sitioDe = (lugarId, texto) => normal(t.lugares.find((l) => l.id === lugarId)?.nombre ?? texto);
  const sitio = sitioDe(p_lugar_id, p_sitio_texto);
  const dia = diaEn(p_inicio, p_zona);
  const mias = palabras(p_titulo);
  return t.eventos
    .filter((e) => e.visible && !e.borrador && !e.retirado_por_admin && new Date(e.termina) >= new Date() && ["puntual", "taller"].includes(e.clase) && e.id !== p_excluir)
    .filter((e) => sitio && sitioDe(e.lugar_id, e.sitio_texto) === sitio && diaEn(e.inicio, e.zona) === diaEn(p_inicio, e.zona) && diaEn(p_inicio, p_zona) === dia)
    .filter((e) => normal(e.titulo) === normal(p_titulo) || [...palabras(e.titulo)].filter((w) => mias.has(w)).length >= 2)
    .slice(0, 5)
    .map((e) => ({ id: e.id, slug: e.slug, titulo: e.titulo, inicio: e.inicio, zona: e.zona, imagen: e.imagen, lugar_id: e.lugar_id, lugar_nombre: t.lugares.find((l) => l.id === e.lugar_id)?.nombre ?? null, sitio_texto: e.sitio_texto }));
}

/** `poner_cartel_a_evento` en corto (OL-467). Lo que no se puede contesta como la base: `{ code, message }`, que `server.mjs` responde como error. */
function cartelEnMemoria({ p_evento, p_imagen, p_colores = null, p_completar = null, p_reemplazar = false }, t, yo) {
  const e = t.eventos.find((x) => x.id === p_evento && x.visible && !x.borrador && !x.retirado_por_admin);
  if (!e) return { __error: { code: "P0002", message: "evento_no_disponible" } };
  const r = { id: e.id, slug: e.slug, lugar_id: e.lugar_id, dueno: e.creado_por, completado: [], reemplazado: !!e.imagen, repetido: false, artistas: [] };
  if (e.imagen) {
    if (!p_reemplazar) return { __error: { code: "23505", message: "ya_tiene_cartel" } };
    if (e.creado_por !== yo && yo !== ADMIN) return { __error: { code: "42501", message: "solo_quien_lo_publico" } };
    Object.assign(e, { imagen: p_imagen, colores_cartel: p_colores });
    return r;
  }
  const c = p_completar ?? {};
  e.imagen = p_imagen;
  e.colores_cartel = p_colores;
  for (const campo of ["descripcion", "precio", "fin"]) {
    if (e[campo] || !c[campo]) continue;
    e[campo] = c[campo];
    r.completado.push(campo);
  }
  if (Array.isArray(c.quien) && c.quien.length && !t.eventos_artistas.some((x) => x.evento_id === e.id)) {
    c.quien.forEach((q, orden) => {
      let a = t.artistas.find((x) => x.id === q.id || normal(x.nombre) === normal(q.nombre));
      if (!a) t.artistas.push((a = { ...t.artistas[0], id: crypto.randomUUID(), slug: normal(q.nombre).replace(/ /g, "-"), nombre: q.nombre, nombre_orden: normal(q.nombre), disciplina: "por_completar", detalle: null, tipo: q.tipo ?? "solista", foto: null, portada: null, descripcion: null, redes: [], creado_por: yo }));
      t.eventos_artistas.push({ evento_id: e.id, artista_id: a.id, orden: orden + 1 });
      r.artistas.push(a.id);
    });
    r.completado.push("artistas");
  }
  return r;
}

export const tablas = {
  perfiles, lugares, eventos, artistas, eventos_artistas, asistencias, seguimientos, destacados,
  artistas_cuentas, lugares_cuentas, bloqueos: [], novedades: [], novedades_artista, reportes: [], suscripciones_push: [], fotos: [], eventos_sitio_privado: [], eventos_sesiones: [...eventos_sesiones, ...sesiones], lugares_horarios, eventos_horarios, ajustes_sitio: [], obras_colectivas: [], dispositivos_apns: [], cifrado: [],
  showcase_candidatos, showcase_cambios_estado, showcase_evidencias, lecturas_redes, showcase_grupos,
};

// OL-401: lo que el grafo cultural lee con la llave de servicio (`cargarGrafo`, que salta las reglas por fila): filas de más que SOLO ve quien manda
// esa llave, para que la pantalla tenga qué dibujar sin cambiar nada de lo que miden las demás. Tres personas con «Voy» en un mismo evento (el
// umbral de anonimato: sus líneas salen), una con uno solo (no sale ninguna), una que solo sigue (no se dibuja) y seis artistas sin eventos
// (el nodo «por conectar»). Todo inventado.
export const LLAVE_SERVICIO = "llave-servicio-inventada";
const persona = (n) => `99999999-0000-4000-8000-00000000000${n}`;
// OL-404: un caso como el que el founder revisó en el grafo real (un artista cuya única fecha es un acto de un festival en un sitio libre, con una
// asistencia y dos seguidores): el artista inventado «Ruido Blanco», el festival «Festival Eléctrico (demo)» con su marco y un acto en un parque sin
// ficha (a ~22 m del marco: caen en el mismo sitio) y otro acto en un lugar con ficha (la línea lugar–sitio por festival compartido).
const FESTIVAL_DEMO = "bbbb0009-0000-4000-8000-000000000001";
const ACTO_PARQUE = "bbbb0009-0000-4000-8000-000000000002";
const ACTO_FICHA = "bbbb0009-0000-4000-8000-000000000003";
const RUIDO_BLANCO = "cccc0009-0000-4000-8000-000000000011";
const PARQUE = { texto: "Parque Lineal (demo)", direccion: "Sitio inventado para la prueba", lat: 22.133, lng: -101.015 };
export const extrasServicio = {
  eventos: [
    evento({ id: FESTIVAL_DEMO, slug: "festival-electrico-demo", titulo: "Festival Eléctrico (demo)", dias: -2, hora: "18:00", dur: 30, sitio: PARQUE, clase: "festival", imagen: null, creadoHace: 20 }),
    evento({ id: ACTO_PARQUE, slug: "festival-electrico-demo-parque", titulo: "Festival Eléctrico: noche en el parque", dias: -2, hora: "21:00", dur: 4, sitio: { ...PARQUE, lat: 22.1332 }, evento_padre_id: FESTIVAL_DEMO, imagen: null, creadoHace: 20 }),
    evento({ id: ACTO_FICHA, slug: "festival-electrico-demo-ficha", titulo: "Festival Eléctrico: cierre en el foro", dias: -1, hora: "20:00", dur: 3, lugar_id: L.ache, evento_padre_id: FESTIVAL_DEMO, imagen: null, creadoHace: 20 }),
  ],
  eventos_artistas: [{ evento_id: ACTO_PARQUE, artista_id: RUIDO_BLANCO }],
  artistas: [
    { id: RUIDO_BLANCO, nombre: "Ruido Blanco", disciplina: "musica", ciudad: CIUDAD, visible: true },
    // (los demás, sin eventos)
    ...["Colectivo Sol Naciente", "Lía Montoya", "Trío Los Alamos", "Mateo Quiroz", "Cía. Teatro de Bolsillo", "Dúo Aurora"].map((nombre, i) => ({ id: `cccc0009-0000-4000-8000-00000000000${i + 1}`, nombre, disciplina: ["musica", "artes_visuales", "musica", "letras", "teatro", "danza"][i], ciudad: CIUDAD, visible: true })),
  ],
  asistencias: [
    { id: "dddd0009-0000-4000-8000-000000000001", usuario_id: persona(1), evento_id: E.leonora, estado: "voy", creado_en: hace(3) },
    { id: "dddd0009-0000-4000-8000-000000000002", usuario_id: persona(2), evento_id: E.leonora, estado: "me_interesa", creado_en: hace(3) },
    { id: "dddd0009-0000-4000-8000-000000000003", usuario_id: persona(1), evento_id: E.colocaos, estado: "voy", creado_en: hace(3) },
    { id: "dddd0009-0000-4000-8000-000000000004", usuario_id: persona(3), evento_id: E.oca, estado: "voy", creado_en: hace(3) },
    // La cuenta de administración del respaldo va a «Leonora» y a «Los colocaos» (los dos con 3 o más): su punto «Tú» tiene líneas.
    { id: "dddd0009-0000-4000-8000-000000000007", usuario_id: ADMIN, evento_id: E.leonora, estado: "voy", creado_en: hace(3) },
    { id: "dddd0009-0000-4000-8000-000000000008", usuario_id: ADMIN, evento_id: E.colocaos, estado: "me_interesa", creado_en: hace(3) },
    { id: "dddd0009-0000-4000-8000-000000000005", usuario_id: persona(1), evento_id: E.feleal, estado: "voy", creado_en: hace(3) },
    { id: "dddd0009-0000-4000-8000-000000000006", usuario_id: persona(2), evento_id: E.feleal, estado: "voy", creado_en: hace(3) },
    // OL-404: la única asistencia al acto del parque sin ficha (con el umbral en 1 ya dibuja sus líneas).
    { id: "dddd0009-0000-4000-8000-000000000009", usuario_id: persona(5), evento_id: ACTO_PARQUE, estado: "voy", creado_en: hace(2) },
  ],
  seguimientos: [
    { id: "eeee0009-0000-4000-8000-000000000001", usuario_id: persona(4), lugar_id: L.paz, artista_id: null, creado_en: hace(3) },
    { id: "eeee0009-0000-4000-8000-000000000002", usuario_id: persona(4), lugar_id: null, artista_id: A.feleal, creado_en: hace(3) },
    { id: "eeee0009-0000-4000-8000-000000000003", usuario_id: persona(1), lugar_id: L.ccub, artista_id: null, creado_en: hace(3) },
    // OL-404: los dos seguidores de «Ruido Blanco» (no asistieron a nada: solo siguen).
    { id: "eeee0009-0000-4000-8000-000000000004", usuario_id: persona(6), lugar_id: null, artista_id: RUIDO_BLANCO, creado_en: hace(2) },
    { id: "eeee0009-0000-4000-8000-000000000005", usuario_id: persona(7), lugar_id: null, artista_id: RUIDO_BLANCO, creado_en: hace(2) },
  ],
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
  mi_perfil: (_args, t, { sub } = {}) => (sub === ADMIN ? perfilAdmin : sub === ADMIN_SIN ? { ...perfilAdmin, id: ADMIN_SIN, nombre: "Admin sin asistencias" } : t.perfiles.find(p => p.id === (sub ?? ANA)) ?? null),

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
  lugares_con_nombre: ({ p_nombre }) => lugares.filter((l) => l.nombre.toLowerCase().includes(String(p_nombre || "").toLowerCase())).map((l) => ({ id: l.id, slug: l.slug, nombre: l.nombre, tipo: l.tipo, direccion: l.direccion, lat: l.lat, lng: l.lng, portada: l.portada, zona: l.zona, privado: false, ciudad: l.ciudad })),
  lugares_parecidos: () => [],
  // OL-466: «¿Es este?» del alta de evento, solo con `RESPALDO_CARTEL_EXISTENTE=1` (sin la marca, nada, como antes).
  eventos_parecidos: (args, t) => parecidosEnMemoria(args, t),
  // OL-467: «Sí, es este: ponerle mi cartel», en memoria y en corto (la regla completa y sus pruebas viven en la base,
  // supabase/tests/pg/cartel-a-evento-existente.test.mjs): sin cartel, a cualquiera, completando solo lo vacío; con cartel, a quien lo publicó.
  poner_cartel_a_evento: (args, t, { sub } = {}) => cartelEnMemoria(args, t, sub ?? ANA),
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
  // OL-413: un festival sin programa se publica como un evento y queda con clase festival (en memoria, como las demás altas).
  publicar_festival_sin_programa: ({ p_datos, p_operacion, p_quien }, t, { sub } = {}) => {
    const r = enMemoria(t, null, p_datos, p_operacion, sub, p_quien);
    const e = t.eventos.find((x) => x.id === r.id);
    if (e) e.clase = "festival";
    return { ...r, padre: null, inauguracion: null };
  },
  // La lectura del cartel (OL-413): el cupo siempre alcanza en el respaldo; lo leído lo contesta `server.mjs` en `/anthropic/v1/messages`.
  apartar_lectura_de_cartel: () => true,
  devolver_lectura_de_cartel: () => null,
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

// OL-414: Administración › Personas, la lista y la ficha de una persona: los contratos de `panel_personas`, `panel_personas_conteos` y
// `panel_persona` sobre las personas del respaldo (los permisos reales y las cuentas se prueban en PostgreSQL, `supabase/tests`). Lo publicado
// cuenta todo lo que tiene `creado_por` = esa persona, como la base. La cuenta de administración del respaldo está en la lista (como «Tú» al
// mirarse) y es de origen: puede hacer y quitar administradores. Las tres cuentas de más solo salen en la lista y solo con `RESPALDO_PERSONAS=1`.
const CUENTAS_PANEL = {
  [ANA]: { correo: "ana@example.com", creado_en: hace(30), ultima_entrada: hace(1), visto: hoyLocal, confirmado: true },
  [MARCOS]: { correo: "marcos@example.com", creado_en: hace(25), ultima_entrada: hace(3), visto: null, confirmado: true },
  [ADMIN]: { correo: "admin@example.com", creado_en: hace(60), ultima_entrada: hace(0), visto: hoyLocal, confirmado: true, de_origen: true },
};
const personasDeMas = !CON_PERSONAS
  ? []
  : [
      { id: "99999999-1111-4000-8000-000000000001", nombre: "Lucía Barragán", foto: `${RETRATOS}/lucia.png`, rol: "usuario", reservado: false, colonia: "Tequisquiapan", correo: "lucia@example.com", creado_en: hace(2), ultima_entrada: hace(2), visto: hoyLocal, confirmado: true },
      { id: "99999999-1111-4000-8000-000000000002", nombre: "Diego Ortiz Cano", foto: null, rol: "usuario", reservado: false, colonia: null, correo: "diego@example.com", creado_en: hace(4), ultima_entrada: null, visto: null, confirmado: false },
      { id: "99999999-1111-4000-8000-000000000003", nombre: "Valeria Méndez", foto: `${RETRATOS}/valeria.png`, rol: "usuario", reservado: true, colonia: "Centro", correo: "valeria@example.com", creado_en: hace(12), ultima_entrada: hace(5), visto: null, confirmado: true },
    ];
/** Las personas del panel: las del fixture con su cuenta, la de administración y, con la bandera, las de más. */
function personasPanel(t) {
  const conCuenta = [...t.perfiles, perfilAdmin].map((p) => ({ ...p, ...CUENTAS_PANEL[p.id] }));
  return [...conCuenta, ...personasDeMas];
}
const oculto = (correo) => (correo ? `${correo.split("@")[0].slice(0, 2)}…@${correo.split("@")[1]}` : null);
const publicadoPor = (id, t) => ({ lugares: t.lugares.filter((x) => x.creado_por === id).length, eventos: t.eventos.filter((x) => x.creado_por === id).length, artistas: t.artistas.filter((x) => x.creado_por === id).length });
const llevaDe = (id, t) => [
  ...t.artistas_cuentas.filter((c) => c.perfil_id === id).map((c) => ({ tipo: "artista", id: c.artista_id, nombre: t.artistas.find((a) => a.id === c.artista_id)?.nombre, creado_en: c.creado_en })),
  ...t.lugares_cuentas.filter((c) => c.perfil_id === id).map((c) => ({ tipo: "lugar", id: c.lugar_id, nombre: t.lugares.find((l) => l.id === c.lugar_id)?.nombre, creado_en: c.creado_en })),
].sort((a, b) => a.creado_en.localeCompare(b.creado_en));
const vaA = (id, t) => t.asistencias.filter((a) => a.usuario_id === id && a.estado === "voy" && t.eventos.some((e) => e.id === a.evento_id && e.visible && new Date(e.termina) >= new Date())).length;
const esNueva = (p) => p.rol !== "admin" && Date.now() - Date.parse(p.creado_en) < 7 * 86400e3;
const ultimaActividad = (p) => Math.max(Date.parse(p.ultima_entrada ?? 0) || 0, p.visto ? Date.parse(`${p.visto}T12:00:00-06:00`) : 0, Date.parse(p.creado_en));
Object.assign(rpcs, {
  panel_personas: ({ p_ciudad = null, p_buscar = null, p_filtro = "todas", p_limite = 30, p_desde = 0 }, t) => {
    const q = String(p_buscar ?? "").trim().toLowerCase();
    const filas = personasPanel(t)
      .filter((p) => !p_ciudad || (ciudadDePersona(p.id, t) ?? "sin") === p_ciudad)
      .filter((p) => !q || p.nombre.toLowerCase().includes(q) || p.correo?.toLowerCase().includes(q))
      .filter((p) => (p_filtro === "nuevas" ? esNueva(p) : p_filtro === "sin_entrar" ? !p.ultima_entrada : p_filtro === "administracion" ? p.rol === "admin" : true))
      .sort((a, b) => ultimaActividad(b) - ultimaActividad(a) || a.nombre.localeCompare(b.nombre));
    return filas.slice(p_desde, p_desde + p_limite).map((p) => {
      const n = publicadoPor(p.id, t);
      const lleva = llevaDe(p.id, t);
      return {
        id: p.id, nombre: p.nombre, foto: p.foto, rol: p.rol, reservado: p.reservado, creado_en: p.creado_en, confirmado: p.confirmado, ultima_entrada: p.ultima_entrada, visto: p.visto, correo_oculto: oculto(p.correo),
        va_a: vaA(p.id, t), sigue: t.seguimientos.filter((s) => s.usuario_id === p.id).length, publico: n.lugares + n.eventos + n.artistas, lleva: lleva[0]?.nombre ?? null, lleva_n: lleva.length, total: filas.length,
      };
    });
  },
  panel_personas_conteos: ({ p_ciudad = null } = {}, t) => {
    const todas = personasPanel(t).filter((p) => !p_ciudad || (ciudadDePersona(p.id, t) ?? "sin") === p_ciudad);
    return { todas: todas.length, nuevas: todas.filter(esNueva).length, sin_entrar: todas.filter((p) => !p.ultima_entrada).length, administracion: todas.filter((p) => p.rol === "admin").length };
  },
  panel_persona: ({ p_perfil }, t, { sub } = {}) => {
    const p = personasPanel(t).find((x) => x.id === p_perfil);
    if (!p) return null;
    const n = publicadoPor(p.id, t);
    const seguidos = t.seguimientos.filter((s) => s.usuario_id === p.id);
    return {
      id: p.id, nombre: p.nombre, foto: p.foto, colonia: p.colonia, reservado: p.reservado, rol: p.rol, creado_en: p.creado_en, correo_oculto: oculto(p.correo), confirmado: p.confirmado, ultima_entrada: p.ultima_entrada, visto: p.visto,
      avisos_correo: !!p.avisos_correo, avisos_correo_motivo: null, telefonos: 0,
      va_a: vaA(p.id, t), le_interesa: t.asistencias.filter((a) => a.usuario_id === p.id && a.estado === "me_interesa").length,
      sigue_lugares: seguidos.filter((s) => s.lugar_id).length, sigue_artistas: seguidos.filter((s) => s.artista_id).length,
      publico_lugares: n.lugares, publico_eventos: n.eventos, publico_artistas: n.artistas,
      lleva: llevaDe(p.id, t).map(({ tipo, id, nombre }) => ({ tipo, id, nombre })),
      reclamos: 0, reportes: 0, pendientes: 0, de_origen: !!p.de_origen, es_yo: p.id === sub, puedo_cambiar_rol: !!CUENTAS_PANEL[sub]?.de_origen,
      administradores: personasPanel(t).filter((x) => x.rol === "admin").length, cambio_rol: null,
    };
  },
});

// OL-456: Administración › Lugares, Eventos y Artistas con renglones, para compararlas con su par del front (maqueta-pantalla.mjs): los
// contratos de `panel_lugares`, `panel_eventos`, `panel_artistas`, `panel_fichas_conteos` y `panel_destacados` (migración 20260917090000) sobre
// las fichas del respaldo, solo con el filtro por omisión y la búsqueda; los demás filtros devuelven lo mismo (no se miden aquí).
// La ciudad, como `ciudad_slug` (migración 20261023120000): sin acentos ni signos; Soledad y el texto vacío, San Luis Potosí.
const slugCiudad = (c) => { const s = sinAcentosPanel(c).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); return !s || s === "soledad-de-graciano-sanchez" ? "san-luis-potosi" : s; };
const enCiudad = (filas, ciudad) => (ciudad ? filas.filter((x) => slugCiudad(x.ciudad) === ciudad) : filas);
// La ciudad de una persona, como `ciudad_de_persona`: la que más se repite en lo que lleva, publicó y marcó «Voy»; null si nada.
function ciudadDePersona(id, t) {
  const de = (tabla, fichaId) => t[tabla].find((x) => x.id === fichaId)?.ciudad;
  const c = [
    ...t.lugares_cuentas.filter((x) => x.perfil_id === id).map((x) => de("lugares", x.lugar_id)),
    ...t.artistas_cuentas.filter((x) => x.perfil_id === id).map((x) => de("artistas", x.artista_id)),
    ...["lugares", "eventos", "artistas"].flatMap((tabla) => t[tabla].filter((x) => x.creado_por === id).map((x) => x.ciudad)),
    ...t.asistencias.filter((a) => a.usuario_id === id && a.estado === "voy").map((a) => de("eventos", a.evento_id)),
  ].map(slugCiudad);
  if (!c.length) return null;
  const n = new Map();
  for (const s of c) n.set(s, (n.get(s) ?? 0) + 1);
  return [...n].sort((a, b) => b[1] - a[1])[0][0];
}
const proximasDe = (campo, id, t) => t.eventos.filter((e) => e.visible && new Date(e.termina ?? e.inicio) >= new Date() && (campo === "lugar_id" ? e.lugar_id === id : t.eventos_artistas.some((x) => x.evento_id === e.id && x.artista_id === id))).length;
const conBusqueda = (filas, q, campo = "nombre") => (q ? filas.filter((x) => sinAcentosPanel(x[campo]).includes(sinAcentosPanel(q))) : filas);
const sinAcentosPanel = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const llevaFicha = (tabla, col, id, t) => { const l = t[tabla].filter((c) => c[col] === id); return { lleva: l[0] ? personasPanel(t).find((p) => p.id === l[0].perfil_id)?.nombre ?? null : null, lleva_n: l.length }; };
Object.assign(rpcs, {
  panel_lugares: ({ p_ciudad = null, p_buscar = null, p_limite = 30, p_desde = 0 }, t) => {
    const filas = conBusqueda(enCiudad(t.lugares, p_ciudad), p_buscar).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    return filas.slice(p_desde, p_desde + p_limite).map((l) => ({ id: l.id, nombre: l.nombre, foto: l.portada ?? null, tipo: l.tipo, detalle: l.detalle ?? null, visible: l.visible !== false, privado: !!l.privado, origen: l.origen ?? null, proximas: proximasDe("lugar_id", l.id, t), ...llevaFicha("lugares_cuentas", "lugar_id", l.id, t), total: filas.length }));
  },
  panel_eventos: ({ p_ciudad = null, p_buscar = null, p_limite = 30, p_desde = 0 }, t) => {
    const filas = conBusqueda(enCiudad(t.eventos, p_ciudad).filter((e) => !e.evento_padre_id && new Date(e.termina ?? e.inicio) >= new Date()), p_buscar, "titulo").sort((a, b) => a.inicio.localeCompare(b.inicio));
    return filas.slice(p_desde, p_desde + p_limite).map((e) => {
      const autor = personasPanel(t).find((p) => p.id === e.creado_por);
      return { id: e.id, titulo: e.titulo, imagen: e.imagen ?? null, inicio: e.inicio, fin: e.fin ?? null, visible: e.visible !== false, sitio: t.lugares.find((l) => l.id === e.lugar_id)?.nombre ?? e.sitio_texto ?? null, autor: autor?.nombre ?? null, autor_admin: !autor || autor.rol === "admin", van: t.asistencias.filter((a) => a.evento_id === e.id && a.estado === "voy").length, total: filas.length };
    });
  },
  panel_artistas: ({ p_ciudad = null, p_buscar = null, p_limite = 30, p_desde = 0 }, t) => {
    const filas = conBusqueda(enCiudad(t.artistas, p_ciudad), p_buscar).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    return filas.slice(p_desde, p_desde + p_limite).map((a) => ({ id: a.id, nombre: a.nombre, foto: a.foto ?? null, disciplina: a.disciplina, detalle: a.detalle ?? null, visible: a.visible !== false, origen: a.origen ?? null, proximas: proximasDe("artista_id", a.id, t), ...llevaFicha("artistas_cuentas", "artista_id", a.id, t), total: filas.length }));
  },
  panel_fichas_conteos: ({ p_tipo, p_ciudad = null }, todo) => {
    const t = { ...todo, lugares: enCiudad(todo.lugares, p_ciudad), eventos: enCiudad(todo.eventos, p_ciudad), artistas: enCiudad(todo.artistas, p_ciudad) };
    if (p_tipo === "lugares") return { todos: t.lugares.length, ocultos: t.lugares.filter((l) => l.visible === false).length, sin_fecha: t.lugares.filter((l) => !proximasDe("lugar_id", l.id, t)).length, sin_foto: t.lugares.filter((l) => !l.portada).length, catalogo: t.lugares.filter((l) => l.origen === "capo").length };
    if (p_tipo === "eventos") { const p = t.eventos.filter((e) => !e.evento_padre_id && new Date(e.termina ?? e.inicio) >= new Date()); return { proximos: p.length, semana: p.filter((e) => Date.parse(e.inicio) < Date.now() + 7 * 86400e3).length, coincidencias: 0, sin_imagen: p.filter((e) => !e.imagen).length, comunidad: p.filter((e) => e.creado_por && e.creado_por !== ADMIN).length, ocultos: p.filter((e) => e.visible === false).length }; }
    return { todos: t.artistas.length, por_reclamar: t.artistas.filter((a) => a.origen === "capo").length, llevados: t.artistas_cuentas.length, sin_foto: t.artistas.filter((a) => !a.foto).length, ocultos: t.artistas.filter((a) => a.visible === false).length };
  },
  panel_destacados: () => [],
  panel_en_ciudad: ({ p_tipo, p_ciudad, p_ids }, t) => enCiudad(t[p_tipo] ?? [], p_ciudad).filter((x) => p_ids.includes(x.id)).map((x) => x.id),
  // La hoja de ciudades: cada ciudad con cuántas tiene la sección, de la que más a la que menos; en Personas, «Sin ciudad» al final.
  panel_ciudades_de: ({ p_tipo }, t) => {
    const slugs = p_tipo === "personas" ? personasPanel(t).map((p) => ciudadDePersona(p.id, t) ?? "sin") : (p_tipo === "eventos" ? t.eventos.filter((e) => e.visible && new Date(e.termina ?? e.inicio) >= new Date()) : t[p_tipo]).map((x) => slugCiudad(x.ciudad));
    const n = new Map();
    for (const s of slugs) n.set(s, (n.get(s) ?? 0) + 1);
    const nombre = (s) => (s === "sin" ? "Sin ciudad" : (t.ciudades ?? []).find((c) => c.slug === s)?.nombre ?? [...t.lugares, ...t.eventos, ...t.artistas].find((x) => slugCiudad(x.ciudad) === s)?.ciudad ?? s);
    return [...n].sort(([a, x], [b, y]) => (a === "sin") - (b === "sin") || y - x).map(([slug, cuenta]) => ({ slug, nombre: nombre(slug), n: cuenta }));
  },
});

// OL-447: asignar desde la ficha de una persona en Administración una ficha de lugar o de artista. Los contratos de `admin_buscar_fichas`,
// `admin_asignar_ficha` y `admin_quitar_ficha` (migración 20261022150000) sobre las ligas del respaldo, que asignar y quitar cambian EN MEMORIA
// (otro arranque empieza limpio) para ver la lista tras el toque. Los permisos reales y el registro se prueban en PostgreSQL
// (`supabase/tests/pg/admin-asignar-fichas.test.mjs`); aquí solo la cuenta de administración del respaldo puede.
const sinAcentos = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const LIGAS = { lugar: ["lugares_cuentas", "lugar_id"], artista: ["artistas_cuentas", "artista_id"] };
Object.assign(rpcs, {
  admin_buscar_fichas: ({ p_buscar, p_perfil, p_limite = 20 }, t, { sub } = {}) => {
    const q = sinAcentos(p_buscar);
    if (sub !== ADMIN || !q) return [];
    const nombreDe = (id) => personasPanel(t).find((p) => p.id === id)?.nombre ?? null;
    const fila = (tipo, x, clase, foto) => {
      const [tabla, col] = LIGAS[tipo];
      const ligas = t[tabla].filter((c) => c[col] === x.id).sort((a, b) => a.creado_en.localeCompare(b.creado_en));
      const otras = ligas.filter((c) => c.perfil_id !== p_perfil);
      return { tipo, id: x.id, nombre: x.nombre, foto, ciudad: x.ciudad ?? "San Luis Potosí", clase, detalle: x.detalle ?? null, visible: x.visible !== false, suya: ligas.some((c) => c.perfil_id === p_perfil), otros: otras[0] ? nombreDe(otras[0].perfil_id) : null, otros_n: otras.length };
    };
    const todas = [
      ...t.lugares.filter((l) => !l.privado).map((l) => fila("lugar", l, l.tipo, l.portada ?? null)),
      ...t.artistas.map((a) => fila("artista", a, a.disciplina, a.foto ?? null)),
    ].filter((f) => sinAcentos(f.nombre).includes(q));
    const empieza = (f) => (sinAcentos(f.nombre).startsWith(q) ? 0 : 1);
    return todas.sort((a, b) => empieza(a) - empieza(b) || a.nombre.localeCompare(b.nombre)).slice(0, Math.min(Number(p_limite) || 20, 50));
  },
  admin_asignar_ficha: ({ p_tipo, p_ficha, p_perfil }, t, { sub } = {}) => {
    if (sub !== ADMIN) return "no_admin";
    if (!LIGAS[p_tipo]) return "sin_ficha";
    const [tabla, col] = LIGAS[p_tipo];
    if (!(p_tipo === "lugar" ? t.lugares.some((l) => l.id === p_ficha && !l.privado) : t.artistas.some((a) => a.id === p_ficha))) return "sin_ficha";
    if (t[tabla].some((c) => c[col] === p_ficha && c.perfil_id === p_perfil)) return "ya";
    t[tabla].push({ [col]: p_ficha, perfil_id: p_perfil, creado_en: new Date().toISOString() });
    return "ok";
  },
  admin_quitar_ficha: ({ p_tipo, p_ficha, p_perfil }, t, { sub } = {}) => {
    if (sub !== ADMIN) return "no_admin";
    if (!LIGAS[p_tipo]) return "sin_ficha";
    const [tabla, col] = LIGAS[p_tipo];
    const i = t[tabla].findIndex((c) => c[col] === p_ficha && c.perfil_id === p_perfil);
    if (i < 0) return "no_estaba";
    t[tabla].splice(i, 1);
    return "ok";
  },
});

// OL-425: la portada de Administración (/admin) para guardarla con `maqueta-pantalla.mjs`: los contratos de `panel_resumen`, `panel_pendientes`,
// `panel_comunidad`, `panel_aportes`, `panel_fichas` y `panel_capo` con números inventados y coherentes entre sí (sin ellos la portada caía en
// «Algo falló»: una RPC desconocida devuelve `[]`). Solo los lee /admin; ninguna pantalla que mide `medir` cambia.
const fotoDe = (dias, activas, coincidencias, eventos_semana, comunidad) => ({ dia: new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date(Date.now() - dias * 86400e3)), activas, coincidencias, eventos_semana, comunidad });
Object.assign(rpcs, {
  panel_resumen: () => ({
    ahora: {
      activas: 23, cuentas: 80, coincidencias: 4, eventos_semana: 37, lugares_con_fecha: 18, lugares: 71, comunidad: 52, proximos: 96, comunidad_nuevos: 3,
      desglose: { abrieron: 21, voy: 12, siguieron: 7, publicaron: 5, nuevas: 3, con_2: 2, con_3_a_5: 2, con_6_o_mas: 0, mayor: { id: "bbbb0000-0000-4000-8000-000000000001", titulo: "Noche de son huasteco", n: 4 }, personas_que_publican: 9 },
    },
    historia: [fotoDe(28, 15, 1, 29, 41), fotoDe(21, 17, 2, 31, 44), fotoDe(14, 19, 2, 33, 47), fotoDe(7, 20, 3, 35, 49)],
    gestionar: { personas: 80, personas_nuevas: 3, nunca_entraron: 6, correo_con_problema: 1, lugares: 71, lugares_sin_fecha: 53, lugares_ocultos: 2, lugares_privados: 1, eventos: 383, eventos_sin_imagen: 41, artistas: 686, artistas_ocultos: 4, artistas_llevados: 19, invitaciones: 0 },
  }),
  panel_pendientes: () => [],
  panel_comunidad: () => ({ registradas: 14, hicieron_algo: 9, vuelven_base: 11, vuelven: 5 }),
  panel_aportes: () => ({ gestos_ahora: 18, gestos_antes: 13, voy: 11, me_interesa: 7, personas: 12, primeras_ahora: 2, primeras_antes: 1, han_publicado: 21 }),
  panel_fichas: () => ({ artistas: 19, lugares: 8, vias: { solicitud: 11, alta: 9, correo: 6, otra: 1 }, serie: [12, 13, 14, 15, 16, 18, 19, 21, 22, 24, 26, 27], artistas_por_reclamar: 667, artistas_visibles: 682, artistas_con_foto: 214 }),
  // OL-480: «Avisos abiertos», las cifras del prototipo firmado (bitácora 510).
  panel_avisos: () => ({ mandados: 48, mandados_antes: 41, abiertos: 11, abiertos_antes: 7,
    tipos: { nuevo: { mandados: 28, abiertos: 8 }, cambio: { mandados: 9, abiertos: 2 }, recordatorio: { mandados: 3, abiertos: 1 }, cancelado: { mandados: 8, abiertos: 0 } } }),
  panel_capo: () => ({ invitados: 120, ya_vinculados_al_invitar: 4, elegibles: 116, solicitaron_despues: 7, vinculados_despues: 5, primer_envio: hace(20), ultimo_envio: hace(1), corte: hace(0) }),
});

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
const CORREOS = { [ANA]: "ana@example.com", [MARCOS]: "marcos@example.com", [ADMIN]: "admin@example.com", [ADMIN_SIN]: "admin-sin@example.com" };
/** La sesión inventada de una cuenta del respaldo (Ana por omisión; Marcos para el caso de dos cuentas, OL-341). */
export function sesionDe(sub = ANA) {
  const claims = { iss: "http://127.0.0.1:8823/auth/v1", sub, aud: "authenticated", exp: ahora + 365 * 86400, iat: ahora, email: CORREOS[sub], phone: "", app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {}, role: "authenticated", aal: "aal1", amr: [{ method: "otp", timestamp: ahora }], session_id: sub === ANA ? "33333333-3333-4333-8333-333333333333" : sub === ADMIN ? "66666666-6666-4666-8666-666666666666" : sub === ADMIN_SIN ? "88888888-8888-4888-8888-888888888888" : "44444444-4444-4444-8444-444444444444", is_anonymous: false };
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

// OL-427 y OL-432: Administración › Ciudades, sus corridas y la bandeja de propuestas (la cuenta de administración del respaldo). Las tablas
// `ciudades` (con `alias` y `parametros`), `ciudades_vistas`, `rutinas_corridas` y `propuestas` y los contratos de `panel_ciudades`,
// `panel_propuestas`, `aceptar_propuesta` y `registrar_ciudad_vista` (los permisos reales, en PostgreSQL: `supabase/tests/pg/ciudades-admin.test.mjs`).
// Todo inventado: Oaxaca abierta hace 9 días con sus municipios, cinco propuestas de lugares por revisar (direcciones, coordenadas y fuentes
// `.example` inventadas) y una búsqueda de agendas corriendo; Ciudad de México abierta hoy con sus alcaldías (OL-429), una búsqueda de lugares
// que llegó al tope y otra de agendas que falló; Querétaro y Aguascalientes detectadas; «Oaxaca de Juárez» detectada, que es Oaxaca con otro
// nombre (se junta con ella); Zacatecas oculta; San Luis con dos corridas del mes pasado (la del Sistema de Información Cultural ya tuvo una
// tanda aceptada). Solo lo leen las pantallas de Administración y la detección de Inicio y Lugares (que no cambia nada de lo que se mide).
const CDMX = ["Cuauhtémoc", "Miguel Hidalgo", "Coyoacán", "Benito Juárez", "Álvaro Obregón"];
const MUNICIPIOS_OAX = ["Santa Lucía del Camino", "Santa Cruz Xoxocotlán"];
const ciudadDe = (slug, nombre, lat, lng, estado, creado, alias = [], parametros = {}) => ({ slug, nombre, ampliada_de: null, lat, lng, zoom: 13, zona: ZONA, alias, parametros, estado, creado_en: hace(creado) });
const ciudades = [
  ciudadDe("san-luis-potosi", CIUDAD, 22.1497, -100.9764, "abierta", 40, ["Soledad de Graciano Sánchez"]),
  ciudadDe("san-miguel-de-allende", "San Miguel de Allende", 20.9144, -100.7452, "abierta", 40),
  ciudadDe("oaxaca", "Oaxaca", 17.0654, -96.7236, "investigando", 9, ["Oaxaca de Juárez", ...MUNICIPIOS_OAX], { radio_km: 15, municipios: MUNICIPIOS_OAX, abierta_en: hace(9) }),
  ciudadDe("ciudad-de-mexico", "Ciudad de México", 19.4326, -99.1332, "abierta", 0.3, [], { alcaldias: CDMX, radio_km: 12, abierta_en: hace(0.3) }),
  ciudadDe("queretaro", "Querétaro", 20.5931, -100.392, "detectada", 8),
  ciudadDe("aguascalientes", "Aguascalientes", null, null, "detectada", 2),
  ciudadDe("oaxaca-de-juarez", "Oaxaca de Juárez", 17.0654, -96.7236, "detectada", 3),
  ciudadDe("zacatecas", "Zacatecas", 22.7709, -102.5832, "cerrada", 6),
];
// Las consultas por día (en la zona de la ciudad), como las suma `registrar_ciudad_vista`: San Luis crece semana a semana (para la tendencia del
// panel); las demás, desde que se detectaron o se abrieron.
const diaHaceMx = (n) => new Date(Date.now() - 6 * 3600e3 - n * 86400e3).toISOString().slice(0, 10);
const vistasDe = (ciudad, dias, cuantas) => Array.from({ length: dias }, (_, i) => ({ ciudad, dia: diaHaceMx(i), consultas: cuantas(i) })).filter((v) => v.consultas > 0);
const ciudades_vistas = [
  ...vistasDe("san-luis-potosi", 42, (i) => 52 + Math.floor((41 - i) * 0.9)),
  ...vistasDe("san-miguel-de-allende", 30, (i) => (i % 3 === 0 ? 4 : 2)),
  ...vistasDe("oaxaca", 9, () => 5),
  ...vistasDe("ciudad-de-mexico", 1, () => 12),
  ...vistasDe("queretaro", 8, (i) => (i % 2 ? 1 : 3)),
  ...vistasDe("aguascalientes", 2, (i) => (i ? 4 : 5)),
  ...vistasDe("oaxaca-de-juarez", 3, () => 2),
  ...vistasDe("zacatecas", 6, () => 1),
];
const R = {
  oaxLugares: "abab0001-0000-4000-8000-000000000001",
  oaxAgendas: "abab0001-0000-4000-8000-000000000002",
  slpLugares: "abab0001-0000-4000-8000-000000000003",
  slpAgendas: "abab0001-0000-4000-8000-000000000004",
  cdmxLugares: "abab0001-0000-4000-8000-000000000005",
  cdmxAgendas: "abab0001-0000-4000-8000-000000000006",
  smaLugares: "abab0001-0000-4000-8000-000000000007",
  slpFormas: "abab0001-0000-4000-8000-000000000008",
};
const corridaDe = (id, tipo, ciudad, { tope = 3, gasto = 0, estado = "terminada", dias = 0, fuentes = ["sic", "cultura", "web"], resumen = {} } = {}) => ({
  id, tipo, ciudad, parametros: { fuentes }, tope_usd: tope, gasto_usd: gasto, estado, resumen, creado_por: ADMIN, creado_en: hace(dias),
  inicio: estado === "pendiente" ? null : hace(dias), fin: estado === "terminada" || estado === "fallida" ? new Date(Date.parse(hace(dias)) + 6 * 60e3).toISOString() : null,
});
const AGENDAS = ["agenda-cultura", "universidades-museos", "web"];
const rutinas_corridas = [
  corridaDe(R.oaxAgendas, "agendas", "oaxaca", { gasto: 0.4, estado: "corriendo", dias: 0.02, fuentes: AGENDAS, resumen: { avance: 0.3, paso: "1 de 3 fuentes" } }),
  corridaDe(R.oaxLugares, "lugares", "oaxaca", { gasto: 1.1, dias: 2 }),
  corridaDe(R.slpAgendas, "agendas", "san-luis-potosi", { gasto: 2.1, dias: 19, fuentes: AGENDAS }),
  corridaDe(R.slpLugares, "lugares", "san-luis-potosi", { tope: 2, gasto: 0.8, dias: 19.1 }),
  corridaDe(R.cdmxAgendas, "agendas", "ciudad-de-mexico", { gasto: 0.21, estado: "fallida", dias: 0.15, fuentes: AGENDAS, resumen: { error: "Se cortó tres veces seguidas en el mismo paso" } }),
  corridaDe(R.cdmxLugares, "lugares", "ciudad-de-mexico", { tope: 1.5, gasto: 1.5, dias: 0.25, resumen: { tope: true, paso: "2 de 3 fuentes", descartados: { de_mas: 12 } } }),
  // San Miguel, ayer (como en producción, bitácora 461): 40 propuestas aceptadas y 41 que esperan a la siguiente.
  corridaDe(R.smaLugares, "lugares", "san-miguel-de-allende", { gasto: 0.36, dias: 1, resumen: { descartados: { de_mas: 41 } } }),
  // OL-434: San Luis, hoy: la búsqueda de agendas que dejó una propuesta de cada forma (abajo).
  corridaDe(R.slpFormas, "agendas", "san-luis-potosi", { gasto: 1.24, dias: 0.12, fuentes: AGENDAS, resumen: { festivales: 1, actos: 5, sesiones: 5, series: 4 } }),
];
const SIC = "Sistema de Información Cultural", CULTURA = "Cultura del estado y del municipio", WEB = "Búsqueda web";
let nPropuesta = 0;
const propuestaDe = (corrida, tipo, fuente, datos, estado = "propuesta", dias = 2) => ({
  id: `acac0001-0000-4000-8000-${String(++nPropuesta).padStart(12, "0")}`, corrida_id: corrida, tipo, fuente, datos, estado,
  motivo_rechazo: estado === "rechazada" ? "duplicado" : null, ficha_id: null, resuelto_por: estado === "propuesta" ? null : ADMIN, resuelto_en: estado === "propuesta" ? null : hace(dias - 0.5), creado_en: hace(dias),
});
const lugarOax = (nombre, tipo, direccion, lat, lng, url) => ({ nombre, tipo, direccion, lat, lng, url, leida: hace(2) });
const lugarCdmx = (nombre, tipo, direccion, lat, lng, url) => ({ nombre, tipo, direccion, lat, lng, url, leida: hace(0.25) });
const propuestas = [
  // San Luis, hace 19 días: 4 aceptadas (dos del Sistema de Información Cultural: su primera tanda) y 2 rechazadas; y 3 eventos aceptados.
  ...[SIC, SIC, CULTURA, CULTURA].map((f, i) => propuestaDe(R.slpLugares, "lugar", f, { nombre: `Lugar aceptado ${i + 1}` }, "aceptada", 19)),
  ...[WEB, WEB].map((f, i) => propuestaDe(R.slpLugares, "lugar", f, { nombre: `Lugar rechazado ${i + 1}` }, "rechazada", 19)),
  ...[1, 2, 3].map((i) => propuestaDe(R.slpAgendas, "evento", CULTURA, { titulo: `Evento aceptado ${i}` }, "aceptada", 19)),
  // Oaxaca, hace 2 días: 9 aceptadas y 5 por revisar (tres del Sistema de Información Cultural y dos de la búsqueda web).
  ...[SIC, SIC, SIC, SIC, SIC, CULTURA, CULTURA, CULTURA, CULTURA].map((f, i) => propuestaDe(R.oaxLugares, "lugar", f, { nombre: `Espacio aceptado ${i + 1}` }, "aceptada")),
  propuestaDe(R.oaxLugares, "lugar", SIC, lugarOax("Foro Cultural La Nopalera", "foro", "Calle de Murguía 115, Centro", 17.0626, -96.7238, "https://sic.example/espacios/oax/115")),
  propuestaDe(R.oaxLugares, "lugar", SIC, lugarOax("Galería Siete Regiones", "galeria", "Avenida Juárez 402, Jalatlaco", 17.0672, -96.7181, "https://sic.example/espacios/oax/402")),
  propuestaDe(R.oaxLugares, "lugar", SIC, lugarOax("Casa de Cultura del Barrio de Xochimilco", "casa_de_cultura", "Calle Rufino Tamayo 9, Xochimilco", 17.0731, -96.7262, "https://sic.example/espacios/oax/9")),
  propuestaDe(R.oaxLugares, "lugar", WEB, lugarOax("Cafebrería El Andariego", "cafe_bar", "Calle de Abasolo 207, Centro", 17.0641, -96.7209, "https://andariego.example")),
  propuestaDe(R.oaxLugares, "lugar", WEB, { ...lugarOax("Patio Escénico Tule", "foro", "Camino Real 31", 17.0629, -96.6935, "https://patio-tule.example"), ciudad: "Santa Lucía del Camino" }),
  ...Array.from({ length: 40 }, (_, i) => propuestaDe(R.smaLugares, "lugar", i < 30 ? SIC : WEB, { nombre: `Espacio de San Miguel ${i + 1}` }, "aceptada", 1)),
  // Ciudad de México, hoy: la búsqueda de lugares que llegó al tope dejó cuatro por revisar.
  propuestaDe(R.cdmxLugares, "lugar", SIC, lugarCdmx("Foro Cultural Las Jacarandas", "foro", "Calle Colima 210, Roma Norte", 19.4174, -99.1622, "https://sic.example/espacios/cdmx/210"), "propuesta", 0.25),
  propuestaDe(R.cdmxLugares, "lugar", SIC, lugarCdmx("Galería Mezzanine", "galeria", "Avenida Amsterdam 45, Hipódromo", 19.4116, -99.1712, "https://sic.example/espacios/cdmx/45"), "propuesta", 0.25),
  propuestaDe(R.cdmxLugares, "lugar", CULTURA, lugarCdmx("Casa de Cultura de Coyoacán Centro", "casa_de_cultura", "Calle Higuera 18, Coyoacán", 19.3487, -99.1615, "https://cultura.example/cdmx/18"), "propuesta", 0.25),
  propuestaDe(R.cdmxLugares, "lugar", CULTURA, lugarCdmx("Cine Club La Linterna", "cine", "Calle Tonalá 33, Roma Sur", 19.4093, -99.1588, "https://cultura.example/cdmx/33"), "propuesta", 0.25),
];
// OL-434: lo que deja la rutina de agendas de OL-433 (`src/lib/rutinas/formaEvento.ts`) en una búsqueda de hoy en San Luis, para ver la forma
// de cada propuesta en su bandeja (`/admin/ciudades/san-luis-potosi/propuestas`) y recorrer «Aceptar» con toques reales: el festival «Xantolo
// 2026» con dos actos por revisar (uno llegó por la búsqueda web, con otro título en `variantes`) y dos ya aceptados que lo esperan; un recital
// como siempre; un taller con cuatro sesiones; una feria de tres días seguidos; dos fechas de un cineclub semanal (las otras dos, ya aceptadas);
// la inauguración de una exposición con su periodo; y un acto del Festival de Cine de Invierno, que ya está en la agenda. Todo inventado: los
// sitios son lugares del respaldo o llevan su punto dentro de San Luis. Al final del arreglo, así los ids de antes no se mueven.
const AGENDAS_GOB = "Agendas de gobierno", UNIVERSIDADES = "Universidades y museos", BUSQUEDA_WEB = "Búsqueda web";
const XANTOLO = "acac0434-0000-4000-8000-000000000001";
const en = (dias, hora) => iso(fecha(dias, hora));
const formaDe = (n, fuente, datos, estado = "propuesta") => ({
  ...propuestaDe(R.slpFormas, "evento", fuente, { url: "https://cultura.example/agenda-octubre.pdf", leida: hace(0.12), ...datos }, estado, 0.12),
  id: `acac0434-0000-4000-8000-${String(n).padStart(12, "0")}`,
});
const PLAZA = { lugar: "Plaza de Armas", direccion: "Plaza de Armas, Centro Histórico, San Luis Potosí", lat: 22.152, lng: -100.9765, direccion_mapa: "Plaza de Armas, Centro, 78000 San Luis Potosí" };
const actoDeXantolo = (n, fuente, titulo, dias, extra = {}, estado = "propuesta") =>
  formaDe(n, fuente, { titulo, clase: "puntual", inicio: en(dias, "19:00"), ...PLAZA, marco_propuesto: XANTOLO, programa: "Xantolo 2026", espera: "Se publica cuando aceptes el festival «Xantolo 2026».", ...extra }, estado);
const cineclub = (n, dias, estado) =>
  formaDe(n, UNIVERSIDADES, { titulo: "Cineclub de los miércoles", inicio: en(dias, "19:00"), lugar: "Casa del Poeta Ramón López Velarde", serie: { fechas: [7, 14, 21, 28].map((d) => en(d, "19:00")), cada: 7 } }, estado);
propuestas.push(
  formaDe(1, AGENDAS_GOB, { titulo: "Xantolo 2026", clase: "festival", actos: 4, programa: "Xantolo 2026", inicio: en(7, "19:00"), termina: en(12, "23:00"), ...PLAZA }),
  actoDeXantolo(2, AGENDAS_GOB, "Danza de Huehues", 8),
  actoDeXantolo(3, BUSQUEDA_WEB, "Son huasteco en la plaza", 9, { variantes: ["Noche de son huasteco"] }),
  actoDeXantolo(4, AGENDAS_GOB, "Altar monumental de Xantolo", 7, { lugar: "Museo Nacional de la Máscara", lat: null, lng: null, direccion: null, direccion_mapa: null }, "aceptada"),
  actoDeXantolo(5, AGENDAS_GOB, "Concurso de calaveritas literarias", 10, { lugar: "Casa del Poeta Ramón López Velarde", lat: null, lng: null, direccion: null, direccion_mapa: null }, "aceptada"),
  formaDe(6, AGENDAS_GOB, { titulo: "Recital de guitarra clásica", clase: "puntual", inicio: en(4, "18:00"), lugar: "Teatro de la Paz" }),
  formaDe(7, AGENDAS_GOB, { titulo: "Taller de papel picado", clase: "taller", inicio: en(13, "17:00"), fin: en(13, "19:00"), lugar: "Casa de Cultura del Barrio de San Miguelito", sesiones: [13, 15, 20, 22].map((d) => ({ inicio: en(d, "17:00"), fin: en(d, "19:00") })) }),
  formaDe(8, AGENDAS_GOB, { titulo: "Feria del libro infantil", clase: "puntual", inicio: en(2, "11:00"), lugar: "Jardín de San Francisco", lat: 22.1497, lng: -100.979, direccion_mapa: "Jardín de San Francisco, Centro, 78000 San Luis Potosí", sesiones: [2, 3, 4].map((d) => ({ inicio: en(d, "11:00") })) }),
  cineclub(9, 7),
  cineclub(10, 14),
  cineclub(11, 21, "aceptada"),
  cineclub(12, 28, "aceptada"),
  formaDe(13, UNIVERSIDADES, { titulo: "Inauguración: Raíces", clase: "exposicion", exposicion: "Raíces", inicio: en(2, "19:00"), termina: en(40, "23:59"), lugar: "Museo Nacional de la Máscara" }),
  formaDe(14, BUSQUEDA_WEB, { titulo: "Función de clausura: cortometrajes potosinos", clase: "puntual", inicio: en(11, "19:00"), lugar: "Centro Cultural Universitario Bicentenario", marco: { id: E.cine, titulo: "Festival de Cine de Invierno" } }),
  // OL-438: una que «Aceptar todas» no puede publicar: la agenda trae un evento que ya está en la app (el mismo título a la misma hora en el
  // Teatro de la Paz), así la tanda la deja por revisar con su razón («Ya está … a esa hora: recházala como duplicado»).
  formaDe(15, AGENDAS_GOB, { titulo: "Feleal: un viaje por el mundo en acordeón", clase: "puntual", inicio: en(7, "19:00"), lugar: "Teatro de la Paz", precio: "$120 a $250" }),
);
Object.assign(tablas, { ciudades, ciudades_vistas, rutinas_corridas, propuestas });
const cuentasDe = (id, t) => {
  const p = t.propuestas.filter((x) => x.corrida_id === id);
  return { propuestas: p.length, aceptadas: p.filter((x) => x.estado === "aceptada").length, rechazadas: p.filter((x) => x.estado === "rechazada").length, por_revisar: p.filter((x) => x.estado === "propuesta").length };
};
Object.assign(rpcs, {
  registrar_ciudad_vista: ({ p_slug }, t) => t.ciudades.some((c) => c.slug === p_slug),
  // Como la base: las consultas de cada ciudad en los últimos 30 días (hoy incluido, en su zona).
  panel_ciudades: (_args, t) => ({
    ciudades: t.ciudades.map(({ slug, nombre, estado, lat, lng, zona, creado_en }) => ({
      slug, nombre, estado, lat, lng, zona, creado_en,
      consultas: t.ciudades_vistas.filter((v) => v.ciudad === slug && v.dia > diaHaceMx(30)).reduce((s, v) => s + v.consultas, 0),
    })),
    corridas: [...t.rutinas_corridas].sort((a, b) => b.creado_en.localeCompare(a.creado_en)).map((r) => ({ ...r, ...cuentasDe(r.id, t) })),
    credito: { usd: 200, vence: "2026-11-11", gastado: t.rutinas_corridas.reduce((s, r) => s + r.gasto_usd, 0) },
  }),
  panel_propuestas: ({ p_corrida }, t) => {
    const r = t.rutinas_corridas.find((x) => x.id === p_corrida);
    if (!r) return null;
    const pendientes = t.propuestas.filter((p) => p.corrida_id === r.id && p.estado === "propuesta").sort((a, b) => a.fuente.localeCompare(b.fuente) || a.creado_en.localeCompare(b.creado_en));
    const antes = new Set(t.rutinas_corridas.filter((o) => o.id !== r.id && o.creado_en < r.creado_en).map((o) => o.id));
    const tipos = new Set(t.propuestas.filter((p) => p.corrida_id === r.id).map((p) => p.tipo));
    return {
      corrida: { id: r.id, tipo: r.tipo, ciudad: r.ciudad, ciudad_nombre: t.ciudades.find((c) => c.slug === r.ciudad)?.nombre ?? null, estado: r.estado, creado_en: r.creado_en, tope_usd: r.tope_usd, gasto_usd: r.gasto_usd, ...cuentasDe(r.id, t) },
      propuestas: pendientes.map(({ id, tipo, fuente, datos, creado_en }) => ({ id, tipo, fuente, datos, creado_en })),
      fuentes_con_tanda: [...new Set(t.propuestas.filter((p) => p.estado === "aceptada" && antes.has(p.corrida_id) && tipos.has(p.tipo) && pendientes.some((q) => q.fuente === p.fuente)).map((p) => p.fuente))],
    };
  },
  // Como la base: marca la propuesta (en memoria: otro arranque empieza limpio), así la publicación de un evento aceptado la encuentra
  // aceptada (OL-434: un acto que espera a su festival y el festival que lo publica). La segunda llamada devuelve lo que ya quedó.
  aceptar_propuesta: ({ p_propuesta, p_ficha }, t, { sub } = {}) => {
    const p = t.propuestas.find((x) => x.id === p_propuesta);
    if (!p) return null;
    if (p.estado !== "propuesta") return { estado: p.estado, ficha_id: p.ficha_id, slug: null };
    const slug = String(p_ficha?.nombre ?? "ficha").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const ficha_id = p.tipo === "evento" ? null : crypto.randomUUID();
    Object.assign(p, { estado: "aceptada", ficha_id, resuelto_por: sub ?? ADMIN, resuelto_en: new Date().toISOString() });
    return { estado: "aceptada", ficha_id, slug: p.tipo === "evento" ? null : slug };
  },
});

// OL-432: lo que contesta Mapbox en el respaldo (la app lo pide desde el servidor con `MAPBOX_API_URL` apuntando a este respaldo): ciudades y
// municipios reales con su centro aproximado, escritos a mano. «De vuelta» contesta el más cercano a cada punto, así las muestras del área de
// Oaxaca caen en Oaxaca de Juárez, Santa Lucía del Camino y Santa Cruz Xoxocotlán.
const lugarMapbox = (nombre, region, lat, lng, pais = "México", codigo = "mx") => ({ nombre, region, lat, lng, pais, codigo });
export const LUGARES_MAPBOX = [
  lugarMapbox("Oaxaca de Juárez", "Oaxaca", 17.0654, -96.7236),
  lugarMapbox("Santa Lucía del Camino", "Oaxaca", 17.0667, -96.6833),
  lugarMapbox("Santa Cruz Xoxocotlán", "Oaxaca", 17.0267, -96.735),
  lugarMapbox("Juchitán de Zaragoza", "Oaxaca", 16.4342, -95.0195),
  lugarMapbox("Salina Cruz", "Oaxaca", 16.1767, -95.1952),
  lugarMapbox("San Luis Potosí", "San Luis Potosí", 22.1497, -100.9764),
  lugarMapbox("Soledad de Graciano Sánchez", "San Luis Potosí", 22.1833, -100.9333),
  lugarMapbox("San Miguel de Allende", "Guanajuato", 20.9144, -100.7452),
  lugarMapbox("San Cristóbal de las Casas", "Chiapas", 16.737, -92.6376),
  lugarMapbox("San Juan del Río", "Querétaro", 20.3889, -99.9961),
  lugarMapbox("Aguascalientes", "Aguascalientes", 21.8818, -102.2916),
  lugarMapbox("Jesús María", "Aguascalientes", 21.9614, -102.3436),
  lugarMapbox("Santiago de Querétaro", "Querétaro", 20.5931, -100.392),
  lugarMapbox("Guadalajara", "Jalisco", 20.6767, -103.3475),
  lugarMapbox("Heroica Puebla de Zaragoza", "Puebla", 19.0414, -98.2063),
  lugarMapbox("San Andrés Cholula", "Puebla", 19.0514, -98.2985),
  lugarMapbox("San Pedro Cholula", "Puebla", 19.0633, -98.3064),
  lugarMapbox("Cuautlancingo", "Puebla", 19.0889, -98.2731),
  lugarMapbox("Ciudad de México", "Ciudad de México", 19.4326, -99.1332),
  lugarMapbox("Morelia", "Michoacán", 19.7008, -101.1844),
  lugarMapbox("Mérida", "Yucatán", 20.9674, -89.5926),
  lugarMapbox("Zacatecas", "Zacatecas", 22.7709, -102.5832),
];
const llano = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const rasgo = (l) => ({ properties: { name: l.nombre, coordinates: { latitude: l.lat, longitude: l.lng }, context: { region: { name: l.region }, country: { name: l.pais, country_code: l.codigo } } } });
/** Geocoding v6 de ida: las ciudades cuyo nombre o estado empieza (por palabra) con lo escrito, primero las que empiezan igual. */
export function mapboxIda(q, limite = 6) {
  const t = llano(q);
  if (!t) return { features: [] };
  const orden = (l) => (llano(l.nombre) === t ? 0 : llano(l.nombre).split(" ").includes(t) ? 1 : llano(l.nombre).startsWith(t) ? 2 : 3);
  const lista = LUGARES_MAPBOX.filter((l) => ` ${llano(l.nombre)}`.includes(` ${t}`) || ` ${llano(l.region)}`.includes(` ${t}`)).sort((a, b) => orden(a) - orden(b));
  return { features: lista.slice(0, limite).map(rasgo) };
}
/** Geocoding v6 de vuelta: el municipio más cercano al punto (a 40 km como mucho). */
export function mapboxVuelta(lat, lng) {
  const d = (l) => Math.hypot(l.lat - lat, (l.lng - lng) * Math.cos((lat * Math.PI) / 180));
  const cerca = [...LUGARES_MAPBOX].sort((a, b) => d(a) - d(b))[0];
  return { features: cerca && d(cerca) < 0.36 ? [rasgo(cerca)] : [] };
}

// OL-458: publicar en Instagram desde Administración. El contrato de `instagram_sugerencias` y de `ciudad_slug` (migración 20261023140000) sobre
// los eventos del respaldo, con la misma regla que la base (por venir en 7 días; exposiciones y festivales en curso que terminan después de hoy;
// talleres con una sesión por delante; nunca lo oculto, cancelado, retirado ni un borrador); lo publicado (la Master Class y Susurros) y la
// ubicación de San Luis Potosí. Todo inventado; los permisos reales, en PostgreSQL (`supabase/tests/pg/instagram.test.mjs`).
tablas.instagram_publicaciones = [
  { id: "eeee0458-0000-4000-8000-000000000001", evento_id: E.master, formato: "4x5", estado: "publicada", error: null, media_id: "17900000000000001", permalink: "https://www.instagram.com/p/DEMO458A/", imagen: null, etiquetas: [], ubicacion: null, publicado_por: ADMIN, creado_en: hace(1) },
  { id: "eeee0458-0000-4000-8000-000000000002", evento_id: E.susurros, formato: "9x16", estado: "publicada", error: null, media_id: "17900000000000002", permalink: "https://www.instagram.com/p/DEMO458B/", imagen: "https://respaldo.local.test/fotos/instagram-demo-458b.jpg", etiquetas: [], ubicacion: null, publicado_por: ADMIN, creado_en: hace(2) },
];
// OL-461: la Master Class ya está también en Facebook; Susurros, no (su renglón ofrece «Publicar en Facebook»).
tablas.facebook_publicaciones = [
  { id: "eeee0461-0000-4000-8000-000000000001", instagram_id: "eeee0458-0000-4000-8000-000000000001", evento_id: E.master, formato: "4x5", estado: "publicada", error: null, post_id: "1374800000000461_122100000000000001", permalink: "https://www.facebook.com/1374800000000461/posts/122100000000000001", publicado_por: ADMIN, creado_en: hace(1) },
];
tablas.instagram_ubicaciones = [{ tipo: "ciudad", clave: "san-luis-potosi", pagina_id: "108000000000458", nombre: "San Luis Potosí", enlace: "https://www.facebook.com/demo", actualizado_por: ADMIN, actualizado_en: hace(3) }];
// OL-471: el estado de «Conectar Instagram» (sin token: el token vive en Vault y aquí no hay). Vacío al arrancar («Sin conexión propia»); con
// `RESPALDO_INSTAGRAM_CONEXION=todo`, conectada con todos los permisos; con `=sin-lectura`, sin el de leer cuentas. Los permisos reales, en
// `supabase/tests/pg/instagram-conexion.test.mjs`.
{
  const modo = process.env.RESPALDO_INSTAGRAM_CONEXION;
  const permisos = ["business_management", "instagram_basic", "instagram_content_publish", "instagram_manage_insights", "pages_manage_posts", "pages_read_engagement", "pages_show_list"];
  tablas.instagram_conexion =
    modo === "todo" || modo === "sin-lectura"
      ? [{ id: 1, pagina_id: "1374800000000461", pagina_nombre: "Somos Nosotrxs", instagram_id: "17841400000000458", instagram_usuario: "smsnstrsapp", permisos: modo === "todo" ? permisos : permisos.filter((x) => x !== "instagram_manage_insights"), conectado_por: ADMIN, conectado_en: hace(0) }]
      : [];
}
// OL-465: la cola de redes (vacía al arrancar) y lo leído de los carteles; `redes_reciente` y `redes_encolar` con la regla de la base (en camino, o
// publicado hace menos de 15 minutos; un carrusel cuenta como 4:5). Los permisos y el candado reales, en `supabase/tests/pg/redes-en-cola.test.mjs`.
tablas.redes_trabajos = [];
tablas.cartel_lecturas = [];
const recienteRedes = (t, evento, red, formato) => {
  const vivo = t.redes_trabajos.some((x) => x.evento_id === evento && ["en_cola", "publicando"].includes(x.estado) && x.formato === formato && (x.red === red || (red === "facebook" && x.red === "instagram" && x.pedido?.facebook === true)));
  if (vivo) return { estado: "publicando" };
  const hace15 = Date.now() - 15 * 60_000;
  const tabla = red === "instagram" ? t.instagram_publicaciones : t.facebook_publicaciones;
  const ultima = tabla.filter((x) => x.evento_id === evento && x.estado === "publicada" && (x.formato === "carrusel" ? "4x5" : x.formato) === formato && Date.parse(x.creado_en) > hace15).sort((a, b) => b.creado_en.localeCompare(a.creado_en))[0];
  return ultima ? { estado: "publicado", minutos: Math.max(0, Math.floor((Date.now() - Date.parse(ultima.creado_en)) / 60_000)) } : null;
};
const sugeribleIg = (e, t, ahora, dias = 7) => {
  if (e.visible === false || e.borrador || e.retirado_por_admin || e.cancelado) return false;
  const inicio = new Date(e.inicio);
  // `p_dias` como la base (de 1 a 31; la semana de Instagram de OL-479 pide 14).
  if (inicio > ahora) return inicio <= new Date(ahora.getTime() + Math.max(1, Math.min(31, Number(dias) || 7)) * 86_400_000);
  const dia = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: e.zona ?? ZONA }).format(d);
  if (e.clase === "exposicion" || e.clase === "festival") return dia(new Date(e.termina ?? e.fin ?? e.inicio)) > dia(ahora);
  if (e.clase === "taller") return t.eventos_sesiones.some((s) => s.evento_id === e.id && new Date(s.inicio) > ahora);
  return false;
};
Object.assign(rpcs, {
  redes_reciente: ({ p_evento, p_red, p_formato }, t, { sub } = {}) => (sub === ADMIN ? recienteRedes(t, p_evento, p_red, p_formato) : null),
  redes_encolar: ({ p_evento, p_red, p_formato, p_pedido, p_repetir }, t, { sub } = {}) => {
    if (sub !== ADMIN) return null;
    const reciente = recienteRedes(t, p_evento, p_red, p_formato);
    if (reciente && !p_repetir) return { duplicado: reciente };
    const ahora = new Date().toISOString();
    const fila = { id: crypto.randomUUID(), evento_id: p_evento, red: p_red, formato: p_formato, pedido: p_pedido ?? {}, estado: "en_cola", avance: {}, resultado: null, intentos: 0, fallos: 0, error: null, turno: 0, ocupada_hasta: null, siguiente_en: ahora, avisado_en: null, pedido_por: sub, creado_en: ahora, actualizado_en: ahora, terminado_en: null };
    t.redes_trabajos.push(fila);
    return { id: fila.id };
  },
  ciudad_slug: ({ p_ciudad }) => slugCiudad(p_ciudad),
  instagram_sugerencias: ({ p_ciudad = null, p_dias = 7 }, t, { sub } = {}) => {
    if (sub !== ADMIN) return [];
    const ahora = new Date();
    return enCiudad(t.eventos, p_ciudad)
      .filter((e) => sugeribleIg(e, t, ahora, p_dias))
      .sort((a, b) => a.inicio.localeCompare(b.inicio))
      .map((e) => {
        const l = t.lugares.find((x) => x.id === e.lugar_id);
        const p = t.instagram_publicaciones.filter((x) => x.evento_id === e.id && x.estado === "publicada").sort((a, b) => b.creado_en.localeCompare(a.creado_en))[0];
        return {
          id: e.id, slug: e.slug ?? null, titulo: e.titulo, inicio: e.inicio, fin: e.fin ?? null, termina: e.termina ?? e.fin ?? e.inicio, zona: e.zona ?? ZONA, clase: e.clase ?? "puntual",
          imagen: e.imagen ?? null, precio: e.precio ?? null, ciudad: slugCiudad(e.ciudad), ciudad_nombre: e.ciudad, lugar_id: e.lugar_id ?? null, lugar_nombre: l?.nombre ?? null,
          lugar_redes: l?.redes ?? [], sitio_texto: e.sitio_texto ?? null,
          van: t.asistencias.filter((a) => a.evento_id === e.id && a.estado === "voy").length,
          interesa: t.asistencias.filter((a) => a.evento_id === e.id && a.estado === "me_interesa").length,
          destacado: t.destacados.some((d) => d.evento_id === e.id && !d.quitado),
          publicado_en: p?.creado_en ?? null, publicado_formato: p?.formato ?? null,
        };
      });
  },
});

// OL-479 (bitácora 511): la semana de Instagram en Administración. `instagram_semana` e `instagram_fuera` en memoria (otro arranque empieza limpio) y
// los contratos de sus funciones (migración 20261029160000) en corto: quién puede salir (`instagram_candidatos`, la misma regla: ficha completa,
// nadie que dijo que no ni que salió en 6 meses; con fecha primero, luego la ciudad), guardar la semana que arma la app (cada día por delante a la
// cola, a su hora), «Cambiar», «Quitar», «Publicar ahora», el texto, el aviso, «Dijo que no», lo que dio y la página de la bio. Los permisos y las
// reglas reales, en PostgreSQL (`supabase/tests/pg/instagram-semana.test.mjs`). Con `RESPALDO_INSTAGRAM_SEMANA=1` (sobre el historial grande) el
// lunes y el martes de esta semana ya salieron (Renata Saldaña y Los Ecos del Tangamanga, con sus visitas); lo demás lo arma la app al abrir la
// pestaña. Todo inventado.
tablas.instagram_semana = [];
tablas.instagram_fuera = [];
const MEDIDAS_SEMANA = new Map();
const ZONA_OFFSET = "-06:00";
const sumarDiaIso = (dia, n) => { const [a, m, d] = dia.split("-").map(Number); return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10); };
const lunesIso = (dia) => { const [a, m, d] = dia.split("-").map(Number); const n = (new Date(Date.UTC(a, m - 1, d)).getUTCDay() + 6) % 7; return sumarDiaIso(dia, -n); };
const conInstagram = (redes) => /instagram\.com\/[A-Za-z0-9._]/i.test(JSON.stringify(redes ?? []));
const hashEstable = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const pedidoDia = (c, extra = {}) => {
  const resto = Object.fromEntries(Object.entries(extra ?? {}).filter(([k]) => !["casilla", "tipo", "eventos"].includes(k)));
  return { facebook: true, casilla: c.id, tipo: c.tipo, ...(c.tipo === "semana" ? { eventos: c.eventos } : {}), ...resto };
};
function encolarDia(t, c, ahora, extra, sub) {
  if (c.tipo === "descanso") return null;
  const cuando = ahora || Date.parse(c.programado_para) <= Date.now() ? new Date().toISOString() : c.programado_para;
  const ids = { evento_id: c.evento_id ?? (c.tipo === "semana" ? c.eventos[0] : null), artista_id: c.artista_id, lugar_id: c.lugar_id };
  let tr = t.redes_trabajos.find((x) => x.id === c.trabajo_id && x.estado === "en_cola");
  if (tr) Object.assign(tr, ids, { formato: "4x5", pedido: pedidoDia(c, extra ?? tr.pedido), siguiente_en: cuando, actualizado_en: new Date().toISOString() });
  else {
    const n = new Date().toISOString();
    tr = { id: crypto.randomUUID(), ...ids, red: "instagram", formato: "4x5", pedido: pedidoDia(c, extra), estado: "en_cola", avance: {}, resultado: null, intentos: 0, fallos: 0, error: null, turno: 0, ocupada_hasta: null, siguiente_en: cuando, avisado_en: null, pedido_por: sub ?? ADMIN, creado_en: n, actualizado_en: n, terminado_en: null };
    t.redes_trabajos.push(tr);
  }
  Object.assign(c, { trabajo_id: tr.id, estado: "programado", actualizado_en: new Date().toISOString() });
  return tr.id;
}
const cerradaDia = (t, c) => c.estado === "publicado" || t.redes_trabajos.some((x) => x.id === c.trabajo_id && ["publicando", "publicado"].includes(x.estado));
const casillaDe = (t, id) => t.instagram_semana.find((c) => c.id === id) ?? null;
const errorSql = (code, message) => ({ __error: { code, message } });
function candidatosEnMemoria({ p_ciudad, p_tipo, p_desde }, t) {
  const desde = Date.parse(`${p_desde}T00:00:00${ZONA_OFFSET}`);
  const fuera = (id) => t.instagram_fuera.some((f) => f.artista_id === id || f.lugar_id === id);
  const fichas = p_tipo === "artista"
    ? t.artistas.filter((a) => a.visible && a.foto && a.portada && (a.descripcion ?? "").length >= 120 && conInstagram(a.redes) && !fuera(a.id)).map((a) => ({ ...a, clase: a.disciplina, direccion: null }))
    : t.lugares.filter((l) => l.visible && !l.privado && l.portada && (l.descripcion ?? "").length >= 120 && !fuera(l.id)).map((l) => ({ ...l, clase: l.tipo, foto: null }));
  const vale = (e) => e.visible !== false && !e.borrador && !e.cancelado && !e.retirado_por_admin;
  return fichas
    .map((f) => {
      const ultima = t.instagram_publicaciones.filter((p) => p.estado === "publicada" && (p.artista_id === f.id || p.lugar_id === f.id)).map((p) => p.creado_en).sort().at(-1) ?? null;
      const ocupado = t.instagram_semana.filter((s) => (s.artista_id === f.id || s.lugar_id === f.id) && s.estado !== "quitado" && !s.dijo_no_en && s.fecha >= sumarDiaIso(p_desde, -182)).map((s) => s.fecha).sort()[0] ?? null;
      const suyos = t.eventos.filter((e) => vale(e) && (p_tipo === "artista" ? t.eventos_artistas.some((x) => x.evento_id === e.id && x.artista_id === f.id) : e.lugar_id === f.id));
      const prox = suyos.filter((e) => Date.parse(e.inicio) >= desde && Date.parse(e.inicio) < desde + 30 * 86400e3).sort((a, b) => a.inicio.localeCompare(b.inicio))[0] ?? null;
      const lugar = prox ? t.lugares.find((l) => l.id === prox.lugar_id) : null;
      return {
        id: f.id, slug: f.slug, nombre: f.nombre, ciudad: f.ciudad, ciudad_slug: slugCiudad(f.ciudad), clase: f.clase, detalle: f.detalle ?? null, foto: f.foto ?? null, portada: f.portada, descripcion: f.descripcion, redes: f.redes, direccion: f.direccion ?? null,
        proxima_id: prox?.id ?? null, proxima_titulo: prox?.titulo ?? null, proxima_inicio: prox?.inicio ?? null, proxima_zona: prox ? (prox.zona ?? ZONA) : null, proxima_lugar: prox ? (lugar?.nombre ?? prox.sitio_texto ?? null) : null, proxima_lugar_redes: lugar?.redes ?? [],
        eventos_semana: p_tipo === "lugar" ? suyos.filter((e) => Date.parse(e.inicio) >= desde && Date.parse(e.inicio) < desde + 7 * 86400e3).length : 0,
        ultima_vez: ultima, ocupado_en: ocupado,
      };
    })
    .filter((c) => !c.ultima_vez || Date.parse(c.ultima_vez) < Date.now() - 182 * 86400e3)
    .sort((a, b) => Number(!!b.proxima_id) - Number(!!a.proxima_id) || Number(b.ciudad_slug === p_ciudad) - Number(a.ciudad_slug === p_ciudad) || (a.ultima_vez ?? "").localeCompare(b.ultima_vez ?? "") || hashEstable(a.id + p_desde) - hashEstable(b.id + p_desde))
    .slice(0, 200);
}
Object.assign(rpcs, {
  instagram_candidatos: (args, t, { sub } = {}) => (sub === ADMIN ? candidatosEnMemoria(args, t) : []),
  instagram_semana_guardar: ({ p_ciudad, p_casillas }, t, { sub } = {}) => {
    if (sub !== ADMIN) return errorSql("42501", "Solo la administración arma la semana de Instagram.");
    let n = 0;
    for (const f of p_casillas ?? []) {
      if (t.instagram_semana.some((c) => c.ciudad === p_ciudad && c.fecha === f.fecha)) continue;
      const hora = f.tipo === "descanso" ? null : `${String(f.hora).slice(0, 5)}:00`;
      const c = {
        id: crypto.randomUUID(), ciudad: p_ciudad, fecha: f.fecha, tipo: f.tipo, artista_id: f.artista_id ?? null, lugar_id: f.lugar_id ?? null, evento_id: f.evento_id ?? null, eventos: f.eventos ?? null,
        hora, programado_para: hora ? new Date(`${f.fecha}T${hora}${ZONA_OFFSET}`).toISOString() : null, estado: f.tipo === "descanso" ? "descanso" : "programado", elegido_por: "sistema",
        motivo: f.motivo ?? null, reemplaza: null, trabajo_id: null, aviso_en: null, dijo_no_en: null, actualizado_por: sub, creado_en: new Date().toISOString(), actualizado_en: new Date().toISOString(),
      };
      t.instagram_semana.push(c);
      n++;
      if (c.tipo !== "descanso" && Date.parse(c.programado_para) > Date.now()) encolarDia(t, c, false, null, sub);
    }
    return n;
  },
  instagram_semana_cambiar: ({ p_casilla, p_tipo, p_ficha, p_motivo, p_reemplaza = null }, t, { sub } = {}) => {
    const c = casillaDe(t, p_casilla);
    if (sub !== ADMIN) return errorSql("42501", "Solo la administración.");
    if (!c) return errorSql("23503", "No existe ese día.");
    if (c.tipo !== "descanso" && c.tipo !== p_tipo) return errorSql("22023", "Cambio inválido.");
    if (cerradaDia(t, c)) return errorSql("55000", "Ese día ya salió en Instagram.");
    if (t.instagram_fuera.some((f) => f.artista_id === p_ficha || f.lugar_id === p_ficha)) return errorSql("22023", "Fuera de Instagram.");
    const hora = c.hora ?? "19:00:00";
    Object.assign(c, { tipo: p_tipo, artista_id: p_tipo === "artista" ? p_ficha : null, lugar_id: p_tipo === "lugar" ? p_ficha : null, evento_id: p_tipo === "evento" ? p_ficha : null, eventos: null, hora, programado_para: new Date(`${c.fecha}T${hora}${ZONA_OFFSET}`).toISOString(), estado: "programado", elegido_por: "persona", motivo: p_motivo, reemplaza: p_reemplaza, aviso_en: null, dijo_no_en: null });
    return Date.parse(c.programado_para) > Date.now() ? encolarDia(t, c, false, {}, sub) : null;
  },
  instagram_semana_quitar: ({ p_casilla }, t, { sub } = {}) => {
    const c = casillaDe(t, p_casilla);
    if (sub !== ADMIN) return errorSql("42501", "Solo la administración.");
    if (!c || c.tipo === "descanso") return false;
    if (cerradaDia(t, c)) return errorSql("55000", "Ese día ya salió en Instagram.");
    t.redes_trabajos = t.redes_trabajos.filter((x) => !(x.id === c.trabajo_id && x.estado === "en_cola"));
    Object.assign(c, { estado: "quitado", trabajo_id: null });
    return true;
  },
  instagram_semana_ahora: ({ p_casilla, p_pedido }, t, { sub } = {}) => {
    const c = casillaDe(t, p_casilla);
    if (sub !== ADMIN) return errorSql("42501", "Solo la administración.");
    if (!c || c.tipo === "descanso") return errorSql("23503", "No existe ese día.");
    if (cerradaDia(t, c)) return errorSql("55000", "Ese día ya salió en Instagram.");
    return encolarDia(t, c, true, p_pedido ?? {}, sub);
  },
  instagram_semana_texto: ({ p_casilla, p_texto, p_quitadas = [], p_facebook = true }, t, { sub } = {}) => {
    const c = casillaDe(t, p_casilla);
    const tr = c && t.redes_trabajos.find((x) => x.id === c.trabajo_id && x.estado === "en_cola");
    if (sub !== ADMIN || !tr) return false;
    tr.pedido = { ...tr.pedido, texto: p_texto?.trim() || null, quitadas: p_quitadas ?? [], facebook: p_facebook !== false };
    return true;
  },
  instagram_semana_avisado: ({ p_casilla }, t, { sub } = {}) => {
    const c = casillaDe(t, p_casilla);
    if (sub !== ADMIN || !c) return null;
    c.aviso_en ??= new Date().toISOString();
    return c.aviso_en;
  },
  instagram_semana_dijo_no: ({ p_casilla }, t, { sub } = {}) => {
    const c = casillaDe(t, p_casilla);
    if (sub !== ADMIN) return errorSql("42501", "Solo la administración.");
    if (!c || !["artista", "lugar"].includes(c.tipo)) return errorSql("23503", "No existe ese día.");
    if (!t.instagram_fuera.some((f) => (c.artista_id && f.artista_id === c.artista_id) || (c.lugar_id && f.lugar_id === c.lugar_id))) t.instagram_fuera.push({ id: crypto.randomUUID(), artista_id: c.artista_id, lugar_id: c.lugar_id, desde: new Date().toISOString(), marcado_por: sub });
    t.redes_trabajos = t.redes_trabajos.filter((x) => !(x.id === c.trabajo_id && x.estado === "en_cola"));
    Object.assign(c, { dijo_no_en: new Date().toISOString(), trabajo_id: null });
    return (t.artistas.find((a) => a.id === c.artista_id) ?? t.lugares.find((l) => l.id === c.lugar_id))?.nombre ?? null;
  },
  instagram_resultado: ({ p_casillas = [] }, t, { sub } = {}) =>
    sub === ADMIN ? t.instagram_semana.filter((c) => p_casillas.includes(c.id) && c.estado === "publicado").map((c) => ({ casilla: c.id, ...(MEDIDAS_SEMANA.get(c.id) ?? { visitas: 0, van: 0 }) })) : [],
  instagram_semana_bio: ({ p_ciudad, p_dia }, t) => {
    const lunes = lunesIso(p_dia);
    return t.instagram_semana
      .filter((c) => c.ciudad === p_ciudad && c.estado === "publicado" && c.fecha >= lunes && c.fecha < sumarDiaIso(lunes, 7))
      .map((c) => {
        const a = t.artistas.find((x) => x.id === c.artista_id && x.visible);
        const l = t.lugares.find((x) => x.id === c.lugar_id && x.visible && !x.privado);
        const e = t.eventos.find((x) => x.id === c.evento_id && x.visible !== false);
        return { fecha: c.fecha, tipo: c.tipo, slug: a?.slug ?? l?.slug ?? e?.slug ?? e?.id ?? null, nombre: a?.nombre ?? l?.nombre ?? e?.titulo ?? null, imagen: a?.foto ?? l?.portada ?? e?.imagen ?? null, eventos: c.eventos };
      })
      .filter((x) => x.tipo === "semana" || x.nombre)
      .sort((x, y) => x.fecha.localeCompare(y.fecha));
  },
});
if (CON_IG_SEMANA) {
  // Lo ya publicado de esta semana: el lunes (Renata Saldaña, a las 7:00 pm) y el martes (Los Ecos del Tangamanga, a las 9:00 am).
  const lunes = lunesIso(hoyLocal);
  const renata = artistas.find((a) => a.slug === "renata-saldana-demo");
  const ecos = eventos.find((e) => e.slug === "los-ecos-del-tangamanga-en-aether-demo");
  const publicado = (fecha, hora, tipo, ids, medida, n) => {
    const cuando = new Date(`${fecha}T${hora}${ZONA_OFFSET}`).toISOString();
    const id = `eeee0479-0000-4000-8000-00000000000${n}`;
    const trabajo = `eeee0479-0000-4000-8000-00000000010${n}`;
    tablas.redes_trabajos.push({ id: trabajo, evento_id: ids.evento_id ?? null, artista_id: ids.artista_id ?? null, lugar_id: null, red: "instagram", formato: "4x5", pedido: { facebook: true, casilla: id, tipo }, estado: "publicado", avance: {}, resultado: { instagram: { permalink: `https://www.instagram.com/p/DEMO479${n}/`, imagenes: 1, sinEtiquetas: false, formato: "4x5" }, facebook: { ok: true, permalink: `https://www.facebook.com/1374800000000461/posts/12210000000047${n}` }, ...(tipo === "artista" ? { historia: { ok: true, permalink: `https://www.instagram.com/stories/smsnstrsapp/47${n}/` } } : {}) }, intentos: 1, fallos: 0, error: null, turno: 1, ocupada_hasta: null, siguiente_en: cuando, avisado_en: cuando, pedido_por: ADMIN, creado_en: hace(5), actualizado_en: cuando, terminado_en: cuando });
    tablas.instagram_semana.push({ id, ciudad: "san-luis-potosi", fecha, tipo, artista_id: ids.artista_id ?? null, lugar_id: null, evento_id: ids.evento_id ?? null, eventos: null, hora: `${hora}:00`, programado_para: cuando, estado: "publicado", elegido_por: "sistema", motivo: ids.motivo, reemplaza: null, trabajo_id: trabajo, aviso_en: tipo === "artista" ? hace(9) : null, dijo_no_en: null, actualizado_por: ADMIN, creado_en: hace(9), actualizado_en: cuando });
    tablas.instagram_publicaciones.push({ id: `eeee0479-0000-4000-8000-00000000020${n}`, ...(ids.artista_id ? { artista_id: ids.artista_id } : { evento_id: ids.evento_id }), formato: "4x5", imagenes: 1, estado: "publicada", error: null, media_id: `1790000000000047${n}`, permalink: `https://www.instagram.com/p/DEMO479${n}/`, imagen: null, etiquetas: [], coautores: tipo === "artista" ? ["renatasaldana.demo"] : [], ubicacion: null, publicado_por: ADMIN, creado_en: cuando });
    MEDIDAS_SEMANA.set(id, medida);
  };
  if (renata) publicado(lunes, "19:00", "artista", { artista_id: renata.id, motivo: "Artista sin fecha próxima, de San Luis Potosí, nunca en Instagram." }, { visitas: 31, van: 3 }, 1);
  if (ecos) publicado(sumarDiaIso(lunes, 1), "09:00", "evento", { evento_id: ecos.id, motivo: "El evento de ese día con más señal: 4 les interesa." }, { visitas: 12, van: 2 }, 2);
}
