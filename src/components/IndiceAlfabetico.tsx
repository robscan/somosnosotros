import Link from "next/link";
import styles from "./IndiceAlfabetico.module.css";

export const LETRAS_DIRECTORIO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** Índice compacto para ir a un tramo del directorio sin pedir el catálogo entero. */
export default function IndiceAlfabetico({ letra, href, onSeleccionar, hrefTodos, onQuitar }: { letra: string | null; href?: (letra: string) => string; onSeleccionar?: (letra: string) => void; hrefTodos?: string; onQuitar?: () => void }) {
  return (
    <nav className={styles.indice} aria-label="Ir a una letra">
      {hrefTodos ? <Link href={hrefTodos} scroll={false} replace aria-label="Ver todas las letras" className={!letra ? styles.activa : undefined}>•</Link> : <button type="button" onClick={onQuitar} aria-label="Ver todas las letras" className={!letra ? styles.activa : undefined}>•</button>}
      {LETRAS_DIRECTORIO.map((x) => (
        href ? <Link key={x} href={href(x)} scroll={false} replace aria-current={letra === x ? "page" : undefined} className={letra === x ? styles.activa : undefined}>{x}</Link> :
          <button key={x} type="button" onClick={() => onSeleccionar?.(x)} aria-pressed={letra === x} className={letra === x ? styles.activa : undefined}>{x}</button>
      ))}
    </nav>
  );
}
