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

/** Nombre del evento de Broadcast en el canal de la obra (`abrirCanalObra`). */
export const EVENTO_TRAZO = "trazo";

/**
 * Un mando NO manda un mensaje por cada muestra del sensor (gestión de cambios, revisión 2026-09-21, con el cupo
 * real de Supabase Realtime citado más abajo): el teléfono sigue muestreando el sensor a su ritmo mientras el
 * botón está presionado, pero solo MANDA `MENSAJES_POR_SEGUNDO` veces por segundo, cada uno con el arreglo de
 * deltas juntados desde el mensaje anterior. La pared dibuja todos los deltas de un mismo mensaje seguidos: se ve
 * igual de fluido, cuesta una fracción de los mensajes.
 */
export const MENSAJES_POR_SEGUNDO = 3;
/** Tope de deltas por mensaje: a `MENSAJES_POR_SEGUNDO = 3` y un sensor muestreado hasta a 60 Hz, un mensaje no
 * debería juntar más de ~20; es también el límite que exige `esMensajeTrazoValido` (contra un mensaje fabricado
 * a mano con miles de deltas). */
export const DELTAS_MAX_POR_MENSAJE = 20;

/** Delta de movimiento del sensor desde la muestra anterior, no una coordenada absoluta (doc de Fase 0 §2: la
 * pared no necesita saber dónde "está" el teléfono, solo hacia dónde se movió). */
export type Delta = { dx: number; dy: number };

/**
 * Lo que viaja por el canal: un trazo, una tinta, los deltas juntados desde el último mensaje, y quién lo manda.
 * `remitente` (el id de perfil de quien pinta) es necesario ya en la Fase 2 bloque 3, antes de la fila de espera:
 * sin saber de quién es cada delta, la pared no puede seguir el trazo de cada persona por separado y los mezclaría
 * en un solo pincel fantasma. Cuando llegue la fila (doc rediseno/34), la pared lo cruza además contra su cupo —
 * hoy solo distingue un trazo de otro. No es una prueba criptográfica de identidad (un cliente modificado podría
 * mandar el remitente de otra persona): el canal ya exige sesión (`private: true`); esto es solo para que dos
 * pinceles no se confundan, no una medida de seguridad aparte — aceptado así a propósito, sin generalizar.
 */
export type MensajeTrazo = { trazo: Trazo; color: string; deltas: Delta[]; remitente: string };

function numeroFinito(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function esDeltaValido(v: unknown): v is Delta {
  if (!v || typeof v !== "object") return false;
  const d = v as Record<string, unknown>;
  return numeroFinito(d.dx) && numeroFinito(d.dy) && Math.abs(d.dx) <= 1 && Math.abs(d.dy) <= 1;
}

/** Antes de dibujar con lo que llegó del canal: la pared no confía en el payload de otro cliente sin mirarlo. */
export function esMensajeTrazoValido(v: unknown): v is MensajeTrazo {
  if (!v || typeof v !== "object") return false;
  const m = v as Record<string, unknown>;
  return (
    TRAZOS.some((t) => t.id === m.trazo) &&
    TINTAS.some((t) => t.valor === m.color) &&
    Array.isArray(m.deltas) &&
    m.deltas.length > 0 &&
    m.deltas.length <= DELTAS_MAX_POR_MENSAJE &&
    m.deltas.every(esDeltaValido) &&
    typeof m.remitente === "string" &&
    m.remitente.length > 0
  );
}

/**
 * Cómo se dibuja un trazo en la pared (Fase 2 bloque 3): puro, sin `<canvas>`, para poder probarlo. La pared
 * guarda un punto por remitente (dónde va su pincel ahora) y, con cada mensaje, calcula los segmentos a trazar
 * desde ahí — el delta normalizado (-1..1) del sensor se convierte en píxeles con `ESCALA_DELTA_PX`, y si el
 * trazo se saldría del lienzo, rebota en vez de perderse fuera de la vista.
 */
export type Punto = { x: number; y: number };

/** Cuánto mueve el pincel en el lienzo un delta de sensor de magnitud 1 (a ojo, ajustable si en la prueba con el
 * founder se ve muy corto o muy largo). */
export const ESCALA_DELTA_PX = 24;

function rebotar(v: number, max: number): number {
  if (max <= 0) return 0;
  const ciclo = 2 * max;
  let m = v % ciclo;
  if (m < 0) m += ciclo;
  return m <= max ? m : ciclo - m;
}

/** Un punto de arranque estable por remitente (mismo remitente, mismo inicio): no es al azar en cada mensaje, para
 * que un segundo mensaje de la misma persona siga desde donde se quedó el primero, no desde otro lado. */
export function puntoInicial(remitente: string, ancho: number, alto: number): Punto {
  let hash = 0;
  for (let i = 0; i < remitente.length; i++) hash = (Math.imul(hash, 31) + remitente.charCodeAt(i)) >>> 0;
  return { x: rebotar(hash % 10007, ancho), y: rebotar(Math.floor(hash / 10007) % 10007, alto) };
}

/** A partir de dónde estaba el pincel de una persona y los deltas de su mensaje, da los segmentos a trazar (uno
 * por delta, para dibujarlos en orden) y el punto donde queda, listo para el siguiente mensaje de esa persona. */
export function siguientesSegmentos(desde: Punto, deltas: Delta[], ancho: number, alto: number): { segmentos: [Punto, Punto][]; hasta: Punto } {
  const segmentos: [Punto, Punto][] = [];
  let actual = desde;
  for (const d of deltas) {
    const siguiente = { x: rebotar(actual.x + d.dx * ESCALA_DELTA_PX, ancho), y: rebotar(actual.y + d.dy * ESCALA_DELTA_PX, alto) };
    segmentos.push([actual, siguiente]);
    actual = siguiente;
  }
  return { segmentos, hasta: actual };
}

/** Lo que da `DeviceOrientationEvent`: solo lo que se usa aquí, del sensor real o de una muestra guardada. */
export type Orientacion = { beta: number | null; gamma: number | null };

/**
 * El mando (Fase 2 bloque 3): convierte dos lecturas seguidas del sensor de orientación en un delta normalizado
 * (-1..1), no en la lectura absoluta — la pared no necesita saber "hacia dónde apunta" el teléfono, solo cuánto
 * cambió desde la última muestra. `sensibilidadGrados` es cuántos grados de cambio valen un delta de magnitud 1;
 * más chico, más sensible. Si falta cualquiera de las dos lecturas (el sensor todavía no dio su primer dato),
 * no hay delta que mandar.
 */
export function deltaDesdeOrientacion(anterior: Orientacion | null, actual: Orientacion, sensibilidadGrados = 6): Delta {
  if (!anterior || anterior.beta === null || anterior.gamma === null || actual.beta === null || actual.gamma === null) {
    return { dx: 0, dy: 0 };
  }
  const acotar = (v: number) => Math.max(-1, Math.min(1, v / sensibilidadGrados));
  return { dx: acotar(actual.gamma - anterior.gamma), dy: acotar(actual.beta - anterior.beta) };
}
