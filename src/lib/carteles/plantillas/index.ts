import { cineBanda, cineSangre } from "./cine";
import { feriaBoleto, feriaPicado } from "./feria";
import { tipoFecha, tipoFranja } from "./tipografico";
import type { Plantilla } from "./tipos";

/**
 * El catálogo de arranque (OL-324; doc 52 §3.4): seis familias por dos variantes. El orden es el de siempre para desempatar: una familia
 * nueva se agrega al final para que la memoria de los lugares no cambie de sitio.
 */
export const CATALOGO: readonly Plantilla[] = [cineSangre, cineBanda, tipoFranja, tipoFecha, feriaPicado, feriaBoleto];

export function plantillaPorId(id: string | null | undefined): Plantilla | null {
  return CATALOGO.find((p) => p.id === id) ?? null;
}

export type { Plantilla } from "./tipos";
