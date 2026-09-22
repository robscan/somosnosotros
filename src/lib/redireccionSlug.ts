/**
 * Dirección vieja (UUID) → dirección de hoy (slug) antes de que la página empiece a transmitir (OL-123).
 *
 * Las fichas de artistas, lugares y eventos ya redirigen con `permanentRedirect` desde el UUID viejo (OL-114,
 * OL-119), pero lo hacen dentro del componente, después de consultar la base: para entonces Next ya empezó a
 * transmitir el armazón (hay `loading.tsx`) y solo puede emitir un `<meta http-equiv="refresh">` con código 200.
 * Para la gente es instantáneo; para buscadores y `curl` no es una redirección. El proxy (`src/proxy.ts`) corre
 * antes de cualquier transmisión: reconoce la dirección con UUID con estas funciones puras, pregunta el slug con
 * una sola consulta y responde un 308 de verdad. Las direcciones nuevas (slug) no pasan por la consulta.
 */

export const TABLAS_CON_SLUG = ["artistas", "lugares", "eventos"] as const;
export type TablaConSlug = (typeof TABLAS_CON_SLUG)[number];

export type RutaConUuid = {
  tabla: TablaConSlug;
  /** El UUID tal como llegó (Postgres lo compara sin distinguir mayúsculas). */
  uuid: string;
  /** Lo que sigue al UUID (`/editar`, `/calendario`) o vacío: se conserva en el destino. */
  resto: string;
};

/**
 * UUID con su forma exacta (8-4-4-4-12 en hexadecimal). Más estricto que `esUuid` de `lib/formulario` (que solo
 * mira longitud y alfabeto) porque aquí decide una consulta extra por petición: un slug nunca tiene esta forma.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RUTA = /^\/(artistas|lugares|eventos)\/([^/]+)(\/.*)?$/;

export function esUuidExacto(v: string): boolean {
  return UUID.test(v);
}

/** `/eventos/<uuid>` (y `/eventos/<uuid>/editar`) → qué tabla y qué id; cualquier otra ruta → null. */
export function rutaConUuid(pathname: string): RutaConUuid | null {
  const m = RUTA.exec(pathname);
  if (!m) return null;
  const [, tabla, segmento, resto = ""] = m;
  if (!esUuidExacto(segmento)) return null;
  return { tabla: tabla as TablaConSlug, uuid: segmento, resto };
}

/**
 * El destino del 308: la misma ruta con el slug en lugar del UUID, el mismo tramo posterior y la misma query
 * (`search` tal como viene en la URL, con su `?`, o vacío). Devuelve solo la ruta: el proxy la vuelve absoluta
 * sobre el origen de la propia petición (producción, vista previa de Vercel o local).
 */
export function destinoConSlug(ruta: RutaConUuid, slug: string, search = ""): string {
  return `/${ruta.tabla}/${encodeURIComponent(slug)}${ruta.resto}${search}`;
}
