"use client";

import { useLayoutEffect, useRef } from "react";
import { cortarEnPalabra } from "@/lib/tarjetaInicio";

/** Los textos que se ven, con su texto entero, para volver a cortarlos cuando llega la letra o cambia su ancho. */
const textos = new Map<HTMLElement, string>();
const anchos = new WeakMap<HTMLElement, number>();
let escuchando = false;

/**
 * Corta un texto en la última palabra entera que deja que quepa en las líneas que le da su CSS (`max-height`; `cortarEnPalabra`), midiéndolo en su
 * sitio como el prototipo: el título de una tarjeta de evento de Inicio (tres líneas, OL-382, T2) y el nombre bajo un avatar (dos líneas, OL-382,
 * N). El texto lo pinta React entero (y así llega del servidor y se hidrata); aquí solo se cambia el texto del nodo, que React no vuelve a tocar
 * mientras el texto no cambie. Se corta antes de pintar (`useLayoutEffect`), y otra vez al terminar de cargar la letra o al cambiar el ancho de la
 * tarjeta (desde 1048 crece).
 */
export function useTextoEnPalabra<T extends HTMLElement = HTMLElement>(completo: string) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    escuchar();
    textos.set(el, completo);
    recortar(el, completo);
    return () => {
      textos.delete(el);
    };
  }, [completo]);
  return ref;
}

function recortar(el: HTMLElement, completo: string) {
  const linea = parseFloat(getComputedStyle(el).lineHeight) || 16;
  const cabe = (texto: string) => {
    if (el.textContent !== texto) el.textContent = texto;
    // Esconde media línea o más: el corte esconde una entera, y las letras asoman 1 o 2 px de su renglón sin que falte nada.
    return el.scrollHeight - el.clientHeight <= linea / 2;
  };
  // `cortarEnPalabra` deja en el nodo el último texto que probó, que es el que devuelve.
  cortarEnPalabra(completo, cabe);
  anchos.set(el, el.clientWidth);
}

function escuchar() {
  if (escuchando) return;
  escuchando = true;
  const todos = () => textos.forEach((completo, el) => recortar(el, completo));
  document.fonts.ready.then(todos);
  document.fonts.addEventListener("loadingdone", todos);
  window.addEventListener("resize", () => {
    textos.forEach((completo, el) => {
      if (el.clientWidth !== anchos.get(el)) recortar(el, completo);
    });
  });
}
