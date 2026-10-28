/**
 * Una agenda en HTML vista desde el servidor, gratis, antes de pagar una lectura con la API (OL-444). Hallazgo del gestor (22 de octubre): dos
 * corridas de agendas de Ciudad de México leyeron 8 agendas en HTML (carteleras como mexicoescultura.com, cartelera.cdmx.gob.mx, Time Out),
 * gastaron 2,56 USD y no propusieron ni descartaron nada: la lectura web de la API devolvía una lista vacía sin decirlo. Esas carteleras son
 * listados largos (la lectura web corta en su tope de tokens), páginas que solo enlazan a la ficha de cada evento, o páginas que se arman con
 * JavaScript (la lectura web no lo ejecuta). Aquí se ve cuál es:
 *   · `texto`: lo que se lee de la página (sin scripts ni estilos, con los datos de eventos `application/ld+json` que muchas carteleras traen),
 *     para dárselo al modelo por partes en vez de pedirle que la abra;
 *   · `fichas`: los enlaces del mismo sitio que parecen la ficha de un evento (hasta 5), para una página que solo trae eso;
 *   · `vacia`: casi sin texto y sin fichas: se arma con JavaScript; no se paga una lectura que no puede traer nada.
 * Funciones puras, para probarlas con HTML de ejemplo.
 */

/** Lo que se le da al modelo por llamada (unos 12 000 tokens). */
export const TROZO_TEXTO = 40_000;
/** Como mucho, cuántas partes de una página se leen en una corrida (un listado de más se corta y se avisa). */
export const MAX_PARTES = 4;
/** Como mucho, cuántas fichas de evento se abren de una página que solo trae enlaces. */
export const MAX_FICHAS = 5;
/** Con menos texto que esto (y sin fichas), la página se arma con JavaScript o no trae nada. */
const MINIMO_TEXTO = 400;

const ENTIDADES: Record<string, string> = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", ntilde: "ñ", Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú", Ntilde: "Ñ", uuml: "ü", iexcl: "¡", iquest: "¿", laquo: "«", raquo: "»", ndash: "–", mdash: "—", hellip: "…" };
const decodificar = (t: string) =>
  t
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTIDADES[n] ?? m);

/** El texto que se ve de una página, con saltos donde hay bloques, y al final los datos de eventos (`ld+json`) que traiga. */
export function textoDePagina(html: string): string {
  const datos = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1].replace(/\s+/g, " ").trim())
    .filter((j) => /"@type"\s*:\s*"?(\w*Event|ItemList)/i.test(j));
  const visible = decodificar(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(script|style|noscript|template|svg|head)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/article|\/section|\/dd|\/dt)\b[^>]*>/gi, "\n")
      .replace(/<[^>]*>/g, " "),
  )
    .replace(/[ \t\f\v\r]+/g, " ")
    .replace(/ *\n[ \n]*/g, "\n")
    .trim();
  return datos.length ? `${visible}\n\nDatos de eventos de la página:\n${datos.join("\n")}` : visible;
}

const RUTA_FICHA = /\/(eventos?|events?|actividad(es)?|activities|cartelera|funcion(es)?|espectaculos?|exposicion(es)?|agenda)\/[^/?#]*[a-z0-9][^/?#]*/i;
const NO_FICHA = /\.(pdf|jpe?g|png|webp|gif|svg|css|js|xml|ics)$|\/(categoria|category|tag|etiqueta|page|pagina|estado|ciudad|buscar|search|login|feed)\b/i;

/** Los enlaces del mismo sitio que parecen la ficha de un evento, en el orden de la página, sin repetir y distintos de la página misma. */
export function fichasDeEvento(html: string, url: string, max = MAX_FICHAS): string[] {
  let base: URL;
  try {
    base = new URL(url);
  } catch {
    return [];
  }
  const host = base.hostname.replace(/^www\./, "");
  const vistas = new Set<string>([base.href.replace(/[#?].*$/, "").replace(/\/$/, "")]);
  const fichas: string[] = [];
  for (const m of html.matchAll(/<a\b[^>]*\bhref=["']([^"'#]+)["']/gi)) {
    let u: URL;
    try {
      u = new URL(decodificar(m[1]), base);
    } catch {
      continue;
    }
    if (u.protocol !== "https:" && u.protocol !== "http:") continue;
    if (u.hostname.replace(/^www\./, "") !== host) continue;
    const limpia = `${u.origin}${u.pathname}`.replace(/\/$/, "");
    if (vistas.has(limpia) || NO_FICHA.test(u.pathname) || !RUTA_FICHA.test(u.pathname)) continue;
    vistas.add(limpia);
    fichas.push(limpia);
    if (fichas.length >= max) break;
  }
  return fichas;
}

/** Cuántas horas («20:00», «8:30 pm», «19 h») trae un texto: una agenda que lista eventos las trae; una que solo enlaza, casi ninguna. */
export function horasEn(texto: string): number {
  return (texto.match(/\b([01]?\d|2[0-3])(:[0-5]\d\s*(h|hrs?|a\.? ?m\.?|p\.? ?m\.?)?|\s*(h|hrs)\b|\s*(a\.? ?m\.?|p\.? ?m\.?))/gi) ?? []).length;
}

export type PaginaAgenda = { texto: string; partes: number; fichas: string[]; soloEnlaces: boolean; vacia: boolean };

export function analizarPagina(html: string, url: string): PaginaAgenda {
  const texto = textoDePagina(html);
  const fichas = fichasDeEvento(html, url);
  const horas = horasEn(texto);
  const vacia = texto.length < MINIMO_TEXTO && !fichas.length;
  // Solo enlaces: hay fichas y el texto casi no dice horas (si las dice, el listado se lee tal cual).
  const soloEnlaces = !vacia && fichas.length >= 2 && horas < 2;
  return { texto, partes: Math.min(MAX_PARTES, Math.max(1, Math.ceil(texto.length / TROZO_TEXTO))), fichas, soloEnlaces, vacia };
}

/** La parte `i` (desde 0) del texto, cortada en un salto de línea cerca del límite para no partir un evento a la mitad. */
export function parteDeTexto(texto: string, i: number): string {
  let inicio = 0;
  for (let n = 0; n < i; n++) inicio = finDeParte(texto, inicio);
  return texto.slice(inicio, finDeParte(texto, inicio)).trim();
}
function finDeParte(texto: string, inicio: number): number {
  const fin = inicio + TROZO_TEXTO;
  if (fin >= texto.length) return texto.length;
  const salto = texto.lastIndexOf("\n", fin);
  return salto > inicio + TROZO_TEXTO / 2 ? salto + 1 : fin;
}
