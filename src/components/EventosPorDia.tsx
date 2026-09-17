"use client";

import { Fragment } from "react";
import { agruparPorDia, type EventoAgenda } from "@/lib/agenda";
import RenglonEvento from "./RenglonEvento";
import { useAsistenciaEnLista, type Decididas } from "./useAsistenciaEnLista";
import type { AvisosLista } from "./useSeguirEnLista";

type Props = {
  eventos: EventoAgenda[];
  /** En la ficha de un lugar el sitio es obvio: no se repite. */
  sinSitio?: boolean;
  /** Lo que quien mira decidió en estos eventos, leído con su sesión; null = sin sesión (el gesto lleva a Entrar). */
  decididas: Decididas;
  avisos: AvisosLista | null;
};

/**
 * Los próximos eventos de una ficha (lugar, artista) por día, con Voy y Me interesa al deslizar para quien mira, como en la
 * agenda (OL-057). El título del día y la lista toman sus estilos de la sección que los contiene; el aviso flota sobre la
 * barra fija de la ficha (ui/useAltoBarraFija).
 */
export default function EventosPorDia({ eventos, sinSitio = false, decididas, avisos }: Props) {
  const asistencia = useAsistenciaEnLista(decididas, avisos);
  return (
    <>
      {agruparPorDia(eventos).map((g) => (
        <Fragment key={g.clave}>
          <h3>{g.titulo}</h3>
          <ul aria-label={g.titulo}>
            {g.eventos.map((e) => (
              <RenglonEvento key={e.id} evento={e} sinSitio={sinSitio} estado={asistencia.estado(e.id)} acciones={asistencia.acciones(e)} />
            ))}
          </ul>
        </Fragment>
      ))}
      {asistencia.extras}
    </>
  );
}
