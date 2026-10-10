import { slugDeCiudad } from "./ciudad";

/**
 * La ficha de un sitio fuera del directorio (OL-348), sin DOM ni base. Regla del founder (2026-10-08): «estandaricemos siempre que aunque el
 * lugar no esté en catálogo se abra ficha incompleta y de ahí a cómo llegar». Un sitio no se guarda en ninguna tabla: lo nombran sus eventos
 * (`sitio_texto`, con su punto) y su ficha se arma al vuelo con los que lo nombran (`/sitios/<slug>`, `app/sitios/[slug]`), agrupados igual que
 * las sedes de un festival (`sedesDeFestival`: por su nombre sin acentos, mayúsculas ni signos).
 *
 * El slug sale del nombre, como el de un lugar (`slug_de_nombre` en la base), y lleva detrás su ciudad cuando el evento la dice: «Plaza de
 * Armas» hay en muchas ciudades y cada una es su propio sitio («el contexto ordena, no limita… el país distingue», founder 2026-09-16). Si el
 * nombre ya termina con la ciudad, no se repite.
 */

/** Lo que de un evento dice qué sitio fuera del directorio nombra. */
export type EventoEnSitio = { lugar_id: string | null; sitio_texto: string | null; sitio_reservado?: boolean; ciudad?: string | null };

/** «Jardín de San Juan de Dios» en San Luis Potosí → «jardin-de-san-juan-de-dios-san-luis-potosi»; "" si el nombre no tiene letras ni números. */
export function slugDeSitio(nombre: string, ciudad?: string | null): string {
  const n = slugDeCiudad(nombre);
  const c = ciudad ? slugDeCiudad(ciudad) : "";
  if (!n || !c || n === c || n.endsWith(`-${c}`)) return n;
  return `${n}-${c}`;
}

/**
 * El sitio que nombra un evento, si tiene ficha: uno fuera del directorio y público. Un lugar del directorio tiene la suya (`hrefLugar`); un
 * sitio reservado nunca la tiene (su dirección no se publica); un nombre sin letras ni números no da un slug.
 */
export function slugDelEvento(e: EventoEnSitio): string | null {
  if (e.lugar_id || e.sitio_reservado) return null;
  const nombre = e.sitio_texto?.trim();
  return (nombre && slugDeSitio(nombre, e.ciudad)) || null;
}

/** La dirección de la ficha del sitio que nombra un evento; null si no tiene (ver `slugDelEvento`). */
export function hrefSitio(e: EventoEnSitio): string | null {
  const slug = slugDelEvento(e);
  return slug && `/sitios/${slug}`;
}

/** Los eventos que nombran el sitio de ese slug (los demás se descartan): la ficha se arma con ellos. */
export const eventosDelSitio = <T extends EventoEnSitio>(eventos: readonly T[], slug: string): T[] => eventos.filter((e) => slugDelEvento(e) === slug);

/** Lo más largo que puede medir la clave de un sitio: su nombre (120) y su ciudad (80), con el guion que los une, y aire. */
const LARGO_SLUG = 240;

/**
 * ¿Es la clave de un sitio, como la arma `slugDeSitio`? Letras sin acentos en minúscula, números y guiones sueltos entre ellos. La usan el alta
 * de lugar (`?sitio=`, OL-366) y las acciones que ligan: lo que no lo es no llega a la base.
 */
export const esSlugDeSitio = (s: unknown): s is string => typeof s === "string" && s.length <= LARGO_SLUG && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);

/** Lo que la selección para ligar necesita de cada evento del sitio. */
export type EventoParaLigar = EventoEnSitio & { id: string; creado_por: string | null; clase?: string | null; sitio_lat?: number | null; sitio_lng?: number | null };

const numero = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);

/**
 * Los eventos de un sitio que se piden ligar al lugar que lo representa en el directorio (OL-366): los que nombran ese sitio con la agrupación
 * de su ficha (`eventosDelSitio`), con su punto, sin ser el marco de un festival (sus sedes salen de sus actos) y de quien liga, o todos si es
 * administración (decisión del gestor: ligar cambia el «Dónde» de un evento y cualquiera con sesión puede crear un lugar). La base lo vuelve a
 * comprobar todo, y además la distancia y la zona horaria (`religar_sitio_a_lugar`): esto solo evita mandarle lo que no le toca.
 */
export function eventosParaLigar(eventos: readonly EventoParaLigar[], slug: string, quien: { id: string; esAdmin: boolean }): string[] {
  return eventosDelSitio(eventos, slug)
    .filter((e) => e.clase !== "festival" && numero(e.sitio_lat) && numero(e.sitio_lng) && (quien.esAdmin || e.creado_por === quien.id))
    .map((e) => e.id);
}

/** El aviso de «Ligar sus eventos» en la ficha del sitio (OL-366): cuántos pasaron al lugar. */
export function textoLigados(n: number): string {
  if (n <= 0) return "Ningún evento ligado";
  return n === 1 ? "1 evento ligado" : `${n} eventos ligados`;
}
