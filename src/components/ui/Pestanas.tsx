"use client";

import Link, { useLinkStatus } from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import styles from "./Pestanas.module.css";

/**
 * Tira de pestañas (pasada de maquetación, 2026-09-16): una raya común en la base y la elegida con la raya del color
 * de acción. Es el renglón de filtros de ui/Cabecera en Agenda, Lugares y Artistas, y los números de la ficha de
 * persona. `repartidas`: columnas iguales a lo ancho; si no, una tras otra, y la tira se desliza si no cabe.
 */
export function Pestanas({ ariaLabel, repartidas = false, className = "", children }: { ariaLabel: string; repartidas?: boolean; className?: string; children: ReactNode }) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={`${styles.tira} ${repartidas ? styles.repartidas : ""} ${className}`}>
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

/** Mientras el servidor responde al toque, la pestaña lo dice (el CSS la pinta en camino al ver este hijo). */
function EnCamino() {
  const { pending } = useLinkStatus();
  return pending ? <span className={styles.enCamino} aria-hidden="true" /> : null;
}

/**
 * Pestaña que es un enlace: el filtro vive en la URL (tipos de Lugares, disciplinas de Artistas). Filtrar no es
 * navegar: reemplaza la entrada del historial y no mueve el scroll, como ui/ChipEnlace.
 */
export function PestanaEnlace({ activa, href, onClick, children }: { activa: boolean; href: string; onClick?: () => void; children: ReactNode }) {
  const ref = useALaVista<HTMLAnchorElement>(activa);
  return (
    <Link ref={ref} href={href} replace scroll={false} role="tab" aria-selected={activa} className={styles.pestana} onClick={onClick}>
      {children}
      <EnCamino />
    </Link>
  );
}
