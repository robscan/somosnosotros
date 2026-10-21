import { normalizarNombre, type Tipo } from "../lugares";
import { limpiarCandidato, type Candidato } from "./candidatos";

/**
 * El catálogo del Sistema de Información Cultural (SIC) de la Secretaría de Cultura (OL-428; doc 57 §4.B, primera fuente de «Buscar
 * lugares»). Sus datos abiertos (sic.cultura.gob.mx/datos.php) son un CSV por tipo de espacio y por estado:
 *   https://sic.cultura.gob.mx/opendata/d/<estado>_<tabla>_directorio.csv
 * con la clave del estado del INEGI sin ceros (24 = San Luis Potosí; 0 = todo el país), en Latin-1 (no UTF-8), con columnas
 * `<tabla>_id`, `<tabla>_nombre`, `nom_mun`, `nom_loc`, `<tabla>_calle_numero`, `<tabla>_colonia`, `<tabla>_cp`, `gmaps_latitud`,
 * `gmaps_longitud` y, según la tabla, `pagina_web`, `facebook`, `twitter`, `instagram`. Se leen directo desde el servidor, sin la API
 * (no cuestan nada). Uso: el SIC permite usar, copiar y adaptar sus datos «siempre que se otorguen los créditos correspondientes»: la
 * propuesta guarda la fuente y el enlace a su ficha del SIC. No se guardan teléfonos ni correos.
 */

export const BASE_SIC = "https://sic.cultura.gob.mx";

/**
 * Las tablas que se leen, en el orden en que se proponen, con el tipo de la app (el mismo criterio que el importador de instituciones:
 * teatro → Foro, centro cultural → Casa de cultura). Fuera, por ruido: «otras bibliotecas» (escolares, jurídicas…), complejos de cine
 * comerciales, librerías, universidades y casas de artesanías.
 */
export const TABLAS_SIC: readonly { tabla: string; tipo: Tipo; detalle?: string }[] = [
  { tabla: "museo", tipo: "museo" },
  { tabla: "teatro", tipo: "foro" },
  { tabla: "centro_cultural", tipo: "casa_de_cultura" },
  { tabla: "galeria", tipo: "galeria" },
  { tabla: "auditorio", tipo: "otro", detalle: "Auditorio" },
  { tabla: "rnbp", tipo: "biblioteca" },
];

/** Los estados con su clave del INEGI, su código ISO 3166-2 (el que da Mapbox) y otros nombres con los que llegan. */
export const ESTADOS: readonly { clave: number; iso: string; nombres: readonly string[] }[] = [
  { clave: 1, iso: "AGU", nombres: ["Aguascalientes"] },
  { clave: 2, iso: "BCN", nombres: ["Baja California"] },
  { clave: 3, iso: "BCS", nombres: ["Baja California Sur"] },
  { clave: 4, iso: "CAM", nombres: ["Campeche"] },
  { clave: 5, iso: "COA", nombres: ["Coahuila", "Coahuila de Zaragoza"] },
  { clave: 6, iso: "COL", nombres: ["Colima"] },
  { clave: 7, iso: "CHP", nombres: ["Chiapas"] },
  { clave: 8, iso: "CHH", nombres: ["Chihuahua"] },
  { clave: 9, iso: "CMX", nombres: ["Ciudad de México", "CDMX", "Distrito Federal"] },
  { clave: 10, iso: "DUR", nombres: ["Durango"] },
  { clave: 11, iso: "GUA", nombres: ["Guanajuato"] },
  { clave: 12, iso: "GRO", nombres: ["Guerrero"] },
  { clave: 13, iso: "HID", nombres: ["Hidalgo"] },
  { clave: 14, iso: "JAL", nombres: ["Jalisco"] },
  { clave: 15, iso: "MEX", nombres: ["Estado de México", "México"] },
  { clave: 16, iso: "MIC", nombres: ["Michoacán", "Michoacán de Ocampo"] },
  { clave: 17, iso: "MOR", nombres: ["Morelos"] },
  { clave: 18, iso: "NAY", nombres: ["Nayarit"] },
  { clave: 19, iso: "NLE", nombres: ["Nuevo León"] },
  { clave: 20, iso: "OAX", nombres: ["Oaxaca"] },
  { clave: 21, iso: "PUE", nombres: ["Puebla"] },
  { clave: 22, iso: "QUE", nombres: ["Querétaro", "Querétaro de Arteaga"] },
  { clave: 23, iso: "ROO", nombres: ["Quintana Roo"] },
  { clave: 24, iso: "SLP", nombres: ["San Luis Potosí"] },
  { clave: 25, iso: "SIN", nombres: ["Sinaloa"] },
  { clave: 26, iso: "SON", nombres: ["Sonora"] },
  { clave: 27, iso: "TAB", nombres: ["Tabasco"] },
  { clave: 28, iso: "TAM", nombres: ["Tamaulipas"] },
  { clave: 29, iso: "TLA", nombres: ["Tlaxcala"] },
  { clave: 30, iso: "VER", nombres: ["Veracruz", "Veracruz de Ignacio de la Llave"] },
  { clave: 31, iso: "YUC", nombres: ["Yucatán"] },
  { clave: 32, iso: "ZAC", nombres: ["Zacatecas"] },
];

