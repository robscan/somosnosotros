import type { SVGProps } from "react";

/** Iconos de trazo de la app (24×24, color del texto donde se usen). Sin librería: son pocos y estables. */
type P = SVGProps<SVGSVGElement>;
const base = (p: P): P => ({ viewBox: "0 0 24 24", width: 24, height: 24, fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, ...p });

export const IconoReloj = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);
export const IconoPin = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 21s-6-5.2-6-10a6 6 0 0 1 12 0c0 4.8-6 10-6 10z" />
    <circle cx="12" cy="11" r="2.2" />
  </svg>
);
export const IconoPersonas = (p: P) => (
  <svg {...base(p)}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
    <circle cx="16.5" cy="9" r="2.6" />
    <path d="M15.5 14.2a4.5 4.5 0 0 1 5 4.3" />
  </svg>
);
export const IconoBoleto = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h11A2.5 2.5 0 0 1 20 8.5v1a2.5 2.5 0 0 0 0 5v1a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 15.5v-1a2.5 2.5 0 0 0 0-5z" />
    <path d="M13 8v8" strokeDasharray="2 2" />
  </svg>
);
export const IconoCalendario = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);
export const IconoEstrella = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.4 6.8 19.2l1-5.9L3.5 9.2l5.9-.8z" />
  </svg>
);
export const IconoCaret = (p: P) => (
  <svg {...base({ strokeWidth: 2, ...p })}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);
export const IconoLista = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
  </svg>
);
export const IconoMapa = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" />
    <path d="M9 4v14M15 6v14" />
  </svg>
);
