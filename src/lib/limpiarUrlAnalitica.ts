/**
 * Limpia la URL antes de enviarla a Vercel Analytics.
 * - Quita parámetros de consulta (query string): búsqueda, ciudad y tokens de invitación/reclamación.
 * - Evita rastrear rutas privadas: admin, perfil, ajustes y enlacescon token.
 * - Solo se envían rutas públicas sin identificación personal.
 *
 * Vercel Analytics se configura con `beforeSend` en layout.tsx para usar esta función.
 */

/**
 * Parámetros privados que llevan información del usuario o identificación.
 * Se quitan del `?` para no enviarlos a Vercel.
 */
const PARAMETROS_PRIVADOS = new Set(["q", "buscar", "ciudad", "token", "codigo"]);

/**
 * Prefijos de ruta que son privadas y no se tracean.
 * Regresar `null` hace que Vercel Analytics no envíe la vista.
 */
const RUTAS_PRIVADAS_PREFIJOS = [
  "/admin",    // Administración
  "/perfil",   // Perfil del usuario
  "/ajustes",  // Ajustes de la cuenta
  "/invitacion", // Invitaciones con código
  "/reclamar",   // Reclamaciones de fichas
  "/entrar",     // Entrada/autenticación
];

/**
 * @param url - La URL completa o relativa con pathname y search.
 * @returns URL limpia para Analytics, o `null` para no tracear.
 */
export function limpiarUrlAnalitica(url: string): string | null {
  try {
    // Parsear la URL (asumiendo que es relativa, ej: "/lugares?q=teatro&ciudad=SLP")
    const urlObj = url.startsWith("/") ? new URL(url, "https://somosnosotros.org") : new URL(url);
    const pathname = urlObj.pathname;

    // 1. Comprobar si la ruta es privada
    for (const prefijo of RUTAS_PRIVADAS_PREFIJOS) {
      if (pathname.startsWith(prefijo)) {
        return null; // No tracear esta ruta
      }
    }

    // 2. Limpiar parámetros privados de la query string
    const params = urlObj.searchParams;
    const keysToDelete = Array.from(params.keys()).filter((key) =>
      PARAMETROS_PRIVADOS.has(key)
    );
    keysToDelete.forEach((key) => params.delete(key));

    // 3. Construir la URL limpia (sin host, solo pathname + search)
    const cleaned = pathname + (params.toString() ? `?${params.toString()}` : "");
    return cleaned;
  } catch {
    // Si algo falla en el parsing, no tracear por seguridad
    return null;
  }
}
