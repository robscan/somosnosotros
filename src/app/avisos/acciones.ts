"use server";

import { revalidatePath } from "next/cache";
import { clienteServidor } from "@/lib/supabase/servidor";

export type EleccionAvisos = { correo?: boolean; push?: boolean };

/**
 * Guarda el consentimiento de avisos por canal, con fecha. Se llama tras el primer "Voy"
 * (pregunta) y desde Mi perfil (cambio). Marca que ya se preguntó: no se vuelve a preguntar.
 */
export async function elegirAvisos(eleccion: EleccionAvisos): Promise<boolean> {
  const supabase = await clienteServidor();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  if (!supabase || !user) return false;
  const ahora = new Date().toISOString();
  const cambios: Record<string, unknown> = { avisos_preguntado: true };
  if (typeof eleccion.correo === "boolean") {
    cambios.avisos_correo = eleccion.correo;
    cambios.avisos_correo_desde = eleccion.correo ? ahora : null;
    cambios.avisos_correo_motivo = null;
  }
  if (typeof eleccion.push === "boolean") {
    cambios.avisos_push = eleccion.push;
    cambios.avisos_push_desde = eleccion.push ? ahora : null;
  }
  const { error } = await supabase.from("perfiles").update(cambios).eq("id", user.id);
  if (error) return false;
  // Ajustes y la agenda muestran lo elegido. Que no se vuelva a preguntar no depende de esto: lo apunta la hoja para la
  // cuenta (lib/avisosPreguntados).
  revalidatePath("/perfil");
  revalidatePath("/");
  return true;
}
