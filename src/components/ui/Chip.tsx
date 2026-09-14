"use client";

import type { ReactNode } from "react";
import styles from "./Chip.module.css";

/** Opción de un toque (día, hora, duración, tipo). Activa = elegida. */
export function Chip({ activo = false, children, onClick, ariaLabel }: { activo?: boolean; children: ReactNode; onClick: () => void; ariaLabel?: string }) {
  return (
    <button type="button" className={`${styles.chip} ${activo ? styles.activo : ""}`} onClick={onClick} aria-pressed={activo} aria-label={ariaLabel}>
      {children}
    </button>
  );
}

/**
 * Chip que ES el campo nativo: el <input type="date|time"> va encima, invisible y del mismo tamaño,
 * para que el toque caiga en él y el teléfono abra su selector (Safari no lo abre por código).
 */
export function ChipNativo({ tipo, valor, activo, etiqueta, onCambio, ariaLabel }: { tipo: "date" | "time"; valor: string; activo: boolean; etiqueta: string; onCambio: (v: string) => void; ariaLabel: string }) {
  return (
    <span className={`${styles.chip} ${styles.chipNativo} ${activo ? styles.activo : ""}`}>
      {etiqueta}
      <input type={tipo} className={styles.encima} value={valor} step={tipo === "time" ? 300 : undefined} onChange={(e) => onCambio(e.target.value)} aria-label={ariaLabel} />
    </span>
  );
}

/** Fila de chips que se desliza a lo ancho sin barra de scroll. */
export function Chips({ etiqueta, children, ariaLabel }: { etiqueta?: string; children: ReactNode; ariaLabel: string }) {
  return (
    <div className={styles.chips} role="group" aria-label={ariaLabel}>
      {etiqueta && <span className={styles.etiquetaChips}>{etiqueta}</span>}
      {children}
    </div>
  );
}
