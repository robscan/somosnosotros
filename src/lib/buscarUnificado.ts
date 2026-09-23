import type { Tarjeta } from "./destacados";

/**
 * El buscador único (docs/rediseno/41, OL-153, bitácora 188): tipo y tope compartidos entre la acción de servidor
 * (`app/accionesBuscar.ts`, que solo puede exportar funciones async por ser "use server") y el componente cliente
 * que la llama (`BuscadorUnificado`).
 */
export type ResultadoBusqueda = { eventos: Tarjeta[]; lugares: Tarjeta[]; artistas: Tarjeta[] };
export const LIMITE_BUSQUEDA_UNIFICADA = 8;
export const SIN_RESULTADOS_BUSQUEDA: ResultadoBusqueda = { eventos: [], lugares: [], artistas: [] };
