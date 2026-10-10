import { QUES } from "./agendaPorClase";
import { CUANTOS, FILTROS_DE_URL } from "./agenda";
import { TIPOS_DE_ALTA } from "./armazon";
import { DISCIPLINAS } from "./artistas";
import { TIPOS } from "./lugares";

/**
 * Limpia la URL antes de enviarla a Vercel Analytics y a Google Analytics: UNA sola limpieza para las dos (OL-334, hallazgo F13 de OL-327;
 * antes Google reducía `/personas/<id>` y Vercel no).
 * - De la consulta (`?…`) solo se quedan los parámetros de una LISTA BLANCA corta e inocua (`OPCIONES_PUBLICAS`) Y solo con un valor de la
 *   lista cerrada de ese filtro: todo lo demás se quita —búsqueda, ciudad, el nombre que se escribió, la posición del mapa (`lat`, `lng`),
 *   ids (`lugar`, `artista`, `desde`), tokens—, también lo que se añada mañana (OL-325, F03 de OL-327: antes era una lista negra y dejaba
 *   pasar `lat` y `lng`) y también un valor libre en un parámetro permitido, como `?tipo=correo%40local.test` (OL-334: la lista blanca
 *   limitaba los nombres, no los valores).
 * - Toda ruta con el slug o el id de una ficha queda en su sección (OL-340; antes solo `/personas/<id>`, OL-334): `/lugares/<slug>…` →
 *   `/lugares`, y lo mismo `/eventos` (también editar y el cartel), `/artistas`, `/sitios`, `/personas`, `/obra` y la dirección corta
 *   `/e/<slug>`. Así no sale el slug de un lugar privado, de un evento oculto ni de un sitio con la dirección reservada: en el teléfono
 *   no se sabe si una ficha es privada sin preguntar, por eso la regla es la misma para todas.
 * - Evita rastrear rutas privadas: admin, perfil, ajustes y enlaces con token.
 * - Solo se envían rutas públicas sin identificación personal.
 * - Devuelve la URL ABSOLUTA (con esquema y dominio): Vercel Analytics rechaza URLs relativas.
 *
 * Vercel Analytics se configura con `beforeSend` en layout.tsx para usar esta función.
 */

/**
 * Los únicos parámetros que se conservan y, de cada uno, los únicos valores que se conservan: las listas cerradas de los filtros reales
 * (se importan de donde viven, no se copian). Ninguno lleva texto escrito, posición ni ids. `ciudad` no está (OL-111 ya la quitaba):
 * dice dónde está la persona. Añadir uno aquí es decidir que es inocuo. Un `Map`, no un objeto: así `constructor` o `__proto__` no
 * entran como nombre.
 */
const OPCIONES_PUBLICAS: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  // Lugares (`?tipo=museo`) y el tipo de alta (`/nuevo?tipo=artista`).
  ["tipo", new Set<string>([...TIPOS.map((t) => t.valor), ...TIPOS_DE_ALTA])],
  // Agenda: eventos, exposiciones, talleres, festivales. En /artistas `que` es una subcategoría escrita por la gente: no es de la lista y no sale.
  ["que", new Set<string>(QUES.map((q) => q.clave))],
  ["filtro", new Set<string>(FILTROS_DE_URL)],
  // Agenda: varias clases de costo juntas, separadas por coma (`?cuanto=gratis,cooperacion`); se valida cada una.
  ["cuanto", new Set<string>(CUANTOS.map((c) => c.clave))],
  // Artistas: la disciplina (`?hace=musica`).
  ["hace", new Set<string>(DISCIPLINAS.map((d) => d.valor))],
  ["disciplina", new Set<string>(DISCIPLINAS.map((d) => d.valor))],
]);

/** Los parámetros cuyo valor es una lista separada por comas. */
const PARAMETROS_CON_LISTA: ReadonlySet<string> = new Set(["cuanto"]);

