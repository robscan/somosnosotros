import Link from "next/link";
import { Children, type MouseEventHandler, type ReactNode } from "react";
import { SIN_FOTO } from "@/lib/imagen";
import girando from "./Girando.module.css";
import { IconoOk } from "./Iconos";
import Imagen from "./Imagen";
import styles from "./Renglon.module.css";

/** Lo que dice la última línea de un renglón que está pasando (OL-506): en camino, otro intento, hecho o no se pudo. */
export type EstadoRenglon = "en-camino" | "reintentando" | "hecho" | "fallido";

type Props = {
  href: string;
  /** La foto de la izquierda; sin ella, la imagen de relleno cuadrada (el símbolo SN). */
  foto: string | null;
  /** Redonda es gente (un artista); cuadrada es un lugar o un evento. */
  redonda?: boolean;
  /** Una publicación en pequeño (4:5, como el cartel en Instagram): la semana de Instagram de Administración (OL-479). */
  cartel?: boolean;
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
  /**
   * OL-506 (prototipo firmado el 2026-11-02, bitácora 535): algo de este renglón está pasando ahora (publicar en Instagram). Con él, el último hijo
   * es el texto de la línea del estado («Publicando…», «Publicado · hace un momento», «No se publicó: …»): el renglón la arma, se parte en dos
   * renglones si no cabe (`envuelve`), se anuncia (`role="status"`) y es lo único que se tiñe: violeta con el anillo de `ui/Girando` (en camino,
   * otro intento), verde con palomita (hecho) o rojo (no se pudo). El fondo no cambia (el tono suave del violeta ya dice «elegido»).
   */
  estado?: EstadoRenglon;
  /** Una línea más debajo de la del estado, que no se tiñe (el espejo en Facebook: «Facebook: publicando…» con su propio anillo). */
  otraLinea?: ReactNode;
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
export default function Renglon({ href, foto, redonda = false, cartel = false, perezosa = false, titulo, accion, accionEnEspera = false, estado, otraLinea, onClick, children }: Props) {
  const lineas = Children.toArray(children);
  const texto = estado ? lineas.pop() : null;
  return (
    <li className={styles.lista}>
      <Link href={href} className={styles.frente} onClick={onClick}>
        <Imagen src={foto ?? SIN_FOTO} alt="" width={cartel ? 45 : 56} height={56} sizes={cartel ? "45px" : "56px"} className={cartel ? `${styles.foto} ${styles.cartel}` : redonda ? `${styles.foto} ${styles.redonda}` : styles.foto} loading={perezosa ? "lazy" : "eager"} />
        <b>{titulo}</b>
        <small>
          {lineas}
          {estado && (
            <span className={`${styles.envuelve} ${styles.estado}`} data-estado={estado} role="status">
              {estado === "hecho" ? <IconoOk className={styles.marca} width={16} height={16} /> : estado !== "fallido" && <span className={`${girando.anillo} ${styles.marca}`} aria-hidden="true" />}
              <span>{texto}</span>
            </span>
          )}
          {otraLinea}
        </small>
      </Link>
      {accion ?? (accionEnEspera && <span className={styles.accionEnEspera} aria-hidden="true" />)}
    </li>
  );
}
