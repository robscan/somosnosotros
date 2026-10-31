"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CLAVE_SEMANAL, leerAjusteSemanal } from "@/lib/rutinas/ajusteSemanal";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";

export type Resultado = { ok: true } | { ok: false; error: string };

/**
 * Encender o apagar «Completar fichas» cada semana (OL-489, Administración › Corridas, OL-494). Solo la administración (la base lo vuelve a exigir: la
 * tabla `configuracion` solo la escribe un admin). Se guarda al tocar, como el interruptor de Pincel; el tope que ya tenía se conserva.
 */
export async function cambiarFichasSemanal(activa: boolean): Promise<Resultado> {
  const actual = await usuarioActual();
  if (!actual) redirect("/entrar?siguiente=/admin");
  if (actual.perfil.rol !== "admin") redirect("/");
  const supabase = await clienteServidor();
  if (!supabase) return { ok: false, error: "No se pudo guardar. Intenta de nuevo." };
  const previo = await supabase.from("configuracion").select("valor").eq("clave", CLAVE_SEMANAL).maybeSingle();
  if (previo.error) return { ok: false, error: "Sin conexión con la base. Intenta de nuevo." };
  const ajuste = leerAjusteSemanal(previo.data?.valor);
  const valor = { activa: activa === true, tope_usd: ajuste.tope_usd, cambiado_en: new Date().toISOString(), cambiado_por: actual.perfil.id };
  const { error } = await supabase.from("configuracion").upsert({ clave: CLAVE_SEMANAL, valor, actualizado_en: valor.cambiado_en }, { onConflict: "clave" });
  if (error) return { ok: false, error: "No se pudo guardar. Intenta de nuevo." };
  revalidatePath("/admin");
  revalidatePath("/admin/corridas");
  return { ok: true };
}
