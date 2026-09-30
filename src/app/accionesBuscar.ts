"use server";

import { buscarEventos, type EventoAgenda, type EventoBuscable } from "@/lib/agenda";
import type { ArtistaLista } from "@/lib/artistas";
import { LIMITE_BUSQUEDA_UNIFICADA, ordenarPorCiudad, SIN_RESULTADOS_BUSQUEDA, type Encontrado, type ResultadoBusqueda } from "@/lib/buscarUnificado";
import { tarjetaArtista, tarjetaEvento, tarjetaLugar } from "@/lib/destacados";
import { filtroSinPasar } from "@/lib/fechas";
import { normalizarNombre, type LugarLista } from "@/lib/lugares";
import { clienteServidor } from "@/lib/supabase/servidor";

type Nombre = { nombre: string };
type FilaEvento = Omit<EventoAgenda, "lugar" | "van"> & {
  ciudad: string;
  lugar: EventoAgenda["lugar"] | EventoAgenda["lugar"][];
  artistas: { artista: Nombre | Nombre[] | null }[] | null;
};
type FilaLugar = { id: string; slug: string | null; nombre: string; tipo: LugarLista["tipo"]; direccion: string | null; lat: number; lng: number; portada: string | null; ciudad: string };
type FilaArtista = { id: string; slug: string; nombre: string; disciplina: ArtistaLista["disciplina"]; detalle: string | null; tipo: ArtistaLista["tipo"]; foto: string | null; ciudad: string };

/** Los eventos próximos entre los que se busca (todas las ciudades): el corte de PostgREST llega en 1 000 y se ve venir. */
const EVENTOS_CANDIDATOS = 500;
/** Lo que se pide de lugares y artistas antes de ordenar por ciudad y cortar: de sobra para que lo de la ciudad no se pierda. */
const CANDIDATOS = 200;
/** Lo más largo que se busca, y las palabras que cuentan. */
const LARGO_MAXIMO = 80;
const PALABRAS_MAXIMO = 5;

/**
 * El buscador único (docs/rediseno/50, OL-237): tres consultas en paralelo, una por tabla, con el criterio de visibilidad de
 * Agenda, Lugares y Artistas — no se reinventa qué cuenta como visible, solo se combina. Sin acentos ni mayúsculas y cada palabra
 * escrita tiene que estar («museo ferrocarril» halla el Museo del Ferrocarril). Lugares y artistas se buscan por `nombre_orden`, el
 * nombre ya normalizado en la base; los eventos, por título, sitio o artista, como buscaba la Agenda (`buscarEventos`): no hay un
 * título normalizado en la base, así que se traen los próximos y se filtran aquí. Sin «próximo evento» por ficha: un resultado es
 * una sugerencia rápida, no la ficha completa.
 *
 * La ciudad ordena, no limita: no se filtra por ciudad; `ciudades` son sus nombres, la que se ve primero y las demás por cercanía
 * (`ciudadesPorCercania`), y lo encontrado sale en ese orden, hasta `LIMITE_BUSQUEDA_UNIFICADA` de cada tipo.
 */
export async function buscarUnificado(q: string, ciudades: string[]): Promise<ResultadoBusqueda> {
  const texto = String(q ?? "").trim().slice(0, LARGO_MAXIMO);
  const palabras = normalizarNombre(texto).split(" ").filter(Boolean).slice(0, PALABRAS_MAXIMO);
  if (palabras.join("").length < 2) return SIN_RESULTADOS_BUSQUEDA;
  const supabase = await clienteServidor();
  if (!supabase) return SIN_RESULTADOS_BUSQUEDA;
  const orden = (Array.isArray(ciudades) ? ciudades : []).filter((c) => typeof c === "string").slice(0, 100);
  const ahora = new Date();
  // El patrón sale de `normalizarNombre`: solo letras, números y espacios, sin nada que escapar.
  let lugares = supabase.from("lugares").select("id, slug, nombre, tipo, direccion, lat, lng, portada, ciudad").eq("visible", true).eq("privado", false);
  let artistas = supabase.from("artistas").select("id, slug, nombre, disciplina, detalle, tipo, foto, ciudad").eq("visible", true);
  for (const palabra of palabras) {
    lugares = lugares.ilike("nombre_orden", `%${palabra}%`);
    artistas = artistas.ilike("nombre_orden", `%${palabra}%`);
  }
  const [e, l, a] = await Promise.all([
    supabase.from("eventos").select("id, slug, titulo, inicio, fin, zona, imagen, precio, lugar_id, sitio_texto, sitio_direccion, sitio_reservado, creado_en, ciudad, lugar:lugares(nombre, portada), artistas:eventos_artistas(artista:artistas(nombre))").eq("visible", true).or(filtroSinPasar(ahora)).order("inicio").order("titulo").order("id").limit(EVENTOS_CANDIDATOS),
    lugares.order("nombre_orden").limit(CANDIDATOS),
    artistas.order("nombre_orden").limit(CANDIDATOS),
  ]);
  const proximos = ((e.data ?? []) as unknown as FilaEvento[]).map((fila): EventoBuscable & { ciudad: string } => {
    const lugar = Array.isArray(fila.lugar) ? (fila.lugar[0] ?? null) : fila.lugar;
    const artistas = (fila.artistas ?? []).map((x) => (Array.isArray(x.artista) ? x.artista[0] : x.artista)?.nombre).filter((n): n is string => !!n);
    return { ...fila, lugar, artistas, van: 0 };
  });
  const eventos = buscarEventos(proximos, texto).map((p): Encontrado => ({ ...tarjetaEvento(p, ahora), ciudad: p.ciudad }));
  const lugaresHallados = ((l.data ?? []) as unknown as FilaLugar[]).map((fila): Encontrado => ({ ...tarjetaLugar({ ...fila, proximo: null } as LugarLista, ahora), ciudad: fila.ciudad }));
  const artistasHallados = ((a.data ?? []) as unknown as FilaArtista[]).map((fila): Encontrado => ({ ...tarjetaArtista({ ...fila, proxima: null } as ArtistaLista, ahora), ciudad: fila.ciudad }));
  const cortar = (lista: Encontrado[]) => ordenarPorCiudad(lista, orden).slice(0, LIMITE_BUSQUEDA_UNIFICADA);
  return { eventos: cortar(eventos), lugares: cortar(lugaresHallados), artistas: cortar(artistasHallados) };
}
