import { compararEventos, corteNuevos, eventosNuevos, filtrarAgenda, LIMITE_NUEVOS, type EventoAgenda } from "./agenda";
import type { Agenda } from "./cargarAgenda";
import { DIAS_ESTA_SEMANA } from "./cuando";
import { enOrden } from "./destacados";
import { terminaDe } from "./fechas";

/**
 * Inicio: siete carriles (docs/rediseno/41, tercera vuelta OL-219, bitácora 246/248; doc 50, P5, quitó «Cerca de ti»,
 * «Populares» y «Artistas con eventos»: el prototipo firmado trae seis; OL-253, bitácora 280, repuso «Artistas con eventos
 * esta semana» por decisión del founder). Aquí solo lo que se puede probar sin
 * base de datos ni navegador: la ventana de "esta semana", el peso de "Tus planes" y del carril estelar, el orden de
 * Nuevos eventos (con su criterio nuevo, que ya no compite con "Esta semana") y que no se repita un evento entre carriles.
 */

/** "Esta semana" = próximos 7 días desde ahora (decisión del founder, segunda vuelta de doc 41): no es la semana de
 *  calendario (`DIAS_ESTA_SEMANA`, lib/cuando). Un evento que ya empezó cuenta hasta su fin o la medianoche de su zona, igual que Agenda. */
export function eventosEstaSemana<T extends Pick<EventoAgenda, "inicio" | "fin" | "zona">>(eventos: T[], ahora: Date = new Date()): T[] {
  const desde = ahora.getTime();
  const hasta = desde + DIAS_ESTA_SEMANA * 86400000;
  return eventos.filter((e) => new Date(terminaDe(e.inicio, e.fin, e.zona)).getTime() >= desde && new Date(e.inicio).getTime() < hasta);
}

/**
 * Ningún evento se repite entre dos carriles de Inicio (doc 41, "Sin duplicar eventos"): el que ya salió en uno
 * anterior no vuelve a salir en el siguiente. `vistos` se muta a propósito: cada carril se calcula en el orden de
 * la pantalla (favoritos, destacados, esta semana, nuevos) y cada uno amplía el conjunto para el que sigue.
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

/** Tope del carril estelar (decisión del founder, segunda vuelta de doc 41): "Seleccionados para ti" (antes "De tus
 *  favoritos", renombrado en OL-219) no es la lista entera de lo que sigue la persona, es una tira. */
export const TOPE_ESTELAR = 12;

/**
 * El carril estelar de Inicio, con sesión y seguimientos: «Seleccionados para ti». Primero los destacados de la administración, en su
 * orden (`tira_destacados`), sean o no de lo que la persona sigue; después el resto de lo que sigue, por «Voy» y luego por fecha.
 * Sin repetidos y con tope de 12. Solo lo que sale queda como visto: lo que el tope deja fuera puede salir en «Esta semana» o «Nuevos».
 *
 * Cambia la regla de la bitácora 188 (ahí los destacados solo ordenaban dentro de los favoritos) por decisión del founder del 2026-09-30:
 * «Que pasó con eventos destacados? Ya no se ven en el inicio cuando usuario tiene sección activa. Los puedes meter en seleccionados para ti?».
 */
