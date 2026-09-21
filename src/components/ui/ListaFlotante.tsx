"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import estilos from "./ListaFlotante.module.css";

type Rect = { left: number; top: number; bottom: number; width: number };
export type PosicionFlotante = { left: number; top?: number; bottom?: number; width: number; maxHeight: number };

/**
 * La cuenta de dónde poner la lista, pura y sin DOM (para poder probarla sin navegador): dado el rectángulo del
 * campo, el alto visible de verdad (con el teclado, `visualViewport` mide menos que la ventana) y el alto de la
 * ventana completa (`position: fixed` con `bottom` se mide desde ahí, no desde el área visible), decide si abre
 * hacia abajo o hacia arriba y cuánto alto máximo le cabe.
 */
export function calcularPosicion(campo: Rect, altoVisible: number, offsetTopVisible: number, altoVentana: number): PosicionFlotante {
  const espacioAbajo = altoVisible - campo.bottom - 8;
  const espacioArriba = campo.top - offsetTopVisible - 8;
  // Si no cabe abajo pero sí arriba, se abre hacia arriba (nunca tapada por el teclado ni cortada).
  const haciaArriba = espacioAbajo < 120 && espacioArriba > espacioAbajo;
  return {
    left: campo.left,
    top: haciaArriba ? undefined : campo.bottom + 4,
    bottom: haciaArriba ? altoVentana - campo.top + 4 : undefined,
    width: campo.width,
    maxHeight: Math.max(100, Math.min(260, haciaArriba ? espacioArriba : espacioAbajo)),
  };
}

type Props = {
  abierta: boolean;
  onCerrar: () => void;
  /** El campo bajo el que flota (la lupa, no un contenedor de más): de ahí sale su posición y ancho. */
  ancla: RefObject<HTMLElement | null>;
  /** Para `aria-controls` en el campo y el `id` del propio listbox. */
  id: string;
  etiqueta: string;
  children: React.ReactNode;
};

/**
 * Lista de sugerencias que flota sobre el layout, anclada al campo de búsqueda: nunca empuja el mapa ni los
 * campos de abajo (founder, producción, 2026-09-21: "los listados de sugerencias deben flotar siempre sobre el
 * layout, no recorrer los campos debajo"). Componente en un portal (como `ui/Hoja`): así ninguna hoja con su
 * propio `overflow-y: auto` la recorta, y sigue al campo cuando el teclado reduce el área visible.
 *
 * Se recoloca en cada cuadro (`requestAnimationFrame`) mientras está abierta, no solo al hacer scroll o cambiar
 * el tamaño de la ventana: un aviso que aparece bajo el campo (p. ej. "Falta confirmar el pin.") cambia el layout
 * por dentro de la hoja sin disparar ningún evento de `resize`/`scroll`, y la lista se quedaba despegada del
 * campo (revisión del gestor, 2026-09-21, con la captura de la propia hoja). Medir cada cuadro es más caro que
 * escuchar eventos puntuales, pero aquí es barato (un `getBoundingClientRect`) y cubre cualquier causa —
 * animaciones, contenido que aparece o desaparece, `ResizeObserver` no se entera de que el propio campo se movió
 * si su tamaño no cambió, solo su posición.
 *
 * Patrón combobox/listbox: el campo que la abre lleva `role="combobox"`, `aria-expanded` y `aria-controls={id}`;
 * aquí, flecha arriba/abajo mueve el foco real entre las opciones (en vez de `aria-activedescendant`: son botones
 * de verdad, ya alcanzables con Tab), Escape y tocar fuera cierran.
 */
export default function ListaFlotante({ abierta, onCerrar, ancla, id, etiqueta, children }: Props) {
  const listaRef = useRef<HTMLUListElement>(null);
  const [posicion, setPosicion] = useState<PosicionFlotante | null>(null);

  useEffect(() => {
    if (!abierta) return;
    let vigente = true;
    let cuadro = 0;
    function ubicar() {
      const el = ancla.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vv = window.visualViewport;
      const altoVisible = vv ? vv.offsetTop + vv.height : window.innerHeight;
      const offsetTop = vv?.offsetTop ?? 0;
      const p = calcularPosicion(r, altoVisible, offsetTop, window.innerHeight);
      setPosicion((actual) => (actual && actual.left === p.left && actual.top === p.top && actual.bottom === p.bottom && actual.width === p.width && actual.maxHeight === p.maxHeight ? actual : p));
    }
    function bucle() {
      if (!vigente) return;
      ubicar();
      cuadro = requestAnimationFrame(bucle);
    }
    bucle();
    return () => {
      vigente = false;
      cancelAnimationFrame(cuadro);
    };
  }, [abierta, ancla]);

  useEffect(() => {
    if (!abierta) return;
    function alTeclado(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCerrar();
        return;
      }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const opciones = listaRef.current ? [...listaRef.current.querySelectorAll<HTMLElement>('[role="option"]')] : [];
      if (!opciones.length) return;
      const actual = opciones.indexOf(document.activeElement as HTMLElement);
      const siguiente = e.key === "ArrowDown" ? (actual + 1 + opciones.length) % opciones.length : (actual - 1 + opciones.length) % opciones.length;
      e.preventDefault();
      opciones[siguiente]?.focus();
    }
    function alTocarFuera(e: MouseEvent) {
      const dentroLista = listaRef.current?.contains(e.target as Node);
      const dentroAncla = ancla.current?.contains(e.target as Node);
      if (!dentroLista && !dentroAncla) onCerrar();
    }
    document.addEventListener("keydown", alTeclado);
    document.addEventListener("mousedown", alTocarFuera);
    return () => {
      document.removeEventListener("keydown", alTeclado);
      document.removeEventListener("mousedown", alTocarFuera);
    };
  }, [abierta, onCerrar, ancla]);

  if (!abierta || !posicion) return null;
  return createPortal(
    <ul
      ref={listaRef}
      id={id}
      role="listbox"
      aria-label={etiqueta}
      className={estilos.flotante}
      style={{ left: posicion.left, top: posicion.top, bottom: posicion.bottom, width: posicion.width, maxHeight: posicion.maxHeight }}
    >
      {children}
    </ul>,
    document.body,
  );
}
