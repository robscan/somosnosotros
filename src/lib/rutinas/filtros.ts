import { distanciaKm, type Punto } from "../geo";
import { normalizarNombre } from "../lugares";

/**
 * Los filtros de «Buscar lugares» (OL-428; doc 57 §4.B): qué candidato no se propone y por qué. Funciones puras: el motor les pasa lo que
 * leyó de la base (los lugares de la ciudad y lo que ya se propuso en ella) y ellas deciden.
 *
 *   · ya_existe          ya está en el directorio: el mismo nombre en la ciudad, o un nombre parecido a menos de 150 m (lo que hace
 *                        `lugares_parecidos` al aceptar, más los nombres que no son idénticos: «Teatro de la Paz» ≈ «Teatro de la Paz SLP»).
 *   · ya_propuesto       una corrida anterior de la ciudad ya lo propuso (en cualquier estado) o salió dos veces en esta.
 *   · rechazado_antes    la administración lo rechazó antes en esta ciudad, con cualquier motivo: la rutina aprende a no proponerlo.
 *   · fuera_de_la_ciudad su punto cae fuera del área de la ciudad, o su municipio es otro.
 *   · sin_ubicacion      ni la fuente ni Mapbox dan dónde está (sin punto no se puede aceptar: la ficha lo pide).
 */

export type Motivo = "ya_existe" | "ya_propuesto" | "rechazado_antes" | "fuera_de_la_ciudad" | "sin_ubicacion";
export const MOTIVOS: readonly Motivo[] = ["ya_existe", "ya_propuesto", "rechazado_antes", "fuera_de_la_ciudad", "sin_ubicacion"];

// ---------- el área de la ciudad ----------
/**
 * El radio del área de una ciudad: 15 km desde su centro con el zoom de ciudad (13 o más), el mismo tamaño que la caja que usa el importador
 * del CAPO para San Luis y Soledad (±15 km); cada nivel de zoom menos lo duplica (una ciudad que se ve de más lejos es más grande), hasta 60 km.
 */
export const RADIO_BASE_KM = 15;
export const RADIO_MAXIMO_KM = 60;
export function radioDeCiudadKm(zoom: number | null | undefined): number {
  const z = typeof zoom === "number" && Number.isFinite(zoom) ? Math.round(zoom) : 13;
  return Math.min(RADIO_MAXIMO_KM, RADIO_BASE_KM * 2 ** Math.max(0, 13 - z));
}

export type Caja = { oeste: number; sur: number; este: number; norte: number };
/** La caja que encierra el círculo del área: la que se le pasa a Mapbox (`bbox`) y a la consulta de lugares cercanos. */
export function cajaAlrededor(centro: Punto, radioKm: number): Caja {
  const dLat = radioKm / 111.32;
  const dLng = radioKm / (111.32 * Math.max(0.1, Math.cos((centro.lat * Math.PI) / 180)));
  return { oeste: centro.lng - dLng, sur: centro.lat - dLat, este: centro.lng + dLng, norte: centro.lat + dLat };
}

export function dentroDelArea(p: Punto, centro: Punto, radioKm: number): boolean {
  return distanciaKm(p, centro) <= radioKm;
}

/** ¿El municipio que dice la fuente es la ciudad (o uno de sus alias)? Sin municipio, no se descarta por esto (decide el punto). */
export function municipioDeLaCiudad(municipio: string | null | undefined, nombresCiudad: readonly string[]): boolean {
  const m = normalizarNombre(municipio ?? "");
  if (!m) return true;
  return nombresCiudad.some((nombre) => {
    const c = normalizarNombre(nombre);
    return !!c && (m === c || m.startsWith(`${c} `) || c.startsWith(`${m} `));
  });
}

// ---------- nombres ----------
const VACIAS = new Set(["de", "del", "la", "las", "el", "los", "y", "e", "en", "a", "al"]);
/** Palabras que dicen qué clase de sitio es, no cuál: solas no identifican un lugar (las mismas del importador de instituciones). */
const GENERICAS = new Set([
  "museo", "casa", "cultura", "centro", "cultural", "teatro", "galeria", "biblioteca", "escuela", "instituto", "foro", "espacio",
  "arte", "artes", "sala", "auditorio", "publica", "municipal", "estatal", "universitario", "universitaria", "cineteca", "cine",
  "libreria", "taller", "plaza", "jardin", "parque",
]);

/**
 * Las palabras del nombre de la ciudad tampoco identifican un lugar («Teatro de la Paz San Luis Potosí» ≈ «Teatro de la Paz»). Solo las del
 * nombre principal: las de un alias sí distinguen («Casa de la Cultura de Soledad» no es la de San Luis).
 */
export function palabrasDeCiudad(nombreCiudad: string): Set<string> {
  return new Set(normalizarNombre(nombreCiudad).split(" ").filter((w) => w.length > 1 && !VACIAS.has(w)));
}

