"use client";

import { useState, useTransition } from "react";
import { IconoPincel } from "@/components/ui/Iconos";
import Palanca from "@/components/ui/Palanca";
import renglon from "@/components/ui/Renglon.module.css";
import { formatearLargo } from "@/lib/fechas";
import { cambiarPincelActivo } from "./acciones";
import styles from "./obras.module.css";

/**
 * Interruptor «Pincel apagado» (OL-121, founder 2026-09-22): apagado, la pared y el mando dejan de pintar y el
 * canal en vivo no responde, sin desplegar nada. Usa la `Palanca` de toda la app. Se guarda al tocar, como el resto del panel.
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
      <div className={renglon.tarjeta}>
        <div className={renglon.ajuste}>
          <IconoPincel width={20} height={20} />
          <b>Pincel {activo ? "encendido" : "apagado"}</b>
          <small>
            {activo ? "La pared y el mando funcionan con normalidad." : "La pared y el mando no dejan pintar; nadie manda ni recibe trazos."}
            <br />
            {cambiadoPorNombre ? `Último cambio: ${cambiadoPorNombre}, ${formatearLargo(cambiadoEn, new Date())}` : "Sin cambios todavía: sigue como se instaló."}
          </small>
          <Palanca encendida={activo} aria-label="Pincel encendido" onClick={cambiar} disabled={pendiente} />
        </div>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </>
  );
}
