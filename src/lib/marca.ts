/**
 * El nombre que lee la gente, en un solo sitio (OL-435, bitácora 468). Founder, 2026-10-21: «Necesito que ya
 * estandaricemos ese texto y que sea Somos Nosotrxs»; antes, doc 57 § D: «amigxs y Somos Nosotrxs en toda la app».
 *
 * Constantes, nunca variables de entorno: la marca no cambia por entorno (docs/investigaciones/valores-fijos-respuesta.md).
 * Lo que NO sigue a este nombre: el dominio `somosnosotros.org`, el logotipo SMSNSTRS, el símbolo SN, los slugs, las
 * claves guardadas en el teléfono (`somosnosotros:…`, la cookie `sn_entrar`), el UID del calendario y los identificadores
 * de las apps (`org.somosnosotros.app`). Cambiarlos borraría lo guardado o rompería enlaces y compilaciones.
 *
 * `src/lib/marca.test.ts` recorre `src/`, `public/`, `apps/` y `scripts/` y falla si la grafía anterior vuelve a aparecer.
 */

/** «Somos Nosotrxs»: título de la pestaña, nombre de la app instalada, vista previa de los enlaces, correos y avisos. */
export const MARCA = "Somos Nosotrxs";

/**
 * La grafía de antes. Solo para el `alternateName` del JSON-LD (doc 57 § D), para que Google relacione los dos nombres
 * mientras reindexa: nunca en texto que la gente lea.
 */
export const MARCA_ANTERIOR = "Somos Nosotros";

/** Entre las partes del título de una página y antes de la marca: «Lugares · Somos Nosotrxs». */
export const SEPARADOR_TITULO = " · ";

/** Lo que cierra el título de cada página (" · Somos Nosotrxs"); la app instalada lo quita (`tituloInstalada`). */
export const SUFIJO_TITULO = `${SEPARADOR_TITULO}${MARCA}`;

/**
 * El título de una página: sus partes de la más concreta a la más general, y la marca al final.
 * `tituloDePagina("Grafo cultural", "Administración")` → «Grafo cultural · Administración · Somos Nosotrxs».
 * Sin partes, solo la marca.
 */
export function tituloDePagina(...partes: string[]): string {
  return [...partes, MARCA].join(SEPARADOR_TITULO);
}

/** El buzón que manda los avisos: es del dominio, que no cambia. */
export const DIRECCION_AVISOS = "avisos@somosnosotros.org";

/**
 * El remitente de los correos (la app en `lib/correo.ts` y los envíos desde la Mac en `scripts/lib/correo-envio.ts`).
 * De `CORREO_REMITENTE` se toma solo la dirección («nombre <buzon@dominio>» o «buzon@dominio»): el nombre que ve la
 * gente es siempre la marca, aunque la variable de Vercel siga con la grafía de antes. Sin variable o sin dirección
 * reconocible, `avisos@somosnosotros.org`.
 */
export function remitenteCorreo(variable?: string | null): string {
  const texto = variable?.trim() ?? "";
  const direccion = texto.match(/<([^<>\s]+@[^<>\s]+)>\s*$/)?.[1] ?? texto.match(/^[^<>\s]+@[^<>\s]+$/)?.[0];
  return `${MARCA} <${direccion ?? DIRECCION_AVISOS}>`;
}
