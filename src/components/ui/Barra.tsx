import type { ReactNode } from "react";
import EnBarra from "../EnBarra";
import Atras from "./Atras";
import Cerrar from "./Cerrar";
import Logotipo from "./Logotipo";
import styles from "./Barra.module.css";

type Destino = { href: string; texto: string };
type Props =
  | {
      /** Pantalla interior (una ficha, Ajustes): regreso a la izquierda y logotipo al centro. */
      volver: Destino;
      /** A la derecha, como hijo directo de la barra: solo un menú "···" cuando hay algo que poner. */
      derecha?: ReactNode;
      cerrar?: undefined;
    }
  | {
      /** Formulario de alta: sin regreso; una ✕ a la derecha que vuelve igual que Atrás (founder, 2026-09-16). */
      cerrar: Destino;
      volver?: undefined;
      derecha?: undefined;
    };

/**
 * Cabecera interior de las pantallas que no son raíz (las fichas, Ajustes, las altas): la que lleva cada una en el
 * teléfono, donde la barra de la app no se ve. Interior: regreso a la izquierda, SMSNSTRS al centro y, si hay algo que
 * poner, un menú "···" a la derecha. Alta: SMSNSTRS al centro y ✕ a la derecha. Las raíces ya no la llevan: su barra
 * es la de la app (`BarraApp`, en el layout). Desde 792 la ficha tampoco la enseña (nunca dos barras): su Atrás y su
 * menú, que aquí se le prestan a la barra de la app (`EnBarra`), viven ahí. Una tarea (alta, Ajustes, Entrar) sí la
 * conserva desde 792, pero sin el logotipo, que ya trae la barra de la app: le quedan su Atrás o su ✕.
 */
export default function Barra({ volver, cerrar, derecha }: Props) {
  if (cerrar) {
    return (
      <header className={`${styles.barra} ${styles.interior} ${styles.alta}`}>
        <Logotipo chico className={styles.logotipo} />
        <Cerrar href={cerrar.href} texto={cerrar.texto} />
      </header>
    );
  }
  return (
    <header className={`${styles.barra} ${styles.interior}`}>
      <Atras href={volver.href} texto={volver.texto} />
      <Logotipo chico className={styles.logotipo} />
      {derecha}
      <EnBarra volver={volver} menu={derecha} />
    </header>
  );
}
