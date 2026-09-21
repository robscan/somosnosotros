/**
 * Pincel (OL-088, bitácora 123): lo propio de Pincel, no lo común a cualquier obra colectiva (eso vive en
 * src/lib/obras-colectivas.ts, doc rediseno/25 ajuste 3) — sin base de datos ni React, para poder probarlo directo.
 * El resto (consultas, acciones de servidor) vive en src/app/admin/obras-colectivas.
 */

/** "Pincel en {lugar}": nombre sugerido al crear una obra por ubicación, sin partir de un evento. */
export function nombreSugerido(lugarNombre: string): string {
  return `Pincel en ${lugarNombre}`;
}
