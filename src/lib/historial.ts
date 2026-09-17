/**
 * Marca propia de navegación (Atrás coherente, OL-055): cada entrada del historial que pisa la app lleva en su estado
 * cuántas pantallas de la app tiene detrás. Atrás vuelve con el historial solo si hay alguna; si no (enlace compartido,
 * app recién abierta, o ya de vuelta en la primera) va a la pantalla madre. `history.length` no sirve para decidirlo:
 * cuenta también las entradas de adelante y las de otros sitios.
 * La instala `Navegacion` (en el layout) sobre el historial del navegador; Atrás la lee al tocar.
 */

/** Dónde va la marca dentro del estado de la entrada (Next.js guarda ahí lo suyo con otras llaves). */
export const LLAVE_MARCA = "somosnosotros";

/** La marca de una entrada: cuántas pantallas de la app tiene detrás, o null si no lleva (entrada nueva o ajena). */
export function leerMarca(estado: unknown): number | null {
  if (typeof estado !== "object" || estado === null) return null;
  const v = (estado as Record<string, unknown>)[LLAVE_MARCA];
  return typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null;
}

/** El estado de la entrada con la marca puesta, sin tocar lo demás. */
export function conMarca(estado: unknown, marca: number): Record<string, unknown> {
  return { ...(typeof estado === "object" && estado !== null ? estado : {}), [LLAVE_MARCA]: marca };
}

/** Al apilar una pantalla nueva: una más que la entrada de la que se sale. */
export function marcaAlApilar(desde: number | null): number {
  return (desde ?? 0) + 1;
}

/**
 * Al reemplazar (un filtro, "Ver más", la salida a la pantalla madre): la entrada es la misma y conserva su marca.
 * Si ya no la tiene, vale la que traiga el estado nuevo; si tampoco, ninguna pantalla detrás.
 */
export function marcaAlReemplazar(actual: number | null, nueva: number | null): number {
  return actual ?? nueva ?? 0;
}

/**
 * Una entrada que se abre sin marca (enlace compartido, app instalada, carga completa desde otra pantalla):
 * tiene una pantalla de la app detrás solo si la trajo un enlace del mismo sitio.
 */
export function marcaDeLlegada(referente: string, origen: string): number {
  if (!referente) return 0;
  try {
    return new URL(referente).origin === origen ? 1 : 0;
  } catch {
    return 0;
  }
}

/** Atrás vuelve con el historial si la entrada tiene una pantalla de la app detrás y el historial tiene de dónde. */
export function hayPantallaAnterior(marca: number | null, largoDelHistorial: number): boolean {
  return (marca ?? 0) > 0 && largoDelHistorial > 1;
}

/** Lo que se usa del historial del navegador (en las pruebas, uno de mentira). */
export type Historial = {
  readonly state: unknown;
  pushState(estado: unknown, titulo: string, url?: string | URL | null): void;
  replaceState(estado: unknown, titulo: string, url?: string | URL | null): void;
};

/**
 * Pone la marca donde se escribe el historial. Next.js reescribe el estado de la entrada al navegar y al refrescar sin
 * conservar lo ajeno, así que apilar y reemplazar se envuelven: apilar suma una a la entrada de la que se sale y
 * reemplazar conserva la de la entrada. La entrada actual, si no tiene marca, recibe la de llegada.
 * Envolver dos veces da las mismas marcas: las dos capas las calculan de la misma entrada.
 */
export function ponerMarca(h: Historial, llegada: number): void {
  const apilar = h.pushState;
  const reemplazar = h.replaceState;
  h.pushState = function (estado, titulo, url) {
    apilar.call(h, conMarca(estado, marcaAlApilar(leerMarca(h.state))), titulo, url);
  };
  h.replaceState = function (estado, titulo, url) {
    reemplazar.call(h, conMarca(estado, marcaAlReemplazar(leerMarca(h.state), leerMarca(estado))), titulo, url);
  };
  if (leerMarca(h.state) === null) reemplazar.call(h, conMarca(h.state, llegada), "");
}
