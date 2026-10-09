"use client";

import { useCallback, useRef, useState, type ChangeEvent } from "react";

/** Lo más que se espera a que la imagen subida esté lista para verse antes de quitar la espera (con mala señal no se queda latiendo). */
const ESPERA_PRECARGA_MS = 8000;

/**
 * Pide la imagen ya subida y espera a poder dibujarla, para que al quitar la espera la imagen final esté ahí y no un hueco vacío. Nunca falla
 * ni tarda más de `ESPERA_PRECARGA_MS`: si no carga, la pantalla la pinta como siempre.
 */
export function precargar(url: string): Promise<void> {
  return new Promise((listo) => {
    const img = new Image();
    const terminar = () => {
      clearTimeout(tope);
      listo();
    };
    const tope = setTimeout(terminar, ESPERA_PRECARGA_MS);
    img.onload = terminar;
    img.onerror = terminar;
    img.src = url;
  });
}

/**
 * El estado de una subida de foto (OL-353), uno para todas las pantallas que suben una imagen: el cartel del alta y de editar, la foto propia
 * del creador de cartel, la portada de lugar, la foto y la portada de artista y la foto de perfil. Cada pantalla solo pinta (`FotoSubida`).
 *
 * `subir(origen, tarea, cual)`: toma el archivo (del campo, que se vacía para poder volver a elegir el mismo, o el archivo ya tomado) y en ese
 * mismo instante deja a la vista la foto de la persona (`vista`, una dirección local del teléfono) mientras `tarea` la prepara y la sube. Si la
 * tarea devuelve la dirección de la imagen subida, la espera sigue hasta que esa imagen se puede dibujar (`precargar`). Al terminar, bien o mal,
 * la vista local se suelta y `subiendo` vuelve a null: un error deja lo que había (la tarea no lo toca). Una subida a la vez: lo que se elige
 * mientras tanto no hace nada. `cual` distingue dos huecos de una misma pantalla (la foto y la portada de artista).
 */
export default function useSubidaDeFoto<Cual extends string = "foto">() {
  const [enCurso, setEnCurso] = useState<{ cual: Cual; vista: string } | null>(null);
  const ocupado = useRef(false);

  const subir = useCallback(async (origen: ChangeEvent<HTMLInputElement> | File | undefined, tarea: (archivo: File) => Promise<string | null | void>, cual = "foto" as Cual) => {
    let archivo: File | undefined;
    if (origen && "target" in origen) {
      archivo = origen.target.files?.[0];
      origen.target.value = ""; // la misma foto se puede volver a elegir
    } else archivo = origen;
    if (!archivo || ocupado.current) return;
    ocupado.current = true;
    const vista = URL.createObjectURL(archivo);
    setEnCurso({ cual, vista });
    try {
      const subida = await tarea(archivo);
      if (subida) await precargar(subida);
    } finally {
      URL.revokeObjectURL(vista);
      setEnCurso(null);
      ocupado.current = false;
    }
  }, []);

  /** La vista local del hueco `cual` mientras sube; null si no es el suyo. */
  const vistaDe = useCallback((c: Cual) => (enCurso?.cual === c ? enCurso.vista : null), [enCurso]);

  return { subiendo: enCurso?.cual ?? null, vista: enCurso?.vista ?? null, vistaDe, subir };
}
