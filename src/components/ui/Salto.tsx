"use client";

import { useEffect, type ReactNode } from "react";

/** Baja hasta la sección (respeta su `scroll-margin-top`, como un ancla) y la devuelve; null si no está en la pantalla. */
function bajarA(id: string): HTMLElement | null {
  const destino = document.getElementById(id);
  if (!destino) return null;
  destino.scrollIntoView({ block: "start", behavior: "instant" });
  return destino;
}

/**
 * Salto a una sección de la misma pantalla, como "ver" en las fichas (OL-055). Un ancla normal apilaba una entrada en
 * el historial, y Atrás (botón o gesto) se quedaba en la misma ficha, más arriba. Este baja sin apilar nada y deja el
 * foco en la sección, para quien navega con lector de pantalla o teclado. Si se llega con el ancla en la URL (un enlace
 * viejo o compartido), baja al montar. Sin JavaScript sigue siendo un ancla.
 */
export default function Salto({ destino, className, children }: { destino: string; className?: string; children: ReactNode }) {
  useEffect(() => {
    if (window.location.hash === `#${destino}`) bajarA(destino);
  }, [destino]);

  function saltar(e: React.MouseEvent<HTMLAnchorElement>) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const seccion = bajarA(destino);
    if (!seccion) return;
    e.preventDefault();
    if (!seccion.hasAttribute("tabindex")) {
      seccion.setAttribute("tabindex", "-1");
      // Safari pinta el anillo de foco alrededor de toda la sección tras un toque; no es un control y el salto ya se ve.
      seccion.style.outline = "none";
    }
    seccion.focus({ preventScroll: true });
  }

  return (
    <a href={`#${destino}`} className={className} onClick={saltar}>
      {children}
    </a>
  );
}
