"use client";

import { useEffect, useRef, type RefObject } from "react";

/** Marca la tira mientras todavía tenga algo por ver a la derecha. */
const marcar = (tira: HTMLElement) => tira.toggleAttribute("data-sigue", tira.scrollLeft + tira.clientWidth < tira.scrollWidth - 1);

/**
 * Una tira que se desliza de lado avisa cuándo todavía tiene más a la derecha (H-11: sin señal se cortaba a media letra y
 * nadie sabía que seguía). Pone `data-sigue` en la tira mientras falte algo por ver y globals.css desvanece su borde
 * derecho mientras lo tenga. Se mide al montar, al desplazar, al cambiar de tamaño y tras cada pintado de quien la usa
 * (una tira que gana un chip crece sin que su caja cambie de tamaño). Devuelve el `ref` que va en la tira; si ella ya
 * tiene uno (la tira de letras lo comparte con quien mide qué letra va), se le pasa y ese mismo se usa.
 */
export function useTiraQueSigue<T extends HTMLElement>(externa?: RefObject<T | null>) {
  const propia = useRef<T>(null);
  const ref = externa ?? propia;
  useEffect(() => {
    if (ref.current) marcar(ref.current);
  });
  useEffect(() => {
    const tira = ref.current;
    if (!tira) return;
    const alMedir = () => marcar(tira);
    const observador = new ResizeObserver(alMedir);
    observador.observe(tira);
    tira.addEventListener("scroll", alMedir, { passive: true });
    return () => {
      observador.disconnect();
      tira.removeEventListener("scroll", alMedir);
    };
  }, [ref]);
  return ref;
}
