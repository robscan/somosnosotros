import Image from "next/image";
import Link from "next/link";
import styles from "./Logotipo.module.css";

type Props = {
  /** Barra interior: el mismo dibujo, a la altura chica. */
  chico?: boolean;
};

/**
 * El logotipo es el dibujo SMSNSTRS con manos y pies, arte final del founder (docs/diseno/logotipo/LogoFinal),
 * exportado a public/logotipo.svg. Grande a la izquierda en las pantallas raíz; chico al centro en las interiores. Lleva al inicio.
 * Dos nodos: el enlace (área de toque de 44 px) y el dibujo. La altura va en rem y crece con el texto del teléfono.
 */
export default function Logotipo({ chico = false }: Props) {
  return (
    <Link href="/" className={styles.logotipo} aria-label="Somos Nosotros, ir al inicio">
      <Image
        src="/logotipo.svg"
        alt=""
        width={3908}
        height={795}
        className={chico ? styles.chico : styles.completo}
        unoptimized
        preload
      />
    </Link>
  );
}
