import { IconoMas, IconoOk } from "./Iconos";
import styles from "./BotonRenglon.module.css";

export type EstadoBotonRenglon = {
  decidido: boolean;
  /** Con qué evento, lugar o artista habla el botón, para quien usa lector de pantalla (el renglón puede tener más de
   * uno en la lista). Fijo por acción — no cambia con `decidido` — para no contradecir `aria-pressed`, que ya dice el
   * estado: un lector diciendo «ya no vas, botón conmutador, presionado» suena al revés (corrección del gestor, OL-104). */
  nombreAccesible: string;
  alTocar: () => void;
};

/**
 * El botón de cada renglón y de cada tarjeta de carril (OL-104, bitácora 139; rediseño OL-106, bitácora 141):
 * redondo, ~48 px (el token `--toque`, nunca por debajo del mínimo accionable de 44 px), solo icono — sin texto, "+"
 * invita y el check dice que ya está decidido (tocarlo lo quita, con el mismo Deshacer de siempre). El nombre
 * completo va en el `aria-label`, fijo; el toast dice qué pasó, así que el icono no necesita decirlo con palabras.
 * Decidido usa `--primario` sólido, el mismo color de los accionables principales de la app (no un verde nuevo:
 * corrección del founder, 2026-09-21); por defecto, blanco sin borde, con una sombra suave para leerse igual sobre
 * fotos claras y oscuras (las tarjetas de los carriles lo flotan sobre la imagen).
 *
 * Vive **fuera** del `<Link>` del renglón o de la tarjeta, como su hermano — nunca un control interactivo anidado
 * dentro de otro, que confunde a quien usa lector de pantalla — y su `onClick` hace `stopPropagation()`: tocarlo
 * nunca abre la ficha ni, en un carril, cuenta como el arrastre que `huboArrastre` mediría en el `<Link>`.
 */
export default function BotonRenglon({ decidido, nombreAccesible, alTocar }: EstadoBotonRenglon) {
  return (
    <button type="button" className={`${styles.boton} ${decidido ? styles.decidido : styles.invitar}`} aria-pressed={decidido} aria-label={nombreAccesible} onClick={(e) => { e.stopPropagation(); alTocar(); }}>
      {decidido ? <IconoOk width={22} height={22} /> : <IconoMas width={22} height={22} />}
    </button>
  );
}
