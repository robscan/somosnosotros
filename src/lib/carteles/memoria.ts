import { esFotoPropia } from "./fotoPropia";
import type { IdFormato } from "./tokens";

/**
 * La memoria de pantalla del creador de cartel (OL-324, OL-337): lo que se guarda al cambiar (paso, tanda, diseño, formato, título acortado y la
 * foto propia) y cómo se repone al volver a la pantalla. Puro. Lo guardado es de la sesión del navegador y puede venir viejo o de otra cuenta:
 * cada dato se comprueba y lo que no vale cae al valor de siempre. La foto propia solo se repone si es de la carpeta de quien mira.
 */

export type Paso = "elegir" | "ver";
export type Recordado = { paso: Paso; tanda: number; plantilla: string | null; formato: IdFormato; titulo: string; foto: string | null };

export const INICIAL: Recordado = { paso: "elegir", tanda: 0, plantilla: null, formato: "4x5", titulo: "", foto: null };

/** Lo recordado, ya comprobado. `tandas` y `tandasConFoto` son cuántas tandas hay sin y con foto propia; `carpeta`, la de quien mira. */
export function reponerRecordado(r: unknown, { tandas, tandasConFoto, carpeta }: { tandas: number; tandasConFoto: number; carpeta: string | null }): Recordado {
  if (!r || typeof r !== "object") return INICIAL;
  const m = r as Partial<Record<keyof Recordado, unknown>>;
  const foto = esFotoPropia(m.foto, carpeta) ? m.foto : null;
  const cuantas = foto ? tandasConFoto : tandas;
  const tanda = typeof m.tanda === "number" && Number.isInteger(m.tanda) && m.tanda >= 0 && m.tanda < cuantas ? m.tanda : 0;
  const plantilla = typeof m.plantilla === "string" ? m.plantilla : null;
  const titulo = typeof m.titulo === "string" ? m.titulo : "";
  return { paso: m.paso === "ver" && plantilla ? "ver" : "elegir", tanda, plantilla, formato: m.formato === "9x16" ? "9x16" : "4x5", titulo, foto };
}
