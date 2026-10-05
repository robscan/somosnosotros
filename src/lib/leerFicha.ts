/**
 * La lectura de la ficha principal (evento, artista o lugar) distingue tres casos que antes se confundían (OL-289, SEO
 * etapa D): encontrada, «no existe» (sin error y sin fila: `null`, la página llama a `notFound()`) y «falló la lectura»
 * (error de la consulta, excepción del transporte o cliente no disponible: lanza). Antes `maybeSingle()` se leía solo por
 * `data`, así que una base caída (el 2026-10-03, cuota agotada, la API respondía 402) hacía pasar una ficha viva por
 * inexistente: respuesta con `noindex` y «No está». Mismo patrón que `leer` de `cargarAgenda.ts` (OL-267): la traza no
 * lleva la respuesta remota ni ningún dato de la ficha.
 *
 * `maybeSingle()` también devuelve error cuando la consulta trae más de una fila; se trata como fallo (no debería pasar:
 * el slug y el id son únicos).
 */
export const ERROR_FICHA = "No pudimos cargar la ficha.";

type Respuesta = { data: unknown; error?: unknown };
type Consulta = () => PromiseLike<Respuesta>;

/** La fila de la ficha, o `null` si confirmadamente no existe. `porId` solo se pregunta si el slug no trajo nada y el texto es un UUID. */
export async function leerFicha<T>(recurso: "evento" | "artista" | "lugar", porSlug: Consulta, porId: Consulta | null): Promise<T | null> {
  let fallo = false;
  try {
    const primera = await porSlug();
    if (primera.error) fallo = true;
    else if (primera.data) return primera.data as T;
    else if (porId) {
      const segunda = await porId();
      if (segunda.error) fallo = true;
      else return (segunda.data as T | null) ?? null;
    } else return null;
  } catch {
    // También cubre transportes que rechazan la promesa en vez de devolver PostgrestError.
    fallo = true;
  }
  if (fallo) console.warn(`[ficha] lectura no disponible: ${recurso}`);
  throw new Error(ERROR_FICHA);
}
