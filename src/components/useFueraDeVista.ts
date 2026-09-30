"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { resultadosPerdidos } from "@/lib/mapa";

/** Lo que este hook pide del mapa (el de Mapbox lo cumple): llevar un punto a la pantalla, su caja, si se está moviendo y avisar cuándo termina de moverse. */
export type MapaMedible = {
  project: (lngLat: [number, number]) => { x: number; y: number };
  getContainer: () => { clientWidth: number; clientHeight: number };
  isMoving: () => boolean;
  on: (evento: "moveend", alAvisar: () => void) => unknown;
  off: (evento: "moveend", alAvisar: () => void) => unknown;
};

/**
 * Cuánto se espera antes de revisar si cambiaron los lugares o la hoja sin que el mapa se haya movido (ms): lo que la hoja tarda en asentarse y
 * la cámara en arrancar tras un filtro o una ficha. Si para entonces el mapa se mueve, no se revisa: lo hará su `moveend`.
 */
const ESPERA_MS = 400;

/**
 * Avisa cuando ninguno de los `puntos` cae en lo que se ve del mapa (su caja menos lo que tapa la hoja por abajo: `resultadosPerdidos`) y cuando
 * vuelve alguno (founder, 2026-09-30: el control de encuadre aparece «cuando los resultados en el mapa estén fuera del view port»). Se revisa al
 * terminar de moverse el mapa, nunca por cuadro, y cuando cambian los puntos o la altura de la hoja sin que el mapa se mueva. `alCambiar` solo se
 * llama cuando cambia la respuesta.
 */
export function useFueraDeVista(mapa: RefObject<MapaMedible | null>, listo: boolean, puntos: { lat: number; lng: number }[], tapaAbajo: number, alCambiar?: (fuera: boolean) => void) {
  const fuera = useRef(false);
  const alCambiarActual = useRef(alCambiar);
  useLayoutEffect(() => {
    alCambiarActual.current = alCambiar;
  });

  useEffect(() => {
    const m = mapa.current;
    if (!listo || !m) return;
    let espera = 0;
    const revisar = () => {
      window.clearTimeout(espera);
      const caja = m.getContainer();
      const perdidos = resultadosPerdidos(puntos.map((p) => m.project([p.lng, p.lat])), { ancho: caja.clientWidth, alto: caja.clientHeight }, tapaAbajo);
      if (perdidos === fuera.current) return;
      fuera.current = perdidos;
      alCambiarActual.current?.(perdidos);
    };
    m.on("moveend", revisar);
    // Cambiaron los puntos o la hoja: se revisa pasada la espera, si el mapa está quieto (si se mueve, el `moveend` lo hará).
    espera = window.setTimeout(() => m.isMoving() || revisar(), ESPERA_MS);
    return () => {
      window.clearTimeout(espera);
      m.off("moveend", revisar);
    };
  }, [mapa, listo, puntos, tapaAbajo]);
}
