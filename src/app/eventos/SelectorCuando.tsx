"use client";

import { combinarFechaHora, localAIso, sumarHoras, yaPaso, ZONA } from "@/lib/fechas";
import { ChipNativo } from "@/components/ui/Chip";
import styles from "./SelectorCuando.module.css";

type Props = {
  inicio: string; // "YYYY-MM-DDTHH:MM" en hora de la ciudad
  fin: string;
  onCambio: (inicio: string, fin: string) => void;
  errorInicio?: string;
  errorFin?: string;
};

function partir(local: string): { fecha: string; hora: string } {
  const [fecha = "", hora = ""] = local.split("T");
  return { fecha, hora: hora.slice(0, 5) };
}
function horasEntre(inicio: string, fin: string): number {
  const a = localAIso(inicio);
  const b = localAIso(fin);
  if (!a || !b) return 0;
  return Math.round(((new Date(b).getTime() - new Date(a).getTime()) / 3600000) * 4) / 4;
}
/** "14 sep 2026" */
function etiquetaFecha(fecha: string): string {
  const iso = localAIso(`${fecha}T12:00`);
  return iso ? new Intl.DateTimeFormat("es-MX", { timeZone: ZONA, day: "numeric", month: "short", year: "numeric" }).format(new Date(iso)).replace(/\./g, "") : "Fecha";
}
/** "9:00 p.m." */
function etiquetaHora(hora: string): string {
  if (!hora) return "Hora";
  const [h, m] = hora.split(":").map(Number);
  return new Intl.DateTimeFormat("es-MX", { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(2000, 0, 1, h, m));
}

/**
 * Cuándo, como en el calendario del teléfono (referencia del founder, 2026-09-14): dos renglones, Empieza y Termina,
 * cada uno con su fecha y su hora en píldoras que abren el selector nativo. Sin frase de confirmación: las píldoras ya lo dicen.
 */
export default function SelectorCuando({ inicio, fin, onCambio, errorInicio, errorFin }: Props) {
  const { fecha, hora } = partir(inicio);
  const finP = partir(fin);
  const duracion = fin ? horasEntre(inicio, fin) : 0;

  function fijarInicio(nuevaFecha: string, nuevaHora: string) {
    const nuevoInicio = combinarFechaHora(nuevaFecha, nuevaHora);
    // Al mover el inicio, el fin se mueve con él (misma duración).
    onCambio(nuevoInicio, nuevoInicio && duracion > 0 ? sumarHoras(nuevoInicio, duracion) : "");
  }
  function fijarFin(nuevaFecha: string, nuevaHora: string) {
    onCambio(inicio, nuevaHora ? combinarFechaHora(nuevaFecha || fecha, nuevaHora) : "");
  }

  return (
    <div className={styles.selector}>
      <div className={styles.fila}>
        <span className={styles.rotulo}>Empieza</span>
        <ChipNativo tipo="date" valor={fecha} activo={false} etiqueta={etiquetaFecha(fecha)} onCambio={(v) => v && fijarInicio(v, hora || "19:00")} ariaLabel="Fecha en que empieza" />
        <ChipNativo tipo="time" valor={hora} activo={false} etiqueta={etiquetaHora(hora)} onCambio={(v) => v && fijarInicio(fecha, v)} ariaLabel="Hora en que empieza" />
      </div>
      {errorInicio && (
        <p className={styles.error} role="alert">
          {errorInicio}
        </p>
      )}
      <div className={styles.fila}>
        <span className={styles.rotulo}>Termina</span>
        {fin && <ChipNativo tipo="date" valor={finP.fecha} activo={false} etiqueta={etiquetaFecha(finP.fecha)} onCambio={(v) => v && fijarFin(v, finP.hora)} ariaLabel="Fecha en que termina" />}
        <ChipNativo tipo="time" valor={finP.hora} activo={false} etiqueta={fin ? etiquetaHora(finP.hora) : "Sin hora de fin"} onCambio={(v) => fijarFin(finP.fecha, v)} ariaLabel="Hora en que termina" />
        {fin && (
          <button type="button" className={styles.quitar} onClick={() => onCambio(inicio, "")} aria-label="Quitar la hora de fin">
            ✕
          </button>
        )}
      </div>
      {errorFin && (
        <p className={styles.error} role="alert">
          {errorFin}
        </p>
      )}

      {inicio && yaPaso(inicio) && (
        <p className={styles.error} role="alert">
          Esa hora ya pasó.
        </p>
      )}
      <input type="hidden" name="inicio" value={inicio} />
      <input type="hidden" name="fin" value={fin} />
    </div>
  );
}
