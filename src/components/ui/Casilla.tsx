import { IconoOk } from "./Iconos";
import styles from "./Casilla.module.css";

/**
 * La casilla de la app (prototipo firmado de la bitácora 334, «Lectura automática»): un botón con `role="checkbox"` que dice su estado con
 * `aria-checked`, con el nombre arriba (17 px, negrita) y debajo, si lo hay, lo que la acompaña (14 px), los dos a la izquierda. Quien la
 * usa decide qué pasa al tocarla; ella solo dibuja y mide. `enMarco` es para cuando es la última fila de un marco que ya tiene su borde
 * (una raya punteada arriba y nada más): así comparte región con lo de arriba y no es una tarjeta aparte. Apagada (`disabled`) se atenúa.
 */
export default function Casilla({ titulo, detalle, marcada, onCambio, disabled, enMarco }: { titulo: string; detalle?: string | null; marcada: boolean; onCambio: (marcada: boolean) => void; disabled?: boolean; enMarco?: boolean }) {
  return (
    <button type="button" role="checkbox" aria-checked={marcada} className={enMarco ? `${styles.casilla} ${styles.enMarco}` : styles.casilla} onClick={() => onCambio(!marcada)} disabled={disabled}>
      {marcada && <IconoOk width={16} height={16} strokeWidth={3} />}
      <b>{titulo}</b>
      {detalle && <small>{detalle}</small>}
    </button>
  );
}
