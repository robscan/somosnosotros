"use client";

import type { ReactNode } from "react";
import type { Ciudad } from "@/lib/ciudad";
import { textoDistancia } from "@/lib/agenda";
import { calleCorta, etiquetaTipo, filtrarLugares, ordenarLugares, textoProximo, UMBRAL_BUSCAR_LUGARES, type LugarLista } from "@/lib/lugares";
import { Chips } from "./ui/Chip";
import Deslizable from "./ui/Deslizable";
import { IconoCalendario, IconoOk, IconoPin } from "./ui/Iconos";
import { useSeguirEnLista, type AvisosLista } from "./useSeguirEnLista";
import Boton from "@/components/ui/Boton";
import { CampoBuscar } from "@/components/ui/Buscador";
import comun from "./Lista.module.css";
import renglon from "./Renglon.module.css";
import styles from "./ListaLugares.module.css";

type Props = {
  lugares: LugarLista[];
  punto: { lat: number; lng: number } | null;
  ciudad: Ciudad;
  conSesion: boolean;
  /** Tipo ya aplicado por VistaLugares (los lugares llegan filtrados); solo para el texto del vacío. */
  tipo?: string | null;
  /** Cuántos lugares hay en total, sin el tipo: decide si aparece la búsqueda (no debe irse al filtrar). */
  total?: number;
  /** La búsqueda por nombre vive en VistaLugares: la misma sirve al mapa. */
  busqueda: string;
  onBusqueda: (v: string) => void;
  /** La fila de chips (Cerca de mí y tipos) vive en VistaLugares, que comparte el tipo con el mapa. */
  chips?: ReactNode;
  /** El aviso de ubicación, bajo la fila de chips. */
  aviso?: ReactNode;
  /** Los lugares que la persona sigue (se ven y cambian al deslizar); null = sin sesión. */
  seguidos?: string[] | null;
  /** Para la pregunta de avisos tras el primer Seguir; null = sin sesión. */
  avisos?: AvisosLista | null;
};

/**
 * Lista de lugares: renglones como los de la agenda (foto, nombre, calle, próximo evento);
 * con eventos primero, o por distancia con la ubicación; búsqueda por nombre y chips de tipo solo cuando hay muchos.
 * Una sola fila de chips: Cerca de mí · Todos · tipos (la pinta VistaLugares, que comparte el tipo con el mapa).
 */
export default function ListaLugares({ lugares, tipo = null, total = lugares.length, busqueda, onBusqueda, punto, ciudad, conSesion, chips, aviso, seguidos = null, avisos = null }: Props) {
  const { lista, km } = ordenarLugares(filtrarLugares(lugares, busqueda), punto);
  // Al deslizar un lugar: Seguir (decisión del founder, 2026-09-16; bitácora 071).
  const seguir = useSeguirEnLista("lugar", seguidos, avisos);
  const hrefNuevo = conSesion ? "/lugares/nuevo" : "/entrar?siguiente=/lugares/nuevo";

  if (lugares.length === 0 && !tipo) {
    return (
      <section className={comun.vacio}>
        <h2>Lugares</h2>
        <p>Aún no hay lugares en {ciudad.nombre}. Registra el primero.</p>
        <Boton href={hrefNuevo} variante="secundario">
          Registrar un lugar
        </Boton>
      </section>
    );
  }
  return (
    <section className={styles.lista} aria-label="Lugares">
      {total >= UMBRAL_BUSCAR_LUGARES && (
        <CampoBuscar className={styles.buscar} placeholder="Buscar un lugar por nombre" ariaLabel="Buscar un lugar por nombre" valor={busqueda} onCambiar={onBusqueda} />
      )}
      {chips && <Chips ariaLabel="Cerca de mí y tipo de lugar">{chips}</Chips>}
      {aviso}
      <p className={comun.conteo}>
        {lista.length === 0
          ? busqueda.trim()
            ? "Ningún lugar se llama así. Si existe, regístralo."
            : `Todavía no hay lugares de tipo ${etiquetaTipo(tipo ?? "").toLowerCase()}.`
          : `${lista.length === 1 ? "1 lugar" : `${lista.length} lugares`}${punto ? " · ordenados por cercanía" : ""}`}
      </p>
      <ul>
        {lista.map((l) => (
          <Deslizable key={l.id} href={`/lugares/${l.id}`} className={renglon.renglon} acciones={seguir.acciones(l.id, l.nombre)}>
            {l.portada ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
              <img src={l.portada} alt="" className={renglon.foto} />
            ) : (
              <span className={`${renglon.foto} ${renglon.fotoVacia}`} aria-hidden="true">
                <IconoPin width={26} height={26} />
              </span>
            )}
            <span className={renglon.titulo}>{l.nombre}</span>
            <span className={`${renglon.meta} ${renglon.metaColumna}`}>
              {seguir.sigo(l.id) && (
                <span className={renglon.estado}>
                  <IconoOk width={14} height={14} />
                  Sigues
                </span>
              )}
              {l.privado && <span className={renglon.sello}>Solo tú lo ves</span>}
              <span className={renglon.lugar}>
                <IconoPin width={15} height={15} />
                {calleCorta(l.direccion) || "Sin dirección"}
                {km.has(l.id) ? ` · ${textoDistancia(km.get(l.id)!)}` : ""}
              </span>
              {l.proximo && (
                <span>
                  <IconoCalendario width={15} height={15} />
                  <b>{textoProximo(l.proximo)}</b>
                </span>
              )}
            </span>
          </Deslizable>
        ))}
      </ul>
      {seguir.extras}
    </section>
  );
}
