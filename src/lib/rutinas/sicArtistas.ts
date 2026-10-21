import { deducirTipoArtista } from "../artistas";
import { normalizarNombre } from "../lugares";
import { enlaceSeguro, textoLimpio } from "./candidatos";
import { limpiarArtista, type CandidatoArtista } from "./nombresArtistas";
import { BASE_SIC, leerCsv, textoDeSic, urlFichaSic, urlTablaSic } from "./sic";

/**
 * Lo que el Sistema de Información Cultural (SIC) publica de artistas, leído gratis desde el servidor (OL-430). Lo averiguado el 21 de
 * octubre de 2026 en sic.cultura.gob.mx:
 *   · Sus datos abiertos (datos.php) NO traen CSV de creadores: `opendata/d/24_artista_directorio.csv`, `…gpo_artistico…` y los de
 *     estímulos (FONCA, FECA, PACMYC) responden 404. Sí traen `festival` (sin municipio) y `educacion_artistica` (con municipio y sitio).
 *   · Las listas de «Grupos artísticos» y «Artistas» sí están en páginas públicas por estado (`lista.php?table=gpo_artistico&estado_id=24`), en
 *     UTF-8, agrupadas por municipio («San Luis Potosí: 17») con el nombre y la disciplina de cada uno y su ficha. Con eso basta para una
 *     ficha mínima: no se abre la ficha de cada uno, que trae domicilio, teléfonos y correos (nada de eso se guarda). «Artistas» salió vacía
 *     en San Luis, Ciudad de México y Oaxaca; se lee igual por si un estado la tiene.
 * Uso: el SIC pide dar «los créditos correspondientes»; la propuesta guarda la fuente y el enlace a su ficha.
 */

export const TABLAS_ARTISTAS_SIC = [
  { tabla: "gpo_artistico", tipo: "grupo" },
  { tabla: "artista", tipo: "solista" },
] as const;

export const urlListaSic = (tabla: string, estado: number) => `${BASE_SIC}/lista.php?table=${tabla}&disciplina=&estado_id=${estado}`;

