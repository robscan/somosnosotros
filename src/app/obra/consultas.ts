import { clienteServidor } from "@/lib/supabase/servidor";

/**
 * Fase 2 bloque 3 (OL-088, bitácora 123): lo que la pared y el mando necesitan de una obra, sin ser del panel de
 * administración — por eso vive aparte de `src/app/admin/obras-colectivas/consultas.ts`, no ahí. La pared se abre
 * sin sesión (la RLS de `obras_colectivas` ya decide qué puede ver quien no tiene cuenta: lectura pública si el
 * lugar es visible y, si hay evento, también visible — migración `20260922090000_obras_colectivas.sql`).
 */
export type ObraParaPintar = { id: string; nombre: string; estado: "abierta" | "cerrada"; zona: string };

export async function cargarObraParaPintar(id: string): Promise<ObraParaPintar | null> {
  const supabase = await clienteServidor();
  if (!supabase) return null;
  const { data } = await supabase.from("obras_colectivas").select("id, nombre, estado, zona").eq("id", id).maybeSingle();
  return (data as ObraParaPintar | null) ?? null;
}
