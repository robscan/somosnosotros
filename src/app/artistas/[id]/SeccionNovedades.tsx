"use client";

import { useState } from "react";
import Link from "next/link";
import Incrustado from "@/components/ui/Incrustado";
import type { Incrustado as IncrustadoType } from "@/lib/incrustado";
import {
  ETIQUETA_PROVEEDOR_NOVEDAD_ARTISTA,
  fechaRelativaNovedadArtista,
  NOVEDADES_ARTISTA_VISIBLES_DE_ENTRADA,
  type ProveedorNovedadArtista,
} from "@/lib/novedadesArtista";
import ficha from "@/components/ui/Ficha.module.css";
import canon from "@/components/ui/FormularioCanon.module.css";
import styles from "./SeccionNovedades.module.css";

export type NovedadParaFicha = {
  id: string;
  titulo: string | null;
  texto: string | null;
  creado_en: string;
  proveedor: ProveedorNovedadArtista;
  incrustado: IncrustadoType | null;
  /** Oculta por la administración (doc 44 §4): sigue llegando a quien gestiona (la RLS se la da), con su etiqueta. */
  visible: boolean;
};

/**
 * "Novedades" en la ficha del artista (docs/rediseno/44-novedades-artista.md, OL-175/OL-181, código de OL-171;
 * "Editar" y "Oculta", OL-185): las tres más recientes visibles, con su reproductor, título, texto y fecha
 * relativa; "Ver más" destapa el resto sin paginar. Sin novedades y sin poder publicar, la sección no aparece del
 * todo (ni el título).
 *
 * El título reusa `ficha.seccionEnlaces` (`Ficha.module.css`), el mismo que ya usa «Enlaces» (OL-163, founder:
 * la línea bajo el título "se ve horrible") — negro, `--letra-xl`, sin línea ni pegajoso, en vez del título gris
 * y pegajoso de `FichaLista.module.css` que traían "Se presenta en"/"Enlaces del catálogo": dos títulos en la
 * misma ficha tienen que verse iguales. Sin editar `Ficha.module.css`: "Publicar" solo añade su propio layout
 * (flex, en el mismo `<h2>`) encima de esa clase compartida.
 *
 * `hrefPublicar` no nulo también dice "esta cuenta gestiona la ficha": cada novedad lleva entonces su propio
 * "Editar" (mismo criterio de permiso que "Publicar", sin volver a comprobarlo aquí — la pantalla de destino ya lo
 * hace). `hrefFicha` arma esa dirección por novedad (`<hrefFicha>/novedades/<id>/editar`).
 */
export default function SeccionNovedades({
  novedades,
  artistaNombre,
  hrefPublicar,
  hrefFicha,
}: {
  novedades: NovedadParaFicha[];
  artistaNombre: string;
  hrefPublicar: string | null;
  hrefFicha: string;
}) {
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
                {n.incrustado && <Incrustado incrustado={n.incrustado} proveedor={n.proveedor} nombre={artistaNombre} />}
                {n.titulo && <h3 className={styles.titulo}>{n.titulo}</h3>}
                {n.texto && <p className={styles.texto}>{n.texto}</p>}
                <div className={styles.pie}>
                  <span className={styles.cuando}>
                    {fechaRelativaNovedadArtista(n.creado_en)}
                    {!n.visible && <span className={styles.oculta}> · Oculta</span>}
                  </span>
                  {hrefPublicar && (
                    <Link href={`${hrefFicha}/novedades/${n.id}/editar`} className={canon.cambiar} aria-label={`Editar novedad: ${n.titulo || ETIQUETA_PROVEEDOR_NOVEDAD_ARTISTA[n.proveedor]}`}>
                      Editar
                    </Link>
                  )}
                </div>
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
