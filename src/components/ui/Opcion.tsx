import type { ReactNode } from "react";
import { IconoChevronDerecha } from "./Iconos";
import styles from "./Opcion.module.css";

/**
 * La opción grande de una pregunta de un solo toque («¿Cuánto cuesta?» del alta por pasos; prototipo firmado de la bitácora 323):
 * icono, la respuesta con su detalle debajo y el chevron que dice que tocarla sigue adelante. Elegir es tocarla: no hay botón aparte.
 * Mientras una opción hace su trabajo (`ocupada`, que la respuesta dice «Guardando…»), todas se apagan con `disabled` y la ocupada no se atenúa.
 * Sin `icono` y sin `detalle` es la otra puerta de una pantalla («No tengo cartel ›», bitácora 334): el texto a la izquierda y el chevron a la
 * derecha. `compacta`, del alto de un toque y con la letra del texto: para una lista larga de respuestas de una línea («¿Qué tipo de lugar
 * es?», diez opciones; prototipo `lugar-artista-por-pasos.html`). `className` es para quien la coloca (el aire que pide encima, `--aire-antes`
 * de `PorPasos`).
 */
export default function Opcion({ icono, titulo, detalle, onClick, disabled, ocupada, compacta, className }: { icono?: ReactNode; titulo: string; detalle?: string; onClick: () => void; disabled?: boolean; ocupada?: boolean; compacta?: boolean; className?: string }) {
  return (
    <button type="button" className={[styles.opcion, icono ? "" : styles.sinIcono, compacta && styles.compacta, className].filter(Boolean).join(" ")} onClick={onClick} disabled={disabled} aria-busy={ocupada || undefined}>
      {icono}
      <b>{titulo}</b>
      {detalle && <small>{detalle}</small>}
      <IconoChevronDerecha width={18} height={18} className={styles.flecha} />
    </button>
  );
}
