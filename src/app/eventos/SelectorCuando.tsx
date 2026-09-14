"use client";

import { useEffect, useRef, useState } from "react";
import { combinarFechaHora, fraseCuando, localAIso, proximosDias, sumarHoras } from "@/lib/fechas";
import styles from "./SelectorCuando.module.css";

type Props = {
  /** "YYYY-MM-DDTHH:MM" en hora de la ciudad. */
  inicio: string;
  fin: string;
  onCambio: (inicio: string, fin: string) => void;
  errorInicio?: string;
  errorFin?: string;
};

const HORAS = ["10:00", "12:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"];
const DURACIONES = [
  { horas: 0, etiqueta: "Sin hora de fin" },
  { horas: 1, etiqueta: "1 h" },
  { horas: 2, etiqueta: "2 h" },
  { horas: 3, etiqueta: "3 h" },
];

function yaPaso(local: string): boolean {
  const iso = localAIso(local);
  return !!iso && new Date(iso).getTime() < Date.now() - 60000;
}

function partir(local: string): { fecha: string; hora: string } {
  const [fecha = "", hora = ""] = local.split("T");
  return { fecha, hora: hora.slice(0, 5) };
}

/**
 * Cuándo, con un toque: día (Hoy, Mañana, próximos días, otra fecha), hora (chips u otra),
 * y el fin como duración en vez de un segundo selector. La frase de abajo confirma en palabras.
 * Expone los campos ocultos `inicio` y `fin` que ya entiende el servidor.
 */
export default function SelectorCuando({ inicio, fin, onCambio, errorInicio, errorFin }: Props) {
  const dias = proximosDias();
  const { fecha, hora } = partir(inicio);
  const [otraFecha, setOtraFecha] = useState(() => !!fecha && !dias.some((d) => d.valor === fecha));
  const [otraHora, setOtraHora] = useState(() => !!hora && !HORAS.includes(hora));
  const duracion = inicio && fin ? Math.round(((new Date(`${fin}:00-06:00`).getTime() - new Date(`${inicio}:00-06:00`).getTime()) / 3600000) * 4) / 4 : 0;
  const [otraDuracion, setOtraDuracion] = useState(() => !!fin && !DURACIONES.some((d) => d.horas === duracion));

  function fijar(nuevaFecha: string, nuevaHora: string, horasFin: number | null) {
    const nuevoInicio = combinarFechaHora(nuevaFecha, nuevaHora);
    let nuevoFin = "";
    if (horasFin === null) nuevoFin = fin && nuevoInicio ? recalcularFin(nuevoInicio) : "";
    else if (horasFin > 0 && nuevoInicio) nuevoFin = sumarHoras(nuevoInicio, horasFin);
    onCambio(nuevoInicio, nuevoFin);
  }
  /** Al cambiar día u hora, el fin conserva su duración. */
  function recalcularFin(nuevoInicio: string): string {
    return duracion > 0 ? sumarHoras(nuevoInicio, duracion) : "";
  }

  // El chip elegido siempre a la vista (las filas se desplazan de lado).
  const raiz = useRef<HTMLDivElement>(null);
  useEffect(() => {
    raiz.current?.querySelectorAll<HTMLElement>(`.${styles.activo}`).forEach((el) => el.scrollIntoView({ inline: "center", block: "nearest" }));
  }, [inicio, fin]);

  return (
    <div className={styles.selector} ref={raiz}>
      <p className={styles.etiqueta}>Cuándo</p>
      <div className={styles.chips} role="group" aria-label="Día">
        {dias.map((d) => (
          <button key={d.valor} type="button" className={`${styles.chip} ${!otraFecha && fecha === d.valor ? styles.activo : ""}`} onClick={() => { setOtraFecha(false); fijar(d.valor, hora || "19:00", null); }}>
            {d.etiqueta}
          </button>
        ))}
        <button type="button" className={`${styles.chip} ${otraFecha ? styles.activo : ""}`} onClick={() => setOtraFecha(true)}>
          Otra fecha
        </button>
      </div>
      {otraFecha && <input type="date" className={styles.control} value={fecha} onChange={(e) => fijar(e.target.value, hora || "19:00", null)} aria-label="Fecha" />}

      <div className={styles.chips} role="group" aria-label="Hora">
        {HORAS.map((h) => (
          <button key={h} type="button" className={`${styles.chip} ${!otraHora && hora === h ? styles.activo : ""}`} onClick={() => { setOtraHora(false); fijar(fecha || dias[0].valor, h, null); }}>
            {h}
          </button>
        ))}
        <button type="button" className={`${styles.chip} ${otraHora ? styles.activo : ""}`} onClick={() => setOtraHora(true)}>
          Otra hora
        </button>
      </div>
      {otraHora && <input type="time" className={styles.control} value={hora} step={300} onChange={(e) => fijar(fecha || dias[0].valor, e.target.value, null)} aria-label="Hora" />}
      {errorInicio && (
        <p className={styles.error} role="alert">
          {errorInicio}
        </p>
      )}

      <p className={styles.etiquetaChica}>Termina</p>
      <div className={styles.chips} role="group" aria-label="Duración">
        {DURACIONES.map((d) => (
          <button key={d.horas} type="button" className={`${styles.chip} ${!otraDuracion && (d.horas === 0 ? !fin : duracion === d.horas) ? styles.activo : ""}`} onClick={() => { setOtraDuracion(false); fijar(fecha, hora, d.horas); }}>
            {d.etiqueta}
          </button>
        ))}
        <button type="button" className={`${styles.chip} ${otraDuracion ? styles.activo : ""}`} onClick={() => setOtraDuracion(true)}>
          Otra hora de fin
        </button>
      </div>
      {otraDuracion && (
        <input type="time" className={styles.control} value={partir(fin).hora} step={300} onChange={(e) => onCambio(inicio, e.target.value ? combinarFechaHora(partir(fin).fecha || fecha, e.target.value) : "")} aria-label="Hora de fin" />
      )}
      {errorFin && (
        <p className={styles.error} role="alert">
          {errorFin}
        </p>
      )}

      {inicio && (
        <p className={styles.frase} aria-live="polite">
          {fraseCuando(inicio, fin)}
          {yaPaso(inicio) && <span className={styles.nota}> · Esa hora ya pasó. ¿Es correcto?</span>}
        </p>
      )}
      <input type="hidden" name="inicio" value={inicio} />
      <input type="hidden" name="fin" value={fin} />
    </div>
  );
}
