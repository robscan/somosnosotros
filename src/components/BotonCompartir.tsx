"use client";

import type { ReactNode } from "react";

/** Compartir: la hoja nativa del teléfono si existe (ahí está WhatsApp); si no, WhatsApp directo. */
export default function BotonCompartir({ titulo, texto, url, className, children, ariaLabel }: { titulo: string; texto: string; url: string; className: string; children: ReactNode; ariaLabel?: string }) {
  async function compartir() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: titulo, text: texto, url });
        return;
      } catch {
        return; // cancelado
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${texto}\n${url}`)}`, "_blank", "noopener");
  }
  return (
    <button type="button" className={className} onClick={compartir} aria-label={ariaLabel}>
      {children}
    </button>
  );
}
