"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * El alto real de un elemento (con su relleno), al día: lo pegado abajo (el pie de los pasos, la barra «Agregar» de `HojaDonde`) cambia con la
 * zona segura y con el texto, y lo que flota encima (una lista de sugerencias, «Estoy aquí») tiene que quedar sobre él. Sin el elemento a la
 * vista (`activo` falso), 0.
 */
export default function useAlto(ref: RefObject<HTMLElement | null>, activo = true): number {
  const [alto, setAlto] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!activo || !el) return;
    const ro = new ResizeObserver(() => setAlto(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, activo]);
  return activo ? alto : 0;
}
