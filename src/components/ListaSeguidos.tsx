"use client";

import Link from "next/link";
import { useState } from "react";
import { etiquetaArtista } from "@/lib/artistas";
import { calleCorta, etiquetaTipo } from "@/lib/lugares";
import type { ArtistaSeguido, LugarSeguido } from "@/app/personas/consultas";
import { IconoDisciplina } from "./ListaArtistas";
import { Chip, Chips, Cuenta } from "./ui/Chip";
import { IconoPin } from "./ui/Iconos";
import renglon from "./Renglon.module.css";
import styles from "./FichaPersona.module.css";

/** A partir de cuántos seguidos aparecen los chips para filtrar (misma regla que las listas de Lugares y Artistas). */
export const UMBRAL_CHIPS_SEGUIDOS = 12;
type Filtro = "todo" | "lugares" | "artistas";

/**
 * Lo que sigue una persona: lugares (foto cuadrada) y artistas (redonda) en grupos con subtítulo, como los días de
 * "Va a". Con muchos seguidos, chips para ver solo lugares o solo artistas (pedido del founder, 2026-09-15).
 */
export default function ListaSeguidos({
  lugares,
  artistas,
}: {
  lugares: LugarSeguido[];
  artistas: ArtistaSeguido[];
}) {
  const [filtro, setFiltro] = useState<Filtro>("todo");
  const total = lugares.length + artistas.length;
  const conChips =
    total >= UMBRAL_CHIPS_SEGUIDOS && lugares.length > 0 && artistas.length > 0;
  const verLugares = filtro !== "artistas" && lugares.length > 0;
  const verArtistas = filtro !== "lugares" && artistas.length > 0;
  return (
    <>
      {conChips && (
        <Chips ariaLabel="Qué ver">
          <Chip activo={filtro === "todo"} onClick={() => setFiltro("todo")}>
            Todo
            <Cuenta n={total} />
          </Chip>
          <Chip
            activo={filtro === "lugares"}
            onClick={() => setFiltro("lugares")}
          >
            Lugares
            <Cuenta n={lugares.length} />
          </Chip>
          <Chip
            activo={filtro === "artistas"}
            onClick={() => setFiltro("artistas")}
          >
            Artistas
            <Cuenta n={artistas.length} />
          </Chip>
        </Chips>
      )}
      {verLugares && (
        <div className={styles.dia}>
          {!conChips && <h3>Lugares · {lugares.length}</h3>}
          <ul className={styles.lista}>
            {lugares.map((l) => (
              <li key={l.id}>
                <Link href={`/lugares/${l.id}`} className={renglon.renglon}>
                  {l.portada ? (
                    // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
                    <img
                      src={l.portada}
                      alt=""
                      className={renglon.foto}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <span
                      className={`${renglon.foto} ${renglon.fotoVacia}`}
                      aria-hidden="true"
                    >
                      <IconoPin width={26} height={26} />
                    </span>
                  )}
                  <span className={renglon.titulo}>{l.nombre}</span>
                  <span className={renglon.meta}>
                    <span className={renglon.envuelve}>
                      <IconoPin width={15} height={15} />
                      {etiquetaTipo(l.tipo)}
                      {calleCorta(l.direccion)
                        ? ` · ${calleCorta(l.direccion)}`
                        : ""}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {verArtistas && (
        <div className={styles.dia}>
          {!conChips && <h3>Artistas · {artistas.length}</h3>}
          <ul className={styles.lista}>
            {artistas.map((a) => (
              <li key={a.id}>
                <Link href={`/artistas/${a.id}`} className={renglon.renglon}>
                  {a.foto ? (
                    // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
                    <img
                      src={a.foto}
                      alt=""
                      className={`${renglon.foto} ${renglon.fotoRedonda}`}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <span
                      className={`${renglon.foto} ${renglon.fotoVacia} ${renglon.fotoRedonda}`}
                      aria-hidden="true"
                    >
                      <IconoDisciplina disciplina={a.disciplina} size={26} />
                    </span>
                  )}
                  <span className={renglon.titulo}>{a.nombre}</span>
                  <span className={renglon.meta}>
                    <span className={renglon.envuelve}>
                      <IconoDisciplina disciplina={a.disciplina} />
                      {etiquetaArtista(a)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
