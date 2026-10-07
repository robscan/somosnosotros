"use client";

import type { ReactNode } from "react";
import { fichaDeEnlace, medirCliente } from "@/lib/medir";

/** Compartir: la hoja nativa del teléfono si existe (ahí está WhatsApp); si no, WhatsApp directo. */
export default function BotonCompartir({ titulo, texto, url, className, children, ariaLabel }: { titulo: string; texto: string; url: string; className: string; children: ReactNode; ariaLabel?: string }) {
  async function compartir() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: titulo, text: texto, url });
        medir("hoja");
        return;
      } catch {
        return; // cancelado
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${texto}\n${url}`)}`, "_blank", "noopener");
    medir("whatsapp");
  }
  /** Solo las fichas (evento, lugar, artista; OL-325): compartir la app o una persona no se mide. */
  function medir(medio: "hoja" | "whatsapp") {
    const que = fichaDeEnlace(url);
    if (que) medirCliente("compartir", { que, medio });
  }
  return (
    <button type="button" className={className} onClick={compartir} aria-label={ariaLabel}>
      {children}
    </button>
  );
}