export function carrilEstelar<T extends Pick<EventoAgenda, "id" | "van" | "titulo" | "inicio">>(destacadosEnOrden: T[], favoritos: T[], vistos: Set<string>): T[] {
  const idsDestacados = new Set(destacadosEnOrden.map((e) => e.id));
  const candidatos = favoritos.filter((e) => !idsDestacados.has(e.id));
  // Si falta algún recuento, orden cronológico para todo el grupo (comparador transitivo, sin ceros inventados).
  const recuentosCompletos = candidatos.every((e) => e.van !== null);
  const resto = candidatos.toSorted((a, b) => (recuentosCompletos ? b.van! - a.van! : 0) || compararEventos(a, b));
  const propios = sinRepetidos([...destacadosEnOrden, ...resto], new Set(vistos)).slice(0, TOPE_ESTELAR);
  for (const e of propios) vistos.add(e.id);
  return propios;
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

/** Título del carril estelar: "Seleccionados para ti" si la persona sigue algo con eventos próximos (y entonces lleva, primero, los
 *  destacados de la administración); si no, el respaldo "Destacados" (renombrados en la segunda vuelta del prototipo de OL-219: antes
 *  "De tus favoritos" y "Destacados esta semana"). */
export function tituloEstelar(hayFavoritos: boolean): string {
  return hayFavoritos ? "Seleccionados para ti" : "Destacados";
}

/** Tope de "Esta semana" (nuevo carril, OL-219): más alto que el del carril estelar, porque este carril presume
 *  ser "todos" los eventos de los próximos 7 días — propuesta del operador, aceptada por el founder en el encargo. */
export const TOPE_ESTA_SEMANA = 20;

/**
 * «Esta semana» (nuevo, OL-219): todos los eventos de los próximos 7 días, por fecha, con o sin sesión. A
 * diferencia de Nuevos eventos, no tiene piso: con 1 o 2 eventos se ve igual de corto, nunca vacío de
 * mentira (esa regla es solo de Nuevos eventos, ver `carrilNuevos`).
 */
export function carrilEstaSemana<T extends Pick<EventoAgenda, "id" | "titulo" | "inicio" | "fin" | "zona">>(eventos: T[], vistos: Set<string>, ahora: Date = new Date()): T[] {
  const candidatos = eventosEstaSemana(eventos, ahora).toSorted(compararEventos);
  return sinRepetidos(candidatos, vistos).slice(0, TOPE_ESTA_SEMANA);
}

/** Mínimo de Destacados (doc 20: al menos 3): con menos de 3 candidatos, "Nuevos eventos" no se pinta — ni con 1 ni con
 *  2, el mismo colapso sin hueco que un carril vacío. */
export const MINIMO_NUEVOS = 3;

/**
 * "Nuevos eventos" (segunda vuelta del prototipo de OL-219, cambia de criterio, no solo de nombre): lo nuevo (`eventosNuevos`, la misma
 * definición de la pestaña Nuevos de Agenda, a donde lleva su «Ver la agenda») con fecha DESPUÉS de la ventana de "Esta semana" — ya no
 * compite por los mismos eventos recién publicados dentro de esos 7 días (antes se llamaba "Eventos nuevos esta semana" y sí competía; el
 * `Set` de deduplicación decidía quién se los quedaba, a veces dejando este carril casi vacío). De lo más reciente hacia atrás; a igual
 * publicación, el orden de siempre de la agenda. Tope de `LIMITE_NUEVOS` antes de enviar tarjetas al cliente; se continúa en Agenda.
 *
 * El servidor no sabe cuándo miró la persona por última vez (esa marca vive en su teléfono): aquí «nuevo» es lo de los últimos 7 días y
 * `CarrilNuevos`, ya en el teléfono, deja lo que sigue siéndolo para ella.
 *
 * El umbral de 3 se comprueba ANTES de tocar `vistos`: un candidato que no llega al mínimo no se muta al conjunto
 * compartido, para que un carril que de todos modos no se pinta no le quite, por accidente, un evento a otro.
 */
export function carrilNuevos<T extends Pick<EventoAgenda, "id" | "creado_en" | "titulo" | "inicio">>(eventos: T[], vistos: Set<string>, ahora: Date = new Date()): T[] {
  const empiezaDespuesDeEstaSemana = ahora.getTime() + DIAS_ESTA_SEMANA * 86400000;
  const candidatos = eventosNuevos(eventos, corteNuevos(null, ahora)).filter((e) => new Date(e.inicio).getTime() >= empiezaDespuesDeEstaSemana && !vistos.has(e.id));
  if (candidatos.length < MINIMO_NUEVOS) return [];
  const propios = candidatos.slice(0, LIMITE_NUEVOS);
  for (const e of propios) vistos.add(e.id);
  return propios;
}

/** Los tres carriles de eventos de Inicio que salen de una sola `cargarAgenda` (estelar, esta semana, nuevos): se calculan
 *  juntos y puros, a partir del mismo objeto `Agenda`, para poder recalcularlos sin red desde cualquier carril que los
 *  pida (streaming, OL-156: cada carril puede recalcular esto por su cuenta sin depender del orden de llegada de otro).
 *  «Tus planes» (Voy y Me interesa) sí les quita eventos, pero solo al cargar (founder, 2026-10-01, sobre la regla de OL-221:
 *  «Seleccionados para ti» no debe repetir lo que ya está en Tus planes): los ids vienen de `agenda.asistencias`, lo decidido
 *  hasta esa carga. Lo que la persona decide durante la visita no recalcula nada y la tarjeta se queda donde está (si no,
 *  al tocar «Voy» desaparecería de la fila donde se tocó, la queja de OL-221); en la próxima carga ya no sale. Sin sesión
 *  (`asistencias` es null) nada cambia. */
export type CarrilesDeAgenda = { titulo: string; estelar: EventoAgenda[]; estaSemana: EventoAgenda[]; nuevos: EventoAgenda[] };
export function calcularCarrilesAgenda(agenda: Agenda, ahora: Date = new Date()): CarrilesDeAgenda {
  const vistos = new Set(Object.keys(agenda.asistencias ?? {}));
  const favoritos = filtrarAgenda(agenda.eventos, { siguiendo: true, seguidos: agenda.seguidos, eventosSeguidos: agenda.eventosSeguidos, cuando: null });
  const hayFavoritos = favoritos.length > 0;
  const destacados = enOrden(agenda.destacados, agenda.eventos);
  const estelar = hayFavoritos ? carrilEstelar(destacados, favoritos, vistos) : carrilDestacados(destacados, vistos);
  const estaSemana = carrilEstaSemana(agenda.eventos, vistos, ahora);
  const nuevos = carrilNuevos(agenda.eventos, vistos, ahora);
  return { titulo: tituloEstelar(hayFavoritos), estelar, estaSemana, nuevos };
}
