"use client";

import { useState, type ReactNode } from "react";
import { IconoCampana, IconoMarcador, IconoOk, IconoPersonas } from "./ui/Iconos";
import kpi from "./ui/Kpi.module.css";
import styles from "./PestanasPersona.module.css";

export type Pestana = { clave: string; n: number; etiqueta: string; contenido: ReactNode };

/** El icono de cada número de una persona (Voy, Interesan, Sigo, Van a lo mismo), como en las tarjetas del prototipo firmado. */
const ICONO: Record<string, ReactNode> = {
  va: <IconoOk width={16} height={16} />,
  interesa: <IconoMarcador width={16} height={16} />,
  sigue: <IconoCampana width={16} height={16} />,
  juntos: <IconoPersonas width={16} height={16} />,
};

/**
 * Resumen en números que hace de pestañas (corrección del founder, docs/rediseno/13 decisión 5): tarjetas con su icono, su letrero y
 * su número grande (`ui/Kpi`, docs/rediseno/50, P5 y P6), las que haya repartiéndose el ancho y la elegida en el color de acción.
 * Tocar un número muestra su lista: un solo control para leer y para navegar. El panel deja lo que no es un grupo de día (un
 * vacío, los chips y las listas de lo que sigue) con el aire de la página; los grupos (`ui/Grupo`) ya lo traen. Igual en Mi perfil y
 * en la ficha de otra persona.
 */
export default function PestanasPersona({ pestanas }: { pestanas: Pestana[] }) {
  const [activa, setActiva] = useState(pestanas[0]?.clave ?? "");
  const actual = pestanas.find((p) => p.clave === activa) ?? pestanas[0];
  // Si la que estaba ya no está (las pestañas cambian con los gestos), la activa pasa a ser la que se muestra.
  if (actual && actual.clave !== activa) setActiva(actual.clave);
  return (
    <>
      <div role="tablist" aria-label="Actividad" className={styles.tarjetas}>
        {pestanas.map((p) => (
          <button key={p.clave} type="button" role="tab" aria-selected={p.clave === actual?.clave} className={`${kpi.kpi} ${styles.tarjeta}`} onClick={() => setActiva(p.clave)}>
            {ICONO[p.clave]}
            <small>{p.etiqueta}</small>
            <b>{p.n}</b>
          </button>
        ))}
      </div>
      <section role="tabpanel" aria-label={actual?.etiqueta} className={styles.panel}>
        {actual?.contenido}
      </section>
    </>
  );
}
