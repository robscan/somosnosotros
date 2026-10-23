"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { CARRILES_DE_EVENTOS, ciudadSinEventos, eventosDeCiudadResueltos, type EstadoDeCarriles } from "@/lib/inicio";

/** `vacio`: la ciudad no tiene ningún evento próximo (OL-454, `ciudadSinEventos`: «Tus planes» no cuenta); `resuelto`: ya se sabe si lo tiene. */
type Contexto = { eventosResueltos: boolean; hayEventos: boolean; resuelto: boolean; vacio: boolean; informar: (clave: string, cantidad: number | null) => void };
const EstadoCarriles = createContext<Contexto>({ eventosResueltos: false, hayEventos: false, resuelto: false, vacio: false, informar: () => {} });

/** El montaje del cliente confirma cada stream y su contenido efectivo. No interpreta pendientes ni errores como vacío. */
export function CarrilesDeInicio({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoDeCarriles>({});
  const informar = useCallback((clave: string, cantidad: number | null) => {
    const presente = cantidad === null ? null : cantidad > 0;
    setEstado(antes => antes[clave] === presente ? antes : { ...antes, [clave]: presente });
  }, []);
  const valor = useMemo(() => ({
    eventosResueltos: CARRILES_DE_EVENTOS.every(clave => typeof estado[clave] === "boolean"),
    hayEventos: CARRILES_DE_EVENTOS.some(clave => estado[clave] === true),
    resuelto: eventosDeCiudadResueltos(estado),
    vacio: ciudadSinEventos(estado),
    informar,
  }), [estado, informar]);
  return <EstadoCarriles.Provider value={valor}>{children}</EstadoCarriles.Provider>;
}

export const useEstadoCarriles = () => useContext(EstadoCarriles);
export function useCarrilResuelto(clave: string, cantidad: number | null) {
  const { informar } = useEstadoCarriles();
  useEffect(() => { informar(clave, cantidad); }, [informar, clave, cantidad]);
}
