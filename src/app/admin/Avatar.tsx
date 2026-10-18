import Imagen from "@/components/ui/Imagen";
import styles from "./admin.module.css";

/**
 * Foto redonda o la inicial sobre gris, como en la barra y en las fichas de persona. La mide quien la pone (`admin.module.css`: 56 en el renglón de
 * Personas, el de las listas de la app); `lado` es esa medida, para que la foto se pida del tamaño que se ve (OL-414: antes se bajaba el original).
 */
export default function Avatar({ foto, nombre, lado = 56 }: { foto: string | null; nombre: string; lado?: number }) {
  return foto ? (
    <Imagen src={foto} alt="" className={styles.avatar} width={lado} height={lado} sizes={`${lado}px`} />
  ) : (
    <span className={styles.avatar} aria-hidden="true">
      {inicial(nombre)}
    </span>
  );
}

/** La letra que va en el círculo cuando no hay foto. */
export function inicial(nombre: string): string {
  return (nombre || "?").slice(0, 1).toUpperCase();
}
