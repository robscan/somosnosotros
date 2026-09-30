import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./Renglon.module.css";

type Props = {
  href: string;
  /** La foto de la izquierda. */
  foto: string;
  /** Redonda es gente (un artista); cuadrada es un lugar o un evento. */
  redonda?: boolean;
  /** En una lista larga (artistas) las fotos se piden al llegar a ellas. */
  perezosa?: boolean;
  titulo: string;
  /** Los datos de debajo van uno por línea (un lugar, un artista) en vez de seguidos (un evento). */
  columna?: boolean;
  /** El botón de la derecha (Voy, Seguir): hermano del enlace, nunca dentro de él. */
  accion?: ReactNode;
  /**
   * Los datos: cada uno un `<span>` con su icono y su texto en otro `<span>` (o `<b>`), que se corta con puntos suspensivos
   * al llegar al borde de su columna. Con la clase `envuelve` (una dirección) el texto va suelto y se parte en dos renglones.
   */
  children: ReactNode;
};

/**
 * El renglón de lista (evento en la agenda, lugar en Lugares, artista en Artistas): foto a la izquierda, título y datos
 * con icono a la derecha, y el botón de acción (OL-104, bitácora 139) a la derecha del todo. Las otras tres pieles del
 * renglón (dato, ajuste y resuelto) son las clases de `Renglon.module.css`.
 */
export default function Renglon({ href, foto, redonda = false, perezosa = false, titulo, columna = false, accion, children }: Props) {
  return (
    <li className={styles.lista}>
      <Link href={href} className={styles.frente}>
        {/* eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage */}
        <img src={foto} alt="" className={redonda ? `${styles.foto} ${styles.redonda}` : styles.foto} loading={perezosa ? "lazy" : undefined} decoding={perezosa ? "async" : undefined} />
        <b>{titulo}</b>
        <small className={columna ? styles.columna : undefined}>{children}</small>
      </Link>
      {accion}
    </li>
  );
}
