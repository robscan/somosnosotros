/**
 * Qué entra al mapa del sitio (`src/app/sitemap.ts`) y qué queda fuera del índice (`src/app/robots.ts`): reglas puras,
 * sin tocar la base, para poder probarlas (gestión de cambios, OL-059, bitácora 088). Las consultas que traen las
 * filas usan siempre el cliente público (RLS), nunca la llave de servicio — las mismas filas que ve una persona sin
 * cuenta; el filtro de aquí es una segunda guarda, no la única.
 */

export const ORIGEN = "https://somosnosotros.org";

/** Páginas fijas, sin ficha: no hace falta traerlas de la base. */
export const RUTAS_ESTATICAS = ["/", "/lugares", "/artistas", "/reglas", "/privacidad"] as const;

/** `lastModified` solo en fichas (viene de `actualizado_en`, un dato real); una ruta fija no tiene una fecha propia que
 *  decir, y poner "ahora" en cada visita mentiría (cambiaría en cada rastreo aunque la página no haya cambiado). */
export type EntradaSitemap = { url: string; lastModified?: string };

export type FilaLugarSitemap = { id: string; visible: boolean; privado: boolean; actualizado_en: string };
export type FilaEventoSitemap = { id: string; visible: boolean; termina: string; actualizado_en: string };
export type FilaArtistaSitemap = { id: string; visible: boolean; origen: string | null; actualizado_en: string };

/**
 * Los artistas traídos del CAPO que no han reclamado su ficha SÍ entran al mapa del sitio y al índice de Google.
 * Decisión del founder (2026-09-17, en el chat): «si entran todos los contenidos del sitio» — ya es información
 * pública del Catálogo de Artistas Potosinos, y el aviso de privacidad lo explica (OL-066, bitácora 097; cierra la
 * pregunta que había quedado pendiente en OL-018 y OL-059).
 */
export const CAPO_SIN_RECLAMAR_EN_SITEMAP = true;

export function rutasEstaticas(): EntradaSitemap[] {
  return RUTAS_ESTATICAS.map((ruta) => ({ url: `${ORIGEN}${ruta}` }));
}

/** Lugares visibles y públicos: uno "Solo tú lo ves" (privado) no es un lugar que Google deba ofrecer. */
export function lugaresParaSitemap(filas: FilaLugarSitemap[]): EntradaSitemap[] {
  return filas.filter((l) => l.visible && !l.privado).map((l) => ({ url: `${ORIGEN}/lugares/${l.id}`, lastModified: l.actualizado_en }));
}

/** Eventos visibles que no hayan terminado ya (misma regla que la agenda: `termina`, columna de la base). */
export function eventosParaSitemap(filas: FilaEventoSitemap[], ahora: Date = new Date()): EntradaSitemap[] {
  return filas.filter((e) => e.visible && new Date(e.termina).getTime() >= ahora.getTime()).map((e) => ({ url: `${ORIGEN}/eventos/${e.id}`, lastModified: e.actualizado_en }));
}

/**
 * Artistas visibles. `reclamado`: existe una fila en `artistas_cuentas` para ese artista (lectura pública, no hace
 * falta sesión). Los del CAPO sin reclamar siguen el interruptor de arriba.
 */
export function artistasParaSitemap(filas: (FilaArtistaSitemap & { reclamado: boolean })[]): EntradaSitemap[] {
  return filas
    .filter((a) => a.visible && (a.origen !== "capo" || a.reclamado || CAPO_SIN_RECLAMAR_EN_SITEMAP))
    .map((a) => ({ url: `${ORIGEN}/artistas/${a.id}`, lastModified: a.actualizado_en }));
}
