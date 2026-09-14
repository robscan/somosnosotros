"use client";

import { useState, useTransition } from "react";
import styles from "./Borrar.module.css";

type Props = { que: string; aviso: string; accion: () => Promise<void> };

/** "Borrar" en dos pasos: primero el enlace discreto, luego la confirmación con lo que se pierde. */
export default function Borrar({ que, aviso, accion }: Props) {
  const [confirmar, setConfirmar] = useState(false);
  const [pendiente, iniciar] = useTransition();
  if (!confirmar)
    return (
      <button type="button" className={styles.enlace} onClick={() => setConfirmar(true)}>
        Borrar {que}
      </button>
    );
  return (
    <div className={styles.caja} role="alertdialog" aria-label={`Borrar ${que}`}>
      <p>{aviso} No se puede deshacer.</p>
      <div className={styles.acciones}>
        <button type="button" className={styles.peligro} disabled={pendiente} onClick={() => iniciar(() => accion())}>
          {pendiente ? "Borrando…" : `Sí, borrar ${que}`}
        </button>
        <button type="button" className={styles.enlace} onClick={() => setConfirmar(false)}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
