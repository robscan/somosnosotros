"use client";

import { useState, type ReactNode } from "react";
import styles from "./Pestanas.module.css";

type Props = { pestanas: { clave: string; etiqueta: string; contenido: ReactNode }[]; inicial?: string };

/** Dos pestañas dentro del panel: Agenda y Lugares. */
export default function Pestanas({ pestanas, inicial }: Props) {
  const [activa, setActiva] = useState(inicial ?? pestanas[0]?.clave);
  return (
    <div>
      <div className={styles.barra} role="tablist">
        {pestanas.map((p) => (
          <button key={p.clave} type="button" role="tab" aria-selected={activa === p.clave} className={`${styles.pestana} ${activa === p.clave ? styles.activa : ""}`} onClick={() => setActiva(p.clave)}>
            {p.etiqueta}
          </button>
        ))}
      </div>
      {pestanas.map((p) => (
        <div key={p.clave} role="tabpanel" hidden={activa !== p.clave}>
          {p.contenido}
        </div>
      ))}
    </div>
  );
}
