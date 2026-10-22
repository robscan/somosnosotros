"use client";

import { IconoCaret, IconoPendiente } from "@/components/ui/Iconos";
import { sinMovimiento } from "@/lib/movimiento";
import s from "../showcase.module.css";

/**
 * El aviso de la ficha de showcase (OL-446; lo firmado en OL-443): «2 por revisar» bajo el nombre, con el chevron abajo porque baja en la misma
 * pantalla hasta «Por revisar» (no navega ni apila historial). Lo pinta la página solo si hay algo propuesto.
 */
export default function AvisoPorRevisar({ n }: { n: number }) {
  function bajar() {
    const destino = document.getElementById("por-revisar");
    if (!destino) return;
    destino.scrollIntoView({ block: "start", behavior: sinMovimiento() ? "auto" : "smooth" });
    destino.focus({ preventScroll: true });
  }
  return (
    <button type="button" className={s.aviso} onClick={bajar}>
      <IconoPendiente width={20} height={20} />
      {n} por revisar
      <IconoCaret width={16} height={16} />
    </button>
  );
}
