"use client";

import { useEffect, useRef, useState } from "react";
import Boton from "./Boton";
import Calendario from "./Calendario";
import Hoja from "./Hoja";
import { pasoMasCercano, pasosHora } from "@/lib/calendario";
import { diaLocal, ZONA_INICIAL } from "@/lib/fechas";
import styles from "./SelectorFecha.module.css";

/** "9:00 p.m." a partir de "HH:MM". */
function etiquetaHora(hora: string): string {
  const [h, m] = hora.split(":").map(Number);
  return new Intl.DateTimeFormat("es-MX", { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(2000, 0, 1, h, m));
}

type Props = {
  /** Título de la hoja: "Selecciona la fecha del evento" (alta y edición de evento, con hora). */
  titulo: string;
  /** YYYY-MM-DD elegido; "" si ninguno. Al editar un evento ya pasado, este es el único día pasado que se sigue
   *  viendo elegible: lo demás pasado queda bloqueado. */
  fecha: string;
  /** "HH:MM"; solo se usa (y se muestra la lista de horas) si `conHora`. */
  hora?: string;
  /** No se puede elegir un día antes de este límite (por defecto, hoy). */
  min?: string;
  zona?: string;
  /** false: solo el calendario. true (alta de evento): calendario + lista de horas. */
  conHora?: boolean;
  /** Hora sugerida por el sistema (para marcarla distinto si la persona no la tocó; OL-162 § "duración como hoy"). */
  sugerida?: string;
  /** Texto de la duración ("2 horas", "Sin hora de fin"), tal cual se calcula hoy fuera de esta hoja (no cambia
   *  aquí); se muestra debajo de las horas, informativo, solo si se manda (la hoja de "Empieza"). */
  duracion?: string;
  /**
   * Tocar un día lo marca, sin cerrar la hoja; el botón "Listo" aplica lo marcado y cierra (corrección del founder en la
   * bitácora 247). La ✕ de la hoja (o Escape, o tocar fuera) cierra sin aplicar nada. La fecha es obligatoria: tocar el
   * mismo día ya marcado no hace nada (no se puede dejar sin fecha) y "Listo" se deshabilita hasta que haya un día marcado
   * (y, con `conHora`, también una hora). Un día pasado se bloquea, salvo el que ya traía `fecha` al abrir (para poder
   * seguir viendo y conservando la fecha de un evento ya pasado al editarlo, sin abrir la puerta a elegir OTRO día pasado).
   */
  onListo: (fecha: string, hora?: string) => void;
  onCerrar: () => void;
};

/**
 * La hoja propia de fecha y hora del alta y la edición de un evento (OL-162, bitácora 197; OL-218, bitácora 247): el
 * calendario del mes (`ui/Calendario`, que también usa la hoja Cuándo) y una lista de horas en pasos de 15 minutos.
 */
export default function SelectorFecha({ titulo, fecha, hora, min, zona = ZONA_INICIAL, conHora = false, sugerida, duracion, onListo, onCerrar }: Props) {
  const hoy = diaLocal(new Date(), zona);
  const [elegido, setElegido] = useState(fecha);
  const [horaElegida, setHoraElegida] = useState(hora ?? "");
  const horasRef = useRef<HTMLDivElement>(null);
  const sugeridaPaso = sugerida ? pasoMasCercano(sugerida.slice(11, 16) || sugerida) : undefined;

  // Tocar un día disponible lo marca; "Listo" aplica lo marcado y cierra (corrección del founder, bitácora 247: sin pausa ni
  // cierre automático al tocar). Tocar el mismo día ya marcado no hace nada: no se puede dejar sin fecha.
  function elegirDia(dia: string) {
    if (dia !== elegido) setElegido(dia);
  }

  // Al abrir con hora ya elegida (o sugerida), esa fila queda a la vista sin que la persona tenga que buscarla.
  useEffect(() => {
    const objetivo = horaElegida || sugeridaPaso;
    if (!objetivo) return;
    horasRef.current?.querySelector<HTMLButtonElement>(`[data-hora="${objetivo}"]`)?.scrollIntoView({ block: "center" });
    // Solo al abrir: no queremos que elegir una hora haga scroll de nuevo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // La fecha es obligatoria (y, con hora, también la hora).
  const puedeConfirmar = !!elegido && (!conHora || !!horaElegida);

  return (
    <Hoja etiqueta={titulo} titulo={titulo} plano onCerrar={onCerrar}>
      <div className={styles.selector}>
        <Calendario hoy={hoy} min={min} zona={zona} desde={elegido} hasta={elegido} pasadoPermitido={fecha} permiteQuitar={false} onElegir={elegirDia} />
        {conHora && (
          <div className={styles.horas} role="listbox" aria-label="Hora" ref={horasRef}>
            {pasosHora(15).map((h) => (
              <button
                type="button"
                role="option"
                key={h}
                data-hora={h}
                aria-selected={h === horaElegida}
                className={[styles.hora, h === horaElegida && styles.horaElegida, !horaElegida && h === sugeridaPaso && styles.horaSugerida].filter(Boolean).join(" ")}
                onClick={() => setHoraElegida(h)}
              >
                {etiquetaHora(h)}
              </button>
            ))}
          </div>
        )}
        {conHora && duracion && (
          <div className={styles.duracion}>
            <span>Duración</span>
            <b>{duracion}</b>
          </div>
        )}
        <Boton type="button" className={styles.listo} disabled={!puedeConfirmar} onClick={() => onListo(elegido, conHora ? horaElegida : undefined)}>
          Listo
        </Boton>
      </div>
    </Hoja>
  );
}
