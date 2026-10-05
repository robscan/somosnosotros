import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { conProximaFecha, type ArtistaLista, type ArtistaResumen, type FechaDeArtista } from "./artistas";
import { enOrden } from "./destacados";
import type { ProveedorNovedadArtista } from "./novedadesArtista";
import { sitioEnLista } from "./eventos";
import { filtroSinPasar } from "./fechas";

/** Tope del carril "Artistas destacadxs" de Inicio (OL-156, segunda vuelta): una tira chica, no el directorio. */
export const TOPE_ARTISTAS_DESTACADOS = 12;

type EventoConLugar = { id: string; titulo: string; inicio: string; zona: string; sitio_texto: string | null; sitio_direccion: string | null; sitio_reservado: boolean; lugar: { nombre: string } | { nombre: string }[] | null };
type FilaFecha = { artista_id: string; evento: EventoConLugar | EventoConLugar[] | null };

/**
 * De una lista de ids de artista y cuántas veces aparece cada uno en `seguimientos`, los primeros `tope` de más a
 * menos seguidores; a empate, se conserva el orden de llegada (el de la consulta, ya por fecha del evento). Aparte
 * para poder probarla sin base de datos.
 */
export function ordenarPorSeguidores(ids: string[], conteo: Map<string, number>, tope: number = TOPE_ARTISTAS_DESTACADOS): string[] {
  return ids
    .map((id, indice) => ({ id, indice, n: conteo.get(id) ?? 0 }))
    .toSorted((a, b) => b.n - a.n || a.indice - b.indice)
    .slice(0, tope)
    .map((x) => x.id);
}

/**
 * Los artistas del carril "Artistas destacadxs" de Inicio, con su próxima fecha: primero la tira que elige la
 * administración, después las novedades visibles de los últimos siete días y después los asistentes (SQL OL-275).
 * Solo si los tres grupos están vacíos se usa el respaldo existente: artistas de la ciudad con más
 * seguidores entre los que tienen un evento próximo — el founder no fijó un criterio exacto para este respaldo
 * (decisión anotada en la bitácora 191, no en OPEN_LOOPS: no es una decisión del founder, es la lectura del gestor
 * de "un criterio razonable" que pidió el encargo). Un destacado exige foto (docs/rediseno/50, H-03): el artista que no la
 * tiene no entra, aunque esté en la tira; el carril puede quedar con menos de `TOPE_ARTISTAS_DESTACADOS` o vacío.
 */
export async function cargarArtistasDestacados(supabase: SupabaseClient | null, ciudad: string, ahora: Date = new Date()): Promise<ArtistaLista[]> {
  try {
    if (!supabase) throw new Error("sin cliente");
    return await leerArtistasDestacados(supabase, ciudad, ahora);
  } catch {
    console.warn("[agenda] carril de artistas destacados no disponible");
    return [];
  }
}

async function leerArtistasDestacados(supabase: SupabaseClient, ciudad: string, ahora: Date): Promise<ArtistaLista[]> {
  const [t, f1] = await Promise.all([
    supabase.rpc("artistas_destacados_novedades", { p_ciudad: ciudad }),
    supabase
      .from("eventos_artistas")
      .select("artista_id, evento:eventos!inner(id, titulo, inicio, zona, sitio_texto, sitio_direccion, sitio_reservado, lugar:lugares(nombre))")
      .eq("evento.visible", true)
      .eq("evento.ciudad", ciudad)
      .or(filtroSinPasar(ahora), { referencedTable: "evento" })
      .order("evento(inicio)")
      .order("artista_id")
      .limit(500),
  ]);
  if (t.error || !Array.isArray(t.data) || f1.error || !Array.isArray(f1.data)) throw new Error("lectura incompleta");
  const tira = t.data as { id: string; motivo: "elegido" | "novedad" | "asistentes"; van: number; novedad_id: string | null; proveedor: ProveedorNovedadArtista | null; novedad_creado_en: string | null }[];
  const fechas: FechaDeArtista[] = [];
  for (const fila of (f1.data ?? []) as unknown as FilaFecha[]) {
    const e = Array.isArray(fila.evento) ? fila.evento[0] : fila.evento;
    if (!e) continue;
    const lugar = Array.isArray(e.lugar) ? (e.lugar[0] ?? null) : e.lugar;
    fechas.push({ artista_id: fila.artista_id, evento: { id: e.id, titulo: e.titulo, inicio: e.inicio, zona: e.zona, sitio: sitioEnLista({ lugar: lugar ? { nombre: lugar.nombre, portada: null } : null, sitio_texto: e.sitio_texto, sitio_direccion: e.sitio_direccion, sitio_reservado: e.sitio_reservado }) } });
  }

  let ids: string[];
  if (tira.length) {
    ids = tira.map((d) => d.id);
  } else {
    const conProxima = [...new Set(fechas.map((f) => f.artista_id))];
    if (conProxima.length === 0) return [];
    const seguidores = await supabase.from("seguimientos").select("artista_id").in("artista_id", conProxima).not("artista_id", "is", null).limit(5000);
    if (seguidores.error || !Array.isArray(seguidores.data)) throw new Error("recuento no disponible");
    const conteo = new Map<string, number>();
    for (const fila of (seguidores.data ?? []) as { artista_id: string }[]) conteo.set(fila.artista_id, (conteo.get(fila.artista_id) ?? 0) + 1);
    ids = ordenarPorSeguidores(conProxima, conteo);
  }
  if (ids.length === 0) return [];

  const { data, error } = await supabase.from("artistas").select("id, slug, nombre, disciplina, detalle, tipo, foto").eq("visible", true).eq("ciudad", ciudad).not("foto", "is", null).in("id", ids);
  if (error || !Array.isArray(data)) throw new Error("artistas no disponibles");
  const porId = new Map(tira.map((d) => [d.id, d]));
  const artistas = conProximaFecha((data ?? []) as ArtistaResumen[], fechas).map((a) => {
    const d = porId.get(a.id);
    return { ...a, novedad: d?.novedad_id && d.proveedor && d.novedad_creado_en ? { novedad_id: d.novedad_id, proveedor: d.proveedor, creado_en: d.novedad_creado_en } : null };
  });
  return (tira.length ? enOrden(tira, artistas) : artistas).slice(0, TOPE_ARTISTAS_DESTACADOS);
}
