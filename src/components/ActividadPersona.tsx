"use client";

import Link from "next/link";
import { Fragment, useState, type ReactNode } from "react";
import type { ArtistaSeguido, LugarSeguido } from "@/app/personas/consultas";
import { mismaMemoria, pestanasDePersona, recordar, unirVistos, type Memoria } from "@/lib/actividad";
import type { Asistencia } from "@/lib/deslizar";
import { agruparPorDia, type EventoAgenda } from "@/lib/agenda";
import ListaSeguidos, { UMBRAL_CHIPS_SEGUIDOS } from "./ListaSeguidos";
import PestanasPersona, { type Pestana } from "./PestanasPersona";
import RenglonEvento from "./RenglonEvento";
import { useAsistenciaEnLista, type Decididas } from "./useAsistenciaEnLista";
import { AvisoAbajo, useCanalDeListas } from "./useCanalDeListas";
import { useSeguirEnLista, type AvisosLista } from "./useSeguirEnLista";
import styles from "./FichaPersona.module.css";

/**
 * Los gestos de quien mira: lo que decidió en esos eventos y lo que sigue, leídos con su sesión y solo para él; null en
 * `decididas` y `seguidos` = sin sesión (el gesto lleva a Entrar con la intención, como en la agenda).
 */
export type Gestos = { decididas: Decididas; seguidos: string[] | null; avisos: AvisosLista | null };

type Props = {
  mia: boolean;
  /** A qué va la persona. */
  eventos: EventoAgenda[];
  /** Solo en Mi perfil: lo que me interesa. */
  interesan: EventoAgenda[];
  lugares: LugarSeguido[];
  artistas: ArtistaSeguido[];
  /** Sin gestos (la propia ficha vista como la ven los demás), los renglones solo abren. */
  gestos: Gestos | null;
};

/**
 * Las pestañas de la ficha de una persona con los mismos renglones y gestos que las listas (OL-057, bitácora 086): Voy y
 * Me interesa al deslizar un evento, Seguir al deslizar un lugar o un artista, siempre para quien mira. Qué renglón va en
 * cada pestaña lo decide lib/actividad: en Mi perfil, quitar desaparece al instante y Deshacer lo devuelve a su sitio. Un
 * solo aviso abajo y una sola pregunta de avisos para las tres listas (useCanalDeListas). Nada apila historial.
 */
