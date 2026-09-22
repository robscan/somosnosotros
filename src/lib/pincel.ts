/**
 * Pincel (OL-088, bitácora 123): lo propio de Pincel, no lo común a cualquier obra colectiva (eso vive en
 * src/lib/obras-colectivas.ts, doc rediseno/25 ajuste 3) — sin base de datos ni React, para poder probarlo directo.
 * El resto (consultas, acciones de servidor) vive en src/app/admin/obras-colectivas.
 */

import { distanciaKm, type Punto as PuntoGeo } from "./geo";

/** "Pincel en {lugar}": nombre sugerido al crear una obra por ubicación, sin partir de un evento. */
export function nombreSugerido(lugarNombre: string): string {
  return `Pincel en ${lugarNombre}`;
}

/**
 * El título de una obra al crearla (OL-130, founder: «al crear una pared el título se toma del lugar seleccionado,
 * pero si lo cambio el título no se actualiza»). Dos modos: AUTOMÁTICO, el título sigue al lugar elegido («Pincel
 * en <lugar>») y cambia con él; MANUAL, en cuanto la persona escribe algo propio se respeta lo escrito aunque
 * cambie el lugar. Borrar el campo (el «×») o volver a escribir justo la sugerencia regresa al automático.
 */
export type TituloObra = { modo: "automatico" } | { modo: "manual"; texto: string };

export function tituloDeObra(titulo: TituloObra, lugarNombre: string | null): string {
  if (titulo.modo === "manual") return titulo.texto;
  return lugarNombre ? nombreSugerido(lugarNombre) : "";
}

/** Lo que queda al escribir en el campo: vacío o igual a la sugerencia → automático; cualquier otra cosa → manual. */
export function alEscribirTitulo(texto: string, lugarNombre: string | null): TituloObra {
  if (texto === "" || (lugarNombre !== null && texto === nombreSugerido(lugarNombre))) return { modo: "automatico" };
  return { modo: "manual", texto };
}

/** Nombre por defecto de una pared creada «aquí» sin lugar del directorio (OL-127): «Pincel · 22 sep, 13:05», en
 * la zona de la obra, editable después. */
export function nombreParedSinLugar(fecha: Date, zona: string): string {
  const dia = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: zona }).format(fecha).replace(/\.$/, "");
  const hora = new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: zona }).format(fecha);
  return `Pincel · ${dia}, ${hora}`;
}

/**
 * Cercanía (OL-127, Fase 3 del plan; founder: «No hay validación de ubicación… me deja pintar»): el mando pide la
 * ubicación al encender y solo pinta si está a menos de RADIO_CERCANIA_M del lugar de la obra (o de las
 * coordenadas propias de la obra), sumando la precisión que reporta el aparato; administración queda exenta para
 * probar desde donde sea. Es FRICCIÓN, no seguridad: la comprobación la hace el mando y la pared solo ve un
 * `cerca: true` que no puede verificar (no hay firma); un cliente modificado podría mandarlo. La política real es
 * que quien no está ahí no ve el botón encendido.
 */
export const RADIO_CERCANIA_M = 200;

export type Cercania =
  | { tipo: "sin-pedir" }
  | { tipo: "pidiendo" }
  | { tipo: "cerca"; distanciaM: number | null } // null: administración exenta o la obra no tiene referencia
  | { tipo: "lejos"; distanciaM: number; precisionM: number }
  | { tipo: "negada" }
  | { tipo: "sin-soporte" }
  | { tipo: "error" };

export function distanciaM(a: PuntoGeo, b: PuntoGeo): number {
  return distanciaKm(a, b) * 1000;
}

/** Dentro del radio si la distancia no pasa del radio más la precisión reportada (un aparato con 80 m de
 * precisión a 250 m del lugar cuenta como cerca: no se castiga la imprecisión del GPS). */
export function estaCerca(distancia: number, precisionM: number, radioM = RADIO_CERCANIA_M): boolean {
  return distancia <= radioM + Math.max(0, Number.isFinite(precisionM) ? precisionM : 0);
}

