"use client";

import { useEffect, useState } from "react";
import { guardarSuscripcionPush } from "@/app/perfil/acciones";
import { dondeSeActivan } from "@/lib/plataforma";
import { estadoPush, suscribirPush } from "@/lib/pushCliente";
import { usePlataforma } from "@/lib/useAvisosTelefono";
import { IconoCampana, IconoCerrar, IconoOk, IconoPendiente } from "./ui/Iconos";
import styles from "./ActivarAvisos.module.css";

const CERRADA = "somosnosotros:activar-avisos-cerrada";
type Estado = "oculta" | "lista" | "trabajando" | "listo" | "bloqueado" | "fallo";

function cerradaEnEsteTelefono(): boolean {
  try {
    return localStorage.getItem(CERRADA) === "1";
  } catch {
    return false;
  }
}

/**
 * "Activa los avisos en este teléfono", arriba de la agenda al abrir la app instalada (decisión 4 de docs/rediseno/17):
 * el objeto arriba que pidió el founder, con motivo. Solo la pinta la página si la cuenta pidió avisos en el teléfono, y
 * solo sale si esta app está instalada y este teléfono aún no tiene permiso. Activar es el toque que el iPhone exige para
 * mostrar su permiso; la ✕ es "ahora no" y no vuelve en este teléfono (queda el renglón de Ajustes).
 */
export default function ActivarAvisos({ llavePush }: { llavePush: string }) {
  const plataforma = usePlataforma();
  const instalada = !!plataforma?.instalada;
  const [estado, setEstado] = useState<Estado>("oculta");

  useEffect(() => {
    if (!instalada || cerradaEnEsteTelefono()) return;
    let vivo = true;
    estadoPush(llavePush)
      .then((e) => vivo && e === "apagado" && setEstado("lista"))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [instalada, llavePush]);

  useEffect(() => {
    if (estado !== "listo") return;
    const id = setTimeout(() => setEstado("oculta"), 1600);
    return () => clearTimeout(id);
  }, [estado]);

  async function activar() {
    setEstado("trabajando");
    const alta = await suscribirPush(llavePush);
    if (!alta.ok) return setEstado(alta.motivo === "bloqueado" ? "bloqueado" : "fallo");
    setEstado((await guardarSuscripcionPush(alta.sub)) ? "listo" : "fallo");
  }
  function ahoraNo() {
    try {
      localStorage.setItem(CERRADA, "1");
    } catch {}
    setEstado("oculta");
  }

  if (estado === "oculta") return null;
  if (estado === "listo") {
    return (
      <p className={`${styles.tarjeta} ${styles.hecha}`} role="status">
        <IconoOk width={20} height={20} />
        <b>Listo: te avisamos en este teléfono</b>
      </p>
    );
  }
  const cerrar = (
    <button type="button" className={styles.cerrar} onClick={ahoraNo} aria-label="Ahora no">
      <IconoCerrar width={18} height={18} />
    </button>
  );
  if (estado === "bloqueado") {
    return (
      <p className={`${styles.tarjeta} ${styles.neutra}`} role="status">
        <IconoPendiente width={20} height={20} />
        <b>Quedaron bloqueados</b>
        <small>Se activan {dondeSeActivan(plataforma)}</small>
        {cerrar}
      </p>
    );
  }
  const fallo = estado === "fallo";
  return (
    <p className={styles.tarjeta} role={fallo ? "status" : undefined}>
      {fallo ? <IconoPendiente width={20} height={20} /> : <IconoCampana width={20} height={20} />}
      <b>{fallo ? "No pudimos darte de alta en este teléfono" : "Activa los avisos en este teléfono"}</b>
      <small>{fallo ? "Vuelve a intentarlo" : "Para recordarte lo que vas y lo que sigues"}</small>
      <button type="button" className={styles.boton} onClick={activar} disabled={estado === "trabajando"}>
        {fallo ? "Intentar de nuevo" : "Activar"}
      </button>
      {cerrar}
    </p>
  );
}
