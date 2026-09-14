import Link from "next/link";
import styles from "./Logotipo.module.css";

/**
 * El logotipo es texto, no imagen (docs/diseno/LINEA_GRAFICA.md): SMSNSTRS en Bricolage Grotesque,
 * peso 800, ancho 75, en el color del texto. Va arriba a la derecha de cada barra y lleva al inicio.
 */
export default function Logotipo() {
  return (
    <Link href="/" className={styles.logotipo} aria-label="Somos Nosotros, ir al inicio">
      SMSNSTRS
    </Link>
  );
}
