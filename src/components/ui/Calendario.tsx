"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { etiquetaDia, hayMesAnterior, haySiguienteMes, mesAnterior, mesInicial, mesSiguiente, semanasDelMes, sumarDiasIso, type DiaCalendario, type DiasActivos } from "@/lib/calendario";
import { diaLargo } from "@/lib/fechas";
import { IconoCaret } from "./Iconos";
import styles from "./Calendario.module.css";

const DIAS_SEMANA = ["L", "M", "M", "J", "V", "S", "D"];

function tituloMes(anio: number, mes: number): string {
  const texto = new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", month: "long", year: "numeric" }).format(new Date(Date.UTC(anio, mes - 1, 1, 12)));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

type Props = {
  /** Hoy en la zona (YYYY-MM-DD): el día marcado y el límite de lo que ya pasó. */
  hoy: string;
  /** No se puede elegir un día antes de este límite (por defecto, hoy). */
  min?: string;
  zona: string;
  /** El día elegido o, con un rango, su primer día; "" si ninguno. */
  desde: string;
  /** El último día del rango; igual a `desde` con un solo día. */
  hasta: string;
  /** Qué días tienen al menos un evento y cuántos (OL-218): los que sí llevan un punto (Cuándo; los sin eventos se pueden
   *  elegir y el botón dice «Sin eventos» si el rango queda vacío). Sin él (el alta de un evento) ninguno lo lleva. */
  diasActivos?: DiasActivos;
  /** Un día pasado que sí se puede elegir: el de un evento ya pasado que se edita (precisión del founder, OL-218). */
  pasadoPermitido?: string;
  /** Sin las semanas que ya pasaron enteras (Cuándo: el mes en curso arranca en la semana de hoy). */
  sinSemanasPasadas?: boolean;
  /** Tocar otra vez el día ya elegido lo quita (lo dice el nombre accesible de ese día). */
  permiteQuitar: boolean;
  /** Un toque en un día que se puede elegir. Qué se hace con él (un día, un rango, quitarlo) lo decide quien la usa. */
  onElegir: (dia: string) => void;
};

/**
 * El calendario del mes (OL-162, bitácora 197; extraído de `SelectorFecha` en P5 para que la hoja Cuándo lo use dentro de
 * sí misma, sin copiarlo): flechas de mes, lunes a domingo, hoy marcado, los pasados apagados y, con `diasActivos`, un
 * punto en los que tienen eventos. Un día elegido va en círculo lleno; con un rango, los dos extremos van llenos y los
 * de en medio en el tono suave. Teclado de rejilla: flechas entre días (y meses), Enter o espacio para elegir.
 */
export default function Calendario({ hoy, min, zona, desde, hasta, diasActivos, pasadoPermitido, sinSemanasPasadas = false, permiteQuitar, onElegir }: Props) {
  const limite = min && min > hoy ? min : hoy;
  const [anio, setAnio] = useState(() => mesInicial(desde, limite).anio);
  const [mes, setMes] = useState(() => mesInicial(desde, limite).mes);
  const [foco, setFoco] = useState(desde || limite);
  const gridRef = useRef<HTMLDivElement>(null);

  const semanas = semanasDelMes(anio, mes, hoy, min).filter((semana) => !sinSemanasPasadas || semana.some((d) => !d.pasado));
  const puedeMesAnterior = hayMesAnterior(anio, mes, limite, true);
  const puedeMesSiguiente = haySiguienteMes(anio, mes, diasActivos);
  const ahora = new Date();

  /** Un día pasado se apaga siempre, salvo `pasadoPermitido`. */
  const apagado = (d: DiaCalendario) => d.delMes && d.pasado && d.fecha !== pasadoPermitido;

  function irAMes(delta: 1 | -1) {
    const { anio: a, mes: m } = delta === 1 ? mesSiguiente(anio, mes) : mesAnterior(anio, mes);
    setAnio(a);
    setMes(m);
  }

  function elegirDia(d: DiaCalendario) {
    if (!d.delMes || apagado(d)) return; // fuera del mes: vacío e intocable (decisión del founder, bitácora 245)
    setFoco(d.fecha);
    onElegir(d.fecha);
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

  // El foco de teclado sigue a `foco` (roving tabindex): cuando cambia (flechas, o al cambiar de mes) se lo damos al botón
  // del día, para que las flechas del teclado se sientan continuas entre meses. Un día "fuera del mes" no tiene
  // `data-fecha` (vacío e intocable): si `foco` cae ahí, el `querySelector` no halla nada y el foco se queda donde estaba.
  useEffect(() => {
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-fecha="${foco}"]`)?.focus();
  }, [foco, anio, mes]);

  return (
    <>
      <div className={styles.cabeceraMes}>
        <button type="button" className={styles.flecha} onClick={() => irAMes(-1)} aria-label="Mes anterior" disabled={!puedeMesAnterior}>
          <IconoCaret width={18} height={18} className={styles.izquierda} />
        </button>
        <strong>{tituloMes(anio, mes)}</strong>
        <button type="button" className={styles.flecha} onClick={() => irAMes(1)} aria-label="Mes siguiente" disabled={!puedeMesSiguiente}>
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
            {semana.map((d) => {
              // Un día ya pasado dice "ya pasó" en su nombre accesible, no "sin eventos" (`etiquetaDia` decide el orden).
              const conEventos = diasActivos ? (diasActivos.get(d.fecha) ?? 0) : undefined;
              const extremo = d.delMes && (d.fecha === desde || d.fecha === hasta);
              const enRango = d.delMes && d.fecha > desde && d.fecha < hasta;
              return (
                <button
                  type="button"
                  role={d.delMes ? "gridcell" : undefined}
                  key={d.fecha}
                  data-fecha={d.delMes ? d.fecha : undefined}
                  className={[styles.dia, !d.delMes && styles.fuera, d.hoy && styles.hoy, extremo && styles.elegido, enRango && styles.enRango, apagado(d) && styles.desactivado, d.delMes && !d.pasado && conEventos && styles.conEventos].filter(Boolean).join(" ")}
                  tabIndex={d.delMes && d.fecha === foco ? 0 : -1}
                  aria-current={d.delMes && d.hoy ? "date" : undefined}
                  aria-selected={d.delMes ? extremo || enRango : undefined}
                  aria-disabled={apagado(d) || undefined}
                  aria-hidden={d.delMes ? undefined : true}
                  aria-label={d.delMes ? etiquetaDia(diaLargo(d.fecha, ahora, zona), d, { conEventos, elegido: desde === hasta && d.fecha === desde, permiteQuitar }) : undefined}
                  onClick={() => elegirDia(d)}
                  onKeyDown={(e) => alTecladoDia(e, d)}
                >
                  {Number(d.fecha.slice(8, 10))}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}
