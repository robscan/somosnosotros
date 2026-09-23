import Link from "next/link";
import CompartirFicha from "@/components/ui/CompartirFicha";
import { etiquetaArtista, etiquetaVerMiFicha, hrefArtista, type ArtistaResumen } from "@/lib/artistas";
import styles from "./MisArtistas.module.css";

export type ArtistaLigadoConQr = { artista: ArtistaResumen; url: string; svg: string };

/**
 * «Mis artistas» en Mi perfil (OL-154, doc 40b): los artistas que controla la cuenta, uno o varios, listados
 * igual y sin "principal" — región común, cada tarjeta es su propio grupo, sin acordeón ni selector previo.
 * Dice "ficha", nunca "perfil de artista", para no confundirlo con Mi perfil (L9). Quien llama decide si se
 * muestra: sin artistas ligados, el bloque entero no aparece. El QR de cada uno ya viene calculado (server-only,
 * `qrDeUrl`): un componente síncrono no complica pasarlo como slot de `FichaPersona`.
 */
export default function MisArtistas({ artistas }: { artistas: ArtistaLigadoConQr[] }) {
  return (
    <div className={styles.seccion}>
      <h2>Mis artistas</h2>
      {artistas.map(({ artista: a, url, svg }) => (
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
          <div className={styles.botones}>
            <Link href={hrefArtista(a)} className={styles.verFicha}>
              {etiquetaVerMiFicha(artistas.length)}
            </Link>
            <CompartirFicha titulo={a.nombre} texto={`${a.nombre} · ${etiquetaArtista(a)}`} url={url} svg={svg} etiqueta={`Compartir la ficha de ${a.nombre}`} className={styles.compartir} />
          </div>
        </div>
      ))}
    </div>
  );
}
