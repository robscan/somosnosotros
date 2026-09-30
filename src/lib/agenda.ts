import { ocupaRango } from "./calendario";
import type { Agenda } from "./cargarAgenda";
import { cuandoDeUrl, type Cuando } from "./cuando";
import type { EventoResumen } from "./eventos";
import { esCooperacion, nombreSitio } from "./eventos";
import { diaCorto, diaLocal, localAIso } from "./fechas";
import { compararNombres, normalizarNombre } from "./lugares";

/** Lo que la agenda del inicio necesita de cada evento, además del resumen. */
export type EventoAgenda = EventoResumen & {
  creado_en: string;
  /** Cuántas personas dijeron "Voy". */
  van: number;
};

export type Grupo<T> = { clave: string; titulo: string; eventos: T[] };

type Ordenable = Pick<EventoAgenda, "id" | "titulo" | "inicio">;
/** Lo que hace falta para agrupar por día: el orden y la zona del evento. */
type Agrupable = Ordenable & Pick<EventoAgenda, "zona">;

/**
 * Orden de agenda: por hora y, a la misma hora, por título (alfabético, como Lugares y Artistas) y por id. La base no
 * garantiza el orden de los empates: sin desempate, dos cargas traían en otro orden los eventos de las 19:00 y la
 * memoria de pantalla reponía el scroll sobre otro evento (bitácora 062).
 */
export function compararEventos(a: Ordenable, b: Ordenable): number {
  return a.inicio.localeCompare(b.inicio) || compararNombres(a.titulo, b.titulo) || a.id.localeCompare(b.id);
}

/**
 * Agrupa por día, cada evento en el día de su zona: "Hoy", "Mañana" y luego cada día con eventos, en orden.
 * Dentro de cada día van en orden de agenda. Con `desde` (el primer día de un Cuándo), un evento que empezó antes y sigue
 * en curso va en ese primer día, no en el que ya pasó fuera del rango.
 */
export function agruparPorDia<T extends Agrupable>(eventos: T[], ahora: Date = new Date(), desde = ""): Grupo<T>[] {
  const grupos = new Map<string, Grupo<T>>();
  for (const e of [...eventos].sort(compararEventos)) {
    const propio = diaLocal(new Date(e.inicio), e.zona);
    const clave = propio < desde ? desde : propio;
    let g = grupos.get(clave);
    if (!g) {
      g = { clave, titulo: diaCorto(clave === propio ? e.inicio : (localAIso(`${clave}T12:00`, e.zona) ?? e.inicio), ahora, e.zona), eventos: [] };
      grupos.set(clave, g);
    }
    g.eventos.push(e);
  }
  return [...grupos.values()].sort((a, b) => a.clave.localeCompare(b.clave));
}

/** "a 600 m" · "a 2.4 km" · "a 12 km". */
export function textoDistancia(km: number): string {
  if (km < 1) return `a ${Math.max(50, Math.round(km * 1000 / 50) * 50)} m`;
  return `a ${km < 10 ? km.toFixed(1).replace(".0", "") : Math.round(km)} km`;
}

/** Cuánto cuesta (la hoja Filtros): sin precio es gratis y «Cooperación solidaria» es el costo sin cifra (OL-140). */
export type Cuanto = "gratis" | "cooperacion";
export const CUANTOS: { clave: Cuanto; etiqueta: string }[] = [
  { clave: "gratis", etiqueta: "Gratis" },
  { clave: "cooperacion", etiqueta: "Cooperación" },
];
const cuesta = (e: Pick<EventoAgenda, "precio">, cuanto: readonly Cuanto[] = []) => cuanto.length === 0 || cuanto.some((c) => (c === "gratis" ? e.precio === null : esCooperacion(e.precio)));

/** Lo que la persona puso en la fila de contexto de Agenda (y de Inicio): Cuándo, Cuánto y si solo lo que sigue. */
export type FiltrosAgenda = { cuando: Cuando | null; cuanto: Cuanto[]; siguiendo: boolean };
export const SIN_FILTROS: FiltrosAgenda = { cuando: null, cuanto: [], siguiendo: false };

/** Cuántos filtros de la hoja Filtros hay puestos (Cuándo no cuenta: tiene su propio chip). */
export const filtrosPuestos = (f: FiltrosAgenda) => f.cuanto.length + (f.siguiendo ? 1 : 0);

/** A Agenda con esos filtros: la URL es su estado inicial (después Agenda lo lleva en el teléfono, sin apilar historial). */
export function hrefAgenda(f: FiltrosAgenda, ciudad?: string | null): string {
  const p = new URLSearchParams();
  if (ciudad) p.set("ciudad", ciudad);
  if (f.cuando) {
    p.set("desde", f.cuando.desde);
    if (f.cuando.hasta !== f.cuando.desde) p.set("hasta", f.cuando.hasta);
  }
  if (f.cuanto.length > 0) p.set("cuanto", f.cuanto.join(","));
  if (f.siguiendo) p.set("filtro", "siguiendo");
  const consulta = p.toString();
  return consulta ? `/agenda?${consulta}` : "/agenda";
}

