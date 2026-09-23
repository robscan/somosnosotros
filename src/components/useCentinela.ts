"use client";

import { useEffect, useRef } from "react";

/**
 * El centinela de una lista con carga progresiva (OL-158, bitácora 193): un `<div>` vacío al final de la tanda
 * mostrada; en cuanto entra en la ventana (`IntersectionObserver`, con 600px de margen — antes de que la persona
 * llegue al final, para cuando lo ve ya está) llama `alLlegar`. Sin `IntersectionObserver` (navegador viejo, o en
 * las pruebas) no observa nada: la pantalla debe dejar "Ver más" como respaldo (ver `ui/CargarMas`). El estado de
 * cuántos van mostrados vive en cada pantalla (junto con su memoria de pantalla), no aquí: esto solo mira el scroll.
 */
export function useCentinela(activo: boolean, alLlegar: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  const alLlegarRef = useRef(alLlegar);
  useEffect(() => {
    alLlegarRef.current = alLlegar;
  });
  useEffect(() => {
    const nodo = ref.current;
    if (!nodo || !activo || typeof IntersectionObserver === "undefined") return;
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) alLlegarRef.current();
      },
      { rootMargin: "600px" },
    );
    observador.observe(nodo);
    return () => observador.disconnect();
  }, [activo]);
  return ref;
}
