"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IconoCerrar } from "./Iconos";
import styles from "./Hoja.module.css";

type Props = {
  etiqueta: string;
  /** Con título, la cabecera (asa, título y ✕) queda fija y solo el cuerpo se desplaza (OL-137). */
  titulo?: string;
  /** El cuerpo no se desplaza: quien lo llena reparte el alto y desplaza solo lo suyo (OL-137: el mapa nunca se mueve). */
  plano?: boolean;
  /** Lo que queda siempre a la vista bajo el cuerpo, con su raya arriba (los botones de una hoja de filtros: Limpiar y Ver N). Solo con `titulo`. */
  pie?: ReactNode;
  onCerrar: () => void;
  children: ReactNode;
};

/**
 * Hoja que emerge desde abajo tras un gesto de la persona (nunca sola). Se cierra con la ✕,
 * tocando fuera o con Escape. Respeta el área segura y se desplaza si no cabe.
 * Se pinta al final del body (portal): así ninguna cabecera pegajosa ni barra fija la tapa, abra desde donde abra.
 * Con el teclado abierto sigue al área visible (visual viewport): en el iPhone, `position: fixed` mide contra la
 * ventana entera y la hoja quedaba bajo el teclado (pedido del founder, 2026-09-15).
 * Mientras hay una hoja abierta la página de atrás no se desplaza, y arrastrar la hoja con el teclado arriba lo guarda,
 * como en las búsquedas del iPhone. Sin eso, en la hoja Ciudad (su lista crece al llegar los resultados, con el teclado
 * ya arriba) el arrastre movía la página y la hoja quedaba recortada (medido en el simulador, 2026-09-16).
 */
