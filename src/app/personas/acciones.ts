"use server";

import { revalidatePath } from "next/cache";
import { esUuid } from "@/lib/formulario";
import { clienteServidor } from "@/lib/supabase/servidor";

export type ResultadoBloqueo = { ok: true } | { ok: false; error: string };

/**
 * Bloquear a una persona (OL-203, guía 1.2 de App Store): deja de ver en listados y carriles lo que publicó
 * (sus eventos y sus novedades de artista; el filtro vive en la base, migración 20260925150000_bloqueos.sql).
 * Nunca se le avisa a quien se bloquea. Idempotente: bloquear dos veces no es error.
 */
export async function bloquear(personaId: string): Promise<ResultadoBloqueo> {
  const supabase = await clienteServidor();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  if (!supabase || !user) return { ok: false, error: "Necesitas iniciar sesión." };
  if (!esUuid(personaId) || personaId === user.id) return { ok: false, error: "No se pudo bloquear." };
  const { error } = await supabase.from("bloqueos").upsert({ quien: user.id, bloqueado: personaId }, { onConflict: "quien,bloqueado", ignoreDuplicates: true });
  if (error) return { ok: false, error: "No se pudo bloquear. Intenta de nuevo." };
  revalidatePath(`/personas/${personaId}`);
  revalidatePath("/ajustes/bloqueados");
  return { ok: true };
}

/** Desbloquear: se deshace borrando la fila; nada más que avisar. */
export async function desbloquear(personaId: string): Promise<ResultadoBloqueo> {
  const supabase = await clienteServidor();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  if (!supabase || !user) return { ok: false, error: "Necesitas iniciar sesión." };
  if (!esUuid(personaId)) return { ok: false, error: "No se pudo desbloquear." };
  const { error } = await supabase.from("bloqueos").delete().eq("quien", user.id).eq("bloqueado", personaId);
  if (error) return { ok: false, error: "No se pudo desbloquear. Intenta de nuevo." };
  revalidatePath(`/personas/${personaId}`);
  revalidatePath("/ajustes/bloqueados");
  return { ok: true };
}
