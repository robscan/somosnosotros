"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { alSoltar, BORDE_NAVEGADOR, decidirGesto, desplazamiento, type Tono } from "@/lib/deslizar";
import styles from "./Deslizable.module.css";

export type AccionDeslizable = {
  clave: string;
  etiqueta: string;
  tono: Tono;
  icono: ReactNode;
  /** Se ve pero no hace nada ("Vas"): dice el estado sin ofrecer un cambio que vive en la ficha. */
  deshabilitada?: boolean;
  alTocar?: () => void;
};

type Props = {
  href: string;
  /** Las clases del renglón de siempre (Renglon.module.css). */
  className: string;
  acciones: AccionDeslizable[];
  children: ReactNode;
};

type Arrastre = { id: number; x0: number; y0: number; base: number; ancho: number; decidido: boolean; x: number; ultX: number; ultT: number; vel: number };

/** El renglón abierto ahora: abrir otro lo cierra (uno a la vez). */
let abiertoActual: { quien: object; cerrar: () => void } | null = null;

function mover(el: HTMLElement | null, x: number, animar: boolean) {
  if (!el) return;
  const quieto = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.style.transition = animar && !quieto ? "transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1)" : "none";
  el.style.transform = x ? `translateX(${x}px)` : "";
}

/**
 * Renglón de lista que se desliza de derecha a izquierda para mostrar sus acciones (lib/deslizar; bitácora 071). Las
 * acciones van detrás, a la derecha, y se confirman con un toque. Se cierra deslizando de vuelta, tocando el renglón,
 * tocando fuera o con el scroll. Un gesto que empieza en el borde izquierdo es del navegador (atrás) y no se toma.
 * Con teclado, ← en el renglón abre las acciones y lleva el foco a la primera; Esc o → las cierra y vuelve al renglón;
 * salir con Tab también cierra. Con VoiceOver, las mismas acciones están en la ficha.
 */
