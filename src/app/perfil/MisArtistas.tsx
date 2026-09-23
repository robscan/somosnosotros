import Link from "next/link";
import { etiquetaArtista, etiquetaVerMiFicha, hrefArtista, type ArtistaResumen } from "@/lib/artistas";
import styles from "./MisArtistas.module.css";

/**
 * «Mis artistas» en Mi perfil (OL-154, doc 40b; renglón simple en OL-159; tarjeta repuesta en OL-163): el founder
 * pidió de vuelta la tarjeta blanca original — avatar, nombre, disciplina y el botón «Ver mi ficha de artista» —
 * quitando solo el botón de compartir (ese vive en la ficha, junto al avatar, desde OL-159) para que el texto se
 * expanda. La disciplina corta a las dos líneas con puntos suspensivos si no cabe. Quien llama decide si se
 * muestra: sin artistas ligados, el bloque entero no aparece.
 */
export default function MisArtistas({ artistas }: { artistas: ArtistaResumen[] }) {
  return (
    <div className={styles.seccion}>
      <h2>Mis artistas</h2>
      {artistas.map((a) => (
        <div key={a.id} className={styles.tarjeta}>
          {a.foto ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
            <img src={a.foto} alt="" className={styles.foto} />
          ) : (
            <span className={`${styles.foto} ${styles.fotoVacia}`} aria-hidden="true">
              {a.nombre.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className={styles.nombre}>
            <b>{a.nombre}</b>
            <small>{etiquetaArtista(a)}</small>
          </div>
          <Link href={hrefArtista(a)} className={styles.verFicha}>
            {etiquetaVerMiFicha(artistas.length)}
          </Link>
        </div>
      ))}
    </div>
  );
}
