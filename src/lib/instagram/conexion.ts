import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { baseGraph, VERSION_GRAPH } from "./api";
import { PERMISOS_PARA_PUBLICAR, PERMISOS_PEDIDOS, type ClaveVuelta } from "./conexionEstado";

/**
 * «Conectar Instagram» (OL-471, bitácora 503; decisión del founder del 2026-10-28, «Opción 1»: que la app consiga el token sola en vez de pegarlo
 * a mano en Vercel). El inicio de sesión de Facebook, flujo manual (https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow):
 *   1. `GET /api/instagram/conectar` (solo la administración) lleva al diálogo `https://www.facebook.com/<versión>/dialog/oauth` con `client_id`,
 *      `redirect_uri`, `state` y `scope`; el `state` va firmado (HMAC) con el id de quien conecta y caduca a los 10 minutos, y además en una
 *      galleta httpOnly: la vuelta exige que sean el mismo.
 *   2. `GET /api/instagram/vuelta?code&state` (`atenderVuelta`): el código por un token de usuario (`/oauth/access_token` con `client_secret`);
 *      ese por uno de larga duración (`grant_type=fb_exchange_token`,
 *      https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived); qué permisos concedió (`/me/permissions`); sus
 *      páginas con su token (`/me/accounts?fields=id,name,access_token,instagram_business_account`,
 *      https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/business-login-for-instagram). El token de la
 *      página que sale de un token de usuario de larga duración no caduca por fecha. Se guarda en Vault (`instagram_guardar_conexion`).
 * Nunca se imprime ni se registra un token, el código ni el secreto de la app: los errores son claves (`ClaveVuelta`).
 */

export const GALLETA_ESTADO = "sn_ig_conectar";
export const VIGENCIA_ESTADO_MS = 10 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** La llave de la firma: derivada de `CRON_SECRET` (para que una firma de aquí no sirva en ningún otro sitio que use ese secreto). */
export function secretoDeEstado(env: Record<string, string | undefined> = process.env): string | null {
  const s = env.CRON_SECRET?.trim();
  return s && s.length >= 16 ? s : null;
}
const firma = (carga: string, secreto: string) => createHmac("sha256", `instagram-conectar:${secreto}`).update(carga).digest("base64url");

/** `<id del admin>.<caduca, ms>.<azar>.<firma>`. */
export function firmarEstado(adminId: string, ahora: number, secreto: string, azar: string = randomBytes(16).toString("base64url")): string {
  const carga = `${adminId}.${ahora + VIGENCIA_ESTADO_MS}.${azar}`;
  return `${carga}.${firma(carga, secreto)}`;
}

/** El id de quien empezó a conectar, si el `state` es nuestro, está entero y no ha caducado; si no, null. */
export function leerEstado(estado: string | null | undefined, secreto: string, ahora: number): { adminId: string } | null {
  if (!estado || estado.length > 300) return null;
  const partes = estado.split(".");
  if (partes.length !== 4) return null;
  const [adminId, caduca, azar, dada] = partes;
  if (!UUID.test(adminId) || !/^[0-9]{10,16}$/.test(caduca) || !/^[A-Za-z0-9_-]{16,64}$/.test(azar)) return null;
  const esperada = Buffer.from(firma(`${adminId}.${caduca}.${azar}`, secreto));
  const recibida = Buffer.from(dada);
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return null;
  const vence = Number(caduca);
  if (vence <= ahora || vence - ahora > VIGENCIA_ESTADO_MS) return null;
  return { adminId };
}

/** La dirección de vuelta (la misma en el diálogo y al cambiar el código: Meta exige que coincidan). Solo https. */
export function uriDeVuelta(origen: string): string | null {
  return /^https:\/\/[a-z0-9.-]+(:[0-9]{1,5})?$/.test(origen) ? `${origen}/api/instagram/vuelta` : null;
}

/** El diálogo de inicio de sesión de Meta. */
export function urlDeConexion(appId: string, redirectUri: string, estado: string): string {
  const q = new URLSearchParams({ client_id: appId, redirect_uri: redirectUri, state: estado, response_type: "code", scope: PERMISOS_PEDIDOS.join(",") });
  return `https://www.facebook.com/${VERSION_GRAPH}/dialog/oauth?${q}`;
}

export type Conexion = {
  token: string;
  paginaId: string;
  paginaNombre: string;
  instagramId: string;
  instagramUsuario: string | null;
  permisos: string[];
  conectadoPor: string;
};

export type EntradaVuelta = {
  /** Lo que trae la dirección de vuelta. */
  code: string | null;
  state: string | null;
  /** `?error=` de Meta (quien conecta tocó «Cancelar»). */
  errorMeta: string | null;
  /** La galleta que dejó `/api/instagram/conectar`. */
  galleta: string | null;
  /** Quien tiene la sesión ahora (la administración). */
  adminId: string;
  ahora: number;
  redirectUri: string;
};
export type ConfigVuelta = { appId: string; appSecret: string | undefined; paginaId: string | undefined; instagramId: string | undefined; secreto: string | null };
export type DependenciasVuelta = { traer: typeof fetch; guardar: (c: Conexion) => Promise<boolean> };

