import { urlMapaFicha, urlMapaSedes, ANCHO_MAPA_FICHA, ALTO_MAPA_FICHA } from "@/lib/mapaEstatico";
import styles from "./MapaFicha.module.css";

type Punto = { lat: number; lng: number };

type Props = {
  punto: Punto | null;
  /** Varios puntos (las sedes de un festival, OL-339): un pin por cada uno, encuadrados todos; manda sobre `punto`. */
  puntos?: readonly Punto[];
  /** El mismo destino que «Cómo llegar»: tocar el mapa hace lo mismo. Con varios puntos no hay un destino y el mapa solo se mira. */
  href: string | null;
  /** El nombre del sitio, para el aria-label. */
  alt: string;
};

/**
 * Mapa pequeño de referencia (imagen estática de Mapbox, sin Mapbox GL ni JS: la sirve el caché del navegador), en la tarjeta
 * «Dónde» de una ficha, junto a la dirección y a «Cómo llegar» (OL-089). Sin punto — sitio reservado sin revelar, u otro sitio sin
 * coordenadas — no hay mapa, y tampoco un hueco vacío. La caja mide la proporción de la imagen (`lib/mapaEstatico`). Con varios puntos (las
 * sedes de un festival) la misma imagen lleva todos los pines y no es un enlace: cada sede lleva a lo suyo desde su renglón.
 */
export default function MapaFicha({ punto, puntos, href, alt }: Props) {
  const varios = !!puntos && puntos.length > 1;
  const url = varios ? urlMapaSedes(puntos) : urlMapaFicha(punto);
  if (!url || (!href && !varios)) return null;
  const imagen = (
    // eslint-disable-next-line @next/next/no-img-element -- URL externa de Mapbox
    <img src={url} alt="" loading="lazy" width={ANCHO_MAPA_FICHA} height={ALTO_MAPA_FICHA} />
  );
  const proporcion = { aspectRatio: `${ANCHO_MAPA_FICHA} / ${ALTO_MAPA_FICHA}` };
  if (!href)
    return (
      <div className={styles.mapa} style={proporcion} role="img" aria-label={`Mapa de ${alt}`}>
        {imagen}
      </div>
    );
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={styles.mapa} style={proporcion} aria-label={`Mapa de ${alt}`}>
      {imagen}
    </a>
  );
}
