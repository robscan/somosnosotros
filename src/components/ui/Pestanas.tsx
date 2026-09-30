"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useTiraQueSigue } from "./useTiraQueSigue";
import styles from "./Pestanas.module.css";

/**
 * Tira de pestañas (pasada de maquetación, 2026-09-16): una raya común en la base y la elegida con la raya del color
 * de acción. Son las de la ficha de persona: una tras otra, y la tira se desliza si no cabe, con su borde derecho
 * desvanecido mientras haya más (`useTiraQueSigue`).
 */
export function Pestanas({ ariaLabel, className = "", children }: { ariaLabel: string; className?: string; children: ReactNode }) {
  const ref = useTiraQueSigue<HTMLDivElement>();
  return (
    <div ref={ref} role="tablist" aria-label={ariaLabel} className={`${styles.tira} ${className}`}>
      {children}
    </div>
  );
}

/** La elegida queda a la vista aunque la tira no quepa (se desliza de lado, sin mover la página). */
function useALaVista<T extends HTMLElement>(activa: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (activa) ref.current?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [activa]);
  return ref;
}

export function Pestana({ activa, onClick, className = "", children }: { activa: boolean; onClick: () => void; className?: string; children: ReactNode }) {
  const ref = useALaVista<HTMLButtonElement>(activa);
  return (
    <button ref={ref} type="button" role="tab" aria-selected={activa} className={`${styles.pestana} ${className}`} onClick={onClick}>
      {children}
    </button>
  );
}
