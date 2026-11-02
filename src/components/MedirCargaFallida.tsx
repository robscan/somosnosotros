"use client";

import { useEffect } from "react";
import { tomarCargaFallida } from "@/lib/cargaFallida";
import { medirCliente } from "@/lib/medir";

/**
 * Mide `carga_fallida` (OL-501): si la vez anterior la app no cargó y quedó la marca de «No se pudo cargar», en esta carga buena se manda
 * y se borra. Va dentro de `MarcaAdmin`, como `MedirInstalacion`: se monta con el rol ya sabido y nunca para la administración. No pinta nada.
 */
export default function MedirCargaFallida() {
  useEffect(() => {
    let datos = null;
    try {
      datos = tomarCargaFallida(window.localStorage);
    } catch {
      // sin memoria: nada
    }
    if (datos) medirCliente("carga_fallida", datos);
  }, []);
  return null;
}