export function decidirCercania(a: { esAdmin: boolean; punto: PuntoGeo; precisionM: number; referencia: PuntoGeo | null }): Cercania {
  if (!a.referencia) return { tipo: "cerca", distanciaM: null }; // sin referencia no hay qué comprobar
  const d = distanciaM(a.punto, a.referencia);
  if (a.esAdmin) return { tipo: "cerca", distanciaM: d }; // exenta, pero se enseña la distancia en la sonda
  return estaCerca(d, a.precisionM) ? { tipo: "cerca", distanciaM: d } : { tipo: "lejos", distanciaM: d, precisionM: a.precisionM };
}

/** El lugar del directorio más cercano a un punto, si está a menos del radio; si no, null («Crear pared aquí»). */
export function lugarMasCercano<T extends PuntoGeo>(punto: PuntoGeo, lugares: T[], radioM = RADIO_CERCANIA_M): { lugar: T; distanciaM: number } | null {
  let mejor: { lugar: T; distanciaM: number } | null = null;
  for (const lugar of lugares) {
    const d = distanciaM(punto, lugar);
    if (d <= radioM && (!mejor || d < mejor.distanciaM)) mejor = { lugar, distanciaM: d };
  }
  return mejor;
}

/** Qué dice la ayuda del mando por la ubicación; null si está cerca o todavía no se pidió (manda el texto del sensor). */
export function textoDeCercania(c: Cercania, lugarNombre: string | null): { texto: string; esAviso: boolean; verFicha: boolean } | null {
  switch (c.tipo) {
    case "sin-pedir":
    case "cerca":
      return null;
    case "pidiendo":
      return { texto: "Buscando tu ubicación…", esAviso: false, verFicha: false };
    case "lejos":
      return { texto: `Este pincel es para quien está en ${lugarNombre ?? "el lugar de la pared"}`, esAviso: true, verFicha: lugarNombre !== null };
    case "negada":
      return { texto: "Activa la ubicación para pintar", esAviso: true, verFicha: false };
    case "sin-soporte":
    case "error":
      return { texto: "No se pudo leer tu ubicación. Inténtalo otra vez.", esAviso: true, verFicha: false };
  }
}

/**
 * Fase 2 bloque 2: el mensaje que viaja por el canal en vivo (doc rediseno/25: "el mensaje... pincel, color,
 * movimiento" es propio de Pincel; el canal en sí es común, ver `src/lib/canal-obra.ts`). Cuatro trazos y las cinco
 * tintas del prototipo firmado (OL-084, bitácora 118, `experiments/pincel-prototipo/core.mjs`) más Blanco (founder,
 * OL-126) — no se inventan de nuevo.
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
  { valor: "#ffffff", etiqueta: "Blanco" }, // OL-126 (founder): pinta encima como si borrara; la pared es casi blanca
];

/** Una tinta tan clara que sobre el fondo casi blanco de la pared (o de una tarjeta) no se vería sin un borde o un
 * fondo detrás (hoy, Blanco). Luminancia relativa aproximada > 0.85. */
export function esTintaClara(valor: string): boolean {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(valor);
  if (!m) return false;
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.85;
}

/** Nombre del evento de Broadcast en el canal de la obra (`abrirCanalObra`). */
export const EVENTO_TRAZO = "trazo";

/** Ping de latencia (OL-132), solo con la sonda del mando: un broadcast a sí mismo cada PING_CADA_MS con el canal en
 * modo `ack`; lo que tarda en confirmarse es la ida y vuelta al servidor de Realtime, para separar red de cálculo.
 * La pared no lo escucha. */
export const EVENTO_PING = "ping";
export const PING_CADA_MS = 5000;
export type MensajePing = { remitente: string; enviado: number };

/**
 * «Borrar la pared» (OL-126, founder: «agregar botón de borrado o reinicio de pared en admin»): un mensaje por el
 * canal y toda pared abierta de la obra limpia su lienzo; no borra nada guardado y la obra sigue abierta. El botón
 * vive solo en Administración; el canal exige sesión y la pared no puede distinguir quién lo manda — el mismo nivel
 * de confianza que el remitente del trazo, aceptado así en OL-088, no una medida de seguridad aparte.
 */
export const EVENTO_BORRAR = "borrar";
export type MensajeBorrar = { remitente: string; enviado?: number };

