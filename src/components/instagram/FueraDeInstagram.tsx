"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { IconoInstagram } from "@/components/ui/Iconos";
import renglon from "@/components/ui/Renglon.module.css";
import { volverAPonerEnInstagram } from "@/app/admin/instagram/accionesSemana";

/**
 * «Fuera de Instagram» en el «···» de la ficha de un artista o de un lugar (OL-479; firmado en el prototipo de OL-477, bitácora 509, «Aviso
 * previo»): solo la administración y solo si dijo que no a salir en el Instagram de la marca. Dice cuándo y, al tocarlo, vuelve a ponerlo en la
 * rotación de la semana («Volver a poner»). La ficha pública no lo lee nunca.
 */
export default function FueraDeInstagram({ tipo, id, cuando }: { tipo: "artista" | "lugar"; id: string; cuando: string }) {
  const router = useRouter();
  const [enviando, enviar] = useTransition();
  const [error, setError] = useState(false);
  return (
    <li>
      <button
        type="button"
        className={renglon.ajuste}
        disabled={enviando}
        aria-busy={enviando || undefined}
        onClick={() =>
          enviar(async () => {
            const r = await volverAPonerEnInstagram(tipo, id).catch(() => ({ ok: false as const, mensaje: "" }));
            if (r.ok) router.refresh();
            else setError(true);
          })
        }
      >
        <IconoInstagram width={20} height={20} />
        <b>Fuera de Instagram</b>
        <small>{error ? "No se pudo. Toca para intentar de nuevo." : `Dijo que no ${cuando} · Volver a poner`}</small>
      </button>
    </li>
  );
}
