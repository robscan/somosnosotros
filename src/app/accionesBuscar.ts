"use server";

import type { EventoAgenda } from "@/lib/agenda";
import type { ArtistaLista } from "@/lib/artistas";
import { LIMITE_BUSQUEDA_UNIFICADA, SIN_RESULTADOS_BUSQUEDA, type ResultadoBusqueda } from "@/lib/buscarUnificado";
import { tarjetaArtista, tarjetaEvento, tarjetaLugar } from "@/lib/destacados";
import { filtroSinPasar } from "@/lib/fechas";
import type { LugarLista } from "@/lib/lugares";
import { clienteServidor } from "@/lib/supabase/servidor";

type FilaEvento = { id: string; slug: string | null; titulo: string; inicio: string; fin: string | null; zona: string; imagen: string | null; precio: string | null; lugar_id: string | null; sitio_texto: string | null; sitio_direccion: string | null; sitio_reservado: boolean; creado_en: string; lugar: { nombre: string; portada: string | null } | { nombre: string; portada: string | null }[] | null };
type FilaLugar = { id: string; slug: string | null; nombre: string; tipo: LugarLista["tipo"]; direccion: string | null; lat: number; lng: number; portada: string | null };
type FilaArtista = { id: string; slug: string; nombre: string; disciplina: ArtistaLista["disciplina"]; detalle: string | null; tipo: ArtistaLista["tipo"]; foto: string | null };

/**
 * El buscador único (docs/rediseno/41, OL-153, bitácora 188): tres consultas en paralelo, cada una `ilike` sobre su
 * propia tabla, con el mismo criterio de visibilidad que ya usan Agenda, Lugares y Artistas — no se reinventa qué
 * cuenta como visible, solo se combina. Sin "próximo evento" por ficha (eso lo hace cada listado ya cargado): un
 * resultado de búsqueda es una sugerencia rápida, no la ficha completa, y así la consulta sigue siendo una sola por
 * tabla, barata incluso escribiendo letra a letra.
 */
export async function buscarUnificado(q: string, ciudadNombre: string): Promise<ResultadoBusqueda> {
  const texto = q.trim();
  if (texto.length < 2) return SIN_RESULTADOS_BUSQUEDA;
  const supabase = await clienteServidor();
  if (!supabase) return SIN_RESULTADOS_BUSQUEDA;
  const ahora = new Date();
  const patron = `%${texto.replace(/[%_]/g, "\\$&")}%`;
  const [e, l, a] = await Promise.all([
    supabase.from("eventos").select("id, slug, titulo, inicio, fin, zona, imagen, precio, lugar_id, sitio_texto, sitio_direccion, sitio_reservado, creado_en, lugar:lugares(nombre, portada)").eq("visible", true).eq("ciudad", ciudadNombre).or(filtroSinPasar(ahora)).ilike("titulo", patron).order("inicio").limit(LIMITE_BUSQUEDA_UNIFICADA),
    supabase.from("lugares").select("id, slug, nombre, tipo, direccion, lat, lng, portada").eq("visible", true).eq("privado", false).eq("ciudad", ciudadNombre).ilike("nombre", patron).order("nombre").limit(LIMITE_BUSQUEDA_UNIFICADA),
    supabase.from("artistas").select("id, slug, nombre, disciplina, detalle, tipo, foto").eq("visible", true).eq("ciudad", ciudadNombre).ilike("nombre", patron).order("nombre").limit(LIMITE_BUSQUEDA_UNIFICADA),
  ]);
  const eventos = ((e.data ?? []) as unknown as FilaEvento[]).map((fila) => {
    const lugar = Array.isArray(fila.lugar) ? (fila.lugar[0] ?? null) : fila.lugar;
    const evento: EventoAgenda = { ...fila, lugar, lat: null, lng: null, van: 0, artistas: [] };
    return tarjetaEvento(evento, ahora);
  });
  const lugares = ((l.data ?? []) as unknown as FilaLugar[]).map((fila) => tarjetaLugar({ ...fila, proximo: null } as LugarLista, ahora));
  const artistas = ((a.data ?? []) as unknown as FilaArtista[]).map((fila) => tarjetaArtista({ ...fila, proxima: null } as ArtistaLista, ahora));
  return { eventos, lugares, artistas };
}
