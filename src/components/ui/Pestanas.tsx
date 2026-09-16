import type { ReactNode } from "react";
import styles from "./Pestanas.module.css";

/**
 * Tira de pestañas (pasada de maquetación, 2026-09-16): una raya común en la base y la elegida con la raya del color
 * de acción. La usan los filtros de la agenda, Mapa · Lista en Lugares y los números de la ficha de persona.
 * `repartidas`: columnas iguales a lo ancho; si no, una tras otra con su separación.
 */
export function Pestanas({ ariaLabel, repartidas = false, className = "", children }: { ariaLabel: string; repartidas?: boolean; className?: string; children: ReactNode }) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={`${styles.tira} ${repartidas ? styles.repartidas : ""} ${className}`}>
      {children}
    </div>
  );
}

export function Pestana({ activa, onClick, className = "", children }: { activa: boolean; onClick: () => void; className?: string; children: ReactNode }) {
  return (
    <button type="button" role="tab" aria-selected={activa} className={`${styles.pestana} ${className}`} onClick={onClick}>
      {children}
    </button>
  );
}
