import "server-only";
import { createClient } from "@supabase/supabase-js";
import { configPublica } from "@/lib/config";

/**
 * Cliente con la llave de servicio (salta las reglas por fila). Solo en el servidor y solo para
 * lo que ningún usuario puede hacer por sí mismo: leer correos para avisos y registrar avisos enviados.
 */
export function clienteAdmin() {
  const { supabaseUrl } = configPublica();
  const llave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !llave) return null;
  return createClient(supabaseUrl, llave, { auth: { persistSession: false, autoRefreshToken: false } });
}
