import { normalizarNombre } from "./lugares";

/**
 * Reconocer un lugar del directorio por el nombre que trae un cartel, con tolerancia (OL-413, verificación del gestor con la lectura real del
 * 18 de octubre): de Cumbiachella el lector devolvió «Lunaria Foro Expandido» (lo que dice el logotipo), y `lugares_con_nombre` con ese nombre
 * completo no encuentra «Foro lunaria»; con «Lunaria», sí. Si el nombre completo no cruza, se prueba con sus palabras distintivas, y solo se acepta
 * si entre todas dan un único lugar (de la ciudad, si se sabe). Lógica pura: la búsqueda la pone quien llama (`leerCartelAccion`).
 */

/** Las palabras que no distinguen un lugar de otro: el tipo de sitio, lo que acompaña a los nombres y los artículos. */
const GENERICAS = new Set(
  [
    "foro", "foros", "espacio", "espacios", "centro", "cultural", "culturales", "casa", "galeria", "museo", "teatro", "cafe", "cafeteria", "bar",
    "restaurante", "expandido", "lab", "laboratorio", "sala", "salon", "auditorio", "club", "estudio", "plaza", "jardin", "parque", "arte", "artes",
    "la", "las", "el", "los", "lo", "de", "del", "y", "e", "en", "the",
  ].map(normalizarNombre),
);

/** Las palabras distintivas de un nombre: sin acentos y en minúsculas, sin las genéricas, de 4 letras o más, sin repetir («Lunaria Foro Expandido» → «lunaria»). */
export function palabrasDistintivas(nombre: string): string[] {
  return [...new Set(normalizarNombre(nombre).split(" ").filter((p) => p.length >= 4 && !GENERICAS.has(p)))];
}

type Candidato = { id: string; ciudad?: string | null };

/**
 * El lugar que nombra el cartel: el único que cruza con el nombre completo (como siempre: con dos o más se pregunta) o, si el nombre completo no
 * cruza con ninguno, el único que dan sus palabras distintivas juntas, en la ciudad si se sabe (uno de otra ciudad no cuenta; uno sin ciudad
 * conocida, sí). null si no hay ninguno o si son varios.
 */
export async function lugarPorNombre<T extends Candidato>(nombre: string, buscar: (texto: string) => Promise<readonly T[]>, ciudad: string | null = null): Promise<T | null> {
  const completo = await buscar(nombre);
  if (completo.length === 1) return completo[0];
  if (completo.length > 1) return null;
  const enLaCiudad = (l: T) => !ciudad || !l.ciudad || normalizarNombre(l.ciudad) === normalizarNombre(ciudad);
  const porId = new Map<string, T>();
  for (const palabra of palabrasDistintivas(nombre)) for (const l of await buscar(palabra)) if (enLaCiudad(l)) porId.set(l.id, l);
  return porId.size === 1 ? [...porId.values()][0] : null;
}
