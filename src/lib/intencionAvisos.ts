/**
 * La pregunta de avisos solo sale tras un toque (decisión 6 de docs/rediseno/17). La excepción es volver de Entrar tras
 * tocar Voy o Seguir sin sesión: ese toque se anota aquí y la ficha lo retoma al volver, una sola vez.
 * Vive en sessionStorage de la pestaña; sin él (modo privado), la pregunta sale en el siguiente Voy o Seguir.
 */
const CLAVE = "somosnosotros:avisos-tras-entrar";

export function anotarIntencion(ruta: string): void {
  try {
    sessionStorage.setItem(CLAVE, ruta);
  } catch {}
}

/** ¿Venía de tocar Voy o Seguir en esta ruta? Si sí, la borra: vale una vez. */
export function tomarIntencion(ruta: string): boolean {
  try {
    if (sessionStorage.getItem(CLAVE) !== ruta) return false;
    sessionStorage.removeItem(CLAVE);
    return true;
  } catch {
    return false;
  }
}
