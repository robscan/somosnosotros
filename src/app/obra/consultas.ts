import { clienteServidor } from "@/lib/supabase/servidor";

/**
 * Fase 2 bloque 3 (OL-088, bitácora 123): lo que la pared y el mando necesitan de una obra, sin ser del panel de
 * administración — por eso vive aparte de `src/app/admin/obras-colectivas/consultas.ts`, no ahí. Ambas exigen
 * sesión (revisión del gestor, 2026-09-21: el canal es privado, sin sesión no recibirían nada de todos modos).
 * `cupoMandos` (doc rediseno/34) es lo que la pared y el mando necesitan para calcular la fila de espera.
 */
export type ObraParaPintar = { id: string; nombre: string; estado: "abierta" | "cerrada"; zona: string; cupoMandos: number };

export async function cargarObraParaPintar(id: string): Promise<ObraParaPintar | null> {
  const supabase = await clienteServidor();
  if (!supabase) return null;
  const { data } = await supabase.from("obras_colectivas").select("id, nombre, estado, zona, cupo_mandos").eq("id", id).maybeSingle();
  if (!data) return null;
  const fila = data as { id: string; nombre: string; estado: "abierta" | "cerrada"; zona: string; cupo_mandos: number };
  return { id: fila.id, nombre: fila.nombre, estado: fila.estado, zona: fila.zona, cupoMandos: fila.cupo_mandos };
}
