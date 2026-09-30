import Link from "next/link";
import Boton from "@/components/ui/Boton";
import { claseBotonIcono } from "@/components/ui/BotonIcono";
import CompartirFicha from "@/components/ui/CompartirFicha";
import { etiquetaArtista, hrefArtista, type ArtistaResumen } from "@/lib/artistas";
import styles from "./MisArtistas.module.css";

export type ArtistaLigadoConQr = { artista: ArtistaResumen; url: string; svg: string };

/**
 * «Mis artistas» en Mi perfil (OL-154, doc 40b; tarjeta repuesta en OL-163; corrección del founder sobre esa
 * misma pieza, 2026-09-23: fuera el botón de texto «Ver ficha»/«Ver mi ficha de artista»). La tarjeta blanca de
 * siempre, pero ahora el compartir es el que se toca a la derecha: mismo canon circular elevado que las acciones
 * de la ficha (`ui/BotonIcono`, grande y elevado), sin letrero — no hace falta uno nuevo para la misma idea
 * de botón. La tarjeta entera es el enlace a la ficha (`.frente`, como `RenglonArtista`/`Renglon.module.css`) y
 * el compartir es su hermano, nunca su hijo (el mismo patrón que el botón sobre una tarjeta de `Destacados`):
 * así el toque en un botón nunca navega ni se confunde con el toque en el otro. Quien llama decide si se
 * muestra: sin artistas ligados, el bloque entero no aparece. El QR de cada uno ya viene calculado
 * (server-only, `qrDeUrl`): un componente síncrono no complica pasarlo como prop.
 *
 * "Publicar" (novedad, OL-175, doc 44 fase 1): un tercer hermano junto al enlace y el compartir, nunca anidado
 * dentro de otro. Aquí solo se listan artistas que la cuenta ya gestiona, así que el enlace no comprueba permiso
 * aparte (la pantalla de destino, `/novedades/nueva`, sí lo hace por su cuenta).
 */
export default function MisArtistas({ artistas }: { artistas: ArtistaLigadoConQr[] }) {
  return (
    <div className={styles.seccion}>
      <h2>Mis artistas</h2>
      {artistas.map(({ artista: a, url, svg }) => (
        <div key={a.id} className={styles.tarjeta}>
          <Link href={hrefArtista(a)} className={styles.frente}>
            {a.foto ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
              <img src={a.foto} alt="" className={styles.foto} />
            ) : (
              <span className={`${styles.foto} ${styles.fotoVacia}`} aria-hidden="true">
                {a.nombre.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className={styles.nombre}>
              <b>{a.nombre}</b>
              <small>{etiquetaArtista(a)}</small>
            </span>
          </Link>
          <Boton href={`${hrefArtista(a)}/novedades/nueva`} variante="texto" ancho="contenido">
            Publicar
          </Boton>
          <CompartirFicha titulo={a.nombre} texto={`${a.nombre} · ${etiquetaArtista(a)}`} url={url} svg={svg} etiqueta={`Compartir la ficha de ${a.nombre}`} className={claseBotonIcono({ tamano: "grande", relieve: "elevado" })} slug={a.slug} />
        </div>
      ))}
    </div>
  );
}
