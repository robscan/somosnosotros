"use client";

import { useState } from "react";
import type { Punto } from "@/lib/geo";
import { esteAparatoInicial } from "@/lib/plataforma";
import { leerUbicacion } from "@/lib/ubicacion";
import { usePlataforma } from "@/lib/useAvisosTelefono";

/**
 * «Estoy aquí» de la hoja «¿Dónde es?» (`HojaDonde`): lee la ubicación del teléfono, la pone en el mapa (el punto azul) y le pasa el punto a
 * la hoja para que ponga ahí el pin; si no se puede, dice por qué. Lo comparten los flujos por pasos: el alta y editar un evento (OL-319) y
 * el alta de lugar.
 */
export function useEstoyAqui() {
  const plataforma = usePlataforma();
  const [yo, setYo] = useState<(Punto & { vez: number }) | null>(null);
  const [ubicando, setUbicando] = useState(false);
  const [avisoUbicacion, setAvisoUbicacion] = useState<string | null>(null);
  async function estoyAqui(poner: (p: Punto) => void) {
    setUbicando(true);
    setAvisoUbicacion(null);
    try {
      const p = await leerUbicacion(true);
      setYo((y) => ({ ...p, vez: (y?.vez ?? 0) + 1 }));
      poner(p);
    } catch (e) {
      setAvisoUbicacion(e === "sin-soporte" ? `${esteAparatoInicial(plataforma)} no da su ubicación. Toca el mapa donde es.` : "No se pudo leer tu ubicación. Toca el mapa donde es.");
    } finally {
      setUbicando(false);
    }
  }
  return { yo, ubicando, avisoUbicacion, estoyAqui };
}
