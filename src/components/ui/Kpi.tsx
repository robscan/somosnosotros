import type { ReactNode } from "react";
import Salto from "./Salto";
import styles from "./Kpi.module.css";

/**
 * Los tres números de una ficha, en una fila (`Kpi` × 3). `piel="banda"`: sobre la banda oscura de la cabecera de una exposición, un taller o
 * un festival (OL-351), en blanco translúcido.
 */
export function Kpis({ piel, children }: { piel?: "banda"; children: ReactNode }) {
  return <ul className={piel === "banda" ? `${styles.kpis} ${styles.sobreBanda}` : styles.kpis}>{children}</ul>;
}

type Props = {
  icono: ReactNode;
  /** Qué es («Costo», «Van»); en la fecha, la hora: el día ya dice que es una fecha. */
  etiqueta: string;
  valor: ReactNode;
  /** El `id` de la sección de la misma pantalla a la que baja al tocarlo (`ui/Salto`). Sin él ni `alTocar`, la tarjeta solo informa. */
  salto?: string;
  /** Lo que hace al tocarlo, con su nombre para quien no lo ve: la distancia, sin ubicación, la pide. */
  alTocar?: { hace: () => void; nombre: string };
};

/** Un número de la ficha: el icono y lo que es arriba, el valor abajo. Si hay algo que hacer al tocarlo, toda la tarjeta lo hace. */
export function Kpi({ icono, etiqueta, valor, salto, alTocar }: Props) {
  const contenido = (
    <>
      {icono}
      <small>{etiqueta}</small>
      <b>{valor}</b>
    </>
  );
  return (
    <li>
      {salto ? (
        <Salto destino={salto} className={styles.kpi}>
          {contenido}
        </Salto>
      ) : alTocar ? (
        <button type="button" className={styles.kpi} onClick={alTocar.hace} aria-label={alTocar.nombre}>
          {contenido}
        </button>
      ) : (
        <div className={styles.kpi}>{contenido}</div>
      )}
    </li>
  );
}
