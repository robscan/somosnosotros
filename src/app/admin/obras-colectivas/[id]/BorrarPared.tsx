"use client";

import { useState } from "react";
import Hoja from "@/components/ui/Hoja";
import { IconoPincel } from "@/components/ui/Iconos";
import estilosBorrar from "@/components/Borrar.module.css";
import { abrirCanalObra } from "@/lib/canal-obra";
import { EVENTO_BORRAR, type MensajeBorrar } from "@/lib/pincel";
import { clienteNavegador } from "@/lib/supabase/navegador";

/**
 * «Borrar la pared» (OL-126, founder: «agregar botón de borrado o reinicio de pared en admin»), en dos pasos como
 * `Borrar` (enlace discreto + hoja de confirmación con la misma composición): manda `borrar` por el canal de la
 * obra y toda pared abierta limpia su lienzo. No borra nada guardado y la obra sigue abierta, así que no pasa por
 * el servidor: el mensaje sale desde este navegador con la sesión de administración (el canal exige sesión). Solo
 * vive aquí, en Administración.
 */
export default function BorrarPared({ obraId, perfilId }: { obraId: string; perfilId: string }) {
  const [confirmar, setConfirmar] = useState(false);
  const [estado, setEstado] = useState<"quieto" | "borrando" | "hecho" | "error">("quieto");

  async function borrar() {
    setEstado("borrando");
    const supabase = clienteNavegador();
    if (!supabase) {
      setEstado("error");
      return;
    }
    const canal = abrirCanalObra(supabase, obraId);
    try {
      await new Promise<void>((resolver, rechazar) => {
        const tope = setTimeout(() => rechazar(new Error("sin conexión al canal")), 6000);
        canal.subscribe((estadoCanal) => {
          if (estadoCanal === "SUBSCRIBED") {
            clearTimeout(tope);
            resolver();
          } else if (estadoCanal === "CHANNEL_ERROR" || estadoCanal === "TIMED_OUT") {
            clearTimeout(tope);
            rechazar(new Error(estadoCanal));
          }
        });
      });
      const mensaje: MensajeBorrar = { remitente: perfilId, enviado: Date.now() };
      await canal.send({ type: "broadcast", event: EVENTO_BORRAR, payload: mensaje });
      await new Promise((r) => setTimeout(r, 300)); // que salga por el socket antes de cerrarlo
      setEstado("hecho");
    } catch {
      setEstado("error");
    } finally {
      await canal.unsubscribe();
    }
  }

  function cerrar() {
    setConfirmar(false);
    setEstado("quieto");
  }

  return (
    <>
      <button type="button" className={estilosBorrar.enlace} onClick={() => setConfirmar(true)}>
        Borrar la pared
      </button>
      {confirmar && (
        <Hoja etiqueta="Borrar la pared" onCerrar={cerrar}>
          <div className={estilosBorrar.confirmar}>
            <span className={estilosBorrar.icono} aria-hidden="true">
              <IconoPincel width={28} height={28} />
            </span>
            {estado === "hecho" ? (
              <>
                <h3>La pared quedó limpia</h3>
                <p>La obra sigue abierta y se puede seguir pintando.</p>
                <button type="button" className={estilosBorrar.enlace} onClick={cerrar}>
                  Listo
                </button>
              </>
            ) : (
              <>
                <h3>¿Borrar la pared?</h3>
                <p>Se limpia lo pintado hasta ahora en la pared de esta obra. La obra sigue abierta. No se puede deshacer.</p>
                {estado === "error" && (
                  <p role="alert">No se pudo mandar el borrado. ¿Sigues con sesión de administración y con conexión?</p>
                )}
                <button type="button" className={estilosBorrar.peligro} disabled={estado === "borrando"} onClick={borrar}>
                  {estado === "borrando" ? "Borrando…" : "Sí, borrar la pared"}
                </button>
                <button type="button" className={estilosBorrar.enlace} onClick={cerrar}>
                  Cancelar
                </button>
              </>
            )}
          </div>
        </Hoja>
      )}
    </>
  );
}
