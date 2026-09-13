"use client";

import Link from "next/link";
import { useState } from "react";
import { etiquetaTipo, filtrarLugares, type LugarResumen } from "@/lib/lugares";
import styles from "./ListaLugares.module.css";

type Props = { lugares: LugarResumen[]; conSesion: boolean };

/** Lista de lugares del panel, con búsqueda por nombre y el botón para registrar uno. */
export default function ListaLugares({ lugares, conSesion }: Props) {
  const [busqueda, setBusqueda] = useState("");
  const visibles = filtrarLugares(lugares, busqueda);
  const hrefNuevo = conSesion ? "/lugares/nuevo" : "/entrar?siguiente=/lugares/nuevo";

  return (
    <div>
      <div className={styles.barra}>
        <input
          type="search"
          className={styles.buscar}
          placeholder="Buscar un lugar por nombre"
          aria-label="Buscar un lugar por nombre"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
        />
        <Link href={hrefNuevo} className={styles.nuevo}>
          + Registrar un lugar
        </Link>
      </div>

      {lugares.length === 0 ? (
        <p className={styles.vacio}>Aún no hay lugares. Registra el primero.</p>
      ) : visibles.length === 0 ? (
        <p className={styles.vacio}>Ningún lugar se llama así. Si existe, regístralo.</p>
      ) : (
        <>
          <p className={styles.conteo}>
            {visibles.length === 1 ? "1 lugar" : `${visibles.length} lugares`}
            {busqueda ? ` con "${busqueda.trim()}"` : ""}
          </p>
          <ul className={styles.lista}>
            {visibles.map((l) => (
              <li key={l.id}>
                <Link href={`/lugares/${l.id}`} className={styles.tarjeta}>
                  <div className={styles.miniatura} aria-hidden="true">
                    {l.portada ? (
                      // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
                      <img src={l.portada} alt="" />
                    ) : (
                      <span>{l.nombre.slice(0, 1).toUpperCase()}</span>
                    )}
                  </div>
                  <div className={styles.texto}>
                    <strong className={styles.nombre}>{l.nombre}</strong>
                    <span className={styles.detalle}>
                      {etiquetaTipo(l.tipo)}
                      {l.direccion ? ` · ${l.direccion}` : ""}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
