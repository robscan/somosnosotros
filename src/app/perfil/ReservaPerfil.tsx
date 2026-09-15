"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Hoja from "@/components/ui/Hoja";
import { elegirReserva } from "./acciones";
import styles from "./AvisosPerfil.module.css";

/**
 * Renglón "Perfil · Público / Reservado" con Cambiar → hoja con un interruptor que se guarda al tocar.
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
    <li className={styles.dato}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <b>Perfil · {reservado ? "Reservado" : "Público"}</b>
      <small>{reservado ? "Solo tú ves a qué vas y qué sigues" : "Tu ficha y tu nombre en “quién va” se ven"}</small>
      <button type="button" onClick={() => setAbierta(true)} aria-haspopup="dialog">
        Cambiar
      </button>
      {abierta && (
        <Hoja etiqueta="Perfil" onCerrar={cerrar}>
          <h3 className={styles.titulo}>Perfil</h3>
          <p className={styles.porque}>Se guarda al tocar.</p>
          <div className={styles.interruptor}>
            <span>
              Reservado
              <small>Tu ficha muestra solo nombre, foto y colonia. En “quién va” cuentas en el número, sin nombre ni foto. Sigues recibiendo avisos.</small>
            </span>
            <button type="button" role="switch" aria-checked={reservado} aria-label="Perfil reservado" className={styles.palanca} onClick={cambiar} disabled={trabajando} />
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
