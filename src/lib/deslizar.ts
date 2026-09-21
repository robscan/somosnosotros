/**
 * El botón del renglón de las listas (Agenda, Lugares, Artistas) — OL-104, bitácora 139: reemplaza el gesto de
 * deslizar (decisión del founder, 2026-09-21: «eliminar swipe options e ir directamente a colocar botón de "Voy/Vas"
 * en eventos, "Seguir/Sigues" en lugares y artistas»). Un solo botón, siempre a la vista: "Voy" invita (también desde
 * "Me interesa", que ya no tiene botón propio en la lista — se cambia en la ficha); "Vas" ya está decidido y tocarlo
 * lo quita, con el mismo Deshacer de siempre. "Seguir"/"Sigues" en lugares y artistas, igual mecánica.
 */

export type Asistencia = "voy" | "me_interesa" | null;
export type ClaveAccion = "voy" | "no_voy" | "me_interesa" | "quitar_interes" | "seguir" | "dejar_de_seguir";

/** La clave del botón único de un evento: decidido (con Voy) lo quita; si no —también desde "Me interesa"— invita a Voy. */
export function claveVoy(estado: Asistencia): ClaveAccion {
  return estado === "voy" ? "no_voy" : "voy";
}

/** En qué queda el evento tras la acción: Voy y Me interesa se reemplazan entre sí, como en la ficha. */
export function asistenciaTras(clave: ClaveAccion): Asistencia {
  return clave === "voy" ? "voy" : clave === "me_interesa" ? "me_interesa" : null;
}

/** La clave del botón único de un lugar o artista: sigue → lo quita; si no, invita a Seguir. */
export function claveSeguir(sigo: boolean): ClaveAccion {
  return sigo ? "dejar_de_seguir" : "seguir";
}

/**
 * ¿Hubo arrastre? Para un carril de scroll nativo con enlaces dentro (Destacados, founder 2026-09-21, L45): ahí no
 * hay gesto propio que decidir (el navegador ya hace el scroll), pero un TAP con un poco de arrastre encima puede
 * llegar a "click" en el enlace igual. Con esto se cancela la navegación cuando el dedo se movió más que la zona
 * muerta entre bajar y soltar, en cualquier dirección. Ajena al botón del renglón: OL-094, no se toca aquí.
 */
export const UMBRAL_DECISION = 10;
export function huboArrastre(dx: number, dy: number, umbral: number = UMBRAL_DECISION): boolean {
  return Math.hypot(dx, dy) > umbral;
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
