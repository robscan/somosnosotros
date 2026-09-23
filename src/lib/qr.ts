import "server-only";
import QRCode from "qrcode";
import { ORIGEN } from "@/lib/sitemap";

/**
 * QR de Pincel (OL-118, Fase 4 del plan de la bitácora 123): la pared proyectada y la ficha de la obra en
 * Administración enseñan el mismo código, que lleva al mando de esa obra. Se genera en el servidor, como SVG
 * (`qrcode`, decisión del founder 2026-09-22), nunca en el cliente: el navegador solo recibe un dibujo.
 * La dirección es la absoluta del sitio (`ORIGEN`, la misma base que el mapa del sitio): un QR relativo no sirve.
 */
export function urlDelMando(obraId: string): string {
  return `${ORIGEN}/obra/${obraId}/mando`;
}

export type QrDelMando = { url: string; svg: string };

/** El SVG de un QR para cualquier URL absoluta, en el servidor (mismas opciones que el de Pincel). Reusado por
 * la hoja de compartir del perfil del artista (OL-154, doc 40c): mismo patrón, solo cambia qué URL codifica. */
export async function qrDeUrl(url: string): Promise<string> {
  return QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
}

export async function qrDelMando(obraId: string): Promise<QrDelMando> {
  const url = urlDelMando(obraId);
  const svg = await qrDeUrl(url);
  return { url, svg };
}