export default function Deslizable({ href, className, acciones, children }: Props) {
  const li = useRef<HTMLLIElement>(null);
  const frente = useRef<HTMLAnchorElement>(null);
  const caja = useRef<HTMLDivElement>(null);
  const arrastre = useRef<Arrastre | null>(null);
  const suprimirClic = useRef(false);
  const [abierto, setAbierto] = useState(false);
  // Identidad estable del renglón, para saber si el abierto es este.
  const [quien] = useState(() => ({}));
  const cerrar = useCallback(
    (animar = true) => {
      mover(frente.current, 0, animar);
      setAbierto(false);
      if (abiertoActual?.quien === quien) abiertoActual = null;
    },
    [quien],
  );

  const ancho = () => caja.current?.getBoundingClientRect().width ?? 0;
  function abrir() {
    if (abiertoActual && abiertoActual.quien !== quien) abiertoActual.cerrar();
    mover(frente.current, -ancho(), true);
    setAbierto(true);
    abiertoActual = { quien, cerrar };
  }

  // Abierto: tocar fuera o desplazar la página lo cierra.
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => {
      if (li.current && !li.current.contains(e.target as Node)) cerrar();
    };
    const alDesplazar = () => cerrar();
    document.addEventListener("pointerdown", fuera, true);
    window.addEventListener("scroll", alDesplazar, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", fuera, true);
      window.removeEventListener("scroll", alDesplazar);
    };
  }, [abierto, cerrar]);
  useEffect(
    () => () => {
      if (abiertoActual?.quien === quien) abiertoActual = null;
    },
    [quien],
  );

  function alBajar(e: React.PointerEvent<HTMLAnchorElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (e.clientX < BORDE_NAVEGADOR) return;
    const base = abierto ? -ancho() : 0;
    const ahora = performance.now();
    arrastre.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, base, ancho: ancho(), decidido: false, x: base, ultX: e.clientX, ultT: ahora, vel: 0 };
  }
  function alMover(e: React.PointerEvent<HTMLAnchorElement>) {
    const a = arrastre.current;
    if (!a || e.pointerId !== a.id) return;
    const dx = e.clientX - a.x0;
    if (!a.decidido) {
      const decision = decidirGesto(dx, e.clientY - a.y0, a.base < 0);
      if (decision === "esperar") return;
      if (decision === "soltar") {
        arrastre.current = null;
        return;
      }
      a.decidido = true;
      if (abiertoActual && abiertoActual.quien !== quien) abiertoActual.cerrar();
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    a.x = desplazamiento(a.base, dx, a.ancho);
    mover(frente.current, a.x, false);
    const ahora = performance.now();
    a.vel = (e.clientX - a.ultX) / Math.max(1, ahora - a.ultT);
    a.ultX = e.clientX;
    a.ultT = ahora;
  }
  function alSubir(e: React.PointerEvent<HTMLAnchorElement>) {
    const a = arrastre.current;
    if (!a || e.pointerId !== a.id) return;
    arrastre.current = null;
    if (!a.decidido) return;
    // El toque que termina un arrastre no abre la ficha.
    suprimirClic.current = true;
    setTimeout(() => (suprimirClic.current = false), 80);
    if (alSoltar(a.x, a.ancho, a.vel) === "abrir") abrir();
    else cerrar();
  }
  function alCancelar(e: React.PointerEvent<HTMLAnchorElement>) {
    const a = arrastre.current;
    if (!a || e.pointerId !== a.id) return;
    arrastre.current = null;
    if (!a.decidido) return;
    if (alSoltar(a.x, a.ancho, 0) === "abrir") abrir();
    else cerrar();
  }
  function alTeclaRenglon(e: React.KeyboardEvent<HTMLAnchorElement>) {
    if (e.key !== "ArrowLeft" || abierto) return;
    e.preventDefault();
    abrir();
    requestAnimationFrame(() => caja.current?.querySelector("button")?.focus());
  }
  function alTeclaAccion(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== "Escape" && e.key !== "ArrowRight") return;
    e.preventDefault();
    cerrar();
    frente.current?.focus();
  }
  function alSalirFoco(e: React.FocusEvent<HTMLLIElement>) {
    if (abierto && !li.current?.contains(e.relatedTarget as Node | null)) cerrar();
  }
  function alTocarRenglon(e: React.MouseEvent<HTMLAnchorElement>) {
    if (suprimirClic.current) {
      e.preventDefault();
      return;
    }
    // Abierto, tocar el renglón lo cierra en vez de abrir la ficha.
    if (abierto) {
      e.preventDefault();
      cerrar();
    }
  }

  return (
    <li ref={li} className={`${styles.deslizable} ${abierto ? styles.abierto : ""}`} onBlur={alSalirFoco}>
      <div ref={caja} className={`${styles.acciones} ${acciones.length === 1 ? styles.una : ""}`} aria-hidden={!abierto}>
        {acciones.map((a) => (
          <button
            key={a.clave}
            type="button"
            className={`${styles.accion} ${styles[a.tono]}`}
            tabIndex={abierto ? 0 : -1}
            aria-disabled={a.deshabilitada || undefined}
            onKeyDown={alTeclaAccion}
            onClick={(e) => {
              cerrar();
              // Con teclado (Enter o espacio: detail 0), el foco vuelve al renglón en vez de quedarse en un botón oculto.
              if (e.detail === 0) frente.current?.focus();
              if (!a.deshabilitada) a.alTocar?.();
            }}
          >
            {a.icono}
            <span>{a.etiqueta}</span>
          </button>
        ))}
      </div>
      <Link ref={frente} href={href} className={`${className} ${styles.frente}`} draggable={false} aria-keyshortcuts="ArrowLeft" onKeyDown={alTeclaRenglon} onPointerDown={alBajar} onPointerMove={alMover} onPointerUp={alSubir} onPointerCancel={alCancelar} onClickCapture={alTocarRenglon}>
        {children}
      </Link>
    </li>
  );
}
