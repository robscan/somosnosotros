/**
 * Lo que dice el bloque «Conexión» de Administración › Instagram (OL-471, bitácora 503) y las frases de la vuelta del inicio de sesión de Meta.
 * Sin nada del servidor: lo usan la página (que arma el estado) y el componente del bloque (que dice las frases). El token nunca pasa por aquí.
 * OL-495 (bitácora 527): el bloque es ahora un botón con el icono de Instagram y un punto (verde, gris o rojo) a la derecha de las pestañas, con
 * su hoja; el renglón suelto solo se queda a la vista si falta algo o caducó. «Caducó» se deduce de la cola (`caducoEn`), y la portada importa
 * `conexionPendiente` y `leerConexion` sin pasar por la pantalla.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { diaConMes } from "../fechas";

/**
 * Lo que se pide al conectar (el diálogo de Meta, `scope`). OL-484 (bitácora 516): `business_management` se conserva por precaución, aunque
 * ninguna llamada del código usa la API de negocios: la app de Meta vive en un portafolio de negocio y la página muy probablemente llega por
 * ahí, y sin él `/me/accounts` podría no listarla. Se puede quitar cuando la conexión lleve una semana funcionando.
 */
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

/**
 * OL-495: el último trabajo de Instagram que terminó en la cola (`redes_trabajos`, red `instagram`, publicado o fallido). La cola guarda la clave
 * del error, no el código de Meta: `permiso` es el 190 (token vencido o revocado), el 102, el 10 o un 2xx de la Graph API (`lib/instagram/api.ts`).
 */
export type UltimoTrabajo = { estado: string; error: string | null; terminado_en: string | null };

/** El punto del botón de la conexión: verde (conectada), gris (sin conexión) o rojo (caducó o le faltan permisos: hay que reconectar). */
export type PuntoConexion = "ok" | "no" | "mal";

export type EstadoConexion = {
  /** El renglón: qué cuenta (o que no hay conexión propia) y, debajo, qué puede y desde cuándo, o qué falta. */
  titulo: string;
  detalle: string;
  /** Falta algo que pide reconectar (o conectar): el detalle va en el color de error y el renglón se queda a la vista. */
  falta: boolean;
  boton: "Conectar Instagram" | "Reconectar";
  /** OL-495: el botón con el icono de Instagram a la derecha de las pestañas. */
  punto: PuntoConexion;
  /** El nombre del botón para quien no ve la pantalla («Instagram conectado como @smsnstrsapp»). */
  etiqueta: string;
  /** La hoja «Conexión con Instagram»: la cuenta, desde cuándo o qué pasó, lo que puede, una nota y si «Reconectar» es el botón principal. */
  hoja: { cuenta: string; detalle: string; puede: string[]; nota: string; principal: boolean };
};

const FECHA = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", timeZone: "America/Mexico_City" });
const ANIO = new Intl.DateTimeFormat("es-MX", { year: "numeric", timeZone: "America/Mexico_City" });

/** «28 de octubre» (con el año si no es el de ahora). */
export function fechaConexion(cuando: Date, ahora: Date): string {
  const dia = FECHA.format(cuando);
  return ANIO.format(cuando) === ANIO.format(ahora) ? dia : `${dia} de ${ANIO.format(cuando)}`;
}


/**
 * OL-495: «caducó». Si el último trabajo de Instagram que terminó falló por permiso o token (`error = 'permiso'`) después de conectar, la conexión
 * dejó de servir aunque su fila siga ahí: devuelve cuándo falló. Null si no (el último salió bien, falló por otra cosa o fue antes de reconectar).
 * Sin fila (con la llave de respaldo del servidor) cuenta cualquier trabajo. Pura: la usan la pantalla de Instagram y la portada (OL-494).
 */
export function caducoEn(fila: Pick<FilaConexion, "conectado_en"> | null, ultimo: UltimoTrabajo | null): Date | null {
  if (!ultimo || ultimo.estado !== "fallido" || ultimo.error !== "permiso" || !ultimo.terminado_en) return null;
  const cuando = new Date(ultimo.terminado_en);
  if (Number.isNaN(cuando.getTime())) return null;
  const conectada = fila ? new Date(fila.conectado_en).getTime() : Number.NaN;
  return Number.isNaN(conectada) || cuando.getTime() > conectada ? cuando : null;
}

const NOTA_CONECTAR = "Entra con la cuenta de Facebook que administra la página Somos Nosotrxs y acepta todos los permisos.";

/**
 * El estado llano de la conexión: «Conectada como Somos Nosotrxs (@smsnstrsapp)» con «Publica y lee cuentas · desde el 28 de octubre», «Sin
 * conexión propia» con «Publica con la llave de respaldo», lo que falta («Falta el permiso para leer cuentas: reconecta») u, OL-495, que caducó
 * («Instagram dejó de publicar» · «La conexión caducó el lun 5 de oct: reconecta»), con su punto, el nombre del botón y lo que dice la hoja.
 */
