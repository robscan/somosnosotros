"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const EVENTOS = ["inicio-estelar", "inicio-esta-semana", "inicio-nuevos"];
const ENTIDADES = ["inicio-lugares-semana", "inicio-artistas-destacados", "inicio-artistas-semana"];
type Estado = Record<string, boolean | null>;
type Contexto = { eventosResueltos: boolean; hayEventos: boolean; vacio: boolean; informar: (clave: string, cantidad: number | null) => void };
const EstadoCarriles = createContext<Contexto>({ eventosResueltos: false, hayEventos: false, vacio: false, informar: () => {} });

/** El montaje del cliente confirma cada stream y su contenido efectivo. No interpreta pendientes ni errores como vacío. */
export function CarrilesDeInicio({ conSesion, children }: { conSesion: boolean; children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>({});
  const informar = useCallback((clave: string, cantidad: number | null) => {
    const presente = cantidad === null ? null : cantidad > 0;
    setEstado(antes => antes[clave] === presente ? antes : { ...antes, [clave]: presente });
  }, []);
  const valor = useMemo(() => {
    const esperados = [...EVENTOS, ...ENTIDADES, "inicio-mas-adelante", ...(conSesion ? ["inicio-tus-planes"] : [])];
    return {
      eventosResueltos: EVENTOS.every(clave => typeof estado[clave] === "boolean"),
      hayEventos: EVENTOS.some(clave => estado[clave] === true),
      vacio: esperados.every(clave => estado[clave] === false),
      informar,
    };
  }, [estado, conSesion, informar]);
  return <EstadoCarriles.Provider value={valor}>{children}</EstadoCarriles.Provider>;
}

export const useEstadoCarriles = () => useContext(EstadoCarriles);
export function useCarrilResuelto(clave: string, cantidad: number | null) {
  const { informar } = useEstadoCarriles();
  useEffect(() => { informar(clave, cantidad); }, [informar, clave, cantidad]);
}
