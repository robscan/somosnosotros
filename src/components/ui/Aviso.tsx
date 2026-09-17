"use client";

import { IconoCerrar } from "./Iconos";
import styles from "./Aviso.module.css";

type Props = { texto: string; onCerrar?: () => void; className?: string };

/**
 * Aviso persistente y legible (fondo de tinta, texto blanco): errores con salida y notas que la persona
 * debe ver, como "No pudimos leer tu ubicación". Se cierra con la ✕; no desaparece solo.
 */
export default function Aviso({ texto, onCerrar, className = "" }: Props) {
  return (
    <p className={`${styles.aviso} ${className}`} role="alert">
      <span>{texto}</span>
      {onCerrar && (
        <button type="button" className={styles.cerrar} onClick={onCerrar} aria-label="Cerrar el aviso">
          <IconoCerrar width={18} height={18} />
        </button>
      )}
    </p>
  );
}
