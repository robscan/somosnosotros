import type { Config } from "./config";

/** Resultado de /api/estado: dice qué está configurado, nunca muestra valores. */
export type Estado = {
  mapbox: "configurado" | "falta";
  supabase: "ok" | "falta" | "error";
  detalle?: string;
};

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export async function calcularEstado(config: Config, fetchFn: FetchFn = fetch): Promise<Estado> {
  const mapbox: Estado["mapbox"] = config.mapboxToken ? "configurado" : "falta";

  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    return { mapbox, supabase: "falta" };
  }

  try {
    const url = `${config.supabaseUrl.replace(/\/$/, "")}/auth/v1/health`;
    const res = await fetchFn(url, {
      headers: { apikey: config.supabaseAnonKey },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (res.ok) return { mapbox, supabase: "ok" };
    return { mapbox, supabase: "error", detalle: `Supabase respondió ${res.status}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { mapbox, supabase: "error", detalle: msg };
  }
}
