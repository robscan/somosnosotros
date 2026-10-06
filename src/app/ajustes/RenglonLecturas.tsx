import type { Cupo } from "@/app/eventos/acciones";
import { detalleDeLecturas } from "@/app/eventos/estadoCartel";
import { IconoCamara } from "@/components/ui/Iconos";
import renglon from "@/components/ui/Renglon.module.css";

/**
 * Cuántas lecturas automáticas de carteles le quedan a la cuenta este mes (OL-307, bitácora 335): un renglón de información de Ajustes, como
 * «Entras con…». «Quedan N este mes», «Se renueva el 1 de <mes>» con ninguna, «Sin límite» para la administración. Sin saber el cupo (sin servicio
 * de lectura, o la consulta no contestó) no hay renglón.
 */
export default function RenglonLecturas({ cupo }: { cupo: Cupo | null }) {
  const detalle = detalleDeLecturas(cupo);
  if (!detalle) return null;
  return (
    <li className={renglon.ajuste}>
      <IconoCamara width={20} height={20} />
      <b>Lectura automática de carteles</b>
      <small>{detalle}</small>
    </li>
  );
}