/** La clave del estado a partir de su código ISO («MX-SLP» o «SLP») o de su nombre. null si no es un estado de México. */
export function claveDeEstado(codigo: string | null | undefined, nombre?: string | null): number | null {
  const iso = (codigo ?? "").toUpperCase().replace(/^MX-/, "").trim();
  const porIso = ESTADOS.find((e) => e.iso === iso);
  if (porIso) return porIso.clave;
  const n = normalizarNombre(nombre ?? "");
  if (!n) return null;
  return ESTADOS.find((e) => e.nombres.some((x) => normalizarNombre(x) === n))?.clave ?? null;
}

export const urlTablaSic = (estado: number, tabla: string) => `${BASE_SIC}/opendata/d/${estado}_${tabla}_directorio.csv`;
export const urlFichaSic = (tabla: string, id: string) => `${BASE_SIC}/ficha.php?table=${encodeURIComponent(tabla)}&table_id=${encodeURIComponent(id)}`;

/** CSV a filas (comillas dobles, comas y saltos dentro de comillas, «""» como comilla). */
export function leerCsv(texto: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = "";
  let comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') comillas = false;
      else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === ",") {
      fila.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = "";
    } else campo += c;
  }
  if (campo || fila.length) {
    fila.push(campo);
    filas.push(fila);
  }
  return filas.filter((f) => f.length > 1 || (f[0] ?? "").trim() !== "");
}

/** Los bytes del CSV del SIC (Latin-1, que el navegador y Node llaman windows-1252) a texto. */
export function textoDeSic(bytes: ArrayBuffer | Uint8Array): string {
  return new TextDecoder("windows-1252").decode(bytes);
}

/**
 * Las filas de una tabla que son de la ciudad (por municipio o por localidad, sin acentos ni mayúsculas), ya como candidatos. Sin nombre o
 * repetidas dentro de la misma tabla, fuera. Las bibliotecas públicas que no dicen «biblioteca» en su nombre («Lic. Primo Feliciano
 * Velázquez») lo llevan delante, como se las conoce.
 */
export function candidatosDeTabla(texto: string, tabla: (typeof TABLAS_SIC)[number], nombresCiudad: readonly string[]): Candidato[] {
  const [cabecera, ...filas] = leerCsv(texto);
  if (!cabecera) return [];
  const col = (nombre: string) => cabecera.indexOf(nombre);
  const de = (fila: string[], nombre: string) => {
    const i = col(nombre);
    return i >= 0 ? (fila[i] ?? "").trim() : "";
  };
  const primera = (fila: string[], ...nombres: string[]) => nombres.map((n) => de(fila, n)).find(Boolean) ?? "";
  const quieren = new Set(nombresCiudad.map(normalizarNombre).filter(Boolean));
  const vistos = new Set<string>();
  const salida: Candidato[] = [];
  for (const fila of filas) {
    const municipio = de(fila, "nom_mun");
    if (!quieren.has(normalizarNombre(municipio)) && !quieren.has(normalizarNombre(de(fila, "nom_loc")))) continue;
    let nombre = de(fila, `${tabla.tabla}_nombre`);
    if (tabla.tabla === "rnbp" && nombre && !/bibliotec/i.test(nombre)) nombre = `Biblioteca ${nombre}`;
    const k = normalizarNombre(nombre);
    if (!k || vistos.has(k)) continue;
    vistos.add(k);
    const cp = de(fila, `${tabla.tabla}_cp`);
    const direccion = [de(fila, `${tabla.tabla}_calle_numero`), de(fila, `${tabla.tabla}_colonia`), /^\d{5}$/.test(cp) ? cp : ""].filter(Boolean).join(", ");
    const id = de(fila, `${tabla.tabla}_id`);
    const candidato = limpiarCandidato({
      fuente: "sic",
      nombre,
      tipo: tabla.tipo,
      detalle: tabla.detalle ?? null,
      direccion,
      municipio,
      lat: de(fila, "gmaps_latitud"),
      lng: de(fila, "gmaps_longitud"),
      redes: [primera(fila, "pagina_web", `${tabla.tabla}_pagina_web`), de(fila, "facebook"), de(fila, "instagram"), de(fila, "twitter")],
      url: /^\d+$/.test(id) ? urlFichaSic(tabla.tabla, id) : null,
    });
    if (candidato) salida.push(candidato);
  }
  return salida;
}

export type LecturaSic = { candidatos: Candidato[]; tablasLeidas: number; tablasFallidas: number };

/**
 * Descarga las tablas del estado (en paralelo, cada una con su tiempo) y junta los candidatos de la ciudad, en el orden de `TABLAS_SIC`.
 * Una tabla que no llega solo se cuenta; si no llega ninguna, quien llama decide (leerlo con la API).
 */
export async function leerSic(estado: number, nombresCiudad: readonly string[], pedir: typeof fetch, plazoMs = 15_000): Promise<LecturaSic> {
  const resultados = await Promise.all(
    TABLAS_SIC.map(async (tabla) => {
      try {
        const r = await pedir(urlTablaSic(estado, tabla.tabla), { signal: AbortSignal.timeout(plazoMs), cache: "no-store" });
        if (!r.ok) return null;
        return candidatosDeTabla(textoDeSic(await r.arrayBuffer()), tabla, nombresCiudad);
      } catch {
        return null;
      }
    }),
  );
  const vistos = new Set<string>();
  const candidatos: Candidato[] = [];
  for (const c of resultados.flatMap((r) => r ?? [])) {
    const k = normalizarNombre(c.nombre);
    if (vistos.has(k)) continue;
    vistos.add(k);
    candidatos.push(c);
  }
  return { candidatos, tablasLeidas: resultados.filter((r) => r !== null).length, tablasFallidas: resultados.filter((r) => r === null).length };
}
