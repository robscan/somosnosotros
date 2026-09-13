/**
 * Configuración pública leída de variables de entorno.
 * Solo variables NEXT_PUBLIC_*: viajan al navegador, así que nunca van llaves secretas aquí.
 * Los valores viven en .env.local (desarrollo) y en Vercel (producción); nunca en git.
 */
export type Config = {
  mapboxToken: string | null;
  mapboxStyle: string;
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
};

export const ESTILO_CLARO_POR_DEFECTO = "mapbox://styles/mapbox/light-v11";

type Env = Record<string, string | undefined>;

function limpiar(valor: string | undefined): string | null {
  const v = valor?.trim();
  return v ? v : null;
}

export function leerConfig(env: Env): Config {
  return {
    mapboxToken: limpiar(env.NEXT_PUBLIC_MAPBOX_TOKEN),
    mapboxStyle: limpiar(env.NEXT_PUBLIC_MAPBOX_STYLE) ?? ESTILO_CLARO_POR_DEFECTO,
    supabaseUrl: limpiar(env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: limpiar(env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };
}

/**
 * Next.js solo sustituye process.env.NEXT_PUBLIC_* en el navegador cuando el nombre
 * aparece escrito completo, por eso cada variable se lee de forma literal aquí.
 */
export function configPublica(): Config {
  return leerConfig({
    NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
    NEXT_PUBLIC_MAPBOX_STYLE: process.env.NEXT_PUBLIC_MAPBOX_STYLE,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}
