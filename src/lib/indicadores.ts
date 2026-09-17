import "server-only";
import { clienteAdmin } from "./supabase/admin";

/**
 * La foto del día de los indicadores del panel (guardar_indicadores, migración 20260917090000): con ella el panel compara
 * con hace una semana y dibuja la tendencia. La toma la tarea de cada mañana; si falla, la deja el primer vistazo del día.
 */
export async function guardarIndicadores(): Promise<{ ok: boolean }> {
  const supabase = clienteAdmin();
  if (!supabase) return { ok: false };
  const { error } = await supabase.rpc("guardar_indicadores");
  return { ok: !error };
}
