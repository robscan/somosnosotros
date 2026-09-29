import Atras from "./Atras";
import Cerrar from "./Cerrar";
import Logotipo from "./Logotipo";
import styles from "./Barra.module.css";

type Destino = { href: string; texto: string };
type Props =
  | {
      /** Pantalla interior (Ajustes, una edición): regreso a la izquierda y logotipo al centro. */
      volver: Destino;
      cerrar?: undefined;
    }
  | {
      /** Formulario de alta: sin regreso; una ✕ a la derecha que vuelve igual que Atrás (founder, 2026-09-16). */
      cerrar: Destino;
      volver?: undefined;
    };

/**
 * Cabecera interior de las pantallas de tarea (Ajustes, las altas y ediciones, Entrar, administración): la que lleva cada una
 * en el teléfono, donde la barra de la app no se ve. Interior: regreso a la izquierda y SMSNSTRS al centro. Alta: SMSNSTRS al
 * centro y ✕ a la derecha. Las raíces no la llevan: su barra es la de la app (`BarraApp`, en el layout); las fichas, la suya
 * (`BarraFicha`). Una tarea la conserva desde 792, pero sin el logotipo, que ya trae la barra de la app: le quedan su Atrás o su ✕.
 */
export default function Barra({ volver, cerrar }: Props) {
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
    </header>
  );
}
