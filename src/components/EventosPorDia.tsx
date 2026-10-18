"use client";

import { Fragment } from "react";
import type { EventoAgenda } from "@/lib/agenda";
import { festivalComoEvento, soloInteres } from "@/lib/claseEvento";
import { cabezaDeBloque, eventosDeFicha, lineaParaVisitar, type DeQuien } from "@/lib/eventosFicha";
import { claveDe } from "@/lib/ocurrencias";
import BloqueFestival from "./BloqueFestival";
import RenglonEvento from "./RenglonEvento";
import { useAsistenciaEnLista, type Decididas } from "./useAsistenciaEnLista";
import { useCanalDePantalla } from "./useCanalDeListas";
import type { AvisosLista } from "./useSeguirEnLista";

type Props = {
  eventos: EventoAgenda[];
  /** Los festivales de los actos que no están en `eventos`: con ellos, sus actos van en el bloque de su festival (OL-410). */
  marcos?: EventoAgenda[];
  /** De quién es la ficha: dice cómo cuenta las funciones de un festival («7 funciones aquí» en un lugar, «2 funciones suyas» en un artista). */
  de?: DeQuien;
  /** En la ficha de un lugar el sitio es obvio: no se repite. */
  sinSitio?: boolean;
  /** Lo que quien mira decidió en estos eventos, leído con su sesión; null = sin sesión (el gesto lleva a Entrar). */
  decididas: Decididas;
  avisos: AvisosLista | null;
};

/**
 * Los próximos eventos de una ficha (lugar, artista; también el programa de un festival y las otras funciones de un evento) por día, con Voy y Me
 * interesa al deslizar para quien mira, como en la agenda (OL-057). Desde OL-410 (lo firmado en OL-409) se arman como Agenda (`eventosDeFicha`):
 * «Para visitar» arriba con las exposiciones, sin Voy; cada función y cada sesión en su día, con su hora; los actos de un festival en su bloque
 * (`BloqueFestival`), colocado por su siguiente función. El título del día y la lista toman sus estilos de la sección que los contiene; el aviso,
 * uno para toda la ficha, flota sobre su pastilla (`Hecho`).
 */
export default function EventosPorDia({ eventos, marcos = [], de = "lugar", sinSitio = false, decididas, avisos }: Props) {
  // El aviso y la pregunta son de toda la ficha: los comparte con su barra (Seguir o Voy).
  const asistencia = useAsistenciaEnLista(decididas, avisos, useCanalDePantalla());
  const ahora = new Date();
  const { visitar, dias } = eventosDeFicha(eventos, marcos, ahora);
  // Ni una exposición ni el marco de un festival llevan «Voy» en la lista (doc 55 §5, punto 2: «Me interesa», en su ficha); un festival sin
  // programa sí (OL-413: pasa un día a una hora).
  const botonDe = (e: EventoAgenda) => (soloInteres(e.clase, festivalComoEvento(e)) ? undefined : asistencia.boton(e));
  return (
    <>
      {visitar.length > 0 && (
        <Fragment key="para-visitar">
          <h3>Para visitar</h3>
          <ul aria-label="Para visitar">
            {visitar.map((e) => {
              const linea = lineaParaVisitar(e, ahora);
              return <RenglonEvento key={e.id} evento={e} sinSitio={sinSitio} cuando={linea.cuando} horas={linea.horas} nota={linea.nota} estado={asistencia.estado(e.id)} />;
            })}
          </ul>
        </Fragment>
      )}
      {dias.map((g) => (
        <Fragment key={g.clave}>
          <h3>{g.titulo}</h3>
          <ul aria-label={g.titulo}>
            {g.eventos.map((p) =>
              p.tipo === "festival" ? (
                <BloqueFestival key={`festival-${p.marco.id}`} marco={p.marco} actos={p.funciones} esHoy={false} nota={cabezaDeBloque(p.marco, p.funciones.length, de, ahora)} conDia sinSitio={sinSitio} estado={asistencia.estado} boton={asistencia.boton} />
              ) : (
                <RenglonEvento key={claveDe(p.evento)} evento={p.evento} sinSitio={sinSitio} estado={asistencia.estado(p.evento.id)} boton={botonDe(p.evento)} />
              ),
            )}
          </ul>
        </Fragment>
      ))}
      {asistencia.extras}
    </>
  );
}
