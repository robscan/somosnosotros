/** Ciudad inicial. La ciudad es un campo desde el día 1 (PLAN, Fase 5: segunda ciudad). */
export const CIUDAD_INICIAL = {
  nombre: "San Luis Potosí",
  /** Centro histórico (Plaza de Armas). Mapbox usa [longitud, latitud]. */
  centro: { lng: -100.9764, lat: 22.1497 },
  zoom: 13,
} as const;
