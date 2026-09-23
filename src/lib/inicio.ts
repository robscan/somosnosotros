import { compararEventos, filtrarAgenda, type EventoAgenda } from "./agenda";
import type { Agenda } from "./cargarAgenda";
import { enOrden } from "./destacados";

/**
 * Inicio: siete carriles (docs/rediseno/41, OL-156, segunda vuelta, bitácora 191). Aquí solo lo que se puede probar
 * sin base de datos ni navegador: la ventana de "esta semana", el peso del carril estelar, el orden de Populares y
 * de Nuevos, que no se repita un evento entre carriles y en qué orden salen los grupos del buscador único según la
 * sección.
 */

/** "Esta semana" = próximos 7 días desde ahora, igual que `cargarCercanos()` (decisión del founder, segunda vuelta
 *  de doc 41): no es la semana de calendario. Un evento que ya empezó cuenta si todavía no termina. */
export const DIAS_ESTA_SEMANA = 7;
export function eventosEstaSemana<T extends Pick<EventoAgenda, "inicio" | "fin">>(eventos: T[], ahora: Date = new Date()): T[] {
  const desde = ahora.getTime();
  const hasta = desde + DIAS_ESTA_SEMANA * 86400000;
  return eventos.filter((e) => new Date(e.fin ?? e.inicio).getTime() >= desde && new Date(e.inicio).getTime() < hasta);
}

/**
 * Ningún evento se repite entre dos carriles de Inicio (doc 41, "Sin duplicar eventos"): el que ya salió en uno
 * anterior no vuelve a salir en el siguiente. `vistos` se muta a propósito: cada carril se calcula en el orden de
 * la pantalla (favoritos, destacados, cercanos, populares) y cada uno amplía el conjunto para el que sigue.
 */
export function sinRepetidos<T extends { id: string }>(eventos: T[], vistos: Set<string>): T[] {
  const propios: T[] = [];
  for (const e of eventos) {
    if (vistos.has(e.id)) continue;
    vistos.add(e.id);
    propios.push(e);
  }
  return propios;
}

/** Mismo mínimo que Destacados (doc 20: al menos 3 "Voy", sin contar administración) para no inventar un segundo
 *  criterio de popularidad que compita con el ya firmado. */
export const MINIMO_POPULARES = 3;

/** El carril "Eventos populares": de mayor a menor número de "Voy"; a igualdad, el orden de siempre de la agenda. */
export function carrilPopulares<T extends Pick<EventoAgenda, "id" | "van" | "titulo" | "inicio">>(eventos: T[], vistos: Set<string>): T[] {
  const candidatos = sinRepetidos(
    eventos.filter((e) => e.van >= MINIMO_POPULARES),
    vistos,
  );
  return candidatos.toSorted((a, b) => b.van - a.van || compararEventos(a, b));
}

/** Tope del carril estelar (decisión del founder, segunda vuelta de doc 41): "De tus favoritos" no es la lista
 *  entera de lo que sigue la persona, es una tira. */
export const TOPE_ESTELAR = 12;

/**
 * El carril estelar de Inicio, con sesión y seguimientos: "De tus favoritos", ponderado (destacado, luego «Voy»,
 * luego fecha) y con tope de 12 — sustituye al carril de destacados de la primera vuelta (bitácora 188).
 */
export function carrilEstelar<T extends Pick<EventoAgenda, "id" | "van" | "titulo" | "inicio">>(favoritos: T[], idsDestacados: Set<string>, vistos: Set<string>): T[] {
  const candidatos = sinRepetidos(favoritos, vistos);
  return candidatos
    .toSorted((a, b) => Number(idsDestacados.has(b.id)) - Number(idsDestacados.has(a.id)) || b.van - a.van || compararEventos(a, b))
    .slice(0, TOPE_ESTELAR);
}

/**
 * Sin favoritos (o sin sesión), el carril estelar se llama «Destacados esta semana»: el respaldo es la propia tira
 * de destacados (la que ya ordena la administración), pero solo lo de esta semana, para que el nombre sea cierto.
 */
export function carrilDestacadosEstaSemana<T extends Pick<EventoAgenda, "id" | "inicio" | "fin">>(destacadosEnOrden: T[], vistos: Set<string>, ahora: Date = new Date()): T[] {
  return sinRepetidos(eventosEstaSemana(destacadosEnOrden, ahora), vistos).slice(0, TOPE_ESTELAR);
}

