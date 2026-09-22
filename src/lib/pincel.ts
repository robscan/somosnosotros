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
 * botón está presionado, pero solo MANDA `ritmoDeTrazo(cupo)` veces por segundo (6 con el cupo de 10), cada uno
 * con las posiciones juntadas desde el mensaje anterior — y el primer punto de cada trazo sale al instante al
 * presionar (OL-126). La pared dibuja todos los puntos de un mismo mensaje seguidos: se ve igual de fluido,
 * cuesta una fracción de los mensajes.
 */
export const MENSAJES_POR_SEGUNDO_PINTANDO = 6;
/** Sin pintar, la posición del punto tenue va a 2 por segundo (OL-126, gestor): es referencia, no trazo. */
export const POSICIONES_POR_SEGUNDO = 2;
/** Tope de mensajes por segundo de toda una obra hacia Realtime (OL-126): con el cupo de 10 por defecto, 10 × 6
 * = 60/s; con 20 mandos el ritmo de trazo baja solo a 5/s para no pasar de 100/s. */
export const PRESUPUESTO_MENSAJES_POR_SEGUNDO = 100;

/**
 * Cuántos mensajes de trazo por segundo manda un mando pintando, según el cupo de la obra (OL-126, founder:
 * «demasiada latencia»; antes eran 3/s para trazo y posición por igual, o sea hasta 333 ms de agrupación). El
 * presupuesto se reparte entre los mandos que pueden pintar a la vez: 6/s hasta 16 mandos, 5/s con 17–20.
 */
export function ritmoDeTrazo(cupo: number): number {
  const porMando = Math.floor(PRESUPUESTO_MENSAJES_POR_SEGUNDO / Math.max(1, cupo));
  return Math.max(1, Math.min(MENSAJES_POR_SEGUNDO_PINTANDO, porMando));
}

export function intervaloMs(porSegundo: number): number {
  return Math.round(1000 / Math.max(1, porSegundo));
}

/** La pared desliza el punto tenue de una posición recibida a la siguiente en este tiempo (≤120 ms, gestor); el
 * trazo se dibuja en cuanto llega, sin esperar a nada. */
export const SUAVIZADO_PUNTO_MS = 120;

/**
 * Marcas de tiempo para medir la cadena de punta a punta (OL-126): el mando pone en cada mensaje `muestra` (ms
 * de época de la última lectura del sensor que va en él) y `enviado` (ms de época al mandarlo); la pared anota
 * cuándo lo recibió y cuándo terminó de dibujarlo. Los relojes son los de cada aparato (en un iPhone y una Mac
 * con la hora automática van a tiros de decenas de ms): la parte «red» puede salir con ese sesgo; «agrupación» y
 * «dibujo» se miden en un solo aparato y son exactas. Son opcionales en el mensaje: un cliente viejo no los manda.
 */
export type Latencias = { agrupacionMs: number | null; redMs: number | null; dibujoMs: number; totalMs: number | null };

export function latenciasDe(mensaje: { enviado?: number; muestra?: number }, recibidoMs: number, dibujadoMs: number): Latencias {
  const agrupacionMs = mensaje.enviado !== undefined && mensaje.muestra !== undefined ? Math.max(0, mensaje.enviado - mensaje.muestra) : null;
  const redMs = mensaje.enviado !== undefined ? recibidoMs - mensaje.enviado : null;
  const dibujoMs = Math.max(0, dibujadoMs - recibidoMs);
  const totalMs = mensaje.muestra !== undefined ? dibujadoMs - mensaje.muestra : mensaje.enviado !== undefined ? dibujadoMs - mensaje.enviado : null;
  return { agrupacionMs, redMs, dibujoMs, totalMs };
}
/** Tope de puntos por mensaje: a `MENSAJES_POR_SEGUNDO = 3` y un sensor muestreado hasta a 60 Hz, un mensaje junta
 * ~20; si el sensor da más, el mando los rebaja con `muestrear`. Es también el límite que exige
 * `esMensajeTrazoValido` (contra un mensaje fabricado a mano con miles de puntos). */
