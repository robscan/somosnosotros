import type { Clase } from "../eventos";
import { LIMITES_EVENTO } from "../limites";
import { normalizarNombre } from "../lugares";
import { horaDeDescripcion, MAX_FUNCIONES, DIAS_FUNCIONES, textoDeDescripcion } from "./carteleraCdmx";
import { enlaceSeguro, textoLimpio } from "./candidatos";

/**
 * El catálogo de eventos de la Secretaría de Cultura de San Luis Potosí (OL-509; `https://cultura.slp.gob.mx/eventos/`). El 2 de noviembre la
 * lectura web de la API lo dio por vacío y traía 7 eventos con cartel. Se lee gratis desde el servidor, como el índice de las agendas:
 *   · la lista, `/eventos/` y `?page=2`, `?page=3`… mientras la página enlace a la siguiente: cada evento es un enlace
 *     `/eventos/AAAA/M/D/slug/` (esa fecha es la de PUBLICACIÓN, no la del evento). No es Squarespace (es Django): `?format=json` devuelve el
 *     mismo HTML, así que se leen las fichas una por una.
 *   · la ficha: `og:title` (o el `h3.card_title`), `og:image` (el cartel, en cloudfront), la categoría («PRESENTACIONES ARTISTICAS»,
 *     «EXPOSICIONES», «TALLERES», «CINE»…), el lugar (el enlace a `/lugares/…` y la dirección del enlace al mapa) y la fecha en texto bajo el
 *     título: «7 de noviembre de 2026 , 19:30», «5 de noviembre de 2026 , 18:00 - 11 de noviembre de 2026 , 21:30» o, sin hora,
 *     «27 de octubre de 2026 - 30 de noviembre de 2026»; y el texto del evento.
 * Funciones puras (sin red ni base): `agendas.ts` las pide con la calma de la cartelera (una petición cada 1,5 s) y propone cada ficha por el
 * `proponer` de siempre. Sin hora no entra (`sin_hora`); una ficha que solo junta lo de otro («Cartelera de la Cineteca Alameda») no es un evento.
 */

export const NOMBRE_FUENTE_CATALOGO = "Catálogo de eventos de la Secretaría de Cultura de San Luis Potosí";
export const URL_CATALOGO_SLP = "https://cultura.slp.gob.mx/eventos/";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const dos = (n: number | string) => String(n).padStart(2, "0");
const sumarDias = (dia: string, n: number): string => new Date(Date.parse(`${dia}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** La dirección de la página N de la lista (la 1 es la base, sin `?page`). */
export function urlPaginaCatalogo(base: string, pagina: number): string {
  const u = new URL(base);
  u.search = pagina > 1 ? `?page=${pagina}` : "";
  return u.href;
}

/** La dirección de una ficha, normalizada (con su barra final, sin consulta ni ancla), o null si no es una ficha del catálogo. */
export function urlFichaCatalogo(href: string, base: string): string | null {
  let u: URL;
  try {
    u = new URL(href.trim(), base);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.hostname !== new URL(base).hostname) return null;
  if (!/^\/eventos\/\d{4}\/\d{1,2}\/\d{1,2}\/[^/]+\/?$/.test(u.pathname)) return null;
  u.search = "";
  u.hash = "";
  if (!u.pathname.endsWith("/")) u.pathname += "/";
  return u.href;
}

/** Las fichas que enlaza una página de la lista (sin repetir; los carruseles «Fin de semana» y «Esta semana» repiten las de la lista) y si hay otra. */
export function leerListaCatalogo(html: string, base: string, pagina: number): { fichas: string[]; siguiente: number | null } {
  const fichas: string[] = [];
  const vistas = new Set<string>();
  for (const m of html.matchAll(/<a\b[^>]*?\bhref\s*=\s*["']([^"']+)["']/gi)) {
    const url = urlFichaCatalogo(m[1], base);
    if (url && !vistas.has(url)) {
      vistas.add(url);
      fichas.push(url);
    }
  }
  const paginas = [...html.matchAll(/href\s*=\s*["'][^"']*[?&]page=(\d{1,3})["']/gi)].map((m) => Number(m[1]));
  return { fichas, siguiente: paginas.includes(pagina + 1) ? pagina + 1 : null };
}

/** Lo que trae una ficha del catálogo. `desde`/`hasta` son días AAAA-MM-DD; `hora`/`horaFin`, HH:MM o null. */
export type FichaCatalogo = {
  url: string;
  titulo: string;
  imagen: string | null;
  categoria: string;
  lugar: string;
  direccion: string | null;
  municipio: string | null;
  desde: string;
  hasta: string | null;
  hora: string | null;
  horaFin: string | null;
  precio: string | null;
  descripcion: string;
};

const meta = (html: string, nombre: string): string | null => {
  const re = new RegExp(`<meta\\b[^>]*?(?:property|name)\\s*=\\s*["']${nombre}["'][^>]*>`, "i");
  const etiqueta = re.exec(html)?.[0];
  return etiqueta ? (/\bcontent\s*=\s*"([^"]*)"/i.exec(etiqueta)?.[1] ?? /\bcontent\s*=\s*'([^']*)'/i.exec(etiqueta)?.[1] ?? null) : null;
};

/** «7:00 pm» → «19:00»; «19:30» → «19:30»; null si no es una hora. */
function hora24(h: string, m: string, sufijo: string | undefined): string | null {
  let n = Number(h);
  const min = Number(m);
  if (min > 59) return null;
  const s = (sufijo ?? "").replace(/[\s.]/g, "").toLowerCase();
  if (s === "pm" && n < 12) n += 12;
  if (s === "am" && n === 12) n = 0;
  return n <= 23 ? `${dos(n)}:${dos(min)}` : null;
}

/** La fecha bajo el título: el primer día (y su hora) y, si es un periodo, el último (y su hora). null si no trae un día que se entienda. */
export function fechaDeCatalogo(texto: string): { desde: string; hasta: string | null; hora: string | null; horaFin: string | null } | null {
  const re = new RegExp(`(\\d{1,2}) de (${MESES.join("|")}) (?:de |del )?(\\d{4})(?:\\s*,?\\s*(\\d{1,2}):(\\d{2})(?:\\s*(a\\s?m|p\\s?m)\\b)?)?`, "g");
  // Sin acentos ni mayúsculas, con «p. m.» como «pm» (así lo lee la expresión).
  const plano = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .replace(/(a|p)\.\s?m\./g, "$1m");
  const fechas = [...plano.matchAll(re)]
    .map((m) => {
      const mes = MESES.indexOf(m[2]) + 1;
      const dia = `${m[3]}-${dos(mes)}-${dos(m[1])}`;
      const d = new Date(`${dia}T00:00:00Z`);
      if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== dia) return null;
      return { dia, hora: m[4] ? hora24(m[4], m[5], m[6]) : null };
    })
    .filter((x): x is { dia: string; hora: string | null } => !!x);
  if (!fechas.length) return null;
  const [a, b] = fechas;
  return { desde: a.dia, hasta: b && b.dia >= a.dia ? b.dia : null, hora: a.hora, horaFin: b && b.dia >= a.dia ? b.hora : null };
}

