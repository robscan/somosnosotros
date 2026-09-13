"use client";

import { createBrowserClient } from "@supabase/ssr";
import { configPublica } from "@/lib/config";

/** Cliente de Supabase para el navegador (entrar, subir foto). Null si faltan las variables. */
export function clienteNavegador() {
  const { supabaseUrl, supabaseAnonKey } = configPublica();
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
