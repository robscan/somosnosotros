"use client";

import { useState, type ReactNode } from "react";
import { Pestana, Pestanas } from "./ui/Pestanas";
import styles from "./PestanasPersona.module.css";

export type Pestana = { clave: string; n: number; etiqueta: string; contenido: ReactNode };

/**
 * Resumen en números que hace de pestañas (corrección del founder, docs/rediseno/13 decisión 5): "2 Voy a", "2 Sigo",
 * "1 Van a lo mismo". Tocar un número muestra su lista: un solo control para leer y para navegar. Sobre ui/Pestanas.
 */
export default function PestanasPersona({ pestanas }: { pestanas: Pestana[] }) {
  const [activa, setActiva] = useState(pestanas[0]?.clave ?? "");
  const actual = pestanas.find((p) => p.clave === activa) ?? pestanas[0];
  // Si la que estaba ya no está (las pestañas cambian con los gestos), la activa pasa a ser la que se muestra.
  if (actual && actual.clave !== activa) setActiva(actual.clave);
  return (
    <>
      <Pestanas ariaLabel="Actividad" className={styles.kpis}>
        {pestanas.map((p) => (
          <Pestana key={p.clave} activa={p.clave === actual?.clave} onClick={() => setActiva(p.clave)} className={styles.kpi}>
            {p.etiqueta}
            <b>{p.n}</b>
          </Pestana>
        ))}
      </Pestanas>
      <section role="tabpanel" aria-label={actual?.etiqueta}>
        {actual?.contenido}
      </section>
    </>
  );
}
