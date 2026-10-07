import { useLayoutEffect, useRef } from "react";

/**
 * Sube un aviso flotante sobre la pastilla flotante de la pantalla, si hay una a la vista (la de «Me interesa · Voy» o «Seguir» de una ficha,
 * marcada con `data-flotantes`): se mide al salir, donde la pastilla está en ese momento. Devuelve la `ref` que va en el aviso. Sin pastilla (o
 * recogida: `visibility: hidden`) no toca nada y el aviso queda donde lo pone su CSS (sobre la navegación o sobre el pie del paso). Lo comparten
 * `Hecho` (con Deshacer) y `ui/Confirmacion` (OL-318).
 */
export default function useSobreLaPastilla<T extends HTMLElement>() {
  const aviso = useRef<T>(null);
  useLayoutEffect(() => {
    const pastilla = document.querySelector("[data-flotantes]");
    if (!pastilla || getComputedStyle(pastilla).visibility === "hidden") return;
    const { top } = pastilla.getBoundingClientRect();
    if (top < window.innerHeight) aviso.current!.style.bottom = `calc(${window.innerHeight - top}px + var(--espacio-3))`;
  }, []);
  return aviso;
}
