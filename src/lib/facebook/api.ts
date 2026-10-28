import "server-only";
import { llamarGraph, type RespuestaGraph } from "../instagram/api";

/**
 * El cliente de la página de Facebook de la marca («Somos Nosotrxs»), para espejar ahí lo que se publica en Instagram desde Administración
 * (OL-461, bitácora 493). Solo en el servidor: el token es el mismo token de página de Instagram (`INSTAGRAM_TOKEN`, la página está ligada a
 * @smsnstrsapp) y la página sale de `FACEBOOK_PAGE_ID`; nunca viajan al teléfono, ni a un registro, ni a un mensaje de error (los errores son
 * claves: imagen, permiso, otro; Facebook no tiene el cupo diario de Instagram). Las opciones (`traer`, `token`, `pagina`) son para las pruebas.
 *
 * Publicar (https://developers.facebook.com/docs/pages-api/posts, https://developers.facebook.com/docs/page-stories-api):
 *   · Publicación con foto: POST /{page-id}/photos con `url` (el JPEG público que ya se usó en Instagram) y `message` → `{ id, post_id }`.
 *   · Historia: POST /{page-id}/photos con `url` y `published=false` → `{ id }`; luego POST /{page-id}/photo_stories con `photo_id` →
 *     `{ success, post_id }`. Las historias no llevan texto.
 *   · Varias fotos (el espejo de un carrusel, OL-464): cada una a POST /{page-id}/photos con `published=false` → `{ id }`; luego
 *     POST /{page-id}/feed con `attached_media[i]={"media_fbid":…}` (en orden) y `message` → `{ id }` (la publicación).
 *   · El enlace: GET /{post-id}?fields=permalink_url (si no se puede leer, se publica igual y queda sin enlace).
 * Permisos del token: `pages_manage_posts`, `pages_read_engagement` y `pages_show_list` (y la tarea CREATE_CONTENT en la página). Sin
 * `pages_manage_posts`, Facebook responde con el código 200 y aquí se dice «permiso»: la hoja lo dice sin tocar lo publicado en Instagram.
 */

export type ErrorFacebook = "imagen" | "permiso" | "otro";
/** `imagenes`: varias fotos en una sola publicación (el espejo de un carrusel, OL-464); entonces `imagen` no se usa. */
export type PedidoFacebook = { imagen: string; texto: string | null; historia: boolean; imagenes?: string[] };
export type ResultadoFacebook = { ok: true; postId: string; permalink: string | null } | { ok: false; error: ErrorFacebook };
export type OpcionesFacebook = { traer?: typeof fetch; token?: string; pagina?: string };

type Respuesta = RespuestaGraph & { post_id?: string; success?: boolean; permalink_url?: string };

/** Las credenciales de la página (de las opciones en las pruebas; si no, del entorno). Null si falta el token o la página no es un número. */
function credenciales(o: OpcionesFacebook): { token: string; pagina: string } | null {
  const token = o.token ?? process.env.INSTAGRAM_TOKEN;
  const pagina = o.pagina ?? process.env.FACEBOOK_PAGE_ID;
  return token && pagina && /^[0-9]{1,40}$/.test(pagina) ? { token, pagina } : null;
}

/**
 * Qué quiere decir un error de la API de páginas, en una de tres claves. Permiso: token vencido o inválido (190, 102), sin el permiso o la
 * función (10, 200–299; sin `pages_manage_posts` es el 200), o la app sin esa capacidad (3). Imagen: Facebook no pudo leer el archivo (324).
 * Lo demás (los límites de uso 4, 17, 32 y 613 incluidos), «otro»: se puede reintentar.
 */
export function claveDeErrorFacebook(e: RespuestaGraph["error"] | undefined): ErrorFacebook {
  const code = e?.code ?? 0;
  if (code === 190 || code === 102 || code === 10 || code === 3 || (code >= 200 && code < 300)) return "permiso";
  if (code === 324) return "imagen";
  return "otro";
}

/** Un id de Facebook: números, o `<página>_<publicación>`. */
const ID = /^[0-9]{1,40}(_[0-9]{1,40})?$/;
/** El enlace de una publicación de Facebook (nunca otra cosa). */
const ENLACE = /^https:\/\/(www\.|m\.|web\.)?facebook\.com\/\S{1,450}$/;

/** Publica en la página de la marca una foto con su texto o, si `historia`, una historia. */
export async function publicarEnPagina(p: PedidoFacebook, o: OpcionesFacebook = {}): Promise<ResultadoFacebook> {
  const c = credenciales(o);
  if (!c) return { ok: false, error: "permiso" };
  const traer = o.traer ?? fetch;
  let postId: string | undefined;
  if (p.historia) {
    const foto = (await llamarGraph(traer, "POST", `/${c.pagina}/photos`, { url: p.imagen, published: "false" }, c.token)) as Respuesta;
    if (!foto.id || !ID.test(foto.id)) return { ok: false, error: claveDeErrorFacebook(foto.error) };
    const historia = (await llamarGraph(traer, "POST", `/${c.pagina}/photo_stories`, { photo_id: foto.id }, c.token)) as Respuesta;
    if (!historia.post_id || !ID.test(historia.post_id)) return { ok: false, error: claveDeErrorFacebook(historia.error) };
    postId = historia.post_id;
  } else if (p.imagenes && p.imagenes.length > 1) {
    // Varias fotos (OL-464, bitácora 496; https://developers.facebook.com/docs/pages-api/posts#publish-a-multi-photo-post): cada una se sube sin
    // publicar (`published=false`) y luego una publicación en el muro con todas (`attached_media`, en orden) y el texto.
    const params: Record<string, string> = {};
    for (const [i, url] of p.imagenes.slice(0, 10).entries()) {
      const foto = (await llamarGraph(traer, "POST", `/${c.pagina}/photos`, { url, published: "false" }, c.token)) as Respuesta;
      if (!foto.id || !ID.test(foto.id)) return { ok: false, error: claveDeErrorFacebook(foto.error) };
      params[`attached_media[${i}]`] = JSON.stringify({ media_fbid: foto.id });
    }
    if (p.texto) params.message = p.texto;
    const muro = (await llamarGraph(traer, "POST", `/${c.pagina}/feed`, params, c.token)) as Respuesta;
    if (!muro.id || !ID.test(muro.id)) return { ok: false, error: claveDeErrorFacebook(muro.error) };
    postId = muro.id;
  } else {
    const params: Record<string, string> = { url: p.imagen };
    if (p.texto) params.message = p.texto;
    const foto = (await llamarGraph(traer, "POST", `/${c.pagina}/photos`, params, c.token)) as Respuesta;
    const id = foto.post_id ?? foto.id;
    if (!id || !ID.test(id)) return { ok: false, error: claveDeErrorFacebook(foto.error) };
    postId = id;
  }
  const enlace = (await llamarGraph(traer, "GET", `/${postId}`, { fields: "permalink_url" }, c.token)) as Respuesta;
  const permalink = typeof enlace.permalink_url === "string" && ENLACE.test(enlace.permalink_url) ? enlace.permalink_url : null;
  return { ok: true, postId, permalink };
}
