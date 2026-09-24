"use client";

import { useId, useRef, useState } from "react";
import { fechaCortaChip, localAIso, ZONA_INICIAL } from "@/lib/fechas";
import { usePunteroFinoAncho } from "../usePunteroFinoAncho";
import chip from "./Chip.module.css";
import styles from "./ChipFecha.module.css";
import { IconoCalendario, IconoCerrar } from "./Iconos";
import SelectorFecha from "./SelectorFecha";

type Props = {
  /** "" = sin elegir; si no, YYYY-MM-DD en `zona`. */
  fecha: string;
  onCambiar: (fecha: string) => void;
  /** Hoy, YYYY-MM-DD en `zona` (mínimo elegible; lo decide el servidor para que cliente y servidor coincidan). */
  hoy: string;
  zona?: string;
};

/**
 * El chip de fecha, un solo componente para Agenda y Lugares (docs/rediseno/45, OL-174). Sin fecha: solo el
 * ícono, sin la palabra "Seleccionar". Con fecha: "mié 30 sep" (sin "de", sin "Hoy"/"Mañana": ver
 * `fechaCortaChip`) y su quitar (✕), que regresa al ícono solo — no reabre el selector. En escritorio con
 * puntero fino (`usePunteroFinoAncho`, OL-162) el ícono abre la hoja propia; en táctil, el `<input type="date">`
 * nativo va encima del chip, invisible, y el toque cae en él (Safari no abre su selector por código).
 */
export default function ChipFecha({ fecha, onCambiar, hoy, zona = ZONA_INICIAL }: Props) {
  const escritorio = usePunteroFinoAncho();
  const [hoja, setHoja] = useState(false);
  const disparador = useRef<HTMLButtonElement | null>(null);
  const idNativo = useId();

  if (fecha) {
    const iso = localAIso(`${fecha}T12:00`, zona) ?? new Date().toISOString();
    return (
      <span className={`${chip.chip} ${styles.conFecha}`}>
        <IconoCalendario width={16} height={16} />
        <span>{fechaCortaChip(iso, zona)}</span>
        <button type="button" className={styles.quitar} aria-label="Quitar la fecha" onClick={() => onCambiar("")}>
          <IconoCerrar width={18} height={18} />
        </button>
      </span>
    );
  }
  return (
    <>
      {escritorio ? (
        // Escritorio: el chip abre la hoja propia en vez del selector nativo (mismo aspecto, otro selector).
        <button
          type="button"
          className={`${chip.chip} ${styles.soloIcono}`}
          aria-label="Elegir fecha"
          onClick={(e) => {
            disparador.current = e.currentTarget;
            setHoja(true);
          }}
        >
          <IconoCalendario width={16} height={16} />
        </button>
      ) : (
        // Táctil/móvil: el chip ES el selector nativo, invisible encima, para que el toque caiga en él.
        <label className={`${chip.chip} ${chip.chipNativo} ${styles.soloIcono}`} htmlFor={idNativo}>
          <IconoCalendario width={16} height={16} />
          <input type="date" id={idNativo} className={chip.encima} min={hoy} value={hoy} onChange={(e) => onCambiar(e.target.value === hoy ? "" : e.target.value)} aria-label="Elegir fecha" />
        </label>
      )}
      {hoja && (
        <SelectorFecha
          titulo="Fecha"
          fecha={hoy}
          min={hoy}
          zona={zona}
          onListo={(f) => {
            onCambiar(f === hoy ? "" : f);
            setHoja(false);
            disparador.current?.focus();
          }}
          onCerrar={() => {
            setHoja(false);
            disparador.current?.focus();
          }}
        />
      )}
    </>
  );
}
