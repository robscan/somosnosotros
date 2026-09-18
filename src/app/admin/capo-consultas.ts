import "server-only";
import { leerMetricasCapo, type MetricasCapo } from "@/lib/capo-metricas";
import { clienteServidor } from "@/lib/supabase/servidor";

/** La RPC comprueba sesión/rol y devuelve únicamente agregados, sin usar la llave de servicio. */
export async function cargarCapo(): Promise<MetricasCapo | null> {
  try {
    const supabase = await clienteServidor();
    if (!supabase) return null;
    const { data, error } = await supabase.rpc("panel_capo");
    return error ? null : leerMetricasCapo(data);
  } catch {
    return null;
  }
}
