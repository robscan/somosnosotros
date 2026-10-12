"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { haySensorDeGiro, pedirPermisoDeGiro, pidePermisoDeGiro } from "@/components/inicio/giroPortadas";
import { IconoGiro } from "@/components/ui/Iconos";
import Palanca from "@/components/ui/Palanca";
import { giroQuerido, guardarGiro, leerGiro, suscribirseGiro } from "@/lib/giroPortadas";
import renglon from "@/components/ui/Renglon.module.css";

const almacen = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};
const consulta = () => window.matchMedia("(prefers-reduced-motion: reduce)");
function suscribirseMovimiento(escucha: () => void) {
  const c = consulta();
  c.addEventListener("change", escucha);
  return () => c.removeEventListener("change", escucha);
}
const sinSuscripcion = () => () => {};

/**
 * «Mover las portadas con el teléfono» en Ajustes › Somos Nosotros (OL-375; decisión del 2026-10-11, recomendación del gestor aceptada por el
 * founder): el interruptor del giro de las portadas del sistema de Inicio, que se guarda en el teléfono. En el iPhone, el toque que lo enciende
 * pide el permiso del giroscopio (Safari solo lo pide tras un toque); si se niega, vuelve a apagado y lo dice en una línea. En Android no hay
 * permiso y viene encendido: sirve para apagarlo. Con «Reducir movimiento» no se mueve y lo dice; donde no hay giroscopio (una computadora) el
 * renglón no sale. Mismo dibujo que «Avisar al salir del sitio» (icono, etiqueta, detalle y la palanca en la fila; se guarda al tocar).
 */
export default function GiroPortadasAjuste() {
  // En el servidor no se sabe qué teléfono es: el renglón llega con la página ya en el teléfono, como «Instalar la app».
  const sensor = useSyncExternalStore(sinSuscripcion, haySensorDeGiro, () => false);
  const preferencia = useSyncExternalStore(suscribirseGiro, () => leerGiro(almacen()), () => null);
  const reducir = useSyncExternalStore(suscribirseMovimiento, () => consulta().matches, () => false);
  const [nota, setNota] = useState<string | null>(null);
  // Encendido en un iPhone de una visita anterior: el permiso puede no seguir (el iPhone lo olvida al cerrar Safari o la app; medido en el
  // simulador). Sin un toque solo responde si lo tiene; si no, el interruptor se ve apagado, que es lo que pasa en Inicio, y el toque lo vuelve a pedir.
  const [permiso, setPermiso] = useState<"sabiendo" | "si" | "no">("sabiendo");
  const pide = sensor && pidePermisoDeGiro();
  useEffect(() => {
    if (!pide || preferencia !== "encendido") return;
    let vigente = true;
    void pedirPermisoDeGiro().then((ok) => vigente && setPermiso(ok ? "si" : "no"));
    return () => {
      vigente = false;
    };
  }, [pide, preferencia]);
  if (!sensor || (pide && preferencia === "encendido" && permiso === "sabiendo")) return null;
  const encendido = !reducir && giroQuerido(preferencia, pide) && !(pide && permiso === "no");

  function alternar() {
    setNota(null);
    if (encendido) return guardarGiro(almacen(), "apagado");
    if (!pide) return guardarGiro(almacen(), "encendido");
    // En el iPhone el permiso se pide en este mismo toque (la llamada sale antes de esperar nada).
    void pedirPermisoDeGiro().then((ok) => {
      setPermiso(ok ? "si" : "no");
      guardarGiro(almacen(), ok ? "encendido" : "apagado");
      // Negado, el iPhone ya no pregunta hasta que se cierra y se abre la app o Safari (medido en el simulador, bitácora 406).
      if (!ok) setNota("El iPhone no dio el permiso: vuelve a preguntar si cierras y abres la app");
    });
  }
  return (
    <li className={reducir ? `${renglon.ajuste} ${renglon.apagado}` : renglon.ajuste}>
      <IconoGiro width={20} height={20} />
      <b>Mover las portadas con el teléfono</b>
      <small role="status">{reducir ? "Tu teléfono pide reducir el movimiento" : (nota ?? "Las de festivales, expos y talleres, en Inicio")}</small>
      <Palanca encendida={encendido} aria-label="Mover las portadas con el teléfono" onClick={alternar} disabled={reducir} />
    </li>
  );
}
