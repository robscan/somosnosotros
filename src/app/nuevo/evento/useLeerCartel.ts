"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { leerCartelAccion, lecturaGuardada, type Cupo, type ResultadoCartel } from "@/app/eventos/acciones";
import { detalleDeLecturas, falloAlSubir, falloDeCorte, lecturaAgotada, seLee } from "@/app/eventos/estadoCartel";
import { medirCliente } from "@/lib/medir";
import useSubidaDeFoto from "@/components/ui/useSubidaDeFoto";
import { subirFoto } from "@/lib/subirFoto";
import { coloresDeArchivo, type Paleta } from "@/lib/coloresCartel";
import type { Leido } from "./cartelPorPasos";

/** El cartel que ya se subió. `leido`: de él salieron datos. `noPude`: se intentó leer y falló (la imagen se queda de todos modos, como en el alta de siempre). */
export type CartelSubido = { url: string; leido: boolean; noPude: boolean; /** Sus colores (OL-360), calculados aquí al subirlo; sin ellos, null. */ colores?: Paleta | null };

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
  /** La ciudad desde la que se publica (OL-413): el lugar del cartel se busca por su dirección solo en ella. */
  ciudad?: string | null;
};

/** Cuánto se espera, con la pantalla a la vista, a que el servidor termine una lectura que se cortó (OL-465). */
export const ESPERA_LECTURA_MS = 90_000;
const PAUSA_LECTURA_MS = 3_000;

/**
 * OL-465 (bitácora 497): si la respuesta de la lectura se perdió (el teléfono se fue a otra app, se cayó la señal), la lectura sigue en el
 * servidor y deja lo que salió en `cartel_lecturas`: se pregunta cada 3 s, solo con la pantalla a la vista (al volver a la app, en seguida),
 * hasta 90 s. Null si no hay nada que recoger (entonces es el corte de siempre).
 */
export async function recogerLectura(url: string, o: { preguntar?: typeof lecturaGuardada; esperar?: (ms: number) => Promise<void>; ahora?: () => number; visible?: () => boolean } = {}): Promise<ResultadoCartel | null> {
  const preguntar = o.preguntar ?? lecturaGuardada;
  const ahora = o.ahora ?? Date.now;
  const visible = o.visible ?? (() => typeof document === "undefined" || document.visibilityState === "visible");
  const esperar = o.esperar ?? ((ms: number) => new Promise<void>((listo) => {
    // Con la app en segundo plano no corre el reloj: se pregunta al volver.
    const alVolver = () => {
      if (!visible()) return;
      document.removeEventListener("visibilitychange", alVolver);
      window.clearTimeout(reloj);
      listo();
    };
    const reloj = window.setTimeout(() => {
      document.removeEventListener("visibilitychange", alVolver);
      listo();
    }, ms);
    document.addEventListener("visibilitychange", alVolver);
  }));
  let visto = 0;
  let antes = ahora();
  while (visto <= ESPERA_LECTURA_MS) {
    try {
      const r = await preguntar(url);
      if (!r) return null;
      if (r.estado === "lista") return r.resultado;
    } catch {
      // sin señal todavía: se vuelve a preguntar
    }
    await esperar(PAUSA_LECTURA_MS);
    const t = ahora();
    if (visible()) visto += Math.min(t - antes, PAUSA_LECTURA_MS * 2);
    antes = t;
  }
  return null;
}

/**
 * Subir el cartel y, si toca, leerlo, para el primer paso del alta por pasos (OL-302 y OL-307): el cartel se sube siempre (`subirFoto`) y
 * se lee solo si la casilla «Lectura automática» está marcada, quedan lecturas y hay servicio (`seLee`). Sin lectura —desmarcada, agotada,
 * sin servicio— o si la lectura falla (el modelo, un corte, o ya no había cupo en el servidor), el cartel queda guardado y se sigue a las
 * preguntas (`alGuardar`): nunca vuelve al recuadro. Solo si el cartel no llegó a subirse (`error`) la pantalla se queda en el primer paso,
 * con el recuadro igual para intentarlo otra vez. Nunca lanza ni se queda esperando: si se cae la señal a mitad (bitácora 095), cae en eso mismo.
 * `espera` es lo que dice la pantalla de espera (null en reposo): «leyendo» o «subiendo»; dura hasta que el cartel subido se puede dibujar.
 */
