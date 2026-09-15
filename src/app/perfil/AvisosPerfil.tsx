"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import HojaInstalar from "@/components/HojaInstalar";
import Hoja from "@/components/ui/Hoja";
import { elegirAvisos } from "@/app/avisos/acciones";
import { textoAvisos } from "@/lib/perfil";
import { desuscribirPush, estadoPush, suscribirPush } from "@/lib/pushCliente";
import { borrarSuscripcionPush, guardarSuscripcionPush } from "./acciones";
import styles from "./AvisosPerfil.module.css";

type Props = { correo: boolean; telefono: boolean; correoTexto: string; llavePush: string };

/**
 * Renglón de estado "Avisos · Por correo y en el teléfono" con Cambiar → hoja con dos interruptores que se guardan
 * al tocar (decisión 7). En iPhone sin instalar, la hoja de instalar. `?avisos=1` (desde el menú ···) la abre al llegar.
 */
export default function AvisosPerfil({ correo: correoInicial, telefono: telefonoInicial, correoTexto, llavePush }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [abierta, setAbierta] = useState(() => params.get("avisos") === "1");
  const [correo, setCorreo] = useState(correoInicial);
  const [telefono, setTelefono] = useState(telefonoInicial);
  const [trabajando, setTrabajando] = useState(false);
  const [instalar, setInstalar] = useState(false);
  const [nota, setNota] = useState<string | null>(null);

  function cerrar() {
    setAbierta(false);
    setNota(null);
    router.refresh(); // el renglón lee lo recién guardado
    if (params.get("avisos")) router.replace("/perfil");
  }

  async function cambiarCorreo() {
    const nuevo = !correo;
    setTrabajando(true);
    setNota(null);
    const ok = await elegirAvisos({ correo: nuevo });
    setTrabajando(false);
    if (ok) setCorreo(nuevo);
    else setNota("No se pudo guardar. Intenta de nuevo.");
  }

  async function cambiarTelefono() {
    setTrabajando(true);
    setNota(null);
    try {
      if (telefono) {
        const endpoint = await desuscribirPush();
        if (endpoint) await borrarSuscripcionPush(endpoint);
        else await elegirAvisos({ push: false });
        setTelefono(false);
        return;
      }
      const estado = await estadoPush(llavePush);
      if (estado === "instalar-primero") {
        setInstalar(true);
        return;
      }
      if (estado === "no-soportado") {
        setNota("Este navegador no puede recibir avisos.");
        return;
      }
      if (estado === "bloqueado") {
        setNota("Los avisos están bloqueados para este sitio en tu teléfono. Actívalos en los ajustes y vuelve a intentar.");
        return;
      }
      const r = await suscribirPush(llavePush);
      if (!r.ok) {
        setNota(r.estado === "bloqueado" ? "Los avisos quedaron bloqueados en este navegador." : "No se activaron los avisos.");
        return;
      }
      const ok = await guardarSuscripcionPush(r.sub);
      if (ok) setTelefono(true);
      else setNota("No se pudo guardar. Intenta de nuevo.");
    } catch {
      setNota("No se activaron los avisos.");
    } finally {
      setTrabajando(false);
    }
  }
  async function cerrarInstalar() {
    // Quiere avisos en el teléfono: queda dicho; el permiso se pide al abrir la app instalada.
    setInstalar(false);
    await elegirAvisos({ push: true });
    setTelefono(true);
  }

  const estado = textoAvisos(correo, telefono);
  return (
    <li className={styles.dato}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16zM10 20a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <b>Avisos · {estado}</b>
      <small>{correo || telefono ? "El día de un evento al que vas y cuando publiquen lo que sigues" : "No te avisamos de nada"}</small>
      <button type="button" onClick={() => setAbierta(true)} aria-haspopup="dialog">
        Cambiar
      </button>
      {abierta && (
        <Hoja etiqueta="Avisos" onCerrar={cerrar}>
          <h3 className={styles.titulo}>Avisos</h3>
          <p className={styles.porque}>El día de un evento al que vas y cuando publiquen lo que sigues. Se guarda al tocar.</p>
          <div className={styles.interruptor}>
            <span>
              Por correo
              <small>{correoTexto} · cada correo trae su baja</small>
            </span>
            <button type="button" role="switch" aria-checked={correo} aria-label="Por correo" className={styles.palanca} onClick={cambiarCorreo} disabled={trabajando} />
          </div>
          <div className={styles.interruptor}>
            <span>
              En el teléfono
              <small>Solo con la app instalada en inicio</small>
            </span>
            <button type="button" role="switch" aria-checked={telefono} aria-label="En el teléfono" className={styles.palanca} onClick={cambiarTelefono} disabled={trabajando} />
          </div>
          {nota && (
            <p className={styles.nota} role="status">
              {nota}
            </p>
          )}
          {instalar && <HojaInstalar onCerrar={cerrarInstalar} />}
        </Hoja>
      )}
    </li>
  );
}
