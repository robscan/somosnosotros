import { compararEventos, type EventoAgenda } from "./agenda";

/**
 * Inicio: seis carriles (docs/rediseno/41, OL-153, bitácora 188). Aquí solo lo que se puede probar sin base de
 * datos ni navegador: la ventana de "esta semana", el orden de Populares, que no se repita un evento entre
 * carriles y en qué orden salen los grupos del buscador único según la sección.
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
