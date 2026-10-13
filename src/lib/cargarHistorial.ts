import "server-only";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { clienteServidor } from "./supabase/servidor";
import { TOPE_HISTORIAL, type ArtistaDelEvento, type EventoPasado, type Historial, type LugarDelEvento } from "./historialFichas";

/**
 * La lectura de lo que ya pasó en una ficha (OL-390): la «Trayectoria» de un artista y el «Historial» de un lugar. Una consulta aparte de la de
 * lo próximo, ordenada por `inicio` de lo más reciente a lo más viejo y con tope amplio (`TOPE_HISTORIAL`; si se llena, la cabecera lo dice).
 * Pasado es lo que ya terminó (`termina < ahora`, la misma regla que `eventoPaso` y `filtroSinPasar`); solo lo visible y no borrador. Un acto de
 * festival cuenta como evento propio; una exposición, una vez (por su inicio). Después, en paralelo: los artistas de esos eventos, el título de
 * sus festivales y cuántos dijeron «Voy» (una sola llamada a `van_por_evento`, la misma que el «Fueron» de la ficha del evento en pasado).
 * Memoizadas con `cache()` de React: los números y la sección las piden por separado, en `<Suspense>` distintos.
 */

// `cancelado` (OL-391): lo que se marcó «se canceló» viene igual (se queda en la lista, tachado) y las cuentas lo apartan (`realizados`).
const COLUMNAS = "id, slug, titulo, inicio, fin, zona, imagen, lugar_id, sitio_texto, sitio_direccion, sitio_reservado, cancelado, evento_padre_id, lugar:lugares(id, slug, nombre, portada)";
/** Cuántos ids van en un `in` por la URL (200 UUID pasan de los 7 000 caracteres). */
const TANDA = 100;

type Fila = Omit<EventoPasado, "lugar" | "festival" | "artistas" | "van"> & {
  evento_padre_id: string | null;
  lugar: LugarDelEvento | LugarDelEvento[] | null;
  /** Solo en la trayectoria: el filtro por artista (no se usa). */
  eventos_artistas?: unknown;
};
type FilaArtista = { evento_id: string; orden: number | null; artista: ArtistaDelEvento | ArtistaDelEvento[] | null };

const uno = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

/** Lee en tandas lo que se pide con un `in` de ids y junta las filas. */
async function enTandas<T>(ids: string[], leer: (tanda: string[]) => PromiseLike<{ data: unknown }>): Promise<T[]> {
  const tandas: string[][] = [];
  for (let i = 0; i < ids.length; i += TANDA) tandas.push(ids.slice(i, i + TANDA));
  const respuestas = await Promise.all(tandas.map((t) => leer(t)));
  return respuestas.flatMap((r) => (r.data ?? []) as T[]);
}

/** Lo que falta de cada fila: sus artistas, su festival y cuántos fueron. */
async function completar(supabase: SupabaseClient, filas: Fila[]): Promise<EventoPasado[]> {
  if (filas.length === 0) return [];
  const ids = filas.map((f) => f.id);
  const padres = [...new Set(filas.map((f) => f.evento_padre_id).filter((x): x is string => !!x))];
  const [artistas, festivales, van] = await Promise.all([
    enTandas<FilaArtista>(ids, (t) => supabase.from("eventos_artistas").select("evento_id, orden, artista:artistas(id, slug, nombre, foto)").in("evento_id", t).order("orden").limit(1000)),
    padres.length ? enTandas<{ id: string; titulo: string }>(padres, (t) => supabase.from("eventos").select("id, titulo").in("id", t).limit(t.length)) : Promise.resolve([]),
    supabase.rpc("van_por_evento", { ids }).then((r) => (r.data ?? []) as { evento_id: string; n: number }[]),
  ]);
  const porEvento = new Map<string, ArtistaDelEvento[]>();
  for (const f of [...artistas].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))) {
    const a = uno(f.artista);
    if (!a) continue; // un artista oculto no llega
    porEvento.set(f.evento_id, [...(porEvento.get(f.evento_id) ?? []), a]);
  }
  const titulos = new Map(festivales.map((f) => [f.id, f.titulo]));
  const cuantos = new Map(van.map((v) => [v.evento_id, Number(v.n)]));
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- el filtro por artista no viaja al renglón
  return filas.map(({ evento_padre_id, lugar, eventos_artistas, ...f }) => ({
    ...f,
    cancelado: f.cancelado === true,
    lugar: uno(lugar),
    festival: evento_padre_id ? (titulos.get(evento_padre_id) ?? null) : null,
    artistas: porEvento.get(f.id) ?? [],
    van: cuantos.get(f.id) ?? 0,
  }));
}

async function leerHistorial(consulta: (supabase: SupabaseClient, ahora: string) => PromiseLike<{ data: unknown }>): Promise<Historial> {
  const supabase = await clienteServidor();
  if (!supabase) return { eventos: [], lleno: false };
  const { data } = await consulta(supabase, new Date().toISOString());
  const filas = (data ?? []) as Fila[];
  return { eventos: await completar(supabase, filas), lleno: filas.length >= TOPE_HISTORIAL };
}

/** La trayectoria de un artista: sus fechas pasadas (por `eventos_artistas`). */
export const cargarTrayectoria = cache((artistaId: string) =>
  leerHistorial((supabase, ahora) =>
    supabase
      .from("eventos")
      .select(`${COLUMNAS}, eventos_artistas!inner(artista_id)`)
      .eq("eventos_artistas.artista_id", artistaId)
      .eq("visible", true)
      .eq("borrador", false)
      .lt("termina", ahora)
      .order("inicio", { ascending: false })
      .order("id")
      .limit(TOPE_HISTORIAL),
  ),
);

/** El historial de un lugar: los eventos pasados con su `lugar_id`. */
export const cargarHistorialLugar = cache((lugarId: string) =>
  leerHistorial((supabase, ahora) =>
    supabase.from("eventos").select(COLUMNAS).eq("lugar_id", lugarId).eq("visible", true).eq("borrador", false).lt("termina", ahora).order("inicio", { ascending: false }).order("id").limit(TOPE_HISTORIAL),
  ),
);
