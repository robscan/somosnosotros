"use client";

import { useState, type ReactNode } from "react";
import { enlaceVisible } from "@/lib/enlaces";
import { nombreArchivoQr } from "@/lib/artistas";
import { descargarDataUrl, svgAPng } from "@/lib/qrCliente";
import BotonCompartir from "../BotonCompartir";
import CodigoQr from "./CodigoQr";
import Hoja from "./Hoja";
import { IconoCompartir, IconoDescarga } from "./Iconos";
import styles from "./CompartirFicha.module.css";

/** El QR se descarga a este tamaño (OL-159, doc 40e): grande y nítido para imprimir, con el margen blanco que ya
 * trae el propio dibujo del servidor (lib/qr.ts, `margin: 1`). */
const TAMANO_QR_DESCARGA = 1024;

type Props = {
  /** Para el título/texto que arma `navigator.share`. */
  titulo: string;
  texto: string;
  /** El enlace corto y legible que se comparte: `somosnosotros.org/artistas/<slug>` (doc 40c). */
  url: string;
  /** El QR ya dibujado en el servidor (lib/qr.ts): el cliente nunca genera el dibujo, solo lo convierte de formato para descargarlo. */
  svg: string;
  /** El nombre del disparador para lectores de pantalla (p. ej. "Compartir la ficha de Ana Reyes"). */
  etiqueta: string;
  className?: string;
  /** Contenido visible del botón que abre la hoja; por defecto solo el icono. */
  children?: ReactNode;
  /** El slug de la ficha (OL-159, doc 40e): nombra el PNG descargado y arma el enlace al letrero para imprimir.
   * Opcional para no romper otros usos futuros de la hoja que no tengan letrero; sin él, esos dos botones no se ven. */
  slug?: string;
};

/**
 * El botón «Compartir» de una ficha de artista, visible para cualquiera (dueño o no): abre una hoja con el
 * enlace, el QR (mismo patrón que Pincel) y el compartir nativo del teléfono cuando existe (OL-154, doc 40c).
 * Corrección del founder (OL-159, doc 40e): además, el QR se puede descargar como PNG y hay un letrero A4 listo
 * para imprimir (página aparte `/artistas/<slug>/letrero`, con el cuadro de impresión del navegador — «Guardar
 * como PDF» entrega el PDF sin sumar una dependencia nueva).
 */
export default function CompartirFicha({ titulo, texto, url, svg, etiqueta, className, children, slug }: Props) {
  const [abierta, setAbierta] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [errorDescarga, setErrorDescarga] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso o sin API: el campo con el enlace se queda visible para copiarlo a mano.
    }
  }

  async function descargarQr() {
    if (!slug) return;
    try {
      setErrorDescarga(false);
      const png = await svgAPng(svg, TAMANO_QR_DESCARGA);
      descargarDataUrl(png, nombreArchivoQr(slug));
    } catch {
      setErrorDescarga(true);
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
          {slug && (
            <div className={styles.descargas}>
              <button type="button" className={styles.descarga} onClick={descargarQr}>
                <IconoDescarga width={20} height={20} />
                Descargar QR
              </button>
              <a href={`${url}/letrero`} target="_blank" rel="noopener noreferrer" className={styles.descarga}>
                <IconoDescarga width={20} height={20} />
                Descargar letrero
              </a>
            </div>
          )}
          {errorDescarga && (
            <p className="aviso-error" role="alert">
              No se pudo preparar el PNG. Intenta de nuevo.
            </p>
          )}
          <BotonCompartir titulo={titulo} texto={texto} url={url} className={styles.nativo}>
            <IconoCompartir width={20} height={20} />
            Compartir
          </BotonCompartir>
        </Hoja>
      )}
    </>
  );
}
