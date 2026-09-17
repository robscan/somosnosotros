"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { alAvisar, alCerrar, alLimpiar, cerrojoDePregunta, type Aviso } from "@/lib/avisoDePantalla";
import Hecho from "./Hecho";

export type { Aviso };

/**
 * Lo que comparten las listas y las barras de una misma pantalla (OL-057): un solo aviso abajo (el nuevo reemplaza al
 * anterior y cada uno cierra solo el suyo) y una sola pregunta de avisos. Una lista suelta (agenda, Lugares, Artistas)
 * tiene el suyo; la ficha de una persona y las de lugar y artista comparten uno, para que los avisos no se encimen ni la
 * pregunta salga dos veces. Las reglas, en `lib/avisoDePantalla`.
 */
export type CanalDeListas = {
  aviso: Aviso | null;
  avisar: (a: Omit<Aviso, "vez">) => void;
  cerrar: (vez: number) => void;
  /** Un toque nuevo que todavía no tiene su aviso (las barras de las fichas) quita el suyo anterior, no el de otro. */
  limpiar: (de: string) => void;
  /** ¿Se abre la hoja de la pregunta de avisos? Solo si no hay otra abierta en la pantalla. */
  tomarPregunta: () => boolean;
  /** Se fue la hoja (cerrada, contestada o con la pantalla): la pregunta vuelve a estar libre, una sola vez por pantalla. */
  soltarPregunta: () => void;
  /** La hoja abierta se vuelve a montar (desarrollo repite los efectos): sigue tomada, sin gastar cuenta. */
  retomarPregunta: () => void;
  /** Cuántas hojas de avisos hay abiertas: con alguna, el aviso espera y sale al cerrarla. */
  hojas: number;
  anotarHoja: (abierta: boolean) => void;
};

export function useCanalDeListas(): CanalDeListas {
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [hojas, setHojas] = useState(0);
  // Las funciones, fijas desde el primer render: así un efecto puede anotar su hoja sin volver a correr.
  const [fijas] = useState(() => {
    const pregunta = cerrojoDePregunta();
    return {
      avisar: (a: Omit<Aviso, "vez">) => setAviso((previo) => alAvisar(previo, a)),
      cerrar: (vez: number) => setAviso((a) => alCerrar(a, vez)),
      limpiar: (de: string) => setAviso((a) => alLimpiar(a, de)),
      tomarPregunta: pregunta.tomar,
      soltarPregunta: pregunta.soltar,
      retomarPregunta: pregunta.retomar,
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

/**
 * Lo pinta quien tiene una hoja de avisos abierta, con la misma condición que la hoja: mientras esté, el aviso de la
 * pantalla espera, y al irse —cerrada, contestada o porque la pantalla se fue con ella abierta— suelta la pregunta, para
 * que no quede trabada. Devolverla una sola vez por pantalla ya lo cuida el cerrojo.
 */
export function HojaAbierta({ canal }: { canal: CanalDeListas }) {
  const { anotarHoja, soltarPregunta, retomarPregunta } = canal;
  useEffect(() => {
    anotarHoja(true);
    // En desarrollo React monta, limpia y vuelve a montar: al volver, la pregunta sigue tomada (no se abren dos hojas).
    retomarPregunta();
    return () => {
      anotarHoja(false);
      soltarPregunta();
    };
  }, [anotarHoja, soltarPregunta, retomarPregunta]);
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
