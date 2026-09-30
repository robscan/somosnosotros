import { textoDistancia } from "@/lib/agenda";
import { SIN_FOTO } from "@/lib/imagen";
import { calleCorta, hrefLugar, textoProximo, type LugarResumen, type ProximoEvento } from "@/lib/lugares";
import BotonRenglon, { type EstadoBotonRenglon } from "./ui/BotonRenglon";
import { IconoCalendario, IconoPin } from "./ui/Iconos";
import Renglon from "./ui/Renglon";
import styles from "./ui/Renglon.module.css";

type Props = {
  lugar: Pick<LugarResumen, "id" | "slug" | "nombre" | "direccion" | "portada" | "privado"> & { proximo?: ProximoEvento | null };
  /** Distancia desde el punto de quien mira, cuando la lista se ordena por cercanía. */
  km?: number;
  /** Con botón, "Seguir" o "Sigues" (OL-104, bitácora 139); sin él, el renglón es un enlace simple. */
  boton?: EstadoBotonRenglon;
};

/**
 * Renglón de lugar (OL-057): foto cuadrada, nombre y, en los datos, la calle y su próximo evento. Uno solo para todas
 * las listas de lugares, como RenglonEvento para los eventos.
 */
export default function RenglonLugar({ lugar: l, km, boton }: Props) {
  return (
    <Renglon href={hrefLugar(l)} foto={l.portada ?? SIN_FOTO} titulo={l.nombre} columna accion={boton && <BotonRenglon {...boton} />}>
      {l.privado && <span className={styles.sello}>Solo tú lo ves</span>}
      <span className={styles.envuelve}>
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
    </Renglon>
  );
}
