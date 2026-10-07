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
 * 5. Siempre una sin imagen (OL-337, founder 2026-10-07: «siempre incluir una opción sin imagen (cartel tipográfico)»): si hay imagen, una de las
 *    cuatro de cada tanda se dibuja en su versión sin foto, donde la fecha o la letra es la imagen (`sinFotoDe`). Sin ninguna imagen ya lo son todas.
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
  /** Lo mismo en su versión sin foto (la medida del texto puede cambiar: sin foto, el título tiene otra caja). Sin esto, vale `recortan`. */
  recortanSinFoto?: ReadonlySet<string>;
};

/** Una opción de la tanda: la plantilla y si se dibuja sin foto aunque haya imagen (la tipográfica de la tanda). */
export type Eleccion = { plantilla: Plantilla; sinFoto: boolean };

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

/**
 * La que va sin foto en una tanda con imagen (OL-337): la de más afinidad en su versión sin foto (con lo que corta el título sin foto), sin
 * contar la primera de la tanda, que es la que mejor encaja y conserva la foto (con una foto propia recién puesta, la persona la espera ahí).
 * Empate: la que va antes. Solo si ninguna otra puede ir sin foto se usa la primera; las que necesitan foto nunca.
 */
export function sinFotoDe(tanda: readonly Plantilla[], d: Datos): Plantilla | null {
  const sinFoto = { ...d, recortan: d.recortanSinFoto ?? d.recortan };
  const pueden = tanda.filter((p) => !p.fotoNecesaria);
  const candidatas = pueden.filter((p) => p !== tanda[0]);
  let mejor: Plantilla | null = null;
  for (const p of candidatas.length > 0 ? candidatas : pueden) if (!mejor || afinidad(p, sinFoto) > afinidad(mejor, sinFoto)) mejor = p;
  return mejor;
}

/** Todas las tandas, cada una con su opción sin foto. Sin ninguna imagen, todas van sin foto. */
export function tandasDe(catalogo: readonly Plantilla[], d: Datos): Eleccion[][] {
  return enTandas(ordenar(catalogo, d)).map((tanda) => {
    const tipografica = d.conImagen ? sinFotoDe(tanda, d) : null;
    return tanda.map((plantilla) => ({ plantilla, sinFoto: !d.conImagen || plantilla === tipografica }));
  });
}

/** Las cuatro de la tanda `pagina` (0 la primera); vuelve a empezar al acabarse. */
export function elegir(catalogo: readonly Plantilla[], d: Datos, pagina = 0): Eleccion[] {
  const tandas = tandasDe(catalogo, d);
  if (tandas.length === 0) return [];
  return tandas[((pagina % tandas.length) + tandas.length) % tandas.length];
}

/** Cuántas tandas hay (para saber si «Ver otras» trae algo nuevo). */
export function cuantasTandas(catalogo: readonly Plantilla[], d: Datos): number {
  return enTandas(ordenar(catalogo, d)).length;
}
