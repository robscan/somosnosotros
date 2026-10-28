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
export function baseGraph(): string {
  const local = process.env.INSTAGRAM_API_URL;
  return local && /^http:\/\/127\.0\.0\.1:[0-9]{2,5}\/[a-z]+$/.test(local) ? `${local}/${VERSION_GRAPH}` : `https://graph.facebook.com/${VERSION_GRAPH}`;
}

export type ErrorInstagram = "cupo" | "imagen" | "permiso" | "otro";
export type Pedido = { imagen: string; texto: string | null; etiquetas: string[]; ubicacion: string | null; historia: boolean };
export type Resultado = { ok: true; mediaId: string; permalink: string | null; sinEtiquetas: boolean } | { ok: false; error: ErrorInstagram };
export type Opciones = { traer?: typeof fetch; token?: string; usuario?: string; esperar?: (ms: number) => Promise<void>; intentos?: number };

export type RespuestaGraph = { id?: string; status_code?: string; permalink?: string; error?: { code?: number; error_subcode?: number; type?: string } };

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

/** Una llamada a la Graph API (también la usa el cliente de la página de Facebook, `lib/facebook/api`). Nunca lanza: la red caída es el código -1. */
export async function llamarGraph(traer: typeof fetch, metodo: "GET" | "POST", ruta: string, params: Record<string, string>, token: string): Promise<RespuestaGraph> {
  const cuerpo = new URLSearchParams({ ...params, access_token: token });
  try {
    const r = metodo === "GET" ? await traer(`${baseGraph()}${ruta}?${cuerpo}`, { method: "GET", cache: "no-store" }) : await traer(`${baseGraph()}${ruta}`, { method: "POST", body: cuerpo, cache: "no-store" });
    const json = (await r.json().catch(() => ({}))) as RespuestaGraph;
    if (!r.ok && !json.error) return { error: { code: r.status } };
    return json;
  } catch {
    return { error: { code: -1 } };
  }
}

const dormir = (ms: number) => new Promise<void>((ok) => setTimeout(ok, ms));

/**
 * Las etiquetas de la foto: en una imagen, repartidas abajo a lo ancho (Instagram pide x e y de 0 a 1); con más de 10 (un festival, OL-463), en
 * dos alturas alternadas para que no se encimen; en una historia, sin posición.
 */
export function etiquetasConPosicion(usuarios: string[], historia: boolean): { username: string; x?: number; y?: number }[] {
  const y = (i: number) => (usuarios.length > 10 ? (i % 2 ? 0.94 : 0.84) : 0.9);
  return usuarios.map((username, i) => (historia ? { username } : { username, x: Math.round(((i + 1) / (usuarios.length + 1)) * 100) / 100, y: y(i) }));
}

async function crearContenedor(traer: typeof fetch, c: { token: string; usuario: string }, p: Pedido, conExtras: boolean): Promise<RespuestaGraph> {
  const params: Record<string, string> = { image_url: p.imagen };
  if (p.historia) params.media_type = "STORIES";
  else if (p.texto) params.caption = p.texto;
  if (conExtras && p.etiquetas.length) params.user_tags = JSON.stringify(etiquetasConPosicion(p.etiquetas, p.historia));
  if (conExtras && p.ubicacion && !p.historia) params.location_id = p.ubicacion;
  return llamarGraph(traer, "POST", `/${c.usuario}/media`, params, c.token);
}

/** Publica una imagen (o una historia) en la cuenta de la marca. */
export async function publicar(p: Pedido, o: Opciones = {}): Promise<Resultado> {
  const c = credenciales(o);
  if (!c) return { ok: false, error: "permiso" };
  const traer = o.traer ?? fetch;
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
  const espera = await esperarContenedor(traer, c, contenedor.id, o);
  if (espera) return { ok: false, error: espera };
  const r = await publicarContenedor(traer, c, contenedor.id);
  return r.ok ? { ...r, sinEtiquetas } : r;
}

export type ImagenDelCarrusel = { imagen: string; etiquetas: string[] };
export type PedidoCarrusel = { imagenes: ImagenDelCarrusel[]; texto: string | null; ubicacion: string | null };

/** Espera a que un contenedor diga FINISHED (null) o devuelve la clave del error. */
async function esperarContenedor(traer: typeof fetch, c: { token: string }, id: string, o: Opciones): Promise<ErrorInstagram | null> {
  const esperar = o.esperar ?? dormir;
  for (let i = 0; ; i++) {
    const estado = await llamarGraph(traer, "GET", `/${id}`, { fields: "status_code" }, c.token);
    if (estado.error) return claveDeError(estado.error);
    if (estado.status_code === "FINISHED") return null;
    if (estado.status_code === "ERROR" || estado.status_code === "EXPIRED") return "imagen";
    if (i >= (o.intentos ?? 20)) return "otro";
    await esperar(1500);
  }
}

