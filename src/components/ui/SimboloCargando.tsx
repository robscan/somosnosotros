import { CAJA_SN, TRAZO_SN } from "@/lib/simboloSN";
import styles from "./SimboloCargando.module.css";

/**
 * El cargador de la app: el símbolo SN (el mismo del favicon y del icono de instalación,
 * `docs/diseno/logotipo/LogoFinal/SN - Symbol.svg`, línea gráfica firmada) centrado, con un pulso suave de
 * opacidad y escala en vez del letrero «Cargando…» (pedido del founder, L46; docs/rediseno/38-transiciones-cargador.md).
 * SVG inline (no una imagen aparte) para que no tenga su propio parpadeo de carga de red; `currentColor` toma la
 * tinta del texto. Con "reducir movimiento" se queda quieto en una opacidad fija (ver el CSS).
 */
export default function SimboloCargando() {
  return (
    <svg className={styles.simbolo} viewBox={`0 0 ${CAJA_SN.ancho} ${CAJA_SN.alto}`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Cargando">
      <path
        fill="currentColor"
        d={TRAZO_SN}
      />
    </svg>
  );
}
