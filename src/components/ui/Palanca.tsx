import type { ButtonHTMLAttributes } from "react";
import styles from "./Palanca.module.css";

/** Sin texto a la vista, el nombre va en `aria-label`. */
type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "role" | "aria-checked"> & {
  "aria-label": string;
  encendida: boolean;
};

/**
 * El interruptor de la app (Avisos, Perfil reservado, Soy yo, Lugar privado, Pincel): un botón con `role="switch"` que
 * dice su estado con `aria-checked`. Quien la usa le pone el sitio (`className`, o el área de un `Renglon`, que ya
 * coloca todo `role="switch"`) y decide qué pasa al tocarla; ella solo dibuja y mide.
 */
export default function Palanca({ encendida, className, ...resto }: Props) {
  return <button type="button" role="switch" aria-checked={encendida} {...resto} className={[styles.palanca, className].filter(Boolean).join(" ")} />;
}
