import "server-only";
import { cache } from "react";
import { esTipoHito, ordenarHitos, type Hito } from "./hitos";
import { clienteServidor } from "./supabase/servidor";

/** Tope de hitos por artista que se leen: de sobra para un currículum. */
export const TOPE_HITOS = 200;

/**
 * Los hitos públicos de un artista (OL-445, `artistas_hitos`): lo que la base deja ver a quien mira (la política de la ficha). Memoizado por
 * petición: el perfil, «Tu año» y el PDF lo piden en la misma visita. Si falla la lectura, sin hitos: nada más de la ficha depende de ellos.
 */
export const cargarHitos = cache(async (artistaId: string): Promise<Hito[]> => {
  const supabase = await clienteServidor();
  if (!supabase) return [];
  const { data, error } = await supabase.from("artistas_hitos").select("id, tipo, titulo, url, fuente, fecha").eq("artista_id", artistaId).limit(TOPE_HITOS);
  if (error) {
    console.warn("[hitos] no se pudieron leer:", error.message);
    return [];
  }
  return ordenarHitos(((data ?? []) as Hito[]).filter((h) => esTipoHito(h.tipo)));
});
