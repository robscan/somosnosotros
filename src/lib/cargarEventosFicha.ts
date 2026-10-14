import "server-only";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventoAgenda } from "./agenda";
import { COLUMNAS_EVENTO_LISTA, completarEventos, type FilaEvento } from "./cargarAgenda";
import { filtroSinPasar } from "./fechas";
import { clienteServidor } from "./supabase/servidor";

/**
 * Los próximos eventos de una ficha de lugar o de artista (OL-410, lo firmado en OL-409): la misma consulta y lo mismo que lee Agenda
 * (`COLUMNAS_EVENTO_LISTA` y `completarEventos`: clase, festival, horario por día, horario de las exposiciones, programa de los festivales y
 * cuántos van), más los festivales de sus actos que no son de la ficha, para armar su bloque (`eventosDeFicha`). Antes cada ficha pedía los
 * eventos sin clase, sin `evento_padre_id` ni sesiones y los pintaba todos como puntuales. Memoizadas con `cache()` de React: los números, la
 * sección y el mapa de la ficha las piden por separado, en `<Suspense>` distintos, y es una sola lectura por petición.
 */

export type EventosDeFichaCargados = {
  /** Los de la ficha: del lugar o en los que está el artista; visibles y sin pasar, en orden de agenda. */
  eventos: EventoAgenda[];
  /** Los festivales de sus actos que no están entre ellos (visibles), para armar el bloque de cada uno. */
  marcos: EventoAgenda[];
};

/** Cuántos se leen como mucho: de sobra para una ficha (antes 30; un festival con muchas funciones aquí no debe dejar fuera lo demás). */
export const TOPE_FICHA = 60;

const VACIO: EventosDeFichaCargados = { eventos: [], marcos: [] };

/** Completa lo leído y trae los festivales de sus actos que falten; todo en la misma tanda de `completarEventos`. */
async function armar(supabase: SupabaseClient, filas: FilaEvento[]): Promise<EventosDeFichaCargados> {
  if (filas.length === 0) return VACIO;
  const propios = new Set(filas.map((f) => f.id));
  const faltan = [...new Set(filas.map((f) => f.evento_padre_id).filter((x): x is string => !!x && !propios.has(x)))];
  const { data } = faltan.length ? await supabase.from("eventos").select(COLUMNAS_EVENTO_LISTA).in("id", faltan).eq("visible", true).limit(faltan.length) : { data: [] };
  const padres = ((data ?? []) as unknown as FilaEvento[]).filter((m) => m.clase === "festival");
  const todos = await completarEventos(supabase, [...filas, ...padres]);
  return { eventos: todos.filter((e) => propios.has(e.id)), marcos: todos.filter((e) => !propios.has(e.id)) };
}

/** Los próximos eventos con su `lugar_id` en ese lugar. */
export const cargarEventosDeLugar = cache(async (lugarId: string): Promise<EventosDeFichaCargados> => {
  const supabase = await clienteServidor();
  if (!supabase) return VACIO;
  const { data } = await supabase.from("eventos").select(COLUMNAS_EVENTO_LISTA).eq("lugar_id", lugarId).eq("visible", true).or(filtroSinPasar()).order("inicio").order("titulo").order("id").limit(TOPE_FICHA);
  return armar(supabase, (data ?? []) as unknown as FilaEvento[]);
});

/** Las próximas fechas en las que se presenta el artista (por `eventos_artistas`); el filtro no viaja a la lista. */
export const cargarEventosDeArtista = cache(async (artistaId: string): Promise<EventosDeFichaCargados> => {
  const supabase = await clienteServidor();
  if (!supabase) return VACIO;
  const { data } = await supabase
    .from("eventos")
    .select(`${COLUMNAS_EVENTO_LISTA}, eventos_artistas!inner(artista_id)`)
    .eq("eventos_artistas.artista_id", artistaId)
    .eq("visible", true)
    .or(filtroSinPasar())
    .order("inicio")
    .order("titulo")
    .order("id")
    .limit(TOPE_FICHA);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- el filtro por artista no viaja al renglón
  const filas = ((data ?? []) as unknown as (FilaEvento & { eventos_artistas?: unknown })[]).map(({ eventos_artistas, ...f }) => f);
  return armar(supabase, filas);
});
