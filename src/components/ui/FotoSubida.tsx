import styles from "./FotoSubida.module.css";

/** La clase de la espera, para una imagen que no pinta `FotoSubida` (las miniaturas del creador de cartel mientras se redibujan). */
export const claseSubiendo = styles.subiendo;
/** La misma espera para la imagen que lleva dentro un componente ajeno (el renglón de «Publicado»): va en su contenedor. */
export const claseSubiendoDentro = styles.subiendoDentro;

/**
 * La foto en su hueco (miniatura, portada, avatar) con la espera de subida (OL-353), una sola para toda la app: mientras se prepara y se sube
 * (`vista`, de `useSubidaDeFoto`), la foto que eligió la persona, atenuada y latiendo despacio, como ya latía el cartel del alta (OL-302); al
 * terminar, la imagen subida (`src`). Sin ninguna de las dos, nada. Una `<img>` sin envoltorio: el hueco lo maqueta quien la pone (`className`
 * o su regla `> img`). Sin texto: la espera es visual, y quien la pone marca su hueco con `aria-busy`.
 */
export default function FotoSubida({ src, vista, className, width, height }: { src: string | null | undefined; vista: string | null; className?: string; width?: number; height?: number }) {
  const actual = vista ?? src;
  if (!actual) return null;
  const clases = [className, vista && styles.subiendo].filter(Boolean).join(" ") || undefined;
  // eslint-disable-next-line @next/next/no-img-element -- la foto local del teléfono o la recién subida al Storage, sin optimizador
  return <img src={actual} alt="" className={clases} width={width} height={height} />;
}
