import Link from "next/link";
import type { EventoAgenda } from "@/lib/agenda";
import { textoDistancia } from "@/lib/agenda";
import { nombreSitio } from "@/lib/eventos";
import { horaCorta } from "@/lib/fechas";
import { IconoBoleto, IconoCalendario, IconoPersonas, IconoPin, IconoReloj } from "./ui/Iconos";
import styles from "./Renglon.module.css";

type Props = {
  evento: EventoAgenda;
  km?: number;
  /** En la ficha de un lugar el sitio es obvio: no se repite. */
  sinSitio?: boolean;
};

/** Renglón de evento: foto a la izquierda (la del evento o la del lugar), título y datos con icono. */
export default function RenglonEvento({ evento: e, km, sinSitio = false }: Props) {
  const foto = e.imagen ?? e.lugar?.portada ?? null;
  return (
    <li>
      <Link href={`/eventos/${e.id}`} className={styles.renglon}>
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
          <img src={foto} alt="" className={styles.foto} />
        ) : (
          <span className={`${styles.foto} ${styles.fotoVacia}`} aria-hidden="true">
            <IconoCalendario width={26} height={26} />
          </span>
        )}
        <span className={styles.titulo}>{e.titulo}</span>
        <span className={styles.meta}>
          <span>
            <IconoReloj width={15} height={15} />
            <b>{horaCorta(e.inicio)}</b>
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
    </li>
  );
}
