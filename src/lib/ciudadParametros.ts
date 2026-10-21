import { normalizarNombre } from "./lugares";
import { urlSegura } from "./propuestas";

/**
 * Los parámetros propios de una ciudad para las rutinas de Administración › Ciudades (OL-429; migración 20261021120000_ciudades_parametros.sql,
 * columna `ciudades.parametros`). Decisión del founder del 21 de octubre para Ciudad de México: «enfoquemos en zonas más turísticas y partamos
 * de guías culturales que ya existen, no vamos por todas las delegaciones, si no por las que tienen más oferta». Todos son opcionales; una
 * ciudad sin parámetros se comporta como antes:
 *   · `alcaldias` (o municipios, colonias): solo cuenta lo que está en ellas. El CSV del SIC se filtra por su municipio; lo de otras fuentes,
 *     por el municipio que dice la fuente o el texto de su dirección. Lo de fuera se cuenta en `descartados.fuera_de_la_ciudad`.
 *   · `guias`: guías culturales que ya existen ({ nombre, url }). Son la primera fuente de «Buscar lugares» y una de las «agendas conocidas»
 *     de «Buscar agendas y eventos»; se leen con la herramienta de lectura web.
 *   · `radio_km`: el radio del área de la ciudad; manda sobre el que se deduce del zoom.
 * Ejemplo (Ciudad de México): { "alcaldias": ["Cuauhtémoc", "Miguel Hidalgo", "Coyoacán", "Benito Juárez", "Álvaro Obregón"], "radio_km": 12,
 *   "guias": [{ "nombre": "Cartelera de la Secretaría de Cultura de la Ciudad de México", "url": "https://cartelera.cdmx.gob.mx/" }, …] }.
 */

export type GuiaCultural = { nombre: string; url: string };
export type ParametrosCiudad = { alcaldias: string[]; guias: GuiaCultural[]; radio_km: number | null };

export const SIN_PARAMETROS: ParametrosCiudad = { alcaldias: [], guias: [], radio_km: null };
const MAX_ALCALDIAS = 30;
const MAX_GUIAS = 12;

const texto = (v: unknown, tope: number): string => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, tope) : "");
const objeto = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/** Lo que trae `ciudades.parametros`, limpio: lo que no se entiende se ignora (nunca tumba una corrida). */
export function leerParametrosCiudad(v: unknown): ParametrosCiudad {
  const p = objeto(v);
  const alcaldias = [...new Set((Array.isArray(p.alcaldias) ? p.alcaldias : []).map((a) => texto(a, 80)).filter((a) => a.length >= 2))].slice(0, MAX_ALCALDIAS);
  const vistas = new Set<string>();
  const guias: GuiaCultural[] = [];
  for (const g of Array.isArray(p.guias) ? p.guias : []) {
    const url = urlSegura(objeto(g).url);
    const nombre = texto(objeto(g).nombre, 80);
    if (!url || !nombre || vistas.has(url)) continue;
    vistas.add(url);
    guias.push({ nombre, url });
    if (guias.length >= MAX_GUIAS) break;
  }
  const r = typeof p.radio_km === "number" ? p.radio_km : typeof p.radio_km === "string" && p.radio_km.trim() ? Number(p.radio_km) : NaN;
  const radio_km = Number.isFinite(r) && r >= 0.5 && r <= 100 ? r : null;
  return { alcaldias, guias, radio_km };
}

/** ¿Alguno de estos textos (municipio, dirección) nombra una de las alcaldías? Por palabras enteras, sin acentos ni mayúsculas. */
export function nombraAlcaldia(textos: readonly (string | null | undefined)[], alcaldias: readonly string[]): boolean {
  const buscadas = alcaldias.map((a) => normalizarNombre(a)).filter(Boolean);
  return textos.some((t) => {
    const n = ` ${normalizarNombre(t ?? "")} `;
    return n.trim() !== "" && buscadas.some((a) => n.includes(` ${a} `));
  });
}
