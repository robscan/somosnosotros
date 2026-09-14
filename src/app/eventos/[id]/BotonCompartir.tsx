"use client";

import styles from "./ficha.module.css";

/** Compartir: la hoja nativa del teléfono si existe (ahí está WhatsApp); si no, WhatsApp directo. */
export default function BotonCompartir({ titulo, texto, url }: { titulo: string; texto: string; url: string }) {
  async function compartir() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: titulo, text: texto, url });
        return;
      } catch {
        // cancelado: no hacemos nada
        return;
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${texto}\n${url}`)}`, "_blank", "noopener");
  }
  return (
    <button type="button" className={styles.botonPrincipal} onClick={compartir}>
      Compartir por WhatsApp
    </button>
  );
}
