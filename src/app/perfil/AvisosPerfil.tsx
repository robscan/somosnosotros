"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import HojaInstalar from "@/components/HojaInstalar";
import { IconoComputadora, IconoCorreo, IconoTelefono } from "@/components/ui/Iconos";
import { elegirAvisos } from "@/app/avisos/acciones";
import { enEste, type EstadoPush, type Plataforma } from "@/lib/plataforma";
import { desuscribirPush, suscribirPush } from "@/lib/pushCliente";
import { useEstadoPush, usePlataforma } from "@/lib/useAvisosTelefono";
import ajustes from "@/app/ajustes/ajustes.module.css";
import { borrarSuscripcionPush, guardarSuscripcionPush } from "./acciones";

type Props = { correo: boolean; correoTexto: string; llavePush: string };

/** El subtítulo dice el estado de ESTE teléfono (decisión 5 de docs/rediseno/17), no la marca de la cuenta. */
function subtitulo(estado: EstadoPush | null, p: Plataforma | null): string {
  const aqui = enEste(p);
  switch (estado) {
    case "encendido":
      return `Activados ${aqui}`;
    case "apagado":
      return `Apagados ${aqui}`;
    case "instalar-primero":
      return "Instala la app para recibirlos";
    case "bloqueado":
      return p?.ios ? "Bloqueados: se activan en Ajustes del iPhone" : "Bloqueados: se activan en la configuración del sitio";
    case "otra-app":
      return `Este navegador no los recibe: ábrela en ${p?.ios ? "Safari" : "tu navegador"}`;
    case "no-soportado":
      return "Este navegador no los recibe";
    default:
      return " ";
  }
}

/**
 * Las dos filas de Avisos en Ajustes, cada una con su interruptor, que guardan al tocar (decisión 7 de docs/rediseno/13).
 * El teléfono dice su verdad: encendido solo si este teléfono está dado de alta; en Safari del iPhone abre la hoja de
 * instalar; bloqueado o sin avisos, el interruptor no se toca y el subtítulo dice por qué (docs/rediseno/17, decisiones 5 y 8).
 */
export default function AvisosPerfil({ correo: correoInicial, correoTexto, llavePush }: Props) {
  const router = useRouter();
  const plataforma = usePlataforma();
  const [estado, setEstado] = useEstadoPush(llavePush);
  const [correo, setCorreo] = useState(correoInicial);
  const [trabajando, setTrabajando] = useState(false);
  const [instalar, setInstalar] = useState(false);
  const [nota, setNota] = useState<string | null>(null);
  const tocable = estado === "encendido" || estado === "apagado" || estado === "instalar-primero";

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
    if (!tocable) return;
    setNota(null);
    if (estado === "instalar-primero") return setInstalar(true);
    setTrabajando(true);
    try {
      if (estado === "encendido") {
        const endpoint = await desuscribirPush();
        if (endpoint) await borrarSuscripcionPush(endpoint);
        setEstado("apagado");
        router.refresh();
        return;
      }
      const alta = await suscribirPush(llavePush);
      if (!alta.ok) {
        if (alta.motivo === "bloqueado") setEstado("bloqueado");
        else setNota(`No pudimos darte de alta ${enEste(plataforma)}. Intenta de nuevo.`);
        return;
      }
      if (await guardarSuscripcionPush(alta.sub)) {
        setEstado("encendido");
        router.refresh();
      } else setNota("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setTrabajando(false);
    }
  }
  async function cerrarInstalar() {
    // Quiere avisos en el teléfono: queda dicho; al abrir la app instalada se ofrece Activar.
    setInstalar(false);
    await elegirAvisos({ push: true });
    setNota("Falta un paso: instálala y, al abrirla, toca Activar.");
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
        {plataforma?.computadora ? <IconoComputadora width={20} height={20} /> : <IconoTelefono width={20} height={20} />}
        <b>{plataforma?.computadora ? "En esta computadora" : "En el teléfono"}</b>
        <small>{subtitulo(estado, plataforma)}</small>
        <button
          type="button"
          role="switch"
          aria-checked={estado === "encendido"}
          aria-label={plataforma?.computadora ? "Avisos en esta computadora" : "Avisos en el teléfono"}
          className={ajustes.palanca}
          onClick={cambiarTelefono}
          disabled={trabajando || !tocable}
        />
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
