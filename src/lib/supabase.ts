import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { configPublica } from "./config";

/**
 * Cliente de Supabase para el navegador y para el servidor.
 * Devuelve null si faltan las variables: la app sigue abriendo (el mapa no depende de Supabase).
 * En la Fase 1 (usuarios) esto se completa con sesiones por cookie; el esquema de tablas llega ahí.
 */
export function crearClienteSupabase(): SupabaseClient | null {
  const { supabaseUrl, supabaseAnonKey } = configPublica();
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey);
}
