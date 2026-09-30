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
      /** Formulario de alta: sin regreso; una ✕ a la derecha que vuelve igual que Atrás (founder, 2026-09-16), y el título en medio. */
      cerrar: Destino;
      titulo: string;
      volver?: undefined;
    };

/**
 * Cabecera interior de las pantallas de tarea (Ajustes, la alta y las ediciones, Entrar, administración): la que lleva cada una
 * en el teléfono, donde la barra de la app no se ve. Interior: regreso a la izquierda y SMSNSTRS al centro. Alta: el título de la
 * pantalla al centro (el único encabezado de la página) y ✕ a la derecha (canon del prototipo firmado). Las raíces no la llevan: su
 * barra es la de la app (`BarraApp`, en el layout); las fichas, la suya (`BarraFicha`). Una tarea con regreso la conserva desde 792,
 * pero sin el logotipo, que ya trae la barra de la app: le quedan su Atrás.
 * Va como hija directa de la plantilla `pagina` (o `paginaContenido`, de `ui/Plantilla`), que le da las tres columnas de la rejilla.
 */
export default function Barra(props: Props) {
  if (props.cerrar) {
    return (
      <header className={`${styles.barra} ${styles.interior} ${styles.alta}`}>
        <h1 className={styles.titulo}>{props.titulo}</h1>
        <Cerrar href={props.cerrar.href} texto={props.cerrar.texto} />
      </header>
    );
  }
  const { volver } = props;
  return (
    <header className={`${styles.barra} ${styles.interior}`}>
      <Atras href={volver.href} texto={volver.texto} />
      <Logotipo chico className={styles.logotipo} />
    </header>
  );
}