export const PUNTOS_MAX_POR_MENSAJE = 20;

/** Lo que da `DeviceOrientationEvent`: solo lo que se usa aquí, del sensor real o de una muestra guardada. */
export type Orientacion = { beta: number | null; gamma: number | null };

/**
 * Dónde apunta el pincel (OL-120, founder en producción 2026-09-22: «Solo estoy pintando en un sector de la
 * pantalla, de todo el campo visual» y «al subir teléfono pinta para abajo»). Causa medida: hasta el bloque 3 cada
 * muestra del sensor viajaba como un DELTA (grados de cambio ÷ 6, acotado a ±1, × 24 px en la pared): 4 px por
 * grado, así que un giro cómodo de muñeca de ±20° recorría 160 px de una pared de 800 — un sector; y el delta
 * vertical iba con el signo de `beta`, que crece al inclinar el teléfono hacia arriba, mientras la Y del lienzo
 * crece hacia abajo: por eso subir pintaba hacia abajo. Ahora el mando manda la POSICIÓN normalizada (-1..1 en
 * cada eje, (0,0) el centro de la pared) respecto a un CERO: la postura del teléfono al encender el control, o la
 * que fija «Centrar». `RANGO_GRADOS.horizontal` grados a cada lado del cero recorren el ancho entero de la pared y
 * `RANGO_GRADOS.vertical` el alto, cada eje por su lado (la relación de aspecto de la pared la aplica la pared al
 * convertir a píxeles, `puntoEnPared`), con tope en los bordes y sin zona muerta.
 */
export type PosicionNormalizada = { x: number; y: number };

/** Grados de inclinación, a cada lado del cero, que llevan el pincel de borde a borde: ±30° recorren el ancho,
 * ±20° el alto (propuesta del gestor; el founder lo ajusta en la prueba si le sabe a poco o a mucho). */
export const RANGO_GRADOS = { horizontal: 30, vertical: 20 };

/**
 * La posición a partir de la lectura actual y del cero. Sentido de los ejes: `gamma` crece al inclinar el
 * teléfono hacia la derecha (regla de la mano derecha sobre el eje Y del aparato) y la X de la pared también crece
 * hacia la derecha; `beta` crece al inclinarlo hacia arriba y la Y de la pared crece hacia ABAJO, así que ese eje
 * se resta al revés (no `-(...)`, para no producir un -0 cuando no hay cambio). Sin cero o sin lectura completa
 * (el sensor todavía no dio su primer dato), no hay posición.
 */
export function posicionDesdeOrientacion(cero: Orientacion | null, actual: Orientacion, rango: { horizontal: number; vertical: number } = RANGO_GRADOS): PosicionNormalizada | null {
  if (!cero || cero.beta === null || cero.gamma === null || actual.beta === null || actual.gamma === null) return null;
  const acotar = (v: number) => Math.max(-1, Math.min(1, v));
  return { x: acotar((actual.gamma - cero.gamma) / rango.horizontal), y: acotar((cero.beta - actual.beta) / rango.vertical) };
}

