/**
 * Pincel (OL-088, bitácora 123): lo puro de "crear obra aquí" y "activar desde un evento" — sin base de datos ni
 * React, para poder probarlo directo. El resto (consultas, acciones de servidor) vive en src/app/admin/obras-colectivas.
 */

/** Hora de cierre sugerida cuando no viene de un evento: dos horas desde ahora (ISO). */
export function cierreSugeridoIso(ahora: Date = new Date()): string {
  return new Date(ahora.getTime() + 2 * 60 * 60 * 1000).toISOString();
}

/** Cierre de una obra activada desde un evento: la hora de su fin, o dos horas después de su inicio si no tiene fin. */
export function cierreDesdeEvento(inicio: string, fin: string | null): string {
  return fin ?? cierreSugeridoIso(new Date(inicio));
}

/** "Pincel en {lugar}": nombre sugerido al crear una obra por ubicación, sin partir de un evento. */
export function nombreSugerido(lugarNombre: string): string {
  return `Pincel en ${lugarNombre}`;
}
