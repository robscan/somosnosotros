import type { CSSProperties, ReactNode } from "react";
import { claseBoton } from "./Boton";
import { claseBotonIcono } from "./BotonIcono";
import styles from "./Ficha.module.css";

/** El círculo de cada acción de una ficha (compartir, sitio web, cómo llegar…): el dibujo de un control más grande, con su letrero debajo. */
export const CIRCULO = claseBotonIcono({ tamano: "grande", relieve: "elevado" });
/** El botón de la tarjeta «Publicado» (compartir o completar): un `ui/Boton` secundario de 44, en su celda. */
export const BOTON_PUBLICADO = `${claseBoton({ variante: "secundario", alto: "control", ancho: "contenido" })} ${styles.publicadoBoton}`;

/**
 * La portada de una ficha como variable CSS (`--portada`): la barra compacta la enseña oscurecida detrás del título. Sin portada
 * no hay variable y la barra queda oscura, lisa.
 */
export function estiloPortada(portada: string | null | undefined): CSSProperties {
  return { "--portada": portada ? `url(${JSON.stringify(portada)})` : undefined } as CSSProperties;
}

/**
 * La plantilla de la ficha de un evento, un lugar o un artista (docs/rediseno/50, P6): una sola rejilla con la barra, el héroe,
 * los avisos, el cuerpo y las acciones flotantes, en ese orden (`Ficha.module.css`). Aquí solo se pone la página y la portada que
 * la barra compacta toma de fondo; la barra (`BarraFicha`), el héroe (`Heroe`), el cuerpo y las acciones las arma cada ficha.
 */
export default function Ficha({ portada, children }: { portada: string | null; children: ReactNode }) {
  return (
    <main className={`${styles.ficha} ${styles.enPagina}`} style={estiloPortada(portada)}>
      {children}
    </main>
  );
}
