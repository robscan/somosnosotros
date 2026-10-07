import { fechaCapo, porcentajeCapo, type MetricasCapo } from "@/lib/capo-metricas";
import styles from "./admin.module.css";
import capo from "./CapoComoVa.module.css";

/** Resultados independientes sobre la misma cohorte: no un embudo de conversiones atribuidas. */
export default function CapoComoVa({ metricas: m }: { metricas: MetricasCapo }) {
  if (m.invitados === 0) return <div className={styles.embudo}><p>Aún no hay invitaciones CAPO registradas.</p></div>;
  return (
    <div className={styles.embudo}>
      <p className={styles.notaEmbudo}>Desde el {fechaCapo(m.primer_envio!)} · datos al {fechaCapo(m.corte)}</p>
      <dl className={capo.cifras}>
        <div><dt>Fichas invitadas</dt><dd>{m.invitados}</dd></div>
        <div><dt>Sin cuenta vinculada al invitarlas</dt><dd>{m.elegibles}</dd></div>
      </dl>
      {m.elegibles > 0 ? (
        <>
          <p className={capo.base}>De esas {m.elegibles}, después de la invitación:</p>
          <dl className={capo.cifras}>
            <div><dt>Tienen una cuenta vinculada</dt><dd>{m.vinculados_despues}<small>{porcentajeCapo(m.vinculados_despues, m.elegibles)}</small></dd></div>
          </dl>
          <p className={styles.notaEmbudo}>Estos resultados no prueban que el correo haya sido la causa.</p>
        </>
      ) : <p className={styles.notaEmbudo}>Todas las fichas invitadas ya tenían una cuenta vinculada. No hay fichas nuevas que medir en esta tanda.</p>}
      <details className={capo.detalle}>
        <summary>Cómo se cuenta</summary>
        <p>Cada ficha cuenta una vez, desde su primera invitación. Invitada significa que se registró el envío; no confirma la entrega.</p>
        <p>{m.ya_vinculados_al_invitar} ya tenían una cuenta vinculada al recibir la invitación y quedan fuera de los porcentajes.</p>
        <p>Una cuenta se vincula a una ficha por varios caminos: la solicitud que aprueba la administración, el correo ligado, «Soy yo» al darse de alta o la propia administración. Tres de ellos vinculan directo, sin dejar una solicitud; por eso ya no se muestra «Solicitaron su ficha» como cifra aparte. Las solicitudes a mano siguen en Pendiente, y el desglose por camino de todas las fichas vive en el grupo «Fichas».</p>
        <p>{m.solicitaron_despues} de las {m.elegibles} fichas recibieron una solicitud a mano después de la invitación. Es un dato aparte, no una parte de los vínculos: atender una solicitud no significa aprobarla, y pedir retirar la ficha no cuenta como reclamarla.</p>
        <p>Solo se cuentan fichas y vínculos que siguen registrados, incluidas las fichas ocultas. Si se borran o se desvinculan, los números pueden bajar. Las invitaciones recientes han tenido menos tiempo para recibir respuesta.</p>
      </details>
    </div>
  );
}
