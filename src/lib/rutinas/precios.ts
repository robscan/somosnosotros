/**
 * Cuánto cuesta cada llamada a la API de Anthropic (OL-428). Todo lo que gasta una corrida pasa por `costoDeUso`, y ese número es el que se
 * suma a `rutinas_corridas.gasto_usd` y se descuenta del crédito de Corridas.
 *
 * Precios de la página oficial (platform.claude.com/docs/en/about-claude/pricing, leída el 20 de octubre de 2026), en dólares por millón de
 * tokens: entrada, escritura de caché a 5 minutos y a 1 hora, lectura de caché y salida. La búsqueda web cuesta 10 USD cada 1 000 búsquedas
 * (una que falla no se cobra) y la lectura web no cobra nada aparte de los tokens que trae. Si cambian, se cambian aquí y en su prueba.
 */

export type Precio = { entrada: number; escrituraCache5m: number; escrituraCache1h: number; lecturaCache: number; salida: number };

export const PRECIOS: Readonly<Record<string, Precio>> = {
  "claude-opus-5-5": { entrada: 4, escrituraCache5m: 5, escrituraCache1h: 8, lecturaCache: 0.2, salida: 20 },
  // OL-429: la lectura de caché de Sonnet 5.5 es 0,20 (guía de la API, 21 de octubre); estaba en 0,10 y el crédito bajaba de menos.
  "claude-sonnet-5-5": { entrada: 2, escrituraCache5m: 2.5, escrituraCache1h: 4, lecturaCache: 0.2, salida: 10 },
  "claude-sonnet-5": { entrada: 2, escrituraCache5m: 2.5, escrituraCache1h: 4, lecturaCache: 0.2, salida: 10 },
  "claude-fable-5-1": { entrada: 10, escrituraCache5m: 12.5, escrituraCache1h: 20, lecturaCache: 0.25, salida: 50 },
};

/** Un modelo que no está en la tabla se cobra al precio más alto de la tabla: el crédito nunca baja de menos. */
const PRECIO_DESCONOCIDO: Precio = Object.values(PRECIOS).reduce((max, p) => (p.entrada > max.entrada ? p : max));

export const USD_POR_BUSQUEDA_WEB = 10 / 1000;
export const USD_POR_LECTURA_WEB = 0;

/** Lo que trae `respuesta.usage` (los campos que cuestan). Lo demás se ignora. */
export type UsoApi = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation?: { ephemeral_5m_input_tokens?: number | null; ephemeral_1h_input_tokens?: number | null } | null;
  server_tool_use?: { web_search_requests?: number | null; web_fetch_requests?: number | null } | null;
};

const n = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);

/** El precio de un modelo: el suyo, o el de la clave más larga con la que empieza (un nombre con fecha), o el más alto. */
export function precioDe(modelo: string): Precio {
  if (PRECIOS[modelo]) return PRECIOS[modelo];
  const clave = Object.keys(PRECIOS)
    .filter((k) => modelo.startsWith(`${k}-`))
    .sort((a, b) => b.length - a.length)[0];
  return clave ? PRECIOS[clave] : PRECIO_DESCONOCIDO;
}

/** El costo en USD de una respuesta de la API, con el precio de su modelo. Función pura; se redondea al guardar (`redondear`). */
export function costoDeUso(uso: UsoApi | null | undefined, modelo: string): number {
  if (!uso) return 0;
  const p = precioDe(modelo);
  const desglose = uso.cache_creation;
  const escritura = desglose
    ? n(desglose.ephemeral_5m_input_tokens) * p.escrituraCache5m + n(desglose.ephemeral_1h_input_tokens) * p.escrituraCache1h
    : n(uso.cache_creation_input_tokens) * p.escrituraCache5m;
  const tokens = n(uso.input_tokens) * p.entrada + escritura + n(uso.cache_read_input_tokens) * p.lecturaCache + n(uso.output_tokens) * p.salida;
  const herramientas = n(uso.server_tool_use?.web_search_requests) * USD_POR_BUSQUEDA_WEB + n(uso.server_tool_use?.web_fetch_requests) * USD_POR_LECTURA_WEB;
  return tokens / 1_000_000 + herramientas;
}

/** A la diezmilésima de dólar, como guarda `gasto_usd` (numeric(10,4)). */
export function redondear(usd: number): number {
  return Math.round(usd * 10_000) / 10_000;
}
