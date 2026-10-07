import { diaLocal, zonaSegura } from "./fechas";
import { normalizarNombre } from "./lugares";
import type { Publicado, Sugerencia } from "./sugerencias";

/**
 * «Este festival ya está publicado. ¿Es tu participación?» (OL-341, bitácora 370). Caso real del 2026-10-07: dos artistas publicaron cada uno
 * «Electric Universe Festival» (mismo título, misma fecha, mismo sitio) como eventos sueltos y hubo que convertirlo a mano en un festival con
 * dos actos. Al publicar un evento puntual, «Publicado» busca un evento visible con un **título muy parecido** el **mismo día** (el sitio
 * puede diferir) y, si lo hay, sugiere (con la misma pieza que las de OL-323, una sola a la vez):
 *
 * - **(a)** si es un festival: «Este festival ya está publicado» → ligar el evento nuevo como acto (`unir_a_festival_parecido`);
 * - **(b)** si es un evento puntual de **otra cuenta**: «Ya hay un evento igual» → convertir el existente en el marco de un festival con los
 *   dos como actos (`festival_de_dos_parecidos`).
 *
 * Aquí, sin DOM ni base, la regla: qué títulos se parecen, qué día cae cada uno y qué se propone. La consulta la hace el servidor
 * (`app/eventos/sugerencias.ts`) con las lecturas de siempre; la base vuelve a comprobar la misma regla antes de escribir (la migración
 * `20261008100000_festival_parecido.sql` la repite en SQL: `titulo_distintivo` y `titulos_parecidos`).
 */

// ---------------------------------------------------------------- Títulos

/**
 * Las palabras que bastan para que un título nombre algo propio aunque sea corto («Rock Fest», «Encuentro de jaraneros»). Lista cerrada
 * (encargo de OL-341); van como palabra entera, sin acentos ni mayúsculas.
 */
export const PALABRAS_DE_FESTIVAL = ["festival", "fest", "encuentro", "muestra", "ciclo", "jornadas"] as const;

/** Las palabras que no cuentan para las tres: artículos, preposiciones y conjunciones (en español y las tres de inglés más comunes). */
const VACIAS = new Set(["de", "del", "la", "las", "los", "el", "y", "e", "en", "con", "a", "al", "para", "por", "un", "una", "o", "u", "the", "of", "and"]);

/**
 * ¿El título nombra algo propio y no un género? Falsos positivos que se evitan: «Concierto», «Taller de cerámica», «Noche de jazz» el mismo día
 * son eventos distintos. Hace falta que tenga **al menos tres palabras con contenido** (sin contar artículos ni preposiciones: «Taller de
 * cerámica» tiene dos) **o** que diga una de las palabras de festival («Rock Fest», «Ciclo Fellini»).
 */
export function tituloDistintivo(titulo: string): boolean {
  const palabras = normalizarNombre(titulo).split(" ").filter(Boolean);
  if (palabras.some((p) => (PALABRAS_DE_FESTIVAL as readonly string[]).includes(p))) return true;
  return palabras.filter((p) => !VACIAS.has(p)).length >= 3;
}

/**
 * ¿Dos títulos son el mismo evento? Normalizados (sin acentos, mayúsculas ni signos), iguales o uno dentro del otro **por palabras enteras**
 * («Electric Universe Festival» está en «DJ Nova en Electric Universe Festival»; «Fest» no está en «Festival»), y el más corto tiene que ser
 * distintivo (`tituloDistintivo`): así «Concierto» no se parece a «Concierto de la Sinfónica».
 */
export function titulosParecidos(a: string, b: string): boolean {
  const na = normalizarNombre(a);
  const nb = normalizarNombre(b);
  if (!na || !nb) return false;
  const [corto, largo] = na.length <= nb.length ? [na, nb] : [nb, na];
  return ` ${largo} `.includes(` ${corto} `) && tituloDistintivo(corto);
}

/** ¿Son el mismo título una vez normalizados? (Entonces el acto necesita otro nombre: se propone «<artista> en <festival>».) */
export const mismoTitulo = (a: string, b: string): boolean => normalizarNombre(a) === normalizarNombre(b);

