import { configPublica } from "./config";

/** Ancho de columna y alto de tarjeta (docs/ops, OL-089); @2x en la URL le da el doble de píxeles para retina. */
export const ANCHO_MAPA_FICHA = 600;
export const ALTO_MAPA_FICHA = 170;

/** --primario; Mapbox pide el color del pin literal, sin "#". */
const COLOR_PIN = "0f6b7c";

/**
 * El estilo de la cuenta (FLOWYA_Light) se apoya en `mapbox://styles/mapbox/standard` mediante `imports`
 * (composición de Mapbox Standard), y la Static Images API no los resuelve: solo pinta lo que el estilo define
 * directo, así que el mapa saldría en blanco. Por eso la miniatura usa el estilo genérico claro de Mapbox — el
 * mapa interactivo (Mapa.tsx) sigue con el de la cuenta, que sí corre en el navegador con Mapbox GL JS.
 */
const ESTILO_MINIATURA = "mapbox/light-v11";

/**
 * La imagen estática de Mapbox (Static Images API) para el mapa de referencia de una ficha: un pin sobre el punto,
 * sin Mapbox GL ni JS, así el navegador la sirve de su caché. null sin token o sin punto (nunca se fabrica un mapa
 * sin coordenadas).
 */
export function urlMapaFicha(punto: { lat: number; lng: number } | null): string | null {
  if (!punto) return null;
  const { mapboxToken } = configPublica();
  if (!mapboxToken) return null;
  const pin = `pin-s+${COLOR_PIN}(${punto.lng},${punto.lat})`;
  return `https://api.mapbox.com/styles/v1/${ESTILO_MINIATURA}/static/${pin}/${punto.lng},${punto.lat},15,0/${ANCHO_MAPA_FICHA}x${ALTO_MAPA_FICHA}@2x?access_token=${mapboxToken}`;
}
