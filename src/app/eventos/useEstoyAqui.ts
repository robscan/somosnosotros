"use client";

import { useState } from "react";
import type { Punto } from "@/lib/geo";
import { esteAparatoInicial } from "@/lib/plataforma";
import { leerUbicacion } from "@/lib/ubicacion";
import { usePlataforma } from "@/lib/useAvisosTelefono";

/** Para no poner un punto que llegó tarde: quien llama cuenta cada gesto sobre «Dónde» y dice si este sigue siendo el último. */
type Vigencia = { tocar: () => number; vigente: (version: number) => boolean };

/**
 * «Estoy aquí» de la hoja «¿Dónde es?» (`HojaDonde`): lee la ubicación del teléfono, la pone en el mapa (el punto azul) y le pasa el punto a
 * la hoja para que ponga ahí el pin; si no se puede, dice por qué. Lo comparten editar (`FormularioEvento`, con su vigencia de gestos) y
 * el alta por pasos.
 */
export function useEstoyAqui(vigencia?: Vigencia) {
  const plataforma = usePlataforma();
  const [yo, setYo] = useState<(Punto & { vez: number }) | null>(null);
  const [ubicando, setUbicando] = useState(false);
  const [avisoUbicacion, setAvisoUbicacion] = useState<string | null>(null);
  async function estoyAqui(poner: (p: Punto) => void) {
    const version = vigencia?.tocar();
    const sigue = () => version === undefined || !!vigencia?.vigente(version);
    setUbicando(true);
    setAvisoUbicacion(null);
    try {
      const p = await leerUbicacion(true);
      if (!sigue()) return;
      setYo((y) => ({ ...p, vez: (y?.vez ?? 0) + 1 }));
      poner(p);
    } catch (e) {
      if (!sigue()) return;
      setAvisoUbicacion(e === "sin-soporte" ? `${esteAparatoInicial(plataforma)} no da su ubicación. Toca el mapa donde es.` : "No se pudo leer tu ubicación. Toca el mapa donde es.");
    } finally {
      setUbicando(false);
    }
  }
  return { yo, ubicando, avisoUbicacion, estoyAqui };
}
