"use client";

import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import VisorImagen from "@/components/VisorImagen";
import Imagen from "@/components/ui/Imagen";
import { inicial } from "../../Avatar";
import styles from "../../admin.module.css";

/** El lado de la foto de la cabecera, en px (el doble de `--avatar-perfil`: `.cabecera > .avatar` en `admin.module.css`). */
const LADO = 144;

/**
 * La foto de la cabecera de la ficha de administración de una persona (OL-414): grande y, al tocarla, entera y acercable en el visor de los carteles
 * (`VisorImagen`, como `Cartel` con `forma="avatar"`), con su ✕. El visor se pinta al final del body, como en `Cartel`. Sin foto, la inicial.
 */
export default function FotoPersona({ foto, nombre }: { foto: string | null; nombre: string }) {
  const [abierto, setAbierto] = useState(false);
  const cerrar = useCallback(() => setAbierto(false), []);
  if (!foto) {
    return (
      <span className={styles.avatar} aria-hidden="true">
        {inicial(nombre)}
      </span>
    );
  }
  const quien = nombre || "esta persona";
  return (
    <>
      <button type="button" className={styles.avatar} onClick={() => setAbierto(true)} aria-label={`Ver la foto de ${quien} entera`}>
        <Imagen src={foto} alt="" width={LADO} height={LADO} sizes={`${LADO}px`} loading="eager" />
      </button>
      {abierto && createPortal(<VisorImagen src={foto} alt={`Foto de ${quien}`} onCerrar={cerrar} />, document.body)}
    </>
  );
}