function numeroFinito(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/** Una posición normalizada bien formada: dos números finitos en -1..1 (nunca una coordenada en píxeles). */
export function esPosicionValida(v: unknown): v is PosicionNormalizada {
  if (!v || typeof v !== "object") return false;
  const p = v as Record<string, unknown>;
  return numeroFinito(p.x) && numeroFinito(p.y) && Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1;
}

/** Si el sensor dio más muestras de las que caben en un mensaje, se quedan `max` repartidas por igual, siempre con
 * la última (donde está el pincel ahora); con `max` o menos, van todas tal cual. */
export function muestrear<T>(puntos: T[], max: number): T[] {
  if (max <= 0) return [];
  if (puntos.length <= max) return puntos;
  if (max === 1) return [puntos[puntos.length - 1]];
  const paso = (puntos.length - 1) / (max - 1);
  const salida: T[] = [];
  for (let i = 0; i < max; i++) salida.push(puntos[Math.round(i * paso)]);
  return salida;
}

/**
 * Lo que viaja por el canal: un trazo, una tinta, el grosor, las posiciones juntadas desde el último mensaje, y
 * quién lo manda. `remitente` (el id de perfil de quien pinta) es necesario ya en la Fase 2 bloque 3, antes de la
 * fila de espera: sin saber de quién es cada punto, la pared no puede seguir el trazo de cada persona por separado
 * y los mezclaría en un solo pincel fantasma. Con la fila (doc rediseno/34), la pared lo cruza además contra su
 * cupo. No es una prueba criptográfica de identidad (un cliente modificado podría mandar el remitente de otra
 * persona): el canal ya exige sesión (`private: true`); esto es solo para que dos pinceles no se confundan, no una
 * medida de seguridad aparte — aceptado así a propósito, sin generalizar.
 */
export type MensajeTrazo = { trazo: Trazo; color: string; puntos: PosicionNormalizada[]; remitente: string; grosor: number; enviado?: number; muestra?: number };

/** `enviado` y `muestra` (marcas de tiempo, OL-126) pueden faltar; si vienen, tienen que ser números finitos. */
function marcaOpcionalValida(v: unknown): boolean {
  return v === undefined || numeroFinito(v);
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
    Array.isArray(m.puntos) &&
    m.puntos.length > 0 &&
    m.puntos.length <= PUNTOS_MAX_POR_MENSAJE &&
    m.puntos.every(esPosicionValida) &&
    typeof m.remitente === "string" &&
    m.remitente.length > 0 &&
    numeroFinito(m.grosor) &&
    m.grosor > 0 &&
    m.grosor <= GROSOR_MAX + 0.001 &&
    marcaOpcionalValida(m.enviado) &&
    marcaOpcionalValida(m.muestra)
  );
}

/**
 * Cómo se dibuja un trazo en la pared (Fase 2 bloque 3): puro, sin `<canvas>`, para poder probarlo. La pared
 * guarda un punto por remitente (dónde está su pincel ahora, en píxeles) y, con cada mensaje, calcula los
 * segmentos a trazar desde ahí hasta cada posición que llegó, en orden.
 */
export type Punto = { x: number; y: number };

/** De la posición normalizada a píxeles de la pared: (-1,-1) es la esquina superior izquierda, (0,0) el centro y
 * (1,1) la inferior derecha. El horizontal recorre el ancho y el vertical el alto, cada uno por su lado. */
export function puntoEnPared(p: PosicionNormalizada, ancho: number, alto: number): Punto {
  return { x: ((p.x + 1) / 2) * ancho, y: ((p.y + 1) / 2) * alto };
}

export function puntoCentral(ancho: number, alto: number): Punto {
  return puntoEnPared({ x: 0, y: 0 }, ancho, alto);
}

/** A partir de dónde estaba el pincel de una persona (`null` si es su primer mensaje: entonces arranca en su primer
 * punto, un segmento de largo cero que con puntas redondas se ve como un punto) y las posiciones de su mensaje, da
 * los segmentos a trazar (uno por posición, para dibujarlos en orden) y el punto donde queda. */
export function siguientesSegmentos(desde: Punto | null, puntos: PosicionNormalizada[], ancho: number, alto: number): { segmentos: [Punto, Punto][]; hasta: Punto | null } {
  const segmentos: [Punto, Punto][] = [];
  let actual = desde;
  for (const p of puntos) {
    const siguiente = puntoEnPared(p, ancho, alto);
    segmentos.push([actual ?? siguiente, siguiente]);
    actual = siguiente;
  }
  return { segmentos, hasta: actual };
}

