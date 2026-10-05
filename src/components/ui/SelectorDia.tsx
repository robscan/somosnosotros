"use client";

import { useState } from "react";
import Boton from "./Boton";
import Calendario from "./Calendario";
import Hoja from "./Hoja";
import hoja from "./Hoja.module.css";
import { botonDias, diasIniciales, textoDias, tocarDia, ultimoDia } from "@/lib/calendario";
import { diaLocal, ZONA_INICIAL } from "@/lib/fechas";
import styles from "./SelectorDia.module.css";

type Props = {
  /** Título de la hoja: «¿Qué día es?». */
  titulo: string;
  /** YYYY-MM-DD de inicio; "" si ninguno. Al editar un evento ya pasado, este es el único día pasado que se sigue viendo
   *  elegible: lo demás pasado queda bloqueado. */
  desde: string;
  /** YYYY-MM-DD del último día; "" o igual a `desde` si el evento dura un solo día. */
  hasta?: string;
  /** No se puede elegir un día antes de este límite (por defecto, hoy). */
  min?: string;
  zona?: string;
  /** «Listo» aplica lo marcado y cierra: `hasta` es null si el evento dura un solo día. La ✕ de la hoja (o Escape, o tocar
   *  fuera) cierra sin aplicar nada. */
  onListo: (desde: string, hasta: string | null) => void;
  onCerrar: () => void;
};

/**
 * La hoja de días del alta y la edición de un evento (OL-298, bitácora 326): solo el calendario del mes (`ui/Calendario`),
 * sin las horas, que van en su propia hoja (`ui/SelectorHora`); antes las dos iban apiladas en una (`SelectorFecha`) y la
 * hoja medía casi toda la pantalla (founder, 2026-10-05: «es muy grande»). El primer toque elige el día de inicio; un
 * segundo toque en un día posterior elige el último (banda de rango); tocar uno anterior, o tocar con el rango ya
 * cerrado (también si es el día con que se abrió la hoja), empieza de nuevo. El texto de estado dice qué se eligió y el botón,
 * qué falta («Falta el día», «Listo, un solo día», «Listo»). Sin día no se puede confirmar: la fecha es obligatoria.
 * Prototipo firmado: `publicar-por-pasos.html`
 * (bitácora 323, quinta vuelta).
 */
export default function SelectorDia({ titulo, desde, hasta, min, zona = ZONA_INICIAL, onListo, onCerrar }: Props) {
  const hoy = diaLocal(new Date(), zona);
  const [elegidos, setElegidos] = useState(() => diasIniciales(desde, hasta));
  // El día con el que se abrió es el único pasado que sigue elegible (al editar un evento que ya pasó).
  const [pasadoPermitido] = useState(desde);

  return (
    <Hoja etiqueta={titulo} titulo={titulo} onCerrar={onCerrar}>
      <p className={`${hoja.nota} ${styles.estado}`} role="status">
        {textoDias(elegidos, hoy)}
      </p>
      <Calendario hoy={hoy} min={min} zona={zona} desde={elegidos.desde} hasta={elegidos.hasta ?? elegidos.desde} pasadoPermitido={pasadoPermitido} permiteQuitar={false} onElegir={(dia) => setElegidos((actual) => tocarDia(actual, dia))} />
      <Boton type="button" className={styles.listo} disabled={!elegidos.desde} onClick={() => onListo(elegidos.desde, ultimoDia(elegidos))}>
        {botonDias(elegidos)}
      </Boton>
    </Hoja>
  );
}
