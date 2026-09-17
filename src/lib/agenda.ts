import { distanciaKm } from "./geo";
import type { EventoResumen } from "./eventos";
import { nombreSitio } from "./eventos";
import { diaCorto, diaLocal } from "./fechas";
import { compararNombres, normalizarNombre } from "./lugares";

/** Lo que la agenda del inicio necesita de cada evento, además del resumen. */
export type EventoAgenda = EventoResumen & {
  creado_en: string;
  /** Punto del evento: el del lugar o el del sitio (aproximado). */
  lat: number | null;
  lng: number | null;
  /** Cuántas personas dijeron "Voy". */
  van: number;
  lugar: (EventoResumen["lugar"] & { lat?: number; lng?: number }) | null;
  /** Nombres de los artistas que se presentan (para el buscador). */
  artistas?: string[];
};

export type Filtro = "todos" | "cercanos" | "siguiendo" | "nuevos";
export const FILTROS: { clave: Filtro; etiqueta: string }[] = [
  { clave: "todos", etiqueta: "Todos" },
  { clave: "cercanos", etiqueta: "Cercanos" },
  { clave: "siguiendo", etiqueta: "Siguiendo" },
  { clave: "nuevos", etiqueta: "Nuevos" },
];

export type Punto = { lat: number; lng: number };
export type Grupo<T> = { clave: string; titulo: string; eventos: T[] };

type Ordenable = Pick<EventoAgenda, "id" | "titulo" | "inicio">;

/**
 * Orden de agenda: por hora y, a la misma hora, por título (alfabético, como Lugares y Artistas) y por id. La base no
 * garantiza el orden de los empates: sin desempate, dos cargas traían en otro orden los eventos de las 19:00 y la
 * memoria de pantalla reponía el scroll sobre otro evento (bitácora 062).
 */
export function compararEventos(a: Ordenable, b: Ordenable): number {
  return a.inicio.localeCompare(b.inicio) || compararNombres(a.titulo, b.titulo) || a.id.localeCompare(b.id);
}

/**
 * Agrupa por día en la hora de la ciudad: "Hoy", "Mañana" y luego cada día con eventos, en orden.
 * Dentro de cada día van en orden de agenda; con `ordenDado`, en el orden en que llegan (Cercanos: por distancia).
 */
export function agruparPorDia<T extends Ordenable>(eventos: T[], ahora: Date = new Date(), ordenDado = false): Grupo<T>[] {
  const grupos = new Map<string, Grupo<T>>();
  const lista = ordenDado ? eventos : [...eventos].sort(compararEventos);
  for (const e of lista) {
    const clave = diaLocal(new Date(e.inicio));
    let g = grupos.get(clave);
    if (!g) {
      g = { clave, titulo: diaCorto(e.inicio, ahora), eventos: [] };
      grupos.set(clave, g);
    }
    g.eventos.push(e);
  }
  return [...grupos.values()].sort((a, b) => a.clave.localeCompare(b.clave));
}

export { distanciaKm };

/** "a 600 m" · "a 2.4 km" · "a 12 km". */
export function textoDistancia(km: number): string {
  if (km < 1) return `a ${Math.max(50, Math.round(km * 1000 / 50) * 50)} m`;
  return `a ${km < 10 ? km.toFixed(1).replace(".0", "") : Math.round(km)} km`;
}

/** Punto del evento: el del lugar, o el del sitio si lo tiene. */
export function puntoDe(e: Pick<EventoAgenda, "lat" | "lng" | "lugar">): Punto | null {
  if (e.lugar && typeof e.lugar.lat === "number" && typeof e.lugar.lng === "number") return { lat: e.lugar.lat, lng: e.lugar.lng };
  if (typeof e.lat === "number" && typeof e.lng === "number") return { lat: e.lat, lng: e.lng };
  return null;
}

/** Agregado en los últimos `dias` días. */
export function esNuevo(creadoEn: string, ahora: Date = new Date(), dias = 7): boolean {
  const t = new Date(creadoEn).getTime();
  return Number.isFinite(t) && ahora.getTime() - t <= dias * 86400000;
}

export type ContextoFiltro = {
  filtro: Filtro;
  /** Ubicación de la persona (solo con su permiso); null si no la dio. */
  punto: Punto | null;
  /** Lugares que sigue; null si no hay sesión. */
  seguidos: string[] | null;
  /** Eventos en los que se presenta un artista que sigue (Artistas, decisión 10). */
  eventosSeguidos?: string[];
  /** Día elegido con el chip (YYYY-MM-DD en la ciudad) o "". */
  fecha: string;
  ahora: Date;
};

/**
 * Aplica el filtro de la pestaña y el día del chip. Devuelve la lista y la distancia por evento. La lista va en orden de
 * agenda sin importar cómo llegue de la base (con un día elegido se pinta tal cual); Cercanos la ordena por distancia y
 * Nuevos por lo más reciente, con los empates en orden de agenda (los `sort` son estables).
 */
export function filtrarAgenda<T extends EventoAgenda>(eventos: T[], ctx: ContextoFiltro): { lista: T[]; km: Map<string, number> } {
  let lista = eventos.filter((e) => !ctx.fecha || diaLocal(new Date(e.inicio)) === ctx.fecha).sort(compararEventos);
  const km = new Map<string, number>();
  if (ctx.filtro === "cercanos" && ctx.punto) {
    for (const e of lista) {
      const p = puntoDe(e);
      if (p) km.set(e.id, distanciaKm(ctx.punto, p));
    }
    lista = [...lista].sort((a, b) => (km.get(a.id) ?? Infinity) - (km.get(b.id) ?? Infinity));
  } else if (ctx.filtro === "siguiendo") {
    const set = new Set(ctx.seguidos ?? []);
    const porArtista = new Set(ctx.eventosSeguidos ?? []);
    lista = lista.filter((e) => (e.lugar_id && set.has(e.lugar_id)) || porArtista.has(e.id));
  } else if (ctx.filtro === "nuevos") {
    lista = lista.filter((e) => esNuevo(e.creado_en, ctx.ahora)).sort((a, b) => b.creado_en.localeCompare(a.creado_en));
  }
  return { lista, km };
}

/**
 * Buscador de la agenda (pedido del founder, 2026-09-15): por título, sitio o artista, escrito a medias,
 * sin importar acentos ni mayúsculas; cada palabra escrita tiene que estar ("jazz museo" halla el jazz del museo).
 */
export function buscarEventos<T extends Pick<EventoAgenda, "titulo" | "lugar" | "sitio_texto" | "sitio_reservado" | "artistas">>(eventos: T[], busqueda: string): T[] {
  const palabras = normalizarNombre(busqueda).split(" ").filter(Boolean);
  if (palabras.length === 0) return eventos;
  return eventos.filter((e) => {
    const texto = normalizarNombre(`${e.titulo} ${nombreSitio(e)} ${(e.artistas ?? []).join(" ")}`);
    return palabras.every((p) => texto.includes(p));
  });
}
