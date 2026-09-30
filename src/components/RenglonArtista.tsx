import { etiquetaArtista, hrefArtista, textoProximaFecha, type ArtistaResumen, type Disciplina, type ProximaFecha } from "@/lib/artistas";
import BotonRenglon, { type EstadoBotonRenglon } from "./ui/BotonRenglon";
import { IconoCalendario, IconoEstrella, IconoMascara, IconoNota, IconoPincel, IconoPluma } from "./ui/Iconos";
import Renglon from "./ui/Renglon";

/** Icono de lo que hace: nota (música), máscara (teatro, danza, circo), pincel (artes visuales, cine), pluma (letras). */
export function IconoDisciplina({ disciplina }: { disciplina: Disciplina }) {
  const p = { width: 15, height: 15 };
  switch (disciplina) {
    case "musica":
      return <IconoNota {...p} />;
    case "teatro":
    case "danza":
    case "circo":
      return <IconoMascara {...p} />;
    case "artes_visuales":
    case "cine":
      return <IconoPincel {...p} />;
    case "letras":
      return <IconoPluma {...p} />;
    default:
      return <IconoEstrella {...p} />;
  }
}

type Props = {
  artista: Pick<ArtistaResumen, "id" | "slug" | "nombre" | "foto" | "disciplina" | "detalle" | "tipo"> & { proxima?: ProximaFecha | null };
  /** Con botón, "Seguir" o "Sigues" (OL-104, bitácora 139); sin él, el renglón es un enlace simple. */
  boton?: EstadoBotonRenglon;
};

/**
 * Renglón de artista (OL-057): foto redonda, nombre y, en los datos, qué hace y su próxima fecha. Uno solo para todas
 * las listas de artistas, como RenglonEvento para los eventos.
 */
export default function RenglonArtista({ artista: a, boton }: Props) {
  return (
    <Renglon href={hrefArtista(a)} foto={a.foto} redonda perezosa titulo={a.nombre} accion={boton && <BotonRenglon {...boton} />}>
      <span>
        <IconoDisciplina disciplina={a.disciplina} />
        <span>{etiquetaArtista(a)}</span>
      </span>
      {a.proxima && (
        <span>
          <IconoCalendario width={15} height={15} />
          <b>{textoProximaFecha(a.proxima)}</b>
        </span>
      )}
    </Renglon>
  );
}
