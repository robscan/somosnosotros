import BotonIcono from "./BotonIcono";
import { IconoCampanaMas, IconoOk, IconoPersonaMas } from "./Iconos";

/**
 * Qué hace el botón, y con eso su glifo: «Voy» a un evento es la palomita; «seguir» es que te avisen (la campana con
 * «+» en un lugar) o que veas a alguien (la persona con «+» en un artista). Ya decidido, la palomita en los tres.
 */
const GLIFO = { evento: IconoOk, lugar: IconoCampanaMas, artista: IconoPersonaMas } as const;

export type EstadoBotonRenglon = {
  objeto: keyof typeof GLIFO;
  decidido: boolean;
  /** Con qué evento, lugar o artista habla el botón, para quien usa lector de pantalla (el renglón puede tener más de
   * uno en la lista), y qué dice: «Voy» o «Ya vas», «Seguir» o «Sigues». Dice el estado, nunca la acción contraria:
   * con `aria-pressed` un «ya no vas» suena al revés (corrección del gestor, OL-104). */
  nombreAccesible: string;
  alTocar: () => void;
};

/**
 * El botón de cada renglón (OL-104, bitácora 139; rediseño OL-106, bitácora 141), solo icono — sin texto: el glifo invita y, decidido, se vuelve
 * una palomita blanca sobre verde (tocarlo lo quita, con el mismo Deshacer de siempre). Sobre el fondo hueso de una lista es el icono a secas de
 * 44 px (H-19, doc 50): sin círculo ni sombra, que pesaban lo mismo que la foto; decidido, solo el círculo verde. Las tarjetas de los carriles de
 * Inicio ya no lo llevan (OL-370 y OL-372: se decide y se sigue en la ficha), así que ya no hay botón sobre una foto.
 * El nombre completo va en el `aria-label`; el toast dice qué pasó, así que el icono no necesita decirlo con
 * palabras. Verde (`--ok`) y no el color de acción: el mismo violeta en el estado ya decidido invitaba a tocarlo otra
 * vez en vez de leerse como «esto ya quedó» (corrección del founder, 2026-09-21).
 *
 * Vive **fuera** del `<Link>` del renglón, como su hermano — nunca un control interactivo anidado dentro de otro, que confunde a quien usa
 * lector de pantalla — y su `onClick` hace `stopPropagation()`: tocarlo nunca abre la ficha.
 */
export default function BotonRenglon({ objeto, decidido, nombreAccesible, alTocar }: EstadoBotonRenglon) {
  const Glifo = decidido ? IconoOk : GLIFO[objeto];
  return (
    <BotonIcono
      tamano="control"
      relieve="plano"
      decidido={decidido}
      aria-label={nombreAccesible}
      onClick={(e) => {
        e.stopPropagation();
        alTocar();
      }}
    >
      <Glifo width={22} height={22} />
    </BotonIcono>
  );
}
