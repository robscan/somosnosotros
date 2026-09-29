import { diasActivosCalendario, sumarDiasIso } from "./calendario";
import { CIUDAD_INICIAL, ciudadCanonica } from "./ciudad";
import { DIAS_ESTA_SEMANA } from "./cuando";
import { distanciaKm, type Punto } from "./geo";
import { limpiar } from "./formulario";
import { enlacesDesdeJson, type Enlace } from "./enlaces";
import { diaPin, formatearCuando } from "./fechas";
import { imagenPermitida } from "./imagenes";
import type { Origen } from "./origen";
import { LIMITES_LUGAR } from "./limites";

export const TIPOS = [
  { valor: "casa_de_cultura", etiqueta: "Casa de cultura" },
  { valor: "museo", etiqueta: "Museo" },
  { valor: "foro", etiqueta: "Foro" },
  { valor: "galeria", etiqueta: "Galería" },
  { valor: "escuela", etiqueta: "Escuela" },
  { valor: "colectivo", etiqueta: "Colectivo" },
  { valor: "biblioteca", etiqueta: "Biblioteca" },
  { valor: "otro", etiqueta: "Otro" },
] as const;
export type Tipo = (typeof TIPOS)[number]["valor"];


/** Lo que el mapa y la lista necesitan de un lugar. */
export type LugarResumen = {
  id: string;
  nombre: string;
  tipo: Tipo;
  direccion: string | null;
  lat: number;
  lng: number;
  portada: string | null;
  /** Mapeo personal de quien lo creó, para reutilizarlo en otro evento sin ficha pública (founder, 2026-09-24,
   *  OL-179: antes solo la administración lo podía marcar). Solo lo ve su autor y la administración; la base ya
   *  lo esconde a los demás (RLS) y ningún listado público debe depender solo de eso — aquí solo se señala. */
  privado?: boolean;
  /** Zona horaria del lugar (migración 0029): la de sus eventos. Solo llega donde se pide. */
  zona?: string;
  /** La dirección legible (/lugares/<slug>): se pone sola al crear el lugar y no cambia si cambia el nombre. Opcional
   *  porque no todas las consultas lo piden todavía; `hrefLugar` cae al UUID cuando falta. */
  slug?: string | null;
};

/**
 * La dirección de la ficha: el slug si ya lo trae (todas las filas desde la migración `20260922160000_lugares_slug`),
 * y el UUID solo como respaldo (una fila leída sin ese campo). Las rutas `/lugares/[id]` y `.../editar` resuelven
 * por slug o UUID y redirigen de forma permanente desde la dirección vieja (mismo criterio que `hrefArtista`).
 */
export function hrefLugar(l: { id: string; slug?: string | null }): string {
  return `/lugares/${l.slug || l.id}`;
}

/** El evento más cercano de un lugar: lo que dice si el lugar tiene vida. */
export type ProximoEvento = { id: string; inicio: string; zona: string; titulo: string };

/** Lo que el mapa y la lista enseñan de cada lugar. `diasEvento` es opcional: solo lo necesitan los filtros de Lugares
 *  (Con eventos); las demás pantallas no lo piden. */
export type LugarLista = LugarResumen & { proximo: ProximoEvento | null; diasEvento?: string[] };

export type Lugar = LugarResumen & {
  descripcion: string | null;
  /** Qué es, cuando el tipo es Otro (opcional; migración 0022). */
  detalle?: string | null;
  ciudad: string;
  /** Enlaces y redes reconocidos (lib/enlaces); en la base es JSON y puede venir en la forma vieja. */
  redes: Enlace[];
  creado_por: string | null;
  visible: boolean;
  /** De qué catálogo externo se trajo la ficha (por confirmar), o null si la registró alguien aquí. */
  origen: Origen | null;
};

/** La calle sin código postal, ciudad ni estado: "C. 5 de Mayo 1100, 78000 San Luis Potosí, S.L.P." → "C. 5 de Mayo 1100". */
export function calleCorta(direccion: string | null | undefined): string {
  if (!direccion) return "";
  const partes = direccion
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p && !/\b\d{5}\b/.test(p) && !/san luis potos[íi]|s\.?l\.?p\.?$|méxico$|mexico$/i.test(p));
  return partes[0] ?? direccion.trim();
}

type Distancia = Punto;

