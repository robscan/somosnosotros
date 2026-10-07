"use client";

import { useState } from "react";
import { crearLugarDesdeEvento } from "@/app/lugares/acciones";
import { deducirTipo } from "@/lib/buscarLugares";
import { ciudadParaPunto, type Ciudad } from "@/lib/ciudad";
import type { LugarResumen } from "@/lib/lugares";
import { nombreDelSitio, sitioDeLugar, type Candidato, type Paso, type Uso } from "./pasos";
import type { usePasosEvento } from "./usePasosEvento";

/** La acción que crea un lugar pide a dónde volver solo para que nunca redirija: aquí no se sale de la pantalla. */
const VOLVER_A = "/nuevo/evento";
const NO_SE_GUARDO = "No se pudo guardar el lugar. Puedes usarlo solo en este evento.";

type Opciones = {
  pasos: ReturnType<typeof usePasosEvento>;
  lugares: LugarResumen[];
  ciudadContexto: Ciudad | null;
  /** Un lugar que se guardó desde «No está en el directorio»: quien lleva la lista lo agrega. */
  onLugarNuevo: (lugar: LugarResumen) => void;
};

/**
 * «Dónde» en un flujo por pasos de evento (OL-301; lo comparten el alta y editar, OL-319): lo escrito en «¿Dónde es?» (vive aquí y no en el
 * paso: al volver de «¿Es aquí?» la lista sigue ahí), elegir un lugar del directorio (su punto ya está confirmado: contesta sin pasar por el
 * mapa), «Guardarlo como lugar» (crea el lugar con la acción de la hoja de siempre; si ya existe uno igual cerca, usa ese) y abrir una pregunta
 * desde «Revisa» (cambiar el sitio vuelve a «¿Dónde es?» con lo elegido puesto).
 */
export function useSitioPorPasos({ pasos, lugares, ciudadContexto, onLugarNuevo }: Opciones) {
  const { r, contestar, usar, abrir } = pasos;
  const [busqueda, setBusqueda] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorLugar, setErrorLugar] = useState<string | null>(null);
  const lugar = r.sitio.modo === "lugar" ? lugares.find((l) => l.id === r.sitio.lugarId) : undefined;
  const elegirLugar = (l: LugarResumen) => contestar({ sitio: sitioDeLugar(l, r.sitio.otro) });

  async function guardarLugar(c: Candidato) {
    if (guardando) return;
    setGuardando(true);
    setErrorLugar(null);
    try {
      const nombre = c.nombre.trim();
      const direccion = c.direccion.trim();
      const creado = await crearLugarDesdeEvento({ nombre, direccion, lat: c.punto.lat, lng: c.punto.lng, ciudad: ciudadParaPunto(c.punto, c.ciudad, ciudadContexto) ?? "", volverA: VOLVER_A, privado: false, categorias: c.categorias });
      if (!creado.ok) {
        setErrorLugar(NO_SE_GUARDO);
        return;
      }
      const nuevo = lugares.find((l) => l.id === creado.id) ?? { id: creado.id, nombre, tipo: deducirTipo(nombre, c.categorias) ?? "otro", direccion, lat: c.punto.lat, lng: c.punto.lng, portada: null };
      onLugarNuevo(nuevo);
      contestar({ sitio: sitioDeLugar(nuevo, r.sitio.otro) });
    } catch {
      setErrorLugar(NO_SE_GUARDO);
    } finally {
      setGuardando(false);
    }
  }

  const usarSitio = (uso: Uso) => (uso === "lugar" ? (pasos.candidato ? void guardarLugar(pasos.candidato) : undefined) : (setErrorLugar(null), usar(uso)));
  const abrirPaso = (p: Paso) => {
    if (p === "donde") setBusqueda(nombreDelSitio(r.sitio, lugar));
    abrir(p);
  };

  return { busqueda, setBusqueda, guardando, errorLugar, lugar, elegirLugar, usarSitio, abrirPaso };
}
