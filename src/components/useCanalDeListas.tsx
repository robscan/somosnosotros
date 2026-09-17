"use client";

import { useRef, useState } from "react";
import Hecho from "./Hecho";

/** El aviso de abajo: lo hecho con Deshacer, o que no se pudo guardar con Reintentar. */
export type Aviso = { texto: string; boton: () => void; etiqueta?: string; fallo?: boolean; vez: number };

/**
 * Lo que comparten las listas de una misma pantalla (OL-057): un solo aviso abajo (el nuevo reemplaza al anterior y cada
 * uno cierra solo el suyo) y una sola pregunta de avisos. Una lista suelta (agenda, Lugares, Artistas) tiene el suyo; la
 * ficha de una persona, con eventos, lugares y artistas en pestañas, comparte uno para que los avisos no se encimen.
 */
export type CanalDeListas = {
  aviso: Aviso | null;
  avisar: (a: Omit<Aviso, "vez">) => void;
  cerrar: (vez: number) => void;
  /** ¿Se hace la pregunta de avisos? Solo la primera vez en la pantalla: al decir que sí, queda tomada. */
  tomarPregunta: () => boolean;
};

export function useCanalDeListas(): CanalDeListas {
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const pregunte = useRef(false);
  return {
    aviso,
    avisar: (a) => setAviso((previo) => ({ ...a, vez: (previo?.vez ?? 0) + 1 })),
    cerrar: (vez) => setAviso((a) => (a?.vez === vez ? null : a)),
    tomarPregunta: () => {
      if (pregunte.current) return false;
      pregunte.current = true;
      return true;
    },
  };
}

/** El aviso del canal. Con la hoja de avisos abierta espera: sale, con su tiempo completo, al cerrarla. */
export function AvisoAbajo({ canal, enEspera }: { canal: CanalDeListas; enEspera: boolean }) {
  const { aviso } = canal;
  if (!aviso || enEspera) return null;
  return <Hecho key={aviso.vez} texto={aviso.texto} onDeshacer={aviso.boton} etiqueta={aviso.etiqueta} fallo={aviso.fallo} onCerrar={() => canal.cerrar(aviso.vez)} />;
}
