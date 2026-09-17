import type { Asistencia } from "./deslizar";

/**
 * Las pestañas de la ficha de una persona con los gestos de quien mira (OL-057, bitácora 086): qué renglones van en cada
 * pestaña según lo que quien mira decidió ahora, cuántos son y qué pestañas se ven.
 *
 * - **Mi perfil:** cada evento va en la pestaña de lo que decidí ahora. Lo que quito desaparece al instante (decisión del
 *   founder: «Quitar pienso que debería desaparecer al instante»), Deshacer lo devuelve a su sitio y Voy desde "Me
 *   interesa" lo pasa a "Voy a". Lo que dejo de seguir sale de "Sigo".
 * - **Ficha de otra persona:** "Va a" y "Sigue" son suyos y no cambian con mis gestos; "Van a lo mismo" son los suyos a
 *   los que voy yo, así que sigue a mi Voy.
 * - Una pestaña que había al abrir no se va aunque se vacíe (Deshacer la vuelve a llenar); una nueva aparece al llenarse.
 */

export type ClavePestana = "va" | "sigue" | "juntos" | "interesa";
export type Actividad<E, L, A> = { clave: ClavePestana; etiqueta: string; n: number; eventos: E[]; lugares: L[]; artistas: A[] };

type Entrada<E, L, A> = {
  mia: boolean;
  /** Mi perfil: mis eventos, a los que voy y los que me interesan, en orden. Ficha ajena: a los que va la persona. */
  eventos: E[];
  lugares: L[];
  artistas: A[];
  /** Lo que quien mira decidió ahora en cada evento, y si sigue cada lugar o artista. */
  estado: (id: string) => Asistencia;
  sigo: (id: string) => boolean;
  /** Cuántos había al abrir en las pestañas que pueden aparecer o vaciarse: se ven si había o si hay. */
  alAbrir: { juntos: number; interesa: number };
};

/**
 * Lo visto en la visita (Mi perfil): lo que llega del servidor reemplaza lo que ya estaba, por id, y lo nuevo se suma al
 * final; lo que el servidor ya no trae (lo quitado y guardado) se queda, para que Deshacer lo devuelva al instante. Qué
 * se ve en cada pestaña lo decide lo decidido ahora, no esta lista.
 */
export function unirVistos<T extends { id: string }>(vistos: T[], llegan: T[]): T[] {
  const nuevos = new Map(llegan.map((x) => [x.id, x]));
  const ya = new Set(vistos.map((x) => x.id));
  return [...vistos.map((x) => nuevos.get(x.id) ?? x), ...llegan.filter((x) => !ya.has(x.id))];
}

function pestana<E, L, A>(clave: ClavePestana, etiqueta: string, x: { eventos?: E[]; lugares?: L[]; artistas?: A[] }): Actividad<E, L, A> {
  const eventos = x.eventos ?? [];
  const lugares = x.lugares ?? [];
  const artistas = x.artistas ?? [];
  return { clave, etiqueta, n: eventos.length + lugares.length + artistas.length, eventos, lugares, artistas };
}

export function pestanasDePersona<E extends { id: string }, L extends { id: string }, A extends { id: string }>(p: Entrada<E, L, A>): Actividad<E, L, A>[] {
  if (p.mia) {
    const interesa = p.eventos.filter((e) => p.estado(e.id) === "me_interesa");
    const pestanas = [
      pestana<E, L, A>("va", "Voy a", { eventos: p.eventos.filter((e) => p.estado(e.id) === "voy") }),
      pestana<E, L, A>("sigue", "Sigo", { lugares: p.lugares.filter((l) => p.sigo(l.id)), artistas: p.artistas.filter((a) => p.sigo(a.id)) }),
    ];
    if (p.alAbrir.interesa > 0 || interesa.length > 0) pestanas.push(pestana("interesa", "Me interesa", { eventos: interesa }));
    return pestanas;
  }
  const juntos = p.eventos.filter((e) => p.estado(e.id) === "voy");
  const pestanas = [pestana<E, L, A>("va", "Va a", { eventos: p.eventos }), pestana<E, L, A>("sigue", "Sigue", { lugares: p.lugares, artistas: p.artistas })];
  if (p.alAbrir.juntos > 0 || juntos.length > 0) pestanas.push(pestana("juntos", "Van a lo mismo", { eventos: juntos }));
  return pestanas;
}
