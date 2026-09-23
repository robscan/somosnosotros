import NavInferior from "@/components/NavInferior";
import Barra from "./Barra";
import SimboloCargando from "./SimboloCargando";
import styles from "./Cargando.module.css";

/**
 * Espera de las pantallas raíz (Agenda, Lugares, Artistas): la barra y la navegación se quedan en su sitio
 * (eso no cambia); en medio, el símbolo SN centrado con un pulso suave, no ya los renglones con forma de lista
 * (docs/rediseno/38-transiciones-cargador.md: el pedido del founder es reemplazar el letrero, no sumarle esqueleto).
 */
export default function CargandoRaiz() {
  return (
    <main className="raiz" aria-busy="true" aria-live="polite" aria-label="Cargando">
      <Barra />
      <div className={styles.centro}>
        <SimboloCargando />
      </div>
      <NavInferior />
    </main>
  );
}
