"use client";

import { use, useEffect, useRef, useState, type KeyboardEvent } from "react";
import Hoja from "./Hoja";
import { etiquetaDia, hayMesAnterior, haySiguienteMes, mesAnterior, mesInicial, mesSiguiente, pasoMasCercano, pasosHora, semanasDelMes, sumarDiasIso, type DiaCalendario, type DiasActivos } from "@/lib/calendario";
import { diaLargo, diaLocal, ZONA_INICIAL } from "@/lib/fechas";
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

function esPromesa(v: unknown): v is Promise<DiasActivos> {
  return !!v && typeof (v as { then?: unknown }).then === "function";
}

type Props = {
  /** Título de la hoja: "Selecciona una fecha" (Agenda y Lugares), "Selecciona la fecha del evento" (alta y
   *  edición de evento, con hora). */
  titulo: string;
  /** YYYY-MM-DD elegido; "" si ninguno. Al editar un evento ya pasado, este es el único día pasado que se sigue
   *  viendo elegible (ver `modo`): lo demás pasado queda bloqueado. */
  fecha: string;
  /** "HH:MM"; solo se usa (y se muestra la lista de horas) si `conHora`. */
  hora?: string;
  /** No se puede elegir un día antes de este límite (por defecto, hoy). */
  min?: string;
  zona?: string;
  /** false (por defecto, Agenda y Lugares): solo el calendario. true (alta de evento): calendario + lista de horas. */
  conHora?: boolean;
  /** Hora sugerida por el sistema (para marcarla distinto si la persona no la tocó; OL-162 § "duración como hoy"). */
  sugerida?: string;
  /** Texto de la duración ("2 horas", "Sin hora de fin"), tal cual se calcula hoy fuera de esta hoja (no cambia
   *  aquí); se muestra debajo de las horas, informativo, solo si se manda (la hoja de "Empieza"). */
  duracion?: string;
  /** Qué días tienen al menos un evento (Agenda y Lugares, OL-218, docs/rediseno/prototipos/calendario-dias-con-
   *  eventos.html): sin ella (alta de evento, `modo="campo"`), ningún día se desactiva por "sin eventos" — ahí
   *  todos los días futuros se pueden elegir, con hora u otra fecha de fin, y la restricción es solo "no pasado".
   *  Un `Promise` (Agenda: `agenda.then(...)`, diferida con `use()`) hace que TODA la hoja suspenda (título,
   *  flechas de mes y rejilla juntos, nada a medias) hasta que resuelva; quien llama la envuelve en su propio
   *  `<Suspense>` con `SelectorFechaCargando` de respaldo. */
  diasActivos?: DiasActivos | Promise<DiasActivos>;
  /**
   * Las dos hojas comparten el mismo mecanismo desde la corrección del founder en la bitácora 247 («Hace rato
   * quise decir que dejaras el botón de listo en los dos calendarios», tras un «Entonces deja listo en los dos
   * lados» anterior): tocar un día disponible lo marca, sin cerrar la hoja; el botón "Listo" aplica lo marcado y
   * cierra. La ✕ de la hoja (o Escape, o tocar fuera) cierra sin aplicar nada.
   *
   * "filtro" (`ui/ChipFecha`, Agenda y Lugares): tocar el mismo día ya marcado lo desmarca — la fecha no es
   * obligatoria, "" es un resultado válido ("Listo" sin nada marcado quita el filtro). "Listo" siempre se puede
   * tocar, marcado o no.
   * "campo" (`SelectorCuando`, alta y edición de evento): la fecha es obligatoria — tocar el mismo día ya
   * marcado no hace nada (no se puede dejar sin fecha); "Listo" se deshabilita hasta que haya un día marcado
   * (y, con `conHora`, también una hora). Un día pasado se bloquea, salvo el que ya traía `fecha` al abrir (para
   * poder seguir viendo y conservando la fecha de un evento ya pasado al editarlo, sin abrir la puerta a elegir
   * OTRO día pasado).
   */
  modo: "filtro" | "campo";
  onListo: (fecha: string, hora?: string) => void;
  onCerrar: () => void;
};

