import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { conProximaFecha, type ArtistaLista, type ArtistaResumen, type FechaDeArtista } from "./artistas";
import { enOrden, leerTira } from "./destacados";
import { nombreSitio } from "./eventos";
import { filtroSinPasar } from "./fechas";

/** Tope del carril "Artistas destacados" de Inicio (OL-156, segunda vuelta): una tira chica, no el directorio. */
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
 * Los artistas del carril "Artistas destacados" de Inicio, con su próxima fecha: primero la tira que elige la
 * administración (el mismo criterio que ya usa `/artistas`, `leerTira`); sin tira, los artistas de la ciudad con más
 * seguidores entre los que tienen un evento próximo — el founder no fijó un criterio exacto para este respaldo
 * (decisión anotada en la bitácora 191, no en OPEN_LOOPS: no es una decisión del founder, es la lectura del gestor
 * de "un criterio razonable" que pidió el encargo).
 */
export async function cargarArtistasDestacados(supabase: SupabaseClient | null, ciudad: string, ahora: Date = new Date()): Promise<ArtistaLista[]> {
  if (!supabase) return [];
  const [tira, f1] = await Promise.all([
    leerTira(supabase, "artistas", ciudad),
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
  const fechas: FechaDeArtista[] = [];
  for (const fila of (f1.data ?? []) as unknown as FilaFecha[]) {
    const e = Array.isArray(fila.evento) ? fila.evento[0] : fila.evento;
    if (!e) continue;
    const lugar = Array.isArray(e.lugar) ? (e.lugar[0] ?? null) : e.lugar;
    fechas.push({ artista_id: fila.artista_id, evento: { id: e.id, titulo: e.titulo, inicio: e.inicio, zona: e.zona, sitio: nombreSitio({ lugar: lugar ? { nombre: lugar.nombre, portada: null } : null, sitio_texto: e.sitio_texto, sitio_direccion: e.sitio_direccion, sitio_reservado: e.sitio_reservado }) } });
  }

  let ids: string[];
  if (tira.length) {
    ids = tira.map((d) => d.id);
  } else {
    const conProxima = [...new Set(fechas.map((f) => f.artista_id))];
    if (conProxima.length === 0) return [];
    const seguidores = await supabase.from("seguimientos").select("artista_id").in("artista_id", conProxima).not("artista_id", "is", null).limit(5000);
    const conteo = new Map<string, number>();
    for (const fila of (seguidores.data ?? []) as { artista_id: string }[]) conteo.set(fila.artista_id, (conteo.get(fila.artista_id) ?? 0) + 1);
    ids = ordenarPorSeguidores(conProxima, conteo);
  }
  if (ids.length === 0) return [];

  const { data } = await supabase.from("artistas").select("id, slug, nombre, disciplina, detalle, tipo, foto").eq("visible", true).eq("ciudad", ciudad).in("id", ids);
  const artistas = conProximaFecha((data ?? []) as ArtistaResumen[], fechas);
  return (tira.length ? enOrden(tira, artistas) : artistas).slice(0, TOPE_ARTISTAS_DESTACADOS);
}
