"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
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
  // Con `after` (OL-212, tercera vuelta): la hoja (ConsentimientoAvisos) ya avisa lo decidido a quien la abrió por
  // `onDecidido`, sin pedirle nada al servidor (arreglo de la primera vuelta) — y Mi perfil hace su propio
  // `router.refresh()` tras guardar. Nadie necesita el `revalidatePath` de inmediato; revalidar aquí solo repintaría
  // de más la pantalla desde la que se abrió la hoja (un carril de Inicio, una ficha…), porque cualquier
  // `revalidatePath` en una acción hace que Next rehaga y reenvíe toda la ruta actual en la misma respuesta, sin
  // importar qué ruta se le pase (server-actions.md de Next 16.3.5, la versión instalada). Aplazado, Perfil e
  // Inicio se marcan igual de viejos para la próxima vez que se pidan, sin repintar esta.
  after(() => {
    revalidatePath("/perfil");
    revalidatePath("/");
  });
  return true;
}
