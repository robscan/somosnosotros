"use client";

import { combinarFechaHora, fraseCuando, localAIso, proximosDias, sumarHoras, yaPaso, ZONA } from "@/lib/fechas";
import { Chip, ChipNativo, Chips } from "@/components/ui/Chip";
import styles from "./SelectorCuando.module.css";

type Props = {
  inicio: string; // "YYYY-MM-DDTHH:MM" en hora de la ciudad
  fin: string;
  onCambio: (inicio: string, fin: string) => void;
  errorInicio?: string;
  errorFin?: string;
};

const HORAS = ["18:00", "19:00", "20:00"];
const DURACIONES = [
  { horas: 0, etiqueta: "Sin fin" },
  { horas: 2, etiqueta: "2 h" },
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

/** Cuándo, con un toque: pocos chips; "Otra fecha" / "Otra hora" son el selector nativo. La frase confirma en palabras. */
export default function SelectorCuando({ inicio, fin, onCambio, errorInicio, errorFin }: Props) {
  const dias = proximosDias(new Date(), 2); // Hoy, Mañana
  const { fecha, hora } = partir(inicio);
  const fechaEsOtra = !!fecha && !dias.some((d) => d.valor === fecha);
  const horaEsOtra = !!hora && !HORAS.includes(hora);
  const duracion = fin ? horasEntre(inicio, fin) : 0;
  const duracionEsOtra = !!fin && !DURACIONES.some((d) => d.horas === duracion);

  function fijar(nuevaFecha: string, nuevaHora: string) {
    const nuevoInicio = combinarFechaHora(nuevaFecha, nuevaHora);
    onCambio(nuevoInicio, nuevoInicio && duracion > 0 ? sumarHoras(nuevoInicio, duracion) : "");
  }
  function fijarDuracion(horas: number) {
    onCambio(inicio, horas > 0 && inicio ? sumarHoras(inicio, horas) : "");
  }

  return (
    <div className={styles.selector}>
      <Chips ariaLabel="Día">
        {dias.map((d) => (
          <Chip key={d.valor} activo={fecha === d.valor} onClick={() => fijar(d.valor, hora || "19:00")}>
            {d.etiqueta}
          </Chip>
        ))}
        <ChipNativo tipo="date" valor={fecha} activo={fechaEsOtra} etiqueta={fechaEsOtra ? etiquetaFecha(fecha) : "Otra fecha"} onCambio={(v) => v && fijar(v, hora || "19:00")} ariaLabel="Elegir otra fecha" />
      </Chips>

      <Chips ariaLabel="Hora">
        {HORAS.map((h) => (
          <Chip key={h} activo={hora === h} onClick={() => fijar(fecha || dias[0].valor, h)}>
            {h}
          </Chip>
        ))}
        <ChipNativo tipo="time" valor={hora} activo={horaEsOtra} etiqueta={horaEsOtra ? hora : "Otra hora"} onCambio={(v) => v && fijar(fecha || dias[0].valor, v)} ariaLabel="Elegir otra hora" />
      </Chips>
      {errorInicio && (
        <p className={styles.error} role="alert">
          {errorInicio}
        </p>
      )}

      <Chips ariaLabel="Termina" etiqueta="Termina">
        {DURACIONES.map((d) => (
          <Chip key={d.horas} activo={!duracionEsOtra && (d.horas === 0 ? !fin : duracion === d.horas)} onClick={() => fijarDuracion(d.horas)}>
            {d.etiqueta}
          </Chip>
        ))}
        <ChipNativo tipo="time" valor={partir(fin).hora} activo={duracionEsOtra} etiqueta={duracionEsOtra ? partir(fin).hora : "Otra hora"} onCambio={(v) => onCambio(inicio, v ? combinarFechaHora(partir(fin).fecha || fecha, v) : "")} ariaLabel="Elegir hora de fin" />
      </Chips>
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
