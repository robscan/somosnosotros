"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Logotipo.module.css";

type Props = {
  /** Versión para tamaños chicos: dedos más gruesos y calzado sin cordones (barra interior). */
  chico?: boolean;
};

/**
 * El logotipo es el dibujo SMSNSTRS con manos y pies (docs/diseno/logotipo), un SVG en public/.
 * Grande a la izquierda en las pantallas raíz; la versión chica al centro en las interiores. Lleva al inicio.
 * Ya en el inicio (con o sin filtro) no apila historial: sigue siendo la misma pantalla (OL-055).
 * Dos nodos: el enlace (área de toque de 44 px) y el dibujo. La altura va en rem y crece con el texto del teléfono.
 */
export default function Logotipo({ chico = false }: Props) {
  const enInicio = usePathname() === "/";
  return (
    <Link href="/" replace={enInicio} className={styles.logotipo} aria-label="Somos Nosotros, ir al inicio">
      <Image
        src={chico ? "/logotipo-chico.svg" : "/logotipo.svg"}
        alt=""
        width={3903}
        height={790}
        className={chico ? styles.chico : styles.completo}
        unoptimized
        preload
      />
    </Link>
  );
}
