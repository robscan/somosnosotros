"use client";

import { useEffect, useRef } from "react";
import { Chip } from "./Chip";
import Hoja from "./Hoja";
import hoja from "./Hoja.module.css";
import { etiquetaHora, horasDeFin, pasoMasCercano, pasosHora } from "@/lib/calendario";
import styles from "./SelectorHora.module.css";

type Props = {
  /** Título de la hoja: «Empieza» o «Termina (empieza 7:00 p.m.)». */
  titulo: string;
  /** "HH:MM" ya elegida; "" si ninguna (o, al terminar, si el evento no tiene hora de fin). */
  hora: string;
  /** Hora sugerida por el sistema (para marcarla distinto si la persona no la tocó; OL-162 § «duración como hoy»). */
  sugerida?: string;
  /** Solo se ofrecen las horas posteriores a esta ("HH:MM"): la hora de fin de un evento que empieza y termina el mismo día. */
  despuesDe?: string;
  /** La hora de inicio ("HH:MM") de un evento de un solo día: se ofrecen las 24 horas, primero las posteriores a ella y después, con
   *  «día siguiente» en letra suave, las que ya no lo son (la madrugada: «empieza 10:00 p.m., termina 1:00 a.m.»). Sin ella, esta
   *  prop no hace nada; con `despuesDe`, manda `despuesDe`. */
  diaSiguienteDe?: string;
  /** Ofrece «Sin hora de fin» (la hoja de «Termina»); elegirla da "". */
  sinHoraDeFin?: boolean;
  /** Texto de la duración («2 horas», «Sin hora de fin»), tal cual se calcula fuera de esta hoja; informativo, debajo de las
   *  horas (la hoja de «Empieza»: mover el inicio mueve el fin con la misma duración). */
  duracion?: string;
  /** Elegir una hora la aplica y la persona sale: la hoja no lleva «Listo». `""` es «Sin hora de fin». */
  onElegir: (hora: string) => void;
  onCerrar: () => void;
};

/**
 * La hoja de horas del alta y la edición de un evento (OL-298, bitácora 326): solo las horas, cada 15 minutos, en una
 * rejilla de tres columnas con las horas del día; el día va en su propia hoja (`ui/SelectorDia`). Elegir una hora cierra la
 * hoja, sin botón «Listo» (prototipo firmado `publicar-por-pasos.html`, bitácora 323). Al abrir, la hora elegida (o la
 * sugerida) queda a la vista sin que la persona tenga que buscarla.
 */
export default function SelectorHora({ titulo, hora, sugerida, despuesDe, diaSiguienteDe, sinHoraDeFin = false, duracion, onElegir, onCerrar }: Props) {
  const listaRef = useRef<HTMLDivElement>(null);
  const sugeridaPaso = sugerida ? pasoMasCercano(sugerida.slice(11, 16) || sugerida) : undefined;
  const todas = pasosHora(15);
  const posteriores = diaSiguienteDe && despuesDe === undefined ? todas.filter((h) => h > diaSiguienteDe) : todas;
  const siguientes = diaSiguienteDe && despuesDe === undefined ? todas.filter((h) => h <= diaSiguienteDe) : [];
  const horas = despuesDe === undefined ? [...posteriores, ...siguientes] : horasDeFin(despuesDe);

  // Al abrir con hora ya elegida (o sugerida), esa fila queda en el centro de la lista. Se mueve la lista misma, no la
  // página ni la hoja (scrollIntoView arrastraría también a sus ancestros).
  useEffect(() => {
    const lista = listaRef.current;
    const objetivo = hora || sugeridaPaso;
    const posicion = objetivo ? horas.indexOf(objetivo) : -1;
    const chip = posicion < 0 ? null : lista?.children[(sinHoraDeFin ? 1 : 0) + posicion];
    if (lista && chip instanceof HTMLElement) lista.scrollTop = chip.offsetTop - (lista.clientHeight - chip.offsetHeight) / 2;
    // Solo al abrir: elegir una hora cierra la hoja.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Hoja etiqueta={titulo} titulo={titulo} onCerrar={onCerrar}>
      <div className={styles.horas} role="group" aria-label="Hora" ref={listaRef}>
        {sinHoraDeFin && (
          <Chip className={styles.sinFin} activo={hora === ""} onClick={() => onElegir("")}>
            Sin hora de fin
          </Chip>
        )}
        {horas.map((h) => {
          const manana = siguientes.includes(h);
          return (
            <Chip key={h} className={[!hora && h === sugeridaPaso && styles.sugerida, manana && styles.siguiente].filter(Boolean).join(" ") || undefined} activo={h === hora} onClick={() => onElegir(h)}>
              {etiquetaHora(h)}
              {manana && (
                <>
                  {" "}
                  <small>día siguiente</small>
                </>
              )}
            </Chip>
          );
        })}
      </div>
      {horas.length === 0 && <p className={hoja.nota}>Ya no quedan horas ese día. Para terminar otro día, elige también el último en el calendario.</p>}
      {duracion && (
        <div className={styles.duracion}>
          <span>Duración</span>
          <b>{duracion}</b>
        </div>
      )}
    </Hoja>
  );
}