function palabras(t: string, ciudad: Set<string>): string[] {
  return normalizarNombre(t)
    .split(" ")
    .filter((w) => w.length > 1 && !VACIAS.has(w) && !ciudad.has(w));
}

/**
 * ¿Hablan del mismo sitio dos nombres? Los nombres propios del más corto están todos en el otro y, si los dos dicen qué clase de sitio son,
 * comparten esa palabra: «Museo Laberinto» ≈ «Museo Laberinto de las Ciencias y las Artes», pero «Casa de la Cultura» sola no identifica nada.
 * Es el criterio del importador de instituciones (scripts/instituciones), con las palabras de la ciudad que toque.
 */
export function nombresParecidos(a: string, b: string, ciudad: Set<string> = new Set()): boolean {
  if (normalizarNombre(a) && normalizarNombre(a) === normalizarNombre(b)) return true;
  const pa = palabras(a, ciudad);
  const pb = palabras(b, ciudad);
  if (pa.length && pa.join(" ") === pb.join(" ")) return true;
  const propiasA = new Set(pa.filter((w) => !GENERICAS.has(w)));
  const propiasB = new Set(pb.filter((w) => !GENERICAS.has(w)));
  if (!propiasA.size || !propiasB.size) return false;
  const [corta, larga] = propiasA.size <= propiasB.size ? [propiasA, propiasB] : [propiasB, propiasA];
  if (![...corta].every((w) => larga.has(w))) return false;
  const genericasA = pa.filter((w) => GENERICAS.has(w));
  const genericasB = new Set(pb.filter((w) => GENERICAS.has(w)));
  if (genericasA.length && genericasB.size) return genericasA.some((w) => genericasB.has(w));
  return propiasA.size === propiasB.size && propiasA.size >= 2;
}

// ---------- lo que ya se conoce en la ciudad ----------
export type LugarConocido = { nombre: string; lat: number | null; lng: number | null };
export type PropuestaConocida = { nombre: string; estado: string; motivo: string | null };
export type Conocidos = {
  existentes: LugarConocido[];
  nombresExistentes: Set<string>;
  propuestos: Set<string>;
  rechazados: Map<string, string>;
  ciudad: Set<string>;
  /** Los nombres tal como se escriben (sin repetir): lo que se le dice al modelo que ya se conoce. */
  lista: string[];
};

/** Junta lo que la base dice de la ciudad: sus lugares y lo que se propuso en ella (con su estado y, si se rechazó, el motivo). */
export function armarConocidos(lugares: readonly LugarConocido[], propuestas: readonly PropuestaConocida[], nombresCiudad: readonly string[]): Conocidos {
  const rechazados = new Map<string, string>();
  const propuestos = new Set<string>();
  const lista = new Map<string, string>();
  for (const p of propuestas) {
    const k = normalizarNombre(p.nombre);
    if (!k) continue;
    if (p.estado === "rechazada") rechazados.set(k, p.motivo ?? "otro");
    else propuestos.add(k);
    if (!lista.has(k)) lista.set(k, p.nombre.trim());
  }
  for (const l of lugares) {
    const k = normalizarNombre(l.nombre);
    if (k && !lista.has(k)) lista.set(k, l.nombre.trim());
  }
  return {
    existentes: [...lugares],
    nombresExistentes: new Set(lugares.map((l) => normalizarNombre(l.nombre)).filter(Boolean)),
    propuestos,
    rechazados,
    ciudad: palabrasDeCiudad(nombresCiudad[0] ?? ""),
    lista: [...lista.values()],
  };
}

/**
 * Lo que se sabe solo con el nombre, antes de buscar el punto (así no se gasta Mapbox en lo que ya se conoce). Lo rechazado manda: un nombre
 * que la administración rechazó no vuelve aunque otra fuente lo traiga.
 */
export function motivoPorNombre(nombre: string, c: Conocidos): Motivo | null {
  const k = normalizarNombre(nombre);
  if (c.rechazados.has(k)) return "rechazado_antes";
  if (c.nombresExistentes.has(k)) return "ya_existe";
  if (c.propuestos.has(k)) return "ya_propuesto";
  return null;
}

export const METROS_MISMO_LUGAR = 150;

/** Con el punto ya resuelto: ¿hay en el directorio un lugar de nombre igual o parecido a menos de 150 m? */
export function existeCerca(nombre: string, punto: Punto, c: Conocidos): boolean {
  return c.existentes.some(
    (l) => l.lat != null && l.lng != null && distanciaKm(punto, { lat: l.lat, lng: l.lng }) * 1000 <= METROS_MISMO_LUGAR && nombresParecidos(nombre, l.nombre, c.ciudad),
  );
}

/** Lo rechazado en la ciudad como «no es cultural»: la rutina se lo enseña al modelo como lo que no hay que proponer. */
export function rechazadosNoCulturales(propuestas: readonly PropuestaConocida[], tope = 20): string[] {
  return propuestas.filter((p) => p.estado === "rechazada" && p.motivo === "no_cultural").map((p) => p.nombre).slice(0, tope);
}
