import type { ReactNode } from "react";
import styles from "./Pestanas.module.css";

/**
 * Las pestañas de una pantalla (Todos · Nuevos, en Agenda): el último renglón de `ui/Cabecera`, como la tira de letras de Artistas. Solo el
 * texto y, bajo la elegida, una raya en el color de acción; la raya común la pone la cabecera, justo debajo. Son pocas y cortas: no se deslizan.
 */
export function Pestanas({ ariaLabel, children }: { ariaLabel: string; children: ReactNode }) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={styles.tira}>
      {children}
    </div>
  );
}

export function Pestana({ activa, onClick, children }: { activa: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" role="tab" aria-selected={activa} className={styles.pestana} onClick={onClick}>
      {children}
    </button>
  );
}
