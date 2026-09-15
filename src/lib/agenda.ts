import { distanciaKm } from "./geo";
import type { EventoResumen } from "./eventos";
import { diaCorto, diaLocal } from "./fechas";

/** Lo que la agenda del inicio necesita de cada evento, además del resumen. */
export type EventoAgenda = EventoResumen & {
  creado_en: string;
  /** Punto del evento: el del lugar o el del sitio (aproximado). */
  lat: number | null;
  lng: number | null;
  /** Cuántas personas dijeron "Voy". */
  van: number;
  lugar: (EventoResumen["lugar"] & { lat?: number; lng?: number }) | null;
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

/**
 * Agrupa por día en la hora de la ciudad: "Hoy", "Mañana" y luego cada día con eventos, en orden.
 * Dentro de cada día van por hora; con `ordenDado`, en el orden en que llegan (Cercanos: por distancia).
 */
export function agruparPorDia<T extends { inicio: string }>(eventos: T[], ahora: Date = new Date(), ordenDado = false): Grupo<T>[] {
  const grupos = new Map<string, Grupo<T>>();
  const lista = ordenDado ? eventos : [...eventos].sort((a, b) => a.inicio.localeCompare(b.inicio));
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

/** Aplica el filtro de la pestaña y el día del chip. Devuelve la lista (ordenada por cercanía si aplica) y la distancia por evento. */
export function filtrarAgenda<T extends EventoAgenda>(eventos: T[], ctx: ContextoFiltro): { lista: T[]; km: Map<string, number> } {
  let lista = eventos.filter((e) => !ctx.fecha || diaLocal(new Date(e.inicio)) === ctx.fecha);
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
