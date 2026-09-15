import Link from "next/link";
import { IconoChevronIzquierda } from "./Iconos";
import styles from "./Atras.module.css";

/**
 * Regreso: chevron corto y píldora secundaria, alineado a la izquierda (topografía de navegación).
 * Lo usan la barra interior y las páginas de error. Ajuste del founder, 2026-09-14.
 */
export default function Atras({ href, texto }: { href: string; texto: string }) {
  return (
    <Link href={href} className={styles.atras}>
      <IconoChevronIzquierda width={18} height={18} />
      <span>{texto}</span>
    </Link>
  );
}
