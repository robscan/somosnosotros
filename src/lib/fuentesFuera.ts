/**
 * Las fuentes de «Buscar agendas y eventos» apagadas para una ciudad (OL-509, `ciudades.parametros.fuentes_fuera`; el JSON y su uso, en
 * `ciudadParametros.ts`). Sin imports: lo leen la rutina (`ciudadParametros.ts`) y la hoja de la administración (`ciudadesAdmin.ts`, también en
 * el navegador) sin cruzar sus dependencias.
 */
const MAX_FUENTES_FUERA = 10;
/** Una clave de fuente: minúsculas y guiones («universidades-museos»). */
const CLAVE_FUENTE = /^[a-z][a-z-]{1,39}$/;

/** Las claves de fuentes apagadas, limpias y sin repetir: lo que no es una clave se ignora. */
export function leerFuentesFuera(v: unknown): string[] {
  const lista = Array.isArray(v) ? v : [];
  return [...new Set(lista.map((x) => (typeof x === "string" ? x.trim().toLowerCase() : "")).filter((x) => CLAVE_FUENTE.test(x)))].slice(0, MAX_FUENTES_FUERA);
}
