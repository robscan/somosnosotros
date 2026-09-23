"use client";

import { useRef, useState } from "react";
import { combinarFechaHora, localAIso, sumarHoras, yaPaso } from "@/lib/fechas";
import { ChipNativo } from "@/components/ui/Chip";
import chip from "@/components/ui/Chip.module.css";
import SelectorFecha from "@/components/ui/SelectorFecha";
import { usePunteroFinoAncho } from "@/components/usePunteroFinoAncho";
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

function partir(local: string): { fecha: string; hora: string } {
  const [fecha = "", hora = ""] = local.split("T");
  return { fecha, hora: hora.slice(0, 5) };
}
function horasEntre(inicio: string, fin: string, zona: string): number {
  const a = localAIso(inicio, zona);
  const b = localAIso(fin, zona);
  if (!a || !b) return 0;
  return Math.round(((new Date(b).getTime() - new Date(a).getTime()) / 3600000) * 4) / 4;
}
/** "14 sep 2026": el día de calendario, igual en cualquier zona (se escribe su mediodía en UTC). */
function etiquetaFecha(fecha: string): string {
  const iso = localAIso(`${fecha}T12:00`, "Etc/UTC");
  return iso ? new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso)).replace(/\./g, "") : "Fecha";
}
/** "9:00 p.m." */
function etiquetaHora(hora: string): string {
  if (!hora) return "Hora";
  const [h, m] = hora.split(":").map(Number);
  return new Intl.DateTimeFormat("es-MX", { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(2000, 0, 1, h, m));
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
 * Cuándo, como en el calendario del teléfono (referencia del founder, 2026-09-14): dos renglones, Empieza y Termina,
 * cada uno con su fecha y su hora en píldoras que abren el selector nativo. Sin frase de confirmación: las píldoras ya lo dicen.
 *
 * En escritorio con puntero fino (OL-162, bitácora 197): el selector nativo de Chrome no aparece en la app instalada
 * en un monitor externo (bitácora 195, OL-160), así que ahí las píldoras abren la hoja propia (`ui/SelectorFecha`,
 * calendario + horas) en vez del `<input type="date|time">`. En táctil y en móvil (`usePunteroFinoAncho` en false)
 * nada cambia: siguen siendo el selector nativo de siempre.
 */
export default function SelectorCuando({ inicio, fin, zona, onCambio, errorInicio, errorFin, sugeridaActual }: Props) {
  const { fecha, hora } = partir(inicio);
  const finP = partir(fin);
  const duracion = fin ? horasEntre(inicio, fin, zona) : 0;
  const escritorio = usePunteroFinoAncho();
  const [hoja, setHoja] = useState<"inicio" | "fin" | null>(null);
  const disparador = useRef<HTMLButtonElement | null>(null);
  // Instantánea de la hora sugerida, tomada al abrir la hoja (evento, no render): `sugeridaActual` vive en una
  // ref del padre.
  const [sugeridaHoja, setSugeridaHoja] = useState("");

  function fijarInicio(nuevaFecha: string, nuevaHora: string) {
    const nuevoInicio = combinarFechaHora(nuevaFecha, nuevaHora);
    // Al mover el inicio, el fin se mueve con él (misma duración).
    onCambio(nuevoInicio, nuevoInicio && duracion > 0 ? sumarHoras(nuevoInicio, duracion, zona) : "");
  }
  function fijarFin(nuevaFecha: string, nuevaHora: string) {
    onCambio(inicio, nuevaHora ? combinarFechaHora(nuevaFecha || fecha, nuevaHora) : "");
  }

  function abrirHoja(cual: "inicio" | "fin", e: React.MouseEvent<HTMLButtonElement>) {
    disparador.current = e.currentTarget;
    if (cual === "inicio") setSugeridaHoja(sugeridaActual?.() ?? "");
    setHoja(cual);
  }
  function cerrarHoja() {
    setHoja(null);
    disparador.current?.focus();
  }

  return (
    <div className={styles.selector}>
      <div className={styles.fila}>
        <span className={styles.rotulo}>Empieza</span>
        {escritorio ? (
          <>
            <button type="button" className={chip.chip} onClick={(e) => abrirHoja("inicio", e)}>
              {etiquetaFecha(fecha)}
            </button>
            <button type="button" className={chip.chip} onClick={(e) => abrirHoja("inicio", e)}>
              {etiquetaHora(hora)}
            </button>
          </>
        ) : (
          <>
            <ChipNativo tipo="date" valor={fecha} activo={false} etiqueta={etiquetaFecha(fecha)} onCambio={(v) => v && fijarInicio(v, hora || "19:00")} ariaLabel="Fecha en que empieza" />
            <ChipNativo tipo="time" valor={hora} activo={false} etiqueta={etiquetaHora(hora)} onCambio={(v) => v && fijarInicio(fecha, v)} ariaLabel="Hora en que empieza" />
          </>
        )}
      </div>
      {errorInicio && (
        <p className={styles.error} role="alert">
          {errorInicio}
        </p>
      )}
      <div className={styles.fila}>
        <span className={styles.rotulo}>Termina</span>
        {escritorio ? (
          <>
            {fin && (
              <button type="button" className={chip.chip} onClick={(e) => abrirHoja("fin", e)}>
                {etiquetaFecha(finP.fecha)}
              </button>
            )}
            <button type="button" className={chip.chip} onClick={(e) => abrirHoja("fin", e)}>
              {fin ? etiquetaHora(finP.hora) : "Sin hora de fin"}
            </button>
          </>
        ) : (
          <>
            {fin && <ChipNativo tipo="date" valor={finP.fecha} activo={false} etiqueta={etiquetaFecha(finP.fecha)} onCambio={(v) => v && fijarFin(v, finP.hora)} ariaLabel="Fecha en que termina" />}
            <ChipNativo tipo="time" valor={finP.hora} activo={false} etiqueta={fin ? etiquetaHora(finP.hora) : "Sin hora de fin"} onCambio={(v) => fijarFin(finP.fecha, v)} ariaLabel="Hora en que termina" />
          </>
        )}
        {fin && (
          <button type="button" className={styles.quitar} onClick={() => onCambio(inicio, "")} aria-label="Quitar la hora de fin">
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

      {hoja === "inicio" && (
        <SelectorFecha
          titulo="Cuándo empieza"
          fecha={fecha}
          hora={hora || "19:00"}
          zona={zona}
          conHora
          bloquearPasado={false}
          sugerida={sugeridaHoja}
          duracion={etiquetaDuracion(duracion)}
          onListo={(f, h) => {
            fijarInicio(f, h ?? hora ?? "19:00");
            cerrarHoja();
          }}
          onCerrar={cerrarHoja}
        />
      )}
      {hoja === "fin" && (
        <SelectorFecha
          titulo="Cuándo termina"
          fecha={finP.fecha || fecha}
          hora={finP.hora}
          zona={zona}
          conHora
          bloquearPasado={false}
          onListo={(f, h) => {
            if (h) fijarFin(f, h);
            cerrarHoja();
          }}
          onCerrar={cerrarHoja}
        />
      )}
    </div>
  );
}
