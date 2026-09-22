"use client";

import { useState } from "react";
import Boton from "@/components/ui/Boton";
import Hoja from "@/components/ui/Hoja";
import { IconoPincel } from "@/components/ui/Iconos";
import estilosBorrar from "@/components/Borrar.module.css";
import { abrirCanalObra } from "@/lib/canal-obra";
import { EVENTO_BORRAR, type MensajeBorrar } from "@/lib/pincel";
import { clienteNavegador } from "@/lib/supabase/navegador";
import { borrarPared } from "../acciones";

/**
 * «Borrar la pared» (OL-126, founder: «agregar botón de borrado o reinicio de pared en admin»): botón del canon
 * con confirmación de un toque más («¿Borrar todo lo pintado? No se puede deshacer» → «Sí, borrar»). Al confirmar,
 * primero la acción de servidor `borrarPared` registra la hora del borrado en la obra (exige administración: es la
 * comprobación del lado del servidor, porque un mando también podría mandar «borrar» por el canal) y después este
 * navegador manda `borrar` por el canal de la obra con su sesión; toda pared abierta lee esa hora y, si es reciente,
 * limpia su lienzo. Los mandos siguen conectados; la obra sigue abierta; nada se guarda salvo esa hora.
 * OL-134: el aviso solo llega a las paredes abiertas en ese momento; la acción de servidor borra además la
 * instantánea del bucket y la pared consulta la hora registrada al abrirse, al volver a ser visible y cada 5 s,
 * así que una pared cerrada, congelada o en otro dispositivo también queda limpia.
 */
export default function BorrarPared({ obraId, perfilId }: { obraId: string; perfilId: string }) {
  const [confirmar, setConfirmar] = useState(false);
  const [estado, setEstado] = useState<"quieto" | "borrando" | "hecho" | "error">("quieto");
  const [error, setError] = useState<string | null>(null);

  async function borrar() {
    setEstado("borrando");
    setError(null);
    const registrado = await borrarPared(obraId);
    if (!registrado.ok) {
      setEstado("error");
      setError(registrado.error);
      return;
    }
    const supabase = clienteNavegador();
    if (!supabase) {
      setEstado("error");
      setError("Sin conexión.");
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
      setError("El borrado quedó registrado, pero no se pudo avisar a la pared. Recárgala.");
    } finally {
      await canal.unsubscribe();
    }
  }

  function cerrar() {
    setConfirmar(false);
    setEstado("quieto");
    setError(null);
  }

  return (
    <>
      <Boton type="button" variante="peligro" onClick={() => setConfirmar(true)}>
        Borrar la pared
      </Boton>
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
                <h3>¿Borrar todo lo pintado?</h3>
                <p>No se puede deshacer. La obra sigue abierta.</p>
                {error && <p role="alert">{error}</p>}
                <button type="button" className={estilosBorrar.peligro} disabled={estado === "borrando"} onClick={borrar}>
                  {estado === "borrando" ? "Borrando…" : "Sí, borrar"}
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
