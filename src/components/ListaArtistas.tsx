"use client";

import Link from "next/link";
import { useState } from "react";
import { etiquetaArtista, filtrarArtistas, ordenarArtistas, textoProximaFecha, UMBRAL_BUSCAR_ARTISTAS, type ArtistaLista, type Disciplina } from "@/lib/artistas";
import { IconoBuscar, IconoCalendario, IconoEstrella, IconoMascara, IconoNota, IconoPincel, IconoPluma } from "./ui/Iconos";
import renglon from "./Renglon.module.css";
import styles from "./ListaArtistas.module.css";

type Props = { artistas: ArtistaLista[]; conSesion: boolean };

/** Icono de lo que hace: nota (música), máscara (teatro, danza), pincel (artes visuales, cine), pluma (letras). */
export function IconoDisciplina({ disciplina, size = 15 }: { disciplina: Disciplina; size?: number }) {
  const p = { width: size, height: size };
  switch (disciplina) {
    case "musica":
      return <IconoNota {...p} />;
    case "teatro":
    case "danza":
      return <IconoMascara {...p} />;
    case "artes_visuales":
    case "cine":
      return <IconoPincel {...p} />;
    case "letras":
      return <IconoPluma {...p} />;
    default:
      return <IconoEstrella {...p} />;
  }
}

/**
 * Lista de artistas: renglones como los de Lugares (foto redonda, nombre, qué hace, próxima fecha y dónde);
 * con fechas primero; búsqueda por nombre a partir de 8 (decisiones 1 y 2).
 */
export default function ListaArtistas({ artistas, conSesion }: Props) {
  const [busqueda, setBusqueda] = useState("");
  const lista = ordenarArtistas(filtrarArtistas(artistas, busqueda));
  const hrefNuevo = (nombre?: string) => {
    const destino = `/artistas/nuevo${nombre ? `?nombre=${encodeURIComponent(nombre)}` : ""}`;
    return conSesion ? destino : `/entrar?siguiente=${encodeURIComponent(destino)}`;
  };

  if (artistas.length === 0) {
    return (
      <section className={styles.vacio}>
        <h2>Artistas</h2>
        <p>Aún no hay artistas registrados en San Luis Potosí. ¿Eres artista o grupo, o conoces a alguien? Regístralo.</p>
        <Link href={hrefNuevo()} className={styles.registrar}>
          Registrar un artista
        </Link>
      </section>
    );
  }
  return (
    <section aria-label="Artistas">
      {artistas.length >= UMBRAL_BUSCAR_ARTISTAS && (
        <div className={styles.fija}>
          <label className={styles.buscar}>
            <IconoBuscar width={18} height={18} />
            <input type="search" placeholder="Buscar por nombre" aria-label="Buscar artista por nombre" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} autoCapitalize="none" autoCorrect="off" />
            {busqueda && (
              <button type="button" className={styles.limpiar} onClick={() => setBusqueda("")} aria-label="Borrar la búsqueda">
                ✕
              </button>
            )}
          </label>
        </div>
      )}
      {lista.length === 0 ? (
        <section className={styles.vacio}>
          <p>Nadie se llama «{busqueda.trim()}». ¿Lo registras?</p>
          <Link href={hrefNuevo(busqueda.trim())} className={styles.registrar}>
            Registrar a «{busqueda.trim()}»
          </Link>
        </section>
      ) : (
        <>
          <p className={styles.conteo}>{lista.length === 1 ? "1 artista" : `${lista.length} artistas`}</p>
          <ul className={styles.lista}>
            {lista.map((a) => (
              <li key={a.id}>
                <Link href={`/artistas/${a.id}`} className={renglon.renglon}>
                  {a.foto ? (
                    // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
                    <img src={a.foto} alt="" className={`${renglon.foto} ${renglon.fotoRedonda}`} />
                  ) : (
                    <span className={`${renglon.foto} ${renglon.fotoVacia} ${renglon.fotoRedonda}`} aria-hidden="true" />
                  )}
                  <span className={renglon.titulo}>{a.nombre}</span>
                  <span className={`${renglon.meta} ${renglon.metaColumna}`}>
                    <span>
                      <IconoDisciplina disciplina={a.disciplina} />
                      {etiquetaArtista(a)}
                    </span>
                    <span className={renglon.envuelve}>
                      <IconoCalendario width={15} height={15} />
                      {a.proxima ? <b>{textoProximaFecha(a.proxima)}</b> : "Sin fechas próximas"}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
