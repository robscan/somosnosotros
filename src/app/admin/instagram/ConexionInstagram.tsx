"use client";

import { useEffect, useState } from "react";
import Aviso from "@/components/ui/Aviso";
import { claseBoton } from "@/components/ui/Boton";
import BotonIcono from "@/components/ui/BotonIcono";
import Grupo from "@/components/ui/Grupo";
import Hoja from "@/components/ui/Hoja";
import hoja from "@/components/ui/Hoja.module.css";
import { IconoInstagram, IconoOk } from "@/components/ui/Iconos";
import renglon from "@/components/ui/Renglon.module.css";
import sesion from "@/components/Sesion.module.css";
import { CONFIRMACION_CONEXION, FRASES_CONEXION, type ClaveVuelta, type EstadoConexion } from "@/lib/instagram/conexionEstado";
import styles from "../admin.module.css";
import propios from "./ConexionInstagram.module.css";

/** «Conectar Instagram» y «Reconectar» llevan al inicio de sesión de Meta: una ruta que redirige a facebook.com (navegación completa). */
const CONECTAR = "/api/instagram/conectar";

/**
 * Lo que va bajo la cabecera de Administración › Instagram (OL-471, bitácora 503; OL-495, bitácora 527): al volver de Meta, una línea con la
 * confirmación o la frase llana de su error (se cierra con la ✕); y, solo si falta algo o caducó, el renglón suelto con la causa y su botón,
 * porque sin conexión no sale nada. Conectada, no ocupa nada: la conexión vive en el botón de las pestañas (`BotonConexion`) y su hoja.
 * La dirección pierde `?conectado` / `?error` en cuanto se pinta, para que recargar no lo repita.
 */
export default function ConexionInstagram({ estado, vuelta }: { estado: EstadoConexion; vuelta: ClaveVuelta | null }) {
  const [aviso, setAviso] = useState(vuelta);
  useEffect(() => {
    const u = new URL(window.location.href);
    if (!u.searchParams.has("conectado") && !u.searchParams.has("error")) return;
    u.searchParams.delete("conectado");
    u.searchParams.delete("error");
    window.history.replaceState(window.history.state, "", `${u.pathname}${u.search}${u.hash}`);
  }, []);
  return (
    <>
      {aviso === "conectado" && (
        <p className={`${styles.hecho} ${styles.conexionAviso}`} role="status">
          <IconoOk width={20} height={20} />
          <span>{CONFIRMACION_CONEXION}</span>
        </p>
      )}
      {aviso && aviso !== "conectado" && <Aviso className={styles.conexionAviso} texto={FRASES_CONEXION[aviso]} onCerrar={() => setAviso(null)} />}
      {estado.falta && (
        <Grupo>
          <li className={`${renglon.ajuste} ${renglon.sola}`}>
            <IconoInstagram width={20} height={20} />
            <b>{estado.titulo}</b>
            <small className={styles.conexionFalta}>{estado.detalle}</small>
            <a className={styles.pildora} href={CONECTAR}>
              {estado.boton}
            </a>
          </li>
        </Grupo>
      )}
    </>
  );
}

/** El botón de la conexión, a la derecha de las pestañas: el icono de Instagram con el punto de la barra de la app en verde, gris o rojo. */
export function BotonConexion({ estado, onAbrir }: { estado: EstadoConexion; onAbrir: () => void }) {
  return (
    <BotonIcono className={`${sesion.conPunto} ${propios.boton}`} aria-label={estado.etiqueta} aria-haspopup="dialog" onClick={onAbrir}>
      <IconoInstagram width={22} height={22} />
      <span className={`${sesion.punto} ${propios[estado.punto]}`} aria-hidden="true" />
    </BotonIcono>
  );
}

/** La hoja «Conexión con Instagram»: la cuenta y desde cuándo (o qué pasó), lo que puede, una nota llana y «Reconectar» o «Conectar Instagram». */
export function HojaConexion({ estado, onCerrar }: { estado: EstadoConexion; onCerrar: () => void }) {
  const h = estado.hoja;
  return (
    <Hoja
      etiqueta="Conexión con Instagram"
      titulo="Conexión con Instagram"
      onCerrar={onCerrar}
      pie={
        <a className={claseBoton({ variante: h.principal ? "primario" : "secundario" })} href={CONECTAR}>
          {estado.boton}
        </a>
      }
    >
      <ul className={renglon.tarjeta}>
        <li className={renglon.ajuste}>
          <IconoInstagram width={20} height={20} />
          <b>{h.cuenta}</b>
          <small className={estado.falta ? styles.conexionFalta : undefined}>{h.detalle}</small>
        </li>
      </ul>
      {h.puede.length > 0 && (
        <>
          <h2 className={styles.grupo}>Puede</h2>
          <ul className={styles.puede}>
            {h.puede.map((p) => (
              <li key={p}>
                <IconoOk width={18} height={18} />
                {p}
              </li>
            ))}
          </ul>
        </>
      )}
      <p className={h.puede.length ? hoja.nota : `${hoja.nota} ${propios.nota}`}>{h.nota}</p>
    </Hoja>
  );
}
