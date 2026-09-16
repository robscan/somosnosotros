import type { SupabaseClient } from "@supabase/supabase-js";
import { armarCiudades, type CiudadConDatos } from "./ciudad";
import { filtroSinPasar } from "./fechas";

/** Las ciudades que hay, a partir de los lugares visibles y los eventos próximos (para la agenda y Lugares). */
export async function cargarCiudades(supabase: SupabaseClient | null): Promise<CiudadConDatos[]> {
  if (!supabase) return armarCiudades([], []);
  const [l, e] = await Promise.all([
    supabase.from("lugares").select("ciudad, lat, lng").eq("visible", true).eq("privado", false).limit(5000),
    supabase.from("eventos").select("ciudad").eq("visible", true).or(filtroSinPasar()).limit(5000),
  ]);
  return armarCiudades((l.data ?? []) as { ciudad: string; lat: number; lng: number }[], (e.data ?? []) as { ciudad: string }[]);
}
