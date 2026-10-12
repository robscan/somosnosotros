import type { ReactNode } from "react";
import { IconoCaret } from "./Iconos";
import styles from "./Plegado.module.css";

type Props = {
  /** El `id` de la sección: un número de la ficha baja aquí con `ui/Salto`, que la abre. */
  id?: string;
  /** El título del bloque («Trayectoria», «Historial», «Ya pasó»). */
  titulo: string;
  /** La cuenta, en gris bajo el título («3 fechas · 2 lugares»). */
  cuenta: string;
  /** Lo de dentro, hijos directos del bloque (maquetación plana): cada grupo con su `h3` y su lista de renglones. */
  children: ReactNode;
};

/**
 * Lo que ya pasó, plegado bajo lo que viene (OL-383 en el festival; OL-390 en las fichas de artista y de lugar): un `<details>` que se abre sin
 * JavaScript y no se recuerda. Su renglón dice qué es y cuánto hay; dentro, los renglones se ven pasados (`Plegado.module.css`).
 */
export default function Plegado({ id, titulo, cuenta, children }: Props) {
  return (
    <details id={id} className={styles.plegado} aria-label={titulo}>
      <summary>
        <h2>{titulo}</h2>
        <small>{cuenta}</small>
        <IconoCaret />
      </summary>
      {children}
    </details>
  );
}
