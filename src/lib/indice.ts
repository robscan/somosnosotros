import { normalizarNombre } from "./lugares";

/** La letra de un nombre, sin acentos ni signos («Ángel» va en la A); lo que no empieza con una letra, en «#». */
export function letraDe(nombre: string): string {
  const c = normalizarNombre(nombre).charAt(0).toUpperCase();
  return /^[A-Z]$/.test(c) ? c : "#";
}

/** El id del encabezado de un grupo en la página. */
export const idGrupo = (letra: string) => `grupo-${letra === "#" ? "num" : letra}`;

/** Una lista ya ordenada, partida en grupos por letra en el orden real de la lista (uno por cada racha de la misma letra). */
export function agruparPorLetra<T>(lista: T[], nombre: (x: T) => string): { letra: string; items: T[] }[] {
  const grupos: { letra: string; items: T[] }[] = [];
  for (const x of lista) {
    const letra = letraDe(nombre(x));
    const ultimo = grupos[grupos.length - 1];
    if (ultimo?.letra === letra) ultimo.items.push(x);
    else grupos.push({ letra, items: [x] });
  }
  return grupos;
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
