import "server-only";
import type { Decididas } from "@/components/useAsistenciaEnLista";
import { clienteServidor } from "@/lib/supabase/servidor";

/**
 * Lo que quien mira decidió en estos eventos (OL-057): sus propias filas de asistencias, leídas con su sesión en cada
 * render, para los gestos de las listas de las fichas. Sin sesión, null (el gesto lleva a Entrar).
 */
export async function decididasDe(usuarioId: string | null, eventoIds: string[]): Promise<Decididas> {
  if (!usuarioId) return null;
  const decididas: NonNullable<Decididas> = {};
  const supabase = eventoIds.length ? await clienteServidor() : null;
  if (!supabase) return decididas;
  const { data } = await supabase.from("asistencias").select("evento_id, estado").eq("usuario_id", usuarioId).in("evento_id", eventoIds).limit(1000);
  for (const f of (data ?? []) as { evento_id: string; estado: string }[]) {
    if (f.estado === "voy" || f.estado === "me_interesa") decididas[f.evento_id] = f.estado;
  }
  return decididas;
}
