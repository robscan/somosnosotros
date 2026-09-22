"use client";

import { useEffect, useState } from "react";
import { guardarSuscripcionPush } from "@/app/perfil/acciones";
import { dondeSeActivan, enEste } from "@/lib/plataforma";
import { observarEstadoPush, suscribirPush } from "@/lib/pushCliente";
import { usePlataforma } from "@/lib/useAvisosTelefono";
import { IconoCampana, IconoCerrar, IconoOk, IconoPendiente } from "./ui/Iconos";
import styles from "./ActivarAvisos.module.css";

const CERRADA = "somosnosotros:activar-avisos-cerrada";
type Estado = "oculta" | "lista" | "trabajando" | "listo" | "bloqueado" | "silenciado" | "fallo";

function cerradaEnEsteTelefono(): boolean {
  try {
    return localStorage.getItem(CERRADA) === "1";
  } catch {
    return false;
  }
}

/**
 * "Activa los avisos en este teléfono" (o "en esta computadora", decisión 9), arriba de la agenda al abrir la app
 * instalada (decisión 4 de docs/rediseno/17): el objeto arriba que pidió el founder, con motivo. Solo la pinta la
 * página si la cuenta pidió avisos en el teléfono, y sale en CUALQUIER aparato instalado que aún no tenga permiso
 * (hoy eso incluye Chrome de escritorio: "app instalada" no es solo iPhone). Activar es el toque que el navegador
 * exige para mostrar su permiso; mientras lo hace, la tarjeta dice "Activando…" y nunca se queda callada (bitácora
 * 147: en Chrome de escritorio el permiso puede quedar silencioso — un icono junto a la dirección, no un aviso — y
 * la promesa tardar en resolver; hay un tope para no esperar para siempre). La ✕ es "ahora no" y no vuelve en este
 * aparato (queda el renglón de Ajustes).
 */
export default function ActivarAvisos({ llavePush }: { llavePush: string }) {
  const plataforma = usePlataforma();
  const instalada = !!plataforma?.instalada;
  const [estado, setEstado] = useState<Estado>("oculta");

  useEffect(() => {
    if (!instalada || cerradaEnEsteTelefono()) return;
    const observador = observarEstadoPush(llavePush, (e) => {
      setEstado((anterior) => {
        if (cerradaEnEsteTelefono()) return "oculta";
        if (anterior === "trabajando" || anterior === "fallo" || anterior === "bloqueado" || anterior === "silenciado") return anterior;
        return e === "apagado" ? "lista" : "oculta";
      });
    });
    return () => observador.cerrar();
  }, [instalada, llavePush]);

  useEffect(() => {
    if (estado !== "listo") return;
    const id = setTimeout(() => setEstado("oculta"), 1600);
    return () => clearTimeout(id);
  }, [estado]);

  async function activar() {
    setEstado("trabajando");
    try {
      const alta = await suscribirPush(llavePush);
      if (!alta.ok) return setEstado(alta.motivo === "bloqueado" ? "bloqueado" : alta.motivo === "silenciado" ? "silenciado" : "fallo");
      setEstado((await guardarSuscripcionPush(alta.sub)) ? "listo" : "fallo");
    } catch {
      setEstado("fallo");
    }
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
        <b>Listo: te avisamos {enEste(plataforma)}</b>
      </p>
    );
  }
  const cerrar = (
    <button type="button" className={styles.cerrar} onClick={ahoraNo} aria-label="Ahora no">
      <IconoCerrar width={18} height={18} />
    </button>
  );
  if (estado === "bloqueado" || estado === "silenciado") {
    return (
      <p className={`${styles.tarjeta} ${styles.neutra}`} role="status">
        <IconoPendiente width={20} height={20} />
        <b>{estado === "bloqueado" ? "Quedaron bloqueados" : "Tu navegador no mostró el permiso"}</b>
        <small>Se activan {dondeSeActivan(plataforma)}</small>
        {cerrar}
      </p>
    );
  }
  const fallo = estado === "fallo";
  const trabajando = estado === "trabajando";
  return (
    <p className={styles.tarjeta} role={fallo || trabajando ? "status" : undefined}>
      {fallo ? <IconoPendiente width={20} height={20} /> : <IconoCampana width={20} height={20} />}
      <b>{fallo ? `No pudimos darte de alta ${enEste(plataforma)}` : trabajando ? "Activando…" : `Activa los avisos ${enEste(plataforma)}`}</b>
      <small>{fallo ? "Vuelve a intentarlo" : trabajando ? "Un momento" : "Para recordarte lo que vas y lo que sigues"}</small>
      <button type="button" className={styles.boton} onClick={activar} disabled={trabajando}>
        {trabajando ? "Activando…" : fallo ? "Intentar de nuevo" : "Activar"}
      </button>
      {cerrar}
    </p>
  );
}
