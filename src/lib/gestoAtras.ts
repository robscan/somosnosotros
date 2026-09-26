/**
 * El gesto nativo de deslizar desde el borde izquierdo para volver (OL-205, auditoría OL-202 §3.3,
 * docs/rediseno/48-shell-ios.md): encenderlo tal cual (`allowsBackForwardNavigationGestures` del WKWebView)
 * dispara el `WKBackForwardList` nativo de iOS, que no conoce la marca propia del historial (`lib/historial.ts`,
 * "filtrar no es navegar"; un `goBack()` a secas podría volver a una entrada de filtro que la app apiló, o no volver
 * nada si esa marca vive solo en `sessionStorage`). Por eso `MainViewController.swift` sí enciende el gesto (para
 * que el dedo lo sienta), pero un plugin propio (`GestoAtrasPlugin.swift`) cancela esa navegación nativa y avisa
 * aquí; la app ejecuta entonces la misma función que ya usa el botón "Atrás" o la ✕ visibles (`ui/Atras.tsx`,
 * `useVolver`), nunca un `history.back()` a secas.
 *
 * Quien esté visible en pantalla (Atrás o Cerrar; `Barra.tsx` solo pinta uno de los dos a la vez) se registra al
 * montarse y se da de baja al desmontarse. Sin nadie registrado (una pantalla raíz sin regreso: Agenda, Lugares,
 * Artistas) el gesto no hace nada — igual que en cualquier app nativa en la raíz de una pestaña, donde deslizar
 * tampoco tiene a dónde volver.
 */
export type RegistroVolver = {
  /** Atrás/Cerrar lo llama al montarse. Devuelve cómo darse de baja (si otro ya tomó el lugar, no lo pisa). */
  registrar: (fn: () => void) => () => void;
  /** Lo llama el aviso del gesto nativo. true si había alguien registrado a quien avisar. */
  disparar: () => boolean;
};

export function crearRegistroVolver(): RegistroVolver {
  let actual: (() => void) | null = null;
  return {
    registrar(fn) {
      actual = fn;
      return () => {
        if (actual === fn) actual = null;
      };
    },
    disparar() {
      if (!actual) return false;
      actual();
      return true;
    },
  };
}
