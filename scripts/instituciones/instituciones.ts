/**
 * Instituciones culturales de San Luis Potosí investigadas a mano (museos, casas de cultura, teatros, escuelas,
 * galerías, bibliotecas…) para darlas de alta como lugares. Funciones puras; las llamadas viven en importar.ts.
 */
import { normalizarNombre, TIPOS, type Tipo } from "../../src/lib/lugares";

export type Punto = { lat: number; lng: number };

/** Una institución revisada, lista para importar. */
export type Institucion = {
  nombre: string;
  alias?: string[];
  /** Lo que es según la investigación: museo, casa_de_cultura, centro_cultural, teatro, cine, escuela, galeria, biblioteca, libreria, espacio_independiente, colectivo, otro. */
  categoria: string;
  /** Tipo de la app cuando la categoría no basta (un espacio independiente que en realidad es colectivo). */
  tipo?: Tipo;
  operador?: string | null;
  direccion: string;
  descripcion: string;
  enlaces: string[];
  /** Coordenadas que dio una fuente: se contrastan con Mapbox, no se creen solas. */
  lat?: number | null;
  lng?: number | null;
  fuentes: string[];
};

/** De la categoría de la investigación al tipo de la app; lo que no está aquí (librería, archivo…) va con Otro. */
const TIPO_POR_CATEGORIA: Record<string, Tipo> = {
  museo: "museo",
  escuela: "escuela",
  galeria: "galeria",
  casa_de_cultura: "casa_de_cultura",
  centro_cultural: "casa_de_cultura",
  teatro: "foro",
  cine: "foro",
  espacio_independiente: "foro",
  colectivo: "colectivo",
  biblioteca: "biblioteca",
};

export function tipoDeInstitucion(i: Pick<Institucion, "categoria" | "tipo">): Tipo {
  if (i.tipo && TIPOS.some((t) => t.valor === i.tipo)) return i.tipo;
  return TIPO_POR_CATEGORIA[i.categoria] ?? "otro";
}

const VACIAS = new Set(["de", "del", "la", "las", "el", "los", "y", "e", "en", "a", "al", "san", "luis", "potosi", "slp"]);
/** Palabras que dicen qué clase de sitio es, no cuál: solas no identifican un lugar. */
const GENERICAS = new Set([
  "museo", "casa", "cultura", "centro", "cultural", "teatro", "galeria", "biblioteca", "escuela", "instituto", "foro", "espacio",
  "arte", "artes", "sala", "auditorio", "publica", "municipal", "estatal", "universitario", "universitaria", "cineteca", "cine",
  "libreria", "taller", "plaza", "jardin", "parque",
]);

function palabras(t: string): string[] {
  return normalizarNombre(t).split(" ").filter((w) => w.length > 1 && !VACIAS.has(w));
}

/**
 * ¿Hablan del mismo sitio dos nombres? Los nombres propios del más corto están todos en el otro y, si los dos dicen
 * qué clase de sitio son, comparten esa palabra: "Museo Laberinto" ≈ "Museo Laberinto de las Ciencias y las Artes",
 * pero "Casa de la Cultura" no identifica nada y "Teatro de la Paz" no es "Plaza de la Paz".
 */
export function nombresCoinciden(a: string, b: string): boolean {
  const pa = palabras(a);
  const pb = palabras(b);
  const propiasA = new Set(pa.filter((w) => !GENERICAS.has(w)));
  const propiasB = new Set(pb.filter((w) => !GENERICAS.has(w)));
  if (!propiasA.size || !propiasB.size) return false;
  const [corta, larga] = propiasA.size <= propiasB.size ? [propiasA, propiasB] : [propiasB, propiasA];
  if (![...corta].every((w) => larga.has(w))) return false;
  const genericasA = pa.filter((w) => GENERICAS.has(w));
  const genericasB = new Set(pb.filter((w) => GENERICAS.has(w)));
  if (genericasA.length && genericasB.size) return genericasA.some((w) => genericasB.has(w));
  // Si uno no dice qué clase de sitio es, solo vale el mismo nombre propio completo, de dos palabras o más.
  return propiasA.size === propiasB.size && propiasA.size >= 2;
}

