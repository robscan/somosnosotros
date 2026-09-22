"use client";

import { useState, useTransition } from "react";
import { cambiarCupo } from "../acciones";
import styles from "../obras.module.css";

const MIN = 1;
const MAX = 20;

/**
 * Cupo de mandos por obra (doc rediseno/34, prototipo firmado OL-088): un contador +/- de 1 a 20, igual al
 * prototipo. Guarda al soltar el botón (sin un "Guardar" aparte, como el resto de las acciones del panel).
 */
export default function CampoCupo({ id, cupo }: { id: string; cupo: number }) {
  const [valor, setValor] = useState(cupo);
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function cambiar(siguiente: number) {
    if (siguiente < MIN || siguiente > MAX) return;
    setValor(siguiente);
    setError(null);
    iniciar(async () => {
      const r = await cambiarCupo(id, siguiente);
      if (!r.ok) {
        setError(r.error);
        setValor(cupo); // el servidor manda: si falló, vuelve al valor que sí tiene guardado
      }
    });
  }

  return (
    <>
      <h2>Cupo</h2>
      <div className={styles.campoCupo}>
        <div>
          <label htmlFor="cupo">Mandos pintando a la vez</label>
          <small>Quien llega después se conecta y ve la pared, pero espera su turno.</small>
        </div>
        <div className={styles.contador}>
          <button type="button" aria-label="Bajar" disabled={pendiente || valor <= MIN} onClick={() => cambiar(valor - 1)}>
            −
          </button>
          <input id="cupo" type="text" inputMode="numeric" value={valor} readOnly />
          <button type="button" aria-label="Subir" disabled={pendiente || valor >= MAX} onClick={() => cambiar(valor + 1)}>
            +
          </button>
        </div>
      </div>
      <p className={styles.notaTope}>Hasta 20, para que la pared responda al instante.</p>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </>
  );
}
