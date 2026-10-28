import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { clienteAdmin } from "../supabase/admin";
import type { Conexion } from "./conexion";

/**
 * El token de Instagram (y de la página de Facebook) que usan `lib/instagram/api`, `lib/facebook/api` y la cola de redes (OL-471, bitácora 503):
 * primero el que guardó «Conectar Instagram» en Vault (`instagram_token()`, solo la llave de servicio) y, si no hay, `INSTAGRAM_TOKEN` (el que se
 * pegó a mano en Vercel, de respaldo). Nunca se imprime ni se registra.
 */

type Base = Pick<SupabaseClient, "rpc">;

export async function tokenInstagram(db: Base | null = clienteAdmin(), env: Record<string, string | undefined> = process.env): Promise<string | null> {
  if (db) {
    try {
      const { data, error } = await db.rpc("instagram_token");
      if (!error && typeof data === "string" && data.length >= 20) return data;
    } catch {
      // Sin base o sin la función: el de respaldo.
    }
  }
  return env.INSTAGRAM_TOKEN || null;
}

/** El token una sola vez por petición: la primera llamada lo lee y las demás reciben lo mismo (caché en memoria, nada más). */
export function tokenPorPeticion(leer: () => Promise<string | null> = () => tokenInstagram()): () => Promise<string | null> {
  let promesa: Promise<string | null> | null = null;
  return () => (promesa ??= leer());
}

/** Guarda la conexión (el token en Vault y el estado sin token) con la llave de servicio. False si no se pudo; nunca dice por qué hacia fuera. */
export async function guardarConexion(c: Conexion, db: Base | null = clienteAdmin()): Promise<boolean> {
  if (!db) return false;
  const { error } = await db.rpc("instagram_guardar_conexion", {
    p_token: c.token,
    p_pagina_id: c.paginaId,
    p_pagina_nombre: c.paginaNombre,
    p_instagram_id: c.instagramId,
    p_instagram_usuario: c.instagramUsuario,
    p_permisos: c.permisos,
    p_conectado_por: c.conectadoPor,
  });
  if (error) console.warn(`instagram: no se pudo guardar la conexión (${typeof error.code === "string" ? error.code : "sin código"})`);
  return !error;
}