/** Caja de la ciudad y Soledad (la misma del importador del CAPO): sin ella Mapbox se va a otros municipios. */
export const CAJA_CIUDAD = { oeste: -101.1, sur: 22.0, este: -100.85, norte: 22.3 } as const;

export function enCiudad(p: Punto): boolean {
  return p.lat >= CAJA_CIUDAD.sur && p.lat <= CAJA_CIUDAD.norte && p.lng >= CAJA_CIUDAD.oeste && p.lng <= CAJA_CIUDAD.este;
}

/** "Av. Carranza 1815, Tequisquiapan, 78250 San Luis Potosí, S.L.P." → "Av. Carranza 1815, Tequisquiapan, 78250": la ciudad va en la caja. */
export function direccionParaBuscar(direccion: string): string {
  const partes = direccion
    .split(",")
    .map((p) => p.replace(/san luis potos[ií](?![a-z])/gi, "").trim())
    .filter(Boolean);
  while (partes.length > 1 && /^(s\.?\s?l\.?\s?p\.?|m[eé]xico)$/i.test(partes.at(-1) ?? "")) partes.pop();
  return partes.join(", ");
}

/** La respuesta tiene que hablar de la misma calle: la primera palabra larga de la dirección debe aparecer en ella (criterio del CAPO). */
export function mismaCalle(pedida: string, devuelta: string): boolean {
  const palabra = normalizarNombre(pedida)
    .split(" ")
    .find((w) => w.length >= 4 && !/^(calle|avenida|av|prol|prolongacion|blvd|boulevard|plan)$/.test(w));
  return !palabra || normalizarNombre(devuelta).includes(palabra);
}

