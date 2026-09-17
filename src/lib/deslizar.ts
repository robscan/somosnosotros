/**
 * Acciones al deslizar un renglón de las listas (Agenda, Lugares, Artistas). Decisiones del founder (2026-09-16): solo se
 * desliza de derecha a izquierda, porque desde el borde izquierdo manda Safari (atrás), y va una acción por lista: Me
 * interesa en la agenda, Seguir en Lugares y Artistas. Se confirma con un toque; deslizar hasta el fondo no dispara nada.
 * Prototipo en docs/rediseno/prototipos/deslizar.html (bitácora 071).
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
export type ClaveAccion = "me_interesa" | "quitar_interes" | "vas" | "seguir" | "dejar_de_seguir";
export type Tono = "primario" | "tinta" | "gris";
export type AccionRenglon = { clave: ClaveAccion; etiqueta: string; tono: Tono; deshabilitada?: boolean };

/**
 * La acción de un evento según lo que la persona ya decidió. Con "Voy" no se ofrece bajar a "Me interesa" desde la
 * lista: se ve "Vas", sin acción, y cancelar vive en la ficha.
 */
export function accionEvento(estado: Asistencia): AccionRenglon {
  if (estado === "voy") return { clave: "vas", etiqueta: "Vas", tono: "gris", deshabilitada: true };
  if (estado === "me_interesa") return { clave: "quitar_interes", etiqueta: "Ya no", tono: "tinta" };
  return { clave: "me_interesa", etiqueta: "Me interesa", tono: "primario" };
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
