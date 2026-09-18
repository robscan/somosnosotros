import Link from "next/link";
import type { EventoAgenda } from "@/lib/agenda";
import { textoDistancia } from "@/lib/agenda";
import type { Asistencia } from "@/lib/deslizar";
import { nombreSitio } from "@/lib/eventos";
import { diaCorto, horaCorta } from "@/lib/fechas";
import { SIN_FOTO } from "@/lib/imagen";
import Deslizable, { type AccionDeslizable } from "./ui/Deslizable";
import { IconoBoleto, IconoCalendario, IconoEstrella, IconoOk, IconoPersonas, IconoPin, IconoReloj } from "./ui/Iconos";
import styles from "./Renglon.module.css";

type Props = {
  evento: EventoAgenda;
  km?: number;
  /** En la ficha de un lugar el sitio es obvio: no se repite. */
  sinSitio?: boolean;
  /** Lo que la persona ya decidió (con sesión): se ve primero en los datos. */
  estado?: Asistencia;
  /** Con acciones, el renglón se desliza para mostrarlas (la agenda). */
  acciones?: AccionDeslizable[];
  /**
   * Muestra el día además de la hora ("jue 8 de oct · 19:00"). Solo lo pide la pestaña Nuevos, donde el encabezado dice
   * cuándo se publicó y no cuándo es el evento. En las listas por día (la agenda y las fichas de lugar y de artista) el
   * día ya lo dice su encabezado, así que ahí se queda como estaba.
   */
  conDia?: boolean;
};

/** Renglón de evento: foto a la izquierda (la del evento o la del lugar), título y datos con icono. */
export default function RenglonEvento({ evento: e, km, sinSitio = false, estado = null, acciones, conDia = false }: Props) {
  const foto = e.imagen ?? e.lugar?.portada ?? SIN_FOTO;
  const contenido = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage */}
      <img src={foto} alt="" className={styles.foto} />
      <span className={styles.titulo}>{e.titulo}</span>
      <span className={styles.meta}>
        {estado === "voy" && (
          <span className={styles.estado}>
            <IconoOk width={14} height={14} />
            Vas
          </span>
        )}
        {estado === "me_interesa" && (
          <span className={styles.estado}>
            <IconoEstrella width={14} height={14} />
            Te interesa
          </span>
        )}
        <span>
          {conDia ? <IconoCalendario width={15} height={15} /> : <IconoReloj width={15} height={15} />}
          <b>
            {conDia && `${diaCorto(e.inicio, new Date(), e.zona)} · `}
            {horaCorta(e.inicio, e.zona)}
          </b>
        </span>
        {!sinSitio && (
          <span className={styles.lugar}>
            <IconoPin width={15} height={15} />
            {nombreSitio(e)}
            {km !== undefined ? ` · ${textoDistancia(km)}` : ""}
          </span>
        )}
        {e.van > 0 && (
          <span>
            <IconoPersonas width={15} height={15} />
            {e.van} {e.van === 1 ? "va" : "van"}
          </span>
        )}
        <span>
          <IconoBoleto width={15} height={15} />
          {e.precio ?? "Gratis"}
        </span>
      </span>
    </>
  );
  if (acciones?.length) {
    return (
      <Deslizable href={`/eventos/${e.id}`} className={styles.renglon} acciones={acciones}>
        {contenido}
      </Deslizable>
    );
  }
  return (
    <li>
      <Link href={`/eventos/${e.id}`} className={styles.renglon}>
        {contenido}
      </Link>
    </li>
  );
}