/** «CINETECA ALAMEDA SAN LUIS POTOSÍ» → «Cineteca Alameda San Luis Potosí» (solo si viene todo en mayúsculas). */
export function sinMayusculasSostenidas(t: string): string {
  if (!t || t !== t.toUpperCase() || !/\p{Lu}{3}/u.test(t)) return t;
  const menores = new Set(["de", "del", "la", "las", "los", "el", "y", "en", "a"]);
  return t
    .toLowerCase()
    .split(" ")
    .map((w, i) => (i > 0 && menores.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

/** La ficha de un evento del catálogo, o null si no trae título ni fecha (no es una ficha). */
export function leerFichaCatalogo(html: string, url: string): FichaCatalogo | null {
  const titulo = textoLimpio(meta(html, "og:title") ?? /<h3\b[^>]*card_title[^>]*>([\s\S]*?)<\/h3>/i.exec(html)?.[1] ?? "", LIMITES_EVENTO.titulo);
  // La fecha: el párrafo que sigue a la barra « | » bajo el título.
  const parrafo = /<p class="mb-0 mx-1">([\s\S]*?)<\/p>/i.exec(html)?.[1] ?? "";
  const fecha = fechaDeCatalogo(textoLimpio(parrafo, 300));
  if (!titulo || !fecha) return null;
  const imagenCruda = meta(html, "og:image") ?? meta(html, "twitter:image");
  const segura = imagenCruda ? enlaceSeguro(imagenCruda.trim()) : null;
  const imagen = segura && segura.startsWith("https://") ? segura : null;
  const categoria = textoLimpio(/<span class="w-fit-content text-white mx-auto fs-5 align-content-center">([\s\S]*?)<\/span>/i.exec(html)?.[1] ?? "", 80);
  const enLugares = /<a\b[^>]*href="\/lugares\/[a-z0-9][^"]*"[^>]*>([\s\S]*?)<\/a>/i.exec(html)?.[1];
  // El enlace al mapa: «NOMBRE, calle, colonia, CP, municipio, estado, México».
  const mapa = textoLimpio(/maps\/search\/\?api=1&(?:amp;)?query=([^"]*)"/i.exec(html)?.[1] ?? "", 400);
  const partes = mapa.split(",").map((p) => p.trim()).filter(Boolean);
  const lugar = sinMayusculasSostenidas(textoLimpio(enLugares ?? partes[0] ?? "", LIMITES_EVENTO.sitio));
  const direccion = partes.length >= 4 ? partes.slice(1, partes.length - 2).join(", ").slice(0, LIMITES_EVENTO.direccion) : null;
  const municipio = partes.length >= 4 ? partes[partes.length - 3] : null;
  const cuerpo = /Texto del Evento\s*-->([\s\S]*?)(?:<!--\s*Esta es la columna|<\/article>)/i.exec(html)?.[1] ?? "";
  const descripcion = textoDeDescripcion(cuerpo);
  const gratis = /\b(entrada (?:es )?(?:libre|gratuita)|acceso (?:libre|gratuito)|gratis)\b/i.test(descripcion);
  const costo = /\$\s?\d[\d,.]*/.exec(descripcion)?.[0] ?? null;
  return {
    url,
    titulo,
    imagen,
    categoria,
    lugar,
    direccion,
    municipio,
    ...fecha,
    precio: gratis ? "Gratis" : costo,
    descripcion,
  };
}

/** Una fila con la forma de `EventoEntregado` (`agendas.ts`) y lo que trae el catálogo además: la ficha, su cartel y su clase. */
export type FilaCatalogo = {
  titulo: string;
  fecha: string;
  hora: string;
  hora_fin: string | null;
  lugar: string;
  direccion: string | null;
  municipio: string | null;
  precio: string | null;
  descripcion: string;
  programa: string | null;
  termina: string | null;
  url: string;
  imagen: string | null;
  /** Sin clase, la decide la rutina por el título (`claseDeLaAgenda`): la inauguración de una exposición de un solo día. */
  clase?: Clase;
  ficha_fuente: string;
};

/** La clase por la categoría del catálogo: talleres, taller; exposiciones, exposición; lo demás, puntual. */
export function claseDeCategoria(categoria: string): Clase {
  const c = normalizarNombre(categoria);
  if (/\btaller/.test(c)) return "taller";
  if (/\bexposicion/.test(c)) return "exposicion";
  return "puntual";
}

/** ¿La ficha solo junta lo de otro («Cartelera de la Cineteca Alameda»)? Entonces no es un evento con día y hora propios. */
export const esListado = (f: Pick<FichaCatalogo, "titulo">): boolean => /^(cartelera|programaci[oó]n|agenda)\b/i.test(f.titulo.trim());

/**
 * Las filas de una ficha (nunca inventa una hora: sin la de la fecha, vale la del texto solo si es de un día; si no, `sin_hora`):
 *   · un día con hora: una fila (con su hora de fin si la fecha la dice ese mismo día);
 *   · una exposición: una fila, su primer día, con `termina` el último;
 *   · un periodo con hora (un ciclo de cine, un taller): una fila por día de hoy en adelante a esa hora (hasta 31, los próximos 60 días);
 *     la rutina junta los días seguidos en una propuesta con sesiones.
 */
export function filasDeCatalogo(f: FichaCatalogo, hoy: string): { filas: FilaCatalogo[]; motivo: "sin_hora" | "listado" | "pasado" | null } {
  if (esListado(f)) return { filas: [], motivo: "listado" };
  const unDia = !f.hasta || f.hasta === f.desde;
  const hora = f.hora ?? (unDia ? (horaDeDescripcion(f.descripcion)?.hora ?? null) : null);
  if (!hora) return { filas: [], motivo: "sin_hora" };
  const clase = claseDeCategoria(f.categoria);
  const base = {
    titulo: f.titulo,
    lugar: f.lugar,
    direccion: f.direccion,
    municipio: f.municipio,
    precio: f.precio,
    descripcion: f.descripcion,
    programa: null,
    url: f.url,
    imagen: f.imagen,
    ficha_fuente: f.url,
  };
  if (unDia) {
    if (f.desde < hoy) return { filas: [], motivo: "pasado" };
    const fin = f.hora && f.horaFin && f.horaFin > hora ? f.horaFin : null;
    return { filas: [{ ...base, fecha: f.desde, hora, hora_fin: fin, termina: null, ...(clase === "exposicion" ? {} : { clase }) }], motivo: null };
  }
  if (clase === "exposicion") return { filas: [{ ...base, fecha: f.desde, hora, hora_fin: null, termina: f.hasta, clase }], motivo: null };
  const hasta = [f.hasta!, sumarDias(hoy, DIAS_FUNCIONES)].sort()[0];
  const filas: FilaCatalogo[] = [];
  for (let d = f.desde < hoy ? hoy : f.desde; d <= hasta && filas.length < MAX_FUNCIONES; d = sumarDias(d, 1)) {
    filas.push({ ...base, fecha: d, hora, hora_fin: f.horaFin && f.horaFin > hora ? f.horaFin : null, termina: null, clase });
  }
  return { filas, motivo: filas.length ? null : "pasado" };
}
