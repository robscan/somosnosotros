/**
 * Fichas traídas de un catálogo externo (migración 0011): de dónde vienen, para decirlo en la ficha.
 * Hoy solo el CAPO, el catálogo público de la Dirección de Cultura Municipal (decisión del founder, 2026-09-14).
 */
export const ORIGENES = {
  capo: { nombre: "Catálogo de Artistas Potosinos", url: "https://www.catalogoartistaspotosino.com/", quien: "la Dirección de Cultura Municipal" },
} as const;
export type Origen = keyof typeof ORIGENES;

export function esOrigen(v: unknown): v is Origen {
  return typeof v === "string" && v in ORIGENES;
}
