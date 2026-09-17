"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IconoCerrar } from "./Iconos";
import styles from "./Hoja.module.css";

type Props = { etiqueta: string; onCerrar: () => void; children: ReactNode };

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
/** true solo en el navegador y después de hidratar: en el servidor no hay body donde pintar el portal. */
const enNavegador = () => true;
const enServidor = () => false;

export default function Hoja({ etiqueta, onCerrar, children }: Props) {
  const montada = useSyncExternalStore(nada, enNavegador, enServidor);
  const [marco, setMarco] = useState<{ top: number; height: number } | null>(null);
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [onCerrar]);
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
    <div className={styles.fondo} style={marco ? { top: marco.top, height: marco.height, bottom: "auto" } : undefined} onClick={onCerrar}>
      <div className={styles.hoja} role="dialog" aria-label={etiqueta} onClick={(e) => e.stopPropagation()} onTouchMove={alArrastrar}>
        <button type="button" className={styles.cerrar} onClick={onCerrar} aria-label="Cerrar">
          <IconoCerrar width={22} height={22} />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
