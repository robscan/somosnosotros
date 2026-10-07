import type { Plantilla } from "./plantillas/tipos";

/**
 * Qué cuatro plantillas se ofrecen (OL-324; doc 52 §3.4: «selección por reglas, sin IA»). Puro:
 * 1. Se descartan las que no sirven con los datos: sin ninguna imagen, las que necesitan foto (quedan las tipográficas y las que hacen de la
 *    fecha su imagen).
 * 2. Se ordenan por afinidad: el tipo del lugar y la disciplina de los artistas; cuenta en contra una que no enseña a todos los artistas o que
 *    tendría que cortar el título.
 * 3. La plantilla que se usó la última vez en ese lugar (memoria del lugar, `carteles_generados`) va primero.
 * 4. Se toman cuatro de familias distintas; «Ver otras» (`pagina` 1, 2…) trae las siguientes, también sin repetir familia en la misma tanda
 *    mientras se pueda.
 * El color no se elige aquí: cada plantilla toma su paleta de la foto al dibujarse (`paleta.ts`).
 */

export type Datos = {
  /** Hay alguna imagen (del evento, de un artista o del lugar). */
  conImagen: boolean;
  tipoLugar: string | null;
  disciplinas: readonly string[];
  artistas: number;
  /** La plantilla usada la última vez en este lugar, si la hay. */
  memoria: string | null;
  /** Las plantillas que tendrían que cortar el título con «…» (las calcula quien llama dibujándolas sin satori). */
  recortan?: ReadonlySet<string>;
};

export const POR_TANDA = 4;

/** La afinidad de una plantilla con los datos: más es mejor. */
export function afinidad(p: Plantilla, d: Datos): number {
  let puntos = 0;
  if (d.tipoLugar && p.afinidad.tiposLugar.includes(d.tipoLugar)) puntos += 2;
  for (const disciplina of new Set(d.disciplinas)) if (p.afinidad.disciplinas.includes(disciplina)) puntos += 2;
  if (d.artistas > p.artistasVisibles) puntos -= 1;
  if (d.recortan?.has(p.id)) puntos -= 3;
  return puntos;
}

/** Las que sirven, en orden (la de la memoria primero, luego por afinidad; empate, el orden del catálogo). */
export function ordenar(catalogo: readonly Plantilla[], d: Datos): Plantilla[] {
  const sirven = catalogo.filter((p) => d.conImagen || !p.fotoNecesaria);
  const puntos = new Map(sirven.map((p) => [p.id, afinidad(p, d)]));
  return sirven
    .map((p, i) => ({ p, i }))
    .sort((a, b) => Number(b.p.id === d.memoria) - Number(a.p.id === d.memoria) || puntos.get(b.p.id)! - puntos.get(a.p.id)! || a.i - b.i)
    .map(({ p }) => p);
}

/** Reparte en tandas de cuatro sin repetir familia dentro de una tanda mientras queden familias distintas. */
function enTandas(ordenadas: Plantilla[]): Plantilla[][] {
  const quedan = [...ordenadas];
  const tandas: Plantilla[][] = [];
  while (quedan.length > 0) {
    const tanda: Plantilla[] = [];
    for (let i = 0; i < quedan.length && tanda.length < POR_TANDA; ) {
      if (tanda.some((t) => t.familia === quedan[i].familia)) i++;
      else tanda.push(...quedan.splice(i, 1));
    }
    // Si ya no hay familias distintas, se completa con lo que quede, en orden.
    while (tanda.length < POR_TANDA && quedan.length > 0) tanda.push(quedan.shift()!);
    tandas.push(tanda);
  }
  return tandas;
}

/** Las cuatro de la tanda `pagina` (0 la primera); vuelve a empezar al acabarse. */
export function elegir(catalogo: readonly Plantilla[], d: Datos, pagina = 0): Plantilla[] {
  const tandas = enTandas(ordenar(catalogo, d));
  if (tandas.length === 0) return [];
  return tandas[((pagina % tandas.length) + tandas.length) % tandas.length];
}

/** Cuántas tandas hay (para saber si «Ver otras» trae algo nuevo). */
export function cuantasTandas(catalogo: readonly Plantilla[], d: Datos): number {
  return enTandas(ordenar(catalogo, d)).length;
}