const nada = () => () => {};
/** Cuántas hojas hay abiertas: la página se suelta cuando se cierra la última. */
let abiertas = 0;
/** Solo la hoja superior es interactiva. Se conservan los inert ajenos al abrir/cerrar la pila. */
const fondos: HTMLElement[] = [];
const inertPrevio = new Map<HTMLElement, boolean>();
let observarFondo: MutationObserver | null = null;
function actualizarFondo() {
  const superior = fondos.at(-1);
  if (!superior) {
    for (const [elemento, previo] of inertPrevio) elemento.inert = previo;
    inertPrevio.clear();
    return;
  }
  for (const elemento of document.body.children) {
    if (!(elemento instanceof HTMLElement)) continue;
    if (!inertPrevio.has(elemento)) inertPrevio.set(elemento, elemento.inert);
    elemento.inert = elemento !== superior;
  }
}
function enfocables(panel: HTMLElement) {
  return [...panel.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, summary, [tabindex], [contenteditable="true"]')]
    .filter(e => e.tabIndex >= 0 && !e.matches(':disabled') && !e.closest('[inert]') && e.getClientRects().length > 0 && getComputedStyle(e).visibility === 'visible');
}
/** true solo en el navegador y después de hidratar: en el servidor no hay body donde pintar el portal. */
const enNavegador = () => true;
const enServidor = () => false;

export default function Hoja({ etiqueta, titulo, plano = false, pie, onCerrar, children }: Props) {
  const montada = useSyncExternalStore(nada, enNavegador, enServidor);
  const [marco, setMarco] = useState<{ top: number; height: number } | null>(null);
  const fondo = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const cerrar = useRef(onCerrar);
  const focoPropio = useRef<HTMLElement | null>(null);
  // Antes de montar los hijos: un campo con autoFocus no debe reemplazar al disparador recordado.
  const [disparador] = useState(() => typeof document !== "undefined" && document.activeElement instanceof HTMLElement ? document.activeElement : null);
  useLayoutEffect(() => { cerrar.current = onCerrar; }, [onCerrar]);
  useLayoutEffect(() => {
    const fondoActual = fondo.current, panelActual = panel.current;
    if (!montada || !fondoActual || !panelActual) return;
    fondos.push(fondoActual);
    actualizarFondo();
    if (!observarFondo) {
      observarFondo = new MutationObserver(actualizarFondo);
      observarFondo.observe(document.body, { childList: true });
    }
    const enfocar = () => (enfocables(panelActual)[0] ?? panelActual).focus({ preventScroll: true });
    if (!panelActual.contains(document.activeElement)) {
      if (focoPropio.current?.isConnected) focoPropio.current.focus({ preventScroll: true });
      else enfocar();
    }
    const alTeclear = (e: KeyboardEvent) => {
      if (fondos.at(-1) !== fondoActual) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        cerrar.current();
      } else if (e.key === "Tab") {
        const controles = enfocables(panelActual);
        const primero = controles[0], ultimo = controles.at(-1);
        const fuera = !panelActual.contains(document.activeElement) || document.activeElement === panelActual;
        if (!primero || fuera || (e.shiftKey ? document.activeElement === primero : document.activeElement === ultimo)) {
          e.preventDefault();
          (e.shiftKey ? ultimo ?? panelActual : primero ?? panelActual).focus({ preventScroll: true });
        }
      }
    };
    document.addEventListener("keydown", alTeclear, true);
    return () => {
      document.removeEventListener("keydown", alTeclear, true);
      // StrictMode repite montaje/limpieza: conservar el autofocus interno durante esa comprobación.
      if (document.activeElement instanceof HTMLElement && panelActual.contains(document.activeElement)) focoPropio.current = document.activeElement;
      fondos.splice(fondos.indexOf(fondoActual), 1);
      if (!fondos.length) { observarFondo?.disconnect(); observarFondo = null; }
      actualizarFondo();
      if (disparador?.isConnected && !disparador.closest('[inert]')) disparador.focus({ preventScroll: true });
    };
  }, [montada, disparador]);
  useEffect(() => {
    // Solo en <html>: con <html> y <body> a la vez, la página volvía arriba al abrir la hoja (medido: de 300 a 0).
    const raiz = document.documentElement;
    if (abiertas++ === 0) raiz.style.overflow = "hidden";
    return () => {
      if (--abiertas === 0) raiz.style.overflow = "";
    };
  }, []);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    // Solo cuando el área visible difiere de la ventana (teclado abierto): el resto del tiempo, inset: 0 del CSS.
    const ajustar = () => setMarco(Math.abs(vv.height - window.innerHeight) > 1 || vv.offsetTop > 0 ? { top: vv.offsetTop, height: vv.height } : null);
    ajustar();
    vv.addEventListener("resize", ajustar);
    vv.addEventListener("scroll", ajustar);
    return () => {
      vv.removeEventListener("resize", ajustar);
      vv.removeEventListener("scroll", ajustar);
    };
  }, []);
  // Con el teclado arriba, un arrastre dentro de la hoja lo guarda (salvo sobre el mismo campo, para mover el cursor).
  const alArrastrar = (e: React.TouchEvent) => {
    const activo = document.activeElement;
    if (marco && (activo instanceof HTMLInputElement || activo instanceof HTMLTextAreaElement) && e.target !== activo) activo.blur();
  };
  if (!montada) return null;
  return createPortal(
    <div ref={fondo} className={styles.fondo} style={marco ? { top: marco.top, height: marco.height, bottom: "auto" } : undefined} onClick={onCerrar}>
      <div ref={panel} tabIndex={-1} className={[styles.hoja, titulo && styles.conCabecera].filter(Boolean).join(" ")} role="dialog" aria-modal="true" aria-label={etiqueta} onClick={(e) => e.stopPropagation()} onTouchMove={alArrastrar}>
        <button type="button" className={styles.cerrar} onClick={onCerrar} aria-label="Cerrar">
          <IconoCerrar width={22} height={22} />
        </button>
        {titulo ? (
          <>
            <h3>{titulo}</h3>
            <div className={plano ? `${styles.cuerpo} ${styles.plano}` : styles.cuerpo}>{children}</div>
            {pie && <div className={styles.pie}>{pie}</div>}
          </>
        ) : (
          children
        )}
      </div>
    </div>,
    document.body,
  );
}
