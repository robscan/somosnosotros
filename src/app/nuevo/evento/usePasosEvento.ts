"use client";

import { useMemo, useReducer } from "react";
import type { QuienItem } from "@/lib/artistas";
import type { Arranque } from "./arranque";
import { estadoAlEditar, estadoConArranque, flujo, pasoActual, type Candidato, type Paso, type Respuestas, type UsoSitio } from "./pasos";

/**
 * El estado del alta por pasos: las respuestas y el camino (`pasos.ts`, donde vive la regla). Abre con lo que ya se sabe (`arranque`: el
 * lugar, el artista o el evento que se duplica; OL-312) o, al editar (OL-319), con las respuestas del evento y ya en «Revisa» (`editar`).
 * Devuelve el paso a la vista y los gestos que lo mueven, estables entre pintados (los usan los efectos de quien los recibe, como el gesto de
 * Atrás de la app de iPhone).
 */
export function usePasosEvento(quienInicial: QuienItem[], arranque: Arranque | null, editar: Respuestas | null = null) {
  const [estado, despachar] = useReducer(flujo, null, () => (editar ? estadoAlEditar(editar) : estadoConArranque(quienInicial, arranque)));
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
      publicado: () => despachar({ tipo: "publicado" }),
    }),
    [],
  );
  return { r: estado.r, candidato: estado.candidato, paso: pasoActual(estado), direccion: estado.direccion, primero: estado.pila.length === 1, primeraPregunta: estado.pila.length === 2, ...gestos };
}
