import { urlMapaFicha, ANCHO_MAPA_FICHA, ALTO_MAPA_FICHA } from "@/lib/mapaEstatico";
import styles from "./MapaFicha.module.css";

type Props = {
  punto: { lat: number; lng: number } | null;
  /** El mismo destino que «Cómo llegar»: tocar el mapa hace lo mismo. */
  href: string | null;
  /** El nombre del sitio, para el aria-label. */
  alt: string;
};

/**
 * Mapa pequeño de referencia (imagen estática de Mapbox, sin Mapbox GL ni JS: la sirve el caché del navegador),
 * cerca de la dirección y de «Cómo llegar» (OL-089). Sin punto — sitio reservado sin revelar, u otro sitio sin
 * coordenadas — no hay mapa, y tampoco un hueco vacío.
 */
export default function MapaFicha({ punto, href, alt }: Props) {
  const url = urlMapaFicha(punto);
  if (!url || !href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={styles.mapa} aria-label={`Mapa de ${alt}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- URL externa de Mapbox */}
      <img src={url} alt="" loading="lazy" width={ANCHO_MAPA_FICHA} height={ALTO_MAPA_FICHA} />
    </a>
  );
}
