"use client";

import { useState, useTransition } from "react";
import { IconoCorreo } from "@/components/ui/Iconos";
import { verCorreo } from "../../acciones";
import styles from "../../admin.module.css";

/** El correo, oculto hasta tocar "Ver" (D2); a la vista, "Copiar". Si el teléfono no deja copiar, se puede seleccionar. */
export default function CorreoPersona({ perfilId, oculto }: { perfilId: string; oculto: string }) {
  const [correo, setCorreo] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enCamino, iniciar] = useTransition();

  function ver() {
    setError(null);
    iniciar(async () => {
      const r = await verCorreo(perfilId);
      if (r.ok) setCorreo(r.correo);
      else setError(r.error);
    });
  }
  async function copiar() {
    if (!correo) return;
    try {
      await navigator.clipboard.writeText(correo);
      setCopiado(true);
    } catch {
      setError("No se pudo copiar: mantén el dedo sobre el correo para seleccionarlo.");
    }
  }

  return (
    <li className={styles.dato}>
      <IconoCorreo width={20} height={20} />
      <small>Correo</small>
      <b>{correo ?? oculto}</b>
      {correo ? (
        <button type="button" className={styles.pildora} onClick={copiar}>
          {copiado ? "Copiado" : "Copiar"}
        </button>
      ) : (
        <button type="button" className={styles.pildora} disabled={enCamino} onClick={ver}>
          {enCamino ? "Viendo…" : "Ver"}
        </button>
      )}
      {error && <span role="alert">{error}</span>}
    </li>
  );
}