// ---------------------------------------------------------------- Días

/**
 * Los días que ocupa un evento en su zona: del de su inicio al de su fin. El fin cuenta un segundo antes (un festival que termina «a las 00:00 del
 * 13» terminó el 12) y nunca antes del inicio.
 */
export function diasDe(e: { inicio: string; fin: string | null; zona: string }): { desde: string; hasta: string } {
  const zona = zonaSegura(e.zona);
  const inicio = new Date(e.inicio);
  const fin = e.fin ? new Date(Math.max(inicio.getTime(), new Date(e.fin).getTime() - 1000)) : inicio;
  return { desde: diaLocal(inicio, zona), hasta: diaLocal(fin, zona) };
}

// ---------------------------------------------------------------- Lo que se propone

/** Un evento visible que podría ser el mismo, como lo lee el servidor (sin borradores ni actos de otro festival). */
export type Candidato = {
  id: string;
  slug: string | null;
  titulo: string;
  clase: string;
  /** Los días que ocupa (`diasDe`). */
  desde: string;
  hasta: string;
  /** Lo publicó la misma cuenta que publica ahora. */
  propio: boolean;
  /** Ya es acto de un festival. */
  padre: string | null;
  /** El nombre de su lugar o su sitio, para enseñarlo. */
  lugar: string | null;
};

/**
 * El título con que el evento nuevo entra al festival: el que escribió la persona; si es el mismo que el del festival (el caso real: los dos
 * escribieron «Electric Universe Festival»), «<artista> en <festival>» con el primer artista de Quién, para que el programa no repita el
 * nombre. Sin artista, el suyo (se puede cambiar en la sugerencia).
 */
export function tituloDeParticipacion(mio: string, festival: string, artista: string | null): string {
  if (!mismoTitulo(mio, festival) || !artista?.trim()) return mio;
  return `${artista.trim()} en ${festival}`.slice(0, 120);
}

/**
 * La sugerencia del evento igual, o null. Solo para un evento puntual recién publicado, sin festival, cuyo título es distintivo y sin la
 * sugerencia ya anotada. Entre los candidatos (que el servidor ya trae del mismo día), gana un festival (a) sobre un evento suelto (b), y el de
 * título idéntico sobre el que solo lo contiene. Un evento suelto **propio** no se ofrece (sería un duplicado propio, no una participación),
 * ni uno que ya es acto de un festival (ese festival, si se parece, es el candidato).
 */
export function sugerenciaDeParecido(e: Publicado, candidatos: readonly Candidato[], artista: string | null): Sugerencia | null {
  if (e.clase !== "puntual" || e.padre || e.anotadas.parecido || !tituloDistintivo(e.titulo)) return null;
  const validos = candidatos.filter((c) => c.id !== e.id && c.desde <= e.dia && e.dia <= c.hasta && titulosParecidos(c.titulo, e.titulo) && (c.clase === "festival" || (c.clase === "puntual" && !c.propio && !c.padre && c.desde === e.dia)));
  const orden = (c: Candidato) => (c.clase === "festival" ? 0 : 2) + (mismoTitulo(c.titulo, e.titulo) ? 0 : 1);
  const elegido = [...validos].sort((x, y) => orden(x) - orden(y))[0];
  if (!elegido) return null;
  const titulo = tituloDeParticipacion(e.titulo, elegido.titulo, artista);
  if (elegido.clase === "festival") {
    return { tipo: "parecido", modo: "festival", titulo, editable: mismoTitulo(e.titulo, elegido.titulo), marco: { id: elegido.id, slug: elegido.slug, titulo: elegido.titulo, desde: elegido.desde, hasta: elegido.hasta, lugar: elegido.lugar, actos: 0 } };
  }
  return { tipo: "parecido", modo: "evento", titulo, editable: mismoTitulo(e.titulo, elegido.titulo), existente: { id: elegido.id, titulo: elegido.titulo, dia: elegido.desde, lugar: elegido.lugar } };
}
