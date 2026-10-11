import Link from "next/link";
import type { MouseEventHandler, ReactNode } from "react";
import { SIN_FOTO } from "@/lib/imagen";
import Imagen from "./Imagen";
import styles from "./Renglon.module.css";

type Props = {
  href: string;
  /** La foto de la izquierda; sin ella, la imagen de relleno cuadrada (el símbolo SN). */
  foto: string | null;
  /** Redonda es gente (un artista); cuadrada es un lugar o un evento. */
  redonda?: boolean;
  /** En una lista larga (artistas) las fotos se piden al llegar a ellas. */
  perezosa?: boolean;
  titulo: string;
  /** El botón de la derecha (Voy, Seguir): hermano del enlace, nunca dentro de él. */
  accion?: ReactNode;
  /**
   * El botón todavía no llega (la cuenta se lee en el teléfono, después del primer pintado): su sitio queda guardado, vacío. Así el texto
   * no cambia de ancho cuando llega, ni salta, y Safari no deja el renglón con el alto que tenía antes (con la letra grande, el texto se
   * montaba sobre el renglón siguiente; OL-373).
   */
  accionEnEspera?: boolean;
  /** Lo que hace el toque además de llevar a `href` (quien lo pone puede frenar la navegación: la ficha se abre en otro sitio). */
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  /**
   * Los datos, uno por línea: cada uno un `<span>` con su icono y su texto en otro `<span>` (o `<b>`), que se corta con puntos
   * suspensivos al llegar al borde de su columna. Con la clase `envuelve` (una dirección) el texto va suelto y se parte en
   * dos renglones.
   */
  children: ReactNode;
};

/**
 * El renglón de lista (evento en la agenda, lugar en Lugares, artista en Artistas): foto a la izquierda, título y datos
 * con icono a la derecha, y el botón de acción (OL-104, bitácora 139) a la derecha del todo. Las otras tres pieles del
 * renglón (dato, ajuste y resuelto) son las clases de `Renglon.module.css`.
 */
export default function Renglon({ href, foto, redonda = false, perezosa = false, titulo, accion, accionEnEspera = false, onClick, children }: Props) {
  return (
    <li className={styles.lista}>
      <Link href={href} className={styles.frente} onClick={onClick}>
        <Imagen src={foto ?? SIN_FOTO} alt="" width={56} height={56} sizes="56px" className={redonda ? `${styles.foto} ${styles.redonda}` : styles.foto} loading={perezosa ? "lazy" : "eager"} />
        <b>{titulo}</b>
        <small>{children}</small>
      </Link>
      {accion ?? (accionEnEspera && <span className={styles.accionEnEspera} aria-hidden="true" />)}
    </li>
  );
}
