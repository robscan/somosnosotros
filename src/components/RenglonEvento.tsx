import type { EventoAgenda } from "@/lib/agenda";
import type { Asistencia } from "@/lib/deslizar";
import { hrefEvento, sitioEnLista } from "@/lib/eventos";
import { cuandoPorDia, cuandoVariosDias, diaCorto, horaCorta } from "@/lib/fechas";
import { textoParte } from "@/lib/ocurrencias";
import BotonRenglon, { type EstadoBotonRenglon } from "./ui/BotonRenglon";
import { Chip } from "./ui/Chip";
import { IconoCalendario, IconoPin, IconoReloj } from "./ui/Iconos";
import Renglon from "./ui/Renglon";

type Props = {
  evento: EventoAgenda;
  /** En la ficha de un lugar el sitio es obvio: no se repite. */
  sinSitio?: boolean;
  /** Lo que la persona ya decidió (con sesión): "Te interesa" se ve en los datos; "voy" ya lo dice el botón. */
  estado?: Asistencia;
  /** Con botón, "Voy" o "Vas" (OL-104, bitácora 139); sin él, el renglón es un enlace simple. */
  boton?: EstadoBotonRenglon;
  /**
   * Muestra el día además de la hora ("jue 8 de oct · 19:00"). Solo lo pide la pestaña Nuevos, donde el encabezado dice
   * cuándo se publicó y no cuándo es el evento. En las listas por día (la agenda y las fichas de lugar y de artista) el
   * día ya lo dice su encabezado, así que ahí se queda como estaba.
   */
  conDia?: boolean;
};

/**
 * Lo que dice el cuándo de un evento entero de varios días: sus días y su horario de cada día; con horario por día, sus días y «horarios por
 * día». Lo que se reparte en sus días (la agenda por día) llega ya como un día con su hora y no entra aquí: es null.
 */
function cuandoDeVarios(e: Pick<EventoAgenda, "inicio" | "fin" | "zona" | "sesiones">): string | null {
  if (e.fin && e.sesiones?.length) return cuandoPorDia(e.inicio, e.fin, e.zona);
  const v = cuandoVariosDias(e.inicio, e.fin, new Date(), e.zona);
  return v ? `${v.dias} · ${v.horas}` : null;
}

/**
 * Renglón de evento: foto a la izquierda (la del evento o la del lugar), el título y dos líneas de datos, cada una cortada
 * con puntos suspensivos (H-09, doc 50: antes crecía hasta 190 px con la dirección postal y cada dato en su renglón). La
 * primera es cuándo —«19:00», con el día si hace falta; en un evento de varios días, «Del 10 al 12 de oct · 8:00–9:00 p.m.»— y, tras un punto, lo que no es gratis y cuántos van (sin «Gratis» en
 * todos); la segunda, el nombre del sitio, sin su dirección postal (esa vive en la ficha).
 *
 * El renglón de un día de un evento con varios (OL-320, `lib/ocurrencias`) dice la hora de ese día y, tras ella, cuál es: «20:00 · Día 2 de 3». El
 * evento entero con horario por día (la pestaña Nuevos, donde sale una sola vez) dice sus días y «horarios por día», como su ficha.
 */
export default function RenglonEvento({ evento: e, sinSitio = false, estado = null, boton, conDia = false }: Props) {
  const varios = cuandoDeVarios(e);
  const ademas = [textoParte(e), e.precio, e.van !== null && e.van > 0 ? `${e.van} ${e.van === 1 ? "va" : "van"}` : null].filter(Boolean).join(" · ");
  return (
    <Renglon href={hrefEvento(e)} foto={e.imagen ?? e.lugar?.portada ?? null} titulo={e.titulo} accion={boton && <BotonRenglon {...boton} />}>
      <span>
        {estado === "me_interesa" && <Chip variante="estado">Te interesa</Chip>}
        {conDia || varios ? <IconoCalendario width={15} height={15} /> : <IconoReloj width={15} height={15} />}
        <b>
          {varios ?? `${conDia ? `${diaCorto(e.inicio, new Date(), e.zona)} · ` : ""}${horaCorta(e.inicio, e.zona)}`}
        </b>
        {ademas && <span>· {ademas}</span>}
      </span>
      {!sinSitio && (
        <span>
          <IconoPin width={15} height={15} />
          <span>{sitioEnLista(e)}</span>
        </span>
      )}
    </Renglon>
  );
}
