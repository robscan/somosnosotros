"use client";

import Link from "next/link";
import { IconoComputadora, IconoTelefono } from "@/components/ui/Iconos";
import { useEstadoPush, usePlataforma } from "@/lib/useAvisosTelefono";
import styles from "./novedades.module.css";

/**
 * Al pie de Novedades: esto aún no llega a ESTE teléfono (decisión 5 de docs/rediseno/17). Sale solo si aquí se pueden
 * activar (apagados, o iPhone sin instalar) y dice lo del correo solo si de verdad llega por correo.
 */
export default function TelefonoAun({ correo, llavePush }: { correo: boolean; llavePush: string }) {
  const plataforma = usePlataforma();
  const [estado] = useEstadoPush(llavePush);
  if (estado !== "apagado" && estado !== "instalar-primero") return null;
  const computadora = !!plataforma?.computadora;
  return (
    <p className={styles.telefono}>
      {computadora ? <IconoComputadora width={22} height={22} /> : <IconoTelefono width={22} height={22} />}
      <span>
        {correo ? "Esto te llega por correo. " : ""}
        {computadora ? "En esta computadora aún no." : "En este teléfono aún no."}
      </span>
      <Link href="/ajustes">Activar</Link>
    </p>
  );
}
