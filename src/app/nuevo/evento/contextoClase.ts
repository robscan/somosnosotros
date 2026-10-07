import { franjaDeFila, type Franja } from "@/lib/horarioLugar";
import type { clienteServidor } from "@/lib/supabase/servidor";

/**
 * Lo que el alta y editar por pasos necesitan saber para proponer y confirmar cómo ocurre un evento (OL-321): el horario de cada lugar del
 * directorio (la casilla «Horario del lugar» de una exposición) y los festivales que quien publica puede elegir en «Parte de un festival».
 * Sin la migración de OL-321 (o si una consulta falla) llega vacío: la pantalla funciona igual, sin esas salidas.
 */
export type FestivalElegible = { id: string; titulo: string; inicio: string; fin: string | null; zona: string };
export type ContextoClase = { horarios: Record<string, Franja[]>; festivales: FestivalElegible[] };

type Cliente = NonNullable<Awaited<ReturnType<typeof clienteServidor>>>;

/** Las filas de `lugares_horarios` agrupadas por lugar, como franjas. */
export function horariosPorLugar(filas: readonly { lugar_id: string; dias: number[]; abre: string; cierra: string }[]): Record<string, Franja[]> {
  const porLugar: Record<string, Franja[]> = {};
  for (const fila of filas) (porLugar[fila.lugar_id] ??= []).push(franjaDeFila(fila));
  return porLugar;
}

/**
 * Los festivales que se pueden elegir como padre: los propios que todavía no terminan (la administración, todos los visibles). Un festival
 * ajeno sería una propuesta pendiente de quien lo administra, que el modelo todavía no tiene (por confirmar con el founder).
 */
export async function cargarContextoClase(supabase: Cliente | null, usuario: { id: string; admin: boolean }): Promise<ContextoClase> {
  if (!supabase) return { horarios: {}, festivales: [] };
  let festivales = supabase.from("eventos").select("id, titulo, inicio, fin, zona").eq("clase", "festival").gte("termina", new Date().toISOString()).order("inicio").limit(200);
  if (!usuario.admin) festivales = festivales.eq("creado_por", usuario.id);
  const [horarios, marcos] = await Promise.all([supabase.from("lugares_horarios").select("lugar_id, dias, abre, cierra").order("creado_en"), festivales]);
  return {
    horarios: horarios.error || !Array.isArray(horarios.data) ? {} : horariosPorLugar(horarios.data as { lugar_id: string; dias: number[]; abre: string; cierra: string }[]),
    festivales: marcos.error || !Array.isArray(marcos.data) ? [] : (marcos.data as FestivalElegible[]),
  };
}
