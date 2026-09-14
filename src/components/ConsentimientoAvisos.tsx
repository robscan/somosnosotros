"use client";

import { useEffect, useState } from "react";
import HojaInstalar from "./HojaInstalar";
import { estadoPush, suscribirPush } from "@/lib/pushCliente";
import { elegirAvisos } from "@/app/avisos/acciones";
import { guardarSuscripcionPush } from "@/app/perfil/acciones";
import { IconoOk } from "./ui/Iconos";
import styles from "./ConsentimientoAvisos.module.css";

/** "voy": tras el primer Voy a un evento. "seguir": al seguir un lugar. Misma pregunta, distinta promesa. */
type Contexto = "voy" | "seguir";
type Props = { contexto?: Contexto; titulo: string; correo: string; llavePush: string; onListo?: () => void };

const COPY: Record<Contexto, { motivo: (t: string) => string; porque: string; pregunta: string; cuando: string; promesa: string }> = {
  voy: { motivo: (t) => `Vas a ${t}`, porque: "Ya estás en la lista de quien va.", pregunta: "¿Te recordamos ese día?", cuando: "ese día", promesa: "ese día" },
  seguir: { motivo: (t) => `Sigues ${t}`, porque: "Sus eventos nuevos aparecerán en Siguiendo.", pregunta: "¿Te avisamos de sus eventos?", cuando: "cuando publiquen algo", promesa: "de sus eventos" },
};
type Canal = null | boolean;

/**
 * Tras el primer "Voy" (o al seguir un lugar): una pregunta, dos canales, una decisión a la vez.
 * "¿Te recordamos ese día?" Por correo · En el teléfono · No, gracias. Al elegir uno se confirma con
 * evidencia y se ofrece el otro una sola vez. El correo también se pide: un correo no pedido se marca
 * como spam y bloquea la entrega del dominio (docs/rediseno/02-inicio-flujo-y-estados.md, decisión 10).
 */
export default function ConsentimientoAvisos({ contexto = "voy", titulo, correo, llavePush, onListo }: Props) {
  const copy = COPY[contexto];
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

  const terminado = correoOk !== null && telefonoOk !== null;
  useEffect(() => {
    if (!terminado || !onListo) return;
    const id = setTimeout(onListo, 1600);
    return () => clearTimeout(id);
  }, [terminado, onListo]);

  const ok = <IconoOk width={18} height={18} />;

  let cuerpo: React.ReactNode;
  if (correoOk === null && telefonoOk === null) {
    cuerpo = (
      <>
        <p className={styles.pregunta}>{copy.pregunta}</p>
        <div className={styles.opciones}>
          <button type="button" className={styles.si} onClick={porCorreo} disabled={trabajando}>
            Por correo
          </button>
          <button type="button" className={styles.si} onClick={enTelefono} disabled={trabajando}>
            En el teléfono
          </button>
        </div>
        <button type="button" className={styles.gracias} onClick={noGracias} disabled={trabajando}>
          No, gracias
        </button>
      </>
    );
  } else if (correoOk === true && telefonoOk === null) {
    cuerpo = (
      <>
        <p className={styles.hecho}>
          {ok}
          <span>Te escribimos a {correo} {copy.cuando}.</span>
        </p>
        <p className={styles.pregunta}>¿También en el teléfono?</p>
        <div className={`${styles.opciones} ${styles.cortas}`}>
          <button type="button" className={styles.si} onClick={enTelefono} disabled={trabajando}>
            Sí
          </button>
          <button type="button" className={styles.no} onClick={() => setTelefonoOk(false)} disabled={trabajando}>
            No
          </button>
        </div>
      </>
    );
  } else if (telefonoOk === true && correoOk === null) {
    cuerpo = (
      <>
        <p className={styles.hecho}>
          {ok}
          <span>Te avisamos en este teléfono {copy.cuando}.</span>
        </p>
        <p className={styles.pregunta}>¿También por correo?</p>
        <div className={`${styles.opciones} ${styles.cortas}`}>
          <button type="button" className={styles.si} onClick={porCorreo} disabled={trabajando}>
            Sí
          </button>
          <button type="button" className={styles.no} onClick={() => setCorreoOk(false)} disabled={trabajando}>
            No
          </button>
        </div>
      </>
    );
  } else {
    const canales = [correoOk && "por correo", telefonoOk && "en el teléfono"].filter(Boolean);
    cuerpo = canales.length ? (
      <>
        <p className={styles.hecho}>
          {ok}
          <span>Te avisamos {canales.join(" y ")} {copy.promesa}.</span>
        </p>
        <p className={styles.cambiar}>Se cambia en Mi perfil.</p>
      </>
    ) : (
      <p className={styles.hecho}>
        <span>Sin avisos. Si cambias de idea, está en Mi perfil.</span>
      </p>
    );
  }

  return (
    <div className={styles.consent} role="status">
      <p className={styles.motivo}>{copy.motivo(titulo)}</p>
      <p className={styles.porque}>{copy.porque}</p>
      {cuerpo}
      {nota && <p className={styles.nota}>{nota}</p>}
      {hoja && <HojaInstalar onCerrar={cerrarHoja} />}
    </div>
  );
}
