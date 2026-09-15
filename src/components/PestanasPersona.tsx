"use client";

import { useState, type ReactNode } from "react";
import styles from "./PestanasPersona.module.css";

export type Pestana = { clave: string; n: number; etiqueta: string; contenido: ReactNode };

/**
 * Resumen en números que hace de pestañas (corrección del founder, docs/rediseno/13 decisión 5): "2 Voy a", "2 Sigo",
 * "1 Van a lo mismo". Tocar un número muestra su lista: un solo control para leer y para navegar.
 */
export default function PestanasPersona({ pestanas }: { pestanas: Pestana[] }) {
  const [activa, setActiva] = useState(pestanas[0]?.clave ?? "");
  const actual = pestanas.find((p) => p.clave === activa) ?? pestanas[0];
  return (
    <>
      <div className={styles.kpis} role="tablist" aria-label="Actividad">
        {pestanas.map((p) => (
          <button key={p.clave} type="button" role="tab" className={styles.kpi} aria-selected={p.clave === actual?.clave} onClick={() => setActiva(p.clave)}>
            {p.etiqueta}
            <b>{p.n}</b>
          </button>
        ))}
      </div>
      <section role="tabpanel" aria-label={actual?.etiqueta}>
        {actual?.contenido}
      </section>
    </>
  );
}
