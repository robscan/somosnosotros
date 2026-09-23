import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Asistencia } from "./deslizar";
import type { Ciudad } from "./ciudad";
import type { EventoAgenda } from "./agenda";
import { leerTira, type Destacado } from "./destacados";
import { filtroSinPasar } from "./fechas";
import { clienteServidor } from "./supabase/servidor";

type Fila = Omit<EventoAgenda, "lugar" | "van" | "lat" | "lng" | "artistas"> & {
  sitio_lat: number | null;
  sitio_lng: number | null;
  lugar: EventoAgenda["lugar"] | EventoAgenda["lugar"][];
  artistas: { artista: { nombre: string } | { nombre: string }[] | null }[] | null;
};

export type Agenda = {
  eventos: EventoAgenda[];
  /** Lugares que la persona sigue; null = sin sesión. */
  seguidos: string[] | null;
  /** Eventos de los artistas que sigue (con sesión). */
  eventosSeguidos: string[];
  /** Lo que la persona decidió en los eventos cargados; null = sin sesión. */
  asistencias: Record<string, Exclude<Asistencia, null>> | null;
  destacados: Destacado[];
};

/**
 * La agenda de una ciudad: eventos próximos con su lugar, cuántos van, lo que la persona sigue y lo que decidió en
 * cada evento. Extraído de `src/app/page.tsx` (OL-153, bitácora 188) para que Inicio reutilice la misma consulta en
 * vez de repetirla: los dos comparten exactamente estos datos (favoritos y destacados de Inicio salen de aquí).
 */
export async function cargarAgenda(ciudad: Ciudad, usuarioId: string | null, supabaseDado?: SupabaseClient | null): Promise<Agenda> {
  const supabase = supabaseDado !== undefined ? supabaseDado : await clienteServidor();
  if (!supabase) return { eventos: [], seguidos: usuarioId ? [] : null, eventosSeguidos: [], asistencias: usuarioId ? {} : null, destacados: [] };
  // Solo la ciudad (decisión "sin segunda ciudad"); cuántos van se cuenta en la base para los eventos cargados,
  // nunca trayendo todas las asistencias (PostgREST corta en 1 000 filas sin avisar).
  // Los empates de hora se desempatan también en la base (título, id) para que el corte de 300 no cambie entre cargas.
  const [e, s, destacados] = await Promise.all([
    supabase.from("eventos").select("id, slug, titulo, inicio, fin, zona, imagen, precio, lugar_id, sitio_texto, sitio_direccion, sitio_reservado, sitio_lat, sitio_lng, creado_en, ciudad, lugar:lugares(nombre, portada, lat, lng), artistas:eventos_artistas(artista:artistas(nombre))").eq("visible", true).eq("ciudad", ciudad.nombre).or(filtroSinPasar()).order("inicio").order("titulo").order("id").limit(300),
    // Lo que sigue una sola persona: tope de sobra para no depender del corte silencioso de PostgREST.
    usuarioId ? supabase.from("seguimientos").select("lugar_id, artista_id").eq("usuario_id", usuarioId).limit(1000) : Promise.resolve({ data: null }),
    leerTira(supabase, "eventos", ciudad.nombre),
  ]);
  const ids = (e.data ?? []).map((x) => x.id as string);
  // Cuántos van y, con sesión, qué decidió la persona en esos eventos (se ve en el renglón y cambia al deslizar).
  const [a, m] = await Promise.all([
    ids.length ? supabase.rpc("van_por_evento", { ids }) : Promise.resolve({ data: [] as { evento_id: string; n: number }[] }),
    usuarioId && ids.length ? supabase.from("asistencias").select("evento_id, estado").eq("usuario_id", usuarioId).in("evento_id", ids).limit(1000) : Promise.resolve({ data: [] as { evento_id: string; estado: string }[] }),
  ]);
  const asistencias: Record<string, Exclude<Asistencia, null>> | null = usuarioId ? {} : null;
  for (const fila of (m.data ?? []) as { evento_id: string; estado: string }[]) {
    if (asistencias && (fila.estado === "voy" || fila.estado === "me_interesa")) asistencias[fila.evento_id] = fila.estado;
  }
  const seguimientos = (s.data ?? []) as { lugar_id: string | null; artista_id: string | null }[];
  const artistasSeguidos = seguimientos.map((x) => x.artista_id).filter((x): x is string => !!x);
  // Eventos en los que se presenta un artista que sigue: entran en "Siguiendo" (Artistas, decisión 10).
  // Tope de sobra (más artistas seguidos que fechas cabrían) para no depender del corte silencioso de PostgREST.
  const ea = artistasSeguidos.length ? await supabase.from("eventos_artistas").select("evento_id").in("artista_id", artistasSeguidos).limit(1000) : { data: [] as { evento_id: string }[] };
  const eventosSeguidos = [...new Set((ea.data ?? []).map((x) => x.evento_id as string))];
  const van = new Map<string, number>();
  for (const fila of (a.data ?? []) as { evento_id: string; n: number }[]) van.set(fila.evento_id, Number(fila.n));
  const eventos: EventoAgenda[] = [];
  for (const fila of (e.data ?? []) as unknown as (Fila & { ciudad: string })[]) {
    const lugar = Array.isArray(fila.lugar) ? (fila.lugar[0] ?? null) : fila.lugar;
    // Quién se presenta, solo el nombre: sirve al buscador ("camerata" halla su concierto).
    const artistas = (fila.artistas ?? []).map((x) => (Array.isArray(x.artista) ? x.artista[0] : x.artista)?.nombre).filter((n): n is string => !!n);
    eventos.push({ ...fila, lugar, artistas, lat: fila.sitio_lat, lng: fila.sitio_lng, van: van.get(fila.id) ?? 0 });
  }
  const seguidos = usuarioId ? seguimientos.map((x) => x.lugar_id).filter((x): x is string => !!x) : null;
  return { eventos, seguidos, eventosSeguidos, asistencias, destacados };
}
