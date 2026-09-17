"use client";

import { hayPantallaAnterior, leerMarca, marcaDeLlegada, ponerMarca, vuelveA } from "@/lib/historial";

const INSTALADA = "__somosnosotrosMarca";

/** Quienes necesitan enterarse de una vuelta antes de que se pinte la pantalla de destino. */
const alVolverSuscritos = new Set<() => void>();

/**
 * Atrás, adelante o el gesto (popstate). React pinta la pantalla de destino dentro del mismo evento, así que quien
 * tenga que actuar antes (guardar la posición de la pantalla que se deja, saber que la siguiente es una vuelta) se
 * apunta aquí: este módulo escucha antes que el router de Next.js porque carga con la primera pantalla, y quien se
 * apunta puede cargar después (MemoriaScroll va dentro de un Suspense). Devuelve cómo borrarse.
 */
export function alVolver(fn: () => void): () => void {
  alVolverSuscritos.add(fn);
  return () => {
    alVolverSuscritos.delete(fn);
  };
}

// Una sola vez, al cargar este módulo en el teléfono, antes de la primera navegación de la app: la marca propia de
// navegación (OL-055; cada entrada del historial lleva cuántas pantallas de la app tiene detrás y de cuál se vino) y
// el aviso de vuelta.
if (typeof window !== "undefined") {
  const w = window as Window & { [INSTALADA]?: true };
  if (!w[INSTALADA]) {
    w[INSTALADA] = true;
    try {
      ponerMarca(window.history, marcaDeLlegada(document.referrer, window.location.origin, window.history.length), () => window.location.pathname + window.location.search);
    } catch {}
    window.addEventListener("popstate", () => alVolverSuscritos.forEach((fn) => fn()));
  }
}

/** Si Atrás puede volver con el historial a una pantalla de la app (lo pregunta Atrás al tocarlo). */
export function hayAnterior(): boolean {
  return hayPantallaAnterior(leerMarca(window.history.state), window.history.length);
}

/** Si terminar una tarea puede volver con el historial a `destino` (la pantalla de detrás tiene su misma ruta). */
export function vuelveADestino(destino: string): boolean {
  return vuelveA(window.history.state, window.history.length, destino);
}

/**
 * Va en el layout, fuera de todo Suspense, para que este módulo cargue con la primera pantalla. Con la marca, "Atrás"
 * sabe si hay una pantalla anterior dentro de la app o si se llegó por un enlace compartido y debe ir a la pantalla
 * madre. No pinta nada.
 */
export default function Navegacion() {
  return null;
}
