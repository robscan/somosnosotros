"use client";

import { useRef } from "react";
import { combinarFechaHora, fraseCuando, localAIso, proximosDias, sumarHoras, yaPaso, ZONA } from "@/lib/fechas";
import styles from "./SelectorCuando.module.css";

type Props = {
  inicio: string; // "YYYY-MM-DDTHH:MM" en hora de la ciudad
  fin: string;
  onCambio: (inicio: string, fin: string) => void;
  errorInicio?: string;
  errorFin?: string;
};

const HORAS = ["17:00", "18:00", "19:00", "20:00", "21:00"];
const DURACIONES = [
  { horas: 0, etiqueta: "Sin fin" },
  { horas: 1, etiqueta: "1 h" },
  { horas: 2, etiqueta: "2 h" },
  { horas: 3, etiqueta: "3 h" },
];

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
function etiquetaFecha(fecha: string): string {
  const iso = localAIso(`${fecha}T12:00`);
  return iso ? new Intl.DateTimeFormat("es-MX", { timeZone: ZONA, weekday: "short", day: "numeric", month: "short" }).format(new Date(iso)).replace(/\./g, "") : "Otra fecha";
}

/** Abre el selector nativo del teléfono directamente (showPicker); si el navegador no lo tiene, enfoca el campo. */
function abrirSelector(input: HTMLInputElement | null) {
  if (!input) return;
  try {
    if (typeof input.showPicker === "function") input.showPicker();
    else input.focus();
  } catch {
    input.focus();
  }
}

/**
 * Cuándo, con un toque: día, hora y duración en chips. "Otra fecha" / "Otra hora" abren el selector
 * nativo al instante y el chip pasa a mostrar lo elegido. La frase de abajo confirma en palabras.
 */
export default function SelectorCuando({ inicio, fin, onCambio, errorInicio, errorFin }: Props) {
  const dias = proximosDias();
  const { fecha, hora } = partir(inicio);
  const fechaEsOtra = !!fecha && !dias.some((d) => d.valor === fecha);
  const horaEsOtra = !!hora && !HORAS.includes(hora);
  const duracion = fin ? horasEntre(inicio, fin) : 0;
  const duracionEsOtra = !!fin && !DURACIONES.some((d) => d.horas === duracion);
  const refFecha = useRef<HTMLInputElement>(null);
  const refHora = useRef<HTMLInputElement>(null);
  const refFin = useRef<HTMLInputElement>(null);

  /** Cambia día u hora conservando la duración. */
  function fijar(nuevaFecha: string, nuevaHora: string) {
    const nuevoInicio = combinarFechaHora(nuevaFecha, nuevaHora);
    onCambio(nuevoInicio, nuevoInicio && duracion > 0 ? sumarHoras(nuevoInicio, duracion) : "");
  }
  function fijarDuracion(horas: number) {
    onCambio(inicio, horas > 0 && inicio ? sumarHoras(inicio, horas) : "");
  }

  return (
    <div className={styles.selector}>
      <div className={styles.chips} role="group" aria-label="Día">
        {dias.map((d) => (
          <button key={d.valor} type="button" className={`${styles.chip} ${fecha === d.valor ? styles.activo : ""}`} onClick={() => fijar(d.valor, hora || "19:00")}>
            {d.etiqueta}
          </button>
        ))}
        <button type="button" className={`${styles.chip} ${fechaEsOtra ? styles.activo : ""}`} onClick={() => abrirSelector(refFecha.current)}>
          {fechaEsOtra ? etiquetaFecha(fecha) : "Otra fecha"}
        </button>
        <input ref={refFecha} type="date" className={styles.oculto} value={fecha} onChange={(e) => e.target.value && fijar(e.target.value, hora || "19:00")} tabIndex={-1} aria-label="Elegir otra fecha" />
      </div>

      <div className={styles.chips} role="group" aria-label="Hora">
        {HORAS.map((h) => (
          <button key={h} type="button" className={`${styles.chip} ${hora === h ? styles.activo : ""}`} onClick={() => fijar(fecha || dias[0].valor, h)}>
            {h}
          </button>
        ))}
        <button type="button" className={`${styles.chip} ${horaEsOtra ? styles.activo : ""}`} onClick={() => abrirSelector(refHora.current)}>
          {horaEsOtra ? hora : "Otra hora"}
        </button>
        <input ref={refHora} type="time" className={styles.oculto} value={hora} step={300} onChange={(e) => e.target.value && fijar(fecha || dias[0].valor, e.target.value)} tabIndex={-1} aria-label="Elegir otra hora" />
      </div>
      {errorInicio && (
        <p className={styles.error} role="alert">
          {errorInicio}
        </p>
      )}

      <div className={styles.chips} role="group" aria-label="Termina">
        <span className={styles.etiquetaChips}>Termina</span>
        {DURACIONES.map((d) => (
          <button key={d.horas} type="button" className={`${styles.chip} ${!duracionEsOtra && (d.horas === 0 ? !fin : duracion === d.horas) ? styles.activo : ""}`} onClick={() => fijarDuracion(d.horas)}>
            {d.etiqueta}
          </button>
        ))}
        <button type="button" className={`${styles.chip} ${duracionEsOtra ? styles.activo : ""}`} onClick={() => abrirSelector(refFin.current)}>
          {duracionEsOtra ? partir(fin).hora : "Otra hora"}
        </button>
        <input ref={refFin} type="time" className={styles.oculto} value={partir(fin).hora} step={300} onChange={(e) => onCambio(inicio, e.target.value ? combinarFechaHora(partir(fin).fecha || fecha, e.target.value) : "")} tabIndex={-1} aria-label="Elegir hora de fin" />
      </div>
      {errorFin && (
        <p className={styles.error} role="alert">
          {errorFin}
        </p>
      )}

      {inicio && (
        <p className={styles.frase} aria-live="polite">
          {fraseCuando(inicio, fin)}
          {yaPaso(inicio) && <span className={styles.pasado}> · Esa hora ya pasó.</span>}
        </p>
      )}
      <input type="hidden" name="inicio" value={inicio} />
      <input type="hidden" name="fin" value={fin} />
    </div>
  );
}
