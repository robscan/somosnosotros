import type { Incrustado as IncrustadoType } from "@/lib/incrustado";
import { ETIQUETA_PROVEEDOR_NOVEDAD_ARTISTA, type ProveedorNovedadArtista } from "@/lib/novedadesArtista";
import styles from "./Incrustado.module.css";

const PROVEEDORES_DE_VIDEO = new Set<ProveedorNovedadArtista>(["youtube", "vimeo"]);

/**
 * El reproductor de una novedad de artista (doc 44 §2/§3, OL-181): recibe el resultado ya armado y validado de
 * `incrustadoDeNovedad` (nunca la fila cruda) y solo pinta el `<iframe>`, con el `sandbox`/`allow`/alto que le dan.
 * Los proveedores 16:9 (YouTube, Vimeo) comparten el mismo marco que `ui/VideoEmbed` (que sigue aparte, sin
 * tocarse: lo usa "Video" de Redes, OL-154); los de audio (SoundCloud, Mixcloud, Bandcamp) usan un alto fijo por
 * proveedor, sin salto al cargar.
 */
export default function Incrustado({ incrustado, proveedor, nombre }: { incrustado: IncrustadoType; proveedor: ProveedorNovedadArtista; nombre: string }) {
  const esVideo = PROVEEDORES_DE_VIDEO.has(proveedor);
  const titulo = `${esVideo ? "Video" : "Audio"} de ${nombre} en ${ETIQUETA_PROVEEDOR_NOVEDAD_ARTISTA[proveedor]}`;
  return (
    <div className={incrustado.alto === "16:9" ? styles.marco16x9 : styles.marcoFijo} style={incrustado.alto === "16:9" ? undefined : { height: incrustado.alto }}>
      <iframe
        src={incrustado.src}
        title={titulo}
        className={styles.iframe}
        loading="lazy"
        sandbox={incrustado.sandbox}
        allow={incrustado.allow}
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