export function esMensajeBorrarValido(v: unknown): v is MensajeBorrar {
  if (!v || typeof v !== "object") return false;
  const m = v as Record<string, unknown>;
  return typeof m.remitente === "string" && m.remitente.length > 0 && (m.enviado === undefined || (typeof m.enviado === "number" && Number.isFinite(m.enviado)));
}

/**
 * ¿Hay un borrado registrado por Administración que esta pared todavía no aplicó? (OL-134, founder: «al seleccionar
 * borrar pared no se borra»: borró con la pared cerrada, el «borrar» del canal no tuvo receptor y al reabrirla
 * volvió la composición vieja.) La hora la escribe solo la acción de servidor `borrarPared` (solo admin) en
 * `obras_colectivas.borrado_pared_en`; la pared la consulta al recibir «borrar» por el canal, al volver a ser visible
 * y cada pocos segundos, y aplica el borrado si es más reciente que el último que aplicó. Ya no hay ventana de un
 * minuto: la hora registrada manda, llegue el aviso o no. Un «borrar» que mande un mando por su cuenta sigue sin
 * borrar nada (no hay hora nueva registrada). Sin hora, o ilegible, no hay nada que aplicar.
 */
export function hayBorradoPendiente(borradoParedEn: string | null | undefined, ultimoAplicadoMs: number | null): boolean {
  if (!borradoParedEn) return false;
  const t = Date.parse(borradoParedEn);
  if (!Number.isFinite(t)) return false;
  return ultimoAplicadoMs === null || t > ultimoAplicadoMs;
}

/** Cada cuánto la pared consulta `borrado_pared_en` (una fila, barato) además de al recibir «borrar» y al volver a
 * ser visible: es lo que tarda en limpiarse una pared que no recibió el aviso. */
export const REVISAR_BORRADO_MS = 5000;

/**
 * ¿La instantánea guardada sigue valiendo como fondo? (OL-134) Solo si se subió DESPUÉS del último borrado
 * registrado: una anterior es la composición vieja y no se repone. Sin borrado registrado, vale; con borrado y sin
 * hora de subida legible, no (mejor una pared limpia que una pintura que Administración ya borró). La acción de
 * servidor además borra el archivo del bucket al registrar el borrado; esta regla cubre el hueco entre las dos
 * cosas y una subida tardía de otra pared abierta.
 */
export function instantaneaVigente(subidaEn: string | null | undefined, borradoParedEn: string | null | undefined): boolean {
  if (!borradoParedEn) return true;
  const borrado = Date.parse(borradoParedEn);
  if (!Number.isFinite(borrado)) return true;
  if (!subidaEn) return false;
  const subida = Date.parse(subidaEn);
  return Number.isFinite(subida) && subida > borrado;
}

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
/**
 * Instantánea de la pared (OL-126, parte 4; founder: «si pongo regresar a admin y entro de nuevo a pared se borra
 * lo que estaba hecho»). La pared conserva lo pintado mientras la obra esté abierta, sin guardar trazos: sube al
 * Storage (bucket privado «obras», solo administración) un PNG del lienzo en `obras/<id>/pared.png` cada
 * INSTANTANEA_CADA_MS solo si hubo trazos nuevos, también al ocultarse/cerrarse la pestaña y al recibir «borrar»
 * (sube el lienzo vacío). Al abrirse, si hay instantánea la pinta de fondo antes de conectar el canal; con dos
 * paredes abiertas las dos reciben los trazos en vivo y la instantánea solo es el punto de partida. Al terminar
 * la obra, se queda como resultado y se ve chica en la ficha de la obra en Administración. Presupuesto: un PNG
 * de 1280×800 pesa ~100–300 KB; a lo sumo 3 subidas por minuto por obra abierta.
 */
export const INSTANTANEA_CADA_MS = 20_000;
export const BUCKET_INSTANTANEAS = "obras";

export function rutaInstantanea(obraId: string): string {
  return `${obraId}/pared.png`;
}

export type MotivoInstantanea = "periodica" | "cierre" | "borrado";

/** ¿Toca subir ahora? Borrado: siempre (el lienzo vacío también cuenta). Cierre (pestaña oculta o cerrándose):
 * solo si hubo trazos desde la última subida. Periódica: trazos nuevos y, además, ≥ INSTANTANEA_CADA_MS desde la
 * última subida (o nunca se ha subido). */
