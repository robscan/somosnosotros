import { compararEventos, filtrarAgenda, type EventoAgenda } from "./agenda";
import type { Agenda } from "./cargarAgenda";
import { enOrden } from "./destacados";

/**
 * Inicio: nueve carriles (docs/rediseno/41, tercera vuelta OL-219, bitácora 246/248). Aquí solo lo que se puede
 * probar sin base de datos ni navegador: la ventana de "esta semana", el peso de "Tus planes" y del carril estelar,
 * el orden de Populares y de Nuevos eventos (con su criterio nuevo, que ya no compite con "Esta semana"), que no se
 * repita un evento entre carriles y en qué orden salen los grupos del buscador único según la sección.
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

/**
 * «Tus planes» (nuevo, OL-219): Voy y Me interesa juntos, por fecha — exactamente lo que ya junta `ActividadPersona`
 * para Mi perfil (`cargarPersona()`, ya filtrado a solo futuros). No es un dato nuevo, es la unión ordenada de dos
 * listas que ya existen. Mismo tope que el carril estelar (una tira, no la lista entera de Perfil).
 */
export function carrilTusPlanes<T extends Pick<EventoAgenda, "id" | "titulo" | "inicio">>(voy: T[], interesan: T[]): T[] {
  return [...voy, ...interesan].toSorted(compararEventos).slice(0, TOPE_ESTELAR);
}

/** Mismo mínimo que Destacados (doc 20: al menos 3 "Voy", sin contar administración) para no inventar un segundo
 *  criterio de popularidad que compita con el ya firmado. */
export const MINIMO_POPULARES = 3;

/** El carril "Populares" (antes "Eventos populares"; OL-219 le quitó el "Eventos" del nombre, no el criterio):
 *  de mayor a menor número de "Voy", indistinto entre semanas; a igualdad, el orden de siempre de la agenda. */
export function carrilPopulares<T extends Pick<EventoAgenda, "id" | "van" | "titulo" | "inicio">>(eventos: T[], vistos: Set<string>): T[] {
  const candidatos = sinRepetidos(
    eventos.filter((e) => e.van >= MINIMO_POPULARES),
    vistos,
  );
  return candidatos.toSorted((a, b) => b.van - a.van || compararEventos(a, b));
}

/** Tope del carril estelar (decisión del founder, segunda vuelta de doc 41): "Seleccionados para ti" (antes "De tus
 *  favoritos", renombrado en OL-219) no es la lista entera de lo que sigue la persona, es una tira. */
export const TOPE_ESTELAR = 12;

/**
 * El carril estelar de Inicio, con sesión y seguimientos: "Seleccionados para ti", ponderado (destacado, luego
 * «Voy», luego fecha) y con tope de 12 — sustituye al carril de destacados de la primera vuelta (bitácora 188).
 */
export function carrilEstelar<T extends Pick<EventoAgenda, "id" | "van" | "titulo" | "inicio">>(favoritos: T[], idsDestacados: Set<string>, vistos: Set<string>): T[] {
  const candidatos = sinRepetidos(favoritos, vistos);
  return candidatos
    .toSorted((a, b) => Number(idsDestacados.has(b.id)) - Number(idsDestacados.has(a.id)) || b.van - a.van || compararEventos(a, b))
    .slice(0, TOPE_ESTELAR);
}

/**
 * Sin favoritos (o sin sesión), el carril estelar se llama «Destacados»: el respaldo es la propia tira de
 * destacados, en el orden que ya decide la administración (`tira_destacados`). Antes ("Destacados esta semana",
 * segunda vuelta de doc 41) recortaba a solo lo de los próximos 7 días; el founder pidió quitar "esta semana" del
 * nombre (tercera vuelta, tabla de la sección 5) y con el nombre se fue también el recorte — el horizonte de este
 * respaldo ya no tiene tope de fecha propio: es tal cual lo decidió la administración (acotado, eso sí, a lo que
 * `agenda.eventos` trae: eventos visibles que todavía no terminan, `filtroSinPasar`).
 */
export function carrilDestacados<T extends { id: string }>(destacadosEnOrden: T[], vistos: Set<string>): T[] {
  return sinRepetidos(destacadosEnOrden, vistos).slice(0, TOPE_ESTELAR);
}

/** Título del carril estelar: "Seleccionados para ti" si hay algo que mostrar de lo que la persona sigue; si no, el
 *  respaldo "Destacados" (renombrados en la segunda vuelta del prototipo de OL-219: antes "De tus favoritos" y
 *  "Destacados esta semana"). */
export function tituloEstelar(hayFavoritos: boolean): string {
  return hayFavoritos ? "Seleccionados para ti" : "Destacados";
}

/** Tope de "Esta semana" (nuevo carril, OL-219): más alto que el del carril estelar, porque este carril presume
 *  ser "todos" los eventos de los próximos 7 días — propuesta del operador, aceptada por el founder en el encargo. */
export const TOPE_ESTA_SEMANA = 20;

