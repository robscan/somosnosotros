"use client";

import { useEffect, useState } from "react";

/** Área visible de la ventana cuando difiere de la de maquetación (teclado abierto): su `top` y alto, y el alto de la ventana. */
export type AreaVisible = { top: number; height: number; ventana: number };

/**
 * Sigue al área visible (`window.visualViewport`). En el iPhone, `position: fixed` mide contra la ventana de maquetación
 * entera, que el teclado deja desplazada: lo que se ancla ahí queda bajo el teclado o arriba, fuera de la vista.
 * Devuelve `null` cuando no hay diferencia (sin teclado) o el navegador no tiene `visualViewport`: ahí manda el CSS (`inset: 0`).
 * Lo usan `ui/Hoja` y `ui/CampoLargo`.
 */
export default function useAreaVisible(activo = true): AreaVisible | null {
  const [area, setArea] = useState<AreaVisible | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!activo || !vv) return;
    const ajustar = () => setArea(Math.abs(vv.height - window.innerHeight) > 1 || vv.offsetTop > 0 ? { top: vv.offsetTop, height: vv.height, ventana: window.innerHeight } : null);
    ajustar();
    vv.addEventListener("resize", ajustar);
    vv.addEventListener("scroll", ajustar);
    return () => {
      vv.removeEventListener("resize", ajustar);
      vv.removeEventListener("scroll", ajustar);
    };
  }, [activo]);
  return area;
}
