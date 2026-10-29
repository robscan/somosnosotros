"use client";

import { useState } from "react";
import HojaInstalar from "@/components/HojaInstalar";
import { IconoComputadora, IconoOk, IconoPendiente, IconoTelefono } from "@/components/ui/Iconos";
import { elegirAvisos } from "@/app/avisos/acciones";
import { guardarSuscripcionPush } from "@/app/perfil/acciones";
import { dondeSeActivan, enEste } from "@/lib/plataforma";
import { medirCliente } from "@/lib/medir";
import { suscribirPush } from "@/lib/pushCliente";
import { useEstadoPush, usePlataforma } from "@/lib/useAvisosTelefono";
import styles from "./novedades.module.css";

type Paso = "pregunta" | "trabajando" | "listo" | "falta" | "bloqueado" | "fallo";

/**
 * Al pie de Novedades, si en ESTE teléfono los avisos se pueden activar y no lo están (apagados, o iPhone sin instalar; decisión 5 de
 * docs/rediseno/17). OL-480 (founder, 2026-10-29: «"en el teléfono aún no" no se entiende: debe decir la acción»): dice la acción, «Activa las
 * notificaciones en este teléfono», y tocar «Activar» las activa ahí mismo (el permiso del sistema, o en el iPhone sin instalar la hoja con los
 * pasos), sin mandar a Ajustes. Lo que llega por correo ya no se menciona: por correo solo llegará el boletín.
 */
export default function TelefonoAun({ llavePush }: { llavePush: string }) {
  const plataforma = usePlataforma();
  const [estado, setEstado] = useEstadoPush(llavePush);
  const [paso, setPaso] = useState<Paso>("pregunta");
  const [hoja, setHoja] = useState(false);
  const aqui = enEste(plataforma);
  if (paso === "pregunta" && estado !== "apagado" && estado !== "instalar-primero") return null;

  async function activar() {
    if (estado === "instalar-primero") return setHoja(true);
    setPaso("trabajando");
    try {
      const alta = await suscribirPush(llavePush);
      if (!alta.ok) return setPaso(alta.motivo === "bloqueado" ? "bloqueado" : "fallo");
      if (!(await guardarSuscripcionPush(alta.sub))) return setPaso("fallo");
      medirCliente("aviso_activado", { canal: "telefono" });
      setEstado("encendido");
      setPaso("listo");
    } catch {
      setPaso("fallo");
    }
  }
  async function cerrarHoja() {
    // Quiere avisos en el teléfono: queda dicho en la cuenta, y al abrir la app instalada se ofrece Activar (como la hoja de consentimiento).
    setHoja(false);
    setPaso((await elegirAvisos({ push: true }).catch(() => false)) ? "falta" : "fallo");
  }

  const icono = paso === "listo" ? <IconoOk width={22} height={22} /> : paso === "falta" || paso === "bloqueado" || paso === "fallo" ? <IconoPendiente width={22} height={22} />
    : plataforma?.computadora ? <IconoComputadora width={22} height={22} /> : <IconoTelefono width={22} height={22} />;
  const texto = {
    pregunta: `Activa las notificaciones ${aqui}`,
    trabajando: "Activando…",
    listo: `Listo: te avisamos ${aqui}`,
    falta: "Falta un paso: instálala y, al abrirla, toca Activar",
    bloqueado: `Quedaron bloqueadas: se activan ${dondeSeActivan(plataforma)}`,
    fallo: `No pudimos activarlas ${aqui}`,
  }[paso];
  const conBoton = paso === "pregunta" || paso === "trabajando" || paso === "fallo";
  return (
    <p className={styles.telefono} role={paso === "pregunta" ? undefined : "status"}>
      {icono}
      <span>{texto}</span>
      {conBoton && (
        <button type="button" onClick={activar} disabled={paso === "trabajando"}>
          {paso === "fallo" ? "Reintentar" : "Activar"}
        </button>
      )}
      {hoja && <HojaInstalar onCerrar={cerrarHoja} />}
    </p>
  );
}
