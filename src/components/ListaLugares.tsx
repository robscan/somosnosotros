"use client";

import { useState, type ReactNode } from "react";
import type { Ciudad } from "@/lib/ciudad";
import { enOrden, tarjetaLugar, type Destacado, type Tarjeta } from "@/lib/destacados";
import { etiquetaTipo, filtrarLugares, normalizarNombre, ordenarLugares, UMBRAL_BUSCAR_LUGARES, type LugarLista } from "@/lib/lugares";
import { Chips } from "./ui/Chip";
import Destacados from "./Destacados";
import IndiceAlfabetico from "./IndiceAlfabetico";
import RenglonLugar from "./RenglonLugar";
import { useCanalDePantalla } from "./useCanalDeListas";
import { useSeguirEnLista, type AvisosLista } from "./useSeguirEnLista";
import Boton from "@/components/ui/Boton";
import { CampoBuscar } from "@/components/ui/Buscador";
import comun from "./Lista.module.css";
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
  /** La tira de destacados (docs/rediseno/20); se va con un tipo o una búsqueda. */
  destacados?: Destacado[];
  eventosSemana?: Tarjeta[];
};

/**
 * Lista de lugares: renglones como los de la agenda (foto, nombre, calle, próximo evento);
 * con eventos primero, o por distancia con la ubicación; búsqueda por nombre y chips de tipo solo cuando hay muchos.
 * Una sola fila de chips: Cerca de mí · Todos · tipos (la pinta VistaLugares, que comparte el tipo con el mapa).
 */
export default function ListaLugares({ lugares, tipo = null, total = lugares.length, busqueda, onBusqueda, punto, ciudad, conSesion, chips, aviso, seguidos = null, avisos = null, destacados = [], eventosSemana = [] }: Props) {
  const [letra, setLetra] = useState<string | null>(null);
  const filtrados = filtrarLugares(lugares, busqueda).filter((l) => punto || busqueda.trim() || !letra || normalizarNombre(l.nombre).startsWith(letra.toLowerCase()));
  const { lista, km } = ordenarLugares(filtrados, punto);
  // Al deslizar un lugar: Seguir (decisión del founder, 2026-09-16; bitácora 071).
  // Si la pantalla puso su canal (Lugares, con Mapa y Lista), el aviso y la pregunta son de ella: cambiar de vista no
  // empieza de cero. Sin canal de pantalla, la lista sigue con el suyo.
  const seguir = useSeguirEnLista("lugar", seguidos, avisos, useCanalDePantalla());
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
      {!tipo && !busqueda.trim() && <Destacados tarjetas={enOrden(destacados, lugares).map((l) => tarjetaLugar(l))} />}
      {!tipo && !busqueda.trim() && <Destacados tarjetas={eventosSemana} encabezado="Con eventos esta semana" memoria="eventos-semana" detalleCompleto />}
      {!punto && <IndiceAlfabetico letra={letra} onSeleccionar={setLetra} onQuitar={() => setLetra(null)} />}
      <p className={comun.conteo}>
        {lista.length === 0
          ? busqueda.trim()
            ? "Ningún lugar se llama así. Si existe, regístralo."
            : `Todavía no hay lugares de tipo ${etiquetaTipo(tipo ?? "").toLowerCase()}.`
          : `${lista.length === 1 ? "1 lugar" : `${lista.length} lugares`}${punto ? " · ordenados por cercanía" : ""}`}
      </p>
      <ul>
        {lista.map((l) => (
          <RenglonLugar key={l.id} lugar={l} km={km.get(l.id)} sigo={seguir.sigo(l.id)} acciones={seguir.acciones(l.id, l.nombre)} />
        ))}
      </ul>
      {seguir.extras}
    </section>
  );
}