/**
 * La hoja propia de fecha y hora (OL-162, bitácora 197; también en el teléfono y en el alta/edición de evento
 * desde OL-218, bitácora 247): calendario del mes (lunes a domingo, hoy marcado, días pasados bloqueados, flechas
 * de mes) y, con `conHora`, una lista de horas en pasos de 15 minutos. Un solo componente, parametrizado por
 * `modo` ("filtro" vs "campo") en vez de dos copias — mismo canon visual y de accesibilidad en toda la app.
 */
export default function SelectorFecha({ titulo, fecha, hora, min, zona = ZONA_INICIAL, conHora = false, sugerida, duracion, diasActivos, modo, onListo, onCerrar }: Props) {
  // `use()` puede llamarse condicionalmente (a diferencia de los demás Hooks): con una `Promise` sin resolver,
  // este componente entero suspende — ver el comentario de `diasActivos` arriba.
  const diasResueltos = esPromesa(diasActivos) ? use(diasActivos) : diasActivos;

  const hoy = diaLocal(new Date(), zona);
  const limite = min && min > hoy ? min : hoy;
  const [anio, setAnio] = useState(() => mesInicial(fecha, limite).anio);
  const [mes, setMes] = useState(() => mesInicial(fecha, limite).mes);
  const [elegido, setElegido] = useState(fecha);
  const [horaElegida, setHoraElegida] = useState(hora ?? "");
  const [foco, setFoco] = useState(fecha || limite);
  const gridRef = useRef<HTMLDivElement>(null);
  const horasRef = useRef<HTMLDivElement>(null);

  const semanas = semanasDelMes(anio, mes, hoy, min);
  const sugeridaPaso = sugerida ? pasoMasCercano(sugerida.slice(11, 16) || sugerida) : undefined;
  const puedeMesAnterior = hayMesAnterior(anio, mes, limite, true);
  const puedeMesSiguiente = haySiguienteMes(anio, mes, diasResueltos);

  /** Un día pasado se bloquea siempre, salvo el que ya traía `fecha` al abrir la hoja: al editar un evento ya
   *  pasado, su propia fecha se sigue viendo y conservando (precisión del founder, OL-218) sin abrir la puerta a
   *  elegir OTRO día pasado. En "filtro" (Agenda y Lugares) `fecha` nunca es un día pasado en la práctica, así
   *  que esta excepción no cambia nada ahí. */
  function diaBloqueado(d: DiaCalendario): boolean {
    return d.pasado && d.fecha !== fecha;
  }

  function irAMes(delta: 1 | -1) {
    const { anio: a, mes: m } = delta === 1 ? mesSiguiente(anio, mes) : mesAnterior(anio, mes);
    setAnio(a);
    setMes(m);
  }

  function elegirDia(d: DiaCalendario) {
    if (!d.delMes) return; // fuera del mes: vacío e intocable (decisión del founder, bitácora 245)
    if (diaBloqueado(d)) return;
    if (diasResueltos && !d.pasado && !diasResueltos.has(d.fecha)) return; // sin eventos: no se puede elegir
    setFoco(d.fecha);
    // Tocar un día disponible lo marca; "Listo" aplica lo marcado y cierra (corrección del founder, bitácora
    // 247: las dos hojas comparten este mecanismo, sin pausa ni cierre automático al tocar).
    if (d.fecha === elegido) {
      // Tocar el mismo día ya marcado lo desmarca en modo "filtro" (la fecha no es obligatoria: "Listo" sin
      // nada marcado quita el filtro); en modo "campo" no hace nada (no se puede dejar sin fecha).
      if (modo === "filtro") setElegido("");
      return;
    }
    setElegido(d.fecha);
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
  // damos al botón del día, para que las flechas del teclado se sientan continuas entre meses. Un día "fuera del
  // mes" no tiene `data-fecha` (vacío e intocable): si `foco` cae ahí, el `querySelector` no halla nada y el foco
  // se queda donde estaba, sin errores (la navegación de flechas entre meses queda para cuando haga falta).
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

  // En "filtro" "Listo" siempre se puede tocar (marcado o no: "" es un resultado válido, quita el filtro);
  // en "campo" la fecha es obligatoria (y, con hora, también la hora).
  const puedeConfirmar = modo === "filtro" || (!!elegido && (!conHora || !!horaElegida));
  const ahora = new Date();

  return (
    <Hoja etiqueta={titulo} titulo={titulo} plano onCerrar={onCerrar}>
      <div className={styles.selector}>
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
                // "Sin eventos" solo existe si se sabe qué días tienen (`diasResueltos`, modo "filtro"); un día ya
                // pasado dice "ya pasó" en su nombre accesible, no "sin eventos" (`etiquetaDia` decide el orden).
                const sinEventos = d.delMes && diasResueltos !== undefined && !d.pasado && !diasResueltos.has(d.fecha);
                const desactivado = d.delMes && (diaBloqueado(d) || sinEventos);
                const conEventos = diasResueltos ? (diasResueltos.get(d.fecha) ?? 0) : undefined;
                return (
                  <button
                    type="button"
                    role={d.delMes ? "gridcell" : undefined}
                    key={d.fecha}
                    data-fecha={d.delMes ? d.fecha : undefined}
                    className={[styles.dia, !d.delMes && styles.fuera, d.hoy && styles.hoy, d.delMes && d.fecha === elegido && styles.elegido, desactivado && styles.desactivado].filter(Boolean).join(" ")}
                    tabIndex={d.delMes && d.fecha === foco ? 0 : -1}
                    aria-current={d.delMes && d.hoy ? "date" : undefined}
                    aria-selected={d.delMes ? d.fecha === elegido : undefined}
                    aria-disabled={desactivado || undefined}
                    aria-hidden={d.delMes ? undefined : true}
                    aria-label={d.delMes ? etiquetaDia(diaLargo(d.fecha, ahora, zona), d, { conEventos, elegido: d.fecha === elegido, permiteQuitar: modo === "filtro" }) : undefined}
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
        <button type="button" className={styles.listo} disabled={!puedeConfirmar} onClick={() => onListo(elegido, conHora ? horaElegida : undefined)}>
          Listo
        </button>
      </div>
    </Hoja>
  );
}

/**
 * El estado "cargando" del prototipo (bitácora 245/247): mientras no se sabe qué días tienen eventos (una
 * `Promise` de `diasActivos` sin resolver, Agenda), `SelectorFecha` entero suspende (`use()`, arriba) y el
 * `<Suspense>` de quien llama (`ui/ChipFecha`) pinta esto en su lugar — el mismo título y las mismas flechas de
 * mes (deshabilitadas: no se sabe todavía hasta dónde hay datos), la rejilla como un esqueleto del mismo tamaño
 * (5 semanas × 7, igual que la real) para que nada salte ni parpadee al llegar los datos, y un aviso que solo
 * oyen los lectores de pantalla (`role="status"`).
 */
export function SelectorFechaCargando({ titulo, fecha, min, zona = ZONA_INICIAL, onCerrar }: { titulo: string; fecha: string; min?: string; zona?: string; onCerrar: () => void }) {
  const hoy = diaLocal(new Date(), zona);
  const limite = min && min > hoy ? min : hoy;
  const { anio, mes } = mesInicial(fecha, limite);
  return (
    <Hoja etiqueta={titulo} titulo={titulo} plano onCerrar={onCerrar}>
      <div className={styles.selector}>
        <div className={styles.cabeceraMes}>
          <button type="button" className={styles.flecha} aria-label="Mes anterior" disabled>
            <IconoCaret width={18} height={18} className={styles.izquierda} />
          </button>
          <strong>{tituloMes(anio, mes)}</strong>
          <button type="button" className={styles.flecha} aria-label="Mes siguiente" disabled>
            <IconoCaret width={18} height={18} className={styles.derecha} />
          </button>
        </div>
        <div className={styles.diasSemana} aria-hidden="true">
          {DIAS_SEMANA.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <p className={styles.soloLector} role="status" aria-live="polite">
          Cargando los días con eventos…
        </p>
        <div className={styles.skeleton} aria-hidden="true">
          {Array.from({ length: 5 }).map((_semana, i) => (
            <div className={styles.semana} key={i}>
              {Array.from({ length: 7 }).map((_celda, j) => (
                <span className={styles.celda} key={j} />
              ))}
            </div>
          ))}
        </div>
        {/* Mismo lugar que el botón "Listo" de la hoja real (desde la corrección del founder, bitácora 247, las
            dos hojas lo llevan siempre): reservado y deshabilitado aquí también, para que nada salte de tamaño
            al llegar los datos. */}
        <button type="button" className={styles.listo} disabled aria-hidden="true">
          Listo
        </button>
      </div>
    </Hoja>
  );
}
