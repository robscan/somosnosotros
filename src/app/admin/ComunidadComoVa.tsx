import Link from "next/link";
import { embudoComunidad, type Comunidad } from "@/lib/panel";
import styles from "./admin.module.css";

/**
 * "Cómo va la comunidad" (OL-060, doc 21 opción A, firmada por el founder): el embudo de alta, entre "Últimos 7
 * días" y "Gestionar". Sin nada que tocar — a diferencia de Indicadores, no hay un desglose que abrir.
 */
export default function ComunidadComoVa({ comunidad }: { comunidad: Comunidad }) {
  const e = embudoComunidad(comunidad);
  return (
    <div className={styles.embudo}>
      <Paso nombre="Se registraron" valor={e.registradas} porcentaje={null} ancho={100} />
      <Paso nombre="Hicieron algo en su primera semana" valor={e.hicieronAlgo.valor} porcentaje={e.hicieronAlgo.porcentaje} ancho={e.hicieronAlgo.porcentaje} />
      {e.vuelven.porcentaje === null ? (
        <div className={`${styles.pasoEmbudo} ${styles.flojo}`}>
          <span>Siguen volviendo después</span>
          <b>—</b>
        </div>
      ) : (
        <Paso nombre="Siguen volviendo después" valor={e.vuelven.valor} porcentaje={e.vuelven.porcentaje} ancho={e.vuelven.porcentaje} />
      )}
      <p className={styles.notaEmbudo}>
        {e.vuelven.porcentaje === null
          ? "Muy pocos días de historia todavía para decir esto: vuelve cuando haya pasado, al menos, una semana desde el registro más viejo."
          : "El último dato de «siguen volviendo» recién empezó a guardarse: con pocos días de historia, cuenta menos de lo que en realidad vuelve."}
      </p>
      <Link href="/admin/personas" className={styles.enlace}>
        Ver las personas ›
      </Link>
    </div>
  );
}

function Paso({ nombre, valor, porcentaje, ancho }: { nombre: string; valor: number; porcentaje: number | null; ancho: number }) {
  return (
    <>
      <div className={styles.pasoEmbudo}>
        <span>{nombre}</span>
        <b>
          {valor}
          {porcentaje !== null && <small> {porcentaje}%</small>}
        </b>
      </div>
      <div className={styles.barraEmbudo}>
        <i style={{ width: `${ancho}%` }} />
      </div>
    </>
  );
}
