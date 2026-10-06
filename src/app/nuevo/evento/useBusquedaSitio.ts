"use client";

import { useEffect, useRef, useState } from "react";
import { consultarMapa, puntoValido, recuperarLugar, sugerirLugares, type LugarSugerido } from "@/lib/buscarLugares";
import { configPublica } from "@/lib/config";
import { buscarConContexto, descartarSinCalle, necesitaReintentoLugares, type ContextoDireccion } from "@/lib/direccionContexto";
import type { Punto } from "@/lib/geo";
import { lugarDesdePunto } from "@/lib/geocodificar";
import type { Candidato } from "./pasos";

/** Lo que trajo el mapa para un texto; `falla` si no se pudo preguntar (sin esto, «no hay nada» y «no pude buscar» se confundirían). */
type Respuesta = { texto: string; opciones: LugarSugerido[]; falla: boolean };

/**
 * La búsqueda del sitio de «¿Dónde es?» en el mapa (Mapbox Search Box, lugares y direcciones juntos): la misma de la hoja de siempre
 * (`HojaDonde`: `buscarConContexto` acota a la ciudad de contexto y reintenta si nada quedó cerca, y los resultados sin calle se
 * descartan), con 350 ms de rebote y sin buscar con menos de 3 letras. Solo da lo que corresponde al texto de ahora: lo de un texto
 * anterior no se enseña mientras llega lo nuevo. `elegir` pide al mapa las coordenadas de un resultado (el segundo paso de Mapbox,
 * con la misma sesión) y devuelve el sitio a confirmar; null si no se pudo. `aqui` hace lo mismo con el punto de «Estoy aquí».
 */
export function useBusquedaSitio(q: string, contexto: ContextoDireccion) {
  const texto = q.trim();
  const [respuesta, setRespuesta] = useState<Respuesta | null>(null);
  const sesion = useRef("");
  const version = useRef(0);
  useEffect(() => {
    sesion.current = crypto.randomUUID();
  }, []);

  useEffect(() => {
    if (texto.length < 3) return;
    const { mapboxToken } = configPublica();
    const esta = ++version.current;
    const timer = setTimeout(async () => {
      let opciones: LugarSugerido[] = [];
      let falla = false;
      try {
        if (!mapboxToken) throw new Error("Sin servicio de direcciones");
        opciones = await buscarConContexto(
          texto,
          contexto,
          (t, bbox) => sugerirLugares(t, mapboxToken, contexto.centro, sesion.current, consultarMapa, bbox).then((r) => descartarSinCalle(r, texto)),
          (r) => necesitaReintentoLugares(r.map((o) => o.distanciaM)),
        );
      } catch {
        falla = true;
      }
      if (esta === version.current) setRespuesta({ texto, opciones, falla });
    }, 350);
    return () => clearTimeout(timer);
    // La búsqueda depende del texto y de la ciudad de contexto, no de cada nuevo objeto que `contextoDondeEsta` arma.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto, contexto.origen, contexto.ciudad.slug]);

  async function elegir(item: LugarSugerido): Promise<Candidato | null> {
    const { mapboxToken } = configPublica();
    if (!mapboxToken) return null;
    try {
      const r = await recuperarLugar(item.mapboxId, mapboxToken, sesion.current, consultarMapa);
      if (!r || !puntoValido(r)) return null;
      // Una dirección ubica, no nombra: solo un lugar con nombre da el del sitio.
      return { nombre: item.esDireccion ? "" : item.nombre, direccion: r.direccion || item.direccion, punto: { lat: r.lat, lng: r.lng }, ciudad: r.ciudad, categorias: r.categorias.length ? r.categorias : item.categorias, origen: "busqueda" };
    } catch {
      return null;
    }
  }

  /** «Estoy aquí»: el punto con la dirección que el mapa le da; sin ella (o sin servicio) la tarjeta pedirá el nombre. */
  async function aqui(punto: Punto): Promise<Candidato> {
    const { mapboxToken } = configPublica();
    const lugar = mapboxToken ? await lugarDesdePunto(punto, mapboxToken).catch(() => null) : null;
    return { nombre: "", direccion: lugar?.direccion ?? "", punto, ciudad: lugar?.ciudad ?? null, categorias: [], origen: "aqui" };
  }

  const actual = texto.length >= 3 && respuesta?.texto === texto ? respuesta : null;
  return {
    opciones: actual?.opciones ?? [],
    /** Ya se puede decir «no hay nada» (o «no pude buscar»): con menos de 3 letras el mapa no se pregunta. */
    lista: texto.length < 3 || !!actual,
    falla: !!actual?.falla,
    elegir,
    aqui,
  };
}