/**
 * Punto de referencia en la pared (OL-120, founder 2026-09-22: «cuando se conecta debe mostrar un punto tenue como
 * referencia de posición»). Un mando encendido y con cupo manda su posición por el canal aunque no esté pintando:
 * evento `posicion` (no `trazo`), a `POSICIONES_POR_SEGUNDO` (2/s, OL-126; el presupuesto de Realtime manda
 * también aquí), solo cuando cambia y sin guardar nada; pintando, no manda posición aparte (la pared coloca el
 * punto con el último punto del trazo). La pared mueve el punto de ese remitente sin dibujar y enseña ahí un
 * círculo tenue del color de su tinta, deslizándolo de una posición recibida a la siguiente en
 * `SUAVIZADO_PUNTO_MS` para que no salte; al pintar, el punto acompaña al trazo con opacidad normal; al salir el
 * mando (Presence), desaparece. «Centrar» (botón del mando) recalibra el cero con la postura actual y manda la
 * posición (0,0): el centro.
 */
export const EVENTO_POSICION = "posicion";
/** Opacidad del punto cuando el mando no está pintando (~0.35, gestor); pintando, 1. */
export const OPACIDAD_PUNTO_TENUE = 0.35;
/** El punto nunca es más chico que esto, aunque el trazo sea fino (gestor: «mínimo 8 px»). */
export const DIAMETRO_PUNTO_MIN_PX = 8;

export type MensajePosicion = { remitente: string; trazo: Trazo; color: string; grosor: number; posicion: PosicionNormalizada; enviado?: number; muestra?: number };

/** Igual de desconfiada que `esMensajeTrazoValido`. */
export function esMensajePosicionValido(v: unknown): v is MensajePosicion {
  if (!v || typeof v !== "object") return false;
  const m = v as Record<string, unknown>;
  return (
    typeof m.remitente === "string" &&
    m.remitente.length > 0 &&
    TRAZOS.some((t) => t.id === m.trazo) &&
    TINTAS.some((t) => t.valor === m.color) &&
    numeroFinito(m.grosor) &&
    m.grosor > 0 &&
    m.grosor <= GROSOR_MAX + 0.001 &&
    esPosicionValida(m.posicion) &&
    marcaOpcionalValida(m.enviado) &&
    marcaOpcionalValida(m.muestra)
  );
}

/** Ancho del trazo en la pared, en px por unidad de grosor — los factores con que dibuja `trazarSegmento`
 * (Pared.tsx), en un solo sitio para que el punto de referencia mida lo mismo que el trazo que va a salir. Spray
 * es el diámetro de cada gota (radio 1.6 por unidad); orgánico, el eje mayor de la elipse (radio 9). */
export const ANCHO_POR_GROSOR_PX: Record<Trazo, number> = { trazo: 3, aire: 9, spray: 3.2, organico: 18 };

/** Diámetro del punto de referencia en la pared: el ancho real del trazo elegido a ese grosor, nunca menos de
 * `DIAMETRO_PUNTO_MIN_PX`. Un trazo fino a grosor 1 mide 3 px: el punto se ve de 8. */
