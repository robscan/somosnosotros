"use client";

import { useEffect, useRef } from "react";

/**
 * La barra de acción fija de una ficha (Ficha.module.css `accionFija`) publica su alto real en `--alto-barra-fija` mientras
 * está en pantalla (OL-057). Los avisos de abajo (Hecho) flotan encima de ella, mida lo que mida: la promesa de Seguir en
 * dos líneas o la letra grande la hacen más alta que sus 72 px mínimos. Sin barra, el aviso va sobre la barra inferior.
 */
export function useAltoBarraFija<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const barra = ref.current;
    if (!barra) return;
    const raiz = document.documentElement.style;
    const medir = () => raiz.setProperty("--alto-barra-fija", `${Math.ceil(barra.getBoundingClientRect().height)}px`);
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(barra);
    return () => {
      observador.disconnect();
      raiz.removeProperty("--alto-barra-fija");
    };
  }, []);
  return ref;
}
