import SimboloCargando from "./SimboloCargando";
import styles from "./Cargando.module.css";

/** Pantalla de espera instantánea: aparece al primer toque, antes de que el servidor responda. El símbolo SN
 *  centrado con un pulso suave (docs/rediseno/38-transiciones-cargador.md), en vez del letrero «Cargando…». */
export default function Cargando() {
  return (
    <main className={`pagina ${styles.centro}`} aria-busy="true" aria-live="polite" aria-label="Cargando">
      <SimboloCargando />
    </main>
  );
}
