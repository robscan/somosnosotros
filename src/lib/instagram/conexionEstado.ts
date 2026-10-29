/**
 * Lo que dice el bloque «Conexión» de Administración › Instagram (OL-471, bitácora 503) y las frases de la vuelta del inicio de sesión de Meta.
 * Sin nada del servidor: lo usan la página (que arma el estado) y el componente del bloque (que dice las frases). El token nunca pasa por aquí.
 */

/** Lo que se pide al conectar (el diálogo de Meta, `scope`). */
export const PERMISOS_PEDIDOS = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
  "instagram_manage_insights",
  "business_management",
] as const;

/** Sin estos no se publica en Instagram: si faltan, la conexión no se guarda (seguiría mandando el token de respaldo). */
export const PERMISOS_PARA_PUBLICAR = ["pages_show_list", "pages_read_engagement", "instagram_basic", "instagram_content_publish"] as const;
/** El espejo en la página de Facebook (OL-461). */
export const PERMISO_FACEBOOK = "pages_manage_posts";
/** Leer cuentas ajenas con Business Discovery (docs/investigaciones/vigilancia-instagram-lugares.md §3). */
export const PERMISO_LEER = "instagram_manage_insights";

/** Cómo terminó la vuelta: `conectado` o la clave de su error (va en la dirección, `?error=<clave>`; nunca un detalle técnico). */
export type ClaveVuelta = "conectado" | "cancelado" | "estado" | "origen" | "config" | "meta" | "permisos" | "pagina" | "instagram" | "guardar";
export type ClaveErrorConexion = Exclude<ClaveVuelta, "conectado">;

/** La frase llana de cada error de la vuelta. */
export const FRASES_CONEXION: Record<ClaveErrorConexion, string> = {
  cancelado: "No se conectó: se canceló en Facebook.",
  estado: "El enlace para conectar caducó. Vuelve a tocar «Conectar Instagram».",
  origen: "Conectar Instagram solo funciona en somosnosotros.org.",
  config: "Falta configurar la conexión con Meta en el servidor.",
  meta: "Facebook no respondió. Vuelve a intentarlo en un momento.",
  permisos: "Faltaron permisos para publicar. Vuelve a conectar y acéptalos todos.",
  pagina: "La cuenta que entró no administra la página Somos Nosotrxs.",
  instagram: "La página Somos Nosotrxs no tiene ligada la cuenta de Instagram de la app.",
  guardar: "No se pudo guardar la conexión. Vuelve a intentarlo.",
};

export const CONFIRMACION_CONEXION = "Instagram quedó conectado";

export function claveDeVuelta(texto: string | null | undefined): ClaveVuelta | null {
  if (!texto) return null;
  return texto === "conectado" || Object.hasOwn(FRASES_CONEXION, texto) ? (texto as ClaveVuelta) : null;
}

/** La fila de `instagram_conexion` que lee la administración (sin token). */
export type FilaConexion = { pagina_nombre: string; instagram_usuario: string | null; permisos: string[]; conectado_en: string };

export type EstadoConexion = {
  /** El renglón: qué cuenta (o que no hay conexión propia) y, debajo, qué puede y desde cuándo, o qué falta. */
  titulo: string;
  detalle: string;
  /** Falta algo que pide reconectar: el detalle va en el color de error. */
  falta: boolean;
  boton: "Conectar Instagram" | "Reconectar";
};

const FECHA = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", timeZone: "America/Mexico_City" });
const ANIO = new Intl.DateTimeFormat("es-MX", { year: "numeric", timeZone: "America/Mexico_City" });

/** «28 de octubre» (con el año si no es el de ahora). */
export function fechaConexion(cuando: Date, ahora: Date): string {
  const dia = FECHA.format(cuando);
  return ANIO.format(cuando) === ANIO.format(ahora) ? dia : `${dia} de ${ANIO.format(cuando)}`;
}

/**
 * El estado llano de la conexión: «Conectada como Somos Nosotrxs (@smsnstrsapp)» con «Publica y lee cuentas · desde el 28 de octubre», «Sin
 * conexión propia» con «Usa el token de respaldo», o lo que falta («Falta el permiso para leer cuentas: reconecta»).
 */
export function estadoConexion(fila: FilaConexion | null, hayRespaldo: boolean, ahora: Date): EstadoConexion {
  if (!fila) {
    return hayRespaldo
      ? { titulo: "Sin conexión propia", detalle: "Usa el token de respaldo", falta: false, boton: "Conectar Instagram" }
      : { titulo: "Sin conexión", detalle: "Conecta Instagram para publicar", falta: true, boton: "Conectar Instagram" };
  }
  const titulo = `Conectada como ${fila.pagina_nombre}${fila.instagram_usuario ? ` (@${fila.instagram_usuario})` : ""}`;
  const tiene = new Set(fila.permisos);
  if (PERMISOS_PARA_PUBLICAR.some((p) => !tiene.has(p))) return { titulo, detalle: "Faltan permisos para publicar: reconecta", falta: true, boton: "Reconectar" };
  if (!tiene.has(PERMISO_LEER)) return { titulo, detalle: "Falta el permiso para leer cuentas: reconecta", falta: true, boton: "Reconectar" };
  const cuando = new Date(fila.conectado_en);
  const desde = Number.isNaN(cuando.getTime()) ? "" : ` · desde el ${fechaConexion(cuando, ahora)}`;
  const publica = tiene.has(PERMISO_FACEBOOK) ? "Publica" : "Publica solo en Instagram";
  return { titulo, detalle: `${publica} y lee cuentas${desde}`, falta: false, boton: "Reconectar" };
}
