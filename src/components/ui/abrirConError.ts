"use client";

import { useEffect, type RefObject } from "react";

/** Si el aviso no cabe entero en la pantalla hay que acercarlo; si ya se ve, nada se mueve. */
export function seVeEntero(caja: { top: number; bottom: number }, alto: number): boolean {
  return caja.top >= 0 && caja.bottom <= alto;
}

/**
 * Un error dentro de un renglón cerrado no se ve: se toca el botón de publicar y parece que no pasa nada
 * (alta de evento, 2026-09-17: la imagen rechazada avisaba dentro de "Más", cerrado). Al llegar un error de
 * los campos que viven en el cuerpo, el renglón se abre solo y el primer aviso **de ese formulario** queda a
 * la vista, junto a su campo. Se puede volver a cerrar: solo abre cuando el error aparece, no mientras dure.
 */
export function useAbrirConError(formulario: RefObject<HTMLFormElement | null>, abrir: (v: boolean) => void, ...errores: (string | null | undefined)[]) {
  const hayError = errores.some(Boolean);
  useEffect(() => {
    if (!hayError) return;
    abrir(true);
    // Tras abrir, el aviso ya está pintado. Se busca dentro del formulario: en la pantalla puede haber otros.
    const id = requestAnimationFrame(() => {
      const aviso = formulario.current?.querySelector('[role="alert"]');
      if (aviso && !seVeEntero(aviso.getBoundingClientRect(), window.innerHeight)) aviso.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    return () => cancelAnimationFrame(id);
  }, [hayError, abrir, formulario]);
}
