import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { decididoVigente, SECCION_DE, SIN_DECIDIR, TIPO_DE, type Decidido, type Destacado, type FilaDestacada, type TipoFicha } from "@/lib/destacados";
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

export async function cargarFichas<S extends keyof FilaDe>(seccion: S, l: Lista): Promise<Cargado<FilaDe[S]> & { destacados: FilaDestacada[]; decididos: Map<string, Decidido> }> {
  const supabase = (await clienteServidor())!;
  // Con el filtro Destacados, los renglones salen de panel_destacados (docs/rediseno/20, A5).
  const [f, c, d] = await Promise.all([
    l.filtro === "destacados" ? Promise.resolve({ data: [], error: null }) : supabase.rpc(`panel_${seccion}`, { p_buscar: l.q, p_filtro: l.filtro, p_limite: Math.max(l.n, PAGINA_PANEL), p_desde: 0 }),
    supabase.rpc("panel_fichas_conteos", { p_tipo: seccion }),
    supabase.rpc("panel_destacados", { p_tipo: seccion }),
  ]);
  const filas = (f.data ?? []) as FilaDe[S][];
  // `panel_eventos` no devuelve la zona de cada evento (migración 0028) ni si su lugar se ve: se leen aparte, y así la hora
  // se escribe en la zona del evento y «Destacar» no se ofrece donde la tira no lo mostraría. El administrador lee todo.
  if (seccion === "eventos" && filas.length) {
    const eventos = filas as EventoFila[];
    const leidos = await enTandas<Pick<EventoFila, "id" | "zona" | "lugar">>(eventos.map((x) => x.id), (ids) => supabase.from("eventos").select("id, zona, lugar:lugares(visible, privado)").in("id", ids).limit(ids.length));
    const porId = new Map(leidos.map((x) => [x.id, x]));
    for (const x of eventos) {
      const leido = porId.get(x.id);
      x.zona = leido?.zona;
      x.lugar = leido?.lugar;
    }
  }
  const destacados = (d.data ?? []) as FilaDestacada[];
  // Lo decidido sobre lo que se ve: el menú de cada renglón dice lo mismo que el de su ficha.
  const decididos = await leerDecididos(supabase, TIPO_DE[seccion], (l.filtro === "destacados" ? destacados : filas).map((x) => x.id));
  const conteos = c.data ? { ...(c.data as Record<string, number>), destacados: destacados.length } : null;
  return { filas, total: Number(filas[0]?.total ?? 0), conteos, error: !!f.error || (l.filtro === "destacados" && !!d.error), destacados, decididos };
}

/**
 * Para el menú de una ficha: lo que decidió la administración, si sigue vigente, con su plazo y su fecha (los repone
 * Deshacer); si está en la tira de su ciudad y por qué; y la zona de la ficha para escribir las fechas. Los artistas no
 * tienen zona.
 */
export async function cargarDestacado(tipo: TipoFicha, id: string): Promise<{ enTira: Destacado | null; decidido: Decidido; zona?: string }> {
  const supabase = (await clienteServidor())!;
  const seccion = SECCION_DE[tipo];
  const [c, decididos] = await Promise.all([
    supabase.from(seccion).select(tipo === "artista" ? "ciudad" : "ciudad, zona").eq("id", id).maybeSingle<{ ciudad: string; zona?: string }>(),
    leerDecididos(supabase, tipo, [id]),
  ]);
  const t = c.data ? await supabase.rpc("tira_destacados", { p_tipo: seccion, p_ciudad: c.data.ciudad }) : { data: [] };
  return { enTira: ((t.data ?? []) as Destacado[]).find((d) => d.id === id) ?? null, decidido: decididos.get(id) ?? SIN_DECIDIR, zona: c.data?.zona };
}

/** Lo decidido vigente sobre estas fichas, por id: la administración lee la tabla. */
async function leerDecididos(supabase: SupabaseClient, tipo: TipoFicha, ids: string[]): Promise<Map<string, Decidido>> {
  const renglones = await enTandas<{ id: string; quitado: boolean; hasta: string | null; creado_en: string }>(ids, (tanda) => supabase.from("destacados").select(`id:${tipo}_id, quitado, hasta, creado_en`).in(`${tipo}_id`, tanda));
  return new Map(renglones.map((r) => [r.id, decididoVigente(r)]));
}

/** Lee por ids en tandas de 100, para no alargar la dirección de la consulta. */
async function enTandas<T>(ids: string[], leer: (tanda: string[]) => PromiseLike<{ data: unknown[] | null }>): Promise<T[]> {
  const tandas = Array.from({ length: Math.ceil(ids.length / 100) }, (_, i) => ids.slice(i * 100, (i + 1) * 100));
  const leidas = await Promise.all(tandas.map(leer));
  return leidas.flatMap((r) => (r.data ?? []) as T[]);
}
