/**
 * Pincel (OL-088, bitácora 123): lo propio de Pincel, no lo común a cualquier obra colectiva (eso vive en
 * src/lib/obras-colectivas.ts, doc rediseno/25 ajuste 3) — sin base de datos ni React, para poder probarlo directo.
 * El resto (consultas, acciones de servidor) vive en src/app/admin/obras-colectivas.
 */

/** "Pincel en {lugar}": nombre sugerido al crear una obra por ubicación, sin partir de un evento. */
export function nombreSugerido(lugarNombre: string): string {
  return `Pincel en ${lugarNombre}`;
}

/**
 * Fase 2 bloque 2: el mensaje que viaja por el canal en vivo (doc rediseno/25: "el mensaje... pincel, color,
 * movimiento" es propio de Pincel; el canal en sí es común, ver `src/lib/canal-obra.ts`). Cuatro trazos y cinco
 * tintas, los mismos del prototipo firmado (OL-084, bitácora 118, `experiments/pincel-prototipo/core.mjs`) — no
 * se inventan de nuevo.
 */
export type Trazo = "trazo" | "aire" | "spray" | "organico";

export const TRAZOS: { id: Trazo; etiqueta: string }[] = [
  { id: "trazo", etiqueta: "Trazo" },
  { id: "aire", etiqueta: "Aire" },
  { id: "spray", etiqueta: "Spray" },
  { id: "organico", etiqueta: "Orgánico" },
];

export const TINTAS: { valor: string; etiqueta: string }[] = [
  { valor: "#141414", etiqueta: "Negro" },
  { valor: "#e4552f", etiqueta: "Cempasúchil" },
  { valor: "#286b57", etiqueta: "Verde" },
  { valor: "#6d4fc2", etiqueta: "Violeta" },
  { valor: "#dfb32f", etiqueta: "Sol" },
];

/** Nombre del evento de Broadcast en el canal de la obra (`abrirCanalObra`): un mando manda uno por cada muestra
 * del sensor mientras el botón está presionado, la pared los recibe y dibuja. */
export const EVENTO_TRAZO = "trazo";

/** Delta de movimiento del sensor desde la última muestra, no una coordenada absoluta (doc de Fase 0 §2: la pared
 * no necesita saber dónde "está" el teléfono, solo hacia dónde se movió desde el último mensaje). */
export type MensajeTrazo = { trazo: Trazo; color: string; dx: number; dy: number };

function numeroFinito(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/** Antes de dibujar con lo que llegó del canal: la pared no confía en el payload de otro cliente sin mirarlo. */
export function esMensajeTrazoValido(v: unknown): v is MensajeTrazo {
  if (!v || typeof v !== "object") return false;
  const m = v as Record<string, unknown>;
  return (
    TRAZOS.some((t) => t.id === m.trazo) &&
    TINTAS.some((t) => t.valor === m.color) &&
    numeroFinito(m.dx) &&
    numeroFinito(m.dy) &&
    Math.abs(m.dx) <= 1 &&
    Math.abs(m.dy) <= 1
  );
}
