"use client";

import { useEffect, type RefObject } from "react";
import { ESCRIBIBLE } from "./useCampoVisible";

/** Lo que tiene que moverse el dedo desde donde tocó para que sea un arrastre y no un toque con temblor (px): tocar un resultado lo abre. */
const ARRASTRE = 10;
/** Lo que tiene que desplazarse la página (o la lista bajo el dedo) cuando el dedo empezó sobre el propio campo (px). */
const DESPLAZAMIENTO = 24;

type Gesto = { x: number; y: number; enElCampo: boolean; posiciones: () => number[]; inicio: number[] };

/**
 * Desplazar esconde el teclado (OL-421; founder, 2026-10-19: «si usuario hace scroll entonces se debería de ver el contenido y ocultar
 * teclados»). Mientras un campo de texto tiene el foco y el teclado está abierto, un arrastre del dedo fuera del campo (más de `ARRASTRE`
 * px), o un desplazamiento de la página o de la lista de más de `DESPLAZAMIENTO` px con el dedo puesto en el campo, le quita el foco al
 * campo, y con él se va el teclado: es lo que hacen las búsquedas del iPhone. Un toque fuera del campo que Safari cancela (`touchcancel`,
 * lo que hace a veces al empezar a desplazar una lista con desplazamiento propio) cuenta como arrastre. Mover el cursor dentro del campo
 * (mantener y arrastrar) no desplaza nada y no lo cierra; un toque sobre un resultado tampoco (no llega a ser arrastre).
 *
 * «El teclado está abierto» es `data-teclado` en `<html>`, la medida única de `ui/useCampoVisible` (Safari, la web instalada y la app de la
 * tienda): sin teclado no hace nada (un campo con `autoFocus` que iOS no abrió, o un teclado físico). En Android, donde el teclado encoge la
 * ventana (`interactive-widget=resizes-content`), `useCampoVisible` no pone `data-teclado` y este gancho no actúa (por confirmar con el
 * teléfono de pruebas).
 *
 * Lo usan las pantallas con un campo arriba y una lista debajo: Buscar, el buscador de Administración (`ui/Buscador`), el nombre de las altas
 * de lugar y de artista y `ui/Hoja` (con `zona`: solo los toques dentro de la hoja). Solo escucha toques: con ratón o con el panel táctil de
 * una computadora no hace nada. Nunca `pointerleave` (Safari táctil lo dispara en el primer movimiento del dedo).
 */
export default function useTecladoSeSueltaAlDesplazar(zona?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const raiz = document.documentElement;
    let gesto: Gesto | null = null;
    /** El campo enfocado, solo con el teclado abierto. */
    const campoConTeclado = () => {
      const activo = document.activeElement;
      return raiz.hasAttribute("data-teclado") && activo instanceof HTMLElement && activo.matches(ESCRIBIBLE) ? activo : null;
    };
    const soltar = () => {
      gesto = null;
      campoConTeclado()?.blur();
    };
    const alTocar = (e: TouchEvent) => {
      gesto = null;
      const campo = campoConTeclado();
      const donde = e.target instanceof Node ? e.target : null;
      if (!campo || !donde || e.touches.length !== 1) return;
      if (zona && !zona.current?.contains(donde)) return;
      // Lo que se desplaza bajo el dedo; si es el propio campo (un área de texto larga que se recorre), no cuenta: es leer lo que se escribe.
      const bajoElDedo = desplazableDe(donde);
      const lista = bajoElDedo === campo ? null : bajoElDedo;
      const vv = window.visualViewport;
      // La página, el área visible (con el teclado, Safari desplaza primero el área) y la lista que se desplaza por su cuenta bajo el dedo.
      const posiciones = () => [window.scrollY, vv?.pageTop ?? 0, lista?.scrollTop ?? 0];
      const t = e.touches[0];
      // El campo es lo que se ve como campo: su etiqueta con la lupa y la ✕ si la tiene.
      const enElCampo = (campo.closest("label") ?? campo).contains(donde);
      gesto = { x: t.clientX, y: t.clientY, enElCampo, posiciones, inicio: posiciones() };
    };
    const alMover = (e: TouchEvent) => {
      if (!gesto || gesto.enElCampo) return;
      const t = e.touches[0];
      if (t && Math.hypot(t.clientX - gesto.x, t.clientY - gesto.y) > ARRASTRE) soltar();
    };
    const alDesplazar = () => {
      if (!gesto) return;
      const { inicio } = gesto;
      if (gesto.posiciones().some((p, i) => Math.abs(p - inicio[i]) > DESPLAZAMIENTO)) soltar();
    };
    const alLevantar = (e: TouchEvent) => {
      if (e.touches.length === 0) gesto = null;
    };
    // Safari a veces le quita el toque a la página en cuanto empieza a desplazar una lista con su propio desplazamiento (la lista flotante
    // de candidatos): manda `touchcancel` sin llegar a mandar movimientos (medido en el simulador, bitácora 454). Un toque cancelado que
    // empezó fuera del campo es un arrastre; uno que empezó en el campo (mantener para mover el cursor) no.
    const alCancelar = (e: TouchEvent) => {
      if (gesto && !gesto.enElCampo) soltar();
      else alLevantar(e);
    };
    const opciones = { capture: true, passive: true } as const;
    document.addEventListener("touchstart", alTocar, opciones);
    document.addEventListener("touchmove", alMover, opciones);
    document.addEventListener("scroll", alDesplazar, opciones);
    window.visualViewport?.addEventListener("scroll", alDesplazar);
    window.addEventListener("touchend", alLevantar, opciones);
    window.addEventListener("touchcancel", alCancelar, opciones);
    return () => {
      document.removeEventListener("touchstart", alTocar, opciones);
      document.removeEventListener("touchmove", alMover, opciones);
      document.removeEventListener("scroll", alDesplazar, opciones);
      window.visualViewport?.removeEventListener("scroll", alDesplazar);
      window.removeEventListener("touchend", alLevantar, opciones);
      window.removeEventListener("touchcancel", alCancelar, opciones);
    };
  }, [zona]);
}

/** El ancestro más cercano que se desplaza por su cuenta (una lista flotante, el cuerpo de una hoja); null si lo que se desplaza es la página. */
function desplazableDe(nodo: Node): HTMLElement | null {
  for (let el = nodo instanceof HTMLElement ? nodo : nodo.parentElement; el && el !== document.documentElement && el !== document.body; el = el.parentElement) {
    const { overflowY } = getComputedStyle(el);
    if ((overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight) return el;
  }
  return null;
}
