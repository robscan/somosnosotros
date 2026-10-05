import type { NextConfig } from "next";

// El mismo Storage público que H05. No se amplía a dominios externos, URLs
// firmadas ni otros buckets. Cambiar de proyecto exige revisar ambas fronteras.
export const HOST_FOTOS = "viesoxgrfvftkgpjbnml.supabase.co";
export const RUTA_FOTOS = "/storage/v1/object/public/fotos/";

export const CONFIG_IMAGENES = {
  remotePatterns: [{ protocol: "https", hostname: HOST_FOTOS, port: "", pathname: `${RUTA_FOTOS}**`, search: "" }],
  deviceSizes: [384, 768, 1280, 1920],
  imageSizes: [96, 192],
  qualities: [75],
  formats: ["image/webp"],
  minimumCacheTTL: 30 * 24 * 60 * 60,
  maximumRedirects: 0,
  maximumResponseBody: 5 * 1024 * 1024,
  dangerouslyAllowLocalIP: false,
  dangerouslyAllowSVG: false,
} satisfies NextConfig["images"];

/** Elegibilidad de presentación, no permiso de escritura (ese sigue en H05).
 * Lo histórico/externo, SVG, blob y previews conservan su URL directa.
 * Se excluyen queries: ni tokens ni parámetros arbitrarios generan variantes.
 */
export function optimizable(src: string): boolean {
  const prefijo = `https://${HOST_FOTOS}${RUTA_FOTOS}`;
  if (!src.startsWith(prefijo) || /[^\x21-\x7e]|[\\?#]/.test(src)) return false;
  const ruta = src.slice(prefijo.length);
  if (/(^|\/)(?:\.|%2e){1,2}(\/|$)|%(?:2f|5c|25)/i.test(ruta)) return false;
  return /\.(?:jpe?g|png|webp|avif)$/i.test(ruta);
}

/** Fondo decorativo de la barra compacta: una variante fija, nunca el original.
 * Coincide con la ruta del loader de Next; el servidor valida destino/tamaño.
 */
export function fondoImagen(src: string): string {
  return optimizable(src) ? `/_next/image?url=${encodeURIComponent(src)}&w=384&q=75` : src;
}

/** Cajas vigentes del canon; sizes no modifica el CSS. */
export function tamanoImagenCarril(forma: "grande" | "mediana" | "chica" | "sola"): string {
  switch (forma) {
    case "grande": return "(min-width: 1048px) 190px, 165px";
    case "mediana": return "220px";
    case "chica": return "104px";
    case "sola": return "(min-width: 1048px) 960px, (min-width: 640px) 600px, calc(100vw - 40px)";
  }
}
