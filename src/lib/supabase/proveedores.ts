import "server-only";
import { configPublica } from "@/lib/config";
import { leerEncendidos, type Proveedor } from "@/lib/entrarCon";

/**
 * Qué proveedores tiene encendidos Supabase (Authentication → Sign In / Providers). El interruptor de Supabase manda:
 * al encender Apple o Google su botón sale en Entrar en menos de un minuto, y al apagarlo desaparece, sin desplegar.
 * Si Supabase tarda o falla, Entrar sigue con el correo.
 */
export async function proveedoresEncendidos(): Promise<Record<Proveedor, boolean>> {
  const { supabaseUrl, supabaseAnonKey } = configPublica();
  if (!supabaseUrl || !supabaseAnonKey) return leerEncendidos(null);
  try {
    const respuesta = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: supabaseAnonKey },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(2000),
    });
    return leerEncendidos(respuesta.ok ? await respuesta.json() : null);
  } catch {
    return leerEncendidos(null);
  }
}
