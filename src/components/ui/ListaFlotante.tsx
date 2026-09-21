"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import estilos from "./ListaFlotante.module.css";

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
 * Patrón combobox/listbox: el campo que la abre lleva `role="combobox"`, `aria-expanded` y `aria-controls={id}`;
 * aquí, flecha arriba/abajo mueve el foco real entre las opciones (en vez de `aria-activedescendant`: son botones
 * de verdad, ya alcanzables con Tab), Escape y tocar fuera cierran.
 */
export default function ListaFlotante({ abierta, onCerrar, ancla, id, etiqueta, children }: Props) {
  const listaRef = useRef<HTMLUListElement>(null);
  const [posicion, setPosicion] = useState<{ left: number; top?: number; bottom?: number; width: number; maxHeight: number } | null>(null);

  useEffect(() => {
    if (!abierta) return;
    function ubicar() {
      const el = ancla.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vv = window.visualViewport;
      // El área visible de verdad: con el teclado abierto, `visualViewport` mide menos que la ventana.
      const altoVisible = vv ? vv.offsetTop + vv.height : window.innerHeight;
      const espacioAbajo = altoVisible - r.bottom - 8;
      const espacioArriba = r.top - (vv?.offsetTop ?? 0) - 8;
      // Si no cabe abajo pero sí arriba, se abre hacia arriba (nunca tapada por el teclado ni cortada).
      const haciaArriba = espacioAbajo < 120 && espacioArriba > espacioAbajo;
      setPosicion({
        left: r.left,
        top: haciaArriba ? undefined : r.bottom + 4,
        bottom: haciaArriba ? window.innerHeight - r.top + 4 : undefined,
        width: r.width,
        maxHeight: Math.max(100, Math.min(260, haciaArriba ? espacioArriba : espacioAbajo)),
      });
    }
    ubicar();
    window.addEventListener("resize", ubicar);
    window.addEventListener("scroll", ubicar, true);
    window.visualViewport?.addEventListener("resize", ubicar);
    window.visualViewport?.addEventListener("scroll", ubicar);
    return () => {
      window.removeEventListener("resize", ubicar);
      window.removeEventListener("scroll", ubicar, true);
      window.visualViewport?.removeEventListener("resize", ubicar);
      window.visualViewport?.removeEventListener("scroll", ubicar);
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
