import { limpiar } from "./formulario";
import { reconocerEnlace } from "./enlaces";
import { diaLocal, ZONA_INICIAL } from "./fechas";
import { videoEmbedDe, type VideoEmbed } from "./video";
import { LIMITES_NOVEDAD_ARTISTA } from "./limites";

export { LIMITES_NOVEDAD_ARTISTA } from "./limites";

/**
 * Novedades del artista, fase 1 (docs/rediseno/44-novedades-artista.md, OL-175, código de OL-171): una publicación
 * corta con un enlace que ya sabe hacer su propio reproductor (por ahora, YouTube), con título y texto opcionales.
 * Se guarda en `novedades_artista` (distinta de `novedades`, los avisos dentro de la app, doc 28) — sin relación
 * con el video de "Redes" que ya existe (OL-154, doc 40d, `lib/video.ts`): esa tabla no se toca.
 */

/** Lista blanca de proveedores de esta fase (doc 44 §2): solo YouTube. Se amplía sin migrar filas ya guardadas. */
export const PROVEEDORES_NOVEDAD_ARTISTA = ["youtube"] as const;
export type ProveedorNovedadArtista = (typeof PROVEEDORES_NOVEDAD_ARTISTA)[number];
export const ETIQUETA_PROVEEDOR_NOVEDAD_ARTISTA: Record<ProveedorNovedadArtista, string> = { youtube: "YouTube" };

export type NovedadArtista = {
  id: string;
  artista_id: string;
  url: string;
  proveedor: ProveedorNovedadArtista;
  titulo: string | null;
  texto: string | null;
  creado_en: string;
  visible: boolean;
};

/**
 * Reconoce lo que la persona pegó como una novedad de esta fase: el mismo `reconocerEnlace` que ya usan las redes
 * (`lib/enlaces.ts`, sin tocarlo) y el mismo `videoEmbedDe` que arma y valida el `src` del reproductor
 * (`lib/video.ts`, OL-154) — nunca la URL cruda. Solo YouTube entra en esta fase; lo demás (incluido Vimeo, que
 * `videoEmbedDe` sí reconoce para "Redes") no se guarda como novedad todavía.
 */
export function reconocerNovedadEnlace(texto: string): { url: string; proveedor: ProveedorNovedadArtista; video: VideoEmbed } | null {
  const enlace = reconocerEnlace(texto);
  if (!enlace || enlace.red !== "youtube") return null;
  const video = videoEmbedDe(enlace);
  if (!video) return null;
  return { url: enlace.url, proveedor: "youtube", video };
}

export type DatosNovedadArtista = { url: string; proveedor: ProveedorNovedadArtista | null; titulo: string | null; texto: string | null };
export type ErroresNovedadArtista = Partial<Record<"url" | "titulo" | "texto", string>>;

/** Valida lo que manda el formulario de "Publicar novedad" (doc 44, fase 1): mismo estilo que `validarArtista`. */
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
  else if (!reconocido) errores.url = "Solo enlaces de YouTube por ahora.";
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
