"use client";

import { useSyncExternalStore } from "react";
import { IconoEnlace } from "@/components/ui/Iconos";
import Palanca from "@/components/ui/Palanca";
import { guardarSinAvisoSalida, sinAvisoSalida, suscribirseAvisoSalida } from "@/lib/avisoSalida";
import renglon from "@/components/ui/Renglon.module.css";

const alm = () => (typeof window === "undefined" ? null : window.localStorage);
const instantanea = () => !sinAvisoSalida(alm());
// En el servidor siempre "avisar": es el valor más seguro hasta que se lea el teléfono real (evita el
// parpadeo de hidratación sin recurrir a useEffect + setState, patrón ya usado en ui/Hoja.tsx).
const instantaneaServidor = () => true;

/** Reactiva el aviso al salir del sitio (OL-105) para quien tocó "No volver a avisarme" en la hoja. */
export default function AvisoSalidaAjuste() {
  const avisar = useSyncExternalStore(suscribirseAvisoSalida, instantanea, instantaneaServidor);
  function alternar() {
    guardarSinAvisoSalida(alm(), avisar); // si avisar era true, pasa a "sin aviso" = true
  }
  return (
    <li className={renglon.ajuste}>
      <IconoEnlace width={20} height={20} />
      <b>Avisar al salir del sitio</b>
      <small>Boletos, redes y sitios de artistas y lugares</small>
      <Palanca encendida={avisar} aria-label="Avisar al salir del sitio" onClick={alternar} />
    </li>
  );
}