export function useLeerCartel({ usuarioId, servicio, cupo, alLeer, alGuardar, inicial = null, marcada: marcadaDeEntrada = true, ciudad = null }: Opciones) {
  // La subida en curso (OL-353): la vista local del cartel y una subida a la vez. `leyendo`: si esta subida también se lee.
  const { subiendo, vista, subir } = useSubidaDeFoto();
  const [leyendo, setLeyendo] = useState(false);
  const [subido, setSubido] = useState<CartelSubido | null>(() => (inicial ? { url: inicial, leido: false, noPude: false } : null));
  const [error, setError] = useState<string | null>(null);
  // En el alta la casilla «Lectura automática» arranca marcada: leer es lo normal, y desmarcarla es solo para el cartel que no se quiere leer.
  // Al editar arranca desmarcada: lo que ya está puesto no se pisa sin pedirlo.
  const [marcada, setMarcada] = useState(marcadaDeEntrada);
  // El cupo con el que se abrió, al día con lo que se lee aquí (cada lectura buena resta una; un «ya no hay» del servidor lo agota).
  const [cupoActual, setCupoActual] = useState(cupo);
  // Lo último que se subió y los últimos gestos, para que una promesa que tarda no use los de hace rato.
  const imagen = useRef<string | null>(inicial);
  const gestos = useRef({ alLeer, alGuardar });
  useEffect(() => {
    gestos.current = { alLeer, alGuardar };
  }, [alLeer, alGuardar]);

  const elegir = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      // La espera (y el cartel a la vista, desde el primer instante) dura hasta que la imagen subida se puede dibujar (`useSubidaDeFoto`).
      subir(e, async (archivo) => {
        const leer = seLee({ servicio, marcada, cupo: cupoActual });
        setLeyendo(leer);
        setError(null);
        let url: string | null = null;
        // Los colores del cartel (OL-360) se leen del archivo mientras sube: se guardan con el evento y la tarjeta de Inicio no pide la imagen.
        const leyendoColores = coloresDeArchivo(archivo);
        let colores: Paleta | null = null;
        try {
          const hecho = await subirFoto("lugares", usuarioId, "evento", archivo, "imagen", "cartel");
          if ("error" in hecho) {
            const f = falloAlSubir(imagen.current, hecho.error, hecho.motivo);
            setError(`${f.titulo}. ${f.mensaje}`);
            return null;
          }
          url = hecho.url;
          imagen.current = url;
          colores = await leyendoColores;
          if (!leer) {
            setSubido({ url, leido: false, noPude: false, colores });
            gestos.current.alGuardar();
            return url;
          }
          // OL-465: si la respuesta se pierde (el teléfono se fue a otra app a media lectura), se recoge lo que dejó el servidor.
          const r = await leerCartelAccion(url, ciudad).catch(async (e: unknown) => (await recogerLectura(url!)) ?? Promise.reject(e));
          if (r.ok) {
            medirCliente("cartel_leido", { resultado: "ok" });
            setSubido({ url, leido: true, noPude: false, colores });
            setCupoActual((c) => (c && !c.sinTope ? { ...c, usadas: c.usadas + 1 } : c));
            gestos.current.alLeer(r);
            return url;
          }
          // Ya no había cupo en el servidor (se gastó en otra pantalla): el cartel queda guardado y se sigue, sin decir que falló. Fallo de la lectura: «no pude leerlo».
          const sinCupo = "sinCupo" in r;
          if (!sinCupo) medirCliente("cartel_leido", { resultado: "fallo" });
          if (sinCupo) setCupoActual((c) => (c ? { ...c, usadas: Math.max(c.usadas, c.tope) } : c));
          setSubido({ url, leido: false, noPude: !sinCupo, colores });
          gestos.current.alGuardar();
          return url;
        } catch {
          // Se cortó a mitad. Si el cartel ya estaba subido se queda y se sigue; si no, no llegó a guardarse.
          if (url) {
            if (leer) medirCliente("cartel_leido", { resultado: "fallo" }); // se cortó leyendo
            setSubido({ url, leido: false, noPude: true, colores });
            gestos.current.alGuardar();
          } else {
            const f = falloDeCorte(null, imagen.current);
            setError(`${f.titulo}. ${f.mensaje}`);
          }
          return url;
        }
      }),
    [subir, usuarioId, servicio, marcada, cupoActual, ciudad],
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

  const espera: "subiendo" | "leyendo" | null = subiendo ? (leyendo ? "leyendo" : "subiendo") : null;
  return { espera, miniatura: vista, subido, error, casilla, elegir, quitar, poner };
}
