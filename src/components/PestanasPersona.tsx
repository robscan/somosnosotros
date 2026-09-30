"use client";

import { useState, type ReactNode } from "react";
import { IconoCampana, IconoEstrella, IconoOk } from "./ui/Iconos";
import { Pestana, Pestanas } from "./ui/Pestanas";
import styles from "./PestanasPersona.module.css";

export type Pestana = { clave: string; n: number; etiqueta: string; contenido: ReactNode };

/** El icono de cada número de Mi perfil (Voy, Interesan, Sigo), como en las tarjetas del prototipo firmado. */
const ICONO: Record<string, ReactNode> = {
  va: <IconoOk width={16} height={16} />,
  interesa: <IconoEstrella width={16} height={16} />,
  sigue: <IconoCampana width={16} height={16} />,
};

/**
 * Resumen en números que hace de pestañas (corrección del founder, docs/rediseno/13 decisión 5): "2 Voy a", "2 Sigo",
 * "1 Van a lo mismo". Tocar un número muestra su lista: un solo control para leer y para navegar. En la ficha de otra
 * persona, sobre ui/Pestanas; en Mi perfil (`raiz`, docs/rediseno/50 P5) son tarjetas con su icono, su letrero y su número
 * grande, y el panel deja lo que no es un grupo de día con el aire de la página (los grupos, `ui/Grupo`, lo traen).
 */
export default function PestanasPersona({ pestanas, raiz = false }: { pestanas: Pestana[]; raiz?: boolean }) {
  const [activa, setActiva] = useState(pestanas[0]?.clave ?? "");
  const actual = pestanas.find((p) => p.clave === activa) ?? pestanas[0];
  // Si la que estaba ya no está (las pestañas cambian con los gestos), la activa pasa a ser la que se muestra.
  if (actual && actual.clave !== activa) setActiva(actual.clave);
  return (
    <>
      {raiz ? (
        <div role="tablist" aria-label="Actividad" className={styles.tarjetas}>
          {pestanas.map((p) => (
            <button key={p.clave} type="button" role="tab" aria-selected={p.clave === actual?.clave} className={styles.tarjeta} onClick={() => setActiva(p.clave)}>
              {ICONO[p.clave]}
              <small>{p.etiqueta}</small>
              <b>{p.n}</b>
            </button>
          ))}
        </div>
      ) : (
        <Pestanas ariaLabel="Actividad" className={styles.kpis}>
          {pestanas.map((p) => (
            <Pestana key={p.clave} activa={p.clave === actual?.clave} onClick={() => setActiva(p.clave)} className={styles.kpi}>
              {p.etiqueta}
              <b>{p.n}</b>
            </Pestana>
          ))}
        </Pestanas>
      )}
      <section role="tabpanel" aria-label={actual?.etiqueta} className={raiz ? styles.panelRaiz : undefined}>
        {actual?.contenido}
      </section>
    </>
  );
}
