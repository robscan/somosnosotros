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
 */
const nada = () => () => {};
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
  if (!montada) return null;
  return createPortal(
    <div className={styles.fondo} style={marco ? { top: marco.top, height: marco.height, bottom: "auto" } : undefined} onClick={onCerrar}>
      <div className={styles.hoja} role="dialog" aria-label={etiqueta} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.cerrar} onClick={onCerrar} aria-label="Cerrar">
          <IconoCerrar width={22} height={22} />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
