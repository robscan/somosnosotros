import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import styles from "./Boton.module.css";

type Variante = "principal" | "secundario" | "peligro";
type ComoBoton = ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; href?: undefined };
type ComoEnlace = ComponentProps<typeof Link> & { variante?: Variante; href: string };

/**
 * Botón de la app. Alto mínimo 48px (pulgar), ancho completo en móvil. Con `href` es un enlace con el mismo dibujo
 * (Registrar un lugar, Publicar un evento aquí, Ver más): una sola pieza para todos los botones, sean botón o enlace.
 */
export default function Boton(props: ComoBoton | ComoEnlace) {
  const { variante = "principal", className = "", ...rest } = props;
  const clase = `${styles.boton} ${styles[variante]} ${className}`;
  if (typeof rest.href === "string") return <Link {...(rest as ComponentProps<typeof Link>)} className={clase} />;
  return <button {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)} className={clase} />;
}
