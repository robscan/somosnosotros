import "server-only";
import { estadoVigente, SECCION_DE, type Destacado, type EstadoDestacado, type FilaDestacada, type TipoFicha } from "@/lib/destacados";
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

export async function cargarFichas<S extends keyof FilaDe>(seccion: S, l: Lista): Promise<Cargado<FilaDe[S]> & { destacados: FilaDestacada[] }> {
  const supabase = (await clienteServidor())!;
  // Con el filtro Destacados, los renglones salen de panel_destacados (docs/rediseno/20, A5).
  const [f, c, d] = await Promise.all([
    l.filtro === "destacados" ? Promise.resolve({ data: [], error: null }) : supabase.rpc(`panel_${seccion}`, { p_buscar: l.q, p_filtro: l.filtro, p_limite: Math.max(l.n, PAGINA_PANEL), p_desde: 0 }),
    supabase.rpc("panel_fichas_conteos", { p_tipo: seccion }),
    supabase.rpc("panel_destacados", { p_tipo: seccion }),
  ]);
  const filas = (f.data ?? []) as FilaDe[S][];
  // `panel_eventos` no devuelve la zona de cada evento (migración 0028): se lee aparte, en tandas de 100 para no alargar la
  // dirección de la consulta, y así la hora se escribe en la zona del evento. El administrador lee todos los eventos.
  if (seccion === "eventos" && filas.length) {
    const eventos = filas as EventoFila[];
    const tandas = Array.from({ length: Math.ceil(eventos.length / 100) }, (_, i) => eventos.slice(i * 100, (i + 1) * 100).map((x) => x.id));
    const leidas = await Promise.all(tandas.map((ids) => supabase.from("eventos").select("id, zona").in("id", ids).limit(ids.length)));
    const zonas = new Map(leidas.flatMap((r) => (r.data ?? []) as { id: string; zona: string }[]).map((x) => [x.id, x.zona]));
    for (const x of eventos) x.zona = zonas.get(x.id);
  }
  const destacados = (d.data ?? []) as FilaDestacada[];
  const conteos = c.data ? { ...(c.data as Record<string, number>), destacados: destacados.length } : null;
  return { filas, total: Number(filas[0]?.total ?? 0), conteos, error: !!f.error || (l.filtro === "destacados" && !!d.error), destacados };
}

/**
 * Para el menú de una ficha: lo que decidió la administración, si sigue vigente, con su plazo (lo repone Deshacer); si
 * está en la tira de su ciudad y por qué; y la zona de la ficha para escribir las fechas. Los artistas no tienen zona.
 */
export async function cargarDestacado(tipo: TipoFicha, id: string): Promise<{ enTira: Destacado | null; estado: EstadoDestacado; plazo: string | null; zona?: string }> {
  const supabase = (await clienteServidor())!;
  const seccion = SECCION_DE[tipo];
  const [c, q] = await Promise.all([
    supabase.from(seccion).select(tipo === "artista" ? "ciudad" : "ciudad, zona").eq("id", id).maybeSingle<{ ciudad: string; zona?: string }>(),
    supabase.from("destacados").select("quitado, hasta").eq(`${tipo}_id`, id).maybeSingle<{ quitado: boolean; hasta: string | null }>(),
  ]);
  const t = c.data ? await supabase.rpc("tira_destacados", { p_tipo: seccion, p_ciudad: c.data.ciudad }) : { data: [] };
  const estado = estadoVigente(q.data);
  return { enTira: ((t.data ?? []) as Destacado[]).find((d) => d.id === id) ?? null, estado, plazo: estado === "ninguno" ? null : (q.data?.hasta ?? null), zona: c.data?.zona };
}
