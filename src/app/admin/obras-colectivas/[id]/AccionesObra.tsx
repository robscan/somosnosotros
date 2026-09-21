"use client";

import { useState, useTransition } from "react";
import Boton from "@/components/ui/Boton";
import { reabrirObra, terminarObra, type Resultado } from "../acciones";
import styles from "../obras.module.css";

type Accion = (id: string) => Promise<Resultado>;

/** Terminar o reabrir una obra (OL-088): un botón, sin formulario — el estado ya vino del servidor. */
export default function AccionesObra({ id, estado }: { id: string; estado: "abierta" | "cerrada" }) {
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function ejecutar(accion: Accion) {
    setError(null);
    iniciar(async () => {
      const r = await accion(id);
      if (!r.ok) setError(r.error);
    });
  }

  return (
    <div className={styles.acciones}>
      {estado === "abierta" ? (
        <Boton type="button" variante="secundario" disabled={pendiente} onClick={() => ejecutar(terminarObra)}>
          Terminar obra
        </Boton>
      ) : (
        <Boton type="button" variante="secundario" disabled={pendiente} onClick={() => ejecutar(reabrirObra)}>
          Reabrir obra
        </Boton>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
