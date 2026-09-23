"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Hoja from "./Hoja";
import { mesAnterior, mesSiguiente, pasoMasCercano, pasosHora, semanasDelMes, sumarDiasIso, type DiaCalendario } from "@/lib/calendario";
import { diaLocal, ZONA_INICIAL } from "@/lib/fechas";
import { IconoCaret } from "./Iconos";
import styles from "./SelectorFecha.module.css";

const DIAS_SEMANA = ["L", "M", "M", "J", "V", "S", "D"];

function tituloMes(anio: number, mes: number): string {
  const texto = new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", month: "long", year: "numeric" }).format(new Date(Date.UTC(anio, mes - 1, 1, 12)));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
/** "9:00 p.m." a partir de "HH:MM". */
function etiquetaHora(hora: string): string {
  const [h, m] = hora.split(":").map(Number);
  return new Intl.DateTimeFormat("es-MX", { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(2000, 0, 1, h, m));
}

type Props = {
  /** Título de la hoja: "Cuándo" con hora, "Fecha" solo calendario (Agenda). */
  titulo: string;
  /** YYYY-MM-DD elegido; "" si ninguno. */
  fecha: string;
  /** "HH:MM"; solo se usa (y se muestra la lista de horas) si `conHora`. */
  hora?: string;
  /** No se puede elegir un día antes de este límite (por defecto, hoy). */
  min?: string;
  zona?: string;
  /** false (por defecto, Agenda): solo el calendario. true (alta de evento): calendario + lista de horas. */
  conHora?: boolean;
  /** Hora sugerida por el sistema (para marcarla distinto si la persona no la tocó; OL-162 § "duración como hoy"). */
  sugerida?: string;
  /** Un día antes de hoy (o de `min`) se ve atenuado siempre; con esto en true (Agenda, como su min={hoy} nativo)
   *  además no se puede elegir. El alta de evento no restringía la fecha con el selector nativo (solo avisaba
   *  "Esa hora ya pasó" aparte): con false, el mismo día atenuado sigue eligible, para no cambiar esa regla. */
  bloquearPasado?: boolean;
  onListo: (fecha: string, hora?: string) => void;
  onCerrar: () => void;
};

/**
 * La hoja propia de fecha y hora para escritorio (OL-162, bitácora 197): calendario del mes (lunes a domingo,
 * hoy marcado, días pasados atenuados, flechas de mes) y, con `conHora`, una lista de horas en pasos de 15
 * minutos. Reemplaza al selector nativo solo en pantallas con puntero fino y anchas (`usePunteroFinoAncho`):
 * el nativo falla en la app instalada en un monitor externo (bitácora 195) y en táctil/móvil sigue funcionando
 * bien, así que ahí no se toca nada.
 */
export default function SelectorFecha({ titulo, fecha, hora, min, zona = ZONA_INICIAL, conHora = false, sugerida, bloquearPasado = true, onListo, onCerrar }: Props) {
  const hoy = diaLocal(new Date(), zona);
  const limite = min && min > hoy ? min : hoy;
  const base = fecha || limite;
  const [anio, setAnio] = useState(() => Number(base.slice(0, 4)));
  const [mes, setMes] = useState(() => Number(base.slice(5, 7)));
  const [elegido, setElegido] = useState(fecha);
  const [horaElegida, setHoraElegida] = useState(hora ?? "");
  const [foco, setFoco] = useState(fecha || limite);
  const gridRef = useRef<HTMLDivElement>(null);
  const horasRef = useRef<HTMLDivElement>(null);

  const semanas = semanasDelMes(anio, mes, hoy, min);
  const sugeridaPaso = sugerida ? pasoMasCercano(sugerida.slice(11, 16) || sugerida) : undefined;

  function irAMes(delta: 1 | -1) {
    const { anio: a, mes: m } = delta === 1 ? mesSiguiente(anio, mes) : mesAnterior(anio, mes);
    setAnio(a);
    setMes(m);
  }

  function elegirDia(d: DiaCalendario) {
    if (bloquearPasado && d.pasado) return;
    setElegido(d.fecha);
    setFoco(d.fecha);
  }

  function moverFoco(destino: string) {
    const [a, m] = destino.split("-").map(Number);
    if (a !== anio || m !== mes) {
      setAnio(a);
      setMes(m);
    }
    setFoco(destino);
  }

  function alTecladoDia(e: KeyboardEvent<HTMLButtonElement>, d: DiaCalendario) {
    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        moverFoco(sumarDiasIso(d.fecha, 1));
        return;
      case "ArrowLeft":
        e.preventDefault();
        moverFoco(sumarDiasIso(d.fecha, -1));
        return;
      case "ArrowDown":
        e.preventDefault();
        moverFoco(sumarDiasIso(d.fecha, 7));
        return;
      case "ArrowUp":
        e.preventDefault();
        moverFoco(sumarDiasIso(d.fecha, -7));
        return;
      case "Enter":
      case " ":
        e.preventDefault();
        elegirDia(d);
        return;
      default:
        return;
    }
  }

  // El foco de teclado sigue a `foco` (roving tabindex): cuando cambia (flechas, o al cambiar de mes) se lo
  // damos al botón del día, para que las flechas del teclado se sientan continuas entre meses.
  useEffect(() => {
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-fecha="${foco}"]`)?.focus();
  }, [foco, anio, mes]);

  // Al abrir con hora ya elegida (o sugerida), esa fila queda a la vista sin que la persona tenga que buscarla.
  useEffect(() => {
    const objetivo = horaElegida || sugeridaPaso;
    if (!objetivo) return;
    horasRef.current?.querySelector<HTMLButtonElement>(`[data-hora="${objetivo}"]`)?.scrollIntoView({ block: "center" });
    // Solo al abrir: no queremos que elegir una hora haga scroll de nuevo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const puedeConfirmar = !!elegido && (!conHora || !!horaElegida);

  return (
    <Hoja etiqueta={titulo} titulo={titulo} plano onCerrar={onCerrar}>
      <div className={styles.selector}>
        <div className={styles.cabeceraMes}>
          <button type="button" className={styles.flecha} onClick={() => irAMes(-1)} aria-label="Mes anterior">
            <IconoCaret width={18} height={18} className={styles.izquierda} />
          </button>
          <strong>{tituloMes(anio, mes)}</strong>
          <button type="button" className={styles.flecha} onClick={() => irAMes(1)} aria-label="Mes siguiente">
            <IconoCaret width={18} height={18} className={styles.derecha} />
          </button>
        </div>
        <div className={styles.diasSemana} aria-hidden="true">
          {DIAS_SEMANA.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className={styles.grid} role="grid" aria-label="Días del mes" ref={gridRef}>
          {semanas.map((semana, i) => (
            <div className={styles.semana} role="row" key={i}>
              {semana.map((d) => (
                <button
                  type="button"
                  role="gridcell"
                  key={d.fecha}
                  data-fecha={d.fecha}
                  className={[styles.dia, !d.delMes && styles.fuera, d.hoy && styles.hoy, d.fecha === elegido && styles.elegido, d.pasado && styles.pasado].filter(Boolean).join(" ")}
                  tabIndex={d.fecha === foco ? 0 : -1}
                  aria-current={d.hoy ? "date" : undefined}
                  aria-selected={d.fecha === elegido}
                  aria-disabled={(bloquearPasado && d.pasado) || undefined}
                  onClick={() => elegirDia(d)}
                  onKeyDown={(e) => alTecladoDia(e, d)}
                >
                  {Number(d.fecha.slice(8, 10))}
                </button>
              ))}
            </div>
          ))}
        </div>
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
        <button type="button" className={styles.listo} disabled={!puedeConfirmar} onClick={() => onListo(elegido, conHora ? horaElegida : undefined)}>
          Listo
        </button>
      </div>
    </Hoja>
  );
}
