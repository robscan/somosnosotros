import Link from "next/link";
import type { EventoAgenda } from "@/lib/agenda";
import { textoBloque } from "@/lib/agendaPorClase";
import { hrefEvento } from "@/lib/eventos";
import type { Asistencia } from "@/lib/deslizar";
import { claveDe } from "@/lib/ocurrencias";
import RenglonEvento from "./RenglonEvento";
import type { EstadoBotonRenglon } from "./ui/BotonRenglon";
import { IconoChevronDerecha, IconoEtiqueta } from "./ui/Iconos";
import renglon from "./ui/Renglon.module.css";
import styles from "./BloqueFestival.module.css";

type Props = {
  /** El marco del festival: su nombre lleva a su ficha (con su programa entero). */
  marco: EventoAgenda;
  /** Sus actos de ese día, en orden: cada uno su renglón de siempre, con su ficha y su «Voy». */
  actos: EventoAgenda[];
  /** ¿El día es hoy? «hoy 2» o «2 este día». */
  esHoy: boolean;
  estado: (id: string) => Asistencia;
  boton: (e: EventoAgenda) => EstadoBotonRenglon;
  /** La línea bajo su nombre cuando no es la de Agenda: en una ficha (OL-410), su cuándo y cuántas actividades tiene ahí («Hasta el sáb 17 de oct · 7
   *  actividades aquí», `cabezaDeBloque`). */
  nota?: string;
  /** Sus actos son de varios días (en una ficha: todas sus funciones aquí, no las de un día): cada renglón dice su día además de su hora. */
  conDia?: boolean;
  /** En la ficha de un lugar el sitio es obvio: no se repite. */
  sinSitio?: boolean;
};

/**
 * Un festival en la agenda de un día (OL-322; doc 55 §3, decisión 4; prototipo caso 7): un bloque con su nombre, «Programa registrado: N
 * actividades · hoy M» y, debajo, sus actos de ese día. Es un renglón más de la lista del día (`<li>` dentro de la del grupo) y sus actos son
 * los renglones de siempre. La cabecera es el renglón de dato de la ficha («Parte de Festival X», el mismo icono de etiqueta y su chevron hacia la
 * ficha del festival); lo único propio es la raya de color a la izquierda que los junta.
 *
 * En las fichas de lugar y de artista (OL-410, «F Bloque como Agenda»), el mismo bloque con todas las funciones del festival ahí, cada una con su
 * día y su hora (`conDia`), y su cuándo y cuántas son en la cabecera (`nota`); un festival de la ficha sin actos todavía es solo la cabecera.
 */
export default function BloqueFestival({ marco, actos, esHoy, estado, boton, nota, conDia = false, sinSitio = false }: Props) {
  return (
    <li className={styles.bloque}>
      <Link href={hrefEvento(marco)} className={`${renglon.dato} ${styles.cabeza}`}>
        <IconoEtiqueta width={20} height={20} />
        <b>{marco.titulo}</b>
        <small>{nota ?? textoBloque(Math.max(marco.programa?.registrados ?? 0, actos.length), actos.length, esHoy)}</small>
        <IconoChevronDerecha />
      </Link>
      {actos.length > 0 && (
        <ul>
          {actos.map((a) => (
            <RenglonEvento key={claveDe(a)} evento={a} conDia={conDia} sinSitio={sinSitio} estado={estado(a.id)} boton={boton(a)} />
          ))}
        </ul>
      )}
    </li>
  );
}
