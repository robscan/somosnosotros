import Link from "next/link";
import type { ReactNode } from "react";
import Logotipo from "./Logotipo";
import styles from "./Barra.module.css";

type Props = {
  /** Enlace de regreso, alineado a la izquierda (lo que navega hacia atrás vive a la izquierda). */
  volver?: { href: string; texto: string };
  /** Algo más a la izquierda cuando no hay regreso (el inicio pone aquí la sesión). */
  izquierda?: ReactNode;
};

/** Barra superior de toda pantalla: regreso a la izquierda, logotipo a la derecha. */
export default function Barra({ volver, izquierda }: Props) {
  return (
    <header className={styles.barra}>
      <div className={styles.izquierda}>
        {volver ? (
          <Link href={volver.href} className={styles.volver}>
            ← {volver.texto}
          </Link>
        ) : (
          izquierda
        )}
      </div>
      <Logotipo />
    </header>
  );
}