/**
 * Orden de la lista: con ubicación, por distancia (y la distancia de cada uno); sin ella, alfabético (directorio con
 * índice lateral, bitácora 119).
 */
export function ordenarLugares<T extends LugarLista>(lugares: T[], punto: Distancia | null): { lista: T[]; km: Map<string, number> } {
  const km = new Map<string, number>();
  if (punto) {
    for (const l of lugares) km.set(l.id, distanciaKm(punto, l));
    return { lista: [...lugares].sort((a, b) => km.get(a.id)! - km.get(b.id)!), km };
  }
  const lista = [...lugares].sort((a, b) => compararNombres(a.nombre, b.nombre));
  return { lista, km };
}

/** Cuántos lugares como mínimo (si no, se completa con los cercanos) y como tope al completar, en el encuadre inicial del mapa. */
export const MIN_ENCUADRE_INICIAL = 3;
export const TOPE_ENCUADRE_INICIAL = 6;

/**
 * El encuadre del mapa al abrir, sin ubicación (docs/rediseno/35): los lugares con evento en los próximos siete
 * días ("esta semana": lo dice `diaPin`, no null) y los destacados. Si con eso quedan menos de tres, se completa
 * con los lugares más cercanos al centro de la ciudad hasta llegar a seis. El mapa no filtra nada con esto: solo
 * decide qué encuadrar al abrir (el contexto ordena, no limita).
 */
export function lugaresEncuadreInicial<T extends LugarLista>(lugares: T[], destacados: string[], centro: Punto, ahora: Date = new Date()): T[] {
  const idsDestacados = new Set(destacados);
  const candidatos = lugares.filter((l) => idsDestacados.has(l.id) || (l.proximo && diaPin(l.proximo.inicio, ahora, l.proximo.zona) !== null));
  if (candidatos.length >= MIN_ENCUADRE_INICIAL) return candidatos;
  const idsCandidatos = new Set(candidatos.map((l) => l.id));
  const { lista: cercanos } = ordenarLugares(lugares.filter((l) => !idsCandidatos.has(l.id)), centro);
  return [...candidatos, ...cercanos.slice(0, TOPE_ENCUADRE_INICIAL - candidatos.length)];
}

/** "Próximo: hoy · 19:30" · "Próximo: mié 16 de sep · 19:00", con la hora de la zona del evento. */
export function textoProximo(p: Pick<ProximoEvento, "inicio" | "zona">, ahora: Date = new Date()): string {
  const cuando = formatearCuando(p.inicio, null, ahora, p.zona);
  return `Próximo: ${cuando.charAt(0).toLowerCase()}${cuando.slice(1)}`;
}

/** Une lugares con su evento más próximo (los eventos vienen ordenados por inicio). */
export function conProximo<T extends { id: string }>(lugares: T[], eventos: (ProximoEvento & { lugar_id: string | null })[]): (T & { proximo: ProximoEvento | null })[] {
  const proximo = new Map<string, ProximoEvento>();
  for (const e of eventos) if (e.lugar_id && !proximo.has(e.lugar_id)) proximo.set(e.lugar_id, { id: e.id, inicio: e.inicio, zona: e.zona, titulo: e.titulo });
  return lugares.map((l) => ({ ...l, proximo: proximo.get(l.id) ?? null }));
}

/**
 * Cada lugar con los días (YYYY-MM-DD, en la zona del propio evento) en que tiene al menos un evento próximo: lo que
 * «Con eventos» de los filtros de Lugares necesita para dejar pasar hoy o esta semana (docs/rediseno/45, OL-174). Los
 * mismos eventos que ya carga `cargar()` para el "próximo evento" de cada lugar (`conProximo`), sin otra consulta. Un
 * evento de varios días cuenta en cada día que ocupa (`diasActivosCalendario`, OL-218): el evento del 6 al 8 de octubre
 * hace que el lugar salga «con eventos» los tres días, bitácora 247.
 */
export function diasConEvento<T extends { id: string }>(lugares: T[], eventos: { inicio: string; fin?: string | null; zona: string; lugar_id: string | null }[]): (T & { diasEvento: string[] })[] {
  const porLugar = new Map<string, { inicio: string; fin: string | null; zona: string }[]>();
  for (const e of eventos) {
    if (!e.lugar_id) continue;
    const lista = porLugar.get(e.lugar_id) ?? [];
    lista.push({ inicio: e.inicio, fin: e.fin ?? null, zona: e.zona });
    porLugar.set(e.lugar_id, lista);
  }
  return lugares.map((l) => ({ ...l, diasEvento: [...diasActivosCalendario(porLugar.get(l.id) ?? []).keys()] }));
}