/** Título del carril estelar: "De tus favoritos" si hay algo que mostrar de lo que la persona sigue; si no, el respaldo. */
export function tituloEstelar(hayFavoritos: boolean): string {
  return hayFavoritos ? "De tus favoritos" : "Destacados esta semana";
}

/** Lo mismo que `eventosEstaSemana`, pero contado sobre cuándo se publicó (`creado_en`), no sobre cuándo es el evento:
 *  el carril "Eventos nuevos esta semana" (segunda vuelta de doc 41) es simple a propósito, sin la memoria de última
 *  visita de la pestaña Nuevos que tenía Agenda (esa pestaña se quita; aquí basta con "publicado en los últimos 7 días"). */
export function carrilNuevos<T extends Pick<EventoAgenda, "id" | "creado_en" | "titulo" | "inicio">>(eventos: T[], vistos: Set<string>, ahora: Date = new Date()): T[] {
  const desde = ahora.getTime() - DIAS_ESTA_SEMANA * 86400000;
  const candidatos = sinRepetidos(eventos.filter((e) => new Date(e.creado_en).getTime() >= desde), vistos);
  return candidatos.toSorted((a, b) => b.creado_en.localeCompare(a.creado_en) || compararEventos(a, b));
}

/** Los tres carriles de Inicio que salen de una sola `cargarAgenda` (estelar, populares, nuevos): se calculan juntos y
 *  puros, a partir del mismo objeto `Agenda`, para poder recalcularlos sin red desde cualquier carril que los pida
 *  (streaming, OL-156: cada carril puede recalcular esto por su cuenta sin depender del orden de llegada de otro). */
export type CarrilesDeAgenda = { titulo: string; estelar: EventoAgenda[]; populares: EventoAgenda[]; nuevos: EventoAgenda[]; vistos: Set<string> };
export function calcularCarrilesAgenda(agenda: Agenda, ahora: Date = new Date()): CarrilesDeAgenda {
  const vistos = new Set<string>();
  const favoritos = filtrarAgenda(agenda.eventos, { filtro: "siguiendo", punto: null, seguidos: agenda.seguidos, eventosSeguidos: agenda.eventosSeguidos, fecha: "", ahora }).lista;
  const hayFavoritos = favoritos.length > 0;
  const estelar = hayFavoritos
    ? carrilEstelar(favoritos, new Set(agenda.destacados.map((d) => d.id)), vistos)
    : carrilDestacadosEstaSemana(enOrden(agenda.destacados, agenda.eventos), vistos, ahora);
  const populares = carrilPopulares(agenda.eventos, vistos);
  const nuevos = carrilNuevos(agenda.eventos, vistos, ahora);
  return { titulo: tituloEstelar(hayFavoritos), estelar, populares, nuevos, vistos };
}

/** Los ids que ya usaron los carriles de una `cargarAgenda` (estelar, populares, nuevos): el carril de Cercanos
 *  (cliente, en `Inicio.tsx`) los recibe para tampoco repetirlos, sin tener que esperar a los otros tres. */
export function idsUsadosEnAgenda(agenda: Agenda, ahora: Date = new Date()): string[] {
  return [...calcularCarrilesAgenda(agenda, ahora).vistos];
}

export type SeccionBuscador = "inicio" | "agenda" | "lugares" | "artistas";
export type GrupoBuscador = "eventos" | "lugares" | "artistas";

/**
 * El buscador único agrupa por tipo; qué grupo va primero lo manda la sección donde está la persona (doc 41, "El
 * buscador único"; L28: "que organice los resultados según la sección en la que está el usuario"). Desde Inicio o
 * Agenda, qué pasa antes que dónde y quién.
 */
export function ordenBusqueda(seccion: SeccionBuscador): GrupoBuscador[] {
  if (seccion === "lugares") return ["lugares", "eventos", "artistas"];
  if (seccion === "artistas") return ["artistas", "eventos", "lugares"];
  return ["eventos", "lugares", "artistas"];
}

/** Cuántos resultados por grupo: la sección donde ya está la persona se ve con más (doc 41: "5 en vez de 3"). */
export function limiteBusqueda(seccion: SeccionBuscador, grupo: GrupoBuscador): number {
  const propia: Partial<Record<SeccionBuscador, GrupoBuscador>> = { agenda: "eventos", lugares: "lugares", artistas: "artistas" };
  return propia[seccion] === grupo ? 5 : 3;
}
