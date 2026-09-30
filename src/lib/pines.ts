/**
 * Cómo se dibuja un pin del mapa de Lugares (docs/rediseno/37-color-primario.md, OL-146; docs/rediseno/50, P8). Lógica pura para que
 * `Mapa.tsx` la ponga en el GeoJSON, las capas solo lean la propiedad y las pruebas la comprueben sin levantar Mapbox.
 *
 * - El COLOR dice qué es el lugar: privado (solo lo ve el admin) siempre gris; si no, gana seguido > destacado > con evento > nada (tinta).
 *   Todos los lugares son un punto chico de su color, siempre. Los que tienen evento esta semana llevan encima un disco con su día (un
 *   símbolo, imagen y texto a la vez) que Mapbox coloca con su motor de colisiones: nada se pinta sobre un letrero a ningún zoom, y el
 *   disco que choca con algo de más rango cede (el lugar sigue ahí, como punto), de modo que dos discos con día nunca se enciman
 *   (founder, 2026-09-30: «Hay traslape de letreros»). El rango, de mayor a menor: el elegido y su nombre; los pines con día (por su
 *   prioridad y, a igual prioridad, el evento más próximo y el id: `rangosDeDias`); los nombres.
 * - Sin aro en los pines (el founder lo quitó por "demasiado ruido visual", 2026-09-23), salvo en uno: el lugar de la ficha abierta,
 *   el elegido, que crece, lleva un aro blanco ancho y una sombra, y no cambia de color ni de forma (founder, 2026-09-29). Los demás
 *   se quedan como están: el elegido ya se ve activo, y atenuarlos los transparentaba unos sobre otros (founder, 2026-09-30).
 * - La PRIORIDAD dice quién queda encima y a quién se le da el sitio cuando dos nombres chocan.
 */

export const RADIO_PEQUENO = 5; // sin evento en los próximos siete días: el punto de siempre
export const RADIO_MEDIANO = 12; // con "Hoy" o el día en tres letras: el círculo abraza el texto
/** Cuánto crece el elegido: el founder pidió ×1,8 o ×2. */
export const ESCALA_ELEGIDO = 1.9;
/** Borde blanco de los círculos: fino en todos, un poco más en el seguido y ancho en el elegido (es su aro). */
export const BORDE_NORMAL = 1.5;
export const BORDE_SEGUIDO = 2;
export const BORDE_ELEGIDO = 4;
export const TAMANO_DIA = 10;
export const TAMANO_NOMBRE = 14;
/** Un punto más grande, para que el nombre del elegido se lea primero. */
export const TAMANO_NOMBRE_ELEGIDO = 15;
/** Aire entre el borde del pin y su nombre (px). Medido en Mapbox 3.30: con 6 el nombre no cabe debajo ni encima de su propio pin (a `top`
 *  y `bottom` les resta unos 4 px de línea base y suma el relleno de su caja y de la del pin), con 8 cabe justo y con 10 sobra un poco. */
const AIRE_DEL_NOMBRE = 10;

export type EstadoLugarPin = {
  /** "Hoy" o el día en tres letras si hay evento en los próximos 7 días; null si no. */
  dia: string | null;
  privado: boolean;
  /** La persona sigue el lugar (con sesión). Gana a destacado y a evento. */
  seguido: boolean;
  /** Lo eligió el administrador. Gana a "con evento", pero no a seguido. */
  destacado: boolean;
  /** Es el lugar de la ficha abierta. */
  elegido: boolean;
};

export type ColoresPin = {
  tinta: string;
  primario: string;
  destacado: string;
  seguido: string;
  privado: string;
};

/** Cómo se ve el pin cuando le cabe su día: 12 px con día, 5 px sin él, el mismo tamaño con o sin resalte (el founder: "los mismos dos tamaños", OL-128); el elegido, ×1,9. */
export function radioPin({ dia, elegido }: Pick<EstadoLugarPin, "dia" | "elegido">): number {
  const radio = dia ? RADIO_MEDIANO : RADIO_PEQUENO;
  return elegido ? radio * ESCALA_ELEGIDO : radio;
}

