"use client";

import { useState, useTransition } from "react";
import { IconoDocumento } from "@/components/ui/Iconos";
import Palanca from "@/components/ui/Palanca";
import { cambiarFichasSemanal } from "./acciones";

/**
 * El renglón de «Completar fichas» en Administración › Corridas (OL-489; desde OL-494 vive ahí, arriba, y no en la portada): encendida, corre sola una vez por semana en cada ciudad abierta con su
 * tope; apagada, solo con el botón de cada ciudad. Usa la `Palanca` de toda la app y se guarda al tocar, como el interruptor de Pincel. La
 * segunda línea dice cómo le fue esta semana (la arma el servidor).
 */
export default function InterruptorFichas({ activa: inicial, lineas }: { activa: boolean; lineas: { encendida: string; apagada: string; semana: string } }) {
  const [activa, setActiva] = useState(inicial);
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function cambiar() {
    const siguiente = !activa;
    setError(null);
    iniciar(async () => {
      const r = await cambiarFichasSemanal(siguiente);
      if (r.ok) setActiva(siguiente);
      else setError(r.error);
    });
  }

  return (
    <>
      <IconoDocumento width={20} height={20} />
      <b>Completar fichas</b>
      <small>
        {activa ? lineas.encendida : lineas.apagada}
        <br />
        {lineas.semana}
        {error && (
          <>
            <br />
            <span role="alert">{error}</span>
          </>
        )}
      </small>
      <Palanca encendida={activa} aria-label="Completar fichas cada semana" onClick={cambiar} disabled={pendiente} aria-busy={pendiente} />
    </>
  );
}
