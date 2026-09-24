import { limpiar } from "./formulario";
import { reconocerEnlace } from "./enlaces";
import { diaLocal, ZONA_INICIAL } from "./fechas";
import { videoEmbedDe } from "./video";
import { formaBandcampValida, rutaMixcloud, rutaSoundcloud } from "./incrustado";
import { LIMITES_NOVEDAD_ARTISTA } from "./limites";

export { LIMITES_NOVEDAD_ARTISTA } from "./limites";

/**
 * Novedades del artista (docs/rediseno/44-novedades-artista.md, OL-175/OL-181, código de OL-171): una publicación
 * corta con un enlace que ya sabe hacer su propio reproductor, con título y texto opcionales. Se guarda en
 * `novedades_artista` (distinta de `novedades`, los avisos dentro de la app, doc 28) — sin relación con el video
 * de "Redes" que ya existe (OL-154, doc 40d, `lib/video.ts`): esa tabla no se toca.
 *
 * Fase 2 (OL-181, founder 2026-09-24: «los enlaces de artistas solo aceptan youtube, necesito que funcione con
 * bandcamp y soundcloud, además de vimeo»): se suma Vimeo, SoundCloud, Bandcamp y Mixcloud (mismo mecanismo que
 * SoundCloud, por regex, y nombrado en el pedido original del doc 44). Spotify, Deezer y el resto del doc 44
 * quedan fuera de esta pieza.
 */

/** Lista blanca de proveedores (doc 44 §2, OL-181). Se amplía sin migrar filas ya guardadas. */
export const PROVEEDORES_NOVEDAD_ARTISTA = ["youtube", "vimeo", "soundcloud", "bandcamp", "mixcloud"] as const;
export type ProveedorNovedadArtista = (typeof PROVEEDORES_NOVEDAD_ARTISTA)[number];
export const ETIQUETA_PROVEEDOR_NOVEDAD_ARTISTA: Record<ProveedorNovedadArtista, string> = {
  youtube: "YouTube",
  vimeo: "Vimeo",
  soundcloud: "SoundCloud",
  bandcamp: "Bandcamp",
  mixcloud: "Mixcloud",
};

export type NovedadArtista = {
  id: string;
  artista_id: string;
  url: string;
  proveedor: ProveedorNovedadArtista;
  /** Solo Bandcamp: el id que devolvió su oEmbed al publicar ("album=123" o "track=123"). Null en el resto. */
  embed_id: string | null;
  titulo: string | null;
  texto: string | null;
  creado_en: string;
  visible: boolean;
};

/**
 * Reconoce lo que la persona pegó como una novedad: el mismo `reconocerEnlace` que ya usan las redes
 * (`lib/enlaces.ts`, sin tocarlo). YouTube y Vimeo se validan con `videoEmbedDe` (`lib/video.ts`, OL-154), igual
 * que hoy; SoundCloud, Mixcloud y Bandcamp se validan con la regex estricta de `lib/incrustado.ts` (la misma que
 * arma el `src`, sin duplicarla). El `src` del reproductor no se arma aquí: eso es `incrustadoDeNovedad`.
 */
export function reconocerNovedadEnlace(texto: string): { url: string; proveedor: ProveedorNovedadArtista } | null {
  const enlace = reconocerEnlace(texto);
  if (!enlace) return null;
  if (enlace.red === "youtube" || enlace.red === "vimeo") {
    return videoEmbedDe(enlace) ? { url: enlace.url, proveedor: enlace.red } : null;
  }
  if (enlace.red === "soundcloud") return rutaSoundcloud(enlace.url) ? { url: enlace.url, proveedor: "soundcloud" } : null;
  if (enlace.red === "mixcloud") return rutaMixcloud(enlace.url) ? { url: enlace.url, proveedor: "mixcloud" } : null;
  if (enlace.red === "bandcamp") return formaBandcampValida(enlace.url) ? { url: enlace.url, proveedor: "bandcamp" } : null;
  return null;
}

export type DatosNovedadArtista = { url: string; proveedor: ProveedorNovedadArtista | null; titulo: string | null; texto: string | null };
export type ErroresNovedadArtista = Partial<Record<"url" | "titulo" | "texto", string>>;

const AYUDA_PROVEEDORES = "YouTube, Vimeo, SoundCloud, Bandcamp o Mixcloud";

/** Valida lo que manda el formulario de "Publicar novedad": mismo estilo que `validarArtista`. */
export function validarNovedadArtista(entrada: Record<string, FormDataEntryValue | null | undefined>): { datos: DatosNovedadArtista; errores: ErroresNovedadArtista } {
  const urlTexto = limpiar(entrada.url);
  const titulo = limpiar(entrada.titulo);
  const texto = limpiar(entrada.texto);
  const reconocido = urlTexto ? reconocerNovedadEnlace(urlTexto) : null;
  const datos: DatosNovedadArtista = {
    url: reconocido?.url ?? urlTexto,
    proveedor: reconocido?.proveedor ?? null,
    titulo: titulo || null,
    texto: texto || null,
  };
  const errores: ErroresNovedadArtista = {};
  if (!urlTexto) errores.url = "Pega el enlace de tu publicación.";
  else if (!reconocido) errores.url = `Solo enlaces de ${AYUDA_PROVEEDORES}.`;
  if (titulo.length > LIMITES_NOVEDAD_ARTISTA.titulo) errores.titulo = `Máximo ${LIMITES_NOVEDAD_ARTISTA.titulo} caracteres.`;
  if (texto.length > LIMITES_NOVEDAD_ARTISTA.texto) errores.texto = `Máximo ${LIMITES_NOVEDAD_ARTISTA.texto} caracteres.`;
  return { datos, errores };
}

/** "Hoy", "Ayer" o "12 sep": la fecha relativa de una novedad en la ficha (doc 44 §4), en la zona de la ciudad. */
export function fechaRelativaNovedadArtista(iso: string, ahora: Date = new Date(), zona: string = ZONA_INICIAL): string {
  const d = new Date(iso);
  const dia = diaLocal(d, zona);
  const hoy = diaLocal(ahora, zona);
  if (dia === hoy) return "Hoy";
  const [anio, mes, di] = hoy.split("-").map(Number);
  const ayer = new Date(Date.UTC(anio, mes - 1, di - 1)).toISOString().slice(0, 10);
  if (dia === ayer) return "Ayer";
  return new Intl.DateTimeFormat("es-MX", { timeZone: zona, day: "numeric", month: "short" }).format(d).replace(".", "");
}

/** Cuántas se muestran en la ficha antes de "Ver más" (doc 44 §4). */
export const NOVEDADES_ARTISTA_VISIBLES_DE_ENTRADA = 3;
