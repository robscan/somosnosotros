"use client";

import { useEffect, useRef } from "react";

/**
 * El alto real de la hoja abierta más cercana (ui/Hoja), publicado en `--alto-hoja` mientras `abierta` es true.
 * `ref` va en un elemento cualquiera DENTRO de la hoja (sus `children`): como Hoja pinta en un portal, se sube por
 * el DOM real con `closest('[role="dialog"]')` en vez de medir el propio nodo, así el resultado es el alto exacto
 * de `.hoja` (con su relleno y su asa), no solo el del contenido. Sirve para que un botón fijo de la pantalla (el
 * de ubicación del mapa de lugares, docs/rediseno/35) suba justo por encima sin taparse nunca, midiendo el alto de
 * verdad en vez de suponer un número fijo (la hoja cambia de tamaño según el lugar: con o sin evento, seguido o no).
 */
export function useAltoHoja<T extends HTMLElement>(abierta: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const raiz = document.documentElement.style;
    if (!abierta) {
      raiz.removeProperty("--alto-hoja");
      return;
    }
    const hoja = ref.current?.closest<HTMLElement>('[role="dialog"]');
    if (!hoja) return;
    const medir = () => raiz.setProperty("--alto-hoja", `${Math.ceil(hoja.getBoundingClientRect().height)}px`);
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(hoja);
    return () => {
      observador.disconnect();
      raiz.removeProperty("--alto-hoja");
    };
  }, [abierta]);
  return ref;
}
