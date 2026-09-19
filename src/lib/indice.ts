import { normalizarNombre } from "./lugares";

/** La letra de un nombre, sin acentos ni signos («Ángel» va en la A); lo que no empieza con una letra, en «#». */
export function letraDe(nombre: string): string {
  const c = normalizarNombre(nombre).charAt(0).toUpperCase();
  return /^[A-Z]$/.test(c) ? c : "#";
}

/** El id del encabezado de un grupo en la página. */
export const idGrupo = (letra: string) => `grupo-${letra === "#" ? "num" : letra}`;

/**
 * Cada elemento de una lista ya ordenada, con la letra de su grupo cuando es el primero de él (`null` en los demás,
 * para no repetir el encabezado). No fuerza A–Z: sigue el orden real de la lista, sea cual sea.
 */
export function conGrupos<T>(lista: T[], nombre: (x: T) => string): { x: T; grupo: string | null }[] {
  let anterior: string | null = null;
  return lista.map((x) => {
    const l = letraDe(nombre(x));
    const grupo = l === anterior ? null : l;
    anterior = l;
    return { x, grupo };
  });
}

/** Las letras con al menos un elemento, en el orden en que aparecen en la lista (para la tira: solo esas, sin apagar nada). */
export function letrasPresentes<T>(lista: T[], nombre: (x: T) => string): string[] {
  return conGrupos(lista, nombre).flatMap((f) => (f.grupo ? [f.grupo] : []));
}

/**
 * Para una lista ya ordenada (no hace falta traerla completa: basta una columna, como en Artistas), la letra de
 * cada grupo y en qué índice empieza (la primera vez que aparece). Sirve para saber cuántos hay que pedir (`n`,
 * múltiplo de la página) para que el grupo de una letra esté cargado, sin traer el catálogo completo de golpe.
 */
export function gruposConPosicion<T>(lista: T[], nombre: (x: T) => string): { letra: string; desde: number }[] {
  const vistos = new Set<string>();
  const grupos: { letra: string; desde: number }[] = [];
  lista.forEach((x, i) => {
    const l = letraDe(nombre(x));
    if (!vistos.has(l)) {
      vistos.add(l);
      grupos.push({ letra: l, desde: i });
    }
  });
  return grupos;
}
