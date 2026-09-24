/**
 * Topes de longitud compartidos entre base de datos, servidor y pantalla.
 * La fuente de verdad: supabase/migrations.
 * Cambiar aquí y en la migración de una (pantalla + servidor usan esto; la base tiene el check).
 */

/** Topes de un lugar: nombre, descripción, dirección, detalle para "Otro". */
export const LIMITES_LUGAR = { nombre: 120, descripcion: 600, direccion: 200, detalle: 60 } as const;

/** Topes de un evento: título, descripción, precio, sitio, dirección, indicaciones. */
export const LIMITES_EVENTO = {
  titulo: 120,
  descripcion: 1000,
  precio: 60,
  sitio: 120,
  direccion: 200,
  indicaciones: 300,
} as const;

/** Topes de un artista: nombre, detalle, descripción. */
export const LIMITES_ARTISTA = { nombre: 80, detalle: 40, descripcion: 600 } as const;

/** Topes de un perfil: nombre (en pestaña Seguidos va con su bio y ciudad), bio. */
export const LIMITES_PERFIL = { nombre: 60, colonia: 60, bio: 140 } as const;

/** Topes de una novedad de artista (doc 44 §4, OL-175): título y texto, los dos opcionales. */
export const LIMITES_NOVEDAD_ARTISTA = { titulo: 60, texto: 280 } as const;

/** Devuelve el tope de un campo dado su nombre, o null si no existe tope. */
export function topeDe(tabla: "lugar" | "evento" | "artista" | "perfil", campo: string): number | null {
  const limites = { lugar: LIMITES_LUGAR, evento: LIMITES_EVENTO, artista: LIMITES_ARTISTA, perfil: LIMITES_PERFIL };
  const tope = limites[tabla][campo as keyof typeof limites[typeof tabla]];
  return typeof tope === "number" ? tope : null;
}
