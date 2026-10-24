import "server-only";

/**
 * El cliente de la API de Instagram (Graph API, con la página de Facebook de la marca) para publicar desde Administración (OL-458, firmado;
 * bitácora 490). Solo en el servidor: el token (`INSTAGRAM_TOKEN`) y la cuenta (`INSTAGRAM_USER_ID`) salen de las variables de entorno y nunca
 * viajan al teléfono, ni a un registro, ni a un mensaje de error (los errores son claves: cupo, imagen, permiso, otro).
 *
 * Publicar (https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media):
 *   1. POST /{ig-user-id}/media con `image_url` (JPEG público), `caption`, `user_tags` y `location_id`; una historia, `media_type=STORIES`
 *      (sin texto ni ubicación: la API no los publica en historias).
 *   2. Esperar a que el contenedor diga `status_code=FINISHED` (ERROR o EXPIRED: la imagen no sirvió).
 *   3. POST /{ig-user-id}/media_publish con `creation_id`; luego leer su `permalink`.
 * Si Instagram rechaza el contenedor por otra cosa que el permiso o el cupo y llevaba etiquetas o ubicación, se intenta una vez sin ellas (una
 * cuenta privada no se puede etiquetar): se publica sin ellas y se dice. Nada queda a medias: o se publica o no.
 */

export const VERSION_GRAPH = "v23.0";
/** La API. Solo para probar en local (el respaldo de `scripts/ops/auditoria-ui`, como `MAPBOX_API_URL`): `INSTAGRAM_API_URL`, y solo si es
 *  http://127.0.0.1; cualquier otra cosa se ignora y va a Facebook. */
function base(): string {
  const local = process.env.INSTAGRAM_API_URL;
  return local && /^http:\/\/127\.0\.0\.1:[0-9]{2,5}\/[a-z]+$/.test(local) ? `${local}/${VERSION_GRAPH}` : `https://graph.facebook.com/${VERSION_GRAPH}`;
}

export type ErrorInstagram = "cupo" | "imagen" | "permiso" | "otro";
export type Pedido = { imagen: string; texto: string | null; etiquetas: string[]; ubicacion: string | null; historia: boolean };
export type Resultado = { ok: true; mediaId: string; permalink: string | null; sinEtiquetas: boolean } | { ok: false; error: ErrorInstagram };
export type Opciones = { traer?: typeof fetch; token?: string; usuario?: string; esperar?: (ms: number) => Promise<void>; intentos?: number };

type RespuestaGraph = { id?: string; status_code?: string; permalink?: string; error?: { code?: number; error_subcode?: number; type?: string } };

/** Las credenciales de la cuenta (de las opciones en las pruebas; si no, del entorno). */
function credenciales(o: Opciones): { token: string; usuario: string } | null {
  const token = o.token ?? process.env.INSTAGRAM_TOKEN;
  const usuario = o.usuario ?? process.env.INSTAGRAM_USER_ID;
  return token && usuario && /^[0-9]{1,40}$/.test(usuario) ? { token, usuario } : null;
}

/** Qué quiere decir un error de la API, en una de cuatro claves. */
export function claveDeError(e: RespuestaGraph["error"] | undefined): ErrorInstagram {
  const code = e?.code ?? 0;
  const sub = e?.error_subcode ?? 0;
  if (code === 190 || code === 102 || code === 10 || (code >= 200 && code < 300)) return "permiso";
  if (sub === 2207042 || code === 4 || code === 9 || code === 17 || code === 32 || code === 613) return "cupo";
  if ([2207003, 2207004, 2207005, 2207009, 2207026, 2207052, 2207008].includes(sub) || code === 36003 || code === 36001) return "imagen";
  return "otro";
}

async function llamar(traer: typeof fetch, metodo: "GET" | "POST", ruta: string, params: Record<string, string>, token: string): Promise<RespuestaGraph> {
  const cuerpo = new URLSearchParams({ ...params, access_token: token });
  try {
    const r = metodo === "GET" ? await traer(`${base()}${ruta}?${cuerpo}`, { method: "GET", cache: "no-store" }) : await traer(`${base()}${ruta}`, { method: "POST", body: cuerpo, cache: "no-store" });
    const json = (await r.json().catch(() => ({}))) as RespuestaGraph;
    if (!r.ok && !json.error) return { error: { code: r.status } };
    return json;
  } catch {
    return { error: { code: -1 } };
  }
}

const dormir = (ms: number) => new Promise<void>((ok) => setTimeout(ok, ms));

/** Las etiquetas de la foto: en una imagen, repartidas abajo a lo ancho (Instagram pide x e y de 0 a 1); en una historia, sin posición. */
export function etiquetasConPosicion(usuarios: string[], historia: boolean): { username: string; x?: number; y?: number }[] {
  return usuarios.map((username, i) => (historia ? { username } : { username, x: Math.round(((i + 1) / (usuarios.length + 1)) * 100) / 100, y: 0.9 }));
}