/** Los lugares con al menos un evento entre dos días (YYYY-MM-DD, los dos dentro): «Con eventos» de los filtros de Lugares. */
export function lugaresConEventoEn<T extends { diasEvento?: string[] }>(lugares: T[], desde: string, hasta: string): T[] {
  return lugares.filter((l) => l.diasEvento?.some((d) => d >= desde && d <= hasta));
}

/**
 * Lo que se elige en Filtros de Lugares (docs/rediseno/50, P5b): un tipo, con eventos hoy o esta semana (los próximos siete
 * días desde hoy, como el carril de Inicio) y solo lo que la persona sigue. Sin nada puesto salen todos los lugares.
 */
export type ConEventos = "hoy" | "semana";
export type EleccionLugares = { tipo: string | null; conEventos: ConEventos | null; soloSigo: boolean };
export const SIN_ELECCION: EleccionLugares = { tipo: null, conEventos: null, soloSigo: false };
/** Cómo se llama cada opción de «Con eventos»: en el bloque de la hoja y, ya puesta, en su chip de la fila. */
export const CON_EVENTOS: readonly { clave: ConEventos; etiqueta: string; puesto: string }[] = [
  { clave: "semana", etiqueta: "Esta semana", puesto: "Con eventos esta semana" },
  { clave: "hoy", etiqueta: "Hoy", puesto: "Con eventos hoy" },
];

/** Cuántos filtros hay puestos: lo que dice el número del chip Filtros. */
export const eleccionesPuestas = (e: EleccionLugares) => [e.tipo, e.conEventos, e.soloSigo].filter(Boolean).length;

/**
 * Los lugares que dejan pasar los filtros elegidos. `hoy` (YYYY-MM-DD en la ciudad) cuenta los eventos; `seguidos` son los
 * lugares que sigue la persona, null si no hay sesión (o aún no llegan): con «solo lo que sigo» entonces no sale ninguno.
 */
export function filtrarPorEleccion<T extends { id: string; tipo?: string; diasEvento?: string[] }>(lugares: T[], e: EleccionLugares, seguidos: string[] | null, hoy: string): T[] {
  const conEventos = e.conEventos ? lugaresConEventoEn(lugares, hoy, e.conEventos === "hoy" ? hoy : sumarDiasIso(hoy, DIAS_ESTA_SEMANA - 1)) : lugares;
  const sigue = new Set(seguidos ?? []);
  return conEventos.filter((l) => (!e.tipo || l.tipo === e.tipo) && (!e.soloSigo || sigue.has(l.id)));
}

export { LIMITES_LUGAR } from "./limites";

/** "Museo" · "Otro · Taller de cerámica": el tipo con el detalle cuando es Otro. */
export function etiquetaLugar(l: { tipo: string; detalle?: string | null }): string {
  return l.tipo === "otro" && l.detalle ? `Otro · ${l.detalle}` : etiquetaTipo(l.tipo);
}

export function etiquetaTipo(tipo: string): string {
  return TIPOS.find((t) => t.valor === tipo)?.etiqueta ?? "Otro";
}

/** Mismo criterio que normalizar_nombre() en la base: minúsculas, sin acentos, solo letras y números. */
/** Orden alfabético de verdad: sin acentos, mayúsculas ni signos ("¡Caracoles!" va en la C, no antes de la A). */
export function compararNombres(a: string, b: string): number {
  return normalizarNombre(a).localeCompare(normalizarNombre(b), "es") || a.localeCompare(b, "es");
}

