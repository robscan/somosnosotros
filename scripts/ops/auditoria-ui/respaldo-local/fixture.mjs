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

// ---------- personas ----------
export const ANA = "11111111-1111-4111-8111-111111111111";
const MARCOS = "22222222-2222-4222-8222-222222222222";
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
};
function evento({ id, slug, titulo, dias, hora, dur = 2, lugar_id = null, sitio = null, precio = null, creadoHace = 20, descripcion = null, enlace = null, imagen }) {
  const inicio = iso(fecha(dias, hora));
  const fin = masHoras(inicio, dur);
  return {
    id, slug, titulo, inicio, fin, termina: fin, descripcion, imagen: imagen ?? imagenes.eventos[slug] ?? null, precio, enlace, creado_por: MARCOS, visible: true,
    sitio_texto: sitio?.texto ?? null, sitio_direccion: sitio?.direccion ?? null, sitio_lat: sitio?.lat ?? null, sitio_lng: sitio?.lng ?? null, sitio_reservado: false, sitio_revelar_desde: null,
    lugar_id, zona: ZONA, ciudad: CIUDAD, creado_en: hace(creadoHace),
  };
}
const eventos = [
  evento({ id: E.sinfonica, slug: "concierto-de-la-orquesta-sinfonica-de-san-luis-potosi", titulo: "Concierto de la Orquesta Sinfónica de San Luis Potosí", dias: 0, hora: "18:00", sitio: { texto: "Templo de San Francisco", direccion: "Calle Jardín Guerrero 7, 78000 San Luis Potosí, San Luis Potosí, México", lat: 22.1497, lng: -100.9768 }, creadoHace: 3, descripcion: "Programa por los 435 años del Convento de San Francisco. Entrada libre.", enlace: "https://www.facebook.com/osslp" }),
  evento({ id: E.macario, slug: "macario-xantolo-camino-al-mictlan", titulo: "Macario, Xantolo camino al Mictlán", dias: 0, hora: "19:00", sitio: { texto: "Teatro del Centro de Difusión Cultural del IPBA Raúl Gamboa", direccion: "Av. Universidad 1385, Centro, San Luis Potosí", lat: 22.1465, lng: -100.9745 }, creadoHace: 12, imagen: null }),
  evento({ id: E.cristiada, slug: "charla-san-luis-potosi-en-la-cristiada-con-joserra-ortiz", titulo: "Charla: San Luis Potosí en la Cristiada, con Joserra Ortiz", dias: 1, hora: "19:30", lugar_id: L.miguelito, creadoHace: 2, descripcion: "Conversación sobre el papel de San Luis Potosí durante la guerra cristera, con el historiador Joserra Ortiz." }),
  evento({ id: E.fellini, slug: "cine-de-barrio-ciclo-fellini-2026-09-30", titulo: "Cine de barrio: ciclo Fellini", dias: 2, hora: "10:00", lugar_id: L.miguelito, creadoHace: 9 }),
  evento({ id: E.pimpolina, slug: "delirium-pollum-clown-y-pantomima-con-pimpolina", titulo: "Delirium Pollum, clown y pantomima con Pimpolina", dias: 3, hora: "18:00", lugar_id: L.paz, precio: "$150", creadoHace: 15, descripcion: "Un espectáculo de clown para toda la familia." }),
  evento({ id: E.colocaos, slug: "lxs-colocaos-la-ultima-fogueada", titulo: "LXS COLOCAOS: La última fogueada", dias: 4, hora: "19:00", dur: 3, lugar_id: L.muni, creadoHace: 1, descripcion: "Inauguración de la exposición colectiva de cerámica LXS COLOCAOS. Paulina Lucciotto, Marilú Juárez, Arantxa Zoé Hernández, Jesús Orlando Acosta, Sayuri Álvarez, Flora Moreno y Samantha Méndez." }),
  evento({ id: E.arttoy, slug: "inauguracion-de-uno-de-uno-custom-art-toy-2026", titulo: "Inauguración de Uno de Uno · Custom Art Toy 2026", dias: 5, hora: "18:00", lugar_id: L.ache, creadoHace: 4 }),
  evento({ id: E.susurros, slug: "susurros-del-inconsciente", titulo: "Susurros del inconsciente", dias: 6, hora: "20:00", lugar_id: L.aether, precio: "Cooperación solidaria", creadoHace: 6 }),
  evento({ id: E.feleal, slug: "feleal-un-viaje-por-el-mundo-en-acordeon", titulo: "Feleal: un viaje por el mundo en acordeón", dias: 7, hora: "19:00", lugar_id: L.paz, precio: "$120 a $250", creadoHace: 10, enlace: "https://boletos.example.com/feleal" }),
  evento({ id: E.master, slug: "master-class-9-festival-de-cine-uaslp", titulo: "Master Class - 9° Festival de Cine UASLP", dias: 8, hora: "12:00", lugar_id: L.ccub, creadoHace: 2, descripcion: "Con el actor Daniel Giménez Cacho. Entrada libre, cupo limitado." }),
  evento({ id: E.leonora, slug: "leonora-in-the-morning-light", titulo: "Leonora in the morning light", dias: 9, hora: "17:00", lugar_id: L.ccub, creadoHace: 2, descripcion: "Película de Thor Klein y Lena Vurma. Con presencia de las productoras. Clasificación B15." }),
  evento({ id: E.oca, slug: "oca", titulo: "OCA", dias: 10, hora: "19:00", lugar_id: L.mascara, creadoHace: 5 }),
  evento({ id: E.desierto, slug: "desierto-observacion-y-espacio", titulo: "DESIERTO: Observación y Espacio", dias: 11, hora: "20:00", lugar_id: L.aether, creadoHace: 1, descripcion: "Inauguración de la exposición de escultura, en presencia del artista." }),
];

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
  artista(A.backside, "0backside0", "0Backside0", "musica", "Rock, metal y alternativo", "grupo"),
  artista(A.merlot, "abril-merlot", "Abril Merlot", "musica", "Música académica y clásica", "solista"),
];
const eventos_artistas = [
  { evento_id: E.sinfonica, artista_id: A.osslp, orden: 1 },
  { evento_id: E.pimpolina, artista_id: A.pimpolina, orden: 1 },
  { evento_id: E.feleal, artista_id: A.feleal, orden: 1 },
  // Sin foto y con evento esta semana: «Artistas con eventos esta semana» los pinta con el símbolo SN (OL-253). Los de arriba tienen
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
];
const seguimientos = [
  { id: "eeee0001-0000-4000-8000-000000000001", usuario_id: ANA, lugar_id: L.miguelito, artista_id: null, creado_en: hace(5) },
  { id: "eeee0001-0000-4000-8000-000000000002", usuario_id: ANA, lugar_id: null, artista_id: A.osslp, creado_en: hace(5) },
  { id: "eeee0001-0000-4000-8000-000000000003", usuario_id: MARCOS, lugar_id: L.paz, artista_id: null, creado_en: hace(9) },
];
const destacados = [E.colocaos, E.master, E.leonora, E.desierto].map((id, i) => ({ id: `ffff0001-0000-4000-8000-00000000000${i + 1}`, evento_id: id, lugar_id: null, artista_id: null, quitado: false, hasta: null, creado_en: hace(2) }));

