import type { ButtonHTMLAttributes } from "react";
import styles from "./Boton.module.css";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: "principal" | "secundario" | "peligro";
};

/** Botón de la app. Alto mínimo 48px (pulgar), ancho completo en móvil. */
export default function Boton({ variante = "principal", className = "", ...rest }: Props) {
  return <button className={`${styles.boton} ${styles[variante]} ${className}`} {...rest} />;
}
