"use client";

import Link from "next/link";
import { useState } from "react";
import { etiquetaTipo, filtrarLugares, type LugarResumen } from "@/lib/lugares";
import Tarjeta from "@/components/ui/Tarjeta";
import styles from "./ListaLugares.module.css";

type Props = { lugares: LugarResumen[]; conSesion: boolean; conAlta?: boolean };

/** Umbral a partir del cual vale la pena buscar por nombre (progressive disclosure). */
const UMBRAL_BUSCAR = 8;

/** Lista de lugares con búsqueda por nombre (solo cuando hay muchos) y, si se pide, el enlace para registrar uno. */
export default function ListaLugares({ lugares, conSesion, conAlta = true }: Props) {
  const [busqueda, setBusqueda] = useState("");
  const visibles = filtrarLugares(lugares, busqueda);
  const hrefNuevo = conSesion ? "/lugares/nuevo" : "/entrar?siguiente=/lugares/nuevo";
  const conBuscar = lugares.length >= UMBRAL_BUSCAR;

  return (
    <div>
      {(conBuscar || conAlta) && (
        <div className={styles.barra}>
          {conBuscar && (
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
          )}
          {conAlta && (
            <Link href={hrefNuevo} className={styles.nuevo}>
              + Registrar un lugar
            </Link>
          )}
        </div>
      )}

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
                <Tarjeta href={`/lugares/${l.id}`} miniatura={{ src: l.portada, letra: l.nombre }} titulo={l.nombre} detalle={`${etiquetaTipo(l.tipo)}${l.direccion ? ` · ${l.direccion}` : ""}`} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
