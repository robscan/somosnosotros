"use client";

import { useSyncExternalStore } from "react";

/** Puntero fino (ratón o trackpad) y pantalla ancha: donde el selector nativo de fecha/hora de Chrome puede
 *  fallar en la app instalada en un monitor externo (bitácora 195, OL-160). En táctil o angosto, nada cambia. */
const CONSULTA = "(pointer: fine) and (min-width: 760px)";

function suscribir(alCambiar: () => void): () => void {
  const mq = window.matchMedia(CONSULTA);
  mq.addEventListener("change", alCambiar);
  return () => mq.removeEventListener("change", alCambiar);
}
function leerCliente(): boolean {
  return window.matchMedia(CONSULTA).matches;
}
/** En el servidor (y antes de hidratar) no hay `matchMedia`: `false`, para que el `<input>` nativo siga siendo
 *  lo único que hay sin JavaScript. */
function leerServidor(): boolean {
  return false;
}

/**
 * ¿Toca abrir la hoja propia de fecha y hora (OL-162) en vez del selector nativo? `useSyncExternalStore` evita el
 * problema de sincronizar un estado con una API externa (`matchMedia`) dentro de un efecto (setState en el cuerpo
 * del efecto, en cascada) — se suscribe directo a sus cambios.
 */
export function usePunteroFinoAncho(): boolean {
  return useSyncExternalStore(suscribir, leerCliente, leerServidor);
}
