import type { SVGProps } from "react";

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
