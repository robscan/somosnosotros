import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./Tarjeta.module.css";

type Miniatura = { src?: string | null; letra: string };

type Props = {
  /** Con enlace es una tarjeta que se toca; sin él, un bloque de lectura. */
  href?: string;
  /** Foto a la izquierda; sin foto, la inicial. Sin este prop no hay miniatura. */
  miniatura?: Miniatura;
  /** Línea pequeña arriba del título (el "cuándo" de un evento). */
  arriba?: ReactNode;
  titulo: ReactNode;
  /** Línea gris debajo del título (lugar, tipo, precio). */
  detalle?: ReactNode;
  /** Contenido adicional bajo el detalle (para tarjetas de lectura). */
  children?: ReactNode;
};

/**
 * La única tarjeta de lista de la app: agenda, lugares, perfil, personas y admin usan esta.
 * Alto mínimo 64px, miniatura 56px, texto en dos o tres líneas con recorte.
 */
export default function Tarjeta({ href, miniatura, arriba, titulo, detalle, children }: Props) {
  const contenido = (
    <>
      {miniatura && (
        <div className={styles.miniatura} aria-hidden="true">
          {miniatura.src ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
            <img src={miniatura.src} alt="" />
          ) : (
            <span>{miniatura.letra.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
      )}
      <div className={styles.texto}>
        {arriba && <span className={styles.arriba}>{arriba}</span>}
        <strong className={styles.titulo}>{titulo}</strong>
        {detalle && <span className={styles.detalle}>{detalle}</span>}
        {children}
      </div>
    </>
  );
  return href ? (
    <Link href={href} className={styles.tarjeta}>
      {contenido}
    </Link>
  ) : (
    <div className={styles.tarjeta}>{contenido}</div>
  );
}
