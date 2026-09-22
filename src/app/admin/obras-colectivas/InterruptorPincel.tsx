"use client";

import { useState, useTransition } from "react";
import ajustes from "@/app/ajustes/ajustes.module.css";
import { formatearLargo } from "@/lib/fechas";
import { cambiarPincelActivo } from "./acciones";
import styles from "./obras.module.css";

/**
 * Interruptor «Pincel apagado» (OL-121, founder 2026-09-22): apagado, la pared y el mando dejan de pintar y el
 * canal en vivo no responde, sin desplegar nada. Reutiliza la palanca de Ajustes (`ajustes.palanca`, ya usada en
 * `ReservaPerfil`): mismo dibujo de interruptor en toda la app. Se guarda al tocar, como el resto del panel.
 */
export default function InterruptorPincel({
  activo: inicial,
  cambiadoPorNombre,
  cambiadoEn,
}: {
  activo: boolean;
  cambiadoPorNombre: string | null;
  cambiadoEn: string;
}) {
  const [activo, setActivo] = useState(inicial);
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function cambiar() {
    const siguiente = !activo;
    setError(null);
    iniciar(async () => {
      const r = await cambiarPincelActivo(siguiente);
      if (r.ok) setActivo(siguiente);
      else setError(r.error);
    });
  }

  return (
    <>
      <div className={styles.interruptorPincel}>
        <div>
          <b>Pincel {activo ? "encendido" : "apagado"}</b>
          <small>{activo ? "La pared y el mando funcionan con normalidad." : "La pared y el mando no dejan pintar; nadie manda ni recibe trazos."}</small>
          <small>
            {cambiadoPorNombre ? `Último cambio: ${cambiadoPorNombre}, ${formatearLargo(cambiadoEn, new Date())}` : "Sin cambios todavía: sigue como se instaló."}
          </small>
        </div>
        <button type="button" role="switch" aria-checked={activo} aria-label="Pincel encendido" className={ajustes.palanca} onClick={cambiar} disabled={pendiente} />
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </>
  );
}
