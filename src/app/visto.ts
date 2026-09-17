"use server";

import { clienteServidor } from "@/lib/supabase/servidor";

/**
 * Abrió la app hoy (D3 de docs/rediseno/18): guarda solo el día, una vez al día por cuenta, en una tabla que solo lee la
 * administración (marcar_visto, migración 20260917090000). Sin sesión no hace nada.
 */
export async function marcarVisto(): Promise<boolean> {
  const supabase = await clienteServidor();
  if (!supabase) return false;
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return false;
  const { error } = await supabase.rpc("marcar_visto");
  return !error;
}
