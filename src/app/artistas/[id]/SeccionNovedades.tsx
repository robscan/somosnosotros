"use client";

import { useState } from "react";
import Link from "next/link";
import VideoEmbed from "@/components/ui/VideoEmbed";
import type { VideoEmbed as VideoEmbedType } from "@/lib/video";
import { fechaRelativaNovedadArtista, NOVEDADES_ARTISTA_VISIBLES_DE_ENTRADA } from "@/lib/novedadesArtista";
import ficha from "@/components/ui/Ficha.module.css";
import canon from "@/components/ui/FormularioCanon.module.css";
import styles from "./SeccionNovedades.module.css";

export type NovedadParaFicha = { id: string; titulo: string | null; texto: string | null; creado_en: string; video: VideoEmbedType | null };

/**
 * "Novedades" en la ficha del artista, fase 1 (docs/rediseno/44-novedades-artista.md, OL-175, código de OL-171):
 * las tres más recientes visibles, con su reproductor, título, texto y fecha relativa; "Ver más" destapa el resto
 * sin paginar. Sin novedades y sin poder publicar, la sección no aparece del todo (ni el título).
 *
 * El título reusa `ficha.seccionEnlaces` (`Ficha.module.css`), el mismo que ya usa «Enlaces» (OL-163, founder:
 * la línea bajo el título "se ve horrible") — negro, `--letra-xl`, sin línea ni pegajoso, en vez del título gris
 * y pegajoso de `FichaLista.module.css` que traían "Se presenta en"/"Enlaces del catálogo": dos títulos en la
 * misma ficha tienen que verse iguales. Sin editar `Ficha.module.css`: "Publicar" solo añade su propio layout
 * (flex, en el mismo `<h2>`) encima de esa clase compartida.
 */
export default function SeccionNovedades({ novedades, artistaNombre, hrefPublicar }: { novedades: NovedadParaFicha[]; artistaNombre: string; hrefPublicar: string | null }) {
  const [abierto, setAbierto] = useState(false);
  if (novedades.length === 0 && !hrefPublicar) return null;

  const visibles = abierto ? novedades : novedades.slice(0, NOVEDADES_ARTISTA_VISIBLES_DE_ENTRADA);
  const hayMas = !abierto && novedades.length > NOVEDADES_ARTISTA_VISIBLES_DE_ENTRADA;

  return (
    <section className={`${ficha.seccionEnlaces} ${styles.seccion}`} aria-label="Novedades">
      <h2 className={styles.cabecera}>
        <span className={styles.tituloSeccion}>Novedades</span>
        {hrefPublicar && (
          <Link href={hrefPublicar} className={canon.cambiar}>
            Publicar
          </Link>
        )}
      </h2>
      {novedades.length === 0 ? (
        <p className={styles.vacio}>Aún no hay novedades.</p>
      ) : (
        <>
          <ul className={styles.lista}>
            {visibles.map((n) => (
              <li key={n.id} className={styles.novedad}>
                {n.video && <VideoEmbed video={n.video} titulo={artistaNombre} />}
                {n.titulo && <h3 className={styles.titulo}>{n.titulo}</h3>}
                {n.texto && <p className={styles.texto}>{n.texto}</p>}
                <span className={styles.cuando}>{fechaRelativaNovedadArtista(n.creado_en)}</span>
              </li>
            ))}
          </ul>
          {hayMas && (
            <button type="button" className={`${canon.cambiar} ${styles.masBoton}`} onClick={() => setAbierto(true)}>
              Ver más
            </button>
          )}
        </>
      )}
    </section>
  );
}
