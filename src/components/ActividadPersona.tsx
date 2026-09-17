"use client";

import Link from "next/link";
import { Fragment, useState, type ReactNode } from "react";
import type { ArtistaSeguido, LugarSeguido } from "@/app/personas/consultas";
import { pestanasDePersona, unirVistos } from "@/lib/actividad";
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
  const [alAbrir] = useState(() => ({
    juntos: mia ? 0 : eventos.filter((e) => decididas?.[e.id] === "voy").length,
    interesa: mia ? interesan.length : 0,
  }));
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

  const pestanas: Pestana[] = pestanasDePersona({ mia, eventos: lista.eventos, lugares: lista.lugares, artistas: lista.artistas, estado, sigo: gestos ? sigo : () => true, alAbrir }).map((p) => ({
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
      <AvisoAbajo canal={canal} enEspera={asistencia.hojaAbierta || seguirLugar.hojaAbierta || seguirArtista.hojaAbierta} />
      {asistencia.extras}
      {seguirLugar.extras}
      {seguirArtista.extras}
    </>
  );
}
