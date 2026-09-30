"use client";

import { useState, useSyncExternalStore } from "react";
import { marcaNuevosVisto } from "@/lib/nuevosVisto";

const sinCambios = () => () => {};

/**
 * La marca de Nuevos de esa ciudad (`lib/nuevosVisto`), leída del teléfono: null si no hay, y `undefined` en el servidor y en el primer
 * pintado de la hidratación (sin desajuste: el teléfono la completa enseguida). Se lee en cada pintado, no se vigila.
 */
export function useMarcaNuevos(ciudad: string): string | null | undefined {
  return useSyncExternalStore(sinCambios, () => marcaNuevosVisto(ciudad), () => undefined);
}

/**
 * La última visita a Nuevos con la que se arma la pestaña: la marca, leída una sola vez y fija mientras la pantalla viva. Mirar la pestaña
 * avanza la marca (`marcarNuevosVisto`) y eso no puede vaciarla bajo los ojos de quien la mira; la memoria de pantalla la repone con `fijar`
 * al volver de una ficha. `undefined` es «todavía sin leer».
 */
export function useVisitaNuevos(ciudad: string) {
  const marca = useMarcaNuevos(ciudad);
  const [visita, fijar] = useState<string | null>();
  if (visita === undefined && marca !== undefined) fijar(marca);
  return [visita, fijar] as const;
}
