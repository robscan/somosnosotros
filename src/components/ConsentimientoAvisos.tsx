"use client";

import { useEffect, useState } from "react";
import HojaInstalar from "./HojaInstalar";
import { dondeSeActivan, enEste } from "@/lib/plataforma";
import { disponibilidadPush, suscribirPush } from "@/lib/pushCliente";
import { useInstalarApp, usePlataforma } from "@/lib/useAvisosTelefono";
import { elegirAvisos } from "@/app/avisos/acciones";
import { marcarAvisosContestados } from "@/lib/avisosPreguntados";
import { guardarSuscripcionPush } from "@/app/perfil/acciones";
import { IconoCalendarioAgregar, IconoInstalar, IconoInstalarComputadora, IconoOk, IconoPendiente } from "./ui/Iconos";
import styles from "./ConsentimientoAvisos.module.css";

/** "voy": tras el primer Voy a un evento. "seguir": al seguir un lugar. "seguir-artista": al seguir a un artista. Misma pregunta, distinta promesa. */
type Contexto = "voy" | "seguir" | "seguir-artista";
type Props = {
  contexto?: Contexto;
  titulo: string;
  /** El id de quien contesta: la respuesta queda apuntada para su cuenta (lib/avisosPreguntados). */
  cuenta: string;
  correo: string;
  llavePush: string;
  onListo?: () => void;
  /** Solo Voy: el archivo de calendario del evento, que se ofrece a quien no quiere avisos (decisión 14 de docs/rediseno/17). */
  calendarioUrl?: string;
};

const COPY: Record<Contexto, { motivo: (t: string) => string; porque: string; pregunta: string; cuando: string; promesa: string }> = {
  voy: { motivo: (t) => `Vas a ${t}`, porque: "Ya estás en la lista de quien va.", pregunta: "¿Te recordamos ese día?", cuando: "ese día", promesa: "ese día" },
  seguir: { motivo: (t) => `Sigues ${t}`, porque: "Sus eventos nuevos aparecerán en Siguiendo.", pregunta: "¿Te avisamos de sus eventos?", cuando: "cuando publiquen algo", promesa: "de sus eventos" },
  "seguir-artista": { motivo: (t) => `Sigues a ${t}`, porque: "Sus fechas nuevas aparecerán en Siguiendo.", pregunta: "¿Te avisamos de sus fechas?", cuando: "cuando publiquen una fecha", promesa: "de sus fechas" },
};
/** El teléfono: sin contestar, dado de alta, falta instalar (iPhone en Safari) o no. */
type Telefono = null | "hecho" | "pendiente" | "no";
/** Lo que impidió el alta en este teléfono; se dice con su causa y su salida (decisión 8). */
type Problema = null | "bloqueado" | "fallo" | "no-soportado" | "otra-app";

/**
 * Tras el primer "Voy" (o al seguir un lugar o artista): una pregunta, dos canales, una decisión a la vez
 * (docs/rediseno/02, decisión 10). "¿Te recordamos ese día?" Por correo · En el teléfono · No, gracias. Al elegir uno se
 * confirma con evidencia y se ofrece el otro una sola vez. El correo también se pide: un correo no pedido se marca como spam.
 * Con docs/rediseno/17: en iPhone sin instalar sale la hoja con los pasos y queda "Falta un paso" (nunca una palomita
 * antes de tiempo); lo que no se puede se dice con su causa y el correo como salida, y un "sí" nunca se guarda como "no";
 * dado de alta en Chrome o Android se ofrece instalar en un toque; y a quien no quiere avisos, su calendario.
 */
