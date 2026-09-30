"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import EnCamino from "./EnCamino";
import { IconoCerrar } from "./Iconos";
import SoloLector from "./SoloLector";
import styles from "./Chip.module.css";

/** Opción de un toque (día, hora, duración, tipo). Activa = elegida. */
export function Chip({ activo = false, children, onClick, ariaLabel, disabled = false }: { activo?: boolean; children: ReactNode; onClick: () => void; ariaLabel?: string; disabled?: boolean }) {
  return (
    <button type="button" className={`${styles.chip} ${activo ? styles.activo : ""}`} onClick={onClick} aria-pressed={activo} aria-label={ariaLabel} disabled={disabled}>
      {children}
    </button>
  );
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
      <EnCamino className={styles.enCamino} />
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

/**
 * Un chip de la fila de contexto (Cuándo, Filtros; el de ciudad lleva su propia hoja, `ChipCiudad`): con su icono y, si ya
 * tiene un valor, en el color de acción. Con `cuenta` (los filtros puestos) lleva su número en un círculo. Abre una hoja.
 */
export function ChipContexto({ icono, activo = false, cuenta = 0, onClick, children }: { icono: ReactNode; activo?: boolean; cuenta?: number; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={`${styles.chip} ${styles.deContexto} ${activo ? styles.activo : ""}`} onClick={onClick} aria-haspopup="dialog">
      {icono}
      <span>{children}</span>
      {cuenta > 0 && (
        <span className={styles.cuentaFiltros}>
          {cuenta}
          <SoloLector> puestos</SoloLector>
        </span>
      )}
    </button>
  );
}

/** Un filtro puesto, en la fila de contexto: chip activo con su ✕; tocarlo lo quita. */
export function ChipQuitar({ texto, onClick }: { texto: string; onClick: () => void }) {
  return (
    <button type="button" className={`${styles.chip} ${styles.activo} ${styles.quitar}`} onClick={onClick} aria-label={`Quitar ${texto}`}>
      {texto}
      <IconoCerrar width={16} height={16} />
    </button>
  );
}

/** Fila de chips que se desliza a lo ancho sin barra de scroll; con `envuelve`, los chips pasan al renglón de abajo (una hoja). */
export function Chips({ etiqueta, children, ariaLabel, envuelve = false }: { etiqueta?: string; children: ReactNode; ariaLabel: string; envuelve?: boolean }) {
  return (
    <div className={envuelve ? `${styles.chips} ${styles.envuelve}` : styles.chips} role="group" aria-label={ariaLabel}>
      {etiqueta && <span className={styles.etiquetaChips}>{etiqueta}</span>}
      {children}
    </div>
  );
}
