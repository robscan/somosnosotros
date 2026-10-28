"use client";

import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import VisorImagen from "@/components/VisorImagen";
import Imagen from "@/components/ui/Imagen";
import styles from "@/components/FichaPersona.module.css";

/** El lado de la foto de la cabecera, en px: `--avatar-perfil`, el de la cabecera de una persona en el front (`FichaPersona`). */
const LADO = 72;

/**
 * La foto de la cabecera de la ficha de administración de una persona: la de la cabecera de la ficha pública (`FichaPersona`, OL-456) y, al
 * tocarla, entera y acercable en el visor de los carteles (`VisorImagen`, OL-414), con su ✕. El visor se pinta al final del body, como en
 * `Cartel`. Sin foto, la inicial.
 */
export default function FotoPersona({ foto, nombre }: { foto: string | null; nombre: string }) {
  const [abierto, setAbierto] = useState(false);
  const cerrar = useCallback(() => setAbierto(false), []);
  if (!foto) {
    return (
      <span className={`${styles.avatar} ${styles.avatarVacio}`} aria-hidden="true">
        {(nombre || "?").slice(0, 1).toUpperCase()}
      </span>
    );
  }
  const quien = nombre || "esta persona";
  return (
    <>
      <button type="button" className={`${styles.avatar} ${styles.avatarBoton}`} onClick={() => setAbierto(true)} aria-label={`Ver la foto de ${quien} entera`}>
        <Imagen src={foto} alt="" width={LADO} height={LADO} sizes={`${LADO}px`} loading="eager" />
      </button>
      {abierto && createPortal(<VisorImagen src={foto} alt={`Foto de ${quien}`} onCerrar={cerrar} />, document.body)}
    </>
  );
}
