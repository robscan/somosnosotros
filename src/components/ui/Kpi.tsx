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

/**
 * Si la etiqueta lleva una hora («7:00 pm», «Fue · 11:00 am–2:00 pm»), sus trozos: va tal cual, sin mayúsculas (el «pm» no se lee «PM»), y en
 * vez de cortarse con «…» puede bajar de renglón, pero solo tras « · » o tras el guion del rango, nunca dentro de una hora (OL-418: un rango en
 * 12 horas no cabe en un tercio de ancho). Null si no lleva hora.
 */
const trozosDeHora = (etiqueta: string): string[] | null =>
  // Sin «(?<=…)»: el Safari de un iPhone viejo no lo entiende y este componente también va al teléfono.
  /\d (am|pm)\b/.test(etiqueta) ? etiqueta.replace(/(–|· )/g, "$1\n").split("\n").filter(Boolean) : null;

/** Un número de la ficha: el icono y lo que es arriba, el valor abajo. Si hay algo que hacer al tocarlo, toda la tarjeta lo hace. */
export function Kpi({ icono, etiqueta, valor, salto, alTocar }: Props) {
  const trozos = trozosDeHora(etiqueta);
  const contenido = (
    <>
      {icono}
      {/* Una hora sola («7:00 pm») va en un renglón, como cualquier etiqueta; solo un rango o «Fue · …» se parte, y solo entre sus trozos. */}
      {trozos && trozos.length > 1 ? (
        <small className={`${styles.hora} ${styles.partida}`}>
          {trozos.map((trozo, i) => (
            <span key={i}>{trozo}</span>
          ))}
        </small>
      ) : (
        <small className={trozos ? styles.hora : undefined}>{etiqueta}</small>
      )}
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
