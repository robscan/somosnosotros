import { distanciaKm, type Punto } from "./geo";
import { limpiar } from "./formulario";
import { enlacesDesdeJson, type Enlace } from "./enlaces";
import { formatearCuando } from "./fechas";
import type { Origen } from "./origen";

export const TIPOS = [
  { valor: "casa_de_cultura", etiqueta: "Casa de cultura" },
  { valor: "foro", etiqueta: "Foro" },
  { valor: "galeria", etiqueta: "Galería" },
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
};

/** El evento más cercano de un lugar: lo que dice si el lugar tiene vida. */
export type ProximoEvento = { id: string; inicio: string };

/** Lo que la lista, el mapa y la tarjeta del pin enseñan de cada lugar. */
export type LugarLista = LugarResumen & { proximo: ProximoEvento | null };

export type Lugar = LugarResumen & {
  descripcion: string | null;
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
 * Orden de la lista: con ubicación, por distancia (y la distancia de cada uno); sin ella, primero los que
 * tienen eventos próximos (por fecha del próximo) y luego el resto en alfabético.
 */
export function ordenarLugares<T extends LugarLista>(lugares: T[], punto: Distancia | null): { lista: T[]; km: Map<string, number> } {
  const km = new Map<string, number>();
  if (punto) {
    for (const l of lugares) km.set(l.id, distanciaKm(punto, l));
    return { lista: [...lugares].sort((a, b) => km.get(a.id)! - km.get(b.id)!), km };
  }
  const lista = [...lugares].sort((a, b) => {
    if (a.proximo && b.proximo) return a.proximo.inicio.localeCompare(b.proximo.inicio) || compararNombres(a.nombre, b.nombre);
    if (a.proximo || b.proximo) return a.proximo ? -1 : 1;
    return compararNombres(a.nombre, b.nombre);
  });
  return { lista, km };
}

/** "Próximo: hoy · 19:30" · "Próximo: mié 16 de sep · 19:00". */
export function textoProximo(inicio: string, ahora: Date = new Date()): string {
  const cuando = formatearCuando(inicio, null, ahora);
  return `Próximo: ${cuando.charAt(0).toLowerCase()}${cuando.slice(1)}`;
}

/** Une lugares con su evento más próximo (los eventos vienen ordenados por inicio). */
export function conProximo<T extends { id: string }>(lugares: T[], eventos: { id: string; inicio: string; lugar_id: string | null }[]): (T & { proximo: ProximoEvento | null })[] {
  const proximo = new Map<string, ProximoEvento>();
  for (const e of eventos) if (e.lugar_id && !proximo.has(e.lugar_id)) proximo.set(e.lugar_id, { id: e.id, inicio: e.inicio });
  return lugares.map((l) => ({ ...l, proximo: proximo.get(l.id) ?? null }));
}

export const LIMITES_LUGAR = { nombre: 120, descripcion: 600, direccion: 200 } as const;

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
export function filtrarLugares<T extends { nombre: string; direccion: string | null; tipo?: string }>(lugares: T[], busqueda: string, tipo: string | null = null): T[] {
  const q = normalizarNombre(busqueda);
  return lugares.filter((l) => (!tipo || l.tipo === tipo) && (!q || normalizarNombre(`${l.nombre} ${l.direccion ?? ""}`).includes(q)));
}

/** Umbral a partir del cual aparece la búsqueda por nombre (lista y mapa). */
export const UMBRAL_BUSCAR_LUGARES = 8;
/** Umbral a partir del cual aparecen los chips de tipo (lista y mapa). */
export const UMBRAL_CHIPS_LUGARES = 8;

/** Los tipos con al menos un lugar, en el orden de la lista cerrada (Todos va aparte). */
export function tiposPresentes<T extends { tipo?: string }>(lugares: T[]): { valor: string; etiqueta: string }[] {
  const hay = new Set(lugares.map((l) => l.tipo));
  return TIPOS.filter((t) => hay.has(t.valor));
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
};
export type ErroresLugar = Partial<Record<"nombre" | "tipo" | "direccion" | "ubicacion" | "descripcion" | "portada" | "enlaces", string>>;


export function validarLugar(entrada: Record<string, FormDataEntryValue | null | undefined>): { datos: DatosLugar; errores: ErroresLugar } {
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
  };
  const errores: ErroresLugar = {};
  if (!datos.nombre) errores.nombre = "Escribe el nombre del lugar.";
  else if (datos.nombre.length > LIMITES_LUGAR.nombre) errores.nombre = `Máximo ${LIMITES_LUGAR.nombre} caracteres.`;
  if (!TIPOS.some((t) => t.valor === tipo)) errores.tipo = "Elige qué tipo de lugar es.";
  if (datos.direccion.length > LIMITES_LUGAR.direccion) errores.direccion = `Máximo ${LIMITES_LUGAR.direccion} caracteres.`;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
    errores.ubicacion = "Falta la ubicación: busca la dirección o mueve el pin en el mapa.";
  if (datos.descripcion.length > LIMITES_LUGAR.descripcion) errores.descripcion = `Máximo ${LIMITES_LUGAR.descripcion} caracteres.`;
  if (datos.portada && !/^https:\/\/[^\s]+$/.test(datos.portada)) errores.portada = "La foto no se subió bien. Intenta de nuevo.";
  if (redes.some((e) => e.url.length > 300)) errores.enlaces = "Hay un enlace demasiado largo.";
  return { datos, errores };
}
