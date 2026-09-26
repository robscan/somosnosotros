"use client";

import { crearRegistroVolver } from "@/lib/gestoAtras";
import { hayPantallaAnterior, leerMarca, marcaDeLlegada, ponerMarca, reponerPantallaAnterior, vuelveA } from "@/lib/historial";

const INSTALADA = "__somosnosotrosMarca";

/** Lo que Capacitor pone en `window` dentro de la app de iPhone; en el navegador normal, no existe. */
type PuenteCapacitor = { Plugins?: { GestoAtras?: { addListener: (evento: "atras", fn: () => void) => void } } };

/** El almacén de la pestaña, o null donde el navegador lo niega (modo privado, almacenamiento bloqueado). */
function sesion(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Quienes necesitan enterarse de una vuelta antes de que se pinte la pantalla de destino. */
const alVolverSuscritos = new Set<() => void>();

/** Quién puede "volver" ahora mismo en pantalla (ver `lib/gestoAtras.ts`): lo usa el gesto nativo de deslizar. */
const registroVolver = crearRegistroVolver();
/** Atrás o Cerrar se registra aquí al montarse (`ui/Atras.tsx`). */
export const registrarVolverVisible = registroVolver.registrar;

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
      // Antes de que Next.js arranque: si esta carga es la vuelta de entrar con Apple o Google, la pantalla de la que
      // se vino se repone en el historial, para que Atrás (y el gesto) no salgan del sitio a la del proveedor.
      reponerPantallaAnterior(window.history, sesion(), window.location.pathname + window.location.search, Date.now());
    } catch {}
    window.addEventListener("popstate", () => alVolverSuscritos.forEach((fn) => fn()));
    // Dentro de la app de iPhone (OL-205, `GestoAtrasPlugin.swift`): el gesto de deslizar desde el borde avisa aquí
    // en vez de navegar solo con el `WKBackForwardList` nativo; se ejecuta la misma función que ya usa "Atrás" o la
    // ✕ visibles (`ui/Atras.tsx`), la que respeta la marca propia del historial. En el navegador normal `Capacitor`
    // no existe, así que esto no hace nada.
    try {
      (window as Window & { Capacitor?: PuenteCapacitor }).Capacitor?.Plugins?.GestoAtras?.addListener("atras", () => registroVolver.disparar());
    } catch {}
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
