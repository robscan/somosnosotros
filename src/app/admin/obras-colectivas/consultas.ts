import { clienteServidor } from "@/lib/supabase/servidor";

/** Lo que la lista de Obras colectivas necesita de cada una. Un lugar puede abrir varias con el tiempo (founder,
 * 2026-09-21: "un lugar puede abrir nuevas obras colectivas... que pueden distinguirse por la fecha/hora") —
 * `creadoEn` es lo que las distingue en la lista. */
export type ObraFila = { id: string; nombre: string; estado: "abierta" | "cerrada"; lugarNombre: string; zona: string; creadoEn: string };

function unLugar<T>(l: T | T[] | null): T | null {
  return Array.isArray(l) ? (l[0] ?? null) : l;
}

/** Todas las obras: la abierta de cada lugar arriba, luego las cerradas de más reciente a más vieja — el mismo
 * orden "lo activo primero" que ya usa el resto del panel. Sin paginar: no se espera que haya muchas a la vez. */
export async function cargarObras(): Promise<{ obras: ObraFila[]; error: boolean }> {
  const supabase = await clienteServidor();
  if (!supabase) return { obras: [], error: true };
  const { data, error } = await supabase
    .from("obras_colectivas")
    .select("id, nombre, estado, zona, creado_en, lugar:lugares(nombre)")
    .order("estado", { ascending: true }) // "abierta" ordena antes que "cerrada"
    .order("creado_en", { ascending: false });
  if (error) return { obras: [], error: true };
  const filas = (data ?? []) as unknown as Array<{
    id: string;
    nombre: string;
    estado: "abierta" | "cerrada";
    zona: string;
    creado_en: string;
    lugar: { nombre: string } | { nombre: string }[] | null;
  }>;
  return {
    obras: filas.map((f) => ({ id: f.id, nombre: f.nombre, estado: f.estado, zona: f.zona, creadoEn: f.creado_en, lugarNombre: unLugar(f.lugar)?.nombre ?? "" })),
    error: false,
  };
}

/** Lo que "Crear obra aquí" necesita de cada lugar visible: para elegir uno y sugerir el más cercano. */
export type LugarParaObra = { id: string; nombre: string; lat: number; lng: number; zona: string };

export async function cargarLugaresParaObra(): Promise<LugarParaObra[]> {
  const supabase = await clienteServidor();
  if (!supabase) return [];
  const { data } = await supabase.from("lugares").select("id, nombre, lat, lng, zona").eq("visible", true).order("nombre");
  return (data ?? []) as LugarParaObra[];
}

export type ObraDetalle = {
  id: string;
  nombre: string;
  estado: "abierta" | "cerrada";
  cierraEn: string;
  zona: string;
  lugarNombre: string;
  creadoEn: string;
  cerradoEn: string | null;
  imagenFinal: string | null;
  cupoMandos: number;
};

export async function cargarObra(id: string): Promise<ObraDetalle | null> {
  const supabase = await clienteServidor();
  if (!supabase) return null;
  const { data } = await supabase
    .from("obras_colectivas")
    .select("id, nombre, estado, cierra_en, zona, creado_en, cerrado_en, imagen_final, cupo_mandos, lugar:lugares(nombre)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const fila = data as unknown as {
    id: string;
    nombre: string;
    estado: "abierta" | "cerrada";
    cierra_en: string;
    zona: string;
    creado_en: string;
    cerrado_en: string | null;
    imagen_final: string | null;
    cupo_mandos: number;
    lugar: { nombre: string } | { nombre: string }[] | null;
  };
  return {
    id: fila.id,
    nombre: fila.nombre,
    estado: fila.estado,
    cierraEn: fila.cierra_en,
    zona: fila.zona,
    creadoEn: fila.creado_en,
    cerradoEn: fila.cerrado_en,
    imagenFinal: fila.imagen_final,
    cupoMandos: fila.cupo_mandos,
    lugarNombre: unLugar(fila.lugar)?.nombre ?? "",
  };
}
