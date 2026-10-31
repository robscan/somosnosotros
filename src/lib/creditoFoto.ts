/**
 * El crédito de la portada de un lugar o un artista (OL-491, migración `20261029260000_portada_credito.sql`): autor y licencia de una foto que
 * no es de la ficha (las de Wikimedia Commons con CC BY o CC BY-SA piden decirlo donde se usa la foto). Se guarda como un texto corto en una
 * línea, «Pablo Pérez · CC BY-SA 4.0», y si trae la dirección de la foto (entre paréntesis o al final) el nombre enlaza a ella. Puro: lo
 * usan la ficha (`ui/Heroe`), la edición (las acciones de lugar y artista) y el texto de Instagram (`instagram/texto.ts`).
 */

/** El tope de la base (`check` de la migración). */
export const TOPE_CREDITO_FOTO = 160;
/** La línea de ayuda del campo en la edición de lugar y de artista. */
export const AYUDA_CREDITO_FOTO = "Autor y licencia, si la foto no es tuya";

/** «Foto: …» al principio sobra: la ficha y el texto ya lo dicen. */
const PREFIJO = /^\s*(foto|imagen|crédito|credito)\s*:\s*/i;

/** El crédito en una línea, sin «Foto:» delante ni espacios de más; vacío si no hay nada. */
export function limpiarCreditoFoto(valor: unknown): string {
  if (typeof valor !== "string") return "";
  return valor.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().replace(PREFIJO, "").trim();
}

/** Lo que escribió la persona, listo para guardar: null si va vacío; con `error` si pasa del tope. */
export function validarCreditoFoto(valor: unknown): { credito: string | null; error?: string } {
  const credito = limpiarCreditoFoto(valor);
  if (!credito) return { credito: null };
  if (credito.length > TOPE_CREDITO_FOTO) return { credito, error: `Máximo ${TOPE_CREDITO_FOTO} caracteres.` };
  return { credito };
}

/**
 * Qué guarda una edición de la ficha en `portada_credito`: sin portada, nada (null); si el formulario no mandó el campo (una pestaña abierta antes
 * de que existiera), no se toca (`undefined`, fuera del `update`); si lo mandó, lo escrito ya limpio (vacío = null). Con `error` si pasa del tope.
 */
export function creditoAlGuardar(formData: Pick<FormData, "has" | "get">, portada: string | null): { credito?: string | null; error?: string } {
  if (!portada) return { credito: null };
  if (!formData.has("portada_credito")) return {};
  return validarCreditoFoto(formData.get("portada_credito"));
}

/** Una dirección http(s) bien formada, o null. */
function direccion(texto: string): string | null {
  try {
    const u = new URL(texto);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export type PartesCredito = {
  /** Quién (lo que enlaza, si hay dirección): lo de antes del primer «·». */
  nombre: string;
  /** El resto («CC BY-SA 4.0»), sin el «·» que lo separa; vacío si no hay. */
  resto: string;
  /** La dirección de la foto, si la trae entre paréntesis o al final. */
  url: string | null;
};

/**
 * El crédito partido para pintarlo: «Pablo Pérez · CC BY-SA 4.0 (https://commons.wikimedia.org/…)» → nombre «Pablo Pérez», resto
 * «CC BY-SA 4.0» y la dirección. Sin dirección, nada enlaza; una dirección que no es http(s) se queda como texto. Null si no hay crédito.
 */
export function partesCreditoFoto(credito: string | null | undefined): PartesCredito | null {
  let texto = limpiarCreditoFoto(credito);
  if (!texto) return null;
  let url: string | null = null;
  // Entre paréntesis, en cualquier sitio; si no, una dirección suelta al final.
  const entre = texto.match(/\(\s*(https?:\/\/[^\s()]+)\s*\)/i);
  const alFinal = entre ? null : texto.match(/(?:^|\s)(https?:\/\/\S+)$/i);
  const hallada = entre ?? alFinal;
  if (hallada) {
    const posible = direccion(hallada[1]);
    if (posible) {
      url = posible;
      texto = (texto.slice(0, hallada.index) + texto.slice(hallada.index! + hallada[0].length)).replace(/\s+/g, " ").replace(/\s*·\s*$/, "").trim();
    }
  }
  const i = texto.indexOf("·");
  const nombre = (i >= 0 ? texto.slice(0, i) : texto).trim();
  const resto = (i >= 0 ? texto.slice(i + 1) : "").trim();
  // Solo una dirección: no se inventa un autor; enlaza el dominio de la foto («commons.wikimedia.org»).
  if (!nombre) return { nombre: url ? new URL(url).hostname.replace(/^www\./, "") : "", resto, url };
  return { nombre, resto, url };
}
