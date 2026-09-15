"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import HojaInstalar from "@/components/HojaInstalar";
import { IconoCorreo, IconoTelefono } from "@/components/ui/Iconos";
import { elegirAvisos } from "@/app/avisos/acciones";
import { desuscribirPush, estadoPush, suscribirPush } from "@/lib/pushCliente";
import ajustes from "@/app/ajustes/ajustes.module.css";
import { borrarSuscripcionPush, guardarSuscripcionPush } from "./acciones";

type Props = { correo: boolean; telefono: boolean; correoTexto: string; llavePush: string };

/**
 * Las dos filas de Avisos en Ajustes, cada una con su interruptor, que guardan al tocar (decisión 7 de docs/rediseno/13).
 * En iPhone sin instalar, la hoja de instalar; si el navegador bloquea los avisos, se dice en una nota.
 */
export default function AvisosPerfil({ correo: correoInicial, telefono: telefonoInicial, correoTexto, llavePush }: Props) {
  const router = useRouter();
  const [correo, setCorreo] = useState(correoInicial);
  const [telefono, setTelefono] = useState(telefonoInicial);
  const [trabajando, setTrabajando] = useState(false);
  const [instalar, setInstalar] = useState(false);
  const [nota, setNota] = useState<string | null>(null);

  async function cambiarCorreo() {
    const nuevo = !correo;
    setTrabajando(true);
    setNota(null);
    const ok = await elegirAvisos({ correo: nuevo });
    setTrabajando(false);
    if (ok) {
      setCorreo(nuevo);
      router.refresh();
    } else setNota("No se pudo guardar. Intenta de nuevo.");
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
        router.refresh();
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
      if (ok) {
        setTelefono(true);
        router.refresh();
      } else setNota("No se pudo guardar. Intenta de nuevo.");
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
    router.refresh();
  }

  return (
    <>
      <li className={ajustes.fila}>
        <IconoCorreo width={20} height={20} />
        <b>Por correo</b>
        <small>{correoTexto} · cada correo trae su baja</small>
        <button type="button" role="switch" aria-checked={correo} aria-label="Avisos por correo" className={ajustes.palanca} onClick={cambiarCorreo} disabled={trabajando} />
      </li>
      <li className={ajustes.fila}>
        <IconoTelefono width={20} height={20} />
        <b>En el teléfono</b>
        <small>{telefono ? "Activados en este teléfono" : "Solo con la app instalada en inicio"}</small>
        <button type="button" role="switch" aria-checked={telefono} aria-label="Avisos en el teléfono" className={ajustes.palanca} onClick={cambiarTelefono} disabled={trabajando} />
      </li>
      {nota && (
        <li className={ajustes.nota} role="status">
          {nota}
        </li>
      )}
      {instalar && <HojaInstalar onCerrar={cerrarInstalar} />}
    </>
  );
}
