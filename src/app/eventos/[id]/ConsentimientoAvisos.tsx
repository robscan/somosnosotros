"use client";

import { useState } from "react";
import HojaInstalar from "@/components/HojaInstalar";
import { estadoPush, suscribirPush } from "@/lib/pushCliente";
import { elegirAvisos } from "@/app/avisos/acciones";
import { guardarSuscripcionPush } from "@/app/perfil/acciones";
import styles from "./ficha.module.css";

type Props = { titulo: string; correo: string; llavePush: string; onListo?: () => void };
type Canal = null | boolean;

/**
 * Tras el primer "Voy": una pregunta, dos canales, una decisión a la vez.
 * "¿Te recordamos ese día?" Por correo · En el teléfono · No, gracias. Al elegir uno se confirma con
 * evidencia y se ofrece el otro una sola vez. El correo también se pide: un correo no pedido se marca
 * como spam y bloquea la entrega del dominio (docs/rediseno/02-inicio-flujo-y-estados.md, decisión 10).
 */
export default function ConsentimientoAvisos({ titulo, correo, llavePush }: Props) {
  const [correoOk, setCorreoOk] = useState<Canal>(null);
  const [telefonoOk, setTelefonoOk] = useState<Canal>(null);
  const [hoja, setHoja] = useState(false);
  const [nota, setNota] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  async function porCorreo() {
    setTrabajando(true);
    const ok = await elegirAvisos({ correo: true });
    setTrabajando(false);
    if (ok) setCorreoOk(true);
    else setNota("No se pudo guardar. Intenta de nuevo.");
  }
  async function enTelefono() {
    setTrabajando(true);
    try {
      const estado = await estadoPush(llavePush);
      if (estado === "instalar-primero") {
        setHoja(true);
        return;
      }
      if (estado === "no-soportado") {
        setNota("Este navegador no puede recibir avisos. Te avisamos por correo si lo eliges.");
        setTelefonoOk(false);
        await elegirAvisos({ push: false });
        return;
      }
      if (estado === "bloqueado") {
        setNota("Los avisos están bloqueados para este sitio en tu teléfono. Actívalos en los ajustes y vuelve a intentar.");
        setTelefonoOk(false);
        await elegirAvisos({ push: false });
        return;
      }
      const r = await suscribirPush(llavePush);
      if (!r.ok) {
        setNota(r.estado === "bloqueado" ? "Los avisos quedaron bloqueados en este navegador." : "No se activaron los avisos.");
        setTelefonoOk(false);
        await elegirAvisos({ push: false });
        return;
      }
      const ok = await guardarSuscripcionPush(r.sub);
      setTelefonoOk(ok);
      if (!ok) setNota("No se pudo guardar. Intenta de nuevo.");
    } catch {
      setNota("No se activaron los avisos.");
      setTelefonoOk(false);
    } finally {
      setTrabajando(false);
    }
  }
  async function noGracias() {
    setCorreoOk(false);
    setTelefonoOk(false);
    await elegirAvisos({ correo: false, push: false });
  }
  async function cerrarHoja() {
    // Al cerrar la hoja de instalar, la decisión del teléfono queda registrada como "quiere"; el permiso
    // se pide al abrir la app instalada (Después: acepta los avisos).
    setHoja(false);
    setTelefonoOk(true);
    await elegirAvisos({ push: true });
  }

  const ok = (
    <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">
      <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  let cuerpo: React.ReactNode;
  if (correoOk === null && telefonoOk === null) {
    cuerpo = (
      <>
        <p className={styles.consentPregunta}>¿Te recordamos ese día?</p>
        <div className={styles.consentOpciones}>
          <button type="button" className={styles.consentSi} onClick={porCorreo} disabled={trabajando}>
            Por correo
          </button>
          <button type="button" className={styles.consentSi} onClick={enTelefono} disabled={trabajando}>
            En el teléfono
          </button>
        </div>
        <button type="button" className={styles.consentGracias} onClick={noGracias} disabled={trabajando}>
          No, gracias
        </button>
      </>
    );
  } else if (correoOk === true && telefonoOk === null) {
    cuerpo = (
      <>
        <p className={styles.consentHecho}>
          {ok}
          <span>Te escribimos a {correo} ese día.</span>
        </p>
        <p className={styles.consentPregunta}>¿También en el teléfono?</p>
        <div className={`${styles.consentOpciones} ${styles.consentCortas}`}>
          <button type="button" className={styles.consentSi} onClick={enTelefono} disabled={trabajando}>
            Sí
          </button>
          <button type="button" className={styles.consentNo} onClick={() => setTelefonoOk(false)} disabled={trabajando}>
            No
          </button>
        </div>
      </>
    );
  } else if (telefonoOk === true && correoOk === null) {
    cuerpo = (
      <>
        <p className={styles.consentHecho}>
          {ok}
          <span>Te avisamos en este teléfono ese día.</span>
        </p>
        <p className={styles.consentPregunta}>¿También por correo?</p>
        <div className={`${styles.consentOpciones} ${styles.consentCortas}`}>
          <button type="button" className={styles.consentSi} onClick={porCorreo} disabled={trabajando}>
            Sí
          </button>
          <button type="button" className={styles.consentNo} onClick={() => setCorreoOk(false)} disabled={trabajando}>
            No
          </button>
        </div>
      </>
    );
  } else {
    const canales = [correoOk && "por correo", telefonoOk && "en el teléfono"].filter(Boolean);
    cuerpo = canales.length ? (
      <>
        <p className={styles.consentHecho}>
          {ok}
          <span>Te avisamos {canales.join(" y ")} ese día.</span>
        </p>
        <p className={styles.consentCambiar}>Se cambia en Mi perfil.</p>
      </>
    ) : (
      <p className={styles.consentHecho}>
        <span>Sin avisos. Si cambias de idea, está en Mi perfil.</span>
      </p>
    );
  }

  return (
    <div className={styles.consent} role="status">
      <p className={styles.consentMotivo}>Vas a {titulo}</p>
      {cuerpo}
      {nota && <p className={styles.consentNota}>{nota}</p>}
      {hoja && <HojaInstalar onCerrar={cerrarHoja} />}
    </div>
  );
}
