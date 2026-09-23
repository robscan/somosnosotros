"use client";

import { useState, type ReactNode } from "react";
import { enlaceVisible } from "@/lib/enlaces";
import BotonCompartir from "../BotonCompartir";
import CodigoQr from "./CodigoQr";
import Hoja from "./Hoja";
import { IconoCompartir } from "./Iconos";
import styles from "./CompartirFicha.module.css";

type Props = {
  /** Para el título/texto que arma `navigator.share`. */
  titulo: string;
  texto: string;
  /** El enlace corto y legible que se comparte: `somosnosotros.org/artistas/<slug>` (doc 40c). */
  url: string;
  /** El QR ya dibujado en el servidor (lib/qr.ts): el cliente nunca genera el dibujo. */
  svg: string;
  /** El nombre del disparador para lectores de pantalla (p. ej. "Compartir la ficha de Ana Reyes"). */
  etiqueta: string;
  className?: string;
  /** Contenido visible del botón que abre la hoja; por defecto solo el icono. */
  children?: ReactNode;
};

/**
 * El botón «Compartir» de una ficha de artista, visible para cualquiera (dueño o no): abre una hoja con el
 * enlace, el QR (mismo patrón que Pincel) y el compartir nativo del teléfono cuando existe (OL-154, doc 40c).
 * Una sola hoja, tres formas de llevarse el enlace.
 */
export default function CompartirFicha({ titulo, texto, url, svg, etiqueta, className, children }: Props) {
  const [abierta, setAbierta] = useState(false);
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso o sin API: el campo con el enlace se queda visible para copiarlo a mano.
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setAbierta(true)} aria-label={etiqueta}>
        {children ?? <IconoCompartir />}
      </button>
      {abierta && (
        <Hoja etiqueta={etiqueta} titulo="Compartir" onCerrar={() => setAbierta(false)}>
          <p className={styles.sub}>Cualquiera con el enlace ve esta ficha.</p>
          <div className={styles.qr}>
            <CodigoQr svg={svg} alt={`Código QR de ${titulo}`} className={styles.qrImagen} />
          </div>
          <div className={styles.campo}>
            <span>{enlaceVisible(url)}</span>
            <button type="button" onClick={copiar}>
              {copiado ? "Copiado" : "Copiar"}
            </button>
          </div>
          <BotonCompartir titulo={titulo} texto={texto} url={url} className={styles.nativo}>
            <IconoCompartir width={20} height={20} />
            Compartir
          </BotonCompartir>
        </Hoja>
      )}
    </>
  );
}