export function normalizarNombre(t: string): string {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Filtra la lista por nombre (y dirección) escrito a medias, sin importar acentos ni mayúsculas. */
export function filtrarLugares<T extends { nombre: string; direccion: string | null }>(lugares: T[], busqueda: string): T[] {
  const q = normalizarNombre(busqueda);
  return q ? lugares.filter((l) => normalizarNombre(`${l.nombre} ${l.direccion ?? ""}`).includes(q)) : lugares;
}

/** Umbral a partir del cual aparece la búsqueda por nombre (mapa y lista). */
export const UMBRAL_BUSCAR_LUGARES = 8;
/** Umbral a partir del cual aparece el chip Filtros (tipo, con eventos, lo que sigo). */
export const UMBRAL_CHIPS_LUGARES = 8;

/** Los tipos con al menos un lugar y cuántos hay de cada uno, en el orden de la lista cerrada (Todos va aparte). */
export function tiposPresentes<T extends { tipo?: string }>(lugares: T[]): { valor: string; etiqueta: string; n: number }[] {
  const cuenta = new Map<string, number>();
  for (const l of lugares) if (l.tipo) cuenta.set(l.tipo, (cuenta.get(l.tipo) ?? 0) + 1);
  return TIPOS.filter((t) => cuenta.has(t.valor)).map((t) => ({ ...t, n: cuenta.get(t.valor)! }));
}

export type DatosLugar = {
  nombre: string;
  tipo: Tipo;
  direccion: string;
  lat: number;
  lng: number;
  descripcion: string;
  redes: Enlace[];
  portada: string | null;
  privado: boolean;
  detalle: string | null;
  /** Deducida por Mapbox al ubicar el lugar; la inicial si no dijo nada. */
  ciudad: string;
};
export type ErroresLugar = Partial<Record<"nombre" | "tipo" | "direccion" | "ubicacion" | "descripcion" | "portada" | "enlaces" | "detalle", string>>;


/** `esAdmin` viene siempre del rol real de la sesión (la acción de servidor lo comprueba); `portadaActual` es la
 *  que ya estaba guardada, para no romper una edición que reenvía sin tocarla la portada de una ficha importada
 *  de otro dominio (S-01, docs/rediseno/46). */
export type OpcionesValidarLugar = { esAdmin?: boolean; portadaActual?: string | null };

export function validarLugar(
  entrada: Record<string, FormDataEntryValue | null | undefined>,
  opciones: OpcionesValidarLugar = {},
): { datos: DatosLugar; errores: ErroresLugar } {
  const lat = Number(limpiar(entrada.lat));
  const lng = Number(limpiar(entrada.lng));
  const tipo = limpiar(entrada.tipo) as Tipo;
  const redes = enlacesDesdeJson(entrada.enlaces);
  const datos: DatosLugar = {
    nombre: limpiar(entrada.nombre),
    tipo,
    direccion: limpiar(entrada.direccion),
    lat,
    lng,
    descripcion: limpiar(entrada.descripcion),
    redes,
    portada: limpiar(entrada.portada) || null,
    privado: limpiar(entrada.privado) === "1",
    detalle: tipo === "otro" ? limpiar(entrada.detalle) || null : null,
    ciudad: (ciudadCanonica(limpiar(entrada.ciudad)) || CIUDAD_INICIAL.nombre).slice(0, 80),
  };
  const errores: ErroresLugar = {};
  if (datos.detalle && datos.detalle.length > LIMITES_LUGAR.detalle) errores.detalle = `Máximo ${LIMITES_LUGAR.detalle} caracteres.`;
  if (!datos.nombre) errores.nombre = "Escribe el nombre del lugar.";
  else if (datos.nombre.length > LIMITES_LUGAR.nombre) errores.nombre = `Máximo ${LIMITES_LUGAR.nombre} caracteres.`;
  if (!TIPOS.some((t) => t.valor === tipo)) errores.tipo = "Elige qué tipo de lugar es.";
  if (datos.direccion.length > LIMITES_LUGAR.direccion) errores.direccion = `Máximo ${LIMITES_LUGAR.direccion} caracteres.`;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
    errores.ubicacion = "Falta la ubicación: busca la dirección o mueve el pin en el mapa.";
  if (datos.descripcion.length > LIMITES_LUGAR.descripcion) errores.descripcion = `Máximo ${LIMITES_LUGAR.descripcion} caracteres.`;
  if (datos.portada && !imagenPermitida(datos.portada, { esAdmin: !!opciones.esAdmin, actual: opciones.portadaActual })) errores.portada = "La foto no se subió bien. Intenta de nuevo.";
  if (redes.some((e) => e.url.length > 300)) errores.enlaces = "Hay un enlace demasiado largo.";
  return { datos, errores };
}
