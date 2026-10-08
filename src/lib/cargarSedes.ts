import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { portadaDeFestival, sedesDeFestival, sedesParaLista, type ActoConSitio, type Sede } from "./sedesFestival";

/**
 * Los actos publicados de unos festivales con lo que dice dónde es cada uno (OL-339) y su cartel (OL-346), en una sola consulta, para derivar al
 * leer sus sedes (`sedesDeFestival`) y la portada de un festival sin imagen propia (`portadaDeFestival`). La usan la agenda (que de paso cuenta el
 * programa), Buscar, «Tus planes», el .ics, el cartel y la vista previa al compartir. Opcional como todo lo de clase: si falla, null, y cada
 * pantalla dice lo capturado en el marco, como antes.
 */

/** Lo que se pide de cada acto: su festival, cuándo empieza (el orden), su sitio, con el lugar del directorio anidado, y su cartel. */
const COLUMNAS = "evento_padre_id, inicio, imagen, lugar_id, sitio_texto, sitio_direccion, sitio_lat, sitio_lng, sitio_reservado, lugar:lugares(id, slug, nombre, direccion, lat, lng)";

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
 * Lo que un festival de una lista toma de sus actos, en una consulta: sus sedes (`sedes`, lo que lee `nombreSitio`) y, sin imagen propia, el cartel
 * de su próximo acto (`portadaActo`, lo que lee `fotoDeEvento`, OL-346); lo demás, tal cual y en el mismo orden. Para las listas que no cargan la
 * agenda (Buscar, sus recientes, «Tus planes»). Un evento sin la clase (una consulta que no la pide) se pregunta igual: solo un festival tiene actos.
 */
export async function conLoDeSusActos<T extends { id: string; clase?: string | null; imagen?: string | null }>(supabase: SupabaseClient, eventos: T[], ahora: Date = new Date()): Promise<(T & { sedes?: { nombre: string }[]; portadaActo?: string })[]> {
  const marcos = eventos.filter((e) => e.clase === "festival" || e.clase === undefined).map((e) => e.id);
  if (!marcos.length) return eventos;
  const actos = await cargarActosDeMarcos(supabase, marcos);
  if (!actos) return eventos;
  return eventos.map((e) => {
    const suyos = actos.get(e.id);
    if (!suyos?.length) return e;
    const sedes = sedesDeFestival(suyos);
    const portada = e.imagen ? null : portadaDeFestival(suyos, ahora);
    return { ...e, ...(sedes.length ? { sedes: sedesParaLista(sedes) } : {}), ...(portada ? { portadaActo: portada } : {}) };
  });
}