const ENTIDADES: Record<string, string> = { amp: "&", nbsp: " ", quot: '"', apos: "'", lt: "<", gt: ">" };
const sinEntidades = (t: string) => t.replace(/&(#\d+|[a-z]+);/gi, (todo, e: string) => (e[0] === "#" ? String.fromCodePoint(Number(e.slice(1)) || 32) : (ENTIDADES[e.toLowerCase()] ?? todo)));

/**
 * Los grupos o artistas de una lista del SIC cuyo municipio es la ciudad (o una de sus alcaldías o alias). Lo de un municipio vacío no entra:
 * puede ser de cualquier parte del estado.
 */
export function artistasDeListaSic(html: string, tabla: (typeof TABLAS_ARTISTAS_SIC)[number], zonas: readonly string[]): CandidatoArtista[] {
  const quieren = new Set(zonas.map(normalizarNombre).filter(Boolean));
  const salida: CandidatoArtista[] = [];
  const vistos = new Set<string>();
  // Cada bloque empieza con su municipio: <div class="subtitulo_lista">San Luis Potosí: 17</div>
  const bloques = html.split(/<div class="subtitulo_lista">/).slice(1);
  for (const bloque of bloques) {
    const municipio = textoLimpio(sinEntidades(bloque.slice(0, bloque.indexOf("<")).replace(/:\s*\d*\s*$/, "")), 120);
    if (!municipio || !quieren.has(normalizarNombre(municipio))) continue;
    const fila = new RegExp(`<span class="nombrelist"><a href="/ficha\\.php\\?table=${tabla.tabla}&(?:amp;)?table_id=(\\d+)"[^>]*>([^<]+)</a></span>\\s*<br\\s*/?>\\s*([^<]*)<`, "g");
    for (const m of bloque.matchAll(fila)) {
      const disciplinaTexto = textoLimpio(sinEntidades(m[3]), 60);
      const c = limpiarArtista({
        fuente: "padrones",
        nombreFuente: "Sistema de Información Cultural",
        nombre: sinEntidades(m[2]),
        disciplina: disciplinaTexto,
        // Lo que dice el SIC si no es una disciplina de la app («Multidisciplinaria») queda como su especialidad.
        detalle: /multidisciplin/i.test(disciplinaTexto) ? "Multidisciplinario" : null,
        // «Colectivo …» o «Los …» lo dicen en el nombre; si no, lo que es la tabla (un grupo o un artista solo).
        tipo: deducirTipoArtista(sinEntidades(m[2])) ?? tabla.tipo,
        municipio,
        redes: [],
        url: urlFichaSic(tabla.tabla, m[1]),
      });
      if (!c) continue;
      const k = normalizarNombre(c.nombre);
      if (vistos.has(k)) continue;
      vistos.add(k);
      salida.push(c);
    }
  }
  return salida;
}

export type LecturaSicArtistas = { candidatos: CandidatoArtista[]; leidas: number; fallidas: number };

/** Las listas del estado (en paralelo, cada una con su tiempo), filtradas por la ciudad. Una lista que no llega solo se cuenta. */
export async function leerSicArtistas(estado: number, zonas: readonly string[], pedir: typeof fetch, plazoMs = 15_000): Promise<LecturaSicArtistas> {
  const resultados = await Promise.all(
    TABLAS_ARTISTAS_SIC.map(async (tabla) => {
      try {
        const r = await pedir(urlListaSic(tabla.tabla, estado), { signal: AbortSignal.timeout(plazoMs), cache: "no-store" });
        if (!r.ok) return null;
        return artistasDeListaSic((await r.text()).slice(0, 3_000_000), tabla, zonas);
      } catch {
        return null;
      }
    }),
  );
  const vistos = new Set<string>();
  const candidatos: CandidatoArtista[] = [];
  for (const c of resultados.flatMap((r) => r ?? [])) {
    const k = normalizarNombre(c.nombre);
    if (vistos.has(k)) continue;
    vistos.add(k);
    candidatos.push(c);
  }
  return { candidatos, leidas: resultados.filter((r) => r !== null).length, fallidas: resultados.filter((r) => r === null).length };
}

// ---------- pistas para las búsquedas: festivales y escuelas de arte del SIC (datos abiertos, Latin-1) ----------
export type Directorio = { nombre: string; web: string | null };

function filasDe(texto: string): { de: (fila: string[], col: string) => string; filas: string[][] } {
  const [cabecera = [], ...filas] = leerCsv(texto);
  return { filas, de: (fila, col) => (cabecera.indexOf(col) >= 0 ? (fila[cabecera.indexOf(col)] ?? "").trim() : "") };
}

/** Los festivales que el estado registra en el SIC (el archivo no dice su municipio: son pistas, no candidatos). */
export function festivalesDeSic(texto: string, tope = 15): Directorio[] {
  const { filas, de } = filasDe(texto);
  return filas
    .map((f) => ({ nombre: textoLimpio(de(f, "festival_nombre"), 120), web: enlaceSeguro(de(f, "pagina_web")) }))
    .filter((d) => d.nombre)
    .slice(0, tope);
}

/** Las escuelas y programas de educación artística de la ciudad, con su sitio. */
export function escuelasDeSic(texto: string, zonas: readonly string[], tope = 10): Directorio[] {
  const { filas, de } = filasDe(texto);
  const quieren = new Set(zonas.map(normalizarNombre).filter(Boolean));
  const vistas = new Set<string>();
  const salida: Directorio[] = [];
  for (const f of filas) {
    if (!quieren.has(normalizarNombre(de(f, "nom_mun"))) && !quieren.has(normalizarNombre(de(f, "nom_loc")))) continue;
    const nombre = textoLimpio(de(f, "educacion_artistica_nombre"), 120);
    const web = enlaceSeguro(de(f, "pagina_web"));
    if (!nombre || vistas.has(normalizarNombre(nombre))) continue;
    vistas.add(normalizarNombre(nombre));
    salida.push({ nombre, web });
    if (salida.length >= tope) break;
  }
  return salida;
}

/** Las dos pistas del estado, sin la API (un archivo que no llega deja su lista vacía). */
export async function leerDirectoriosSic(estado: number, zonas: readonly string[], pedir: typeof fetch, plazoMs = 15_000): Promise<{ festivales: Directorio[]; escuelas: Directorio[] }> {
  const leer = async (tabla: string): Promise<string | null> => {
    try {
      const r = await pedir(urlTablaSic(estado, tabla), { signal: AbortSignal.timeout(plazoMs), cache: "no-store" });
      return r.ok ? textoDeSic(await r.arrayBuffer()) : null;
    } catch {
      return null;
    }
  };
  const [festivales, escuelas] = await Promise.all([leer("festival"), leer("educacion_artistica")]);
  return { festivales: festivales ? festivalesDeSic(festivales) : [], escuelas: escuelas ? escuelasDeSic(escuelas, zonas) : [] };
}
