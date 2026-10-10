import styles from "./Destacados.module.css";
import avatar from "./inicio/TarjetaAvatar.module.css";
import evento from "./inicio/TarjetaEvento.module.css";
import esqueleto from "./ui/Esqueleto.module.css";
import propios from "./CarrilEsqueleto.module.css";

/**
 * Qué tarjeta lleva un carril de Inicio (prototipo firmado `inicio-tarjetas.html`, E5): `grande` y `mediana`, la de un evento (OL-370; 165×206 en
 * Tus planes, Destacados y Festivales y expos, 132×165 en Esta semana, Nuevos eventos y Más adelante); `artista`, la de un artista en «Artistas
 * destacadxs», que es la mediana de un evento (E9, OL-372); `avatar`, el redondo de 64 de «Lugares de la semana» y «Artistas de la semana» (OL-372).
 */
export type FormaCarril = "grande" | "mediana" | "artista" | "avatar";

/** Las columnas del carril de cada forma (`Destacados.module.css`): el carril y su esqueleto usan la misma. */
export function columnasDe(forma: FormaCarril): string {
  return forma === "grande" ? styles.cartelGrande : forma === "avatar" ? styles.avatar : styles.cartelMediana;
}

/**
 * El `fallback` de cada `<Suspense>` de Inicio (OL-156, segunda vuelta, pedido del founder tras probar en
 * producción: "no usa skeletons con carga progresiva; tarda un rato con el logo al centro antes de verse algo").
 * Es el carril real con barras grises que respiran en lugar de foto y texto (nunca el texto real: no se conoce
 * todavía, el título del carril estelar depende de si hay favoritos o no): usa las clases del carril
 * (`Destacados.module.css`) y de su tarjeta, así mide lo mismo que el carril y la página no salta al llegar la respuesta (doc 50, P10: una sola
 * fuente de tamaños). Las líneas de texto llevan un espacio duro: ocupan el alto de una línea de verdad, sin copiar ninguna medida.
 *
 * Cada forma, con la tarjeta del caso que más alto deja su carril de ordinario:
 * - `grande` y `mediana` (OL-370): el cartel 4:5 de su tamaño, el título en dos líneas, el lugar y cuándo.
 * - `artista` (OL-372): la foto mediana, la disciplina, el nombre en una línea, el género y la fecha.
 * - `avatar` (OL-372): el círculo de 64 y el nombre, sin novedad (la mayoría no la tiene); cinco, para llenar el ancho como el carril.
 */
export default function CarrilEsqueleto({ forma, cantidad = forma === "avatar" ? 5 : 3 }: { forma: FormaCarril; cantidad?: number }) {
  const tarjeta = forma === "grande" ? evento.tarjeta : `${evento.tarjeta} ${evento.mediana}`;
  return (
    <section className={styles.destacados} aria-hidden="true">
      <div className={styles.cabecera}>
        <span className={`${propios.titulo} ${esqueleto.respira}`} />
        <span className={styles.verTodo}>
          <span className={`${propios.verTodos} ${esqueleto.respira}`} />
        </span>
      </div>
      <ul className={`${styles.carril} ${columnasDe(forma)}`}>
        {Array.from({ length: cantidad }, (_, i) => (
          <li key={i}>
            {forma === "avatar" ? (
              <span className={avatar.avatar}>
                <span className={`${avatar.foto} ${esqueleto.respira}`} />
                <span className={`${avatar.nombre} ${esqueleto.respira} ${propios.corta}`}>&nbsp;</span>
              </span>
            ) : (
              <span className={tarjeta}>
                <span className={`${evento.cartel} ${esqueleto.respira}`} />
                {forma === "artista" ? (
                  <>
                    <span className={`${evento.ceja} ${esqueleto.respira} ${propios.corta}`}>&nbsp;</span>
                    <span className={`${evento.titulo} ${esqueleto.respira}`}>&nbsp;</span>
                  </>
                ) : (
                  <span className={`${evento.titulo} ${propios.dosLineas} ${esqueleto.respira}`} />
                )}
                <span className={`${evento.lugar} ${esqueleto.respira}`}>&nbsp;</span>
                <span className={`${evento.cuando} ${esqueleto.respira} ${propios.corta}`}>&nbsp;</span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
