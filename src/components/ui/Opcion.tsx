import type { ReactNode } from "react";
import { IconoChevronDerecha } from "./Iconos";
import styles from "./Opcion.module.css";

/**
 * La opción grande de una pregunta de un solo toque («¿Cuánto cuesta?» del alta por pasos; prototipo firmado de la bitácora 323):
 * icono, la respuesta con su detalle debajo y el chevron que dice que tocarla sigue adelante. Elegir es tocarla: no hay botón aparte.
 * Mientras una opción hace su trabajo (`ocupada`, que la respuesta dice «Guardando…»), todas se apagan con `disabled` y la ocupada no se atenúa.
 */
export default function Opcion({ icono, titulo, detalle, onClick, disabled, ocupada }: { icono: ReactNode; titulo: string; detalle: string; onClick: () => void; disabled?: boolean; ocupada?: boolean }) {
  return (
    <button type="button" className={styles.opcion} onClick={onClick} disabled={disabled} aria-busy={ocupada || undefined}>
      {icono}
      <b>{titulo}</b>
      <small>{detalle}</small>
      <IconoChevronDerecha width={18} height={18} />
    </button>
  );
}
