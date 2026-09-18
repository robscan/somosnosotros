import { distanciaKm } from "./geo";
import type { EventoResumen } from "./eventos";
import { nombreSitio } from "./eventos";
import { diaCorto, diaLocal, ZONA_INICIAL } from "./fechas";
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
 * Dentro de cada día van en orden de agenda; con `ordenDado`, en el orden en que llegan (Cercanos: por distancia).
 */
export function agruparPorDia<T extends Agrupable>(eventos: T[], ahora: Date = new Date(), ordenDado = false): Grupo<T>[] {
  const grupos = new Map<string, Grupo<T>>();
  const lista = ordenDado ? eventos : [...eventos].sort(compararEventos);
  for (const e of lista) {
    const clave = diaLocal(new Date(e.inicio), e.zona);
    let g = grupos.get(clave);
    if (!g) {
      g = { clave, titulo: diaCorto(e.inicio, ahora, e.zona), eventos: [] };
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

/** Lo más atrás que Nuevos mira, aunque la última visita sea más vieja (founder, 2026-09-17: «un tope máximo de 7 días»). */
export const DIAS_NUEVOS = 7;

/**
 * Desde cuándo cuenta como nuevo: lo publicado desde la última vez que se miró la pestaña, con el tope de `dias`
 * (decisión del founder, 2026-09-17: «mostrar nuevos desde la ultima vez que entraste, pero con un tome máximo de 7
 * días»). Sin marca, ilegible, o en el futuro porque el teléfono tiene el reloj mal puesto, vale el tope: así el corte
 * nunca deja la pestaña vacía por un dato roto.
 */
export function corteNuevos(ultimaVisita: string | number | null | undefined, ahora: Date = new Date(), dias = DIAS_NUEVOS): number {
  const tope = ahora.getTime() - dias * 86400000;
  const visita = ultimaVisita == null || ultimaVisita === "" ? NaN : typeof ultimaVisita === "number" ? ultimaVisita : new Date(ultimaVisita).getTime();
  if (!Number.isFinite(visita) || visita > ahora.getTime()) return tope;
  return Math.max(tope, visita);
}

/** La zona del teléfono, que es la que decide si algo se publicó "hoy" o "ayer" para quien mira. */
export function zonaDelEntorno(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || ZONA_INICIAL;
  } catch {
    return ZONA_INICIAL;
  }
}

/** Los tres grupos posibles de Nuevos, en orden. Con el tope de 7 días no puede haber un cuarto. */
export const TITULOS_PUBLICACION = ["Lo más nuevo", "Publicado ayer", "Esta semana"];

/**
 * El título del grupo según cuándo se publicó, contado en la zona de quien mira (no en la de la ciudad ni en la del
 * evento): el rótulo habla de cuándo lo viste tú, así que a las 07:00 en Madrid lo de esta mañana es "Lo más nuevo"
 * y no "Publicado ayer" en San Luis. Esta pestaña solo se pinta en el teléfono, así que la zona del entorno es la suya.
 * El primer grupo no lleva fecha porque no siempre es de hoy: quien vuelve después de tres días ve arriba lo de
 * anteayer (palabras del founder, 2026-09-17: «Lo mas nuevo, Publicado ayer, etc»).
 */
export function tituloPublicacion(creadoEn: string, ahora: Date = new Date(), zona: string = zonaDelEntorno()): string {
  const hoy = diaLocal(ahora, zona);
  const dia = diaLocal(new Date(creadoEn), zona);
  // Con el reloj del teléfono atrasado, algo puede venir "del futuro": es lo más reciente, así que va con lo de hoy.
  if (dia >= hoy) return TITULOS_PUBLICACION[0];
  if (dia === diaLocal(new Date(ahora.getTime() - 86400000), zona)) return TITULOS_PUBLICACION[1];
  return TITULOS_PUBLICACION[2];
}

/**
 * Nuevos: por cuándo se publicó, de lo más reciente hacia atrás, en los tres grupos de `TITULOS_PUBLICACION`
 * (el patrón de `/novedades`, con los rótulos que eligió el founder). Lo publicado a la vez va en orden de agenda,
 * para que dos cargas no lo traigan distinto (bitácora 062). `agruparPorDia` no sirve aquí: agrupa y ordena por el día
 * del evento, que es justo el eje que esta pestaña no usa.
 */
export function agruparPorPublicacion<T extends Ordenable & Pick<EventoAgenda, "creado_en">>(eventos: T[], ahora: Date = new Date(), zona: string = zonaDelEntorno()): Grupo<T>[] {
  const grupos = new Map<string, Grupo<T>>();
  for (const e of [...eventos].sort((a, b) => b.creado_en.localeCompare(a.creado_en) || compararEventos(a, b))) {
    const titulo = tituloPublicacion(e.creado_en, ahora, zona);
    let g = grupos.get(titulo);
    if (!g) {
      g = { clave: titulo, titulo, eventos: [] };
      grupos.set(titulo, g);
    }
    g.eventos.push(e);
  }
  return [...grupos.values()].sort((a, b) => TITULOS_PUBLICACION.indexOf(a.titulo) - TITULOS_PUBLICACION.indexOf(b.titulo));
}

export type ContextoFiltro = {
  filtro: Filtro;
  /** Ubicación de la persona (solo con su permiso); null si no la dio. */
  punto: Punto | null;
  /** Lugares que sigue; null si no hay sesión. */
  seguidos: string[] | null;
  /** Eventos en los que se presenta un artista que sigue (Artistas, decisión 10). */
  eventosSeguidos?: string[];
  /** Día elegido con el chip (YYYY-MM-DD) o "": cada evento cuenta en el día de su zona. */
  fecha: string;
  /** Desde cuándo cuenta como nuevo (`corteNuevos`, leído del teléfono); sin él, el tope de DIAS_NUEVOS. */
  corte?: number;
  ahora: Date;
};

/**
 * Aplica el filtro de la pestaña y el día del chip. Devuelve la lista y la distancia por evento. La lista va en orden de
 * agenda sin importar cómo llegue de la base (con un día elegido se pinta tal cual); Cercanos la ordena por distancia y
 * Nuevos por lo más reciente, con los empates en orden de agenda (los `sort` son estables). Ese orden solo llega a la
 * pantalla si se pinta con `agruparPorPublicacion`: `agruparPorDia` vuelve a ordenar por la hora del evento y lo pierde
 * (era el defecto que el founder vio el 2026-09-17, bitácora 099).
 */
export function filtrarAgenda<T extends EventoAgenda>(eventos: T[], ctx: ContextoFiltro): { lista: T[]; km: Map<string, number> } {
  let lista = eventos.filter((e) => !ctx.fecha || diaLocal(new Date(e.inicio), e.zona) === ctx.fecha).sort(compararEventos);
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
    // `corteNuevos` acota aquí también: un corte repuesto por la memoria de pantalla (una pestaña abierta días) no
    // puede abrir más de DIAS_NUEVOS, y uno inválido o futuro cae al tope.
    const desde = corteNuevos(ctx.corte, ctx.ahora);
    lista = lista.filter((e) => new Date(e.creado_en).getTime() >= desde).sort((a, b) => b.creado_en.localeCompare(a.creado_en));
  }
  return { lista, km };
}

/**
 * Buscador de la agenda (pedido del founder, 2026-09-15): por título, sitio o artista, escrito a medias,
 * sin importar acentos ni mayúsculas; cada palabra escrita tiene que estar ("jazz museo" halla el jazz del museo).
 */
export function buscarEventos<T extends Pick<EventoAgenda, "titulo" | "lugar" | "sitio_texto" | "sitio_direccion" | "sitio_reservado" | "artistas">>(eventos: T[], busqueda: string): T[] {
  const palabras = normalizarNombre(busqueda).split(" ").filter(Boolean);
  if (palabras.length === 0) return eventos;
  return eventos.filter((e) => {
    const texto = normalizarNombre(`${e.titulo} ${nombreSitio(e)} ${(e.artistas ?? []).join(" ")}`);
    return palabras.every((p) => texto.includes(p));
  });
}
