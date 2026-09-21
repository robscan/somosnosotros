"use client";

import { useState, useTransition } from "react";
import Hoja from "./ui/Hoja";
import { IconoCalendario, IconoEstrella, IconoPersona, IconoPin, IconoPincel } from "./ui/Iconos";
import styles from "./Borrar.module.css";

const ICONOS = { evento: IconoCalendario, lugar: IconoPin, artista: IconoEstrella, persona: IconoPersona, obra: IconoPincel };

type Props = { que: string; aviso: string; accion: () => Promise<void>; icono: keyof typeof ICONOS };

/**
 * "Borrar" en dos pasos: primero el enlace discreto, luego una hoja de confirmación con la misma composición que
 * el estado vacío de /borrado (pedido del founder, 2026-09-16): icono, qué se borra y qué se pierde, centrados,
 * y los dos botones de siempre (Sí, borrar en rojo; Cancelar discreto).
 */
export default function Borrar({ que, aviso, accion, icono }: Props) {
  const [confirmar, setConfirmar] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const Icono = ICONOS[icono];
  return (
    <>
      <button type="button" className={styles.enlace} onClick={() => setConfirmar(true)}>
        Borrar {que}
      </button>
      {confirmar && (
        <Hoja etiqueta={`Borrar ${que}`} onCerrar={() => setConfirmar(false)}>
          <div className={styles.confirmar}>
            <span className={styles.icono} aria-hidden="true">
              <Icono width={28} height={28} />
            </span>
            <h3>¿Borrar {que}?</h3>
            <p>{aviso} No se puede deshacer.</p>
            <button type="button" className={styles.peligro} disabled={pendiente} onClick={() => iniciar(() => accion())}>
              {pendiente ? "Borrando…" : `Sí, borrar ${que}`}
            </button>
            <button type="button" className={styles.enlace} onClick={() => setConfirmar(false)}>
              Cancelar
            </button>
          </div>
        </Hoja>
      )}
    </>
  );
}
