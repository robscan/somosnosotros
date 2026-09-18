import { corteNuevos, DIAS_NUEVOS } from "./agenda";

/**
 * Cuándo se miró la pestaña Nuevos por última vez. Vive en el propio teléfono, como `VistoHoy` (no en la base): el
 * filtro de la agenda ya corre aquí, así que no hace falta tocar el servidor ni tener cuenta — y hoy la mayoría entra
 * sin cuenta. No se reutiliza `novedades_vistas_en`, que es cuándo se abrió `/novedades`: pegarlas haría que abrir
 * Novedades vaciara esta pestaña. Decisión del founder del 2026-09-17, en docs/rediseno/23-nuevos-por-publicacion.md.
 */
const CLAVE = "somosnosotros:nuevos-visto";

function clave(ciudad?: string): string {
  return ciudad ? `${CLAVE}:${ciudad}` : CLAVE;
}

/** Lo guardado, o null si no hay, no se puede leer (modo privado) o no es una fecha. */
function leerMarca(ciudad?: string): string | null {
  try {
    const guardado = localStorage.getItem(clave(ciudad));
    return guardado && Number.isFinite(new Date(guardado).getTime()) ? guardado : null;
  } catch {
    return null;
  }
}

/** ¿Ya había mirado antes? Decide cuál de los dos textos del vacío se enseña. */
export function huboVisitaANuevos(ciudad?: string): boolean {
  return leerMarca(ciudad) !== null;
}

/**
 * Desde cuándo cuenta como nuevo en este teléfono. **Nunca devuelve nada vacío ni inválido**: sin marca, con la marca
 * rota, con el reloj mal puesto o sin poder leer nada, vale el tope de DIAS_NUEVOS, que es lo que la pestaña hacía
 * antes. De eso depende que la pantalla no pueda pintar un "Ya estás al día" falso ni acortar la lista a destiempo.
 */
export function leerCorteNuevos(ahora: Date = new Date(), ciudad?: string): number {
  return corteNuevos(leerMarca(ciudad), ahora, DIAS_NUEVOS);
}

/**
 * Deja constancia de que ya miró. Solo se llama al mirar la pestaña Nuevos, no al entrar a la agenda: si avanzara en
 * cada visita, quien entra dos veces al día vería "Ya estás al día" casi siempre y la pestaña no serviría de nada.
 * El corte que la pantalla está usando no se toca (se congela mientras esa pantalla vive), para que volver de la ficha
 * de un evento reponga la misma lista y no una vacía.
 *
 * `sello` es el instante de **la lista que se enseñó**, no el del toque: lo publicado después de que esa lista llegara
 * del servidor todavía no se ha visto, y marcarlo como visto lo dejaría fuera de Nuevos para siempre.
 */
export function marcarNuevosVisto(sello: Date = new Date(), ciudad?: string): void {
  try {
    if (!Number.isFinite(sello.getTime())) return;
    const anterior = leerMarca(ciudad);
    if (anterior && new Date(anterior).getTime() > sello.getTime() && new Date(anterior).getTime() <= Date.now()) return;
    localStorage.setItem(clave(ciudad), sello.toISOString());
  } catch {}
}
