"use client";

import { useEffect, useRef } from "react";
import { estadosTrabajos } from "@/app/admin/instagram/acciones";
import { REFRESCO_MS } from "@/lib/redes/reglas";
import { sondear, type Estados, type Vivo } from "./sondeo";

export type { Vivo } from "./sondeo";

/**
 * OL-488 (añadido del founder del 2026-10-29: la lista se quedó en «Publicando» aunque la cola ya había terminado): mientras la pantalla enseña
 * algo en camino, pregunta cómo van esos trabajos (`estadosTrabajos`, una consulta chica).
 * OL-506 (prototipo firmado el 2026-11-02): cada 2 s (`REFRESCO_MS`), y en cuanto uno terminó (publicado o no se pudo) o pasó a otro intento
 * entrega la respuesta a quien tiene el estado (`alCambiar`), que cambia la línea del renglón en su sitio: ya no pide la pantalla otra vez. Al
 * volver a la app (`visibilitychange` y `pageshow`: en el iPhone una app instalada que vuelve del fondo no siempre avisa con el primero) pregunta
 * una vez en seguida y avisa (`alVolver`): quien la usa decide si vuelve a pedir la pantalla. Sin nada en camino no pregunta nada.
 */
export default function useAlDia(vivos: readonly Vivo[], alCambiar: (m: Estados) => void, alVolver?: () => void) {
  const clave = vivos.map((v) => `${v.id}:${v.reintentando ? 1 : 0}`).join(",");
  const avisos = useRef({ alCambiar, alVolver });
  useEffect(() => {
    avisos.current = { alCambiar, alVolver };
  });
  useEffect(() => {
    const lista = clave ? clave.split(",").map((x) => ({ id: x.slice(0, -2), reintentando: x.endsWith(":1") })) : [];
    const sondeo = sondear(lista, {
      preguntar: estadosTrabajos,
      alCambiar: (m) => avisos.current.alCambiar(m),
      visible: () => document.visibilityState === "visible",
      cada: REFRESCO_MS,
    });
    const alVolver = () => {
      if (document.visibilityState !== "visible") return;
      sondeo.pregunta();
      avisos.current.alVolver?.();
    };
    // `pageshow` también salta al cargar la página: solo cuenta cuando vuelve de la memoria del navegador (`persisted`).
    const alMostrar = (e: PageTransitionEvent) => {
      if (e.persisted) alVolver();
    };
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("pageshow", alMostrar);
    return () => {
      sondeo.parar();
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("pageshow", alMostrar);
    };
  }, [clave]);
}
