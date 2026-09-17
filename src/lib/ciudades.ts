import type { SupabaseClient } from "@supabase/supabase-js";
import { armarCiudades, armarCiudadesDeArtistas, type CiudadConArtistas, type CiudadConDatos } from "./ciudad";
import { filtroSinPasar } from "./fechas";

/** Las ciudades que hay, a partir de los lugares visibles y los eventos próximos (para la agenda y Lugares). */
export async function cargarCiudades(supabase: SupabaseClient | null): Promise<CiudadConDatos[]> {
  if (!supabase) return armarCiudades([], []);
  // Tope explícito para no chocar con el corte silencioso de PostgREST en 1 000 filas; 5 000 cubre por mucho
  // el país entero de lugares y eventos próximos de hoy (revisión 2026-09-14, A1).
  const [l, e] = await Promise.all([
    supabase.from("lugares").select("ciudad, lat, lng, zona").eq("visible", true).eq("privado", false).limit(5000),
    supabase.from("eventos").select("ciudad, zona").eq("visible", true).or(filtroSinPasar()).limit(5000),
  ]);
  return armarCiudades((l.data ?? []) as { ciudad: string; lat: number; lng: number; zona: string }[], (e.data ?? []) as { ciudad: string; zona: string }[]);
}

/** Las ciudades de Artistas, a partir de los artistas visibles (Artistas y su alta). */
export async function cargarCiudadesDeArtistas(supabase: SupabaseClient | null): Promise<CiudadConArtistas[]> {
  if (!supabase) return armarCiudadesDeArtistas([]);
  // Mismo tope que arriba: hoy son unos 520 artistas.
  const { data } = await supabase.from("artistas").select("ciudad").eq("visible", true).limit(5000);
  return armarCiudadesDeArtistas((data ?? []) as { ciudad: string }[]);
}
