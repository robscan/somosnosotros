import SimboloCargando from "./SimboloCargando";
import plantilla from "@/components/ui/Plantilla.module.css";
import styles from "./Cargando.module.css";

/**
 * Espera de las pantallas raíz (Inicio, Agenda, Lugares, Artistas): la barra y la navegación (el armazón, en el
 * layout) se quedan en su sitio; en medio, el símbolo SN centrado con un pulso suave, no ya los renglones con forma
 * de lista (docs/rediseno/38-transiciones-cargador.md: el pedido del founder es reemplazar el letrero, no sumarle
 * esqueleto).
 */
export default function CargandoRaiz() {
  return (
    <main className={plantilla.raiz} aria-busy="true" aria-live="polite" aria-label="Cargando">
      <div className={styles.centro}>
        <SimboloCargando />
      </div>
    </main>
  );
}
