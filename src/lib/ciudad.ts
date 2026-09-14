/**
 * Ciudades. La ciudad es un campo desde el día 1 (PLAN, Fase 5: segunda ciudad).
 * Para abrir otra ciudad basta agregarla aquí; el inicio acepta ?ciudad=<slug> y la cabecera ofrece cambiar.
 */
export type Ciudad = { slug: string; nombre: string; centro: { lng: number; lat: number }; zoom: number };

export const CIUDADES: readonly Ciudad[] = [
  /** Centro histórico (Plaza de Armas). Mapbox usa [longitud, latitud]. */
  { slug: "san-luis-potosi", nombre: "San Luis Potosí", centro: { lng: -100.9764, lat: 22.1497 }, zoom: 13 },
] as const;

export const CIUDAD_INICIAL: Ciudad = CIUDADES[0];

export function ciudadPorSlug(slug: string | null | undefined): Ciudad {
  return CIUDADES.find((c) => c.slug === slug) ?? CIUDAD_INICIAL;
}

export function ciudadPorNombre(nombre: string | null | undefined): Ciudad {
  return CIUDADES.find((c) => c.nombre === nombre) ?? CIUDAD_INICIAL;
}
