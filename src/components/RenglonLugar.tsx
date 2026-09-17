import Link from "next/link";
import { textoDistancia } from "@/lib/agenda";
import { SIN_FOTO } from "@/lib/imagen";
import { calleCorta, textoProximo, type LugarResumen, type ProximoEvento } from "@/lib/lugares";
import Deslizable, { type AccionDeslizable } from "./ui/Deslizable";
import { IconoCalendario, IconoOk, IconoPin } from "./ui/Iconos";
import styles from "./Renglon.module.css";

type Props = {
  lugar: Pick<LugarResumen, "id" | "nombre" | "direccion" | "portada" | "privado"> & { proximo?: ProximoEvento | null };
  /** Distancia desde el punto de quien mira, cuando la lista se ordena por cercanía. */
  km?: number;
  /** Quien mira lo sigue: se ve primero en los datos. */
  sigo?: boolean;
  /** Con acciones, el renglón se desliza para mostrarlas (Seguir). */
  acciones?: AccionDeslizable[];
};

/**
 * Renglón de lugar (OL-057): foto cuadrada, nombre y, en los datos, si lo sigues, la calle y su próximo evento. Uno solo
 * para todas las listas de lugares, como RenglonEvento para los eventos.
 */
export default function RenglonLugar({ lugar: l, km, sigo = false, acciones }: Props) {
  const contenido = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage */}
      <img src={l.portada ?? SIN_FOTO} alt="" className={styles.foto} />
      <span className={styles.titulo}>{l.nombre}</span>
      <span className={`${styles.meta} ${styles.metaColumna}`}>
        {sigo && (
          <span className={styles.estado}>
            <IconoOk width={14} height={14} />
            Sigues
          </span>
        )}
        {l.privado && <span className={styles.sello}>Solo tú lo ves</span>}
        <span className={styles.lugar}>
          <IconoPin width={15} height={15} />
          {calleCorta(l.direccion) || "Sin dirección"}
          {km !== undefined ? ` · ${textoDistancia(km)}` : ""}
        </span>
        {l.proximo && (
          <span>
            <IconoCalendario width={15} height={15} />
            <b>{textoProximo(l.proximo)}</b>
          </span>
        )}
      </span>
    </>
  );
  if (acciones?.length) {
    return (
      <Deslizable href={`/lugares/${l.id}`} className={styles.renglon} acciones={acciones}>
        {contenido}
      </Deslizable>
    );
  }
  return (
    <li>
      <Link href={`/lugares/${l.id}`} className={styles.renglon}>
        {contenido}
      </Link>
    </li>
  );
}
