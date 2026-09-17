/**
 * Acciones al deslizar un renglón de las listas (Agenda, Lugares, Artistas). Decisiones del founder: solo se desliza de
 * derecha a izquierda, porque desde el borde izquierdo manda Safari (atrás) (2026-09-16); en un evento, Voy y Me interesa,
 * las dos con Deshacer (2026-09-17, bitácora 085); Seguir en Lugares y Artistas. Se confirma con un toque; deslizar hasta
 * el fondo no dispara nada. Prototipo en docs/rediseno/prototipos/deslizar.html, versión 1.1 (bitácoras 071 y 073).
 */

/** Los primeros píxeles del borde izquierdo son del navegador (atrás): un gesto que empieza ahí no es nuestro. */
export const BORDE_NAVEGADOR = 24;
/** Movimiento mínimo antes de decidir si el gesto es horizontal o es scroll. */
export const UMBRAL_DECISION = 8;
/** Abre si al soltar se ve al menos esta fracción de las acciones. */
export const FRACCION_ABRIR = 0.4;
/** Un tirón (px/ms) abre o cierra aunque no se haya llegado a la fracción. */
export const VELOCIDAD_TIRON = 0.35;

export type Asistencia = "voy" | "me_interesa" | null;
export type ClaveAccion = "voy" | "no_voy" | "me_interesa" | "quitar_interes" | "seguir" | "dejar_de_seguir";
export type Tono = "primario" | "tinta";
export type AccionRenglon = { clave: ClaveAccion; etiqueta: string; tono: Tono };

/**
 * Las dos acciones de un evento según lo que la persona ya decidió, como en la ficha: sin decisión, Voy y Me interesa;
 * con Voy, No voy y Me interesa; con interés, Voy y Ya no. Cada una se deshace con el aviso o volviendo a deslizar.
 */
export function accionesEvento(estado: Asistencia): AccionRenglon[] {
  return [
    estado === "voy" ? { clave: "no_voy", etiqueta: "No voy", tono: "primario" } : { clave: "voy", etiqueta: "Voy", tono: "primario" },
    estado === "me_interesa" ? { clave: "quitar_interes", etiqueta: "Ya no", tono: "tinta" } : { clave: "me_interesa", etiqueta: "Me interesa", tono: "tinta" },
  ];
}

/** En qué queda el evento tras la acción: Voy y Me interesa se reemplazan entre sí, como en la ficha. */
export function asistenciaTras(clave: ClaveAccion): Asistencia {
  return clave === "voy" ? "voy" : clave === "me_interesa" ? "me_interesa" : null;
}

export function accionSeguir(sigo: boolean): AccionRenglon {
  return sigo ? { clave: "dejar_de_seguir", etiqueta: "Dejar de seguir", tono: "tinta" } : { clave: "seguir", etiqueta: "Seguir", tono: "primario" };
}

/** ¿Qué es el gesto? Se espera hasta moverse lo suficiente; es nuestro si es horizontal y hacia la izquierda (o, abierto, de vuelta). */
export function decidirGesto(dx: number, dy: number, abierto: boolean): "esperar" | "deslizar" | "soltar" {
  if (Math.abs(dx) < UMBRAL_DECISION && Math.abs(dy) < UMBRAL_DECISION) return "esperar";
  if (Math.abs(dx) <= Math.abs(dy)) return "soltar";
  if (dx > 0 && !abierto) return "soltar";
  return "deslizar";
}

/** Dónde va el renglón mientras se arrastra: nunca a la derecha; más allá de las acciones, con resistencia. */
export function desplazamiento(base: number, dx: number, ancho: number): number {
  const x = Math.min(0, base + dx);
  if (x >= -ancho) return x;
  return -ancho - Math.pow(-x - ancho, 0.85) * 0.45;
}

/** Al soltar: abre si se ve lo suficiente o fue un tirón a la izquierda; un tirón a la derecha cierra. */
export function alSoltar(x: number, ancho: number, velocidad: number): "abrir" | "cerrar" {
  if (velocidad <= -VELOCIDAD_TIRON) return "abrir";
  if (velocidad >= VELOCIDAD_TIRON) return "cerrar";
  return x <= -ancho * FRACCION_ABRIR ? "abrir" : "cerrar";
}

/** "«Concierto de…»": el nombre recortado para que el aviso quepa en una línea o dos. */
export function recortar(texto: string, max = 40): string {
  const limpio = texto.replace(/\s+/g, " ").trim();
  return limpio.length > max ? `${limpio.slice(0, max - 1).trimEnd()}…` : limpio;
}

/** Lo que dice el aviso tras la acción (con Deshacer). */
export function textoHecho(clave: ClaveAccion, nombre: string, que: "evento" | "lugar" | "artista" = "evento"): string {
  const n = recortar(nombre);
  switch (clave) {
    case "voy":
      return `Vas a «${n}»`;
    case "no_voy":
      return `Ya no vas a «${n}»`;
    case "me_interesa":
      return `Te interesa «${n}»`;
    case "quitar_interes":
      return `Ya no te interesa «${n}»`;
    case "seguir":
      return que === "lugar" ? `Sigues ${n}` : `Sigues a ${n}`;
    case "dejar_de_seguir":
      return que === "lugar" ? `Ya no sigues ${n}` : `Ya no sigues a ${n}`;
    default:
      return "";
  }
}
