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
};

/**
 * Un festival en la agenda de un día (OL-322; doc 55 §3, decisión 4; prototipo caso 7): un bloque con su nombre, «Programa registrado: N
 * actividades · hoy M» y, debajo, sus actos de ese día. Es un renglón más de la lista del día (`<li>` dentro de la del grupo) y sus actos son
 * los renglones de siempre. La cabecera es el renglón de dato de la ficha («Parte de Festival X», el mismo icono de etiqueta y su chevron hacia la
 * ficha del festival); lo único propio es la raya de color a la izquierda que los junta.
 */
export default function BloqueFestival({ marco, actos, esHoy, estado, boton }: Props) {
  return (
    <li className={styles.bloque}>
      <Link href={hrefEvento(marco)} className={`${renglon.dato} ${styles.cabeza}`}>
        <IconoEtiqueta width={20} height={20} />
        <b>{marco.titulo}</b>
        <small>{textoBloque(Math.max(marco.programa?.registrados ?? 0, actos.length), actos.length, esHoy)}</small>
        <IconoChevronDerecha />
      </Link>
      <ul>
        {actos.map((a) => (
          <RenglonEvento key={claveDe(a)} evento={a} estado={estado(a.id)} boton={boton(a)} />
        ))}
      </ul>
    </li>
  );
}
