"use client";

import Link, { useLinkStatus } from "next/link";
import type { ReactNode } from "react";
import styles from "./Chip.module.css";

/** Opción de un toque (día, hora, duración, tipo). Activa = elegida. */
export function Chip({ activo = false, children, onClick, ariaLabel, disabled = false }: { activo?: boolean; children: ReactNode; onClick: () => void; ariaLabel?: string; disabled?: boolean }) {
  return (
    <button type="button" className={`${styles.chip} ${activo ? styles.activo : ""}`} onClick={onClick} aria-pressed={activo} aria-label={ariaLabel} disabled={disabled}>
      {children}
    </button>
  );
}

/** Mientras el servidor responde al toque, el chip lo dice (el CSS lo pinta en camino al ver este hijo). */
function EnCamino() {
  const { pending } = useLinkStatus();
  return pending ? <span className={styles.enCamino} aria-hidden="true" /> : null;
}

/**
 * Chip que es un enlace: el filtro vive en la URL (se comparte, sobrevive al volver de una ficha, lo filtra el servidor).
 * Filtrar no es navegar (founder, 2026-09-17): el chip reemplaza la entrada del historial en vez de apilar una nueva, así
 * Atrás vuelve a la pantalla anterior y no al filtro anterior. Como la lista no cambia hasta que el servidor responde, el
 * chip tocado se pone en camino al instante (founder, 2026-09-16: "a veces no pasa nada").
 */
export function ChipEnlace({ activo = false, href, children }: { activo?: boolean; href: string; children: ReactNode }) {
  return (
    <Link href={href} scroll={false} replace className={`${styles.chip} ${activo ? styles.activo : ""}`} aria-current={activo ? "true" : undefined}>
      {children}
      <EnCamino />
    </Link>
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

/** Cuántos resultados da el chip, en chico y a la derecha del texto. */
export function Cuenta({ n }: { n: number }) {
  return <span className={styles.cuenta}>{n}</span>;
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