export function tocaSubirInstantanea(a: { motivo: MotivoInstantanea; hayTrazosNuevos: boolean; ultimaSubidaMs: number | null; ahoraMs: number }): boolean {
  if (a.motivo === "borrado") return true;
  if (!a.hayTrazosNuevos) return false;
  if (a.motivo === "cierre") return true;
  return a.ultimaSubidaMs === null || a.ahoraMs - a.ultimaSubidaMs >= INSTANTANEA_CADA_MS;
}

/** Tope de puntos por mensaje: a 6 mensajes/s y un sensor muestreado hasta a 60 Hz, un mensaje junta ~10 (a 5/s,
 * ~12); si el sensor da más, el mando los rebaja con `muestrear`. Es también el límite que exige
 * `esMensajeTrazoValido` (contra un mensaje fabricado a mano con miles de puntos). */
export const PUNTOS_MAX_POR_MENSAJE = 20;

/** Lo que da `DeviceOrientationEvent`: solo lo que se usa aquí, del sensor real o de una muestra guardada. */
export type Orientacion = { alpha?: number | null; beta: number | null; gamma: number | null };

/** El giro más corto de `desde` a `hasta`, en grados, normalizado a (-180, 180]: así un ángulo que da la vuelta
 * (alpha 0↔360, beta ±180) no manda el cursor al otro lado de la pared (OL-132: «cambia drásticamente de posición»). */
export function diferenciaAngular(desde: number, hasta: number): number {
  const d = (((hasta - desde + 540) % 360) + 360) % 360 - 180;
  return d === -180 ? 180 : d;
}

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
 * La posición a partir de la lectura actual y del cero, con las diferencias desenrolladas (`diferenciaAngular`).
 * Horizontal (OL-132, founder: «en ocasiones cambia drásticamente de posición el cursor»): va por `alpha` (girar el
 * teléfono a la derecha o a la izquierda, como un apuntador), no por `gamma`: `gamma` cambia de signo al pasar
 * por la vertical (±90°) y con el teléfono casi de pie se vuelve inestable (cardán) — un salto de 180° en la
 * lectura mandaba el cursor al otro lado. `alpha` crece al girar en sentido contrario a las manecillas (visto
 * desde arriba), así que girar a la derecha lo baja y la X sube: x = cero − actual. Si el aparato no da `alpha`,
 * se usa `gamma` como antes (actual − cero). Vertical: `beta` crece al inclinar hacia arriba y la Y de la pared
 * crece hacia ABAJO: y = cero − actual. Sin cero o sin lectura completa, no hay posición.
 */
export function posicionDesdeOrientacion(cero: Orientacion | null, actual: Orientacion, rango: { horizontal: number; vertical: number } = RANGO_GRADOS): PosicionNormalizada | null {
  if (!cero || cero.beta === null || actual.beta === null) return null;
  const acotar = (v: number) => Math.max(-1, Math.min(1, v));
  let horizontal: number;
  if (typeof cero.alpha === "number" && typeof actual.alpha === "number") horizontal = diferenciaAngular(actual.alpha, cero.alpha);
  else if (cero.gamma !== null && actual.gamma !== null) horizontal = diferenciaAngular(cero.gamma, actual.gamma);
  else return null;
  return { x: acotar(horizontal / rango.horizontal), y: acotar(diferenciaAngular(actual.beta, cero.beta) / rango.vertical) };
}

/** Filtro de saltos (OL-132): si entre dos lecturas seguidas la posición cambia más de `SALTO_UMBRAL` (la mitad del
 * recorrido, o sea un cuarto de la pared) en menos de `SALTO_VENTANA_MS`, no es un movimiento de muñeca: es una
 * lectura rota (cardán, envoltura) y se ignora; la sonda lo anota para leerlo en el teléfono. */
