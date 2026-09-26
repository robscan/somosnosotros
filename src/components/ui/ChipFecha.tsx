"use client";

import { Suspense, useRef, useState } from "react";
import { fechaCortaChip, localAIso, ZONA_INICIAL } from "@/lib/fechas";
import type { DiasActivos } from "@/lib/calendario";
import chip from "./Chip.module.css";
import styles from "./ChipFecha.module.css";
import { IconoCalendario, IconoCerrar } from "./Iconos";
import SelectorFecha, { SelectorFechaCargando } from "./SelectorFecha";

type Props = {
  /** "" = sin elegir; si no, YYYY-MM-DD en `zona`. */
  fecha: string;
  onCambiar: (fecha: string) => void;
  /** Hoy, YYYY-MM-DD en `zona` (mínimo elegible; lo decide el servidor para que cliente y servidor coincidan). */
  hoy: string;
  zona?: string;
  /** Qué días tienen al menos un evento en la ciudad (OL-218): con ella, la hoja desactiva los días sin eventos.
   *  Un `Promise` (Agenda, diferida junto con la consulta pesada) muestra `SelectorFechaCargando` mientras
   *  resuelve; en Lugares llega ya resuelto (los eventos ya están cargados, sin `<Suspense>` que esperar). */
  diasActivos?: DiasActivos | Promise<DiasActivos>;
};

/**
 * El chip de fecha, un solo componente para Agenda y Lugares (docs/rediseno/45, OL-174). Sin fecha: solo el
 * ícono, sin la palabra "Seleccionar". Con fecha: "mié 30 sep" (sin "de", sin "Hoy"/"Mañana": ver
 * `fechaCortaChip`) y su quitar (✕), que regresa al ícono solo sin abrir la hoja. Tocar el resto de la pastilla
 * (el ícono y el texto) reabre la hoja con ese día ya marcado, para poder tocarlo otra vez y quitarlo (OL-218).
 *
 * Desde OL-218 (bitácora 247) la hoja propia (`ui/SelectorFecha`, OL-162) es la misma en cualquier pantalla, en
 * modo "filtro": ya no hay una rama nativa (`<input type="date">`) para táctil/móvil — ese selector no podía
 * desactivar un día suelto, y dio dos regresiones reales (OL-188, OL-204) antes de reemplazarlo. Ver
 * `docs/rediseno/prototipos/calendario-dias-con-eventos.html`, el prototipo que firmó el founder.
 */
export default function ChipFecha({ fecha, onCambiar, hoy, zona = ZONA_INICIAL, diasActivos }: Props) {
  const [hoja, setHoja] = useState(false);
  const disparador = useRef<HTMLButtonElement | null>(null);

  function abrir(e: React.MouseEvent<HTMLButtonElement>) {
    disparador.current = e.currentTarget;
    setHoja(true);
  }
  function cerrar() {
    setHoja(false);
    disparador.current?.focus();
  }

  if (fecha) {
    const iso = localAIso(`${fecha}T12:00`, zona) ?? new Date().toISOString();
    return (
      <span className={`${chip.chip} ${styles.conFecha}`}>
        <button type="button" className={styles.conFechaBoton} onClick={abrir}>
          <IconoCalendario width={16} height={16} />
          <span className={styles.soloLector}>Cambiar la fecha,</span>
          <span>{fechaCortaChip(iso, zona)}</span>
        </button>
        <button type="button" className={styles.quitar} aria-label="Quitar la fecha" onClick={() => onCambiar("")}>
          <IconoCerrar width={18} height={18} />
        </button>
        {hoja && <Hoja fecha={fecha} hoy={hoy} zona={zona} diasActivos={diasActivos} onCambiar={onCambiar} onCerrar={cerrar} />}
      </span>
    );
  }
  return (
    <>
      <button type="button" className={`${chip.chip} ${styles.soloIcono}`} aria-label="Elegir fecha" onClick={abrir}>
        <IconoCalendario width={16} height={16} />
      </button>
      {hoja && <Hoja fecha={fecha} hoy={hoy} zona={zona} diasActivos={diasActivos} onCambiar={onCambiar} onCerrar={cerrar} />}
    </>
  );
}

/** La hoja, con su propio `<Suspense>` (OL-218): con `diasActivos` diferido (Agenda), `SelectorFecha` entero
 *  suspende (`use()`) y esto pinta `SelectorFechaCargona` mientras tanto — mismo título y tamaño, sin saltos. */
function Hoja({ fecha, hoy, zona, diasActivos, onCambiar, onCerrar }: { fecha: string; hoy: string; zona: string; diasActivos: DiasActivos | Promise<DiasActivos> | undefined; onCambiar: (fecha: string) => void; onCerrar: () => void }) {
  // En modo "filtro" elegir (o quitar) un día ya cierra la hoja sola (SelectorFecha llama a `onListo`, aquí,
  // sin botón "Listo"): además de aplicar el filtro, hay que cerrarla — `onCerrar` no se dispara solo.
  function alListo(f: string) {
    onCambiar(f);
    onCerrar();
  }
  return (
    <Suspense fallback={<SelectorFechaCargando titulo="Selecciona una fecha" fecha={fecha} min={hoy} zona={zona} onCerrar={onCerrar} />}>
      <SelectorFecha titulo="Selecciona una fecha" fecha={fecha} min={hoy} zona={zona} modo="filtro" diasActivos={diasActivos} onListo={alListo} onCerrar={onCerrar} />
    </Suspense>
  );
}
