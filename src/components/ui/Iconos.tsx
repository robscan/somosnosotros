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
export const IconoCampana = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </svg>
);
export const IconoTelefono = (p: P) => (
  <svg {...base(p)}>
    <rect x="7" y="2.5" width="10" height="19" rx="2" />
    <path d="M10.5 18h3" />
  </svg>
);
export const IconoPersona = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </svg>
);
export const IconoEtiqueta = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 12V4h8l10 10-8 8z" />
    <circle cx="7.5" cy="8.5" r="1.2" fill="currentColor" />
  </svg>
);
export const IconoEngrane = (p: P) => (
  <svg {...base(p)}>
    <path d="M10.3 3h3.4l.5 2.3a7 7 0 0 1 1.9 1.1l2.2-.8 1.7 3-1.8 1.5a7 7 0 0 1 0 2.2l1.8 1.5-1.7 3-2.2-.8a7 7 0 0 1-1.9 1.1l-.5 2.3h-3.4l-.5-2.3a7 7 0 0 1-1.9-1.1l-2.2.8-1.7-3 1.8-1.5a7 7 0 0 1 0-2.2L4 8.6l1.7-3 2.2.8a7 7 0 0 1 1.9-1.1z" />
    <circle cx="12" cy="12" r="2.6" />
  </svg>
);
export const IconoLapiz = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 20l4.5-1 10-10-3.5-3.5-10 10z" />
    <path d="M13 7.5l3.5 3.5" />
  </svg>
);
export const IconoOjo = (p: P) => (
  <svg {...base(p)}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
export const IconoSalir = (p: P) => (
  <svg {...base(p)}>
    <path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5M14 8l4 4-4 4M8 12h10" />
  </svg>
);
export const IconoEscudo = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
  </svg>
);
/** Llave inglesa: entrada a Administración desde la cabecera y desde Ajustes (OL-133, decisión del founder). */
export const IconoHerramientas = (p: P) => (
  <svg {...base(p)}>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z" />
  </svg>
);
export const IconoLibro = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z" />
  </svg>
);
export const IconoChevronDerecha = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 6l6 6-6 6" />
  </svg>
);
export const IconoCorreo = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 6 9-6" />
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
export const IconoPinMas = (p: P) => (
  <svg {...base({ strokeWidth: 1.9, ...p })}>
    <path d="M12 21s-6-5.2-6-10a6 6 0 0 1 12 0c0 4.8-6 10-6 10z" />
    <path d="M12 8.5v5M9.5 11h5" />
  </svg>
);
export const IconoUbicacion = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    <circle cx="12" cy="12" r="8" />
  </svg>
);
export const IconoRuta = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3l9 9-9 9-9-9z" />
    <path d="M9.5 13.5v-2h5l-1.8-1.8M14.5 11.5l-1.8 1.8" />
  </svg>
);
export const IconoCompartir = (p: P) => (
  <svg {...base({ strokeWidth: 1.9, ...p })}>
    <path d="M12 3v12M8 7l4-4 4 4" />
    <path d="M6 11v8.5A1.5 1.5 0 0 0 7.5 21h9a1.5 1.5 0 0 0 1.5-1.5V11" />
  </svg>
);
export const IconoInstagram = (p: P) => (
  <svg {...base(p)}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="3.8" />
    <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
  </svg>
);
export const IconoFacebook = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M13.5 20.5v-7h2.3l.4-2.8h-2.7V9c0-.8.3-1.4 1.4-1.4h1.4V5.2c-.3 0-1.1-.1-2-.1-2 0-3.4 1.2-3.4 3.5v2.1H8.6v2.8h2.3v7" />
  </svg>
);
export const IconoWhatsApp = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 20l1.3-3.8A8 8 0 1 1 8 19.2z" />
    <path d="M9.5 9.5c0 3 2 5 5 5l1-1.5-1.8-.8-.7.7c-.9-.4-1.5-1-1.9-1.9l.7-.7-.8-1.8z" fill="currentColor" stroke="none" />
  </svg>
);
export const IconoSitio = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c3 3 3 14 0 17M12 3.5c-3 3-3 14 0 17" />
  </svg>
);
export const IconoPuntos = (p: P) => (
  <svg {...base({ fill: "currentColor", stroke: "none", ...p })}>
    <circle cx="5" cy="12" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="19" cy="12" r="1.8" />
  </svg>
);
export const IconoEstrellaMas = (p: P) => (
  <svg {...base({ strokeWidth: 1.9, ...p })}>
    <path d="M10 3l2.2 4.6 5 .7-3.6 3.5.9 5L10 14.4l-4.5 2.4.9-5L2.8 8.3l5-.7z" />
    <path d="M19 13v6M16 16h6" />
  </svg>
);
export const IconoNota = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 18V6l10-2v12" />
    <circle cx="6.5" cy="18" r="2.5" />
    <circle cx="16.5" cy="16" r="2.5" />
  </svg>
);
export const IconoMascara = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 5c2.5 1 13.5 1 16 0v7a8 8 0 0 1-16 0z" />
    <path d="M8.5 10.5h2M13.5 10.5h2M9 15c1.5 1.5 4.5 1.5 6 0" />
  </svg>
);
export const IconoPincel = (p: P) => (
  <svg {...base(p)}>
    <path d="M20 4l-9 9M11 13l-1.5 1.5a3 3 0 1 1-4-4L7 9" />
    <path d="M4 20c2 0 3-1 3-3" />
  </svg>
);
export const IconoPluma = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 20c0-8 6-14 16-16-2 10-8 16-16 16z" />
    <path d="M4 20L14 10" />
  </svg>
);
export const IconoBuscar = (p: P) => (
  <svg {...base({ strokeWidth: 2, ...p })}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4 4" />
  </svg>
);
export const IconoYouTube = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="6" width="18" height="12" rx="4" />
    <path d="M10 9.5v5l4.5-2.5z" fill="currentColor" stroke="none" />
  </svg>
);
export const IconoSpotify = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M7.5 9.5c3-1 6.5-.8 9.5.8M8 12.5c2.5-.8 5.3-.6 7.5.6M8.5 15.3c2-.6 4-.5 5.8.4" />
  </svg>
);
export const IconoTikTok = (p: P) => (
  <svg {...base(p)}>
    <path d="M13.5 4v10.2a3.2 3.2 0 1 1-3.2-3.2" />
    <path d="M13.5 4c.4 2.6 2.1 4.2 4.5 4.4" />
  </svg>
);
export const IconoVimeo = (p: P) => (
  <svg {...base(p)}>
    <path d="M3.5 9.5l1.5-1.2c1.2-1 2 .2 2.4 1.4l1.6 5.6c.5 1.7 1.4 1.6 2.6.2 2.4-2.8 4.3-5.4 4.4-7.2.1-2-1.4-2-2.9-1 .8-2.8 2.7-4 4.9-3.6 2.6.5 2.6 3.3 1 6.1-2.4 4.3-5.4 8.2-7.9 8.7-1.9.4-2.7-1.2-3.3-3.1L6 10.2c-.4-1.3-.9-1.6-2.5-.7z" />
  </svg>
);
export const IconoSoundCloud = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 14.5v2M5.5 12.5v4M8 11v5.5M10.5 9.5v7" />
    <path d="M13 8.5a4 4 0 0 1 6.8 2.6A2.8 2.8 0 0 1 19 16.5h-6z" />
  </svg>
);
export const IconoBandcamp = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 6h12l-6 12H3z" />
  </svg>
);
export const IconoAppleMusic = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 17V7l10-2v10" />
    <circle cx="6.5" cy="17" r="2.5" />
    <circle cx="16.5" cy="15" r="2.5" />
    <path d="M9 10l10-2" />
  </svg>
);
export const IconoX = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 4l16 16M20 4L4 20" />
  </svg>
);
export const IconoThreads = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 21c-4.5 0-7.5-3.5-7.5-9S7.5 3 12 3c3.6 0 6 2 6.8 5" />
    <path d="M9 13.5c0-1.8 1.6-3 3.5-3 2.6 0 4 1.5 4 3.7 0 2.5-1.8 4-4.2 4-1.9 0-3.3-1-3.3-2.5s1.4-2.3 3.2-2.3c1.1 0 2 .2 2.8.6" />
  </svg>
);
export const IconoLinktree = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3v18M6 8l6 4 6-4M6 14l6 4 6-4" />
  </svg>
);
export const IconoEnlace = (p: P) => (
  <svg {...base(p)}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.5 1.5" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5" />
  </svg>
);
export const IconoChevronIzquierda = (p: P) => (
  <svg {...base({ strokeWidth: 2, ...p })}>
    <path d="M14.5 6l-6 6 6 6" />
  </svg>
);
export const IconoArriba = (p: P) => (
  <svg {...base({ strokeWidth: 2, ...p })}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </svg>
);
export const IconoCerrar = (p: P) => (
  <svg {...base({ strokeWidth: 2, ...p })}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const IconoCalendarioMas = (p: P) => (
  <svg {...base({ strokeWidth: 1.9, ...p })}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4M12 12.5v5M9.5 15h5" />
  </svg>
);
/** Agregar a mi calendario: el + en la esquina (convención de Apple y Google), distinto del + al centro de Publicar evento. */
export const IconoCalendarioAgregar = (p: P) => (
  <svg {...base(p)}>
    <path d="M20 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7.5" />
    <path d="M3 10h17M8 3v4M15 3v4M18 15v6M15 18h6" />
  </svg>
);
/** Algo pendiente o que no se pudo: círculo punteado con el signo (lo provisional se ve provisional). */
export const IconoPendiente = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" strokeDasharray="3 2.6" />
    <path d="M12 8v4.5" />
    <circle cx="12" cy="15.8" r="0.6" fill="currentColor" />
  </svg>
);
/** Instalar la app en el teléfono: el teléfono con la flecha que entra. */
export const IconoInstalar = (p: P) => (
  <svg {...base(p)}>
    <rect x="7" y="2.5" width="10" height="19" rx="2" />
    <path d="M12 7v7M9.2 11.3L12 14l2.8-2.7" />
  </svg>
);
export const IconoComputadora = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="4.5" width="18" height="12" rx="1.5" />
    <path d="M8 20h8M12 16.5V20" />
  </svg>
);
/** Instalar la app en la computadora: la pantalla con la flecha que entra. */
export const IconoInstalarComputadora = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="4.5" width="18" height="12" rx="1.5" />
    <path d="M8 20h8M12 7.5v5.5M9.5 10.8L12 13.2l2.5-2.4" />
  </svg>
);
export const IconoMas = (p: P) => (
  <svg {...base({ strokeWidth: 2.2, ...p })}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const IconoOk = (p: P) => (
  <svg {...base({ strokeWidth: 2.2, ...p })}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);
export const IconoCamara = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
    <circle cx="12" cy="13" r="3.2" />
  </svg>
);
export const IconoCandado = (p: P) => (
  <svg {...base(p)}>
    <rect x="5" y="10.5" width="14" height="10" rx="2" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </svg>
);
export const IconoCasa = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 11l8-7 8 7v9H4z" />
    <path d="M10 20v-6h4v6" />
  </svg>
);
export const IconoTexto = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 7h14M5 12h14M5 17h9" />
  </svg>
);
/** Bandera: un reporte (a diferencia de un reclamo, que lleva la persona). */
export const IconoBandera = (p: P) => (
  <svg {...base(p)}>
    <path d="M5.5 21V4" />
    <path d="M5.5 4.5h11l-2.2 4 2.2 4h-11" />
  </svg>
);
/** Ojo tachado: ocultar una ficha. */
export const IconoOjoTachado = (p: P) => (
  <svg {...base(p)}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
    <path d="M4 4l16 16" />
  </svg>
);
/** Destello de cuatro puntas: destacar una ficha (docs/rediseno/20); la estrella ya es «Me interesa» y Artistas. */
export const IconoDestello = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3.5c.7 4.6 3.4 7.3 8 8-4.6.7-7.3 3.4-8 8-.7-4.6-3.4-7.3-8-8 4.6-.7 7.3-3.4 8-8z" />
  </svg>
);
