"use client";

import { useEffect, useState } from "react";
import Aviso from "@/components/ui/Aviso";
import Grupo from "@/components/ui/Grupo";
import { IconoInstagram, IconoOk } from "@/components/ui/Iconos";
import renglon from "@/components/ui/Renglon.module.css";
import { CONFIRMACION_CONEXION, FRASES_CONEXION, type ClaveVuelta, type EstadoConexion } from "@/lib/instagram/conexionEstado";
import styles from "../admin.module.css";

/**
 * El bloque «Conexión» de Administración › Instagram (OL-471, bitácora 503), arriba de la lista: un renglón de ajuste suelto con la cuenta
 * conectada (o que no hay conexión propia), qué puede y desde cuándo (o qué falta), y «Conectar Instagram» / «Reconectar», que lleva al inicio
 * de sesión de Meta (`/api/instagram/conectar`). Al volver de Meta, una línea: la confirmación o la frase llana de su error (se cierra con la ✕).
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
      <Grupo titulo="Conexión">
        <li className={`${renglon.ajuste} ${renglon.sola}`}>
          <IconoInstagram width={20} height={20} />
          <b>{estado.titulo}</b>
          <small className={estado.falta ? styles.conexionFalta : undefined}>{estado.detalle}</small>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- no es una página: la ruta redirige a facebook.com, va con navegación completa */}
          <a className={styles.pildora} href="/api/instagram/conectar">
            {estado.boton}
          </a>
        </li>
      </Grupo>
    </>
  );
}
