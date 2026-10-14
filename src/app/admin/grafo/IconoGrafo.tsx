import type { SVGProps } from "react";

/** Dos flechas en círculo: volver a leer la base («Actualizar»). */
export function IconoActualizar(p: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
      <path d="M19.5 12a7.5 7.5 0 0 0-13-5.1L5 8.5" />
      <path d="M5 4.5v4h4" />
      <path d="M4.5 12a7.5 7.5 0 0 0 13 5.1l1.5-1.6" />
      <path d="M19 19.5v-4h-4" />
    </svg>
  );
}

/** El grafo: tres nodos unidos por líneas (24×24, trazo del color del texto, como los iconos de la app). */
export default function IconoGrafo(p: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
      <circle cx="6" cy="7" r="2.4" />
      <circle cx="18" cy="6" r="2.4" />
      <circle cx="12" cy="18" r="2.4" />
      <path d="M8.2 8.2l2.4 7.6M16.2 7.9l-3 8M8.4 6.8l7.2-.6" />
    </svg>
  );
}
