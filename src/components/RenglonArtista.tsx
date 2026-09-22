import Link from "next/link";
import { etiquetaArtista, hrefArtista, textoProximaFecha, type ArtistaResumen, type Disciplina, type ProximaFecha } from "@/lib/artistas";
import { SIN_FOTO } from "@/lib/imagen";
import BotonRenglon, { type EstadoBotonRenglon } from "./ui/BotonRenglon";
import { IconoCalendario, IconoEstrella, IconoMascara, IconoNota, IconoPincel, IconoPluma } from "./ui/Iconos";
import styles from "./Renglon.module.css";

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
    <li className={styles.renglon}>
      <Link href={hrefArtista(a)} className={styles.frente}>
        {/* eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage */}
        <img src={a.foto ?? SIN_FOTO} alt="" className={`${styles.foto} ${styles.fotoRedonda}`} loading="lazy" decoding="async" />
        <span className={styles.titulo}>{a.nombre}</span>
        <span className={`${styles.meta} ${styles.metaColumna}`}>
          <span>
            <IconoDisciplina disciplina={a.disciplina} />
            {etiquetaArtista(a)}
          </span>
          {a.proxima && (
            <span className={styles.envuelve}>
              <IconoCalendario width={15} height={15} />
              <b>{textoProximaFecha(a.proxima)}</b>
            </span>
          )}
        </span>
      </Link>
      {boton && <BotonRenglon {...boton} />}
    </li>
  );
}
