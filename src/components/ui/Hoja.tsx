"use client";

import { useEffect, type ReactNode } from "react";
import styles from "./Hoja.module.css";

type Props = { etiqueta: string; onCerrar: () => void; children: ReactNode };

/**
 * Hoja que emerge desde abajo tras un gesto de la persona (nunca sola). Se cierra con la ✕,
 * tocando fuera o con Escape. Respeta el área segura y se desplaza si no cabe.
 */
export default function Hoja({ etiqueta, onCerrar, children }: Props) {
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [onCerrar]);
  return (
    <div className={styles.fondo} onClick={onCerrar}>
      <div className={styles.hoja} role="dialog" aria-label={etiqueta} onClick={(e) => e.stopPropagation()}>
        <div className={styles.asa} aria-hidden="true" />
        <button type="button" className={styles.cerrar} onClick={onCerrar} aria-label="Cerrar">
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
