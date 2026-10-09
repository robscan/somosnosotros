"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { leerCartelAccion, type Cupo } from "@/app/eventos/acciones";
import { detalleDeLecturas, falloAlSubir, falloDeCorte, lecturaAgotada, seLee } from "@/app/eventos/estadoCartel";
import { medirCliente } from "@/lib/medir";
import { subirFoto } from "@/lib/subirFoto";
import type { Leido } from "./cartelPorPasos";

/** El cartel que ya se subió. `leido`: de él salieron datos. `noPude`: se intentó leer y falló (la imagen se queda de todos modos, como en el alta de siempre). */
export type CartelSubido = { url: string; leido: boolean; noPude: boolean };

type Opciones = {
  usuarioId: string;
  /** Si el servidor puede leer carteles; sin servicio el cartel solo se sube. */
  servicio: boolean;
  /** Lo que le queda a quien mira al abrir la pantalla; null si no se supo (el servidor decide al leer). */
  cupo: Cupo | null;
  /** Recibe lo leído cuando la lectura sale bien. */
  alLeer: (leido: Leido) => void;
  /** El cartel quedó guardado sin leer (la casilla desmarcada, sin lecturas, sin servicio o una lectura que falló): sigue la primera pregunta. */
  alGuardar: () => void;
  /** Al editar (OL-319): el cartel que ya tiene el evento (no se vuelve a leer) y la casilla «Lectura automática» desmarcada de entrada. */
  inicial?: string | null;
  marcada?: boolean;
};

/**
 * Subir el cartel y, si toca, leerlo, para el primer paso del alta por pasos (OL-302 y OL-307): el cartel se sube siempre (`subirFoto`) y
 * se lee solo si la casilla «Lectura automática» está marcada, quedan lecturas y hay servicio (`seLee`). Sin lectura —desmarcada, agotada,
 * sin servicio— o si la lectura falla (el modelo, un corte, o ya no había cupo en el servidor), el cartel queda guardado y se sigue a las
 * preguntas (`alGuardar`): nunca vuelve al recuadro. Solo si el cartel no llegó a subirse (`error`) la pantalla se queda en el primer paso,
 * con el recuadro igual para intentarlo otra vez. Nunca lanza ni se queda esperando: si se cae la señal a mitad (bitácora 095), cae en eso mismo.
 * `espera` es lo que dice la pantalla de espera (null en reposo): «leyendo» o «subiendo».
 */
export function useLeerCartel({ usuarioId, servicio, cupo, alLeer, alGuardar, inicial = null, marcada: marcadaDeEntrada = true }: Opciones) {
  const [espera, setEspera] = useState<"subiendo" | "leyendo" | null>(null);
  const [miniatura, setMiniatura] = useState<string | null>(null);
  const [subido, setSubido] = useState<CartelSubido | null>(() => (inicial ? { url: inicial, leido: false, noPude: false } : null));
  const [error, setError] = useState<string | null>(null);
  // En el alta la casilla «Lectura automática» arranca marcada: leer es lo normal, y desmarcarla es solo para el cartel que no se quiere leer.
  // Al editar arranca desmarcada: lo que ya está puesto no se pisa sin pedirlo.
  const [marcada, setMarcada] = useState(marcadaDeEntrada);
  // El cupo con el que se abrió, al día con lo que se lee aquí (cada lectura buena resta una; un «ya no hay» del servidor lo agota).
  const [cupoActual, setCupoActual] = useState(cupo);
  // Una subida o lectura a la vez; el toque que llega mientras tanto no hace nada nuevo.
  const ocupado = useRef(false);
  // Lo último que se subió y los últimos gestos, para que una promesa que tarda no use los de hace rato.
  const imagen = useRef<string | null>(inicial);
  const gestos = useRef({ alLeer, alGuardar });
  useEffect(() => {
    gestos.current = { alLeer, alGuardar };
  }, [alLeer, alGuardar]);

  const elegir = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const archivo = e.target.files?.[0];
      e.target.value = ""; // el mismo archivo se puede volver a elegir
      if (!archivo || ocupado.current) return;
      ocupado.current = true;
      const leer = seLee({ servicio, marcada, cupo: cupoActual });
      // El cartel a la vista desde el primer instante, sin esperar a que suba.
      const vista = URL.createObjectURL(archivo);
      setMiniatura(vista);
      setError(null);
      setEspera(leer ? "leyendo" : "subiendo");
      let url: string | null = null;
      try {
        const subida = await subirFoto("lugares", usuarioId, "evento", archivo, "imagen", "cartel");
        if ("error" in subida) {
          const f = falloAlSubir(imagen.current, subida.error, subida.motivo);
          setError(`${f.titulo}. ${f.mensaje}`);
          return;
        }
        url = subida.url;
        imagen.current = url;
        if (!leer) {
          setSubido({ url, leido: false, noPude: false });
          gestos.current.alGuardar();
          return;
        }
        const r = await leerCartelAccion(url);
        if (r.ok) {
          medirCliente("cartel_leido", { resultado: "ok" });
          setSubido({ url, leido: true, noPude: false });
          setCupoActual((c) => (c && !c.sinTope ? { ...c, usadas: c.usadas + 1 } : c));
          gestos.current.alLeer(r);
          return;
        }
        // Ya no había cupo en el servidor (se gastó en otra pantalla): el cartel queda guardado y se sigue, sin decir que falló. Fallo de la lectura: «no pude leerlo».
        const sinCupo = "sinCupo" in r;
        if (!sinCupo) medirCliente("cartel_leido", { resultado: "fallo" });
        if (sinCupo) setCupoActual((c) => (c ? { ...c, usadas: Math.max(c.usadas, c.tope) } : c));
        setSubido({ url, leido: false, noPude: !sinCupo });
        gestos.current.alGuardar();
      } catch {
        // Se cortó a mitad. Si el cartel ya estaba subido se queda y se sigue; si no, no llegó a guardarse.
        if (url) {
          if (leer) medirCliente("cartel_leido", { resultado: "fallo" }); // se cortó leyendo
          setSubido({ url, leido: false, noPude: true });
          gestos.current.alGuardar();
        } else {
          const f = falloDeCorte(null, imagen.current);
          setError(`${f.titulo}. ${f.mensaje}`);
        }
      } finally {
        URL.revokeObjectURL(vista);
        setMiniatura(null);
        setEspera(null);
        ocupado.current = false;
      }
    },
    [usuarioId, servicio, marcada, cupoActual],
  );

  // La casilla: sin servicio no hay; agotada va apagada, con cuándo vuelven; si no, marcada o no según la persona.
  const agotada = lecturaAgotada(cupoActual);
  const casilla = servicio ? { marcada, agotada, detalle: detalleDeLecturas(cupoActual), onCambio: setMarcada } : null;

  // Al editar: quitar el cartel, o poner la dirección de una imagen que ya está en otro sitio (solo la administración); ninguna de las dos lee.
  const quitar = useCallback(() => {
    setError(null);
    setSubido(null);
  }, []);
  const poner = useCallback((url: string | null) => setSubido(url ? { url, leido: false, noPude: false } : null), []);

  return { espera, miniatura, subido, error, casilla, elegir, quitar, poner };
}
