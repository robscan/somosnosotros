/**
 * Desde dónde se abre el creador de cartel (OL-336, para medirlo): el menú de ajustes de la ficha, su acción redonda «Crear cartel» o «Publicado»
 * del alta. Va en la dirección (`?origen=`): la pantalla lo lee una vez. Lo que no se reconoce (un enlace guardado, una recarga sin él) es
 * «otro». Aparte de `parametros.ts` y sin dependencias: «Publicado» lo usa y no debe cargar las medidas de las letras del cartel.
 */
export const ORIGENES_CREADOR = ["menu", "accion", "publicado"] as const;
export type OrigenCreador = (typeof ORIGENES_CREADOR)[number];

/** La dirección del creador de cartel de un evento (`hrefEvento(e)`), con desde dónde se abre. */
export function hrefCreador(hrefDelEvento: string, origen: OrigenCreador): string {
  return `${hrefDelEvento}/cartel?origen=${origen}`;
}

export function origenCreador(valor: string | string[] | null | undefined): OrigenCreador | "otro" {
  return typeof valor === "string" && (ORIGENES_CREADOR as readonly string[]).includes(valor) ? (valor as OrigenCreador) : "otro";
}
