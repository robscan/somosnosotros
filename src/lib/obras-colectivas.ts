/**
 * Obras colectivas (OL-088, bitácora 123): lo común a cualquier obra, no solo Pincel — sugerir una hora de cierre a
 * partir de ahora o de un evento. Doc rediseno/25 (ajuste 3, firmado 2026-09-21): lo común vive separado de lo
 * propio de cada obra (para Pincel, eso es src/lib/pincel.ts) por orden de archivos, sin capa ni SDK nuevos.
 */

/** Hora de cierre sugerida cuando no viene de un evento: dos horas desde ahora (ISO). */
export function cierreSugeridoIso(ahora: Date = new Date()): string {
  return new Date(ahora.getTime() + 2 * 60 * 60 * 1000).toISOString();
}

/** Cierre de una obra activada desde un evento: la hora de su fin, o dos horas después de su inicio si no tiene fin. */
export function cierreDesdeEvento(inicio: string, fin: string | null): string {
  return fin ?? cierreSugeridoIso(new Date(inicio));
}
