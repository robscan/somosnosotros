import { normalizarNombre } from "./lugares";

/** Las letras del índice lateral, como en Contactos: sin «Todos» ni «#». */
export const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** La letra del grupo de un nombre, sin acentos ni signos («Ángel» va en la A); lo que empieza con número, en «#». */
export function letraDe(nombre: string): string {
  const c = normalizarNombre(nombre).charAt(0).toUpperCase();
  return /^[A-Z]$/.test(c) ? c : "#";
}

/** El id del encabezado de un grupo en la página. */
export const idGrupo = (letra: string) => `grupo-${letra === "#" ? "num" : letra}`;

/** Cada elemento con la letra de su grupo cuando es el primero de él (la lista ya viene en orden alfabético). */
export function conGrupos<T>(lista: T[], nombre: (x: T) => string): { x: T; grupo: string | null }[] {
  let anterior: string | null = null;
  return lista.map((x) => {
    const l = letraDe(nombre(x));
    const grupo = l === anterior ? null : l;
    anterior = l;
    return { x, grupo };
  });
}

/** La letra bajo el dedo: posición vertical dentro de la columna, repartida entre las 26 letras. */
export function letraEnPunto(y: number, alto: number): string {
  if (alto <= 0) return LETRAS[0];
  const i = Math.floor((y / alto) * LETRAS.length);
  return LETRAS[Math.min(LETRAS.length - 1, Math.max(0, i))];
}

/** Si la letra no tiene grupo, la siguiente que sí; si no hay siguiente, la anterior (como Contactos). */
export function letraDestino(letra: string, presentes: string[]): string | null {
  const orden = presentes.filter((l) => l !== "#").sort();
  if (!orden.length) return null;
  return orden.find((l) => l >= letra) ?? orden[orden.length - 1];
}

/**
 * Qué hace tocar una letra en una lista paginada (Artistas). La página cubre desde `desde` (null = el principio)
 * hasta la última letra cargada, o hasta la Z si ya no quedan más. Dentro de ese tramo se salta al grupo; fuera,
 * se pide al servidor la lista desde esa letra (la A vuelve al principio).
 */
export function accionDeLetra(letra: string, t: { presentes: string[]; desde: string | null; completa: boolean }): { tipo: "saltar"; letra: string } | { tipo: "cargar"; letra: string | null } {
  const orden = t.presentes.filter((l) => l !== "#").sort();
  const inicio = t.desde ?? "A";
  const fin = t.completa ? "Z" : (orden[orden.length - 1] ?? inicio);
  if (letra >= inicio && letra <= fin) {
    const destino = letraDestino(letra, orden);
    if (destino && (destino >= letra || t.completa)) return { tipo: "saltar", letra: destino };
  }
  return { tipo: "cargar", letra: letra === "A" ? null : letra };
}
