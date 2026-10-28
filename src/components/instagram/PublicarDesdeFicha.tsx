"use client";

import { useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconoInstagram } from "@/components/ui/Iconos";
import { CerrarMenu } from "@/components/ui/MenuAcciones";
import renglon from "@/components/ui/Renglon.module.css";
import { CUENTA_INSTAGRAM } from "@/lib/instagram/texto";
import HojaInstagram from "./HojaInstagram";

const ABRIR = "sn:instagram";

/**
 * «Publicar en Instagram» en el «···» de la ficha de un evento (OL-458, prototipo firmado, pantalla E; bitácora 490), junto a «Destacar»: solo
 * la administración y solo si el evento está por venir (lo decide la página con `sePuedePublicar`). El menú se cierra y se abre la hoja de
 * vista previa, que vive fuera del menú (`HojaInstagramDeFicha`, en la página): el menú desmonta lo suyo al cerrarse. OL-465: mientras algo de
 * este evento está en la cola de redes, el renglón dice «Publicando…».
 */
export function RenglonPublicarInstagram({ publicado, publicando = false }: { publicado: string | null; publicando?: boolean }) {
  const cerrarMenu = useContext(CerrarMenu);
  return (
    <li>
      <button
        type="button"
        className={renglon.ajuste}
        onClick={() => {
          cerrarMenu();
          window.dispatchEvent(new Event(ABRIR));
        }}
      >
        <IconoInstagram width={20} height={20} />
        <b>Publicar en Instagram</b>
        <small>{publicando ? "Publicando…" : publicado ? `Ya se publicó ${publicado}` : `En @${CUENTA_INSTAGRAM}`}</small>
      </button>
    </li>
  );
}

/** La hoja de vista previa de la ficha: se abre cuando el renglón del «···» lo pide. */
export function HojaInstagramDeFicha({ eventoId }: { eventoId: string }) {
  const [abierta, setAbierta] = useState(false);
  const router = useRouter();
  useEffect(() => {
    const abrir = () => setAbierta(true);
    window.addEventListener(ABRIR, abrir);
    return () => window.removeEventListener(ABRIR, abrir);
  }, []);
  return abierta ? <HojaInstagram eventoId={eventoId} onCerrar={() => setAbierta(false)} onPublicado={() => router.refresh()} /> : null;
}
