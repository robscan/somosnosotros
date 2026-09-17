/**
 * Ciudades. La ciudad es un campo desde el día 1 (PLAN, Fase 5). Decisión del founder (2026-09-16): no hay alta de
 * ciudad; la ciudad de cada lugar se deduce al registrarlo (Mapbox), las ciudades salen de los lugares que hay y
 * cualquiera puede registrar fuera de San Luis Potosí. La plataforma crece de forma orgánica.
 * San Luis Potosí es la inicial: existe aunque no tenga nada, y es a la que cae todo lo que no dice ciudad.
 */
import { ZONA_INICIAL } from "./fechas";

export type Ciudad = { slug: string; nombre: string; centro: { lng: number; lat: number }; zoom: number };
/** Una ciudad con lo que tiene: cuántos lugares y cuántos eventos próximos, y su zona horaria (la de "hoy" en su agenda). */
export type CiudadConDatos = Ciudad & { lugares: number; eventos: number; zona: string };
/** Una ciudad de Artistas con cuántos artistas tiene. */
export type CiudadConArtistas = Ciudad & { artistas: number };

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
 * La zona de la ciudad es la que más se repite entre sus lugares y eventos (la inicial, si no hay ninguno).
 */
export function armarCiudades(lugares: { ciudad: string; lat: number; lng: number; zona?: string }[], eventos: { ciudad: string; zona?: string }[]): CiudadConDatos[] {
  type Acum = { nombre: string; lugares: number; lat: number; lng: number; eventos: number; zonas: Map<string, number> };
  const inicial = CIUDAD_INICIAL.nombre;
  const acum = new Map<string, Acum>([[inicial, { nombre: inicial, lugares: 0, lat: 0, lng: 0, eventos: 0, zonas: new Map() }]]);
  const de = (ciudad: string) => {
    const nombre = ciudadCanonica(ciudad) || inicial;
    let a = acum.get(nombre);
    if (!a) {
      a = { nombre, lugares: 0, lat: 0, lng: 0, eventos: 0, zonas: new Map() };
      acum.set(nombre, a);
    }
    return a;
  };
  const contarZona = (a: Acum, zona: string | undefined) => {
    if (zona) a.zonas.set(zona, (a.zonas.get(zona) ?? 0) + 1);
  };
  for (const l of lugares) {
    const a = de(l.ciudad);
    a.lugares++;
    a.lat += l.lat;
    a.lng += l.lng;
    contarZona(a, l.zona);
  }
  for (const e of eventos) {
    const a = de(e.ciudad);
    a.eventos++;
    contarZona(a, e.zona);
  }
  return [...acum.values()]
    .map((a) => ({
      slug: slugDeCiudad(a.nombre),
      nombre: a.nombre,
      centro: a.nombre === inicial ? CIUDAD_INICIAL.centro : a.lugares ? { lat: a.lat / a.lugares, lng: a.lng / a.lugares } : CIUDAD_INICIAL.centro,
      zoom: a.nombre === inicial ? CIUDAD_INICIAL.zoom : 13,
      lugares: a.lugares,
      eventos: a.eventos,
      zona: [...a.zonas].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))[0]?.[0] ?? ZONA_INICIAL,
    }))
    .sort((a, b) => (a.nombre === inicial ? -1 : b.nombre === inicial ? 1 : b.lugares - a.lugares || a.nombre.localeCompare(b.nombre, "es")));
}

/**
 * Las ciudades de Artistas salen de los artistas que hay, como las de Lugares salen de los lugares (pedido del founder,
 * 2026-09-16, noche): cada artista suma a su ciudad. La inicial va primero y siempre está; las demás, por número de artistas.
 * Sin mapa en Artistas, el centro de las demás es el de la inicial (solo acerca la búsqueda de ciudades del alta).
 */
export function armarCiudadesDeArtistas(artistas: { ciudad: string }[]): CiudadConArtistas[] {
  const inicial = CIUDAD_INICIAL.nombre;
  const cuenta = new Map<string, number>([[inicial, 0]]);
  for (const a of artistas) {
    const nombre = ciudadCanonica(a.ciudad) || inicial;
    cuenta.set(nombre, (cuenta.get(nombre) ?? 0) + 1);
  }
  return [...cuenta]
    .map(([nombre, n]) => ({ ...CIUDAD_INICIAL, slug: slugDeCiudad(nombre), nombre, zoom: nombre === inicial ? CIUDAD_INICIAL.zoom : 13, artistas: n }))
    .sort((a, b) => (a.nombre === inicial ? -1 : b.nombre === inicial ? 1 : b.artistas - a.artistas || a.nombre.localeCompare(b.nombre, "es")));
}

export function ciudadPorSlug<T extends Ciudad>(slug: string | null | undefined, ciudades: readonly T[] = CIUDADES as readonly T[]): T {
  return ciudades.find((c) => c.slug === slug) ?? ciudades.find((c) => c.slug === CIUDAD_INICIAL.slug) ?? (CIUDAD_INICIAL as T);
}

export function ciudadPorNombre<T extends Ciudad>(nombre: string | null | undefined, ciudades: readonly T[] = CIUDADES as readonly T[]): T {
  const canon = ciudadCanonica(nombre);
  return ciudades.find((c) => c.nombre === canon) ?? ciudades.find((c) => c.slug === CIUDAD_INICIAL.slug) ?? (CIUDAD_INICIAL as T);
}

/**
 * La raíz de una sección (/, /lugares, /artistas) con la ciudad que se está viendo y nada más (OL-055): tocar la
 * sección en la que ya se está, o el logotipo en el inicio, suelta los filtros pero no la ciudad.
 */
export function raizConCiudad(raiz: string, consulta: string): string {
  const ciudad = new URLSearchParams(consulta).get("ciudad");
  return ciudad ? `${raiz}?ciudad=${encodeURIComponent(ciudad)}` : raiz;
}