async function crearContenedor(traer: typeof fetch, c: { token: string; usuario: string }, p: Pedido, conExtras: boolean): Promise<RespuestaGraph> {
  const params: Record<string, string> = { image_url: p.imagen };
  if (p.historia) params.media_type = "STORIES";
  else if (p.texto) params.caption = p.texto;
  if (conExtras && p.etiquetas.length) params.user_tags = JSON.stringify(etiquetasConPosicion(p.etiquetas, p.historia));
  if (conExtras && p.ubicacion && !p.historia) params.location_id = p.ubicacion;
  return llamar(traer, "POST", `/${c.usuario}/media`, params, c.token);
}

/** Publica una imagen (o una historia) en la cuenta de la marca. */
export async function publicar(p: Pedido, o: Opciones = {}): Promise<Resultado> {
  const c = credenciales(o);
  if (!c) return { ok: false, error: "permiso" };
  const traer = o.traer ?? fetch;
  const esperar = o.esperar ?? dormir;
  const conExtras = p.etiquetas.length > 0 || (!!p.ubicacion && !p.historia);
  let contenedor = await crearContenedor(traer, c, p, true);
  let sinEtiquetas = false;
  if (!contenedor.id && conExtras) {
    const clave = claveDeError(contenedor.error);
    if (clave === "otro" || clave === "imagen") {
      const segundo = await crearContenedor(traer, c, p, false);
      if (segundo.id) {
        contenedor = segundo;
        sinEtiquetas = true;
      }
    }
  }
  if (!contenedor.id) return { ok: false, error: claveDeError(contenedor.error) };
  // Esperar a que Instagram baje y revise la imagen.
  for (let i = 0, listo = false; !listo; i++) {
    const estado = await llamar(traer, "GET", `/${contenedor.id}`, { fields: "status_code" }, c.token);
    if (estado.error) return { ok: false, error: claveDeError(estado.error) };
    if (estado.status_code === "FINISHED") listo = true;
    else if (estado.status_code === "ERROR" || estado.status_code === "EXPIRED") return { ok: false, error: "imagen" };
    else if (i >= (o.intentos ?? 20)) return { ok: false, error: "otro" };
    else await esperar(1500);
  }
  const publicado = await llamar(traer, "POST", `/${c.usuario}/media_publish`, { creation_id: contenedor.id }, c.token);
  if (!publicado.id) return { ok: false, error: claveDeError(publicado.error) };
  const enlace = await llamar(traer, "GET", `/${publicado.id}`, { fields: "permalink" }, c.token);
  const permalink = typeof enlace.permalink === "string" && /^https:\/\/(www\.)?instagram\.com\//.test(enlace.permalink) ? enlace.permalink : null;
  return { ok: true, mediaId: publicado.id, permalink, sinEtiquetas };
}

/** Cuántas publicaciones van en las últimas 24 horas y cuántas deja Instagram (100). Null si no se pudo leer. */
export async function cupo(o: Opciones = {}): Promise<{ usadas: number; tope: number } | null> {
  const c = credenciales(o);
  if (!c) return null;
  const r = (await llamar(o.traer ?? fetch, "GET", `/${c.usuario}/content_publishing_limit`, { fields: "quota_usage,config" }, c.token)) as RespuestaGraph & {
    data?: { quota_usage?: number; config?: { quota_total?: number } }[];
  };
  const d = r.data?.[0];
  return d && typeof d.quota_usage === "number" ? { usadas: d.quota_usage, tope: d.config?.quota_total ?? 100 } : null;
}

/**
 * El id de la página de Facebook que Instagram usa como ubicación, desde lo que se pega (su enlace o su número). La página tiene que tener
 * ubicación (si no, Instagram rechaza la publicación). Leerla con el token de la página no pide la función de búsqueda de páginas.
 */
export function paginaDeEnlace(texto: string): string | null {
  const t = texto.trim();
  if (/^[0-9]{5,40}$/.test(t)) return t;
  try {
    const u = new URL(/^https?:\/\//.test(t) ? t : `https://${t}`);
    if (!/(^|\.)facebook\.com$|(^|\.)fb\.com$/.test(u.hostname)) return null;
    const id = u.searchParams.get("id");
    if (id && /^[0-9]{5,40}$/.test(id)) return id;
    const partes = u.pathname.split("/").filter(Boolean);
    const numero = partes.find((x) => /^[0-9]{5,40}$/.test(x)) ?? partes.at(-1)?.match(/-([0-9]{5,40})$/)?.[1];
    if (numero) return numero;
    const nombre = partes[0] === "pages" ? partes[1] : partes[0];
    return nombre && /^[A-Za-z0-9.\-]{1,80}$/.test(nombre) && nombre !== "profile.php" ? nombre : null;
  } catch {
    return null;
  }
}

export type Pagina = { id: string; nombre: string };

/** Lee la página (id y nombre) y comprueba que tiene ubicación. Null si no existe, no se puede leer o no tiene ubicación. */
export async function leerPagina(idONombre: string, o: Opciones = {}): Promise<Pagina | null> {
  const c = credenciales(o);
  if (!c || !/^[A-Za-z0-9.\-]{1,80}$/.test(idONombre)) return null;
  const r = (await llamar(o.traer ?? fetch, "GET", `/${idONombre}`, { fields: "id,name,location" }, c.token)) as RespuestaGraph & { name?: string; location?: unknown };
  return r.id && /^[0-9]{5,40}$/.test(r.id) && r.location ? { id: r.id, nombre: typeof r.name === "string" ? r.name.slice(0, 120) : r.id } : null;
}
