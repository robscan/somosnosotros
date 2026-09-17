import Link from "next/link";
import { etiquetaArtista, textoProximaFecha, type ArtistaResumen, type Disciplina, type ProximaFecha } from "@/lib/artistas";
import { SIN_FOTO } from "@/lib/imagen";
import Deslizable, { type AccionDeslizable } from "./ui/Deslizable";
import { IconoCalendario, IconoEstrella, IconoMascara, IconoNota, IconoOk, IconoPincel, IconoPluma } from "./ui/Iconos";
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
  artista: Pick<ArtistaResumen, "id" | "nombre" | "foto" | "disciplina" | "detalle" | "tipo"> & { proxima?: ProximaFecha | null };
  /** Quien mira lo sigue: se ve primero en los datos. */
  sigo?: boolean;
  /** Con acciones, el renglón se desliza para mostrarlas (Seguir). */
  acciones?: AccionDeslizable[];
};

/**
 * Renglón de artista (OL-057): foto redonda, nombre y, en los datos, si lo sigues, qué hace y su próxima fecha. Uno solo
 * para todas las listas de artistas, como RenglonEvento para los eventos.
 */
export default function RenglonArtista({ artista: a, sigo = false, acciones }: Props) {
  const contenido = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage */}
      <img src={a.foto ?? SIN_FOTO} alt="" className={`${styles.foto} ${styles.fotoRedonda}`} loading="lazy" decoding="async" />
      <span className={styles.titulo}>{a.nombre}</span>
      <span className={`${styles.meta} ${styles.metaColumna}`}>
        {sigo && (
          <span className={styles.estado}>
            <IconoOk width={14} height={14} />
            Sigues
          </span>
        )}
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
    </>
  );
  if (acciones?.length) {
    return (
      <Deslizable href={`/artistas/${a.id}`} className={styles.renglon} acciones={acciones}>
        {contenido}
      </Deslizable>
    );
  }
  return (
    <li>
      <Link href={`/artistas/${a.id}`} className={styles.renglon}>
        {contenido}
      </Link>
    </li>
  );
}
