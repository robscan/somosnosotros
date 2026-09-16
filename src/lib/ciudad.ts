/**
 * Ciudades. La ciudad es un campo desde el día 1 (PLAN, Fase 5). Decisión del founder (2026-09-16): no hay alta de
 * ciudad; la ciudad de cada lugar se deduce al registrarlo (Mapbox), las ciudades salen de los lugares que hay y
 * cualquiera puede registrar fuera de San Luis Potosí. La plataforma crece de forma orgánica.
 * San Luis Potosí es la inicial: existe aunque no tenga nada, y es a la que cae todo lo que no dice ciudad.
 */
export type Ciudad = { slug: string; nombre: string; centro: { lng: number; lat: number }; zoom: number };
/** Una ciudad con lo que tiene: cuántos lugares y cuántos eventos próximos. */
export type CiudadConDatos = Ciudad & { lugares: number; eventos: number };

/** Centro histórico (Plaza de Armas). Mapbox usa [longitud, latitud]. */
export const CIUDAD_INICIAL: Ciudad = { slug: "san-luis-potosi", nombre: "San Luis Potosí", centro: { lng: -100.9764, lat: 22.1497 }, zoom: 13 };
/** Las ciudades cuando no hay base a mano (pruebas, errores): solo la inicial. */
export const CIUDADES: readonly Ciudad[] = [CIUDAD_INICIAL] as const;

/** "San Luis Potosí" → "san-luis-potosi": sin acentos ni mayúsculas, guiones entre palabras. */
export function slugDeCiudad(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Municipios que para la gente son la misma ciudad (Mapbox los separa). Se compara por slug, así da igual cómo
 * venga escrito. Cuando la plataforma llegue a otra zona con área metropolitana, se agregan aquí.
 */
const MISMA_CIUDAD: Record<string, string> = {
  "soledad-de-graciano-sanchez": "San Luis Potosí",
};

/** El nombre de ciudad con el que se guarda: limpio y unificado con su área metropolitana. Vacío si no hay nada. */
export function ciudadCanonica(nombre: string | null | undefined): string {
  const limpio = (nombre ?? "").replace(/\s+/g, " ").trim();
  if (!limpio) return "";
  return MISMA_CIUDAD[slugDeCiudad(limpio)] ?? limpio;
}

/**
 * Arma la lista de ciudades a partir de lo que hay: cada lugar suma a su ciudad (el centro es el promedio de sus
 * lugares) y cada evento próximo también. La inicial va primero y siempre está; las demás, por número de lugares.
 */
export function armarCiudades(lugares: { ciudad: string; lat: number; lng: number }[], eventos: { ciudad: string }[]): CiudadConDatos[] {
  type Acum = { nombre: string; lugares: number; lat: number; lng: number; eventos: number };
  const inicial = CIUDAD_INICIAL.nombre;
  const acum = new Map<string, Acum>([[inicial, { nombre: inicial, lugares: 0, lat: 0, lng: 0, eventos: 0 }]]);
  const de = (ciudad: string) => {
    const nombre = ciudadCanonica(ciudad) || inicial;
    let a = acum.get(nombre);
    if (!a) {
      a = { nombre, lugares: 0, lat: 0, lng: 0, eventos: 0 };
      acum.set(nombre, a);
    }
    return a;
  };
  for (const l of lugares) {
    const a = de(l.ciudad);
    a.lugares++;
    a.lat += l.lat;
    a.lng += l.lng;
  }
  for (const e of eventos) de(e.ciudad).eventos++;
  return [...acum.values()]
    .map((a) => ({
      slug: slugDeCiudad(a.nombre),
      nombre: a.nombre,
      centro: a.nombre === inicial ? CIUDAD_INICIAL.centro : a.lugares ? { lat: a.lat / a.lugares, lng: a.lng / a.lugares } : CIUDAD_INICIAL.centro,
      zoom: a.nombre === inicial ? CIUDAD_INICIAL.zoom : 13,
      lugares: a.lugares,
      eventos: a.eventos,
    }))
    .sort((a, b) => (a.nombre === inicial ? -1 : b.nombre === inicial ? 1 : b.lugares - a.lugares || a.nombre.localeCompare(b.nombre, "es")));
}

export function ciudadPorSlug<T extends Ciudad>(slug: string | null | undefined, ciudades: readonly T[] = CIUDADES as readonly T[]): T {
  return ciudades.find((c) => c.slug === slug) ?? ciudades.find((c) => c.slug === CIUDAD_INICIAL.slug) ?? (CIUDAD_INICIAL as T);
}

export function ciudadPorNombre<T extends Ciudad>(nombre: string | null | undefined, ciudades: readonly T[] = CIUDADES as readonly T[]): T {
  const canon = ciudadCanonica(nombre);
  return ciudades.find((c) => c.nombre === canon) ?? ciudades.find((c) => c.slug === CIUDAD_INICIAL.slug) ?? (CIUDAD_INICIAL as T);
}