/** El radio del círculo que pinta la capa de puntos: el punto chico de todos los lugares y, en el elegido, su disco grande (el disco con día de los demás es un símbolo). */
export function radioCirculo(estado: Pick<EstadoLugarPin, "dia" | "elegido">): number {
  return estado.elegido ? radioPin(estado) : RADIO_PEQUENO;
}

export function bordePin({ seguido, elegido }: Pick<EstadoLugarPin, "seguido" | "elegido">): number {
  return elegido ? BORDE_ELEGIDO : seguido ? BORDE_SEGUIDO : BORDE_NORMAL;
}

/** Cuánto ocupa el pin entero con su día, con su borde (Mapbox lo dibuja por fuera del círculo): lo que ningún nombre debe pisar (el radio de su huella). */
export function huellaPin(estado: Pick<EstadoLugarPin, "dia" | "seguido" | "elegido">): number {
  return radioPin(estado) + bordePin(estado);
}

/** Lo mismo del círculo de la capa de puntos: lo que reserva un punto (o el disco grande del elegido) para que ningún nombre lo pise. */
export function huellaCirculo(estado: Pick<EstadoLugarPin, "dia" | "seguido" | "elegido">): number {
  return radioCirculo(estado) + bordePin(estado);
}

/** El color del punto (o del nombre, con el juego de colores de texto que corresponda). El elegido conserva el suyo. */
export function colorPin(estado: Pick<EstadoLugarPin, "dia" | "privado" | "seguido" | "destacado">, colores: ColoresPin): string {
  if (estado.privado) return colores.privado;
  if (estado.seguido) return colores.seguido;
  if (estado.destacado) return colores.destacado;
  if (estado.dia) return colores.primario;
  return colores.tinta;
}

/** Quién queda encima y quién elige sitio primero: el elegido, el seguido, el destacado, el que tiene día y, al final, el resto. */
export function prioridadPin({ dia, seguido, destacado, elegido }: Pick<EstadoLugarPin, "dia" | "seguido" | "destacado" | "elegido">): number {
  if (elegido) return 4;
  if (seguido) return 3;
  if (destacado) return 2;
  return dia ? 1 : 0;
}

/** El día dentro del círculo crece con él. */
export function tamanoDia({ elegido }: Pick<EstadoLugarPin, "elegido">): number {
  return elegido ? TAMANO_DIA * ESCALA_ELEGIDO : TAMANO_DIA;
}

/** A qué distancia de su pin queda el nombre, en ems del propio nombre: fuera de su huella con su disco (aunque el disco ceda, el nombre se acomoda igual), con un poco de aire. */
export function distanciaNombre(estado: Pick<EstadoLugarPin, "dia" | "seguido" | "elegido">): number {
  return (huellaPin(estado) + AIRE_DEL_NOMBRE) / (estado.elegido ? TAMANO_NOMBRE_ELEGIDO : TAMANO_NOMBRE);
}

/** Todo lo que las capas del mapa leen de un pin: cada regla de arriba, ya calculada. `radio` y `huella` son los del círculo de la capa de puntos. */
export function propiedadesPin(estado: EstadoLugarPin, coloresPunto: ColoresPin, coloresTexto: ColoresPin) {
  return {
    radio: radioCirculo(estado),
    borde: bordePin(estado),
    huella: huellaCirculo(estado),
    prioridad: prioridadPin(estado),
    tamanoDia: tamanoDia(estado),
    distanciaNombre: distanciaNombre(estado),
    colorPunto: colorPin(estado, coloresPunto),
    colorTexto: colorPin(estado, coloresTexto),
  };
}

export type PropiedadesPin = ReturnType<typeof propiedadesPin>;

/**
 * El orden en que los pines con día eligen sitio: más prioridad primero; a igual prioridad, el evento más próximo (`inicio`, en ms) y,
 * si empatan, el id. Devuelve el rango de cada uno (0 = el primero): es la llave de orden de la capa de discos, y Mapbox coloca primero al de
 * menor llave y esconde al que choca con él.
 */
export function rangosDeDias(pines: { id: string; prioridad: number; inicio: number }[]): Map<string, number> {
  const orden = [...pines].sort((a, b) => b.prioridad - a.prioridad || a.inicio - b.inicio || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return new Map(orden.map((pin, rango) => [pin.id, rango]));
}
