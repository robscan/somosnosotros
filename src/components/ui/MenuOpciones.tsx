"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconoCaret, IconoOk } from "./Iconos";
import estilos from "./MenuOpciones.module.css";

/** Dónde va el menú: pegado al borde derecho del botón, debajo o, si no cabe sobre la navegación, encima. */
export type PosicionMenu = { right: number; top?: number; bottom?: number };

/**
 * La cuenta de dónde poner el menú, pura (se prueba sin navegador): debajo del botón si cabe antes de `limite` (lo que deja libre la
 * navegación de abajo); si no, encima. Alineado al borde derecho del botón.
 */
export function posicionMenu(boton: { top: number; bottom: number; right: number }, altoMenu: number, anchoVentana: number, altoVentana: number, limite: number): PosicionMenu {
  const right = Math.max(0, anchoVentana - boton.right);
  const cabeAbajo = boton.bottom + 4 + altoMenu <= limite;
  return cabeAbajo || boton.top - 4 - altoMenu < 0 ? { right, top: boton.bottom + 4 } : { right, bottom: altoVentana - boton.top + 4 };
}

type Props<C extends string> = {
  /** Nombre del menú para el lector de pantalla («Orden de la lista»). */
  etiqueta: string;
  opciones: readonly { clave: C; etiqueta: string }[];
  /** La opción puesta: la dice el botón y lleva la marca en el menú. */
  valor: C;
  onElegir: (clave: C) => void;
  /** Mientras se resuelve una elección (un permiso que se pide), el botón lo dice. */
  ocupado?: boolean;
  /** Del botón, para colocarlo en la rejilla de quien lo usa. */
  className?: string;
};

/**
 * Un botón de texto con su caret que abre un menú de opciones, una sola elegida (OL-400: «Cercanos primero ⌄» junto a «N lugares»). El
 * menú flota en un portal, fijo junto al botón (ninguna hoja con su propio desplazamiento lo recorta) y nunca bajo la navegación de abajo:
 * si no cabe debajo, abre encima. Patrón menú de botón: `aria-haspopup="menu"`, opciones `menuitemradio` con `aria-checked`; flechas
 * entre opciones, Escape y tocar fuera cierran y el foco vuelve al botón.
 */
export default function MenuOpciones<C extends string>({ etiqueta, opciones, valor, onElegir, ocupado = false, className }: Props<C>) {
  const [abierto, setAbierto] = useState(false);
  const [posicion, setPosicion] = useState<PosicionMenu | null>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const sonda = useRef<HTMLSpanElement>(null);
  const id = useId();
  const puesta = opciones.find((o) => o.clave === valor) ?? opciones[0];

  function cerrar(devolverFoco: boolean) {
    setAbierto(false);
    setPosicion(null);
    if (devolverFoco) boton.current?.focus({ preventScroll: true });
  }

  // Se coloca antes de pintar (mide el menú ya montado) y se recoloca si la página o la hoja se desplazan o cambia la ventana.
  useLayoutEffect(() => {
    if (!abierto) return;
    function ubicar() {
      const b = boton.current?.getBoundingClientRect();
      const m = menu.current;
      if (!b || !m) return;
      const limite = window.innerHeight - (sonda.current?.offsetHeight ?? 0);
      const p = posicionMenu(b, m.offsetHeight, document.documentElement.clientWidth, window.innerHeight, limite);
      setPosicion((a) => (a && a.right === p.right && a.top === p.top && a.bottom === p.bottom ? a : p));
    }
    ubicar();
    menu.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus({ preventScroll: true });
    window.addEventListener("scroll", ubicar, true);
    window.addEventListener("resize", ubicar);
    return () => {
      window.removeEventListener("scroll", ubicar, true);
      window.removeEventListener("resize", ubicar);
    };
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    function alTocarFuera(e: PointerEvent) {
      const objetivo = e.target as Node | null;
      if (!menu.current?.contains(objetivo) && !boton.current?.contains(objetivo)) {
        setAbierto(false);
        setPosicion(null);
      }
    }
    function alTeclado(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setAbierto(false);
        setPosicion(null);
        boton.current?.focus({ preventScroll: true });
        return;
      }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const items = [...(menu.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? [])];
      if (!items.length) return;
      e.preventDefault();
      const i = items.indexOf(document.activeElement as HTMLElement);
      items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus();
    }
    document.addEventListener("pointerdown", alTocarFuera, true);
    document.addEventListener("keydown", alTeclado);
    return () => {
      document.removeEventListener("pointerdown", alTocarFuera, true);
      document.removeEventListener("keydown", alTeclado);
    };
  }, [abierto]);

  return (
    <>
      <button
        ref={boton}
        type="button"
        className={[estilos.boton, className].filter(Boolean).join(" ")}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={abierto ? id : undefined}
        aria-busy={ocupado || undefined}
        onClick={() => (abierto ? cerrar(false) : setAbierto(true))}
      >
        {puesta.etiqueta}
        <IconoCaret width={16} height={16} />
      </button>
      {abierto &&
        createPortal(
          <div ref={menu} id={id} role="menu" aria-label={etiqueta} className={estilos.menu} style={posicion ?? { visibility: "hidden" }}>
            {opciones.map((o) => (
              <button
                key={o.clave}
                type="button"
                role="menuitemradio"
                aria-checked={o.clave === valor}
                className={estilos.opcion}
                onClick={() => {
                  cerrar(true);
                  onElegir(o.clave);
                }}
              >
                <IconoOk width={18} height={18} />
                {o.etiqueta}
              </button>
            ))}
            <span ref={sonda} className={estilos.sonda} aria-hidden />
          </div>,
          document.body,
        )}
    </>
  );
}