export function estadoConexion(fila: FilaConexion | null, hayRespaldo: boolean, ahora: Date, ultimo: UltimoTrabajo | null = null): EstadoConexion {
  const caduco = fila || hayRespaldo ? caducoEn(fila, ultimo) : null;
  const cuenta = fila ? (fila.instagram_usuario ? `@${fila.instagram_usuario}` : fila.pagina_nombre) : "Sin conexión propia";
  if (caduco) {
    return {
      titulo: "Instagram dejó de publicar",
      detalle: `La conexión caducó el ${diaConMes(caduco.toISOString(), ahora)}: reconecta`,
      falta: true,
      boton: "Reconectar",
      punto: "mal",
      etiqueta: "La conexión con Instagram caducó",
      hoja: {
        cuenta,
        detalle: `Dejó de publicar el ${diaConMes(caduco.toISOString(), ahora)}: la conexión caducó`,
        puede: [],
        nota: "Pasa si cambia la contraseña de Facebook o si se quitan los permisos. Reconecta con la cuenta que administra la página y vuelve a publicar lo que se quedó sin salir.",
        principal: true,
      },
    };
  }
  if (!fila) {
    return hayRespaldo
      ? { titulo: "Sin conexión propia", detalle: "Publica con la llave de respaldo", falta: false, boton: "Conectar Instagram", punto: "no", etiqueta: "Instagram sin conexión propia", hoja: { cuenta, detalle: "Publica con la llave de respaldo", puede: [], nota: NOTA_CONECTAR, principal: true } }
      : { titulo: "Sin conexión", detalle: "Conecta Instagram para publicar", falta: true, boton: "Conectar Instagram", punto: "no", etiqueta: "Instagram sin conexión", hoja: { cuenta: "Sin conexión", detalle: "Conecta Instagram para publicar", puede: [], nota: NOTA_CONECTAR, principal: true } };
  }
  const titulo = `Conectada como ${fila.pagina_nombre}${fila.instagram_usuario ? ` (@${fila.instagram_usuario})` : ""}`;
  const tiene = new Set(fila.permisos);
  const puede = [
    ...(PERMISOS_PARA_PUBLICAR.every((p) => tiene.has(p)) ? ["Publicar en Instagram"] : []),
    ...(tiene.has(PERMISO_FACEBOOK) ? ["Publicar en la página de Facebook"] : []),
    ...(tiene.has(PERMISO_LEER) ? ["Leer otras cuentas para completar fichas"] : []),
  ];
  const faltan = (detalle: string): EstadoConexion => ({
    titulo,
    detalle,
    falta: true,
    boton: "Reconectar",
    punto: "mal",
    etiqueta: "A la conexión con Instagram le faltan permisos",
    hoja: { cuenta, detalle, puede, nota: "Reconecta con la cuenta que administra la página Somos Nosotrxs y acepta todos los permisos.", principal: true },
  });
  if (PERMISOS_PARA_PUBLICAR.some((p) => !tiene.has(p))) return faltan("Faltan permisos para publicar: reconecta");
  if (!tiene.has(PERMISO_LEER)) return faltan("Falta el permiso para leer cuentas: reconecta");
  const cuando = new Date(fila.conectado_en);
  const fecha = Number.isNaN(cuando.getTime()) ? null : fechaConexion(cuando, ahora);
  const desde = fecha ? ` · desde el ${fecha}` : "";
  const publica = tiene.has(PERMISO_FACEBOOK) ? "Publica" : "Publica solo en Instagram";
  return {
    titulo,
    detalle: `${publica} y lee cuentas${desde}`,
    falta: false,
    boton: "Reconectar",
    punto: "ok",
    etiqueta: `Instagram conectado como ${cuenta}`,
    hoja: {
      cuenta,
      detalle: `Página ${fila.pagina_nombre}${fecha ? ` · conectada desde el ${fecha}` : ""}`,
      puede,
      nota: "Solo hace falta reconectar si cambia la contraseña de Facebook o si deja de publicar; aquí te avisamos.",
      principal: false,
    },
  };
}

/**
 * OL-495, para la portada de Administración (OL-494 lo pinta como pendiente): lo que pide atención de la conexión (sin conexión, le faltan
 * permisos o caducó), con su punto; null si está bien (o si publica con la llave de respaldo). Pura: la portada lee la fila y el último trabajo
 * (`leerConexion`) y la llama.
 */
export function conexionPendiente(fila: FilaConexion | null, hayRespaldo: boolean, ultimo: UltimoTrabajo | null, ahora: Date): { titulo: string; detalle: string; punto: PuntoConexion } | null {
  const e = estadoConexion(fila, hayRespaldo, ahora, ultimo);
  return e.falta ? { titulo: e.titulo, detalle: e.detalle, punto: e.punto } : null;
}

/** Lo que usa `leerConexion` del cliente de Supabase: el de la sesión de la administración (las dos tablas solo las lee ella). */
type Lector = Pick<SupabaseClient, "from">;

/**
 * OL-495: la fila de `instagram_conexion` (sin token) y el último trabajo de Instagram que terminó, a la vez. Lo que no se pudo leer llega null
 * (la pantalla lo dice como «sin conexión» y sin caducar: no inventa un problema).
 */
export async function leerConexion(supabase: Lector): Promise<{ fila: FilaConexion | null; ultimo: UltimoTrabajo | null }> {
  const [c, t] = await Promise.all([
    supabase.from("instagram_conexion").select("pagina_nombre, instagram_usuario, permisos, conectado_en").limit(1),
    supabase.from("redes_trabajos").select("estado, error, terminado_en").eq("red", "instagram").in("estado", ["publicado", "fallido"]).order("terminado_en", { ascending: false }).limit(1),
  ]);
  const fila = ((c?.data ?? [])[0] as FilaConexion | undefined) ?? null;
  const ultimo = t?.error ? null : (((t?.data ?? [])[0] as UltimoTrabajo | undefined) ?? null);
  return { fila, ultimo };
}
