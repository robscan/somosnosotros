import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import EnCamino from "./EnCamino";
import styles from "./Boton.module.css";

type Opciones = {
  /** `quieto`: la salida secundaria que no compite con la principal (el «enlace quieto» del alta por pasos: «Dura varios días»,
   *  «Agregar artistas, descripción o enlace»), en gris y subrayada. */
  variante?: "primario" | "secundario" | "texto" | "peligro" | "quieto";
  /** `recta` (la de los campos) o `pildora` (la de los chips y los botones de las barras). */
  forma?: "recta" | "pildora";
  /** `toque` (48, el del pulgar) o `control` (44, el mínimo: barras, cabeceras y renglones). */
  alto?: "toque" | "control";
  /** `completo` (a todo lo de su caja) o `contenido` (lo que mide su texto). */
  ancho?: "completo" | "contenido";
  /** La pastilla que flota sobre lo que pasa por debajo (Me interesa, Voy, Seguir): píldora de una línea, con sombra. Con `aria-pressed` lo que ya quedó se ve decidido. */
  flotante?: boolean;
};
type ComoBoton = ButtonHTMLAttributes<HTMLButtonElement> & Opciones & { href?: undefined };
type ComoEnlace = ComponentProps<typeof Link> & Opciones & { href: string };

/**
 * Las clases de un botón, para lo que no puede ser un `<button>` ni un `<a>`: una etiqueta que dice qué hace el
 * control que la contiene (`rehacerCartel`) o un botón que ya trae su propio componente (`BotonCompartir`).
 */
export function claseBoton({ variante = "primario", forma = "recta", alto = "toque", ancho = "completo", flotante = false }: Opciones = {}): string {
  return [styles.boton, styles[variante], styles[ancho], forma === "pildora" && styles.pildora, alto === "control" && styles.control, flotante && styles.flotante].filter(Boolean).join(" ");
}

/**
 * El botón de la app: una sola pieza para todos los botones con texto, sean botón o enlace (Registrar un lugar,
 * Publicar un evento aquí, Ver más). Los redondos de solo icono son `BotonIcono`; las opciones de un toque, `Chip`.
 * Estados: pulsado y foco visible los da la app entera; deshabilitado, con `disabled` o con `aria-disabled` cuando
 * el motivo se lee en pantalla (`aria-describedby`; entonces no lleva `onClick`); en camino, solo con un enlace
 * (late mientras el servidor responde) o con `aria-busy` en un botón.
 */
export default function Boton(props: ComoBoton | ComoEnlace) {
  const { variante, forma, alto, ancho, flotante, className, ...rest } = props;
  const clase = [claseBoton({ variante, forma, alto, ancho, flotante }), className].filter(Boolean).join(" ");
  if (typeof rest.href === "string") {
    const { children, ...enlace } = rest as ComponentProps<typeof Link>;
    return (
      <Link {...enlace} className={clase}>
        {children}
        <EnCamino className={styles.enCamino} />
      </Link>
    );
  }
  return <button {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)} className={clase} />;
}
