import Link from "next/link";
import { CIRCULO } from "@/components/ui/Ficha";
import ficha from "@/components/ui/Ficha.module.css";
import { IconoMas, IconoPin, IconoRuta } from "@/components/ui/Iconos";
import type { ResultadoLigar } from "../acciones";
import LigarEventos from "./LigarEventos";

type Props = {
  /** «Cómo llegar» al punto del sitio; null si no hay a dónde. */
  comoLlegar: string | null;
  /** El alta de lugar con el sitio ya puesto (nombre, punto, ciudad y su clave); null sin sesión o si el sitio ya está en el directorio. */
  agregar: string | null;
  /** La ficha del lugar del directorio que es este sitio (su mismo nombre a menos de 150 m); null si no lo hay. */
  directorio: string | null;
  /** «Ligar sus eventos» de la administración, con el sitio y su lugar atados; null para todos los demás. */
  ligar: (() => Promise<ResultadoLigar>) | null;
};

/**
 * Las acciones de la ficha de un sitio (OL-348 y OL-366), en la fila de siempre (un círculo con su letrero): «Cómo llegar»; «Agregar al
 * directorio» (con sesión) o, si el sitio ya tiene su lugar en el directorio, «Ver en el directorio» (para todos: abre el lugar, así nadie lo
 * duplica); y, con él y para la administración, «Ligar sus eventos». Sin textos de ayuda: los letreros dicen lo que hacen.
 */
export default function AccionesSitio({ comoLlegar, agregar, directorio, ligar }: Props) {
  return (
    <div className={ficha.acciones}>
      {comoLlegar && (
        <a href={comoLlegar} className={ficha.accion} target="_blank" rel="noopener noreferrer">
          <span className={CIRCULO}>
            <IconoRuta />
          </span>
          Cómo llegar
        </a>
      )}
      {directorio ? (
        <Link href={directorio} className={ficha.accion}>
          <span className={CIRCULO}>
            <IconoPin />
          </span>
          <span className={ficha.accionEtiqueta}>Ver en el directorio</span>
        </Link>
      ) : (
        agregar && (
          <Link href={agregar} className={ficha.accion}>
            <span className={CIRCULO}>
              <IconoMas />
            </span>
            <span className={ficha.accionEtiqueta}>Agregar al directorio</span>
          </Link>
        )
      )}
      {directorio && ligar && <LigarEventos ligar={ligar} />}
    </div>
  );
}
