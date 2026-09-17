"use client";

import { useState, useTransition } from "react";
import Boton from "@/components/ui/Boton";
import Hoja from "@/components/ui/Hoja";
import { IconoEscudo, IconoOk } from "@/components/ui/Iconos";
import type { EstadoRol } from "@/lib/panel";
import { cambiarRol } from "../../acciones";
import styles from "../../admin.module.css";

/**
 * El renglón de Rol, al final y solo (decisión 9): el estado y la acción posible. Hacer o quitar administrador pasa por
 * una hoja que dice qué podrá o qué deja de ver, con un solo botón (se cierra con la ✕). Hecho, una línea lo confirma
 * y el renglón, que llega de nuevo del servidor, dice desde cuándo y quién.
 */
export default function RolPersona({ perfilId, nombre, estado }: { perfilId: string; nombre: string; estado: EstadoRol }) {
  const [hoja, setHoja] = useState<"hacer" | "quitar" | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enCamino, iniciar] = useTransition();
  const quien = nombre || "esta persona";

  function abrir(que: "hacer" | "quitar") {
    setError(null);
    setHoja(que);
  }
  function confirmar(rol: "admin" | "usuario") {
    setError(null);
    iniciar(async () => {
      const r = await cambiarRol(perfilId, rol);
      if (!r.ok) return setError(r.error);
      setHoja(null);
      setHecho(rol === "admin" ? "Ya es administrador" : "Ya no es administrador");
    });
  }

  return (
    <>
      {hecho && (
        <p className={styles.hecho} role="status">
          <IconoOk width={20} height={20} />
          <span>{hecho}</span>
        </p>
      )}
      <ul className={styles.tarjeta}>
        <li className={styles.fila}>
          <IconoEscudo width={20} height={20} />
          <b>{estado.etiqueta}</b>
          <small>{estado.detalle}</small>
          {estado.accion === "hacer" && (
            <button type="button" className={styles.pildora} onClick={() => abrir("hacer")} aria-haspopup="dialog">
              Hacer administrador
            </button>
          )}
          {estado.accion === "quitar" && (
            <button type="button" className={`${styles.pildora} ${styles.quitar}`} onClick={() => abrir("quitar")} aria-haspopup="dialog">
              Quitar
            </button>
          )}
        </li>
      </ul>
      {hoja === "hacer" && (
        <Hoja etiqueta="Hacer administrador" onCerrar={() => setHoja(null)}>
          <h3>¿Hacer administrador a {quien}?</h3>
          <p>Podrá:</p>
          <ul className={styles.puede}>
            <li>
              <IconoOk width={18} height={18} />
              Atender reportes y reclamos, y pasar fichas a otras cuentas
            </li>
            <li>
              <IconoOk width={18} height={18} />
              Ocultar, mostrar y editar cualquier lugar, evento o artista
            </li>
            <li>
              <IconoOk width={18} height={18} />
              Ver la actividad y el correo de todas las personas
            </li>
          </ul>
          <p className={styles.noPodra}>No podrá hacer ni quitar administradores.</p>
          {error && (
            <p className="aviso-error" role="alert">
              {error}
            </p>
          )}
          <Boton type="button" disabled={enCamino} onClick={() => confirmar("admin")}>
            {enCamino ? "Haciendo administrador…" : "Hacer administrador"}
          </Boton>
        </Hoja>
      )}
      {hoja === "quitar" && (
        <Hoja etiqueta="Quitar la administración" onCerrar={() => setHoja(null)}>
          <h3>¿Quitar la administración a {quien}?</h3>
          <p>Deja de ver Administración. Lo que publicó, ocultó o atendió se queda como está.</p>
          {error && (
            <p className="aviso-error" role="alert">
              {error}
            </p>
          )}
          <Boton type="button" variante="peligro" disabled={enCamino} onClick={() => confirmar("usuario")}>
            {enCamino ? "Quitando…" : "Quitar administración"}
          </Boton>
        </Hoja>
      )}
    </>
  );
}
