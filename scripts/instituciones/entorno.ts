/** Lo común a los dos importadores: argumentos, variables de .env, el cliente con la llave de servicio y el informe. */
import { mkdirSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

export const CIUDAD = "San Luis Potosí";

export function requerida(valor: string | undefined, que: string, uso = ""): string {
  if (!valor) {
    console.error(`Falta ${que}.${uso ? `\nUso: ${uso}` : ""}`);
    process.exit(1);
  }
  return valor;
}

/** Uso: node scripts/instituciones/correr.mjs <script> <archivo.json> --autor <id del admin> [--simular] [--salida <carpeta>] */
export function preparar(script: string) {
  const args = process.argv.slice(2);
  const opcion = (nombre: string): string | undefined => {
    const k = args.indexOf(`--${nombre}`);
    return k >= 0 ? args[k + 1] : undefined;
  };
  const uso = `node scripts/instituciones/correr.mjs ${script} <archivo.json> --autor <id del admin> [--simular] [--salida <carpeta>]`;
  const url = requerida(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL en .env", uso);
  const llave = requerida(process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY en .env", uso);
  return {
    archivo: requerida(args[0]?.startsWith("--") ? undefined : args[0], "el archivo", uso),
    autor: requerida(opcion("autor"), "--autor", uso),
    salida: opcion("salida") ?? "scripts/instituciones/salida",
    simular: args.includes("--simular"),
    token: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
    db: createClient(url, llave, { auth: { persistSession: false, autoRefreshToken: false } }),
  };
}

/** Escribe el informe y, si no es simulación, los ids de lo que entró (para deshacer). Devuelve la ruta del informe. */
export function guardarInforme(salida: string, prefijo: string, lineas: string[], entraron: { id: string; nombre: string }[], simular: boolean): string {
  const sello = new Date().toISOString().replace(/[:.]/g, "-");
  mkdirSync(salida, { recursive: true });
  const ruta = `${salida}/${prefijo}-${simular ? "simulado-" : ""}${sello}.md`;
  writeFileSync(ruta, lineas.join("\n"));
  if (!simular) writeFileSync(`${salida}/${prefijo}-ids-${sello}.json`, JSON.stringify(entraron, null, 2));
  return ruta;
}
