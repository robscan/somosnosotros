import { normalizarNombre } from "./lugares";

/** Las 26 letras del filtro, en orden. */
export const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** La tira completa: las letras y, al final, «#» para lo que no empieza con una (números, símbolos). */
export const ORDEN_LETRAS = [...LETRAS, "#"];

/** La letra de un nombre, sin acentos ni signos («Ángel» va en la A); lo que no empieza con una letra, en «#». */
export function letraDe(nombre: string): string {
  const c = normalizarNombre(nombre).charAt(0).toUpperCase();
  return /^[A-Z]$/.test(c) ? c : "#";
}

/** La letra leída de la URL: válida (A–Z o #) o, por defecto, la A (founder, 2026-09-19: evita un elemento más). */
export function letraDesdeUrl(v: string | undefined): string {
  const l = v?.toUpperCase();
  return l && (ORDEN_LETRAS as string[]).includes(l) ? l : "A";
}

/**
 * El rango de `nombre_orden` que cubre una letra (o «#»): un `gte`/`lt` aprovecha el índice `(ciudad, nombre_orden)`
 * sin traer el resto del catálogo. `nombre_orden` ya viene normalizado (minúsculas, sin acentos ni signos): lo que
 * no empieza con una letra empieza con un dígito o está vacío, y eso siempre es menor que "a".
 */
export function rangoDeLetra(letra: string): { desde: string; hasta: string } {
  if (letra === "#") return { desde: "", hasta: "a" };
  const c = letra.toLowerCase();
  return { desde: c, hasta: String.fromCharCode(c.charCodeAt(0) + 1) };
}
