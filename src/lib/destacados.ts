import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventoAgenda } from "./agenda";
import { etiquetaArtista, type ArtistaLista } from "./artistas";
import { nombreSitio } from "./eventos";
import { diaCorto, formatearCuando } from "./fechas";
import { SIN_FOTO } from "./imagen";
import { etiquetaTipo, textoProximo, type LugarLista } from "./lugares";

/**
 * Destacados (docs/rediseno/20, firmado por el founder el 2026-09-16): arriba de la Agenda, de Lugares y de Artistas, lo
 * que elige la administración y lo que tiene al menos 3 «Voy». Qué entra y en qué orden lo decide la base
 * (`tira_destacados`); aquí, cómo se lee y cómo se dice.
 */
export type TipoFicha = "evento" | "lugar" | "artista";
export type Seccion = "eventos" | "lugares" | "artistas";
/** Un renglón de la tira como llega de la base. */
export type Destacado = { id: string; motivo: "elegido" | "asistentes"; hasta: string | null; van: number };
/** Un destacado como lo ve el panel: con su nombre y su foto. */
export type FilaDestacada = Destacado & { nombre: string; foto: string | null };
/** El tipo de ficha de cada sección, y al revés. */
export const TIPO_DE: Record<Seccion, TipoFicha> = { eventos: "evento", lugares: "lugar", artistas: "artista" };
export const SECCION_DE: Record<TipoFicha, Seccion> = { evento: "eventos", lugar: "lugares", artista: "artistas" };
/** Lo que la administración decidió sobre una ficha: la eligió, la quitó aunque tenga asistentes, o nada. */
export type EstadoDestacado = "elegido" | "quitado" | "ninguno";
/** Una tarjeta de la tira, lista para pintarse. */
export type Tarjeta = { id: string; href: string; foto: string; titulo: string; detalle: string; van: number };

/** Lo que elige la administración en lugares y artistas dura dos semanas; un evento, hasta que pasa. */
export const DIAS_DESTACADO = 14;

/** La tira de una sección en una ciudad; vacía si no hay base o falla (la lista sigue: la tira es un atajo). */
export async function leerTira(supabase: SupabaseClient | null, seccion: Seccion, ciudad: string): Promise<Destacado[]> {
  if (!supabase) return [];
  const { data } = await supabase.rpc("tira_destacados", { p_tipo: seccion, p_ciudad: ciudad });
  return (data ?? []) as Destacado[];
}

/** Las fichas ya cargadas, en el orden de la tira. */
export function enOrden<T extends { id: string }>(tira: Destacado[], fichas: T[]): T[] {
  const porId = new Map(fichas.map((f) => [f.id, f]));
  return tira.flatMap((d) => porId.get(d.id) ?? []);
}

const minuscula = (texto: string) => texto.charAt(0).toLowerCase() + texto.slice(1);

export function tarjetaEvento(e: EventoAgenda, ahora = new Date()): Tarjeta {
  return { id: e.id, href: `/eventos/${e.id}`, foto: e.imagen ?? e.lugar?.portada ?? SIN_FOTO, titulo: e.titulo, detalle: `${minuscula(formatearCuando(e.inicio, null, ahora, e.zona))} · ${nombreSitio(e)}`, van: e.van };
}

export function tarjetaLugar(l: LugarLista, ahora = new Date()): Tarjeta {
  return { id: l.id, href: `/lugares/${l.id}`, foto: l.portada ?? SIN_FOTO, titulo: l.nombre, detalle: l.proximo ? textoProximo(l.proximo, ahora) : etiquetaTipo(l.tipo), van: 0 };
}

/** La tarjeta de artista es redonda y angosta: la fecha va sin el sitio. */
export function tarjetaArtista(a: ArtistaLista, ahora = new Date()): Tarjeta {
  return { id: a.id, href: `/artistas/${a.id}`, foto: a.foto ?? SIN_FOTO, titulo: a.nombre, detalle: a.proxima ? minuscula(formatearCuando(a.proxima.inicio, null, ahora, a.proxima.zona)) : etiquetaArtista(a), van: 0 };
}

/** "hasta mañana" o "hasta el mié 30 de sep". */
function hasta(iso: string, ahora: Date): string {
  const dia = diaCorto(iso, ahora);
  return dia === "Hoy" || dia === "Mañana" ? `hasta ${minuscula(dia)}` : `hasta el ${dia}`;
}

const enDosSemanas = (ahora: Date) => new Date(ahora.getTime() + DIAS_DESTACADO * 86400000).toISOString();

/** Debajo de «Destacar», en el menú: hasta cuándo quedaría. */
export function textoDestacar(tipo: TipoFicha, ahora = new Date()): string {
  return tipo === "evento" ? "Hasta que pase el evento" : `Dos semanas: ${hasta(enDosSemanas(ahora), ahora)}`;
}

/** Por qué está destacada una ficha, en el menú y en el panel. */
export function textoMotivo(d: Pick<Destacado, "motivo" | "hasta" | "van">, tipo: TipoFicha, ahora = new Date()): string {
  if (d.motivo === "asistentes") return `Destacado: ${d.van} van${tipo === "evento" ? "" : " a sus eventos"}`;
  return d.hasta ? `Destacado ${hasta(d.hasta, ahora)}` : "Destacado hasta que pase";
}

/** Lo que queda escrito en el menú después de destacar o quitar. */
export function textoHecho(estado: EstadoDestacado, tipo: TipoFicha, ahora = new Date()): string {
  if (estado !== "elegido") return "Ya no es destacado";
  return textoMotivo({ motivo: "elegido", hasta: tipo === "evento" ? null : enDosSemanas(ahora), van: 0 }, tipo, ahora);
}