export default function ConsentimientoAvisos({ contexto = "voy", titulo, cuenta, correo, llavePush, onListo, calendarioUrl }: Props) {
  const copy = COPY[contexto];
  const plataforma = usePlataforma();
  const { puede: puedeInstalar, instalar } = useInstalarApp();
  const [correoOk, setCorreoOk] = useState<boolean | null>(null);
  const [telefono, setTelefono] = useState<Telefono>(null);
  const [problema, setProblema] = useState<Problema>(null);
  const [hoja, setHoja] = useState(false);
  const [instalada, setInstalada] = useState(false);
  /** Lo que no se pudo guardar, con qué repetirlo. */
  const [fallo, setFallo] = useState<{ reintentar: () => void } | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const aqui = enEste(plataforma);
  const enElTelefono = plataforma?.computadora ? "En esta computadora" : "En el teléfono";

  /**
   * Toda respuesta de la hoja pasa por aquí: la nueva cierra el aviso de un fallo anterior, cuyo Reintentar guardaría lo
   * que la persona ya no eligió (un "No" tras un "Sí" que falló, "Ahora no" tras "Por correo").
   */
  const responder = (accion: () => unknown) => () => {
    setFallo(null);
    accion();
  };

  /**
   * Guarda con la hoja ocupada. Si no se pudo (o no hay red), dice «No se pudo guardar · Reintentar» y devuelve false: la
   * hoja sigue como estaba, sin dar por hecho lo que no quedó guardado y sin cerrarse sola.
   */
  async function guardar(accion: () => Promise<boolean>, reintentar: () => void): Promise<boolean> {
    setTrabajando(true);
    let ok = false;
    try {
      ok = await accion();
    } catch {
      ok = false;
    } finally {
      setTrabajando(false);
    }
    if (!ok) setFallo({ reintentar });
    return ok;
  }

  async function porCorreo() {
    if (!(await guardar(() => elegirAvisos({ correo: true }), porCorreo))) return;
    marcarAvisosContestados(cuenta);
    setCorreoOk(true);
    // Con un problema del teléfono a la vista, el correo cierra el asunto: el teléfono queda como estaba.
    if (problema) {
      setProblema(null);
      setTelefono("no");
    }
  }
  async function enTelefono() {
    setTrabajando(true);
    try {
      const estado = disponibilidadPush(llavePush);
      if (estado === "instalar-primero") return setHoja(true);
      if (estado === "otra-app" || estado === "no-soportado" || estado === "bloqueado") return setProblema(estado);
      const alta = await suscribirPush(llavePush);
      if (!alta.ok) return setProblema(alta.motivo);
      if (await guardarSuscripcionPush(alta.sub)) {
        marcarAvisosContestados(cuenta);
        setProblema(null);
        setTelefono("hecho");
      } else setProblema("fallo");
    } catch {
      // Sin red, o el teléfono no respondió: como cualquier alta que no se pudo, con Intentar de nuevo.
      setProblema("fallo");
    } finally {
      setTrabajando(false);
    }
  }
  async function noGracias() {
    // "Sin avisos" solo cuando quedó guardado; si no, la pregunta sigue a la vista con Reintentar.
    if (!(await guardar(() => elegirAvisos({ correo: false, push: false }), noGracias))) return;
    marcarAvisosContestados(cuenta);
    setCorreoOk(false);
    setTelefono("no");
  }
  /** "Ahora no" ante un problema: no se guarda nada; la pregunta vuelve en el siguiente Voy o Seguir. */
  function ahoraNo() {
    setProblema(null);
    setTelefono("no");
    if (correoOk === null) setCorreoOk(false);
  }
  async function cerrarHoja() {
    // Quiere avisos en el teléfono: queda dicho en la cuenta, y al abrir la app instalada se ofrece Activar (decisión 4).
    // "Falta un paso" solo cuando quedó guardado.
    setHoja(false);
    if (!(await guardar(() => elegirAvisos({ push: true }), cerrarHoja))) return;
    marcarAvisosContestados(cuenta);
    setTelefono("pendiente");
  }
  async function tenerlaEnInicio() {
    if (await instalar()) setInstalada(true);
  }

  const terminado = correoOk !== null && telefono !== null;
  const conInstalar = terminado && telefono === "hecho" && (puedeInstalar || instalada);
  const conCalendario = terminado && !correoOk && telefono === "no" && !!calendarioUrl;
  // Se cierra sola solo si no queda nada que leer ni tocar: el paso que falta, instalar o el calendario.
  const cierraSola = terminado && telefono !== "pendiente" && !conInstalar && !conCalendario;
  useEffect(() => {
    if (!cierraSola || !onListo) return;
    const id = setTimeout(onListo, 1600);
    return () => clearTimeout(id);
  }, [cierraSola, onListo]);

  const ok = <IconoOk width={18} height={18} />;
  const pendiente = <IconoPendiente width={18} height={18} />;
  const cambiar = <p className={styles.cambiar}>Se cambia en Ajustes.</p>;
  const preguntaCorreo = (pregunta: string) => (
    <>
      <p className={styles.pregunta}>{pregunta}</p>
      <div className={`${styles.opciones} ${styles.cortas}`}>
        <button type="button" className={styles.si} onClick={responder(porCorreo)} disabled={trabajando}>
          Sí
        </button>
        <button type="button" className={styles.no} onClick={responder(() => setCorreoOk(false))} disabled={trabajando}>
          No
        </button>
      </div>
    </>
  );
  const faltaUnPaso = (
    <>
      <p className={`${styles.hecho} ${styles.pendiente}`}>
        {pendiente}
        <span>
          <b>Falta un paso:</b> instálala y, al abrirla, toca Activar.
        </span>
      </p>
      <button type="button" className={styles.enlace} onClick={responder(() => setHoja(true))}>
        Ver los pasos
      </button>
    </>
  );

  let cuerpo: React.ReactNode;
  if (problema) {
    const causa =
      problema === "bloqueado" ? (
        <>
          <b>Los avisos quedaron bloqueados {aqui}.</b> Se activan {dondeSeActivan(plataforma)}.
        </>
      ) : problema === "fallo" ? (
        <b>No pudimos darte de alta {aqui}.</b>
      ) : problema === "otra-app" ? (
        <>
          <b>Aquí no llegan avisos:</b> estás en el navegador de {plataforma?.deOtraApp}. Ábrela en {plataforma?.ios ? "Safari" : "tu navegador"}.
        </>
      ) : (
        <b>Este navegador no recibe avisos.</b>
      );
    cuerpo = (
      <>
        <p className={`${styles.hecho} ${styles.pendiente}`}>
          {pendiente}
          <span>{causa}</span>
        </p>
        <div className={`${styles.opciones} ${styles.cortas}`}>
          {problema === "fallo" && (
            <button type="button" className={styles.si} onClick={responder(enTelefono)} disabled={trabajando}>
              Intentar de nuevo
            </button>
          )}
          {correoOk === null && (
            <button type="button" className={problema === "fallo" ? styles.no : styles.si} onClick={responder(porCorreo)} disabled={trabajando}>
              Por correo
            </button>
          )}
        </div>
        <button type="button" className={styles.gracias} onClick={responder(ahoraNo)} disabled={trabajando}>
          Ahora no
        </button>
      </>
    );
  } else if (correoOk === null && telefono === null) {
    cuerpo = (
      <>
        <p className={styles.pregunta}>{copy.pregunta}</p>
        <div className={styles.opciones}>
          <button type="button" className={styles.si} onClick={responder(porCorreo)} disabled={trabajando}>
            Por correo
          </button>
          <button type="button" className={styles.si} onClick={responder(enTelefono)} disabled={trabajando}>
            {enElTelefono}
          </button>
        </div>
        <button type="button" className={styles.gracias} onClick={responder(noGracias)} disabled={trabajando}>
          No, gracias
        </button>
      </>
    );
  } else if (correoOk === true && telefono === null) {
    cuerpo = (
      <>
        <p className={styles.hecho}>
          {ok}
          <span>
            Te escribimos a {correo} {copy.cuando}.
          </span>
        </p>
        <p className={styles.pregunta}>¿También {enElTelefono.toLowerCase()}?</p>
        <div className={`${styles.opciones} ${styles.cortas}`}>
          <button type="button" className={styles.si} onClick={responder(enTelefono)} disabled={trabajando}>
            Sí
          </button>
          <button type="button" className={styles.no} onClick={responder(() => setTelefono("no"))} disabled={trabajando}>
            No
          </button>
        </div>
      </>
    );
  } else if (telefono === "hecho" && correoOk === null) {
    cuerpo = (
      <>
        <p className={styles.hecho}>
          {ok}
          <span>
            Te avisamos {aqui} {copy.cuando}.
          </span>
        </p>
        {preguntaCorreo("¿También por correo?")}
      </>
    );
  } else if (telefono === "pendiente") {
    cuerpo = (
      <>
        {faltaUnPaso}
        {correoOk === null ? (
          preguntaCorreo("Mientras, ¿por correo?")
        ) : (
          <>
            {correoOk && (
              <p className={styles.hecho}>
                {ok}
                <span>
                  Mientras, te escribimos a {correo} {copy.cuando}.
                </span>
              </p>
            )}
            {cambiar}
          </>
        )}
      </>
    );
  } else {
    const canales = [correoOk && "por correo", telefono === "hecho" && aqui].filter(Boolean);
    cuerpo = canales.length ? (
      <>
        <p className={styles.hecho}>
          {ok}
          <span>
            Te avisamos {canales.join(" y ")} {copy.promesa}.
          </span>
        </p>
        {cambiar}
        {conInstalar &&
          (instalada ? (
            <p className={`${styles.hecho} ${styles.separado}`}>
              {ok}
              <span>Instalada: {plataforma?.computadora ? "se abre en su propia ventana" : "está en tu inicio"}.</span>
            </p>
          ) : (
            <button type="button" className={styles.linea} onClick={responder(tenerlaEnInicio)}>
              {plataforma?.computadora ? <IconoInstalarComputadora width={22} height={22} /> : <IconoInstalar width={22} height={22} />}
              <b>{plataforma?.computadora ? "Tenla como app" : "Tenla en tu inicio"}</b>
              <small>{plataforma?.computadora ? "En su propia ventana" : "Un toque, sin tienda"}</small>
              <span className={styles.pildora}>Instalar</span>
            </button>
          ))}
      </>
    ) : (
      <>
        <p className={styles.hecho}>
          <span>Sin avisos. Se cambia en Ajustes.</span>
        </p>
        {conCalendario && (
          <a href={calendarioUrl} className={styles.linea}>
            <IconoCalendarioAgregar width={22} height={22} />
            <b>A mi calendario</b>
            <small>Con una alerta 1 hora antes</small>
            <span className={styles.pildora}>Agregar</span>
          </a>
        )}
      </>
    );
  }

  return (
    <div className={styles.consent} role="status">
      <p className={styles.motivo}>{copy.motivo(titulo)}</p>
      <p className={styles.porque}>{copy.porque}</p>
      {cuerpo}
      {fallo && (
        <p className={styles.nota} role="alert">
          No se pudo guardar.
          <button type="button" className={styles.enlace} onClick={responder(fallo.reintentar)} disabled={trabajando}>
            Reintentar
          </button>
        </p>
      )}
      {hoja && <HojaInstalar onCerrar={responder(cerrarHoja)} />}
    </div>
  );
}