/** El valor que se conserva de un parámetro, o null si no está en su lista cerrada (en una lista con comas, solo sus elementos válidos). */
function valorPublico(nombre: string, valor: string): string | null {
  const opciones = OPCIONES_PUBLICAS.get(nombre);
  if (!opciones) return null;
  if (PARAMETROS_CON_LISTA.has(nombre)) {
    const validos = valor.split(",").filter((v) => opciones.has(v));
    return validos.length > 0 ? validos.join(",") : null;
  }
  return opciones.has(valor) ? valor : null;
}

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
 * Las secciones cuyas rutas llevan detrás el slug o el id de una ficha (OL-340): todas las rutas dinámicas de `src/app` que no son privadas,
 * más la dirección corta del cartel, que resuelve el proxy. Para medir, la ruta queda en su sección sin importar lo que siga (editar, cartel,
 * letrero, novedades). Una prueba recorre `src/app` y falla si aparece una ruta dinámica que esta lista no cubra.
 */
const SECCIONES_CON_FICHA = [
  "lugares", // /lugares/<slug>, /editar
  "eventos", // /eventos/<slug>, /editar, /cartel, /calendario
  "artistas", // /artistas/<slug>, /editar, /letrero, /novedades/…
  "sitios", // /sitios/<slug> (OL-348)
  "personas", // /personas/<id> (OL-334)
  "obra", // /obra/<id>/mando, /obra/<id>/pared
  "e", // /e/<slug>, la dirección corta del cartel (OL-324)
  "api", // /api/cartel/<id>, /api/cartel-nuevo/<id>: no son páginas, misma regla
  "auth", // /auth/<proveedor>: tampoco son páginas
] as const;

/** Una sección de ficha al principio de la ruta, seguida de una barra (también codificada, `%2f`) o del final; sin distinguir mayúsculas. */
const RUTA_DE_FICHA = new RegExp(`^/+(${SECCIONES_CON_FICHA.join("|")})(?:/|%2f|$)`, "i");

/**
 * La ruta como se mide: la de una ficha, solo su sección y en minúsculas (`/Eventos/fiesta-mayor/cartel/` → `/eventos`); cualquier otra,
 * tal cual. Se mira decodificada, para que una barra o una letra codificadas (`/lugares%2Fcasa`, `/%6Cugares/casa`) no la esquiven; con
 * un «%» suelto no se puede decodificar y se mira tal cual (la barra codificada se reconoce igual).
 */
function rutaSinId(pathname: string): string {
  let ruta = pathname;
  try {
    ruta = decodeURIComponent(pathname);
  } catch {
    // un «%» suelto: se mira tal cual
  }
  const seccion = RUTA_DE_FICHA.exec(ruta)?.[1];
  return seccion ? `/${seccion.toLowerCase()}` : pathname;
}

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

    // 2. De la query string, solo la lista blanca y solo con un valor de su lista cerrada
    const limpios = new URLSearchParams();
    for (const [nombre, valor] of urlObj.searchParams) {
      const conservado = valorPublico(nombre, valor);
      if (conservado !== null) limpios.append(nombre, conservado);
    }

    // 3. Construir la URL limpia absoluta (conserva el origen real de la entrada); la ficha, solo su sección
    const consulta = limpios.toString();
    return urlObj.origin + rutaSinId(pathname) + (consulta ? `?${consulta}` : "");
  } catch {
    // Si algo falla en el parsing, no tracear por seguridad
    return null;
  }
}

/**
 * La página desde la que se hizo una acción medida (OL-325): la misma limpieza que las vistas (la ficha, solo su sección: un «Voy» en
 * `/eventos/<slug>` va con `/eventos`, OL-340); en una ruta privada (Entrar, Perfil…), en vez de no mandar nada —la acción sí se mide—
 * queda solo su primer tramo («/entrar», sin `?siguiente=`), cortado también en la barra codificada. Nunca null.
 */
export function limpiarUrlEvento(url: string): string {
  const limpia = limpiarUrlAnalitica(url);
  if (limpia !== null) return limpia;
  try {
    const u = url.startsWith("/") ? new URL(url, "https://somosnosotros.org") : new URL(url);
    const tramo = u.pathname.split(/\/|%2f/i)[1] ?? "";
    return `${u.origin}/${tramo}`;
  } catch {
    return "https://somosnosotros.org/";
  }
}

/** Una vista de página para Google Analytics (OL-325): la MISMA limpieza que Vercel (OL-334: una sola regla); null si no se manda. */
export function limpiarUrlGoogle(url: string): string | null {
  return limpiarUrlAnalitica(url);
}