export function diametroDelPuntoDePosicion(trazo: Trazo, grosor: number): number {
  const acotado = Math.max(GROSOR_MIN, Math.min(GROSOR_MAX, grosor));
  return Math.max(DIAMETRO_PUNTO_MIN_PX, ANCHO_POR_GROSOR_PX[trazo] * acotado);
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

/** «1 persona aquí», «7 personas aquí» (OL-117: salía «1 personas aquí»). */
export function personasAqui(n: number): string {
  return `${n} ${n === 1 ? "persona" : "personas"} aquí`;
}

/**
 * Permiso del sensor de orientación en el mando (OL-117, bitácora 152). En el iPhone del founder salía «Este
 * navegador no tiene sensor de movimiento», que es falso: ese texto salía del `catch` de
 * `DeviceOrientationEvent.requestPermission()`, y en Safari de iOS esa promesa RECHAZA (`NotAllowedError`) cuando
 * no la llama un gesto que Safari cuente como activación del usuario — `pointerdown` no siempre cuenta; `click`,
 * `touchend` y `pointerup` sí — o cuando el permiso ya se negó antes. Tres casos, cada uno con su texto:
 * sin constructor (de verdad no hay sensor), rechazo con error (gesto no válido o permiso negado antes) y
 * respuesta «denied» explícita. El `detalle` (nombre y mensaje del error) se guarda para poder mostrarlo
 * discretamente mientras el founder prueba en el teléfono.
 *
 * OL-120 (founder, 2026-09-22: «debería ser más como un encender»): el mismo estado es el ENCENDIDO del control.
 * El botón grande arranca apagado; el primer toque lo enciende (pide el permiso; en Android, donde no hay permiso
 * que pedir, enciende directo) y, concedido, se pinta de verde; negado, se queda apagado con el aviso de su caso.
 */
export type Sensor =
  | { tipo: "sin-pedir" }
  | { tipo: "pidiendo" }
  | { tipo: "concedido" }
  | { tipo: "negado"; detalle: string }
  | { tipo: "sin-soporte"; detalle: string };

export type ResultadoDelPermiso =
  | { caso: "sin-constructor" }
  | { caso: "sin-request-permission" } // Android y navegadores que no exigen pedirlo: se lee directo
  | { caso: "respuesta"; valor: string } // lo que devolvió requestPermission(): "granted" | "denied" | otro
  | { caso: "error"; nombre: string; mensaje: string }; // requestPermission() rechazó

export function decidirSensor(r: ResultadoDelPermiso): Sensor {
  switch (r.caso) {
    case "sin-constructor":
      return { tipo: "sin-soporte", detalle: "sin DeviceOrientationEvent" };
    case "sin-request-permission":
      return { tipo: "concedido" };
    case "respuesta":
      return r.valor === "granted" ? { tipo: "concedido" } : { tipo: "negado", detalle: `respuesta ${r.valor}` };
    case "error":
      return { tipo: "negado", detalle: r.mensaje ? `${r.nombre}: ${r.mensaje}` : r.nombre };
  }
}

/** Encendido = sensor concedido: solo entonces mantener presionado pinta. */
export function estaEncendido(sensor: Sensor): boolean {
  return sensor.tipo === "concedido";
}

/**
 * Qué dice el texto de ayuda mientras el control NO está encendido; `null` si ya lo está (entonces manda el texto
 * de pintar de siempre, «Mantén presionado y mueve tu celular»). Dos instrucciones, una por estado (founder,
 * 2026-09-22): apagado, «Enciende el control para comenzar» (también mientras el permiso se está pidiendo: el
 * diálogo del sistema ya está a la vista); encendido, la de pintar. `abrirEnSafari`: en la app instalada en iOS
 * (la que se añade al inicio desde Safari) WebKit ha rechazado `requestPermission()` con `NotAllowedError` aunque
 * el gesto sea válido, porque el permiso vive en Safari y no en la app del inicio (dato del founder, iOS 26,
 * 2026-09-22) — la salida es abrir el mismo enlace en Safari, con un botón (un enlace con `target="_blank"` desde
 * la app instalada abre Safari). La ruta de Ajustes es la de iOS 18 (Ajustes → Apps → Safari); en iOS 26 la
 * verifica el founder en su teléfono.
 */
export function textoDelSensor(sensor: Sensor, instalada: boolean): { texto: string; esAviso: boolean; abrirEnSafari: boolean } | null {
  switch (sensor.tipo) {
    case "concedido":
      return null;
    case "sin-pedir":
    case "pidiendo":
      return { texto: "Enciende el control para comenzar", esAviso: false, abrirEnSafari: false };
    case "negado":
      return instalada
        ? { texto: "En la app instalada el iPhone no deja usar el sensor. Abre este enlace en Safari.", esAviso: true, abrirEnSafari: true }
        : { texto: "Sin permiso del sensor. Actívalo en Ajustes → Apps → Safari → Movimiento y orientación, y toca el punto otra vez.", esAviso: true, abrirEnSafari: false };
    case "sin-soporte":
      return { texto: "Este navegador no tiene sensor de movimiento.", esAviso: true, abrirEnSafari: false };
  }
}
