import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sedesDeFestival, sedesParaLista, type ActoConSitio, type Sede } from "./sedesFestival";

/**
 * Los actos publicados de unos festivales con lo que dice dónde es cada uno (OL-339), en una sola consulta, para derivar sus sedes al leer
 * (`sedesDeFestival`). La usan la agenda (que de paso cuenta el programa), Buscar, «Tus planes», el .ics, el cartel y la vista previa al compartir.
 * Opcional como todo lo de clase: si falla, null, y cada pantalla dice lo capturado en el marco, como antes.
 */

/** Lo que se pide de cada acto: su festival, cuándo empieza (el orden) y su sitio, con el lugar del directorio anidado. */
const COLUMNAS = "evento_padre_id, inicio, lugar_id, sitio_texto, sitio_direccion, sitio_lat, sitio_lng, sitio_reservado, lugar:lugares(id, slug, nombre, direccion, lat, lng)";

type Fila = ActoConSitio & { evento_padre_id: string; lugar: ActoConSitio["lugar"] | NonNullable<ActoConSitio["lugar"]>[] };

/** Los actos publicados (visibles; un borrador nunca lo es) de cada festival, por su id. null si no se pudieron leer. */
export async function cargarActosDeMarcos(supabase: SupabaseClient, marcos: readonly string[]): Promise<Map<string, ActoConSitio[]> | null> {
  const porMarco = new Map<string, ActoConSitio[]>(marcos.map((id) => [id, []]));
  if (!marcos.length) return porMarco;
  try {
    // Tope de sobra (100 actos por festival en la ficha, unos pocos festivales a la vez) contra el corte silencioso de PostgREST.
    const { data, error } = await supabase.from("eventos").select(COLUMNAS).in("evento_padre_id", [...marcos]).eq("visible", true).order("inicio").limit(1000);
    if (error || !Array.isArray(data)) throw new Error("sin actos");
    for (const { evento_padre_id, lugar, ...acto } of data as unknown as Fila[]) {
      porMarco.get(evento_padre_id)?.push({ ...acto, lugar: Array.isArray(lugar) ? (lugar[0] ?? null) : lugar });
    }
    return porMarco;
  } catch {
    console.warn("[sedes] lectura no disponible: actos de festivales");
    return null;
  }
}

/** Las sedes de cada festival, derivadas de sus actos (sin respaldo: sin actos con sitio, el festival dice lo suyo de siempre). */
export async function cargarSedes(supabase: SupabaseClient, marcos: readonly string[]): Promise<Map<string, Sede[]> | null> {
  const actos = await cargarActosDeMarcos(supabase, marcos);
  return actos && new Map([...actos].map(([id, lista]) => [id, sedesDeFestival(lista)]));
}

/**
 * Las sedes de los festivales de una lista, puestas en cada marco (`sedes`, lo que lee `nombreSitio`), en una consulta; lo demás, tal cual y en
 * el mismo orden. Para las listas que no cargan la agenda (Buscar, «Tus planes»). Un evento sin la clase (una consulta que no la pide) se pregunta
 * igual: solo un festival tiene actos.
 */
export async function conSedes<T extends { id: string; clase?: string | null }>(supabase: SupabaseClient, eventos: T[]): Promise<(T & { sedes?: { nombre: string }[] })[]> {
  const marcos = eventos.filter((e) => e.clase === "festival" || e.clase === undefined).map((e) => e.id);
  if (!marcos.length) return eventos;
  const sedes = await cargarSedes(supabase, marcos);
  if (!sedes) return eventos;
  return eventos.map((e) => {
    const suyas = sedes.get(e.id);
    return suyas?.length ? { ...e, sedes: sedesParaLista(suyas) } : e;
  });
}
