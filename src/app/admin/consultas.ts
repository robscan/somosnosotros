import "server-only";
import { esUuid } from "@/lib/formulario";
import type { ArtistaFila, EventoFila, Lista, LugarFila, Pendiente, PersonaFicha, PersonaFila, Resumen } from "@/lib/panel";
import { PAGINA_PANEL } from "@/lib/panel";
import { clienteServidor } from "@/lib/supabase/servidor";

/**
 * Lo que leen las pantallas del panel: todo sale de las funciones panel_* de la base (migración 20260917090000), que
 * comprueban el rol por dentro. Cada carga dice si falló, para que la pantalla lo diga en su sitio (A5) y no muestre
 * números inventados.
 */

export async function cargarResumen(): Promise<{ resumen: Resumen | null; pendientes: Pendiente[]; errorPendientes: boolean }> {
  const supabase = (await clienteServidor())!;
  const [r, p] = await Promise.all([supabase.rpc("panel_resumen"), supabase.rpc("panel_pendientes")]);
  return { resumen: r.error ? null : (r.data as Resumen), pendientes: (p.data ?? []) as Pendiente[], errorPendientes: !!p.error };
}

/** Cuántos reclamos y reportes esperan; null si no se pudo leer (entonces no se afirma "Nada pendiente"). */
export async function contarPendientes(): Promise<number | null> {
  const supabase = await clienteServidor();
  if (!supabase) return null;
  const { count, error } = await supabase.from("reportes").select("id", { count: "exact", head: true }).eq("atendido", false);
  return error ? null : (count ?? 0);
}

type Cargado<T> = { filas: T[]; total: number; conteos: Record<string, number> | null; error: boolean };

export async function cargarPersonas(l: Lista): Promise<Cargado<PersonaFila>> {
  const supabase = (await clienteServidor())!;
  const [f, c] = await Promise.all([supabase.rpc("panel_personas", { p_buscar: l.q, p_filtro: l.filtro, p_limite: l.n, p_desde: 0 }), supabase.rpc("panel_personas_conteos")]);
  const filas = (f.data ?? []) as PersonaFila[];
  return { filas, total: Number(filas[0]?.total ?? 0), conteos: (c.data as Record<string, number> | null) ?? null, error: !!f.error };
}

/** La ficha de administración de una persona. `error` no es lo mismo que `persona: null` (la cuenta ya no existe). */
export async function cargarPersona(id: string): Promise<{ persona: PersonaFicha | null; error: boolean }> {
  if (!esUuid(id)) return { persona: null, error: false };
  const supabase = (await clienteServidor())!;
  const { data, error } = await supabase.rpc("panel_persona", { p_perfil: id });
  return { persona: error ? null : ((data as PersonaFicha | null) ?? null), error: !!error };
}

export type FilaDe = { lugares: LugarFila; eventos: EventoFila; artistas: ArtistaFila };

export async function cargarFichas<S extends keyof FilaDe>(seccion: S, l: Lista): Promise<Cargado<FilaDe[S]>> {
  const supabase = (await clienteServidor())!;
  const [f, c] = await Promise.all([
    supabase.rpc(`panel_${seccion}`, { p_buscar: l.q, p_filtro: l.filtro, p_limite: Math.max(l.n, PAGINA_PANEL), p_desde: 0 }),
    supabase.rpc("panel_fichas_conteos", { p_tipo: seccion }),
  ]);
  const filas = (f.data ?? []) as FilaDe[S][];
  return { filas, total: Number(filas[0]?.total ?? 0), conteos: (c.data as Record<string, number> | null) ?? null, error: !!f.error };
}
