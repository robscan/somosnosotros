import { videoEmbedDe } from "./video";
import type { ProveedorNovedadArtista } from "./novedadesArtista";

/**
 * El reproductor de una novedad de artista (docs/rediseno/44-novedades-artista.md §2/§3, OL-181, fase 2 del doc,
 * acotada a Vimeo, SoundCloud, Bandcamp y Mixcloud): a partir de lo ya guardado (`proveedor`, `url` normalizada
 * por `reconocerEnlace` y, solo para Bandcamp, el `embed_id` resuelto al publicar) arma el `src` del iframe,
 * siempre desde un identificador extraído y validado por regex — nunca la URL cruda que pegó la persona — y solo
 * hacia la lista blanca de dominios de cada proveedor. `sandbox`/`allow` mínimos por proveedor, sin uno solo para
 * todos, y el alto: 16:9 para video (YouTube, Vimeo), un número de píxeles fijo por proveedor de audio, para que
 * ningún reproductor salte al cargar (`docs/ops/MEMORIA_GESTOR.md`).
 */
export type Incrustado = { src: string; sandbox: string; allow: string; alto: "16:9" | number };

/** SoundCloud: soundcloud.com/<usuario>/<pista> o soundcloud.com/<usuario>/sets/<lista>. */
const RUTA_SOUNDCLOUD = /^\/[A-Za-z0-9_-]+\/(sets\/[A-Za-z0-9_-]+|[A-Za-z0-9_-]+)\/?$/;
/** Mixcloud: mixcloud.com/<usuario>/<show>/. */
const RUTA_MIXCLOUD = /^\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/?$/;
/** Bandcamp: <sub>.bandcamp.com/album/<slug> o /track/<slug>. */
const RUTA_BANDCAMP = /^\/(album|track)\/[A-Za-z0-9_-]+\/?$/;
/** El id que guarda la migración tras el oEmbed de Bandcamp: "album=123" o "track=123" (mismo patrón que su check). */
const EMBED_ID_BANDCAMP = /^(album|track)=[0-9]+$/;

/**
 * La ruta de un enlace de SoundCloud si tiene la forma esperada, o null. Exportada para que `lib/novedadesArtista.ts`
 * reconozca con la misma regla exacta que arma el `src`, sin duplicar la regex.
 */
export function rutaSoundcloud(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.hostname.replace(/^www\./i, "").toLowerCase() !== "soundcloud.com") return null;
  return RUTA_SOUNDCLOUD.test(u.pathname) ? u.pathname.replace(/\/$/, "") : null;
}

/** La ruta (el "feed") de un enlace de Mixcloud si tiene la forma esperada, o null. */
export function rutaMixcloud(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.hostname.replace(/^www\./i, "").toLowerCase() !== "mixcloud.com") return null;
  return RUTA_MIXCLOUD.test(u.pathname) ? u.pathname : null;
}

/** Si un enlace tiene la forma de una página de álbum o pista de Bandcamp: <sub>.bandcamp.com/album|track/<slug>,
 * con un subdominio de verdad (ni "bandcamp.com" pelón ni "www", que no son la página de un artista). */
export function formaBandcampValida(url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase();
  const sub = host.endsWith(".bandcamp.com") ? host.slice(0, -".bandcamp.com".length) : "";
  if (!sub || sub === "www") return false;
  return RUTA_BANDCAMP.test(u.pathname);
}

/** Lista blanca de dominios del `src` final (doc 44 §3): cualquier otro, aunque el proveedor diga que es suyo,
 * no se sirve. */
const DOMINIOS_PERMITIDOS = ["youtube-nocookie.com", "player.vimeo.com", "w.soundcloud.com", "www.mixcloud.com", "bandcamp.com"];

function dominioPermitido(src: string): boolean {
  try {
    const h = new URL(src).hostname.toLowerCase();
    return DOMINIOS_PERMITIDOS.some((d) => h === d || h.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

/**
 * A partir de una novedad ya reconocida (en el cliente, antes de publicar) o ya guardada (en la ficha), el
 * reproductor a incrustar, o null si no se puede armar. Bandcamp necesita `embed_id`, que solo existe después de
 * publicar (lo resuelve el servidor con el oEmbed de Bandcamp): sin él, todavía no hay reproductor — no es un
 * error, solo que aún no se conoce el id.
 */
export function incrustadoDeNovedad({ proveedor, url, embed_id }: { proveedor: ProveedorNovedadArtista; url: string; embed_id: string | null }): Incrustado | null {
  if (proveedor === "youtube" || proveedor === "vimeo") {
    const video = videoEmbedDe({ red: proveedor, url });
    if (!video || !dominioPermitido(video.src)) return null;
    return { src: video.src, sandbox: "allow-scripts allow-same-origin allow-presentation", allow: "encrypted-media; picture-in-picture", alto: "16:9" };
  }
  if (proveedor === "soundcloud") {
    const ruta = rutaSoundcloud(url);
    if (!ruta) return null;
    const src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(`https://soundcloud.com${ruta}`)}&color=%236d34c8&auto_play=false&hide_related=true&show_comments=false&show_user=true&visual=false`;
    return dominioPermitido(src) ? { src, sandbox: "allow-scripts allow-same-origin", allow: "", alto: 166 } : null;
  }
  if (proveedor === "mixcloud") {
    const ruta = rutaMixcloud(url);
    if (!ruta) return null;
    const src = `https://www.mixcloud.com/widget/iframe/?feed=${encodeURIComponent(ruta)}&hide_cover=1&light=1`;
    return dominioPermitido(src) ? { src, sandbox: "allow-scripts allow-same-origin", allow: "", alto: 120 } : null;
  }
  if (proveedor === "bandcamp") {
    if (!embed_id || !EMBED_ID_BANDCAMP.test(embed_id)) return null;
    const src = `https://bandcamp.com/EmbeddedPlayer/${embed_id}/size=large/bgcol=ffffff/linkcol=6d34c8/tracklist=false/artwork=small/transparent=true/`;
    return dominioPermitido(src) ? { src, sandbox: "allow-scripts allow-same-origin", allow: "", alto: 120 } : null;
  }
  return null;
}

/**
 * Del JSON del oEmbed público de Bandcamp (`bandcamp.com/oembed?url=…&format=json`), solo el id `album=123` o
 * `track=123` dentro de su campo `html` — el resto (título, autor, ancho…) se ignora. Nunca se guarda ni se sirve
 * el HTML que manda Bandcamp: solo este id, para armar el `src` nosotros mismos con la plantilla fija de arriba.
 * Pura: `acciones.ts` le pasa el JSON ya recibido, nunca hace la llamada de red aquí.
 */
export function embedIdDesdeOembedBandcamp(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const html = (json as { html?: unknown }).html;
  if (typeof html !== "string") return null;
  const m = html.match(/EmbeddedPlayer\/(album|track)=([0-9]+)/);
  return m ? `${m[1]}=${m[2]}` : null;
}
