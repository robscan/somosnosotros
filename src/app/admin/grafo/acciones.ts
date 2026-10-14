"use server";

import { revalidatePath, updateTag } from "next/cache";
import { ETIQUETA_GRAFO } from "@/lib/grafo";
import { usuarioActual } from "@/lib/supabase/servidor";

/**
 * «Actualizar» del grafo (OL-402, bitácora 433): el grafo se calcula una vez por hora (`cargarGrafo`, caché con etiqueta) para no gastar lecturas;
 * esto fuerza una lectura nueva al momento. Solo administración: sin sesión o sin el rol de admin no hace nada (ni invalida ni avisa más que `false`).
 * `updateTag` (y no `revalidateTag`) porque desde una acción del servidor expira la caché al instante, y la siguiente lectura ya trae lo nuevo.
 */
export async function actualizarGrafo(): Promise<{ ok: boolean }> {
  const actual = await usuarioActual();
  if (!actual || actual.perfil.rol !== "admin") return { ok: false };
  updateTag(ETIQUETA_GRAFO);
  revalidatePath("/admin/grafo");
  return { ok: true };
}
