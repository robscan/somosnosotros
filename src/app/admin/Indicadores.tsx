"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { trazoTendencia, type ClaveIndicador, type Indicador } from "@/lib/panel";
import styles from "./admin.module.css";

/**
 * Últimos 7 días (decisiones 4 y 5): cuatro indicadores en dos por dos. Tocar uno abre, debajo de su fila, qué cuenta
 * exactamente, el desglose y la lista que lo respalda; tocarlo otra vez (u otro) lo cierra. La nota y la lista son
 * hijos directos de la página.
 */
export default function Indicadores({ lista, nota }: { lista: Indicador[]; nota: string }) {
  const [abierto, setAbierto] = useState<ClaveIndicador | null>(null);
  const i = lista.findIndex((x) => x.clave === abierto);
  // El desglose va tras el segundo indicador de la fila tocada.
  const tras = i < 0 ? -1 : Math.min(i | 1, lista.length - 1);
  const elegido = i < 0 ? null : lista[i];
  return (
    <>
      <p className={styles.nota}>{nota}</p>
      <ul className={styles.indicadores}>
        {lista.map((x, k) => (
          <Fragment key={x.clave}>
            <li>
              <button type="button" className={styles.indicador} aria-expanded={abierto === x.clave} aria-controls={abierto === x.clave ? "desglose" : undefined} onClick={() => setAbierto(abierto === x.clave ? null : x.clave)}>
                <span className={styles.nombreIndicador}>{x.nombre}</span>
                <b>{x.valor}</b>
                {x.serie && <Tendencia serie={x.serie} />}
                <small>{x.base}</small>
                {x.cambio && <span className={styles.cambio}>{x.cambio}</span>}
              </button>
            </li>
            {k === tras && elegido && (
              <li className={styles.desglose} id="desglose">
                <p>{elegido.que}</p>
                <ul>{(elegido.partes.length ? elegido.partes : ["Aún nada esta semana"]).map((p) => <li key={p}>{p}</li>)}</ul>
                <Link href={elegido.enlace.href} className={styles.enlace}>
                  {elegido.enlace.texto} ›
                </Link>
              </li>
            )}
          </Fragment>
        ))}
      </ul>
    </>
  );
}

/** Doce semanas como máximo, de la más vieja a hoy: trazo gris y la de hoy en el color de acción. */
function Tendencia({ serie }: { serie: number[] }) {
  const { puntos, ultimo } = trazoTendencia(serie);
  return (
    <svg viewBox="0 0 88 28" aria-hidden="true">
      <polyline points={puntos} />
      <circle cx={ultimo.x} cy={ultimo.y} r={2.6} />
    </svg>
  );
}
