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
 * El botón de cada renglón y de cada tarjeta de carril (OL-104, bitácora 139; rediseño OL-106, bitácora 141):
 * un `BotonIcono` elevado de 48 px (nunca por debajo del mínimo accionable de 44), solo icono — sin texto: el glifo
 * invita y, decidido, se vuelve una palomita blanca sobre verde (tocarlo lo quita, con el mismo Deshacer de siempre).
 * El nombre completo va en el `aria-label`; el toast dice qué pasó, así que el icono no necesita decirlo con
 * palabras. Verde (`--ok`) y no el color de acción: el mismo violeta en el estado ya decidido invitaba a tocarlo otra
 * vez en vez de leerse como «esto ya quedó» (corrección del founder, 2026-09-21).
 *
 * Vive **fuera** del `<Link>` del renglón o de la tarjeta, como su hermano — nunca un control interactivo anidado
 * dentro de otro, que confunde a quien usa lector de pantalla — y su `onClick` hace `stopPropagation()`: tocarlo
 * nunca abre la ficha ni, en un carril, cuenta como el arrastre que `huboArrastre` mediría en el `<Link>`.
 */
export default function BotonRenglon({ objeto, decidido, nombreAccesible, alTocar }: EstadoBotonRenglon) {
  const Glifo = decidido ? IconoOk : GLIFO[objeto];
  return (
    <BotonIcono
      tamano="accion"
      relieve="elevado"
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
