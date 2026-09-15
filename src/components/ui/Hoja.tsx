"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./Hoja.module.css";

type Props = { etiqueta: string; onCerrar: () => void; children: ReactNode };

/**
 * Hoja que emerge desde abajo tras un gesto de la persona (nunca sola). Se cierra con la ✕,
 * tocando fuera o con Escape. Respeta el área segura y se desplaza si no cabe.
 * Se pinta al final del body (portal): así ninguna cabecera pegajosa ni barra fija la tapa, abra desde donde abra.
 */
const nada = () => () => {};
/** true solo en el navegador y después de hidratar: en el servidor no hay body donde pintar el portal. */
const enNavegador = () => true;
const enServidor = () => false;

export default function Hoja({ etiqueta, onCerrar, children }: Props) {
  const montada = useSyncExternalStore(nada, enNavegador, enServidor);
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [onCerrar]);
  if (!montada) return null;
  return createPortal(
    <div className={styles.fondo} onClick={onCerrar}>
      <div className={styles.hoja} role="dialog" aria-label={etiqueta} onClick={(e) => e.stopPropagation()}>
        <div className={styles.asa} aria-hidden="true" />
        <button type="button" className={styles.cerrar} onClick={onCerrar} aria-label="Cerrar">
          ✕
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
