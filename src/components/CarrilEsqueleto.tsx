import { EsqueletoTarjeta } from "@/components/ui/Esqueleto";
import styles from "./CarrilEsqueleto.module.css";

/**
 * El `fallback` de cada `<Suspense>` de Inicio (OL-156, segunda vuelta, pedido del founder tras probar en
 * producción: "no usa skeletons con carga progresiva; tarda un rato con el logo al centro antes de verse algo").
 * Mismo alto que el carril real (`Destacados.module.css`, las variables `--alto-*`), para que la página no salte al
 * llegar la respuesta: título y tarjetas son bloques grises que respiran, nunca el texto real —no se conoce todavía
 * (el título del carril estelar depende de si hay favoritos o no). Las tarjetas son `EsqueletoTarjeta` (OL-158,
 * `ui/Esqueleto`): un solo origen para la medida de una tarjeta de carril, aquí y en cualquier otra lista.
 */
export default function CarrilEsqueleto({ tamano = "mediana", cantidad = 3 }: { tamano?: "grande" | "mediana" | "chica"; cantidad?: number }) {
  return (
    <section className={`${styles.esqueleto} ${styles[tamano]}`} aria-hidden="true">
      <div className={styles.cabecera}>
        <span className={`${styles.titulo} ${styles.respira}`} />
        <span className={`${styles.verTodos} ${styles.respira}`} />
      </div>
      <div className={styles.carril}>
        {Array.from({ length: cantidad }, (_, i) => (
          <EsqueletoTarjeta key={i} tamano={tamano} />
        ))}
      </div>
    </section>
  );
}
