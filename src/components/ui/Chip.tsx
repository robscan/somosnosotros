"use client";

import Link from "next/link";
import type { MouseEventHandler, ReactNode } from "react";
import EnCamino from "./EnCamino";
import { IconoCerrar } from "./Iconos";
import SoloLector from "./SoloLector";
import styles from "./Chip.module.css";

/**
 * Los cinco papeles del chip (docs/rediseno/50, § 5.2). Los tres primeros se tocan; `estado` y `sello` son rótulos.
 * - `filtro`: una opción que se elige (un día, un tipo, una disciplina). Activa = elegida, en el color de acción.
 * - `contexto`: lo que la pantalla sabe de quien mira (ciudad, Cuándo con su valor, Filtros con su cuenta); abre su hoja.
 * - `quitar`: un filtro puesto, siempre activo y con su ✕; el texto (una cadena) es lo que se quita.
 * - `estado`: lo que la persona ya decidió (Te interesa), en el tono suave del color de acción.
 * - `sello`: un dato sobre una foto (Hoy, 3 van), en vidrio.
 */
type Variante = "filtro" | "contexto" | "quitar" | "estado" | "sello";

type Props = {
  variante?: Variante;
  /** Elegido (`filtro`) o con un valor puesto (`contexto`). Sin él, el chip no es un conmutador (no lleva `aria-pressed`). */
  activo?: boolean;
  /** Antes del texto (el de un chip de contexto). */
  icono?: ReactNode;
  /** Después del texto (la flecha del chip de ciudad). */
  fin?: ReactNode;
  /** Cuántos filtros hay puestos, en un círculo junto al texto (Filtros). */
  cuenta?: number;
  /** A dónde lleva, si es un enlace: el filtro vive en la URL. */
  href?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  /** Para que quien lo pone lo coloque (un sello sobre la foto de su tarjeta). */
  className?: string;
  children: ReactNode;
};

/**
 * El chip: una sola píldora con cinco papeles. Los que se tocan miden `--alto-chip` a la vista y `--toque-min` al tacto (su
 * `::before`); sus estados son reposo, activo, en camino y deshabilitado. Con `href` es un enlace: filtrar no es navegar (founder,
 * 2026-09-17), así que reemplaza la entrada del historial en vez de apilar otra, y mientras el servidor responde el chip tocado
 * se pone en camino (founder, 2026-09-16: «a veces no pasa nada»). Con `onClick` es un botón.
 */
export function Chip({ variante = "filtro", activo, icono, fin, cuenta = 0, href, onClick, disabled = false, className, children }: Props) {
  const rotulo = variante === "estado" || variante === "sello";
  const clase = [styles.chip, styles[variante], !rotulo && styles.toque, (activo || variante === "quitar") && styles.activo, className].filter(Boolean).join(" ");
  const cuerpo = (
    <>
      {icono}
      {variante === "contexto" ? <span>{children}</span> : children}
      {cuenta > 0 && (
        <span className={styles.cuentaFiltros}>
          {cuenta}
          <SoloLector> puestos</SoloLector>
        </span>
      )}
      {variante === "quitar" ? <IconoCerrar width={16} height={16} /> : fin}
    </>
  );
  if (rotulo) return <span className={clase}>{cuerpo}</span>;
  if (href) {
    return (
      <Link href={href} scroll={false} replace className={clase} aria-current={activo ? "true" : undefined}>
        {cuerpo}
        <EnCamino className={styles.enCamino} />
      </Link>
    );
  }
  const lector = variante === "contexto" ? { "aria-haspopup": "dialog" as const } : variante === "quitar" ? { "aria-label": `Quitar ${children}` } : { "aria-pressed": activo };
  return (
    <button type="button" className={clase} onClick={onClick} disabled={disabled} {...lector}>
      {cuerpo}
    </button>
  );
}

/**
 * Chip que ES el campo nativo: el <input type="date|time"> va encima, invisible y del mismo tamaño,
 * para que el toque caiga en él y el teléfono abra su selector (Safari no lo abre por código).
 */
export function ChipNativo({ tipo, valor, activo, etiqueta, onCambio, ariaLabel }: { tipo: "date" | "time"; valor: string; activo: boolean; etiqueta: string; onCambio: (v: string) => void; ariaLabel: string }) {
  return (
    <span className={`${styles.chip} ${styles.toque} ${activo ? styles.activo : ""}`}>
      {etiqueta}
      <input type={tipo} className={styles.encima} value={valor} step={tipo === "time" ? 300 : undefined} onChange={(e) => onCambio(e.target.value)} aria-label={ariaLabel} />
    </span>
  );
}

/** Cuántos resultados da el chip, en chico y a la derecha del texto. */
export function Cuenta({ n }: { n: number }) {
  return <span className={styles.cuenta}>{n}</span>;
}

/** Fila de chips que se desliza a lo ancho sin barra de scroll; con `envuelve`, los chips pasan al renglón de abajo (una hoja). */
export function Chips({ children, ariaLabel, envuelve = false }: { children: ReactNode; ariaLabel: string; envuelve?: boolean }) {
  return (
    <div className={envuelve ? `${styles.chips} ${styles.envuelve}` : styles.chips} role="group" aria-label={ariaLabel}>
      {children}
    </div>
  );
}
