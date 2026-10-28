/**
 * Cuánto cuesta cada llamada a la API de Anthropic (OL-428). Todo lo que gasta una corrida pasa por `costoDeUso`, y ese número es el que se
 * suma a `rutinas_corridas.gasto_usd` y se descuenta del crédito de Corridas.
 *
 * Precios de la página oficial (platform.claude.com/docs/en/about-claude/pricing, leída el 20 de octubre de 2026 y otra vez el 28 de octubre
 * para OL-470), en dólares por millón de tokens: entrada, escritura de caché a 5 minutos y a 1 hora, lectura de caché y salida. Haiku 5.5 tiene
 * dos tarifas según el largo del pedido: hasta 100 000 tokens de entrada (contando la caché leída y escrita) y más de eso (`largo`). La búsqueda web cuesta 10 USD cada 1 000 búsquedas
 * (una que falla no se cobra) y la lectura web no cobra nada aparte de los tokens que trae. Si cambian, se cambian aquí y en su prueba.
 */

export type Tarifa = { entrada: number; escrituraCache5m: number; escrituraCache1h: number; lecturaCache: number; salida: number };
/** Una tarifa y, si el modelo cobra más a los pedidos largos, desde cuántos tokens de entrada (sin incluir) y a qué tarifa. */
export type Precio = Tarifa & { largo?: { mas_de: number; tarifa: Tarifa } };

export const PRECIOS: Readonly<Record<string, Precio>> = {
  "claude-opus-5-5": { entrada: 4, escrituraCache5m: 5, escrituraCache1h: 8, lecturaCache: 0.2, salida: 20 },
  // OL-470: la lectura de caché de Sonnet 5.5 es 0,10 (0,05 veces la entrada, como Opus 5.5 — nota 2 de la tabla oficial, leída el 28 de
  // octubre). OL-429 la había subido a 0,20 por la guía de la API, que la daba como la de Sonnet 5; la tabla oficial manda.
  "claude-sonnet-5-5": { entrada: 2, escrituraCache5m: 2.5, escrituraCache1h: 4, lecturaCache: 0.1, salida: 10 },
  "claude-sonnet-5": { entrada: 2, escrituraCache5m: 2.5, escrituraCache1h: 4, lecturaCache: 0.2, salida: 10 },
  "claude-fable-5-1": { entrada: 10, escrituraCache5m: 12.5, escrituraCache1h: 20, lecturaCache: 0.25, salida: 50 },
  // OL-470: el de la relectura de artistas por omisión. Más de 100 000 tokens de entrada en un pedido: la otra tarifa, para todo el pedido.
  "claude-haiku-5-5": {
    entrada: 0.1,
    escrituraCache5m: 0.125,
    escrituraCache1h: 0.2,
    lecturaCache: 0.01,
    salida: 0.5,
    largo: { mas_de: 100_000, tarifa: { entrada: 0.5, escrituraCache5m: 0.625, escrituraCache1h: 1, lecturaCache: 0.05, salida: 2.5 } },
  },
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
  const base = precioDe(modelo);
  const desglose = uso.cache_creation;
  // El largo del pedido cuenta toda la entrada: la que no está en caché, la leída y la escrita (tabla oficial, «Long context pricing»).
  const escrita = desglose ? n(desglose.ephemeral_5m_input_tokens) + n(desglose.ephemeral_1h_input_tokens) : n(uso.cache_creation_input_tokens);
  const largo = n(uso.input_tokens) + n(uso.cache_read_input_tokens) + escrita;
  const p: Tarifa = base.largo && largo > base.largo.mas_de ? base.largo.tarifa : base;
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
