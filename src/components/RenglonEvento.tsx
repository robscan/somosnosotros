import Link from "next/link";
import type { EventoAgenda } from "@/lib/agenda";
import { textoDistancia } from "@/lib/agenda";
import type { Asistencia } from "@/lib/deslizar";
import { hrefEvento, nombreSitio } from "@/lib/eventos";
import { diaCorto, horaCorta } from "@/lib/fechas";
import { SIN_FOTO } from "@/lib/imagen";
import BotonRenglon, { type EstadoBotonRenglon } from "./ui/BotonRenglon";
import { IconoBoleto, IconoCalendario, IconoEstrella, IconoPersonas, IconoPin, IconoReloj } from "./ui/Iconos";
import styles from "./Renglon.module.css";

type Props = {
  evento: EventoAgenda;
  km?: number;
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

/** Renglón de evento: foto a la izquierda (la del evento o la del lugar), título y datos con icono. */
export default function RenglonEvento({ evento: e, km, sinSitio = false, estado = null, boton, conDia = false }: Props) {
  const foto = e.imagen ?? e.lugar?.portada ?? SIN_FOTO;
  return (
    <li className={styles.renglon}>
      <Link href={hrefEvento(e)} className={styles.frente}>
        {/* eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage */}
        <img src={foto} alt="" className={styles.foto} />
        <span className={styles.titulo}>{e.titulo}</span>
        <span className={styles.meta}>
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
      </Link>
      {boton && <BotonRenglon {...boton} />}
    </li>
  );
}
