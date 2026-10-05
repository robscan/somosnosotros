"use client";

import { useRef, useState } from "react";
import { etiquetaHora as horaDe } from "@/lib/calendario";
import { conDias, conHoraFin, conHoraInicio, finDelDia, horasEntre, partirLocal, terminaOtroDia, type InicioFin } from "@/lib/cuandoEvento";
import { localAIso, yaPaso } from "@/lib/fechas";
import { Chip } from "@/components/ui/Chip";
import SelectorDia from "@/components/ui/SelectorDia";
import SelectorHora from "@/components/ui/SelectorHora";
import { IconoCerrar } from "@/components/ui/Iconos";
import styles from "./SelectorCuando.module.css";

type Props = {
  inicio: string; // "YYYY-MM-DDTHH:MM" en la hora del sitio del evento
  fin: string;
  /** Zona horaria del sitio del evento: con ella se sabe si la hora ya pasó y cuánto dura. */
  zona: string;
  onCambio: (inicio: string, fin: string) => void;
  errorInicio?: string;
  errorFin?: string;
  /** Da el inicio que sugirió el sistema en este instante (nadie lo tocó todavía), para marcarlo distinto en la
   *  lista de horas. Función, no valor: vive en una `ref` en el padre (no dispara reactivamente re-render) y solo
   *  se lee al abrir la hoja (evento, no render), nunca durante el render de este componente. */
  sugeridaActual?: () => string;
};

/** "14 sep 2026": el día de calendario, igual en cualquier zona (se escribe su mediodía en UTC). */
function etiquetaFecha(fecha: string): string {
  const iso = localAIso(`${fecha}T12:00`, "Etc/UTC");
  return iso ? new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso)).replace(/\./g, "") : "Fecha";
}
/** "9:00 p.m."; sin hora, "Hora". */
function etiquetaHora(hora: string): string {
  return hora ? horaDe(hora) : "Hora";
}
/** "2 horas", "1 hora y 30 min", "Sin hora de fin": la duración tal cual se calcula hoy, para mostrarla en la
 *  hoja de "Empieza" (corrección del gestor, bitácora 197: que se vea que sigue funcionando igual). */
function etiquetaDuracion(horas: number): string {
  if (horas <= 0) return "Sin hora de fin";
  const totalMin = Math.round(horas * 60);
  const partes: string[] = [];
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h) partes.push(`${h} ${h === 1 ? "hora" : "horas"}`);
  if (m) partes.push(`${m} min`);
  return partes.join(" y ");
}

/**
 * Cuándo, como en el calendario del teléfono (referencia del founder, 2026-09-14): dos renglones, Empieza y Termina, cada
 * uno con su fecha y su hora en píldoras. Sin frase de confirmación: las píldoras ya lo dicen.
 *
 * El día y la hora van en hojas aparte (OL-298, bitácora 326; founder, 2026-10-05: «ese componente donde se ve calendario y
 * horas uno sobre otro hay que partirlo en dos, no sirve, es muy grande»): tocar una fecha, la de Empieza o la de Termina,
 * abre la hoja de días (`ui/SelectorDia`, con inicio y último día en el mismo calendario); tocar una hora abre la hoja de
 * horas (`ui/SelectorHora`) de Empieza o de Termina. Antes las dos iban apiladas en una sola (`SelectorFecha`).
 *
 * Hasta OL-218 (bitácora 247) el selector nativo (`<input type="date|time">`) seguía siendo la rama táctil/móvil
 * (la hoja propia solo reemplazaba al nativo en escritorio con puntero fino, OL-162, bitácora 197 — el nativo de
 * Chrome no aparece en la app instalada en un monitor externo, bitácora 195, OL-160). Precisión del founder en
 * OL-218: "el mismo componente de hoja se usa... en el alta y la edición de evento", sin acotarlo a escritorio. Ya no
 * hay rama nativa aquí tampoco.
 */
