import styles from "./Destacados.module.css";
import esqueleto from "./ui/Esqueleto.module.css";
import propios from "./CarrilEsqueleto.module.css";

/**
 * El `fallback` de cada `<Suspense>` de Inicio (OL-156, segunda vuelta, pedido del founder tras probar en
 * producción: "no usa skeletons con carga progresiva; tarda un rato con el logo al centro antes de verse algo").
 * Es el carril real con barras grises que respiran en lugar de foto y texto (nunca el texto real: no se conoce
 * todavía, el título del carril estelar depende de si hay favoritos o no): usa las clases de `Destacados.module.css`
 * —la rejilla, los tokens `--tarjeta-*`, la letra del título y de los datos—, así mide lo mismo que el carril y la
 * página no salta al llegar la respuesta (doc 50, P10: una sola fuente de tamaños). Las líneas de texto llevan un
 * espacio duro: ocupan el alto de una línea de verdad, sin copiar ninguna medida.
 */
export default function CarrilEsqueleto({ tamano = "mediana", cantidad = 3 }: { tamano?: "grande" | "mediana" | "chica"; cantidad?: number }) {
  return (
    <section className={styles.destacados} aria-hidden="true">
      <div className={styles.cabecera}>
        <span className={`${propios.titulo} ${esqueleto.respira}`} />
        <span className={styles.verTodo}>
          <span className={`${propios.verTodos} ${esqueleto.respira}`} />
        </span>
      </div>
      <ul className={`${styles.carril} ${styles[tamano]}`}>
        {Array.from({ length: cantidad }, (_, i) => (
          <li key={i}>
            <span className={styles.tarjeta}>
              <span className={`${styles.foto} ${esqueleto.respira}`} />
              <b className={esqueleto.respira}>&nbsp;</b>
              <small>
                <span className={esqueleto.respira}>&nbsp;</span>
                <span className={`${esqueleto.respira} ${propios.corta}`}>&nbsp;</span>
              </small>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
