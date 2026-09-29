"use client";

import { useEffect, useState } from "react";

/**
 * Lo que una promesa diferida ya trajo, o null mientras llega: lo que hay que esperar no frena a la fila de contexto, que se
 * pinta con la barra (la agenda de Inicio y Agenda, lo que sigue la persona en Lugares).
 */
export function useResuelta<T>(promesa: Promise<T>): T | null {
  const [valor, setValor] = useState<T | null>(null);
  useEffect(() => {
    let vigente = true;
    promesa.then((v) => vigente && setValor(v), () => {});
    return () => {
      vigente = false;
    };
  }, [promesa]);
  return valor;
}
