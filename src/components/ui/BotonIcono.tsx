import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import styles from "./BotonIcono.module.css";

type Opciones = {
  /** `control` (44: barras y cabeceras), `accion` (48: renglones, tarjetas y mapa) o `grande` (56: acciones de una ficha). */
  tamano?: "control" | "accion" | "grande";
  /** `plano` (barras), `elevado` (acciones sobre listas, tarjetas, mapa y ficha) o `contorno` (opciones secundarias de un formulario). */
  relieve?: "plano" | "elevado" | "contorno";
  /** Lo que ya quedó (Voy, Seguir): verde con el glifo en blanco. Con él el botón es un conmutador (`aria-pressed`). */
  decidido?: boolean;
};
/** Sin texto a la vista, el nombre va en `aria-label`. */
type ComoBoton = ButtonHTMLAttributes<HTMLButtonElement> & Opciones & { "aria-label": string; href?: undefined };
type ComoEnlace = ComponentProps<typeof Link> & Omit<Opciones, "decidido"> & { "aria-label": string; href: string };

/**
 * Las clases de un botón redondo, para lo que no puede ser un `<button>` ni un `<a>`: el círculo de una acción que es
 * solo el dibujo de un control más grande (una acción de ficha, con su letrero debajo), o la etiqueta de un campo de
 * archivo (elegir la foto).
 */
export function claseBotonIcono({ tamano = "control", relieve = "plano", decidido = false }: Opciones = {}): string {
  return [styles.boton, styles[tamano], styles[relieve], decidido && styles.decidido].filter(Boolean).join(" ");
}

/** El botón redondo de solo icono, sea botón o enlace: `children` es el glifo, con el tamaño que quiera darle quien lo usa. */
export default function BotonIcono(props: ComoBoton | ComoEnlace) {
  const { tamano, relieve, className, ...rest } = props;
  if (typeof rest.href === "string") {
    return <Link {...(rest as ComponentProps<typeof Link>)} className={[claseBotonIcono({ tamano, relieve }), className].filter(Boolean).join(" ")} />;
  }
  const { decidido, ...boton } = rest as ButtonHTMLAttributes<HTMLButtonElement> & Pick<Opciones, "decidido">;
  return <button type="button" aria-pressed={decidido} {...boton} className={[claseBotonIcono({ tamano, relieve, decidido }), className].filter(Boolean).join(" ")} />;
}
