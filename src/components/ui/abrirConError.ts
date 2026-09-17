"use client";

import { useEffect } from "react";

/** Si el aviso no cabe entero en la pantalla, se acerca al centro; si ya se ve, nada se mueve. */
function ponerALaVista(aviso: Element) {
  const caja = aviso.getBoundingClientRect();
  if (caja.top >= 0 && caja.bottom <= window.innerHeight) return;
  aviso.scrollIntoView({ block: "center", behavior: "smooth" });
}

/**
 * Un error dentro de un renglón cerrado no se ve: se toca el botón de publicar y parece que no pasa nada
 * (alta de evento, 2026-09-17: la imagen rechazada avisaba dentro de "Más", cerrado). Al llegar un error de
 * los campos que viven en el cuerpo, el renglón se abre solo y el primer aviso del formulario queda a la
 * vista, junto a su campo. Se puede volver a cerrar: solo abre cuando el error aparece, no mientras dure.
 */
export function useAbrirConError(abrir: (v: boolean) => void, ...errores: (string | null | undefined)[]) {
  const hayError = errores.some(Boolean);
  useEffect(() => {
    if (!hayError) return;
    abrir(true);
    // Tras abrir, el aviso ya está pintado: se busca el primero del formulario, que es el que toca arreglar.
    const id = requestAnimationFrame(() => {
      const aviso = document.querySelector('[role="alert"]');
      if (aviso) ponerALaVista(aviso);
    });
    return () => cancelAnimationFrame(id);
  }, [hayError, abrir]);
}
