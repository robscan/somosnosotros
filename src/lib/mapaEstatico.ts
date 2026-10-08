import { configPublica } from "./config";

/**
 * Ancho de columna y el alto que le queda en la tarjeta «Dónde» de una ficha (docs/ops, OL-089; docs/rediseno/50, P6: 5:2, el mismo
 * del prototipo firmado); @2x en la URL le da el doble de píxeles para retina. `MapaFicha` toma de aquí también su proporción,
 * así la caja mide lo que la imagen y ni el CSS lleva un alto suelto.
 */
export const ANCHO_MAPA_FICHA = 600;
export const ALTO_MAPA_FICHA = 250;

/** --primario (violeta, OL-146); Mapbox pide el color del pin literal, sin "#". */
const COLOR_PIN = "6d34c8";

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

/** Cuántos pines se pintan como mucho: la dirección de la imagen tiene tope de largo, y más no se distinguen a ese tamaño. */
const TOPE_PINES = 25;

/** El aire alrededor de los pines al encuadrar varios (px de la imagen): que ninguno quede cortado contra el borde. */
const AIRE_PINES = 40;

/** La pista de ampliar de `MapaFicha` en la esquina de abajo a la derecha: 36 de círculo y 8 de separación del borde (px de pantalla). */
const PISTA_AMPLIAR = 44;
/** Lo que mide de ancho el mapa de la ficha en la pantalla más angosta, 320 (px de pantalla, medido en la bitácora 381): ahí la pista ocupa más imagen. */
const ANCHO_MAPA_MINIMO = 246;
/** Medio ancho del pin `pin-s` de la imagen (px de la imagen): el pin cuelga hacia arriba de su punto y se abre a los lados. */
const MEDIO_PIN = 10;
/**
 * El aire a la derecha (OL-350): la franja de la pista llevada a px de la imagen en la pantalla más angosta, más medio pin (44 × 600 / 246 → 108, + 10 =
 * 118). Con todos los puntos a la izquierda de esa franja, ningún pin cae bajo la pista a ningún ancho. Solo a la derecha y no abajo: la imagen tiene
 * 250 de alto y la pista ocuparía más de la mitad; a lo ancho sobran 600.
 */
const AIRE_DERECHA = Math.ceil((PISTA_AMPLIAR * ANCHO_MAPA_FICHA) / ANCHO_MAPA_MINIMO) + MEDIO_PIN;

/**
 * El mapa de las sedes de un festival (OL-339): un pin por sede y el encuadre que los abarca a todos (`auto` de la Static Images API), en la misma
 * imagen y proporción que el de un pin. Con uno solo, el de siempre (su pin va al centro, lejos de la pista de ampliar); null sin token o sin puntos.
 * A lo más `TOPE_PINES` (la dirección tiene tope). El aire va como en CSS (arriba, derecha, abajo, izquierda): más a la derecha, por la pista.
 */
export function urlMapaSedes(puntos: readonly { lat: number; lng: number }[]): string | null {
  if (puntos.length < 2) return urlMapaFicha(puntos[0] ?? null);
  const { mapboxToken } = configPublica();
  if (!mapboxToken) return null;
  const pines = puntos.slice(0, TOPE_PINES).map((p) => `pin-s+${COLOR_PIN}(${p.lng},${p.lat})`).join(",");
  return `https://api.mapbox.com/styles/v1/${ESTILO_MINIATURA}/static/${pines}/auto/${ANCHO_MAPA_FICHA}x${ALTO_MAPA_FICHA}@2x?padding=${AIRE_PINES},${AIRE_DERECHA},${AIRE_PINES},${AIRE_PINES}&access_token=${mapboxToken}`;
}
