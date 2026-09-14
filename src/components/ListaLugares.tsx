"use client";

import Link from "next/link";
import { useState } from "react";
import type { Ciudad } from "@/lib/ciudad";
import { textoDistancia } from "@/lib/agenda";
import { calleCorta, filtrarLugares, ordenarLugares, textoProximo, type LugarLista } from "@/lib/lugares";
import { IconoCalendario, IconoPin } from "./ui/Iconos";
import renglon from "./Renglon.module.css";
import styles from "./ListaLugares.module.css";

type Props = { lugares: LugarLista[]; punto: { lat: number; lng: number } | null; ciudad: Ciudad; conSesion: boolean };

/** Umbral a partir del cual vale la pena buscar por nombre (progressive disclosure). */
const UMBRAL_BUSCAR = 8;

/**
 * Lista de lugares: renglones como los de la agenda (foto, nombre, calle, próximo evento);
 * con eventos primero, o por distancia con la ubicación; búsqueda por nombre solo cuando hay muchos.
 */
export default function ListaLugares({ lugares, punto, ciudad, conSesion }: Props) {
  const [busqueda, setBusqueda] = useState("");
  const { lista, km } = ordenarLugares(filtrarLugares(lugares, busqueda), punto);
  const hrefNuevo = conSesion ? "/lugares/nuevo" : "/entrar?siguiente=/lugares/nuevo";

  if (lugares.length === 0) {
    return (
      <section className={styles.vacio}>
        <h2>Lugares</h2>
        <p>Aún no hay lugares en {ciudad.nombre}. Registra el primero.</p>
        <Link href={hrefNuevo} className={styles.registrar}>
          Registrar un lugar
        </Link>
      </section>
    );
  }
  return (
    <section className={styles.lista} aria-label="Lugares">
      {lugares.length >= UMBRAL_BUSCAR && (
        <input type="search" className={styles.buscar} placeholder="Buscar un lugar por nombre" aria-label="Buscar un lugar por nombre" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} autoCapitalize="none" autoCorrect="off" />
      )}
      <p className={styles.conteo}>
        {lista.length === 0 ? "Ningún lugar se llama así. Si existe, regístralo." : `${lista.length === 1 ? "1 lugar" : `${lista.length} lugares`}${punto ? " · ordenados por cercanía" : ""}`}
      </p>
      <ul>
        {lista.map((l) => (
          <li key={l.id}>
            <Link href={`/lugares/${l.id}`} className={renglon.renglon}>
              {l.portada ? (
                // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
                <img src={l.portada} alt="" className={renglon.foto} />
              ) : (
                <span className={`${renglon.foto} ${renglon.fotoVacia}`} aria-hidden="true" />
              )}
              <span className={renglon.titulo}>{l.nombre}</span>
              <span className={`${renglon.meta} ${renglon.metaColumna}`}>
                <span className={renglon.lugar}>
                  <IconoPin width={15} height={15} />
                  {calleCorta(l.direccion) || "Sin dirección"}
                  {km.has(l.id) ? ` · ${textoDistancia(km.get(l.id)!)}` : ""}
                </span>
                <span>
                  <IconoCalendario width={15} height={15} />
                  {l.proximo ? <b>{textoProximo(l.proximo.inicio)}</b> : "Sin eventos próximos"}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