/** Los filtros que guardó la memoria de pantalla, sin fiarse de su forma: una versión anterior de la pantalla guardaba otra. */
export function filtrosRecordados(f: Partial<FiltrosAgenda> | undefined): FiltrosAgenda {
  return { cuando: cuandoDeUrl(f?.cuando?.desde, f?.cuando?.hasta), cuanto: CUANTOS.map((c) => c.clave).filter((c) => f?.cuanto?.includes(c)), siguiendo: f?.siguiendo === true };
}

/** Los filtros que llegan en la URL de Agenda; lo que no se reconoce (un enlace viejo, `?filtro=cercanos`) se ignora. */
export function filtrosDeUrl(p: { desde?: string; hasta?: string; cuanto?: string; filtro?: string }): FiltrosAgenda {
  const cuantos = (p.cuanto ?? "").split(",");
  return { cuando: cuandoDeUrl(p.desde, p.hasta), cuanto: CUANTOS.map((c) => c.clave).filter((c) => cuantos.includes(c)), siguiendo: p.filtro === "siguiendo" };
}

/** Lo que decide qué eventos entran a la lista de Agenda (y a «Tus favoritos» de Inicio). */
export type ContextoFiltro = {
  /** Solo lo que sigue la persona: los eventos de sus lugares y los de los artistas que sigue. */
  siguiendo: boolean;
  /** Lugares que sigue; null si no hay sesión. */
  seguidos: string[] | null;
  /** Eventos en los que se presenta un artista que sigue (Artistas, decisión 10). */
  eventosSeguidos?: string[];
  /** Los días elegidos con Cuándo, o null: un evento cuenta en cada día que ocupa, en la zona del propio evento. */
  cuando: Cuando | null;
  /** Solo lo gratis, solo lo de cooperación o los dos; vacío o sin él, cualquier precio. */
  cuanto?: readonly Cuanto[];
};

/**
 * Aplica los filtros de Agenda. La lista va en orden de agenda sin importar cómo llegue de la base (con un día elegido se
 * pinta tal cual).
 */
export function filtrarAgenda<T extends EventoAgenda>(eventos: T[], ctx: ContextoFiltro): T[] {
  // Un evento de varios días cuenta en cada día que ocupa (OL-218, `ocupaRango`): sin esto, el calendario podía marcar
  // un día como "disponible" (por un evento que lo ocupa sin empezar ahí) y, al elegirlo, la lista salía vacía —
  // confirmado con un evento de ejemplo del 6 al 8 de octubre, bitácora 247.
  const lista = eventos.filter((e) => (!ctx.cuando || ocupaRango(e, ctx.cuando.desde, ctx.cuando.hasta)) && cuesta(e, ctx.cuanto)).sort(compararEventos);
  if (!ctx.siguiendo) return lista;
  const lugares = new Set(ctx.seguidos ?? []);
  const porArtista = new Set(ctx.eventosSeguidos ?? []);
  return lista.filter((e) => (e.lugar_id && lugares.has(e.lugar_id)) || porArtista.has(e.id));
}

/** Un evento y los nombres de los artistas que se presentan: el buscador único (`app/accionesBuscar.ts`) busca también por ellos. */
export type EventoBuscable = EventoAgenda & { artistas: string[] };

/**
 * Buscador de los eventos (pedido del founder, 2026-09-15; hoy lo usa el buscador único, `app/accionesBuscar.ts`): por título,
 * sitio o artista, escrito a medias, sin importar acentos ni mayúsculas; cada palabra escrita tiene que estar («jazz museo» halla
 * el jazz del museo).
 */
export function buscarEventos<T extends Pick<EventoBuscable, "titulo" | "lugar" | "sitio_texto" | "sitio_direccion" | "sitio_reservado" | "artistas">>(eventos: T[], busqueda: string): T[] {
  const palabras = normalizarNombre(busqueda).split(" ").filter(Boolean);
  if (palabras.length === 0) return eventos;
  return eventos.filter((e) => {
    const texto = normalizarNombre(`${e.titulo} ${nombreSitio(e)} ${e.artistas.join(" ")}`);
    return palabras.every((p) => texto.includes(p));
  });
}

/**
 * Lo que Agenda lista con esos filtros, en orden de agenda. La lista y el número de cada botón «Ver N eventos» de las hojas de
 * Cuándo y Filtros salen de aquí: lo que dice el botón es lo que se ve al tocarlo.
 */
export function listarAgenda(agenda: Pick<Agenda, "eventos" | "seguidos" | "eventosSeguidos">, filtros: FiltrosAgenda): EventoAgenda[] {
  return filtrarAgenda(agenda.eventos, { siguiendo: filtros.siguiendo, seguidos: agenda.seguidos, eventosSeguidos: agenda.eventosSeguidos, cuando: filtros.cuando, cuanto: filtros.cuanto });
}