/**
 * «Esta semana» (nuevo, OL-219): todos los eventos de los próximos 7 días, por fecha, con o sin sesión. A
 * diferencia de Populares o de Nuevos eventos, no tiene piso: con 1 o 2 eventos se ve igual de corto, nunca vacío de
 * mentira (esa regla es solo de Nuevos eventos, ver `carrilNuevos`).
 */
export function carrilEstaSemana<T extends Pick<EventoAgenda, "id" | "titulo" | "inicio" | "fin">>(eventos: T[], vistos: Set<string>, ahora: Date = new Date()): T[] {
  const candidatos = eventosEstaSemana(eventos, ahora).toSorted(compararEventos);
  return sinRepetidos(candidatos, vistos).slice(0, TOPE_ESTA_SEMANA);
}

/** Mismo umbral que Populares (doc 41, segunda vuelta del prototipo): con menos de 3 candidatos, "Nuevos eventos"
 *  no se pinta — ni con 1 ni con 2, el mismo colapso sin hueco que un carril vacío. */
export const MINIMO_NUEVOS = MINIMO_POPULARES;

/**
 * "Nuevos eventos" (segunda vuelta del prototipo de OL-219, cambia de criterio, no solo de nombre): publicado en
 * los últimos 7 días Y con fecha DESPUÉS de la ventana de "Esta semana" — ya no compite por los mismos eventos
 * recién publicados dentro de esos 7 días (antes se llamaba "Eventos nuevos esta semana" y sí competía; el `Set`
 * de deduplicación decidía quién se los quedaba, a veces dejando este carril casi vacío). De lo más reciente hacia
 * atrás; a igual publicación, el orden de siempre de la agenda.
 *
 * El umbral de 3 se comprueba ANTES de tocar `vistos`: un candidato que no llega al mínimo no se muta al conjunto
 * compartido, para que un carril que de todos modos no se pinta no le quite, por accidente, un evento a "Cerca de
 * ti" (que llega después, en el cliente).
 */
export function carrilNuevos<T extends Pick<EventoAgenda, "id" | "creado_en" | "titulo" | "inicio">>(eventos: T[], vistos: Set<string>, ahora: Date = new Date()): T[] {
  const publicadoDesde = ahora.getTime() - DIAS_ESTA_SEMANA * 86400000;
  const empiezaDespuesDeEstaSemana = ahora.getTime() + DIAS_ESTA_SEMANA * 86400000;
  const candidatos = eventos.filter((e) => new Date(e.creado_en).getTime() >= publicadoDesde && new Date(e.inicio).getTime() >= empiezaDespuesDeEstaSemana && !vistos.has(e.id));
  if (candidatos.length < MINIMO_NUEVOS) return [];
  for (const e of candidatos) vistos.add(e.id);
  return candidatos.toSorted((a, b) => b.creado_en.localeCompare(a.creado_en) || compararEventos(a, b));
}

/** Los cuatro carriles de eventos de Inicio que salen de una sola `cargarAgenda` (estelar, esta semana, populares,
 *  nuevos): se calculan juntos y puros, a partir del mismo objeto `Agenda`, para poder recalcularlos sin red desde
 *  cualquier carril que los pida (streaming, OL-156: cada carril puede recalcular esto por su cuenta sin depender
 *  del orden de llegada de otro). "Tus planes" no entra en la regla de no repetir (founder, 2026-09-26, OL-221): es la
 *  agenda de la persona, no un carril de descubrir; si le quitaba eventos a estos, al tocar «Voy» el evento
 *  desaparecía de la fila donde se tocó. Aquí sigue saliendo, con su check de «Voy». */
export type CarrilesDeAgenda = { titulo: string; estelar: EventoAgenda[]; estaSemana: EventoAgenda[]; populares: EventoAgenda[]; nuevos: EventoAgenda[]; vistos: Set<string> };
export function calcularCarrilesAgenda(agenda: Agenda, ahora: Date = new Date()): CarrilesDeAgenda {
  const vistos = new Set<string>();
  const favoritos = filtrarAgenda(agenda.eventos, { filtro: "siguiendo", punto: null, seguidos: agenda.seguidos, eventosSeguidos: agenda.eventosSeguidos, fecha: "", ahora }).lista;
  const hayFavoritos = favoritos.length > 0;
  const estelar = hayFavoritos
    ? carrilEstelar(favoritos, new Set(agenda.destacados.map((d) => d.id)), vistos)
    : carrilDestacados(enOrden(agenda.destacados, agenda.eventos), vistos);
  const estaSemana = carrilEstaSemana(agenda.eventos, vistos, ahora);
  const populares = carrilPopulares(agenda.eventos, vistos);
  const nuevos = carrilNuevos(agenda.eventos, vistos, ahora);
  return { titulo: tituloEstelar(hayFavoritos), estelar, estaSemana, populares, nuevos, vistos };
}

/** Los ids que ya usaron los carriles de eventos de Inicio (estelar, esta semana, populares, nuevos; no "Tus planes"):
 *  el carril de Cercanos (cliente, en `Inicio.tsx`) los recibe para tampoco repetirlos, sin tener que esperar a los
 *  otros. Con esto, "Cerca de ti" excluye también lo que ya se llevó "Esta semana" (founder, encargo de OL-219). */
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
