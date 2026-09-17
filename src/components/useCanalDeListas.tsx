"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Hecho from "./Hecho";

/** El aviso de abajo: lo hecho con Deshacer, o que no se pudo guardar con Reintentar. */
export type Aviso = { texto: string; boton: () => void; etiqueta?: string; fallo?: boolean; vez: number };

/**
 * Lo que comparten las listas y las barras de una misma pantalla (OL-057): un solo aviso abajo (el nuevo reemplaza al
 * anterior y cada uno cierra solo el suyo) y una sola pregunta de avisos. Una lista suelta (agenda, Lugares, Artistas)
 * tiene el suyo; la ficha de una persona y las de lugar y artista comparten uno, para que los avisos no se encimen ni la
 * pregunta salga dos veces.
 */
export type CanalDeListas = {
  aviso: Aviso | null;
  avisar: (a: Omit<Aviso, "vez">) => void;
  cerrar: (vez: number) => void;
  /** Un toque nuevo que todavía no tiene su aviso (las barras de las fichas) cierra el anterior. */
  limpiar: () => void;
  /** ¿Se hace la pregunta de avisos? Solo la primera vez en la pantalla: al decir que sí, queda tomada. */
  tomarPregunta: () => boolean;
  /** Cuántas hojas de avisos hay abiertas: con alguna, el aviso espera y sale al cerrarla. */
  hojas: number;
  anotarHoja: (abierta: boolean) => void;
};

export function useCanalDeListas(): CanalDeListas {
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [hojas, setHojas] = useState(0);
  // Las funciones, fijas desde el primer render: así un efecto puede anotar su hoja sin volver a correr.
  const [fijas] = useState(() => {
    let pregunte = false;
    return {
      avisar: (a: Omit<Aviso, "vez">) => setAviso((previo) => ({ ...a, vez: (previo?.vez ?? 0) + 1 })),
      cerrar: (vez: number) => setAviso((a) => (a?.vez === vez ? null : a)),
      limpiar: () => setAviso(null),
      tomarPregunta: () => {
        if (pregunte) return false;
        pregunte = true;
        return true;
      },
      anotarHoja: (abierta: boolean) => setHojas((n) => Math.max(0, n + (abierta ? 1 : -1))),
    };
  });
  return { aviso, hojas, ...fijas };
}

/** El aviso del canal. Con una hoja de avisos abierta espera: sale, con su tiempo completo, al cerrarla. */
export function AvisoAbajo({ canal }: { canal: CanalDeListas }) {
  const { aviso } = canal;
  if (!aviso || canal.hojas > 0) return null;
  return <Hecho key={aviso.vez} texto={aviso.texto} onDeshacer={aviso.boton} etiqueta={aviso.etiqueta} fallo={aviso.fallo} onCerrar={() => canal.cerrar(aviso.vez)} />;
}

/** Lo pinta quien tiene una hoja de avisos abierta: mientras esté, el aviso de la pantalla espera. */
export function HojaAbierta({ canal }: { canal: CanalDeListas }) {
  const { anotarHoja } = canal;
  useEffect(() => {
    anotarHoja(true);
    return () => anotarHoja(false);
  }, [anotarHoja]);
  return null;
}

const CanalDePantalla = createContext<CanalDeListas | undefined>(undefined);

/** El canal de las listas y barras de esta pantalla, si alguien lo puso arriba (las fichas, con su `template`). */
export function useCanalDePantalla(): CanalDeListas | undefined {
  return useContext(CanalDePantalla);
}

/**
 * Un canal para toda una pantalla y su único aviso abajo. Las fichas lo ponen en su `template` (uno nuevo por ficha), así
 * la lista de eventos y la barra de Seguir o de Voy comparten aviso y pregunta.
 */
export default function PantallaConAviso({ children }: { children: ReactNode }) {
  const canal = useCanalDeListas();
  return (
    <CanalDePantalla.Provider value={canal}>
      {children}
      <AvisoAbajo canal={canal} />
    </CanalDePantalla.Provider>
  );
}
