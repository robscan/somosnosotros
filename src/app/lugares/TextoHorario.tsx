import { Fragment } from "react";
import { lineasHorario, type Franja } from "@/lib/horarioLugar";
import styles from "./Horario.module.css";

/**
 * El horario de un lugar como se lee (OL-315; prototipo firmado `lugar-artista-por-pasos.html`): un grupo por renglón, los días arriba y las
 * horas debajo; al final, en letra suave, los días que cierra. Siempre sale de `lib/horarioLugar` (ordenado, unido y agrupado por el sistema),
 * nunca de las franjas como se capturaron. Va dentro del valor de un renglón: en «Revisa» del alta, en editar y en la ficha (sin JavaScript
 * propio, así la ficha lo pinta en el servidor).
 */
export default function TextoHorario({ franjas }: { franjas: readonly Franja[] }) {
  const { lineas, cierra } = lineasHorario(franjas);
  return (
    <span className={styles.lineas}>
      {lineas.map((l) => (
        <span key={l.dias} className={styles.linea}>
          <b>{l.dias}</b>
          {/* Cada rango entero en su renglón si no cabe: se parte entre rangos, nunca dentro de uno. */}
          <small>
            {l.rangos.map((rango, i) => (
              <Fragment key={rango}>
                {i === 0 ? "" : i === l.rangos.length - 1 ? " y " : ", "}
                <span className={styles.rango}>{rango}</span>
              </Fragment>
            ))}
          </small>
        </span>
      ))}
      {cierra && <small className={styles.cierra}>{cierra}</small>}
    </span>
  );
}