export default function ActividadPersona({ mia, eventos, interesan, lugares, artistas, gestos }: Props) {
  const canal = useCanalDeListas();
  const decididas = gestos?.decididas ?? null;
  const seguidos = gestos?.seguidos ?? null;
  const avisos = gestos?.avisos ?? null;
  const asistencia = useAsistenciaEnLista(decididas, avisos, canal);
  const seguirLugar = useSeguirEnLista("lugar", seguidos, avisos, canal);
  const seguirArtista = useSeguirEnLista("artista", seguidos, avisos, canal);

  // Mi perfil: a lo que voy y lo que me interesa juntos, en orden; cada pestaña toma lo suyo según lo decidido ahora. Lo
  // visto en la visita se queda aunque la página ya no lo traiga (lo quitado y guardado): Deshacer lo devuelve al instante.
  const enOrden = (lista: EventoAgenda[]) => [...lista].sort((a, b) => a.inicio.localeCompare(b.inicio));
  const [vistos, setVistos] = useState(() => ({ eventos: enOrden([...eventos, ...interesan]), lugares, artistas }));
  const [recibidos, setRecibidos] = useState({ eventos, interesan, lugares, artistas });
  if (mia && (recibidos.eventos !== eventos || recibidos.interesan !== interesan || recibidos.lugares !== lugares || recibidos.artistas !== artistas)) {
    setRecibidos({ eventos, interesan, lugares, artistas });
    setVistos((v) => ({ eventos: enOrden(unirVistos(v.eventos, [...eventos, ...interesan])), lugares: unirVistos(v.lugares, lugares), artistas: unirVistos(v.artistas, artistas) }));
  }
  const lista = mia ? vistos : { eventos, lugares, artistas };
  // Lo más que ha habido en la visita en las pestañas que nacen o se vacían: una que ya se mostró no se va, para que el
  // panel no salte de pestaña bajo el dedo (y Deshacer la vuelva a llenar); un guardado que falla devuelve lo suyo
  // (lib/actividad: `recordar`).
  const [memoria, setMemoria] = useState<Memoria>(() => {
    const abierta = { juntos: mia ? 0 : eventos.filter((e) => decididas?.[e.id] === "voy").length, interesa: mia ? interesan.length : 0 };
    return { guardadas: abierta, todas: abierta, fallos: 0 };
  });
  const vistas = memoria.todas;
  const [conChips] = useState(() => lugares.length + artistas.length >= UMBRAL_CHIPS_SEGUIDOS && lugares.length > 0 && artistas.length > 0);
  const esLugar = new Set(lista.lugares.map((l) => l.id));
  const estado = gestos ? asistencia.estado : () => null;
  const sigo = (id: string) => (esLugar.has(id) ? seguirLugar.sigo(id) : seguirArtista.sigo(id));

  const listaEventos = (lista: EventoAgenda[], vacio: ReactNode, conSello: boolean) =>
    lista.length === 0 ? (
      <p className={styles.vacio}>{vacio}</p>
    ) : (
      agruparPorDia(lista).map((g) => (
        <Fragment key={g.clave}>
          <h3 className={styles.dia}>{g.titulo}</h3>
          <ul className={styles.lista} aria-label={g.titulo}>
            {g.eventos.map((e) => (
              <RenglonEvento key={e.id} evento={e} estado={conSello ? estado(e.id) : null} acciones={gestos ? asistencia.acciones(e) : undefined} />
            ))}
          </ul>
        </Fragment>
      ))
    );

  const enPestanas = (estado: (id: string) => Asistencia, sigo: (id: string) => boolean) => pestanasDePersona({ mia, eventos: lista.eventos, lugares: lista.lugares, artistas: lista.artistas, estado, sigo, vistas });
  const actividad = enPestanas(estado, gestos ? sigo : () => true);
  // Las pestañas que se quedan crecen solo con lo que ya quedó guardado, no con lo que se está guardando: si el guardado
  // falla, el gesto se deshace y no puede dejar una pestaña vacía y mentirosa el resto de la visita (revisión de gestión
  // de cambios, 2026-09-17). Mientras se guarda, la pestaña ya se ve porque la pinta `actividad`; y lo guardado cuenta
  // aunque la página todavía no haya vuelto del servidor, para que la pestaña no se vaya bajo el dedo.
  const sigoGuardado = (id: string) => (esLugar.has(id) ? seguirLugar.sigoGuardado(id) : seguirArtista.sigoGuardado(id));
  const confirmada = enPestanas(gestos ? asistencia.guardado : () => null, gestos ? sigoGuardado : () => true);
  // Solo los fallos de los eventos: "Van a lo mismo" y "Me interesa" las llena esa lista, así que solo ella puede
  // devolver lo que añadió un toque que no se guardó (un Seguir que falla no tiene nada que ver con ellas).
  const ahora = recordar(memoria, confirmada, actividad, asistencia.fallos);
  if (!mismaMemoria(ahora, memoria)) setMemoria(ahora);

  const pestanas: Pestana[] = actividad.map((p) => ({
    clave: p.clave,
    etiqueta: p.etiqueta,
    n: p.n,
    contenido:
      p.clave === "sigue" ? (
        p.n === 0 ? (
          <p className={styles.vacio}>
            {mia ? (
              <>
                Todavía no sigues nada. <Link href="/lugares">Ver lugares</Link> · <Link href="/artistas">Ver artistas</Link>
              </>
            ) : (
              "Todavía no sigue ningún lugar ni artista."
            )}
          </p>
        ) : (
          <ListaSeguidos lugares={p.lugares} artistas={p.artistas} conChips={conChips} lugar={gestos ? seguirLugar : undefined} artista={gestos ? seguirArtista : undefined} conSello={!mia && !!gestos} />
        )
      ) : p.clave === "va" ? (
        listaEventos(
          p.eventos,
          mia ? (
            <>
              Todavía no vas a nada. <Link href="/">Ver la agenda</Link>
            </>
          ) : (
            "Todavía no ha dicho que va a ningún evento."
          ),
          !mia,
        )
      ) : p.clave === "interesa" ? (
        listaEventos(p.eventos, "Ya no te interesa ningún evento.", false)
      ) : (
        listaEventos(p.eventos, "Ya no van a lo mismo.", false)
      ),
  }));

  return (
    <>
      <PestanasPersona pestanas={pestanas} />
      <AvisoAbajo canal={canal} />
      {asistencia.extras}
      {seguirLugar.extras}
      {seguirArtista.extras}
    </>
  );
}
