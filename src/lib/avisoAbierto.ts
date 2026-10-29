/**
 * OL-480 (bitácora 512): contar cuántos avisos al teléfono se abren, sin saber quién. La dirección de cada aviso lleva `?desde=aviso&tipo=<tipo>`
 * (`contenidoPush`, avisos.ts); al abrirla, `AvisoAbierto` (en el layout) lo mide una vez con `aviso_abierto` (lista cerrada de `medir.ts`), suma uno
 * al conteo del día en la base (`POST /api/avisos/abierto` → `avisos_contar_abierto`: día y tipo, sin cuenta, teléfono ni evento) y quita los dos
 * datos de la dirección, para que no se cuente otra vez al recargar ni viajen al compartir. Sin `server-only`: lo usan el teléfono y el servidor.
 */

/** Lista cerrada: lo que dice la dirección de un aviso y lo que se cuenta. */
export const TIPOS_AVISO_ABIERTO = ["nuevo", "cambio", "recordatorio", "cancelado"] as const;
export type TipoAvisoAbierto = (typeof TIPOS_AVISO_ABIERTO)[number];

export function esTipoAvisoAbierto(valor: unknown): valor is TipoAvisoAbierto {
  return typeof valor === "string" && (TIPOS_AVISO_ABIERTO as readonly string[]).includes(valor);
}

/**
 * Lo que trae una dirección abierta desde un aviso: el tipo, si `desde=aviso` y el tipo es de la lista; y la misma dirección sin esos dos datos
 * (ruta, el resto de la consulta y el `#` intactos). Sin `desde=aviso`, `tipo` es null y `limpia` es null (no hay nada que quitar). Con un tipo que
 * no está en la lista, igual se limpia la dirección pero no se cuenta nada.
 */
export function leerAvisoAbierto(href: string): { tipo: TipoAvisoAbierto | null; limpia: string | null } {
  let url: URL;
  try {
    url = new URL(href, "https://somosnosotros.org");
  } catch {
    return { tipo: null, limpia: null };
  }
  if (url.searchParams.get("desde") !== "aviso") return { tipo: null, limpia: null };
  const tipo = url.searchParams.get("tipo");
  url.searchParams.delete("desde");
  url.searchParams.delete("tipo");
  return { tipo: esTipoAvisoAbierto(tipo) ? tipo : null, limpia: `${url.pathname}${url.search}${url.hash}` };
}
