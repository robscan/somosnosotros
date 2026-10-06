"use client";

import { useMemo, useReducer } from "react";
import type { QuienItem } from "@/lib/artistas";
import { estadoInicial, flujo, pasoActual, type Candidato, type Paso, type Respuestas, type UsoSitio } from "./pasos";

/**
 * El estado del alta por pasos: las respuestas y el camino (`pasos.ts`, donde vive la regla). Devuelve el paso a la vista y los gestos
 * que lo mueven, estables entre pintados (los usan los efectos de quien los recibe, como el gesto de Atrás de la app de iPhone).
 */
export function usePasosEvento(quienInicial: QuienItem[]) {
  const [estado, despachar] = useReducer(flujo, quienInicial, estadoInicial);
  const gestos = useMemo(
    () => ({
      cambiar: (cambios: Partial<Respuestas>) => despachar({ tipo: "cambiar", cambios }),
      contestar: (cambios: Partial<Respuestas>) => despachar({ tipo: "contestar", cambios }),
      seguir: () => despachar({ tipo: "seguir" }),
      abrir: (paso: Paso) => despachar({ tipo: "abrir", paso }),
      atras: (desde: Paso) => despachar({ tipo: "atras", desde }),
      elegir: (candidato: Candidato) => despachar({ tipo: "elegir", candidato }),
      confirmar: (candidato: Candidato) => despachar({ tipo: "confirmar", candidato }),
      usar: (uso: UsoSitio) => despachar({ tipo: "usar", uso }),
    }),
    [],
  );
  return { r: estado.r, candidato: estado.candidato, paso: pasoActual(estado), direccion: estado.direccion, primero: estado.pila.length === 1, ...gestos };
}
