"use client";

import { useId, useState } from "react";
import Boton from "@/components/ui/Boton";
import { Chip } from "@/components/ui/Chip";
import Hoja from "@/components/ui/Hoja";
import { IconoCalendario } from "@/components/ui/Iconos";
import SelectorHora from "@/components/ui/SelectorHora";
import renglon from "@/components/ui/Renglon.module.css";
import { etiquetaHora } from "@/lib/calendario";
import { diaConMesDe } from "@/lib/fechas";
import { conHoraDeInicio, difiereDelComun, finesDelDia, horasDeHorario, type HorarioDia } from "@/lib/sesionesEvento";
import { HORAS_SUGERIDAS } from "./pasos";
import styles from "./AltaEvento.module.css";

type Cambios = Partial<Pick<HorarioDia, "hora" | "fin">>;

type Props = {
  horarios: HorarioDia[];
  /** El horario común: el día que difiere de él lleva sus horas en tinta. */
  comun: Pick<HorarioDia, "hora" | "fin">;
  zona: string;
  onCambio: (dia: string, cambios: Cambios) => void;
};

/**
 * El horario día por día (OL-311; prototipo firmado `horario-por-dia.html`, bitácora 338): un renglón por día (el canon de `ui/Renglon` sin
 * clave: icono, el día en negrita, sus horas debajo y «Cambiar»). Tocar uno abre una hoja con «Empieza» y «Termina» solo de ese día y «Listo»;
 * el día que se apartó del horario común lleva sus horas en tinta y en negrita, los demás en gris. «Otra hora» abre la hoja de horas de
 * siempre sobre la del día (`ui/SelectorHora`, hermana de ella y no hija, para que cerrar una no cierre la otra).
 */
export default function HorarioPorDia({ horarios, comun, zona, onCambio }: Props) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const [otra, setOtra] = useState<"inicio" | "fin" | null>(null);
  const ahora = new Date();
  const horario = horarios.find((h) => h.dia === abierto);
  const nombre = horario && diaConMesDe(horario.dia, ahora, zona);
  return (
    <>
      <ul className={renglon.renglones}>
        {horarios.map((h) => {
          const dia = diaConMesDe(h.dia, ahora, zona);
          return (
            <li key={h.dia} className={`${renglon.resuelto} ${renglon.sinClave} ${styles.dato} ${difiereDelComun(h, comun) ? styles.distinto : ""}`}>
              <IconoCalendario width={20} height={20} />
              <b>
                {dia}
                <small>{horasDeHorario(h)}</small>
              </b>
              <Boton type="button" variante="texto" alto="control" ancho="contenido" onClick={() => setAbierto(h.dia)} aria-label={`Cambiar ${dia}`}>
                Cambiar
              </Boton>
            </li>
          );
        })}
      </ul>
      {horario && nombre && <HojaDelDia horario={horario} nombre={nombre} onCambio={(cambios) => onCambio(horario.dia, cambios)} onOtra={setOtra} onCerrar={() => setAbierto(null)} />}
      {horario && otra === "inicio" && (
        <SelectorHora
          titulo="Empieza"
          hora={horario.hora}
          onElegir={(hora) => {
            onCambio(horario.dia, conHoraDeInicio(horario, hora));
            setOtra(null);
          }}
          onCerrar={() => setOtra(null)}
        />
      )}
      {horario && otra === "fin" && (
        <SelectorHora
          titulo={`Termina (empieza ${etiquetaHora(horario.hora)})`}
          hora={horario.fin}
          despuesDe={horario.hora}
          onElegir={(fin) => {
            onCambio(horario.dia, { fin });
            setOtra(null);
          }}
          onCerrar={() => setOtra(null)}
        />
      )}
    </>
  );
}

/** La hoja de un día: «Empieza» y «Termina» con los chips de siempre (y «Sin hora de fin») y «Listo» siempre a la vista. */
function HojaDelDia({ horario, nombre, onCambio, onOtra, onCerrar }: { horario: HorarioDia; nombre: string; onCambio: (cambios: Cambios) => void; onOtra: (cual: "inicio" | "fin") => void; onCerrar: () => void }) {
  const idEmpieza = useId();
  const idTermina = useId();
  const sugeridas = finesDelDia(horario.hora);
  const inicioPropio = !(HORAS_SUGERIDAS as readonly string[]).includes(horario.hora);
  return (
    <Hoja
      etiqueta={nombre}
      titulo={nombre}
      onCerrar={onCerrar}
      pie={
        <Boton type="button" onClick={onCerrar}>
          Listo
        </Boton>
      }
    >
      <div className={`${styles.grupo} ${styles.enHoja}`} role="group" aria-labelledby={idEmpieza}>
        <span id={idEmpieza}>Empieza</span>
        {HORAS_SUGERIDAS.map((hora) => (
          <Chip key={hora} activo={horario.hora === hora} onClick={() => onCambio(conHoraDeInicio(horario, hora))}>
            {etiquetaHora(hora)}
          </Chip>
        ))}
        <Chip onClick={() => onOtra("inicio")}>Otra hora</Chip>
        {inicioPropio && (
          <Chip activo onClick={() => onOtra("inicio")}>
            {etiquetaHora(horario.hora)}
          </Chip>
        )}
      </div>
      <div className={styles.grupo} role="group" aria-labelledby={idTermina}>
        <span id={idTermina}>Termina</span>
        {sugeridas.map((fin) => (
          <Chip key={fin} activo={horario.fin === fin} onClick={() => onCambio({ fin })}>
            {etiquetaHora(fin)}
          </Chip>
        ))}
        <Chip activo={!!horario.fin && !sugeridas.includes(horario.fin)} onClick={() => onOtra("fin")}>
          Otra hora
        </Chip>
        <Chip activo={horario.fin === ""} onClick={() => onCambio({ fin: "" })}>
          Sin hora de fin
        </Chip>
      </div>
    </Hoja>
  );
}
