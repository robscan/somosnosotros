"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { Map as MapaGL } from "mapbox-gl";
import { ANILLO_DESDE_MS, avanzar, EN_REPOSO, RETENCION_MS, type Entrada, type PuntoEnMapa } from "@/lib/pulsacionLarga";

/** El menú contextual que algunos teléfonos mandan al sostener llega pegado a nuestro aviso: dos disparos tan juntos son uno. */
const ENTRE_DISPAROS_MS = 1000;

type Opciones = {
  /** El mapa ya existe: solo entonces se le escucha. */
  listo: boolean;
  /** Pasaron `ANILLO_DESDE_MS` y el dedo sigue quieto en ese punto: empieza el anillo que dice «sigue sosteniendo». */
  alAnillo: (punto: PuntoEnMapa) => void;
  /** El anillo se va: se soltó, se movió el dedo o el mapa, o ya hubo pulsación larga. */
  alQuitarAnillo: () => void;
  /** Un dedo quieto `RETENCION_MS` (o el botón derecho del ratón) en ese punto. */
  alLarga: (punto: PuntoEnMapa) => void;
};

/**
 * La pulsación larga sobre el lienzo de un mapa de Mapbox (ajuste del founder, 2026-09-30): le cuenta a la máquina de `@/lib/pulsacionLarga` lo que
 * hacen los dedos (eventos de puntero: sirven igual para el dedo, el lápiz y el ratón) y lo que hace el mapa, y avisa cuándo empieza el anillo y cuándo
 * hubo pulsación larga. Solo mira: nunca frena ni cambia un gesto del mapa (arrastrar, pellizcar, doble toque), así que `dragstart` llega igual que sin ella.
 * - El mapa que empieza a moverse (`dragstart`, `zoomstart`, `rotatestart`, `pitchstart`) la cancela.
 * - Al soltar tras una pulsación larga el navegador manda un `click`: se traga, para que no seleccione ni cierre nada.
 * - En el lienzo no hay menú del sistema. El botón derecho del ratón (`contextmenu`, que Android también manda al sostener) es una pulsación larga al
 *   momento, sin repetirse si el dedo ya la hizo.
 * - Solo cuentan los gestos que empiezan en el lienzo: sostener un botón o la tarjeta que hay encima no es pulsar el mapa.
 */
export function usePulsacionLarga(contenedor: RefObject<HTMLElement | null>, mapa: RefObject<MapaGL | null>, { listo, alAnillo, alQuitarAnillo, alLarga }: Opciones) {
  const ultimas = useRef({ alAnillo, alQuitarAnillo, alLarga });
  useEffect(() => {
    ultimas.current = { alAnillo, alQuitarAnillo, alLarga };
  }, [alAnillo, alQuitarAnillo, alLarga]);

  useEffect(() => {
    const nodo = contenedor.current;
    const m = mapa.current;
    if (!listo || !nodo || !m) return;
    const lienzo = m.getCanvas();
    let estado = EN_REPOSO;
    const dedos = new Set<number>();
    let esperas: number[] = [];
    let ultimoDisparo = -Infinity;
    let tragarClic = false;

    const enElMapa = (e: MouseEvent): PuntoEnMapa => {
      const { left, top } = nodo.getBoundingClientRect();
      return { x: e.clientX - left, y: e.clientY - top };
    };
    function disparar(punto: PuntoEnMapa) {
      const ahora = performance.now();
      if (ahora - ultimoDisparo < ENTRE_DISPAROS_MS) return;
      ultimoDisparo = ahora;
      tragarClic = true;
      ultimas.current.alLarga(punto);
    }
    function entrar(entrada: Entrada) {
      const antes = estado.fase;
      const r = avanzar(estado, entrada);
      estado = r.estado;
      if (antes === "armado" && estado.fase !== "armado") {
        esperas.forEach(window.clearTimeout);
        esperas = [];
        ultimas.current.alQuitarAnillo();
      }
      if (antes !== "armado" && estado.fase === "armado") {
        esperas = [window.setTimeout(() => ultimas.current.alAnillo(estado.ahora), ANILLO_DESDE_MS), window.setTimeout(() => entrar({ tipo: "retencion" }), RETENCION_MS)];
      }
      if (r.larga) disparar(r.larga);
    }

    const alBajar = (e: PointerEvent) => {
      // El botón derecho del ratón es el `contextmenu`; y lo que no empieza en el lienzo (un botón, la tarjeta) no es del mapa.
      if (e.target !== lienzo || (e.pointerType === "mouse" && e.button !== 0)) return;
      tragarClic = false;
      dedos.add(e.pointerId);
      entrar({ tipo: "bajar", t: e.timeStamp, ...enElMapa(e), dedos: dedos.size });
    };
    const alMover = (e: PointerEvent) => {
      if (dedos.has(e.pointerId)) entrar({ tipo: "mover", ...enElMapa(e), dedos: dedos.size });
    };
    const alSubir = (e: PointerEvent) => {
      if (dedos.delete(e.pointerId)) entrar({ tipo: "subir", t: e.timeStamp, dedos: dedos.size });
    };
    const alCancelar = (e: PointerEvent) => {
      if (dedos.delete(e.pointerId)) entrar({ tipo: "cancelar" });
    };
    const alCancelarPorElMapa = () => entrar({ tipo: "cancelar" });
    const alHacerClic = (e: MouseEvent) => {
      if (!tragarClic || e.target !== lienzo) return;
      tragarClic = false;
      e.stopPropagation();
      e.preventDefault();
    };
    const alMenu = (e: MouseEvent) => {
      if (e.target !== lienzo) return;
      e.preventDefault();
      disparar(enElMapa(e));
    };

    nodo.addEventListener("pointerdown", alBajar);
    window.addEventListener("pointermove", alMover);
    window.addEventListener("pointerup", alSubir);
    window.addEventListener("pointercancel", alCancelar);
    nodo.addEventListener("click", alHacerClic, true);
    nodo.addEventListener("contextmenu", alMenu);
    const cancelan = ["dragstart", "zoomstart", "rotatestart", "pitchstart"] as const;
    for (const nombre of cancelan) m.on(nombre, alCancelarPorElMapa);
    return () => {
      nodo.removeEventListener("pointerdown", alBajar);
      window.removeEventListener("pointermove", alMover);
      window.removeEventListener("pointerup", alSubir);
      window.removeEventListener("pointercancel", alCancelar);
      nodo.removeEventListener("click", alHacerClic, true);
      nodo.removeEventListener("contextmenu", alMenu);
      for (const nombre of cancelan) m.off(nombre, alCancelarPorElMapa);
      esperas.forEach(window.clearTimeout);
      ultimas.current.alQuitarAnillo();
    };
  }, [contenedor, mapa, listo]);
}
