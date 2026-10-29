"use client";

import { useEffect, useRef } from "react";
import { estadosTrabajos } from "@/app/admin/instagram/acciones";
import { enCamino, REFRESCO_MS } from "@/lib/redes/reglas";

/** Un trabajo de la cola que la pantalla enseña «Publicando…» (o «Reintentando…»). */
export type Vivo = { id: string; reintentando: boolean };

/**
 * OL-488 (añadido del founder del 2026-10-29: la lista se quedó en «Publicando» aunque la cola ya había terminado): mientras la pantalla enseña
 * algo en camino, pregunta cada 5 s cómo van esos trabajos (`estadosTrabajos`, una consulta chica) y, en cuanto uno terminó (publicado o no se
 * pudo) o pasó a otro intento, pide la pantalla otra vez (`refrescar`: `router.refresh()`), que entonces dice «Publicado» con su enlace, el error con
 * su frase o «Reintentando…». También al volver a la app (`visibilitychange` y `pageshow`: en el iPhone una app instalada que vuelve del fondo no
 * siempre avisa con el primero). Sin nada en camino no pregunta nada.
 */
export default function useAlDia(vivos: readonly Vivo[], refrescar: () => void) {
  const clave = vivos.map((v) => `${v.id}:${v.reintentando ? 1 : 0}`).join(",");
  const alCambiar = useRef(refrescar);
  useEffect(() => {
    alCambiar.current = refrescar;
  });
  useEffect(() => {
    const lista = clave ? clave.split(",").map((x) => ({ id: x.slice(0, -2), reintentando: x.endsWith(":1") })) : [];
    let vivo = true;
    let enVuelo = false;
    const preguntar = () => {
      if (!lista.length || enVuelo || document.visibilityState !== "visible") return;
      enVuelo = true;
      estadosTrabajos(lista.map((v) => v.id))
        .then((m) => {
          if (!vivo) return;
          const cambio = lista.some((v) => m[v.id] && (!enCamino(m[v.id]) || m[v.id].reintentando !== v.reintentando));
          if (cambio) alCambiar.current();
        }, () => undefined)
        .finally(() => {
          enVuelo = false;
        });
    };
    const alVolver = () => {
      if (document.visibilityState === "visible") alCambiar.current();
    };
    // `pageshow` también salta al cargar la página: solo cuenta cuando vuelve de la memoria del navegador (`persisted`).
    const alMostrar = (e: PageTransitionEvent) => {
      if (e.persisted) alVolver();
    };
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("pageshow", alMostrar);
    const reloj = lista.length ? window.setInterval(preguntar, REFRESCO_MS) : null;
    return () => {
      vivo = false;
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("pageshow", alMostrar);
      if (reloj) window.clearInterval(reloj);
    };
  }, [clave]);
}
