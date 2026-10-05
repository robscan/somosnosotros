import { cache } from "react";
import { armarCiudades, armarCiudadesDeArtistas, CIUDAD_INICIAL, ciudadCanonica, slugDeCiudad, type CiudadConArtistas, type CiudadConDatos } from "./ciudad";
import { ZONA_INICIAL } from "./fechas";
import { clienteServidor } from "./supabase/servidor";

/** Los tres últimos (OL-283) pueden faltar si la base aún tiene la función anterior: entonces todo se comporta como antes. */
type Agregado = {
  ciudad: string; zona: string; lugares: number; eventos: number; lat_suma: number; lng_suma: number;
  eventos_con_punto?: number; ev_lat_suma?: number; ev_lng_suma?: number;
};

/** Agregados de la base; sin trasladar miles de fichas ni depender del límite de filas de PostgREST. */
async function leerAgregados<T>(rpc: "ciudades_agregadas" | "ciudades_artistas_agregadas"): Promise<T[]> {
  const supabase = await clienteServidor();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.rpc(rpc);
    if (!error && Array.isArray(data)) return data as T[];
  } catch {
    // El respaldo de ciudad inicial se conserva también ante fallos del transporte.
  }
  console.warn(`[ciudades] agregado no disponible: ${rpc}`);
  return [];
}

/**
 * Conserva la canonización, el centro ponderado y el voto por zona de armarCiudades, ahora por grupos.
 * Los alias de ciudad se unen en la app para reutilizar ciudadCanonica y no duplicar esas reglas en SQL.
 * cache() evita repetir esta RPC entre metadata y página en una misma petición.
 */
const cargarCiudadesConOferta = cache(async (): Promise<CiudadConDatos[]> => {
  const filas = await leerAgregados<Agregado>("ciudades_agregadas");
  if (!filas.length) return armarCiudades([], []);
  type Acum = { lugares: number; eventos: number; lat: number; lng: number; conPunto: number; evLat: number; evLng: number; zonas: Map<string, number> };
  const vacio = (): Acum => ({ lugares: 0, eventos: 0, lat: 0, lng: 0, conPunto: 0, evLat: 0, evLng: 0, zonas: new Map() });
  const inicial = CIUDAD_INICIAL.nombre;
  const ciudades = new Map<string, Acum>([[inicial, vacio()]]);
  for (const fila of filas) {
    const nombre = ciudadCanonica(fila.ciudad) || inicial;
    const a = ciudades.get(nombre) ?? vacio();
    a.lugares += Number(fila.lugares);
    a.eventos += Number(fila.eventos);
    a.lat += Number(fila.lat_suma);
    a.lng += Number(fila.lng_suma);
    a.conPunto += Number(fila.eventos_con_punto ?? 0);
    a.evLat += Number(fila.ev_lat_suma ?? 0);
    a.evLng += Number(fila.ev_lng_suma ?? 0);
    if (fila.zona) a.zonas.set(fila.zona, (a.zonas.get(fila.zona) ?? 0) + Number(fila.lugares) + Number(fila.eventos));
    ciudades.set(nombre, a);
  }
  /** Con lugares, solo ellos dan el centro; sin lugares, el promedio de los puntos públicos de sus eventos (OL-283). */
  const centroDe = (nombre: string, a: Acum) =>
    nombre === inicial ? CIUDAD_INICIAL.centro
      : a.lugares > 0 ? { lat: a.lat / a.lugares, lng: a.lng / a.lugares }
      : a.conPunto > 0 ? { lat: a.evLat / a.conPunto, lng: a.evLng / a.conPunto }
      : null;
  return [...ciudades].map(([nombre, a]) => ({
    slug: slugDeCiudad(nombre), nombre,
    centro: centroDe(nombre, a) ?? CIUDAD_INICIAL.centro,
    centroConocido: centroDe(nombre, a) !== null,
    zoom: nombre === inicial ? CIUDAD_INICIAL.zoom : 13,
    lugares: a.lugares, eventos: a.eventos,
    zona: [...a.zonas].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))[0]?.[0] ?? ZONA_INICIAL,
  })).sort((a, b) => (a.nombre === inicial ? -1 : b.nombre === inicial ? 1 : b.lugares - a.lugares || a.nombre.localeCompare(b.nombre, "es")));
});

/** Misma lista y orden de Artistas, con un recuento agregado por ciudad en vez de cada artista. */
const cargarCiudadesConArtistas = cache(async (): Promise<CiudadConArtistas[]> => {
  const filas = await leerAgregados<{ ciudad: string; artistas: number }>("ciudades_artistas_agregadas");
  if (!filas.length) return armarCiudadesDeArtistas([]);
  const inicial = CIUDAD_INICIAL.nombre;
  const cuenta = new Map<string, number>([[inicial, 0]]);
  for (const fila of filas) {
    const nombre = ciudadCanonica(fila.ciudad) || inicial;
    cuenta.set(nombre, (cuenta.get(nombre) ?? 0) + Number(fila.artistas));
  }
  return [...cuenta].map(([nombre, artistas]) => ({
    ...CIUDAD_INICIAL, slug: slugDeCiudad(nombre), nombre, zoom: nombre === inicial ? CIUDAD_INICIAL.zoom : 13, artistas,
  })).sort((a, b) => (a.nombre === inicial ? -1 : b.nombre === inicial ? 1 : b.artistas - a.artistas || a.nombre.localeCompare(b.nombre, "es")));
});


/** Catálogo común para resolver identidad; la hoja filtra la oferta por sección.
 * Se reutilizan los dos agregados cacheados, sin consultar fichas ni inventar centros. */
export const cargarCiudades = cache(async (compartidas = false): Promise<CiudadConDatos[]> => {
  const propias = await cargarCiudadesConOferta();
  if (!compartidas) return propias;
  const artistas = await cargarCiudadesConArtistas();
  const slugs = new Set(propias.map(c => c.slug));
  return [...propias, ...artistas.filter(c => !slugs.has(c.slug)).map(c => ({
    slug: c.slug, nombre: c.nombre, zoom: c.zoom, centro: CIUDAD_INICIAL.centro, centroConocido: false,
    lugares: 0, eventos: 0, zona: ZONA_INICIAL,
  }))];
});
export const cargarCiudadesDeArtistas = cache(async (compartidas = false): Promise<CiudadConArtistas[]> => {
  const propias = await cargarCiudadesConArtistas();
  if (!compartidas) return propias;
  const oferta = await cargarCiudadesConOferta();
  const slugs = new Set(propias.map(c => c.slug));
  return [...propias, ...oferta.filter(c => !slugs.has(c.slug)).map(c => ({...c, artistas: 0}))];
});
