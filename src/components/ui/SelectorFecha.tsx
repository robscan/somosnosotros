"use client";

import { use, useEffect, useRef, useState } from "react";
import Boton from "./Boton";
import Calendario, { CalendarioCargando } from "./Calendario";
import Hoja from "./Hoja";
import { pasoMasCercano, pasosHora, type DiasActivos } from "@/lib/calendario";
import { diaLocal, ZONA_INICIAL } from "@/lib/fechas";
import styles from "./SelectorFecha.module.css";

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
 * desde OL-218, bitácora 247): el calendario del mes (`ui/Calendario`, que también usa la hoja Cuándo) y, con
 * `conHora`, una lista de horas en pasos de 15 minutos. Un solo componente, parametrizado por `modo` ("filtro" vs
 * "campo") en vez de dos copias — mismo canon visual y de accesibilidad en toda la app.
 */
export default function SelectorFecha({ titulo, fecha, hora, min, zona = ZONA_INICIAL, conHora = false, sugerida, duracion, diasActivos, modo, onListo, onCerrar }: Props) {
  // `use()` puede llamarse condicionalmente (a diferencia de los demás Hooks): con una `Promise` sin resolver,
  // este componente entero suspende — ver el comentario de `diasActivos` arriba.
  const diasResueltos = esPromesa(diasActivos) ? use(diasActivos) : diasActivos;

  const hoy = diaLocal(new Date(), zona);
  const [elegido, setElegido] = useState(fecha);
  const [horaElegida, setHoraElegida] = useState(hora ?? "");
  const horasRef = useRef<HTMLDivElement>(null);
  const sugeridaPaso = sugerida ? pasoMasCercano(sugerida.slice(11, 16) || sugerida) : undefined;

  // Tocar un día disponible lo marca; "Listo" aplica lo marcado y cierra (corrección del founder, bitácora 247: las dos
  // hojas comparten este mecanismo, sin pausa ni cierre automático al tocar). Tocar el mismo día ya marcado lo desmarca
  // en modo "filtro" (la fecha no es obligatoria: "Listo" sin nada marcado quita el filtro); en modo "campo" no hace
  // nada (no se puede dejar sin fecha).
  function elegirDia(dia: string) {
    if (dia !== elegido) setElegido(dia);
    else if (modo === "filtro") setElegido("");
  }

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

  return (
    <Hoja etiqueta={titulo} titulo={titulo} plano onCerrar={onCerrar}>
      <div className={styles.selector}>
        <Calendario hoy={hoy} min={min} zona={zona} desde={elegido} hasta={elegido} diasActivos={diasResueltos} pasadoPermitido={fecha} permiteQuitar={modo === "filtro"} onElegir={elegirDia} />
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

/**
 * El estado "cargando" del prototipo (bitácora 245/247): mientras no se sabe qué días tienen eventos (una
 * `Promise` de `diasActivos` sin resolver, Agenda), `SelectorFecha` entero suspende (`use()`, arriba) y el
 * `<Suspense>` de quien llama (`ui/ChipFecha`) pinta esto en su lugar: el calendario en su esqueleto
 * (`CalendarioCargando`) y, en el mismo lugar que el botón "Listo" de la hoja real (desde la corrección del founder,
 * bitácora 247, las dos hojas lo llevan siempre), el botón apagado, para que nada salte de tamaño al llegar los datos.
 */
export function SelectorFechaCargando({ titulo, fecha, min, zona = ZONA_INICIAL, onCerrar }: { titulo: string; fecha: string; min?: string; zona?: string; onCerrar: () => void }) {
  return (
    <Hoja etiqueta={titulo} titulo={titulo} plano onCerrar={onCerrar}>
      <div className={styles.selector}>
        <CalendarioCargando hoy={diaLocal(new Date(), zona)} min={min} desde={fecha} />
        <Boton type="button" className={styles.listo} disabled aria-hidden="true">
          Listo
        </Boton>
      </div>
    </Hoja>
  );
}
