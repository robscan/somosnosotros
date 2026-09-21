import { IconoMas, IconoOk } from "./Iconos";
import styles from "./BotonRenglon.module.css";

export type EstadoBotonRenglon = {
  /** "Voy" o "Seguir": invita, tono sólido. "Vas" o "Sigues": ya decidido, tono callado; tocarlo lo quita. */
  etiqueta: string;
  decidido: boolean;
  /** Con qué evento, lugar o artista habla el botón, para quien usa lector de pantalla (el renglón puede tener más de uno en la lista). */
  nombreAccesible: string;
  alTocar: () => void;
};

/**
 * El botón de cada renglón (OL-104, bitácora 139): reemplaza el gesto de deslizar. Un solo botón, siempre a la vista, que
 * nunca abre la ficha (para eso está el resto del renglón) — por eso vive fuera del `<Link>`, como hermano suyo, en vez
 * de dentro (dos controles interactivos anidados confunden al lector de pantalla). Área de toque de 44 px como mínimo;
 * invita con el tono primario sólido y se calla (fondo suave) una vez decidido, la misma pastilla que antes era solo
 * texto en `Renglon.module.css`.
 */
export default function BotonRenglon({ etiqueta, decidido, nombreAccesible, alTocar }: EstadoBotonRenglon) {
  return (
    <button type="button" className={`${styles.boton} ${decidido ? styles.decidido : styles.invitar}`} aria-pressed={decidido} aria-label={nombreAccesible} onClick={(e) => { e.stopPropagation(); alTocar(); }}>
      {decidido ? <IconoOk width={18} height={18} /> : <IconoMas width={18} height={18} />}
      {etiqueta}
    </button>
  );
}