export const tablas = {
  perfiles, lugares, eventos, artistas, eventos_artistas, asistencias, seguimientos, destacados,
  artistas_cuentas: [], lugares_cuentas: [], bloqueos: [], novedades: [], novedades_artista: [], reportes: [], suscripciones_push: [], fotos: [], eventos_sitio_privado: [], eventos_sesiones: [], lugares_horarios: [], ajustes_sitio: [], obras_colectivas: [], dispositivos_apns: [], cifrado: [],
};

/** Qué columna del padre apunta a cada tabla (para los `select` anidados). */
export const FK = {
  eventos: { lugares: "lugar_id", perfiles: "creado_por" },
  lugares: { perfiles: "creado_por" },
  artistas: { perfiles: "creado_por" },
  eventos_artistas: { eventos: "evento_id", artistas: "artista_id" },
  eventos_sesiones: { eventos: "evento_id" },
  lugares_horarios: { lugares: "lugar_id" },
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
  // Respaldo sintético de la cuenta autenticada. Los permisos reales se prueban en PostgreSQL.
  mi_perfil: (_args, t) => t.perfiles.find(p => p.id === ANA) ?? null,

  van_por_evento: ({ ids }) => (ids || []).map((id) => ({ evento_id: id, n: van(id) })).filter((x) => x.n > 0),
  tira_destacados: ({ p_tipo }) => (p_tipo === "eventos" ? destacados.map((d) => ({ id: d.evento_id, motivo: "elegido", hasta: null, van: van(d.evento_id) })) : []),
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
};

// ---------- sesión inventada (JWT HS256 sin firma válida: la app solo lo decodifica y pregunta a /auth/v1/user) ----------
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const ahora = Math.floor(Date.now() / 1000);
const claims = { iss: "http://127.0.0.1:8823/auth/v1", sub: ANA, aud: "authenticated", exp: ahora + 365 * 86400, iat: ahora, email: "ana@example.com", phone: "", app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {}, role: "authenticated", aal: "aal1", amr: [{ method: "otp", timestamp: ahora }], session_id: "33333333-3333-4333-8333-333333333333", is_anonymous: false };
const jwt = `${b64({ alg: "HS256", typ: "JWT" })}.${b64(claims)}.ZmlybWFfZGVfcHJ1ZWJh`;
export const usuario = { id: ANA, aud: "authenticated", role: "authenticated", email: "ana@example.com", email_confirmed_at: hace(30), phone: "", confirmed_at: hace(30), last_sign_in_at: hace(0), app_metadata: claims.app_metadata, user_metadata: {}, identities: [], created_at: hace(30), updated_at: hace(0), is_anonymous: false };
export const sesion = { access_token: jwt, token_type: "bearer", expires_in: 365 * 86400, expires_at: claims.exp, refresh_token: "refresco-de-prueba", user: usuario };
export const cookie = `base64-${Buffer.from(JSON.stringify(sesion)).toString("base64url")}`;
