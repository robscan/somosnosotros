import { BUCKET_INSTANTANEAS, instantaneaVigente, rutaInstantanea } from "@/lib/pincel";
import { clienteServidor } from "@/lib/supabase/servidor";

/** Tope global de Pincel (OL-121, founder 2026-09-22): como mucho 2 obras abiertas a la vez y 40 mandos en total
 * entre todas — lo mismo que hace cumplir el disparador `obras_colectivas_freno` de la migración
 * 20260922180000_pincel_freno.sql. Están repetidos aquí (no hay una vista de la base que los devuelva) solo para
 * que la pantalla explique el freno antes de que la base lo rechace, no para relajarlo: la base manda siempre.
 */
export const TOPE_OBRAS_ABIERTAS = 2;
export const TOPE_MANDOS_GLOBAL = 40;

function unPerfil<T>(p: T | T[] | null): T | null {
  return Array.isArray(p) ? (p[0] ?? null) : p;
}

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
    obras: filas.map((f) => ({ id: f.id, nombre: f.nombre, estado: f.estado, zona: f.zona, creadoEn: f.creado_en, lugarNombre: unLugar(f.lugar)?.nombre ?? "Ubicación propia" })),
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

/** Cuántas obras están abiertas ahora y cuántos mandos suman entre todas (OL-121): lo que "Crear obra aquí" y el
 * campo de cupo necesitan para explicar el freno antes de que la base lo rechace. `null` si no se pudo leer — la
 * pantalla, en ese caso, no bloquea nada (la base sigue exigiéndolo igual). */
export type EstadoGlobalPincel = { abiertas: number; mandosAbiertos: number };

export async function cargarEstadoGlobalPincel(): Promise<EstadoGlobalPincel | null> {
  const supabase = await clienteServidor();
  if (!supabase) return null;
  const { data, error } = await supabase.from("obras_colectivas").select("cupo_mandos").eq("estado", "abierta");
  if (error) return null;
  const filas = (data ?? []) as { cupo_mandos: number }[];
  return { abiertas: filas.length, mandosAbiertos: filas.reduce((total, f) => total + f.cupo_mandos, 0) };
}

/** El interruptor «Pincel apagado» (OL-121): quién lo cambió por última vez y cuándo, para el renglón de
 * Administración. `cambiadoPorNombre` es null si lo puso la propia migración (nunca lo tocó una cuenta). */
export type AjustePincel = { activo: boolean; cambiadoPorNombre: string | null; cambiadoEn: string };

export async function cargarAjustePincel(): Promise<AjustePincel | null> {
  const supabase = await clienteServidor();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("ajustes_sitio")
    .select("valor, cambiado_en, cambiado_por:perfiles(nombre)")
    .eq("clave", "pincel_activo")
    .maybeSingle();
  if (error || !data) return null;
  const fila = data as unknown as { valor: boolean; cambiado_en: string; cambiado_por: { nombre: string } | { nombre: string }[] | null };
  return { activo: fila.valor === true, cambiadoPorNombre: unPerfil(fila.cambiado_por)?.nombre ?? null, cambiadoEn: fila.cambiado_en };
}

export type ObraDetalle = {
  id: string;
  nombre: string;
  estado: "abierta" | "cerrada";
  cierraEn: string;
  zona: string;
  lugarNombre: string;
  /** Coordenadas propias (OL-127) cuando la obra no tiene lugar del directorio; null si tiene lugar. */
  coordenadas: { lat: number; lng: number } | null;
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
    .select("id, nombre, estado, cierra_en, zona, creado_en, cerrado_en, imagen_final, cupo_mandos, lat, lng, lugar:lugares(nombre)")
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
    lat: number | null;
    lng: number | null;
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
    lugarNombre: unLugar(fila.lugar)?.nombre ?? "Ubicación propia",
    coordenadas: !unLugar(fila.lugar) && typeof fila.lat === "number" && typeof fila.lng === "number" ? { lat: fila.lat, lng: fila.lng } : null,
  };
}

/**
 * La instantánea de la pared (OL-126, parte 4): el PNG que la pared sube al bucket privado «obras» mientras la obra
 * está abierta y que se queda como resultado al terminarla. Con la sesión de administración (la política del bucket
 * solo deja leer a administración): si existe, una URL firmada de 10 minutos para enseñarla chica en la ficha, y
 * cuándo se subió por última vez. Sin instantánea (o sin sesión), null.
 */
export async function cargarInstantanea(obraId: string): Promise<{ url: string; actualizadoEn: string } | null> {
  const supabase = await clienteServidor();
  if (!supabase) return null;
  // OL-134: la miniatura sigue la misma regla que la pared — una instantánea anterior al último «Borrar la pared»
  // es la composición vieja y no se enseña (la acción de servidor ya borra el archivo; esto cubre una subida tardía).
  const [{ data: lista }, { data: fila }] = await Promise.all([
    supabase.storage.from(BUCKET_INSTANTANEAS).list(obraId, { search: "pared.png" }),
    supabase.from("obras_colectivas").select("borrado_pared_en").eq("id", obraId).maybeSingle(),
  ]);
  const archivo = lista?.find((a) => a.name === "pared.png");
  if (!archivo) return null;
  const registrado = (fila as { borrado_pared_en?: string | null } | null)?.borrado_pared_en ?? null;
  if (!instantaneaVigente(archivo.updated_at ?? archivo.created_at ?? null, registrado)) return null;
  const { data } = await supabase.storage.from(BUCKET_INSTANTANEAS).createSignedUrl(rutaInstantanea(obraId), 600);
  if (!data?.signedUrl) return null;
  return { url: data.signedUrl, actualizadoEn: archivo.updated_at ?? archivo.created_at ?? new Date().toISOString() };
}
