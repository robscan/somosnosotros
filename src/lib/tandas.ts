/**
 * Carga progresiva de una lista ya en el teléfono (OL-158, bitácora 193): la primera tanda se pinta de inmediato y
 * las siguientes se revelan al acercarse al final del scroll (o con "Ver más" si no hay `IntersectionObserver`).
 * Los datos ya llegaron completos del servidor (Agenda, Lugares y Artistas mandan su lista entera, como siempre);
 * lo que se reparte en tandas es cuánto se pinta de una vez, para que la primera línea de contenido se vea antes.
 * Lógica pura, sin DOM: la usa `useCargaProgresiva` y se prueba sola en `tandas.test.ts`.
 */

export const TANDA_INICIAL = 20;
export const TANDA_SIGUIENTE = 20;

export type EstadoTandas = {
  /** Cuántos elementos van mostrados ahora mismo. */
  mostrados: number;
  /** Si queda algo más por mostrar. */
  hayMas: boolean;
};

/** El estado inicial de una lista de `total` elementos: la primera tanda, o todo si cabe entero en ella. */
export function tandaInicial(total: number, tamano: number = TANDA_INICIAL): EstadoTandas {
  const mostrados = Math.min(Math.max(total, 0), Math.max(tamano, 1));
  return { mostrados, hayMas: mostrados < total };
}

/** Una tanda más, sin pasarse del total ni retroceder si ya se mostraba más (p. ej. al restaurar memoria de pantalla). */
export function siguienteTanda(total: number, mostrados: number, tamano: number = TANDA_SIGUIENTE): EstadoTandas {
  const base = Math.max(mostrados, 0);
  const nuevos = Math.min(Math.max(total, 0), base + Math.max(tamano, 1));
  return { mostrados: nuevos, hayMas: nuevos < total };
}

/** Al restaurar memoria de pantalla o al cambiar el total (nuevo filtro): nunca menos que la tanda inicial, nunca más que el total. */
export function tandaAcotada(total: number, mostradosGuardados: number, tamano: number = TANDA_INICIAL): EstadoTandas {
  const piso = Math.min(total, tamano);
  const mostrados = Math.min(Math.max(mostradosGuardados, piso), total);
  return { mostrados, hayMas: mostrados < total };
}
