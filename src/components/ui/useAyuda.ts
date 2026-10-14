"use client";

import { useCallback, useEffect, useState, useSyncExternalStore, type RefObject } from "react";

/**
 * El mecanismo común del panel de ayuda (OL-402, bitácora 433), a la manera del «Info View» de Ableton Live: cada control de una pantalla lleva
 * solo `data-ayuda="clave"`; un único oyente sobre el contenedor de la pantalla sabe cuál es el último señalado y `<Ayuda>` enseña su entrada del
 * diccionario. Con ratón (o teclado) basta pasar por encima; en el teléfono, donde no hay «pasar por encima», la ⓘ enciende un «modo ayuda»:
 * mientras está encendido, tocar un control lo explica en vez de usarlo. Sin pulsación larga (en Safari de iPhone choca con la vista previa de
 * los enlaces y con la selección de texto). Este archivo no sabe nada de ninguna pantalla en particular.
 */

/** Lo que dice el panel de un control: su nombre y qué es y para qué sirve (dos o tres líneas). Si hay más que contar, `detalle` (solo en el
 *  manual) y, con él, `manual`: el ancla de su sección. */
export type EntradaAyuda = { titulo: string; texto: string; detalle?: string; manual?: string };
/** El diccionario de una pantalla: clave de `data-ayuda` → su entrada. */
export type DiccionarioAyuda = Record<string, EntradaAyuda>;

/** La clave del control más cercano al blanco (él mismo o el primer ancestro con `data-ayuda`), o null si ninguno la lleva. Lógica pura. */
export function claveDe(blanco: EventTarget | null): string | null {
  const e = blanco as Pick<Element, "closest"> | null;
  if (!e || typeof e.closest !== "function") return null;
  return e.closest("[data-ayuda]")?.getAttribute("data-ayuda") || null;
}

/** ¿El blanco está dentro del propio panel? Sus botones y enlaces nunca se explican: se usan. */
export function dentroDelPanel(blanco: EventTarget | null): boolean {
  const e = blanco as Pick<Element, "closest"> | null;
  return !!e && typeof e.closest === "function" && !!e.closest("[data-ayuda-panel]");
}

const CON_RATON = "(hover: hover)";

/** Si el aparato tiene ratón (puede pasar por encima de un control) o solo dedo. */
function suscribirRaton(avisar: () => void) {
  const consulta = window.matchMedia(CON_RATON);
  consulta.addEventListener("change", avisar);
  return () => consulta.removeEventListener("change", avisar);
}
const sinRaton = () => !window.matchMedia(CON_RATON).matches;

/** Lo recordado en `localStorage` (y, si no hay almacenamiento, en memoria mientras la página siga abierta). */
const enMemoria = new Map<string, string>();
const oyentes = new Set<() => void>();
function suscribirAlmacen(avisar: () => void) {
  oyentes.add(avisar);
  window.addEventListener("storage", avisar);
  return () => {
    oyentes.delete(avisar);
    window.removeEventListener("storage", avisar);
  };
}
function leerRecuerdo(memoria?: string): string | null {
  if (!memoria) return null;
  const m = enMemoria.get(memoria);
  if (m) return m;
  try {
    return localStorage.getItem(memoria);
  } catch {
    return null; // sin almacenamiento (modo privado, bloqueado): se queda el valor por omisión
  }
}
function guardarRecuerdo(memoria: string, valor: string) {
  enMemoria.set(memoria, valor);
  try {
    localStorage.setItem(memoria, valor);
  } catch {
    // sin almacenamiento: no se recuerda más allá de esta página y no pasa nada
  }
  oyentes.forEach((f) => f());
}

/**
 * El único oyente de la pantalla. `raiz` es su contenedor (los controles se buscan por delegación, así los que el motor repinta también
 * cuentan). `memoria` es la clave de `localStorage` donde se recuerda si el panel está abierto, solo donde hay ratón: en el teléfono abierto es
 * «modo ayuda» (los toques explican) y recordarlo dejaría la pantalla sin responder al abrirla, así que ahí siempre empieza plegado. En el
 * servidor y al hidratar el panel está plegado (no se sabe aún qué aparato es): con ratón se abre en cuanto la página está lista.
 * Devuelve la clave señalada, si el panel está abierto, si el aparato es táctil (sin ratón) y el interruptor del panel.
 */
export function useAyuda(raiz: RefObject<HTMLElement | null>, memoria?: string) {
  const [clave, setClave] = useState<string | null>(null);
  const [abiertoTactil, setAbiertoTactil] = useState(false);
  const tactil = useSyncExternalStore(suscribirRaton, sinRaton, () => false);
  const recuerdo = useSyncExternalStore(suscribirAlmacen, () => leerRecuerdo(memoria), () => "plegado");
  const abierto = tactil ? abiertoTactil : recuerdo !== "plegado";

  const modo = tactil && abierto;

  // El oyente: pasar por encima y el foco cambian la clave; en el modo ayuda, además, los toques sobre un control con clave no llegan a él
  useEffect(() => {
    const nodo = raiz.current;
    if (!nodo) return;
    const señalar = (ev: Event) => {
      if (ev.type === "pointerover" && (ev as PointerEvent).pointerType === "touch") return;
      const k = claveDe(ev.target);
      if (k) setClave(k);
    };
    nodo.addEventListener("pointerover", señalar);
    nodo.addEventListener("focusin", señalar);
    const explicar = (ev: Event) => {
      if (dentroDelPanel(ev.target)) return;
      const k = claveDe(ev.target);
      if (!k) return;
      ev.preventDefault();
      ev.stopPropagation();
      setClave(k);
    };
    const tipos = ["pointerdown", "pointerup", "click"];
    if (modo) {
      nodo.setAttribute("data-modo-ayuda", "true");
      for (const tipo of tipos) nodo.addEventListener(tipo, explicar, true);
    }
    return () => {
      nodo.removeEventListener("pointerover", señalar);
      nodo.removeEventListener("focusin", señalar);
      for (const tipo of tipos) nodo.removeEventListener(tipo, explicar, true);
      nodo.removeAttribute("data-modo-ayuda");
    };
  }, [raiz, modo]);

  const alternar = useCallback(() => {
    if (tactil) setAbiertoTactil(!abierto);
    else if (memoria) guardarRecuerdo(memoria, abierto ? "plegado" : "abierto");
  }, [abierto, tactil, memoria]);

  return { clave, abierto, tactil, modo, alternar };
}
