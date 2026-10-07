/**
 * Limpia la URL antes de enviarla a Vercel Analytics.
 * - De la consulta (`?…`) solo se quedan los parámetros de una LISTA BLANCA corta e inocua (`PARAMETROS_PUBLICOS`): todo lo demás se
 *   quita —búsqueda, ciudad, el nombre que se escribió, la posición del mapa (`lat`, `lng`), ids (`lugar`, `artista`, `desde`), tokens—,
 *   también lo que se añada mañana (OL-325, hallazgo F03 de OL-327: antes era una lista negra y dejaba pasar `lat` y `lng`).
 * - Evita rastrear rutas privadas: admin, perfil, ajustes y enlacescon token.
 * - Solo se envían rutas públicas sin identificación personal.
 * - Devuelve la URL ABSOLUTA (con esquema y dominio): Vercel Analytics rechaza URLs relativas.
 *
 * Vercel Analytics se configura con `beforeSend` en layout.tsx para usar esta función.
 */

/**
 * Los únicos parámetros que se conservan: filtros de las listas con opciones fijas (tipo de lugar, qué, filtro y costo de la agenda,
 * disciplina de artistas). Ninguno lleva texto escrito, posición ni ids. `ciudad` no está (OL-111 ya la quitaba): dice dónde está la
 * persona. Añadir uno aquí es decidir que es inocuo.
 */
const PARAMETROS_PUBLICOS = new Set(["tipo", "que", "filtro", "cuanto", "hace", "disciplina"]);

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
 * @returns URL absoluta limpia para Analytics, o `null` para no tracear.
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

    // 2. De la query string, solo la lista blanca
    const params = urlObj.searchParams;
    const keysToDelete = Array.from(new Set(params.keys())).filter((key) => !PARAMETROS_PUBLICOS.has(key));
    keysToDelete.forEach((key) => params.delete(key));

    // 3. Construir la URL limpia absoluta (conserva el origen real de la entrada)
    const cleaned = urlObj.origin + pathname + (params.toString() ? `?${params.toString()}` : "");
    return cleaned;
  } catch {
    // Si algo falla en el parsing, no tracear por seguridad
    return null;
  }
}

/**
 * La ruta de una persona (`/personas/<id>`) lleva su id: para Google Analytics y para los eventos queda solo «/personas» (OL-325; la
 * lista cerrada no deja mandar ids de personas). Las vistas de Vercel siguen como las dejó OL-111.
 */
function sinIdDePersona(url: string): string {
  try {
    const u = new URL(url);
    if (u.pathname.startsWith("/personas/")) return `${u.origin}/personas`;
    return url;
  } catch {
    return url;
  }
}

/**
 * La página desde la que se hizo una acción medida (OL-325): la misma limpieza que las vistas; en una ruta privada (Entrar, Perfil…),
 * en vez de no mandar nada —la acción sí se mide— queda solo su primer tramo («/entrar», sin `?siguiente=`). Nunca null.
 */
export function limpiarUrlEvento(url: string): string {
  const limpia = limpiarUrlAnalitica(url);
  if (limpia !== null) return sinIdDePersona(limpia);
  try {
    const u = url.startsWith("/") ? new URL(url, "https://somosnosotros.org") : new URL(url);
    const tramo = u.pathname.split("/")[1] ?? "";
    return `${u.origin}/${tramo}`;
  } catch {
    return "https://somosnosotros.org/";
  }
}

/** Una vista de página para Google Analytics (OL-325): la limpieza de Vercel, sin el id de las personas; null si no se manda. */
export function limpiarUrlGoogle(url: string): string | null {
  const limpia = limpiarUrlAnalitica(url);
  return limpia === null ? null : sinIdDePersona(limpia);
}
