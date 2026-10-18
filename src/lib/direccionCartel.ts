/**
 * Reconocer un lugar del directorio por la dirección que trae un cartel (OL-413): el cartel de «Trayectos Interactivos» decía «5 de mayo 1100 ·
 * Centro Histórico San Luis Potosí, México» y no el nombre del lugar; en el directorio estaba «Laboratorio Centro Histórico» con «C. 5 de Mayo
 * 1100, 78339 San Luis Potosí, Mexico». Lógica pura, sin base: la usa `leerCartelAccion` sobre los candidatos que trae la consulta (los que
 * tienen ese número en su dirección).
 *
 * Se compara la calle y el número del primer tramo de cada dirección (hasta la primera coma o separador), sin acentos ni mayúsculas, sin «C.»,
 * «Calle», «Av.» y compañía, sin «No.» ni «#»: la colonia, el código postal, la ciudad y el país quedan fuera porque cada quien los escribe a su
 * manera (o no los escribe).
 */

/** La calle y el número de una dirección, normalizados. */
export type CalleNumero = { calle: string; numero: string };

/** Lo que va delante del nombre de la calle y no la distingue. */
const PREFIJO = /^(c|cl|cll|calle|av|ave|avda|avenida|blvd|bulevar|boulevard|calz|calzada|carr|carretera|priv|privada|prol|prolongacion|andador|callejon|cjon|paseo|circuito|cto|camino|cerrada|cda)\b\.?\s*/;

/** Lo que separa los tramos de una dirección: la coma, un punto suelto entre espacios («1100 . Centro»), «·», «|», «;», un guion suelto o un salto. */
const TRAMOS = /,|\s\.\s|·|\||;|\s[-–—]\s|\n/;

/** Las palabras que no distinguen una calle de otra («5 de Mayo» y «5 Mayo» son la misma). */
const VACIAS = new Set(["de", "del", "la", "las", "los", "el", "y"]);

const sinAcentos = (t: string): string => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/**
 * La calle y el número del primer tramo de una dirección; null si no hay un número tras el nombre de la calle («Othón s/n esq. Chico Sein») o si la
 * calle no tiene letras. El número es el primero que va después de alguna palabra y no abre otro nombre («5 de Mayo 1100»: el 5 abre el nombre,
 * el 1100 es el número; «Plaza 16 de Septiembre 5»: el 16 va seguido de «de», es nombre). Con letra o interior («220-A») vale su parte numérica.
 */
export function partirDireccion(texto: string | null | undefined): CalleNumero | null {
  const tramo = sinAcentos(texto ?? "").split(TRAMOS)[0] ?? "";
  let limpio = tramo
    .replace(/[#º°]/g, " ")
    .replace(/\b(no|num|numero)\.?\s*(?=\d)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  for (let previo = ""; previo !== limpio; ) {
    previo = limpio;
    limpio = limpio.replace(PREFIJO, "").trim();
  }
  const palabras = limpio.split(" ").filter(Boolean);
  for (let i = 1; i < palabras.length; i++) {
    const numero = /^(\d{1,5})(?:-?[a-z]{1,2}|-\d{1,4})?\.?$/.exec(palabras[i]);
    if (!numero || VACIAS.has(palabras[i + 1] ?? "")) continue;
    const calle = palabras
      .slice(0, i)
      .join(" ")
      .replace(/[^a-z0-9 ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!/[a-z]/.test(calle)) return null;
    return { calle, numero: String(Number(numero[1])) };
  }
  return null;
}

/** Las palabras que distinguen la calle. */
const significativas = (calle: string): string[] => calle.split(" ").filter((p) => p && !VACIAS.has(p));

/**
 * ¿Son la misma calle y el mismo número? El mismo número y, de la calle, las mismas palabras o todas las de la más corta dentro de la más larga
 * («Galeana 423» y «Hermenegildo Galeana 423»). Sin calle y número en alguna de las dos, no.
 */
export function mismaDireccion(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = partirDireccion(a);
  const y = partirDireccion(b);
  if (!x || !y || x.numero !== y.numero) return false;
  const [corta, larga] = [significativas(x.calle), significativas(y.calle)].sort((p, q) => p.length - q.length);
  if (!corta.length) return false;
  const enLarga = new Set(larga);
  return corta.every((p) => enLarga.has(p));
}

/**
 * De los lugares que trajo la consulta, el único con la misma dirección que el cartel; null si ninguno o si son varios (entonces se pregunta
 * «¿Dónde es?» como siempre: no se elige uno al azar).
 */
export function unicoConDireccion<T extends { direccion: string | null }>(direccion: string | null | undefined, candidatos: readonly T[]): T | null {
  const iguales = candidatos.filter((c) => mismaDireccion(direccion, c.direccion));
  return iguales.length === 1 ? iguales[0] : null;
}
