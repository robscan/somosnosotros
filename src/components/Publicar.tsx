import Link from "next/link";
import styles from "./Publicar.module.css";

/**
 * La única acción de las pantallas raíz: un botón flotante en la zona del pulgar, encima de la navegación.
 * Con o sin sesión lleva al alta; la sesión se pide después, con el valor por delante.
 * Si todavía no hay lugares, lleva a registrar el primero.
 */
export default function Publicar({ hayLugares }: { hayLugares: boolean }) {
  return (
    <Link href={hayLugares ? "/eventos/nuevo" : "/lugares/nuevo"} className={styles.publicar} aria-label="Publicar un evento">
      + Publicar
    </Link>
  );
}
