"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Hoja from "@/components/ui/Hoja";
import { IconoChevronDerecha, IconoOjo } from "@/components/ui/Iconos";
import Palanca from "@/components/ui/Palanca";
import renglon from "@/components/ui/Renglon.module.css";
import { elegirReserva } from "./acciones";
import styles from "./ReservaPerfil.module.css";

/**
 * Fila "Perfil · Público / Reservado" de Ajustes: abre una hoja con un interruptor que se guarda al tocar.
 * Reservado: a qué va y qué sigue solo lo ve la persona; en "quién va" cuenta sin nombre ni foto (decisión del founder, 2026-09-15).
 */
export default function ReservaPerfil({ reservado: inicial }: { reservado: boolean }) {
  const router = useRouter();
  const [abierta, setAbierta] = useState(false);
  const [reservado, setReservado] = useState(inicial);
  const [trabajando, setTrabajando] = useState(false);
  const [nota, setNota] = useState<string | null>(null);

  async function cambiar() {
    setTrabajando(true);
    setNota(null);
    const ok = await elegirReserva(!reservado);
    setTrabajando(false);
    if (ok) setReservado(!reservado);
    else setNota("No se pudo guardar. Intenta de nuevo.");
  }
  function cerrar() {
    setAbierta(false);
    setNota(null);
    router.refresh();
  }

  return (
    <li>
      <button type="button" className={renglon.ajuste} onClick={() => setAbierta(true)} aria-haspopup="dialog">
        <IconoOjo width={20} height={20} />
        <b>Perfil</b>
        <small>{reservado ? "Solo tú ves a qué vas y qué sigues" : "Tu ficha y tu nombre en “quién va” se ven"}</small>
        <span>
          {reservado ? "Reservado" : "Público"}
          <IconoChevronDerecha />
        </span>
      </button>
      {abierta && (
        <Hoja etiqueta="Perfil" onCerrar={cerrar}>
          <h3>Perfil</h3>
          <p>Se guarda al tocar.</p>
          <div className={styles.interruptor}>
            Reservado
            <small>Tu ficha muestra solo nombre, foto y colonia. En “quién va” cuentas en el número, sin nombre ni foto. Sigues recibiendo avisos.</small>
            <Palanca encendida={reservado} aria-label="Perfil reservado" onClick={cambiar} disabled={trabajando} />
          </div>
          {nota && (
            <p className={styles.nota} role="status">
              {nota}
            </p>
          )}
        </Hoja>
      )}
    </li>
  );
}
