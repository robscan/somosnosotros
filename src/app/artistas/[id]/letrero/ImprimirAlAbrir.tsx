"use client";

import { useEffect } from "react";

/**
 * Abre el cuadro de impresión del navegador solo, en cuanto la letra ya cargó (si se imprime antes, el texto sale
 * con la tipografía de respaldo). Sin nada que pintar: es puro efecto (OL-159, doc 40e).
 */
export default function ImprimirAlAbrir() {
  useEffect(() => {
    let cancelado = false;
    document.fonts.ready.then(() => {
      if (!cancelado) window.print();
    });
    return () => {
      cancelado = true;
    };
  }, []);
  return null;
}
