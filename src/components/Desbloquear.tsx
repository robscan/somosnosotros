"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { desbloquear } from "@/app/personas/acciones";
import styles from "./Desbloquear.module.css";

/**
 * Botón "Desbloquear": se guarda al tocar, sin hoja (deshacer un bloqueo no necesita confirmación). Se usa en la
 * ficha de la persona bloqueada («Bloqueaste a esta persona») y en Ajustes → Personas bloqueadas (OL-203).
 */
export default function Desbloquear({ personaId }: { personaId: string }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function tocar() {
    setError(null);
    iniciar(async () => {
      const r = await desbloquear(personaId);
      if (r.ok) router.refresh();
      else setError(r.error);
    });
  }

  return (
    <span>
      <button type="button" className={styles.boton} disabled={pendiente} onClick={tocar}>
        {pendiente ? "Desbloqueando…" : "Desbloquear"}
      </button>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </span>
  );
}
