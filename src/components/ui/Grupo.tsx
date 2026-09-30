import type { ReactNode } from "react";
import styles from "./Grupo.module.css";

type Props = {
  /** Sin título (los resultados de una búsqueda) es la lista sola, con el mismo aire. */
  titulo?: string;
  /** Cuántos renglones trae el grupo; con más de uno se dice junto al título («Hoy · 2»). */
  cuenta?: number;
  /** El ancla del grupo: la tira de letras salta a ella. */
  id?: string;
  /** Los renglones (`<li>` de ui/Renglon). */
  children: ReactNode;
};

/**
 * Un grupo de una lista de pantalla raíz: un día en Agenda y Perfil, una letra en Artistas (doc 50, 5.3). Su título se
 * queda pegado bajo lo que esté pegado arriba y los renglones pasan por debajo; un solo estilo para todas las listas (H-10).
 */
export default function Grupo({ titulo, cuenta = 0, id, children }: Props) {
  return (
    <section id={id}>
      {titulo && (
        <h2 className={styles.titulo}>
          {titulo}
          {cuenta > 1 && <span>· {cuenta}</span>}
        </h2>
      )}
      <ul className={styles.lista}>{children}</ul>
    </section>
  );
}
