import type { EventoAgenda } from "./agenda";

/**
 * La marca de Nuevos (docs/rediseno/23): cuándo se miró esa pestaña por última vez, una por ciudad (mirar una no marca como vistos los
 * eventos de otra). Vive en el propio teléfono, como lo último que se abrió desde Buscar (`localStorage`): hoy casi todos entran sin cuenta
 * y el filtro de Nuevos ya corre en el teléfono, así que no hace falta tocar el servidor. No se reutiliza `novedades_vistas_en` (cuándo se
 * abrió `/novedades`): pegarlas haría que abrir Novedades vaciara Nuevos. Si el almacén no está o falla, no pasa nada: sin marca, Nuevos
 * mira los últimos 7 días (`corteNuevos`).
 */
const LLAVE = "somosnosotros:nuevos-visto";

/** Lo que se usa del almacén (en las pruebas, uno de mentira). */
export type Almacen = Pick<Storage, "getItem" | "setItem">;

function almacenLocal(): Almacen | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null; // modo privado o almacenamiento bloqueado
  }
}

const llave = (ciudad: string) => `${LLAVE}:${ciudad}`;

/** La marca de esa ciudad tal como está guardada (un texto estable, lo que lee `useSyncExternalStore`), o null si no hay o no se puede leer. */
export function marcaNuevosVisto(ciudad: string, almacen: Almacen | null = almacenLocal()): string | null {
  try {
    return almacen?.getItem(llave(ciudad)) ?? null;
  } catch {
    return null;
  }
}

/**
 * Deja constancia de lo que se enseñó: la marca pasa a un instante después de la publicación más reciente de `eventos` (lo que ya estaba
 * cargado al mirar), no a la hora del toque. Lo publicado mientras tanto todavía no se ha visto, y marcar la hora del toque lo dejaría fuera
 * de Nuevos para siempre; además todo sale del reloj del servidor, así que un teléfono con la hora mal puesta no esconde nada. Una lista vieja
 * (otra pestaña del navegador) no hace retroceder una marca más nueva.
 */
export function marcarNuevosVisto(ciudad: string, eventos: Pick<EventoAgenda, "creado_en">[], almacen: Almacen | null = almacenLocal()): void {
  const sello = Math.max(...eventos.map((e) => new Date(e.creado_en).getTime())) + 1;
  if (!Number.isFinite(sello)) return; // sin eventos o con una fecha ilegible no hay nada que marcar
  if (sello <= new Date(marcaNuevosVisto(ciudad, almacen) ?? NaN).getTime()) return;
  try {
    almacen?.setItem(llave(ciudad), new Date(sello).toISOString());
  } catch {}
}
