import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Asistencia } from "./deslizar";
import type { Ciudad } from "./ciudad";
import type { EventoAgenda } from "./agenda";
import { type Destacado } from "./destacados";
import { filtroSinPasar } from "./fechas";
import { clienteServidor } from "./supabase/servidor";

const TOPE_AGENDA = 300;

type Fila = Omit<EventoAgenda, "lugar" | "van"> & {
  lugar: EventoAgenda["lugar"] | EventoAgenda["lugar"][];
};

export type Agenda = {
  eventos: EventoAgenda[];
  /** Lugares que la persona sigue; null = sin sesión. */
  seguidos: string[] | null;
  /** Eventos de los artistas que sigue (con sesión). */
  eventosSeguidos: string[];
  /** Artistas seguidos de la misma lectura; null = sin sesión. */
  artistasSeguidos: string[] | null;
  /** Lo que la persona decidió en los eventos cargados; null = sin sesión. */
  asistencias: Record<string, Exclude<Asistencia, null>> | null;
  destacados: Destacado[];
};

/** Distingue un vacío confirmado de un fallo; las trazas nunca incluyen la respuesta remota. */
async function leer<T>(consulta: PromiseLike<{ data: T[] | null; error?: unknown }>, recurso: string, necesaria = false): Promise<T[] | null> {
  try {
    const respuesta = await consulta;
    if (!respuesta.error && Array.isArray(respuesta.data)) return respuesta.data;
  } catch {
    // También cubre transportes que rechazan la promesa en vez de devolver PostgrestError.
  }
  console.warn(`[agenda] lectura no disponible: ${recurso}`);
  if (necesaria) throw new Error("No pudimos cargar la agenda.");
  return null;
}

/**
 * La agenda de una ciudad: eventos próximos con su lugar, cuántos van, lo que la persona sigue y lo que decidió en
 * cada evento. Extraído de `src/app/page.tsx` (OL-153, bitácora 188) para que Inicio reutilice la misma consulta en
 * vez de repetirla: los dos comparten exactamente estos datos (favoritos y destacados de Inicio salen de aquí).
 */
export async function cargarAgenda(ciudad: Ciudad, usuarioId: string | null, supabaseDado?: SupabaseClient | null): Promise<Agenda> {
  const supabase = supabaseDado !== undefined ? supabaseDado : await clienteServidor();
  if (!supabase) {
    console.warn("[agenda] cliente no disponible");
    throw new Error("No pudimos cargar la agenda.");
  }
  // Solo la ciudad (decisión "sin segunda ciudad"); cuántos van se cuenta en la base para los eventos cargados,
  // nunca trayendo todas las asistencias (PostgREST corta en 1 000 filas sin avisar).
  // Los empates de hora se desempatan también en la base (título, id) para que el corte de 300 no cambie entre cargas.
  const [e, s, destacados] = await Promise.all([
    leer(supabase.from("eventos").select("id, slug, titulo, inicio, fin, zona, imagen, precio, lugar_id, sitio_texto, sitio_direccion, sitio_reservado, creado_en, ciudad, lugar:lugares(nombre, portada)").eq("visible", true).eq("ciudad", ciudad.nombre).or(filtroSinPasar()).order("inicio").order("titulo").order("id").limit(TOPE_AGENDA), "eventos", true),
    // Lo que sigue una sola persona: tope de sobra para no depender del corte silencioso de PostgREST.
    usuarioId ? leer(supabase.from("seguimientos").select("lugar_id, artista_id").eq("usuario_id", usuarioId).limit(1000), "seguimientos propios", true) : Promise.resolve(null),
    leer<Destacado>(supabase.rpc("tira_destacados", { p_tipo: "eventos", p_ciudad: ciudad.nombre }), "destacados"),
  ]);
  // Señal preventiva para abrir la pieza de filtros/paginación antes de alcanzar el corte (OL-268).
  if ((e?.length ?? 0) >= TOPE_AGENDA * 0.9) console.warn("[agenda] capacidad: lectura al 90% del tope");
  const ids = (e ?? []).map((x) => x.id as string);
  // Cuántos van y, con sesión, qué decidió la persona en esos eventos (se ve en el renglón y cambia al deslizar).
  const [a, m] = await Promise.all([
    ids.length ? leer<{ evento_id: string; n: number }>(supabase.rpc("van_por_evento", { ids }), "recuento de asistentes") : Promise.resolve([]),
    usuarioId && ids.length ? leer(supabase.from("asistencias").select("evento_id, estado").eq("usuario_id", usuarioId).in("evento_id", ids).limit(1000), "asistencias propias", true) : Promise.resolve([]),
  ]);
  const asistencias: Record<string, Exclude<Asistencia, null>> | null = usuarioId ? {} : null;
  for (const fila of (m ?? []) as { evento_id: string; estado: string }[]) {
    if (asistencias && (fila.estado === "voy" || fila.estado === "me_interesa")) asistencias[fila.evento_id] = fila.estado;
  }
  const seguimientos = (s ?? []) as { lugar_id: string | null; artista_id: string | null }[];
  const artistasSeguidos = seguimientos.map((x) => x.artista_id).filter((x): x is string => !!x);
  // Eventos en los que se presenta un artista que sigue: entran en "Siguiendo" (Artistas, decisión 10).
  // Tope de sobra (más artistas seguidos que fechas cabrían) para no depender del corte silencioso de PostgREST.
  const ea = artistasSeguidos.length ? await leer(supabase.from("eventos_artistas").select("evento_id").in("artista_id", artistasSeguidos).limit(1000), "eventos de artistas seguidos", true) : [];
  const eventosSeguidos = [...new Set((ea ?? []).map((x) => x.evento_id as string))];
  const van = new Map<string, number>();
  for (const fila of (a ?? []) as { evento_id: string; n: number }[]) van.set(fila.evento_id, Number(fila.n));
  const eventos: EventoAgenda[] = [];
  for (const fila of (e ?? []) as unknown as (Fila & { ciudad: string })[]) {
    const lugar = Array.isArray(fila.lugar) ? (fila.lugar[0] ?? null) : fila.lugar;
    eventos.push({ ...fila, lugar, van: a === null ? null : (van.get(fila.id) ?? 0) });
  }
  const seguidos = usuarioId ? seguimientos.map((x) => x.lugar_id).filter((x): x is string => !!x) : null;
  return { eventos, seguidos, eventosSeguidos, artistasSeguidos: usuarioId ? artistasSeguidos : null, asistencias, destacados: destacados ?? [] };
}
