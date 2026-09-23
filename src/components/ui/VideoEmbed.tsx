import type { VideoEmbed as VideoEmbedType } from "@/lib/video";
import styles from "./VideoEmbed.module.css";

const ETIQUETA_PROVEEDOR = { youtube: "YouTube", vimeo: "Vimeo" } as const;

/**
 * El video de YouTube o Vimeo que ya guardó el artista como red, embebido sin salir del sitio (OL-154, doc 40d).
 * El `src` viene ya armado y validado por `videoEmbedDe` (nunca la URL cruda); el sandbox y el `allow` son los
 * mínimos para que el reproductor funcione: sin acceso al almacenamiento del sitio, sin abrir ventanas.
 */
export default function VideoEmbed({ video, titulo }: { video: VideoEmbedType; titulo: string }) {
  return (
    <div className={styles.marco}>
      <iframe
        src={video.src}
        title={`Video de ${titulo} en ${ETIQUETA_PROVEEDOR[video.proveedor]}`}
        className={styles.iframe}
        loading="lazy"
        sandbox="allow-scripts allow-same-origin allow-presentation"
        allow="encrypted-media; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
