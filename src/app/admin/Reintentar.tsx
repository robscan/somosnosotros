"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import styles from "./admin.module.css";

/** Error con salida (A5): la causa en palabras y "Intentar de nuevo", que vuelve a pedir la pantalla al servidor. */
export default function Reintentar({ texto }: { texto: string }) {
  const router = useRouter();
  const [enCamino, iniciar] = useTransition();
  return (
    <p className={styles.error} role="alert">
      {texto}
      <button type="button" className={styles.enlace} disabled={enCamino} onClick={() => iniciar(() => router.refresh())}>
        {enCamino ? "Intentando…" : "Intentar de nuevo"}
      </button>
    </p>
  );
}
