"use server";

import { revalidatePath } from "next/cache";
import { esUuid } from "@/lib/formulario";
import { RUTA_POR_APROBAR } from "@/lib/showcase";
import { esMotivoRechazo, type MotivoRechazo } from "@/lib/showcasePorAprobar";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { decidirEvidencia, type Resultado } from "./acciones";

/**
 * Las acciones de «Por aprobar» y de «Por revisar» en la ficha (OL-446). Aceptar, rechazar y deshacer pasan siempre por `decidirEvidencia` (la
 * acción de OL-426) sin cambiar su lógica: aquí solo se añade lo nuevo, el motivo del rechazo (columna `motivo_rechazo`, migración
 * 20261022140000) y aceptar varias de un artista de una vez. Cada una vuelve a leer «Por aprobar», además de lo que ya vuelve a leer la acción.
 */
async function soloAdmin() {
  const actual = await usuarioActual();
  if (!actual || actual.perfil.rol !== "admin") return null;
  return (await clienteServidor()) ?? null;
}

/** Aceptar o deshacer (vuelve a propuesta), con la acción de siempre; también vuelve a leer «Por aprobar». */
export async function decidir(evidenciaId: string, estado: "aceptada" | "propuesta", slug: string): Promise<Resultado> {
  const r = await decidirEvidencia(evidenciaId, estado, slug);
  if (r.ok) revalidatePath(RUTA_POR_APROBAR);
  return r;
}

/**
 * Rechazar con su motivo (respuesta 5 del gestor): primero la acción de siempre (la base anota quién y cuándo), luego el motivo. Si el motivo no se
 * guarda, el rechazo queda y se dice.
 */
export async function rechazarConMotivo(evidenciaId: string, motivo: MotivoRechazo, slug: string): Promise<Resultado> {
  if (!esMotivoRechazo(motivo)) return { ok: false, error: "Elige por qué la rechazas." };
  const r = await decidirEvidencia(evidenciaId, "rechazada", slug);
  if (!r.ok) return r;
  revalidatePath(RUTA_POR_APROBAR);
  const db = await soloAdmin();
  if (!db) return { ok: false, error: "Se rechazó, pero no se guardó el motivo." };
  const { error } = await db.from("showcase_evidencias").update({ motivo_rechazo: motivo }).eq("id", evidenciaId).eq("estado", "rechazada");
  if (error) return { ok: false, error: "Se rechazó, pero no se guardó el motivo." };
  return { ok: true };
}

/**
 * «Aceptar las N de <artista>»: una por una con la acción de siempre, en el orden en que llegan. Devuelve las que se aceptaron (para que la pantalla
 * diga cada una con su Deshacer) y, si alguna falló, la primera causa.
 */
export async function aceptarVarias(ids: unknown, slug: string): Promise<{ ok: true; aceptadas: string[] } | { ok: false; aceptadas: string[]; error: string }> {
  const lista = Array.isArray(ids) ? [...new Set(ids.filter((id): id is string => typeof id === "string" && esUuid(id)))] : [];
  if (!lista.length || lista.length > 100) return { ok: false, aceptadas: [], error: "No encontramos esas evidencias." };
  const aceptadas: string[] = [];
  for (const id of lista) {
    const r = await decidirEvidencia(id, "aceptada", slug);
    if (!r.ok) {
      revalidatePath(RUTA_POR_APROBAR);
      return { ok: false, aceptadas, error: r.error };
    }
    aceptadas.push(id);
  }
  revalidatePath(RUTA_POR_APROBAR);
  return { ok: true, aceptadas };
}