export default function SelectorCuando({ inicio, fin, zona, onCambio, errorInicio, errorFin, sugeridaActual }: Props) {
  const { fecha, hora } = partirLocal(inicio);
  const finP = partirLocal(fin);
  const actual: InicioFin = { inicio, fin };
  const sinHoraDeFin = !fin || finDelDia(actual);
  const duracion = fin && !sinHoraDeFin ? horasEntre(inicio, fin, zona) : 0;
  const [hoja, setHoja] = useState<"dia" | "inicio" | "fin" | null>(null);
  const disparador = useRef<HTMLButtonElement | null>(null);
  // Instantánea de la hora sugerida, tomada al abrir la hoja (evento, no render): `sugeridaActual` vive en una
  // ref del padre.
  const [sugeridaHoja, setSugeridaHoja] = useState("");

  function aplicar(nuevo: InicioFin) {
    onCambio(nuevo.inicio, nuevo.fin);
    cerrarHoja();
  }

  function abrirHoja(cual: "dia" | "inicio" | "fin", e: React.MouseEvent<HTMLButtonElement>) {
    disparador.current = e.currentTarget;
    // Sin día no hay a qué ponerle hora: primero el día.
    const abre = cual !== "dia" && !fecha ? "dia" : cual;
    if (abre === "inicio") setSugeridaHoja(sugeridaActual?.() ?? "");
    setHoja(abre);
  }
  function cerrarHoja() {
    setHoja(null);
    disparador.current?.focus();
  }

  return (
    <div className={styles.selector}>
      <div className={styles.fila}>
        <span className={styles.rotulo}>Empieza</span>
        <Chip onClick={(e) => abrirHoja("dia", e)}>{etiquetaFecha(fecha)}</Chip>
        <Chip onClick={(e) => abrirHoja("inicio", e)}>{etiquetaHora(hora)}</Chip>
      </div>
      {errorInicio && (
        <p className={styles.error} role="alert">
          {errorInicio}
        </p>
      )}
      <div className={styles.fila}>
        <span className={styles.rotulo}>Termina</span>
        {fin && <Chip onClick={(e) => abrirHoja("dia", e)}>{etiquetaFecha(finP.fecha)}</Chip>}
        <Chip onClick={(e) => abrirHoja("fin", e)}>{sinHoraDeFin ? "Sin hora de fin" : etiquetaHora(finP.hora)}</Chip>
        {fin && !sinHoraDeFin && (
          <button type="button" className={styles.quitar} onClick={() => { const nuevo = conHoraFin(actual, ""); onCambio(nuevo.inicio, nuevo.fin); }} aria-label="Quitar la hora de fin">
            <IconoCerrar width={20} height={20} />
          </button>
        )}
      </div>
      {errorFin && (
        <p className={styles.error} role="alert">
          {errorFin}
        </p>
      )}

      {inicio && yaPaso(inicio, new Date(), zona) && (
        <p className={styles.error} role="alert">
          Esa hora ya pasó.
        </p>
      )}
      <input type="hidden" name="inicio" value={inicio} />
      <input type="hidden" name="fin" value={fin} />

      {hoja === "dia" && <SelectorDia titulo="¿Qué día es?" desde={fecha} hasta={fin ? finP.fecha : ""} zona={zona} onListo={(desde, hasta) => aplicar(conDias(actual, desde, hasta))} onCerrar={cerrarHoja} />}
      {hoja === "inicio" && (
        <SelectorHora titulo="Empieza" hora={hora} sugerida={sugeridaHoja} duracion={etiquetaDuracion(duracion)} onElegir={(h) => aplicar(conHoraInicio(actual, h, zona))} onCerrar={cerrarHoja} />
      )}
      {hoja === "fin" && (
        <SelectorHora
          titulo={hora ? `Termina (empieza ${etiquetaHora(hora)})` : "Termina"}
          hora={sinHoraDeFin ? "" : finP.hora}
          despuesDe={hora && !terminaOtroDia(actual) ? hora : undefined}
          sinHoraDeFin
          onElegir={(h) => aplicar(conHoraFin(actual, h))}
          onCerrar={cerrarHoja}
        />
      )}
    </div>
  );
}
