import { cache } from "react";
import { armarCiudades, armarCiudadesDeArtistas, CIUDAD_INICIAL, ciudadCanonica, slugDeCiudad, type CiudadConArtistas, type CiudadConDatos } from "./ciudad";
import { ZONA_INICIAL } from "./fechas";
import { clienteServidor } from "./supabase/servidor";

type Agregado = { ciudad: string; zona: string; lugares: number; eventos: number; lat_suma: number; lng_suma: number };

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
export const cargarCiudades = cache(async (): Promise<CiudadConDatos[]> => {
  const filas = await leerAgregados<Agregado>("ciudades_agregadas");
  if (!filas.length) return armarCiudades([], []);
  type Acum = { lugares: number; eventos: number; lat: number; lng: number; zonas: Map<string, number> };
  const vacio = (): Acum => ({ lugares: 0, eventos: 0, lat: 0, lng: 0, zonas: new Map() });
  const inicial = CIUDAD_INICIAL.nombre;
  const ciudades = new Map<string, Acum>([[inicial, vacio()]]);
  for (const fila of filas) {
    const nombre = ciudadCanonica(fila.ciudad) || inicial;
    const a = ciudades.get(nombre) ?? vacio();
    a.lugares += Number(fila.lugares);
    a.eventos += Number(fila.eventos);
    a.lat += Number(fila.lat_suma);
    a.lng += Number(fila.lng_suma);
    if (fila.zona) a.zonas.set(fila.zona, (a.zonas.get(fila.zona) ?? 0) + Number(fila.lugares) + Number(fila.eventos));
    ciudades.set(nombre, a);
  }
  return [...ciudades].map(([nombre, a]) => ({
    slug: slugDeCiudad(nombre), nombre,
    centro: nombre === inicial || !a.lugares ? CIUDAD_INICIAL.centro : { lat: a.lat / a.lugares, lng: a.lng / a.lugares },
    centroConocido: nombre === inicial || a.lugares > 0,
    zoom: nombre === inicial ? CIUDAD_INICIAL.zoom : 13,
    lugares: a.lugares, eventos: a.eventos,
    zona: [...a.zonas].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))[0]?.[0] ?? ZONA_INICIAL,
  })).sort((a, b) => (a.nombre === inicial ? -1 : b.nombre === inicial ? 1 : b.lugares - a.lugares || a.nombre.localeCompare(b.nombre, "es")));
});

/** Misma lista y orden de Artistas, con un recuento agregado por ciudad en vez de cada artista. */
export const cargarCiudadesDeArtistas = cache(async (): Promise<CiudadConArtistas[]> => {
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
