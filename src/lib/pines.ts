/**
 * Tamaño y color de un pin del mapa de Lugares (docs/rediseno/37-color-primario.md, OL-146): el TAMAÑO dice si
 * hay evento esta semana; el COLOR dice qué es el lugar. Sin doble círculo ("aro"): el founder lo quitó por
 * "demasiado ruido visual" (2026-09-23). Privado (solo lo ve el admin) siempre gris, sea lo que sea que tenga
 * encima; si no, gana seguido > destacado > con evento > nada (tinta). Lógica pura para que `Mapa.tsx` la use y
 * las pruebas la comprueben sin levantar Mapbox.
 */

export const RADIO_PEQUENO = 5; // sin evento en los próximos siete días: el punto de siempre
export const RADIO_MEDIANO = 12; // con "Hoy" o el día en tres letras: el círculo abraza el texto

export type EstadoLugarPin = {
  /** "Hoy" o el día en tres letras si hay evento en los próximos 7 días; null si no. */
  dia: string | null;
  privado: boolean;
  /** La persona sigue el lugar (con sesión). Gana a destacado y a evento. */
  seguido: boolean;
  /** Lo eligió el administrador. Gana a "con evento", pero no a seguido. */
  destacado: boolean;
};

export type ColoresPin = {
  tinta: string;
  primario: string;
  destacado: string;
  seguido: string;
  privado: string;
};

/** 12 px con día, 5 px sin él; el mismo tamaño con o sin resalte (el founder: "los mismos dos tamaños", OL-128). */
export function radioPin({ dia }: Pick<EstadoLugarPin, "dia">): number {
  return dia ? RADIO_MEDIANO : RADIO_PEQUENO;
}

/** El color del punto (o del nombre, con el juego de colores de texto que corresponda). */
export function colorPin(estado: EstadoLugarPin, colores: ColoresPin): string {
  if (estado.privado) return colores.privado;
  if (estado.seguido) return colores.seguido;
  if (estado.destacado) return colores.destacado;
  if (estado.dia) return colores.primario;
  return colores.tinta;
}