export function metrosEntre(a: Punto, b: Punto): number {
  const rad = (x: number) => (x * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

export type Candidato = Punto & { direccion: string; nombre?: string };
export type Eleccion = { punto: Candidato; como: "Mapbox por nombre" | "Mapbox por dirección" | "coordenadas de la fuente"; nota: string | null };

/** A cuántos metros dos puntos cuentan como el mismo sitio. */
const CERCA_M = 250;

/**
 * ¿El lugar que Mapbox encontró por nombre está en la calle y el número investigados? Se compara el primer tramo de
 * la dirección (calle y número): "Santa Martha 521, Rancho Blanco" ≈ "Calle Sta. Martha 521, 78436 Soledad".
 */
export function mismaCalleYNumero(pedida: string, devuelta: string): boolean {
  const calle = normalizarNombre(pedida.split(",")[0] ?? "").split(" ");
  const respuesta = new Set(normalizarNombre(devuelta).split(" "));
  const numero = calle.filter((w) => /^\d{1,4}$/.test(w)).at(-1);
  return !!numero && respuesta.has(numero) && calle.some((w) => w.length >= 4 && !/^(calle|avenida|prolongacion|boulevard|calzada)$/.test(w) && respuesta.has(w));
}

/**
 * Dónde va el pin. Si Mapbox por nombre (la puerta del edificio) y por dirección coinciden, gana el nombre; si
 * discrepan, desempatan la fuente o que el lugar por nombre esté en la calle y el número investigados; si no, gana
 * la dirección con aviso. Con uno solo, ese, salvo que sea solo la dirección y la fuente discrepe: un número que Mapbox
 * interpola vale menos que las coordenadas de una ficha oficial. Sin Mapbox, la fuente con aviso. Sin nada, null.
 */
export function elegirPunto(fuente: Candidato | null, porNombre: Candidato | null, porDireccion: Candidato | null, pedida = ""): Eleccion | null {
  if (porNombre && porDireccion) {
    const m = Math.round(metrosEntre(porNombre, porDireccion));
    if (m <= CERCA_M) return { punto: porNombre, como: "Mapbox por nombre", nota: null };
    if (fuente && metrosEntre(fuente, porNombre) <= CERCA_M)
      return { punto: porNombre, como: "Mapbox por nombre", nota: `la dirección cae a ${m} m; la fuente coincide con el nombre` };
    if (pedida && mismaCalleYNumero(pedida, porNombre.direccion))
      return { punto: porNombre, como: "Mapbox por nombre", nota: `la dirección cae a ${m} m, pero «${porNombre.nombre ?? ""}» está en la calle y el número investigados` };
    return {
      punto: porDireccion,
      como: "Mapbox por dirección",
      nota: `por nombre («${porNombre.nombre ?? ""}», ${porNombre.direccion || "sin dirección"}) cae a ${m} m de «${porDireccion.direccion}»: revisar`,
    };
  }
  const uno = porNombre ?? porDireccion;
  if (uno) {
    const como = porNombre ? "Mapbox por nombre" : "Mapbox por dirección";
    const lejos = fuente ? Math.round(metrosEntre(fuente, uno)) : 0;
    if (fuente && lejos > CERCA_M && !porNombre) return { punto: fuente, como: "coordenadas de la fuente", nota: `la dirección de Mapbox cae a ${lejos} m: se usaron las de la fuente` };
    if (fuente && lejos > CERCA_M) return { punto: uno, como, nota: `la fuente da un punto a ${lejos} m: revisar` };
    return { punto: uno, como, nota: porNombre ? `sin número exacto en Mapbox; ubicado como «${porNombre.nombre ?? ""}»` : null };
  }
  if (fuente) return { punto: fuente, como: "coordenadas de la fuente", nota: "Mapbox no lo ubicó: revisar en el mapa" };
  return null;
}

/** Un evento de la agenda de una institución, ya elegido para cargar (importar-eventos.ts). */
export type EventoPropuesto = {
  titulo: string;
  /** Nombre del lugar registrado donde es. Si no hay lugar registrado, `sitio` con el texto público ("Plaza de Armas"). */
  lugar?: string | null;
  sitio?: string | null;
  /** YYYY-MM-DD y HH:MM, en hora de la ciudad. */
  fecha: string;
  hora: string;
  hora_fin?: string | null;
  /** "Gratis", vacío o null = gratis; si no, el texto del costo. */
  precio?: string | null;
  descripcion: string;
  enlace?: string | null;
  artistas?: string[];
};

/** La hora de fin como fecha local; si no es posterior al inicio, es del día siguiente (una función que acaba pasada la medianoche). */
export function finLocal(fecha: string, hora: string, horaFin: string | null | undefined): string {
  if (!horaFin) return "";
  if (horaFin > hora) return `${fecha}T${horaFin}`;
  const dia = new Date(`${fecha}T00:00:00Z`);
  dia.setUTCDate(dia.getUTCDate() + 1);
  return `${dia.toISOString().slice(0, 10)}T${horaFin}`;
}

/** Lo que mandaría el formulario de alta para este evento: se valida con lib/eventos · validarEvento. */
export function formularioDeEvento(e: EventoPropuesto, lugarId: string | null): Record<string, string> {
  const precio = (e.precio ?? "").trim();
  const gratis = !precio || /^gratis$/i.test(precio);
  return {
    modo_sitio: lugarId ? "lugar" : "otro",
    lugar_id: lugarId ?? "",
    sitio_texto: lugarId ? "" : (e.sitio ?? "").trim(),
    titulo: e.titulo,
    inicio: `${e.fecha}T${e.hora}`,
    fin: finLocal(e.fecha, e.hora, e.hora_fin),
    gratis: gratis ? "si" : "no",
    precio: gratis ? "" : precio,
    descripcion: e.descripcion,
    enlace: e.enlace ?? "",
  };
}

/** El lugar registrado con ese nombre: el igual al normalizar o, si no, el único cuyo nombre coincide. Lo ambiguo no se adivina. */
export function resolverLugar<T extends { id: string; nombre: string }>(nombre: string | null | undefined, lugares: T[]): T | null {
  if (!nombre) return null;
  const n = normalizarNombre(nombre);
  const igual = lugares.find((l) => normalizarNombre(l.nombre) === n);
  if (igual) return igual;
  const parecidos = lugares.filter((l) => nombresCoinciden(nombre, l.nombre));
  return parecidos.length === 1 ? (parecidos[0] ?? null) : null;
}