/** Publica y lee el enlace (lo común de una imagen y de un carrusel). */
async function publicarContenedor(traer: typeof fetch, c: { token: string; usuario: string }, id: string): Promise<{ ok: true; mediaId: string; permalink: string | null } | { ok: false; error: ErrorInstagram }> {
  const publicado = await llamarGraph(traer, "POST", `/${c.usuario}/media_publish`, { creation_id: id }, c.token);
  if (!publicado.id) return { ok: false, error: claveDeError(publicado.error) };
  const enlace = await llamarGraph(traer, "GET", `/${publicado.id}`, { fields: "permalink" }, c.token);
  const permalink = typeof enlace.permalink === "string" && /^https:\/\/(www\.)?instagram\.com\//.test(enlace.permalink) ? enlace.permalink : null;
  return { ok: true, mediaId: publicado.id, permalink };
}

/**
 * Publica un carrusel (OL-464, bitácora 496; https://developers.facebook.com/docs/instagram-platform/content-publishing#carousel-posts):
 *   1. Cada imagen, un contenedor hijo: POST /{ig-user-id}/media con `image_url`, `is_carousel_item=true` y sus `user_tags` (las etiquetas van en
 *      cada imagen, no en el carrusel); se espera a que diga FINISHED.
 *   2. El carrusel: POST /{ig-user-id}/media con `media_type=CAROUSEL`, `children` (los ids, en orden), `caption` y `location_id`; FINISHED.
 *   3. `media_publish` y su `permalink`, como una imagen.
 * De 2 a 10 imágenes. Como en una imagen: si Instagram rechaza un hijo (o el carrusel) por otra cosa que el permiso o el cupo y llevaba etiquetas
 * (o ubicación), se intenta una vez sin ellas y se dice (`sinEtiquetas`). Nada queda a medias: los contenedores que no se publican caducan solos.
 */
export async function publicarCarrusel(p: PedidoCarrusel, o: Opciones = {}): Promise<Resultado> {
  const c = credenciales(o);
  if (!c) return { ok: false, error: "permiso" };
  if (p.imagenes.length < 2 || p.imagenes.length > 10) return { ok: false, error: "otro" };
  const traer = o.traer ?? fetch;
  let sinEtiquetas = false;
  const hijos: string[] = [];
  for (const img of p.imagenes) {
    const params: Record<string, string> = { image_url: img.imagen, is_carousel_item: "true" };
    let hijo = await llamarGraph(traer, "POST", `/${c.usuario}/media`, img.etiquetas.length ? { ...params, user_tags: JSON.stringify(etiquetasConPosicion(img.etiquetas, false)) } : params, c.token);
    if (!hijo.id && img.etiquetas.length && ["otro", "imagen"].includes(claveDeError(hijo.error))) {
      const segundo = await llamarGraph(traer, "POST", `/${c.usuario}/media`, params, c.token);
      if (segundo.id) {
        hijo = segundo;
        sinEtiquetas = true;
      }
    }
    if (!hijo.id) return { ok: false, error: claveDeError(hijo.error) };
    const espera = await esperarContenedor(traer, c, hijo.id, o);
    if (espera) return { ok: false, error: espera };
    hijos.push(hijo.id);
  }
  const params: Record<string, string> = { media_type: "CAROUSEL", children: hijos.join(",") };
  if (p.texto) params.caption = p.texto;
  let carrusel = await llamarGraph(traer, "POST", `/${c.usuario}/media`, p.ubicacion ? { ...params, location_id: p.ubicacion } : params, c.token);
  if (!carrusel.id && p.ubicacion && ["otro", "imagen"].includes(claveDeError(carrusel.error))) {
    const segundo = await llamarGraph(traer, "POST", `/${c.usuario}/media`, params, c.token);
    if (segundo.id) {
      carrusel = segundo;
      sinEtiquetas = true;
    }
  }
  if (!carrusel.id) return { ok: false, error: claveDeError(carrusel.error) };
  const espera = await esperarContenedor(traer, c, carrusel.id, o);
  if (espera) return { ok: false, error: espera };
  const r = await publicarContenedor(traer, c, carrusel.id);
  return r.ok ? { ...r, sinEtiquetas } : r;
}

/** Cuántas publicaciones van en las últimas 24 horas y cuántas deja Instagram (100). Null si no se pudo leer. */
export async function cupo(o: Opciones = {}): Promise<{ usadas: number; tope: number } | null> {
  const c = credenciales(o);
  if (!c) return null;
  const r = (await llamarGraph(o.traer ?? fetch, "GET", `/${c.usuario}/content_publishing_limit`, { fields: "quota_usage,config" }, c.token)) as RespuestaGraph & {
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
  const r = (await llamarGraph(o.traer ?? fetch, "GET", `/${idONombre}`, { fields: "id,name,location" }, c.token)) as RespuestaGraph & { name?: string; location?: unknown };
  return r.id && /^[0-9]{5,40}$/.test(r.id) && r.location ? { id: r.id, nombre: typeof r.name === "string" ? r.name.slice(0, 120) : r.id } : null;
}
