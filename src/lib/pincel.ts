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
export type MensajeTrazo = { trazo: Trazo; color: string; deltas: Delta[]; remitente: string; grosor: number };

function numeroFinito(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function esDeltaValido(v: unknown): v is Delta {
  if (!v || typeof v !== "object") return false;
  const d = v as Record<string, unknown>;
  return numeroFinito(d.dx) && numeroFinito(d.dy) && Math.abs(d.dx) <= 1 && Math.abs(d.dy) <= 1;
}

/**
 * Grosor del trazo (founder, 2026-09-21): mientras mantiene presionado el punto del mando, arrastrar el dedo hacia
 * arriba engruesa, hacia abajo adelgaza; el punto siempre vuelve a su lugar al soltar (no queda un ajuste guardado
 * entre pulsaciones, es del gesto, no de una preferencia). `deltaY` es cuánto se movió el dedo desde que empezó a
 * presionar, positivo hacia arriba (al revés de la coordenada Y de la pantalla, que crece hacia abajo).
 */
export const GROSOR_BASE = 1;
/** Rango del grosor: 0.5 a 3.5 veces el trazo de siempre. En la pared, el trazo fino va de 1.5 a 10.5 px y el
 * aire de 4.5 a 31.5 px — un pincel gordo de verdad en una pared de 1280 px, no una diferencia de matiz. El rango es
 * 7:1 para que el punto del mando (16 px por unidad) vaya de 8 a 56 px, lo que pidió el gestor (2026-09-21). */
export const GROSOR_MIN = 0.5;
export const GROSOR_MAX = 3.5;
export const ARRASTRE_GROSOR_MAX_PX = 60;
/** Menos que esto es el temblor normal del dedo al mantener presionado, no un ajuste de grosor. */
export const UMBRAL_AJUSTE_PX = 8;

/**
 * Relativo a `grosorInicial` (el grosor que tenía el punto al empezar a presionar), no al grosor base: el gestor
 * pidió que el grosor SE QUEDE al soltar (solo el punto vuelve al centro), así que la siguiente pulsación tiene que
 * seguir desde donde quedó, no volver a 1 al primer movimiento. Un arrastre completo (`maxArrastre` px) desde el
 * grosor base llega justo al tope; desde otro grosor, se acota al tope sin pasarse.
 */
export function grosorDesdeArrastre(deltaY: number, grosorInicial = GROSOR_BASE, maxArrastre = ARRASTRE_GROSOR_MAX_PX): number {
  if (maxArrastre <= 0) return grosorInicial;
  const porPxArriba = (GROSOR_MAX - GROSOR_BASE) / maxArrastre;
  const porPxAbajo = (GROSOR_BASE - GROSOR_MIN) / maxArrastre;
  const grosor = grosorInicial + deltaY * (deltaY >= 0 ? porPxArriba : porPxAbajo);
  return Math.max(GROSOR_MIN, Math.min(GROSOR_MAX, grosor));
}

/** Mientras el dedo está más allá del umbral, se está ajustando el grosor: el mando NO manda trazo (gestor,
 * 2026-09-21), para que el arrastre vertical no se confunda con el movimiento del celular que pinta. */
export function estaAjustandoGrosor(desplazamiento: number, umbral = UMBRAL_AJUSTE_PX): boolean {
  return Math.abs(desplazamiento) > umbral;
}

/** El punto blanco del mando mide el grosor a escala del mando: 16 px por unidad de grosor (gestor, 2026-09-21:
 * «que el punto blanco mida el grosor real del trazo tal como se pintará en la pared a escala del mando, mínimo
 * ~8 px y máximo ~56 px»). Un primer intento con una escala de 0.8 a 1.25 sobre un glifo de ~10 px no se veía:
 * el punto pasaba de 10 a 12 px y, tras soltar, nadie sabía qué grosor llevaba. */
export const PX_POR_GROSOR_EN_MANDO = 16;

/** Diámetro del punto blanco, en px, para un grosor dado: 8 en el mínimo, 16 en el base, 56 en el tope. Cambia
 * de forma continua mientras se arrastra y se queda al soltar. Es el tamaño del punto, no del botón (128 px fijos)
 * ni de la rejilla. */
export function diametroDelPunto(grosor: number): number {
  const acotado = Math.max(GROSOR_MIN, Math.min(GROSOR_MAX, grosor));
  return acotado * PX_POR_GROSOR_EN_MANDO;
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
    m.remitente.length > 0 &&
    numeroFinito(m.grosor) &&
    m.grosor > 0 &&
    m.grosor <= GROSOR_MAX + 0.001
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

/**
 * Cupo y fila (doc rediseno/34, firmado 2026-09-21): quién pinta y quién espera, sin turno con tiempo máximo. Cada
 * mando hace `track()` en el Presence del canal de la obra con su remitente y su hora de llegada; el orden es por
 * esa hora y, si dos llegan en el mismo instante, se desempata con el `presence_ref` que Presence ya da a cada
 * conexión (para que la pared y cada mando vean el mismo orden). Puro, sin depender del tipo exacto que da
 * `@supabase/realtime-js` — `entradasDesdePresencia` es lo único que lo toca, y por duck-typing.
 */
export type EntradaPresencia = { remitente: string; llegada: number; presenceRef: string };

/** El estado que da `RealtimeChannel.presenceState()`: por clave de presencia, un arreglo de lo que cada quien
 * trackeó (siempre trae `presence_ref`; lo demás es lo que mandó `track()`, sin garantía de forma). */
export function entradasDesdePresencia(estado: Record<string, Array<Record<string, unknown>>>): EntradaPresencia[] {
  const entradas: EntradaPresencia[] = [];
  for (const clave of Object.keys(estado)) {
    for (const p of estado[clave]) {
      if (typeof p.remitente === "string" && p.remitente.length > 0 && typeof p.llegada === "number" && typeof p.presence_ref === "string") {
        entradas.push({ remitente: p.remitente, llegada: p.llegada, presenceRef: p.presence_ref });
      }
    }
  }
  return entradas;
}

/** Por hora de llegada; empate, por `presenceRef` (orden estable, igual para todos). */
export function ordenDeFila(entradas: EntradaPresencia[]): EntradaPresencia[] {
  return [...entradas].sort((a, b) => a.llegada - b.llegada || a.presenceRef.localeCompare(b.presenceRef));
}

/** Los remitentes de los primeros `cupo` de la fila — quienes pueden pintar ahora mismo. Lo usa también la pared,
 * para descartar el trazo de quien no está en este conjunto (el freno no puede depender solo del propio mando). */
export function quienesPintan(entradas: EntradaPresencia[], cupo: number): Set<string> {
  return new Set(ordenDeFila(entradas).slice(0, Math.max(0, cupo)).map((e) => e.remitente));
}

export type EstadoDeFila =
  | { tipo: "pintando" }
  | { tipo: "esperando"; lugar: number; esperando: number }
  | { tipo: "fuera" }; // remitente sin trackear todavía (antes del primer sync)

/** El estado de un remitente en concreto: si pinta, o su lugar («vas el N») y cuántos esperan en total. */
export function estadoDeFila(entradas: EntradaPresencia[], cupo: number, remitente: string): EstadoDeFila {
  const orden = ordenDeFila(entradas);
  const i = orden.findIndex((e) => e.remitente === remitente);
  if (i === -1) return { tipo: "fuera" };
  if (i < cupo) return { tipo: "pintando" };
  return { tipo: "esperando", lugar: i - cupo + 1, esperando: orden.length - cupo };
}
