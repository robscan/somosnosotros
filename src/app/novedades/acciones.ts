"use server";

import { revalidatePath } from "next/cache";
import { clienteServidor } from "@/lib/supabase/servidor";

/** Al abrir Novedades: se apaga el punto de la campana (decisión 1 de docs/rediseno/13). */
export async function marcarNovedadesVistas(): Promise<void> {
  const supabase = await clienteServidor();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  if (!supabase || !user) return;
  await supabase.from("perfiles").update({ novedades_vistas_en: new Date().toISOString() }).eq("id", user.id);
  revalidatePath("/");
  revalidatePath("/lugares");
  revalidatePath("/artistas");
}