type Respuesta = Record<string, unknown> & { error?: unknown };

/** Una llamada a la Graph API sin token en la cabecera. Nunca lanza ni registra nada: la red caída o una respuesta rara son null. */
async function pedir(traer: typeof fetch, ruta: string, params: Record<string, string>): Promise<Respuesta | null> {
  try {
    const r = await traer(`${baseGraph()}${ruta}?${new URLSearchParams(params)}`, { method: "GET", cache: "no-store" });
    const json = (await r.json().catch(() => null)) as Respuesta | null;
    return r.ok && json && typeof json === "object" && !json.error ? json : null;
  } catch {
    return null;
  }
}

const TOKEN = /^[A-Za-z0-9_\-.|]{20,2000}$/;
const esToken = (x: unknown): x is string => typeof x === "string" && TOKEN.test(x);

/** La vuelta del inicio de sesión de Meta, de principio a fin: devuelve `conectado` (y la conexión quedó guardada) o la clave del error. */
export async function atenderVuelta(e: EntradaVuelta, c: ConfigVuelta, dep: DependenciasVuelta): Promise<ClaveVuelta> {
  if (!c.secreto) return "config";
  // El `state`: el de la galleta, firmado por nosotros, sin caducar y de quien tiene la sesión.
  if (!e.state || !e.galleta || e.state !== e.galleta) return "estado";
  const estado = leerEstado(e.state, c.secreto, e.ahora);
  if (!estado || estado.adminId !== e.adminId) return "estado";
  if (e.errorMeta) return "cancelado";
  if (!e.code || e.code.length > 2000 || /\s/.test(e.code)) return "estado";
  if (!c.appSecret || !c.paginaId || !/^[0-9]{1,40}$/.test(c.paginaId)) return "config";

  // 1. El código por un token de usuario; 2. ese por uno de larga duración.
  const corto = (await pedir(dep.traer, "/oauth/access_token", { client_id: c.appId, redirect_uri: e.redirectUri, client_secret: c.appSecret, code: e.code }))?.access_token;
  if (!esToken(corto)) return "meta";
  const tokenUsuario = (await pedir(dep.traer, "/oauth/access_token", { grant_type: "fb_exchange_token", client_id: c.appId, client_secret: c.appSecret, fb_exchange_token: corto }))?.access_token;
  if (!esToken(tokenUsuario)) return "meta";

  // 3. Qué permisos concedió. Sin los de publicar no se guarda (seguiría mandando el token de respaldo).
  const permisos = await pedir(dep.traer, "/me/permissions", { access_token: tokenUsuario });
  if (!permisos || !Array.isArray(permisos.data)) return "meta";
  const concedidos = (permisos.data as { permission?: unknown; status?: unknown }[])
    .filter((p) => p.status === "granted" && typeof p.permission === "string" && /^[a-z_]{1,60}$/.test(p.permission))
    .map((p) => p.permission as string)
    .sort();
  if (PERMISOS_PARA_PUBLICAR.some((p) => !concedidos.includes(p))) return "permisos";

  // 4. La página de la marca entre las suyas, con su token y su cuenta de Instagram.
  const cuentas = await pedir(dep.traer, "/me/accounts", { fields: "id,name,access_token,instagram_business_account{id,username}", limit: "100", access_token: tokenUsuario });
  if (!cuentas || !Array.isArray(cuentas.data)) return "meta";
  const pagina = (cuentas.data as { id?: unknown; name?: unknown; access_token?: unknown; instagram_business_account?: { id?: unknown; username?: unknown } }[]).find((p) => p.id === c.paginaId);
  const tokenPagina = pagina?.access_token;
  if (!pagina || !esToken(tokenPagina)) return "pagina";
  const ig = pagina.instagram_business_account;
  const instagramId = typeof ig?.id === "string" && /^[0-9]{1,40}$/.test(ig.id) ? ig.id : null;
  if (!instagramId || (c.instagramId && c.instagramId !== instagramId)) return "instagram";
  const usuario = typeof ig?.username === "string" && /^[A-Za-z0-9._]{1,30}$/.test(ig.username) ? ig.username : null;
  const nombre = typeof pagina.name === "string" && pagina.name.trim() ? pagina.name.trim().slice(0, 200) : "Somos Nosotrxs";

  // 5. Guardar: el token en Vault y el estado (sin token) en la tabla.
  const guardado = await dep
    .guardar({ token: tokenPagina, paginaId: c.paginaId, paginaNombre: nombre, instagramId, instagramUsuario: usuario, permisos: concedidos, conectadoPor: e.adminId })
    .catch(() => false);
  return guardado ? "conectado" : "guardar";
}
