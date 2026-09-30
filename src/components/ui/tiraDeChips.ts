"use client";

import { createContext } from "react";

/**
 * Lo que la fila de contexto (`ui/Cabecera`) le ofrece a los chips que lleva, para que los que se ponen o se quitan se noten
 * (docs/rediseno/50, ajuste del founder del 2026-09-30). Un chip fuera de una fila no lo tiene y no se anima.
 * - `puesta`: la fila ya pasó de su primer pintado. Lo que trae la pantalla al abrir (la URL, la memoria de pantalla) ya está ahí y no
 *   se anima; lo que cambia después, sí.
 * - `mostrar`: desliza la fila, hacia un lado y lo justo, hasta que el chip quede entero a la vista.
 */
export type Tira = { puesta: () => boolean; mostrar: (chip: HTMLElement) => void };

export const TiraDeChips = createContext<Tira | null>(null);