export const SALTO_UMBRAL = 0.5;
export const SALTO_VENTANA_MS = 100;
export function esSalto(anterior: PosicionNormalizada | null, actual: PosicionNormalizada, dtMs: number, umbral = SALTO_UMBRAL, ventanaMs = SALTO_VENTANA_MS): boolean {
  if (!anterior || !(dtMs < ventanaMs)) return false;
  return Math.abs(actual.x - anterior.x) > umbral || Math.abs(actual.y - anterior.y) > umbral;
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
export type MensajeTrazo = { trazo: Trazo; color: string; puntos: PosicionNormalizada[]; remitente: string; grosor: number; enviado?: number; muestra?: number; cerca?: boolean };

/** `enviado` y `muestra` (marcas de tiempo, OL-126) pueden faltar; si vienen, tienen que ser números finitos. */
function marcaOpcionalValida(v: unknown): boolean {
  return v === undefined || numeroFinito(v);
}
/** `cerca` (OL-127): el mando acredita que está a menos del radio; opcional en la forma, pero la pared solo pinta
 * lo que viene con `cerca: true` (un mando viejo o uno que no acreditó, no). */
function cercaOpcionalValida(v: unknown): boolean {
  return v === undefined || typeof v === "boolean";
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

/* OL-132 (founder: «modificar grosor mientras se pinta es imposible, se traba»): ya no existe el estado «ajustando
   sin pintar» (antes, pasado un umbral de 8 px el trazo se cortaba). El arrastre cambia el grosor EN VIVO y el trazo
   sigue saliendo: cada mensaje lleva el grosor del momento y la pared lo usa para los puntos nuevos y para el cursor. */

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
    marcaOpcionalValida(m.muestra) &&
    cercaOpcionalValida(m.cerca)
  );
}

/** La pared solo pinta (y mueve el punto) de un mando que acreditó cercanía (OL-127): fricción, no seguridad. */
export function acreditaCercania(m: { cerca?: boolean }): boolean {
  return m.cerca === true;
}

/**
 * Cómo se dibuja un trazo en la pared (Fase 2 bloque 3): puro, sin `<canvas>`, para poder probarlo. La pared
 * guarda un punto por remitente (dónde está su pincel ahora, en píxeles) y, con cada mensaje, calcula los
 * segmentos a trazar desde ahí hasta cada posición que llegó, en orden.
 */
export type Punto = { x: number; y: number };

/** De la posición normalizada a píxeles de la pared: (-1,-1) es la esquina superior izquierda, (0,0) el centro y
 * (1,1) la inferior derecha. El horizontal recorre el ancho y el vertical el alto, cada uno por su lado. */
/**
 * La pared tiene proporción fija 16:9 (OL-135, founder: «como lo abrí en un formato de pantalla vertical, se deformó
 * el dibujo, eso no debe pasar, que mantenga aspect ratio y solo se escale»; decisión del gestor: una proyección).
 * El lienzo mide siempre LIENZO.ancho × LIENZO.alto unidades — ahí viven las posiciones del mando, los trazos, el
 * grosor y la instantánea — y se escala entero, centrado, para caber en la ventana; lo que sobra es margen del
 * color de fondo. Antes el lienzo era la ventana entera y, en vertical, el dibujo se estiraba.
 */
export const LIENZO = { ancho: 1920, alto: 1080 } as const;
export type Rectangulo = { left: number; top: number; width: number; height: number };

/** El rectángulo más grande con la proporción `ancho:alto` que cabe en un marco de `anchoMarco × altoMarco`,
 * centrado en él. Sin área (algún lado ≤ 0 o no numérico), un rectángulo vacío en el origen. */
export function encajar(ancho: number, alto: number, anchoMarco: number, altoMarco: number): Rectangulo {
  if (!(ancho > 0) || !(alto > 0) || !(anchoMarco > 0) || !(altoMarco > 0)) return { left: 0, top: 0, width: 0, height: 0 };
  const escala = Math.min(anchoMarco / ancho, altoMarco / alto);
  const width = ancho * escala;
  const height = alto * escala;
  return { left: (anchoMarco - width) / 2, top: (altoMarco - height) / 2, width, height };
}

/** Dónde va el lienzo en una ventana de `anchoVentana × altoVentana` px: `encajar` con la proporción de LIENZO. */
export function rectanguloDelLienzo(anchoVentana: number, altoVentana: number): Rectangulo {
  return encajar(LIENZO.ancho, LIENZO.alto, anchoVentana, altoVentana);
}

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

export type MensajePosicion = { remitente: string; trazo: Trazo; color: string; grosor: number; posicion: PosicionNormalizada; enviado?: number; muestra?: number; cerca?: boolean };

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
    marcaOpcionalValida(m.muestra) &&
    cercaOpcionalValida(m.cerca)
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
