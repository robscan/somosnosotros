"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cupoDeCartel, leerCartelAccion, pedirMasLecturas, type Cupo } from "@/app/eventos/acciones";
import { alLlegar, falloAlLeer, falloAlSubir, falloDeCorte, type EstadoCartel } from "@/app/eventos/estadoCartel";
import { subirFoto } from "@/lib/subirFoto";
import type { Leido } from "./cartelPorPasos";

/** El cartel que ya se subió; `leido` es que de él salieron datos (si no se pudo leer, la imagen se queda de todos modos, como en el alta de siempre). */
export type CartelSubido = { url: string; leido: boolean };

type Opciones = {
  usuarioId: string;
  /** Lo que le queda a quien mira al abrir la pantalla; null si no se supo (el servidor decide al leer). */
  cupo: Cupo | null;
  /** Recibe lo leído cuando la lectura sale bien. */
  alLeer: (leido: Leido) => void;
};

/**
 * Subir el cartel y leerlo, para el primer paso del alta por pasos (OL-302): lo mismo que `leerCartel` del formulario de siempre —confirmar
 * el cupo, subir la foto reducida con `subirFoto`, `leerCartelAccion`, que aparta la lectura y la cruza con el directorio—, pero sin
 * tocar el formulario. Nunca lanza ni se queda esperando: si se cae la señal a mitad, el recuadro cae en un fallo con «Probar con otra
 * foto» (bitácora 095). `estado` es lo que dice el recuadro: en reposo es lo que corresponda al cupo con el que se abrió.
 */
export function useLeerCartel({ usuarioId, cupo, alLeer }: Opciones) {
  const [estado, setEstado] = useState<EstadoCartel>(null);
  const [miniatura, setMiniatura] = useState<string | null>(null);
  const [subido, setSubido] = useState<CartelSubido | null>(null);
  const [pidiendo, setPidiendo] = useState(false);
  // Una lectura o una petición a la vez; el toque que llega mientras tanto no hace nada nuevo.
  const ocupado = useRef(false);
  // Lo último que se subió y el último `alLeer`, para que una promesa que tarda no use el de hace rato.
  const imagen = useRef<string | null>(null);
  const recibir = useRef(alLeer);
  useEffect(() => {
    recibir.current = alLeer;
  }, [alLeer]);

  const elegir = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const archivo = e.target.files?.[0];
      e.target.value = ""; // el mismo archivo se puede volver a elegir
      if (!archivo || ocupado.current) return;
      ocupado.current = true;
      // El cartel a la vista desde el primer instante, sin esperar a que suba.
      const vista = URL.createObjectURL(archivo);
      setMiniatura(vista);
      setEstado({ estado: "leyendo" });
      try {
        // El selector pudo estar abierto mientras se gastaba el cupo en otra pantalla: se confirma antes de subir nada. Si no se pudo
        // confirmar, sigue: `leerCartelAccion` lo aparta de verdad y es quien decide.
        const sinCupo = alLlegar(await cupoDeCartel());
        if (sinCupo) {
          setEstado(sinCupo);
          return;
        }
        const subida = await subirFoto("lugares", usuarioId, "evento", archivo, "imagen");
        if ("error" in subida) {
          setEstado(falloAlSubir(imagen.current, subida.error, subida.motivo));
          return;
        }
        const r = await leerCartelAccion(subida.url);
        // Se acabó el cupo entre confirmarlo y apartarlo: la foto no se queda, no se gastó nada.
        if (!r.ok && "sinCupo" in r) {
          setEstado({ estado: "sin_cupo" });
          return;
        }
        imagen.current = subida.url;
        setSubido({ url: subida.url, leido: r.ok });
        if (!r.ok) {
          setEstado(falloAlLeer(subida.url, r.mensaje));
          return;
        }
        setEstado(null);
        recibir.current(r);
      } catch {
        setEstado(falloDeCorte(null, imagen.current));
      } finally {
        URL.revokeObjectURL(vista);
        setMiniatura(null);
        ocupado.current = false;
      }
    },
    [usuarioId],
  );

  /** «Pedir más lecturas»: una por cuenta; solo se da por pedida si el servidor lo confirma. */
  const pedirMas = useCallback(async () => {
    if (ocupado.current) return;
    ocupado.current = true;
    setPidiendo(true);
    const fallo: EstadoCartel = { estado: "sin_cupo", mensaje: "No pude mandar la petición. Puede ser tu conexión." };
    try {
      setEstado((await pedirMasLecturas()).ok ? { estado: "pedida" } : fallo);
    } catch {
      setEstado(fallo);
    } finally {
      setPidiendo(false);
      ocupado.current = false;
    }
  }, []);

  return { cartel: estado ?? alLlegar(cupo), leyendo: estado?.estado === "leyendo", miniatura, subido, pidiendo, elegir, pedirMas };
}
