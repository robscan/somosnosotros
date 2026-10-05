"use client";

import { useEffect, useRef, useState } from "react";
import Boton from "@/components/ui/Boton";
import Incrustado from "@/components/ui/Incrustado";
import type { Incrustado as IncrustadoType } from "@/lib/incrustado";
import {
  ETIQUETA_PROVEEDOR_NOVEDAD_ARTISTA,
  fechaRelativaNovedadArtista,
  NOVEDADES_ARTISTA_VISIBLES_DE_ENTRADA,
  type ProveedorNovedadArtista,
} from "@/lib/novedadesArtista";
import ficha from "@/components/ui/Ficha.module.css";
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
 * "Editar" y "Oculta", OL-185; docs/rediseno/50, P6): las tres más recientes visibles, con su reproductor, título, texto y fecha
 * relativa; "Ver más" destapa el resto sin paginar. Sin novedades y sin poder publicar, la sección no aparece del todo (ni el
 * título). Es un bloque más de la ficha (`ficha.bloque`, con el mismo título que «Próximas fechas» y «Sobre»); «Publicar»,
 * «Editar» y «Ver más» son el botón de texto de la app (`ui/Boton`).
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
  novedadId,
}: {
  novedades: NovedadParaFicha[];
  artistaNombre: string;
  hrefPublicar: string | null;
  hrefFicha: string;
  /** Abre la publicación señalada por el carril, sin activar su reproductor. */
  novedadId?: string;
}) {
  const indiceDestino = novedades.findIndex((n) => n.id === novedadId && n.visible);
  const destino = indiceDestino >= 0 ? novedades[indiceDestino].id : null;
  const [abierto, setAbierto] = useState(false);
  const ancla = useRef<HTMLLIElement>(null);
  const expandido = abierto || indiceDestino >= NOVEDADES_ARTISTA_VISIBLES_DE_ENTRADA;
  useEffect(() => {
    if (!destino) return;
    let cancelado = false;
    let cuadro = 0;
    const inicio = performance.now();
    // La entrada de la ficha y las fechas suspendidas todavía pueden mover la publicación.
    // Esperar su posición final evita que el scroll se calcule sobre la pantalla de carga.
    function colocar() {
      if (cancelado || !ancla.current) return;
      let entrando = false;
      for (let nodo: HTMLElement | null = ancla.current; nodo; nodo = nodo.parentElement) {
        if (getComputedStyle(nodo).transform !== "none") entrando = true;
      }
      const cargando = ancla.current.closest("main")?.querySelector('[aria-busy="true"]');
      if ((entrando || cargando) && performance.now() - inicio < 4000) {
        cuadro = requestAnimationFrame(colocar);
        return;
      }
      ancla.current.scrollIntoView({ block: "start", behavior: "instant" });
    }
    void document.fonts.ready.then(() => {
      if (!cancelado) cuadro = requestAnimationFrame(colocar);
    });
    return () => { cancelado = true; cancelAnimationFrame(cuadro); };
  }, [destino, expandido]);
  if (novedades.length === 0 && !hrefPublicar) return null;

  const visibles = expandido ? novedades : novedades.slice(0, NOVEDADES_ARTISTA_VISIBLES_DE_ENTRADA);
  const hayMas = !expandido && novedades.length > NOVEDADES_ARTISTA_VISIBLES_DE_ENTRADA;

  return (
    <section className={ficha.bloque} aria-label="Novedades">
      <h2 className={styles.cabecera}>
        <span className={styles.tituloSeccion}>Novedades</span>
        {hrefPublicar && (
          <Boton href={hrefPublicar} variante="texto" ancho="contenido">
            Publicar
          </Boton>
        )}
      </h2>
      {novedades.length === 0 ? (
        <p className={`${ficha.vacio} ${styles.vacio}`}>Aún no hay novedades.</p>
      ) : (
        <>
          <ul className={styles.lista}>
            {visibles.map((n) => (
              <li key={n.id} id={`novedad-${n.id}`} ref={n.id === destino ? ancla : undefined} className={styles.novedad}>
                {n.incrustado && <Incrustado incrustado={n.incrustado} proveedor={n.proveedor} nombre={artistaNombre} />}
                {n.titulo && <h3 className={styles.titulo}>{n.titulo}</h3>}
                {n.texto && <p className={styles.texto}>{n.texto}</p>}
                <div className={styles.pie}>
                  <span className={styles.cuando}>
                    {fechaRelativaNovedadArtista(n.creado_en)}
                    {!n.visible && <span className={styles.oculta}> · Oculta</span>}
                  </span>
                  {hrefPublicar && (
                    <Boton href={`${hrefFicha}/novedades/${n.id}/editar`} variante="texto" ancho="contenido" aria-label={`Editar novedad: ${n.titulo || ETIQUETA_PROVEEDOR_NOVEDAD_ARTISTA[n.proveedor]}`}>
                      Editar
                    </Boton>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {hayMas && (
            <Boton type="button" variante="texto" ancho="contenido" className={styles.mas} onClick={() => setAbierto(true)}>
              Ver más
            </Boton>
          )}
        </>
      )}
    </section>
  );
}
