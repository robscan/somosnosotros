import Link from "next/link";
import { IconoPinMas } from "./ui/Iconos";
import styles from "./Publicar.module.css";

type Props = {
  /** Agenda y Artistas: "+ Publicar" un evento (o el primer lugar si no hay). Lugares: "Registrar lugar". */
  que?: "evento" | "lugar";
  hayLugares?: boolean;
};

/**
 * La única acción de las pantallas raíz: un botón flotante en la zona del pulgar, encima de la navegación.
 * Con o sin sesión lleva al alta; la sesión se pide después, con el valor por delante.
 * Cada sección tiene su verbo e icono para que se distingan a simple vista (misma forma, distinta acción).
 */
export default function Publicar({ que = "evento", hayLugares = true }: Props) {
  if (que === "lugar") {
    return (
      <Link href="/lugares/nuevo" className={styles.publicar} aria-label="Registrar un lugar">
        <IconoPinMas width={22} height={22} />
        Registrar lugar
      </Link>
    );
  }
  return (
    <Link href={hayLugares ? "/eventos/nuevo" : "/lugares/nuevo"} className={styles.publicar} aria-label="Publicar un evento">
      + Publicar
    </Link>
  );
}
